import type { Contract, PaymentPlanItem } from '../types';
import type { CollectionLedgerEntry } from '@/services/collectionMutations';
import { withCollectionLedger } from '@/services/collectionMutations';

/** 旧回款图表仍消费扁平字段；这里统一从合同当前版本生成只读投影。 */
export function toPaymentAnalysisContract(
  contract: Contract,
  collections: CollectionLedgerEntry[],
): Contract {
  const projected = withCollectionLedger(contract, collections);
  const paymentPlans = projected.current.paymentPlans.map((plan: PaymentPlanItem) => ({
    ...plan,
    periodNo: plan.period,
    planName: plan.periodName ?? `第${plan.period}期`,
    status: 'pending',
  }));

  return {
    ...projected,
    name: projected.current.contractName,
    customerName: projected.current.customerName,
    totalAmount: projected.current.totalAmount,
    signingDate: projected.current.signDate,
    paymentPlans,
    salesOwner: projected.createdBy,
    projectManager: projected.projectId ? '项目负责人' : undefined,
  } as Contract;
}
