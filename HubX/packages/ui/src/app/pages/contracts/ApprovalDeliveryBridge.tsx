// 签约开启联动桥（ADR-0093 降级版）。
// β：合同列表变化且有 created/approved/voided 时 `refresh()` 项目 Context；不承担 spawn。
// α 版仍走前端 diff 引擎（单机单用户，无并发问题）。

import { useEffect, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { useContracts } from './ContractsContext';
import { useProjects } from '../project-management/ProjectContext';
import { useBusinessCases } from '@/app/business-case/BusinessCaseContext';
import {
  buildUnconfirmedProject,
  signingLeadTransitions,
  startDelivery,
  unconfirmedProjectId,
} from '@/app/business-case';
import { useLeads } from '@/app/leads/LeadContext';
import { diffContractEvents, getSigningOpenBridgeIssue, type ContractSnapshotEntry } from './signingOpenEvents';
import { generateDeliveryPlanFromContract } from '../delivery-plan/contractBasis';
import { saveDeliveryPlan } from '../delivery-plan/deliveryPlanStore';
import type { Contract } from './types';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** β 模式标记：由 apps/web 注入 window.__ZK_BETA__ = true */
function isBeta(): boolean {
  try { return !!(globalThis as Record<string, unknown>).__ZK_BETA__; } catch { return false; }
}

export function SigningOpenBridge() {
  const { contracts, loading: contractsLoading } = useContracts();
  const { leads, loading: leadsLoading } = useLeads();
  const { getProjectByLeadId, updateProject, addProject, refresh } = useProjects();
  const { getByLeadId, upsertCase } = useBusinessCases();

  // 快照形状（与服务端 prevSnapshotForWrite 同形）：null 表示尚未做首帧快照（首帧只记录不触发）
  const snapshotRef = useRef<Record<string, ContractSnapshotEntry> | null>(null);
  const leadSnapshotRef = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    // Provider 首帧为空数组；必须等种子/服务数据就绪后再建快照，
    // 否则会把所有历史合同误判为本次 created/approved 事件。
    if (contractsLoading) return;
    const prev = snapshotRef.current;
    // 构建下一份快照
    const next: Record<string, ContractSnapshotEntry> = {};
    contracts.forEach((c) => {
      next[c.id] = { approvedAt: c.approvedAt, status: c.status };
    });
    snapshotRef.current = next;

    // 首帧只记录不触发
    if (prev === null) return;

    const events = diffContractEvents(prev, contracts);

    // β 模式：联动由 Workers 在合同 PUT 时同步完成（ADR-0093），
    // 前端桥负责刷新项目 Context（洞 A 修复）
    if (isBeta()) {
      if (events.created.length || events.approved.length || events.voided.length) {
        void refresh().catch(() => {
          Message.warning('项目列表同步失败，请刷新页面');
        });
      }
      return;
    }

    // α 模式：保留前端 diff 引擎（单机单用户）
    for (const contract of events.created) {
      handleContractCreated(contract);
    }
    for (const contract of events.approved) {
      handleContractApproved(contract);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, contractsLoading]);

  useEffect(() => {
    // 与合同快照同理：加载完成前不建空快照，避免历史签约线索被当成新跃迁。
    if (leadsLoading) return;
    const previous = leadSnapshotRef.current;
    leadSnapshotRef.current = Object.fromEntries(leads.map(lead => [lead.id, lead.status]));
    const transitions = signingLeadTransitions(previous, leads);
    if (transitions.length === 0) return;

    if (isBeta()) {
      void refresh().catch(() => Message.warning('项目列表同步失败，请刷新页面'));
      return;
    }

    for (const transition of transitions) {
      const lead = leads.find(item => item.id === transition.id);
      if (lead) handleLeadEnteredSigning(lead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, leadsLoading]);

  /** α 模式：线索进入合同洽谈/已签单 → 幂等生成未确认项目 */
  function handleLeadEnteredSigning(lead: (typeof leads)[number]) {
    if (getProjectByLeadId(lead.id)) return;
    const projectId = unconfirmedProjectId({ leadId: lead.id });
    const fullProject = buildUnconfirmedProject({
      lead: { id: lead.id, name: lead.customer || lead.name },
      projectId,
      today: todayStr(),
    });
    void addProject(fullProject).then(actualProjectId => {
      upsertCase({
        id: 'case-' + lead.id,
        leadId: lead.id,
        projectId: actualProjectId,
        contractId: null,
        extraContractIds: [],
        quoteIds: [],
      });
      // 正常联动静默完成，避免与线索状态操作的成功 Toast 重复堆叠。
    });
  }

  /** α 模式：合同新建 → spawn 未确认项目 */
  function handleContractCreated(contract: Contract) {
    const leadId = contract.leadId;
    const today = todayStr();
    const projectId = unconfirmedProjectId({ leadId, contractId: contract.id });
    const fullProject = buildUnconfirmedProject({
      lead: leadId ? { id: leadId } : undefined,
      contract: { id: contract.id, current: contract.current },
      projectId,
      today,
    });
    void addProject(fullProject).then(actualProjectId => {
      if (leadId) {
        const bizCase = getByLeadId(leadId);
        upsertCase(bizCase ? {
          ...bizCase,
          projectId: actualProjectId,
          contractId: contract.id,
        } : {
          id: 'case-' + leadId,
          leadId,
          projectId: actualProjectId,
          contractId: contract.id,
          extraContractIds: [],
          quoteIds: [],
        });
      }
      // 正常联动静默完成，合同创建操作本身已经提供成功反馈。
    });
  }

  /** α 模式：合同批准 → startDelivery + SOP 计划 */
  function handleContractApproved(contract: Contract) {
    const leadId = contract.leadId;
    if (!leadId) return;

    const today = todayStr();
    const project = getProjectByLeadId(leadId);
    const bizCase = getByLeadId(leadId);

    if (!project) {
      const issue = getSigningOpenBridgeIssue('contract_missing_project', contract.contractNo);
      if (issue) Message.warning(issue);
      return;
    }

    if (bizCase) {
      upsertCase({
        ...bizCase,
        projectId: bizCase.projectId ?? project.id,
        contractId: bizCase.contractId ?? contract.id,
      });
    } else {
      upsertCase({
        id: 'case-' + leadId,
        leadId,
        projectId: project.id,
        contractId: contract.id,
        extraContractIds: [],
        quoteIds: [],
      });
    }

    const patch = startDelivery({ project, contractId: contract.id, today });
    if (patch) {
      const startedProject = { ...project, ...patch };
      updateProject(startedProject);
      const plan = generateDeliveryPlanFromContract(
        contract,
        startedProject as unknown as Record<string, unknown>,
      );
      saveDeliveryPlan(plan);
    } else if (project.status === '未确认') {
      // 待管理员指派属于正常业务状态，由项目状态和待办承载，不重复弹 Toast。
    } else {
      // 商机关联正常更新，无需额外提示。
    }
  }

  return null;
}
