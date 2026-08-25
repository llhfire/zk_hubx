import { describe, expect, it } from 'vitest';
import { matchEntities, highlightParts, nextFocusIndex } from '../matchEntities';
import type { SearchItem } from '../types';

function lead(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    kind: 'lead',
    route: '/leads/l-001',
    title: '和昇塑料',
    meta: 'L-001 · 归属: 李四',
    fields: ['和昇塑料', '吴总', '15900001111', 'L-001'],
    sortKey: '2026-08-20',
    ...overrides,
  };
}

function quote(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    kind: 'quote',
    route: '/quotation/q1',
    title: '微官网项目',
    meta: 'ZK-20260814-001 · 和昇塑料',
    fields: ['微官网项目', 'ZK-20260814-001', '和昇塑料'],
    sortKey: 'ZK-20260814-001',
    ...overrides,
  };
}

function contract(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    kind: 'contract',
    route: '/contracts/1',
    title: '微官网开发合同',
    meta: 'CT-202608001 · 和昇塑料',
    fields: ['微官网开发合同', 'CT-202608001', '和昇塑料'],
    sortKey: 'CT-202608001',
    ...overrides,
  };
}

function employee(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    kind: 'employee',
    route: '/employees/e-001',
    title: '张产品',
    meta: '产品部 · 产品经理',
    fields: ['张产品', '产品部', '产品经理', 'EMP-001'],
    sortKey: 'EMP-001',
    ...overrides,
  };
}

describe('matchEntities', () => {
  it('空关键词返回空', () => {
    expect(matchEntities('', [lead()])).toEqual([]);
    expect(matchEntities('   ', [lead()])).toEqual([]);
  });

  it('单关键词命中', () => {
    const groups = matchEntities('和昇', [lead(), quote(), employee()]);
    expect(groups.length).toBe(2); // lead + quote
    expect(groups[0].kind).toBe('lead');
    expect(groups[0].items.length).toBe(1);
    expect(groups[0].items[0].title).toBe('和昇塑料');
    expect(groups[1].kind).toBe('quote');
  });

  it('多词 AND 语义（「郑州 物联网」两段都命中才出）', () => {
    const items: SearchItem[] = [
      {
        kind: 'lead',
        route: '/leads/l-henan-iot',
        title: '郑州物联网项目',
        meta: 'L-HENAN',
        fields: ['郑州物联网项目', '李总', '138'],
        sortKey: '2026-08-20',
      },
      {
        kind: 'lead',
        route: '/leads/l-shanghai-iot',
        title: '上海项目',
        meta: 'L-SH',
        fields: ['上海物联网项目', '张总'],
        sortKey: '2026-08-19',
      },
      {
        kind: 'lead',
        route: '/leads/l-henan-web',
        title: '郑州官网',
        meta: 'L-HENAN2',
        fields: ['郑州官网', '王总'],
        sortKey: '2026-08-18',
      },
    ];
    const groups = matchEntities('郑州 物联网', items);
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(1);
    expect(groups[0].items[0].title).toBe('郑州物联网项目');
  });

  it('大小写不敏感', () => {
    const items: SearchItem[] = [
      quote({ fields: ['MiCROsite', 'ZK-001', 'Customer'] }),
    ];
    const groups = matchEntities('micro', items);
    expect(groups.length).toBe(1);
    expect(groups[0].items[0].title).toBe('微官网项目');
  });

  it('每类 Top 5 截断', () => {
    const items: SearchItem[] = Array.from({ length: 8 }, (_, i) =>
      lead({
        route: `/leads/l-${i}`,
        title: `线索${i}`,
        fields: [`线索${i}`, '测试', '138'],
        sortKey: `2026-08-${20 - i}`,
      }),
    );
    const groups = matchEntities('线索', items);
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(5);
    // sortKey 倒序：最新的在前
    expect(groups[0].items[0].title).toBe('线索0');
  });

  it('类内新->旧排序', () => {
    const items: SearchItem[] = [
      lead({ sortKey: '2026-08-10', title: '旧线索', fields: ['旧线索', '张三'] }),
      lead({ sortKey: '2026-08-20', title: '新线索', route: '/leads/l-new', fields: ['新线索', '李四'] }),
    ];
    const groups = matchEntities('线索', items);
    expect(groups[0].items[0].title).toBe('新线索');
    expect(groups[0].items[1].title).toBe('旧线索');
  });

  it('垃圾箱线索不出现在结果中（由 searchIndex 过滤，这里只测 matchEntities 本身）', () => {
    // matchEntities 本身不做排除——排除在 searchIndex 映射层
    // 这里验证：如果 SearchItem 已被过滤（不在 items 里），则不出结果
    const items: SearchItem[] = [
      lead({ title: '好线索', fields: ['好线索'] }),
    ];
    // trash 线索根本不会出现在 items 里
    const groups = matchEntities('线索', items);
    expect(groups[0].items.length).toBe(1);
  });

  it('作废合同仍可搜', () => {
    const items: SearchItem[] = [
      contract({ title: '已作废合同', fields: ['已作废合同', 'CT-OLD'] }),
    ];
    const groups = matchEntities('作废', items);
    expect(groups.length).toBe(1);
    expect(groups[0].kind).toBe('contract');
  });

  it('命中间不出组', () => {
    const groups = matchEntities('不存在的词', [lead(), quote()]);
    expect(groups.length).toBe(0);
  });

  it('组序按 ENTITY_ORDER（lead -> customer -> quote -> contract -> project -> employee）', () => {
    const items: SearchItem[] = [
      employee({ fields: ['测试'] }),
      lead({ fields: ['测试'], route: '/leads/test' }),
      contract({ fields: ['测试'], route: '/contracts/test' }),
    ];
    const groups = matchEntities('测试', items);
    expect(groups.map((g) => g.kind)).toEqual(['lead', 'contract', 'employee']);
  });
});

