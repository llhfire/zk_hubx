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
  Pagination,
} from '@arco-design/web-react';
import {
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
import { LeadFinalContractPanel } from './leads/components/LeadFinalContractPanel';
import { useContracts } from './contracts/ContractsContext';
import { useCollections } from '@/app/collections/CollectionContext';
import { collectionsForProject, sumReceived, type CollectionLedgerEntry } from '@/services/collectionMutations';
import type { Contract, ContractStatus } from './contracts/types';
import { effectiveAmount } from './contracts/paymentUtils';
import { useQuotation } from './quotation/QuotationContext';
import { QuotationWorkbench } from './quotation/QuotationWorkbench';
import { QuoteCard } from './quotation/QuoteCard';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from './quotation/types';
import { getLeadDetailProfile } from './leads/leadDetailProfiles';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
  type ProcessMetricItem,
} from '@/app/components/ui';
import {
  CollectionRecordModal,
  ContractPaymentInvoicePanel,
  type PaymentInvoiceRecord,
} from './components/ContractPaymentInvoicePanel';

const { Text } = Typography;
const TabPane = Tabs.TabPane;

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
  const [collectionOverrides, setCollectionOverrides] = useState<Record<string, CollectionLedgerEntry>>({});
  const [addedCollections, setAddedCollections] = useState<CollectionLedgerEntry[]>([]);
  const [deletedCollectionIds, setDeletedCollectionIds] = useState<string[]>([]);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string>();
  const [collectionForm] = Form.useForm();
  const [invoiceRecords, setInvoiceRecords] = useState<PaymentInvoiceRecord[]>([]);
  const [teamDrawerMember, setTeamDrawerMember] = useState<string>();
  const [teamDailyKeyword, setTeamDailyKeyword] = useState('');
  const [teamDailyRiskFilter, setTeamDailyRiskFilter] = useState<'all' | 'risk'>('all');
  const [teamDailyPage, setTeamDailyPage] = useState(1);

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
  const mainContract = useMemo(
    () => linkedContracts.find((contract) => contract.kind !== 'supplement') ?? linkedContracts[0],
    [linkedContracts],
  );
  const supplementContracts = useMemo(
    () => linkedContracts.filter((contract) => contract.kind === 'supplement' && contract.parentContractId === mainContract?.id),
    [linkedContracts, mainContract?.id],
  );
  const effectiveSupplementContracts = useMemo(
    () => supplementContracts.filter((contract) => contract.status === 'archived'),
    [supplementContracts],
  );
  const effectiveContractIds = useMemo(
    () => new Set([mainContract?.id, ...effectiveSupplementContracts.map((contract) => contract.id)].filter(Boolean)),
    [mainContract?.id, effectiveSupplementContracts],
  );

  const projectCollections = useMemo(
    () => collectionsForProject(collections, {
      projectId: project?.id,
      contractIds: linkedContracts.map((c) => c.id),
    }).filter((record) => effectiveContractIds.has(record.contractId)),
    [collections, project?.id, linkedContracts, effectiveContractIds],
  );
  const visibleProjectCollections = useMemo(() => [
    ...addedCollections,
    ...projectCollections.filter((item) => !deletedCollectionIds.includes(item.id)).map((item) => collectionOverrides[item.id] || item),
  ], [addedCollections, collectionOverrides, deletedCollectionIds, projectCollections]);

  const seedMetrics = useMemo(() => PROJECT_LIST.find((p) => p.id === id), [id]);
  const derivedReceived = sumReceived(visibleProjectCollections);
  const contractAmount = mainContract
    ? effectiveAmount(mainContract, supplementContracts)
    : seedMetrics?.contractAmount || 0;
  // 实收只认独立台账；无记录就是 0，禁止回退到项目或合同种子汇总。
  const receivedAmount = derivedReceived;
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

  const teamMembers = Array.from(new Set([
    project.owner,
    ...project.salesUsers, ...project.assistants, ...project.productUsers, ...project.uiUsers,
    ...project.frontendUsers, ...project.backendUsers, ...project.opsUsers, ...project.testUsers, ...project.legalUsers,
    ...dailyReports.map((item) => item.personName),
  ].filter(Boolean))).map((name) => ({
    name,
    hours: dailyReports.filter((item) => item.personName === name).reduce((sum, item) => sum + item.hours, 0),
    position: dailyReports.find((item) => item.personName === name)?.position || (name === project.owner ? '项目经理' : '项目成员'),
  }));
  const selectedMemberReports = dailyReports.filter((item) => item.personName === teamDrawerMember
    && (!teamDailyKeyword || item.workContent.includes(teamDailyKeyword) || item.riskFeedback.includes(teamDailyKeyword))
    && (teamDailyRiskFilter === 'all' || (item.riskFeedback && item.riskFeedback !== '无')));

  const openCollectionEditor = (record?: CollectionLedgerEntry) => {
    setEditingCollectionId(record?.id);
    collectionForm.setFieldsValue(record || { date: '2026-08-27', method: '银行汇款', period: 'other', amount: 0, note: '' });
    setCollectionModalVisible(true);
  };

  const saveCollection = () => {
    collectionForm.validate().then((values) => {
      const record: CollectionLedgerEntry = {
        id: editingCollectionId || `project-col-${Date.now()}`,
        contractId: mainContract?.id || '', projectId: project.id,
        period: values.period === 'other' ? 'other' : Number(values.period),
        amount: Number(values.amount), date: values.date, method: values.method, note: values.note || '',
      };
      if (editingCollectionId) setCollectionOverrides((current) => ({ ...current, [editingCollectionId]: record }));
      else setAddedCollections((current) => [record, ...current]);
      setCollectionModalVisible(false);
      Message.success(editingCollectionId ? '实收记录已更新' : '实收记录已新增');
    });
  };

  const issueInvoice = (collection: CollectionLedgerEntry) => {
    const serial = invoiceRecords.length + 1;
    setInvoiceRecords((current) => [{ id: `invoice-${Date.now()}`, collectionId: collection.id, invoiceNo: `INV-202608-${String(serial).padStart(3, '0')}`, amount: collection.amount, issuedAt: '2026-08-27', status: 'valid' }, ...current]);
    Message.success('开票记录已生成');
  };

  const redInvoice = (invoice: PaymentInvoiceRecord) => {
    setInvoiceRecords((current) => [{ id: `invoice-red-${Date.now()}`, collectionId: invoice.collectionId, invoiceNo: `RED-${invoice.invoiceNo}`, amount: -invoice.amount, issuedAt: '2026-08-27', status: 'red', originalInvoiceId: invoice.id }, ...current]);
    Message.success('红冲记录已生成并保留原发票');
  };

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

  const overviewMetrics: ProcessMetricItem[] = [
    {
      key: 'owner',
      label: 'PM',
      value: <><IconUser style={{ color: 'rgb(var(--primary-6))' }} />{project.owner || '待指派'}</>,
    },
    { key: 'customer', label: '客户', value: metrics.customerName || '-' },
    ...(contractAmount > 0 ? [{
      key: 'contract-amount',
      label: '合同额',
      value: <Text style={{ color: 'rgb(var(--success-6))', whiteSpace: 'nowrap' }}>{formatAmount(contractAmount)} · 已回 {Math.round(receivedAmount / contractAmount * 100)}%</Text>,
    }] : []),
    {
      key: 'schedule',
      label: '工期',
      value: <><IconClockCircle />{cd.label}</>,
      tone: cd.isOverdue ? 'danger' : 'neutral',
    },
    {
      key: 'hours',
      label: '工时',
      value: `${formatHours(metrics.totalHours)} / ${formatHours(metrics.budgetHours)}`,
      detail: (
        <Progress
          percent={metrics.budgetHours > 0 ? Math.round(metrics.totalHours / metrics.budgetHours * 100) : 0}
          size="mini"
          showText={false}
        />
      ),
    },
    {
      key: 'bugs',
      label: '缺陷',
      value: `P0:${metrics.bugP0Count} P1:${metrics.bugP1Count}`,
      tone: metrics.bugP0Count > 0 ? 'danger' : metrics.bugP1Count > 0 ? 'warning' : 'success',
    },
    ...(project.riskLevel && project.riskLevel !== 'none' ? [{
      key: 'risk',
      label: '风险',
      value: PROJECT_RISK_LEVEL_LABEL[project.riskLevel],
      detail: project.riskNote || undefined,
      tone: project.riskLevel === 'high' ? 'danger' as const : project.riskLevel === 'medium' ? 'warning' as const : 'neutral' as const,
    }] : []),
    ...(activeBlockers.length > 0 ? [{
      key: 'blockers',
      label: '阻塞项',
      value: `${activeBlockers.length} 项`,
      tone: 'danger' as const,
    }] : []),
  ];

  return (
    <PageShell
      breadcrumbs={[
        { label: '项目管理', to: '/projects' },
        { label: '项目列表', to: '/projects' },
        { label: project.name },
      ]}
    >
      <ProcessOverview
        identifier={project.projectNo}
        title={project.name}
        tags={(
          <>
            <Tag color={BUSINESS_LINE_COLOR[project.businessLine]}>{project.businessLine}</Tag>
            <Tag color="gray">{project.entity}</Tag>
            <Tag color={PROJECT_PRIORITY_COLOR[project.priority]}>优先级: {project.priority}</Tag>
            <Tag color={HEALTH_COLOR[metrics.healthStatus]}>
              健康度: {HEALTH_LABEL[metrics.healthStatus]}
            </Tag>
          </>
        )}
        actions={(
          <Space>
            <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { setActiveSideTab('follow'); followForm.resetFields(); setFollowModalVisible(true); }}>登记跟进</Button>
            <Button size="small" icon={<IconPlus />} onClick={() => { setActiveMainTab('tasks'); openTaskModal(); }}>新建任务</Button>
            <Button size="small" icon={<IconFile />} onClick={() => { setActiveSideTab('meetings'); meetingForm.resetFields(); setMeetingModalVisible(true); }}>录入纪要</Button>
            <Button size="small" icon={<IconCalendar />} onClick={() => navigate(`/projects/${id}/delivery`)}>甘特图</Button>
          </Space>
        )}
        currentStep={lifecycleIndex}
        steps={LIFECYCLE_STEPS.map((step, index) => ({
          key: step,
          title: LIFECYCLE_STEP_LABEL[step],
          description:
                index === 2 && project.status === '进行中'
                  ? `${project.progress}%`
                  : project.status === '搁置' && index === 2
                  ? '已暂停'
                  : project.status === '延迟' && index === 2
                  ? '延期中'
                  : undefined,
        }))}
      />

      <ProcessMetricGrid items={overviewMetrics} />

      {/* ========== 主体区域：70:30 分栏 ========== */}
      <ProcessWorkspace>
        {/* 左侧主区域 (70%) */}
        <ProcessWorkspaceMain>
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
                      <LeadFinalContractPanel contract={mainContract} projectLayout projectFullInfo />
                    ) : (
                      <Empty description="暂无关联合同" />
                    )}
                  </Card>
                  <Card size="small" title={`补充合同（${supplementContracts.length}）`}>
                    {supplementContracts.length > 0 ? (
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {supplementContracts.map((contract) => (
                          <LeadFinalContractPanel key={contract.id} contract={contract} projectLayout />
                        ))}
                      </Space>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无补充合同</div>
                    )}
                  </Card>
                </div>
              )}

              {/* 回款与发票 */}
              {activeMainTab === 'payments' && (
                <ContractPaymentInvoicePanel
                  mainContract={mainContract}
                  supplementContracts={supplementContracts}
                  contractAmount={contractAmount}
                  receivedAmount={receivedAmount}
                  collections={visibleProjectCollections}
                  invoiceRecords={invoiceRecords}
                  onAddCollection={() => openCollectionEditor()}
                  onEditCollection={openCollectionEditor}
                  onDeleteCollection={(record) => {
                    if (addedCollections.some((item) => item.id === record.id)) {
                      setAddedCollections((items) => items.filter((item) => item.id !== record.id));
                    } else {
                      setDeletedCollectionIds((items) => [...items, record.id]);
                    }
                    Message.success('实收记录已删除');
                  }}
                  onIssueInvoice={issueInvoice}
                  onRedInvoice={redInvoice}
                  onCorrectInvoice={(invoice) => setInvoiceRecords((items) => items.map((item) => item.id === invoice.id ? { ...item, invoiceNo: `${item.invoiceNo}-更正` } : item))}
                  onDeleteInvoice={(invoice) => setInvoiceRecords((items) => items.filter((item) => item.id !== invoice.id))}
                />
              )}

              {/* 团队与工时 */}
              {activeMainTab === 'team' && (
                <div>
                  <Card size="small" title="团队成员与分工" style={{ marginBottom: 16 }}>
                    <Table rowKey="name" pagination={false} data={teamMembers} columns={[
                      { title: '成员', dataIndex: 'name', render: (name: string) => <Button type="text" style={{ padding: 0 }} onClick={() => { setTeamDrawerMember(name); setTeamDailyPage(1); setTeamDailyKeyword(''); setTeamDailyRiskFilter('all'); }}>{name}</Button> },
                      { title: '岗位', dataIndex: 'position' },
                      { title: '累计工时', dataIndex: 'hours', render: (hours: number) => <Text style={{ fontWeight: 600 }}>{formatHours(hours)}</Text> },
                      { title: '操作', width: 100, fixed: 'right' as const, render: (_: unknown, member: { name: string }) => <Button type="text" size="small" onClick={() => { setTeamDrawerMember(member.name); setTeamDailyPage(1); setTeamDailyKeyword(''); setTeamDailyRiskFilter('all'); }}>查看日报</Button> },
                    ]} />
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
                  <Text style={{ display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>工作项概览</Text>
                  <Grid.Row gutter={[12, 12]}>
                    {[
                      { key: 'requirements', title: '需求', total: Math.max(3, tasks.filter((task) => task.type === '产品设计').length), pending: 1, tone: 'rgb(var(--primary-6))' },
                      { key: 'tasks', title: '任务', total: tasks.length, pending: tasks.filter((task) => task.status !== '已完成').length, tone: 'rgb(var(--warning-6))' },
                      { key: 'bugs', title: '缺陷', total: bugs.length, pending: bugs.filter((bug) => bug.status !== '已修复').length, tone: 'rgb(var(--danger-6))' },
                    ].map((item) => <Grid.Col span={8} key={item.key}>
                      <Card hoverable size="small" style={{ cursor: 'pointer', borderTop: `3px solid ${item.tone}` }} onClick={() => navigate(`/projects/${project.id}/work-items?tab=${item.key}`)}>
                        <Text type="secondary">{item.title}总数</Text><div style={{ fontSize: 28, fontWeight: 700, margin: '6px 0' }}>{item.total}</div><Text type="secondary">待处理 {item.pending} 项 · 点击查看列表</Text>
                      </Card>
                    </Grid.Col>)}
                  </Grid.Row>
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

                  {/* 项目里程碑：已完成按完成时间倒序，未完成置底 */}
                  <div style={{ marginBottom: 16 }}>
                    <Text style={{ display: 'block', fontSize: 16, fontWeight: 500, marginBottom: 12 }}>项目里程碑</Text>
                    <Grid.Row gutter={[12, 12]}>
                      {[
                        { name: '合同接收', done: Boolean(mainContract), date: mainContract?.current.signDate || project.createdAt.slice(0, 10) },
                        { name: '原型确认', done: project.progress >= 20, date: project.progress >= 20 ? '2026-06-18' : '' },
                        { name: 'UI 确认', done: project.progress >= 40, date: project.progress >= 40 ? '2026-07-09' : '' },
                        { name: '一期回款', done: receivedAmount > 0, date: projectCollections[0]?.date || '' },
                        { name: '项目验收', done: project.progress >= 100, date: project.progress >= 100 ? project.expectedEndDate : '' },
                      ].sort((left, right) => Number(right.done) - Number(left.done) || right.date.localeCompare(left.date)).map((milestone) => (
                        <Grid.Col span={12} key={milestone.name}>
                          <Card size="small" style={{ borderColor: milestone.done ? 'rgb(var(--success-3))' : 'var(--color-border-2)', background: milestone.done ? 'rgb(var(--success-1))' : 'var(--color-bg-2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div><Text style={{ fontWeight: 600 }}>{milestone.name}</Text><div><Text type="secondary" style={{ fontSize: 12 }}>{milestone.done ? `完成于 ${milestone.date}` : '等待前置节点完成'}</Text></div></div>
                              <Tag color={milestone.done ? 'green' : 'gray'}>{milestone.done ? '✓ 已完成' : '未完成'}</Tag>
                            </div>
                          </Card>
                        </Grid.Col>
                      ))}
                    </Grid.Row>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </ProcessWorkspaceMain>

        {/* 右侧业务过程 (30%) */}
        <ProcessWorkspaceAside>
          <Card size="small" style={{ flex: 1 }}>
            <Tabs activeTab={activeSideTab} onChange={setActiveSideTab} type="card" size="small">
              <TabPane key="follow" title="跟进" />
              <TabPane key="quotation" title="报价" />
              <TabPane key="contract-records" title="合同" />
              <TabPane key="presales" title="售前" />
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

              {/* 合同 */}
              {activeSideTab === 'contract-records' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<IconPlus />}
                      onClick={() => navigate(`/contracts/new?projectId=${project.id}`)}
                    >
                      新建合同
                    </Button>
                  </div>
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
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无合同</div>
                  )}
                </div>
              )}

              {/* 售前 */}
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
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

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

      <CollectionRecordModal
        visible={collectionModalVisible}
        editing={Boolean(editingCollectionId)}
        form={collectionForm}
        onOk={saveCollection}
        onCancel={() => setCollectionModalVisible(false)}
      />

      <Drawer title={`${teamDrawerMember || ''} · 项目日报`} visible={Boolean(teamDrawerMember)} onCancel={() => setTeamDrawerMember(undefined)} footer={null} width={720}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Grid.Row gutter={12}>
            <Grid.Col span={8}><Card size="small"><Text type="secondary">累计工时</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{formatHours(selectedMemberReports.reduce((sum, item) => sum + item.hours, 0))}</div></Card></Grid.Col>
            <Grid.Col span={8}><Card size="small"><Text type="secondary">日报数量</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{selectedMemberReports.length}</div></Card></Grid.Col>
            <Grid.Col span={8}><Card size="small"><Text type="secondary">风险记录</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{selectedMemberReports.filter((item) => item.riskFeedback && item.riskFeedback !== '无').length}</div></Card></Grid.Col>
          </Grid.Row>
          <Space style={{ width: '100%' }}>
            <Input.Search allowClear placeholder="搜索工作内容或风险反馈" value={teamDailyKeyword} onChange={(value) => { setTeamDailyKeyword(value); setTeamDailyPage(1); }} style={{ flex: 1 }} />
            <Select value={teamDailyRiskFilter} onChange={(value) => { setTeamDailyRiskFilter(value); setTeamDailyPage(1); }} style={{ width: 150 }}><Select.Option value="all">风险（全部）</Select.Option><Select.Option value="risk">仅有风险</Select.Option></Select>
          </Space>
          <Table rowKey="id" pagination={false} data={selectedMemberReports.slice((teamDailyPage - 1) * 5, teamDailyPage * 5)} columns={[
            { title: '日期', dataIndex: 'date', width: 110 }, { title: '工时', dataIndex: 'hours', width: 80, render: (value: number) => `${value}h` },
            { title: '工作内容', dataIndex: 'workContent' }, { title: '风险反馈', dataIndex: 'riskFeedback', width: 180 },
          ]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Pagination current={teamDailyPage} pageSize={5} total={selectedMemberReports.length} onChange={setTeamDailyPage} size="small" /></div>
        </Space>
      </Drawer>

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
    </PageShell>
  );
}
