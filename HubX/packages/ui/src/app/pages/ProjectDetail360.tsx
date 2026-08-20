import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Button,
  Space,
  Tag,
  Tabs,
  Typography,
  Grid,
  Progress,
  Steps,
  Descriptions,
  Timeline,
  Tooltip,
  Message,
  Divider,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconEdit,
  IconCalendar,
  IconPlus,
  IconFile,
  IconClockCircle,
  IconUser,
  IconDelete,
  IconUpload,
} from '@arco-design/web-react/icon';
import type {
  ProjectListItem,
  ProjectStatus,
  HealthStatus,
  LifecycleStep,
  ActivityEvent,
  ActivityEventType,
} from './project-management/types';
import {
  PROJECT_STATUS_COLOR,
  PROJECT_PRIORITY_COLOR,
  BUSINESS_LINE_COLOR,
  HEALTH_LABEL,
  HEALTH_COLOR,
  LIFECYCLE_STEPS,
  LIFECYCLE_STEP_LABEL,
  getLifecycleStepIndex,
  ACTIVITY_EVENT_LABEL,
  ACTIVITY_EVENT_ICON,
} from './project-management/types';
import {
  getProjectCountdown,
  formatHours,
  formatAmount,
  filterActivities,
} from './project-management/utils';
import { PROJECT_LIST, getActivitiesByProjectId } from './project-management/projectMockData';

const { Text } = Typography;
const TabPane = Tabs.TabPane;
const Step = Steps.Step;

