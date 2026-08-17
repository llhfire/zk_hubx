import { describe, expect, it } from 'vitest';
import {
  DATA_SOURCE_LABELS,
  DATA_SOURCE_TAG_COLORS,
  VERSION_DESCRIPTIONS,
  VERSION_LABELS,
  VERSION_MODULES,
  VERSION_TAG_COLORS,
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
});
