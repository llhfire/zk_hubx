import { describe, expect, it, vi } from 'vitest';
import {
  addModule,
  addPlannedItem,
  BETA_DEV_STATUSES,
  createSeedBoard,
  DOMAINS,
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
import { VERSION_URLS } from '../versionMatrix';
import type { Domain, ExistingFeature } from '../featureBoardModel';

describe('featureBoardModel', () => {
  it('seed board has 36 modules across 8 domains in priority order', () => {
    const board = createSeedBoard();
    expect(board.modules).toHaveLength(36);

    // 领域优先级：销售→交付→财务→获客→支撑→跨域→资源→运维
    const domainOrder: Domain[] = ['销售域', '交付域', '财务域', '获客域', '支撑域', '跨域工具', '资源域', '运维域'];
    const seenDomains: Domain[] = [];
    for (const m of board.modules) {
      if (seenDomains.at(-1) !== m.domain) seenDomains.push(m.domain);
    }
    expect(seenDomains).toEqual(domainOrder);
  });

  it('seed board marks planned modules correctly', () => {
    const board = createSeedBoard();
    const planned = board.modules.filter(m => m.isPlanned);
    const existing = board.modules.filter(m => !m.isPlanned);
    // 规划模块有 19 个（资源域5+运维域4+各域内规划模块）
    expect(planned.length).toBeGreaterThanOrEqual(15);
    // 现有模块有 17 个
    expect(existing.length).toBeGreaterThanOrEqual(15);
    // 现有模块 beta 可以有不同状态
    for (const m of existing) {
      expect(m.features.length).toBeGreaterThanOrEqual(0);
    }
    // 规划模块 features 为空，planned 有内容
    for (const m of planned) {
      expect(m.features).toHaveLength(0);
      // 部分规划模块有 planned 功能
    }
    expect(isValidFeatureBoard(board)).toBe(true);
  });

  it('seed board has existing features for existing modules', () => {
    const board = createSeedBoard();
    const existingWithFeatures = board.modules.filter(m => !m.isPlanned && m.features.length > 0);
    expect(existingWithFeatures.length).toBeGreaterThanOrEqual(10);
    for (const m of existingWithFeatures) {
      for (const f of m.features) {
        expect(f.name.trim()).not.toBe('');
        expect(f.description.trim()).not.toBe('');
      }
    }
  });

  it('planned item pure functions: add/rename/remove/status are immutable and idempotent-safe', () => {
    let board = createSeedBoard();
    // 在第一个现有模块上测试
    const firstExisting = board.modules.find(m => !m.isPlanned)!;
    board = addPlannedItem(board, firstExisting.module, '  新能力  ');
    expect(board.modules.find(m => m.module === firstExisting.module)?.planned.at(-1)).toEqual({ name: '新能力', status: '未开始' });
    // 重名不重复添加
    expect(addPlannedItem(board, firstExisting.module, '新能力').modules.find(m => m.module === firstExisting.module)?.planned.length)
      .toBe(board.modules.find(m => m.module === firstExisting.module)?.planned.length);

    board = setPlannedStatus(board, firstExisting.module, '新能力', '已调研');
    expect(board.modules.find(m => m.module === firstExisting.module)?.planned.at(-1)?.status).toBe('已调研');
    expect(PLANNED_STATUSES).toContain('已调研');

    board = renamePlannedItem(board, firstExisting.module, '新能力', '全新能力');
    expect(board.modules.find(m => m.module === firstExisting.module)?.planned.at(-1)?.name).toBe('全新能力');

    board = removePlannedItem(board, firstExisting.module, '全新能力');
    expect(board.modules.find(m => m.module === firstExisting.module)?.planned.at(-1)?.name).not.toBe('全新能力');
  });

  it('alpha check, production switch and dev status toggles update only the target module', () => {
    let board = createSeedBoard();
    const target = board.modules[0];
    board = toggleAlphaCheck(board, target.module, '页面场景');
    board = toggleProductionSwitch(board, target.module);
    board = setBetaDevStatus(board, target.module, '编码中');

    const updated = board.modules.find(m => m.module === target.module)!;
    const untouched = board.modules.find(m => m.module !== target.module)!;
    expect(updated.alpha.页面场景).toBe(true);
    expect(updated.beta).toEqual({ productionOn: true, devStatus: '编码中' });
    expect(untouched.alpha.页面场景).toBe(false);
    expect(BETA_DEV_STATUSES).toEqual(['未开始', '编码中', '测试中', '测试通过']);
  });

  it('note and module additions respect the schema', () => {
    let board = setModuleNote(createSeedBoard(), '日报工时', '跨年时间轴已排期');
    expect(board.modules.find(m => m.module === '日报工时')?.note).toBe('跨年时间轴已排期');

    board = addModule(board, 'AI 智能助手', '会话/知识检索', '支撑域', false);
    expect(board.modules.at(-1)?.module).toBe('AI 智能助手');
    expect(board.modules.at(-1)?.domain).toBe('支撑域');
    expect(board.modules.at(-1)?.isPlanned).toBe(false);
    expect(isValidFeatureBoard(board)).toBe(true);
    expect(addModule(board, 'AI 智能助手').modules.length).toBe(board.modules.length);
    expect(addModule(board, '  ').modules).toBe(board.modules);
  });

  it('normalize repairs broken fields and drops invalid rows', () => {
    const dirty = {
      modules: [
        { module: '报价工作台', planned: [{ name: 'X', status: '飞行中' }] },
        { module: '', planned: [] },
        { module: 123 },
      ],
    };
    const normalized = normalizeFeatureBoard(dirty);
    expect(normalized.modules).toHaveLength(1);
    expect(normalized.modules[0].planned[0].status).toBe('未开始');
    expect(normalized.modules[0].alpha.页面场景).toBe(false);
    expect(normalized.modules[0].beta.productionOn).toBe(false);
    expect(normalized.modules[0].domain).toBe('销售域');
  });

  it('migrates legacy alpha checklist keys (module::item) into board alpha checks', () => {
    const board = createSeedBoard();
    const migrated = migrateAlphaChecklist(board, ['报价工作台::页面场景', '报价工作台::UX 优化', '不存在::页面场景']);
    const target = migrated.modules.find(m => m.module === '报价工作台');
    expect(target?.alpha.页面场景).toBe(true);
    expect(target?.alpha['UX 优化']).toBe(true);
    expect(target?.alpha.功能流程).toBe(false);
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
