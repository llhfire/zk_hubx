import { describe, expect, it, vi } from 'vitest';
import {
  applyNewVersion,
  buildNewQuote,
  buildPricingSummary,
  migrateQuote,
  TRANSITIONS,
  canTransition,
  generateQuoteNo,
} from '@/services/quotationMutations';
import { computeAmountBreakdown } from '../quoteFlow';
import type { Quote, QuoteStatus } from '../types';

function fakeQuote(status: QuoteStatus, extra?: Partial<Quote>): Quote {
  return {
    id: 'q-1',
    quoteNo: 'QT-2026-1',
    version: 'v1.0',
    status,
    leadId: 'lead-1',
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
    travelOnsite: {
      enableTravel: false,
      travelSubtotal: 0,
      enableOnsite: false,
      onsiteSubtotal: 0,
      travelDetails: [],
      onsiteDetails: [],
    },
    otherCosts: [],
    auditNodes: [],
    stampNode: { stamperName: '黄海', stamperRole: 'assistant', status: 'LOCKED' },
    timeline: [],
    ccSalesNames: [],
    createdAt: '2026-08-18 10:00',
    updatedAt: '2026-08-18 10:00',
    ...extra,
  };
}

describe('migrateQuote', () => {
  it('draft → draft（不变）', () => {
    const q = fakeQuote('draft');
    expect(migrateQuote(q).status).toBe('draft');
  });

  it('pending_eval（原 feature_confirmed）', () => {
    // 模拟旧数据：status 字段值为 feature_confirmed 但类型已更新
    const q = { ...fakeQuote('draft'), status: 'feature_confirmed' as QuoteStatus };
    expect(migrateQuote(q).status).toBe('pending_eval');
  });

  it('pending_quote 合并三态：eval_completed / assigned_sales / quote_summarized', () => {
    for (const old of ['eval_completed', 'assigned_sales', 'quote_summarized']) {
      const q = { ...fakeQuote('draft'), status: old as QuoteStatus };
      expect(migrateQuote(q).status).toBe('pending_quote');
    }
  });

  it('auditing → auditing（展示词变但 status 不变）', () => {
    const q = fakeQuote('auditing');
    expect(migrateQuote(q).status).toBe('auditing');
  });

  it('rejected → rejected', () => {
    const q = fakeQuote('rejected');
    expect(migrateQuote(q).status).toBe('rejected');
  });

  it('pending_stamp / stamped / sent 不变', () => {
    for (const s of ['pending_stamp', 'stamped', 'sent'] as QuoteStatus[]) {
      expect(migrateQuote(fakeQuote(s)).status).toBe(s);
    }
  });

  it('deal → confirmed', () => {
    const q = { ...fakeQuote('draft'), status: 'deal' as QuoteStatus };
    expect(migrateQuote(q).status).toBe('confirmed');
  });

  it('pending_followup → sent', () => {
    const q = { ...fakeQuote('draft'), status: 'pending_followup' as QuoteStatus };
    expect(migrateQuote(q).status).toBe('sent');
  });

  it('voided → voided', () => {
    const q = fakeQuote('voided');
    expect(migrateQuote(q).status).toBe('voided');
  });

  it('timeline 中 mark_deal 改写为 mark_confirmed', () => {
    const q = {
      ...fakeQuote('draft'),
      status: 'deal' as QuoteStatus,
      timeline: [
        { id: 'tl-1', action: 'mark_deal' as Quote['timeline'][0]['action'], actorName: '张三', actorRole: '销售', time: '2026-08-18 10:00' },
        { id: 'tl-2', action: 'mark_sent' as Quote['timeline'][0]['action'], actorName: '张三', actorRole: '销售', time: '2026-08-18 09:00' },
      ],
    };
    const migrated = migrateQuote(q);
    expect(migrated.timeline[0].action).toBe('mark_confirmed');
    expect(migrated.timeline[1].action).toBe('mark_sent');
  });

  it('状态不变时仍迁移旧轨迹动作', () => {
    const q = {
      ...fakeQuote('confirmed'),
      timeline: [
        { id: 'tl-1', action: 'mark_deal' as Quote['timeline'][0]['action'], actorName: '张三', actorRole: '销售', time: '2026-08-18 10:00' },
      ],
    };
    expect(migrateQuote(q).timeline[0].action).toBe('mark_confirmed');
  });

  it('旧审批快照补齐报价角色与盖章角色', () => {
    const quote = fakeQuote('auditing', {
      salesOwnerName: '张三',
      auditNodes: [
        { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
        { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
      ],
      stampNode: { stamperName: '黄海', status: 'LOCKED' },
    });
    const migrated = migrateQuote(quote);
    expect(migrated.auditNodes.map((node) => node.quoteRole)).toEqual(['sales_manager', 'tech']);
    expect(migrated.stampNode.stamperRole).toBe('assistant');
  });

  it('十个正式状态均幂等且不误报未知状态', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const statuses: QuoteStatus[] = [
      'draft', 'pending_eval', 'pending_quote', 'auditing', 'rejected',
      'pending_stamp', 'stamped', 'sent', 'confirmed', 'voided',
    ];
    for (const status of statuses) {
      const quote = fakeQuote(status, { salesOwnerName: '张三' });
      expect(migrateQuote(migrateQuote(quote))).toEqual(quote);
    }
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('未知 status 保留原值并 console 警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const q = { ...fakeQuote('draft'), status: 'bogus' as QuoteStatus };
    const result = migrateQuote(q);
    expect(result.status).toBe('bogus');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('未知状态'));
    warnSpy.mockRestore();
  });

  it('补齐旧缓存缺失的报价卡片必需字段', () => {
    const legacy = {
      id: 'q-legacy',
      quoteNo: 'QT-2025-1',
      version: 'v1.0',
      status: 'draft',
      leadId: 'lead-1',
      basicInfo: { projectName: '旧版报价' },
      timeline: [],
      auditNodes: [],
      stampNode: { stamperName: '黄海', status: 'LOCKED' },
      createdAt: '2025-01-01 10:00',
      updatedAt: '2025-01-01 10:00',
    } as unknown as Quote;

    const migrated = migrateQuote(legacy);

    expect(migrated.salesAddedRoles).toEqual([]);
    expect(migrated.travelOnsite).toMatchObject({
      enableTravel: false,
      enableOnsite: false,
      travelDetails: [],
      onsiteDetails: [],
    });
    expect(migrated.otherCosts).toEqual([]);
    expect(migrated.basicInfo.projectType).toBe('其他定制');
    expect(() => computeAmountBreakdown(migrated)).not.toThrow();
  });
});

describe('buildNewQuote', () => {
  it('创建时固化所选流转方式', () => {
    const quote = buildNewQuote('q-file', 'QT-2026-9', 'lead-1', [], {}, '张三', 'file');
    expect(quote.flowMode).toBe('file');
    expect(quote.fileFlow?.onlineDocument.status).toBe('empty');
  });
});

describe('TRANSITIONS 合法迁移矩阵', () => {
  it('主流程前进动作按十态约束', () => {
    expect(TRANSITIONS.submit_feature_list).toEqual({ from: ['draft'], to: 'pending_eval' });
    expect(TRANSITIONS.submit_eval).toEqual({ from: ['pending_eval'], to: 'pending_quote' });
    expect(TRANSITIONS.submit_for_audit).toEqual({ from: ['pending_quote', 'rejected'], to: 'auditing' });
    expect(TRANSITIONS.stamp).toEqual({ from: ['pending_stamp'], to: 'stamped' });
    expect(TRANSITIONS.mark_sent).toEqual({ from: ['stamped'], to: 'sent' });
  });

  it('mark_confirmed: 仅 sent', () => {
    expect(TRANSITIONS.mark_confirmed.from).toEqual(['sent']);
    expect(TRANSITIONS.mark_confirmed.to).toBe('confirmed');
  });

  it('withdraw_sent: 仅 sent → stamped', () => {
    expect(TRANSITIONS.withdraw_sent.from).toEqual(['sent']);
    expect(TRANSITIONS.withdraw_sent.to).toBe('stamped');
  });

  it('return_to_stamp: 仅 stamped → pending_stamp', () => {
    expect(TRANSITIONS.return_to_stamp.from).toEqual(['stamped']);
    expect(TRANSITIONS.return_to_stamp.to).toBe('pending_stamp');
  });

  it('return_to_edit_features: 仅 rejected → draft', () => {
    expect(TRANSITIONS.return_to_edit_features.from).toEqual(['rejected']);
    expect(TRANSITIONS.return_to_edit_features.to).toBe('draft');
  });

  it('return_to_tech: pending_quote → pending_eval', () => {
    expect(TRANSITIONS.return_to_tech.from).toEqual(['pending_quote']);
    expect(TRANSITIONS.return_to_tech.to).toBe('pending_eval');
  });

  it('withdraw_audit: 仅 auditing → pending_quote', () => {
    expect(TRANSITIONS.withdraw_audit.from).toEqual(['auditing']);
    expect(TRANSITIONS.withdraw_audit.to).toBe('pending_quote');
  });

  it('mark_voided: 非终态均可作废', () => {
    expect(TRANSITIONS.mark_voided.from).toContain('draft');
    expect(TRANSITIONS.mark_voided.from).toContain('sent');
    expect(TRANSITIONS.mark_voided.from).not.toContain('confirmed');
    expect(TRANSITIONS.mark_voided.from).not.toContain('voided');
    expect(TRANSITIONS.mark_voided.to).toBe('voided');
  });

  it('new_version: 已驳回/已废止 → draft', () => {
    expect(TRANSITIONS.new_version.from).toEqual(['rejected', 'voided']);
    expect(TRANSITIONS.new_version.to).toBe('draft');
  });
});

describe('applyNewVersion', () => {
  it('新版本从草稿重新确认，且保留旧版本关联', () => {
    const source = fakeQuote('voided', { version: 'v1.2' });
    const next = applyNewVersion(source, 'q-2');
    expect(next.status).toBe('draft');
    expect(next.version).toBe('v2.0');
    expect(next.previousQuoteId).toBe(source.id);
  });
});

describe('buildPricingSummary', () => {
  it('提交审批时固化总价、付款金额、发票和质保默认值', () => {
    const quote = fakeQuote('pending_quote', {
      salesOwnerName: '张三',
      salesAddedRoles: [{ id: 'r1', roleName: '实施', headcount: 1, days: 2, dailyRate: 800, subtotal: 1600, reason: '' }],
    });
    const summary = buildPricingSummary(quote);
    expect(summary.grandTotalPrice).toBe(1600);
    expect(summary.paymentTerms.reduce((sum, term) => sum + term.amount, 0)).toBe(1600);
    expect(summary.invoiceType).toBe('专票');
    expect(summary.warrantyYears).toBe(1);
  });
});

describe('canTransition', () => {
  it('sent 可以 mark_confirmed', () => {
    expect(canTransition('sent', 'mark_confirmed')).toBe(true);
  });

  it('draft 不能 mark_confirmed', () => {
    expect(canTransition('draft', 'mark_confirmed')).toBe(false);
  });

  it('未知 action 返回 false', () => {
    expect(canTransition('sent', 'bogus_action')).toBe(false);
  });
});

describe('generateQuoteNo', () => {
  it('空列表 → QT-2026-1', () => {
    expect(generateQuoteNo([], 2026)).toBe('QT-2026-1');
  });

  it('已有 QT-2026-1..3，下一号为 QT-2026-4', () => {
    const existing = [
      { quoteNo: 'QT-2026-1' },
      { quoteNo: 'QT-2026-2' },
      { quoteNo: 'QT-2026-3' },
    ];
    expect(generateQuoteNo(existing, 2026)).toBe('QT-2026-4');
  });

  it('跨年重置：忽略他年单号', () => {
    const existing = [
      { quoteNo: 'QT-2025-99' },
      { quoteNo: 'QT-2026-1' },
    ];
    expect(generateQuoteNo(existing, 2026)).toBe('QT-2026-2');
  });

  it('非常规单号（旧 ZK 格式）不参与计数', () => {
    const existing = [
      { quoteNo: 'ZK-20260814-001' },
      { quoteNo: 'QT-2026-1' },
    ];
    expect(generateQuoteNo(existing, 2026)).toBe('QT-2026-2');
  });

  it('混合乱序也能正确取最大序号', () => {
    const existing = [
      { quoteNo: 'QT-2026-5' },
      { quoteNo: 'QT-2026-2' },
      { quoteNo: 'QT-2026-10' },
    ];
    expect(generateQuoteNo(existing, 2026)).toBe('QT-2026-11');
  });
});
