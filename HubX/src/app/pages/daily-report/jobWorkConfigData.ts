export interface JobPositionDefinition {
  id: string;
  name: string;
}

export interface JobDepartmentDefinition {
  id: string;
  name: string;
  aliases?: string[];
  positions: JobPositionDefinition[];
}

export type DailyProjectCategory =
  | 'operations'
  | 'immigration-presales'
  | 'promotion'
  | 'ecommerce';

export const DAILY_PROJECT_CATEGORIES: Array<{ id: DailyProjectCategory; name: string }> = [
  { id: 'operations', name: '运营' },
  { id: 'immigration-presales', name: '移民售前' },
  { id: 'promotion', name: '推广' },
  { id: 'ecommerce', name: '电商' },
];

export interface DepartmentRoutineConfig {
  id: string;
  category: DailyProjectCategory;
  departmentId: string | 'company';
  name: string;
  enabled: boolean;
  sortOrder: number;
  remark: string;
}

export const JOB_DEPARTMENTS: JobDepartmentDefinition[] = [
  {
    id: 'general-management',
    name: '综合管理',
    aliases: ['销售部', '行政财务'],
    positions: [
      { id: 'sales', name: '销售' },
      { id: 'business', name: '商务' },
      { id: 'finance', name: '财务' },
      { id: 'hr', name: '人事' },
      { id: 'administration', name: '行政' },
      { id: 'legal', name: '法务' },
    ],
  },
  {
    id: 'software-division',
    name: '软件事业部',
    aliases: ['技术部'],
    positions: [
      { id: 'product-manager', name: '产品经理' },
      { id: 'project-manager', name: '项目经理' },
      { id: 'ui-designer', name: 'UI设计' },
      { id: 'frontend-developer', name: '前端开发' },
      { id: 'backend-developer', name: '后端开发' },
      { id: 'test-engineer', name: '测试工程师' },
      { id: 'operations-engineer', name: '运维工程师' },
    ],
  },
  {
    id: 'immigration-division',
    name: '移民事业部',
    positions: [
      { id: 'immigration-consultant', name: '移民顾问' },
      { id: 'immigration-copywriter', name: '文案专员' },
      { id: 'case-specialist', name: '案件专员' },
    ],
  },
  {
    id: 'ecommerce-division',
    name: '电商事业部',
    positions: [
      { id: 'ecommerce-operation', name: '电商运营' },
      { id: 'ecommerce-service', name: '电商客服' },
      { id: 'ecommerce-designer', name: '美工设计' },
      { id: 'warehouse', name: '仓库' },
      { id: 'procurement', name: '采购' },
    ],
  },
  {
    id: 'mcn-media',
    name: 'MCN传媒',
    positions: [
      { id: 'director-planner', name: '编导策划' },
      { id: 'mcn-copywriter', name: '文案策划' },
      { id: 'photographer', name: '摄影' },
      { id: 'video-editor', name: '剪辑' },
      { id: 'host', name: '主播' },
      { id: 'actor', name: '演员' },
      { id: 'mcn-operation', name: 'MCN运营' },
    ],
  },
  {
    id: 'promotion-center',
    name: '推广中心',
    aliases: ['新媒体部门'],
    positions: [
      { id: 'ad-buyer', name: '广告投手' },
      { id: 'seo-specialist', name: 'SEO优化' },
      { id: 'new-media-operation', name: '新媒体运营' },
    ],
  },
  {
    id: 'shared-service-center',
    name: '集团共享中心',
    positions: [
      { id: 'customer-service', name: '客服' },
      { id: 'technical-support', name: '技术支持' },
      { id: 'data-analyst', name: '数据分析' },
      { id: 'training-specialist', name: '培训专员' },
    ],
  },
];

