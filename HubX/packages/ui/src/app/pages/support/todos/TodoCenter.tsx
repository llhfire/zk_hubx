import { useMemo, useState } from 'react';
import {
  Button,
  Dropdown,
  Input,
  Menu,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
} from '@/design-system';
import { IconClockCircle, IconSearch, IconEye, IconCheck } from '@/design-system';
import { useNavigate } from 'react-router';
import { useTodos } from '../../../todos/TodoContext';
import { useQuotation } from '../../sales/quotation/QuotationContext';
import type { TodoItem, TodoPriority, TodoStatus } from '../../../todos/types';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  MetricGrid,
  PageHeader,
  PageShell,
  SectionTabs,
  StatusTag,
  type StatusMap,
} from '@/design-system';

const Text = Typography.Text;

const TODO_STATUS: StatusMap<TodoStatus> = {
  pending: { label: '待处理', tone: 'warning' },
  in_progress: { label: '处理中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  canceled: { label: '已取消', tone: 'neutral' },
};

const TODO_PRIORITY: StatusMap<TodoPriority> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'neutral' },
};

function parseLocalDate(value?: string) {
  return value ? new Date(value.replace(' ', 'T')) : null;
}

function isOverdue(item: TodoItem, now = new Date()) {
  const deadline = parseLocalDate(item.deadline);
  return Boolean(deadline && deadline.getTime() < now.getTime() && (item.status === 'pending' || item.status === 'in_progress'));
}

function formatSnoozeLabel(value?: string) {
  const date = parseLocalDate(value);
  return date && date.getTime() > Date.now() ? `已延后至 ${date.toLocaleString('zh-CN', { hour12: false })}` : '';
}

type TodoView = 'active' | 'completed' | 'canceled' | 'all';

