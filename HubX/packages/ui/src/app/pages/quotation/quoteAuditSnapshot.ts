// 报价审批快照构建器
// 提交审批时从 configStore 业务绑定读取配置，拍成 AuditNode[] + StampNode 写入 Quote。
// 撤回/驳回再提按当时配置重拍（ADR 0049）。

import {
  type AuditNode,
  type StampNode,
} from './types';
import type {
  BusinessApprovalDefinition,
  NodeAssignment,
  WorkflowTemplateDefinition,
} from '@/app/approvals/configStore';

/** 报价审批角色映射：人名 → 报价角色 key */
const NAME_TO_QUOTE_ROLE: Record<string, string> = {
  '黄奕': 'sales_manager',
  '罗总': 'tech',
  '闵总': 'decision',
  '黄海': 'assistant',
  '张三': 'sales',
  '张产品': 'pm',
  '赵六': 'sales_manager',
};

/** 从人名推断报价角色（assignment 携带 quoteRole 时优先用它） */
function resolveQuoteRole(assignment: NodeAssignment): string {
  if ('quoteRole' in assignment && (assignment as any).quoteRole) {
    return (assignment as any).quoteRole;
  }
  const name = Array.isArray(assignment.assigneeValue) ? assignment.assigneeValue[0] : assignment.assigneeValue;
  return NAME_TO_QUOTE_ROLE[name] ?? 'unknown';
}

/** 盖章节点识别约定：模板中 name === '盖章' 的节点即 stamp 节点 */
function isStampNode(nodeName: string): boolean {
  return nodeName === '盖章';
}

export interface AuditSnapshot {
  auditNodes: AuditNode[];
  stampNode: StampNode;
}

/**
 * 从业务审批配置构建快照。
 * @param businessDef 业务审批绑定（如 quote-approval）
 * @param templateDef 对应的工作流模板
 */
export function buildAuditSnapshotFromConfig(
  businessDef: BusinessApprovalDefinition,
  templateDef: WorkflowTemplateDefinition,
): AuditSnapshot {
  const auditNodes: AuditNode[] = [];
  let stampNode: StampNode = { stamperName: '黄海', status: 'LOCKED' };

  for (const assignment of businessDef.assignments) {
    const templateNode = templateDef.nodes.find((n) => n.id === assignment.nodeId);
    if (!templateNode) continue;

    const name = Array.isArray(assignment.assigneeValue)
      ? assignment.assigneeValue[0]
      : assignment.assigneeValue;

    if (isStampNode(templateNode.name) || isStampNode(assignment.nodeName)) {
      stampNode = { stamperName: name, status: 'LOCKED' };
    } else {
      auditNodes.push({
        auditorId: assignment.nodeId,
        auditorName: name,
        role: templateNode.name,
        status: 'PENDING',
      });
    }
  }

  return { auditNodes, stampNode };
}

/**
 * 从当前配置获取报价审批快照。
 * 如果找不到配置，回退到默认三人会签（向后兼容）。
 */
export function getQuoteAuditSnapshot(
  loadBusinessApprovals: () => BusinessApprovalDefinition[],
  loadWorkflowTemplates: () => WorkflowTemplateDefinition[],
  bizCode: string = 'quote-approval',
): AuditSnapshot {
  const businesses = loadBusinessApprovals();
  const templates = loadWorkflowTemplates();

  const businessDef = businesses.find((b) => b.bizCode === bizCode && b.enabled);
  if (!businessDef || !businessDef.templateId) {
    // 回退默认：三人并行会签 + 盖章
    return {
      auditNodes: [
        { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
        { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
        { auditorId: 'min', auditorName: '闵总', role: '企业决策层', status: 'PENDING' },
      ],
      stampNode: { stamperName: '黄海', status: 'LOCKED' },
    };
  }

  const templateDef = templates.find((t) => t.id === businessDef.templateId);
  if (!templateDef) {
    return {
      auditNodes: [
        { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
        { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
        { auditorId: 'min', auditorName: '闵总', role: '企业决策层', status: 'PENDING' },
      ],
      stampNode: { stamperName: '黄海', status: 'LOCKED' },
    };
  }

  return buildAuditSnapshotFromConfig(businessDef, templateDef);
}

// ─── 默认报价审批模板与业务绑定（首次写入 configStore 用）──────────

export const QUOTE_PARALLEL_TEMPLATE: WorkflowTemplateDefinition = {
  key: 'template-quote-parallel',
  id: 'T-QUOTE-PARALLEL',
  name: '报价审批并行会签模板',
  description: '三人并行会签 + 盖章节点，适用于报价审批',
  nodes: [
    { id: 'quote-sm', name: '销售部负责人', strategy: '会签', rejectPolicy: '驳回至发起人' },
    { id: 'quote-tech', name: '技术部负责人', strategy: '会签', rejectPolicy: '驳回至发起人' },
    { id: 'quote-decision', name: '企业决策层', strategy: '会签', rejectPolicy: '驳回至发起人' },
    { id: 'quote-stamp', name: '盖章', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
  ],
  enabled: true,
  updatedAt: '2026-08-21',
};

export const QUOTE_APPROVAL_BINDING: BusinessApprovalDefinition = {
  key: 'business-quote-approval',
  bizCode: 'quote-approval',
  bizName: '报价审批',
  description: '报价提交后的三人并行会签 + 盖章',
  templateId: 'T-QUOTE-PARALLEL',
  templateName: '报价审批并行会签模板',
  assignments: [
    { nodeId: 'quote-sm', nodeName: '销售部负责人', strategy: '会签', assigneeType: '具体人员', assigneeValue: '黄奕', skipIfEmpty: false },
    { nodeId: 'quote-tech', nodeName: '技术部负责人', strategy: '会签', assigneeType: '具体人员', assigneeValue: '罗总', skipIfEmpty: false },
    { nodeId: 'quote-decision', nodeName: '企业决策层', strategy: '会签', assigneeType: '具体人员', assigneeValue: '闵总', skipIfEmpty: false },
    { nodeId: 'quote-stamp', nodeName: '盖章', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '黄海', skipIfEmpty: false },
  ],
  enabled: true,
  updatedAt: '2026-08-21',
};

export const SUPPLEMENT_QUOTE_APPROVAL_BINDING: BusinessApprovalDefinition = {
  key: 'business-supplement-quote-approval',
  bizCode: 'supplement-quote-approval',
  bizName: '补充报价审批',
  description: '补充报价提交后的三人并行会签 + 盖章',
  templateId: 'T-QUOTE-PARALLEL',
  templateName: '报价审批并行会签模板',
  assignments: [
    { nodeId: 'quote-sm', nodeName: '销售部负责人', strategy: '会签', assigneeType: '具体人员', assigneeValue: '黄奕', skipIfEmpty: false },
    { nodeId: 'quote-tech', nodeName: '技术部负责人', strategy: '会签', assigneeType: '具体人员', assigneeValue: '罗总', skipIfEmpty: false },
    { nodeId: 'quote-decision', nodeName: '企业决策层', strategy: '会签', assigneeType: '具体人员', assigneeValue: '闵总', skipIfEmpty: false },
    { nodeId: 'quote-stamp', nodeName: '盖章', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '黄海', skipIfEmpty: false },
  ],
  enabled: true,
  updatedAt: '2026-08-21',
};
