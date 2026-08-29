// 财务与交付管理模块 Mock 数据
// 类型从 types.ts 导入（L1 拆分）

export {
  CaseStatus, HealthStatus, FeatureListStatus, FeatureCategory,
  QuotationStatus, ServiceCategory,
} from './types';
export type {
  Case, FeatureList, Feature, FeatureEstimation, Quotation,
  QuotationFeatureItem, QuotationServiceItem, CaseCostItem, PnLSnapshot,
  CasePostMortem, CostVariance, RootCause, FeatureTag,
  DashboardData, BubbleChartData, SimulatorData, SimilarProject,
  CostTrendData, FinancialModel, ProfitMode, CostStructure, DrillDownData,
} from './types';

import type {
  Case, FeatureList, Feature, Quotation,
  QuotationFeatureItem, QuotationServiceItem, CaseCostItem, PnLSnapshot,
  CasePostMortem, CostTrendData, CostStructure, DashboardData,
  FinancialModel, ProfitMode,
} from './types';
import {
  CaseStatus, HealthStatus, FeatureListStatus, FeatureCategory,
  QuotationStatus, ServiceCategory,
} from './types';
import { getAlphaOverheadAmount, getAlphaOverheadSnapshot } from '../finance-shared/alphaOverhead';


// Mock 数据：成本趋势（按周）
// 实际数据到当前周，之后为预测数据（EAC）
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
- **差旅成本**：交通、住宿与出差补贴，按项目或线索直接归集
- **推广成本**：获客投流与公共运营分摊
- **商务成本**：售前阶段必要支出，但需严格控制
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

**总成本 = 人力成本 + 差旅成本 + 推广成本 + 商务成本 + 第三方成本**

