import { describe, expect, it, vi } from 'vitest';
import {
  addModule,
  addPlannedItem,
  BETA_DEV_STATUSES,
  createSeedBoard,
  isValidFeatureBoard,
  migrateAlphaChecklist,
  normalizeFeatureBoard,
  PLANNED_STATUSES,
  removePlannedItem,
  renamePlannedItem,
  setBetaDevStatus,
  setModuleNote,
  setPlannedStatus,
  toggleAlphaCheck,
  toggleProductionSwitch,
} from '../featureBoardModel';
import { VERSION_URLS, VERSION_MODULE_SEEDS } from '../versionMatrix';
import type { ExistingFeature } from '../featureBoardModel';

describe('featureBoardModel', () => {
  it('seed board reflects reality: http domains are production-on and tested, others untouched', () => {
    const board = createSeedBoard();
    expect(board.modules.map(item => item.module)).toEqual(VERSION_MODULE_SEEDS.map(item => item.module));

    const quotation = board.modules.find(item => item.module === '报价管理');
    const contract = board.modules.find(item => item.module === '合同管理');
    expect(quotation?.beta).toEqual({ productionOn: true, devStatus: '测试通过' });
    expect(contract?.beta).toEqual({ productionOn: true, devStatus: '测试通过' });
    expect(quotation?.note).toContain('已上线 http+D1');

    for (const item of board.modules) {
      if (item.module === '报价管理' || item.module === '合同管理') continue;
      expect(item.beta).toEqual({ productionOn: false, devStatus: '未开始' });
      for (const planned of item.planned) {
        expect(planned.status).toBe('未开始');
      }
    }
    // 全部模块的α勾选从 false 起步，seed 通过 schema 校验
    for (const item of board.modules) {
      expect(Object.values(item.alpha).every(Boolean)).toBe(false);
    }
    expect(isValidFeatureBoard(board)).toBe(true);
  });

  it('seed board has existing features for every module with name and description', () => {
    const board = createSeedBoard();
    for (const item of board.modules) {
      expect(Array.isArray(item.features)).toBe(true);
      // 每个模块至少有 1 个已有功能
      expect(item.features.length).toBeGreaterThanOrEqual(1);
      for (const f of item.features) {
        expect(f.name.trim()).not.toBe('');
        expect(f.description.trim()).not.toBe('');
      }
    }
    // 报价管理有至少 3 个功能
    const quotation = board.modules.find(item => item.module === '报价管理');
    expect(quotation!.features.length).toBeGreaterThanOrEqual(3);
  });

  it('planned item pure functions: add/rename/remove/status are immutable and idempotent-safe', () => {
    let board = createSeedBoard();
    board = addPlannedItem(board, '报价管理', '  新报价能力  ');
    expect(board.modules.find(item => item.module === '报价管理')?.planned.at(-1)).toEqual({ name: '新报价能力', status: '未开始' });
    // 重名不重复添加；空白名忽略
    expect(addPlannedItem(board, '报价管理', '新报价能力').modules.find(item => item.module === '报价管理')?.planned.length)
      .toBe(board.modules.find(item => item.module === '报价管理')?.planned.length);
    expect(addPlannedItem(board, '报价管理', '   ').modules).toBe(board.modules);

    board = setPlannedStatus(board, '报价管理', '新报价能力', '已调研');
    expect(board.modules.find(item => item.module === '报价管理')?.planned.at(-1)?.status).toBe('已调研');
    expect(PLANNED_STATUSES).toContain('已调研');

    board = renamePlannedItem(board, '报价管理', '新报价能力', '全新报价能力');
    expect(board.modules.find(item => item.module === '报价管理')?.planned.at(-1)?.name).toBe('全新报价能力');

    board = removePlannedItem(board, '报价管理', '全新报价能力');
    expect(board.modules.find(item => item.module === '报价管理')?.planned.at(-1)?.name).not.toBe('全新报价能力');
  });

  it('alpha check, production switch and dev status toggles update only the target module', () => {
    let board = createSeedBoard();
    board = toggleAlphaCheck(board, '线索管理', '页面场景');
    board = toggleProductionSwitch(board, '线索管理');
    board = setBetaDevStatus(board, '线索管理', '编码中');

    const leads = board.modules.find(item => item.module === '线索管理');
    const customer = board.modules.find(item => item.module === '客户管理');
    expect(leads?.alpha.页面场景).toBe(true);
    expect(leads?.beta).toEqual({ productionOn: true, devStatus: '编码中' });
    expect(customer?.alpha.页面场景).toBe(false);
    expect(customer?.beta).toEqual({ productionOn: false, devStatus: '未开始' });
    expect(BETA_DEV_STATUSES).toEqual(['未开始', '编码中', '测试中', '测试通过']);
  });

  it('note and module additions respect the schema', () => {
    let board = setModuleNote(createSeedBoard(), '日报', '跨年时间轴已排期下周');
    expect(board.modules.find(item => item.module === '日报')?.note).toBe('跨年时间轴已排期下周');

    board = addModule(board, 'AI 智能助手', '会话/知识检索', '支撑域');
    expect(board.modules.at(-1)?.module).toBe('AI 智能助手');
    expect(board.modules.at(-1)?.domain).toBe('支撑域');
    expect(isValidFeatureBoard(board)).toBe(true);
    // 重名与空白模块名被忽略
    expect(addModule(board, 'AI 智能助手').modules.length).toBe(board.modules.length);
    expect(addModule(board, '  ').modules).toBe(board.modules);
  });

  it('normalize repairs broken fields and drops invalid rows', () => {
    const dirty = {
      modules: [
        { module: '报价管理', planned: [{ name: 'X', status: '飞行中' }] },
        { module: '', planned: [] },
        { module: 123 },
      ],
    };
    const normalized = normalizeFeatureBoard(dirty);
    expect(normalized.modules).toHaveLength(1);
    expect(normalized.modules[0].planned[0].status).toBe('未开始');
    expect(normalized.modules[0].alpha.页面场景).toBe(false);
    expect(normalized.modules[0].beta.productionOn).toBe(false);
    expect(normalized.modules[0].note).toContain('D1');
  });

  it('migrates legacy alpha checklist keys (module::item) into board alpha checks', () => {
    const board = createSeedBoard();
    const migrated = migrateAlphaChecklist(board, ['报价管理::页面场景', '报价管理::UX 优化', '不存在::页面场景']);
    const quotation = migrated.modules.find(item => item.module === '报价管理');
    expect(quotation?.alpha.页面场景).toBe(true);
    expect(quotation?.alpha['UX 优化']).toBe(true);
    expect(quotation?.alpha.功能流程).toBe(false);
    // 其他模块不受影响
    expect(migrated.modules.find(item => item.module === '合同管理')?.alpha.页面场景).toBe(false);
  });

  it('version urls point to the custom domains', () => {
    expect(VERSION_URLS.alpha).toBe('https://alpha.zkhubx.com');
    expect(VERSION_URLS.beta).toBe('https://beta.zkhubx.com');
  });

  it('rejects empty or malformed boards so the endpoint cannot wipe the file', () => {
    expect(isValidFeatureBoard({ modules: [] })).toBe(false);
    expect(isValidFeatureBoard(null)).toBe(false);
    expect(isValidFeatureBoard({ modules: [{ module: 'X' }] })).toBe(false);
    expect(isValidFeatureBoard(createSeedBoard())).toBe(true);
  });
});
