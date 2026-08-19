// Mock react-quill to avoid 'document is not defined' in non-DOM test environment
import { vi } from 'vitest'
vi.mock('react-quill', () => ({ default: () => null }))
vi.mock('@/app/pages/quotation/QuotationContext', () => ({
  useQuotation: () => ({ currentRole: 'pm', setCurrentRole: () => {} }),
  QuotationProvider: ({ children }: { children: any }) => children,
}))
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReminderItem, SnoozeOptionId } from '../types'
import { getReminderSnoozeOptions } from '../components/ReminderSnoozeMenu'
import {
  buildReminderBellPreviewItems,
  hasDailyReportUnsubmittedReminder,
  ReminderBellDropdownContent,
} from '../components/ReminderBell'
import { getReminderPriorityLabel } from '../components/ReminderTodoPanel'
import { ReminderProvider } from '../ReminderContext'
import { MyLeads, getLeadFollowupReminderBanner } from '@/app/pages/MyLeads'
import { LeadDetail, normalizeLeadReminderId } from '@/app/pages/LeadDetail'
import { ContractsProvider } from '@/app/pages/contracts/ContractsContext'
import { EmployeeProvider } from '@/app/pages/employee'
import { ProjectProvider } from '@/app/pages/project-management/ProjectContext'
import { BusinessCaseProvider } from '@/app/business-case/BusinessCaseContext'

function createReminder(overrides: Partial<ReminderItem> = {}): ReminderItem {
  return {
    id: overrides.id ?? 'reminder-1',
    type: overrides.type ?? 'approval_pending',
    title: overrides.title ?? '审批处理中',
    content: overrides.content ?? '请处理审批',
    sourceId: overrides.sourceId ?? 'source-1',
    sourceType: overrides.sourceType ?? 'approval',
    priority: overrides.priority ?? 'high',
    createdAt: overrides.createdAt ?? '2026-05-22T10:00:00.000Z',
    deadline: overrides.deadline,
    snoozedUntil: overrides.snoozedUntil,
    actionLabel: overrides.actionLabel ?? '查看审批',
    actionTarget: overrides.actionTarget ?? { kind: 'route', path: '/approvals/1' },
  }
}