**人力成本：**
\`\`\`
人力成本 = Σ(各岗位人天 × 岗位日薪)
         = 产品人天 × 产品日薪
         + 设计人天 × 设计日薪
         + 前端人天 × 前端日薪
         + 后端人天 × 后端日薪
         + 测试人天 × 测试日薪
\`\`\`

**差旅成本：**
\`\`\`
差旅成本 = 交通费 + 住宿费 + 出差补贴
\`\`\`

**商务成本：**
\`\`\`
商务成本 = 招待费 + 礼品费 + 商务返点
         ≤ 商务费用上限（不含差旅）
\`\`\`

**推广成本中的公共运营分摊：**
\`\`\`
R_hour = 当月公共运营池 ÷ 全公司在职编制工时
项目运营分摊 = 项目工天 × 8 × 当月 R_hour
\`\`\`

**第三方成本：**
\`\`\`
第三方成本 = 云服务器 + 域名 + SSL + 短信 + 其他
（通常由客户承担，不计入项目成本）
\`\`\``,
    assumptions: [
      '日薪基于职级标准薪资，不含加班费和奖金',
      '公共运营池按月核算，并按项目工天和动态 R_hour 分摊',
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


// Mock 数据：成本结构
// 实际成本结构
// Mock 数据：Case 列表
export const mockCases: Case[] = [
  {
    id: 'case-001',
    caseNo: 'CASE-2026-07-01-001',
    leadId: 'lead-001',
    projectId: 'project-001',
    contractId: 'contract-001',
    quoteIds: ['quot-001', 'quot-001-supp1', 'quot-001-supp2'],
    extraContractIds: ['contract-001-bc01', 'contract-001-bc02'],
    status: CaseStatus.IN_PROGRESS,
    targetMargin: 30,
    budgetCap: 350000,
    commercialCap: 25000,
    industry: '互联网',
    projectType: '企业办公',
    techStack: ['React', 'Spring Boot', 'MySQL', 'Redis', '小程序'],
    durationDays: 90,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    leadName: '阿里巴巴集团',
    projectName: '企业内部管理系统',
  },
  {
    id: 'case-002',
    caseNo: 'CASE-2026-07-15-002',
    leadId: 'lead-002',
    quoteIds: ['quot-002'],
    status: CaseStatus.QUOTING,
    targetMargin: 30,
    budgetCap: 150000,
    commercialCap: 20000,
    industry: '金融',
    projectType: '金融理财',
    techStack: ['Vue.js', 'Java', 'MySQL'],
    createdAt: '2026-07-15T14:00:00Z',
    updatedAt: '2026-07-31T09:00:00Z',
    leadName: '腾讯-云服务平台',
  },
  {
    id: 'case-003',
    caseNo: 'CASE-2026-06-20-003',
    leadId: 'lead-003',
    projectId: 'project-003',
    contractId: 'contract-003',
    quoteIds: [],
    status: CaseStatus.COMPLETED,
    targetMargin: 25,
    budgetCap: 300000,
    commercialCap: 40000,
    industry: '教育',
    projectType: '在线教育',
    techStack: ['React', 'Python', 'PostgreSQL'],
    durationDays: 60,
    createdAt: '2026-06-20T08:00:00Z',
    updatedAt: '2026-07-25T16:00:00Z',
    completedAt: '2026-07-25T16:00:00Z',
    leadName: '字节跳动-教育平台',
    projectName: '在线教育平台',
  },
  {
    id: 'case-004',
    caseNo: 'CASE-2026-07-20-004',
    leadId: 'lead-004',
    quoteIds: [],
    status: CaseStatus.DRAFTING,
    targetMargin: 40,
    budgetCap: 100000,
    commercialCap: 15000,
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
    quoteIds: [],
    status: CaseStatus.COLLECTING,
    targetMargin: 30,
    budgetCap: 180000,
    commercialCap: 25000,
    industry: '企业办公',
    projectType: '企业办公',
    techStack: ['Angular', 'Java', 'Oracle'],
    durationDays: 50,
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-07-30T14:00:00Z',
    leadName: '美团-企业服务',
    projectName: '企业办公系统',
  },
];

// Mock 数据：功能清单列表
export const mockCostItems: CaseCostItem[] = [
  // Case-001 的成本项（阿里巴巴企业内部管理系统）
  // ===== 已发生的成本 =====
  // 人力成本 - 开发工时（已发生）
  {
    id: 'cost-001',
    caseId: 'case-001',
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
  // 差旅成本-已发生（ADR-0091 差旅独立）
  {
    id: 'cost-009',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'travel',
    costType: '差旅补贴',
    amount: 5400,
    employeeId: 'user-001',
    date: '2026-06-01',
    endDate: '2026-07-18',
    status: 'actual',
    description: '杭州出差18天补贴（¥300/天×3人）',
    createdAt: '2026-07-19T10:00:00Z',
    employeeName: '项目经理-张三',
  },
  {
    id: 'cost-010',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'travel',
    costType: '差旅交通住宿',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    sourceType: 'manual',
    costCategory: 'promotion',
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
  // 运营分摊：项目工天 × 8 × 当月动态 R_hour
  {
    id: 'cost-oh-001',
    caseId: 'case-001',
    sourceType: 'overhead',
    costCategory: 'promotion',
    costType: '运营分摊',
    amount: getAlphaOverheadAmount('2026-06', 70),
    quantityDays: 70,
    date: '2026-06-01',
    endDate: '2026-06-30',
    status: 'actual',
    description: `6月运营分摊（70天 × 8h × ¥${getAlphaOverheadSnapshot('2026-06').rate.toFixed(2)}/h）`,
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'cost-oh-002',
    caseId: 'case-001',
    sourceType: 'overhead',
    costCategory: 'promotion',
    costType: '运营分摊',
    amount: getAlphaOverheadAmount('2026-07', 84),
    quantityDays: 84,
    date: '2026-07-01',
    endDate: '2026-07-31',
    status: 'actual',
    description: `7月运营分摊（84天 × 8h × ¥${getAlphaOverheadSnapshot('2026-07').rate.toFixed(2)}/h）`,
    createdAt: '2026-08-01T10:00:00Z',
  },
  // ===== 未发生的成本（预测） =====
  // 人力成本-未发生（预计8-9月）
  {
    id: 'cost-f001',
    caseId: 'case-001',
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
    sourceType: 'manual',
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
  // 运营分摊-未发生（预计8月）
  {
    id: 'cost-f005',
    caseId: 'case-001',
    sourceType: 'overhead',
    costCategory: 'promotion',
    costType: '运营分摊',
    amount: getAlphaOverheadAmount('2026-08', 21),
    quantityDays: 21,
    date: '2026-08-01',
    endDate: '2026-08-31',
    status: 'forecast',
    description: `8月运营分摊预测（21天 × 8h × ¥${getAlphaOverheadSnapshot('2026-08').rate.toFixed(2)}/h）`,
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'cost-f006',
    caseId: 'case-001',
    sourceType: 'manual',
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    costCategory: 'promotion',
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
    sourceType: 'manual',
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
        grossMarginAmount: 65000,
      grossMarginRate: 26,
      netMarginAmount: 65000,
      netMarginRate: 26,
    },
    actualPnl: {
      revenue: 250000,
      laborCost: 125000,
      commercialCost: 28000,
      operationCost: 18000,
      thirdPartyCost: 14000,
        grossMarginAmount: 65000,
      grossMarginRate: 26,
      netMarginAmount: 65000,
      netMarginRate: 26,
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
