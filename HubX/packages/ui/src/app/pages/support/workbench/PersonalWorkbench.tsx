import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Grid, Button, Space, Tag, Typography, Tabs, Avatar, List, Badge } from '@/design-system';
import {
  IconUser,
  IconCalendar,
  IconFile,
  IconTrophy,
  IconArrowRight,
  IconCheckCircle,
  IconEdit,
  IconPlus,
  IconCustomerService,
} from '@/design-system';
import { useEmployee } from '../hr/employee/EmployeeContext';
import {
  ABILITY_DIMENSION_LABELS,
  ABILITY_DIMENSION_COLORS,
  ABILITY_DIMENSION_TONES,
  calcPromotionProgress,
  AbilityDimension,
} from '../hr/employee/mockData';
import {
  DataTable,
  DateText,
  MetricGrid,
  PageShell,
  SectionTabs,
  SectionCard,
  StatusTag,
  resolveStatus,
  type StatusMap,
  ProgressBar,
  STATUS_TONE_VARS,
} from '@/design-system';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;

// 小型雷达图（工作台用，更紧凑）
function MiniRadar({ scores, size = 160 }: { scores: { tech: number; biz: number; mgmt: number; tool: number; domain: number }; size?: number }) {
  const dims: AbilityDimension[] = ['tech', 'biz', 'mgmt', 'tool', 'domain'];
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  const angleFor = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2;

  const gridPolygons = Array.from({ length: 4 }, (_, lv) => {
    const r = (radius * (lv + 1)) / 4;
    return dims.map((_, i) => { const a = angleFor(i); return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
  });

  const dataPts = dims.map((d, i) => {
    const a = angleFor(i);
    const r = (radius * scores[d]) / 100;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="var(--color-border)" strokeOpacity={0.3} />)}
      {dims.map((_, i) => { const a = angleFor(i); return <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)} stroke="var(--color-border)" strokeOpacity={0.2} />; })}
      <polygon points={dataPts} fill="rgb(var(--primary-6))" fillOpacity={0.15} stroke="rgb(var(--primary-6))" strokeWidth={1.5} />
      {dims.map((d, i) => {
        const a = angleFor(i);
        const r = (radius * scores[d]) / 100;
        return <circle key={d} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={2.5} fill="rgb(var(--primary-6))" />;
      })}
    </svg>
  );
}

// 模拟任务数据
interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  type: 'personal' | 'team';
  done: boolean;
}

const TASK_PRIORITY: StatusMap<Task['priority']> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'neutral' },
};

const SKILL_MASTERY: StatusMap<'beginner' | 'proficient' | 'expert'> = {
  expert: { label: '精通', tone: 'purple' },
  proficient: { label: '熟练', tone: 'info' },
  beginner: { label: '入门', tone: 'neutral' },
};

const PROJECT_STATUS: StatusMap<string> = {
  进行中: { label: '进行中', tone: 'info' },
  验收中: { label: '验收中', tone: 'success' },
};

const mockTasks: Task[] = [
  { id: 't1', title: '完成 CRM 看板前端开发', priority: 'high',   dueDate: '2026-07-05', type: 'team',     done: false },
  { id: 't2', title: 'Q2 绩效自评报告',       priority: 'high',   dueDate: '2026-07-03', type: 'personal', done: false },
  { id: 't3', title: '客户 A 项目需求评审',    priority: 'medium', dueDate: '2026-07-06', type: 'team',     done: false },
  { id: 't4', title: '更新技术文档',           priority: 'low',    dueDate: '2026-07-08', type: 'personal', done: true  },
  { id: 't5', title: '新人带教：代码规范培训',  priority: 'medium', dueDate: '2026-07-07', type: 'team',     done: false },
  { id: 't6', title: '填写本周日报',           priority: 'high',   dueDate: '2026-07-02', type: 'personal', done: false },
];

