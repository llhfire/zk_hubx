import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { DailyReport } from '@/app/pages/daily-report/types'
import { buildReminders } from './buildReminders'
import { mockReminderData, type ReminderData } from './mockData'
import type { ReminderItem, SnoozeOptionId } from './types'
import { resolveSnoozeUntil } from './utils'
import { useOptionalCustomers } from '@/app/pages/customers/CustomerContext'
import { useOptionalContracts } from '@/app/pages/contracts/ContractsContext'
import { getSalesOpportunityReminders } from './adapters/getSalesOpportunityReminders'
import { readSalesBusinessConfig } from '@/app/pages/systemConfigStore'
import { useOptionalTodos } from '@/app/todos/TodoContext'

interface ReminderContextValue {
  reminders: ReminderItem[]
  pendingCount: number
  dailyReports: DailyReport[]
  submitDailyReport: (report: DailyReport) => void
  snoozeReminder: (id: string, option: SnoozeOptionId) => void
  isLeadReminderActive: (leadId: string) => boolean
  convertReminderToTodo: (id: string) => void
}

const ReminderContext = createContext<ReminderContextValue | null>(null)

export function ReminderProvider({ children }: PropsWithChildren) {
  const customersContext = useOptionalCustomers()
  const contractsContext = useOptionalContracts()
  const todosContext = useOptionalTodos()
  const customers = customersContext?.customers ?? []
  const contracts = contractsContext?.contracts ?? []
  const [data, setData] = useState<ReminderData>(mockReminderData)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 60 * 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const reminders = useMemo(() => {
    const base = buildReminders(data, now)
    const sales = getSalesOpportunityReminders(customers, contracts, readSalesBusinessConfig(), now).map((item) => ({ ...item, snoozedUntil: data.snoozedReminders[item.id] }))
    return [...base, ...sales].filter((item) => !item.snoozedUntil || new Date(item.snoozedUntil) <= now)
  }, [contracts, customers, data, now])

  const submitDailyReport = useCallback((report: DailyReport) => {
    setData((current) => ({
      ...current,
      dailyReports: [...current.dailyReports, report],
    }))
  }, [])

  const snoozeReminder = useCallback((id: string, option: SnoozeOptionId) => {
    const snoozedUntil = resolveSnoozeUntil(new Date(), option).toISOString()

    setData((current) => ({
      ...current,
      snoozedReminders: {
        ...current.snoozedReminders,
        [id]: snoozedUntil,
      },
    }))
    setNow(new Date())
  }, [])

  const isLeadReminderActive = useCallback(
    (leadId: string) => {
      return reminders.some(
        (reminder) => reminder.type === 'lead_followup_overdue' && reminder.sourceId === leadId,
      )
    },
    [reminders],
  )

  const convertReminderToTodo = useCallback((id: string) => {
    const reminder = reminders.find((item) => item.id === id)
    if (!reminder) return
    const route = reminder.actionTarget.kind === 'route' ? reminder.actionTarget.path : '/workbench'
    todosContext?.upsertActiveTodo({
      id: `todo-reminder-${id}`,
      source: 'sales_opportunity',
      sourceId: `reminder:${id}`,
      module: '销售机会',
      title: reminder.title,
      content: reminder.content ?? '由销售机会提醒转为待办。',
      assigneeId: 'user-sales-zhangsan',
      assigneeName: '张三',
      status: 'pending',
      priority: reminder.priority,
      createdAt: new Date().toISOString(),
      deadline: reminder.deadline,
      route,
    })
  }, [reminders, todosContext])

  const value = useMemo<ReminderContextValue>(
    () => ({
      reminders,
      pendingCount: reminders.length,
      dailyReports: data.dailyReports,
      submitDailyReport,
      snoozeReminder,
      isLeadReminderActive,
      convertReminderToTodo,
    }),
    [convertReminderToTodo, data.dailyReports, isLeadReminderActive, reminders, snoozeReminder, submitDailyReport],
  )

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>
}

export function useReminders(): ReminderContextValue {
  const context = useContext(ReminderContext)

  if (!context) {
    throw new Error('useReminders must be used within ReminderProvider')
  }

  return context
}
