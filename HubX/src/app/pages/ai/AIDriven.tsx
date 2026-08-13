import { useState, useMemo } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Typography,
  Timeline,
  Avatar,
  Badge,
  Alert,
  Select,
  Modal,
  Form,
  Input,
  TextArea,
} from '@arco-design/web-react';
import {
  IconApps,
  IconUser,
  IconCalendar,
  IconFile,
  IconCheckCircle,
  IconClockCircle,
  IconExclamationCircle,
  IconExperiment,
  IconArrowRight,
  IconSend,
  IconFolder,
} from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;
const SelectOption = Select.Option;

// ---------- 类型 ----------

interface AutoTask {
  id: string;
  title: string;
  phase: string;
  estimatedDays: number;
  requiredSkills: string[];
  suggestedAssignee: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'in_progress';
}

interface PersonnelMatch {
  taskTitle: string;
  candidates: {
    name: string;
    matchScore: number;
    skills: string[];
    currentLoad: number;  // 0-100
    availability: 'available' | 'busy' | 'full';
  }[];
}

interface MilestoneReminder {
  id: string;
  projectName: string;
  milestone: string;
  dueDate: string;
  daysUntil: number;
  risk: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface AutoMeeting {
  id: string;
  projectName: string;
  phase: string;
  suggestedType: string;
  suggestedDate: string;
  attendees: string[];
  agenda: string;
  status: 'suggested' | 'confirmed' | 'dismissed';
}

// ---------- 模拟数据 ----------

const mockAutoTasks: AutoTask[] = [
  { id: 'at-1', title: '需求调研与客户沟通',     phase: '需求分析', estimatedDays: 5,  requiredSkills: ['需求分析', '客户沟通'],    suggestedAssignee: '林小红', priority: 'high',   status: 'assigned' },
  { id: 'at-2', title: '系统架构设计',           phase: '方案设计', estimatedDays: 7,  requiredSkills: ['系统设计', '架构'],        suggestedAssignee: '李四',   priority: 'high',   status: 'pending' },
  { id: 'at-3', title: 'UI 界面设计',            phase: '方案设计', estimatedDays: 10, requiredSkills: ['Figma', 'UI设计'],          suggestedAssignee: '陈明',   priority: 'medium', status: 'pending' },
  { id: 'at-4', title: '前端页面开发',           phase: '开发',     estimatedDays: 15, requiredSkills: ['React', '前端开发'],        suggestedAssignee: '黄丽',   priority: 'high',   status: 'pending' },
  { id: 'at-5', title: '后端 API 开发',          phase: '开发',     estimatedDays: 15, requiredSkills: ['Java', '后端开发'],         suggestedAssignee: '李四',   priority: 'high',   status: 'pending' },
  { id: 'at-6', title: '数据库设计与实现',       phase: '开发',     estimatedDays: 5,  requiredSkills: ['数据库', '后端开发'],       suggestedAssignee: '李四',   priority: 'medium', status: 'pending' },
  { id: 'at-7', title: '系统集成测试',           phase: '测试',     estimatedDays: 7,  requiredSkills: ['测试验收'],               suggestedAssignee: '赵六',   priority: 'medium', status: 'pending' },
  { id: 'at-8', title: '用户验收测试（UAT）',    phase: '验收',     estimatedDays: 5,  requiredSkills: ['客户沟通', '测试验收'],     suggestedAssignee: '张三',   priority: 'high',   status: 'pending' },
];

const mockPersonnelMatches: PersonnelMatch[] = [
  {
    taskTitle: '前端页面开发',
    candidates: [
      { name: '黄丽', matchScore: 95, skills: ['React', 'TypeScript', '前端开发'], currentLoad: 60, availability: 'available' },
      { name: '王五', matchScore: 78, skills: ['React', '前端开发'],                currentLoad: 85, availability: 'busy' },
    ],
  },
  {
    taskTitle: '后端 API 开发',
    candidates: [
      { name: '李四', matchScore: 92, skills: ['Java', 'Spring Boot', '后端开发'], currentLoad: 70, availability: 'available' },
      { name: '赵六', matchScore: 65, skills: ['Python', '后端开发'],               currentLoad: 45, availability: 'available' },
    ],
  },
  {
    taskTitle: 'UI 界面设计',
    candidates: [
      { name: '陈明', matchScore: 98, skills: ['Figma', 'UI设计', '原型设计'],      currentLoad: 50, availability: 'available' },
      { name: '杨帆', matchScore: 40, skills: ['UI设计'],                           currentLoad: 30, availability: 'available' },
    ],
  },
];

const mockMilestones: MilestoneReminder[] = [
  { id: 'ms-1', projectName: '云服务平台项目', milestone: '需求评审',     dueDate: '2026-07-05', daysUntil: 3,  risk: 'medium', suggestion: '建议提前准备需求文档，预约会议室 A' },
  { id: 'ms-2', projectName: '医疗健康 APP',  milestone: 'UI设计评审',  dueDate: '2026-07-08', daysUntil: 6,  risk: 'low',    suggestion: '陈明已完成初稿，建议安排评审' },
  { id: 'ms-3', projectName: '云服务平台项目', milestone: '第一阶段交付', dueDate: '2026-07-10', daysUntil: 8,  risk: 'high',   suggestion: '后端开发进度滞后 2 天，建议增加人手或调整排期' },
  { id: 'ms-4', projectName: '电商平台小程序', milestone: '验收测试',     dueDate: '2026-07-12', daysUntil: 10, risk: 'medium', suggestion: '建议提前准备验收清单，通知客户参与' },
  { id: 'ms-5', projectName: '智能制造 MES',  milestone: '合同回款节点', dueDate: '2026-07-15', daysUntil: 13, risk: 'high',   suggestion: '第三期回款节点临近，建议提前联系客户确认付款' },
];

const mockAutoMeetings: AutoMeeting[] = [
  { id: 'am-1', projectName: '云服务平台项目', phase: '需求分析', suggestedType: '需求评审会',     suggestedDate: '2026-07-03 14:00', attendees: ['徐强', '李四', '林小红', '张三'], agenda: '需求文档评审、技术方案讨论', status: 'suggested' },
  { id: 'am-2', projectName: '医疗健康 APP',  phase: '方案设计', suggestedType: '设计评审会',     suggestedDate: '2026-07-05 10:00', attendees: ['陈明', '徐强', '林小红'],           agenda: 'UI设计稿评审、交互确认',   status: 'suggested' },
  { id: 'am-3', projectName: '电商平台小程序', phase: '开发',     suggestedType: 'Sprint 计划会',  suggestedDate: '2026-07-04 09:30', attendees: ['李四', '赵六', '陈明'],               agenda: 'Sprint 2 任务分配',        status: 'confirmed' },
  { id: 'am-4', projectName: '云服务平台项目', phase: '开发',     suggestedType: '中期检查会',     suggestedDate: '2026-07-08 10:00', attendees: ['徐强', '李四', '黄丽'],               agenda: '开发进度检查、问题协调',   status: 'suggested' },
];

// ---------- 主组件 ----------

export function AIDriven() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [autoMeetings, setAutoMeetings] = useState(mockAutoMeetings);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<PersonnelMatch | null>(null);