// 模拟项目数据
const mockProjects = [
  { id: 'proj-1', name: 'CRM 系统升级', role: '项目经理', progress: 65, status: '进行中' },
  { id: 'proj-2', name: '客户 A 小程序', role: '技术负责人', progress: 80, status: '验收中' },
  { id: 'proj-3', name: '投放数据看板', role: '核心开发', progress: 30, status: '进行中' },
];

// 模拟日报提醒
const mockDailyReportReminder = {
  submitted: false,
  date: '2026-07-02',
  streakDays: 5,
};

export function PersonalWorkbench() {
  const navigate = useNavigate();
  const { employees, skillTrees } = useEmployee();
  const [activeTab, setActiveTab] = useState('overview');

  // 当前登录员工（模拟为张三 id=1）
  const currentEmployee = employees.find(e => e.id === '1');
  const cap = currentEmployee?.capability;
  const personality = currentEmployee?.personality;

  const stats = useMemo(() => {
    const pendingTasks = mockTasks.filter(t => !t.done).length;
    const todayTasks = mockTasks.filter(t => !t.done && t.dueDate <= '2026-07-03').length;
    const myProjects = mockProjects.length;
    return { pendingTasks, todayTasks, myProjects };
  }, []);

  // 下一个可解锁技能
  const nextSkill = useMemo(() => {
    if (!cap) return null;
    const locked = cap.skills.find(s => s.status === 'locked');
    if (!locked) return null;
    return skillTrees.find(s => s.id === locked.id);
  }, [cap, skillTrees]);

  if (!currentEmployee) return null;

  return (
    <PageShell>
      {/* 顶部欢迎栏（自带问候与今日摘要，不再叠加 PageHeader） */}
      <SectionCard bordered={false} style={{ background: 'linear-gradient(135deg, color-mix(in srgb, rgb(var(--primary-6)) 6%, transparent), color-mix(in srgb, rgb(var(--success-6)) 4%, transparent))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar size={56} style={{ background: 'linear-gradient(135deg, rgb(var(--primary-6)), rgb(var(--primary-4)))', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
              {currentEmployee.name.slice(0, 1)}
            </Avatar>
            <div>
              <Title heading={4} style={{ margin: 0 }}>早上好，{currentEmployee.name} 👋</Title>
              <Typography.Text type="secondary">
                {currentEmployee.department} · {currentEmployee.position} · {currentEmployee.level}
                {personality?.mbti && <StatusTag tone="purple" style={{marginLeft: 8 }}>{personality.mbti.type}</StatusTag>}
              </Typography.Text>
            </div>
          </div>
          <Space>
            <Button type="primary" icon={<IconEdit />} onClick={() => navigate('/dailyreport/list')}>填写日报</Button>
            <Button icon={<IconPlus />} onClick={() => navigate('/leads/public')}>新建线索</Button>
          </Space>
        </div>
      </SectionCard>

      {/* 核心指标 */}
      <MetricGrid items={[
        { key: 'pending', label: '待办任务', value: stats.pendingTasks, detail: '项' },
        { key: 'today', label: '今日到期', value: stats.todayTasks, detail: '项', tone: 'danger' },
        { key: 'projects', label: '参与项目', value: stats.myProjects, detail: '个' },
        { key: 'score', label: '加权总分', value: cap?.weightedScore || 0, detail: '分' },
        { key: 'skills', label: '已解锁技能', value: cap?.skills.filter(s => s.status === 'unlocked').length || 0, detail: '个', tone: 'success' },
        {
          key: 'daily-report',
          label: '日报状态',
          value: mockDailyReportReminder.submitted ? '已提交' : '未提交',
          tone: mockDailyReportReminder.submitted ? 'success' : 'danger',
        },
      ]} />

      {/* 主体 Tab */}
      <SectionCard>
        <SectionTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: <span><IconUser /> 概览</span>,
            },
            {
              key: 'tasks',
              label: <span><IconCheckCircle /> 任务清单</span>,
            },
            {
              key: 'capability',
              label: <span><IconTrophy /> 能力面板</span>,
            },
            {
              key: 'projects',
              label: <span><IconFile /> 我的项目</span>,
            },
          ]}
        />

        <div style={{ paddingTop: 16 }}>
          {/* 概览 Tab */}
          {activeTab === 'overview' && (
            <Row gutter={16}>
              <Col span={10}>
                {/* 能力雷达图 */}
                {cap && (
                  <SectionCard title="能力雷达图">
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <MiniRadar scores={cap.scores} size={220} />
                    </div>
                  </SectionCard>
                )}
                {/* 晋级进度 */}
                {cap && (
                  <div style={{ marginTop: 12 }}>
                  <SectionCard title="晋级进度">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{currentEmployee.level}</span>
                      <span style={{ color: 'var(--color-text-3)' }}>→ {`L${parseInt(currentEmployee.level.replace('L', '')) + 1}`}</span>
                    </div>
                    <ProgressBar
                      percent={calcPromotionProgress(cap.weightedScore, currentEmployee.level)}
                      tone={cap.promotionEligible ? 'success' : 'info'}
                      size="large"
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 'var(--text-xs)', display: 'block', marginTop: 8 }}>
                      加权总分 {cap.weightedScore} 分
                      {cap.promotionEligible && <StatusTag tone="success">可晋级</StatusTag>}
                    </Typography.Text>
                  </SectionCard>
                  </div>
                )}
              </Col>
              <Col span={14}>
                {/* 快捷入口 */}
                <div style={{ marginBottom: 12 }}>
                <SectionCard title="快捷入口">
                  <Row gutter={12}>
                    {[
                      { icon: <IconEdit />, label: '填写日报', color: 'var(--primary)', action: () => navigate('/dailyreport/list') },
                      { icon: <IconPlus />, label: '新建线索', color: 'var(--success-500)', action: () => navigate('/leads/public') },
                      { icon: <IconFile />, label: '查看合同', color: 'var(--warning-500)', action: () => navigate('/contracts') },
                      { icon: <IconCustomerService />, label: '我的线索', color: 'var(--ds-tone-purple-fg)', action: () => navigate('/leads/my') },
                    ].map(btn => (
                      <Col span={6} key={btn.label}>
                        <Button
                          long
                          style={{ height: 72, display: 'flex', flexDirection: 'column', gap: 4, color: btn.color, borderColor: `${btn.color}33` }}
                          onClick={btn.action}
                        >
                          <span style={{ fontSize: 'var(--text-xl)' }}>{btn.icon}</span>
                          <span style={{ fontSize: 'var(--text-xs)' }}>{btn.label}</span>
                        </Button>
                      </Col>
                    ))}
                  </Row>
                </SectionCard>
                </div>

                {/* 待办任务 */}
                <SectionCard
                  title={<span>待办任务 <Badge count={stats.pendingTasks} color="arcoblue" /></span>}
                  extra={<Button type="text" size="small" onClick={() => setActiveTab('tasks')}>查看全部 <IconArrowRight /></Button>}
                >
                  <List
                    dataSource={mockTasks.filter(t => !t.done).slice(0, 4)}
                    render={(task: Task) => (
                      <List.Item key={task.id} style={{ padding: '8px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <Space>
                            <StatusTag meta={TASK_PRIORITY[task.priority]} />
                            <span style={{ fontSize: 'var(--text-sm)' }}>{task.title}</span>
                          </Space>
                          <Typography.Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{task.dueDate}</Typography.Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </SectionCard>
              </Col>
            </Row>
          )}

          {/* 任务清单 Tab */}
          {activeTab === 'tasks' && (
            <div>
              <DataTable
                toolbar={(
                  <Space>
                    <StatusTag tone="info">全部 {mockTasks.length}</StatusTag>
                    <StatusTag tone="neutral">待办 {mockTasks.filter(t => !t.done).length}</StatusTag>
                    <StatusTag tone="success">已完成 {mockTasks.filter(t => t.done).length}</StatusTag>
                  </Space>
                )}
                actions={<Button type="primary" icon={<IconPlus />} size="small">新建任务</Button>}
                columns={[
                  {
                    title: '优先级', dataIndex: 'priority', width: 70,
                    render: (p: Task['priority']) => <StatusTag meta={TASK_PRIORITY[p]} />,
                    sorter: (a: Task, b: Task) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return order[a.priority] - order[b.priority];
                    },
                  },
                  { title: '任务', dataIndex: 'title' },
                  {
                    title: '类型', dataIndex: 'type', width: 80,
                    render: (t: string) => <StatusTag>{t === 'personal' ? '个人' : '团队'}</StatusTag>,
                  },
                  { title: '截止日期', dataIndex: 'dueDate', width: 110, render: (value: string) => <DateText value={value} /> },
                  {
                    title: '状态', dataIndex: 'done', width: 80,
                    render: (done: boolean) => done
                      ? <StatusTag tone="success">已完成</StatusTag>
                      : <StatusTag tone="warning">待办</StatusTag>,
                  },
                ] as any}
                data={mockTasks}
                rowKey="id"
                pagination={false}
              />
            </div>
          )}

          {/* 能力面板 Tab */}
          {activeTab === 'capability' && cap && (
            <div>
              <Row gutter={16}>
                <Col span={10}>
                  <SectionCard title="五维能力">
                    {(Object.keys(cap.scores) as AbilityDimension[]).map(dim => (
                      <div key={dim} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: STATUS_TONE_VARS[ABILITY_DIMENSION_TONES[dim]].fg }}>
                            {ABILITY_DIMENSION_LABELS[dim]}
                          </span>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{cap.scores[dim]}</span>
                        </div>
                        <ProgressBar percent={cap.scores[dim]} tone={ABILITY_DIMENSION_TONES[dim]} />
                      </div>
                    ))}
                  </SectionCard>
                </Col>
                <Col span={14}>
                  <SectionCard title="技能掌握">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <StatusTag tone="success">
                        已解锁 {cap.skills.filter(s => s.status === 'unlocked').length}
                      </StatusTag>
                      <StatusTag tone="neutral">
                        待解锁 {cap.skills.filter(s => s.status === 'locked').length}
                      </StatusTag>
                    </div>
                    {nextSkill && (
                      <SectionCard size="small" style={{ background: 'var(--color-fill-1)', marginBottom: 12 }} bodyStyle={{ padding: '10px 14px' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>下一个可解锁技能</Typography.Text>
                        <div style={{ fontWeight: 600, marginTop: 4 }}>
                          🔓 {nextSkill.name}
                          <StatusTag tone={ABILITY_DIMENSION_TONES[nextSkill.domain]} style={{marginLeft: 8 }} size="small">
                            {ABILITY_DIMENSION_LABELS[nextSkill.domain]}
                          </StatusTag>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{nextSkill.description}</Typography.Text>
                      </SectionCard>
                    )}
                    <div style={{ maxHeight: 240, overflow: 'auto' }}>
                      {cap.skills.filter(s => s.status === 'unlocked').slice(0, 8).map(s => {
                        const node = skillTrees.find(n => n.id === s.id);
                        return (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: 'var(--text-sm)' }}>{node?.name || s.id}</span>
                            <StatusTag meta={SKILL_MASTERY[s.mastery]} />
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                </Col>
              </Row>
            </div>
          )}

          {/* 我的项目 Tab */}
          {activeTab === 'projects' && (
            <div>
              <Row gutter={16}>
                {mockProjects.map(p => (
                  <Col span={8} key={p.id}>
                    <SectionCard>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <StatusTag meta={resolveStatus(PROJECT_STATUS, p.status)} />
                      </div>
                      <Typography.Text type="secondary" style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: 8 }}>角色：{p.role}</Typography.Text>
                      <ProgressBar percent={p.progress} size="small" />
                      <Typography.Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{p.progress}% 完成</Typography.Text>
                    </SectionCard>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
}
