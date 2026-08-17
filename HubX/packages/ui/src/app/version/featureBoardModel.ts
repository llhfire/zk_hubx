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

/** 已有功能种子数据：基于代码库知识生成（原始需求/功能流程/功能说明） */
const FEATURES_SEED: Record<string, ExistingFeature[]> = {
  // ========== 销售域 ==========
  '线索全流程': [
    { name: '多渠道线索接入', description: '支持官网表单、推广落地页、电话咨询、渠道合作、售前群等多来源线索接入，自动记录来源标记。' },
    { name: '线索池管理', description: '公海线索池→我的线索→已成交→垃圾线索，四池流转；线索认领、分配、回收规则配置。' },
    { name: '线索详情', description: '线索基础信息（公司/联系人/来源/状态）、跟进记录时间线、演示记录、报价 Tab（内嵌报价工作台 Drawer）、合同关联、资料附件管理。' },
    { name: '线索跟进记录', description: '按时间线记录每次跟进（电话/拜访/微信），支持快捷回复模板，下次跟进提醒设置。' },
    { name: '线索治理', description: '重复线索合并（按公司名/联系人手机号去重）、线索状态批量操作、线索分配规则配置、数据质量评分。' },
    { name: '售前群沟通分析', description: '通过 wx CLI 导出企微售前群聊天记录，调用 DeepSeek 做沟通总结（需求/技术/风险/进度/协作维度）。' },
  ],
  '报价工作台': [
    { name: 'Stage1 功能清单', description: '产品经理填写/导入功能清单，默认 18 项/7 模块；支持模块级 hover 新增子功能、Excel 导入导出、版本快照；提交后进入人天评估。' },
    { name: 'Stage2 人天评估', description: '罗总评估各功能各岗位人天；支持方向键+Tab 连续填充相邻格子、按模块/子功能快捷批量按钮；切片组/整模块维度；技术备注、风险列；提交时校验所有岗位人天已填。' },
    { name: 'Stage3 销售报价', description: '7 步向导：基本信息→前端配置→后端配置→其他岗位→出差驻场→其他成本→报价汇总与校验；系统校验∑分项=总人天、∑成本=总报价、付款比例=100%。' },
    { name: 'Stage4 审批盖章', description: '三人并行会签（黄奕/罗总/闵总）→全员通过→待盖章→黄海盖章→已盖章→生成 PDF；任一驳回（意见必填）→退回销售→全员重审。' },
    { name: '报价状态机', description: '草稿→功能清单已确认→人天评估完成→已转派销售→报价已汇总→审批中→待盖章→已盖章→已发出（成交/重新报价/待跟进）；审批中可撤回→草稿；任意可作废→已作废。' },
    { name: '角色切换器', description: '6 角色模拟：产品经理（张产品）、技术负责人（罗总）、销售部负责人（黄奕）、企业决策层（闵总）、董助（黄海）、销售（李销售），各角色看到不同操作权限。' },
    { name: '报价单版本管理', description: '报价单关联线索→合同漏斗，支持版本历史（编辑自动生成新版本），作废功能，报价单列表按状态/创建人筛选。' },
    { name: '上浮比例配置', description: '报价金额区信息与操作顺序：原始金额→上浮信息→最终金额→操作入口，清晰阅读链路。' },
  ],
  '客户与报价基础': [
    { name: '客户档案', description: '客户基础信息（公司名/行业/规模/来源），按行业/规模/来源筛选，客户关联线索与合同列表。' },
    { name: '联系人管理', description: '客户下多联系人，记录职位/电话/邮箱/微信，标记主联系人。' },
    { name: '关系视图', description: '客户→线索→报价→合同→项目的完整关系链路可视化。' },
    { name: '开票信息', description: '客户开票资料（公司名/纳税人识别号/地址/电话/开户行/账号），合同创建时自动带入。' },
  ],
  '合同签约': [
    { name: '合同创建（带入线索）', description: '新建合同自动带入线索基础信息（公司名/联系人/项目描述），减少重复录入。' },
    { name: '合同多版本管理', description: '编辑合同自动生成新版本（v1.0→v2.0...），历史版本只读对比，当前版本可编辑。' },
    { name: '合同审批流', description: '总经理单节点审批（P0① 已收敛），意见留痕；审批通过→释放回款 Tab；灰态展示当前节点、下一节点及处理人。' },
    { name: '合同归档', description: '审批通过后上传归档合同文件（PDF/图片），支持多附件，归档后合同状态锁定。' },
    { name: '补充协议', description: '基于主合同创建补充协议，继承客户信息与审批流（总经理单节点），独立版本管理。' },
    { name: '合同列表', description: '合同集中管理入口，合同编号自动生成（ZK-C-YYYYMMDD-NNN），按状态/客户筛选。' },
  ],
  // ========== 交付域 ==========
  '项目管理': [
    { name: '项目基础信息', description: '项目名称、状态、负责人、起止时间，关联合同与回款，项目编号自动生成。' },
    { name: '项目任务管理', description: 'ProjectTaskPanel：任务拆分、分配、状态跟踪（待开始/处理中/已完成），按成员筛选，任务优先级。' },
    { name: '项目成本核算', description: 'ProjectCostPanel：人工+差旅+其他成本明细，利润率分析，成本明细可展开。' },
    { name: '合同回款视图', description: '项目详情页直接查看关联合同和回款状态（规划中）。' },
    { name: '项目与线索同源', description: '已成交线索→项目详情，上下文连续（规划中）。' },
  ],
  '日报工时': [
    { name: '日报填写', description: '个人日报填写：选择项目/工作种类、填写工时、工作内容描述；工时×时薪自动计算成本（buildRDCostDetails）。' },
    { name: '日报列表', description: '日报汇总列表，按日期/成员/项目筛选，支持导出 Excel。' },
    { name: '日报视图', description: '个人日报查看与编辑，工作归属选择（项目/线索/内部），历史日报回溯。' },
    { name: '项目视图', description: '按项目维度查看团队日报汇总，项目工时统计，成员工时分布。' },
    { name: '日报配置', description: 'JobWorkConfigContext：工作种类配置（开发/设计/测试/管理等）、时薪模板（按职级）、日报规则（按用户角色匹配模板）。' },
    { name: '角色模板', description: 'RoleSelectModal：按角色（销售/行政/投放/开发）选择不同日报模板，各模板显示不同字段。' },
    { name: '跨月跨年日报', description: '日报时间轴支持跨月、跨年查看（规划优化中）。' },
  ],
  '交付支撑': [
    { name: '会议管理', description: 'MeetingManagement：会议记录创建、纪要编辑、参会人管理，按项目/日期筛选。' },
    { name: '知识库', description: '文档存储与检索，按模块分类（技术文档/产品文档/运营文档），支持全文搜索。' },
    { name: '合同交付跟进', description: '合同签订后的交付进度跟踪，里程碑节点管理。' },
    { name: '变更管理', description: '需求变更记录、影响评估、审批流程。' },
    { name: '演示上传', description: '线索详情中的演示记录上传与管理。' },
  ],
  // ========== 财务域 ==========
  '回款管理': [
    { name: '期次拆分', description: '按付款比例模板或手动拆分回款期次（首期款/中期款/尾款），金额联动校验合计=合同总额。' },
    { name: '回款登记', description: '财务录入实际回款信息：金额、回款日期、回款方式（公对公/私对公/微信/支付宝/银行转账）、回款凭证附件、回款说明。' },
    { name: '状态自动计算', description: 'getPaymentPeriodMetrics：回款四态（未回款/部分回款/已回款/已逾期）× 开票三态（未开票/部分开票/已开票）自动计算。' },
    { name: '回款权限矩阵', description: 'P0②：getPeriodActionPermissions 统一状态机，回款四态×开票状态×申请态×拆分角色→拆分/回款/开票/冲红操作权限。' },
    { name: '逾期判断', description: '根据预计回款日期与当前日期对比，自动标记逾期状态（规划中）。' },
  ],
  '开票管理': [
    { name: '开票申请', description: '项目提交开票申请：发票类别（增值税专用/普通）、税率、金额、客户开票信息（自动带入合同），财务审核处理。' },
    { name: '发票冲红', description: '对已开票记录执行冲红：填写冲红原因、上传冲红附件，生成新的待开票记录。' },
    { name: '开票审核工作台', description: 'ProjectInvoicePage：财务处理开票申请列表，Tab 切换（全部/待开票/已开票/已冲红），上传发票附件完成开票。' },
    { name: '开票统计', description: '按项目/客户/时间段汇总开票金额，开票进度追踪。' },
  ],
  '成本核算': [
    { name: '按人员工时成本', description: '员工工时×时薪计算人工成本，按项目/部门汇总，支持按工作性质分组排序。' },
    { name: '差旅商务成本', description: '差旅报销、商务费用、第三方服务费用归集到项目成本。' },
    { name: '运营分摊', description: '公共运营成本按规则分摊到各项目。' },
    { name: '异常检测', description: '成本异常预警（超出预算/工时异常/费用异常）。' },
  ],
  '财务视图': [
    { name: '财务统计面板', description: '收入/支出/利润汇总，按月/季度趋势图表，关键财务指标卡片。' },
    { name: '项目成本报表', description: '项目维度成本明细（人工+差旅+其他），利润率分析，成本明细可展开。' },
    { name: '合同统计', description: '合同金额/回款/开票/待收汇总，按客户/时间段筛选。' },
    { name: '工资表', description: '员工工资计算，工时×时薪汇总，按月生成，支持导出。' },
  ],
  // ========== 获客域 ==========
  '多渠道线索接入': [
    { name: '官网表单接入', description: '官网咨询表单自动转化为线索，记录来源渠道、咨询内容。' },
    { name: '推广落地页', description: '百度/小红书/抖音/淘宝等平台推广落地页线索追踪。' },
    { name: '电话咨询', description: '电话咨询记录转线索，自动关联来电号码与历史跟进。' },
    { name: '渠道合作', description: '合作伙伴渠道线索导入，渠道归属标记。' },
    { name: '售前群', description: '企微售前群线索识别与导入，群沟通记录分析。' },
  ],
  '线索池与初筛': [
    { name: '线索池管理', description: '公海线索池（未分配）、我的线索（已认领）、已成交池、垃圾池，四池统一视图。' },
    { name: '来源标记', description: '线索来源渠道标记（百度/小红书/抖音/淘宝/电话/渠道合作），来源统计分析。' },
    { name: '去重清洗', description: '按公司名/联系人手机号自动去重，重复线索合并保留最新跟进记录。' },
    { name: '清洗分级', description: '线索质量评分（公司规模/需求匹配度/跟进活跃度），自动分级（A/B/C/D）。' },
  ],
  // ========== 支撑域 ==========
  '组织与权限': [
    { name: '组织架构', description: '公司/部门/岗位树形结构管理，支持多级部门嵌套。' },
    { name: '用户管理', description: '用户账号创建、启用/禁用、密码重置，关联组织架构。' },
    { name: '角色授权', description: '角色定义（管理员/销售/财务/项目经理等），角色关联菜单权限+操作权限。' },
    { name: '菜单路由', description: '前端菜单树配置，控制各角色可见菜单项。' },
    { name: '数据字典', description: '系统枚举值管理（回款方式/发票类型/线索来源/项目状态等），全局统一维护。' },
    { name: '逐人权限', description: '特殊场景下对单个用户授予额外权限或限制。' },
  ],
  '人资行政': [
    { name: '员工列表', description: '员工基础信息管理（姓名/部门/职位/入职日期/合同状态），支持搜索筛选。' },
    { name: '岗位管理', description: '岗位定义与职级体系（L1-L10），岗位关联时薪标准。' },
    { name: '工资管理', description: '员工工资计算（基本工资+绩效+补贴-扣款），按月生成工资表。' },
    { name: '调整记录', description: '员工调薪/调岗/晋升记录，历史可追溯。' },
    { name: '人资费用', description: '招聘费用、培训费用、福利费用等人力成本归集。' },
    { name: '考勤请假', description: '考勤记录（打卡/迟到/早退）、请假审批（事假/病假/年假）、加班统计。' },
    { name: '员工档案', description: '员工完整档案（基本信息/合同/考勤/薪资/绩效/培训记录）。' },
  ],
  '工作台与审批': [
    { name: '工作台仪表盘', description: '首页关键指标概览（线索数/合同额/回款额/项目进度），快捷入口，待办提醒。' },
    { name: '个人工作台', description: '个人任务清单、能力面板、日程安排、近期跟进。' },
    { name: '审批中心', description: '统一审批入口：待办/已办/我发起的，审批意见填写，支持通过/驳回/转办。' },
    { name: '审批模板', description: '审批流程模板管理，配置审批节点与处理人（串行/并行/会签）。' },
    { name: '待办中心', description: '统一待办聚合（审批/日报催报/系统提醒/跟进提醒），支持完成/忽略/延期操作。' },
    { name: '消息提醒', description: 'ReminderBell：顶栏提醒入口，未读消息计数 Badge；站内信+短信通知双通道。' },
    { name: '数据看板', description: '管理者数据看板：销售业绩/项目进度/财务概览/人效分析。' },
  ],
  // ========== 跨域工具 ==========
  '基础工具': [
    { name: '企业微信集成', description: 'WeComIntegration：通讯录同步（组织架构/人员）、消息推送（审批通知/日报催报）、群聊导出（wx CLI）。' },
    { name: '操作日志', description: '系统操作日志记录（谁/何时/做了什么/影响了哪些数据），支持按操作类型/用户/时间筛选。' },
    { name: '权限拦截', description: '路由级+接口级权限校验，未授权访问自动跳转无权限页面。' },
    { name: '工天配置', description: '工作日历配置（工作日/节假日/加班规则），影响日报和考勤计算。' },
    { name: '登录认证', description: '用户登录/登出，会话管理，自动续期。' },
    { name: '数据报表', description: '销售报表、业绩统计、渠道 ROI、全链路 ROI 图表展示。' },
    { name: '全链路 ROI', description: '广告消耗→线索数量/成本→客户转化率→合同金额→项目利润，按渠道拆分 ROI。' },
  ],
};

