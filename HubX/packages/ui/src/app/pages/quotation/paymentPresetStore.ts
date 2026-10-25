/**
 * 报价工作台 - 付款方案模版持久化存储引擎
 * 支持内置经典行业付款比例预设与用户自定义付款方案模版存储（跨报价单复用）
 */

export interface PaymentTermItem {
  stage: string;
  percent: number;
  amount?: number;
  expectedDate?: string;
  conditionType?: 'working_day' | 'calendar_day';
  conditionDays?: number;
  conditionDesc?: string;
}

export interface PaymentPlanPreset {
  id: string;
  name: string;
  description?: string;
  terms: PaymentTermItem[];
  isCustom?: boolean;
  createdAt?: string;
}

export const BUILTIN_PAYMENT_PRESETS: PaymentPlanPreset[] = [
  {
    id: 'builtin-std-3331',
    name: '标准 3:3:3:1',
    description: '行业标准：预付款 30% - 阶段验收 30% - 交付上线 30% - 质保金 10%',
    terms: [
      { stage: '合同签订预付款', percent: 30, conditionDesc: '合同签订生效后', conditionDays: 5, conditionType: 'working_day' },
      { stage: '中期原型与核心功能验收', percent: 30, conditionDesc: '中期评审通过后', conditionDays: 5, conditionType: 'working_day' },
      { stage: '系统部署上线与终验', percent: 30, conditionDesc: '终验报告盖章后', conditionDays: 10, conditionType: 'working_day' },
      { stage: '一年质保期满尾款', percent: 10, conditionDesc: '质保期满届满后', conditionDays: 15, conditionType: 'calendar_day' },
    ],
    isCustom: false,
  },
  {
    id: 'builtin-agile-532',
    name: '敏捷 5:3:2',
    description: '敏捷项目：预付款 50% - 阶段成果 30% - 交付上线 20%',
    terms: [
      { stage: '首期启动预付款', percent: 50, conditionDesc: '合同签订生效后', conditionDays: 3, conditionType: 'working_day' },
      { stage: '主干功能演示验收', percent: 30, conditionDesc: '阶段成果交付后', conditionDays: 5, conditionType: 'working_day' },
      { stage: '系统上线交付验收', percent: 20, conditionDesc: '系统正式上线后', conditionDays: 7, conditionType: 'working_day' },
    ],
    isCustom: false,
  },
  {
    id: 'builtin-half-55',
    name: '对半 5:5',
    description: '简易轻量项目：预付款 50% - 终验交付 50%',
    terms: [
      { stage: '合同签订首付款', percent: 50, conditionDesc: '合同签订生效后', conditionDays: 3, conditionType: 'working_day' },
      { stage: '系统上线验收交付款', percent: 50, conditionDesc: '交付验收合格后', conditionDays: 5, conditionType: 'working_day' },
    ],
    isCustom: false,
  },
  {
    id: 'builtin-enterprise-4321',
    name: '大型 4:3:2:1',
    description: '大型政企：预付款 40% - 原型与设计 30% - 部署上线 20% - 质保尾款 10%',
    terms: [
      { stage: '项目启动预付款', percent: 40, conditionDesc: '合同签订生效后', conditionDays: 7, conditionType: 'working_day' },
      { stage: '详细设计与阶段验收款', percent: 30, conditionDesc: '设计评审通过后', conditionDays: 10, conditionType: 'working_day' },
      { stage: '初验通过上线款', percent: 20, conditionDesc: '系统初验合格后', conditionDays: 10, conditionType: 'working_day' },
      { stage: '终验及质保金', percent: 10, conditionDesc: '终验期满合格后', conditionDays: 30, conditionType: 'calendar_day' },
    ],
    isCustom: false,
  },
];

export const PAYMENT_PRESETS_STORAGE_KEY = 'hubx-quotation-custom-payment-presets-v1';

// 内存兜底，在无 window / localStorage（如 SSR、隐私模式或单测）时优雅降级
let inMemoryPresets: PaymentPlanPreset[] = [];

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // 忽略安全限制异常
  }
  return null;
}

/** 读取所有用户自定义付款方案 */
export function loadCustomPaymentPresets(): PaymentPlanPreset[] {
  const storage = getStorage();
  if (!storage) {
    return [...inMemoryPresets];
  }
  try {
    const raw = storage.getItem(PAYMENT_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        ...item,
        isCustom: true,
      }));
    }
  } catch (err) {
    console.warn('[PaymentPresetStore] 加载自定义方案失败:', err);
  }
  return [];
}

/** 保存新的自定义付款方案到本地缓存（跨报价单全局可用） */
export function saveCustomPaymentPreset(
  name: string,
  terms: PaymentTermItem[],
  description?: string,
): PaymentPlanPreset {
  const customPresets = loadCustomPaymentPresets();
  const newPreset: PaymentPlanPreset = {
    id: `custom-pp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || '未命名付款方案',
    description: (description || '').trim() || `包含 ${terms.length} 期付款节点`,
    terms: terms.map((t) => ({
      stage: t.stage.trim(),
      percent: Number(t.percent) || 0,
      expectedDate: t.expectedDate,
      conditionType: t.conditionType,
      conditionDays: t.conditionDays,
      conditionDesc: t.conditionDesc?.trim(),
    })),
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  // 若同名则覆盖，否则追加
  const existingIdx = customPresets.findIndex((p) => p.name === newPreset.name);
  let updatedList: PaymentPlanPreset[];
  if (existingIdx >= 0) {
    updatedList = [...customPresets];
    updatedList[existingIdx] = newPreset;
  } else {
    updatedList = [...customPresets, newPreset];
  }

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(PAYMENT_PRESETS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('[PaymentPresetStore] 写入存储失败:', err);
    }
  } else {
    inMemoryPresets = updatedList;
  }

  return newPreset;
}

/** 删除用户自定义付款方案 */
export function deleteCustomPaymentPreset(presetId: string): boolean {
  const customPresets = loadCustomPaymentPresets();
  const nextList = customPresets.filter((p) => p.id !== presetId);
  if (nextList.length === customPresets.length) return false;

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(PAYMENT_PRESETS_STORAGE_KEY, JSON.stringify(nextList));
      return true;
    } catch (err) {
      console.warn('[PaymentPresetStore] 删除方案失败:', err);
    }
  } else {
    inMemoryPresets = nextList;
    return true;
  }
  return false;
}

/** 清空自定义付款方案（主要用于单元测试或重置） */
export function clearCustomPaymentPresets(): void {
  inMemoryPresets = [];
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(PAYMENT_PRESETS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** 获取合并后的全量方案列表（内置方案在前，自定义方案在后） */
export function getAllPaymentPresets(): PaymentPlanPreset[] {
  return [...BUILTIN_PAYMENT_PRESETS, ...loadCustomPaymentPresets()];
}
