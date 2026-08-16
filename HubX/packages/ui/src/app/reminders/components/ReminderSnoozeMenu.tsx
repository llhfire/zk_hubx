import { Button, Dropdown, Menu } from '@arco-design/web-react';
import type { SnoozeOptionId } from '../types';
import { useReminders } from '../ReminderContext';

export interface ReminderSnoozeOption {
  id: SnoozeOptionId;
  label: string;
}

const SNOOZE_OPTIONS: ReminderSnoozeOption[] = [
  { id: 'one_hour', label: '1小时后提醒' },
  { id: 'today_eod', label: '今天下班前提醒' },
  { id: 'tomorrow_morning', label: '明天上午提醒' },
];

export function getReminderSnoozeOptions(): ReminderSnoozeOption[] {
  return SNOOZE_OPTIONS;
}

interface ReminderSnoozeMenuProps {
  reminderId: string;
  buttonText?: string;
  buttonSize?: 'mini' | 'small' | 'default' | 'large';
}

export function ReminderSnoozeMenu({
  reminderId,
  buttonText = '稍后处理',
  buttonSize = 'mini',
}: ReminderSnoozeMenuProps) {
  const { snoozeReminder } = useReminders();

  const droplist = (
    <Menu onClickMenuItem={(key) => snoozeReminder(reminderId, key as SnoozeOptionId)}>
      {SNOOZE_OPTIONS.map((option) => (
        <Menu.Item key={option.id}>{option.label}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown position="bl" trigger="click" droplist={droplist}>
      <Button size={buttonSize} type="secondary">
        {buttonText}
      </Button>
    </Dropdown>
  );
}
