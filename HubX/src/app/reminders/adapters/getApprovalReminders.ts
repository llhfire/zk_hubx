import type { ReminderItem } from '../types'
import type { Approval, ReminderData } from '../mockData'

function buildApprovalPendingReminder(approval: Approval): ReminderItem {
  return {
    id: `${approval.id}-pending`,
    type: 'approval_pending',
    title: '审批处理中',
    content: `${approval.title} 正在等待审批结果`,
    sourceId: approval.id,
    sourceType: 'approval',
    priority: 'high',
    createdAt: approval.createdAt,
    deadline: new Date(new Date(approval.createdAt).getTime() + 60 * 60 * 1000).toISOString(),
    actionLabel: '查看审批',
    actionTarget: {
      kind: 'route',
      path: approval.route,
    },
  }
}

function buildApprovalResultReminder(approval: Approval): ReminderItem {
  return {
    id: `${approval.id}-result`,
    type: 'approval_result',
    title: '审批结果已更新',
    content: `${approval.title} 已${approval.status === 'approved' ? '通过' : '驳回'}`,
    sourceId: approval.id,
    sourceType: 'approval',
    priority: 'low',
    createdAt: approval.updatedAt ?? approval.createdAt,
    deadline: approval.updatedAt ?? approval.createdAt,
    actionLabel: '查看结果',
    actionTarget: {
      kind: 'route',
      path: approval.route,
    },
  }
}

export function getApprovalReminders(data: ReminderData): ReminderItem[] {
  return data.approvals.flatMap((approval) => {
    if (approval.userId !== data.currentUserId) {
      return []
    }

    if (approval.status === 'pending') {
      return [buildApprovalPendingReminder(approval)]
    }

    if (approval.status === 'approved' || approval.status === 'rejected') {
      return [buildApprovalResultReminder(approval)]
    }

    return []
  })
}
