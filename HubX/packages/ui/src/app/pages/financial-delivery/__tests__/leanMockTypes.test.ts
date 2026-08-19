/**
 * 精益交付 L2 护栏测试
 * - mock 结构匹配 types
 * - mockCostItems 无 dr-/reimb- 前缀 sourceId
 * - mockCases 汇总数字段已删除
 */
import { describe, it, expect } from 'vitest';
import {
  mockCases,
  mockCostItems,
  mockPostMortems,
} from '../mockData';
import type { Case, CaseCostItem, CasePostMortem } from '../types';

describe('mockCases 类型兼容', () => {
  it('mockCases 可赋给 Case[]', () => {
    const cases: Case[] = mockCases;
    expect(cases.length).toBeGreaterThanOrEqual(1);
  });

  it('每条 Case 都有 quoteIds', () => {
    for (const c of mockCases) {
      expect(Array.isArray(c.quoteIds)).toBe(true);
    }
  });

  it('汇总数字段已删除（undefined）', () => {
    for (const c of mockCases) {
      expect(c.totalCost).toBeUndefined();
      expect(c.totalRevenue).toBeUndefined();
      expect(c.currentMargin).toBeUndefined();
      expect(c.eac).toBeUndefined();
      expect(c.healthStatus).toBeUndefined();
      expect(c.contractAmount).toBeUndefined();
    }
  });
});

describe('mockCostItems 类型兼容', () => {
  it('mockCostItems 可赋给 CaseCostItem[]', () => {
    const items: CaseCostItem[] = mockCostItems;
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('无 dr- 前缀 sourceId', () => {
    for (const item of mockCostItems) {
      if (item.sourceId) {
        expect(item.sourceId).not.toMatch(/^dr-/);
      }
    }
  });

  it('无 reimb- 前缀 sourceId', () => {
    for (const item of mockCostItems) {
      if (item.sourceId) {
        expect(item.sourceId).not.toMatch(/^reimb-/);
      }
    }
  });

  it('有 overhead 类型的成本项', () => {
    const overheadItems = mockCostItems.filter(i => i.sourceType === 'overhead');
    expect(overheadItems.length).toBeGreaterThanOrEqual(1);
  });

  it('出差补贴 costCategory 为 commercial', () => {
    const travelItems = mockCostItems.filter(i => i.costType === '差旅');
    for (const item of travelItems) {
      expect(item.costCategory).toBe('commercial');
    }
  });
});

describe('mockPostMortems PnLSnapshot 双字段', () => {
  it('mockPostMortems 可赋给 CasePostMortem[]', () => {
    const pms: CasePostMortem[] = mockPostMortems;
    expect(pms.length).toBeGreaterThanOrEqual(1);
  });

  it('PnLSnapshot 有双字段', () => {
    for (const pm of mockPostMortems) {
      expect(pm.predictedPnl.grossMarginAmount).toBeDefined();
      expect(pm.predictedPnl.grossMarginRate).toBeDefined();
      expect(pm.predictedPnl.netMarginAmount).toBeDefined();
      expect(pm.predictedPnl.netMarginRate).toBeDefined();
      // 旧字段不存在
      expect((pm.predictedPnl as any).grossMargin).toBeUndefined();
      expect((pm.predictedPnl as any).netMargin).toBeUndefined();
    }
  });
});