export function TodoCenter() {
  const navigate = useNavigate();
  const { todos, activeTodos, openTodo, snoozeTodo } = useTodos();
  const { myQuoteTodos } = useQuotation();
  const [view, setView] = useState<TodoView>('active');
  const [keyword, setKeyword] = useState('');
  const [module, setModule] = useState('');
  const [priority, setPriority] = useState('');
  const [detail, setDetail] = useState<TodoItem | null>(null);

  // 报价待办为派生数据（非持久化），与持久化待办合并展示
  const mergedTodos = useMemo(() => [...myQuoteTodos, ...todos], [myQuoteTodos, todos]);
  const mergedActive = useMemo(() => [...myQuoteTodos, ...activeTodos], [myQuoteTodos, activeTodos]);

  const modules = useMemo(
    () => [...new Set(mergedTodos.map((item) => item.module))].map((value) => ({ label: value, value })),
    [mergedTodos],
  );

  const data = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return mergedTodos.filter((item) => {
      if (view === 'active' && !(item.status === 'pending' || item.status === 'in_progress')) return false;
      if (view === 'completed' && item.status !== 'completed') return false;
      if (view === 'canceled' && item.status !== 'canceled') return false;
      if (module && item.module !== module) return false;
      if (priority && item.priority !== priority) return false;
      if (normalizedKeyword && ![item.title, item.content, item.sourceId].some((value) => value.toLowerCase().includes(normalizedKeyword))) return false;
      return true;
    });
  }, [keyword, module, priority, mergedTodos, view]);

  const goProcess = (item: TodoItem) => {
    openTodo(item.id);
    navigate(item.route);
  };

  const snoozeMenu = (item: TodoItem) => (
    <Menu
      onClickMenuItem={(key) => {
        const now = new Date();
        if (key === 'one-hour') now.setHours(now.getHours() + 1);
        if (key === 'today-eod') now.setHours(18, 30, 0, 0);
        if (key === 'tomorrow') {
          now.setDate(now.getDate() + 1);
          now.setHours(9, 0, 0, 0);
        }
        snoozeTodo(item.id, now.toISOString());
      }}
    >
      <Menu.Item key="one-hour">1 小时后提醒</Menu.Item>
      <Menu.Item key="today-eod">今天下班前提醒</Menu.Item>
      <Menu.Item key="tomorrow">明天上午提醒</Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: '待办事项',
      width: 340,
      render: (_: unknown, record: TodoItem) => (
        <Space direction="vertical" size={3}>
          <Space>
            <Text bold>{record.title}</Text>
            {record.external ? <StatusTag tone="success">企业微信</StatusTag> : null}
          </Space>
          <Text type="secondary">{record.content}</Text>
          {formatSnoozeLabel(record.snoozedUntil) ? <Text type="secondary">{formatSnoozeLabel(record.snoozedUntil)}</Text> : null}
        </Space>
      ),
    },
    { title: '业务来源', dataIndex: 'module', width: 130 },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (value: TodoPriority) => <StatusTag meta={TODO_PRIORITY[value]} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value: TodoStatus, record: TodoItem) => (
        <Space size={4}>
          <StatusTag meta={TODO_STATUS[value]} />
          {isOverdue(record) ? <StatusTag tone="danger">已逾期</StatusTag> : null}
        </Space>
      ),
    },
    { title: '生成时间', dataIndex: 'createdAt', width: 160, render: (value: string) => <DateText value={value} mode="datetime" /> },
    { title: '截止时间', dataIndex: 'deadline', width: 160, render: (value?: string) => value ? <DateText value={value} mode="datetime" /> : '无截止时间' },
    {
      title: '操作',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, record: TodoItem) => (
        <Space>
          <Tooltip content="详情">
            <Button type="text" size="small" icon={<IconEye />} onClick={() => setDetail(record)} />
          </Tooltip>
          {record.status === 'pending' || record.status === 'in_progress' ? (
            <>
              <Tooltip content={record.external ? '去企业微信处理' : '去处理'}>
                <Button type="primary" size="mini" icon={<IconCheck />} onClick={() => goProcess(record)} />
              </Tooltip>
              {/* 智能会议待办是只读投影，不提供延后操作 */}
              {record.source !== 'smart_meeting' && (
                <Tooltip content="延后">
                  <Dropdown droplist={snoozeMenu(record)} position="br">
                    <Button type="text" size="small" icon={<IconClockCircle />} />
                  </Dropdown>
                </Tooltip>
              )}
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  const overdueCount = mergedActive.filter((item) => isOverdue(item)).length;
  const today = new Date().toLocaleDateString('sv-SE');
  const todayDeadlineCount = mergedActive.filter((item) => item.deadline?.startsWith(today)).length;

  return (
    <PageShell>
      <PageHeader
        title="待办中心"
        description="待办由业务系统自动生成，完成状态以真实业务处理结果为准。"
      />

      <MetricGrid items={[
        { key: 'active', label: '全部待处理', value: mergedActive.length, detail: '项' },
        { key: 'high', label: '高优先级', value: mergedActive.filter((item) => item.priority === 'high').length, detail: '项' },
        { key: 'today', label: '今日截止', value: todayDeadlineCount, detail: '项' },
        { key: 'overdue', label: '已逾期', value: overdueCount, detail: '项', tone: overdueCount ? 'danger' : 'neutral' },
      ]} />

      <SectionTabs
        activeKey={view}
        onChange={(value) => setView(value as TodoView)}
        items={[
          { key: 'active', label: '待处理', count: mergedActive.length },
          { key: 'completed', label: '已完成' },
          { key: 'canceled', label: '已取消' },
          { key: 'all', label: '全部' },
        ]}
      />
      <DataTable
        rowKey="id"
        columns={columns}
        data={data}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1300 }}
        toolbar={(
          <>
            <Input prefix={<IconSearch />} allowClear placeholder="搜索待办标题、内容或业务编号" style={{ width: 300 }} value={keyword} onChange={setKeyword} />
            <Select allowClear placeholder="业务来源" style={{ width: 160 }} value={module || undefined} onChange={(value) => setModule(value || '')} options={modules} />
            <Select
              allowClear
              placeholder="优先级"
              style={{ width: 130 }}
              value={priority || undefined}
              onChange={(value) => setPriority(value || '')}
              options={Object.entries(TODO_PRIORITY).map(([value, meta]) => ({ value, label: `${meta.label}优先级` }))}
            />
          </>
        )}
      />

      <Modal title="待办详情" visible={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>} style={{ width: 640 }}>
        {detail && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space>
              <StatusTag tone={TODO_PRIORITY[detail.priority].tone}>{TODO_PRIORITY[detail.priority].label}优先级</StatusTag>
              <StatusTag meta={TODO_STATUS[detail.status]} />
              {isOverdue(detail) ? <StatusTag tone="danger">已逾期</StatusTag> : null}
            </Space>
            <DescriptionsCard
              bare
              columns={2}
              items={[
                { key: 'title', label: '待办事项', value: detail.title },
                { key: 'module', label: '业务来源', value: detail.module },
                { key: 'assignee', label: '负责人', value: detail.assigneeName },
                { key: 'sourceId', label: '业务编号', value: detail.sourceId },
                { key: 'createdAt', label: '生成时间', value: detail.createdAt },
                { key: 'deadline', label: '截止时间', value: detail.deadline || '无截止时间' },
                { key: 'content', label: '事项说明', value: detail.content, long: true },
              ]}
            />
            <Text type="secondary">业务待办不能手动完成或删除，请前往对应业务页面处理。</Text>
          </Space>
        )}
      </Modal>
    </PageShell>
  );
}
