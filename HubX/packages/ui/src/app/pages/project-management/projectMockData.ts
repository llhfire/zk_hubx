// ============================================================
// 项目管理模块 — 列表页 Mock 数据
// 2026-08-25：追加6个真实未交付项目（id: 10-15）
// ============================================================

import type {
  ProjectListItem,
  ProjectMetrics,
  ActivityEvent,
  ProjectBlocker,
} from './types';

// --- 项目列表 Mock ---
export const PROJECT_LIST: ProjectListItem[] = [
  // ── 原有演示项目（id: 1-8） ──
  {
    key: '1', id: '1', projectNo: 'PRJ202605001', name: 'A公司CRM系统开发',
    status: '进行中', priority: '高', businessLine: '外包', entity: '中科软艺',
    owner: '李四', salesUsers: ['张三'], progress: 65,
    startDate: '2026-05-01', expectedEndDate: '2026-08-30',
    latestProgress: '完成项目管理底座需求梳理，进入原型确认阶段。',
    remark: '客户重点关注销售跟进、客户管理和项目成本统计。',
    createdAt: '2026-05-01 09:30',
    leadId: 'lead-1', contractId: '1', customerName: 'A公司',
    totalHours: 468, budgetHours: 600,
    bugP0Count: 0, bugP1Count: 1,
    daysRemaining: 12, isOverdue: false, healthStatus: 'warning',
    contractAmount: 205000, receivedAmount: 123000,
  },
  {
    key: '2', id: '2', projectNo: 'PRJ202605002', name: 'B公司小程序定制开发',
    status: '验收中', priority: '中', businessLine: '外包', entity: '软艺信息',
    owner: '王五', salesUsers: ['李四'], progress: 90,
    startDate: '2026-04-15', expectedEndDate: '2026-08-25',
    latestProgress: '客户已确认首页和订单流程，等待 UI 终稿。',
    remark: '客户对交付时间要求严格。',
    createdAt: '2026-04-15 10:00',
    leadId: 'lead-2', contractId: '2', customerName: 'B公司',
    totalHours: 320, budgetHours: 350,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 5, isOverdue: false, healthStatus: 'normal',
    contractAmount: 120000, receivedAmount: 84000,
  },
  {
    key: '3', id: '3', projectNo: 'PRJ202606001', name: '华信科技内部OA流程优化',
    status: '进行中', priority: '高', businessLine: '外包', entity: '中科软艺',
    owner: '李四', salesUsers: ['张三'], progress: 58,
    startDate: '2026-06-18', expectedEndDate: '2026-10-30',
    latestProgress: '客户已确认核心审批流程与原型，当前进行一期功能开发和接口联调。',
    remark: '为华信科技有限公司建设内部 OA 流程优化系统，覆盖审批、合同、项目协同和日报管理等核心场景。',
    createdAt: '2026-06-10 10:10',
    leadId: 'lead-9', contractId: '9', customerName: '华信科技',
    totalHours: 210, budgetHours: 500,
    bugP0Count: 1, bugP1Count: 2,
    daysRemaining: 61, isOverdue: false, healthStatus: 'danger',
    contractAmount: 960000, receivedAmount: 288000,
  },
  {
    key: '4', id: '4', projectNo: 'PRJ202604001', name: 'D公司电商后台重构',
    status: '未确认', priority: '中', businessLine: '外包', entity: '武汉软艺',
    owner: '', salesUsers: ['李四'], progress: 0,
    startDate: '', expectedEndDate: '',
    latestProgress: '合同已审批通过，等待指派项目经理。',
    remark: '',
    createdAt: '2026-08-18 09:00',
    contractId: '4', customerName: 'D公司',
    totalHours: 0, budgetHours: 400,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 0, isOverdue: false, healthStatus: 'normal',
    contractAmount: 180000, receivedAmount: 0,
  },
  {
    key: '5', id: '5', projectNo: 'PRJ202603001', name: 'E平台数据分析看板',
    status: '催款中', priority: '低', businessLine: '自研', entity: '中科网联',
    owner: '孙七', salesUsers: ['张三'], progress: 100,
    startDate: '2026-03-10', expectedEndDate: '2026-07-20',
    latestProgress: '终验单已签署，等待尾款到账。',
    remark: '尾款预计8月底到账。',
    createdAt: '2026-03-10 11:00',
    contractId: '5', customerName: 'E平台',
    totalHours: 580, budgetHours: 600,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -31, isOverdue: true, healthStatus: 'normal',
    contractAmount: 280000, receivedAmount: 224000,
  },
  {
    key: '6', id: '6', projectNo: 'PRJ202607001', name: 'F公司官网改版',
    status: '搁置', priority: '低', businessLine: '外包', entity: '中科软盈',
    owner: '周八', salesUsers: ['钱九'], progress: 30,
    startDate: '2026-07-01', expectedEndDate: '2026-09-30',
    latestProgress: '客户要求暂停，等待进一步沟通。',
    remark: '客户内部预算调整，项目暂缓。',
    createdAt: '2026-07-01 09:00',
    leadId: 'lead-6', contractId: '6', customerName: 'F公司',
    totalHours: 85, budgetHours: 200,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 41, isOverdue: false, healthStatus: 'normal',
    contractAmount: 60000, receivedAmount: 18000,
  },
  {
    key: '7', id: '7', projectNo: 'PRJ202602001', name: 'G公司APP开发',
    status: '已完成', priority: '高', businessLine: '外包', entity: '中科软艺',
    owner: '李四', salesUsers: ['张三'], progress: 100,
    startDate: '2026-02-01', expectedEndDate: '2026-06-30',
    latestProgress: '项目已结项，进入6个月质保期。',
    remark: '',
    createdAt: '2026-02-01 10:00',
    leadId: 'lead-7', contractId: '7', customerName: 'G公司',
    totalHours: 720, budgetHours: 700,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -51, isOverdue: false, healthStatus: 'normal',
    contractAmount: 420000, receivedAmount: 420000,
  },
  {
    key: '8', id: '8', projectNo: 'PRJ202608001', name: 'H教育平台二期',
    status: '延迟', priority: '高', businessLine: '自研', entity: '中科网联',
    owner: '赵六', salesUsers: [], progress: 55,
    startDate: '2026-05-15', expectedEndDate: '2026-08-15',
    latestProgress: '因技术方案调整，预计延期2周交付。',
    remark: '核心算法需要重新选型。',
    createdAt: '2026-05-15 14:00',
    leadId: 'lead-8', contractId: '8', customerName: 'H教育',
    totalHours: 380, budgetHours: 500,
    bugP0Count: 0, bugP1Count: 3,
    daysRemaining: -5, isOverdue: true, healthStatus: 'danger',
    contractAmount: 0, receivedAmount: 0,
  },

  // ── 真实未交付项目（id: 10-15，来源：0825进度汇报） ──

  // 1. 智能家居 — 逾期130天
  {
    key: '10', id: '10', projectNo: 'PRJ202602010', name: '智能家居系统',
    status: '延迟', priority: '高', businessLine: '外包', entity: '中科软齐',
    owner: '王进', salesUsers: ['严总'], progress: 85,
    startDate: '2026-02-09', expectedEndDate: '2026-04-10',
    latestProgress: '客户本周搭建验收环境，预计本周末完成。开发已将当前所需设备和功能对接完成，流程已走通，等待验收。',
    remark: '因甲方资料不全、设计反馈不及时，交付时间顺延。逾期130天。',
    createdAt: '2026-02-09 10:00',
    contractId: '10', customerName: '智能家居客户',
    totalHours: 520, budgetHours: 600,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -130, isOverdue: true, healthStatus: 'danger',
    contractAmount: 88000, receivedAmount: 52800,
    riskLevel: 'medium',
    riskNote: '客户现场调试环境未搭建完成，预计本周末搭建完成',
    blockers: [
      {
        id: 'blk-10-1', projectId: '10',
        title: '客户验收环境未搭建（设备已发货，预计周四到货后安装）',
        source: 'customer', severity: 'critical',
        customerEta: '2026-08-28',
        expectedResolveDate: '2026-08-30',
        owner: '客户', resolved: false, createdAt: '2026-08-25',
      },
    ],
    acceptanceCriteria: [
      '设备和功能对接完成，流程走通',
      '客户现场调试环境搭建完成',
      '网络接入系统正常运行',
    ],
  },

  // 2. 智能酒店一期 — 逾期80天
  {
    key: '11', id: '11', projectNo: 'PRJ202604011', name: '智能酒店一期',
    status: '延迟', priority: '高', businessLine: '外包', entity: '中科软齐',
    owner: '王进', salesUsers: ['严总'], progress: 75,
    startDate: '2026-04-20', expectedEndDate: '2026-06-04',
    latestProgress: '严总决定先不对接瑞彩酒店华盛系统，再找一个大点的系统对接。已对接绿云酒店系统，PMS对接不着急。',
    remark: '因甲方资料不全、设计反馈不及时，交付时间顺延。逾期80天。',
    createdAt: '2026-04-20 10:00',
    contractId: '11', customerName: '智能酒店客户',
    totalHours: 380, budgetHours: 450,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -80, isOverdue: true, healthStatus: 'danger',
    contractAmount: 80000, receivedAmount: 48000,
    riskLevel: 'low',
    riskNote: '等智能家居确认完推动验收；PMS对接不着急',
    blockers: [
      {
        id: 'blk-11-1', projectId: '11',
        title: '第二套PMS系统未提供（严总说再找一个大点的系统）',
        source: 'customer', severity: 'major',
        owner: '严总', resolved: false, createdAt: '2026-08-25',
      },
      {
        id: 'blk-11-2', projectId: '11',
        title: '等智能家居项目验收完成后推动本项目验收',
        source: 'internal', severity: 'minor',
        owner: '王进', resolved: false, createdAt: '2026-08-25',
      },
    ],
    acceptanceCriteria: ['PMS系统对接完成（至少2套）', '客户验收通过'],
  },

  // 3. 中铁信息化安全平台 — 即将逾期
  {
    key: '12', id: '12', projectNo: 'PRJ202606012', name: '中铁信息化安全平台',
    status: '验收中', priority: '高', businessLine: '外包', entity: '中科软齐',
    owner: '王进', salesUsers: [], progress: 90,
    startDate: '2026-06-03', expectedEndDate: '2026-08-02',
    latestProgress: '今天同王进一起研究打卡机的迁移流程，并形成文档，明天跟客户确认打卡机转移事项。',
    remark: '项目周期60个自然日+运行2周后15个工作日结尾款，截止8月30日。即将逾期。',
    createdAt: '2026-06-03 10:00',
    contractId: '12', customerName: '中铁客户',
    totalHours: 480, budgetHours: 500,
    bugP0Count: 0, bugP1Count: 1,
    daysRemaining: -23, isOverdue: true, healthStatus: 'warning',
    contractAmount: 23000, receivedAmount: 20700,
    riskLevel: 'medium',
    riskNote: '客户对验收不着急，每天在工地比较忙，主要由我们催着客户验收',
    blockers: [
      {
        id: 'blk-12-1', projectId: '12',
        title: '客户对验收不着急，每天在工地比较忙',
        source: 'customer', severity: 'major',
        owner: '王进', resolved: false, createdAt: '2026-08-25',
      },
      {
        id: 'blk-12-2', projectId: '12',
        title: '打卡设备迁移：需在不影响已有人员打卡的情况下完成迁移',
        source: 'customer', severity: 'critical',
        expectedResolveDate: '2026-08-27',
        owner: '王进', resolved: false, createdAt: '2026-08-25',
      },
      {
        id: 'blk-12-3', projectId: '12',
        title: '20路摄像头视频存储到阿里云OSS，存储量太大',
        source: 'third_party', severity: 'major',
        owner: '王进', resolved: false, createdAt: '2026-08-25',
      },
    ],
    acceptanceCriteria: [
      '打卡设备迁移完成，不影响已有人员打卡',
      '20路摄像头视频存储方案确认',
      '客户签署验收单',
    ],
  },

  // 4. 小红书插件 — 高风险
  {
    key: '13', id: '13', projectNo: 'PRJ202608013', name: '小红书插件',
    status: '进行中', priority: '高', businessLine: '外包', entity: '中科软齐',
    owner: '牛一', salesUsers: [], progress: 40,
    startDate: '2026-08-13', expectedEndDate: '2026-09-12',
    latestProgress: '牛一确认这周会提供一个版本供客户试用。',
    remark: '客户反馈9月10日一定要出来，9月15号要拿去卖。合同签订后拿到账号才知道具体要做的事情，有一定风险。',
    createdAt: '2026-08-13 10:00',
    contractId: '13', customerName: '小红书插件客户',
    totalHours: 80, budgetHours: 200,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 19, isOverdue: false, healthStatus: 'warning',
    contractAmount: 20000, receivedAmount: 10000,
    riskLevel: 'high',
    riskNote: '牛一确认肯定有风险，合同签订后拿到账号才知道具体要做的事情',
    blockers: [
      {
        id: 'blk-13-1', projectId: '13',
        title: '9月10日前必须交付，9月15日客户要拿去卖',
        source: 'customer', severity: 'critical',
        customerEta: '2026-09-10',
        owner: '牛一', resolved: false, createdAt: '2026-08-25',
      },
    ],
    acceptanceCriteria: ['功能完整可用', '9月10日前交付客户试用版本'],
  },

  // 5. 汽车配件索赔 — 验收中
  {
    key: '14', id: '14', projectNo: 'PRJ202607014', name: '汽车配件索赔系统',
    status: '验收中', priority: '中', businessLine: '外包', entity: '中科软齐',
    owner: '刘小敏', salesUsers: ['吴丹丹'], progress: 95,
    startDate: '2026-07-30', expectedEndDate: '2026-09-03',
    latestProgress: '刘小敏完成测试文档修改，同步信息给到销售吴丹丹。吴丹丹将在线地址发给客户，让客户进行体验并测试。',
    remark: '项目周期25个工作日，截止9月05日。',
    createdAt: '2026-07-30 10:00',
    contractId: '14', customerName: '汽车配件客户',
    totalHours: 160, budgetHours: 180,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 11, isOverdue: false, healthStatus: 'normal',
    contractAmount: 18000, receivedAmount: 9000,
    riskLevel: 'none',
    acceptanceCriteria: ['客户体验测试通过', '测试文档确认无误'],
  },

  // 6. 重庆B端一期 — 催款中
  {
    key: '15', id: '15', projectNo: 'PRJ202606015', name: '重庆B端一期',
    status: '催款中', priority: '中', businessLine: '外包', entity: '中科软齐',
    owner: '黄奕', salesUsers: ['黄奕'], progress: 100,
    startDate: '2026-06-01', expectedEndDate: '2026-08-15',
    latestProgress: '黄奕正在催收回款。新增功能预计本周完成。',
    remark: '',
    createdAt: '2026-06-01 10:00',
    contractId: '15', customerName: '重庆B端客户',
    totalHours: 300, budgetHours: 320,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -10, isOverdue: true, healthStatus: 'warning',
    contractAmount: 50000, receivedAmount: 25000,
    riskLevel: 'none',
  },
];

