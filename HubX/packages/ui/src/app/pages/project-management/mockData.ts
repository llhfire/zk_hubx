export type ProjectPriority = '高' | '中' | '低';
export type ProjectStatus = '未确认' | '未开始' | '进行中' | '已完成' | '验收中' | '搁置' | '延迟' | '催款中';
export type BusinessLine = '外包' | '自研' | '自运营';

export interface ProjectAttachment {
  id: string;
  name: string;
  size: string;
}

export interface Project {
  id: string;
  projectNo: string;
  name: string;
  latestProgress: string;
  priority: ProjectPriority;
  entity: string;
  status: ProjectStatus;
  businessLine: BusinessLine;
  salesUsers: string[];
  owner: string;
  assistants: string[];
  productUsers: string[];
  uiUsers: string[];
  frontendUsers: string[];
  backendUsers: string[];
  opsUsers: string[];
  testUsers: string[];
  legalUsers: string[];
  progress: number;
  startDate: string;
  expectedEndDate: string;
  remark: string;
  attachments: ProjectAttachment[];
  leadId?: string;
  contractId?: string;
  createdAt: string;
}

export interface ProjectFollowUp {
  id: string;
  projectId: string;
  status: ProjectStatus;
  progress: number;
  content: string;
  attachments: ProjectAttachment[];
  operator: string;
  createdAt: string;
}

export interface ProjectLeadRelation {
  id: string;
  projectId: string;
  leadNo: string;
  leadName: string;
  owner: string;
  preSaleGroupName: string;
  customerCategory: string;
  source: string;
  customerName: string;
  phone: string;
  wechat: string;
  leadCreatedAt: string;
}

export interface ProjectDailyReport {
  id: string;
  projectId: string;
  date: string;
  projectName: string;
  personName: string;
  position: string;
  hours: number;
  workNature?: string;
  workContent: string;
  riskFeedback: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  onlineUrl: string;
  owner: string;
  uploadedFileName: string;
  description: string;
  createdAt: string;
}

export interface ProjectMemberHours {
  key: string;
  personName: string;
  position: string;
  hours: number;
}

export const projectPriorities: ProjectPriority[] = ['高', '中', '低'];
export const projectStatuses: ProjectStatus[] = ['未确认', '未开始', '进行中', '已完成', '验收中', '搁置', '延迟', '催款中'];
export const businessLines: BusinessLine[] = ['外包', '自研', '自运营'];

export const companyEntities = ['中科软艺', '软艺信息', '巴蜀文攻'];
export const employees = ['张三', '李四', '王五', '赵六', '孙七', '周八', '钱九'];
export const roleEmployees = {
  sales: ['张三', '李四', '钱九'],
  product: ['李四', '孙七'],
  ui: ['孙七', '周八'],
  frontend: ['王五', '钱九'],
  backend: ['赵六', '周八'],
  ops: ['周八', '王五'],
  test: ['钱九', '赵六'],
  legal: ['张三'],
};

