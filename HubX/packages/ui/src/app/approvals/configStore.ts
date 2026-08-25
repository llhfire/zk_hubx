export type ApproveStrategy = '单人审批' | '或签' | '会签';
export type RejectPolicy = '驳回至发起人';
export type AssigneeType = '具体人员' | '上一节点负责人';

export interface WorkflowTemplateDefinition {
  key: string;
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    name: string;
    strategy: ApproveStrategy;
    rejectPolicy: RejectPolicy;
  }>;
  enabled: boolean;
  updatedAt: string;
}

export interface NodeAssignment {
  nodeId: string;
  nodeName: string;
  strategy: ApproveStrategy;
  assigneeType: AssigneeType;
  assigneeValue: string | string[];
  skipIfEmpty: boolean;
}

export interface BusinessApprovalDefinition {
  key: string;
  bizCode: string;
  bizName: string;
  description: string;
  templateId: string | null;
  templateName: string | null;
  assignments: NodeAssignment[];
  enabled: boolean;
  updatedAt: string;
}

const TEMPLATE_STORAGE_KEY = 'hubx-workflow-templates-v2';
const BUSINESS_STORAGE_KEY = 'hubx-business-approvals-v2';

import {
  QUOTE_PARALLEL_TEMPLATE,
  QUOTE_APPROVAL_BINDING,
  SUPPLEMENT_QUOTE_APPROVAL_BINDING,
} from '@/app/pages/quotation/quoteAuditSnapshot';

export const defaultWorkflowTemplates: WorkflowTemplateDefinition[] = [
  {
    key: 'template-quotation',
    id: 'T001',
    name: '报价审批模板',
    description: '适用于报价提交后的业务负责人及财务审批',
    nodes: [
      { id: 'quotation-manager', name: '业务负责人审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
      { id: 'quotation-finance', name: '财务审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
    ],
    enabled: true,
    updatedAt: '2026-07-29',
  },
  {
    key: 'template-contract',
    id: 'T002',
    name: '合同审批模板',
    description: '适用于合同新建、变更和作废的统一审批',
    nodes: [
      { id: 'contract-manager', name: '业务负责人审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
      { id: 'contract-finance', name: '财务审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
      { id: 'contract-gm', name: '总经理审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
    ],
    enabled: true,
    updatedAt: '2026-07-29',
  },
  {
    key: 'template-general',
    id: 'T003',
    name: '通用业务审批模板',
    description: '供后续新增业务审批快速配置使用',
    nodes: [
      { id: 'general-manager', name: '直属上级审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
    ],
    enabled: true,
    updatedAt: '2026-07-29',
  },
  QUOTE_PARALLEL_TEMPLATE,
];

export const defaultBusinessApprovals: BusinessApprovalDefinition[] = [
  {
    key: 'business-quotation',
    bizCode: 'QUOTATION',
    bizName: '报价审批',
    description: '报价资料提交后的业务审批',
    templateId: 'T001',
    templateName: '报价审批模板',
    assignments: [
      { nodeId: 'quotation-manager', nodeName: '业务负责人审批', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '赵六（销售总监）', skipIfEmpty: false },
      { nodeId: 'quotation-finance', nodeName: '财务审批', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '张三（财务主管）', skipIfEmpty: false },
    ],
    enabled: true,
    updatedAt: '2026-07-29',
  },
  {
    key: 'business-contract',
    bizCode: 'CONTRACT',
    bizName: '合同审批',
    description: '合同新建、变更和作废统一使用该审批配置',
    templateId: 'T002',
    templateName: '合同审批模板',
    assignments: [
      { nodeId: 'contract-manager', nodeName: '业务负责人审批', strategy: '单人审批', assigneeType: '上一节点负责人', assigneeValue: '上一节点负责人', skipIfEmpty: false },
      { nodeId: 'contract-finance', nodeName: '财务审批', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '张三（财务主管）', skipIfEmpty: false },
      { nodeId: 'contract-gm', nodeName: '总经理审批', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '李四（总经理）', skipIfEmpty: false },
    ],
    enabled: true,
    updatedAt: '2026-07-29',
  },
  QUOTE_APPROVAL_BINDING,
  SUPPLEMENT_QUOTE_APPROVAL_BINDING,
];

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function loadWorkflowTemplates() {
  return loadStorage(TEMPLATE_STORAGE_KEY, defaultWorkflowTemplates);
}

export function saveWorkflowTemplates(templates: WorkflowTemplateDefinition[]) {
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

export function loadBusinessApprovals() {
  return loadStorage(BUSINESS_STORAGE_KEY, defaultBusinessApprovals);
}

export function saveBusinessApprovals(businessApprovals: BusinessApprovalDefinition[]) {
  window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(businessApprovals));
}
