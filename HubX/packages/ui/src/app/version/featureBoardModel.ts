// 功能看板（Feature Board）：用户与 Claude Code 共享的开发协作状态板。
// 唯一事实源 = 仓库内配置文档 featureBoard.config.json（术语见 HubX/CONTEXT.md §功能看板）：
// - α版 dev server（apps/prototype 的 feature-board-store 插件）提供 GET/PUT /api/feature-board 直接读写该文档；
// - 无端点的环境（静态部署 / apps/web）回退 localStorage；
// - 文档缺失时用 versionMatrix.ts 的种子清单初始化。
// Claude Code 行为约定见 HubX/CLAUDE.md §功能看板。

// ---------- 类型 ----------

/** 功能条目状态：功能列表（要做的事）的推进阶段，由 Claude 自主判断维护 */
export const PLANNED_STATUSES = ['未开始', '已调研', '设计中', '已设计', 'α 已实现'] as const;
export type PlannedStatus = (typeof PLANNED_STATUSES)[number];

/** β版开发状态：生产开关打开后随开发推进，Claude 为主维护 */
export const BETA_DEV_STATUSES = ['未开始', '编码中', '测试中', '测试通过'] as const;
export type BetaDevStatus = (typeof BETA_DEV_STATUSES)[number];

/** α检查项：模块前端完成度的三个勾选维度 */
export const ALPHA_CHECK_KEYS = ['页面场景', '功能流程', 'UX 优化'] as const;
export type AlphaCheckKey = (typeof ALPHA_CHECK_KEYS)[number];
export type AlphaChecks = Record<AlphaCheckKey, boolean>;

export interface PlannedItem {
  name: string;
  status: PlannedStatus;
}

/** 已有功能：模块中已实现的功能项，点击可查看详细说明 */
export interface ExistingFeature {
  /** 功能名（显示为文字块） */
  name: string;
  /** 功能说明：默认使用这一段作为详情首屏文本 */
  description: string;
  /** 使用流程：可选，作为详情中的“使用流程”展示 */
  usage?: string;
  /** 需求文档或原型文档的相对地址：可选 */
  referencePath?: string;
  alpha: AlphaChecks;
}

export interface ExistingFeatureDetail {
  description: string;
  usage: string;
  referencePath: string;
}

/** 已有功能详情的默认需求/原型来源；条目可用 referencePath 覆盖。 */
const MODULE_REFERENCE_PATHS: Record<string, string> = {
  '线索全流程': '文档/PRD/PRD-线索管理模块.md',
  '报价工作台': '文档/PRD/PRD-报价流程管理.md',
  '客户与报价基础': '文档/PRD/PRD-线索项目合同统一视图.md',
  '合同签约': '文档/PRD/PRD-线索项目合同统一视图.md',
  '项目管理': 'HubX/docs/prototype/ZKHubX-业务单详情全景.html',
  '日报工时': '文档/PRD/PRD-新增日报功能.md',
  '交付支撑': 'HubX/docs/SYSTEM-OVERVIEW.md',
  '回款管理': '计划/当前/payment-kanban-dev-plan.md',
  '开票管理': '文档/需求/功能清单-四域架构.md',
  '成本核算': '文档/需求/功能清单-四域架构.md',
  '运营费用': '文档/PRD/PRD-运营费用管理.md',
  '精益交付': '文档/PRD/PRD-精益交付数据链路.md',
  '差旅管理': '文档/PRD/PRD-差旅管理.md',
  '财务视图': '文档/需求/功能清单-四域架构.md',
  '多渠道线索接入': '文档/PRD/PRD-线索派发管理.md',
  '线索池与初筛': '文档/PRD/PRD-线索管理模块.md',
  '组织与权限': '文档/需求/OA需求文档.md',
  '人资行政': '文档/需求/OA需求文档.md',
  '工作台与审批': '文档/PRD/PRD-审批流程管理.md',
  '智能会议': '文档/PRD/PRD-智能会议.md',
  '基础工具': 'HubX/docs/SYSTEM-OVERVIEW.md',
};

const FEATURE_REFERENCE_PATHS: Record<string, string> = {
  '工作台与审批::待办中心': '文档/PRD/PRD-待办提醒与消息通知.md',
  '工作台与审批::消息提醒': '文档/PRD/PRD-待办提醒与消息通知.md',
  '工作台与审批::功能看板切换功能架构': 'HubX/docs/ALPHA-BETA-ARCHITECTURE.md',
  '工作台与审批::功能看板切换技术架构': 'HubX/docs/ALPHA-BETA-ARCHITECTURE.md',
  '工作台与审批::工作记录页签': '计划/当前/feature-board-existing-features.md',
  '基础工具::全局搜索（⌘K 六实体跨域检索直达，只读投影不做权限过滤）': '文档/PRD/PRD-全局搜索.md',
};

const AUTO_FEATURE_RE = /(自动|生成|同步|联动|接缝|状态机|派生|公式|来源|流转)/;
const REVIEW_FEATURE_RE = /(审批|审核|派发|退回|领取|分配|归档|冲红|盖章|废止|作废|调整)/;
const FORM_FEATURE_RE = /(申请|录入|填写|登记|新建|创建|跟进|报销|借款)/;
const CONFIG_FEATURE_RE = /(配置|管理|模板|字典|架构|授权|标准|参数|规则)/;
const READ_FEATURE_RE = /(列表|中心|看板|大盘|视图|面板|报表|统计|分析|台账|记录|历程|搜索)/;

function defaultFeatureUsage(module: string, featureName: string): string {
  if (AUTO_FEATURE_RE.test(featureName)) {
    return `在「${module}」完成上游操作 → 系统自动执行“${featureName}” → 在关联对象的列表或详情中核对生成数据、状态或记录。`;
  }
  if (REVIEW_FEATURE_RE.test(featureName)) {
    return `进入「${module}」 → 打开待处理对象 → 执行“${featureName}”并确认 → 返回列表或详情核对状态与操作记录。`;
  }
  if (FORM_FEATURE_RE.test(featureName)) {
    return `进入「${module}」 → 打开“${featureName}” → 填写或选择必填信息并保存/提交 → 在列表或详情中查看处理结果。`;
  }
  if (CONFIG_FEATURE_RE.test(featureName)) {
    return `进入「${module}」 → 打开“${featureName}” → 新增或选择配置项 → 编辑并保存 → 回到业务场景验证配置已生效。`;
  }
  if (READ_FEATURE_RE.test(featureName)) {
    return `进入「${module}」 → 打开“${featureName}” → 使用筛选或搜索定位数据 → 点击条目查看详情或关联记录。`;
  }
  return `进入「${module}」 → 打开相关业务对象 → 使用“${featureName}”完成处理 → 在列表或详情中核对结果。`;
}

/** 为旧配置和刚迁入的 α 功能补齐详情展示，不反向伪造原始配置数据。 */
export function resolveExistingFeatureDetail(module: string, feature: ExistingFeature): ExistingFeatureDetail {
  const description = feature.description.trim()
    || `“${feature.name}”是「${module}」中的 α 已有能力，用于完成对应业务处理，并在相关列表、详情或状态记录中保留结果。`;
  const usage = feature.usage?.trim() || defaultFeatureUsage(module, feature.name);
  const referencePath = feature.referencePath?.trim()
    || FEATURE_REFERENCE_PATHS[`${module}::${feature.name}`]
    || MODULE_REFERENCE_PATHS[module]
    || '计划/当前/feature-board-existing-features.md';
  return { description, usage, referencePath };
}

export interface BetaState {
  /** 生产开关：默认关闭；仅用户手动打开，打开后 Claude 才开始该模块β版开发 */
  productionOn: boolean;
  devStatus: BetaDevStatus;
}