  const summary = useMemo(() => {
    const totalTasks = mockAutoTasks.length;
    const assigned = mockAutoTasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').length;
    const highRiskMilestones = mockMilestones.filter(m => m.risk === 'high').length;
    const suggestedMeetings = autoMeetings.filter(m => m.status === 'suggested').length;
    return { totalTasks, assigned, highRiskMilestones, suggestedMeetings };
  }, [autoMeetings]);

  const handleConfirmMeeting = (id: string) => {
    setAutoMeetings(prev => prev.map(m => m.id === id ? { ...m, status: 'confirmed' as const } : m));
  };

  const handleDismissMeeting = (id: string) => {
    setAutoMeetings(prev => prev.map(m => m.id === id ? { ...m, status: 'dismissed' as const } : m));
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 顶部摘要 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="AI 拆解任务" value={summary.totalTasks} suffix="个" icon={<IconApps style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="已分配" value={summary.assigned} suffix="个" icon={<IconCheckCircle style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="高风险节点" value={summary.highRiskMilestones} suffix="个" prefix={<IconExclamationCircle style={{ color: 'var(--destructive-500)' }} />} valueStyle={{ color: 'var(--destructive-500)' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="待确认会议" value={summary.suggestedMeetings} suffix="场" icon={<IconCalendar style={{ color: 'var(--warning-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="人员匹配" value={mockPersonnelMatches.length} suffix="项" icon={<IconUser style={{ color: 'var(--chart-5)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="AI 建议" value={mockMilestones.length} suffix="条" icon={<IconExperiment style={{ color: 'var(--info-500)' }} />} /></Card></Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="tasks" title={<span><IconApps /> 智能任务拆解</span>} />
          <TabPane key="personnel" title={<span><IconUser /> 智能人员分配</span>} />
          <TabPane key="milestones" title={<span><IconClockCircle /> 智能跟进提醒 <Badge count={summary.highRiskMilestones} style={{ background: 'var(--destructive-500)' }} /></span>} />
          <TabPane key="meetings" title={<span><IconCalendar /> 智能会议安排 <Badge count={summary.suggestedMeetings} style={{ background: 'var(--warning-500)' }} /></span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 智能任务拆解 Tab */}
          {activeTab === 'tasks' && (
            <div>
              <Alert
                type="info"
                content="AI 根据合同 SOW 自动拆解项目任务，估算工期，并推荐最佳人员。"
                style={{ marginBottom: 16 }}
                icon={<IconExperiment />}
              />
              <Table
                columns={[
                  { title: '任务', dataIndex: 'title', width: 160, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  { title: '阶段', dataIndex: 'phase', width: 80, render: (v: string) => <Tag color="blue" >{v}</Tag> },
                  { title: '预估工期', dataIndex: 'estimatedDays', width: 80, render: (v: number) => `${v}天` },
                  {
                    title: '所需技能', dataIndex: 'requiredSkills', width: 160,
                    render: (skills: string[]) => <Space size={4} wrap>{skills.map(s => <Tag key={s} size="small">{s}</Tag>)}</Space>,
                  },
                  {
                    title: '推荐人员', dataIndex: 'suggestedAssignee', width: 80,
                    render: (v: string) => <Tag color="purple" >{v}</Tag>,
                  },
                  {
                    title: '优先级', dataIndex: 'priority', width: 70,
                    render: (p: string) => <Tag color={p === 'high' ? 'var(--destructive-500)' : p === 'medium' ? 'var(--primary)' : 'var(--muted-foreground)'} >{p === 'high' ? '高' : p === 'medium' ? '中' : '低'}</Tag>,
                  },
                  {
                    title: '状态', dataIndex: 'status', width: 80,
                    render: (s: string) => {
                      const map: Record<string, { label: string; color: string }> = { pending: { label: '待分配', color: 'var(--muted-foreground)' }, assigned: { label: '已分配', color: 'var(--primary)' }, in_progress: { label: '进行中', color: 'var(--success-500)' } };
                      const m = map[s] || map.pending;
                      return <Tag color={m.color} >{m.label}</Tag>;
                    },
                  },
                ] as any}
                data={mockAutoTasks}
                rowKey="id"
                pagination={false}
              />
            </div>
          )}

          {/* 智能人员分配 Tab */}
          {activeTab === 'personnel' && (
            <div>
              <Alert
                type="info"
                content="AI 根据员工技能树、能力值和当前负载，为每个任务推荐最佳人选。"
                style={{ marginBottom: 16 }}
                icon={<IconUser />}
              />
              {mockPersonnelMatches.map(match => (
                <Card key={match.taskTitle} size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Title heading={6} style={{ margin: 0 }}><IconSend style={{ marginRight: 4 }} /> {match.taskTitle}</Title>
                    <Button type="text" size="small" onClick={() => { setSelectedMatch(match); setDetailModalVisible(true); }}>查看详情</Button>
                  </div>
                  <Row gutter={16}>
                    {match.candidates.map(c => (
                      <Col span={8} key={c.name}>
                        <Card size="small" style={{ borderColor: c.matchScore >= 90 ? 'var(--success-500)' : 'var(--color-border)', borderWidth: c.matchScore >= 90 ? 2 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Avatar size={32} style={{ background: 'var(--primary)' }}>{c.name.slice(0, 1)}</Avatar>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              <Tag color={c.matchScore >= 90 ? 'var(--success-500)' : c.matchScore >= 70 ? 'var(--warning-500)' : 'var(--muted-foreground)'}  size="small">
                                匹配度 {c.matchScore}%
                              </Tag>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: 'var(--color-text-3)' }}>负载：</span>
                            <span style={{ color: c.currentLoad > 80 ? 'var(--destructive-500)' : c.currentLoad > 60 ? 'var(--warning-500)' : 'var(--success-500)' }}>{c.currentLoad}%</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                            技能：{c.skills.join('、')}
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              ))}
            </div>
          )}

          {/* 智能跟进提醒 Tab */}
          {activeTab === 'milestones' && (
            <div>
              {mockMilestones.filter(m => m.risk === 'high').length > 0 && (
                <Alert
                  type="error"
                  content={`检测到 ${mockMilestones.filter(m => m.risk === 'high').length} 个高风险节点，建议立即处理。`}
                  style={{ marginBottom: 16 }}
                  icon={<IconExclamationCircle />}
                />
              )}
              <Table
                columns={[
                  {
                    title: '风险', dataIndex: 'risk', width: 70,
                    render: (r: string) => <Tag color={r === 'high' ? 'var(--destructive-500)' : r === 'medium' ? 'var(--warning-500)' : 'var(--success-500)'} >{r === 'high' ? '高' : r === 'medium' ? '中' : '低'}</Tag>,
                  },
                  { title: '项目', dataIndex: 'projectName', width: 140, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  { title: '里程碑', dataIndex: 'milestone', width: 120 },
                  { title: '截止日期', dataIndex: 'dueDate', width: 100 },
                  {
                    title: '剩余天数', dataIndex: 'daysUntil', width: 90,
                    render: (v: number) => <span style={{ color: v <= 5 ? 'var(--destructive-500)' : v <= 10 ? 'var(--warning-500)' : 'inherit', fontWeight: v <= 5 ? 600 : 400 }}>{v} 天</span>,
                  },
                  { title: 'AI 建议', dataIndex: 'suggestion' },
                ] as any}
                data={mockMilestones}
                rowKey="id"
                pagination={false}
              />
            </div>
          )}

          {/* 智能会议安排 Tab */}
          {activeTab === 'meetings' && (
            <div>
              <Alert
                type="info"
                content="AI 根据项目阶段自动推荐需要召开的会议，并建议参会人和议程。"
                style={{ marginBottom: 16 }}
                icon={<IconCalendar />}
              />
              <Row gutter={16}>
                {autoMeetings.map(meeting => (
                  <Col span={12} key={meeting.id} style={{ marginBottom: 16 }}>
                    <Card
                      size="small"
                      style={{ borderRadius: 8, opacity: meeting.status === 'dismissed' ? 0.5 : 1 }}
                      extra={
                        meeting.status === 'confirmed'
                          ? <Tag color="var(--success-500)" >已确认</Tag>
                          : meeting.status === 'dismissed'
                            ? <Tag>已忽略</Tag>
                            : <Tag color="var(--warning-500)" >AI 建议</Tag>
                      }
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}><IconCalendar style={{ marginRight: 4 }} /> {meeting.suggestedType}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 4 }}>
                        <IconFolder style={{ marginRight: 4 }} /> {meeting.projectName} · {meeting.phase}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8 }}>
                        <IconClockCircle style={{ marginRight: 4 }} /> {meeting.suggestedDate}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        <Avatar.Group size={20} maxCount={5}>
                          {meeting.attendees.map(a => <Avatar key={a} style={{ background: 'var(--primary)', fontSize: 10 }}>{a.slice(0, 1)}</Avatar>)}
                        </Avatar.Group>
                        <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: 11 }}>{meeting.attendees.join('、')}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 12 }}><IconFile style={{ marginRight: 4 }} /> {meeting.agenda}</div>
                      {meeting.status === 'suggested' && (
                        <Space>
                          <Button type="primary" size="small" onClick={() => handleConfirmMeeting(meeting.id)}>确认安排</Button>
                          <Button size="small" status="danger" onClick={() => handleDismissMeeting(meeting.id)}>忽略</Button>
                        </Space>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      </Card>

      {/* 人员匹配详情弹窗 */}
      <Modal
        title={selectedMatch ? `「${selectedMatch.taskTitle}」人员匹配详情` : ''}
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        style={{ width: 500 }}
      >
        {selectedMatch && (
          <Timeline>
            {selectedMatch.candidates.map((c, idx) => (
              <Timeline.Item
                key={c.name}
                dot={idx === 0 ? <IconCheckCircle style={{ color: 'var(--success-500)', fontSize: 16 }} /> : undefined}
                label={`${c.matchScore}% 匹配`}
              >
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                  技能：{c.skills.join('、')} | 当前负载：{c.currentLoad}%
                </div>
                <Progress percent={c.matchScore} size="small" color={c.matchScore >= 90 ? 'var(--success-500)' : 'var(--warning-500)'} style={{ marginTop: 4 }} />
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Modal>
    </Space>
  );
}