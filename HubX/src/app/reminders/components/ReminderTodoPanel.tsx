import { Button, Card, Empty, Space, Tag, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router';
import { useReminders } from '../ReminderContext';
import type { ReminderItem, ReminderPriority } from '../types';
import { ReminderSnoozeMenu } from './ReminderSnoozeMenu';

const Text = Typography.Text;
const Paragraph = Typography.Paragraph;

const PRIORITY_LABEL_MAP: Record<ReminderPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const PRIORITY_COLOR_MAP: Record<ReminderPriority, 'red' | 'orange' | 'arcoblue'> = {
  high: 'red',
  medium: 'orange',
  low: 'arcoblue',
};

export function getReminderPriorityLabel(priority: ReminderPriority): string {
  return PRIORITY_LABEL_MAP[priority];
}

interface ReminderTodoPanelProps {
  onOpenDailyReport: () => void;
}

export function ReminderTodoPanel({ onOpenDailyReport }: ReminderTodoPanelProps) {
  const navigate = useNavigate();
  const { reminders } = useReminders();

  const openReminder = (reminder: ReminderItem) => {
    if (reminder.actionTarget.kind === 'modal') {
      onOpenDailyReport();
      return;
    }

    const search = reminder.actionTarget.params
      ? new URLSearchParams(reminder.actionTarget.params).toString()
      : '';

    navigate({
      pathname: reminder.actionTarget.path,
      search,
    });
  };

  return (
    <Card title="待我处理" style={{ marginBottom: 24 }}>
      {reminders.length === 0 ? (
        <Empty description="暂无待处理提醒" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {reminders.map((reminder) => (
            <Card key={reminder.id} size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div className="flex items-center justify-between gap-3">
                  <Text bold>{reminder.title}</Text>
                  <Tag color={PRIORITY_COLOR_MAP[reminder.priority]}>
                    {getReminderPriorityLabel(reminder.priority)}
                  </Tag>
                </div>
                {reminder.content ? (
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {reminder.content}
                  </Paragraph>
                ) : null}
                <Space>
                  <Button type="primary" size="small" onClick={() => openReminder(reminder)}>
                    {reminder.actionLabel}
                  </Button>
                  <ReminderSnoozeMenu reminderId={reminder.id} buttonSize="small" />
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
}
