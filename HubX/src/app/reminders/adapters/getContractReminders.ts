import type { ReminderItem } from '../types'
import type { Contract, ReminderData } from '../mockData'

const EXPIRY_WINDOW_DAYS = 7
const MAIL_OVERDUE_DAYS = 7
const DRAFT_STALE_DAYS = 7

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getLocalDayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function getContractReminders(data: ReminderData, now: Date = new Date()): ReminderItem[] {
  const currentDayStart = getLocalDayStart(now)
  const cutoffDayStart = getLocalDayStart(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + EXPIRY_WINDOW_DAYS),
  )

  const result: ReminderItem[] = []

  data.contracts.forEach((contract: Contract) => {
    // 1. 即将到期：原有逻辑保留（仅对履约中的合同生效）
    if (contract.status === 'active') {
      const expireDayStart = getLocalDayStart(new Date(contract.expireDate))
      if (expireDayStart >= currentDayStart && expireDayStart <= cutoffDayStart) {
        const daysLeft = Math.round((expireDayStart - currentDayStart) / ONE_DAY_MS)
        result.push({
          id: contract.id,
          type: 'contract_expiring',
          title: '合同即将到期',
          content: `${contract.name} 将在 ${daysLeft <= 0 ? '今天' : `${daysLeft} 天后`} 到期`,
          sourceId: contract.id,
          sourceType: 'contract',
          priority: 'medium',
          createdAt: contract.signingDate,
          deadline: contract.expireDate,
          actionLabel: '查看合同',
          actionTarget: {
            kind: 'route',
            path: `/contracts/${contract.id}`,
          },
        })
      }
    }

    // 2. 客户回寄超期：pending_return 状态 + mailedAt 早于 7 天
    if (contract.status === 'pending_return' && contract.mailedAt) {
      const mailedDate = new Date(contract.mailedAt)
      const daysSinceMailed = Math.round(
        (currentDayStart - getLocalDayStart(mailedDate)) / ONE_DAY_MS,
      )
      if (daysSinceMailed >= MAIL_OVERDUE_DAYS) {
        result.push({
          id: `${contract.id}-mail-overdue`,
          type: 'contract_mail_overdue',
          title: '客户回寄超期',
          content: `${contract.name} 已寄出 ${daysSinceMailed} 天仍未收到客户回寄盖章件，请联系客户跟进`,
          sourceId: contract.id,
          sourceType: 'contract',
          priority: 'high',
          createdAt: contract.mailedAt,
          actionLabel: '查看合同',
          actionTarget: {
            kind: 'route',
            path: `/contracts/${contract.id}`,
          },
        })
      }
    }

    // 3. 草稿停留过久：draft 状态 + createdAt 早于 7 天
    if (contract.status === 'draft' && contract.createdAt) {
      const createdDate = new Date(contract.createdAt)
      const daysSinceCreated = Math.round(
        (currentDayStart - getLocalDayStart(createdDate)) / ONE_DAY_MS,
      )
      if (daysSinceCreated >= DRAFT_STALE_DAYS) {
        result.push({
          id: `${contract.id}-draft-stale`,
          type: 'contract_draft_stale',
          title: '合同草稿停留过久',
          content: `${contract.name} 已创建 ${daysSinceCreated} 天仍处于草稿状态，请尽快完善并提交审批`,
          sourceId: contract.id,
          sourceType: 'contract',
          priority: 'medium',
          createdAt: contract.createdAt,
          actionLabel: '查看合同',
          actionTarget: {
            kind: 'route',
            path: `/contracts/${contract.id}`,
          },
        })
      }
    }
  })

  return result
}
