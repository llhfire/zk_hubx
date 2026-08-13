import { describe, expect, test } from 'vitest'
import {
  filterVisibleReminders,
  getLeadReminderPriority,
  isLeadOverdue,
  resolveSnoozeUntil,
  sortReminders,
} from '../utils'
import type { LeadReminderCandidate, ReminderItem, SnoozeOptionId } from '../types'

describe('getLeadReminderPriority', () => {
  test('returns high priority for lead reminders', () => {
    expect(getLeadReminderPriority()).toBe('high')
  })
})

describe('isLeadOverdue', () => {
  test('uses nextFollowupTime as the primary overdue signal', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const candidate: LeadReminderCandidate = {
      id: 'lead-1',
      assignedAt: '2026-05-20T11:00:00.000Z',
      nextFollowupTime: '2026-05-22T11:59:00.000Z',
      lastFollowupAt: '2026-05-22T11:30:00.000Z',
    }

    expect(isLeadOverdue(candidate, now)).toBe(true)
  })

  test('falls back to lastFollowupAt when nextFollowupTime is absent', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const candidate: LeadReminderCandidate = {
      id: 'lead-2',
      assignedAt: '2026-05-21T11:00:00.000Z',
      lastFollowupAt: '2026-05-20T11:59:59.000Z',
    }

    expect(isLeadOverdue(candidate, now)).toBe(true)
  })

  test('falls back to secondary fields when the primary timestamp is invalid', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const candidate: LeadReminderCandidate = {
      id: 'lead-invalid-primary',
      nextFollowupTime: 'invalid-next-followup',
      lastFollowupAt: '2026-05-20T11:59:59.000Z',
    }

    expect(isLeadOverdue(candidate, now)).toBe(true)
  })

  test('returns false when all available timestamps are invalid or missing', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const candidate: LeadReminderCandidate = {
      id: 'lead-invalid-all',
      nextFollowupTime: 'invalid-next-followup',
      lastFollowupAt: 'invalid-last-followup',
      assignedAt: 'invalid-assigned-at',
    }

    expect(isLeadOverdue(candidate, now)).toBe(false)
  })

  test('returns false when assignedAt is missing and no other time fields are present', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const candidate: LeadReminderCandidate = {
      id: 'lead-3',
    }

    expect(isLeadOverdue(candidate, now)).toBe(false)
  })
})

describe('resolveSnoozeUntil', () => {
  test('adds exactly one hour for one_hour', () => {
    const now = new Date('2026-05-22T12:15:00.000Z')
    const result = resolveSnoozeUntil(now, 'one_hour')

    expect(Number.isNaN(result.getTime())).toBe(false)
    expect(result.getTime() - now.getTime()).toBe(60 * 60 * 1000)
  })

  test.each<{
    option: Extract<SnoozeOptionId, 'today_eod' | 'tomorrow_morning'>
    expectedLocalHour: number
    expectedLocalMinute: number
    expectedDayOffset: number
  }>([
    { option: 'today_eod', expectedLocalHour: 18, expectedLocalMinute: 0, expectedDayOffset: 0 },
    { option: 'tomorrow_morning', expectedLocalHour: 9, expectedLocalMinute: 0, expectedDayOffset: 1 },
  ])(
    'resolves $option with local clock semantics',
    ({ option, expectedLocalHour, expectedLocalMinute, expectedDayOffset }) => {
      const now = new Date('2026-05-22T12:15:00.000Z')
      const result = resolveSnoozeUntil(now, option)

      expect(Number.isNaN(result.getTime())).toBe(false)
      expect(result.getHours()).toBe(expectedLocalHour)
      expect(result.getMinutes()).toBe(expectedLocalMinute)
      expect(result.getFullYear()).toBe(now.getFullYear())
      expect(result.getMonth()).toBe(now.getMonth())
      expect(result.getDate()).toBe(now.getDate() + expectedDayOffset)
    },
  )
})

