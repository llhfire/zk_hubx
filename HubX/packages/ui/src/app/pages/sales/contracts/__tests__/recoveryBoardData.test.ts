import { describe, expect, it } from 'vitest';
import { buildRecoveryBoardContracts } from '../recoveryBoardData';

describe('0829 回款看板导入数据', () => {
  it('导入 25 个项目且合同额、已回款额与源看板一致', () => {
    const contracts = buildRecoveryBoardContracts();
    expect(contracts).toHaveLength(25);
    expect(contracts.every((contract) => contract.dataSource === 'recovery-board')).toBe(true);
    expect(contracts.reduce((sum, contract) => sum + contract.current.totalAmount, 0)).toBe(2_838_200);
    expect(contracts.reduce((sum, contract) => sum + (contract.collectionRecords ?? []).reduce((inner, row) => inner + row.amount, 0), 0)).toBe(1_428_120);
  });

  it('每笔源看板已回款都明确关联对应付款期次', () => {
    const contracts = buildRecoveryBoardContracts();
    contracts.forEach((contract) => {
      (contract.collectionRecords ?? []).forEach((record) => {
        expect(record.period).toBeTypeOf('number');
        expect(contract.current.paymentPlans.some((plan) => plan.period === record.period)).toBe(true);
      });
    });
  });
});
