// 签约开启联动桥（ADR-0093 降级版）。
// β：合同列表变化且有 created/approved/voided 时 `refresh()` 项目 Context；不承担 spawn。
// α 版仍走前端 diff 引擎（单机单用户，无并发问题）。

import { useEffect, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { useContracts } from './ContractsContext';
import { useProjects } from '../project-management/ProjectContext';
import { useBusinessCases } from '@/app/business-case/BusinessCaseContext';
import { buildUnconfirmedProject, spawnUnconfirmedProject, startDelivery } from '@/app/business-case';
import { diffContractEvents, type ContractSnapshotEntry } from './signingOpenEvents';
import { generateDeliveryPlan } from '../delivery-plan/utils';
import { saveDeliveryPlan } from '../delivery-plan/deliveryPlanStore';
import { SOP_PHASES } from '../delivery-plan/constants';
import type { DeliveryType } from '../delivery-plan/types';
import type { Contract } from './types';

/** 自动生成 SOP 计划的默认交付类型；项目可在交付计划页重新配置 */
const DEFAULT_DELIVERY_TYPE: DeliveryType = '网站';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** β 模式标记：由 apps/web 注入 window.__ZK_BETA__ = true */
function isBeta(): boolean {
  try { return !!(globalThis as Record<string, unknown>).__ZK_BETA__; } catch { return false; }
}

export function SigningOpenBridge() {
  const { contracts } = useContracts();
  const { getProjectByLeadId, updateProject, addProject, refresh } = useProjects();
  const { getByLeadId, upsertCase } = useBusinessCases();

  // 快照形状（与服务端 prevSnapshotForWrite 同形）：null 表示尚未做首帧快照（首帧只记录不触发）
  const snapshotRef = useRef<Record<string, ContractSnapshotEntry> | null>(null);

  useEffect(() => {
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
  }, [contracts]);

  /** α 模式：合同新建 → spawn 未确认项目 */
  function handleContractCreated(contract: Contract) {
    const leadId = contract.leadId;
    if (!leadId) return;

    const today = todayStr();
    const project = getProjectByLeadId(leadId);
    if (project) {
      const bizCase = getByLeadId(leadId);
      if (bizCase) {
        upsertCase({
          ...bizCase,
          projectId: bizCase.projectId ?? project.id,
          contractId: bizCase.contractId ?? contract.id,
        });
      }
      Message.success('合同 ' + contract.contractNo + ' 已创建：商机关联已更新');
      return;
    }

    const projectId = 'ap-' + contract.id;
    const spawned = spawnUnconfirmedProject({ caseId: 'case-' + leadId, leadId, projectId });
    const fullProject = buildUnconfirmedProject({
      lead: { id: leadId },
      contract: { id: contract.id, current: contract.current },
      projectId,
      today,
    });
    addProject(fullProject);
    upsertCase({ ...spawned.case, contractId: contract.id });
    Message.success('合同 ' + contract.contractNo + ' 已创建：已生成未确认项目，待管理员确认指派');
  }

  /** α 模式：合同批准 → startDelivery + SOP 计划 */
  function handleContractApproved(contract: Contract) {
    const leadId = contract.leadId;
    if (!leadId) return;

    const today = todayStr();
    const project = getProjectByLeadId(leadId);
    const bizCase = getByLeadId(leadId);

    if (!project) {
      Message.warning('合同 ' + contract.contractNo + ' 审批通过，但线索下无项目，请先创建项目');
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
      const plan = generateDeliveryPlan(
        {
          selectedPhases: SOP_PHASES.map((p) => p.phaseNo),
          deliveryType: DEFAULT_DELIVERY_TYPE,
          contractId: contract.id,
        },
        startedProject as unknown as Record<string, unknown>,
        contract.current.signDate,
      );
      saveDeliveryPlan(plan);
      Message.success('合同 ' + contract.contractNo + ' 审批通过：项目已进入进行中并生成 SOP 交付计划');
    } else if (project.status === '未确认') {
      Message.info('合同 ' + contract.contractNo + ' 审批通过：项目待管理员确认指派后启动交付');
    } else {
      Message.success('合同 ' + contract.contractNo + ' 审批通过：商机关联已更新');
    }
  }

  return null;
}