/** 领域：按业务价值链划分的业务域（8 域，见 ZK-HubX架构图.html），按优先级排序 */
export const DOMAINS = ['销售域', '交付域', '财务域', '获客域', '支撑域', '跨域工具', '资源域', '运维域'] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_COLORS: Record<Domain, string> = {
  '获客域': 'blue',
  '销售域': 'orange',
  '交付域': 'green',
  '资源域': 'purple',
  '运维域': 'cyan',
  '财务域': 'gold',
  '支撑域': 'gray',
  '跨域工具': 'arcoblue',
};

export interface AlphaUpdateMeta {
  /** 该功能模块在 α 版中的累计更新次数 */
  updateCount: number;
  /** 最近一次 α 更新日期，格式 YYYY-MM-DD；暂无记录时为空 */
  lastUpdatedAt: string;
}

export interface FeatureBoardModule {
  module: string;
  /** 所属领域 */
  domain: Domain;
  /** 是否为规划中模块（虚线边框标识） */
  isPlanned: boolean;
  /** 模块简介（向后兼容，UI 不再显示） */
  scope: string;
  /** 已有功能列表（显示为可点击文字块矩阵） */
  features: ExistingFeature[];
  /** 待设计功能（原「功能列表」，由 Claude 维护） */
  planned: PlannedItem[];
  alpha: AlphaChecks;
  /** 当前模块独立的 α 更新记录，不与其他行共享 */
  alphaMeta: AlphaUpdateMeta;
  beta: BetaState;
  /** 动态备注：当前特殊说明与状态说明 */
  note: string;
}

export type BoardChangeType = 'alpha' | 'planned' | 'beta' | 'note' | 'checklist';

export interface FeatureBoard {
  modules: FeatureBoardModule[];
}

// ---------- 种子与初值（PLAN 决策 7：如实反映现状） ----------

/** 模块→领域映射（对齐 ZK-HubX架构图.html 的 8 域划分） */
const MODULE_DOMAIN_MAP: Record<string, Domain> = {
  // 获客域
  '多渠道线索接入': '获客域',
  '线索池与初筛': '获客域',
  '渠道与投放': '获客域',
  // 销售域
  '线索全流程': '销售域',
  '报价工作台': '销售域',
  '客户与报价基础': '销售域',
  '合同签约': '销售域',
  '跟进助手': '销售域',
  '报价与合规增强': '销售域',
  // 交付域
  '项目管理': '交付域',
  '日报工时': '交付域',
  '交付支撑': '交付域',
  '工时加工': '交付域',
  '交付过程': '交付域',
  // 资源域
  '资源台账': '资源域',
  '到期预警与续费': '资源域',
  '资质与上架档案': '资源域',
  '机密凭据库': '资源域',
  '月度巡检': '资源域',
  // 运维域
  '运维工单': '运维域',
  '版本迭代支持': '运维域',
  '售后与培训': '运维域',
  '项目复盘': '运维域',
  // 财务域
  '回款管理': '财务域',
  '开票管理': '财务域',
  '成本核算': '财务域',
  '财务视图': '财务域',
  '精益交付': '财务域',
  '差旅管理': '财务域',
  '全期次视图': '财务域',
  // 支撑域
  '组织与权限': '支撑域',
  '人资行政': '支撑域',
  '工作台与审批': '支撑域',
  '人力增强': '支撑域',
  '行政后勤': '支撑域',
  '智能会议': '支撑域',
  // 跨域工具
  '基础工具': '跨域工具',
  '管理者工具': '跨域工具',
  '开发者工具': '跨域工具',
};

