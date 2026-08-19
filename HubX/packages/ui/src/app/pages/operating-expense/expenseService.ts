// ========================================
// 运营费用 - 服务层（阶段 E · β 骨架）
// α 用 localStorage（Context），β 替换为真实 API
// 本文件定义接口 + α mock 实现，阶段 E 正式接入 apps/api
// ========================================

import type { ExpenseRecord, RecurringExpenseTemplate } from './types';
import {
  canGenerate,
  generateFromTemplate,
  confirmExpense,
  voidExpense,
  patchPostedExpense,
  adjustTemplatePrice,
} from './expenseMutations';

/** 服务接口（β 实现） */
export interface IExpenseService {
  getRecords(): Promise<ExpenseRecord[]>;
  getTemplates(): Promise<RecurringExpenseTemplate[]>;
  createRecord(record: ExpenseRecord): Promise<ExpenseRecord>;
  updateRecord(id: string, patch: Partial<ExpenseRecord>): Promise<ExpenseRecord>;
  voidRecord(id: string, actor: string): Promise<ExpenseRecord>;
  confirmRecord(id: string, actor: string): Promise<ExpenseRecord>;
  generateFromTemplate(templateId: string, month: string, actor: string): Promise<ExpenseRecord | null>;
  adjustTemplatePrice(templateId: string, newAmount: number, effectiveMonth: string, actor: string): Promise<RecurringExpenseTemplate>;
}

/**
 * α mock 实现 — 直接操作内存数组
 * β 替换为 fetch('/api/expenses/...') 调用
 */
export function createMockExpenseService(
  records: ExpenseRecord[],
  templates: RecurringExpenseTemplate[],
  onRecordsChange: (fn: (prev: ExpenseRecord[]) => ExpenseRecord[]) => void,
  onTemplatesChange: (fn: (prev: RecurringExpenseTemplate[]) => RecurringExpenseTemplate[]) => void,
): IExpenseService {
  return {
    async getRecords() { return records; },
    async getTemplates() { return templates; },

    async createRecord(record) {
      onRecordsChange(prev => [...prev, record]);
      return record;
    },

    async updateRecord(id, patch) {
      let updated: ExpenseRecord | null = null;
      onRecordsChange(prev => prev.map(r => {
        if (r.id !== id) return r;
        updated = { ...r, ...patch };
        return updated;
      }));
      return updated!;
    },

    async voidRecord(id, actor) {
      let updated: ExpenseRecord | null = null;
      onRecordsChange(prev => prev.map(r => {
        if (r.id !== id) return r;
        updated = voidExpense(r, actor);
        return updated;
      }));
      return updated!;
    },

    async confirmRecord(id, actor) {
      let updated: ExpenseRecord | null = null;
      onRecordsChange(prev => prev.map(r => {
        if (r.id !== id) return r;
        updated = confirmExpense(r, actor);
        return updated;
      }));
      return updated!;
    },

    async generateFromTemplate(templateId, month, actor) {
      const template = templates.find(t => t.id === templateId);
      if (!template || !canGenerate(template, month, records)) return null;
      const seq = records.length + 1;
      const newRecord = generateFromTemplate(template, month, actor, seq);
      onRecordsChange(prev => [...prev, newRecord]);
      return newRecord;
    },

    async adjustTemplatePrice(templateId, newAmount, effectiveMonth, actor) {
      let updated: RecurringExpenseTemplate | null = null;
      onTemplatesChange(prev => prev.map(t => {
        if (t.id !== templateId) return t;
        updated = adjustTemplatePrice(t, newAmount, effectiveMonth, actor);
        return updated;
      }));
      return updated!;
    },
  };
}
