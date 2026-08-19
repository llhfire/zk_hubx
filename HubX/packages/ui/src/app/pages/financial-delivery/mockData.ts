// 财务与交付管理模块 Mock 数据

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

// Case 接口
export interface Case {
  id: string;
  caseNo: string;
  leadId?: string;
  projectId?: string;
  contractId?: string;
  status: CaseStatus;
  targetMargin?: number;
  budgetCap?: number;
  commercialCap?: number;
  totalCost: number;
  totalRevenue: number;
  currentMargin?: number;
  eac?: number;
  wipValue?: number;
  wipDays?: number;
  healthStatus: HealthStatus;
  industry?: string;
  projectType?: string;
  techStack?: string[];
  durationDays?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // 关联信息
  leadName?: string;
  projectName?: string;
  contractAmount?: number;
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
  // 关联信息
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
  // 估算信息
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
  // 估算人信息
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
  // 关联信息
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

// 成本项接口
export interface CaseCostItem {
  id: string;
  caseId: string;
  sourceType: 'daily_report' | 'reimbursement' | 'work_item' | 'manual';
  sourceId?: string;
  costCategory: 'labor' | 'commercial' | 'operation' | 'third_party' | 'hardware';
  costType: string;
  amount: number;
  employeeId?: string;
  workItemId?: string;
  date: string;
  endDate?: string;  // 结束日期（用于已发生成本）
  status: 'actual' | 'forecast';  // actual=已发生, forecast=未发生
  description?: string;
  createdAt: string;
  // 关联信息
  employeeName?: string;
  sourceDescription?: string;
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
  // 关联信息
  caseNo?: string;
}

// P&L 快照接口
export interface PnLSnapshot {
  revenue: number;
  laborCost: number;
  commercialCost: number;
  operationCost: number;
  thirdPartyCost: number;
  totalCost: number;
  grossMargin: number;
  netMargin: number;
}

// 成本差异接口
export interface CostVariance {
  laborVariance: number;
  commercialVariance: number;
  operationVariance: number;
  thirdPartyVariance: number;
  laborReasons: string[];
  commercialReasons: string[];
  operationReasons: string[];
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
  // 合同收入基线（阶梯线）
  contractRevenue: number;
  // 实际数据（已发生）
  actualLaborCost: number;
  actualCommercialCost: number;
  actualOperationCost: number;
  actualThirdPartyCost: number;
  actualTotalCost: number;
  actualRevenue: number;
  // 预测数据（EAC）
  forecastLaborCost: number | null;
  forecastCommercialCost: number | null;
  forecastOperationCost: number | null;
  forecastThirdPartyCost: number | null;
  forecastTotalCost: number | null;
  forecastRevenue: number | null;
  // 利润率
  actualMargin: number | null;
  forecastMargin: number | null;
}

// Mock 数据：成本趋势（按周）
// 实际数据到当前周，之后为预测数据（EAC）
export const mockCostTrends: Record<string, CostTrendData[]> = {
  'case-001': [
    // 截止每个月各个成本板块的总金额（累计数据）
    // 项目周期：6月-11月（6个月）
    // 合同约定：签约付30%，中期分4笔各10%，验收付30%
    // 客户付款及时，足够驱动成本在安全范围

    // 6月：售前阶段，只有商务成本，无开发成本
    {
      date: '6月',
      contractRevenue: 0,
      actualLaborCost: 0,
      actualCommercialCost: 8000,
      actualOperationCost: 2000,
      actualThirdPartyCost: 0,
      actualTotalCost: 10000,
      actualRevenue: 0,
      forecastLaborCost: null,
      forecastCommercialCost: null,
      forecastOperationCost: null,
      forecastThirdPartyCost: null,
      forecastTotalCost: null,
      forecastRevenue: null,
      actualMargin: null,
      forecastMargin: null,
    },

    // 7月：签约后，开发团队投入，人力成本增加；收到签约款
    {
      date: '7月',
      contractRevenue: 61500,      // 签约款30%
      actualLaborCost: 35000,
      actualCommercialCost: 2500,
      actualOperationCost: 12000,
      actualThirdPartyCost: 5000,
      actualTotalCost: 54500,
      actualRevenue: 61500,
      forecastLaborCost: null,
      forecastCommercialCost: null,
      forecastOperationCost: null,
      forecastThirdPartyCost: null,
      forecastTotalCost: null,
      forecastRevenue: null,
      actualMargin: 11.4,
      forecastMargin: null,
    },

    // 8月：开发高峰期，人力成本最高；收到中期款第1笔
    {
      date: '8月',
      contractRevenue: 123000,     // 中期款20%
      actualLaborCost: 80000,
      actualCommercialCost: 3500,
      actualOperationCost: 28000,
      actualThirdPartyCost: 12000,
      actualTotalCost: 123500,
      actualRevenue: 123000,
      forecastLaborCost: null,
      forecastCommercialCost: null,
      forecastOperationCost: null,
      forecastThirdPartyCost: null,
      forecastTotalCost: null,
      forecastRevenue: null,
      actualMargin: 49.6,
      forecastMargin: null,
    },

    // 9月：开发中期，累计成本继续增长；收到中期款第2笔
    {
      date: '9月(当前)',
      contractRevenue: 184500,     // 中期款20%
      actualLaborCost: 105000,
      actualCommercialCost: 4000,
      actualOperationCost: 42000,
      actualThirdPartyCost: 16000,
      actualTotalCost: 167000,
      actualRevenue: 184500,
      forecastLaborCost: 105000,
      forecastCommercialCost: 4000,
      forecastOperationCost: 42000,
      forecastThirdPartyCost: 16000,
      forecastTotalCost: 167000,
      forecastRevenue: 184500,
      actualMargin: 50.6,
      forecastMargin: 50.6,
    },

    // 10月（预测）：项目收尾，预测总成本；收到中期款第3笔
    {
      date: '10月(预测)',
      contractRevenue: 246000,     // 中期款20%
      actualLaborCost: null,
      actualCommercialCost: null,
      actualOperationCost: null,
      actualThirdPartyCost: null,
      actualTotalCost: null,
      actualRevenue: null,
      forecastLaborCost: 120000,
      forecastCommercialCost: 4500,
      forecastOperationCost: 52000,
      forecastThirdPartyCost: 20000,
      forecastTotalCost: 196500,
      forecastRevenue: 246000,
      actualMargin: null,
      forecastMargin: 51.4,
    },

    // 11月（结项）：项目结项，收到尾款
    {
      date: '11月(结项)',
      contractRevenue: 307500,     // 尾款30%
      actualLaborCost: null,
      actualCommercialCost: null,
      actualOperationCost: null,
      actualThirdPartyCost: null,
      actualTotalCost: null,
      actualRevenue: null,
      forecastLaborCost: 120000,
      forecastCommercialCost: 4500,
      forecastOperationCost: 52000,
      forecastThirdPartyCost: 20000,
      forecastTotalCost: 196500,
      forecastRevenue: 307500,
      actualMargin: null,
      forecastMargin: 57.9,
    },
  ],
  'case-003': [
    { date: '第1周', actualLaborCost: 0, actualCommercialCost: 3000, actualOperationCost: 0, actualThirdPartyCost: 0, actualTotalCost: 3000, actualRevenue: 0, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: null, forecastMargin: null },
    { date: '第2周', actualLaborCost: 12000, actualCommercialCost: 5000, actualOperationCost: 0, actualThirdPartyCost: 0, actualTotalCost: 20000, actualRevenue: 0, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: null, forecastMargin: null },
    { date: '第3周', actualLaborCost: 30000, actualCommercialCost: 8000, actualOperationCost: 3000, actualThirdPartyCost: 2000, actualTotalCost: 43000, actualRevenue: 0, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: null, forecastMargin: null },
    { date: '第4周', actualLaborCost: 55000, actualCommercialCost: 12000, actualOperationCost: 5000, actualThirdPartyCost: 4000, actualTotalCost: 76000, actualRevenue: 125000, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: 39.2, forecastMargin: null },
    { date: '第5周', actualLaborCost: 80000, actualCommercialCost: 15000, actualOperationCost: 8000, actualThirdPartyCost: 6000, actualTotalCost: 109000, actualRevenue: 125000, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: 12.8, forecastMargin: null },
    { date: '第6周', actualLaborCost: 110000, actualCommercialCost: 18000, actualOperationCost: 10000, actualThirdPartyCost: 8000, actualTotalCost: 146000, actualRevenue: 250000, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: 41.6, forecastMargin: null },
    { date: '第7周', actualLaborCost: 135000, actualCommercialCost: 22000, actualOperationCost: 12000, actualThirdPartyCost: 10000, actualTotalCost: 179000, actualRevenue: 250000, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: 28.4, forecastMargin: null },
    { date: '第8周', actualLaborCost: 155000, actualCommercialCost: 25000, actualOperationCost: 15000, actualThirdPartyCost: 12000, actualTotalCost: 207000, actualRevenue: 250000, forecastLaborCost: null, forecastCommercialCost: null, forecastOperationCost: null, forecastThirdPartyCost: null, forecastTotalCost: null, forecastRevenue: null, actualMargin: 17.2, forecastMargin: null },
    { date: '第9周', actualLaborCost: 180000, actualCommercialCost: 28000, actualOperationCost: 18000, actualThirdPartyCost: 14000, actualTotalCost: 240000, actualRevenue: 250000, forecastLaborCost: 180000, forecastCommercialCost: 28000, forecastOperationCost: 18000, forecastThirdPartyCost: 14000, forecastTotalCost: 240000, forecastRevenue: 250000, actualMargin: 4.0, forecastMargin: 4.0 },
  ],
};

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

// Mock 数据：利润模式
export const mockProfitModes: ProfitMode[] = [
  {
    level: 1,
    name: '保本模式',
    description: '以覆盖成本为目标，不追求利润',
    markupRange: '0-5%',
    适用场景: ['战略客户', '长期合作', '市场竞争激烈'],
  },
  {
    level: 2,
    name: '标准模式',
    description: '行业平均利润水平',
    markupRange: '10-15%',
    适用场景: ['常规项目', '中等竞争'],
  },
  {
    level: 3,
    name: '目标模式',
    description: '达到公司目标利润',
    markupRange: '15-25%',
    适用场景: ['标准项目', '正常竞争'],
  },
  {
    level: 4,
    name: '增强模式',
    description: '高于目标利润，项目有溢价',
    markupRange: '25-35%',
    适用场景: ['技术壁垒', '品牌溢价', '客户急需'],
  },
  {
    level: 5,
    name: '高利润模式',
    description: '最大化利润，项目有独特价值',
    markupRange: '35%+',
    适用场景: ['独占技术', '垄断资源', '紧急需求'],
  },
];

// Mock 数据：财务模型
export const mockFinancialModels: Record<string, FinancialModel> = {
  'quotation-miniapp-admin': {
    id: 'quotation-miniapp-admin',
    name: '软件外包报价模型（小程序+管理系统）',
    version: '20260801001',
    type: 'cost',
    applicableScenarios: [
      '微信小程序 + 后台管理系统',
      '电商、社区、企业办公类项目',
      '固定价格合同',
    ],
    description: '本模型用于软件外包项目的报价计算，基于功能复杂度、技术栈、交付周期等因素，自动计算各岗位工时和报价金额。支持5种利润模式，根据市场竞争和客户关系灵活调整。',
    designRationale: `**报价模型设计理念**

**1. 工时估算基础**
- 基于历史项目数据，建立标准工时定额库
- 按岗位（产品、设计、Java、Web、Flutter、测试）分别估算
- 支持复用、半定制、全新开发三种类型

**2. 利润模式设计**
- 5种利润模式，从保本到高利润
- 利润率通过成本加成实现
- 支持动态调整，适应不同竞争环境

**3. 报价构成**
- 功能报价：基于工时估算 × 岗位单价
- 服务报价：驻场、培训、维护等
- 第三方费用：云服务、域名等（客户承担）`,
    calculationFormula: `**报价计算公式**

**功能报价 = Σ(各岗位人天 × 岗位单价)**

\`\`\`
功能报价 = 产品人天 × 产品单价
         + 设计人天 × 设计单价
         + Java人天 × Java单价
         + Web人天 × Web单价
         + Flutter人天 × Flutter单价
         + 测试人天 × 测试单价
\`\`\`

**利润加成**

\`\`\`
报价金额 = 功能报价 × (1 + 利润加成率)

利润模式与加成率：
- 保本模式：0-5%
- 标准模式：10-15%
- 目标模式：15-25%
- 增强模式：25-35%（当前选择）
- 高利润模式：35%+
\`\`\`

**最终报价**

\`\`\`
最终报价 = 功能报价 × (1 + 利润加成率) + 服务报价
\`\`\``,
    assumptions: [
      '工时估算基于历史项目平均效率',
      '岗位单价按公司标准薪资核算',
      '利润模式可根据实际情况调整',
      '报价有效期通常为30天',
      '不包含需求变更带来的额外费用',
    ],
    limitations: [
      '新业务类型可能需要人工调整工时',
      '技术难度未完全量化',
      '市场竞争因素需要人工判断',
      '客户议价能力会影响最终成交价',
    ],
    updateHistory: [
      { version: '20260801001', date: '2026-08-01', changes: '初始版本，支持小程序+管理系统报价' },
    ],
  },
  'cost-software-outsourcing-tier2': {
    id: 'cost-software-outsourcing-tier2',
    name: '软件外包成本模型（驻场-二线城市）',
    version: '20260801002',
    type: 'cost',
    applicableScenarios: [
      '软件定制开发项目',
      '驻场开发模式',
      '二线城市（如成都、武汉、杭州、南京等）',
      '项目周期1-6个月',
    ],
    description: '本模型用于估算软件外包项目的全生命周期成本，包含直接成本和分摊成本两部分。模型基于历史项目数据和行业基准，采用"自下而上"的估算方法，先估算各成本项，再汇总得出项目总成本。',
    designRationale: `**为什么这样设计？**

**1. 成本分类的合理性**
- **人力成本**：软件外包的核心成本，占比通常60-80%
- **商务成本**：售前阶段必要支出，但需严格控制
- **运营成本**：公司运营的必要分摊，确保成本完整性
- **第三方成本**：客户承担的外部服务，需单独列示

**2. 运营成本分摊的设计**
- **按人天比例分摊**：最公平的方式，项目用工越多，分摊越多
- **月度分摊**：与公司财务周期一致，便于核算
- **包含宿舍成本**：二线城市驻场项目常见需求

**3. 成本控制机制**
- **商务费用上限**：防止售前阶段过度支出
- **返工成本监控**：质量成本的重要指标
- **WIP资金占用**：促使项目快速交付`,
    calculationFormula: `**计算公式：**

**总成本 = 人力成本 + 商务成本 + 运营成本 + 第三方成本**

**人力成本：**
\`\`\`
人力成本 = Σ(各岗位人天 × 岗位日薪)
         = 产品人天 × 产品日薪
         + 设计人天 × 设计日薪
         + 前端人天 × 前端日薪
         + 后端人天 × 后端日薪
         + 测试人天 × 测试日薪
\`\`\`

**商务成本：**
\`\`\`
商务成本 = 差旅费 + 招待费 + 礼品费
         ≤ 商务费用上限（由报价时设定）
\`\`\`

**运营成本（分摊）：**
\`\`\`
运营成本 = 场地分摊 + 人力分摊 + 设备分摊 + 软件分摊 + 财务分摊 + 保险分摊 + 行政分摊

场地分摊 = (办公室租金 + 水电物业) × 项目人天 / 公司总人天
人力分摊 = 社保公积金 × 项目人数
宿舍分摊 = 宿舍租金 × 住宿人数
\`\`\`

**第三方成本：**
\`\`\`
第三方成本 = 云服务器 + 域名 + SSL + 短信 + 其他
（通常由客户承担，不计入项目成本）
\`\`\``,
    assumptions: [
      '日薪基于职级标准薪资，不含加班费和奖金',
      '运营成本按月度核算，按人天比例分摊',
      '商务成本按实际发生核算，有上限控制',
      '返工成本单独核算，用于质量分析',
      '第三方成本通常由客户承担，不计入项目利润计算',
      '二线城市基准薪资水平，不含一线城市补贴',
      '驻场人员享受宿舍补贴，按实际住宿核算',
    ],
    limitations: [
      '模型基于历史项目数据，新业务类型可能偏差较大',
      '未考虑项目延期带来的人力成本增加',
      '未考虑汇率波动对跨境项目的影响',
      '运营成本分摊比例基于公司整体情况，特殊项目可能不适用',
      '未包含项目管理成本（通常计入管理人员薪资）',
    ],
    updateHistory: [
      { version: '20260801001', date: '2026-08-01', changes: '初始版本，建立基础成本模型' },
      { version: '20260801002', date: '2026-08-01', changes: '增加宿舍租金分摊、装修摊销、招聘费用分摊等成本项' },
    ],
  },
  'revenue-software-outsourcing': {
    id: 'revenue-software-outsourcing',
    name: '软件外包收入模型',
    version: '20260801001',
    type: 'revenue',
    applicableScenarios: [
      '软件定制开发项目',
      '固定价格合同',
      '分阶段收款',
    ],
    description: '本模型用于软件外包项目的收入确认和现金流预测。收入确认基于项目交付里程碑，采用"完工百分比法"进行收入确认。',
    designRationale: `**为什么这样设计？**

**1. 收入确认原则**
- **权责发生制**：按照交付进度确认收入，而非收到款项时
- **里程碑法**：基于可验证的交付物确认收入
- **审慎原则**：未验收的交付物不确认收入

**2. 收款节点设计**
- **首付30%**：覆盖项目启动成本，降低资金压力
- **中期款40%**：主要开发完成后收取
- **尾款30%**：验收通过后收取，确保质量

**3. 收入预测逻辑**
- **基于报价单**：收入预测基于已确认的报价单
- **考虑折扣**：预留议价空间，通常5-15%
- **分期确认**：按交付进度分期确认，平滑收入曲线`,
    calculationFormula: `**计算公式：**

**合同总收入 = 报价金额 × (1 - 折扣率)**

**收入确认（完工百分比法）：**
\`\`\`
当期确认收入 = 合同总收入 × 完工百分比 - 已确认收入
完工百分比 = 已完成工作量 / 预计总工作量
\`\`\`

**收款计划：**
\`\`\`
首付（签约后）= 合同总收入 × 30%
中期款（开发完成50%）= 合同总收入 × 40%
尾款（验收通过）= 合同总收入 × 30%
\`\`\`

**利润率计算：**
\`\`\`
毛利 = 确认收入 - 直接成本（人力 + 商务 + 第三方）
毛利润率 = 比利 / 确认收入 × 100%

净利 = 毛利 - 运营成本分摊
净利润率 = 净利 / 确认收入 × 100%
\`\`\`

**EAC（完工估算）：**
\`\`\`
EAC = 已发生成本 + (剩余工作量 / 当前效率)
预测净利润 = 合同总收入 - EAC
预测净利润率 = 预测净利润 / 合同总收入 × 100%
\`\`\``,
    assumptions: [
      '合同金额固定，不考虑变更带来的收入增加',
      '收款按约定节点执行，不考虑延迟收款',
      '完工百分比基于工时统计，假设工时反映真实进度',
      '折扣率由商务谈判确定，通常5-15%',
      '收入确认以客户验收为准',
      '分阶段收款比例可根据项目调整',
    ],
    limitations: [
      '未考虑项目变更带来的收入变化',
      '未考虑客户延迟付款的影响',
      '完工百分比可能与实际交付物不完全匹配',
      '未考虑质保期成本对利润的影响',
      '未考虑税收影响（增值税、所得税）',
    ],
    updateHistory: [
      { version: '20260801001', date: '2026-08-01', changes: '初始版本，建立基础收入模型' },
    ],
  },
};

// 成本结构接口
export interface CostStructure {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// Mock 数据：成本结构
// 实际成本结构
export const mockCostStructures: Record<string, CostStructure[]> = {
  'case-001': [
    { category: '人力成本', amount: 95000, percentage: 76.0, color: '#1e40af' },
    { category: '商务成本', amount: 13200, percentage: 10.6, color: '#3b82f6' },
    { category: '运营成本', amount: 14600, percentage: 11.7, color: '#60a5fa' },
    { category: '第三方成本', amount: 2200, percentage: 1.7, color: '#93c5fd' },
  ],
};

// 预测成本结构（EAC）
export const mockForecastCostStructures: Record<string, CostStructure[]> = {
  'case-001': [
    { category: '人力成本', amount: 125000, percentage: 75.8, color: '#1e40af' },
    { category: '商务成本', amount: 13200, percentage: 8.0, color: '#3b82f6' },
    { category: '运营成本', amount: 21000, percentage: 12.7, color: '#60a5fa' },
    { category: '第三方成本', amount: 5800, percentage: 3.5, color: '#93c5fd' },
  ],
  'case-003': [
    { category: '人力成本', amount: 180000, percentage: 75.0, color: '#1e40af' },
    { category: '商务成本', amount: 28000, percentage: 11.7, color: '#3b82f6' },
    { category: '运营成本', amount: 18000, percentage: 7.5, color: '#60a5fa' },
    { category: '第三方成本', amount: 14000, percentage: 5.8, color: '#93c5fd' },
  ],
};

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
        laborCost: {
          total: number;
          development: number;
          rework: number;
        };
        commercialCost: {
          total: number;
          entertainment: number;
          travel: number;
        };
        operationCost: number;
        thirdPartyCost: number;
      };
    }[];
  }[];
}