/** 已有功能种子数据：仅包含代码中有实际实现的功能（2026-08-18 核查） */
const FEATURES_SEED: Record<string, Omit<ExistingFeature, 'alpha'>[]> = {
  // ========== 销售域 ==========
  '线索全流程': [
    { name: '五池流转', description: 'LeadList（公海/我的/全部/已成交/垃圾）：线索类型独立维度（public/assigned/trash/hightech），8态销售漏斗，快捷筛选（今日未跟进/S类/AB类/超期），标红规则。' },
    { name: '线索详情', description: 'LeadDetail360（/leads/:id）：70:30 分栏，6步生命周期+6维胶囊。右侧报价页签新建报价/进入工作台（createQuote+QuotationWorkbench 抽屉）；合同记录页签新建合同进向导（/contracts/new + leadContractPrefill）。跟进/演示/资料/出差/报销。操作：领取/分配/退回/标记垃圾。' },
    { name: '线索跟进记录', description: '跟进方式/客户状态/客户级别/跟进内容(max1000)/下次跟进时间/附件。自动同步线索状态和客户等级。4分类Tab（全部/今日待跟进/今日已跟进/超期未跟进）。' },
    { name: '签约开启时生成未确认项目', description: '线索首次进入合同洽谈或已签单时，以 ap-lead-{leadId} 幂等生成待指派项目；后续创建合同只绑定原项目。', usage: '线索详情 → 写跟进 → 客户状态选择“合同洽谈”或“已签单” → 提交 → 项目管理的“待确认指派”查看唯一项目。', referencePath: 'HubX/docs/adr/0095-signing-open-server-linkage-does-not-move-spawn-to-approve.md' },
    { name: '线索操作规则', description: '领取(→assigned)/分配(批量+原因)/退回公海(第3次自动垃圾)/标记垃圾/软删除/转客户(自动填充+同步跟进)。重复检查(新增+修改)。' },
    { name: '线索治理', description: 'LeadGovernance：重复线索合并、线索状态批量操作、分配规则配置。' },
    { name: '售前群沟通分析', description: 'vite 中间件 wx-cli-bridge：wx CLI 导出企微售前群聊天记录，DeepSeek 做沟通总结。' },
  ],
  '报价工作台': [
    { name: 'Stage1 功能清单', description: '两级模块+子功能（数据流转可挂端/平台）。提交评估前至少一行。文件流转按标准五列解析。' },
    { name: 'Stage2 人天评估', description: '数据流转岗位人天；文件流转评估文件+合计。主报价完成评估人天须>0。' },
    { name: 'Stage3 销售报价', description: '增项、工作日工期、付款期次、含税总价。利润率是统计项。' },
    { name: 'Stage4 审批盖章', description: '目标：提交拍审批配置快照。已确认后向导生成合同。' },
    { name: '报价状态机', description: '目标：草稿/待评估/待报价/待审核/已驳回/待盖章/已盖章/已发出/已确认/已废止。' },
    { name: '角色切换器', description: 'RoleSwitcher 六角色。目标改为本单评估人/销售可改指。' },
    { name: '报价中心', description: '列表按新状态+待我处理+过期标记。' },
    { name: '报价工作台长流程框架', description: 'QuotationWorkbench 复用统一面包屑、对象控制卡、6 维指标摘要和 70:30 主辅工作区；已到达阶段可只读回看，未到达阶段禁止进入。', usage: '报价中心 → 进入报价工作台 → 在顶部确认阶段、金额、人天与待办人 → 通过阶段导航回看历史内容 → 在当前阶段继续处理。', referencePath: 'HubX/DESIGN.md' },
  ],
  '客户与报价基础': [
    { name: '客户列表', description: 'Customers.tsx：客户基础信息管理，按行业/规模/来源筛选。' },
    { name: '客户详情', description: 'CustomerDetail.tsx：客户基本信息、关联线索/合同列表、联系人管理。' },
  ],
  '合同签约': [
    { name: '合同创建（带入线索）', description: 'ContractWizard 通过统一三级面包屑进入新建或编辑合同表单，并可从线索、报价上下文带入合同基础信息。', usage: '合同管理 → 合同列表 → 新建合同；也可从线索或报价流程进入并核对预填信息后继续编辑。', referencePath: 'HubX/DESIGN.md' },
    { name: '合同多版本管理', description: 'ContractEditor 与 ContractDocumentPreview 使用“合同管理 → 合同列表 → 当前合同 → 编辑/预览”层级；编辑自动生成新版本，历史版本只读对比。', usage: '合同列表或合同详情 → 打开合同编辑 → 调整合同与回款计划 → 进入合同预览 → 提交版本说明。', referencePath: 'HubX/DESIGN.md' },
    { name: '合同审批流', description: '总经理单节点审批（P0① 已收敛），意见留痕，审批通过→释放回款 Tab。' },
    { name: '合同归档', description: 'archiveFinalContract：审批通过后上传归档文件，支持多附件。' },
    { name: '补充报价发起与审批', description: '已批准主合同可发起补充报价，沿用四步报价工作台并使用独立审批配置。' },
    { name: '多份补充报价/补充合同列表', description: '主合同详情集中展示关联的多份补充报价与补充合同，并支持进入各自详情。' },
    { name: '需求变更闭环（补充报价→补充合同）', description: '补充报价经客户确认后由合同向导生成一对一补充合同；仅已归档未作废补充合同计入有效标的额。' },
    { name: '已确认生成主合同', description: '已确认后向导预填生成主合同；合同作废后可再生成。' },
    { name: '合同列表', description: 'ContractKanban.tsx：合同看板视图，编号自动生成（ZK-C-YYYYMMDD-NNN）。' },
  ],
  // ========== 交付域 ==========
  '项目管理': [
    { name: '项目基础信息', description: 'ProjectDetail360（/projects/:id）：对齐线索详情 70:30 结构。头部控制台（元数据+生命周期Steps+6维指标胶囊）；左侧档案卡+主Tab（基础信息/合同信息/回款与发票/团队与工时/日报/任务管理/项目动态）；右侧次级Tab（跟进/报价/合同记录/售前历程/会议纪要/演示/资料/出差/报销）。项目列表走 ProjectService（α mock / β http）；B3 spawn 的项目不在 PROJECT_LIST 时用 deriveProjectViewMetrics 兜底。报价接 QuotationContext，合同接 ContractsContext，回款期次读合同 paymentPlans，实收台账读 CollectionService，任务/日报/会议/确认书/演示环境按 projectId 接共享台账。' },
    { name: '交付计划长流程工作台', description: 'DeliveryPlanPage 复用统一面包屑、对象控制卡、7 步 SOP 概览、6 维指标和 70:30 主辅工作区；任务清单与甘特图保持同步滚动。', usage: '项目详情 → 打开交付计划 → 确认 SOP 阶段与风险指标 → 筛选板块 → 双击步骤编辑。', referencePath: 'HubX/DESIGN.md' },
    { name: '项目任务管理', description: 'ProjectTaskPanel.tsx：任务拆分/分配/状态跟踪，按成员筛选。' },
    { name: '项目成本核算', description: 'ProjectCostPanel.tsx / ProjectCostPage.tsx：人工+差旅+其他成本，利润率分析。' },
    { name: '项目报价配置', description: 'ProjectQuotationConfigurator.tsx：项目与报价关联配置。' },
    { name: '项目质量面板', description: 'ProjectQualityPanel.tsx：项目质量指标跟踪。' },
    { name: '项目详情信息优先级与精选活动流', description: 'ProjectDetail360 保留 70:30 结构，默认聚焦项目动态与跟进；六项执行指标、阶段说明、紧凑档案、大事记筛选和右栏吸顶已落地。项目动态依 ADR-0097 从合同、回款、确认书、会议、任务和项目自有事件生成只读精选投影。', usage: '项目管理 → 项目详情 → 查看六项指标与当前阶段 → 在项目动态切换大事记、查看来源或快速登记跟进。', referencePath: '计划/当前/project-detail-360-prototype-restyle.md' },
  ],
  '日报工时': [
    { name: '日报填写', description: 'DailyReportModal.tsx：选择项目/工作种类，填写工时，工时×时薪自动计算成本。' },
    { name: '日报列表', description: 'DailyReportList 复用 PageShell、PageHeader、FilterBar 和统一指标网格；展示日报总数、汇报人数、累计工时和部门数，支持按汇报人或部门关键词、部门和日期范围真实筛选，保留补录、新增、详情与评论流程。', usage: '日报 → 日报列表 → 查看摘要 → 输入汇报人或部门、选择部门或日期范围 → 打开日报详情；需要时补录或新增日报。', referencePath: 'HubX/DESIGN.md' },
    { name: '日报视图', description: 'DailyReportView 通过统一三级面包屑进入员工日报视图，按组织与人员查看日报历史、工作归属和评论详情。', usage: '日报 → 日报列表 → 员工日报视图 → 选择员工与日期 → 展开日报并查看详情或评论。', referencePath: 'HubX/DESIGN.md' },
    { name: '项目视图', description: 'ProjectLogView 通过统一三级面包屑进入项目日报明细，按汇报人、部门、项目、工作性质和日期检索团队日报。', usage: '日报 → 日报列表 → 项目日报明细 → 设置筛选条件 → 查询并打开日报详情。', referencePath: 'HubX/DESIGN.md' },
    { name: '日报配置', description: 'JobWorkConfigPage 通过统一三级面包屑进入岗位与日常工作配置，维护岗位工作性质和部门日常工作规则。', usage: '日报 → 日报列表 → 岗位与日常工作配置 → 选择部门岗位或日常工作分类 → 编辑并保存配置。', referencePath: 'HubX/DESIGN.md' },
    { name: '角色模板', description: 'RoleSelectModal + SalesDaily/DevDaily/GeneralDaily/AdDeliveryDaily 四套模板。' },
  ],
  '交付支撑': [
    { name: '会议管理', description: 'MeetingManagement.tsx：会议记录创建、纪要编辑、参会人管理。' },
    { name: '知识库', description: 'KnowledgeBase.tsx：文档存储与检索，按模块分类。' },
    { name: '售后运维', description: 'MaintenanceManagement.tsx：售后工单管理，故障上报与处理。' },
  ],
  // ========== 财务域 ==========
  '回款管理': [
    { name: '期次拆分', description: 'LeadPaymentInvoicePanel.tsx：按付款比例拆分期次，金额联动校验。' },
    { name: '回款登记', description: '财务录入实际到账款（金额/日期/方式/说明）。实收以 CollectionService 为事实源；合同兼容记录与独立台账双写时沿用同一流水 ID。合同列表、详情、回款看板与预测均读取台账投影；期次计划仍读合同 paymentPlans。' },
    { name: '状态自动计算', description: 'paymentInvoiceModel.ts getPaymentPeriodMetrics：回款四态×开票三态自动计算。' },
    { name: '回款看板', description: '首页按五个状态泳道总览回款合同，行动队列推进具体回款期次，预测页签查看未来现金流。', usage: '合同管理 → 回款管理 → 首页查看合同泳道 → 点击合同查看回款详情；需要推进节点时进入行动队列。', referencePath: '计划/当前/payment-kanban-dev-plan.md' },
    { name: '回款权限矩阵', description: 'getPeriodActionPermissions（P0② WIP）：统一状态机控制操作权限。' },
  ],
  '开票管理': [
    { name: '开票申请', description: 'LeadPaymentInvoicePanel.tsx：提交开票申请（发票类别/税率/金额/客户信息）。' },
    { name: '发票冲红', description: '填写冲红原因+附件，生成新的待开票记录。' },
    { name: '开票审核工作台', description: 'ProjectInvoicePage 复用 PageShell、PageHeader、FilterBar 和统一指标网格；展示申请总数、待开票、已开票和已冲红摘要，支持按项目编号、项目名称、客户、期次与发票类别真实检索，并保留附件上传、回款期次核对和详情查看流程。', usage: '财务管理 → 开票审核 → 查看任务摘要 → 选择状态或搜索项目/客户 → 打开申请核对回款与客户信息 → 待开票任务上传附件并确认开票。', referencePath: '文档/需求/功能清单-四域架构.md' },
  ],
  '成本核算': [
    { name: '按人员工时成本', description: 'ProjectCostPanel.tsx：工时×时薪计算人工成本，按项目/部门汇总。' },
    { name: '差旅与商务独立归集', description: '差旅报销进入差旅成本，招待、礼品和返点进入商务成本；两类分别汇总。' },
    { name: '动态运营公摊', description: '公共运营池按全公司在职编制工时计算月度 R_hour，合同成本与精益交付共用。' },
  ],
  '运营费用': [
    { name: '费用大盘 / 台账 / 周期模板 / 公摊参数', description: 'OperatingExpensePage 四 Tab 已落地：确认即入账、作废不删、固定模板即入账/浮动待确认、R_hour=池÷在职编制工时。工资只看板引用。' },
  ],
  '精益交付': [
    { name: '业务单管理', description: 'CaseList/CaseDetail：CASE- 独立编号，财务交付视角聚合（报价/合同/回款/成本/EAC）。' },
    { name: '业务单详情长流程工作台', description: 'CaseDetail 复用统一面包屑、对象控制卡、真实生命周期轨迹、6 维经营指标和 70:30 主辅工作区；保留经营概览、工时评估、报价单、成本归集与项目决算五个业务页签。', usage: '精益交付 → 业务单管理 → 打开业务单 → 在顶部确认阶段、健康度和经营指标 → 进入对应页签查看评估、报价、成本或决算 → 调整经营参数或推进状态。', referencePath: 'HubX/DESIGN.md' },
    { name: '精益交付仪表盘', description: 'Dashboard：概览统计、健康气泡图、风险预警列表（移植自 llhfire/hubX，数据链路待收口）。' },
  ],
  '差旅管理': [
    { name: '出差申请', description: 'TripForm 通过统一三级面包屑与 20px 页头进入新建申请，填写关联对象、行程、费用预估和借款需求；TripDetail 保留 6 Tab 流程。', usage: '差旅管理 → 出差申请 → 新建出差申请 → 填写基本信息、行程、住宿、费用与借款 → 保存草稿或提交审批。', referencePath: 'HubX/DESIGN.md' },
    { name: '出差详情长流程工作台', description: 'TripDetail 复用统一面包屑、对象控制卡、6 步流程概览、6 维指标和 70:30 主辅工作区；保留基本信息、旅程、费用、报销、借款与补贴六个业务页签。', usage: '差旅管理 → 出差申请 → 打开出差单 → 在顶部确认当前阶段与费用摘要 → 进入对应页签处理行程、费用、报销、借款或补贴 → 按状态执行开始、结束或关闭出差。', referencePath: 'HubX/DESIGN.md' },
    { name: '报销与借款', description: 'ReimbursementList/LoanList：报销单冲抵借款、打款状态流。' },
    { name: '宿舍管理', description: 'DormitoryManagement：楼/层/房/床、入住退住、维修、费用台账（宿舍费用的唯一写入方）。' },
    { name: '费用标准', description: 'StandardList：版本+生效期+职级×城市等级标准明细。' },
    { name: '差旅看板', description: 'TravelDashboard + FinanceAuditDashboard：个人/部门/项目差旅统计与财务审计。' },
  ],
  '财务视图': [
    { name: '财务统计面板', description: 'FinanceDashboard：收入/支出/利润汇总，趋势图表。' },
    { name: '项目成本报表', description: 'ProjectCostPage.tsx：项目维度成本明细，利润率分析。' },
    { name: '工资表', description: 'SalaryPage：员工工资计算，工时×时薪汇总，按月生成。' },
  ],
  // ========== 获客域 ==========
  '多渠道线索接入': [
    { name: '线索来源管理', description: 'leads 模块：多渠道线索接入，来源标记与追踪。' },
    { name: '投放日报', description: 'lead-cost 模块：投放日报、成本看板、渠道分析页面。' },
    { name: '线索录入表单', description: '/lead-dispatch 录入：业务线/主体/渠道（数据字典）/channelPlan/客户信息/初始分级 S/A/B/C/初始分配（存待派发池或立即指派）。无 D 级、意向评分不落库。' },
    { name: '派发工作台列表', description: '三视角（管理者/推广/录入员，RoleSwitcher+权限纯函数）过滤、今日录入默认、多维筛选、告警卡（待派发/首联超时/重点客资/待审核/质检分桶）、Cohort 成交率卡片。' },
    { name: '派发动作', description: '派发弹窗选部门->选销售或派发到公海（ADR-0096：待派发锁领取，派发是唯一出口）；批量派发；派发到公海不算退回放弃。' },
    { name: 'SLA 时效监控', description: '30min 派发 SLA（只标红+催办不自动派）、2h 首联 SLA（首条跟进记录停表）、1h 临期提醒；数字入配置；slaCalc 纯函数两侧同一口径。' },
    { name: '催办', description: '站内提醒 + leadEvents 留痕；企微推送 β 经服务接缝接，α 不做。' },
    { name: '等级调整与审核', description: '升级免审+新晋升弱提示；降级走审批中心业务类型「线索等级调整」（审核人按业务线配审批配置）；管理员直改只留痕。' },
    { name: '退回质检（3人3轮）', description: '退回按不同销售去重计数；满 3 人转管理员确认进垃圾；派发到公海不算放弃；质检卡片分桶。' },
    { name: '全生命周期穿透抽屉', description: '只读抽屉：三节点进展、流转属性、leadEvents 只增不删时光轴；写动作跳 LeadDetail360。' },
    { name: '销售侧时效监控', description: '五池列表加「时效」列，LeadDetail360 头部加派发时间与首联状态、动态读同一份 leadEvents。' },
  ],
  '线索池与初筛': [
    { name: '四池管理', description: '公海/我的/已成交/垃圾四池统一视图，线索认领、分配、回收。' },
    { name: '来源标记', description: '线索来源渠道标记（百度/小红书/抖音/淘宝等）。' },
  ],
  // ========== 支撑域 ==========
  '组织与权限': [
    { name: '组织架构', description: 'EmployeeContext.tsx：公司/部门/岗位树形结构管理。' },
    { name: '用户管理', description: '用户账号创建、启用/禁用，关联组织架构。' },
    { name: '角色授权', description: '角色定义，角色关联菜单权限+操作权限。' },
    { name: '数据字典', description: 'Dictionary 复用 PageShell、PageHeader、FilterBar 和统一指标网格；以“字典分类 → 当前分类项”主从列表维护系统枚举，支持分类/字典项关键词与状态真实筛选，以及 α 会话内新增、编辑、删除。', usage: '系统管理 → 数据字典 → 查看分类摘要 → 搜索或选择分类 → 检索当前字典项 → 新建、编辑或删除分类与字典项。', referencePath: '文档/需求/功能清单-四域架构.md' },
  ],
  '人资行政': [
    { name: '员工列表', description: 'EmployeeContext.tsx：员工基础信息管理。' },
    { name: '岗位管理', description: '岗位定义与职级体系（L1-L10），岗位关联时薪标准。' },
    { name: '考勤请假', description: '考勤记录、请假审批、加班统计。' },
  ],
  '工作台与审批': [
    { name: '工作台仪表盘', description: 'Dashboard.tsx：关键指标概览，快捷入口。' },
    { name: '个人工作台', description: 'PersonalWorkbench.tsx：个人任务清单、能力面板。' },
    { name: '审批中心', description: 'ApprovalContext.tsx + ApprovalCenter：待办/已办/我发起的，通过/驳回。' },
    { name: '待办中心', description: 'TodoContext.tsx：统一待办聚合，支持完成/忽略操作。' },
    { name: '消息提醒', description: 'ReminderContext.tsx + ReminderBell：顶栏提醒，未读计数，日报催报。' },
    { name: '功能看板切换功能架构', description: '侧栏版本标识打开功能看板后，页签切「功能架构」，iframe 打开仓库根 ZK-HubX架构图.html（/architecture.html）。' },
    { name: '功能看板切换技术架构', description: '功能看板页签切「技术架构」（HubX/docs/ZK-HubX技术架构.html → /tech-architecture.html）。' },
    { name: '工作记录页签', description: '功能看板页签「工作记录」：按日期、按分类（功能/底座/设计/文档/修洞/其它）写当天一句话；事实源 workLog.config.json。' },
  ],
  '智能会议': [
    { name: '纪要列表页（本月沉淀统计/搜索/多维筛选/新建入口）', description: '智能会议列表复用 PageShell、PageHeader、FilterBar 和统一指标网格，汇总本月纪要与状态；支持按主题、决议、正文、行动项、业务引用和参会人搜索，按状态筛选、新建纪要及进入详情工作台。', usage: '智能会议 → 查看本月沉淀与状态指标 → 输入关键词或选择纪要状态 → 打开目标纪要；也可点击“新建纪要”进入工作台。', referencePath: 'HubX/DESIGN.md' },
    { name: '智能会议纪要长流程工作台', description: 'SmartMeetingWorkbench 复用统一面包屑、对象控制卡、4 步流程概览、6 维指标和 70:30 主辅工作区；保留会议来源与元信息、核心决议与正文、行动事项、版本留痕及确认归档能力。', usage: '智能会议 → 纪要列表 → 打开或新建纪要 → 整理来源与元信息 → 编写决议和正文 → 补充行动项 → 提交确认 → 确认后同步待办 → 归档。', referencePath: 'HubX/DESIGN.md' },
    { name: '行动项TODO只读投影（actionItemId幂等同步/软取消/不重开）', description: '纪要确认后按 actionItemId 幂等同步行动项到待办中心；行动项更新会更新待办，删除只做软取消，已完成待办不被重新打开。' },
    { name: '行政会议来源入口（一次性快照/一会议至多一当前纪要）', description: '从行政会议生成纪要时保存一次性会议快照，并限制同一会议仅保留一份当前纪要入口。' },
  ],
  // ========== 跨域工具 ==========
  '基础工具': [
    { name: '企业微信集成', description: 'IntegrationContext.tsx：通讯录同步、消息推送、群聊导出（wx CLI）。' },
    { name: '数据报表', description: 'Reports.tsx：销售报表、业绩统计、渠道 ROI 图表（recharts）。' },
    { name: '资产管理', description: 'AssetManagement.tsx：资产登记、分类管理、状态跟踪。' },
    { name: '供应商管理', description: 'SupplierManagement.tsx：供应商信息管理、合作状态。' },
  ],
};

