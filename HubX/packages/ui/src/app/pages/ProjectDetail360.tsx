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
  Drawer,
  Empty,
  Upload,
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
  ActivityEventType,
  ProjectMeetingMinutes,
  ProjectDemoEnv,
} from './project-management/types';
import {
  PROJECT_PRIORITY_COLOR,
  BUSINESS_LINE_COLOR,
  HEALTH_LABEL,
  HEALTH_COLOR,
  LIFECYCLE_STEPS,
  LIFECYCLE_STEP_LABEL,
  getLifecycleStepIndex,
  ACTIVITY_EVENT_LABEL,
  ACTIVITY_EVENT_ICON,
  BLOCKER_SOURCE_LABEL,
  BLOCKER_SEVERITY_LABEL,
  BLOCKER_SEVERITY_COLOR,
  PROJECT_RISK_LEVEL_LABEL,
  PROJECT_RISK_LEVEL_COLOR,
  type ProjectBlocker,
} from './project-management/types';
import {
  getProjectCountdown,
  formatHours,
  formatAmount,
  filterActivities,
} from './project-management/utils';
import {
  PROJECT_LIST,
  getActivitiesByProjectId,
  getMeetingsByProjectId,
  getConfirmationsByProjectId,
  getDemoEnvsByProjectId,
} from './project-management/projectMockData';
import {
  initialDailyReports,
  initialFollowUps,
  initialDocuments,
  employees,
} from './project-management/mockData';
import { getProjectTasks, type ProjectWorkTask } from './project-management/projectTasks';
import { useProjects } from './project-management/ProjectContext';
import { deriveProjectViewMetrics } from './project-management/projectViewMetrics';
import { ProjectPresalesHistoryPanel } from './project-management/ProjectPresalesHistoryPanel';
import { useContracts } from './contracts/ContractsContext';
import { useCollections } from '@/app/collections/CollectionContext';
import { collectionsForProject, sumReceived } from '@/services/collectionMutations';
import type { Contract, ContractStatus } from './contracts/types';
import { useQuotation } from './quotation/QuotationContext';
import { QuotationWorkbench } from './quotation/QuotationWorkbench';
import { QuoteCard } from './quotation/QuoteCard';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from './quotation/types';
import { getLeadDetailProfile } from './leads/leadDetailProfiles';

const { Text } = Typography;
const TabPane = Tabs.TabPane;
const Step = Steps.Step;

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: '草稿',
  approving: '审批中',
  pending_mail: '待寄出',
  pending_return: '待回寄',
  archived: '已归档',
  voided: '已作废',
};

const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'gray',
  approving: 'orange',
  pending_mail: 'gold',
  pending_return: 'arcoblue',
  archived: 'green',
  voided: 'gray',
};

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

