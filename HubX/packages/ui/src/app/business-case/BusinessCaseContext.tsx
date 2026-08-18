// 商机（BusinessCase）全局状态：阶段 3 把商机从「mock 静态数据」收敛到共享 Context，
// 让「报价成交生成主合同」与「合同批准触发交付启动」两处联动能读写同一份商机数据。
// 仍是内存 mock（未接 HTTP），接后端时再抽 services 数据接缝（对齐 ProjectContext 的做法）。

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { initialBusinessCases } from './mockCases';
import type { BusinessCase } from './types';

interface BusinessCaseContextValue {
  cases: BusinessCase[];
  getByLeadId: (leadId: string | undefined) => BusinessCase | undefined;
  /** 新增或整体替换一条商机 */
  upsertCase: (next: BusinessCase) => void;
  /** 局部更新一条商机（不存在则忽略） */
  updateCase: (caseId: string, patch: Partial<BusinessCase>) => void;
}

const BusinessCaseContext = createContext<BusinessCaseContextValue | null>(null);

/** 线索 ID 别名归一：leadId 与 lead-xxx 视为同一线索（对齐 ProjectContext.getProjectByLeadId） */
function leadAliases(leadId: string): string[] {
  return leadId.startsWith('lead-') ? [leadId, leadId.slice('lead-'.length)] : [leadId, 'lead-' + leadId];
}

export function BusinessCaseProvider({ children }: { children: PropsWithChildren['children'] }) {
  const [cases, setCases] = useState<BusinessCase[]>(initialBusinessCases);

  const getByLeadId = useCallback(
    (leadId: string | undefined): BusinessCase | undefined => {
      if (!leadId) return undefined;
      const aliases = leadAliases(leadId);
      return cases.find((c) => aliases.includes(c.leadId));
    },
    [cases],
  );

  const upsertCase = useCallback((next: BusinessCase) => {
    setCases((current) => {
      const index = current.findIndex((c) => c.id === next.id);
      if (index < 0) return [next, ...current];
      return current.map((c) => (c.id === next.id ? next : c));
    });
  }, []);

  const updateCase = useCallback((caseId: string, patch: Partial<BusinessCase>) => {
    setCases((current) => current.map((c) => (c.id === caseId ? { ...c, ...patch } : c)));
  }, []);

  const value = useMemo<BusinessCaseContextValue>(
    () => ({ cases, getByLeadId, upsertCase, updateCase }),
    [cases, getByLeadId, upsertCase, updateCase],
  );

  return <BusinessCaseContext.Provider value={value}>{children}</BusinessCaseContext.Provider>;
}

export function useBusinessCases(): BusinessCaseContextValue {
  const ctx = useContext(BusinessCaseContext);
  if (!ctx) throw new Error('useBusinessCases must be used within BusinessCaseProvider');
  return ctx;
}
