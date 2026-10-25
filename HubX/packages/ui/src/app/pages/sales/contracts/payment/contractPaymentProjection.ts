import type { Contract, PaymentPlanItem } from '../types';
import type { CollectionLedgerEntry } from '../../../../../services/collectionMutations';
import { withCollectionLedger } from '../../../../../services/collectionMutations';

/**
 * 回款分析投影：原始 `Contract` 的付款信息都在 `current` 下，
 * 而回款看板/甘特图是围绕扁平字段写的（`totalAmount` / `paymentPlans` /
 * `customerName` …）。这里给出这层投影的**显式类型**，
 * 取代之前 `as Contract` 的强制转换 —— 那个转换让编译器完全看不见这些字段，
 * 于是图表侧读错字段名（`periodNo` / `planName` / `salesOwner`）长期无报错。
 */
export interface PaymentAnalysisContract extends Contract {
  /** 来自 current.contractName */
  name: string;
  /** 来自 current.customerName */
  customerName: string;
  /** 来自 current.totalAmount */
  totalAmount: number;
  /** 来自 current.signDate */
  signingDate: string;
  /** 期次计划：在 current.paymentPlans 基础上补 periodNo / planName */
  paymentPlans: Array<PaymentPlanItem & { periodNo: number; planName: string; status: string }>;
  /** 签约人：回款看板用合同创建人兜底（合同上没有独立销售负责人字段） */
  salesOwner: string;
  projectManager?: string;
}

/** 旧回款图表仍消费扁平字段；这里统一从合同当前版本生成只读投影。 */
export function toPaymentAnalysisContract(
  contract: Contract,
  collections: CollectionLedgerEntry[],
): PaymentAnalysisContract {
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
  };
}
