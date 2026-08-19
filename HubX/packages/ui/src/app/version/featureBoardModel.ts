// 功能看板（Feature Board）：用户与 Claude Code 共享的开发协作状态板。
// 唯一事实源 = 仓库内配置文档 featureBoard.config.json（术语见 HubX/CONTEXT.md §功能看板）：
// - α版 dev server（apps/prototype 的 feature-board-store 插件）提供 GET/PUT /api/feature-board 直接读写该文档；
// - 无端点的环境（静态部署 / apps/web）回退 localStorage；
// - 文档缺失时用 versionMatrix.ts 的种子清单初始化。
// Claude Code 行为约定见 HubX/CLAUDE.md §功能看板。

// ---------- 类型 ----------

/** 功能条目状态：功能列表（要做的事）的推进阶段，由 Claude 自主判断维护 */
export const PLANNED_STATUSES = ['未开始', '已调研', '设计中', '已设计'] as const;
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
  /** 详细说明：原始需求描述 + 功能流程 + 功能说明（点击弹出） */
  description: string;
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
  beta: BetaState;
  /** 动态备注：当前特殊说明与状态说明 */
  note: string;
}

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
  '全期次视图': '财务域',
  // 支撑域
  '组织与权限': '支撑域',
  '人资行政': '支撑域',
  '工作台与审批': '支撑域',
  '人力增强': '支撑域',
  '行政后勤': '支撑域',
  // 跨域工具
  '基础工具': '跨域工具',
  '管理者工具': '跨域工具',
  '开发者工具': '跨域工具',
};