describe('highlightParts', () => {
  it('空关键词返回原文', () => {
    expect(highlightParts('和昇塑料', '')).toEqual([
      { text: '和昇塑料', hit: false },
    ]);
  });

  it('单次命中切三段', () => {
    const parts = highlightParts('和昇塑料项目', '塑料');
    expect(parts).toEqual([
      { text: '和昇', hit: false },
      { text: '塑料', hit: true },
      { text: '项目', hit: false },
    ]);
  });

  it('大小写不敏感命中', () => {
    const parts = highlightParts('MiCROsite', 'micro');
    expect(parts).toEqual([
      { text: 'MiCRO', hit: true },
      { text: 'site', hit: false },
    ]);
  });

  it('多词命中区间合并', () => {
    // '和' 和 '塑料' 两个 term
    const parts = highlightParts('和昇塑料', '和 塑料');
    // '和' 在 [0,1)，'塑料' 在 [2,4)
    expect(parts).toEqual([
      { text: '和', hit: true },
      { text: '昇', hit: false },
      { text: '塑料', hit: true },
    ]);
  });

  it('无命中返回原文', () => {
    expect(highlightParts('和昇塑料', '官网')).toEqual([
      { text: '和昇塑料', hit: false },
    ]);
  });
});

describe('nextFocusIndex', () => {
  it('total=0 恒 -1', () => {
    expect(nextFocusIndex(-1, 1, 0)).toBe(-1);
    expect(nextFocusIndex(0, 1, 0)).toBe(-1);
  });

  it('无焦点时正向到 0', () => {
    expect(nextFocusIndex(-1, 1, 5)).toBe(0);
  });

  it('无焦点时反向到末尾', () => {
    expect(nextFocusIndex(-1, -1, 5)).toBe(4);
  });

  it('正向循环', () => {
    expect(nextFocusIndex(0, 1, 3)).toBe(1);
    expect(nextFocusIndex(2, 1, 3)).toBe(0); // 循环回 0
  });

  it('反向循环', () => {
    expect(nextFocusIndex(2, -1, 3)).toBe(1);
    expect(nextFocusIndex(0, -1, 3)).toBe(2); // 循环到末尾
  });
});