// Mock 数据：Case 列表
export const mockCases: Case[] = [
  {
    id: 'case-001',
    caseNo: 'CASE-2026-07-01-001',
    leadId: 'lead-001',
    projectId: 'project-001',
    contractId: 'contract-001',
    status: CaseStatus.IN_PROGRESS,
    targetMargin: 30,
    budgetCap: 350000,
    commercialCap: 25000,
    totalCost: 125000,
    totalRevenue: 205000,
    currentMargin: 39.0,
    eac: 140000,
    wipValue: 22000,
    wipDays: 10,
    healthStatus: HealthStatus.GREEN,
    industry: '互联网',
    projectType: '企业办公',
    techStack: ['React', 'Spring Boot', 'MySQL', 'Redis', '小程序'],
    durationDays: 90,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    leadName: '阿里巴巴集团',
    projectName: '企业内部管理系统',
    contractAmount: 205000,  // 原始合同 ¥185,000 + 变更追加 ¥20,000
  },
  {
    id: 'case-002',
    caseNo: 'CASE-2026-07-15-002',
    leadId: 'lead-002',
    status: CaseStatus.QUOTING,
    targetMargin: 30,
    budgetCap: 150000,
    commercialCap: 20000,
    totalCost: 0,
    totalRevenue: 0,
    healthStatus: HealthStatus.GREEN,
    industry: '金融',
    projectType: '金融理财',
    techStack: ['Vue.js', 'Java', 'MySQL'],
    createdAt: '2026-07-15T14:00:00Z',
    updatedAt: '2026-07-31T09:00:00Z',
    leadName: '腾讯-云服务平台',
    contractAmount: 120000,
  },
  {
    id: 'case-003',
    caseNo: 'CASE-2026-06-20-003',
    leadId: 'lead-003',
    projectId: 'project-003',
    contractId: 'contract-003',
    status: CaseStatus.COMPLETED,
    targetMargin: 25,
    budgetCap: 300000,
    commercialCap: 40000,
    totalCost: 180000,
    totalRevenue: 250000,
    currentMargin: 28,
    eac: 180000,
    healthStatus: HealthStatus.GREEN,
    industry: '教育',
    projectType: '在线教育',
    techStack: ['React', 'Python', 'PostgreSQL'],
    durationDays: 60,
    createdAt: '2026-06-20T08:00:00Z',
    updatedAt: '2026-07-25T16:00:00Z',
    completedAt: '2026-07-25T16:00:00Z',
    leadName: '字节跳动-教育平台',
    projectName: '在线教育平台',
    contractAmount: 250000,
  },
  {
    id: 'case-004',
    caseNo: 'CASE-2026-07-20-004',
    leadId: 'lead-004',
    status: CaseStatus.DRAFTING,
    targetMargin: 40,
    budgetCap: 100000,
    commercialCap: 15000,
    totalCost: 0,
    totalRevenue: 0,
    healthStatus: HealthStatus.GREEN,
    industry: '医疗',
    projectType: '医疗健康',
    createdAt: '2026-07-20T11:00:00Z',
    updatedAt: '2026-07-31T10:00:00Z',
    leadName: '京东-健康平台',
  },
  {
    id: 'case-005',
    caseNo: 'CASE-2026-06-01-005',
    leadId: 'lead-005',
    projectId: 'project-005',
    contractId: 'contract-005',
    status: CaseStatus.COLLECTING,
    targetMargin: 30,
    budgetCap: 180000,
    commercialCap: 25000,
    totalCost: 120000,
    totalRevenue: 180000,
    currentMargin: 33.3,
    eac: 120000,
    healthStatus: HealthStatus.YELLOW,
    industry: '企业办公',
    projectType: '企业办公',
    techStack: ['Angular', 'Java', 'Oracle'],
    durationDays: 50,
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-07-30T14:00:00Z',
    leadName: '美团-企业服务',
    projectName: '企业办公系统',
    contractAmount: 180000,
  },
];