const PLANNED_SEED: Record<string, string[]> = {
  // ========== 从「已有功能」移入（代码未实现） ==========
  // 销售域
  '客户与报价基础': ['联系人管理（多联系人/职位/标记主联系人）', '关系视图（客户→线索→报价→合同→项目链路可视化）', '开票信息（纳税人识别号/开户行等，合同创建时自动带入）'],
  '报价工作台': [
    '状态机按 PRD 收口（已确认/已废止/过期标记）',
    '数据流转与文件流转双来源',
    '会签盖章读审批配置快照',
    '客户报价单按中科标准件',
    '文件流转在线文档+扫描件',
    '利润率统计与岗位日成本配置',
    '报价模板（增项/日成本/工期）',
    '责任人/通知/列表/权限按配置',
  ],
  '线索全流程': ['签约后综合视图（销售在线索详情看项目执行）', '线索侧合同/回款入口（草稿即可引用）', '管理员退回线索（未确认或未开始无合同）', '线索域接缝（LeadService mock/http 双实现+服务端校验）'],
  '合同签约': ['已确认生成主合同（词表收口）', '合同模板管理'],
  '项目管理': ['未确认项目与管理员指派产品经理', '产品经理默认列表隐藏未确认/未指派', '售前历程交接包（跟进/会议/演示/资料只读）', '管理员退回线索 / 改指产品经理', '主合同作废则进行中项目搁置', '签约开启联动服务端化（ADR-0093，Workers 内 spawn/交付/SOP）', '项目域接缝（ProjectService mock/http 双实现）'],
  // 交付域
  '日报工时': ['跨月跨年日报（时间轴优化）'],
  '交付支撑': ['合同交付跟进（里程碑节点管理）', '变更管理（需求变更记录/影响评估/审批）', '演示上传（线索详情中的演示记录管理）'],
  // 财务域
  '回款管理': ['逾期判断（预计回款日期对比，自动标记逾期）', '回款记录与实收台账接缝（collections 表，与回款看板计划合并排期）'],
  '开票管理': ['开票统计（按项目/客户/时间段汇总）'],
  '成本核算': ['异常检测（成本异常预警：超出预算/工时异常/费用异常）'],
  '运营费用': ['费用大盘（6个月滚动+工资平移）', '费用台账（确认即入账、作废不删）', '周期模板（固定即入账/浮动待确认）', '公摊参数（池÷全公司在职编制工时）', '大盘双口径与八层流式堆叠', '部门归口排行与项目直接支出排行', '运营费用异动（三条）与台账导出', '公摊公式条 + 只读公摊结果表', '科目入口 Tab（系统费用分类同一棵树）', '录入抽屉发生日与按 Tab 主操作'],
  '精益交付': ['五条数据链派生化（评估/报价/合同/回款/成本全有来源）', '跨域引用报价域+合同域（删平行 mock）', '回款口径收入+WIP/趋势双线', '模拟器敏感性+底线价、穿透看板派生化', '业务单详情原型重构（成本五类修订ADR-0091/1主多补演进脉络/10态轨迹/双口径全景/报价行级明细/状态推进+参数Modal/CSV导出/仪表盘补穿透看板与相似项目）'],
  '差旅管理': ['核心链细则（必挂项目或线索/硬软超标/单一补贴不含路途日/借款顺序冲抵）', '审批固定流+借款金额分级（阈值入配置）', '报销双出口（运营费用只读归集+成本流水）', '删除打卡模块（考勤归工时加工）', '可配置审批引擎', '票据 OCR'],
  '财务视图': ['合同统计（合同金额/回款/开票/待收汇总）'],
  // 获客域
  '多渠道线索接入': ['渠道词表迁数据字典（5 值英文 key：xiaohongshu/baidu/douyin/wechat/website，LeadSource 硬编码退位，存量中文值平移完成）', '用户档案「负责渠道」多选字段（三视角过滤依据）', '企微催办推送（β 服务接缝，α 仅站内）'],
  '线索池与初筛': ['去重清洗（按公司名/联系人手机号自动去重）', '清洗分级（线索质量评分，分级沿用 S/A/B/C，无 D 级）'],
  // 支撑域
  '组织与权限': ['菜单路由（前端菜单树配置）', '逐人权限（特殊场景额外授权）'],
  '人资行政': ['工资管理（基本工资+绩效+补贴-扣款）', '调整记录（调薪/调岗/晋升历史）', '员工档案（完整档案：合同/考勤/薪资/绩效）'],
  '工作台与审批': ['审批模板（串行/并行/会签节点配置）', '报价审批与补充报价审批两条业务类型', '数据看板（管理者：销售业绩/项目进度/财务概览）'],
  // 跨域工具
  '基础工具': ['操作日志（谁/何时/做了什么）', '权限拦截（路由级+接口级权限校验）', '工天配置（大小周日历/法定节假日/调休）', '登录认证（登录/登出/会话管理）', '全链路 ROI（广告消耗→线索→客户→合同→利润，按渠道拆分）', 'β 数据底座（乐观锁 version、actor/时钟服务端可信，ADR-0094）', 'B5 β 上线收口（http 核对/D1/冒烟/看板翻牌门）', '全局搜索（⌘K 六实体跨域检索直达，只读投影不做权限过滤）'],

  // ========== 规划模块（原有） ==========
  // 销售域规划
  '跟进助手': ['自动提醒（跟进到期/客户生日/合同续签）', '跟进待办生成与分配', '阶段推进智能建议（基于历史转化率）'],
  '报价与合规增强': ['Excel 双向导入导出', '版本 Diff 对比', '代理/转交机制', '电子签章', '合规档案'],
  // 交付域规划
  '工时加工': ['工时审批', '工时统计与分析', '加班工时计算与补偿'],
  '交付过程': ['里程碑管理', '验收流程', '需求变更管控'],
  // 财务域规划
  '全期次视图': ['一屏查看项目全期次回款与开票状态', '期次进度条+逾期预警', '批量开票/批量回款操作'],
  // 获客域规划
  '渠道与投放': ['渠道台账', '投放预算管理', '线索成本核算', '渠道 ROI 分析', '市场活动归因'],
  // 支撑域规划
  '人力增强': ['薪酬管理', '员工成本核算', '招聘管理', '培训管理', '绩效管理'],
  '行政后勤': ['固定资产登记与折旧', '办公物品领用与库存', '会议室预约与管理', '行政流程', '物资采购'],
  '智能会议': ['AI解析与润色（α确定性解析/β服务端AI接口预留）', 'β接线（D1 smart_minutes 表+服务端不变量校验+AI Secret）'],
  // 跨域工具规划
  '管理者工具': ['经营驾驶舱', '全域报表', '组织健康度', '审批总览', '经营预警'],
  '开发者工具': ['代码生成器', '数据迁移工具'],
  // 资源域规划
  '资源台账': ['SSL 证书管理', '域名管理', '云资源管理', '大模型 Token 管理', '第三方接口管理', '应用商店'],
  '到期预警与续费': ['到期前 30 天自动提醒', '续费流程', '额度监控', '扩容管理'],
  '资质与上架档案': ['ICP 备案管理', '小程序备案', 'APP 上架管理', '软著登记'],
  '机密凭据库': ['密钥管理', 'Token 管理', '证书管理', '账号管理', '访问审计'],
  '月度巡检': ['资源巡检', '异常报告', '零关停保障'],
  // 运维域规划
  '运维工单': ['故障上报', '处理流转', 'SLA 响应', '工单记录'],
  '版本迭代支持': ['迭代需求收集', '版本管理', '重新提审', '资源配置更新'],
  '售后与培训': ['客户培训', '操作手册', '运维手册', '满意度调研'],
  '项目复盘': ['交付复盘', '知识沉淀', '功能复用库', '避坑手册'],
};

