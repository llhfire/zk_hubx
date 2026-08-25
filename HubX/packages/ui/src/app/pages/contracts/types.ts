// 合同模块的核心类型定义。
//
// 合同是主体，每次修改保存为完整版本快照。审批轮次通过 versionNo
// 归属到具体版本，approvedVersionNo 指向当前审批通过的终稿。

export type ContractStatus =
  | 'draft' // 草稿
  | 'approving' // 审批中
  | 'pending_mail' // 待寄出（审批通过，等行政打印盖章邮寄）
  | 'pending_return' // 待回寄（已寄出，等客户签字盖章后回寄）
  | 'archived' // 已归档（扫描件入库）
  | 'voided'; // 已作废（终态）

export type ApprovalNodeStatus = 'pending' | 'approved' | 'rejected';

export type ApprovalStepName = '发起申请' | '商务审核' | '财务审核' | '法务审核' | '总经理审批';

export interface ApprovalNode {
  step: ApprovalStepName;
  approver: string;
  status: ApprovalNodeStatus;
  time: string;
  comment: string;
}

export type ContractApprovalRoundStatus = 'approving' | 'approved' | 'rejected' | 'withdrawn';

export interface ContractApprovalRound {
  id: string;
  roundNo: number;
  versionNo: string;
  status: ContractApprovalRoundStatus;
  submittedAt: string;
  submittedBy: string;
  updatedAt: string;
  nodes: ApprovalNode[];
}

export type PaymentPlanPeriodName =
  | '首期款'
  | '二期款'
  | '三期款'
  | '四期款'
  | '五期款'
  | '六期款'
  | '七期款'
  | '八期款'
  | '验收款'
  | '尾款'
  | '需求变更款'
  | '全款';

export type PaymentPlanDateType = 'workday' | 'natural' | 'fixed';
export type PaymentPlanAmountType = 'percentage' | 'fixed';

export interface PaymentPlanItem {
  period: number;
  periodName?: PaymentPlanPeriodName;
  expectedDate: string;
  expectedDateType?: PaymentPlanDateType;
  expectedDays?: number;
  condition?: string;
  amount: number;
  percentage: number;
  amountType?: PaymentPlanAmountType;
}

export type PaymentMethod = '对公' | '对私';
export type PrivatePaymentChannel = '微信' | '支付宝' | '银行转账';
export type PaymentRatio = '3:3:3:1' | '4:5:1';

export type ExecutionStatus = '履行中' | '已完成' | '已终止';

// 合同的可编辑字段集合。编辑页直接读写 contract.current；
// 用户每次"保存为新版本/提交审批"时，会把 current 整体克隆进 versionHistory[]。
export interface ContractFormData {
  contractName: string;
  productCategory: string;
  signingEntity: string; // 我方（乙方）签约主体
  signingEntityTaxNo?: string;
  signingPerson?: string;
  signingEntityAddress?: string;
  signingEntityPhone?: string;
  signingEntityEmail?: string;
  signingEntityPostalCode?: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerTaxNo: string;
  customerPostalCode?: string;
  bankName: string;
  bankAccount: string;
  contractContent: string;
  signDate: string;
  effectiveDate: string;
  endDate: string;
  paymentMethod: PaymentMethod;
  paymentRatio?: PaymentRatio;
  publicPaymentAccountId?: string;
  privatePaymentChannel?: PrivatePaymentChannel;
  privatePaymentRecipient?: string;
  privatePaymentAccount?: string;
  totalAmount: number;
  rebateAmount: number;
  paymentPlans: PaymentPlanItem[];
  templateId: string;
  customContractHtml?: string; // 在模板预览中手动编辑后的合同正文
}

export interface ContractVersion {
  versionNo: string; // V1 / V2 / V3...
  formData: ContractFormData;
  renderedHtml: string; // 模板渲染后的 HTML 快照（可直接 dangerouslySetInnerHTML）
  label: string; // 自动："首次保存草稿" / "提交审批前自动保存" / "驳回后再次提交"；手动：用户填的说明
  createdAt: string;
  createdBy: string;
  changeTypes?: string[];
  changeSummary?: string;
  attachments?: ContractVersionAttachment[];
}

export interface ContractVersionAttachment {
  id: string;
  name: string;
  size: string;
  url?: string;
}