// Mock 数据：功能清单列表
export const mockFeatureLists: FeatureList[] = [
  // Case-001 的功能清单（原始版本）
  {
    id: 'fl-001',
    caseId: 'case-001',
    version: 1,
    status: FeatureListStatus.LOCKED,
    source: 'manual',
    totalEstimatedDays: 180,
    totalEstimatedCost: 108000,
    confirmedBy: 'user-001',
    confirmedAt: '2026-06-05T10:00:00Z',
    lockedAt: '2026-06-10T14:00:00Z',
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-10T14:00:00Z',
    caseNo: 'CASE-2026-07-01-001',
  },
  // Case-001 的功能清单（变更版本1 - 需求变更追加）
  {
    id: 'fl-001-v2',
    caseId: 'case-001',
    version: 2,
    status: FeatureListStatus.LOCKED,
    source: 'manual',
    totalEstimatedDays: 210,
    totalEstimatedCost: 126000,
    confirmedBy: 'user-001',
    confirmedAt: '2026-07-15T10:00:00Z',
    lockedAt: '2026-07-18T14:00:00Z',
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-18T14:00:00Z',
    caseNo: 'CASE-2026-07-01-001',
  },
  // Case-002 的功能清单
  {
    id: 'fl-002',
    caseId: 'case-002',
    version: 1,
    status: FeatureListStatus.PENDING_ESTIMATE,
    source: 'manual',
    totalEstimatedDays: 0,
    totalEstimatedCost: 0,
    createdAt: '2026-07-16T09:00:00Z',
    updatedAt: '2026-07-31T11:00:00Z',
    caseNo: 'CASE-2026-07-15-002',
  },
  // Case-003 的功能清单
  {
    id: 'fl-003',
    caseId: 'case-003',
    version: 2,
    status: FeatureListStatus.LOCKED,
    source: 'manual',
    totalEstimatedDays: 62,
    totalEstimatedCost: 74400,
    confirmedBy: 'user-002',
    confirmedAt: '2026-06-25T10:00:00Z',
    lockedAt: '2026-06-28T14:00:00Z',
    createdAt: '2026-06-21T08:00:00Z',
    updatedAt: '2026-06-28T14:00:00Z',
    caseNo: 'CASE-2026-06-20-003',
  },
];

