export type ReminderType =
  | 'daily_report_unsubmitted'
  | 'daily_report_comment'
  | 'daily_report_mention'
  | 'approval_pending'
  | 'approval_result'
  | 'contract_expiring'
  | 'contract_mail_overdue'
  | 'contract_draft_stale'
  | 'lead_followup_overdue'

export type ReminderPriority = 'high' | 'medium' | 'low'

export type ReminderSourceType = 'daily_report' | 'approval' | 'contract' | 'lead'

export type SnoozeOptionId = 'one_hour' | 'today_eod' | 'tomorrow_morning'

export type ReminderActionTarget =
  | {
      kind: 'route'
      path: `/${string}`
      modal?: never
      params?: Record<string, string>
    }
  | {
      kind: 'modal'
      modal: 'daily-report'
      path?: never
      params?: Record<string, string>
    }

export interface ReminderItem {
  id: string
  type: ReminderType
  title: string
  content?: string
  sourceId: string
  sourceType: ReminderSourceType
  priority: ReminderPriority
  createdAt: string
  deadline?: string
  snoozedUntil?: string
  actionLabel: string
  actionTarget: ReminderActionTarget
}

export interface LeadReminderCandidate {
  id?: string
  nextFollowupTime?: string
  lastFollowupAt?: string
  assignedAt?: string
}
