import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ExpenseRecord, RecurringExpenseTemplate } from './types';
import { mockExpenseRecords, mockTemplates } from './mockData';

const STORAGE_KEY = 'hubx-operating-expense-v2';

interface OperatingExpenseState {
  records: ExpenseRecord[];
  templates: RecurringExpenseTemplate[];
}

interface OperatingExpenseCtx extends OperatingExpenseState {
  setRecords: (fn: (prev: ExpenseRecord[]) => ExpenseRecord[]) => void;
  setTemplates: (fn: (prev: RecurringExpenseTemplate[]) => RecurringExpenseTemplate[]) => void;
}

const OperatingExpenseContext = createContext<OperatingExpenseCtx | null>(null);

function loadState(): OperatingExpenseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { records: parsed.records ?? mockExpenseRecords, templates: parsed.templates ?? mockTemplates };
    }
  } catch { /* ignore */ }
  return { records: mockExpenseRecords, templates: mockTemplates };
}

export function OperatingExpenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OperatingExpenseState>(loadState);

  const setRecords = useCallback((fn: (prev: ExpenseRecord[]) => ExpenseRecord[]) => {
    setState(prev => {
      const next = { ...prev, records: fn(prev.records) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setTemplates = useCallback((fn: (prev: RecurringExpenseTemplate[]) => RecurringExpenseTemplate[]) => {
    setState(prev => {
      const next = { ...prev, templates: fn(prev.templates) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <OperatingExpenseContext.Provider value={{ ...state, setRecords, setTemplates }}>
      {children}
    </OperatingExpenseContext.Provider>
  );
}

export function useOperatingExpense() {
  const ctx = useContext(OperatingExpenseContext);
  if (!ctx) throw new Error('useOperatingExpense must be used within OperatingExpenseProvider');
  return ctx;
}
