export type ApprovalSource = 'hubx' | 'wecom';
export type ApprovalStatus = 'approving' | 'approved' | 'rejected' | 'withdrawn' | 'invalidated';

export interface ApprovalTypeDefinition {
  id: string;
  code: string;
  name: string;
  businessModule: string;
  description: string;
  templateName: string;
  enabled: boolean;
  connected: boolean;
  usedCount: number;
  updatedAt: string;
}

export interface ApprovalNodeRecord {
  id: string;
  name: string;
  strategy: '单人审批' | '或签' | '会签';
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comment?: string;
  operatedAt?: string;
}

export interface ApprovalRecord {
  id: string;
  approvalNo: string;
  source: ApprovalSource;
  typeCode: string;
  typeName: string;
  title: string;
  applicant: string;
  applicantId: string;
  businessOwner?: string;
  currentApprover?: string;
  handledBy?: string[];
  status: ApprovalStatus;
  overdue?: boolean;
  amount?: number;
  createdAt: string;
  updatedAt: string;
  route?: string;
  nodes: ApprovalNodeRecord[];
}

