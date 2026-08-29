// 线索模块全局状态（B2 数据接缝）。数据层抽到 services/leadService（mock/http 双实现），
// 这里只是 React 绑定：镜像 service 返回的数据 + 委托操作后 refresh。
// 五池列表与 LeadDetail 消费本 Context；α 版注入 mock，β 版注入 http（apps/web/src/main.tsx）。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { FollowUpRecord, LeadDetailInfo, LeadListItem, TransferRecord, CustomerLevel } from '@/app/pages/leads/types';
import { createMockLeadService, type LeadService } from '@/services/leadService';
import type { LeadCreateInput, FollowUpInput, DispatchInput } from '@/services/leadMutations';

interface LeadsContextValue {
  leads: LeadListItem[];
  loading: boolean;
  getById: (id: string | undefined) => LeadListItem | undefined;
  getDetailInfo: (id: string | undefined) => Promise<LeadDetailInfo | null>;
  getFollowUps: (id: string) => Promise<FollowUpRecord[]>;
  getTransferRecords: (id: string) => Promise<TransferRecord[]>;
  refresh: () => Promise<void>;
  createLead: (input: LeadCreateInput) => Promise<string>;
  claimLead: (id: string, operator: string) => Promise<void>;
  assignLead: (id: string, toOwner: string, operator: string, reason?: string) => Promise<void>;
  returnLead: (id: string, operator: string, reason?: string) => Promise<void>;
  markTrash: (id: string, operator: string, reason: string) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
  transformToCustomer: (id: string) => Promise<void>;
  addFollowUp: (id: string, input: FollowUpInput) => Promise<void>;
  updateLead: (id: string, updater: (lead: LeadListItem) => LeadListItem) => Promise<void>;
  // 派发域（β 阶段 2）：动作走服务端专门端点，事件服务端生成
  dispatchLead: (id: string, input: DispatchInput, operator: string) => Promise<void>;
  urgeLead: (id: string, operator: string, note?: string) => Promise<void>;
  adjustLevel: (id: string, from: CustomerLevel, to: CustomerLevel, operator: string) => Promise<void>;
  confirmQuality: (id: string, operator: string, note: string) => Promise<void>;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

interface LeadsProviderProps extends PropsWithChildren {
  service?: LeadService;
}

export function LeadsProvider({ children, service }: LeadsProviderProps) {
  const svc = useMemo(() => service ?? createMockLeadService(), [service]);
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    svc.list().then((ls) => {
      if (cancelled) return;
      setLeads(ls);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [svc]);

  const refresh = useCallback(async () => {
    setLeads(await svc.list());
  }, [svc]);

  const getById = useCallback((id: string | undefined) => leads.find((l) => l.id === id), [leads]);
  const getDetailInfo = useCallback((id: string | undefined) => svc.getDetailInfo(id), [svc]);
  const getFollowUps = useCallback((id: string) => svc.getFollowUps(id), [svc]);
  const getTransferRecords = useCallback((id: string) => svc.getTransferRecords(id), [svc]);

  const createLead = useCallback(async (input: LeadCreateInput) => {
    const id = await svc.createLead(input);
    await refresh();
    return id;
  }, [svc, refresh]);

  const claimLead = useCallback(async (id: string, operator: string) => { await svc.claimLead(id, operator); await refresh(); }, [svc, refresh]);
  const assignLead = useCallback(async (id: string, toOwner: string, operator: string, reason?: string) => { await svc.assignLead(id, toOwner, operator, reason); await refresh(); }, [svc, refresh]);
  const returnLead = useCallback(async (id: string, operator: string, reason?: string) => { await svc.returnLead(id, operator, reason); await refresh(); }, [svc, refresh]);
  const markTrash = useCallback(async (id: string, operator: string, reason: string) => { await svc.markTrash(id, operator, reason); await refresh(); }, [svc, refresh]);
  const softDelete = useCallback(async (id: string) => { await svc.softDelete(id); await refresh(); }, [svc, refresh]);
  const transformToCustomer = useCallback(async (id: string) => { await svc.transformToCustomer(id); await refresh(); }, [svc, refresh]);
  const addFollowUp = useCallback(async (id: string, input: FollowUpInput) => { await svc.addFollowUp(id, input); await refresh(); }, [svc, refresh]);
  const updateLead = useCallback(async (id: string, updater: (lead: LeadListItem) => LeadListItem) => { await svc.updateLead(id, updater); await refresh(); }, [svc, refresh]);
  const dispatchLead = useCallback(async (id: string, input: DispatchInput, operator: string) => { await svc.dispatchLead(id, input, operator); await refresh(); }, [svc, refresh]);
  const urgeLead = useCallback(async (id: string, operator: string, note?: string) => { await svc.urgeLead(id, operator, note); await refresh(); }, [svc, refresh]);
  const adjustLevel = useCallback(async (id: string, from: CustomerLevel, to: CustomerLevel, operator: string) => { await svc.adjustLevel(id, from, to, operator); await refresh(); }, [svc, refresh]);
  const confirmQuality = useCallback(async (id: string, operator: string, note: string) => { await svc.confirmQuality(id, operator, note); await refresh(); }, [svc, refresh]);

  const value = useMemo<LeadsContextValue>(() => ({
    leads, loading, getById, getDetailInfo, getFollowUps, getTransferRecords, refresh,
    createLead, claimLead, assignLead, returnLead, markTrash, softDelete, transformToCustomer, addFollowUp, updateLead,
    dispatchLead, urgeLead, adjustLevel, confirmQuality,
  }), [
    leads, loading, getById, getDetailInfo, getFollowUps, getTransferRecords, refresh,
    createLead, claimLead, assignLead, returnLead, markTrash, softDelete, transformToCustomer, addFollowUp, updateLead,
    dispatchLead, urgeLead, adjustLevel, confirmQuality,
  ]);

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be used within LeadsProvider');
  return ctx;
}

/** 便捷工具：按池子切片，五池列表 Tab 计数用 */
export function splitByPool(leads: LeadListItem[]) {
  return {
    public: leads.filter((l) => l.clueType === 'public'),
    my: leads.filter((l) => l.clueType === 'assigned'),
    trash: leads.filter((l) => l.clueType === 'trash'),
    closed: leads.filter((l) => l.transformStatus && l.status === '已签单'),
  };
}