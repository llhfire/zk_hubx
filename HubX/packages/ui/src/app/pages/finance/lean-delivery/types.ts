// ========================================
// 精益交付模块 - 类型定义
// 从 mockData.ts 搬出，L1 过渡：Case 汇总数字段标 optional
// L2 删除 optional 并改页面读 calc.ts
// ========================================

// Case 状态枚举
export enum CaseStatus {
  DRAFTING = 'drafting',
  QUOTING = 'quoting',
  NEGOTIATING = 'negotiating',
  SIGNED = 'signed',
  IN_PROGRESS = 'in_progress',
  SUSPENDED = 'suspended',
  ACCEPTING = 'accepting',
  COLLECTING = 'collecting',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
}

// 健康状态枚举
export enum HealthStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
}

// 功能清单状态枚举
export enum FeatureListStatus {
  DRAFT = 'draft',
  PENDING_ESTIMATE = 'pending_estimate',
  ESTIMATED = 'estimated',
  LOCKED = 'locked',
}

// 功能点分类枚举
export enum FeatureCategory {
  REUSE = 'reuse',
  SEMI_CUSTOM = 'semi_custom',
  NEW_DEV = 'new_dev',
}

// 报价单状态枚举
export enum QuotationStatus {
  DRAFT = 'draft',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

// 服务类别枚举
export enum ServiceCategory {
  TRAVEL = 'travel',
  COMMERCIAL = 'commercial',
  SALES = 'sales',
  OPERATION = 'operation',
  THIRD_PARTY = 'third_party',
  HARDWARE = 'hardware',
  CUSTOM = 'custom',
}

/** 成本五类（ADR-0091）：人工/差旅/推广/商务/第三方 */
export type CostCategory = 'labor' | 'travel' | 'promotion' | 'commercial' | 'third_party';

/** 成本五类常量 */
export const COST_CATEGORIES: CostCategory[] = ['labor', 'travel', 'promotion', 'commercial', 'third_party'];

/** 成本五类中文标签 */
export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  labor: '人工',
  travel: '差旅',
  promotion: '推广',
  commercial: '商务',
  third_party: '第三方',
};

/** 补充合同摘要（用于业务单详情 1主多补演进脉络） */
export interface SupplementContractSummary {
  id: string;
  contractNo: string;
  name: string;
  amount: number;
  status: 'archived' | 'pending_approval' | 'voided';
  archived: boolean;
  voided: boolean;
  signingDate?: string;
  sourceQuoteId?: string;
}

/** 精益角色（与报价域 EVAL_ROLE_MAP 对齐） */
export type LeanRole = 'product' | 'design' | 'frontend' | 'backend' | 'test' | 'other';

// Case 接口 — L1 过渡：汇总数标 optional，L2 删除
export interface Case {
  id: string;
  caseNo: string;
  leadId?: string;
  projectId?: string;
  contractId?: string;
  quoteIds: string[];           // L1 新增：关联报价 ID
  /** 补充合同 ID 列表（1 主多补，ADR-0091） */
  extraContractIds?: string[];
  status: CaseStatus;
  targetMargin?: number;
  budgetCap?: number;
  commercialCap?: number;
  // 以下汇总数 L1 标 optional，L2 删除 — 改由 calc.ts 派生
  totalCost?: number;
  totalRevenue?: number;
  currentMargin?: number;
  eac?: number;
  wipValue?: number;
  wipDays?: number;
  healthStatus?: HealthStatus;
  contractAmount?: number;
  // 展示信息
  industry?: string;
  projectType?: string;
  techStack?: string[];
  durationDays?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  leadName?: string;
  projectName?: string;
}

// 功能清单接口
export interface FeatureList {
  id: string;
  caseId: string;
  version: number;
  status: FeatureListStatus;
  source: 'manual' | 'ai_suggested';
  totalEstimatedDays: number;
  totalEstimatedCost: number;
  confirmedBy?: string;
  confirmedAt?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
  caseNo?: string;
  features?: Feature[];
}

// 功能点接口
export interface Feature {
  id: string;
  featureListId: string;
  name: string;
  description: string;
  category: FeatureCategory;
  priority: 'high' | 'medium' | 'low';
  businessNotes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  estimation?: FeatureEstimation;
}

// 功能点估算接口
export interface FeatureEstimation {
  id: string;
  featureId: string;
  estimatedBy: string;
  estimatedDays: number;
  technicalRisk: 'low' | 'medium' | 'high';
  dependencies?: string;
  notes?: string;
  status: 'pending' | 'completed';
  estimatedAt?: string;
  createdAt: string;
  updatedAt: string;
  estimatedByName?: string;
}

// 报价单接口
export interface Quotation {
  id: string;
  caseId: string;
  featureListId?: string;
  quotationNo: string;
  projectName: string;
  projectType?: string;
  description?: string;
  createdBy: string;
  technicalReviewer?: string;
  status: QuotationStatus;
  featureQuoteMode: 'by_feature' | 'by_role';
  rolePrices: Record<string, number>;
  totalFeatureCost: number;
  totalServiceCost: number;
  totalAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  caseNo?: string;
  createdByName?: string;
  technicalReviewerName?: string;
  featureItems?: QuotationFeatureItem[];
  serviceItems?: QuotationServiceItem[];
}