/** 已有功能种子数据：仅包含代码中有实际实现的功能（2026-08-18 核查） */
const FEATURES_SEED: Record<string, ExistingFeature[]> = {
  // ========== 销售域 ==========
  '线索全流程': [
    { name: '四池流转', description: 'LeadList（公海/我的/已成交/垃圾）：线索状态自动流转（领取/分配/成交/回收），来源标记。' },
    { name: '线索详情', description: 'LeadDetail：基础信息、跟进记录时间线、报价 Tab（内嵌报价工作台 Drawer）、合同关联、资料附件。' },
    { name: '线索跟进记录', description: '按时间线记录每次跟进（电话/拜访/微信），支持快捷回复模板。' },
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
  ],
  '客户与报价基础': [
    { name: '客户列表', description: 'Customers.tsx：客户基础信息管理，按行业/规模/来源筛选。' },
    { name: '客户详情', description: 'CustomerDetail.tsx：客户基本信息、关联线索/合同列表、联系人管理。' },
  ],
  '合同签约': [
    { name: '合同创建（带入线索）', description: 'ContractWizard.tsx：新建合同自动带入线索基础信息。' },
    { name: '合同多版本管理', description: 'ContractEditor.tsx：编辑自动生成新版本，历史版本只读对比。' },
    { name: '合同审批流', description: '总经理单节点审批（P0① 已收敛），意见留痕，审批通过→释放回款 Tab。' },
    { name: '合同归档', description: 'archiveFinalContract：审批通过后上传归档文件，支持多附件。' },
    { name: '补充协议（将废弃）', description: '现网合同详情填变更金额。目标改为补充报价→补充合同。' },
    { name: '已确认生成主合同', description: '已确认后向导预填生成主合同；合同作废后可再生成。' },
    { name: '合同列表', description: 'ContractKanban.tsx：合同看板视图，编号自动生成（ZK-C-YYYYMMDD-NNN）。' },
    { name: '合同付款看板', description: 'PaymentKanban.tsx / PaymentKanbanV2.tsx：回款期次可视化看板。' },
  ],
  // ========== 交付域 ==========
  '项目管理': [
    { name: '项目基础信息', description: 'ProjectDetailWorkspace.tsx：名称/状态/负责人/时间，关联合同与回款。' },
    { name: '项目任务管理', description: 'ProjectTaskPanel.tsx：任务拆分/分配/状态跟踪，按成员筛选。' },
    { name: '项目成本核算', description: 'ProjectCostPanel.tsx / ProjectCostPage.tsx：人工+差旅+其他成本，利润率分析。' },
    { name: '项目报价配置', description: 'ProjectQuotationConfigurator.tsx：项目与报价关联配置。' },
    { name: '项目质量面板', description: 'ProjectQualityPanel.tsx：项目质量指标跟踪。' },
  ],
  '日报工时': [
    { name: '日报填写', description: 'DailyReportModal.tsx：选择项目/工作种类，填写工时，工时×时薪自动计算成本。' },
    { name: '日报列表', description: 'DailyReportList：按日期/成员/项目筛选，支持导出。' },
    { name: '日报视图', description: 'DailyReportView：个人日报查看与编辑，工作归属选择。' },
    { name: '项目视图', description: 'ProjectLogView：按项目维度查看团队日报汇总。' },
    { name: '日报配置', description: 'JobWorkConfigPage.tsx：工作种类/时薪模板/日报规则配置。' },
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
    { name: '回款登记', description: '财务录入实际回款：金额/日期/方式/凭证/说明。' },
    { name: '状态自动计算', description: 'paymentInvoiceModel.ts getPaymentPeriodMetrics：回款四态×开票三态自动计算。' },
    { name: '回款权限矩阵', description: 'getPeriodActionPermissions（P0② WIP）：统一状态机控制操作权限。' },
  ],
  '开票管理': [
    { name: '开票申请', description: 'LeadPaymentInvoicePanel.tsx：提交开票申请（发票类别/税率/金额/客户信息）。' },
    { name: '发票冲红', description: '填写冲红原因+附件，生成新的待开票记录。' },
    { name: '开票审核工作台', description: 'ProjectInvoicePage.tsx：Tab 切换（全部/待开票/已开票/已冲红），上传附件完成开票。' },
  ],
  '成本核算': [
    { name: '按人员工时成本', description: 'ProjectCostPanel.tsx：工时×时薪计算人工成本，按项目/部门汇总。' },
    { name: '差旅商务成本', description: '差旅报销、商务费用归集到项目成本。' },
  ],
  '运营费用': [
    { name: '人资费用卡片墙（待替换）', description: 'HrExpenseManagement.tsx：10 类扁平费用，改金额选生效时间。将被运营费用四 Tab 替换。' },
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
    { name: '数据字典', description: '系统枚举值管理（回款方式/发票类型/线索来源等）。' },
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
    { name: '侧栏打开架构图', description: '点击左侧产品名/Logo 弹窗打开仓库根目录 ZK-HubX架构图.html。' },
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
  '线索全流程': ['签约后综合视图（销售在线索详情看项目执行）', '签约开启时生成未确认项目', '线索侧合同/回款入口（草稿即可引用）', '管理员退回线索（未确认或未开始无合同）'],
  '合同签约': ['已确认生成主合同（词表收口）', '多份补充报价/补充合同列表', '需求变更闭环（补充报价→补充合同）', '废弃补充协议对象'],
  '项目管理': ['未确认项目与管理员指派产品经理', '产品经理默认列表隐藏未确认/未指派', '售前历程交接包（跟进/会议/演示/资料只读）', '管理员退回线索 / 改指产品经理', '主合同作废则进行中项目搁置'],
  // 交付域
  '日报工时': ['跨月跨年日报（时间轴优化）'],
  '交付支撑': ['合同交付跟进（里程碑节点管理）', '变更管理（需求变更记录/影响评估/审批）', '演示上传（线索详情中的演示记录管理）'],
  // 财务域
  '回款管理': ['逾期判断（预计回款日期对比，自动标记逾期）'],
  '开票管理': ['开票统计（按项目/客户/时间段汇总）'],
  '成本核算': ['运营分摊（读取公共运营池，按全公司在职编制工时）', '异常检测（成本异常预警：超出预算/工时异常/费用异常）'],
  '运营费用': ['费用大盘（6个月滚动+工资平移）', '费用台账（确认即入账、作废不删）', '周期模板（固定即入账/浮动待确认）', '公摊参数（池÷全公司在职编制工时）'],
  '财务视图': ['合同统计（合同金额/回款/开票/待收汇总）'],
  // 获客域
  '线索池与初筛': ['去重清洗（按公司名/联系人手机号自动去重）', '清洗分级（线索质量评分，自动分级 A/B/C/D）'],
  // 支撑域
  '组织与权限': ['菜单路由（前端菜单树配置）', '逐人权限（特殊场景额外授权）'],
  '人资行政': ['工资管理（基本工资+绩效+补贴-扣款）', '调整记录（调薪/调岗/晋升历史）', '员工档案（完整档案：合同/考勤/薪资/绩效）'],
  '工作台与审批': ['审批模板（串行/并行/会签节点配置）', '报价审批与补充报价审批两条业务类型', '数据看板（管理者：销售业绩/项目进度/财务概览）'],
  // 跨域工具
  '基础工具': ['操作日志（谁/何时/做了什么）', '权限拦截（路由级+接口级权限校验）', '工天配置（大小周日历/法定节假日/调休）', '登录认证（登录/登出/会话管理）', '全链路 ROI（广告消耗→线索→客户→合同→利润，按渠道拆分）'],

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
    { module: '线索全流程', domain: '销售域', isPlanned: false, features: FEATURES_SEED['线索全流程'] ?? [], note: '认领/分配/跟进/流转/生命周期/公海回收/需求记录/竞对/阶段推进' },
    { module: '报价工作台', domain: '销售域', isPlanned: false, features: FEATURES_SEED['报价工作台'] ?? [], note: 'β版报价单落 D1，含状态迁移校验；已上线 http+D1' },
    { module: '客户与报价基础', domain: '销售域', isPlanned: false, features: FEATURES_SEED['客户与报价基础'] ?? [], note: '客户档案/联系人/关系视图/开票信息' },
    { module: '合同签约', domain: '销售域', isPlanned: false, features: FEATURES_SEED['合同签约'] ?? [], note: 'mock/http 共享 contractMutations；已上线 http+D1' },
    { module: '跟进助手', domain: '销售域', isPlanned: true, features: [], planned: ['自动提醒', '跟进待办', '阶段建议'], note: '规划中' },
    { module: '报价与合规增强', domain: '销售域', isPlanned: true, features: [], planned: ['Excel 双向导入导出', '版本 Diff 对比', '代理/转交机制', '电子签章', '合规档案'], note: '规划中' },
    // === 交付域（优先级 2）===
    { module: '项目管理', domain: '交付域', isPlanned: false, features: FEATURES_SEED['项目管理'] ?? [], note: 'service 接缝待抽' },
    { module: '日报工时', domain: '交付域', isPlanned: false, features: FEATURES_SEED['日报工时'] ?? [], note: '工时×时薪成本计算' },
    { module: '交付支撑', domain: '交付域', isPlanned: false, features: FEATURES_SEED['交付支撑'] ?? [], note: '合同交付跟进/变更管理/进度跟踪/知识库/会议纪要' },
    { module: '工时加工', domain: '交付域', isPlanned: true, features: [], planned: ['工时审批', '统计与分析', '加班工时'], note: '规划中' },
    { module: '交付过程', domain: '交付域', isPlanned: true, features: [], planned: ['里程碑', '验收流程', '需求变更管控'], note: '规划中' },
    // === 财务域（优先级 3）===
    { module: '回款管理', domain: '财务域', isPlanned: false, features: FEATURES_SEED['回款管理'] ?? [], note: '期次拆分/回款登记/状态自动计算/权限矩阵（WIP）' },
    { module: '开票管理', domain: '财务域', isPlanned: false, features: FEATURES_SEED['开票管理'] ?? [], note: '开票申请/发票冲红/开票工作台' },
    { module: '成本核算', domain: '财务域', isPlanned: false, features: FEATURES_SEED['成本核算'] ?? [], note: '按人员工时成本/差旅商务第三方/运营分摊读池' },
    { module: '运营费用', domain: '财务域', isPlanned: false, features: FEATURES_SEED['运营费用'] ?? [], note: '替换 /hr/expenses。阶段 A 计划已展开，未写代码' },
    { module: '财务视图', domain: '财务域', isPlanned: false, features: FEATURES_SEED['财务视图'] ?? [], note: '财务审批/报表/合同统计/项目成本/回款开票报表' },
    { module: '全期次视图', domain: '财务域', isPlanned: true, features: [], planned: ['一屏查看项目全期次回款与开票'], note: '规划中' },
    // === 获客域（优先级 4）===
    { module: '多渠道线索接入', domain: '获客域', isPlanned: false, features: FEATURES_SEED['多渠道线索接入'] ?? [], note: '官网表单/推广落地页/电话咨询/渠道合作/售前群' },
    { module: '线索池与初筛', domain: '获客域', isPlanned: false, features: FEATURES_SEED['线索池与初筛'] ?? [], note: '原始线索容纳/来源标记/去重/清洗分级' },
    { module: '渠道与投放', domain: '获客域', isPlanned: true, features: [], planned: ['渠道台账', '投放预算', '线索成本', '渠道 ROI', '市场活动归因'], note: '规划中' },
    // === 支撑域（优先级 5）===
    { module: '组织与权限', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['组织与权限'] ?? [], note: '用户/部门/职位/角色授权/菜单路由/数据字典' },
    { module: '人资行政', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['人资行政'] ?? [], note: '员工列表/岗位/工资/考勤请假/员工档案' },
    { module: '工作台与审批', domain: '支撑域', isPlanned: false, features: FEATURES_SEED['工作台与审批'] ?? [], note: '工作台/个人中心/消息提醒/待办/审批中心' },
    { module: '人力增强', domain: '支撑域', isPlanned: true, features: [], planned: ['薪酬管理', '员工成本', '社保公积金', '招聘', '培训', '绩效'], note: '规划中' },
    { module: '行政后勤', domain: '支撑域', isPlanned: true, features: [], planned: ['固定资产', '办公物品', '会议室', '行政流程', '物资采购'], note: '规划中' },
    // === 跨域工具（优先级 6）===
    { module: '基础工具', domain: '跨域工具', isPlanned: false, features: FEATURES_SEED['基础工具'] ?? [], note: '登录/操作日志/权限拦截/工天配置/企微集成' },
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
      features: FEATURES_SEED[item.module] ?? [],
      planned: (PLANNED_SEED[item.module] ?? item.planned ?? []).map(name => ({ name, status: '未开始' as const })),
      alpha: { '页面场景': false, '功能流程': false, 'UX 优化': false },
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
              description: typeof entry.description === 'string' ? entry.description : '',
            }))
        : (seed?.features ?? []);
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
  return { modules: board.modules.map(item => item.module === module ? mapper(item) : item) };
}

export function toggleAlphaCheck(board: FeatureBoard, module: string, key: AlphaCheckKey): FeatureBoard {
  return mapModule(board, module, item => ({ ...item, alpha: { ...item.alpha, [key]: !item.alpha[key] } }));
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
    modules: [...board.modules, {
      module: trimmed,
      domain,
      isPlanned,
      scope,
      features: [],
      planned: [],
      alpha: { '页面场景': false, '功能流程': false, 'UX 优化': false },
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
