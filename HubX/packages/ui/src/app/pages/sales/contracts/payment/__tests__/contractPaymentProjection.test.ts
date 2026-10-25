import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../../mockData';
import { toPaymentAnalysisContract } from '../contractPaymentProjection';

describe('toPaymentAnalysisContract', () => {
  it('从合同当前版本与独立实收台账生成回款分析投影', () => {
    const contract = buildInitialContracts()[0];
    const projected = toPaymentAnalysisContract(contract, [{
      id: 'ledger-alpha-1',
      contractId: contract.id,
      amount: 8800,
      date: '2026-08-28',
      method: '银行汇款',
      note: '',
    }]);
    const view = projected as typeof projected & {
      name: string;
      customerName: string;
      totalAmount: number;
      paymentPlans: Array<{ periodNo: number; planName: string }>;
    };

    expect(view.name).toBe(contract.current.contractName);
    expect(view.customerName).toBe(contract.current.customerName);
    expect(view.totalAmount).toBe(contract.current.totalAmount);
    expect(view.paymentPlans[0].periodNo).toBe(contract.current.paymentPlans[0].period);
    expect(view.collectionRecords?.[0].id).toBe('ledger-alpha-1');
    expect(view.receivedAmount).toBe(8800);
  });
});