export const initialProjects: Project[] = [
  {
    id: '1',
    projectNo: 'PRJ202605001',
    name: 'A公司CRM系统开发',
    latestProgress: '完成项目管理底座需求梳理，进入原型确认阶段。',
    priority: '高',
    entity: '中科软艺',
    status: '进行中',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '李四',
    assistants: ['王五'],
    productUsers: ['李四'],
    uiUsers: ['孙七'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    opsUsers: ['周八'],
    testUsers: ['钱九'],
    legalUsers: ['张三'],
    progress: 65,
    startDate: '2026-05-01',
    expectedEndDate: '2026-06-30',
    remark: '客户重点关注销售跟进、客户管理和项目成本统计。',
    attachments: [{ id: 'att-1', name: '项目需求初稿.pdf', size: '1.2MB' }],
    contractId: '4',
    createdAt: '2026-05-01 09:30',
  },
  {
    id: '2',
    projectNo: 'PRJ202605002',
    name: 'B公司小程序定制开发',
    latestProgress: '客户已确认首页和订单流程，等待 UI 终稿。',
    priority: '中',
    entity: '软艺信息',
    status: '验收中',
    businessLine: '外包',
    salesUsers: ['李四'],
    owner: '王五',
    assistants: ['赵六'],
    productUsers: ['孙七'],
    uiUsers: ['周八'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    opsUsers: ['王五'],
    testUsers: ['钱九'],
    legalUsers: [],
    progress: 90,
    startDate: '2026-04-10',
    expectedEndDate: '2026-05-20',
    remark: '验收阶段重点跟进客户反馈。',
    attachments: [],
    contractId: '2',
    createdAt: '2026-04-10 10:00',
  },
  {
    id: '3',
    projectNo: 'PRJ202605003',
    name: '内部OA流程优化',
    latestProgress: '客户已确认核心审批流程与原型，当前进行一期功能开发和接口联调。',
    priority: '高',
    entity: '中科软艺',
    status: '进行中',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '李四',
    assistants: ['孙七'],
    productUsers: ['李四'],
    uiUsers: ['孙七'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    opsUsers: ['周八'],
    testUsers: ['钱九'],
    legalUsers: [],
    progress: 58,
    startDate: '2026-06-18',
    expectedEndDate: '2026-10-30',
    remark: '为华信科技有限公司建设内部 OA 流程优化系统，覆盖审批、合同、项目协同和日报管理等核心场景。',
    attachments: [
      { id: 'att-3-1', name: '华信科技OA流程优化需求说明.pdf', size: '1.8MB' },
      { id: 'att-3-2', name: 'OA流程原型确认稿.pdf', size: '2.4MB' },
      { id: 'att-3-3', name: '接口对接清单.xlsx', size: '426KB' },
    ],
    leadId: 'lead-9',
    createdAt: '2026-06-10 10:10',
  },
  {
    id: '4',
    projectNo: 'PRJ202608004',
    name: '星河数据合同洽谈（待确认）',
    latestProgress: '线索已进入合同洽谈，等待管理员确认并指派产品经理。',
    priority: '高',
    entity: '中科软艺',
    status: '未确认',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '',
    assistants: [],
    productUsers: [],
    uiUsers: [],
    frontendUsers: [],
    backendUsers: [],
    opsUsers: [],
    testUsers: [],
    legalUsers: [],
    progress: 0,
    startDate: '',
    expectedEndDate: '',
    remark: '由线索签约自动生成，尚未确认。',
    attachments: [],
    leadId: 'LS001',
    createdAt: '2026-08-18 09:00',
  },
  {
    id: '5',
    projectNo: 'PRJ202608005',
    name: '青橙零售报价已确认（未开工）',
    latestProgress: '管理员已指派产品经理，等待主合同审批通过后启动交付。',
    priority: '中',
    entity: '中科软艺',
    status: '未开始',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '李四',
    assistants: [],
    productUsers: ['李四'],
    uiUsers: [],
    frontendUsers: [],
    backendUsers: [],
    opsUsers: [],
    testUsers: [],
    legalUsers: [],
    progress: 0,
    startDate: '2026-08-20',
    expectedEndDate: '2026-12-31',
    remark: '已确认指派，交付未启动。',
    attachments: [],
    leadId: 'LS002',
    createdAt: '2026-08-17 14:00',
  },
];

export const availableLeads: ProjectLeadRelation[] = [
  {
    id: 'lead-1',
    projectId: '',
    leadNo: 'LD202605001',
    leadName: 'A公司CRM系统开发需求',
    owner: '张三',
    preSaleGroupName: 'A公司售前沟通群',
    customerCategory: '企业客户',
    source: '百度推广',
    customerName: '刘经理',
    phone: '13800138000',
    wechat: 'liujingli-a',
    leadCreatedAt: '2026-04-28 10:30',
  },
  {
    id: 'lead-2',
    projectId: '',
    leadNo: 'LD202605002',
    leadName: 'B公司小程序开发咨询',
    owner: '李四',
    preSaleGroupName: 'B公司项目群',
    customerCategory: '中小企业',
    source: '小红书',
    customerName: '陈总',
    phone: '13900139000',
    wechat: 'chen-b',
    leadCreatedAt: '2026-04-09 14:20',
  },
  {
    id: 'lead-3',
    projectId: '',
    leadNo: 'LD202605003',
    leadName: '内部流程系统升级',
    owner: '钱九',
    preSaleGroupName: '内部需求群',
    customerCategory: '内部需求',
    source: '内部转化',
    customerName: '行政部',
    phone: '027-88888888',
    wechat: 'oa-admin',
    leadCreatedAt: '2026-05-06 09:10',
  },
  {
    id: 'lead-9',
    projectId: '',
    leadNo: 'LD202606009',
    leadName: '华信科技内部OA流程优化需求',
    owner: '张三',
    preSaleGroupName: '华信科技 OA 项目群',
    customerCategory: '企业客户',
    source: '客户转介绍',
    customerName: '周经理',
    phone: '13800009999',
    wechat: 'huaxin-zhou',
    leadCreatedAt: '2026-06-05 14:20',
  },
];

export const initialLeadRelations: ProjectLeadRelation[] = [
  { ...availableLeads[0], id: 'relation-1', projectId: '1' },
  { ...availableLeads[1], id: 'relation-2', projectId: '2' },
  { ...availableLeads[3], id: 'relation-3', projectId: '3' },
];

export const initialDailyReports: ProjectDailyReport[] = [
  {
    id: 'daily-1',
    projectId: '1',
    date: '2026-05-08',
    projectName: 'A公司CRM系统开发',
    personName: '李四',
    position: '产品经理',
    hours: 6,
    workContent: '整理项目管理底座字段和详情页结构。',
    riskFeedback: '客户希望后续能看到成本汇总，需要提前预留入口。',
  },
  {
    id: 'daily-2',
    projectId: '1',
    date: '2026-05-08',
    projectName: 'A公司CRM系统开发',
    personName: '王五',
    position: '前端开发工程师',
    hours: 7.5,
    workContent: '评估现有项目页面和日报页面联动方式。',
    riskFeedback: '无',
  },
  {
    id: 'daily-3',
    projectId: '1',
    date: '2026-05-09',
    projectName: 'A公司CRM系统开发',
    personName: '赵六',
    position: '后端开发工程师',
    hours: 5,
    workContent: '梳理后续项目成本接口字段。',
    riskFeedback: '人工成本设置需要财务权限控制。',
  },
  {
    id: 'daily-10', projectId: '1', date: '2026-05-09', projectName: 'A公司CRM系统开发', personName: '李四', position: '产品经理', hours: 7,
    workContent: '完成客户、商机和跟进记录模块的需求拆解与验收标准整理。', riskFeedback: '客户分级规则待销售负责人确认。',
  },
  {
    id: 'daily-11', projectId: '1', date: '2026-05-10', projectName: 'A公司CRM系统开发', personName: '王五', position: '前端开发工程师', hours: 8,
    workContent: '完成客户列表、高级筛选及客户详情页面开发。', riskFeedback: '无',
  },
  {
    id: 'daily-12', projectId: '1', date: '2026-05-11', projectName: 'A公司CRM系统开发', personName: '赵六', position: '后端开发工程师', hours: 8.5,
    workContent: '完成客户档案、联系人及跟进记录接口开发。', riskFeedback: '历史客户数据存在重复手机号。',
  },
  {
    id: 'daily-13', projectId: '1', date: '2026-05-12', projectName: 'A公司CRM系统开发', personName: '孙七', position: 'UI设计师', hours: 6.5,
    workContent: '输出CRM首页、客户详情和商机看板高保真设计稿。', riskFeedback: '客户品牌标准色需进一步确认。',
  },
  {
    id: 'daily-14', projectId: '1', date: '2026-05-13', projectName: 'A公司CRM系统开发', personName: '钱九', position: '测试工程师', hours: 7,
    workContent: '编写客户管理和商机转化测试用例，完成第一轮功能测试。', riskFeedback: '导入超过万条客户数据时响应较慢。',
  },
  {
    id: 'daily-15', projectId: '1', date: '2026-05-14', projectName: 'A公司CRM系统开发', personName: '周八', position: '实施工程师', hours: 5.5,
    workContent: '整理历史客户导入模板，完成测试环境基础数据配置。', riskFeedback: '客户原始数据字段命名不统一。',
  },
  {
    id: 'daily-16', projectId: '1', date: '2026-05-15', projectName: 'A公司CRM系统开发', personName: '王五', position: '前端开发工程师', hours: 7,
    workContent: '完成商机阶段看板、拖拽流转和销售数据统计图表。', riskFeedback: '移动端看板需补充适配。',
  },
  {
    id: 'daily-17', projectId: '1', date: '2026-05-16', projectName: 'A公司CRM系统开发', personName: '赵六', position: '后端开发工程师', hours: 7.5,
    workContent: '完成商机阶段流转、销售漏斗统计及数据权限接口。', riskFeedback: '组织架构权限继承规则待确认。',
  },
  {
    id: 'daily-18', projectId: '1', date: '2026-05-17', projectName: 'A公司CRM系统开发', personName: '李四', position: '产品经理', hours: 4.5,
    workContent: '组织阶段评审，跟进客户反馈并更新二期优化清单。', riskFeedback: '客户提出新增微信会话归档需求。',
  },
  {
    id: 'daily-19', projectId: '1', date: '2026-05-18', projectName: 'A公司CRM系统开发', personName: '钱九', position: '测试工程师', hours: 8,
    workContent: '完成商机看板、数据权限和客户导入的回归测试。', riskFeedback: '已记录 3 个中优先级缺陷。',
  },
  {
    id: 'daily-20', projectId: '1', date: '2026-05-19', projectName: 'A公司CRM系统开发', personName: '孙七', position: 'UI设计师', hours: 5,
    workContent: '补充移动端商机看板和客户详情的响应式设计标注。', riskFeedback: '无',
  },
  {
    id: 'daily-21', projectId: '1', date: '2026-05-20', projectName: 'A公司CRM系统开发', personName: '周八', position: '实施工程师', hours: 7.5,
    workContent: '完成客户历史数据清洗和首批数据迁移验证。', riskFeedback: '少量客户地址数据缺失。',
  },
  {
    id: 'daily-22', projectId: '1', date: '2026-06-02', projectName: 'A公司CRM系统开发', personName: '李四', position: '产品经理', hours: 7.5,
    workContent: '梳理二期销售目标、回款计划和客户分层需求，更新迭代范围。', riskFeedback: '客户分层的自动调整规则待确认。',
  },
  {
    id: 'daily-23', projectId: '1', date: '2026-06-03', projectName: 'A公司CRM系统开发', personName: '王五', position: '前端开发工程师', hours: 8,
    workContent: '完成销售目标看板、回款进度组件和客户分层标识开发。', riskFeedback: '图表在小屏设备上的信息密度较高。',
  },
  {
    id: 'daily-24', projectId: '1', date: '2026-06-03', projectName: 'A公司CRM系统开发', personName: '赵六', position: '后端开发工程师', hours: 8,
    workContent: '开发销售目标、回款计划及客户分层规则接口。', riskFeedback: '历史回款数据需要补充合同编号。',
  },
  {
    id: 'daily-25', projectId: '1', date: '2026-06-04', projectName: 'A公司CRM系统开发', personName: '孙七', position: 'UI设计师', hours: 6,
    workContent: '完善销售目标看板和回款详情页面视觉规范与交互标注。', riskFeedback: '暂无。',
  },
  {
    id: 'daily-26', projectId: '1', date: '2026-06-05', projectName: 'A公司CRM系统开发', personName: '钱九', position: '测试工程师', hours: 7.5,
    workContent: '完成销售目标、回款计划和客户分层模块首轮功能测试。', riskFeedback: '发现两处跨月统计口径不一致。',
  },
  {
    id: 'daily-27', projectId: '1', date: '2026-06-06', projectName: 'A公司CRM系统开发', personName: '周八', position: '实施工程师', hours: 6.5,
    workContent: '核对第二批历史客户数据，整理字段映射和异常数据清单。', riskFeedback: '部分客户缺少统一社会信用代码。',
  },
  {
    id: 'daily-28', projectId: '1', date: '2026-06-09', projectName: 'A公司CRM系统开发', personName: '李四', position: '产品经理', hours: 6.5,
    workContent: '组织二期功能评审，确认销售预测和客户公海回收规则。', riskFeedback: '销售预测口径需与财务报表统一。',
  },
  {
    id: 'daily-29', projectId: '1', date: '2026-06-10', projectName: 'A公司CRM系统开发', personName: '王五', position: '前端开发工程师', hours: 7.5,
    workContent: '完成客户公海回收配置、销售预测列表和详情交互。', riskFeedback: '无。',
  },
  {
    id: 'daily-30', projectId: '1', date: '2026-06-10', projectName: 'A公司CRM系统开发', personName: '赵六', position: '后端开发工程师', hours: 8.5,
    workContent: '完成公海回收定时任务和销售预测聚合查询接口。', riskFeedback: '大数据量聚合查询需继续优化。',
  },
  {
    id: 'daily-31', projectId: '1', date: '2026-06-11', projectName: 'A公司CRM系统开发', personName: '孙七', position: 'UI设计师', hours: 5.5,
    workContent: '补充公海规则配置和销售预测移动端适配设计。', riskFeedback: '暂无。',
  },
  {
    id: 'daily-32', projectId: '1', date: '2026-06-12', projectName: 'A公司CRM系统开发', personName: '钱九', position: '测试工程师', hours: 8,
    workContent: '执行公海回收、销售预测及数据权限专项测试。', riskFeedback: '公海回收通知存在一分钟延迟。',
  },
  {
    id: 'daily-33', projectId: '1', date: '2026-06-13', projectName: 'A公司CRM系统开发', personName: '周八', position: '实施工程师', hours: 7,
    workContent: '完成第二批客户与联系人数据导入，核验销售归属关系。', riskFeedback: '三条离职销售数据需重新分配。',
  },
  {
    id: 'daily-34', projectId: '1', date: '2026-06-16', projectName: 'A公司CRM系统开发', personName: '李四', position: '产品经理', hours: 7,
    workContent: '汇总试运行反馈，确认验收范围并输出上线检查清单。', riskFeedback: '客户希望验收前补充一份操作手册。',
  },
  {
    id: 'daily-35', projectId: '1', date: '2026-06-17', projectName: 'A公司CRM系统开发', personName: '王五', position: '前端开发工程师', hours: 8,
    workContent: '修复试运行反馈问题，优化列表加载状态和表单校验提示。', riskFeedback: '无。',
  },
  {
    id: 'daily-36', projectId: '1', date: '2026-06-17', projectName: 'A公司CRM系统开发', personName: '赵六', position: '后端开发工程师', hours: 7.5,
    workContent: '处理试运行数据问题，补充接口审计日志和异常告警。', riskFeedback: '生产环境告警接收人待运维确认。',
  },
  {
    id: 'daily-37', projectId: '1', date: '2026-06-18', projectName: 'A公司CRM系统开发', personName: '孙七', position: 'UI设计师', hours: 4.5,
    workContent: '完成上线版本页面走查，统一空状态和异常提示样式。', riskFeedback: '暂无。',
  },
  {
    id: 'daily-38', projectId: '1', date: '2026-06-19', projectName: 'A公司CRM系统开发', personName: '钱九', position: '测试工程师', hours: 8,
    workContent: '完成上线前全量回归、权限矩阵验证和核心流程验收测试。', riskFeedback: '剩余一个低优先级样式问题。',
  },
  {
    id: 'daily-39', projectId: '1', date: '2026-06-20', projectName: 'A公司CRM系统开发', personName: '周八', position: '实施工程师', hours: 6,
    workContent: '编制用户操作手册，完成管理员培训和上线数据确认。', riskFeedback: '客户培训参会名单待最终确认。',
  },
  {
    id: 'daily-4',
    projectId: '2',
    date: '2026-05-08',
    projectName: 'B公司小程序定制开发',
    personName: '王五',
    position: '前端开发工程师',
    hours: 4,
    workContent: '修复验收反馈中的订单页面样式问题。',
    riskFeedback: '客户新增两个展示字段。',
  },
  {
    id: 'daily-5',
    projectId: '3',
    date: '2026-07-16',
    projectName: '内部OA流程优化',
    personName: '李四',
    position: '产品经理',
    hours: 6.5,
    workContent: '与客户确认审批、合同、项目协同三个核心模块的业务规则与验收范围。',
    riskFeedback: '客户新增了跨部门会签场景，需在一期范围内明确处理方式。',
  },
  {
    id: 'daily-6',
    projectId: '3',
    date: '2026-07-17',
    projectName: '内部OA流程优化',
    personName: '孙七',
    position: 'UI设计师',
    hours: 5.5,
    workContent: '根据客户反馈优化审批列表、合同记录和项目看板的交互稿。',
    riskFeedback: '移动端查看审批明细的适配方案待二期确认。',
  },
  {
    id: 'daily-7',
    projectId: '3',
    date: '2026-07-18',
    projectName: '内部OA流程优化',
    personName: '王五',
    position: '前端开发工程师',
    hours: 7,
    workContent: '完成审批流程、合同归档和项目详情核心页面的前端开发与联调。',
    riskFeedback: '客户现有 SSO 登录接口联调时间尚未确认。',
  },
  {
    id: 'daily-8',
    projectId: '3',
    date: '2026-07-20',
    projectName: '内部OA流程优化',
    personName: '赵六',
    position: '后端开发工程师',
    hours: 6.5,
    workContent: '完成审批节点、合同版本和附件归档接口的数据结构设计及接口联调。',
    riskFeedback: '客户组织架构数据需提供增量同步方式。',
  },
  {
    id: 'daily-9',
    projectId: '3',
    date: '2026-07-21',
    projectName: '内部OA流程优化',
    personName: '钱九',
    position: '测试工程师',
    hours: 5,
    workContent: '验证审批提交、合同归档、角色权限和项目日报等一期主流程。',
    riskFeedback: '需补充跨部门会签与驳回后重新提交的回归用例。',
  },
];

export const initialFollowUps: ProjectFollowUp[] = [
  {
    id: 'follow-1',
    projectId: '1',
    status: '进行中',
    progress: 65,
    content: '完成项目管理底座需求梳理，进入原型确认阶段。',
    attachments: [{ id: 'follow-att-1', name: '会议纪要.pdf', size: '860KB' }],
    operator: '李四',
    createdAt: '2026-05-09 10:20',
  },
  {
    id: 'follow-2',
    projectId: '1',
    status: '进行中',
    progress: 45,
    content: '客户确认先做项目管理底座，成本核算拆到后续阶段。',
    attachments: [],
    operator: '张三',
    createdAt: '2026-05-08 16:40',
  },
  {
    id: 'follow-3',
    projectId: '2',
    status: '验收中',
    progress: 90,
    content: '客户反馈首页样式需要微调。',
    attachments: [],
    operator: '王五',
    createdAt: '2026-05-08 11:15',
  },
  {
    id: 'follow-4',
    projectId: '3',
    status: '进行中',
    progress: 58,
    content: '客户已确认核心审批流程与原型，当前进入一期功能开发和接口联调。',
    attachments: [{ id: 'follow-att-3-1', name: '华信科技OA流程联调清单.xlsx', size: '318KB' }],
    operator: '李四',
    createdAt: '2026-07-21 16:30',
  },
  {
    id: 'follow-5',
    projectId: '3',
    status: '进行中',
    progress: 40,
    content: '完成客户需求访谈和流程字段盘点，确认一期覆盖审批、合同、项目和日报管理。',
    attachments: [{ id: 'follow-att-3-2', name: '华信科技需求访谈纪要.pdf', size: '684KB' }],
    operator: '李四',
    createdAt: '2026-07-15 18:10',
  },
];

export const initialDocuments: ProjectDocument[] = [
  {
    id: 'doc-1',
    projectId: '1',
    title: '项目需求说明书',
    onlineUrl: 'https://example.com/project-a-requirements',
    owner: '李四',
    uploadedFileName: '',
    description: '记录项目范围、模块拆解和客户确认事项。',
    createdAt: '2026-05-08 18:00',
  },
  {
    id: 'doc-2',
    projectId: '1',
    title: '原型确认截图',
    onlineUrl: '',
    owner: '孙七',
    uploadedFileName: '项目原型截图.zip',
    description: '客户确认过的页面截图。',
    createdAt: '2026-05-09 09:40',
  },
];

export function createProjectNo(index: number) {
  return `PRJ202605${String(index + 1).padStart(3, '0')}`;
}

export function calculateProjectHours(projectId: string, reports: ProjectDailyReport[]) {
  return reports
    .filter((report) => report.projectId === projectId)
    .reduce((sum, report) => sum + report.hours, 0);
}

export function buildProjectMemberHours(projectId: string, reports: ProjectDailyReport[]): ProjectMemberHours[] {
  const map = new Map<string, ProjectMemberHours>();

  reports
    .filter((report) => report.projectId === projectId)
    .forEach((report) => {
      const current = map.get(report.personName) ?? {
        key: report.personName,
        personName: report.personName,
        position: report.position,
        hours: 0,
      };
      current.hours += report.hours;
      map.set(report.personName, current);
    });

  return Array.from(map.values());
}

export function summarizeProgress(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}...` : trimmed;
}
