// 报价权限配置 localStorage mock（4.2）。
// 同 approvals/configStore 模式：模块级 load/save，默认六人。

import type { QuotePermission } from './quoteAccess';

const STORAGE_KEY = 'hubx-quote-permission-v1';

const DEFAULT_PERMISSION: QuotePermission = {
  creators: ['张产品', '罗总', '张三', '黄奕', '闵总', '黄海'],
  admins: ['黄奕', '闵总'],
};

export function loadQuotePermission(): QuotePermission {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_PERMISSION;
}

export function saveQuotePermission(perm: QuotePermission) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(perm));
}
