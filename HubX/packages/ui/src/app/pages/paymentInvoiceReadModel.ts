import type { CollectionLedgerEntry } from '../../services/collectionMutations';
import { sumReceived } from '../../services/collectionMutations';
import type { Contract, PaymentPlanItem } from './contracts/types';
import { effectiveAmount } from './contracts/paymentUtils';
import type { ProjectInvoiceApplication } from './finance/ProjectInvoiceContext';
import type { LeadListItem } from './leads/types';

export type PaymentInvoiceStatus = '待收款' | '部分收款' | '逾期' | '已完成';

export interface PaymentInvoicePaymentRow {
  key: string;
  contractNo: string;
  period: number;
  periodName: string;
  planDate: string;
  amount: number;
  receivedAmount: number;
  actualDate: string;
  status: '未收款' | '部分收款' | '已收款' | '逾期';
}

export interface PaymentInvoiceRecordRow {
  id: string;
  recordNo: string;
  contractId: string;
  contractNo: string;
  leadName: string;
  customerEntity: string;
  ourEntity: string;
  totalAmount: number;
  receivedAmount: number;
  receivedRate: number;
  invoicedAmount: number;
  invoicedRate: number;
  status: PaymentInvoiceStatus;
  latestDate: string;
  hasPayment: boolean;
  hasInvoice: boolean;
  payments: PaymentInvoicePaymentRow[];
  invoices: ProjectInvoiceApplication[];
}

function percent(amount: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0;
}

function leadAliases(leadId?: string): string[] {
  if (!leadId) return [];
  return [leadId, leadId.startsWith('lead-') ? leadId.slice(5) : `lead-${leadId}`];
}

function findLeadName(contract: Contract, leads: LeadListItem[]): string {
  const aliases = leadAliases(contract.leadId);
  const lead = leads.find(item => aliases.includes(item.id) || aliases.includes(item.key));
  return lead?.name || contract.current.contractName;
}

function buildPaymentRows(
  contract: Contract,
  plans: PaymentPlanItem[],
  collections: CollectionLedgerEntry[],
  today: string,
): PaymentInvoicePaymentRow[] {
  return plans.map(plan => {
    const records = collections.filter(record => record.period === plan.period);
    const receivedAmount = sumReceived(records);
    const overdue = Boolean(plan.expectedDate && plan.expectedDate < today && receivedAmount < plan.amount);
    return {
      key: `${contract.id}-${plan.period}`,
      contractNo: contract.contractNo,
      period: plan.period,
      periodName: plan.periodName || `第 ${plan.period} 期`,
      planDate: plan.expectedDate || '-',
      amount: plan.amount,
      receivedAmount,
      actualDate: records.map(record => record.date).sort().at(-1) || '-',
      status: receivedAmount >= plan.amount
        ? '已收款'
        : overdue
          ? '逾期'
          : receivedAmount > 0
            ? '部分收款'
            : '未收款',
    };
  });
}

export function buildPaymentInvoiceRows(input: {
  contracts: Contract[];
  collections: CollectionLedgerEntry[];
  applications: ProjectInvoiceApplication[];
  leads: LeadListItem[];
  today?: string;
}): PaymentInvoiceRecordRow[] {
  const today = input.today || new Date().toISOString().slice(0, 10);
  return input.contracts
    .filter(contract => contract.status === 'archived' && contract.kind !== 'supplement')
    .map(contract => {
      const supplements = input.contracts.filter(item => item.kind === 'supplement' && item.parentContractId === contract.id);
      const effectiveSupplements = supplements.filter(item => item.status === 'archived');
      const effectiveContracts = [contract, ...effectiveSupplements];
      const effectiveContractIds = new Set(effectiveContracts.map(item => item.id));
      const collections = input.collections.filter(record => effectiveContractIds.has(record.contractId));
      const invoices = input.applications.filter(application => application.contractId && effectiveContractIds.has(application.contractId));
      const validInvoices = invoices.filter(application => application.status === '已开票');
      const receivedAmount = sumReceived(collections);
      const invoicedAmount = validInvoices.reduce((sum, application) => sum + application.amount, 0);
      const totalAmount = effectiveAmount(contract, supplements);
      const payments = effectiveContracts.flatMap(item => buildPaymentRows(
        item,
        item.current.paymentPlans,
        collections.filter(record => record.contractId === item.id),
        today,
      ));
      const hasOverdue = payments.some(payment => payment.status === '逾期');
      const dates = [
        contract.current.signDate,
        ...collections.map(record => record.date),
        ...invoices.map(invoice => invoice.invoicedAt || invoice.submittedAt),
      ].filter(Boolean).map(date => date.slice(0, 10)).sort();
      const status: PaymentInvoiceStatus = receivedAmount >= totalAmount && invoicedAmount >= totalAmount
        ? '已完成'
        : hasOverdue
          ? '逾期'
          : receivedAmount > 0
            ? '部分收款'
            : '待收款';
      return {
        id: contract.id,
        recordNo: `PI-${contract.contractNo}`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        leadName: findLeadName(contract, input.leads),
        customerEntity: contract.current.customerName,
        ourEntity: contract.current.signingEntity,
        totalAmount,
        receivedAmount,
        receivedRate: percent(receivedAmount, totalAmount),
        invoicedAmount,
        invoicedRate: percent(invoicedAmount, totalAmount),
        status,
        latestDate: dates.at(-1) || '-',
        hasPayment: collections.length > 0,
        hasInvoice: invoices.length > 0,
        payments,
        invoices,
      };
    })
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}
