// α/β 版本功能矩阵：静态数据，与 docs/ALPHA-BETA-ARCHITECTURE.md 口径保持一致。
// α版 = 纯前端（apps/prototype，mock 数据）；β版 = 前后端（apps/web + apps/api，报价/合同已通 HTTP + D1）。
// 供版本对比弹窗（VersionCompareModal）展示，点击侧边栏版本标识打开。

export type AppVersion = 'alpha' | 'beta';

/** 各版本中该模块的数据来源状态 */
export type ModuleDataSource = 'mock' | 'http';

export interface VersionModuleStatus {
  /** 模块名称（与侧边栏菜单命名一致） */
  module: string;
  /** 菜单入口/子功能说明 */
  scope: string;
  alpha: ModuleDataSource;
  beta: ModuleDataSource;
  /** 已计划但尚未实施的功能（来自工作清单 P0/P1 待办与报价遗留项） */
  planned: string[];
  /** 差异说明 */
  note: string;
}

export const VERSION_LABELS: Record<AppVersion, string> = {
  alpha: 'α版',
  beta: 'β版',
};

export const VERSION_TAG_COLORS: Record<AppVersion, string> = {
  alpha: 'arcoblue',
  beta: 'green',
};

export const DATA_SOURCE_LABELS: Record<ModuleDataSource, string> = {
  mock: 'Mock（纯前端）',
  http: 'HTTP + D1（已通后端）',
};

export const DATA_SOURCE_TAG_COLORS: Record<ModuleDataSource, string> = {
  mock: 'gray',
  http: 'green',
};

export const VERSION_DESCRIPTIONS: Record<AppVersion, string> = {
  alpha: '纯前端原型（apps/prototype）：全部数据为本地 mock，部署于 Cloudflare Pages。',
  beta: '前后端版（apps/web + apps/api）：已打通的域走 Cloudflare Workers + D1 持久化，其余仍为 mock。',
};

/** 线上部署地址（docs/DEPLOYMENT.md）。国内直连 *.pages.dev 被墙，需代理访问。 */
export const VERSION_URLS: Record<AppVersion, string> = {
  alpha: 'https://zkhubx-alpha.pages.dev',
  beta: 'https://zkhubx-web.pages.dev',
};

export const VERSION_MODULES: VersionModuleStatus[] = [
  { module: '报价管理', scope: '报价工作台 / 报价中心（四阶段全流程）', alpha: 'mock', beta: 'http', planned: ['Excel 双向导入导出', '版本 Diff 对比', 'PDF 生成与电子签章', '代理/转交机制'], note: 'β版报价单落 D1，含状态迁移校验' },
  { module: '合同管理', scope: '合同列表 / 多版本 / 审批 / 归档', alpha: 'mock', beta: 'http', planned: ['付款比例模板', '审批流程灰态展示', '审批通过后释放回款 Tab'], note: 'mock/http 共享 contractMutations，口径一致' },
  { module: '线索管理', scope: '四池流转 / 线索详情 / 治理', alpha: 'mock', beta: 'mock', planned: ['线索自动分配'], note: 'service 接缝待抽（照合同域样板）' },
  { module: '客户管理', scope: '客户列表 / 详情', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
  { module: '项目管理', scope: '项目详情 / 任务 / 成本核算', alpha: 'mock', beta: 'mock', planned: ['合同/回款统一视图', '项目与线索同源上下文'], note: 'service 接缝待抽' },
  { module: '线索成本', scope: '成本看板 / 投放日报 / 渠道分析', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
  { module: '日报', scope: '日报列表 / 视图 / 项目视图 / 配置', alpha: 'mock', beta: 'mock', planned: ['跨月/跨年时间轴优化'], note: 'service 接缝待抽' },
  { module: '财务管理', scope: '财务统计 / 项目成本 / 工资表 / 开票审核', alpha: 'mock', beta: 'mock', planned: ['回款拆分/冲红权限矩阵', '全期次回款+开票视图', '回款逾期判断'], note: '开票申请存 localStorage，未落 D1' },
  { module: '审批管理', scope: '审批中心 / 审批模板 / 业务审批配置', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
  { module: '待办中心', scope: '待办列表 / 状态流转', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
  { module: '消息提醒', scope: '提醒铃铛 / 日报催报', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
  { module: '员工与人资', scope: '员工 / 考勤 / 绩效 / 费用管理', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
  { module: '系统管理', scope: '组织 / 权限 / 字典 / 企微集成等', alpha: 'mock', beta: 'mock', planned: ['企微集成深化（通讯录同步等）'], note: 'service 接缝待抽' },
  { module: '其他模块', scope: '工作台 / 数据报表 / 会议 / 知识库等', alpha: 'mock', beta: 'mock', planned: [], note: 'service 接缝待抽' },
];

/** UX 设计打勾状态持久化（localStorage，按模块名记录） */
const UX_DESIGN_STORAGE_KEY = 'hubx-ux-design-checked';

export function loadUxDesignChecked(): string[] {
  try {
    const stored = localStorage.getItem(UX_DESIGN_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleUxDesignChecked(module: string): string[] {
  const current = loadUxDesignChecked();
  const next = current.includes(module) ? current.filter(item => item !== module) : [...current, module];
  try {
    localStorage.setItem(UX_DESIGN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用时仅返回内存态，不中断交互
  }
  return next;
}
