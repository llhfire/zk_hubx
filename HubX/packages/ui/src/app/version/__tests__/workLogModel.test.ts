import { describe, expect, it } from 'vitest';
import {
  addWorkLogItem,
  createSeedWorkLog,
  isValidWorkLog,
  itemsByCategory,
  normalizeWorkLog,
  removeWorkLogItem,
  todayISODate,
} from '../workLogModel';

describe('workLogModel', () => {
  it('todayISODate 格式为 YYYY-MM-DD', () => {
    expect(todayISODate(new Date(2026, 7, 22, 15))).toBe('2026-08-22');
  });

  it('种子日志合法', () => {
    expect(isValidWorkLog(createSeedWorkLog())).toBe(true);
  });

  it('normalize 丢掉非法日期和空说明', () => {
    const log = normalizeWorkLog({
      days: [
        { date: 'bad', items: [{ id: '1', category: '功能', text: 'x' }] },
        { date: '2026-08-22', items: [{ id: '2', category: '未知', text: 'x' }, { id: '3', category: '文档', text: '  写 ADR  ' }] },
      ],
    });
    expect(log.days).toEqual([
      { date: '2026-08-22', items: [{ id: '3', category: '文档', text: '写 ADR' }] },
    ]);
  });

  it('add 按日期降序，空文案不写入', () => {
    const empty = { days: [] };
    expect(addWorkLogItem(empty, '2026-08-22', '功能', '   ')).toEqual(empty);
    const next = addWorkLogItem(empty, '2026-08-21', '底座', '修洞 A');
    const later = addWorkLogItem(next, '2026-08-22', '文档', '补交接');
    expect(later.days.map(day => day.date)).toEqual(['2026-08-22', '2026-08-21']);
    expect(later.days[0].items[0].text).toBe('补交接');
  });

  it('remove 删空日后丢掉该日', () => {
    const log = {
      days: [{ date: '2026-08-22', items: [{ id: 'a', category: '功能' as const, text: 'x' }] }],
    };
    expect(removeWorkLogItem(log, '2026-08-22', 'a')).toEqual({ days: [] });
  });

  it('itemsByCategory 按固定分类顺序分组', () => {
    const groups = itemsByCategory([
      { id: '1', category: '修洞', text: 'C' },
      { id: '2', category: '功能', text: '页签' },
      { id: '3', category: '功能', text: '记录' },
    ]);
    expect(groups.map(group => group.category)).toEqual(['功能', '修洞']);
    expect(groups[0].items).toHaveLength(2);
  });

  it('空 days 也算合法（允许清空）', () => {
    expect(isValidWorkLog({ days: [] })).toBe(true);
    expect(isValidWorkLog({})).toBe(false);
  });
});
