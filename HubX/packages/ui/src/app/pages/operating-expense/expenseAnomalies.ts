// 运营费用异动检测（三条：科目环比、固定模板未生成、浮动待确认逾期）

import type { ExpenseRecord, RecurringExpenseTemplate, ExpenseCategoryPrimary } from './types';
import { categoryStack, isPosted, STACK_PRIMARIES } from './expenseCalc';
import { addMonth, MOM_THRESHOLD, CURRENT_MONTH } from './opexConstants';

export type AnomalyKind = 'category_mom' | 'fixed_not_generated' | 'variable_overdue';

export interface Anomaly {
  kind: AnomalyKind;
  title: string;
  detail: string;
  jump: { tab: 'ledger' | 'template'; filter: Record<string, string> };
}

/**
 * 检测三条异动：
 * 1. 科目环比增幅 > 30%（只看 posted，下降不报）
 * 2. 固定模板本月未生成
 * 3. 浮动待确认逾期
 */
export function detectAnomalies(args: {
  records: ExpenseRecord[];
  templates: RecurringExpenseTemplate[];
  currentMonth?: string;
  today?: string;
  momThreshold?: number;
  canGenerate?: (t: RecurringExpenseTemplate, month: string, records: ExpenseRecord[]) => boolean;
}): Anomaly[] {
  const {
    records,
    templates,
    currentMonth = CURRENT_MONTH,
    today = '2026-08-21',
    momThreshold = MOM_THRESHOLD,
    canGenerate,
  } = args;

  const anomalies: Anomaly[] = [];
  const prev = addMonth(currentMonth, -1);

  // 1. 科目环比增幅 > 30%（只报增幅，下降不报）
  const currentStack = categoryStack(records, currentMonth);
  const prevStack = categoryStack(records, prev);
  for (const primary of STACK_PRIMARIES) {
    const a = currentStack[primary];
    const b = prevStack[primary];
    if (b > 0 && (a - b) / b > momThreshold) {
      anomalies.push({
        kind: 'category_mom',
        title: `${primary} 环比增幅超 ${Math.round(momThreshold * 100)}%`,
        detail: `本月 ¥${a.toLocaleString()} vs 上月 ¥${b.toLocaleString()}，增幅 ${Math.round(((a - b) / b) * 100)}%`,
        jump: { tab: 'ledger', filter: { billingMonth: currentMonth, categoryPrimary: primary } },
      });
    }
  }

  // 2. 固定模板本月未生成
  if (canGenerate) {
    for (const t of templates) {
      if (!t.active || t.kind !== 'fixed') continue;
      if (canGenerate(t, currentMonth, records)) {
        anomalies.push({
          kind: 'fixed_not_generated',
          title: `固定模板「${t.name}」本月未生成`,
          detail: `模板 ${t.id} 覆盖 ${currentMonth}，可一键生成`,
          jump: { tab: 'template', filter: { templateId: t.id } },
        });
      }
    }
  }

  // 3. 浮动待确认逾期
  for (const r of records) {
    if (r.status !== 'pending' || r.source !== 'template' || !r.templateId) continue;
    const tpl = templates.find((t) => t.id === r.templateId);
    if (!tpl || tpl.kind !== 'variable') continue;
    const billingDay = tpl.billingDay ?? 1;
    const due = `${r.billingMonth}-${String(billingDay).padStart(2, '0')}`;
    if (due < today) {
      anomalies.push({
        kind: 'variable_overdue',
        title: `浮动模板「${tpl.name}」待确认逾期`,
        detail: `费用 ${r.expenseNo} 归属 ${r.billingMonth}，到期日 ${due}`,
        jump: { tab: 'ledger', filter: { status: 'pending', id: r.id } },
      });
    }
  }

  return anomalies;
}
