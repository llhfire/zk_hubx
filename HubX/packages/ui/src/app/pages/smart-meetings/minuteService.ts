/** ISmartMeetingService 接口 + α mock/localStorage 实现 */

import type {
  SmartMinute,
  MinuteSourceText,
} from './types';

/** 创建纪要输入 */
export interface CreateMinuteInput {
  title: string;
  meetingTime: string;
  organizerId: string;
  reviewerId: string;
  attendeeIds: string[];
}

/** 智能会议服务接口 */
export interface ISmartMeetingService {
  listMinutes(): Promise<SmartMinute[]>;
  getMinute(id: string): Promise<SmartMinute | null>;
  createMinute(input: CreateMinuteInput): Promise<SmartMinute>;
  updateMinute(id: string, fn: (m: SmartMinute) => SmartMinute): Promise<SmartMinute>;
  deleteDraft(id: string, actorId: string): Promise<void>;
  importSourceText(id: string, source: MinuteSourceText): Promise<SmartMinute>;
}

const STORAGE_KEY = 'smart-meetings/v1';

/** α mock 实现：种子数据 + localStorage 持久化 */
export function createMockSmartMeetingService(
  initialData: SmartMinute[] = [],
): ISmartMeetingService {
  let minutes: SmartMinute[] = loadFromStorage() ?? initialData;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minutes));
    } catch {
      // storage full, ignore
    }
  }

  function loadFromStorage(): SmartMinute[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SmartMinute[];
    } catch {
      return null;
    }
  }

  return {
    async listMinutes() {
      return [...minutes];
    },

    async getMinute(id: string) {
      return minutes.find(m => m.id === id) ?? null;
    },

    async createMinute(input: CreateMinuteInput) {
      const now = new Date().toISOString();
      const minute: SmartMinute = {
        id: `minute_${Date.now()}`,
        title: input.title,
        meetingTime: input.meetingTime,
        organizerId: input.organizerId,
        reviewerId: input.reviewerId,
        attendeeIds: input.attendeeIds,
        status: 'draft',
        refs: [],
        coreDecisions: [],
        contentMarkdown: '',
        actionItems: [],
        source: null,
        versions: [],
        adminSource: null,
        polishPreview: null,
        createdAt: now,
        updatedAt: now,
      };
      minutes = [...minutes, minute];
      persist();
      return minute;
    },

    async updateMinute(id: string, fn: (m: SmartMinute) => SmartMinute) {
      const idx = minutes.findIndex(m => m.id === id);
      if (idx === -1) throw new Error(`纪要 ${id} 不存在`);
      const updated = fn(minutes[idx]);
      minutes = [...minutes.slice(0, idx), updated, ...minutes.slice(idx + 1)];
      persist();
      return updated;
    },

    async deleteDraft(id: string, actorId: string) {
      const idx = minutes.findIndex(m => m.id === id);
      if (idx === -1) return;
      if (minutes[idx].status !== 'draft') {
        throw new Error('只能删除草稿');
      }
      minutes = [...minutes.slice(0, idx), ...minutes.slice(idx + 1)];
      persist();
    },

    async importSourceText(id: string, source: MinuteSourceText) {
      const idx = minutes.findIndex(m => m.id === id);
      if (idx === -1) throw new Error(`纪要 ${id} 不存在`);
      const updated = { ...minutes[idx], source, updatedAt: new Date().toISOString() };
      minutes = [...minutes.slice(0, idx), updated, ...minutes.slice(idx + 1)];
      persist();
      return updated;
    },
  };
}
