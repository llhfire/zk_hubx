// 签约开启联动桥（原 ApprovalDeliveryBridge）。
// 职责：监听 contracts 快照，产出两类事件——
//   created（合同新建）→ spawn 未确认项目
//   approved（批准）  → startDelivery + SOP 计划（仅对已有项目）
// 两条接线共用 caseUtils 纯函数层，防止行为分叉。
//
// 阶段 3 原名 ApprovalDeliveryBridge，U1 改名 SigningOpenBridge。
// 合同在全局 ContractsContext 里，快照 diff 可靠；
// 线索侧不在桥内处理（跟进弹窗 onOk 显式调联动，见 LeadDetail）。

import { useEffect, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { useContracts } from './ContractsContext';
import { useProjects } from '../project-management/ProjectContext';
import { useBusinessCases } from '@/app/business-case/BusinessCaseContext';
import { buildUnconfirmedProject, spawnUnconfirmedProject, startDelivery } from '@/app/business-case';
import { diffContractEvents } from './signingOpenEvents';
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

export function SigningOpenBridge() {
  const { contracts } = useContracts();
  const { getProjectByLeadId, updateProject, addProject } = useProjects();
  const { getByLeadId, upsertCase } = useBusinessCases();

  // id -> approvedAt 的上一份快照；null 表示尚未做首帧快照（首帧只记录不触发）
  const snapshotRef = useRef<Record<string, string | undefined> | null>(null);

  useEffect(() => {
    const prev = snapshotRef.current;
    // 构建下一份快照
    const next: Record<string, string | undefined> = {};
    contracts.forEach((c) => {
      next[c.id] = c.approvedAt;
    });
    snapshotRef.current = next;

    // 首帧只记录不触发
    if (prev === null) return;

    const events = diffContractEvents(prev, contracts);

    // created 事件：合同新建 → spawn 未确认项目
    for (const contract of events.created) {
      handleContractCreated(contract);
    }

    // approved 事件：批准 → startDelivery（仅对已有项目）
    for (const contract of events.approved) {
      handleContractApproved(contract);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts]);

  /** 合同新建时的联动：spawn 未确认项目 */
  function handleContractCreated(contract: Contract) {
    const leadId = contract.leadId;
    if (!leadId) return;

    const today = todayStr();
    const project = getProjectByLeadId(leadId);
    if (project) {
      // 已有项目不重复 spawn，只补全商机关联
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

    // 无项目 → spawn
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

  /** 合同批准时的联动：startDelivery + SOP 计划（仅对已有项目） */
  function handleContractApproved(contract: Contract) {
    const leadId = contract.leadId;
    if (!leadId) return;

    const today = todayStr();
    const project = getProjectByLeadId(leadId);
    const bizCase = getByLeadId(leadId);

    if (!project) {
      // ADR 0067 严格执行：批准时无项目不兜底 spawn
      Message.warning('合同 ' + contract.contractNo + ' 审批通过，但线索下无项目，请先创建项目');
      return;
    }

    // 补全商机关联
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
