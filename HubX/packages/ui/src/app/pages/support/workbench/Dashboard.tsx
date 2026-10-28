import { Badge, Button, Grid, Space, Typography } from '@/design-system';
import {
  IconApps,
  IconCalendar,
  IconClockCircle,
  IconCustomerService,
  IconRight,
} from '@/design-system';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DailyReportModal } from '../../delivery/daily-report/DailyReportModal';
import type { DailyReport } from '../../delivery/daily-report/types';
import { useReminders } from '../../../reminders/ReminderContext';
import { useTodos } from '../../../todos/TodoContext';
import type { TodoItem } from '../../../todos/types';
import {
  MetricGrid,
  PageHeader,
  PageShell,
  SectionCard,
  StatusTag,
  resolveStatus,
  type StatusMap,
  ProgressBar,
} from '@/design-system';

const Row = Grid.Row;
const Col = Grid.Col;

const TODO_PRIORITY: StatusMap<'high' | 'medium' | 'low'> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'neutral' },
};

const LEAD_INTENT: StatusMap<string> = {
  高: { label: '高意向', tone: 'danger' },
  中: { label: '中意向', tone: 'warning' },
};

function parseLocalDate(value?: string) {
  if (!value) return undefined;
  return new Date(value.replace(/-/g, '/'));
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatDeadline(value?: string) {
  const date = parseLocalDate(value);
  if (!date) return '无截止时间';
  const now = new Date();
  if (isSameDay(date, now)) {
    return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [dailyReportVisible, setDailyReportVisible] = useState(false);
  const { dailyReports, submitDailyReport } = useReminders();
  const { activeTodos, openTodo } = useTodos();
  const currentUserId = 'user-sales-zhangsan';

  const now = new Date();
  const todoSummary = useMemo(() => {
    const overdue = activeTodos.filter((todo) => {
      const deadline = parseLocalDate(todo.deadline);
      return deadline ? deadline.getTime() < Date.now() : false;
    }).length;
    const dueToday = activeTodos.filter((todo) => {
      const deadline = parseLocalDate(todo.deadline);
      return deadline ? isSameDay(deadline, new Date()) : false;
    }).length;
    const approvals = activeTodos.filter((todo) => todo.source === 'approval' || todo.source === 'wecom_approval').length;
    return { overdue, dueToday, approvals };
  }, [activeTodos]);

  const sortedTodos = useMemo(() => [...activeTodos].sort((left, right) => {
    const leftOverdue = parseLocalDate(left.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightOverdue = parseLocalDate(right.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[left.priority] - priorityOrder[right.priority];
  }).slice(0, 5), [activeTodos]);

  const recentLeads = [
    { name: '某科技公司 APP 开发需求', customer: '北京科技有限公司', status: '需求调研', level: '高', followTime: '2 小时前' },
    { name: '企业管理系统定制', customer: '上海商贸公司', status: '方案报价', level: '中', followTime: '5 小时前' },
    { name: '小程序开发项目', customer: '深圳电商公司', status: '合同洽谈', level: '高', followTime: '1 天前' },
  ];

  const projectProgress = [
    { name: 'A 公司 CRM 系统', customer: 'A 科技公司', progress: 75, status: '正常' },
    { name: 'B 公司电商平台', customer: 'B 电商公司', progress: 45, status: '正常' },
    { name: 'C 公司移动应用', customer: 'C 互联网公司', progress: 30, status: '延期风险' },
  ];

  const handleTodo = (todo: TodoItem) => {
    openTodo(todo.id);
    navigate(todo.route);
  };

  const greeting = now.getHours() < 12 ? '早上好' : now.getHours() < 18 ? '下午好' : '晚上好';
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);

  const summaryItems = [
    { key: 'pending', label: '待处理', value: activeTodos.length, detail: '全部待办' },
    { key: 'overdue', label: '已逾期', value: todoSummary.overdue, detail: '需优先处理', tone: 'danger' as const },
    { key: 'dueToday', label: '今日截止', value: todoSummary.dueToday, detail: '今日需完成', tone: 'warning' as const },
    { key: 'approvals', label: '待审批', value: todoSummary.approvals, detail: '含企业微信审批' },
  ];

  return (
    <PageShell>
      <PageHeader
        title={`${greeting}，张三`}
        description={(
          <>
            {dateLabel} · 今天有 {activeTodos.length} 项待处理
            {todoSummary.overdue > 0 && <span style={{ color: 'var(--ds-tone-danger-fg)' }}>，其中 {todoSummary.overdue} 项已逾期</span>}
          </>
        )}
        actions={(
          <>
            <Button onClick={() => setDailyReportVisible(true)}>填写日报</Button>
            <Button type="primary" onClick={() => navigate('/todos')}>查看全部待办</Button>
          </>
        )}
      />

      <MetricGrid items={summaryItems} />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={16}>
          <SectionCard
            title="我的待办"
            extra={<Button type="text" size="small" onClick={() => navigate('/todos')}>查看全部 <IconRight /></Button>}
            padded={false}
            className="h-full"
          >
            {sortedTodos.map((todo, index) => {
              const deadline = parseLocalDate(todo.deadline);
              const overdue = deadline ? deadline.getTime() < Date.now() : false;
              return (
                <div
                  key={todo.id}
                  className="flex items-center justify-between"
                  style={{
                    minHeight: 70,
                    padding: '12px 0',
                    borderBottom: index === sortedTodos.length - 1 ? 'none' : '1px solid var(--grey-100)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 7 }}>
                      <StatusTag meta={TODO_PRIORITY[todo.priority]} />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--grey-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {todo.title}
                      </span>
                    </div>
                    <Space size={12}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--grey-500)' }}>{todo.module}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: overdue ? 'rgb(var(--red-6))' : 'var(--grey-500)' }}>
                        <IconClockCircle style={{ marginRight: 4 }} />{overdue ? '已逾期 · ' : ''}{formatDeadline(todo.deadline)}
                      </span>
                      {todo.status === 'in_progress' && <Badge status="processing" text="处理中" />}
                    </Space>
                  </div>
                  <Button size="small" type="text" onClick={() => handleTodo(todo)}>
                    {todo.external ? '前往企业微信' : '去处理'} <IconRight />
                  </Button>
                </div>
              );
            })}
          </SectionCard>
        </Col>

        <Col span={8}>
          <div style={{ marginBottom: 16 }}>
          <SectionCard title="快捷入口">
            <Row gutter={[10, 10]}>
              {[
                { label: '线索管理', route: '/leads/my', icon: <IconCustomerService /> },
                { label: '审批中心', route: '/approvals', icon: <IconClockCircle /> },
                { label: '项目管理', route: '/projects', icon: <IconApps /> },
                { label: '填写日报', action: () => setDailyReportVisible(true), icon: <IconCalendar /> },
              ].map((item) => (
                <Col span={12} key={item.label}>
                  <Button
                    long
                    style={{ height: 58 }}
                    onClick={() => item.action ? item.action() : navigate(item.route!)}
                  >
                    <Space direction="vertical" size={3}>
                      <span style={{ color: 'rgb(var(--primary-6))', fontSize: 'var(--text-lg)' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Space>
                  </Button>
                </Col>
              ))}
            </Row>
          </SectionCard>
          </div>
          <SectionCard title="业务概览">
            {[
              ['本月新增线索', '156', '+12.5%'],
              ['本月签约客户', '28', '+18.2%'],
              ['进行中项目', '35', '+5.7%'],
            ].map(([label, value, trend], index) => (
              <div key={label} className="flex items-center justify-between" style={{ padding: '11px 0', borderBottom: index === 2 ? 'none' : '1px solid var(--grey-100)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--grey-500)' }}>{label}</span>
                <Space>
                  <strong style={{ fontSize: 'var(--text-base)' }}>{value}</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'rgb(var(--green-6))' }}>{trend}</span>
                </Space>
              </div>
            ))}
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <SectionCard
            title="待跟进线索"
            extra={<Button type="text" size="small" onClick={() => navigate('/leads/my')}>查看全部 <IconRight /></Button>}
            padded={false}
          >
            {recentLeads.map((lead, index) => (
              <div key={lead.name} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: index === recentLeads.length - 1 ? 'none' : '1px solid var(--grey-100)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 5 }}>{lead.name}</div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--grey-500)' }}>{lead.customer} · {lead.followTime}</span>
                </div>
                <Space>
                  <StatusTag meta={resolveStatus(LEAD_INTENT, lead.level)} />
                  <Badge status="processing" text={lead.status} />
                </Space>
              </div>
            ))}
          </SectionCard>
        </Col>
        <Col span={12}>
          <SectionCard
            title="项目进度"
            extra={<Button type="text" size="small" onClick={() => navigate('/projects')}>查看全部 <IconRight /></Button>}
            padded={false}
          >
            {projectProgress.map((project, index) => (
              <div key={project.name} style={{ padding: '13px 0', borderBottom: index === projectProgress.length - 1 ? 'none' : '1px solid var(--grey-100)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{project.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 'var(--text-xs)', color: 'var(--grey-500)' }}>{project.customer}</span>
                  </div>
                  <Badge status={project.status === '正常' ? 'success' : 'warning'} text={project.status} />
                </div>
                <ProgressBar percent={project.progress} size="small" showValue={false} />
              </div>
            ))}
          </SectionCard>
        </Col>
      </Row>

      <DailyReportModal
        visible={dailyReportVisible}
        onCancel={() => setDailyReportVisible(false)}
        onSubmit={(report: DailyReport) => submitDailyReport(report)}
        currentUserId={currentUserId}
        recentReports={dailyReports}
      />
    </PageShell>
  );
}