export function createSeedBoard(): FeatureBoard {
  // 架构图全部 37 模块（18 现有 + 19 规划），按领域优先级排列
  const ALL_MODULES: Array<{ module: string; domain: Domain; isPlanned: boolean; scope?: string; features: ExistingFeature[]; planned?: string[]; note: string }> = [
    // === 销售域（优先级 1）===
    { module: '线索全流程', domain: '销售域', isPlanned: false, features: FEATURES_SEED['线索全流程'] ?? [], note: '五池流转+线索类型维度+客户等级SABC+跟进自动同步+操作规则+重复检查+24h限制+3次退回自动垃圾+复合列压缩+倒计时胶囊+色彩降噪+快捷模板+高级筛选Popover+枚举映射层' },
    { module: '报价工作台', domain: '销售域', isPlanned: false, features: FEATURES_SEED['报价工作台'] ?? [], note: 'β版报价单落 D1，含状态迁移校验；已上线 http+D1' },
    { module: '客户与报价基础', domain: '销售域', isPlanned: false, features: FEATURES_SEED['客户与报价基础'] ?? [], note: '客户档案/联系人/关系视图/开票信息' },
    { module: '合同签约', domain: '销售域', isPlanned: false, features: FEATURES_SEED['合同签约'] ?? [], note: 'mock/http 共享 contractMutations；已上线 http+D1' },
    { module: '跟进助手', domain: '销售域', isPlanned: true, features: [], planned: ['自动提醒', '跟进待办', '阶段建议'], note: '规划中' },
    { module: '报价与合规增强', domain: '销售域', isPlanned: true, features: [], planned: ['Excel 双向导入导出', '版本 Diff 对比', '代理/转交机制', '电子签章', '合规档案'], note: '规划中' },
    // === 交付域（优先级 2）===
    { module: '项目管理', domain: '交付域', isPlanned: false, features: FEATURES_SEED['项目管理'] ?? [], note: 'α 签约开启已统一生成唯一未确认项目，批准只开工（ADR-0095）；项目详情信息优先级与精选活动流已完成 α 编码与实页验收（ADR-0097）；β Workers 持久化归 B5/U1' },
    { module: '日报工时', domain: '交付域', isPlanned: false, features: FEATURES_SEED['日报工时'] ?? [], note: '工时×时薪成本计算' },
    { module: '交付支撑', domain: '交付域', isPlanned: false, features: FEATURES_SEED['交付支撑'] ?? [], note: '合同交付跟进/变更管理/进度跟踪/知识库/会议纪要' },
    { module: '工时加工', domain: '交付域', isPlanned: true, features: [], planned: ['工时审批', '统计与分析', '加班工时'], note: '规划中' },
    { module: '交付过程', domain: '交付域', isPlanned: true, features: [], planned: ['里程碑', '验收流程', '需求变更管控'], note: '规划中' },
    // === 财务域（优先级 3）===
    { module: '回款管理', domain: '财务域', isPlanned: false, features: FEATURES_SEED['回款管理'] ?? [], note: '期次读 paymentPlans；实收以 collections 为事实源，合同兼容记录同 ID 双写；α 看板与预测已接台账投影，β 持久化仍待 B5' },
    { module: '开票管理', domain: '财务域', isPlanned: false, features: FEATURES_SEED['开票管理'] ?? [], note: '开票申请/发票冲红/开票工作台' },
    { module: '成本核算', domain: '财务域', isPlanned: false, features: FEATURES_SEED['成本核算'] ?? [], note: '按人员工时成本/差旅与商务独立归集/第三方/动态运营公摊' },
    { module: '运营费用', domain: '财务域', isPlanned: false, features: FEATURES_SEED['运营费用'] ?? [], note: 'A–E 已落地。2026-08-21 grill 收束菜单重构，计划：计划/当前/operating-expense-restyle.md。α UX 优化待编码。' },
    { module: '精益交付', domain: '财务域', isPlanned: false, features: FEATURES_SEED['精益交付'] ?? [], note: 'L1–L4 全部完成。calc.ts 纯函数层 + quoteSeam/contractSeam 接真实数据 + Dashboard/CaseList/CaseDetail 全面改造' },
    { module: '差旅管理', domain: '财务域', isPlanned: false, features: FEATURES_SEED['差旅管理'] ?? [], note: 'T1–T4 全部完成。travelCalc.ts 纯函数 + expenseExits.ts 双出口 + 打卡删除 + 城市分级统一 + 宿舍 mock' },
    { module: '财务视图', domain: '财务域', isPlanned: false, features: FEATURES_SEED['财务视图'] ?? [], note: '财务审批/报表/合同统计/项目成本/回款开票报表' },
    { module: '全期次视图', domain: '财务域', isPlanned: true, features: [], planned: ['一屏查看项目全期次回款与开票'], note: '规划中' },
    // === 获客域（优先级 4）===
    { module: '多渠道线索接入', domain: '获客域', isPlanned: false, features: FEATURES_SEED['多渠道线索接入'] ?? [], note: '线索派发工作台（/lead-dispatch，PRD-线索派发管理 + ADR-0096）：录入/派发/SLA/催办/等级审核/3人3轮质检/Cohort成交率/穿透抽屉/销售侧时效，阶段 0-E 已完成（α 已实现）。β 阶段 2：派发四动作 + 详情复合接口已接服务端（beta-realdata-dev-plan.md）。β 只留企微催办接缝' },
    { module: '线索池与初筛', domain: '获客域', isPlanned: false, features: FEATURES_SEED['线索池与初筛'] ?? [], note: '原始线索容纳/来源标记/去重/清洗分级' },
    { module: '渠道与投放', domain: '获客域', isPlanned: true, features: [], planned: ['渠道台账', '投放预算', '线索成本', '渠道 ROI', '市场活动归因'], note: '规划中' },
    // === 支撑域（优先级 5）===
    { module: '组织与权限', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['组织与权限'] ?? [], note: '用户/部门/职位/角色授权/菜单路由/数据字典' },
    { module: '人资行政', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['人资行政'] ?? [], note: '员工列表/岗位/工资/考勤请假/员工档案' },
    { module: '工作台与审批', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['工作台与审批'] ?? [], note: '工作台/个人中心/消息提醒/待办/审批中心' },
    { module: '人力增强', domain: '支撑域', isPlanned: true, features: [], planned: ['薪酬管理', '员工成本', '社保公积金', '招聘', '培训', '绩效'], note: '规划中' },
    { module: '行政后勤', domain: '支撑域', isPlanned: true, features: [], planned: ['固定资产', '办公物品', '会议室', '行政流程', '物资采购'], note: '规划中' },
    { module: '智能会议', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['智能会议'] ?? [], planned: PLANNED_SEED['智能会议'] ?? [], note: 'α 纪要列表、长流程工作台、TODO 投影与行政会议入口已实现；AI 服务与 β D1 接线仍待 productionOn 许可。' },
    // === 跨域工具（优先级 6）===
    { module: '基础工具', domain: '跨域工具', isPlanned: false, features: FEATURES_SEED['基础工具'] ?? [], note: '登录/权限未做。B5 收口已设计待编码；productionOn 不代开。全局搜索已设计待编码（PRD-全局搜索）' },
    { module: '管理者工具', domain: '跨域工具', isPlanned: true, features: [], planned: ['经营驾驶舱', '全域报表', '组织健康度', '审批总览', '经营预警'], note: '规划中' },
    { module: '开发者工具', domain: '跨域工具', isPlanned: true, features: [], planned: ['代码生成器', '数据迁移工具'], note: '规划中' },
    // === 资源域（优先级 7）===
    { module: '资源台账', domain: '资源域', isPlanned: true, features: [], planned: ['SSL 证书', '域名', '云资源', '大模型 Token', '第三方接口', '应用商店'], note: '规划中' },
    { module: '到期预警与续费', domain: '资源域', isPlanned: true, features: [], planned: ['到期前 30 天提醒', '续费', '额度监控', '扩容'], note: '规划中' },
    { module: '资质与上架档案', domain: '资源域', isPlanned: true, features: [], planned: ['ICP 备案', '小程序备案', 'APP 上架', '软著'], note: '规划中' },
    { module: '机密凭据库', domain: '资源域', isPlanned: true, features: [], planned: ['密钥/Token/证书/账号加密归档'], note: '规划中（最高密级）' },
    { module: '月度巡检', domain: '资源域', isPlanned: true, features: [], planned: ['资源巡检', '异常报告', '零关停保障'], note: '规划中' },
    // === 运维域（优先级 8）===
    { module: '运维工单', domain: '运维域', isPlanned: true, features: [], planned: ['故障上报', '处理流转', 'SLA 响应', '工单记录'], note: '规划中' },
    { module: '版本迭代支持', domain: '运维域', isPlanned: true, features: [], planned: ['迭代需求', '版本管理', '重新提审', '资源配置更新'], note: '规划中' },
    { module: '售后与培训', domain: '运维域', isPlanned: true, features: [], planned: ['客户培训', '操作手册', '运维手册', '满意度调研'], note: '规划中' },
    { module: '项目复盘', domain: '运维域', isPlanned: true, features: [], planned: ['交付复盘', '知识沉淀', '功能复用库', '避坑手册'], note: '规划中' },
  ];

  return {
    modules: ALL_MODULES.map(item => ({
      ...item,
      scope: '',
      features: (FEATURES_SEED[item.module] ?? []).map(feature => ({ ...feature, alpha: { '页面场景': false, '功能流程': false, 'UX 优化': false } })),
      planned: (PLANNED_SEED[item.module] ?? item.planned ?? []).map(name => ({ name, status: '未开始' as const })),
      alpha: { '页面场景': false, '功能流程': false, 'UX 优化': false },
      alphaMeta: { updateCount: 0, lastUpdatedAt: '' },
      beta: item.isPlanned ? { productionOn: false, devStatus: '未开始' as const } : { productionOn: false, devStatus: '未开始' as const },
    })),
  };
}