// Mock 数据：功能点列表
export const mockFeatures: Feature[] = [
  // Case-001 的功能点
  {
    id: 'feat-001',
    featureListId: 'fl-001',
    name: '用户登录注册',
    description: '手机号注册、微信登录、找回密码',
    category: FeatureCategory.SEMI_CUSTOM,
    priority: 'high',
    businessNotes: '需要微信开放平台接口',
    sortOrder: 1,
    createdAt: '2026-07-02T08:00:00Z',
    updatedAt: '2026-07-02T08:00:00Z',
    estimation: {
      id: 'est-001',
      featureId: 'feat-001',
      estimatedBy: 'user-003',
      estimatedDays: 15,
      technicalRisk: 'medium',
      dependencies: '需要微信开放平台接口',
      notes: '包含手机号验证、微信OAuth、密码重置',
      status: 'completed',
      estimatedAt: '2026-07-04T10:00:00Z',
      createdAt: '2026-07-04T10:00:00Z',
      updatedAt: '2026-07-04T10:00:00Z',
      estimatedByName: '王五',
    },
  },
  {
    id: 'feat-002',
    featureListId: 'fl-001',
    name: '商品管理',
    description: '商品列表、商品详情、商品搜索',
    category: FeatureCategory.REUSE,
    priority: 'medium',
    sortOrder: 2,
    createdAt: '2026-07-02T08:00:00Z',
    updatedAt: '2026-07-02T08:00:00Z',
    estimation: {
      id: 'est-002',
      featureId: 'feat-002',
      estimatedBy: 'user-003',
      estimatedDays: 8,
      technicalRisk: 'low',
      notes: '复用现有商品模块',
      status: 'completed',
      estimatedAt: '2026-07-04T11:00:00Z',
      createdAt: '2026-07-04T11:00:00Z',
      updatedAt: '2026-07-04T11:00:00Z',
      estimatedByName: '王五',
    },
  },
  {
    id: 'feat-003',
    featureListId: 'fl-001',
    name: '订单管理',
    description: '下单流程、订单列表、订单详情',
    category: FeatureCategory.NEW_DEV,
    priority: 'high',
    businessNotes: '需要对接支付系统',
    sortOrder: 3,
    createdAt: '2026-07-02T08:00:00Z',
    updatedAt: '2026-07-02T08:00:00Z',
    estimation: {
      id: 'est-003',
      featureId: 'feat-003',
      estimatedBy: 'user-004',
      estimatedDays: 22.5,
      technicalRisk: 'high',
      dependencies: '支付系统、库存系统',
      notes: '包含购物车、下单、支付、退款流程',
      status: 'completed',
      estimatedAt: '2026-07-05T09:00:00Z',
      createdAt: '2026-07-05T09:00:00Z',
      updatedAt: '2026-07-05T09:00:00Z',
      estimatedByName: '赵六',
    },
  },
];

