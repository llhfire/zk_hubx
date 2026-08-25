import { describe, expect, it } from 'vitest';
import {
  buildAuditSnapshotFromConfig,
  getQuoteAuditSnapshot,
  QUOTE_APPROVAL_BINDING,
  QUOTE_PARALLEL_TEMPLATE,
  SUPPLEMENT_QUOTE_APPROVAL_BINDING,
} from '../quoteAuditSnapshot';
import type { BusinessApprovalDefinition, WorkflowTemplateDefinition } from '@/app/approvals/configStore';

describe('buildAuditSnapshotFromConfig', () => {
  it('从三人并行会签模板构建 3 个 auditNodes + 1 个 stampNode', () => {
    const snapshot = buildAuditSnapshotFromConfig(QUOTE_APPROVAL_BINDING, QUOTE_PARALLEL_TEMPLATE);
    expect(snapshot.auditNodes).toHaveLength(3);
    expect(snapshot.stampNode.stamperName).toBe('黄海');
    expect(snapshot.stampNode.status).toBe('LOCKED');
  });

  it('auditNodes 从 assignments 读取人名', () => {
    const snapshot = buildAuditSnapshotFromConfig(QUOTE_APPROVAL_BINDING, QUOTE_PARALLEL_TEMPLATE);
    expect(snapshot.auditNodes.map((n) => n.auditorName)).toEqual(['黄奕', '罗总', '闵总']);
  });

  it('auditNodes 全部 PENDING', () => {
    const snapshot = buildAuditSnapshotFromConfig(QUOTE_APPROVAL_BINDING, QUOTE_PARALLEL_TEMPLATE);
    expect(snapshot.auditNodes.every((n) => n.status === 'PENDING')).toBe(true);
  });

  it('盖章节点由模板中 name=盖章 的节点识别', () => {
    const snapshot = buildAuditSnapshotFromConfig(QUOTE_APPROVAL_BINDING, QUOTE_PARALLEL_TEMPLATE);
    expect(snapshot.stampNode.stamperName).toBe('黄海');
  });

  it('补充报价审批使用独立绑定但同一模板', () => {
    const snapshot = buildAuditSnapshotFromConfig(SUPPLEMENT_QUOTE_APPROVAL_BINDING, QUOTE_PARALLEL_TEMPLATE);
    expect(snapshot.auditNodes).toHaveLength(3);
    expect(snapshot.stampNode.stamperName).toBe('黄海');
  });

  it('自定义配置：2 人串行 + 盖章', () => {
    const template: WorkflowTemplateDefinition = {
      key: 'custom',
      id: 'T-CUSTOM',
      name: '自定义模板',
      description: '',
      nodes: [
        { id: 'n1', name: '业务负责人审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
        { id: 'n2', name: '财务审批', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
        { id: 'n3', name: '盖章', strategy: '单人审批', rejectPolicy: '驳回至发起人' },
      ],
      enabled: true,
      updatedAt: '2026-08-21',
    };
    const biz: BusinessApprovalDefinition = {
      key: 'custom-biz',
      bizCode: 'custom-approval',
      bizName: '自定义审批',
      description: '',
      templateId: 'T-CUSTOM',
      templateName: '自定义模板',
      assignments: [
        { nodeId: 'n1', nodeName: '业务负责人审批', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '赵六', skipIfEmpty: false },
        { nodeId: 'n2', nodeName: '财务审批', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '张三', skipIfEmpty: false },
        { nodeId: 'n3', nodeName: '盖章', strategy: '单人审批', assigneeType: '具体人员', assigneeValue: '黄海', skipIfEmpty: false },
      ],
      enabled: true,
      updatedAt: '2026-08-21',
    };
    const snapshot = buildAuditSnapshotFromConfig(biz, template);
    expect(snapshot.auditNodes).toHaveLength(2);
    expect(snapshot.auditNodes[0].auditorName).toBe('赵六');
    expect(snapshot.auditNodes[1].auditorName).toBe('张三');
    expect(snapshot.stampNode.stamperName).toBe('黄海');
  });
});

describe('getQuoteAuditSnapshot', () => {
  it('找不到配置时回退默认三人会签', () => {
    const snapshot = getQuoteAuditSnapshot(() => [], () => []);
    expect(snapshot.auditNodes).toHaveLength(3);
    expect(snapshot.auditNodes.map((n) => n.auditorName)).toEqual(['黄奕', '罗总', '闵总']);
    expect(snapshot.stampNode.stamperName).toBe('黄海');
  });

  it('找到配置时用配置构建', () => {
    const snapshot = getQuoteAuditSnapshot(
      () => [QUOTE_APPROVAL_BINDING],
      () => [QUOTE_PARALLEL_TEMPLATE],
    );
    expect(snapshot.auditNodes).toHaveLength(3);
    expect(snapshot.auditNodes[0].auditorName).toBe('黄奕');
  });

  it('配置被禁用时回退默认', () => {
    const disabled = { ...QUOTE_APPROVAL_BINDING, enabled: false };
    const snapshot = getQuoteAuditSnapshot(() => [disabled], () => [QUOTE_PARALLEL_TEMPLATE]);
    expect(snapshot.auditNodes).toHaveLength(3);
    expect(snapshot.auditNodes[0].auditorId).toBe('huangyi'); // 默认
  });

  it('bizCode 不匹配时回退默认', () => {
    const snapshot = getQuoteAuditSnapshot(
      () => [QUOTE_APPROVAL_BINDING],
      () => [QUOTE_PARALLEL_TEMPLATE],
      'supplement-quote-approval',
    );
    // QUOTE_APPROVAL_BINDING 的 bizCode 是 'quote-approval'，不匹配 'supplement-quote-approval'
    // 但 SUPPLEMENT_QUOTE_APPROVAL_BINDING 不在列表中，所以回退默认
    expect(snapshot.auditNodes).toHaveLength(3);
  });
});

describe('默认配置常量', () => {
  it('QUOTE_PARALLEL_TEMPLATE 有 4 个节点（3 会签 + 1 盖章）', () => {
    expect(QUOTE_PARALLEL_TEMPLATE.nodes).toHaveLength(4);
    expect(QUOTE_PARALLEL_TEMPLATE.nodes.filter((n) => n.strategy === '会签')).toHaveLength(3);
    expect(QUOTE_PARALLEL_TEMPLATE.nodes.find((n) => n.name === '盖章')).toBeDefined();
  });

  it('QUOTE_APPROVAL_BINDING 的 assignments 与模板节点对齐', () => {
    expect(QUOTE_APPROVAL_BINDING.assignments).toHaveLength(4);
    expect(QUOTE_APPROVAL_BINDING.templateId).toBe('T-QUOTE-PARALLEL');
  });

  it('SUPPLEMENT_QUOTE_APPROVAL_BINDING 独立 bizCode', () => {
    expect(SUPPLEMENT_QUOTE_APPROVAL_BINDING.bizCode).toBe('supplement-quote-approval');
    expect(SUPPLEMENT_QUOTE_APPROVAL_BINDING.templateId).toBe('T-QUOTE-PARALLEL');
  });
});