// ---------- 校验与容错 ----------

function asPlannedStatus(value: unknown): PlannedStatus {
  return PLANNED_STATUSES.includes(value as PlannedStatus) ? value as PlannedStatus : '未开始';
}

function asBetaDevStatus(value: unknown): BetaDevStatus {
  return BETA_DEV_STATUSES.includes(value as BetaDevStatus) ? value as BetaDevStatus : '未开始';
}

function asAlphaChecks(value: unknown): AlphaChecks {
  const raw = (value && typeof value === 'object') ? value as Record<string, unknown> : {};
  return ALPHA_CHECK_KEYS.reduce((checks, key) => {
    checks[key] = raw[key] === true;
    return checks;
  }, {} as AlphaChecks);
}

function asOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asAlphaUpdateMeta(value: unknown): AlphaUpdateMeta {
  const raw = value && typeof value === 'object'
    ? value as { updateCount?: unknown; lastUpdatedAt?: unknown }
    : {};
  const updateCount = typeof raw.updateCount === 'number'
    && Number.isFinite(raw.updateCount)
    && raw.updateCount >= 0
    ? Math.floor(raw.updateCount)
    : 0;
  const lastUpdatedAt = typeof raw.lastUpdatedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastUpdatedAt)
    ? raw.lastUpdatedAt
    : '';
  return { updateCount, lastUpdatedAt };
}

