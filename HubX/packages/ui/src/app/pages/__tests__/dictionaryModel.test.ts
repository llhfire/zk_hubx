import { describe, expect, it } from 'vitest';
import {
  calculateDictionaryMetrics,
  filterDictionaryItems,
  filterDictionaryTypes,
  hasDictionaryFilters,
  type DictionaryItem,
  type DictionaryType,
} from '../dictionaryModel';

const types: DictionaryType[] = [
  { id: '1', code: 'customer_source', name: '客户来源', description: '客户渠道分类', status: '启用', createTime: '2026-01-01' },
  { id: '2', code: 'lead_status', name: '线索状态', description: '销售阶段分类', status: '禁用', createTime: '2026-01-02' },
];

const items: DictionaryItem[] = [
  { id: '1-2', label: '抖音推广', value: 'douyin', sort: 2, status: '禁用', remark: '信息流渠道' },
  { id: '1-1', label: '百度推广', value: 'baidu', sort: 1, status: '启用', remark: '搜索渠道' },
];

describe('dictionaryModel', () => {
  it('按编码、名称、描述和状态筛选分类', () => {
    expect(filterDictionaryTypes(types, { keyword: 'customer', status: '全部' }).map(item => item.id)).toEqual(['1']);
    expect(filterDictionaryTypes(types, { keyword: '阶段', status: '禁用' }).map(item => item.id)).toEqual(['2']);
  });

  it('按标签、值、备注筛选字典项并按顺序排列', () => {
    expect(filterDictionaryItems(items, { keyword: '推广', status: '全部' }).map(item => item.id)).toEqual(['1-1', '1-2']);
    expect(filterDictionaryItems(items, { keyword: '信息流', status: '禁用' }).map(item => item.id)).toEqual(['1-2']);
  });

  it('计算分类与当前字典项摘要', () => {
    expect(calculateDictionaryMetrics(types, { '1': items }, '1')).toEqual({
      typeCount: 2,
      activeTypeCount: 1,
      currentItemCount: 2,
      activeCurrentItemCount: 1,
    });
  });

  it('识别有效筛选条件', () => {
    expect(hasDictionaryFilters({ keyword: '  ', status: '全部' })).toBe(false);
    expect(hasDictionaryFilters({ keyword: '客户', status: '全部' })).toBe(true);
    expect(hasDictionaryFilters({ keyword: '', status: '禁用' })).toBe(true);
  });
});