export function ProjectDetail360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProjectById } = useProjects();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const { quotes, createQuote } = useQuotation();

  const [activeMainTab, setActiveMainTab] = useState('basic');
  const [activeSideTab, setActiveSideTab] = useState('quotation');
  const [activityFilter, setActivityFilter] = useState<ActivityEventType[]>([]);

  // 任务台账：从共享 projectTasks 初始化，页面内可编辑
  const [tasks, setTasks] = useState<ProjectWorkTask[]>(() => getProjectTasks(id ?? ''));
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm] = Form.useForm();

  // 项目跟进台账：从共享 initialFollowUps 初始化
  const [followUps, setFollowUps] = useState(() => initialFollowUps.filter((f) => f.projectId === id));
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followForm] = Form.useForm();

  // 会议纪要台账：从共享 mock 初始化
  const [meetings, setMeetings] = useState<ProjectMeetingMinutes[]>(() => getMeetingsByProjectId(id ?? ''));
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [meetingForm] = Form.useForm();

  // 演示环境台账：从共享 mock 初始化
  const [demoEnvs, setDemoEnvs] = useState<ProjectDemoEnv[]>(() => getDemoEnvsByProjectId(id ?? ''));
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [demoForm] = Form.useForm();

  // 局部演示台账（与线索详情同口径：无跨页共享层的页面级数据）
  const [bugs, setBugs] = useState([
    { id: 'b1', title: '列表页横向滚动卡顿', severity: 'P1', env: '测试环境', assignee: '王五', status: '处理中', createdAt: '2026-08-18' },
    { id: 'b2', title: '表单提交后未清空', severity: 'P2', env: '测试环境', assignee: '赵六', status: '待修复', createdAt: '2026-08-19' },
  ]);
  const [travels, setTravels] = useState([
    { id: 'tr1', destination: '客户现场', purpose: '原型演示与需求确认', applicant: '李四', startDate: '2026-08-19', endDate: '2026-08-20', approvalNo: 'SP-20260819-0042', amount: 850, status: '已审批' },
  ]);
  const [reimbursements, setReimbursements] = useState([
    { id: 'rb1', type: '商务招待', description: '客户工作餐', applicant: '张三', amount: 280, approvalNo: 'BX-20260819-0018', status: '已审批' },
  ]);
  const [travelModalVisible, setTravelModalVisible] = useState(false);
  const [travelForm] = Form.useForm();
  const [reimbursementModalVisible, setReimbursementModalVisible] = useState(false);
  const [reimbursementForm] = Form.useForm();

  // 报价工作台抽屉
  const [quotationDrawerVisible, setQuotationDrawerVisible] = useState(false);
  const [quotationDrawerQuoteId, setQuotationDrawerQuoteId] = useState<string | null>(null);

  // ===== 共享数据层 =====
  const project = getProjectById(id);
  const leadId = project?.leadId;

  // 关联合同：优先 contractId 精确匹配，其余按 leadId 关联（主合同在前）
  const linkedContracts = useMemo<Contract[]>(() => {
    if (!project) return [];
    const direct = project.contractId ? contracts.filter((c) => c.id === project.contractId) : [];
    const byLead = leadId ? contracts.filter((c) => c.leadId === leadId && !direct.some((d) => d.id === c.id)) : [];
    return [...direct, ...byLead];
  }, [contracts, project, leadId]);
  const mainContract = linkedContracts[0];

  const projectCollections = useMemo(
    () => collectionsForProject(collections, {
      projectId: project?.id,
      contractIds: linkedContracts.map((c) => c.id),
    }),
    [collections, project?.id, linkedContracts],
  );

  const seedMetrics = useMemo(() => PROJECT_LIST.find((p) => p.id === id), [id]);
  const derivedReceived = sumReceived(projectCollections);
  const contractAmount = mainContract?.current.totalAmount || seedMetrics?.contractAmount || 0;
  const receivedAmount = derivedReceived > 0
    ? derivedReceived
    : (mainContract?.receivedAmount ?? seedMetrics?.receivedAmount ?? 0);
  const metrics = seedMetrics ?? (project
    ? deriveProjectViewMetrics(project, {
      customerName: mainContract?.current.customerName,
      contractAmount,
      receivedAmount,
    })
    : undefined);

  // 阻塞项
  const activeBlockers = useMemo(() => (project?.blockers ?? []).filter((b) => !b.resolved), [project]);

  // 关联线索的报价（报价域按 leadId 唯一关联）
  const projectQuotes = useMemo(() => quotes.filter((q) => q.leadId === leadId), [quotes, leadId]);

  const dailyReports = useMemo(() => initialDailyReports.filter((r) => r.projectId === id), [id]);
  const confirmations = useMemo(() => getConfirmationsByProjectId(id ?? ''), [id]);
  const documents = useMemo(() => initialDocuments.filter((d) => d.projectId === id), [id]);

  // Activity Stream
  const allActivities = useMemo(() => (id ? getActivitiesByProjectId(id) : []), [id]);
  const filteredActivities = useMemo(() => filterActivities(allActivities, activityFilter), [allActivities, activityFilter]);

  if (!project || !metrics) {
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

  const handleViewContractDetail = (contractId: string) => {
    navigate(`/contracts/${contractId}`, {
      state: {
        contractDetailReturn: {
          pathname: `/projects/${id}`,
          state: { activeSideTab: 'contract-records' },
        },
      },
    });
  };

  const handleCreateQuote = async () => {
    if (!leadId) {
      Message.warning('当前项目未关联线索，无法新建报价');
      return;
    }
    const leadProfile = getLeadDetailProfile(leadId, '');
    const lead = leadProfile.leadInfo;
    const newId = await createQuote(leadId, [], {
      projectName: project.name,
      customerName: lead.customer,
      customerContact: lead.contact,
      customerPhone: lead.phone,
    });
    setQuotationDrawerQuoteId(newId);
    setQuotationDrawerVisible(true);
  };

  const openTaskModal = (task?: ProjectWorkTask) => {
    if (task) {
      setEditingTaskId(task.id);
      taskForm.setFieldsValue(task);
    } else {
      setEditingTaskId(null);
      taskForm.resetFields();
    }
    setTaskModalVisible(true);
  };

  const leadQuotes = projectQuotes;
  const activeQuotes = leadQuotes.filter((q) => q.status !== 'voided');
  const voidedQuotes = leadQuotes.filter((q) => q.status === 'voided');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ========== 控制台头部 ========== */}
      <Card bodyStyle={{ padding: '16px 20px' }}>
        {/* 顶部：返回+项目元数据 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<IconLeft />} onClick={() => navigate('/projects')}>返回列表</Button>
            <Divider type="vertical" />
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-text-3)' }}>{project.projectNo}</span>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{project.name}</span>
            <Tag color={BUSINESS_LINE_COLOR[project.businessLine]}>{project.businessLine}</Tag>
            <Tag color="gray">{project.entity}</Tag>
            <Tag color={PROJECT_PRIORITY_COLOR[project.priority]}>优先级: {project.priority}</Tag>
            <Tag color={HEALTH_COLOR[metrics.healthStatus]}>
              健康度: {HEALTH_LABEL[metrics.healthStatus]}
            </Tag>
          </div>
          {/* 行动栏按钮 - 右上角 */}
          <Space>
            <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { setActiveSideTab('follow'); followForm.resetFields(); setFollowModalVisible(true); }}>登记跟进</Button>
            <Button size="small" icon={<IconPlus />} onClick={() => { setActiveMainTab('tasks'); openTaskModal(); }}>新建任务</Button>
            <Button size="small" icon={<IconFile />} onClick={() => { setActiveSideTab('meetings'); meetingForm.resetFields(); setMeetingModalVisible(true); }}>录入纪要</Button>
            <Button size="small" icon={<IconCalendar />} onClick={() => navigate(`/projects/${id}/delivery`)}>甘特图</Button>
          </Space>
        </div>

        {/* 全生命周期步骤条 */}
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
      </Card>

      {/* 6 维指标胶囊 */}
      <Card size="small">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <IconUser style={{ color: 'rgb(var(--primary-6))' }} />
            <Text type="secondary">PM:</Text>
            <Text style={{ fontWeight: 500 }}>{project.owner || '待指派'}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <Text type="secondary">客户:</Text>
            <Text style={{ fontWeight: 500 }}>{metrics.customerName || '-'}</Text>
          </div>
          {contractAmount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
              <Text type="secondary">合同额:</Text>
              <Text style={{ fontWeight: 500, color: 'rgb(var(--success-6))' }}>{formatAmount(contractAmount)}</Text>
              {contractAmount > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>已回{Math.round(receivedAmount / contractAmount * 100)}%</Text>
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
            <Text style={{ fontWeight: 500 }}>{formatHours(metrics.totalHours)} / {formatHours(metrics.budgetHours)}</Text>
            <Progress percent={metrics.budgetHours > 0 ? Math.round(metrics.totalHours / metrics.budgetHours * 100) : 0} size="mini" style={{ width: 60 }} showText={false} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: metrics.bugP0Count + metrics.bugP1Count > 0 ? 'rgb(var(--danger-1))' : 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
            <Text type="secondary">Bug:</Text>
            <Text style={{ fontWeight: 500, color: metrics.bugP0Count > 0 ? 'rgb(var(--danger-6))' : metrics.bugP1Count > 0 ? 'rgb(var(--warning-6))' : 'rgb(var(--success-6))' }}>
              P0:{metrics.bugP0Count} P1:{metrics.bugP1Count}
            </Text>
          </div>
          {/* 风险等级胶囊 */}
          {project.riskLevel && project.riskLevel !== 'none' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: project.riskLevel === 'high' ? 'rgb(var(--danger-1))' : project.riskLevel === 'medium' ? 'rgb(var(--warning-1))' : 'var(--color-fill-2)', borderRadius: 8, fontSize: 14 }}>
              <Text type="secondary">风险:</Text>
              <Tag color={PROJECT_RISK_LEVEL_COLOR[project.riskLevel]} size="small">{PROJECT_RISK_LEVEL_LABEL[project.riskLevel]}</Tag>
              {project.riskNote && <Text style={{ fontSize: 12, maxWidth: 160 }} ellipsis>{project.riskNote}</Text>}
            </div>
          )}
          {/* 阻塞项计数胶囊 */}
          {activeBlockers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgb(var(--danger-1))', borderRadius: 8, fontSize: 14 }}>
              <Text type="secondary">阻塞:</Text>
              <Text style={{ fontWeight: 500, color: 'rgb(var(--danger-6))' }}>{activeBlockers.length} 项</Text>
            </div>
          )}
        </div>
      </Card>

      {/* ========== 主体区域：70:30 分栏 ========== */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧主区域 (70%) */}
        <div style={{ flex: 7, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 关键信息档案卡 */}
          <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</span>
            </div>
            <Grid.Row gutter={[8, 4]}>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>客户</Text> <Text style={{ fontSize: 14 }}>{metrics.customerName || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>业务线</Text> <Tag color={BUSINESS_LINE_COLOR[project.businessLine]} size="small">{project.businessLine}</Tag></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>签约主体</Text> <Text style={{ fontSize: 14 }}>{project.entity}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>销售</Text> <Text style={{ fontSize: 14 }}>{project.salesUsers.join('、') || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>开始日期</Text> <Text style={{ fontSize: 14 }}>{project.startDate || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>预计交付</Text> <Text style={{ fontSize: 14 }}>{project.expectedEndDate || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>预算工时</Text> <Text style={{ fontSize: 14 }}>{formatHours(metrics.budgetHours)}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>创建时间</Text> <Text style={{ fontSize: 14 }}>{project.createdAt}</Text></Grid.Col>
            </Grid.Row>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>最新进展</Text>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-1)' }}>{project.latestProgress || '-'}</div>
            </div>

            {/* 阻塞项 */}
            {activeBlockers.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>关键卡点（{activeBlockers.length} 项）</Text>
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeBlockers.map((b) => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-fill-2)', borderRadius: 6, fontSize: 13 }}>
                        <Tag color={BLOCKER_SEVERITY_COLOR[b.severity]} size="small">{BLOCKER_SEVERITY_LABEL[b.severity]}</Tag>
                        <Tag size="small" color="gray">{BLOCKER_SOURCE_LABEL[b.source]}</Tag>
                        <Text style={{ flex: 1 }}>{b.title}</Text>
                        {b.customerEta && <Text type="secondary" style={{ fontSize: 12 }}>客户ETA: {b.customerEta}</Text>}
                        {b.expectedResolveDate && <Text type="secondary" style={{ fontSize: 12 }}>预计: {b.expectedResolveDate}</Text>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 风险备注 */}
            {project.riskNote && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>风险备注</Text>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-1)' }}>{project.riskNote}</div>
                </div>
              </>
            )}

            {/* 验收标准 */}
            {project.acceptanceCriteria && project.acceptanceCriteria.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>验收标准</Text>
                  <ul style={{ margin: '4px 0 0 16px', fontSize: 13, color: 'var(--color-text-1)' }}>
                    {project.acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </>
            )}
          </Card>

          {/* 左侧主 Tab */}
          <Card size="small">
            <Tabs activeTab={activeMainTab} onChange={setActiveMainTab} type="card">
              <TabPane key="basic" title="基础信息" />
              <TabPane key="contracts" title="合同信息" />
              <TabPane key="payments" title="回款与发票" />
              <TabPane key="team" title="团队与工时" />
              <TabPane key="daily" title="日报" />
              <TabPane key="tasks" title="任务管理" />
              <TabPane key="activity" title="项目动态" />
            </Tabs>

            <div style={{ marginTop: 16 }}>
              {/* 基础信息 */}
              {activeMainTab === 'basic' && (
                <Descriptions
                  column={4}
                  size="small"
                  data={[
                    { label: '项目编号', value: project.projectNo },
                    { label: '客户', value: metrics.customerName || '-' },
                    { label: '业务线', value: project.businessLine },
                    { label: '签约主体', value: project.entity },
                    { label: '项目经理', value: project.owner || '待指派' },
                    { label: '销售', value: project.salesUsers.join('、') || '-' },
                    { label: '优先级', value: project.priority },
                    { label: '状态', value: project.status },
                    { label: '开始日期', value: project.startDate || '-' },
                    { label: '预计交付', value: project.expectedEndDate || '-' },
                    { label: '进度', value: `${project.progress}%` },
                    { label: '预算工时', value: formatHours(metrics.budgetHours) },
                    { label: '创建时间', value: project.createdAt },
                    { label: '最新进展', value: project.latestProgress || '-' },
                    { label: '风险等级', value: project.riskLevel ? <Tag color={PROJECT_RISK_LEVEL_COLOR[project.riskLevel]} size="small">{PROJECT_RISK_LEVEL_LABEL[project.riskLevel]}</Tag> : '-' },
                    { label: '风险备注', value: project.riskNote || '-' },
                    { label: '活跃阻塞', value: activeBlockers.length > 0 ? `${activeBlockers.length} 项` : '无' },
                  ]}
                />
              )}

              {/* 合同信息 */}
              {activeMainTab === 'contracts' && (
                <div>
                  <Card size="small" title="正式主合同" style={{ marginBottom: 12 }}>
                    {mainContract ? (
                      <Descriptions
                        column={4}
                        size="small"
                        data={[
                          { label: '合同编号', value: mainContract.contractNo },
                          { label: '标的额', value: money(mainContract.current.totalAmount) },
                          { label: '签约主体', value: mainContract.current.signingEntity },
                          { label: '状态', value: <Tag color={CONTRACT_STATUS_COLORS[mainContract.status]}>{CONTRACT_STATUS_LABELS[mainContract.status]}</Tag> },
                          { label: '签约日期', value: mainContract.current.signDate || '-' },
                          { label: '合同名称', value: mainContract.current.contractName },
                          { label: '客户', value: mainContract.current.customerName },
                          { label: '已回款', value: money(mainContract.receivedAmount ?? 0) },
                        ]}
                      />
                    ) : (
                      <Empty description="暂无关联合同" />
                    )}
                  </Card>
                  <Card size="small" title="补充合同">
                    {(() => {
                      const supplementContracts = contracts.filter(
                        (c) => c.kind === 'supplement' && c.parentContractId === mainContract?.id,
                      );
                      return supplementContracts.length > 0 ? (
                        <div>{supplementContracts.length} 份补充合同</div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无补充合同</div>
                      );
                    })()}
                  </Card>
                </div>
              )}

              {/* 回款与发票 */}
              {activeMainTab === 'payments' && (
                <div>
                  <Grid.Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                    <Grid.Col span={8}>
                      <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>合同标的额</Text>
                        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{contractAmount > 0 ? money(contractAmount) : '-'}</div>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>已到账</Text>
                        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: 'rgb(var(--success-6))' }}>{receivedAmount > 0 ? money(receivedAmount) : '-'}</div>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>待回款</Text>
                        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{contractAmount > 0 ? money(contractAmount - receivedAmount) : '-'}</div>
                      </div>
                    </Grid.Col>
                  </Grid.Row>
                  <Card size="small" title="回款期次（计划）" style={{ marginBottom: 12 }}>
                    {mainContract?.current.paymentPlans?.length ? (
                      <Table
                        columns={[
                          { title: '期次', dataIndex: 'period', width: 80, render: (_: unknown, record: { periodName?: string; period: number }) => `${record.periodName || `第${record.period}期`}` },
                          { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
                          { title: '比例', dataIndex: 'percentage', width: 80, render: (v: number) => `${v}%` },
                          { title: '预计日期', dataIndex: 'expectedDate', width: 120 },
                          { title: '触发条件', dataIndex: 'condition', width: 160 },
                        ]}
                        data={mainContract.current.paymentPlans}
                        pagination={false}
                        rowKey="period"
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无回款期次</div>
                    )}
                  </Card>
                  <Card size="small" title="实收台账">
                    {projectCollections.length ? (
                      <Table
                        columns={[
                          { title: '到账日期', dataIndex: 'date', width: 120 },
                          { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
                          { title: '方式', dataIndex: 'method', width: 120 },
                          { title: '期次', dataIndex: 'period', width: 80, render: (v: number | 'other' | undefined) => (v === 'other' ? '其他' : v ? `第${v}期` : '-') },
                          { title: '说明', dataIndex: 'note' },
                        ]}
                        data={projectCollections}
                        pagination={false}
                        rowKey="id"
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无实收记录</div>
                    )}
                  </Card>
                </div>
              )}

              {/* 团队与工时 */}
              {activeMainTab === 'team' && (
                <div>
                  <Card size="small" title="团队成员与分工" style={{ marginBottom: 16 }}>
                    <Descriptions
                      column={2}
                      data={[
                        { label: '项目经理', value: project.owner || '待指派' },
                        { label: '商务/销售', value: project.salesUsers.join('、') || '-' },
                        { label: '协助人', value: project.assistants.join('、') || '-' },
                        { label: '产品', value: project.productUsers.join('、') || '-' },
                        { label: 'UI', value: project.uiUsers.join('、') || '-' },
                        { label: '前端', value: project.frontendUsers.join('、') || '-' },
                        { label: '后端', value: project.backendUsers.join('、') || '-' },
                        { label: '运维', value: project.opsUsers.join('、') || '-' },
                        { label: '测试', value: project.testUsers.join('、') || '-' },
                        { label: '法务', value: project.legalUsers.join('、') || '-' },
                      ].map((item) => ({ ...item, value: item.value || '-' }))}
                    />
                  </Card>

                  <Card size="small" title="工时统计">
                    <Grid.Row gutter={16}>
                      <Grid.Col span={8}>
                        <div style={{ textAlign: 'center', padding: 16 }}>
                          <Text type="secondary">预算工时</Text>
                          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatHours(metrics.budgetHours)}</div>
                        </div>
                      </Grid.Col>
                      <Grid.Col span={8}>
                        <div style={{ textAlign: 'center', padding: 16 }}>
                          <Text type="secondary">已消耗</Text>
                          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatHours(metrics.totalHours)}</div>
                        </div>
                      </Grid.Col>
                      <Grid.Col span={8}>
                        <div style={{ textAlign: 'center', padding: 16 }}>
                          <Text type="secondary">消耗比例</Text>
                          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{metrics.budgetHours > 0 ? Math.round(metrics.totalHours / metrics.budgetHours * 100) : 0}%</div>
                        </div>
                      </Grid.Col>
                    </Grid.Row>
                    <Progress percent={metrics.budgetHours > 0 ? Math.round(metrics.totalHours / metrics.budgetHours * 100) : 0} style={{ marginTop: 8 }} />
                  </Card>
                </div>
              )}

              {/* 日报 */}
              {activeMainTab === 'daily' && (
                <Table
                  columns={[
                    { title: '日期', dataIndex: 'date', width: 110 },
                    { title: '成员', dataIndex: 'personName', width: 80 },
                    { title: '岗位', dataIndex: 'position', width: 120 },
                    { title: '工时(h)', dataIndex: 'hours', width: 70 },
                    { title: '工作内容', dataIndex: 'workContent', width: 280 },
                    { title: '风险反馈', dataIndex: 'riskFeedback', width: 160 },
                  ]}
                  data={dailyReports}
                  pagination={false}
                  rowKey="id"
                  locale={{ emptyText: <Empty description="暂无日报记录" /> }}
                />
              )}

              {/* 任务管理 */}
              {activeMainTab === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: 500 }}>任务管理</Text>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => openTaskModal()}>新建任务</Button>
                  </div>
                  <Table
                    columns={[
                      { title: '任务名称', dataIndex: 'title', width: 200 },
                      { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => <Tag>{v || '-'}</Tag> },
                      { title: '负责人', dataIndex: 'assignee', width: 100 },
                      { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '进行中' ? 'blue' : 'default'}>{v}</Tag> },
                      { title: '优先级', dataIndex: 'priority', width: 80, render: (v: string) => <Tag color={v === '高' ? 'red' : v === '中' ? 'orange' : 'default'}>{v || '-'}</Tag> },
                      { title: '截止日期', dataIndex: 'plannedEndDate', width: 110 },
                      { title: '进度', dataIndex: 'progress', width: 100, render: (v: number) => <Progress percent={v} size="small" showText={false} /> },
                      {
                        title: '操作', width: 120,
                        render: (_: unknown, record: ProjectWorkTask) => (
                          <Space>
                            <Button type="text" size="small" icon={<IconEdit />} onClick={() => openTaskModal(record)} />
                            <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setTasks(tasks.filter((t) => t.id !== record.id)); Message.success('已删除'); }} />
                          </Space>
                        ),
                      },
                    ]}
                    data={tasks}
                    pagination={false}
                    rowKey="id"
                    locale={{ emptyText: <Empty description="暂无任务" /> }}
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
                          render: (_: unknown, record: { id: string; status: string }) => (
                            <Space>
                              {record.status !== '已修复' && (
                                <Button type="text" size="small" onClick={() => { setBugs(bugs.map((b) => b.id === record.id ? { ...b, status: '已修复' } : b)); Message.success('已标记修复'); }}>修复</Button>
                              )}
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

              {/* 项目动态 */}
              {activeMainTab === 'activity' && (
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
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{formatHours(metrics.totalHours)}</div>
                        <Progress percent={Math.round(metrics.totalHours / metrics.budgetHours * 100)} size="small" style={{ marginTop: 8 }} showText={false} color="rgb(var(--warning-6))" />
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Card size="small">
                        <Text type="secondary" style={{ fontSize: 12 }}>缺陷收敛</Text>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: metrics.bugP0Count + metrics.bugP1Count > 0 ? 'rgb(var(--danger-6))' : 'rgb(var(--success-6))' }}>
                          P0:{metrics.bugP0Count} P1:{metrics.bugP1Count}
                        </div>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Card size="small">
                        <Text type="secondary" style={{ fontSize: 12 }}>商务回款</Text>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                          {contractAmount > 0 ? `${Math.round(receivedAmount / contractAmount * 100)}%` : '-'}
                        </div>
                        {contractAmount > 0 && (
                          <Progress percent={Math.round(receivedAmount / contractAmount * 100)} size="small" style={{ marginTop: 8 }} showText={false} color="rgb(var(--success-6))" />
                        )}
                      </Card>
                    </Grid.Col>
                  </Grid.Row>

                  {/* Activity Stream 时间轴 */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: 500 }}>项目综合动态</Text>
                      <Space size={4} wrap>
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
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 右侧业务过程 (30%) */}
        <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card size="small" style={{ flex: 1 }}>
            <Tabs activeTab={activeSideTab} onChange={setActiveSideTab} type="card" size="small">
              <TabPane key="follow" title="跟进" />
              <TabPane key="quotation" title="报价" />
              <TabPane key="contract-records" title="合同记录" />
              <TabPane key="presales" title="售前历程" />
              <TabPane key="meetings" title="会议纪要" />
              <TabPane key="demo" title="演示" />
              <TabPane key="documents" title="资料" />
              <TabPane key="travel" title="出差" />
              <TabPane key="reimbursement" title="报销" />
            </Tabs>

            <div style={{ marginTop: 16 }}>
              {/* 跟进 */}
              {activeSideTab === 'follow' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { followForm.resetFields(); setFollowModalVisible(true); }}>写跟进</Button>
                  </div>
                  <Timeline>
                    {followUps.map((record) => (
                      <Timeline.Item key={record.id} dotColor="var(--color-border-2)">
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Tag color="blue" size="small">{record.status}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.createdAt}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>· {record.operator}</Text>
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--color-text-1)', marginBottom: 4 }}>{record.content}</div>
                          {record.progress > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>进度: {record.progress}%</Text>
                          )}
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                  {followUps.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无跟进记录</div>}
                </div>
              )}

              {/* 报价 */}
              {activeSideTab === 'quotation' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<IconPlus />}
                      disabled={!leadId}
                      onClick={handleCreateQuote}
                    >
                      新建报价
                    </Button>
                  </div>
                  {!leadId ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>当前项目未关联线索，暂无报价</div>
                  ) : leadQuotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无报价记录</div>
                  ) : (
                    <div>
                      {activeQuotes.map((q) => (
                        <QuoteCard
                          key={q.id}
                          quote={q}
                          onOpen={() => {
                            setQuotationDrawerQuoteId(q.id);
                            setQuotationDrawerVisible(true);
                          }}
                        />
                      ))}
                      {voidedQuotes.length > 0 && (
                        <>
                          <div style={{ borderTop: '1px dashed var(--color-border-3)', margin: '12px 0' }} />
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>已作废</Text>
                          {voidedQuotes.map((q) => (
                            <div key={q.id} style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 8, opacity: 0.5, background: 'var(--color-fill-1)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <Text style={{ fontWeight: 600, textDecoration: 'line-through' }}>{q.basicInfo.projectName}</Text>
                                <Tag color="arcoblue" size="small">{q.version}</Tag>
                                <Tag size="small" color="gray">{QUOTE_STATUS_LABELS[q.status]}</Tag>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>{q.quoteNo}</div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 合同记录 */}
              {activeSideTab === 'contract-records' && (
                <div>
                  {linkedContracts.map((c) => (
                    <Card
                      key={c.id}
                      size="small"
                      hoverable
                      style={{ marginBottom: 8, cursor: 'pointer' }}
                      onClick={() => handleViewContractDetail(c.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{c.current.contractName}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{c.contractNo} · {c.current.signingEntity}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{money(c.current.totalAmount)}</div>
                          <Tag color={CONTRACT_STATUS_COLORS[c.status]} size="small">{CONTRACT_STATUS_LABELS[c.status]}</Tag>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {linkedContracts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无合同记录</div>
                  )}
                </div>
              )}

              {/* 售前历程 */}
              {activeSideTab === 'presales' && (
                <ProjectPresalesHistoryPanel leadId={leadId} contract={mainContract} />
              )}

              {/* 会议纪要 */}
              {activeSideTab === 'meetings' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { meetingForm.resetFields(); setMeetingModalVisible(true); }}>新增纪要</Button>
                  </div>
                  {meetings.map((m) => (
                    <Card key={m.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontWeight: 500 }}>{m.subject}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{m.meetingTime}</Text>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>
                        <Tag size="small" color="blue">内部: {m.employeeAttendees.join('、') || '-'}</Tag>
                        {m.externalAttendees.length > 0 && <Tag size="small" color="cyan">客户: {m.externalAttendees.join('、')}</Tag>}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{m.minutes}</div>
                      <div style={{ marginTop: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>记录人: {m.recorder}</Text>
                      </div>
                    </Card>
                  ))}
                  {meetings.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无会议纪要</div>}
                </div>
              )}

              {/* 演示 */}
              {activeSideTab === 'demo' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { demoForm.resetFields(); setDemoModalVisible(true); }}>新增环境</Button>
                  </div>
                  {demoEnvs.map((demo) => (
                    <Card key={demo.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Tag color="blue" size="small">{demo.env}</Tag>
                          <Text style={{ marginLeft: 8 }}>{demo.description}</Text>
                        </div>
                        <Space>
                          <Button type="text" size="small" onClick={() => { navigator.clipboard.writeText(demo.url); Message.success('已复制链接'); }}>复制链接</Button>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDemoEnvs(demoEnvs.filter((d) => d.id !== demo.id)); Message.success('已删除'); }} />
                        </Space>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{demo.url}</div>
                    </Card>
                  ))}
                  {demoEnvs.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无演示环境</div>}
                </div>
              )}

              {/* 资料（确认书 + 项目文档） */}
              {activeSideTab === 'documents' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconUpload />}>上传资料</Button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>确认书</Text>
                    {confirmations.map((c) => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconFile style={{ color: 'var(--color-text-3)' }} />
                          <div>
                            <Text style={{ fontSize: 14 }}>{c.type}</Text>
                            <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{c.attachment || '无附件'} · {c.signDate || '未签署'}</div>
                          </div>
                        </div>
                        <Tag color={c.status === '已签署' ? 'green' : 'orange'} size="small">{c.status}</Tag>
                      </div>
                    ))}
                    {confirmations.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-4)', fontSize: 12 }}>暂无确认书</div>}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>项目文档</Text>
                    {documents.map((doc) => (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconFile style={{ color: 'var(--color-text-3)' }} />
                          <div>
                            <Text style={{ fontSize: 14 }}>{doc.title}</Text>
                            <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{doc.owner} · {doc.createdAt}</div>
                          </div>
                        </div>
                        <Space>
                          {doc.onlineUrl && <Button type="text" size="small" onClick={() => window.open(doc.onlineUrl, '_blank')}>查看</Button>}
                          <Button type="text" size="small">下载</Button>
                        </Space>
                      </div>
                    ))}
                    {documents.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-4)', fontSize: 12 }}>暂无项目文档</div>}
                  </div>
                </div>
              )}

              {/* 出差 */}
              {activeSideTab === 'travel' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { travelForm.resetFields(); setTravelModalVisible(true); }}>新增出差</Button>
                  </div>
                  {travels.map((travel) => (
                    <Card key={travel.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{travel.destination} - {travel.purpose}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                            {travel.applicant} · {travel.startDate} ~ {travel.endDate} · ¥{travel.amount}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Tag color="green" size="small">{travel.status}</Tag>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>审批号: {travel.approvalNo}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {travels.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无出差记录</div>}
                </div>
              )}

              {/* 报销 */}
              {activeSideTab === 'reimbursement' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { reimbursementForm.resetFields(); setReimbursementModalVisible(true); }}>新增报销</Button>
                  </div>
                  {reimbursements.map((rb) => (
                    <Card key={rb.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{rb.type} - {rb.description}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                            {rb.applicant} · ¥{rb.amount}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Tag color="green" size="small">{rb.status}</Tag>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>审批号: {rb.approvalNo}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {reimbursements.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无报销记录</div>}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 新建/编辑任务 Modal */}
      <Modal
        title={editingTaskId ? '编辑任务' : '新建任务'}
        visible={taskModalVisible}
        onOk={() => {
          taskForm.validate().then((values) => {
            if (editingTaskId) {
              setTasks(tasks.map((t) => (t.id === editingTaskId ? { ...t, ...values } : t)));
              Message.success('任务已更新');
            } else {
              setTasks([...tasks, {
                id: `task-${Date.now()}`,
                projectId: id ?? '',
                title: values.title,
                type: values.type ?? '开发',
                priority: values.priority ?? '中',
                status: values.status ?? '未开始',
                assignee: values.assignee ?? '',
                collaborators: [],
                plannedEndDate: values.plannedEndDate ?? '',
                progress: values.progress ?? 0,
              }]);
              Message.success('任务已保存');
            }
            setTaskModalVisible(false);
          });
        }}
        onCancel={() => setTaskModalVisible(false)}
        style={{ width: 520 }}
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item label="任务名称" field="title" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="类型" field="type"><Select placeholder="请选择"><Select.Option value="开发">开发</Select.Option><Select.Option value="UI 设计">UI 设计</Select.Option><Select.Option value="产品设计">产品设计</Select.Option><Select.Option value="测试">测试</Select.Option><Select.Option value="账号注册">账号注册</Select.Option><Select.Option value="bug">bug</Select.Option></Select></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="负责人" field="assignee" rules={[{ required: true }]}><Select placeholder="请选择">{employees.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="状态" field="status" initialValue="未开始"><Select><Select.Option value="未开始">未开始</Select.Option><Select.Option value="进行中">进行中</Select.Option><Select.Option value="已完成">已完成</Select.Option></Select></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="优先级" field="priority" initialValue="中"><Select><Select.Option value="高">高</Select.Option><Select.Option value="中">中</Select.Option><Select.Option value="低">低</Select.Option></Select></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="截止日期" field="plannedEndDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="进度(%)" field="progress"><InputNumber min={0} max={100} placeholder="0" style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
        </Form>
      </Modal>

      {/* 登记项目跟进 Modal */}
      <Modal
        title="登记跟进"
        visible={followModalVisible}
        onOk={() => {
          followForm.validate().then((values) => {
            setFollowUps([{
              id: `follow-${Date.now()}`,
              projectId: id ?? '',
              status: project.status,
              progress: values.progress ?? project.progress,
              content: values.content,
              attachments: [],
              operator: values.operator ?? '李四',
              createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }, ...followUps]);
            Message.success('跟进记录已保存');
            setFollowModalVisible(false);
          });
        }}
        onCancel={() => setFollowModalVisible(false)}
        style={{ width: 560 }}
      >
        <Form form={followForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="操作人" field="operator" initialValue={project.owner || '李四'}><Select>{employees.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="当前进度(%)" field="progress" initialValue={project.progress}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="跟进内容" field="content" rules={[{ required: true }]}><Input.TextArea rows={4} maxLength={1000} showWordLimit placeholder="请记录跟进内容" /></Form.Item>
          <Form.Item label="附件">
            <Upload accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" multiple drag>
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 24, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>点击或拖拽上传</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增会议纪要 Modal */}
      <Modal
        title="新增会议纪要"
        visible={meetingModalVisible}
        onOk={() => {
          meetingForm.validate().then((values) => {
            setMeetings([{
              id: `pm-${Date.now()}`,
              projectId: id ?? '',
              subject: values.subject,
              meetingTime: values.meetingTime ?? '',
              employeeAttendees: values.employeeAttendees ? String(values.employeeAttendees).split('、').filter(Boolean) : [],
              externalAttendees: values.externalAttendees ? String(values.externalAttendees).split('、').filter(Boolean) : [],
              minutes: values.minutes,
              recorder: values.recorder ?? (project.owner || '李四'),
            }, ...meetings]);
            Message.success('纪要已保存');
            setMeetingModalVisible(false);
          });
        }}
        onCancel={() => setMeetingModalVisible(false)}
        style={{ width: 560 }}
      >
        <Form form={meetingForm} layout="vertical">
          <Form.Item label="会议主题" field="subject" rules={[{ required: true }]}><Input placeholder="会议主题" /></Form.Item>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="会议时间" field="meetingTime"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="记录人" field="recorder" initialValue={project.owner || '李四'}><Select>{employees.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="内部参会人（顿号分隔）" field="employeeAttendees"><Input placeholder="如：李四、王五" /></Form.Item>
          <Form.Item label="客户参会人（顿号分隔）" field="externalAttendees"><Input placeholder="如：刘经理、陈工" /></Form.Item>
          <Form.Item label="纪要内容" field="minutes" rules={[{ required: true }]}><Input.TextArea rows={4} placeholder="会议纪要" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增演示环境 Modal */}
      <Modal title="新增演示环境" visible={demoModalVisible} onOk={() => { demoForm.validate().then((values) => { setDemoEnvs([...demoEnvs, { id: `de-${Date.now()}`, projectId: id ?? '', ...values }]); Message.success('已添加'); setDemoModalVisible(false); }); }} onCancel={() => setDemoModalVisible(false)} style={{ width: 480 }}>
        <Form form={demoForm} layout="vertical">
          <Form.Item label="环境" field="env" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="原型演示">原型演示</Select.Option><Select.Option value="测试环境">测试环境</Select.Option><Select.Option value="预发布环境">预发布环境</Select.Option><Select.Option value="正式环境">正式环境</Select.Option></Select></Form.Item>
          <Form.Item label="地址" field="url" rules={[{ required: true }]}><Input placeholder="请输入环境地址" /></Form.Item>
          <Form.Item label="说明" field="description"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增出差 Modal */}
      <Modal title="新增出差" visible={travelModalVisible} onOk={() => { travelForm.validate().then((values) => { setTravels([...travels, { id: `tr${Date.now()}`, ...values, status: '待审批' }]); Message.success('已提交'); setTravelModalVisible(false); }); }} onCancel={() => setTravelModalVisible(false)} style={{ width: 520 }}>
        <Form form={travelForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="目的地" field="destination" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="出差事由" field="purpose" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="开始日期" field="startDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="结束日期" field="endDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="预估费用" field="amount"><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增报销 Modal */}
      <Modal title="新增报销" visible={reimbursementModalVisible} onOk={() => { reimbursementForm.validate().then((values) => { setReimbursements([...reimbursements, { id: `rb${Date.now()}`, ...values, status: '待审批' }]); Message.success('已提交'); setReimbursementModalVisible(false); }); }} onCancel={() => setReimbursementModalVisible(false)} style={{ width: 480 }}>
        <Form form={reimbursementForm} layout="vertical">
          <Form.Item label="报销类型" field="type" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="商务招待">商务招待</Select.Option><Select.Option value="交通费">交通费</Select.Option><Select.Option value="住宿费">住宿费</Select.Option><Select.Option value="办公用品">办公用品</Select.Option><Select.Option value="其他">其他</Select.Option></Select></Form.Item>
          <Form.Item label="说明" field="description" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item>
          <Form.Item label="金额" field="amount" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
        </Form>
      </Modal>

      {/* 报价工作台全屏抽屉 */}
      <Drawer
        title="报价工作台"
        visible={quotationDrawerVisible}
        onCancel={() => setQuotationDrawerVisible(false)}
        footer={null}
        width="100%"
        style={{ top: 0, bottom: 0 }}
        bodyStyle={{ padding: 24 }}
      >
        {quotationDrawerVisible && quotationDrawerQuoteId && (
          <QuotationWorkbench
            embedded
            quoteId={quotationDrawerQuoteId}
            onClose={() => setQuotationDrawerVisible(false)}
          />
        )}
      </Drawer>
    </div>
  );
}
