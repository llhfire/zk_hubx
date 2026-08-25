/**
 * 线索派发域演示种子（纯函数）
 *
 * 存量 mock 线索没有派发字段（businessLine/dispatchedAt/leadEvents 等），
 * 这里在 LeadDispatchContext 内做确定性增强（按索引轮换），不落回 mockData，
 * 也不建第二套线索数据（ADR-0096：工作台是同一 Lead 实体的获客侧视图）。
 * 新录入的线索自带派发字段（businessLine 已设），不会被再次覆盖。
 */

import type { LeadListItem } from '@/app/pages/leads/types';
import type { LeadBusinessLine, LeadEvent } from './types';

const BUSINESS_LINE_CYCLE: LeadBusinessLine[] = ['software_outsource', 'immigration', 'operation'];

/** 'YYYY-MM-DD HH:mm' + 分钟 */
export function shiftMinutes(time: string, minutes: number): string {
  const d = new Date(time);
  d.setMinutes(d.getMinutes() + minutes);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let eventSeq = 0;
function makeEvent(leadId: string, kind: LeadEvent['kind'], actor: string, at: string, extra: Partial<LeadEvent> = {}): LeadEvent {
  eventSeq += 1;
  return {
    id: `evt-seed-${eventSeq}`,
    leadId,
    kind,
    actor,
    at,
    ...extra,
  };
}

/**
 * 给线索列表补齐派发域字段（确定性，按索引轮换）：
 * - businessLine 三值轮换
 * - 已分配线索：录入后 5 分钟派发给销售
 * - 公海线索：三分之一派发到公海（待领取），其余待派发
 * - 第一条已分配线索带一条待审核的降级事件（等级审核演示）
 * - 第一条公海待派发线索带 3 人退回（质检分桶演示）
 */
export function withDispatchSeed(leads: LeadListItem[]): LeadListItem[] {
  let assignedSeen = 0;
  let publicSeen = 0;

  return leads
    .filter((l) => l.clueType !== 'trash')
    .map((lead, idx) => {
      // 新录入线索自带派发字段，不覆盖
      if (lead.businessLine) return lead;

      const events: LeadEvent[] = [
        makeEvent(lead.id, 'inbound', '推广-张三', lead.createTime),
      ];
      const patch: Partial<LeadListItem> = {
        businessLine: BUSINESS_LINE_CYCLE[idx % BUSINESS_LINE_CYCLE.length],
      };

      if (lead.clueType === 'assigned') {
        assignedSeen += 1;
        const dispatchedAt = shiftMinutes(lead.createTime, 5);
        patch.dispatchedAt = dispatchedAt;
        patch.dispatchTarget = 'sales';
        events.push(makeEvent(lead.id, 'dispatch_to_sales', '推广-张三', dispatchedAt, { assignee: lead.owner }));
        // 第一条已分配线索：降级待审核（S->B，无审核结果事件）
        if (assignedSeen === 1 && lead.customerLevel === 'S') {
          events.push(makeEvent(lead.id, 'level_change', lead.owner, shiftMinutes(lead.createTime, 60), { levelFrom: 'S', levelTo: 'B' }));
        } else if (assignedSeen === 1) {
          events.push(makeEvent(lead.id, 'level_change', lead.owner, shiftMinutes(lead.createTime, 60), { levelFrom: 'A', levelTo: 'B' }));
        }
      } else {
        publicSeen += 1;
        if (publicSeen % 3 === 2) {
          // 派发到公海：待领取
          const dispatchedAt = shiftMinutes(lead.createTime, 10);
          patch.dispatchedAt = dispatchedAt;
          patch.dispatchTarget = 'pool';
          events.push(makeEvent(lead.id, 'dispatch_to_pool', '推广-张三', dispatchedAt));
          // 第一条公海线索：3 个不同销售退回 -> 质检待确认
          if (publicSeen === 2) {
            for (const actor of ['李四', '王五', '赵六']) {
              events.push(makeEvent(lead.id, 'return', actor, shiftMinutes(lead.createTime, 120), { reason: '客户需求不匹配' }));
            }
          }
        }
        // 其余公海线索：待派发（无 dispatchedAt）
      }

      patch.leadEvents = events;
      return { ...lead, ...patch };
    });
}