// --- 指标 Mock ---
export const PROJECT_METRICS: ProjectMetrics = {
  activeCount: PROJECT_LIST.filter((p) => p.status !== '已完成').length,
  activeByLine: {
    '外包': PROJECT_LIST.filter((p) => p.businessLine === '外包' && p.status !== '已完成').length,
    '自研': PROJECT_LIST.filter((p) => p.businessLine === '自研' && p.status !== '已完成').length,
    '自运营': PROJECT_LIST.filter((p) => p.businessLine === '自运营' && p.status !== '已完成').length,
  },
  warningCount: PROJECT_LIST.filter((p) => p.healthStatus === 'danger' || p.healthStatus === 'warning').length,
  pendingConfirmCount: PROJECT_LIST.filter((p) => p.status === '未确认').length,
  monthlyHours: 842,
};

// --- Activity Stream Mock ---
export const ACTIVITY_EVENTS: ActivityEvent[] = [
  // ── 原有演示项目事件（id: 1, 3, 4） ──
  { id: 'act-1', projectId: '1', type: 'followup', title: '电话跟进', content: '与客户确认原型细节，反馈整体方向正确，局部交互需优化。', operator: '李四', createdAt: '2026-08-20 10:37', isPreSale: false },
  { id: 'act-2', projectId: '1', type: 'milestone', title: '里程碑达成', content: '项目管理底座开发完成，进入原型确认阶段。', operator: '系统', createdAt: '2026-08-19 16:00' },
  { id: 'act-3', projectId: '1', type: 'daily_report', title: '工时日报', content: '王五 前端开发 8h：完成项目列表页复合列+双向冻结。', operator: '王五', createdAt: '2026-08-19 18:00' },
  { id: 'act-4', projectId: '1', type: 'status_change', title: '状态变更', content: '项目状态从「未开始」变更为「进行中」。', operator: '李四', createdAt: '2026-08-15 09:00' },
  { id: 'act-5', projectId: '1', type: 'contract', title: '合同签署', content: '主合同 ZKRY202605010001 已签署，标的额 ¥205,000。', operator: '张三', createdAt: '2026-05-01 10:00', isPreSale: true },
  { id: 'act-6', projectId: '1', type: 'followup', title: '需求确认', content: '客户确认CRM系统核心功能清单，包含销售跟进、客户管理、报价流程。', operator: '张三', createdAt: '2026-04-28 14:00', isPreSale: true },
  { id: 'act-7', projectId: '1', type: 'confirmation', title: '需求确认书签署', content: '客户签署需求确认书V1.0。', operator: '李四', createdAt: '2026-04-25 16:00', isPreSale: true },
  { id: 'act-8', projectId: '3', type: 'followup', title: '联调进展', content: '审批流模块与主流程联调完成80%，剩余异常分支处理。', operator: '赵六', createdAt: '2026-08-20 09:00' },
  { id: 'act-9', projectId: '3', type: 'daily_report', title: '工时日报', content: '赵六 后端开发 7h：审批流异常分支处理。', operator: '赵六', createdAt: '2026-08-19 18:00' },
  { id: 'act-10', projectId: '4', type: 'status_change', title: '项目生成', content: '合同审批通过，自动生成项目记录，等待指派PM。', operator: '系统', createdAt: '2026-08-18 09:00' },

  // ── 真实未交付项目事件（id: 10-15） ──

  // 智能家居
  { id: 'act-10-1', projectId: '10', type: 'followup', title: '客户电话确认搭建进度', content: '下午同客户电话确认搭建进度，客户反馈今天设备已发货，预计周四能到货，安装好了就叫我们技术过去搭建网络、接入系统。', operator: '王进', createdAt: '2026-08-25 15:00' },
  { id: 'act-10-2', projectId: '10', type: 'followup', title: '提供操作文档', content: '提供商城操作文档和硬件接入文档给客户。', operator: '王进', createdAt: '2026-08-24 10:00' },
  { id: 'act-10-3', projectId: '10', type: 'followup', title: 'UI修改确认', content: '已发送2个UI修改给客户确认，客户反馈差点意思。跟客户电话确认UI修改放到验收以后再说。', operator: '王进', createdAt: '2026-08-24 14:00' },
  { id: 'act-10-4', projectId: '10', type: 'followup', title: '客户现场沟通', content: '上午去了客户办公室，详细聊了交付验收过程。客户准备在家里搭建调试环境，欠缺开关灯，预计一周完成。', operator: '王进', createdAt: '2026-08-20 11:00' },
  { id: 'act-10-5', projectId: '10', type: 'contract', title: '合同签订', content: '智能家居系统开发合同签订，¥88,000，四期回款。', operator: '严总', createdAt: '2026-02-09 10:00', isPreSale: true },

  // 智能酒店一期
  { id: 'act-11-1', projectId: '11', type: 'followup', title: 'PMS对接决策', content: '跟严总电话沟通，严总说先不对接瑞彩酒店华盛系统，再找一个大点的系统对接。已对接绿云，不着急。', operator: '王进', createdAt: '2026-08-25 18:20' },
  { id: 'act-11-2', projectId: '11', type: 'followup', title: '华盛系统技术沟通', content: '客户提供随州瑞彩酒店华盛系统对接群，技术沟通中。涉及系统升级和开发费用，对方需跟领导确认。', operator: '王进', createdAt: '2026-08-21 10:00' },
  { id: 'act-11-3', projectId: '11', type: 'contract', title: '合同签订', content: '智能酒店一期合同签订，¥80,000，三期回款。', operator: '严总', createdAt: '2026-04-20 10:00', isPreSale: true },

  // 中铁信息化安全平台
  { id: 'act-12-1', projectId: '12', type: 'followup', title: '打卡机迁移方案', content: '同王进一起研究打卡机迁移流程，形成文档，明天跟客户确认打卡机转移事项。', operator: '王进', createdAt: '2026-08-25 17:00' },
  { id: 'act-12-2', projectId: '12', type: 'contract', title: '合同签订', content: '中铁信息化安全平台合同签订，¥23,000，三期回款。', operator: '王进', createdAt: '2026-06-03 10:00', isPreSale: true },

  // 小红书插件
  { id: 'act-13-1', projectId: '13', type: 'followup', title: '交付计划确认', content: '牛一确认这周会提供一个版本供客户试用。', operator: '牛一', createdAt: '2026-08-25 10:00' },
  { id: 'act-13-2', projectId: '13', type: 'followup', title: '风险评估', content: '牛一确认肯定有风险，合同签订后拿到账号才知道具体要做的事情。', operator: '张三', createdAt: '2026-08-24 14:00' },
  { id: 'act-13-3', projectId: '13', type: 'contract', title: '合同签订', content: '小红书插件合同签订，¥20,000，两期回款。', operator: '张三', createdAt: '2026-08-13 10:00', isPreSale: true },

  // 汽车配件索赔
  { id: 'act-14-1', projectId: '14', type: 'followup', title: '客户测试', content: '吴丹丹将在线地址发给客户，让客户体验并测试。', operator: '吴丹丹', createdAt: '2026-08-25 10:00' },
  { id: 'act-14-2', projectId: '14', type: 'followup', title: '测试文档修改', content: '刘小敏完成测试文档修改，同步给销售吴丹丹。', operator: '刘小敏', createdAt: '2026-08-25 09:00' },
  { id: 'act-14-3', projectId: '14', type: 'milestone', title: '开发完成', content: '刘小敏完成开发，地址提供给销售吴丹丹、周欢。', operator: '刘小敏', createdAt: '2026-08-24 18:00' },
  { id: 'act-14-4', projectId: '14', type: 'contract', title: '合同签订', content: '汽车配件索赔合同签订，¥18,000，三期回款。', operator: '吴丹丹', createdAt: '2026-07-30 10:00', isPreSale: true },

  // 重庆B端一期
  { id: 'act-15-1', projectId: '15', type: 'followup', title: '催收回款', content: '黄奕正在催收回款。', operator: '黄奕', createdAt: '2026-08-25 10:00' },
  { id: 'act-15-2', projectId: '15', type: 'followup', title: '新增功能开发', content: '新增功能预计本周完成。', operator: '黄奕', createdAt: '2026-08-25 10:00' },
];

