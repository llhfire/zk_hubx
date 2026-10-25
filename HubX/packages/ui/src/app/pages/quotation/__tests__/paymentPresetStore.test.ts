import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUILTIN_PAYMENT_PRESETS,
  clearCustomPaymentPresets,
  deleteCustomPaymentPreset,
  getAllPaymentPresets,
  loadCustomPaymentPresets,
  saveCustomPaymentPreset,
} from '../paymentPresetStore';

describe('paymentPresetStore (付款方案模版存储引擎)', () => {
  beforeEach(() => {
    clearCustomPaymentPresets();
  });

  it('1. 默认加载包含内置经典付款方案', () => {
    const presets = getAllPaymentPresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.some((p) => p.name.includes('标准 3:3:3:1'))).toBe(true);
    expect(presets.some((p) => p.name.includes('敏捷 5:3:2'))).toBe(true);
  });

  it('2. 能够成功保存用户自定义付款方案并支持跨页面加载', () => {
    const saved = saveCustomPaymentPreset('政企分期 4:4:2', [
      { stage: '首期预付款', percent: 40 },
      { stage: '中期初验款', percent: 40 },
      { stage: '上线终验款', percent: 20 },
    ], '针对重点国企客户定制的分期节奏');

    expect(saved.id).toBeDefined();
    expect(saved.isCustom).toBe(true);
    expect(saved.name).toBe('政企分期 4:4:2');

    const loaded = loadCustomPaymentPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('政企分期 4:4:2');
    expect(loaded[0].terms).toHaveLength(3);
    expect(loaded[0].description).toBe('针对重点国企客户定制的分期节奏');

    const all = getAllPaymentPresets();
    expect(all.length).toBe(BUILTIN_PAYMENT_PRESETS.length + 1);
    expect(all[all.length - 1].name).toBe('政企分期 4:4:2');
  });

  it('3. 保存同名方案时能够自动覆盖更新', () => {
    saveCustomPaymentPreset('老客户方案', [
      { stage: '首款', percent: 50 },
      { stage: '尾款', percent: 50 },
    ]);

    saveCustomPaymentPreset('老客户方案', [
      { stage: '首款', percent: 60 },
      { stage: '尾款', percent: 40 },
    ], '更新为6:4');

    const loaded = loadCustomPaymentPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].terms[0].percent).toBe(60);
    expect(loaded[0].description).toBe('更新为6:4');
  });

  it('4. 能够成功删除自定义付款方案', () => {
    const preset = saveCustomPaymentPreset('临时测试方案', [
      { stage: '全款', percent: 100 },
    ]);

    expect(loadCustomPaymentPresets()).toHaveLength(1);

    const deleted = deleteCustomPaymentPreset(preset.id);
    expect(deleted).toBe(true);
    expect(loadCustomPaymentPresets()).toHaveLength(0);
  });
});