describe('sortReminders', () => {
  test('sorts by priority, then earliest deadline, then latest createdAt', () => {
    const reminders: ReminderItem[] = [
      makeReminder({
        id: 'low-1',
        priority: 'low',
        deadline: '2026-05-22T08:00:00.000Z',
        createdAt: '2026-05-22T07:00:00.000Z',
      }),
      makeReminder({
        id: 'medium-1',
        priority: 'medium',
        deadline: '2026-05-22T07:00:00.000Z',
        createdAt: '2026-05-22T06:00:00.000Z',
      }),
      makeReminder({
        id: 'high-late-created',
        priority: 'high',
        deadline: '2026-05-22T09:00:00.000Z',
        createdAt: '2026-05-22T08:00:00.000Z',
      }),
      makeReminder({
        id: 'high-early-deadline',
        priority: 'high',
        deadline: '2026-05-22T08:30:00.000Z',
        createdAt: '2026-05-22T06:30:00.000Z',
      }),
      makeReminder({
        id: 'high-same-deadline-newer',
        priority: 'high',
        deadline: '2026-05-22T09:00:00.000Z',
        createdAt: '2026-05-22T09:00:00.000Z',
      }),
    ]

    expect(sortReminders(reminders).map((item) => item.id)).toEqual([
      'high-early-deadline',
      'high-same-deadline-newer',
      'high-late-created',
      'medium-1',
      'low-1',
    ])
  })

  test('treats invalid deadline as Infinity — pushed to end of same priority', () => {
    const reminders: ReminderItem[] = [
      makeReminder({
        id: 'invalid-deadline-str',
        priority: 'high',
        deadline: 'not-a-date',
        createdAt: '2026-05-22T07:00:00.000Z',
      }),
      makeReminder({
        id: 'missing-deadline',
        priority: 'high',
        createdAt: '2026-05-22T08:00:00.000Z',
      }),
      makeReminder({
        id: 'valid-deadline',
        priority: 'high',
        deadline: '2026-05-22T08:00:00.000Z',
        createdAt: '2026-05-22T06:00:00.000Z',
      }),
    ]

    expect(sortReminders(reminders).map((item) => item.id)).toEqual([
      'valid-deadline',
      'missing-deadline',
      'invalid-deadline-str',
    ])
  })

  test('treats invalid createdAt as 0 — oldest, sorted last within same deadline', () => {
    const reminders: ReminderItem[] = [
      makeReminder({
        id: 'invalid-created-str',
        priority: 'high',
        deadline: '2026-05-22T08:00:00.000Z',
        createdAt: 'invalid-created',
      }),
      makeReminder({
        id: 'missing-created',
        priority: 'high',
        deadline: '2026-05-22T08:00:00.000Z',
        createdAt: '',
      }),
      makeReminder({
        id: 'valid-created',
        priority: 'high',
        deadline: '2026-05-22T08:00:00.000Z',
        createdAt: '2026-05-22T06:00:00.000Z',
      }),
    ]

    expect(sortReminders(reminders).map((item) => item.id)).toEqual([
      'valid-created',
      'invalid-created-str',
      'missing-created',
    ])
  })

  test('stable order when all deadlines are invalid', () => {
    const reminders: ReminderItem[] = [
      makeReminder({ id: 'a', priority: 'low' }),
      makeReminder({ id: 'b', priority: 'high' }),
      makeReminder({ id: 'c', priority: 'low' }),
    ]

    const result = sortReminders(reminders).map((item) => item.id)
    expect(result).toEqual(['b', 'a', 'c'])
  })

  test('path in route actionTarget uses route-style string (e.g. /leads/my)', () => {
    const reminder = makeReminder({
      id: 'route-test',
      actionTarget: {
        kind: 'route',
        path: '/leads/my',
      },
    })

    expect(reminder.actionTarget.kind).toBe('route')
    expect((reminder.actionTarget as { kind: 'route'; path: string }).path).toMatch(/^\//)
  })
})

describe('filterVisibleReminders', () => {
  test('filters out reminders snoozed into the future', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const reminders: ReminderItem[] = [
      makeReminder({ id: 'visible', snoozedUntil: '2026-05-22T11:59:59.000Z' }),
      makeReminder({ id: 'hidden', snoozedUntil: '2026-05-22T12:00:01.000Z' }),
      makeReminder({ id: 'unsnoozed' }),
    ]

    expect(filterVisibleReminders(reminders, now).map((item) => item.id)).toEqual([
      'visible',
      'unsnoozed',
    ])
  })

  test('treats reminders with invalid snoozedUntil as visible (fail-open)', () => {
    const now = new Date('2026-05-22T12:00:00.000Z')
    const reminders: ReminderItem[] = [
      makeReminder({ id: 'invalid-snooze', snoozedUntil: 'not-a-date' }),
      makeReminder({ id: 'empty-snooze', snoozedUntil: '' }),
      makeReminder({ id: 'valid-snooze-hidden', snoozedUntil: '2099-01-01T00:00:00.000Z' }),
    ]

    const result = filterVisibleReminders(reminders, now).map((item) => item.id)
    expect(result).toContain('invalid-snooze')
    expect(result).toContain('empty-snooze')
    expect(result).not.toContain('valid-snooze-hidden')
  })
})

function makeReminder(overrides: Partial<ReminderItem> & Pick<ReminderItem, 'id'>): ReminderItem {
  return {
    id: overrides.id,
    type: 'lead_followup_overdue',
    priority: 'medium',
    sourceType: 'lead',
    sourceId: 'lead-source',
    title: 'Reminder',
    content: 'message',
    createdAt: '2026-05-22T00:00:00.000Z',
    actionLabel: '打开线索',
    actionTarget: {
      kind: 'route',
      path: '/leads/my',
    },
    ...overrides,
  }
}
