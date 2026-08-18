// 阶段 3「合同批准 -> 交付启动」联动桥。
// 为什么是桥组件：ContractsProvider 是 ProjectProvider / BusinessCaseProvider 的父级，
// Context 层拿不到子级数据；所以在最内层挂一个无 UI 组件，监听 contracts 快照中
// approvedAt 的「首次出现」，执行跨域副作用（商机维护 / 签约出未确认项目 / 交付启动）。
// 该模式对 mock 与 http 数据源同样生效（谁调 approveStep 都会触发）。

import { useEffect, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { useContracts } from './ContractsContext';
import { useProjects } from '../project-management/ProjectContext';
import { useBusinessCases } from '@/app/business-case/BusinessCaseContext';
import { spawnUnconfirmedProject, startDelivery } from '@/app/business-case';
import type { UnconfirmedProject } from '@/app/business-case';
import { generateDeliveryPlan } from '../delivery-plan/utils';
import { saveDeliveryPlan } from '../delivery-plan/deliveryPlanStore';
import { SOP_PHASES } from '../delivery-plan/constants';
import type { DeliveryType } from '../delivery-plan/types';
import type { Project } from '../project-management/mockData';
import type { Contract } from './types';

/** 自动生成 SOP 计划的默认交付类型；项目可在交付计划页重新配置 */
const DEFAULT_DELIVERY_TYPE: DeliveryType = '网站';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 把 spawn 出的未确认项目补全成项目管理完整实体 */
function toFullProject(spawned: UnconfirmedProject, contract: Contract, today: string): Project {
  return {
    id: spawned.id,
    projectNo: 'PRJ' + today.replace(/-/g, '') + String(spawned.id).slice(-3),
    name: (contract.current.customerName || '签约客户') + '项目（待确认）',
    latestProgress: '主合同审批通过，等待管理员确认并指派产品经理。',
    priority: '中',
    entity: contract.current.signingEntity || '中科软艺',
    status: '未确认',
    businessLine: '外包',
    salesUsers: [],
    owner: '',
    assistants: [],
    productUsers: [],
    uiUsers: [],
    frontendUsers: [],
    backendUsers: [],
    opsUsers: [],
    testUsers: [],
    legalUsers: [],
    progress: 0,
    startDate: '',
    expectedEndDate: '',
    remark: '主合同审批通过自动生成，尚未确认。',
    attachments: [],
    leadId: spawned.leadId,
    contractId: contract.id,
    createdAt: today + ' 00:00',
  };
}

export function ApprovalDeliveryBridge() {
  const { contracts } = useContracts();
  const { getProjectByLeadId, updateProject, addProject } = useProjects();
  const { getByLeadId, upsertCase } = useBusinessCases();

  // id -> approvedAt 的上一份快照；null 表示尚未做首帧快照（首帧只记录不触发，避免初始加载误判）
  const approvedSnapshotRef = useRef<Record<string, string | undefined> | null>(null);

  useEffect(() => {
    const snapshot = approvedSnapshotRef.current;
    const next: Record<string, string | undefined> = {};
    contracts.forEach((c) => {
      next[c.id] = c.approvedAt;
      if (snapshot === null) return;
      const before = snapshot[c.id];
      if (c.approvedAt && !before && c.status !== 'voided') {
        handleContractApproved(c);
      }
    });
    approvedSnapshotRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts]);

  /** approvedAt 首次写入时的联动副作用（见文件头注释） */
  function handleContractApproved(contract: Contract) {
    const leadId = contract.leadId;
    if (!leadId) return;

    const today = todayStr();
    const project = getProjectByLeadId(leadId);
    const bizCase = getByLeadId(leadId);
    const notices: string[] = [];

    if (!project) {
      // 签约出未确认项目：接线 spawnUnconfirmedProject（此前只有单测调用）
      const projectId = 'ap-' + contract.id;
      const spawned = spawnUnconfirmedProject({ caseId: 'case-' + leadId, leadId, projectId });
      addProject(toFullProject(spawned.project, contract, today));
      upsertCase({ ...spawned.case, contractId: contract.id });
      notices.push('已生成未确认项目，待管理员确认指派产品经理');
    } else {
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
        notices.push('项目已进入进行中并生成 SOP 交付计划');
      } else if (project.status === '未确认') {
        notices.push('项目待管理员确认指派后启动交付');
      } else {
        notices.push('商机关联已更新');
      }
    }

    Message.success('合同 ' + contract.contractNo + ' 审批通过：' + notices.join('；'));
  }

  return null;
}