/** 规划模块的待设计功能（对齐 ZK-HubX架构图.html 的规划模块 module-items） */
const PLANNED_SEED: Record<string, string[]> = {
  // 销售域规划
  '跟进助手': ['自动提醒（跟进到期/客户生日/合同续签）', '跟进待办生成与分配', '阶段推进智能建议（基于历史转化率）'],
  '报价与合规增强': ['Excel 双向导入导出', '版本 Diff 对比（两版报价单差异高亮）', '代理/转交机制（请假/离职时转交报价单）', '电子签章（PDF 盖章+防篡改）', '合规档案（报价/合同合规检查清单）'],
  // 交付域规划
  '工时加工': ['工时审批（主管审批工时记录）', '工时统计与分析（按项目/人员/部门）', '加班工时计算与补偿'],
  '交付过程': ['里程碑管理（关键节点定义与追踪）', '验收流程（客户验收确认+签字）', '需求变更管控（变更申请→影响评估→审批→执行）'],
  // 财务域规划
  '全期次视图': ['一屏查看项目全期次回款与开票状态', '期次进度条+逾期预警', '批量开票/批量回款操作'],
  // 获客域规划
  '渠道与投放': ['渠道台账（各渠道基础信息与合作状态）', '投放预算管理（预算分配/执行/结余）', '线索成本核算（按渠道计算单线索获取成本）', '渠道 ROI 分析（各渠道投入产出对比）', '市场活动归因（活动→线索→转化链路追踪）'],
  // 支撑域规划
  '人力增强': ['薪酬管理（薪资结构/调薪记录/社保公积金）', '员工成本核算（人力成本分摊到项目）', '招聘管理（职位发布/简历筛选/面试安排）', '培训管理（培训计划/执行/考核）', '绩效管理（KPI 设定/评估/反馈）'],
  '行政后勤': ['固定资产登记与折旧', '办公物品领用与库存', '会议室预约与管理', '行政流程（用章/用车/出差审批）', '物资采购（供应商管理/采购申请/入库）'],
  // 跨域工具规划
  '管理者工具': ['经营驾驶舱（核心指标实时监控）', '全域报表（跨模块数据聚合分析）', '组织健康度（人效/流失率/满意度）', '审批总览（全公司审批效率统计）', '经营预警（财务/项目/人力异常自动告警）'],
  '开发者工具': ['代码生成器（根据数据模型自动生成 CRUD 页面）', '数据迁移工具（旧系统数据导入/格式转换）'],
  // 资源域规划
  '资源台账': ['SSL 证书管理（到期监控/自动续费）', '域名管理（注册/续费/解析配置）', '云资源管理（服务器/数据库/存储实例清单）', '大模型 Token 管理（用量监控/预算控制）', '第三方接口管理（API Key/调用量/费用）', '应用商店（内部工具分发与版本管理）'],
  '到期预警与续费': ['到期前 30 天自动提醒（邮件+站内信）', '续费流程（申请→审批→付款→更新台账）', '额度监控（资源用量接近上限预警）', '扩容管理（需求评估→审批→执行→记录）'],
  '资质与上架档案': ['ICP 备案管理（备案号/到期/变更）', '小程序备案（微信/支付宝小程序备案状态）', 'APP 上架管理（应用商店审核状态/版本更新）', '软著登记（软件著作权申请与证书管理）'],
  '机密凭据库': ['密钥管理（API Key/Secret 加密存储）', 'Token 管理（Access Token/Refresh Token）', '证书管理（SSL/代码签名证书）', '账号管理（第三方平台账号密码加密归档）', '访问审计（谁在何时查看/使用了什么凭据）'],
  '月度巡检': ['资源巡检（自动检测各资源运行状态）', '异常报告（巡检结果自动生成报告）', '零关停保障（关键资源冗余配置检查）'],
  // 运维域规划
  '运维工单': ['故障上报（用户提交故障/问题工单）', '处理流转（工单分配→处理→验证→关闭）', 'SLA 响应（按优先级定义响应时限）', '工单记录（历史工单查询/统计分析）'],
  '版本迭代支持': ['迭代需求收集（产品/客户/内部需求池）', '版本管理（版本号/发布日期/变更日志）', '重新提审（版本回退后重新提交审核）', '资源配置更新（版本更新后资源台账同步）'],
  '售后与培训': ['客户培训（产品使用培训计划与执行）', '操作手册（产品操作手册在线查阅）', '运维手册（系统运维标准操作流程）', '满意度调研（客户满意度问卷+分析）'],
  '项目复盘': ['交付复盘（项目结束后团队复盘会议记录）', '知识沉淀（复盘结论转化为标准流程/模板）', '功能复用库（已验证的功能模块/组件可复用清单）', '避坑手册（项目中遇到的问题与解决方案汇总）'],
};

export function createSeedBoard(): FeatureBoard {
  // 架构图全部 36 模块（17 现有 + 19 规划），按领域优先级排列
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
    { module: '成本核算', domain: '财务域', isPlanned: false, features: FEATURES_SEED['成本核算'] ?? [], note: '按人员工时成本/差旅商务第三方/运营分摊' },
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
