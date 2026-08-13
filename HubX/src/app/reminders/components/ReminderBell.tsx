import { useState } from 'react';
import { Badge, Button, Card, Dropdown, Empty, Space, Tag, Typography } from '@arco-design/web-react';
import { IconCheckSquare, IconMessage, IconNotification } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import type { ReminderItem } from '../types';
import { ReminderSnoozeMenu } from './ReminderSnoozeMenu';
import { useIntegration } from '@/app/integrations/IntegrationContext';
import { useTodos } from '@/app/todos/TodoContext';

const Text = Typography.Text;
const Paragraph = Typography.Paragraph;

const dropdownShellStyle = {
  width: 360,
  border: '1px solid var(--color-border-2)',
  borderRadius: 12,
  background: 'var(--color-bg-2)',
  boxShadow: '0 8px 24px rgba(15, 35, 95, 0.12)',
  overflow: 'hidden' as const,
};

const dropdownHeaderStyle = {
  padding: '16px 16px 12px',
  borderBottom: '1px solid var(--color-border-2)',
  background: 'var(--color-bg-2)',
};

const dropdownListStyle = {
  maxHeight: 420,
  overflowY: 'auto' as const,
  padding: 16,
  background: 'var(--color-bg-2)',
};

const dropdownFooterStyle = {
  padding: 16,
  borderTop: '1px solid var(--color-border-2)',
  background: 'var(--color-bg-2)',
};

const reminderItemCardStyle = {
  background: 'var(--color-fill-1)',
  border: '1px solid var(--color-border-2)',
  borderRadius: 10,
};

export function buildReminderBellPreviewItems(reminders: ReminderItem[]): ReminderItem[] {
  return reminders.slice(0, 5);
}

export function hasDailyReportUnsubmittedReminder(reminders: ReminderItem[]): boolean {
  return reminders.some((reminder) => reminder.type === 'daily_report_unsubmitted');
}

interface ReminderBellProps {
  onOpenDailyReport: () => void;
}

interface ReminderBellDropdownContentProps {
  reminders: ReminderItem[];
  pendingCount: number;
  onOpenReminder: (reminder: ReminderItem) => void;
  onViewAll: () => void;
}

export function ReminderBellDropdownContent({
  reminders,
  pendingCount,
  onOpenReminder,
  onViewAll,
}: ReminderBellDropdownContentProps) {
  return (
    <Card style={dropdownShellStyle} bodyStyle={{ padding: 0 }}>
      <div style={dropdownHeaderStyle}>
        <Text bold>待我处理</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          {pendingCount} 项未处理
        </Text>
      </div>

      <div style={dropdownListStyle}>
        {reminders.length === 0 ? (
          <Empty description="暂无待处理提醒" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {reminders.map((reminder) => (
              <Card key={reminder.id} size="small" style={reminderItemCardStyle}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text bold>{reminder.title}</Text>
                  {reminder.content ? (
                    <Paragraph type="secondary" style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                      {reminder.content}
                    </Paragraph>
                  ) : null}
                  <Space>
                    <Button size="mini" type="primary" onClick={() => onOpenReminder(reminder)}>
                      {reminder.actionLabel}
                    </Button>
                    <ReminderSnoozeMenu reminderId={reminder.id} />
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </div>

      <div style={dropdownFooterStyle}>
        <Button type="text" onClick={onViewAll}>
          查看全部待我处理
        </Button>
      </div>
    </Card>
  );
}

export function ReminderBell({ onOpenDailyReport: _onOpenDailyReport }: ReminderBellProps) {
  const navigate = useNavigate();
  const { unreadMessages, markRead, markAllRead } = useIntegration();
  const { activeTodos, activeCount, openTodo } = useTodos();
  const [activeView, setActiveView] = useState<'todos' | 'messages'>('todos');

  const totalCount = activeCount + unreadMessages.length;
  const dropContent = (
    <Card style={dropdownShellStyle} bodyStyle={{ padding: 0 }}>
      <div style={{ ...dropdownHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text bold>提醒中心</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>{totalCount} 项未处理</Text>
        </div>
        {activeView === 'messages' && unreadMessages.length > 0 ? (
          <Button size="mini" type="text" onClick={markAllRead}>全部已读</Button>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        <Button
          type={activeView === 'todos' ? 'primary' : 'secondary'}
          size="small"
          icon={<IconCheckSquare />}
          onClick={() => setActiveView('todos')}
        >
          待办 {activeCount}
        </Button>
        <Button
          type={activeView === 'messages' ? 'primary' : 'secondary'}
          size="small"
          icon={<IconMessage />}
          onClick={() => setActiveView('messages')}
        >
          站内信 {unreadMessages.length}
        </Button>
      </div>
      <div style={dropdownListStyle}>
        {activeView === 'todos' ? (
          activeTodos.length === 0 ? <Empty description="暂无待办事项" /> : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {activeTodos.slice(0, 5).map((todo) => (
                <Card key={todo.id} size="small" style={reminderItemCardStyle}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space>
                      <Tag color={todo.priority === 'high' ? 'red' : 'arcoblue'}>{todo.module}</Tag>
                      <Text bold>{todo.title}</Text>
                    </Space>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>{todo.content}</Paragraph>
                    <Button size="mini" type="primary" onClick={() => { openTodo(todo.id); navigate(todo.route); }}>
                      {todo.external ? '前往企业微信' : '去处理'}
                    </Button>
                  </Space>
                </Card>
              ))}
            </Space>
          )
        ) : (
          unreadMessages.length === 0 ? <Empty description="暂无未读站内信" /> : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {unreadMessages.slice(0, 5).map((message) => (
                <Card key={message.id} size="small" style={reminderItemCardStyle}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space><Tag color={message.priority === 'high' ? 'red' : 'arcoblue'}>{message.module}</Tag><Text bold>{message.title}</Text></Space>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>{message.content}</Paragraph>
                    <Button size="mini" type="primary" onClick={() => { markRead(message.id); navigate(message.route || '/system/message-center'); }}>查看详情</Button>
                  </Space>
                </Card>
              ))}
            </Space>
          )
        )}
      </div>
      <div style={dropdownFooterStyle}>
        <Button type="text" onClick={() => navigate(activeView === 'todos' ? '/todos' : '/system/message-center')}>
          {activeView === 'todos' ? '查看全部待办' : '查看全部站内信'}
        </Button>
      </div>
    </Card>
  );

  return (
    <Dropdown position="br" trigger="click" droplist={dropContent}>
      <Badge count={totalCount} maxCount={99}>
        <IconNotification aria-label="提醒中心" style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
}
