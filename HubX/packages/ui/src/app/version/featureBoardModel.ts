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

export interface BetaState {
  /** 生产开关：默认关闭；仅用户手动打开，打开后 Claude 才开始该模块β版开发 */
  productionOn: boolean;
  devStatus: BetaDevStatus;
}

export interface FeatureBoardModule {
  module: string;
  scope: string;
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

export function createSeedBoard(): FeatureBoard {
  return {
    modules: VERSION_MODULE_SEEDS.map(seed => ({
      module: seed.module,
      scope: seed.scope,
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
      return {
        module: item.module as string,
        scope: typeof item.scope === 'string' ? item.scope : (seed?.scope ?? ''),
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