const sales = ['线索跟进', '客户拜访', '方案撰写', '报价沟通', '合同推进', '客户维护', '需求对接', '内部协同', '催款', '售后跟进'];
const finance = ['凭证录入', '账务处理', '发票管理', '收款核对', '付款处理', '成本核算', '税务申报', '报表编制', '工资核算', '档案整理'];
const hr = ['招聘面试', '简历筛选', '入离职', '员工培训', '考勤管理', '薪酬核算', '社保公积金', '员工沟通', '制度完善', '档案管理'];
const administration = ['采购管理', '办公保障', '固资管理', '合同归档', '会议组织', '来访接待', '车辆管理', '环境维护', '物业对接', '行政审批'];
const softwareDevelopment = ['需求分析', '原型设计', '系统设计', '功能开发', '接口开发', 'Bug修复', '联调测试', '部署发布', '技术支持', '文档编写'];
const uiDesign = ['页面设计', '图标设计', '原型优化', '交互设计', '切图标注', '设计修改', '素材整理', '内部沟通'];
const testing = ['用例编写', '功能测试', '回归测试', 'Bug提交', 'Bug验证', '性能测试', '测试报告', '环境维护'];
const productManager = ['需求调研', '需求分析', '原型设计', '文档编写', '客户沟通', '项目推进', '功能验收', '产品优化'];
const projectManager = ['项目规划', '需求评审', '进度跟踪', '风险管理', '客户沟通', '团队协调', '项目汇报', '项目验收'];
const shooting = ['脚本沟通', '场景布置', '设备调试', '视频拍摄', '灯光调整', '收音录制', '素材整理', '外出拍摄'];
const editing = ['素材整理', '视频剪辑', '调色', '配音', '配乐', '字幕制作', '特效制作', '成片输出'];
const ecommerceOperation = ['商品上架', '商品优化', '活动策划', '店铺装修', '数据分析', '客服协同', '库存跟进', '售后处理', '平台运营', '流量分析'];
const ecommerceService = ['客户咨询', '售前解答', '售后处理', '订单跟进', '退款处理', '客户维护', '好评维护', '数据登记'];
const immigrationConsultant = ['客户咨询', '方案制定', '材料收集', '材料审核', '文书准备', '客户跟进', '签证办理', '面试辅导', '案件推进', '售后服务'];
const mcnCopywriting = ['选题策划', '脚本编写', '文案优化', '热点分析', '评论回复', '数据分析', '内容复盘', '素材整理'];
const presenter = ['内容拍摄', '直播带货', '彩排', '人设维护', '互动回复', '内容复盘', '妆造准备', '配合拍摄'];
const mcnOperation = ['达人运营', '账号运营', '内容排期', '数据分析', '商务对接', '活动策划', '粉丝运营', '品牌合作'];
const adBuyer = ['账户搭建', '广告投放', '素材测试', '人群优化', '出价调整', '数据分析', '创意优化', '效果复盘', '客户沟通'];
const seoAndNewMedia = ['内容发布', 'SEO优化', '外链建设', '数据分析', '关键词研究', '排名监控', '内容更新', '平台运营'];
const business = ['客户开发', '商务洽谈', '合同签订', '渠道维护', '商机跟进', '合作推进', '客户回访', '商务接待'];
const customerService = ['在线咨询', '工单处理', '问题反馈', '客户回访', '售后处理', '数据登记', '客诉处理', '客户维护'];
const legal = ['合同审核', '法律咨询', '风险评估', '制度审核', '案件跟进', '合规检查', '文件归档'];
const procurement = ['供应询价', '比价采购', '合同采购', '到货验收', '库存管理', '对账付款', '供应维护'];
const warehouse = ['入库', '出库', '盘点', '配货', '发货', '库存整理', '异常处理'];

export const DEFAULT_WORK_NATURES: Record<string, string[]> = {
  sales,
  business,
  finance,
  hr,
  administration,
  legal,
  'product-manager': productManager,
  'project-manager': projectManager,
  'ui-designer': uiDesign,
  'frontend-developer': softwareDevelopment,
  'backend-developer': softwareDevelopment,
  'test-engineer': testing,
  'operations-engineer': softwareDevelopment,
  'immigration-consultant': immigrationConsultant,
  'immigration-copywriter': ['材料收集', '材料审核', '文书准备', '客户跟进', '签证办理', '案件推进', '文件归档'],
  'case-specialist': ['客户咨询', '材料收集', '材料审核', '签证办理', '面试辅导', '案件推进', '售后服务', '档案整理'],
  'ecommerce-operation': ecommerceOperation,
  'ecommerce-service': ecommerceService,
  'ecommerce-designer': uiDesign,
  warehouse,
  procurement,
  'director-planner': mcnCopywriting,
  'mcn-copywriter': mcnCopywriting,
  photographer: shooting,
  'video-editor': editing,
  host: presenter,
  actor: presenter,
  'mcn-operation': mcnOperation,
  'ad-buyer': adBuyer,
  'seo-specialist': seoAndNewMedia,
  'new-media-operation': seoAndNewMedia,
  'customer-service': customerService,
  'technical-support': ['在线咨询', '工单处理', '问题复现', '故障排查', '远程支持', '部署协助', '问题反馈', '技术文档'],
  'data-analyst': ['数据采集', '数据清洗', '数据分析', '报表编制', '指标维护', '异常分析', '数据复盘', '需求对接'],
  'training-specialist': ['培训需求调研', '课程设计', '课件制作', '培训组织', '培训实施', '效果评估', '培训复盘', '档案管理'],
};

