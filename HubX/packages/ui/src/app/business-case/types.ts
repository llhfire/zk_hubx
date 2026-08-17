export type LeadSalesStatus =
  | '未联系'
  | '未接通'
  | '初步沟通'
  | '需求调研'
  | '方案报价'
  | '合同洽谈'
  | '已签单'
  | '已终止';

export const SIGNING_LEAD_STATUSES: readonly LeadSalesStatus[] = ['合同洽谈', '已签单'];

export interface ContractRef {
  status: string;
}

export interface BusinessCase {
  id: string;
  leadId: string;
  projectId: string | null;
  contractId: string | null;
  extraContractIds: string[];
  quoteIds: string[];
}

export interface UnconfirmedProject {
  id: string;
  leadId: string;
  status: '未确认';
  productUsers: string[];
}

export type LeadProjectBanner = 'none' | 'pending_confirm' | 'assigned' | 'in_execution';
