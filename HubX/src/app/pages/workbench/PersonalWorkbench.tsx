import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Grid,
  Statistic,
  Button,
  Space,
  Tag,
  Progress,
  Typography,
  Tabs,
  Table,
  Avatar,
  List,
  Badge,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconUser,
  IconCalendar,
  IconFile,
  IconTrophy,
  IconStar,
  IconArrowRight,
  IconCheckCircle,
  IconClockCircle,
  IconExclamationCircle,
  IconEdit,
  IconPlus,
  IconCustomerService,
} from '@arco-design/web-react/icon';
import { useEmployee } from '../employee/EmployeeContext';
import {
  ABILITY_DIMENSION_LABELS,
  ABILITY_DIMENSION_COLORS,
  calcPromotionProgress,
  getLevelColor,
  formatCurrency,
  AbilityDimension,
} from '../employee/mockData';

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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 顶部欢迎栏 */}
      <Card bordered={false} style={{ background: 'linear-gradient(135deg, rgba(22,93,255,0.06), rgba(0,180,42,0.04))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar size={56} style={{ background: 'linear-gradient(135deg, rgb(var(--primary-6)), rgb(var(--primary-4)))', fontSize: 22, fontWeight: 700 }}>
              {currentEmployee.name.slice(0, 1)}
            </Avatar>
            <div>
              <Title heading={4} style={{ margin: 0 }}>早上好，{currentEmployee.name} 👋</Title>
              <Typography.Text type="secondary">
                {currentEmployee.department} · {currentEmployee.position} · {currentEmployee.level}
                {personality?.mbti && <Tag color="#7c3aed" style={{marginLeft: 8 }}>{personality.mbti.type}</Tag>}
              </Typography.Text>
            </div>
          </div>
          <Space>
            <Button type="primary" icon={<IconEdit />} onClick={() => navigate('/dailyreport/list')}>填写日报</Button>
            <Button icon={<IconPlus />} onClick={() => navigate('/leads/public')}>新建线索</Button>
          </Space>
        </div>
      </Card>

      {/* 核心指标 */}
      <Row gutter={16}>
        <Col span={4}>
          <Card>
            <Statistic title="待办任务" value={stats.pendingTasks} suffix="项" prefix={<IconExclamationCircle style={{ color: '#ff7d00' }} />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="今日到期" value={stats.todayTasks} suffix="项" prefix={<IconClockCircle style={{ color: '#f53f3f' }} />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="参与项目" value={stats.myProjects} suffix="个" icon={<IconFile style={{ color: 'rgb(var(--primary-6))' }} />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="加权总分" value={cap?.weightedScore || 0} suffix="分" prefix={<IconTrophy style={{ color: '#ff7d00' }} />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="已解锁技能" value={cap?.skills.filter(s => s.status === 'unlocked').length || 0} suffix="个" prefix={<IconStar style={{ color: '#7c3aed' }} />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="日报状态"
              value={mockDailyReportReminder.submitted ? '已提交' : '未提交'}
              prefix={mockDailyReportReminder.submitted
                ? <IconCheckCircle style={{ color: '#00b42a' }} />
                : <IconExclamationCircle style={{ color: '#f53f3f' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="overview" title={<span><IconUser /> 概览</span>} />
          <TabPane key="tasks" title={<span><IconCheckCircle /> 任务清单</span>} />
          <TabPane key="capability" title={<span><IconTrophy /> 能力面板</span>} />
          <TabPane key="projects" title={<span><IconFile /> 我的项目</span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 概览 Tab */}
          {activeTab === 'overview' && (
            <Row gutter={16}>
              <Col span={10}>
                {/* 能力雷达图 */}
                {cap && (
                  <Card title="能力雷达图" size="small" bodyStyle={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <MiniRadar scores={cap.scores} size={220} />
                  </Card>
                )}
                {/* 晋级进度 */}
                {cap && (
                  <Card title="晋级进度" size="small" style={{ marginTop: 12 }} bodyStyle={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{currentEmployee.level}</span>
                      <span style={{ color: 'var(--color-text-3)' }}>→ {`L${parseInt(currentEmployee.level.replace('L', '')) + 1}`}</span>
                    </div>
                    <Progress percent={calcPromotionProgress(cap.weightedScore, currentEmployee.level)} color={cap.promotionEligible ? '#00b42a' : 'rgb(var(--primary-6))'} size="large" />
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                      加权总分 {cap.weightedScore} 分
                      {cap.promotionEligible && <Tag color="#00b42a" style={{marginLeft: 8 }} size="small">可晋级</Tag>}
                    </Typography.Text>
                  </Card>
                )}
              </Col>
              <Col span={14}>
                {/* 快捷入口 */}
                <Card title="快捷入口" size="small" style={{ marginBottom: 12 }}>
                  <Row gutter={12}>
                    {[
                      { icon: <IconEdit />, label: '填写日报', color: '#165dff', action: () => navigate('/dailyreport/list') },
                      { icon: <IconPlus />, label: '新建线索', color: '#00b42a', action: () => navigate('/leads/public') },
                      { icon: <IconFile />, label: '查看合同', color: '#ff7d00', action: () => navigate('/contracts') },
                      { icon: <IconCustomerService />, label: '我的线索', color: '#7c3aed', action: () => navigate('/leads/my') },
                    ].map(btn => (
                      <Col span={6} key={btn.label}>
                        <Button
                          long
                          style={{ height: 72, display: 'flex', flexDirection: 'column', gap: 4, color: btn.color, borderColor: `${btn.color}33` }}
                          onClick={btn.action}
                        >
                          <span style={{ fontSize: 20 }}>{btn.icon}</span>
                          <span style={{ fontSize: 12 }}>{btn.label}</span>
                        </Button>
                      </Col>
                    ))}
                  </Row>
                </Card>

                {/* 待办任务 */}
                <Card
                  title={<span>待办任务 <Badge count={stats.pendingTasks} style={{ background: 'rgb(var(--primary-6))' }} /></span>}
                  size="small"
                  extra={<Button type="text" size="small" onClick={() => setActiveTab('tasks')}>查看全部 <IconArrowRight /></Button>}
                >
                  <List
                    dataSource={mockTasks.filter(t => !t.done).slice(0, 4)}
                    render={(task: Task) => (
                      <List.Item key={task.id} style={{ padding: '8px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <Space>
                            <Tag color={task.priority === 'high' ? '#f53f3f' : task.priority === 'medium' ? '#ff7d00' : '#86909c'}>
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </Tag>
                            <span style={{ fontSize: 13 }}>{task.title}</span>
                          </Space>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{task.dueDate}</Typography.Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 任务清单 Tab */}
          {activeTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space>
                  <Tag color="rgb(var(--primary-6))">全部 {mockTasks.length}</Tag>
                  <Tag>待办 {mockTasks.filter(t => !t.done).length}</Tag>
                  <Tag color="#00b42a">已完成 {mockTasks.filter(t => t.done).length}</Tag>
                </Space>
                <Button type="primary" icon={<IconPlus />} size="small">新建任务</Button>
              </div>
              <Table
                columns={[
                  {
                    title: '优先级', dataIndex: 'priority', width: 70,
                    render: (p: string) => (
                      <Tag color={p === 'high' ? '#f53f3f' : p === 'medium' ? '#ff7d00' : '#86909c'}>
                        {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                      </Tag>
                    ),
                    sorter: (a: Task, b: Task) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return order[a.priority] - order[b.priority];
                    },
                  },
                  { title: '任务', dataIndex: 'title' },
                  {
                    title: '类型', dataIndex: 'type', width: 80,
                    render: (t: string) => <Tag>{t === 'personal' ? '个人' : '团队'}</Tag>,
                  },
                  { title: '截止日期', dataIndex: 'dueDate', width: 110 },
                  {
                    title: '状态', dataIndex: 'done', width: 80,
                    render: (done: boolean) => done
                      ? <Tag color="#00b42a">已完成</Tag>
                      : <Tag color="#ff7d00">待办</Tag>,
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
                  <Card title="五维能力" size="small" bodyStyle={{ padding: '16px' }}>
                    {(Object.keys(cap.scores) as AbilityDimension[]).map(dim => (
                      <div key={dim} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: ABILITY_DIMENSION_COLORS[dim] }}>
                            {ABILITY_DIMENSION_LABELS[dim]}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{cap.scores[dim]}</span>
                        </div>
                        <Progress percent={cap.scores[dim]} color={ABILITY_DIMENSION_COLORS[dim]} />
                      </div>
                    ))}
                  </Card>
                </Col>
                <Col span={14}>
                  <Card title="技能掌握" size="small" bodyStyle={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <Tag color="#00b42a">
                        已解锁 {cap.skills.filter(s => s.status === 'unlocked').length}
                      </Tag>
                      <Tag color="#c9cdd4">
                        待解锁 {cap.skills.filter(s => s.status === 'locked').length}
                      </Tag>
                    </div>
                    {nextSkill && (
                      <Card size="small" style={{ background: 'var(--color-fill-1)', marginBottom: 12 }} bodyStyle={{ padding: '10px 14px' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>下一个可解锁技能</Typography.Text>
                        <div style={{ fontWeight: 600, marginTop: 4 }}>
                          🔓 {nextSkill.name}
                          <Tag color={ABILITY_DIMENSION_COLORS[nextSkill.domain]} style={{marginLeft: 8 }} size="small">
                            {ABILITY_DIMENSION_LABELS[nextSkill.domain]}
                          </Tag>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{nextSkill.description}</Typography.Text>
                      </Card>
                    )}
                    <div style={{ maxHeight: 240, overflow: 'auto' }}>
                      {cap.skills.filter(s => s.status === 'unlocked').slice(0, 8).map(s => {
                        const node = skillTrees.find(n => n.id === s.id);
                        return (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: 13 }}>{node?.name || s.id}</span>
                            <Tag
                              color={s.mastery === 'expert' ? '#7c3aed' : s.mastery === 'proficient' ? '#165dff' : '#86909c'}
                              size="small"
                            >
                              {s.mastery === 'expert' ? '精通' : s.mastery === 'proficient' ? '熟练' : '入门'}
                            </Tag>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
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
                    <Card size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <Tag color={p.status === '验收中' ? '#00b42a' : 'rgb(var(--primary-6))'}>{p.status}</Tag>
                      </div>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>角色：{p.role}</Typography.Text>
                      <Progress percent={p.progress} color="rgb(var(--primary-6))" size="small" />
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>{p.progress}% 完成</Typography.Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      </Card>
    </Space>
  );
}
