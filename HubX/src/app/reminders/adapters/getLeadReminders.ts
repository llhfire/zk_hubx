import type { ReminderItem } from '../types'
import { isLeadOverdue, getLeadReminderPriority } from '../utils'
import type { Lead, ReminderData } from '../mockData'

export function getLeadReminders(data: ReminderData, now: Date = new Date()): ReminderItem[] {
  return data.leads
    .filter((lead: Lead) => isLeadOverdue(lead, now))
    .map((lead: Lead): ReminderItem => {
      const daysOverdue =
        lead.nextFollowupTime
          ? Math.floor((now.getTime() - new Date(lead.nextFollowupTime).getTime()) / (24 * 60 * 60 * 1000))
          : 0

      return {
        id: lead.id,
        type: 'lead_followup_overdue',
        title: '线索跟进逾期',
        content: daysOverdue > 0
          ? `${lead.name} 已逾期 ${daysOverdue} 天未跟进`
          : `${lead.name} 需立即跟进`,
        sourceId: lead.id,
        sourceType: 'lead',
        priority: getLeadReminderPriority(),
        createdAt: lead.assignedAt ?? now.toISOString(),
        actionLabel: '查看线索',
        actionTarget: {
          kind: 'route',
          path: `/leads/${lead.id}`,
        },
      }
    })
}