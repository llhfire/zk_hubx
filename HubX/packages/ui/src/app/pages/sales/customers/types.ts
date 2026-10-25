export type CustomerKind = 'enterprise' | 'individual';
export type CustomerLevel = 'S' | 'A' | 'B' | 'C';
export type CustomerBusinessStatus = '待合作' | '合作中' | '已合作';

export interface CustomerContact {
  id: string;
  name: string;
  position?: string;
  phone: string;
  wechat?: string;
  email?: string;
  birthday?: string;
  isPrimary: boolean;
  active: boolean;
  referenced?: boolean;
  createdAt: string;
}

export interface InvoiceProfile {
  title: string;
  taxNo: string;
  bankName: string;
  bankAccount: string;
  address: string;
  phone: string;
  updatedAt: string;
}

export interface InvoiceProfileHistory {
  id: string;
  profile: InvoiceProfile;
  changedAt: string;
  changedBy: string;
}

export interface Customer {
  id: string;
  kind: CustomerKind;
  name: string;
  creditCode?: string;
  industry?: string;
  scale?: string;
  address?: string;
  source?: string;
  ownerId: string;
  ownerName: string;
  level: CustomerLevel;
  active: boolean;
  contacts: CustomerContact[];
  invoiceProfile?: InvoiceProfile;
  invoiceHistory: InvoiceProfileHistory[];
  aliases?: string[];
  mergedIntoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSnapshot {
  customerId: string;
  customerName: string;
  customerKind: CustomerKind;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  invoiceProfile?: InvoiceProfile;
  capturedAt: string;
}

export interface CustomerCreateInput {
  kind: CustomerKind;
  name: string;
  creditCode?: string;
  industry?: string;
  scale?: string;
  address?: string;
  source?: string;
  ownerId?: string;
  ownerName?: string;
  level?: CustomerLevel;
  contact?: Pick<CustomerContact, 'name' | 'phone'> & Partial<Omit<CustomerContact, 'id' | 'name' | 'phone' | 'createdAt'>>;
}

export interface CustomerSummary {
  key: string;
  name: string;
  type: string;
  industry: string;
  scale: string;
  contact: string;
  phone: string;
  level: string;
  status: string;
  contractCount: number;
  contractAmount: string;
  receivable: string;
  createTime: string;
}