export const JOB_POSITION_COUNT = JOB_DEPARTMENTS.reduce(
  (total, department) => total + department.positions.length,
  0,
);

export const DEFAULT_DEPARTMENT_ROUTINES: DepartmentRoutineConfig[] = [
  { id: 'routine-operations-recruitment', category: 'operations', departmentId: 'company', name: '招聘', enabled: true, sortOrder: 1, remark: '' },
  { id: 'routine-operations-hr-management', category: 'operations', departmentId: 'company', name: '人事管理', enabled: true, sortOrder: 2, remark: '' },
  { id: 'routine-operations-finance-management', category: 'operations', departmentId: 'company', name: '财务管理', enabled: true, sortOrder: 3, remark: '' },
  { id: 'routine-operations-other', category: 'operations', departmentId: 'company', name: '其他', enabled: true, sortOrder: 4, remark: '' },
  { id: 'routine-immigration-russia', category: 'immigration-presales', departmentId: 'company', name: '俄罗斯移民', enabled: true, sortOrder: 1, remark: '' },
  { id: 'routine-immigration-singapore', category: 'immigration-presales', departmentId: 'company', name: '新加坡移民', enabled: true, sortOrder: 2, remark: '' },
  { id: 'routine-promotion-ip', category: 'promotion', departmentId: 'company', name: 'IP打造', enabled: true, sortOrder: 1, remark: '' },
  { id: 'routine-promotion-operation', category: 'promotion', departmentId: 'company', name: '代运营', enabled: true, sortOrder: 2, remark: '' },
  { id: 'routine-promotion-other', category: 'promotion', departmentId: 'company', name: '其他', enabled: true, sortOrder: 3, remark: '' },
  { id: 'routine-ecommerce-mall', category: 'ecommerce', departmentId: 'company', name: '微商城', enabled: true, sortOrder: 1, remark: '' },
  { id: 'routine-ecommerce-agriculture', category: 'ecommerce', departmentId: 'company', name: '助农电商', enabled: true, sortOrder: 2, remark: '' },
];

export const LEGACY_OPERATIONS_ROUTINE_IDS = new Set([
  'routine-operations-recruitment',
  'routine-operations-hr-management',
  'routine-operations-finance-management',
  'routine-operations-other',
  'routine-operations-planning',
  'routine-hr-recruiting',
  'routine-payroll',
  'routine-admin',
  'routine-reimbursement',
  'routine-finance',
  'routine-ops-promotion',
  'routine-company-events',
  'routine-training',
  'routine-internal-meeting',
  'routine-other',
]);

const LEGACY_OPERATIONS_ROUTINE_NAMES = new Set([
  '人员招聘',
  '工资核算',
  '行政管理',
  '报销审批',
  '运营推广',
  '企业活动',
  '培训',
  '内部会议',
  '企划',
]);

export function isLegacyOperationsRoutine(
  config: Pick<DepartmentRoutineConfig, 'id' | 'category' | 'name'>,
) {
  return config.category === 'operations'
    && (LEGACY_OPERATIONS_ROUTINE_IDS.has(config.id) || LEGACY_OPERATIONS_ROUTINE_NAMES.has(config.name));
}

export function findJobDepartment(departmentIdOrName: string) {
  return JOB_DEPARTMENTS.find(department => (
    department.id === departmentIdOrName
    || department.name === departmentIdOrName
    || department.aliases?.includes(departmentIdOrName)
  ));
}

export function findJobPosition(positionIdOrName: string) {
  const aliasPositionIds: Record<string, string> = {
    '新媒体': 'new-media-operation',
    '开发': 'frontend-developer',
    '运营岗位': 'administration',
  };
  const target = aliasPositionIds[positionIdOrName] || positionIdOrName;

  for (const department of JOB_DEPARTMENTS) {
    const position = department.positions.find(
      item => item.id === target || item.name === target,
    );
    if (position) return { department, position };
  }
  return undefined;
}

export function createDefaultWorkNatureMap() {
  return Object.fromEntries(
    Object.entries(DEFAULT_WORK_NATURES).map(([positionId, values]) => [positionId, [...values]]),
  );
}

export function createDefaultDepartmentRoutineConfigs() {
  return DEFAULT_DEPARTMENT_ROUTINES.map(config => ({ ...config }));
}
