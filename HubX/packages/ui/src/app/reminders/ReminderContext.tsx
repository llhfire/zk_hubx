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

interface ReminderContextValue {
  reminders: ReminderItem[]
  pendingCount: number
  dailyReports: DailyReport[]
  submitDailyReport: (report: DailyReport) => void
  snoozeReminder: (id: string, option: SnoozeOptionId) => void
  isLeadReminderActive: (leadId: string) => boolean
}

const ReminderContext = createContext<ReminderContextValue | null>(null)

export function ReminderProvider({ children }: PropsWithChildren) {
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

  const reminders = useMemo(() => buildReminders(data, now), [data, now])

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

  const value = useMemo<ReminderContextValue>(
    () => ({
      reminders,
      pendingCount: reminders.length,
      dailyReports: data.dailyReports,
      submitDailyReport,
      snoozeReminder,
      isLeadReminderActive,
    }),
    [data.dailyReports, isLeadReminderActive, reminders, snoozeReminder, submitDailyReport],
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