// Mock 数据：报价单列表
export const mockQuotations: Quotation[] = [
  // Case-001 的报价单（原始版本）
  {
    id: 'quot-001',
    caseId: 'case-001',
    featureListId: 'fl-001',
    quotationNo: 'QT-2026-06-10-001',
    projectName: '企业内部管理系统',
    projectType: '企业办公',
    description: '为阿里巴巴开发企业内部管理系统',
    createdBy: 'user-001',
    technicalReviewer: 'user-003',
    status: QuotationStatus.ACCEPTED,
    featureQuoteMode: 'by_feature',
    rolePrices: {
      product: 400,
      design: 350,
      frontend: 450,
      backend: 500,
      test: 350,
      other: 400,
    },
    totalFeatureCost: 108000,
    totalServiceCost: 15000,
    totalAmount: 185000,
    approvedBy: 'user-005',
    approvedAt: '2026-06-08T14:00:00Z',
    createdAt: '2026-06-06T10:00:00Z',
    updatedAt: '2026-06-10T14:00:00Z',
    caseNo: 'CASE-2026-07-01-001',
    createdByName: '张三',
    technicalReviewerName: '李四',
  },
  // Case-001 的报价单（变更版本1 - 需求变更追加）
  {
    id: 'quot-001-v2',
    caseId: 'case-001',
    featureListId: 'fl-001-v2',
    quotationNo: 'QT-2026-07-18-002',
    projectName: '企业内部管理系统（变更追加）',
    projectType: '企业办公',
    description: '需求变更追加：订单管理模块增强、数据报表功能',
    createdBy: 'user-001',
    technicalReviewer: 'user-003',
    status: QuotationStatus.APPROVED,
    featureQuoteMode: 'by_feature',
    rolePrices: {
      product: 400,
      design: 350,
      frontend: 450,
      backend: 500,
      test: 350,
      other: 400,
    },
    totalFeatureCost: 18000,
    totalServiceCost: 2000,
    totalAmount: 20000,
    approvedBy: 'user-005',
    approvedAt: '2026-07-20T14:00:00Z',
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-20T14:00:00Z',
    caseNo: 'CASE-2026-07-01-001',
    createdByName: '张三',
    technicalReviewerName: '李四',
  },
  {
    id: 'quot-002',
    caseId: 'case-002',
    quotationNo: 'QT-2026-07-15-002',
    projectName: '金融理财APP',
    projectType: '金融理财',
    description: '为腾讯开发金融理财APP',
    createdBy: 'user-002',
    technicalReviewer: 'user-004',
    status: QuotationStatus.DRAFT,
    featureQuoteMode: 'by_role',
    rolePrices: {
      product: 1000,
      design: 800,
      frontend: 1200,
      backend: 1200,
      test: 600,
      other: 800,
    },
    totalFeatureCost: 0,
    totalServiceCost: 0,
    totalAmount: 0,
    createdAt: '2026-07-20T09:00:00Z',
    updatedAt: '2026-07-31T10:00:00Z',
    caseNo: 'CASE-2026-07-15-002',
    createdByName: '李四',
    technicalReviewerName: '王五',
  },
];

