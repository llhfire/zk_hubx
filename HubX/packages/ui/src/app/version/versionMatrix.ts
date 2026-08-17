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

/** 线上部署地址（已绑定自定义域名，见 docs/DEPLOYMENT.md）。 */
export const VERSION_URLS: Record<AppVersion, string> = {
  alpha: 'https://alpha.zkhubx.com',
  beta: 'https://beta.zkhubx.com',
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

/** α版检查项：页面场景 / 功能流程 / UX 优化，逐项手动打勾，状态持久化在 localStorage */
export const ALPHA_CHECKLIST_ITEMS = ['页面场景', '功能流程', 'UX 优化'] as const;
export type AlphaChecklistItem = (typeof ALPHA_CHECKLIST_ITEMS)[number];

const ALPHA_CHECKLIST_STORAGE_KEY = 'hubx-alpha-checklist-checked';

function alphaChecklistKey(module: string, item: AlphaChecklistItem) {
  return `${module}::${item}`;
}

/**
 * α版检查项存储：
 * - α版 dev server（apps/prototype 的 alpha-checklist-store 插件）提供 /api/alpha-checklist，
 *   GET/PUT 直接读写仓库内配置文档 alphaChecklist.config.json，进度随 git 提交保存。
 * - 无该端点的环境（静态部署的 pages.dev / apps/web）回退到 localStorage。
 */
const ALPHA_CHECKLIST_ENDPOINT = '/api/alpha-checklist';

function readChecklistFromLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem(ALPHA_CHECKLIST_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeChecklistToLocalStorage(items: string[]) {
  try {
    localStorage.setItem(ALPHA_CHECKLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage 不可用时忽略，交互不中断
  }
}

export async function loadAlphaChecklist(): Promise<string[]> {
  try {
    const response = await fetch(ALPHA_CHECKLIST_ENDPOINT);
    if (response.ok) {
      const payload = await response.json() as { items?: unknown };
      return Array.isArray(payload.items) ? payload.items.filter(item => typeof item === 'string') : [];
    }
  } catch {
    // 端点不存在（非 α版 dev 环境），走 localStorage 回退
  }
  return readChecklistFromLocalStorage();
}

export async function saveAlphaChecklist(items: string[]): Promise<void> {
  writeChecklistToLocalStorage(items);
  try {
    await fetch(ALPHA_CHECKLIST_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
  } catch {
    // 写不进配置文档时进度至少留在 localStorage
  }
}

/** 纯函数：基于当前勾选状态计算下一状态，key 形如「模块::检查项」 */
export function toggleAlphaChecklist(current: string[], module: string, item: AlphaChecklistItem): string[] {
  const key = alphaChecklistKey(module, item);
  return current.includes(key) ? current.filter(entry => entry !== key) : [...current, key];
}
