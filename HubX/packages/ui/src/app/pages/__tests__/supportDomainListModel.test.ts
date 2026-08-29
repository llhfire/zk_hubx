import { describe, expect, test } from 'vitest';
import {
  filterAssetRecords,
  filterRecordsByKeyword,
  filterSupplierRecords,
  hasAssetFilters,
  hasSupplierFilters,
} from '../supportDomainListModel';

describe('支撑域列表模型', () => {
  test('资产页签、关键词、类型和状态筛选可组合生效', () => {
    const records = [
      { name: '生产服务器', type: 'server', status: 'active', vendor: '阿里云', department: '技术部' },
      { name: '测试手机', type: 'device', status: 'expired', vendor: 'Apple', assignee: '张三' },
    ];
    expect(filterAssetRecords(records, { keyword: '阿里', type: 'server', status: 'active', activeType: 'server' })).toHaveLength(1);
    expect(filterAssetRecords(records, { keyword: '', type: '', status: 'expired', activeType: 'server' })).toHaveLength(0);
    expect(hasAssetFilters({ keyword: '', type: '', status: '', activeType: 'all' })).toBe(false);
  });

  test('供应商可按联系人、技能和类型检索', () => {
    const suppliers = [
      { name: '蓝鸟科技', type: 'company', contactPerson: '王经理', phone: '13800138000', email: 'wang@example.com', skills: ['前端开发'] },
      { name: '张明', type: 'individual', contactPerson: '张明', phone: '13900139000', email: 'zhang@example.com', skills: ['iOS开发'] },
    ];
    expect(filterSupplierRecords(suppliers, { keyword: 'iOS', type: 'individual' })[0]?.name).toBe('张明');
    expect(hasSupplierFilters({ keyword: '', type: '' })).toBe(false);
  });

  test('通用关键词筛选覆盖售后各类记录', () => {
    const tickets = [
      { title: '登录异常', customer: '甲方', project: '门户项目' },
      { title: '页面卡顿', customer: '乙方', project: '移动端' },
    ];
    expect(filterRecordsByKeyword(tickets, '门户', item => [item.title, item.customer, item.project])).toEqual([tickets[0]]);
    expect(filterRecordsByKeyword(tickets, '', item => [item.title])).toBe(tickets);
  });
});
