import { describe, expect, it, vi } from 'vitest';
import {
  migrateQuote,
  TRANSITIONS,
  canTransition,
  generateQuoteNoV2,
} from '@/services/quotationMutations';
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
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [],
    auditNodes: [],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
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

  it('已是新词表的 quote 幂等（两次调用结果相等）', () => {
    const q = fakeQuote('confirmed');
    const first = migrateQuote(q);
    const second = migrateQuote(first);
    expect(first.status).toBe('confirmed');
    expect(second.status).toBe('confirmed');
    expect(first).toEqual(second);
  });

  it('未知 status 保留原值并 console 警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const q = { ...fakeQuote('draft'), status: 'bogus' as QuoteStatus };
    const result = migrateQuote(q);
    expect(result.status).toBe('bogus');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('未知状态'));
    warnSpy.mockRestore();
  });
});

describe('TRANSITIONS 合法迁移矩阵', () => {
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

describe('generateQuoteNoV2', () => {
  it('空列表 → QT-2026-1', () => {
    expect(generateQuoteNoV2([], 2026)).toBe('QT-2026-1');
  });

  it('已有 QT-2026-1..3，下一号为 QT-2026-4', () => {
    const existing = [
      { quoteNo: 'QT-2026-1' },
      { quoteNo: 'QT-2026-2' },
      { quoteNo: 'QT-2026-3' },
    ];
    expect(generateQuoteNoV2(existing, 2026)).toBe('QT-2026-4');
  });

  it('跨年重置：忽略他年单号', () => {
    const existing = [
      { quoteNo: 'QT-2025-99' },
      { quoteNo: 'QT-2026-1' },
    ];
    expect(generateQuoteNoV2(existing, 2026)).toBe('QT-2026-2');
  });

  it('非常规单号（旧 ZK 格式）不参与计数', () => {
    const existing = [
      { quoteNo: 'ZK-20260814-001' },
      { quoteNo: 'QT-2026-1' },
    ];
    expect(generateQuoteNoV2(existing, 2026)).toBe('QT-2026-2');
  });

  it('混合乱序也能正确取最大序号', () => {
    const existing = [
      { quoteNo: 'QT-2026-5' },
      { quoteNo: 'QT-2026-2' },
      { quoteNo: 'QT-2026-10' },
    ];
    expect(generateQuoteNoV2(existing, 2026)).toBe('QT-2026-11');
  });
});