export interface UploadedWordContract {
  fileName: string;
  fileSize: number;
  blobUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ScanFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobUrl?: string; // URL.createObjectURL；mock 数据可不带（点击预览时显示"演示数据，无可用预览"）
  uploadedAt: string;
  uploadedBy: string;
}

// 一次"扫描归档"动作可以传一组文件（合同正文 + 客户盖章页 + 附件），
// 整组算作 archivedScans 数组里的一条记录。
export interface ScanArchiveEntry {
  id: string;
  files: ScanFile[];
  uploadedAt: string;
  uploadedBy: string;
  isPrimary: boolean; // 一份合同同时只有一条 isPrimary=true
  linkedVersionNo: string; // 对应的审批通过版本号
  note?: string;
}

export interface Contract {
  id: string;
  contractNo: string; // CT202606001
  status: ContractStatus;
  /** 合同类型：主合同 / 补充合同（U3：补充合同作废不搁置项目） */
  kind?: 'main' | 'supplement';
  /** 补充合同指向主合同（kind === 'supplement' 时必填） */
  parentContractId?: string;
  /** 来源补充报价（ADR-0008 链路溯源） */
  sourceQuoteId?: string;

  // 关联（身份字段，锁死）
  leadId?: string;
  quoteId?: string;
  projectId?: string;

  // 当前编辑内容
  current: ContractFormData;

  // 版本快照历史（按 createdAt 升序，最新在末尾）
  versionHistory: ContractVersion[];

  // 审批（贴在合同上）
  approvalFlow: ApprovalNode[];
  approvalRounds?: ContractApprovalRound[];
  approvedVersionNo?: string;
  approvedAt?: string;

  // 邮寄/扫描
  mailedAt?: string;
  archivedScans: ScanArchiveEntry[];
  uploadedWordContract?: UploadedWordContract;

  // 元信息
  createdAt: string;
  createdBy: string;
  updatedAt: string;

  // 履行期字段（archived 之后由项目模块填充，本次只占位）
  receivedAmount?: number;
  receivableAmount?: number;
  executionStatus?: ExecutionStatus;

  // 回款看板扩展
  collectionRecords?: CollectionRecord[];
  paymentBlockers?: PaymentBlocker[];
  dunningRecords?: DunningRecord[];
  paymentStatus?: PaymentStatus;
}

// 报价单结构（与 LeadDetail.tsx:191-231 quotationHistory 对齐）
// 这里定义的是 findLatestApprovedQuote 需要的最小字段子集。
export interface QuotationRecord {
  id: string;
  name?: string;
  status: string; // '已报价' | '未报价' | ...
  flowStatus: string; // '已审核' | '审核中' | ...
  amount?: string;
  period?: string;
  createTime?: string;
  entity?: string;
}

// ---- 回款看板相关类型 ----

export type PaymentStatus = 'normal' | 'upcoming' | 'overdue' | 'blocked' | 'settled';

export type BlockerType = 'overdue_unpaid' | 'customer_delay' | 'invoice_unpaid' | 'acceptance_stuck' | 'dispute';

export const BLOCKER_TYPE_LABELS: Record<BlockerType, string> = {
  overdue_unpaid: '逾期未付',
  customer_delay: '客户拖延',
  invoice_unpaid: '开票未回',
  acceptance_stuck: '验收卡住',
  dispute: '合同纠纷',
};

export interface CollectionRecord {
  id: string;
  contractId: string;
  /** 可选：挂到项目，供项目 360 实收台账切片 */
  projectId?: string;
  period?: number | 'other';
  amount: number;
  date: string;
  method: string;
  note: string;
}

export interface PaymentBlocker {
  id: string;
  contractId: string;
  type: BlockerType;
  title: string;
  description: string;
  amountBlocked: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DunningRecord {
  id: string;
  contractId: string;
  date: string;
  method: string;
  contactPerson: string;
  result: string;
  nextPlan: string;
}

// 合同模板接口
export interface ContractTemplate {
  id: string;
  name: string;
  productCategories: string[]; // 用于按产品类别过滤模板
  description?: string;
  render: (formData: ContractFormData) => string;
}

// Wizard → ContractsContext.createFromWizard 的入参
export interface WizardInput {
  leadId?: string;
  quoteId?: string;
  projectId?: string;
  formData: ContractFormData;
}
