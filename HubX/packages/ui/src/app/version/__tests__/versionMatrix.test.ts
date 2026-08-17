import { describe, expect, it, vi } from 'vitest';
import {
  DATA_SOURCE_LABELS,
  DATA_SOURCE_TAG_COLORS,
  VERSION_DESCRIPTIONS,
  VERSION_LABELS,
  VERSION_MODULES,
  VERSION_TAG_COLORS,
  VERSION_URLS,
  loadAlphaChecklist,
  toggleAlphaChecklist,
  type ModuleDataSource,
} from '../versionMatrix';

describe('versionMatrix', () => {
  it('every module declares both alpha and beta data sources', () => {
    expect(VERSION_MODULES.length).toBeGreaterThan(0);
    for (const item of VERSION_MODULES) {
      expect(item.module.trim()).not.toBe('');
      expect(item.scope.trim()).not.toBe('');
      expect(['mock', 'http']).toContain(item.alpha);
      expect(['mock', 'http']).toContain(item.beta);
      expect(item.note.trim()).not.toBe('');
    }
  });

  it('has unique module names matching menu granularity', () => {
    const names = VERSION_MODULES.map(item => item.module);
    expect(new Set(names).size).toBe(names.length);
  });

  it('quotation and contract domains are http in beta (per ALPHA-BETA-ARCHITECTURE)', () => {
    const quotation = VERSION_MODULES.find(item => item.module === '报价管理');
    const contract = VERSION_MODULES.find(item => item.module === '合同管理');
    expect(quotation?.beta).toBe('http');
    expect(contract?.beta).toBe('http');
    // α版纯前端，任何模块都不应有 http 数据源
    for (const item of VERSION_MODULES) {
      expect(item.alpha).toBe('mock');
    }
  });

  it('labels and colors cover every data source and version', () => {
    const sources: ModuleDataSource[] = ['mock', 'http'];
    for (const source of sources) {
      expect(DATA_SOURCE_LABELS[source]).toBeTruthy();
      expect(DATA_SOURCE_TAG_COLORS[source]).toBeTruthy();
    }
    expect(VERSION_LABELS.alpha).toBe('α版');
    expect(VERSION_LABELS.beta).toBe('β版');
    expect(VERSION_TAG_COLORS.alpha).toBeTruthy();
    expect(VERSION_TAG_COLORS.beta).toBeTruthy();
    expect(VERSION_DESCRIPTIONS.alpha).toBeTruthy();
    expect(VERSION_DESCRIPTIONS.beta).toBeTruthy();
  });

  it('online urls point to the deployed Cloudflare Pages sites', () => {
    expect(VERSION_URLS.alpha).toBe('https://zkhubx-alpha.pages.dev');
    expect(VERSION_URLS.beta).toBe('https://zkhubx-web.pages.dev');
  });

  it('planned items are string lists and key P0/P1 pending work is tracked', () => {
    for (const item of VERSION_MODULES) {
      expect(Array.isArray(item.planned)).toBe(true);
      for (const planned of item.planned) {
        expect(planned.trim()).not.toBe('');
      }
    }
    const finance = VERSION_MODULES.find(item => item.module === '财务管理');
    expect(finance?.planned).toContain('回款拆分/冲红权限矩阵');
    expect(finance?.planned).toContain('全期次回款+开票视图');
  });

  it('alpha checklist state persists through localStorage per module and item', () => {
    // vitest 默认 node 环境，无 localStorage，这里打桩模拟
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
    expect(loadAlphaChecklist()).toEqual([]);
    expect(toggleAlphaChecklist('报价管理', '页面场景')).toEqual(['报价管理::页面场景']);
    expect(toggleAlphaChecklist('报价管理', 'UX 优化')).toEqual(['报价管理::页面场景', '报价管理::UX 优化']);
    expect(loadAlphaChecklist()).toEqual(['报价管理::页面场景', '报价管理::UX 优化']);
    expect(toggleAlphaChecklist('合同管理', '功能流程')).toEqual(['报价管理::页面场景', '报价管理::UX 优化', '合同管理::功能流程']);
    // 再点一次取消勾选
    expect(toggleAlphaChecklist('报价管理', '页面场景')).toEqual(['报价管理::UX 优化', '合同管理::功能流程']);
    vi.unstubAllGlobals();
  });
});
