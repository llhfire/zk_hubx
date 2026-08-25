/**
 * 智能会议 Context
 *
 * 阶段 B：α 数据层，封装 minuteService + 本地状态管理
 * 设计规约见 smart-meetings-ui-design.md §1 + smart-meetings-dev-plan.md §阶段 B
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { SmartMinute, MinuteSourceText } from './types';
import type { ISmartMeetingService, CreateMinuteInput } from './minuteService';
import { createMockSmartMeetingService } from './minuteService';
import { MOCK_MINUTES } from './mockData';

interface SmartMeetingContextValue {
  minutes: SmartMinute[];
  loading: boolean;
  getById: (id: string) => SmartMinute | undefined;
  createMinute: (input: CreateMinuteInput) => Promise<SmartMinute>;
  updateMinute: (id: string, fn: (m: SmartMinute) => SmartMinute) => Promise<SmartMinute>;
  deleteDraft: (id: string) => Promise<void>;
  importSourceText: (id: string, source: MinuteSourceText) => Promise<SmartMinute>;
  refresh: () => Promise<void>;
}

const SmartMeetingContext = createContext<SmartMeetingContextValue | null>(null);

export function SmartMeetingProvider({ children, service }: { children: ReactNode; service?: ISmartMeetingService }) {
  // 用 useRef 稳定化 mock 实例，避免每次渲染新建导致无限循环
  const svcRef = useRef<ISmartMeetingService>(service ?? createMockSmartMeetingService(MOCK_MINUTES));
  const svc = service ?? svcRef.current;

  const [minutes, setMinutes] = useState<SmartMinute[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await svc.listMinutes();
      setMinutes(data);
    } finally {
      setLoading(false);
    }
  }, [svc]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback(
    (id: string) => minutes.find((m) => m.id === id),
    [minutes],
  );

  const createMinute = useCallback(
    async (input: CreateMinuteInput) => {
      const created = await svc.createMinute(input);
      await refresh();
      return created;
    },
    [svc, refresh],
  );

  const updateMinute = useCallback(
    async (id: string, fn: (m: SmartMinute) => SmartMinute) => {
      const updated = await svc.updateMinute(id, fn);
      await refresh();
      return updated;
    },
    [svc, refresh],
  );

  const deleteDraft = useCallback(
    async (id: string) => {
      await svc.deleteDraft(id, '');
      await refresh();
    },
    [svc, refresh],
  );

  const importSourceText = useCallback(
    async (id: string, source: MinuteSourceText) => {
      const updated = await svc.importSourceText(id, source);
      await refresh();
      return updated;
    },
    [svc, refresh],
  );

  return (
    <SmartMeetingContext.Provider
      value={{ minutes, loading, getById, createMinute, updateMinute, deleteDraft, importSourceText, refresh }}
    >
      {children}
    </SmartMeetingContext.Provider>
  );
}

export function useSmartMeeting(): SmartMeetingContextValue {
  const ctx = useContext(SmartMeetingContext);
  if (!ctx) throw new Error('useSmartMeeting must be used within SmartMeetingProvider');
  return ctx;
}
