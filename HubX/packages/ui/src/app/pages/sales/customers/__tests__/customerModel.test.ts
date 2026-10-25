import { describe, expect, it } from 'vitest';
import { buildCustomerSnapshot, deriveCustomerStatus, ensureSinglePrimary, findCustomerDuplicate, mergeCustomers } from '../customerModel';
import { INITIAL_CUSTOMERS } from '../mockData';

describe('customerModel', () => {
  it('企业统一社会信用代码强判重，名称只提示', () => {
    const pawkey = INITIAL_CUSTOMERS[0];
    expect(findCustomerDuplicate(INITIAL_CUSTOMERS, { kind: 'enterprise', name: '另一名称', creditCode: pawkey.creditCode })).toMatchObject({ strong: true, reason: 'creditCode' });
    expect(findCustomerDuplicate(INITIAL_CUSTOMERS, { kind: 'enterprise', name: '重庆绮算法科技有限公司' })).toMatchObject({ strong: false, reason: 'similarName' });
  });

  it('个人手机号强判重', () => {
    expect(findCustomerDuplicate(INITIAL_CUSTOMERS, { kind: 'individual', name: '同一人', contact: { name: '林女士', phone: '186 0000 0044' } })).toMatchObject({ strong: true, reason: 'phone' });
  });

  it('同一时刻只有一位有效主联系人', () => {
    const contacts = INITIAL_CUSTOMERS[0].contacts.map((item) => ({ ...item, isPrimary: true }));
    const next = ensureSinglePrimary(contacts, contacts[1].id);
    expect(next.filter((item) => item.isPrimary)).toHaveLength(1);
    expect(next.find((item) => item.isPrimary)?.id).toBe(contacts[1].id);
  });

  it('快照不随客户对象后续修改', () => {
    const source = structuredClone(INITIAL_CUSTOMERS[0]);
    const snapshot = buildCustomerSnapshot(source, undefined, '2026-08-31T00:00:00.000Z');
    source.name = '新名称';
    source.contacts[0].name = '新联系人';
    expect(snapshot.customerName).toBe('重庆绮算法科技有限公司');
    expect(snapshot.contactName).toBe('陈女士');
  });

  it('合作状态由业务事实派生', () => {
    expect(deriveCustomerStatus({ activeMainContractCount: 0, hasActiveProject: false, hasOutstandingCollection: false, hasActiveMaintenance: false, hasHistoricCooperation: false })).toBe('待合作');
    expect(deriveCustomerStatus({ activeMainContractCount: 1, hasActiveProject: true, hasOutstandingCollection: false, hasActiveMaintenance: false, hasHistoricCooperation: true })).toBe('合作中');
    expect(deriveCustomerStatus({ activeMainContractCount: 0, hasActiveProject: false, hasOutstandingCollection: false, hasActiveMaintenance: false, hasHistoricCooperation: true })).toBe('已合作');
  });

  it('合并保留来源别名并停用来源记录', () => {
    const result = mergeCustomers(INITIAL_CUSTOMERS[0], INITIAL_CUSTOMERS[1], '2026-08-31T00:00:00.000Z');
    expect(result.target.aliases).toContain(INITIAL_CUSTOMERS[1].name);
    expect(result.source).toMatchObject({ active: false, mergedIntoId: INITIAL_CUSTOMERS[0].id });
  });
});