export function ProjectDetail360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeWorkspace, setActiveWorkspace] = useState('overview');
  const [activityFilter, setActivityFilter] = useState<ActivityEventType[]>([]);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskForm] = Form.useForm();
  const [dailyModalVisible, setDailyModalVisible] = useState(false);
  const [dailyForm] = Form.useForm();
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [meetingForm] = Form.useForm();
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docForm] = Form.useForm();
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmForm] = Form.useForm();
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [demoForm] = Form.useForm();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm] = Form.useForm();

  // Mock 任务数据
  const [tasks, setTasks] = useState([
    { id: 't1', name: '完成CRM系统原型设计', type: '产品设计', assignee: '李四', status: '已完成', dueDate: '2026-08-10', hours: 16 },
    { id: 't2', name: '销售线索列表页开发', type: '开发', assignee: '王五', status: '进行中', dueDate: '2026-08-25', hours: 24 },
    { id: 't3', name: '客户管理模块UI设计', type: 'UI设计', assignee: '孙七', status: '进行中', dueDate: '2026-08-22', hours: 12 },
    { id: 't4', name: '报价流程接口联调', type: '开发', assignee: '赵六', status: '待分配', dueDate: '2026-08-28', hours: 0 },
    { id: 't5', name: '登录模块单元测试', type: '测试', assignee: '钱九', status: '待分配', dueDate: '2026-08-30', hours: 0 },
  ]);

  // Mock 日报数据
  const [dailyReports, setDailyReports] = useState([
    { id: 'd1', date: '2026-08-20', personName: '王五', position: '前端开发', hours: 8, workContent: '完成线索列表页复合列+双向冻结+倒计时胶囊', riskFeedback: '无' },
    { id: 'd2', date: '2026-08-20', personName: '赵六', position: '后端开发', hours: 7.5, workContent: '完成线索跟进API接口开发', riskFeedback: '无' },
    { id: 'd3', date: '2026-08-19', personName: '李四', position: '产品经理', hours: 6, workContent: '完成CRM系统原型设计评审', riskFeedback: '客户对审批流有新增需求' },
    { id: 'd4', date: '2026-08-19', personName: '孙七', position: 'UI设计', hours: 7, workContent: '完成线索详情页UI设计稿', riskFeedback: '无' },
  ]);

  // Mock 回款数据
  const [payments, setPayments] = useState([
    { id: 'p1', period: '首期款', amount: 61500, ratio: '30%', trigger: '合同签署', plannedDate: '2026-05-15', status: '已到账', invoiced: true },
    { id: 'p2', period: '阶段款', amount: 82000, ratio: '40%', trigger: '原型确认', plannedDate: '2026-07-15', status: '已到账', invoiced: true },
    { id: 'p3', period: '终验款', amount: 41000, ratio: '20%', trigger: '终验通过', plannedDate: '2026-09-30', status: '待收款', invoiced: false },
    { id: 'p4', period: '质保款', amount: 20500, ratio: '10%', trigger: '质保期满', plannedDate: '2027-03-30', status: '待收款', invoiced: false },
  ]);

  // Mock 确认书数据
  const [confirmations, setConfirmations] = useState([
    { id: 'c1', type: '需求确认书', status: '已签署', signer: '张经理', signDate: '2026-05-10', attachment: '需求确认书V1.pdf' },
    { id: 'c2', type: '原型确认书', status: '已签署', signer: '张经理', signDate: '2026-06-20', attachment: '原型确认书.pdf' },
  ]);

  // Mock 演示环境数据
  const [demos, setDemos] = useState([
    { id: 'dm1', env: '测试环境', url: 'https://test-crm.example.com', description: '内部测试用' },
    { id: 'dm2', env: '预发布环境', url: 'https://staging-crm.example.com', description: '客户验收用' },
  ]);

  // Mock 会议纪要数据
  const [meetings, setMeetings] = useState([
    { id: 'm1', title: '需求评审会议', time: '2026-05-08 14:00', participants: '李四、张经理、王五', content: '确认CRM系统核心功能清单，客户要求优先交付销售跟进和客户管理模块。' },
    { id: 'm2', title: '原型确认会议', time: '2026-06-18 10:00', participants: '李四、张经理、孙七', content: '客户确认原型设计，局部交互需优化，整体方向通过。' },
  ]);

  // Mock 项目文档数据
  const [documents, setDocuments] = useState([
    { id: 'doc1', name: 'CRM系统需求规格说明书.pdf', type: 'PRD', uploader: '李四', createdAt: '2026-05-12' },
    { id: 'doc2', name: '系统架构设计文档.pdf', type: '架构设计', uploader: '赵六', createdAt: '2026-05-20' },
    { id: 'doc3', name: 'API接口契约V1.yaml', type: 'API文档', uploader: '赵六', createdAt: '2026-06-01' },
  ]);

  // Mock Bug 数据
  const [bugs, setBugs] = useState([
    { id: 'b1', title: '列表页横向滚动卡顿', severity: 'P1', env: '生产环境', assignee: '王五', status: '处理中', createdAt: '2026-08-18' },
    { id: 'b2', title: '表单提交后未清空', severity: 'P2', env: '测试环境', assignee: '赵六', status: '待修复', createdAt: '2026-08-19' },
  ]);

  // 查找项目
  const project = useMemo(() => PROJECT_LIST.find((p) => p.id === id), [id]);

  // Activity Stream
  const allActivities = useMemo(() => id ? getActivitiesByProjectId(id) : [], [id]);
  const filteredActivities = useMemo(() => filterActivities(allActivities, activityFilter), [allActivities, activityFilter]);

  if (!project) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Text type="secondary">项目不存在</Text>
          <div style={{ marginTop: 16 }}>
            <Button onClick={() => navigate('/projects')}>返回列表</Button>
          </div>
        </div>
      </Card>
    );
  }

  const cd = getProjectCountdown(project.startDate, project.expectedEndDate);
  const lifecycleIndex = getLifecycleStepIndex(project.status);

  // 事件类型筛选
  const eventTypes: ActivityEventType[] = ['followup', 'meeting', 'confirmation', 'milestone', 'daily_report', 'contract', 'status_change'];

  return (
    <div>
      {/* ========== 控制台头部 ========== */}
      <Card style={{ marginBottom: 16 }}>
        {/* 顶部：返回+项目元数据 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button type="text" icon={<IconLeft />} onClick={() => navigate('/projects')}>返回列表</Button>
          <Divider type="vertical" />
          <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-text-3)' }}>{project.projectNo}</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{project.name}</span>
          <Tag color={BUSINESS_LINE_COLOR[project.businessLine]}>{project.businessLine}</Tag>
          <Tag color="gray">{project.entity}</Tag>
          <Tag color={PROJECT_PRIORITY_COLOR[project.priority]}>优先级: {project.priority}</Tag>
          <Tag color={HEALTH_COLOR[project.healthStatus]}>
            健康度: {HEALTH_LABEL[project.healthStatus]}
          </Tag>
        </div>

        {/* 全生命周期步骤条 */}
        <div style={{ marginBottom: 16 }}>
          <Steps current={lifecycleIndex} size="small" style={{ maxWidth: 700 }}>
            {LIFECYCLE_STEPS.map((step, index) => (
              <Step
                key={step}
                title={LIFECYCLE_STEP_LABEL[step]}
                description={
                  index === 2 && project.status === '进行中'
                    ? `${project.progress}%`
                    : project.status === '搁置' && index === 2
                    ? '已暂停'
                    : project.status === '延迟' && index === 2
                    ? '延期中'
                    : undefined
                }
              />
            ))}
          </Steps>
        </div>

        {/* 6 维指标胶囊 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <IconUser style={{ color: 'rgb(var(--primary-6))' }} />
            <Text type="secondary">PM:</Text>
            <Text style={{ fontWeight: 500 }}>{project.owner || '待指派'}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <Text type="secondary">客户:</Text>
            <Text style={{ fontWeight: 500 }}>{project.customerName || '-'}</Text>
          </div>
          {project.contractAmount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
              <Text type="secondary">合同额:</Text>
              <Text style={{ fontWeight: 500, color: 'rgb(var(--success-6))' }}>{formatAmount(project.contractAmount)}</Text>
              {project.receivedAmount && (
                <Text type="secondary" style={{ fontSize: 12 }}>已回{Math.round(project.receivedAmount / project.contractAmount * 100)}%</Text>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: cd.isOverdue ? 'rgb(var(--danger-1))' : 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <IconClockCircle style={{ color: cd.isOverdue ? 'rgb(var(--danger-6))' : 'var(--color-text-3)' }} />
            <Text type="secondary">工期:</Text>
            <Text style={{ fontWeight: 500, color: cd.isOverdue ? 'rgb(var(--danger-6))' : undefined }}>{cd.label}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <Text type="secondary">工时:</Text>
            <Text style={{ fontWeight: 500 }}>{formatHours(project.totalHours)} / {formatHours(project.budgetHours)}</Text>
            <Progress percent={Math.round(project.totalHours / project.budgetHours * 100)} size="mini" style={{ width: 60 }} showText={false} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: project.bugP0Count + project.bugP1Count > 0 ? 'rgb(var(--danger-1))' : 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <Text type="secondary">Bug:</Text>
            <Text style={{ fontWeight: 500, color: project.bugP0Count > 0 ? 'rgb(var(--danger-6))' : project.bugP1Count > 0 ? 'rgb(var(--warning-6))' : 'rgb(var(--success-6))' }}>
              P0:{project.bugP0Count} P1:{project.bugP1Count}
            </Text>
          </div>
        </div>

        {/* 全局行动栏 */}
        <Space>
          <Button type="primary" size="small" icon={<IconPlus />}>登记跟进</Button>
          <Button size="small" icon={<IconPlus />}>新建任务</Button>
          <Button size="small" icon={<IconFile />}>录入纪要</Button>
          <Button size="small" icon={<IconCalendar />}>甘特图</Button>
        </Space>
      </Card>

      {/* ========== 五大核心业务域工作台 ========== */}
      <Card>
        <Tabs activeTab={activeWorkspace} onChange={setActiveWorkspace} type="card">
          {/* 域 1：交付总览与动态 */}
          <TabPane key="overview" title="交付总览与动态" />
          {/* 域 2：任务与交付管理 */}
          <TabPane key="tasks" title="任务与交付管理" />
          {/* 域 3：团队与工时 */}
          <TabPane key="team" title="团队与工时" />
          {/* 域 4：商务合同与财务 */}
          <TabPane key="finance" title="商务合同与财务" />
          {/* 域 5：成果物与资料 */}
          <TabPane key="docs" title="成果物与资料" />
        </Tabs>

        <div style={{ marginTop: 16 }}>
          {/* 域 1：交付总览与动态 */}
          {activeWorkspace === 'overview' && (
            <div>
              {/* 四维健康诊断 */}
              <Grid.Row gutter={16} style={{ marginBottom: 24 }}>
                <Grid.Col span={6}>
                  <Card size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>交付里程碑</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{project.progress}%</div>
                    <Progress percent={project.progress} size="small" style={{ marginTop: 8 }} showText={false} />
                  </Card>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Card size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>工时消耗</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{formatHours(project.totalHours)}</div>
                    <Progress percent={Math.round(project.totalHours / project.budgetHours * 100)} size="small" style={{ marginTop: 8 }} showText={false} color="rgb(var(--warning-6))" />
                  </Card>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Card size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>缺陷收敛</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: project.bugP0Count + project.bugP1Count > 0 ? 'rgb(var(--danger-6))' : 'rgb(var(--success-6))' }}>
                      P0:{project.bugP0Count} P1:{project.bugP1Count}
                    </div>
                  </Card>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Card size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>商务回款</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                      {project.contractAmount ? `${Math.round((project.receivedAmount || 0) / project.contractAmount * 100)}%` : '-'}
                    </div>
                    {project.contractAmount && (
                      <Progress percent={Math.round((project.receivedAmount || 0) / project.contractAmount * 100)} size="small" style={{ marginTop: 8 }} showText={false} color="rgb(var(--success-6))" />
                    )}
                  </Card>
                </Grid.Col>
              </Grid.Row>

              {/* Activity Stream 时间轴 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: 500 }}>项目综合动态</Text>
                  <Space size={4}>
                    <Tag
                      color={activityFilter.length === 0 ? 'blue' : 'default'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActivityFilter([])}
                    >
                      全部
                    </Tag>
                    {eventTypes.map((type) => (
                      <Tag
                        key={type}
                        color={activityFilter.includes(type) ? 'blue' : 'default'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setActivityFilter((prev) =>
                            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                          );
                        }}
                      >
                        {ACTIVITY_EVENT_ICON[type]} {ACTIVITY_EVENT_LABEL[type]}
                      </Tag>
                    ))}
                  </Space>
                </div>

                <Timeline style={{ marginTop: 16 }}>
                  {filteredActivities.map((event) => (
                    <Timeline.Item
                      key={event.id}
                      dotColor={
                        event.type === 'status_change' ? 'rgb(var(--primary-6))' :
                        event.type === 'milestone' ? 'rgb(var(--success-6))' :
                        event.isPreSale ? 'var(--color-text-4)' :
                        'var(--color-border-2)'
                      }
                    >
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span>{ACTIVITY_EVENT_ICON[event.type]}</span>
                          <Text style={{ fontWeight: 500, fontSize: 14 }}>{event.title}</Text>
                          {event.isPreSale && <Tag size="small" color="gray">售前</Tag>}
                          <Text type="secondary" style={{ fontSize: 12 }}>{event.createdAt}</Text>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 4 }}>{event.content}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>操作人: {event.operator}</Text>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>

                {filteredActivities.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无动态记录</div>
                )}
              </div>

              {/* 快捷通道 */}
              <Card size="small" title="快捷通道">
                <Space>
                  <Button size="small" type="outline">原型演示</Button>
                  <Button size="small" type="outline">测试环境</Button>
                  <Button size="small" type="outline">预发布环境</Button>
                  <Button size="small" type="outline">设计稿</Button>
                </Space>
              </Card>
            </div>
          )}

          {/* 域 2：任务与交付管理 */}
          {activeWorkspace === 'tasks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 500 }}>任务管理</Text>
                <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { taskForm.resetFields(); setTaskModalVisible(true); }}>新建任务</Button>
              </div>
              <Table
                columns={[
                  { title: '任务名称', dataIndex: 'name', width: 200 },
                  { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => <Tag>{v || '-'}</Tag> },
                  { title: '负责人', dataIndex: 'assignee', width: 100 },
                  { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '进行中' ? 'blue' : 'default'}>{v}</Tag> },
                  { title: '截止日期', dataIndex: 'dueDate', width: 120 },
                  { title: '工时(h)', dataIndex: 'hours', width: 80 },
                  {
                    title: '操作', width: 120,
                    render: (_: unknown, record: any) => (
                      <Space>
                        <Button type="text" size="small" icon={<IconEdit />} onClick={() => { taskForm.setFieldsValue(record); setTaskModalVisible(true); }} />
                        <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setTasks(tasks.filter((t) => t.id !== record.id)); Message.success('已删除'); }} />
                      </Space>
                    ),
                  },
                ]}
                data={tasks}
                pagination={false}
                rowKey="id"
              />

              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: 500 }}>缺陷跟踪 (Bug Tracker)</Text>
                  <Button size="small" icon={<IconPlus />} onClick={() => Message.info('新建缺陷')}>新建缺陷</Button>
                </div>
                <Table
                  columns={[
                    { title: '标题', dataIndex: 'title', width: 200 },
                    { title: '严重度', dataIndex: 'severity', width: 100, render: (v: string) => <Tag color={v === 'P0' ? 'red' : v === 'P1' ? 'orangered' : v === 'P2' ? 'orange' : 'blue'}>{v}</Tag> },
                    { title: '环境', dataIndex: 'env', width: 100 },
                    { title: '责任人', dataIndex: 'assignee', width: 100 },
                    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === '已修复' ? 'green' : v === '处理中' ? 'blue' : 'red'}>{v}</Tag> },
                    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
                    {
                      title: '操作', width: 120,
                      render: (_: unknown, record: any) => (
                        <Space>
                          <Button type="text" size="small" onClick={() => { const updated = bugs.map((b) => b.id === record.id ? { ...b, status: '已修复' } : b); setBugs(updated); Message.success('已标记修复'); }}>修复</Button>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setBugs(bugs.filter((b) => b.id !== record.id)); Message.success('已删除'); }} />
                        </Space>
                      ),
                    },
                  ]}
                  data={bugs}
                  pagination={false}
                  rowKey="id"
                />
              </div>
            </div>
          )}

          {/* 域 3：团队与工时 */}
          {activeWorkspace === 'team' && (
            <div>
              <Card size="small" title="团队成员与分工" style={{ marginBottom: 16 }}>
                <Descriptions
                  column={2}
                  data={[
                    { label: '项目经理', value: project.owner || '待指派' },
                    { label: '商务/销售', value: project.salesUsers.join('、') || '-' },
                    { label: '产品', value: '李四' },
                    { label: 'UI', value: '孙七' },
                    { label: '前端', value: '王五' },
                    { label: '后端', value: '赵六' },
                    { label: '测试', value: '钱九' },
                  ].map((item) => ({ ...item, value: item.value || '-' }))}
                />
              </Card>

              <Card size="small" title="工时统计" style={{ marginBottom: 16 }}>
                <Grid.Row gutter={16}>
                  <Grid.Col span={8}>
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <Text type="secondary">预算工时</Text>
                      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatHours(project.budgetHours)}</div>
                    </div>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <Text type="secondary">已消耗</Text>
                      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatHours(project.totalHours)}</div>
                    </div>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <Text type="secondary">消耗比例</Text>
                      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{Math.round(project.totalHours / project.budgetHours * 100)}%</div>
                    </div>
                  </Grid.Col>
                </Grid.Row>
                <Progress percent={Math.round(project.totalHours / project.budgetHours * 100)} style={{ marginTop: 8 }} />
              </Card>

              <Card size="small" title="日报台账" extra={<Button size="small" type="primary" icon={<IconPlus />} onClick={() => { dailyForm.resetFields(); setDailyModalVisible(true); }}>填报日报</Button>}>
                <Table
                  columns={[
                    { title: '日期', dataIndex: 'date', width: 110 },
                    { title: '成员', dataIndex: 'personName', width: 80 },
                    { title: '岗位', dataIndex: 'position', width: 100 },
                    { title: '工时(h)', dataIndex: 'hours', width: 70 },
                    { title: '工作内容', dataIndex: 'workContent', width: 280 },
                    { title: '风险反馈', dataIndex: 'riskFeedback', width: 160 },
                    {
                      title: '操作', width: 80,
                      render: (_: unknown, record: any) => (
                        <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDailyReports(dailyReports.filter((d) => d.id !== record.id)); Message.success('已删除'); }} />
                      ),
                    },
                  ]}
                  data={dailyReports}
                  pagination={false}
                  rowKey="id"
                />
              </Card>
            </div>
          )}

          {/* 域 4：商务合同与财务 */}
          {activeWorkspace === 'finance' && (
            <div>
              <Card size="small" title="合同概况" style={{ marginBottom: 16 }}>
                <Descriptions
                  column={2}
                  data={[
                    { label: '合同标的额', value: project.contractAmount ? formatAmount(project.contractAmount) : '-' },
                    { label: '已回款金额', value: project.receivedAmount ? formatAmount(project.receivedAmount) : '-' },
                    { label: '待收尾款', value: project.contractAmount && project.receivedAmount ? formatAmount(project.contractAmount - project.receivedAmount) : '-' },
                    { label: '回款比例', value: project.contractAmount ? `${Math.round((project.receivedAmount || 0) / project.contractAmount * 100)}%` : '-' },
                  ]}
                />
              </Card>

              <Card size="small" title="回款期次台账" style={{ marginBottom: 16 }} extra={<Button size="small" icon={<IconPlus />} onClick={() => { paymentForm.resetFields(); setPaymentModalVisible(true); }}>新增回款</Button>}>
                <Table
                  columns={[
                    { title: '期次', dataIndex: 'period', width: 100 },
                    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => `¥${v?.toLocaleString() || 0}` },
                    { title: '比例', dataIndex: 'ratio', width: 80 },
                    { title: '触发条件', dataIndex: 'trigger', width: 150 },
                    { title: '计划日', dataIndex: 'plannedDate', width: 120 },
                    { title: '到账状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === '已到账' ? 'green' : 'orange'}>{v}</Tag> },
                    { title: '开票', dataIndex: 'invoiced', width: 80, render: (v: boolean) => v ? <Tag color="green">已开</Tag> : <Tag>未开</Tag> },
                    {
                      title: '操作', width: 120,
                      render: (_: unknown, record: any) => (
                        <Space>
                          {record.status !== '已到账' && (
                            <Button type="text" size="small" onClick={() => { setPayments(payments.map((p) => p.id === record.id ? { ...p, status: '已到账' } : p)); Message.success('已确认到账'); }}>确认到账</Button>
                          )}
                          {!record.invoiced && (
                            <Button type="text" size="small" onClick={() => { setPayments(payments.map((p) => p.id === record.id ? { ...p, invoiced: true } : p)); Message.success('已开票'); }}>开票</Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                  data={payments}
                  pagination={false}
                  rowKey="id"
                />
              </Card>

              <Card size="small" title="报价历史">
                <Table
                  columns={[
                    { title: '报价单', dataIndex: 'name', width: 200 },
                    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => `¥${v?.toLocaleString() || 0}` },
                    { title: '状态', dataIndex: 'status', width: 100 },
                    { title: '时间', dataIndex: 'createdAt', width: 150 },
                  ]}
                  data={[]}
                  pagination={false}
                  locale={{ emptyText: <div style={{ padding: 32, textAlign: 'center' }}><Text type="secondary">暂无报价记录</Text></div> }}
                />
              </Card>
            </div>
          )}

          {/* 域 5：成果物与资料 */}
          {activeWorkspace === 'docs' && (
            <div>
              <Card size="small" title="确认书管理" style={{ marginBottom: 16 }} extra={<Button size="small" icon={<IconPlus />} onClick={() => { confirmForm.resetFields(); setConfirmModalVisible(true); }}>新增确认书</Button>}>
                <Table
                  columns={[
                    { title: '确认书类型', dataIndex: 'type', width: 150 },
                    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === '已签署' ? 'green' : 'orange'}>{v}</Tag> },
                    { title: '签署人', dataIndex: 'signer', width: 100 },
                    { title: '签署日期', dataIndex: 'signDate', width: 120 },
                    { title: '附件', dataIndex: 'attachment', width: 200 },
                    {
                      title: '操作', width: 120,
                      render: (_: unknown, record: any) => (
                        <Space>
                          {record.status !== '已签署' && (
                            <Button type="text" size="small" onClick={() => { setConfirmations(confirmations.map((c) => c.id === record.id ? { ...c, status: '已签署', signDate: new Date().toISOString().slice(0, 10) } : c)); Message.success('已签署'); }}>签署</Button>
                          )}
                          <Button type="text" size="small">下载</Button>
                        </Space>
                      ),
                    },
                  ]}
                  data={confirmations}
                  pagination={false}
                  rowKey="id"
                />
              </Card>

              <Card size="small" title="演示环境" style={{ marginBottom: 16 }} extra={<Button size="small" icon={<IconPlus />} onClick={() => { demoForm.resetFields(); setDemoModalVisible(true); }}>新增环境</Button>}>
                <Table
                  columns={[
                    { title: '环境', dataIndex: 'env', width: 120 },
                    { title: '地址', dataIndex: 'url', width: 300 },
                    { title: '说明', dataIndex: 'description', width: 200 },
                    {
                      title: '操作', width: 120,
                      render: (_: unknown, record: any) => (
                        <Space>
                          <Button type="text" size="small" onClick={() => { navigator.clipboard.writeText(record.url); Message.success('已复制链接'); }}>复制链接</Button>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDemos(demos.filter((d) => d.id !== record.id)); Message.success('已删除'); }} />
                        </Space>
                      ),
                    },
                  ]}
                  data={demos}
                  pagination={false}
                  rowKey="id"
                />
              </Card>

              <Card size="small" title="会议纪要" style={{ marginBottom: 16 }} extra={<Button size="small" icon={<IconPlus />} onClick={() => { meetingForm.resetFields(); setMeetingModalVisible(true); }}>新增纪要</Button>}>
                <Table
                  columns={[
                    { title: '主题', dataIndex: 'title', width: 200 },
                    { title: '时间', dataIndex: 'time', width: 150 },
                    { title: '参会人', dataIndex: 'participants', width: 200 },
                    {
                      title: '操作', width: 120,
                      render: (_: unknown, record: any) => (
                        <Space>
                          <Tooltip content={record.content}>
                            <Button type="text" size="small">查看</Button>
                          </Tooltip>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setMeetings(meetings.filter((m) => m.id !== record.id)); Message.success('已删除'); }} />
                        </Space>
                      ),
                    },
                  ]}
                  data={meetings}
                  pagination={false}
                  rowKey="id"
                />
              </Card>

              <Card size="small" title="项目文档" extra={<Button size="small" icon={<IconUpload />}>上传文档</Button>}>
                <Table
                  columns={[
                    { title: '文档名称', dataIndex: 'name', width: 250 },
                    { title: '类型', dataIndex: 'type', width: 120 },
                    { title: '上传人', dataIndex: 'uploader', width: 100 },
                    { title: '上传时间', dataIndex: 'createdAt', width: 150 },
                    {
                      title: '操作', width: 120,
                      render: (_: unknown, record: any) => (
                        <Space>
                          <Button type="text" size="small">下载</Button>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDocuments(documents.filter((d) => d.id !== record.id)); Message.success('已删除'); }} />
                        </Space>
                      ),
                    },
                  ]}
                  data={documents}
                  pagination={false}
                  rowKey="id"
                />
              </Card>
            </div>
          )}
        </div>
      </Card>

      {/* 新建/编辑任务 Modal */}
      <Modal title="任务" visible={taskModalVisible} onOk={() => { taskForm.validate().then((values) => { setTasks([...tasks, { id: `t${Date.now()}`, ...values, hours: values.hours || 0 }]); Message.success('任务已保存'); setTaskModalVisible(false); }); }} onCancel={() => setTaskModalVisible(false)} style={{ width: 520 }}>
        <Form form={taskForm} layout="vertical">
          <Form.Item label="任务名称" field="name" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="类型" field="type"><Select placeholder="请选择"><Select.Option value="开发">开发</Select.Option><Select.Option value="UI设计">UI设计</Select.Option><Select.Option value="产品设计">产品设计</Select.Option><Select.Option value="测试">测试</Select.Option><Select.Option value="Bug修复">Bug修复</Select.Option></Select></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="负责人" field="assignee" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="李四">李四</Select.Option><Select.Option value="王五">王五</Select.Option><Select.Option value="赵六">赵六</Select.Option><Select.Option value="孙七">孙七</Select.Option><Select.Option value="钱九">钱九</Select.Option></Select></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="状态" field="status" initialValue="待分配"><Select><Select.Option value="待分配">待分配</Select.Option><Select.Option value="进行中">进行中</Select.Option><Select.Option value="已完成">已完成</Select.Option></Select></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="工时(h)" field="hours"><InputNumber min={0} placeholder="0" style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="截止日期" field="dueDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      {/* 填报日报 Modal */}
      <Modal title="填报日报" visible={dailyModalVisible} onOk={() => { dailyForm.validate().then((values) => { setDailyReports([...dailyReports, { id: `d${Date.now()}`, ...values }]); Message.success('日报已提交'); setDailyModalVisible(false); }); }} onCancel={() => setDailyModalVisible(false)} style={{ width: 520 }}>
        <Form form={dailyForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="日期" field="date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="工时(h)" field="hours" rules={[{ required: true }]}><InputNumber min={0} max={24} style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="成员" field="personName" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="李四">李四</Select.Option><Select.Option value="王五">王五</Select.Option><Select.Option value="赵六">赵六</Select.Option><Select.Option value="孙七">孙七</Select.Option><Select.Option value="钱九">钱九</Select.Option></Select></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="岗位" field="position"><Select placeholder="请选择"><Select.Option value="产品经理">产品经理</Select.Option><Select.Option value="前端开发">前端开发</Select.Option><Select.Option value="后端开发">后端开发</Select.Option><Select.Option value="UI设计">UI设计</Select.Option><Select.Option value="测试">测试</Select.Option></Select></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="工作内容" field="workContent" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="请描述今日工作内容" /></Form.Item>
          <Form.Item label="风险反馈" field="riskFeedback"><Input.TextArea rows={2} placeholder="如有风险或阻塞请说明" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增回款 Modal */}
      <Modal title="新增回款" visible={paymentModalVisible} onOk={() => { paymentForm.validate().then((values) => { setPayments([...payments, { id: `p${Date.now()}`, ...values, status: '待收款', invoiced: false }]); Message.success('已添加'); setPaymentModalVisible(false); }); }} onCancel={() => setPaymentModalVisible(false)} style={{ width: 480 }}>
        <Form form={paymentForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="期次" field="period" rules={[{ required: true }]}><Input placeholder="如：首期款" /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="金额" field="amount" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="比例" field="ratio"><Input placeholder="如：30%" /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="计划日" field="plannedDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="触发条件" field="trigger"><Input placeholder="如：合同签署" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增确认书 Modal */}
      <Modal title="新增确认书" visible={confirmModalVisible} onOk={() => { confirmForm.validate().then((values) => { setConfirmations([...confirmations, { id: `c${Date.now()}`, ...values, status: '待签署' }]); Message.success('已添加'); setConfirmModalVisible(false); }); }} onCancel={() => setConfirmModalVisible(false)} style={{ width: 480 }}>
        <Form form={confirmForm} layout="vertical">
          <Form.Item label="确认书类型" field="type" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="需求确认书">需求确认书</Select.Option><Select.Option value="原型确认书">原型确认书</Select.Option><Select.Option value="UI确认书">UI确认书</Select.Option><Select.Option value="需求变更单">需求变更单</Select.Option><Select.Option value="阶段验收单">阶段验收单</Select.Option><Select.Option value="终验单">终验单</Select.Option></Select></Form.Item>
          <Form.Item label="签署人" field="signer"><Input placeholder="请输入签署人" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增演示环境 Modal */}
      <Modal title="新增演示环境" visible={demoModalVisible} onOk={() => { demoForm.validate().then((values) => { setDemos([...demos, { id: `dm${Date.now()}`, ...values }]); Message.success('已添加'); setDemoModalVisible(false); }); }} onCancel={() => setDemoModalVisible(false)} style={{ width: 480 }}>
        <Form form={demoForm} layout="vertical">
          <Form.Item label="环境" field="env" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="原型演示">原型演示</Select.Option><Select.Option value="测试环境">测试环境</Select.Option><Select.Option value="预发布环境">预发布环境</Select.Option><Select.Option value="正式环境">正式环境</Select.Option></Select></Form.Item>
          <Form.Item label="地址" field="url" rules={[{ required: true }]}><Input placeholder="请输入环境地址" /></Form.Item>
          <Form.Item label="说明" field="description"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增会议纪要 Modal */}
      <Modal title="新增会议纪要" visible={meetingModalVisible} onOk={() => { meetingForm.validate().then((values) => { setMeetings([...meetings, { id: `m${Date.now()}`, ...values }]); Message.success('已添加'); setMeetingModalVisible(false); }); }} onCancel={() => setMeetingModalVisible(false)} style={{ width: 520 }}>
        <Form form={meetingForm} layout="vertical">
          <Form.Item label="主题" field="title" rules={[{ required: true }]}><Input placeholder="会议主题" /></Form.Item>
          <Form.Item label="时间" field="time" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="参会人" field="participants"><Input placeholder="内部参会人" /></Form.Item>
          <Form.Item label="纪要内容" field="content" rules={[{ required: true }]}><Input.TextArea rows={4} placeholder="会议纪要" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
