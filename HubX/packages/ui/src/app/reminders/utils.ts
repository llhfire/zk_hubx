import type {
  LeadReminderCandidate,
  ReminderItem,
  ReminderPriority,
  SnoozeOptionId,
} from './types'

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

const PRIORITY_WEIGHT: Record<ReminderPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

export function getLeadReminderPriority(): ReminderPriority {
  return 'high'
}

function parseValidTime(value?: string): number | null {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function isLeadOverdue(
  candidate: LeadReminderCandidate,
  now: Date = new Date(),
): boolean {
  const nextFollowupTime = parseValidTime(candidate.nextFollowupTime)
  if (nextFollowupTime !== null) {
    return nextFollowupTime <= now.getTime()
  }

  const lastFollowupAt = parseValidTime(candidate.lastFollowupAt)
  if (lastFollowupAt !== null) {
    return now.getTime() - lastFollowupAt > FORTY_EIGHT_HOURS_MS
  }

  const assignedAt = parseValidTime(candidate.assignedAt)
  if (assignedAt === null) {
    return false
  }

  return now.getTime() - assignedAt > FORTY_EIGHT_HOURS_MS
}

export function resolveSnoozeUntil(now: Date, option: SnoozeOptionId): Date {
  if (option === 'one_hour') {
    return new Date(now.getTime() + 60 * 60 * 1000)
  }

  const target = new Date(now.getTime())

  if (option === 'today_eod') {
    target.setHours(18, 0, 0, 0)
    return target
  }

  target.setDate(target.getDate() + 1)
  target.setHours(9, 0, 0, 0)
  return target
}

export function sortReminders(reminders: ReminderItem[]): ReminderItem[] {
  return [...reminders].sort((left, right) => {
    const priorityDiff = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority]
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    const leftDeadline = parseValidTime(left.deadline) ?? Number.POSITIVE_INFINITY
    const rightDeadline = parseValidTime(right.deadline) ?? Number.POSITIVE_INFINITY
    if (leftDeadline !== rightDeadline) {
      return leftDeadline - rightDeadline
    }

    const leftCreatedAt = parseValidTime(left.createdAt) ?? 0
    const rightCreatedAt = parseValidTime(right.createdAt) ?? 0
    return rightCreatedAt - leftCreatedAt
  })
}

export function filterVisibleReminders(
  reminders: ReminderItem[],
  now: Date = new Date(),
): ReminderItem[] {
  return reminders.filter((reminder) => {
    const snoozedUntil = parseValidTime(reminder.snoozedUntil)
    if (snoozedUntil === null) {
      return true
    }

    return snoozedUntil <= now.getTime()
  })
}
