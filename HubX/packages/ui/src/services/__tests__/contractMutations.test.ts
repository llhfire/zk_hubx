import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../../app/pages/contracts/mockData';
import { applyCreateFromWizard } from '../contractMutations';

function supplementInput() {
  const formData = {
    ...buildInitialContracts().find(contract => contract.id === '9')!.current,
    contractName: '华信科技OA增项补充合同',
    totalAmount: -20_000,
  };
  return {
    kind: 'supplement' as const,
    leadId: 'lead-9',
    quoteId: 'quote-9-s1',
    parentContractId: '9',
    sourceQuoteId: 'quote-9-s1',
    formData,
  };
}

describe('applyCreateFromWizard 补充合同约束', () => {
  it('必须关联主合同和来源补充报价', () => {
    expect(() => applyCreateFromWizard(
      { ...supplementInput(), parentContractId: undefined },
      's1', 'HT-S1', '2026-08-28 10:00',
    )).toThrow('补充合同必须关联主合同');
    expect(() => applyCreateFromWizard(
      { ...supplementInput(), sourceQuoteId: undefined },
      's1', 'HT-S1', '2026-08-28 10:00',
    )).toThrow('补充合同必须来源于已确认的补充报价');
  });

  it('保留负向变更额并建立一对一溯源字段', () => {
    const contract = applyCreateFromWizard(supplementInput(), 's1', 'HT-S1', '2026-08-28 10:00');
    expect(contract).toMatchObject({
      kind: 'supplement',
      parentContractId: '9',
      sourceQuoteId: 'quote-9-s1',
      quoteId: 'quote-9-s1',
    });
    expect(contract.current.totalAmount).toBe(-20_000);
  });
});
