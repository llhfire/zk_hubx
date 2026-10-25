import { describe, expect, it } from 'vitest';
import {
  canViewQuote,
  canCreateQuote,
  canDeleteQuote,
  quoteLeadGate,
} from '../quoteAccess';
import type { Quote, QuoteStatus } from '../types';

function fakeQuote(status: QuoteStatus, extra?: Partial<Quote>): Quote {
  return {
    id: 'q-1',
    quoteNo: 'QT-2026-1',
    version: 'v1.0',
    status,
    leadId: 'l-1',
    salesOwnerName: '张三',
    basicInfo: {
      projectName: '测试项目',
      projectType: '其他定制',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: '',
      customerName: '',
      customerContact: '',
      customerPhone: '',
      quoteValidityDays: 30,
    },
    endpointConfigs: [],
    featureList: [],
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [],
    auditNodes: [
      { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
      { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
      { auditorId: 'min', auditorName: '闵总', role: '企业决策层', status: 'PENDING' },
    ],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: [{ id: 'ev-1', action: 'create', actorName: '张产品', actorRole: 'pm', time: '2026-01-01' }],
    ccSalesNames: ['张三'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...extra,
  };
}

describe('canViewQuote', () => {
  const quote = fakeQuote('draft');

  it('创建人可通过', () => {
    expect(canViewQuote(quote, '张产品', false)).toBe(true);
  });

  it('salesOwnerName 可通过', () => {
    expect(canViewQuote(quote, '张三', false)).toBe(true);
  });

  it('评估人可通过', () => {
    expect(canViewQuote(quote, '罗总', false)).toBe(true);
  });

  it('会签人可通过', () => {
    expect(canViewQuote(quote, '黄奕', false)).toBe(true);
  });

  it('盖章人可通过', () => {
    expect(canViewQuote(quote, '黄海', false)).toBe(true);
  });

  it('admin 可打开任意单', () => {
    expect(canViewQuote(quote, '任意人', true)).toBe(true);
  });

  it('无关人拒绝', () => {
    expect(canViewQuote(quote, '路人甲', false)).toBe(false);
  });

  it('ccSalesNames 里的抄送人不算打开范围', () => {
    const q = fakeQuote('draft', { ccSalesNames: ['李四'] });
    expect(canViewQuote(q, '李四', false)).toBe(false);
  });

  it('admin 能打开 voided 单', () => {
    const q = fakeQuote('voided');
    expect(canViewQuote(q, '任意人', true)).toBe(true);
  });
});

describe('canCreateQuote', () => {
  const perm = { creators: ['张三', '李四'], admins: ['黄奕'] };

  it('creators 里的人可建单', () => {
    expect(canCreateQuote('张三', perm)).toBe(true);
  });

  it('非 creators 拒绝', () => {
    expect(canCreateQuote('路人甲', perm)).toBe(false);
  });

  it('admin 不自动获得建单权限（需在 creators 里）', () => {
    expect(canCreateQuote('黄奕', perm)).toBe(false);
  });
});

describe('canDeleteQuote', () => {
  it('draft 且 timeline 只有 create → 可删', () => {
    const q = fakeQuote('draft');
    expect(canDeleteQuote(q)).toBe(true);
  });

  it('draft 但有 return_to_edit_features 事件 → 拒', () => {
    const q = fakeQuote('draft', {
      timeline: [
        { id: 'ev-1', action: 'create', actorName: '张产品', actorRole: 'pm', time: '2026-01-01' },
        { id: 'ev-2', action: 'return_to_edit_features', actorName: '张三', actorRole: 'sales', time: '2026-01-02' },
      ],
    });
    expect(canDeleteQuote(q)).toBe(false);
  });

  it('任意非 draft → 拒', () => {
    expect(canDeleteQuote(fakeQuote('pending_eval'))).toBe(false);
    expect(canDeleteQuote(fakeQuote('auditing'))).toBe(false);
    expect(canDeleteQuote(fakeQuote('confirmed'))).toBe(false);
    expect(canDeleteQuote(fakeQuote('voided'))).toBe(false);
  });

  it('有 submit_eval 历史又回到 draft → 拒', () => {
    const q = fakeQuote('draft', {
      timeline: [
        { id: 'ev-1', action: 'create', actorName: '张产品', actorRole: 'pm', time: '2026-01-01' },
        { id: 'ev-2', action: 'submit_eval', actorName: '张产品', actorRole: 'pm', time: '2026-01-02' },
        { id: 'ev-3', action: 'return_to_edit_features', actorName: '黄奕', actorRole: 'sales_manager', time: '2026-01-03' },
      ],
    });
    expect(canDeleteQuote(q)).toBe(false);
  });
});

describe('quoteLeadGate', () => {
  it('拿不到线索简况 → 放行', () => {
    expect(quoteLeadGate(null, 'submit_feature_list')).toBe(true);
    expect(quoteLeadGate(undefined, 'submit_feature_list')).toBe(true);
  });

  it('线索未终止 → 放行', () => {
    expect(quoteLeadGate('合同洽谈', 'submit_feature_list')).toBe(true);
    expect(quoteLeadGate('已签单', 'mark_confirmed')).toBe(true);
  });

  it('线索已终止：前进动作冻结', () => {
    expect(quoteLeadGate('已终止', 'submit_feature_list')).toBe(false);
    expect(quoteLeadGate('已终止', 'submit_for_audit')).toBe(false);
    expect(quoteLeadGate('已终止', 'mark_confirmed')).toBe(false);
    expect(quoteLeadGate('已终止', 'mark_sent')).toBe(false);
  });

  it('线索已终止：回退动作不受限', () => {
    expect(quoteLeadGate('已终止', 'withdraw_audit')).toBe(true);
    expect(quoteLeadGate('已终止', 'withdraw_sent')).toBe(true);
    expect(quoteLeadGate('已终止', 'return_to_stamp')).toBe(true);
    expect(quoteLeadGate('已终止', 'return_to_edit_features')).toBe(true);
    expect(quoteLeadGate('已终止', 'return_to_tech')).toBe(true);
    expect(quoteLeadGate('已终止', 'audit_reject')).toBe(true);
  });
});