/** 容错解析：字段缺失/非法时回退默认值，单个模块坏行直接丢弃 */
export function normalizeFeatureBoard(value: unknown): FeatureBoard {
  const raw = (value && typeof value === 'object' && Array.isArray((value as FeatureBoard).modules))
    ? (value as FeatureBoard).modules
    : [];
  const modules = raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof (item as { module?: unknown }).module === 'string' && (item as { module: string }).module.trim() !== '')
    .map(item => {
      const seed = createSeedBoard().modules.find(candidate => candidate.module === item.module);
      const features = Array.isArray(item.features)
        ? item.features
            .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof (entry as { name?: unknown }).name === 'string')
            .map(entry => ({
              name: entry.name as string,
              description: asOptionalString(entry.description),
              usage: asOptionalString(entry.usage),
              referencePath: asOptionalString(entry.referencePath),
              alpha: asAlphaChecks(entry.alpha),
            }))
        : [];
      const domain = DOMAINS.includes(item.domain as Domain) ? item.domain as Domain : (seed?.domain ?? '支撑域');
      const isPlanned = item.isPlanned === true;
      return {
        module: item.module as string,
        domain,
        isPlanned,
        scope: typeof item.scope === 'string' ? item.scope : (seed?.scope ?? ''),
        features,
        planned: Array.isArray(item.planned)
          ? item.planned
              .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof (entry as { name?: unknown }).name === 'string')
              .map(entry => ({ name: entry.name as string, status: asPlannedStatus(entry.status) }))
          : [],
        alpha: asAlphaChecks(item.alpha),
        alphaMeta: asAlphaUpdateMeta(item.alphaMeta),
        beta: {
          productionOn: (item.beta as { productionOn?: unknown } | undefined)?.productionOn === true,
          devStatus: asBetaDevStatus((item.beta as { devStatus?: unknown } | undefined)?.devStatus),
        },
        note: typeof item.note === 'string' ? item.note : (seed?.note ?? ''),
      } satisfies FeatureBoardModule;
    });
  return { modules };
}

