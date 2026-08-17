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

/** 售前历程时间线事件类型：线索创建 / 售前跟进 / 报价 / 合同 */
export type PresalesEventType = 'lead' | 'follow' | 'quote' | 'contract';

export interface PresalesEvent {
  id: string;
  /** 格式 YYYY-MM-DD HH:mm（可能带秒，排序时按前 16 位比较） */
  time: string;
  type: PresalesEventType;
  title: string;
  detail?: string;
  status?: string;
}

export interface PresalesFollowRecord {
  id: string;
  time: string;
  method: string;
  content: string;
  operator: string;
}

export interface PresalesQuoteRecord {
  id: string;
  name: string;
  createTime: string;
  amount?: string;
  status?: string;
  flowStatus?: string;
}

export interface PresalesContractRecord {
  id: string;
  contractNo?: string;
  createTime?: string;
  status?: string;
}
