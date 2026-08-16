import { filterVisibleReminders, sortReminders } from './utils'
import type { ReminderItem } from './types'
import type { ReminderData } from './mockData'
import { getApprovalReminders } from './adapters/getApprovalReminders'
import { getContractReminders } from './adapters/getContractReminders'
import { getDailyReportReminders } from './adapters/getDailyReportReminders'
import { getLeadReminders } from './adapters/getLeadReminders'

export function buildReminders(data: ReminderData, now: Date = new Date()): ReminderItem[] {
  const reminders = [
    ...getApprovalReminders(data),
    ...getDailyReportReminders(data, now),
    ...getLeadReminders(data, now),
    ...getContractReminders(data, now),
  ].map((item) => ({
    ...item,
    snoozedUntil: data.snoozedReminders[item.id],
  }))

  return sortReminders(filterVisibleReminders(reminders, now))
}