/** 按项目ID获取活动事件 */
export function getActivitiesByProjectId(projectId: string): ActivityEvent[] {
  return ACTIVITY_EVENTS.filter((a) => a.projectId === projectId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// --- 详情域台账 Mock（会议纪要 / 确认书 / 演示环境） ---
import type {
  ProjectMeetingMinutes,
  ProjectConfirmation,
  ProjectDemoEnv,
} from './types';

export const PROJECT_MEETINGS: ProjectMeetingMinutes[] = [
  {
    id: 'pm-1-1', projectId: '1', subject: 'CRM 需求范围确认会', meetingTime: '2026-05-06 14:00',
    employeeAttendees: ['李四', '张三'],
    externalAttendees: ['A公司 刘经理'],
    minutes: '确认 CRM 一期范围：销售跟进、客户管理、报价流程与商机看板；成本统计模块放到二期。',
    recorder: '李四',
  },
  {
    id: 'pm-1-2', projectId: '1', subject: '原型评审会', meetingTime: '2026-05-20 10:00',
    employeeAttendees: ['李四', '孙七', '王五'],
    externalAttendees: ['A公司 刘经理'],
    minutes: '客户确认整体原型方向，销售跟进时间轴与商机看板交互需微调，一周内提交修改稿。',
    recorder: '李四',
  },
  {
    id: 'pm-3-1', projectId: '3', subject: 'OA 流程调研访谈', meetingTime: '2026-07-15 16:00',
    employeeAttendees: ['李四'],
    externalAttendees: ['华信科技 周经理', '华信科技 行政部'],
    minutes: '盘点审批、合同、项目协同与日报管理的现状流程与字段，确认一期覆盖范围及与组织架构、SSO 的对接方式。',
    recorder: '李四',
  },
  {
    id: 'pm-3-2', projectId: '3', subject: '一期开发联调对齐会', meetingTime: '2026-08-12 11:00',
    employeeAttendees: ['李四', '王五', '赵六'],
    externalAttendees: [],
    minutes: '对齐审批流与合同归档接口联调节奏，SSO 联调时间待客户运维确认，风险已同步售前。',
    recorder: '王五',
  },
  // 真实项目会议
  {
    id: 'pm-12-1', projectId: '12', subject: '打卡机迁移方案讨论', meetingTime: '2026-08-25 14:00',
    employeeAttendees: ['王进'],
    externalAttendees: [],
    minutes: '研究打卡机迁移流程，形成文档，明天跟客户确认打卡机转移事项。',
    recorder: '王进',
  },
];

export const PROJECT_CONFIRMATIONS: ProjectConfirmation[] = [
  { id: 'pc-1-1', projectId: '1', type: '需求确认书', status: '已签署', signer: '刘经理', signDate: '2026-05-08', attachment: 'A公司CRM需求确认书V1.pdf' },
  { id: 'pc-1-2', projectId: '1', type: '原型确认书', status: '已签署', signer: '刘经理', signDate: '2026-05-24', attachment: 'A公司CRM原型确认书.pdf' },
  { id: 'pc-2-1', projectId: '2', type: '需求确认书', status: '已签署', signer: '陈总', signDate: '2026-04-20', attachment: 'B公司小程序需求确认书.pdf' },
  { id: 'pc-3-1', projectId: '3', type: '需求确认书', status: '已签署', signer: '周经理', signDate: '2026-07-02', attachment: '华信科技OA需求确认书V1.pdf' },
  { id: 'pc-3-2', projectId: '3', type: '原型确认书', status: '已签署', signer: '周经理', signDate: '2026-07-28', attachment: '华信科技OA原型确认稿.pdf' },
  { id: 'pc-3-3', projectId: '3', type: '阶段验收单', status: '待签署', signer: '', signDate: '', attachment: '' },
];

export const PROJECT_DEMO_ENVS: ProjectDemoEnv[] = [
  { id: 'de-1-1', projectId: '1', env: '测试环境', url: 'https://test-crm-a.example.com', description: '内部联调用' },
  { id: 'de-1-2', projectId: '1', env: '预发布环境', url: 'https://staging-crm-a.example.com', description: '客户验收用' },
  { id: 'de-2-1', projectId: '2', env: '测试环境', url: 'https://test-mp-b.example.com', description: '小程序体验版 + 后台' },
  { id: 'de-3-1', projectId: '3', env: '测试环境', url: 'https://test-oa-huaxin.example.com', description: '审批流一期联调' },
  // 真实项目环境
  { id: 'de-14-1', projectId: '14', env: '测试环境', url: 'https://test-claims.example.com', description: '汽车配件索赔系统在线测试地址' },
];

/** 按项目 ID 读取详情域台账 */
export function getMeetingsByProjectId(projectId: string) {
  return PROJECT_MEETINGS.filter((m) => m.projectId === projectId)
    .sort((a, b) => (a.meetingTime < b.meetingTime ? 1 : -1));
}

export function getConfirmationsByProjectId(projectId: string) {
  return PROJECT_CONFIRMATIONS.filter((c) => c.projectId === projectId);
}

export function getDemoEnvsByProjectId(projectId: string) {
  return PROJECT_DEMO_ENVS.filter((d) => d.projectId === projectId);
}