// Mock 数据：报价功能项列表
export const mockQuotationFeatureItems: QuotationFeatureItem[] = [
  {
    id: 'qfi-001',
    quotationId: 'quot-001',
    featureId: 'feat-001',
    featureName: '用户登录注册',
    description: '手机号注册、微信登录、找回密码',
    category: FeatureCategory.SEMI_CUSTOM,
    priority: 'high',
    productDays: 2,
    designDays: 3,
    frontendDays: 5,
    backendDays: 3,
    testDays: 2,
    otherDays: 0,
    totalDays: 15,
    totalAmount: 18000,
    notes: '需要微信开放平台接口',
    sortOrder: 1,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qfi-002',
    quotationId: 'quot-001',
    featureId: 'feat-002',
    featureName: '商品管理',
    description: '商品列表、商品详情、商品搜索',
    category: FeatureCategory.REUSE,
    priority: 'medium',
    productDays: 1,
    designDays: 2,
    frontendDays: 3,
    backendDays: 5,
    testDays: 2,
    otherDays: 0,
    totalDays: 13,
    totalAmount: 15600,
    sortOrder: 2,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qfi-003',
    quotationId: 'quot-001',
    featureId: 'feat-003',
    featureName: '订单管理',
    description: '下单流程、订单列表、订单详情',
    category: FeatureCategory.NEW_DEV,
    priority: 'high',
    productDays: 2,
    designDays: 3,
    frontendDays: 5,
    backendDays: 8,
    testDays: 3,
    otherDays: 0,
    totalDays: 21,
    totalAmount: 25200,
    notes: '需要对接支付系统',
    sortOrder: 3,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
];

// Mock 数据：报价服务项列表（只包含客户可见的费用）
export const mockQuotationServiceItems: QuotationServiceItem[] = [
  {
    id: 'qsi-001',
    quotationId: 'quot-001',
    category: ServiceCategory.TRAVEL,
    serviceType: 'onsite',
    description: '现场驻场服务',
    amount: 18000,
    quantity: 30,
    unitPrice: 600,
    period: 'one_time',
    notes: '开发期间客户现场驻场支持',
    sortOrder: 1,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-002',
    quotationId: 'quot-001',
    category: ServiceCategory.OPERATION,
    serviceType: 'training',
    description: '用户培训服务',
    amount: 3000,
    quantity: 2,
    unitPrice: 1500,
    period: 'one_time',
    notes: '系统使用培训',
    sortOrder: 2,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-003',
    quotationId: 'quot-001',
    category: ServiceCategory.OPERATION,
    serviceType: 'documentation',
    description: '技术文档交付',
    amount: 2000,
    period: 'one_time',
    notes: '包含用户手册、API文档、部署文档',
    sortOrder: 3,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-004',
    quotationId: 'quot-001',
    category: ServiceCategory.OPERATION,
    serviceType: 'version_update',
    description: '首年免费维护',
    amount: 0,
    period: 'one_time',
    notes: '首年免费，次年起按合同金额15%收取',
    sortOrder: 4,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-005',
    quotationId: 'quot-001',
    category: ServiceCategory.THIRD_PARTY,
    serviceType: 'cloud_server',
    description: '云服务器（首年）',
    amount: 12000,
    period: 'yearly',
    notes: '阿里云 ECS，2核4G，客户承担',
    sortOrder: 5,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-006',
    quotationId: 'quot-001',
    category: ServiceCategory.THIRD_PARTY,
    serviceType: 'domain',
    description: '域名注册',
    amount: 100,
    period: 'yearly',
    notes: '.com 域名，客户承担',
    sortOrder: 6,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-007',
    quotationId: 'quot-001',
    category: ServiceCategory.THIRD_PARTY,
    serviceType: 'ssl',
    description: 'SSL证书',
    amount: 500,
    period: 'yearly',
    notes: 'DV SSL证书，客户承担',
    sortOrder: 7,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'qsi-008',
    quotationId: 'quot-001',
    category: ServiceCategory.THIRD_PARTY,
    serviceType: 'sms',
    description: '短信服务',
    amount: 1000,
    period: 'one_time',
    notes: '首年短信包，客户承担',
    sortOrder: 8,
    createdAt: '2026-07-06T10:00:00Z',
    updatedAt: '2026-07-06T10:00:00Z',
  },
];

// Mock 数据：成本项列表
export const mockCostItems: CaseCostItem[] = [
  // Case-001 的成本项（阿里巴巴企业内部管理系统）
  // ===== 已发生的成本 =====
  // 人力成本 - 开发工时（已发生）
  {
    id: 'cost-001',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-001',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 10000,
    employeeId: 'user-006',
    date: '2026-06-01',
    endDate: '2026-06-25',
    status: 'actual',
    description: '需求分析与原型设计（产品经理 25天×¥400/天）',
    createdAt: '2026-06-25T18:00:00Z',
    employeeName: '产品经理-王明',
  },
  {
    id: 'cost-002',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-002',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 5250,
    employeeId: 'user-007',
    date: '2026-06-10',
    endDate: '2026-06-25',
    status: 'actual',
    description: 'UI界面设计（UI设计师 15天×¥350/天）',
    createdAt: '2026-06-25T18:00:00Z',
    employeeName: 'UI设计师-李华',
  },
  {
    id: 'cost-003',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-003',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 15000,
    employeeId: 'user-008',
    date: '2026-06-15',
    endDate: '2026-07-15',
    status: 'actual',
    description: '后端接口开发-用户模块（Java开发 30天×¥500/天）',
    createdAt: '2026-07-15T18:00:00Z',
    employeeName: 'Java开发-张伟',
  },
  {
    id: 'cost-004',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-004',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 12600,
    employeeId: 'user-009',
    date: '2026-06-20',
    endDate: '2026-07-10',
    status: 'actual',
    description: 'Web前端开发-管理后台（Web开发 28天×¥450/天）',
    createdAt: '2026-07-10T18:00:00Z',
    employeeName: 'Web开发-赵丽',
  },
  {
    id: 'cost-005',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-005',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 11250,
    employeeId: 'user-010',
    date: '2026-06-25',
    endDate: '2026-07-15',
    status: 'actual',
    description: 'Flutter移动端开发-员工端（Flutter开发 25天×¥450/天）',
    createdAt: '2026-07-15T18:00:00Z',
    employeeName: 'Flutter开发-陈刚',
  },
  {
    id: 'cost-006',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-006',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 7000,
    employeeId: 'user-011',
    date: '2026-07-01',
    endDate: '2026-07-20',
    status: 'actual',
    description: '功能测试-用户模块、商品模块（测试工程师 20天×¥350/天）',
    createdAt: '2026-07-20T18:00:00Z',
    employeeName: '测试工程师-刘洋',
  },
  // 返工工时（已发生）
  {
    id: 'cost-007',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-007',
    costCategory: 'labor',
    costType: '返工工时',
    amount: 3500,
    employeeId: 'user-008',
    date: '2026-07-15',
    endDate: '2026-07-22',
    status: 'actual',
    description: '订单模块接口重构（需求变更，7天×¥500/天）',
    createdAt: '2026-07-22T18:00:00Z',
    employeeName: 'Java开发-张伟',
  },
  {
    id: 'cost-008',
    caseId: 'case-001',
    sourceType: 'daily_report',
    sourceId: 'dr-008',
    costCategory: 'labor',
    costType: '返工工时',
    amount: 1800,
    employeeId: 'user-009',
    date: '2026-07-18',
    endDate: '2026-07-22',
    status: 'actual',
    description: '页面样式调整（UI走查，4天×¥450/天）',
    createdAt: '2026-07-22T18:00:00Z',
    employeeName: 'Web开发-赵丽',
  },
  // 出差补贴（已发生）
  {
    id: 'cost-009',
    caseId: 'case-001',
    sourceType: 'reimbursement',
    sourceId: 'reimb-009',
    costCategory: 'labor',
    costType: '出差补贴',
    amount: 5400,
    employeeId: 'user-001',
    date: '2026-06-01',
    endDate: '2026-07-18',
    status: 'actual',
    description: '杭州出差18天补贴（¥300/天×3人）',
    createdAt: '2026-07-19T10:00:00Z',
    employeeName: '项目经理-张三',
  },
  // 商务成本（已发生）
  {
    id: 'cost-010',
    caseId: 'case-001',
    sourceType: 'reimbursement',
    sourceId: 'reimb-010',
    costCategory: 'commercial',
    costType: '差旅费',
    amount: 8500,
    employeeId: 'user-001',
    date: '2026-06-10',
    endDate: '2026-06-15',
    status: 'actual',
    description: '杭州出差交通住宿（3人×5天）',
    createdAt: '2026-06-16T09:00:00Z',
    employeeName: '项目经理-张三',
  },
  {
    id: 'cost-011',
    caseId: 'case-001',
    sourceType: 'reimbursement',
    sourceId: 'reimb-011',
    costCategory: 'commercial',
    costType: '招待费',
    amount: 3200,
    employeeId: 'user-001',
    date: '2026-06-15',
    endDate: '2026-06-20',
    status: 'actual',
    description: '客户需求评审会议晚餐（2次）',
    createdAt: '2026-06-21T10:00:00Z',
    employeeName: '项目经理-张三',
  },
  {
    id: 'cost-012',
    caseId: 'case-001',
    sourceType: 'reimbursement',
    sourceId: 'reimb-012',
    costCategory: 'commercial',
    costType: '礼品费',
    amount: 1500,
    employeeId: 'user-001',
    date: '2026-06-20',
    status: 'actual',
    description: '客户关系维护礼品',
    createdAt: '2026-06-25T10:00:00Z',
    employeeName: '项目经理-张三',
  },
  // 运营成本-已发生部分（1-6月，已结算）
  {
    id: 'cost-013',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '办公室租金分摊',
    amount: 1800,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: '6月份办公室租金分摊（按人天30%）',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'cost-014',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '社保公积金分摊',
    amount: 2520,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: '6月份社保公积金分摊（按人天30%）',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'cost-015',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '管理费用分摊',
    amount: 1200,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: '6月份管理费用分摊（按人天30%）',
    createdAt: '2026-07-01T10:00:00Z',
  },
  // 运营成本-已发生部分（7月，已结算）
  {
    id: 'cost-016',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '办公室租金分摊',
    amount: 1800,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: '7月份办公室租金分摊（按人天30%）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-017',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '社保公积金分摊',
    amount: 2520,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: '7月份社保公积金分摊（按人天30%）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-018',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '管理费用分摊',
    amount: 1200,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: '7月份管理费用分摊（按人天30%）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-019',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '税金分摊',
    amount: 2312,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: '7月份税金分摊（按合同金额2.5%）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-020',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '员工培训费用',
    amount: 1200,
    date: '2026-07-15',
    status: 'actual',
    description: 'React高级培训课程（按参与人分摊）',
    createdAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 'cost-021',
    caseId: 'case-001',
    sourceType: 'reimbursement',
    sourceId: 'reimb-020',
    costCategory: 'operation',
    costType: '团建聚餐',
    amount: 1500,
    employeeId: 'user-001',
    date: '2026-07-20',
    status: 'actual',
    description: '项目中期团建聚餐（6人）',
    createdAt: '2026-07-21T10:00:00Z',
    employeeName: '项目经理-张三',
  },
  // 第三方成本（已发生）
  {
    id: 'cost-027',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '云服务器',
    amount: 3500,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: '阿里云ECS（4核8G）+ RDS数据库（6月）',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'cost-028',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '云服务器',
    amount: 3500,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: '阿里云ECS（4核8G）+ RDS数据库（7月）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-029',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '域名',
    amount: 100,
    date: '2026-06-10',
    status: 'actual',
    description: '.com域名注册',
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    id: 'cost-030',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: 'SSL证书',
    amount: 500,
    date: '2026-06-10',
    status: 'actual',
    description: 'DigiCert 通配符SSL证书',
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    id: 'cost-031',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '短信服务',
    amount: 800,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: '阿里云短信（6月）',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'cost-032',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '短信服务',
    amount: 800,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: '阿里云短信（7月）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-033',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: 'AI 工具订阅',
    amount: 1200,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: 'Claude Pro月费',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'cost-034',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '编程大模型 API',
    amount: 2250,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: 'GPT-4 API调用（代码生成）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  // ===== 未发生的成本（预测） =====
  // 人力成本-未发生（预计8-9月）
  {
    id: 'cost-f001',
    caseId: 'case-001',
    sourceType: 'daily_report',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 7500,
    employeeId: 'user-008',
    date: '2026-08-01',
    endDate: '2026-08-15',
    status: 'forecast',
    description: '后端接口开发-订单模块（Java开发 15天×¥500/天）',
    createdAt: '2026-08-01T10:00:00Z',
    employeeName: 'Java开发-张伟',
  },
  {
    id: 'cost-f002',
    caseId: 'case-001',
    sourceType: 'daily_report',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 7200,
    employeeId: 'user-009',
    date: '2026-08-01',
    endDate: '2026-08-16',
    status: 'forecast',
    description: 'Web前端开发-订单管理（Web开发 16天×¥450/天）',
    createdAt: '2026-08-01T10:00:00Z',
    employeeName: 'Web开发-赵丽',
  },
  {
    id: 'cost-f003',
    caseId: 'case-001',
    sourceType: 'daily_report',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 6750,
    employeeId: 'user-010',
    date: '2026-08-01',
    endDate: '2026-08-15',
    status: 'forecast',
    description: 'Flutter移动端-订单功能（Flutter开发 15天×¥450/天）',
    createdAt: '2026-08-01T10:00:00Z',
    employeeName: 'Flutter开发-陈刚',
  },
  {
    id: 'cost-f004',
    caseId: 'case-001',
    sourceType: 'daily_report',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 2100,
    employeeId: 'user-011',
    date: '2026-08-01',
    endDate: '2026-08-06',
    status: 'forecast',
    description: '功能测试-订单模块（测试工程师 6天×¥350/天）',
    createdAt: '2026-08-01T10:00:00Z',
    employeeName: '测试工程师-刘洋',
  },
  // 运营成本-未发生（预计8-9月）
  {
    id: 'cost-f005',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '办公室租金分摊',
    amount: 1800,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: '8月份办公室租金分摊（预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-f006',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '社保公积金分摊',
    amount: 2520,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: '8月份社保公积金分摊（预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-f007',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '管理费用分摊',
    amount: 1200,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: '8月份管理费用分摊（预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-f008',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'operation',
    costType: '税金分摊',
    amount: 2312,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: '8月份税金分摊（预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  // 第三方成本-未发生（预计8-9月）
  {
    id: 'cost-f009',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '云服务器',
    amount: 3500,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: '阿里云ECS+RDS（8月，预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-f010',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '短信服务',
    amount: 800,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: '阿里云短信（8月，预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-f011',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'third_party',
    costType: '编程大模型 API',
    amount: 2250,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: 'Claude/GPT API调用（8月，预测）',
    createdAt: '2026-08-01T10:00:00Z',
  },
  // Case-003 的成本项
  {
    id: 'cost-101',
    caseId: 'case-003',
    sourceType: 'daily_report',
    sourceId: 'dr-101',
    costCategory: 'labor',
    costType: '开发工时',
    amount: 15000,
    employeeId: 'user-012',
    date: '2026-06-25',
    status: 'actual',
    description: '在线教育平台开发',
    createdAt: '2026-06-25T18:00:00Z',
    employeeName: '开发工程师C',
  },
];

// Mock 数据：事后总结列表
export const mockPostMortems: CasePostMortem[] = [
  {
    id: 'pm-001',
    caseId: 'case-003',
    predictedPnl: {
      revenue: 250000,
      laborCost: 120000,
      commercialCost: 30000,
      operationCost: 20000,
      thirdPartyCost: 15000,
      totalCost: 185000,
      grossMargin: 65000,
      netMargin: 26,
    },
    actualPnl: {
      revenue: 250000,
      laborCost: 125000,
      commercialCost: 28000,
      operationCost: 18000,
      thirdPartyCost: 14000,
      totalCost: 185000,
      grossMargin: 65000,
      netMargin: 26,
    },
    costVariance: {
      laborVariance: 5000,
      commercialVariance: -2000,
      operationVariance: -2000,
      thirdPartyVariance: -1000,
      laborReasons: ['需求变更导致返工', '新人学习曲线'],
      commercialReasons: ['出差次数减少'],
      operationReasons: ['培训时间缩短'],
    },
    revenueVariance: 0,
    marginVariance: 0,
    rootCauses: [
      {
        category: 'scope_creep',
        description: '客户中途增加2个功能需求',
        impact: 5000,
        confidence: 0.9,
      },
    ],
    lessonsLearned: [
      '需求变更需要走正式流程',
      '新人需要更多时间培训',
      '商务成本控制良好',
    ],
    unitOutputPerFte: 1.2,
    reuseSaving: 15000,
    featureTags: [
      { key: 'industry', value: '教育' },
      { key: 'projectType', value: '在线教育' },
      { key: 'techStack', value: 'React,Python,PostgreSQL' },
      { key: 'duration', value: '60天' },
    ],
    calibrationApplied: true,
    createdAt: '2026-07-26T10:00:00Z',
    updatedAt: '2026-07-28T14:00:00Z',
    caseNo: 'CASE-2026-06-20-003',
  },
];

// Mock 数据：仪表盘数据
export const mockDashboardData: DashboardData = {
  overview: {
    totalRevenue: 620000,
    totalCost: 425000,
    totalProfit: 195000,
    profitMargin: 31.5,
    alertCount: 1,
  },
  bubbleChart: [
    {
      caseId: 'case-001',
      caseName: '企业内部管理系统',
      wipDays: 10,
      currentMargin: 30.5,
      contractAmount: 185000,
      healthStatus: HealthStatus.GREEN,
      eac: 145000,
      wipValue: 22000,
      riskWarnings: [],
    },
    {
      caseId: 'case-002',
      caseName: '金融理财APP',
      wipDays: 0,
      currentMargin: 0,
      contractAmount: 120000,
      healthStatus: HealthStatus.GREEN,
      eac: 0,
      wipValue: 0,
      riskWarnings: [],
    },
    {
      caseId: 'case-003',
      caseName: '在线教育平台',
      wipDays: 0,
      currentMargin: 28,
      contractAmount: 250000,
      healthStatus: HealthStatus.GREEN,
      eac: 180000,
      wipValue: 0,
      riskWarnings: [],
    },
    {
      caseId: 'case-005',
      caseName: '企业办公系统',
      wipDays: 20,
      currentMargin: 33.3,
      contractAmount: 180000,
      healthStatus: HealthStatus.YELLOW,
      eac: 120000,
      wipValue: 30000,
      riskWarnings: ['WIP 占用周期过长', '利润率下降趋势'],
    },
  ],
  simulator: {
    currentConfig: {
      featureScope: 80,
      commercialBudget: 60,
      targetMargin: 35,
    },
    simulationResult: {
      estimatedMargin: 28,
      breakEvenLine: 15,
      totalCost: 108000,
      totalRevenue: 150000,
    },
    similarProjects: [
      {
        id: 'proj-sim-001',
        name: '类似电商项目A',
        industry: '互联网',
        projectType: '电商购物',
        margin: 32,
        durationDays: 40,
        totalCost: 95000,
      },
      {
        id: 'proj-sim-002',
        name: '类似电商项目B',
        industry: '互联网',
        projectType: '电商购物',
        margin: 28,
        durationDays: 50,
        totalCost: 110000,
      },
    ],
  },
  drillDown: {
    totalProfit: 195000,
    byIndustry: [
      {
        industry: '互联网',
        profit: 120000,
        percentage: 61.5,
        projects: [
          {
            projectId: 'project-001',
            projectName: '电商购物小程序',
            profit: 55000,
            costBreakdown: {
              laborCost: {
                total: 50000,
                development: 40000,
                rework: 10000,
              },
              commercialCost: {
                total: 15000,
                entertainment: 5000,
                travel: 10000,
              },
              operationCost: 10000,
              thirdPartyCost: 20000,
            },
          },
        ],
      },
      {
        industry: '教育',
        profit: 65000,
        percentage: 33.3,
        projects: [
          {
            projectId: 'project-003',
            projectName: '在线教育平台',
            profit: 65000,
            costBreakdown: {
              laborCost: {
                total: 80000,
                development: 65000,
                rework: 15000,
              },
              commercialCost: {
                total: 20000,
                entertainment: 8000,
                travel: 12000,
              },
              operationCost: 15000,
              thirdPartyCost: 10000,
            },
          },
        ],
      },
      {
        industry: '企业办公',
        profit: 10000,
        percentage: 5.1,
        projects: [
          {
            projectId: 'project-005',
            projectName: '企业办公系统',
            profit: 10000,
            costBreakdown: {
              laborCost: {
                total: 60000,
                development: 50000,
                rework: 10000,
              },
              commercialCost: {
                total: 10000,
                entertainment: 3000,
                travel: 7000,
              },
              operationCost: 8000,
              thirdPartyCost: 12000,
            },
          },
        ],
      },
    ],
  },
};

// 状态显示映射
export const caseStatusMap: Record<CaseStatus, { label: string; color: string }> = {
  [CaseStatus.DRAFTING]: { label: '草拟中', color: 'default' },
  [CaseStatus.QUOTING]: { label: '报价中', color: 'processing' },
  [CaseStatus.NEGOTIATING]: { label: '协商中', color: 'processing' },
  [CaseStatus.SIGNED]: { label: '已签单', color: 'success' },
  [CaseStatus.IN_PROGRESS]: { label: '交付中', color: 'processing' },
  [CaseStatus.SUSPENDED]: { label: '挂起', color: 'warning' },
  [CaseStatus.ACCEPTING]: { label: '验收中', color: 'processing' },
  [CaseStatus.COLLECTING]: { label: '催款中', color: 'warning' },
  [CaseStatus.COMPLETED]: { label: '已完结', color: 'success' },
  [CaseStatus.TERMINATED]: { label: '已终止', color: 'error' },
};

// 健康状态显示映射
export const healthStatusMap: Record<HealthStatus, { label: string; color: string }> = {
  [HealthStatus.GREEN]: { label: '健康', color: 'green' },
  [HealthStatus.YELLOW]: { label: '预警', color: 'orange' },
  [HealthStatus.RED]: { label: '风险', color: 'red' },
};

// 功能清单状态显示映射
export const featureListStatusMap: Record<FeatureListStatus, { label: string; color: string }> = {
  [FeatureListStatus.DRAFT]: { label: '草稿', color: 'default' },
  [FeatureListStatus.PENDING_ESTIMATE]: { label: '待估算', color: 'processing' },
  [FeatureListStatus.ESTIMATED]: { label: '已估算', color: 'success' },
  [FeatureListStatus.LOCKED]: { label: '已锁定', color: 'default' },
};

// 功能点分类显示映射
export const featureCategoryMap: Record<FeatureCategory, { label: string; color: string }> = {
  [FeatureCategory.REUSE]: { label: '复用', color: 'green' },
  [FeatureCategory.SEMI_CUSTOM]: { label: '半定制', color: 'blue' },
  [FeatureCategory.NEW_DEV]: { label: '全新开发', color: 'orange' },
};

// 报价单状态显示映射
export const quotationStatusMap: Record<QuotationStatus, { label: string; color: string }> = {
  [QuotationStatus.DRAFT]: { label: '草稿', color: 'default' },
  [QuotationStatus.REVIEWING]: { label: '审批中', color: 'processing' },
  [QuotationStatus.APPROVED]: { label: '已审批', color: 'success' },
  [QuotationStatus.SENT]: { label: '已发送', color: 'processing' },
  [QuotationStatus.ACCEPTED]: { label: '已接受', color: 'success' },
  [QuotationStatus.REJECTED]: { label: '已拒绝', color: 'error' },
};

// 服务类别显示映射
export const serviceCategoryMap: Record<ServiceCategory, { label: string }> = {
  [ServiceCategory.TRAVEL]: { label: '出差驻场' },
  [ServiceCategory.COMMERCIAL]: { label: '商务成本' },
  [ServiceCategory.SALES]: { label: '销售成本' },
  [ServiceCategory.OPERATION]: { label: '运营成本' },
  [ServiceCategory.THIRD_PARTY]: { label: '第三方服务' },
  [ServiceCategory.HARDWARE]: { label: '硬件设备' },
  [ServiceCategory.CUSTOM]: { label: '自定义' },
};

// 根因类别显示映射
export const rootCauseCategoryMap: Record<string, { label: string; color: string }> = {
  scope_creep: { label: '需求变更', color: 'orange' },
  quality_issue: { label: '质量问题', color: 'red' },
  efficiency: { label: '效率问题', color: 'yellow' },
  commercial_overrun: { label: '商务超支', color: 'purple' },
  external: { label: '外部因素', color: 'gray' },
};

// 项目类型选项
export const projectTypeOptions = [
  { value: '电商购物', label: '电商购物' },
  { value: '社交社区', label: '社交社区' },
  { value: '出行打车', label: '出行打车' },
  { value: '在线教育', label: '在线教育' },
  { value: '医疗健康', label: '医疗健康' },
  { value: '金融理财', label: '金融理财' },
  { value: '企业办公', label: '企业办公' },
  { value: '物联网', label: '物联网' },
  { value: '其他定制', label: '其他定制' },
];

// 行业选项
export const industryOptions = [
  { value: '互联网', label: '互联网' },
  { value: '金融', label: '金融' },
  { value: '教育', label: '教育' },
  { value: '医疗', label: '医疗' },
  { value: '企业办公', label: '企业办公' },
  { value: '电商', label: '电商' },
  { value: '游戏', label: '游戏' },
  { value: '其他', label: '其他' },
];

// 岗位选项
export const roleOptions = [
  { value: 'product', label: '产品' },
  { value: 'design', label: '设计' },
  { value: 'frontend', label: '前端' },
  { value: 'backend', label: '后端' },
  { value: 'test', label: '测试' },
  { value: 'other', label: '其他' },
];

// 默认岗位单价
export const defaultRolePrices: Record<string, number> = {
  product: 1000,
  design: 800,
  frontend: 1200,
  backend: 1200,
  test: 600,
  other: 800,
};