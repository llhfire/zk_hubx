// 功能看板（Feature Board）：用户与 Claude Code 共享的开发协作状态板。
// 唯一事实源 = 仓库内配置文档 featureBoard.config.json（术语见 HubX/CONTEXT.md §功能看板）：
// - α版 dev server（apps/prototype 的 feature-board-store 插件）提供 GET/PUT /api/feature-board 直接读写该文档；
// - 无端点的环境（静态部署 / apps/web）回退 localStorage；
// - 文档缺失时用 versionMatrix.ts 的种子清单初始化。
// Claude Code 行为约定见 HubX/CLAUDE.md §功能看板。

import { VERSION_MODULE_SEEDS, type ModuleDataSource } from './versionMatrix';

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

export interface FeatureBoardModule {
  module: string;
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

const HTTP_BETA_NOTE_SUFFIX = '；已上线 http+D1';

/** 已通 http 的域：初始即开关开 + 测试通过 */
function seedBetaState(source: ModuleDataSource): BetaState {
  return source === 'http'
    ? { productionOn: true, devStatus: '测试通过' }
    : { productionOn: false, devStatus: '未开始' };
}

/** 已有功能种子数据：基于代码库知识生成（原始需求/功能流程/功能说明） */
const FEATURES_SEED: Record<string, ExistingFeature[]> = {
  '报价管理': [
    { name: '报价工作台', description: '四阶段全流程（功能清单→人天评估→销售报价→审批盖章），角色切换器（6 角色 mock），Stage1 功能清单默认 18 项/7 模块，Stage2 人天评估支持方向键+Tab 连续填充、按模块/子功能快捷批量按钮，Stage3 销售报价 7 步向导，Stage4 审批盖章+PDF。' },
    { name: '报价中心', description: '报价单列表管理，支持按状态/创建人筛选，报价单版本管理（编辑自动生成新版本），作废功能，报价单关联线索→合同漏斗。' },
    { name: '报价审批流', description: '三人并行会签（黄奕/罗总/闵总），全部通过→待盖章；任一驳回（意见必填）→退回销售→全员重审；黄海盖章→已盖章→生成 PDF。' },
    { name: '报价状态机', description: '草稿→功能清单已确认→人天评估完成→已转派销售→报价已汇总→审批中→待盖章→已盖章→已发出（成交/重新报价/待跟进）。审批中→驳回→退回→修改重提；审批中→撤回→草稿；任意→作废→已作废。' },
  ],
  '合同管理': [
    { name: '合同列表', description: '合同集中管理入口，支持按状态/客户筛选，合同编号自动生成（ZK-C-YYYYMMDD-NNN）。' },
    { name: '合同多版本', description: '编辑合同自动生成新版本（v1.0→v2.0...），历史版本只读对比，当前版本可编辑。' },
    { name: '合同审批流', description: '总经理单节点审批（P0① 已收敛），意见留痕，审批通过→释放回款 Tab，灰态展示下一节点与处理人。' },
    { name: '合同归档', description: '审批通过后上传归档合同文件（archiveFinalContract），支持 PDF/图片等附件。' },
    { name: '补充协议', description: '基于主合同创建补充协议，继承客户信息与审批流（总经理单节点），独立版本管理。' },
  ],
  '线索管理': [
    { name: '四池流转', description: '公海线索→我的线索→已成交/垃圾线索，线索状态自动流转（领取/分配/成交/回收），线索来源标记（百度/小红书/抖音等）。' },
    { name: '线索详情', description: '线索基础信息、跟进记录、演示记录、报价 Tab（内嵌报价工作台 Drawer）、合同关联，资料附件管理。' },
    { name: '线索治理', description: '线索数据质量治理，重复线索合并，线索状态批量操作，线索分配规则配置。' },
  ],
  '客户管理': [
    { name: '客户列表', description: '客户基础信息管理，按行业/规模/来源筛选，客户关联线索与合同。' },
    { name: '客户详情', description: '客户基本信息、关联线索列表、关联合同列表、联系人管理、沟通记录。' },
  ],
  '项目管理': [
    { name: '项目详情-基础信息', description: '项目名称、状态、负责人、时间，关联合同与回款，项目编号自动生成。' },
    { name: '项目任务管理', description: 'ProjectTaskPanel：任务拆分、分配、状态跟踪（待开始/处理中/已完成），按成员筛选。' },
    { name: '项目成本核算', description: 'ProjectCostPanel：人工+差旅+其他成本，利润率分析，成本明细可展开。' },
  ],
  '线索成本': [
    { name: '成本看板', description: '广告投放总览，按渠道/日期汇总消耗、线索数、转化率，趋势图表。' },
    { name: '投放日报', description: '每日投放数据录入与查看，按渠道拆分，消耗/线索/转化漏斗。' },
    { name: '渠道分析', description: '各渠道 ROI 对比，百度/小红书/抖音/淘宝等平台数据横向对比。' },
  ],
  '日报': [
    { name: '日报列表', description: '日报汇总列表，按日期/成员/项目筛选，支持导出。' },
    { name: '日报视图', description: '个人日报填写与查看，工时×时薪计算（buildRDCostDetails），工作归属选择（项目/线索/内部）。' },
    { name: '项目视图', description: '按项目维度查看团队日报汇总，项目工时统计。' },
    { name: '日报配置', description: 'JobWorkConfigContext：工作种类配置、时薪模板、日报规则（按用户角色匹配模板）。' },
  ],
  '财务管理': [
    { name: '财务统计', description: '财务总览面板，收入/支出/利润汇总，按月/季度趋势。' },
    { name: '项目成本核算', description: '项目维度成本明细，人工+差旅+其他，利润率分析。' },
    { name: '工资表', description: '员工工资计算，工时×时薪汇总，按月生成。' },
    { name: '开票审核', description: 'ProjectInvoicePage：财务处理项目开票申请，上传发票附件，开票状态流转（开票中→已开票/已冲红），冲红需填写原因+附件。' },
    { name: '回款与发票', description: 'LeadPaymentInvoicePanel：期次拆分、回款登记（金额+日期+凭证）、开票申请（发票类别+税率+客户信息）、回款状态自动计算（getPaymentPeriodMetrics）。' },
  ],
  '审批管理': [
    { name: '审批中心', description: '统一审批入口，待办/已办/我发起的，审批意见填写，支持通过/驳回。' },
    { name: '审批模板', description: '审批流程模板管理，配置审批节点与处理人。' },
    { name: '业务审批配置', description: '按业务类型（合同/报价/出差等）配置审批流，支持串行/并行/会签。' },
  ],
  '待办中心': [
    { name: '待办列表', description: '统一待办聚合，来源包括审批、日报催报、系统提醒，支持完成/忽略操作。' },
    { name: '状态流转', description: '待办状态机：待处理→处理中→已完成，与审批/日报等模块联动。' },
  ],
  '消息提醒': [
    { name: '提醒铃铛', description: 'ReminderBell：顶栏提醒入口，未读消息计数 Badge，点击展开提醒列表。' },
    { name: '日报催报', description: 'hasDailyReportUnsubmittedReminder：每日检测未提交日报，自动触发催报提醒。' },
  ],
  '员工与人资': [
    { name: '员工列表', description: '员工基础信息管理，入离职/转正/合同状态。' },
    { name: '考勤管理', description: '考勤记录、请假审批、加班统计。' },
    { name: '绩效考核', description: '员工绩效评估，KPI 指标设定与评分。' },
    { name: '费用管理', description: '费用报销审批，费用分类管理，预算控制。' },
  ],
  '系统管理': [
    { name: '组织架构', description: '公司/部门/岗位树形结构管理。' },
    { name: '用户权限', description: '角色权限配置，菜单权限+操作权限控制。' },
    { name: '数据字典', description: '系统枚举值管理（回款方式、发票类型、线索来源等）。' },
    { name: '企业微信集成', description: 'WeComIntegration：通讯录同步、消息推送、群聊导出（wx CLI）。' },
  ],
  '其他模块': [
    { name: '工作台', description: '首页仪表盘，关键指标概览，快捷入口。' },
    { name: '数据报表', description: '销售报表、业绩统计、图表展示。' },
    { name: '会议管理', description: 'MeetingManagement：会议记录、纪要、参会人管理。' },
    { name: '知识库', description: '文档存储与检索，按模块分类。' },
  ],
};

export function createSeedBoard(): FeatureBoard {
  return {
    modules: VERSION_MODULE_SEEDS.map(seed => ({
      module: seed.module,
      scope: seed.scope,
      features: FEATURES_SEED[seed.module] ?? [],
      planned: seed.planned.map(name => ({ name, status: '未开始' as const })),
      alpha: { '页面场景': false, '功能流程': false, 'UX 优化': false },
      beta: seedBetaState(seed.beta),
      note: seed.beta === 'http' ? `${seed.note}${HTTP_BETA_NOTE_SUFFIX}` : seed.note,
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
      return {
        module: item.module as string,
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

export function addModule(board: FeatureBoard, module: string, scope = ''): FeatureBoard {
  const trimmed = module.trim();
  if (!trimmed || board.modules.some(item => item.module === trimmed)) return board;
  return {
    modules: [...board.modules, {
      module: trimmed,
      scope,
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
