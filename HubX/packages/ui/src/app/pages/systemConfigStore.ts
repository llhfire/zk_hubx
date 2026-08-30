export interface SalesBusinessConfig {
  dispatchSlaMinutes: number;
  firstContactSlaMinutes: number;
  firstContactWarningMinutes: number;
  followRemindDays: number;
  birthdayReminderDays: string;
  contractExpireReminderDays: string;
  maintenanceExpireReminderDays: string;
  customerInactiveDays: number;
  enableDuplicateCheck: boolean;
}

export const DEFAULT_SALES_BUSINESS_CONFIG: SalesBusinessConfig = {
  dispatchSlaMinutes: 30,
  firstContactSlaMinutes: 120,
  firstContactWarningMinutes: 60,
  followRemindDays: 3,
  birthdayReminderDays: '7,0',
  contractExpireReminderDays: '30,7,1',
  maintenanceExpireReminderDays: '30,7',
  customerInactiveDays: 90,
  enableDuplicateCheck: true,
};

export const SYSTEM_CONFIG_STORAGE_KEY = 'hubx-system-config-v1';

export function readSalesBusinessConfig(): SalesBusinessConfig {
  if (typeof window === 'undefined') return DEFAULT_SALES_BUSINESS_CONFIG;
  try {
    const raw = window.localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SALES_BUSINESS_CONFIG, ...(parsed.business ?? {}) };
  } catch {
    return DEFAULT_SALES_BUSINESS_CONFIG;
  }
}

export function parseReminderOffsets(value: string, fallback: number[]) {
  const parsed = value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item >= 0);
  return parsed.length ? Array.from(new Set(parsed)).sort((a, b) => b - a) : fallback;
}
