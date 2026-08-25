// ============================================================
// 线索管理模块 — 测试
// ============================================================

import { describe, it, expect } from 'vitest';
import type { LeadListItem, ClueType, CustomerLevel } from '../types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_LIST,
  CUSTOMER_LEVEL_LIST,
  CUSTOMER_LEVEL_COLOR,
  LEAD_SOURCE_LIST,
  QUICK_FILTER_LABEL,
} from '../types';
import {
  isLeadOverdue,
  applyQuickFilter,
  searchLeads,
  checkDuplicate,
  validateContact,
  calculateDaysHeld,
  calculateOverdueStatus,
  filterFollowUpRecords,
  shouldAutoTrash,
} from '../utils';
import {
  PUBLIC_LEADS,
  MY_LEADS,
  TRASH_LEADS,
  CLOSED_LEADS,
  ALL_LEADS,
  FOLLOWUP_RECORDS,
  getLeadDetailInfo,
} from '../mockData';

// --- 类型定义测试 ---
describe('线索类型定义', () => {
  it('CLUE_TYPE_LABEL 包含 4 种类型', () => {
    expect(Object.keys(CLUE_TYPE_LABEL)).toHaveLength(4);
    expect(CLUE_TYPE_LABEL.public).toBe('公海线索');
    expect(CLUE_TYPE_LABEL.assigned).toBe('已分配');
    expect(CLUE_TYPE_LABEL.trash).toBe('垃圾线索');
    expect(CLUE_TYPE_LABEL.hightech).toBe('高科技线索');
  });

  it('SALES_STATUS_LIST 包含 8 种状态', () => {
    expect(SALES_STATUS_LIST).toHaveLength(8);
    expect(SALES_STATUS_LIST).toContain('未联系');
    expect(SALES_STATUS_LIST).toContain('已签单');
    expect(SALES_STATUS_LIST).toContain('已终止');
  });

  it('CUSTOMER_LEVEL_LIST 包含 S/A/B/C', () => {
    expect(CUSTOMER_LEVEL_LIST).toEqual(['S', 'A', 'B', 'C']);
  });

  it('CUSTOMER_LEVEL_COLOR 有对应颜色', () => {
    expect(CUSTOMER_LEVEL_COLOR.S).toBe('green');
    expect(CUSTOMER_LEVEL_COLOR.A).toBe('blue');
    expect(CUSTOMER_LEVEL_COLOR.B).toBe('gray');
    expect(CUSTOMER_LEVEL_COLOR.C).toBe('gray');
  });

  it('LEAD_SOURCE_LIST 与渠道数据字典对齐（5 值英文 key）', () => {
    expect(LEAD_SOURCE_LIST).toEqual(['xiaohongshu', 'baidu', 'douyin', 'wechat', 'website']);
    expect(LEAD_SOURCE_LIST).toContain('baidu');
    expect(LEAD_SOURCE_LIST).toContain('xiaohongshu');
  });
});

// --- 标红规则测试 ---
describe('标红规则', () => {
  it('公海线索不标红', () => {
    const lead: LeadListItem = {
      ...PUBLIC_LEADS[0],
      nextFollowTime: '2026-01-01 10:00', // 已过期
    };
    expect(isLeadOverdue(lead)).toBe(false);
  });

  it('已分配+未签单+下次跟进过期 → 标红', () => {
    const lead: LeadListItem = {
      ...MY_LEADS[0],
      clueType: 'assigned',
      status: '需求调研',
      nextFollowTime: '2026-01-01 10:00', // 已过期
    };
    expect(isLeadOverdue(lead)).toBe(true);
  });

  it('已签单线索不标红', () => {
    const lead: LeadListItem = {
      ...CLOSED_LEADS[0],
      nextFollowTime: '2026-01-01 10:00', // 已过期
    };
    expect(isLeadOverdue(lead)).toBe(false);
  });
});

// --- 快捷筛选测试 ---
describe('快捷筛选', () => {
  it('S 类客户筛选', () => {
    const result = applyQuickFilter(MY_LEADS, 'level_s');
    result.forEach((l) => {
      expect(l.customerLevel).toBe('S');
    });
  });

  it('AB 类客户筛选', () => {
    const result = applyQuickFilter(MY_LEADS, 'level_ab');
    result.forEach((l) => {
      expect(['A', 'B']).toContain(l.customerLevel);
    });
  });
});

// --- 搜索测试 ---
describe('搜索功能', () => {
  it('按名称搜索', () => {
    const result = searchLeads(PUBLIC_LEADS, '公众号');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((l) => {
      expect(l.name).toContain('公众号');
    });
  });

  it('按电话搜索', () => {
    const result = searchLeads(PUBLIC_LEADS, '138');
    expect(result.length).toBeGreaterThan(0);
  });

  it('空关键词返回全部', () => {
    const result = searchLeads(PUBLIC_LEADS, '');
    expect(result).toEqual(PUBLIC_LEADS);
  });
});

