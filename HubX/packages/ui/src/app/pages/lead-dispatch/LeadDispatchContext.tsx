// 线索派发工作台 Context（阶段 B）
// 数据不另起一套：读 LeadContext 的同一 Lead 实体（ADR-0096），
// 叠加派发域演示种子后按三视角过滤；KPI 与分类口径调 kpiCalc 纯函数。

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useLeads } from '@/app/leads/LeadContext';
import type { LeadListItem } from '@/app/pages/leads/types';
import { withDispatchSeed } from './dispatchSeed';
import { filterLeadsByRoleView, type DispatchRole } from './roleViewFilter';
import { computeDispatchKpis, type DispatchKpis } from './kpiCalc';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';

/** 推广视角「负责渠道」演示值；阶段 D 接用户档案多选字段（组织与权限域） */
const PROMOTER_DEMO_CHANNELS = ['baidu', 'xiaohongshu'];

interface LeadDispatchContextValue {
  role: DispatchRole;
  setRole: (role: DispatchRole) => void;
  /** 三视角可见线索（种子增强 + 角色过滤；不含垃圾池） */
  leads: LeadListItem[];
  loading: boolean;
  /** SLA 计算基准时刻（随数据刷新） */
  now: Date;
  kpis: DispatchKpis;
}

const LeadDispatchContext = createContext<LeadDispatchContextValue | null>(null);

export function LeadDispatchProvider({ children }: PropsWithChildren) {
  const { leads: allLeads, loading } = useLeads();
  const [role, setRole] = useState<DispatchRole>('admin');

  // 视角 = 管理员（张三是 admin，直接用当前登录人）
  const now = useMemo(() => new Date(), [allLeads, role]);

  const leads = useMemo(() => {
    const seeded = withDispatchSeed(allLeads);
    return filterLeadsByRoleView(seeded, {
      role,
      userId: CURRENT_LOGIN_USER.name,
      userChannels: role === 'promoter' ? PROMOTER_DEMO_CHANNELS : undefined,
    }, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  }, [allLeads, role, now]);

  const kpis = useMemo(() => computeDispatchKpis(leads, now), [leads, now]);

  const value = useMemo<LeadDispatchContextValue>(() => ({
    role, setRole, leads, loading, now, kpis,
  }), [role, leads, loading, now, kpis]);

  return <LeadDispatchContext.Provider value={value}>{children}</LeadDispatchContext.Provider>;
}

export function useLeadDispatch(): LeadDispatchContextValue {
  const ctx = useContext(LeadDispatchContext);
  if (!ctx) throw new Error('useLeadDispatch must be used within LeadDispatchProvider');
  return ctx;
}