export function isValidFeatureBoard(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !Array.isArray((value as FeatureBoard).modules)) return false;
  const { modules } = value as FeatureBoard;
  // 空看板视为非法：与 load 的「空则回种子」一致，防止端点把文件清零
  if (!modules.length) return false;
  return modules.every(item =>
    typeof item?.module === 'string' && item.module.trim() !== ''
    && DOMAINS.includes(item?.domain as Domain)
    && typeof item?.scope === 'string'
    && typeof item?.note === 'string'
    && Array.isArray(item?.planned)
    && item.planned.every(entry => typeof entry?.name === 'string' && PLANNED_STATUSES.includes(entry?.status as PlannedStatus))
    && item?.alpha && ALPHA_CHECK_KEYS.every(key => typeof item.alpha[key] === 'boolean')
    && item?.alphaMeta
    && Number.isInteger(item.alphaMeta.updateCount)
    && item.alphaMeta.updateCount >= 0
    && (item.alphaMeta.lastUpdatedAt === '' || /^\d{4}-\d{2}-\d{2}$/.test(item.alphaMeta.lastUpdatedAt))
    && Array.isArray(item.features)
    && item.features.every(feature => typeof feature.name === 'string' && typeof feature.description === 'string' && feature.alpha && ALPHA_CHECK_KEYS.every(key => typeof feature.alpha[key] === 'boolean'))
    && typeof item?.beta?.productionOn === 'boolean'
    && BETA_DEV_STATUSES.includes(item?.beta?.devStatus as BetaDevStatus),
  );
}

// ---------- 存取（dev 端点 -> localStorage 回退） ----------

const FEATURE_BOARD_ENDPOINT = '/api/feature-board';
const FEATURE_BOARD_STORAGE_KEY = 'hubx-feature-board';

function readFromLocalStorage(): FeatureBoard | null {
  try {
    const stored = localStorage.getItem(FEATURE_BOARD_STORAGE_KEY);
    return stored ? normalizeFeatureBoard(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

function writeToLocalStorage(board: FeatureBoard) {
  try {
    localStorage.setItem(FEATURE_BOARD_STORAGE_KEY, JSON.stringify(board));
  } catch {
    // localStorage 不可用时忽略，交互不中断
  }
}

export async function loadFeatureBoard(): Promise<FeatureBoard> {
  try {
    const response = await fetch(FEATURE_BOARD_ENDPOINT);
    if (response.ok) {
      const payload = await response.json() as { board?: unknown };
      if (payload && typeof payload === 'object' && 'board' in payload) {
        const board = normalizeFeatureBoard(payload.board);
        // 文档缺失/被清空时回退种子，避免看板被意外清零
        return board.modules.length ? board : createSeedBoard();
      }
    }
  } catch {
    // 端点不存在（非 α版 dev 环境），走 localStorage 回退
  }
  return readFromLocalStorage() ?? createSeedBoard();
}

export async function saveFeatureBoard(board: FeatureBoard): Promise<void> {
  writeToLocalStorage(board);
  try {
    await fetch(FEATURE_BOARD_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    });
  } catch {
    // 写不进配置文档时状态至少留在 localStorage
  }
}

// ---------- 纯函数（UI 与测试共用） ----------

function mapModule(board: FeatureBoard, module: string, mapper: (item: FeatureBoardModule) => FeatureBoardModule): FeatureBoard {
  return { ...board, modules: board.modules.map(item => item.module === module ? mapper(item) : item) };
}

export function toggleAlphaCheck(board: FeatureBoard, module: string, key: AlphaCheckKey): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, alpha: { ...item.alpha, [key]: !item.alpha[key] } }));
}

export function toggleFeatureAlphaCheck(board: FeatureBoard, module: string, featureName: string, key: AlphaCheckKey): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, features: item.features.map(feature => feature.name === featureName ? { ...feature, alpha: { ...feature.alpha, [key]: !feature.alpha[key] } } : feature) }));
}

export function markAlphaUpdate(board: FeatureBoard, module: string, date: string): FeatureBoard {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return board;
  return mapModule(board, module, item => ({
    ...item,
    alphaMeta: {
      updateCount: Math.max(0, Math.floor(item.alphaMeta?.updateCount ?? 0)) + 1,
      lastUpdatedAt: date,
    },
  }));
}

export function toggleProductionSwitch(board: FeatureBoard, module: string): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, beta: { ...item.beta, productionOn: !item.beta.productionOn } }));
}

export function setBetaDevStatus(board: FeatureBoard, module: string, status: BetaDevStatus): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, beta: { ...item.beta, devStatus: status } }));
}

export function setPlannedStatus(board: FeatureBoard, module: string, name: string, status: PlannedStatus): FeatureBoard {
  return mapModule(board, module, item => ({
    ...item,
    planned: item.planned.map(entry => entry.name === name ? { ...entry, status } : entry),
  }));
}

export function addPlannedItem(board: FeatureBoard, module: string, name: string): FeatureBoard {
  const trimmed = name.trim();
  if (!trimmed) return board;
  return mapModule(board, module, item => (
    item.planned.some(entry => entry.name === trimmed)
      ? item
      : { ...item, planned: [...item.planned, { name: trimmed, status: '未开始' }] }
  ));
}

export function renamePlannedItem(board: FeatureBoard, module: string, name: string, nextName: string): FeatureBoard {
  const trimmed = nextName.trim();
  if (!trimmed) return board;
  return mapModule(board, module, item => ({
    ...item,
    planned: item.planned.map(entry => entry.name === name ? { ...entry, name: trimmed } : entry),
  }));
}

export function removePlannedItem(board: FeatureBoard, module: string, name: string): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, planned: item.planned.filter(entry => entry.name !== name) }));
}

export function setModuleNote(board: FeatureBoard, module: string, note: string): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, note }));
}

export function addModule(board: FeatureBoard, module: string, scope = '', domain: Domain = '支撑域', isPlanned = false): FeatureBoard {
  const trimmed = module.trim();
  if (!trimmed || board.modules.some(item => item.module === trimmed)) return board;
  return {
    ...board,
    modules: [...board.modules, {
      module: trimmed,
      domain,
      isPlanned,
      scope,
      features: [],
      planned: [],
      alpha: { '页面场景': false, '功能流程': false, 'UX 优化': false },
      alphaMeta: { updateCount: 0, lastUpdatedAt: '' },
      beta: { productionOn: false, devStatus: '未开始' },
      note: '',
    }],
  };
}

// ---------- 一次性迁移：旧 alphaChecklist.config.json（字符串数组） -> α勾选 ----------

/** key 形如「模块::检查项」（旧 hubx-alpha-checklist-checked 存储格式） */
export function migrateAlphaChecklist(board: FeatureBoard, checkedKeys: string[]): FeatureBoard {
  const checked = new Set(checkedKeys.filter(item => typeof item === 'string'));
  return {
    ...board,
    modules: board.modules.map(item => {
      const alpha = { ...item.alpha };
      let changed = false;
      for (const key of ALPHA_CHECK_KEYS) {
        if (checked.has(`${item.module}::${key}`) && !alpha[key]) {
          alpha[key] = true;
          changed = true;
        }
      }
      return changed ? { ...item, alpha } : item;
    }),
  };
}
