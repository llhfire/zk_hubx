import type { ReminderItem } from '../types'
import type { DailyReport, DailyReportComment } from '@/app/pages/daily-report/types'
import type { ReminderData } from '../mockData'

function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hasSubmittedDailyReport(currentUserId: string, dailyReports: DailyReport[], now: Date): boolean {
  const today = getLocalDateString(now)

  return dailyReports.some((report) => {
    return report.userId === currentUserId && report.reportDate === today && report.status !== 'draft'
  })
}

function buildUnsubmittedReminder(currentUserId: string, now: Date): ReminderItem | null {
  if (now.getHours() < 18) {
    return null
  }

  return {
    id: `daily-report-unsubmitted-${currentUserId}-${getLocalDateString(now)}`,
    type: 'daily_report_unsubmitted',
    title: '今日日报未提交',
    content: '请尽快提交今天的日报',
    sourceId: currentUserId,
    sourceType: 'daily_report',
    priority: 'high',
    createdAt: now.toISOString(),
    deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
    actionLabel: '提交日报',
    actionTarget: {
      kind: 'modal',
      modal: 'daily-report',
    },
  }
}

function buildCommentReminder(comment: DailyReportComment): ReminderItem {
  return {
    id: `${comment.id}-comment`,
    type: 'daily_report_comment',
    title: '日报收到新评论',
    content: `${comment.userName} 评论了你的日报`,
    sourceId: comment.reportId,
    sourceType: 'daily_report',
    priority: 'low',
    createdAt: comment.createdAt,
    deadline: new Date(new Date(comment.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    actionLabel: '查看日报',
    actionTarget: {
      kind: 'route',
      path: '/dailyreport/view',
      params: {
        reportId: comment.reportId,
      },
    },
  }
}

function buildMentionReminder(comment: DailyReportComment): ReminderItem {
  return {
    id: `${comment.id}-mention`,
    type: 'daily_report_mention',
    title: '你在日报评论中被提及',
    content: `${comment.userName} 在日报评论中提到了你`,
    sourceId: comment.reportId,
    sourceType: 'daily_report',
    priority: 'low',
    createdAt: comment.createdAt,
    deadline: new Date(new Date(comment.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    actionLabel: '查看提及',
    actionTarget: {
      kind: 'route',
      path: '/dailyreport/view',
      params: {
        reportId: comment.reportId,
      },
    },
  }
}

function belongsToCurrentUsersReport(
  currentUserId: string,
  dailyReports: DailyReport[],
  comment: DailyReportComment,
): boolean {
  return dailyReports.some(
    (report) => report.id === comment.reportId && report.userId === currentUserId,
  )
}

export function getDailyReportReminders(data: ReminderData, now: Date = new Date()): ReminderItem[] {
  const reminders: ReminderItem[] = []

  if (!hasSubmittedDailyReport(data.currentUserId, data.dailyReports, now)) {
    const unsubmittedReminder = buildUnsubmittedReminder(data.currentUserId, now)
    if (unsubmittedReminder) {
      reminders.push(unsubmittedReminder)
    }
  }

  data.dailyComments.forEach((comment) => {
    if (comment.userId === data.currentUserId || comment.readBy.includes(data.currentUserId)) {
      return
    }

    if (comment.mentionedUsers.includes(data.currentUserId)) {
      reminders.push(buildMentionReminder(comment))
      return
    }

    if (belongsToCurrentUsersReport(data.currentUserId, data.dailyReports, comment)) {
      reminders.push(buildCommentReminder(comment))
    }
  })

  return reminders
}