function renderInReminderRouter(path: string, element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(
      ReminderProvider,
      null,
      createElement(
        ContractsProvider,
        null,
        createElement(
          EmployeeProvider,
          null,
          createElement(
            ProjectProvider,
            null,
            createElement(
              BusinessCaseProvider,
              null,
              createElement(
                MemoryRouter,
                { initialEntries: [path] },
                createElement(
                  Routes,
                  null,
                  createElement(Route, {
                    path: path === '/leads/my' ? '/leads/my' : '/leads/:id',
                    element,
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

function renderReminderBellDropdownMarkup(reminders: ReminderItem[], pendingCount = reminders.length) {
  return renderToStaticMarkup(
    createElement(
      ReminderProvider,
      null,
      createElement(
        MemoryRouter,
        null,
        createElement(ReminderBellDropdownContent, {
          reminders,
          pendingCount,
          onOpenReminder: () => undefined,
          onViewAll: () => undefined,
        }),
      ),
    ),
  )
}

describe('reminder component view models', () => {
  test('getReminderSnoozeOptions returns exactly the three fixed snooze options in order', () => {
    expect(getReminderSnoozeOptions()).toEqual([
      { id: 'one_hour' satisfies SnoozeOptionId, label: '1小时后提醒' },
      { id: 'today_eod' satisfies SnoozeOptionId, label: '今天下班前提醒' },
      { id: 'tomorrow_morning' satisfies SnoozeOptionId, label: '明天上午提醒' },
    ])
  })

  test('buildReminderBellPreviewItems limits dropdown summaries to the first five reminders', () => {
    const reminders = Array.from({ length: 7 }, (_, index) =>
      createReminder({
        id: `reminder-${index + 1}`,
        title: `提醒 ${index + 1}`,
      }),
    )

    const previewItems = buildReminderBellPreviewItems(reminders)

    expect(previewItems).toHaveLength(5)
    expect(previewItems.map((item) => item.id)).toEqual([
      'reminder-1',
      'reminder-2',
      'reminder-3',
      'reminder-4',
      'reminder-5',
    ])
  })

  test('hasDailyReportUnsubmittedReminder returns true only when an unsubmitted daily report reminder exists', () => {
    const reminders = [
      createReminder({ id: 'daily', type: 'daily_report_unsubmitted', sourceType: 'daily_report' }),
      createReminder({ id: 'other', type: 'approval_pending', sourceType: 'approval' }),
    ]

    expect(hasDailyReportUnsubmittedReminder(reminders)).toBe(true)
    expect(
      hasDailyReportUnsubmittedReminder([
        createReminder({ id: 'other-only', type: 'approval_pending', sourceType: 'approval' }),
      ]),
    ).toBe(false)
  })

  test('getReminderPriorityLabel maps reminder priority to readable chinese labels', () => {
    expect(getReminderPriorityLabel('high')).toBe('高优先级')
    expect(getReminderPriorityLabel('medium')).toBe('中优先级')
    expect(getReminderPriorityLabel('low')).toBe('低优先级')
  })

  test('Reminder bell dropdown uses a bordered floating shell instead of a flat panel', () => {
    const reminders = [
      createReminder({
        id: 'approval-1',
        title: '审批处理中',
        content: '请假申请 - 5月25日 正在等待审批结果',
      }),
    ]

    const markup = renderReminderBellDropdownMarkup(reminders, 6)

    expect(markup).toContain('width:360px')
    expect(markup).toContain('border:1px solid var(--color-border-2)')
    expect(markup).toContain('box-shadow:0 8px 24px')
    expect(markup).not.toContain('border:none')
    expect(markup).not.toContain('box-shadow:none')
  })

  test('Reminder bell dropdown renders each reminder as a light card with footer entry intact', () => {
    const reminders = [
      createReminder({
        id: 'lead-1',
        type: 'lead_followup_overdue',
        title: '线索跟进逾期',
        content: 'ABC贸易公司 已逾期19天未跟进',
        sourceType: 'lead',
        actionLabel: '查看线索',
        actionTarget: { kind: 'route', path: '/leads/3' },
      }),
    ]

    const markup = renderReminderBellDropdownMarkup(reminders, 6)

    expect(markup).toContain('background:var(--color-fill-1)')
    expect(markup).toContain('border:1px solid var(--color-border-2)')
    expect(markup).toContain('border-top:1px solid var(--color-border-2)')
    expect(markup).toContain('查看全部待我处理')
  })
})

describe('lead reminder page integrations', () => {
  test('getLeadFollowupReminderBanner returns count and target for overdue lead reminders only', () => {
    const banner = getLeadFollowupReminderBanner([
      createReminder({
        id: 'lead-reminder-1',
        type: 'lead_followup_overdue',
        sourceId: 'lead-3',
        sourceType: 'lead',
        actionTarget: { kind: 'route', path: '/leads/3' },
      }),
      createReminder({
        id: 'approval-reminder',
        type: 'approval_pending',
        sourceType: 'approval',
      }),
      createReminder({
        id: 'lead-reminder-2',
        type: 'lead_followup_overdue',
        sourceId: 'lead-8',
        sourceType: 'lead',
        actionTarget: { kind: 'route', path: '/leads/8' },
      }),
    ])

    expect(banner).toEqual({
      count: 2,
      firstLeadId: 'lead-3',
      firstTargetPath: '/leads/3',
    })
  })

  test('normalizeLeadReminderId maps numeric route ids to reminder lead ids', () => {
    expect(normalizeLeadReminderId(undefined)).toBe('')
    expect(normalizeLeadReminderId('3')).toBe('lead-3')
    expect(normalizeLeadReminderId('lead-3')).toBe('lead-3')
  })

  test('MyLeads shows overdue followup banner with summary text', () => {
    const markup = renderInReminderRouter('/leads/my', createElement(MyLeads))

    expect(markup).toContain('当前有 1 条线索已超时未跟进，请尽快处理。')
  })

  test('LeadDetail shows overdue banner when current lead has active reminder', () => {
    const markup = renderInReminderRouter('/leads/3', createElement(LeadDetail))

    expect(markup).toContain('该线索已超过跟进时间且尚未填写新的跟进记录，请优先处理。')
  })

  test('LeadDetail hides overdue banner when current lead has no active reminder', () => {
    const markup = renderInReminderRouter('/leads/1', createElement(LeadDetail))

    expect(markup).not.toContain('该线索已超过跟进时间且尚未填写新的跟进记录，请优先处理。')
  })
})
