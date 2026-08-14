import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Grid,
  Input,
  Menu,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconClockCircle, IconSearch, IconEye, IconCheck } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { useTodos } from '@/app/todos/TodoContext';
import type { TodoItem, TodoPriority, TodoStatus } from '@/app/todos/types';

const Text = Typography.Text;
const Row = Grid.Row;
const Col = Grid.Col;

const statusMeta: Record<TodoStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'orange' },
  in_progress: { label: '处理中', color: 'arcoblue' },
  completed: { label: '已完成', color: 'green' },
  canceled: { label: '已取消', color: 'gray' },
};

const priorityMeta: Record<TodoPriority, { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'gray' },
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
  const [view, setView] = useState<TodoView>('active');
  const [keyword, setKeyword] = useState('');
  const [module, setModule] = useState('');
  const [priority, setPriority] = useState('');
  const [detail, setDetail] = useState<TodoItem | null>(null);

  const modules = useMemo(
    () => [...new Set(todos.map((item) => item.module))].map((value) => ({ label: value, value })),
    [todos],
  );

  const data = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return todos.filter((item) => {
      if (view === 'active' && !(item.status === 'pending' || item.status === 'in_progress')) return false;
      if (view === 'completed' && item.status !== 'completed') return false;
      if (view === 'canceled' && item.status !== 'canceled') return false;
      if (module && item.module !== module) return false;
      if (priority && item.priority !== priority) return false;
      if (normalizedKeyword && ![item.title, item.content, item.sourceId].some((value) => value.toLowerCase().includes(normalizedKeyword))) return false;
      return true;
    });
  }, [keyword, module, priority, todos, view]);

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
            {record.external ? <Tag color="green">企业微信</Tag> : null}
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
      render: (value: TodoPriority) => <Tag color={priorityMeta[value].color}>{priorityMeta[value].label}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value: TodoStatus, record: TodoItem) => (
        <Space size={4}>
          <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag>
          {isOverdue(record) ? <Tag color="red">已逾期</Tag> : null}
        </Space>
      ),
    },
    { title: '生成时间', dataIndex: 'createdAt', width: 160 },
    { title: '截止时间', dataIndex: 'deadline', width: 160, render: (value?: string) => value || '无截止时间' },
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
              <Tooltip content="延后">
                <Dropdown droplist={snoozeMenu(record)} position="br">
                  <Button type="text" size="small" icon={<IconClockCircle />} />
                </Dropdown>
              </Tooltip>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  const overdueCount = activeTodos.filter((item) => isOverdue(item)).length;
  const today = new Date().toLocaleDateString('sv-SE');
  const todayDeadlineCount = activeTodos.filter((item) => item.deadline?.startsWith(today)).length;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Text type="secondary">待办由业务系统自动生成，完成状态以真实业务处理结果为准。</Text>
      </div>

      <Card bordered={false} bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={24}>
          <Col span={6}><Statistic title="全部待处理" value={activeTodos.length} suffix="项" /></Col>
          <Col span={6}><Statistic title="高优先级" value={activeTodos.filter((item) => item.priority === 'high').length} suffix="项" /></Col>
          <Col span={6}><Statistic title="今日截止" value={todayDeadlineCount} suffix="项" /></Col>
          <Col span={6}><Statistic title="已逾期" value={overdueCount} suffix="项" valueStyle={{ color: overdueCount ? 'rgb(var(--red-6))' : undefined }} /></Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Tabs activeTab={view} onChange={(value) => setView(value as TodoView)}>
          <Tabs.TabPane key="active" title={`待处理（${activeTodos.length}）`} />
          <Tabs.TabPane key="completed" title="已完成" />
          <Tabs.TabPane key="canceled" title="已取消" />
          <Tabs.TabPane key="all" title="全部" />
        </Tabs>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input prefix={<IconSearch />} allowClear placeholder="搜索待办标题、内容或业务编号" style={{ width: 300 }} value={keyword} onChange={setKeyword} />
          <Select allowClear placeholder="业务来源" style={{ width: 160 }} value={module || undefined} onChange={(value) => setModule(value || '')} options={modules} />
          <Select
            allowClear
            placeholder="优先级"
            style={{ width: 130 }}
            value={priority || undefined}
            onChange={(value) => setPriority(value || '')}
            options={Object.entries(priorityMeta).map(([value, meta]) => ({ value, label: `${meta.label}优先级` }))}
          />
        </Space>
        <Table rowKey="id" columns={columns} data={data} pagination={{ pageSize: 10 }} scroll={{ x: 1300 }} />
      </Card>

      <Modal title="待办详情" visible={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>} style={{ width: 640 }}>
        {detail && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space>
              <Tag color={priorityMeta[detail.priority].color}>{priorityMeta[detail.priority].label}优先级</Tag>
              <Tag color={statusMeta[detail.status].color}>{statusMeta[detail.status].label}</Tag>
              {isOverdue(detail) ? <Tag color="red">已逾期</Tag> : null}
            </Space>
            <Descriptions
              border
              column={2}
              data={[
                { label: '待办事项', value: detail.title },
                { label: '业务来源', value: detail.module },
                { label: '负责人', value: detail.assigneeName },
                { label: '业务编号', value: detail.sourceId },
                { label: '生成时间', value: detail.createdAt },
                { label: '截止时间', value: detail.deadline || '无截止时间' },
                { label: '事项说明', value: detail.content, span: 2 },
              ]}
            />
            <Text type="secondary">业务待办不能手动完成或删除，请前往对应业务页面处理。</Text>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
