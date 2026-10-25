// src/app/pages/delivery-plan/constants.ts

import type { DeliveryType } from './types';

/** SOP 角色到 Project 字段的映射 */
export const ROLE_TO_PROJECT_FIELD: Record<string, string> = {
  '产品经理': 'productUsers',
  '销售': 'salesUsers',
  'UI 设计师': 'uiUsers',
  '开发主管': 'frontendUsers',
  '项目经理': 'owner',
  '运维专员': 'opsUsers',
  '法务专员': 'legalUsers',
  '测试工程师': 'testUsers',
};

/** 板块默认主管映射：phaseNo → project 角色字段 */
export const PHASE_MANAGER_FIELD: Record<number, string> = {
  1: 'productUsers',
  2: 'owner',
  3: 'owner',
  4: 'opsUsers',
  5: 'testUsers',
  6: 'opsUsers',
  7: 'owner',
};

/** 板块配色（Arco 色系） */
export const PHASE_COLORS: Record<number, string> = {
  1: 'rgb(var(--arcoblue-6))',
  2: 'rgb(var(--cyan-6))',
  3: 'rgb(var(--green-6))',
  4: 'rgb(var(--orange-6))',
  5: 'rgb(var(--purple-6))',
  6: 'rgb(var(--red-6))',
  7: 'rgb(var(--magenta-6))',
};

/** 板块配色（浅色 / 未完成态） */
export const PHASE_COLORS_LIGHT: Record<number, string> = {
  1: 'rgb(var(--arcoblue-3))',
  2: 'rgb(var(--cyan-3))',
  3: 'rgb(var(--green-3))',
  4: 'rgb(var(--orange-3))',
  5: 'rgb(var(--purple-3))',
  6: 'rgb(var(--red-3))',
  7: 'rgb(var(--magenta-3))',
};

/** 七大板块定义 */
export const SOP_PHASES = [
  { phaseNo: 1, phaseName: '合同交接' },
  { phaseNo: 2, phaseName: '项目启动准备' },
  { phaseNo: 3, phaseName: '项目交付执行' },
  { phaseNo: 4, phaseName: '资质备案 & 上架' },
  { phaseNo: 5, phaseName: '测试验收' },
  { phaseNo: 6, phaseName: '运维支持' },
  { phaseNo: 7, phaseName: '项目总结' },
] as const;

/** 交付类型 → 板块四适用步骤编号 */
export const DELIVERY_TYPE_PHASE4_STEPS: Record<DeliveryType, string[]> = {
  '网站': ['4.1', '4.2', '4.3', '4.7'],
  '小程序': ['4.1', '4.3', '4.4', '4.6', '4.7'],
  'APP': ['4.1', '4.5', '4.6', '4.7'],
  '网站+小程序': ['4.1', '4.2', '4.3', '4.4', '4.6', '4.7'],
  '网站+APP': ['4.1', '4.2', '4.3', '4.5', '4.6', '4.7'],
  '小程序+APP': ['4.1', '4.3', '4.4', '4.5', '4.6', '4.7'],
  '全平台': ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7'],
};

/** 交付类型 → 板块四步骤名称覆盖（合并展示） */
export const DELIVERY_TYPE_STEP_NAME_OVERRIDES: Partial<Record<DeliveryType, Record<string, string>>> = {
  '网站+小程序': {
    '4.3': 'ICP 备案 / 小程序主体备案',
    '4.6': '小程序正式提审',
  },
  '网站+APP': {
    '4.3': 'ICP 备案',
    '4.6': 'APP 正式提审',
  },
  '小程序+APP': {
    '4.3': '小程序主体备案',
    '4.6': '小程序/APP 正式提审',
  },
  '全平台': {
    '4.3': 'ICP 备案 / 小程序主体备案',
    '4.6': '小程序/APP 正式提审',
  },
};

/** 状态优先级（用于推导板块状态：取最落后的） */
export const STATUS_PRIORITY: Record<string, number> = {
  completed: 4,
  skipped: 3,
  in_progress: 2,
  pending: 1,
};