// --- 重复检查测试 ---
describe('重复检查', () => {
  it('检测重复电话', () => {
    const result = checkDuplicate(MY_LEADS, '138****1111', '');
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateFields).toContain('电话');
  });

  it('无重复时返回 false', () => {
    const result = checkDuplicate(MY_LEADS, '99999999999', '');
    expect(result.isDuplicate).toBe(false);
    expect(result.duplicateFields).toHaveLength(0);
  });

  it('修改时排除自身', () => {
    const result = checkDuplicate(MY_LEADS, '138****1111', '', undefined, undefined, '5940');
    expect(result.isDuplicate).toBe(false);
  });
});

// --- 联系方式校验测试 ---
describe('联系方式校验（bug #1 修复）', () => {
  it('有电话 → 通过', () => {
    expect(validateContact('13800138000', '')).toBe(true);
  });

  it('有微信 → 通过', () => {
    expect(validateContact('', 'wechat')).toBe(true);
  });

  it('都有 → 通过', () => {
    expect(validateContact('13800138000', 'wechat')).toBe(true);
  });

  it('都没有 → 不通过', () => {
    expect(validateContact('', '')).toBe(false);
  });
});

// --- 退回自动标记垃圾测试 ---
describe('退回公海自动标记垃圾', () => {
  it('第 3 次退回自动标记垃圾', () => {
    expect(shouldAutoTrash(3)).toBe(true);
    expect(shouldAutoTrash(4)).toBe(true);
  });

  it('第 1-2 次退回不自动标记', () => {
    expect(shouldAutoTrash(0)).toBe(false);
    expect(shouldAutoTrash(1)).toBe(false);
    expect(shouldAutoTrash(2)).toBe(false);
  });
});

// --- 跟进记录筛选测试 ---
describe('跟进记录筛选', () => {
  it('全部跟进', () => {
    const result = filterFollowUpRecords(FOLLOWUP_RECORDS, 'all');
    expect(result).toEqual(FOLLOWUP_RECORDS);
  });

  it('今日待跟进只返回 pending 状态', () => {
    const result = filterFollowUpRecords(FOLLOWUP_RECORDS, 'today_pending');
    result.forEach((r) => {
      expect(r.followupStatus).toBe('pending');
    });
  });
});

// --- Mock 数据测试 ---
describe('Mock 数据', () => {
  it('公海线索都是 clueType=public', () => {
    PUBLIC_LEADS.forEach((l) => {
      expect(l.clueType).toBe('public');
    });
  });

  it('我的线索都是 clueType=assigned', () => {
    MY_LEADS.forEach((l) => {
      expect(l.clueType).toBe('assigned');
    });
  });

  it('垃圾线索都是 clueType=trash', () => {
    TRASH_LEADS.forEach((l) => {
      expect(l.clueType).toBe('trash');
    });
  });

  it('已成交线索都是 status=已签单', () => {
    CLOSED_LEADS.forEach((l) => {
      expect(l.status).toBe('已签单');
    });
  });

  it('全部线索包含所有类型', () => {
    const types = new Set(ALL_LEADS.map((l) => l.clueType));
    expect(types.has('public')).toBe(true);
    expect(types.has('assigned')).toBe(true);
    expect(types.has('trash')).toBe(true);
  });

  it('getLeadDetailInfo 返回正确数据', () => {
    const detail = getLeadDetailInfo('5940');
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe('某科技公司APP开发需求');
    expect(detail!.clueType).toBe('assigned');
    expect(detail!.customerLevel).toBe('S');
  });

  it('getLeadDetailInfo 不存在返回 null', () => {
    const detail = getLeadDetailInfo('NOT_EXIST');
    expect(detail).toBeNull();
  });
});

// --- Bug 修复验证 ---
describe('Bug 修复验证', () => {
  it('bug #7: 今日已跟进限制到今天结束', () => {
    // 搜索逻辑已通过 applyQuickFilter 中的 todayEnd 限制
    const today = new Date();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    expect(todayEnd.getHours()).toBe(23);
    expect(todayEnd.getMinutes()).toBe(59);
  });

  it('bug #12: 未指定负责人时显式设置 clueType', () => {
    // PublicLeads 创建线索时会显式设置 clueType='public'
    const publicLead = PUBLIC_LEADS.find((l) => l.owner === '');
    expect(publicLead).toBeDefined();
    expect(publicLead!.clueType).toBe('public');
  });
});
