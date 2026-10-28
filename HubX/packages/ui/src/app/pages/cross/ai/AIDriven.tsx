import { useState, useMemo } from 'react';
import {
  Avatar,
  Badge,
  Button,
  CountdownTag,
  DataTable,
  DateText,
  Grid,
  IconApps,
  IconArrowRight,
  IconCalendar,
  IconCheckCircle,
  IconClockCircle,
  IconExperiment,
  IconExclamationCircle,
  IconFile,
  IconFolder,
  IconSend,
  IconUser,
  MetricGrid,
  Modal,
  PageHeader,
  PageShell,
  AlertBanner,
  ProgressBar,
  Select,
  SectionTabs,
  SectionCard,
  Space,
  StatusTag,
  Tabs,
  Timeline,
  Typography,
  type StatusTone,
} from '@/design-system';

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
    <PageShell>
      <PageHeader
        title="AI 智能助手"
        description="用 AI 拆解需求、生成任务，并提示高风险节点。"
      />
      {/* 顶部摘要 */}
      <MetricGrid
        items={[
          { key: 'tasks', label: <><IconApps /> AI 拆解任务</>, value: `${summary.totalTasks} 个` },
          { key: 'assigned', label: <><IconCheckCircle /> 已分配</>, value: `${summary.assigned} 个`, tone: 'success' },
          { key: 'risk', label: <><IconExclamationCircle /> 高风险节点</>, value: `${summary.highRiskMilestones} 个`, tone: 'danger' },
          { key: 'meetings', label: <><IconCalendar /> 待确认会议</>, value: `${summary.suggestedMeetings} 场`, tone: 'warning' },
          { key: 'personnel', label: <><IconUser /> 人员匹配</>, value: `${mockPersonnelMatches.length} 项` },
          { key: 'suggestions', label: <><IconExperiment /> AI 建议</>, value: `${mockMilestones.length} 条` },
        ]}
      />

      {/* 主体 Tab */}
      <SectionCard bordered={false}>
        <SectionTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'tasks',
              label: <span><IconApps /> 智能任务拆解</span>,
            },
            {
              key: 'personnel',
              label: <span><IconUser /> 智能人员分配</span>,
            },
            {
              key: 'milestones',
              label: <span><IconClockCircle /> 智能跟进提醒 <Badge count={summary.highRiskMilestones} color="red" /></span>,
            },
            {
              key: 'meetings',
              label: <span><IconCalendar /> 智能会议安排 <Badge count={summary.suggestedMeetings} color="orange" /></span>,
            },
          ]}
        />

        <div style={{ paddingTop: 16 }}>
          {/* 智能任务拆解 Tab */}
          {activeTab === 'tasks' && (
            <div>
              <AlertBanner tone="info" style={{ marginBottom: 16 }}>AI 根据合同 SOW 自动拆解项目任务，估算工期，并推荐最佳人员。</AlertBanner>
              <DataTable
                columns={[
                  { title: '任务', dataIndex: 'title', width: 160, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  { title: '阶段', dataIndex: 'phase', width: 80, render: (v: string) => <StatusTag tone="info">{v}</StatusTag> },
                  { title: '预估工期', dataIndex: 'estimatedDays', width: 80, render: (v: number) => `${v}天` },
                  {
                    title: '所需技能', dataIndex: 'requiredSkills', width: 160,
                    render: (skills: string[]) => <Space size={4} wrap>{skills.map(s => <StatusTag key={s} size="small">{s}</StatusTag>)}</Space>,
                  },
                  {
                    title: '推荐人员', dataIndex: 'suggestedAssignee', width: 80,
                    render: (v: string) => <StatusTag tone="purple">{v}</StatusTag>,
                  },
                  {
                    title: '优先级', dataIndex: 'priority', width: 70,
                    render: (p: string) => <StatusTag tone={p === 'high' ? 'danger' : p === 'medium' ? 'info' : 'neutral'}>{p === 'high' ? '高' : p === 'medium' ? '中' : '低'}</StatusTag>,
                  },
                  {
                    title: '状态', dataIndex: 'status', width: 80,
                    render: (s: string) => {
                      const map: Record<string, { label: string; tone: StatusTone }> = { pending: { label: '待分配', tone: 'neutral' }, assigned: { label: '已分配', tone: 'info' }, in_progress: { label: '进行中', tone: 'success' } };
                      const m = map[s] || map.pending;
                      return <StatusTag tone={m.tone}>{m.label}</StatusTag>;
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
              <AlertBanner tone="info" style={{ marginBottom: 16 }}>AI 根据员工技能树、能力值和当前负载，为每个任务推荐最佳人选。</AlertBanner>
              {mockPersonnelMatches.map(match => (
                <SectionCard key={match.taskTitle} size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Title heading={6} style={{ margin: 0 }}><IconSend style={{ marginRight: 4 }} /> {match.taskTitle}</Title>
                    <Button type="text" size="small" onClick={() => { setSelectedMatch(match); setDetailModalVisible(true); }}>查看详情</Button>
                  </div>
                  <Row gutter={16}>
                    {match.candidates.map(c => (
                      <Col span={8} key={c.name}>
                        <SectionCard size="small" style={{ borderColor: c.matchScore >= 90 ? 'var(--success-500)' : 'var(--color-border)', borderWidth: c.matchScore >= 90 ? 2 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Avatar size={32} style={{ backgroundColor: 'rgb(var(--primary-6))', color: 'var(--color-white)' }}>{c.name.slice(0, 1)}</Avatar>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              <StatusTag tone={c.matchScore >= 90 ? 'success' : c.matchScore >= 70 ? 'warning' : 'neutral'} size="small">
                                匹配度 {c.matchScore}%
                              </StatusTag>
                            </div>
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                            <span style={{ color: 'var(--color-text-3)' }}>负载：</span>
                            <StatusTag tone={c.currentLoad > 80 ? 'danger' : c.currentLoad > 60 ? 'warning' : 'success'} size="small">
                              {c.currentLoad}%
                            </StatusTag>
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                            技能：{c.skills.join('、')}
                          </div>
                        </SectionCard>
                      </Col>
                    ))}
                  </Row>
                </SectionCard>
              ))}
            </div>
          )}

          {/* 智能跟进提醒 Tab */}
          {activeTab === 'milestones' && (
            <div>
              {mockMilestones.filter(m => m.risk === 'high').length > 0 && (
                <AlertBanner tone="danger" style={{ marginBottom: 16 }}>{`检测到 ${mockMilestones.filter(m => m.risk === 'high').length} 个高风险节点，建议立即处理。`}</AlertBanner>
              )}
              <DataTable
                columns={[
                  {
                    title: '风险', dataIndex: 'risk', width: 70,
                    render: (r: string) => <StatusTag tone={r === 'high' ? 'danger' : r === 'medium' ? 'warning' : 'success'}>{r === 'high' ? '高' : r === 'medium' ? '中' : '低'}</StatusTag>,
                  },
                  { title: '项目', dataIndex: 'projectName', width: 140, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  { title: '里程碑', dataIndex: 'milestone', width: 120 },
                  { title: '截止日期', dataIndex: 'dueDate', width: 100, render: (v: string) => <DateText value={v} /> },
                  {
                    title: '剩余天数', dataIndex: 'daysUntil', width: 90,
                    render: (v: number) => <CountdownTag days={v} warningWithin={10} />,
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
              <AlertBanner tone="info" style={{ marginBottom: 16 }}>AI 根据项目阶段自动推荐需要召开的会议，并建议参会人和议程。</AlertBanner>
              <Row gutter={16}>
                {autoMeetings.map(meeting => (
                  <Col span={12} key={meeting.id} style={{ marginBottom: 16 }}>
                    <SectionCard
                      size="small"
                      style={{ borderRadius: 'var(--radius-md)', opacity: meeting.status === 'dismissed' ? 0.5 : 1 }}
                      extra={
                        meeting.status === 'confirmed'
                          ? <StatusTag tone="success">已确认</StatusTag>
                          : meeting.status === 'dismissed'
                            ? <StatusTag>已忽略</StatusTag>
                            : <StatusTag tone="warning">AI 建议</StatusTag>
                      }
                    >
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 8 }}><IconCalendar style={{ marginRight: 4 }} /> {meeting.suggestedType}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', marginBottom: 4 }}>
                        <IconFolder style={{ marginRight: 4 }} /> {meeting.projectName} · {meeting.phase}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', marginBottom: 8 }}>
                        <IconClockCircle style={{ marginRight: 4 }} /> {meeting.suggestedDate}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', marginBottom: 8 }}>
                        <Avatar.Group size={20} maxCount={5}>
                          {meeting.attendees.map(a => <Avatar key={a} style={{ background: 'var(--primary)', fontSize: 'var(--text-xs)' }}>{a.slice(0, 1)}</Avatar>)}
                        </Avatar.Group>
                        <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: 'var(--text-xs)' }}>{meeting.attendees.join('、')}</span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 12 }}><IconFile style={{ marginRight: 4 }} /> {meeting.agenda}</div>
                      {meeting.status === 'suggested' && (
                        <Space>
                          <Button type="primary" size="small" onClick={() => handleConfirmMeeting(meeting.id)}>确认安排</Button>
                          <Button size="small" status="danger" onClick={() => handleDismissMeeting(meeting.id)}>忽略</Button>
                        </Space>
                      )}
                    </SectionCard>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      </SectionCard>

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
                dot={idx === 0 ? <IconCheckCircle style={{ color: 'var(--success-500)', fontSize: 'var(--text-base)' }} /> : undefined}
                label={`${c.matchScore}% 匹配`}
              >
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
                  技能：{c.skills.join('、')} | 当前负载：{c.currentLoad}%
                </div>
                <ProgressBar percent={c.matchScore} size="small" tone="success" style={{ marginTop: 4 }} />
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Modal>
    </PageShell>
  );
}