// 报价功能项接口
export interface QuotationFeatureItem {
  id: string;
  quotationId: string;
  featureId?: string;
  featureName: string;
  description: string;
  category?: FeatureCategory;
  priority?: 'high' | 'medium' | 'low';
  productDays: number;
  designDays: number;
  frontendDays: number;
  backendDays: number;
  testDays: number;
  otherDays: number;
  totalDays: number;
  totalAmount: number;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 报价服务项接口
export interface QuotationServiceItem {
  id: string;
  quotationId: string;
  category: ServiceCategory;
  serviceType: string;
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  period?: 'monthly' | 'yearly' | 'one_time';
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 成本项接口 — sourceType 增加 'overhead'
export interface CaseCostItem {
  id: string;
  caseId: string;
  sourceType: 'daily_report' | 'reimbursement' | 'work_item' | 'manual' | 'overhead';
  sourceId?: string;
  costCategory: CostCategory;
  costType: string;
  amount: number;
  employeeId?: string;
  workItemId?: string;
  date: string;
  endDate?: string;
  status: 'actual' | 'forecast';
  description?: string;
  createdAt: string;
  employeeName?: string;
  sourceDescription?: string;
  quantityDays?: number;        // L1 新增：人天数（运营分摊用）
}

// P&L 快照接口 — 双字段（金额+百分比）
export interface PnLSnapshot {
  revenue: number;
  laborCost: number;
  travelCost: number;
  promotionCost: number;
  commercialCost: number;
  thirdPartyCost: number;
  totalCost: number;
  grossMarginAmount: number;    // 毛利金额
  grossMarginRate: number;      // 毛利率 %
  netMarginAmount: number;      // 净利金额
  netMarginRate: number;        // 净利率 %
}

// 事后总结接口
export interface CasePostMortem {
  id: string;
  caseId: string;
  predictedPnl: PnLSnapshot;
  actualPnl: PnLSnapshot;
  costVariance: CostVariance;
  revenueVariance: number;
  marginVariance: number;
  rootCauses: RootCause[];
  lessonsLearned: string[];
  unitOutputPerFte: number;
  reuseSaving: number;
  featureTags: FeatureTag[];
  calibrationApplied: boolean;
  createdAt: string;
  updatedAt: string;
  caseNo?: string;
}

// 成本差异接口
export interface CostVariance {
  laborVariance: number;
  travelVariance: number;
  promotionVariance: number;
  commercialVariance: number;
  thirdPartyVariance: number;
  laborReasons: string[];
  commercialReasons: string[];
}

// 根因分析接口
export interface RootCause {
  category: 'scope_creep' | 'quality_issue' | 'efficiency' | 'commercial_overrun' | 'external';
  description: string;
  impact: number;
  confidence: number;
}

// 特征标签接口
export interface FeatureTag {
  key: string;
  value: string;
}

// 仪表盘数据接口
export interface DashboardData {
  overview: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    alertCount: number;
  };
  bubbleChart: BubbleChartData[];
  simulator: SimulatorData;
  drillDown: DrillDownData;
}

// 气泡图数据接口
export interface BubbleChartData {
  caseId: string;
  caseName: string;
  wipDays: number;
  currentMargin: number;
  contractAmount: number;
  healthStatus: HealthStatus;
  eac: number;
  wipValue: number;
  riskWarnings: string[];
}

// 模拟器数据接口
export interface SimulatorData {
  currentConfig: {
    featureScope: number;
    commercialBudget: number;
    targetMargin: number;
  };
  simulationResult: {
    estimatedMargin: number;
    breakEvenLine: number;
    totalCost: number;
    totalRevenue: number;
  };
  similarProjects: SimilarProject[];
}

// 相似项目接口
export interface SimilarProject {
  id: string;
  name: string;
  industry: string;
  projectType: string;
  margin: number;
  durationDays: number;
  totalCost: number;
}

// 成本趋势数据接口
export interface CostTrendData {
  date: string;
  contractRevenue: number;
  actualLaborCost: number;
  actualTravelCost: number;
  actualPromotionCost: number;
  actualCommercialCost: number;
  actualThirdPartyCost: number;
  actualTotalCost: number;
  actualRevenue: number;
  forecastLaborCost: number | null;
  forecastTravelCost: number | null;
  forecastPromotionCost: number | null;
  forecastCommercialCost: number | null;
  forecastThirdPartyCost: number | null;
  forecastTotalCost: number | null;
  forecastRevenue: number | null;
  actualMargin: number | null;
  forecastMargin: number | null;
}

// 财务模型接口
export interface FinancialModel {
  id: string;
  name: string;
  version: string;
  type: 'cost' | 'revenue';
  applicableScenarios: string[];
  description: string;
  designRationale: string;
  calculationFormula: string;
  assumptions: string[];
  limitations: string[];
  updateHistory: { version: string; date: string; changes: string }[];
}

// 利润模式接口
export interface ProfitMode {
  level: number;
  name: string;
  description: string;
  markupRange: string;
  适用场景: string[];
}

// 成本结构接口
export interface CostStructure {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// 穿透看板数据接口
export interface DrillDownData {
  totalProfit: number;
  byIndustry: {
    industry: string;
    profit: number;
    percentage: number;
    projects: {
      projectId: string;
      projectName: string;
      profit: number;
      costBreakdown: {
        laborCost: { total: number; development: number; rework: number };
        travelCost: number;
        promotionCost: number;
        commercialCost: { total: number; entertainment: number };
        thirdPartyCost: number;
      };
    }[];
  }[];
}

// 报价域 EvalSheet 精简引用（用于 sumEvalDaysByLeanRole）
export interface EvalSheet {
  evalDays: Record<string, number>;  // key 如 pm_days, ui_days, arch_days 等
}

// 报价域 QuotationAtoms（用于 deriveQuotationTotals）
export interface QuotationAtoms {
  roleDays: Record<LeanRole, number>;
  rolePrices: Record<LeanRole, number>;
  marginRate: number;
  serviceItems: { description: string; amount: number; isPassthrough: boolean }[];
}
