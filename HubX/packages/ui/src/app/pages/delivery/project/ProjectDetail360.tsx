import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Button,
  Space,
  Typography,
  FormGrid,
  Timeline,
  Message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Drawer,
  Upload,
  Pagination,
} from '@/design-system';
import {
  ChartBarHorizontal,
  IconEdit,
  IconCalendar,
  IconPlus,
  IconFile,
  IconDelete,
  IconUpload,
  Flag,
} from '@/design-system';
import type {
  ActivityEvent,
  ProjectMeetingMinutes,
  ProjectDemoEnv,
} from './types';
import {
  PROJECT_PRIORITY_META,
  BUSINESS_LINE_META,
  HEALTH_META,
  PROJECT_DELIVERY_STAGE_LABEL,
  getProjectDeliveryStage,
  PROJECT_RISK_LEVEL_META,
  PROJECT_STATUS_META,
} from './types';
import {
  getProjectCountdown,
  formatHours,
  formatAmount,
} from './utils';
import {
  PROJECT_LIST,
  getActivitiesByProjectId,
  getMeetingsByProjectId,
  getConfirmationsByProjectId,
  getDemoEnvsByProjectId,
} from './projectMockData';
import {
  initialDailyReports,
  initialFollowUps,
  initialDocuments,
  employees,
} from './mockData';
import { getProjectTasks, type ProjectWorkTask } from './projectTasks';
import { useProjects } from './ProjectContext';
import { deriveProjectViewMetrics } from './projectViewMetrics';
import { ProjectPresalesHistoryPanel } from './ProjectPresalesHistoryPanel';
import { LeadFinalContractPanel } from '../../sales/leads/components/LeadFinalContractPanel';
import { useContracts } from '../../sales/contracts/ContractsContext';
import { useCollections } from '../../../collections/CollectionContext';
import {
  allocateCollectionAmount,
  collectionsForProject,
  getCollectionPeriods,
  sumReceived,
  type CollectionLedgerEntry,
  type CollectionPeriod,
} from '../../../../services/collectionMutations';
import type { Contract } from '../../sales/contracts/types';
import { computePlanStatusRows, effectiveAmount } from '../../sales/contracts/paymentUtils';
import { useQuotation } from '../../sales/quotation/QuotationContext';
import { QuotationWorkbench } from '../../sales/quotation/QuotationWorkbench';
import { QuoteCard } from '../../sales/quotation/QuoteCard';
import { QUOTE_STATUS } from '../../sales/quotation/types';
import { getLeadDetailProfile } from '../../sales/leads/leadDetailProfiles';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  EmptyState,
  MetricGrid,
  MoneyText,
  PageHeader,
  PageShell,
  ProcessOverview,
  ProcessPanelSection,
  ProcessRecordCard,
  SectionCard,
  SectionTabs,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
  UploadPanel,
  resolveStatus,
  type MetricItem,
  type StatusMap,
  ProgressBar,
} from '@/design-system';
import {
  CollectionRecordModal,
  ContractPaymentInvoicePanel,
  type PaymentInvoiceRecord,
} from '../../sales/contracts/components/ContractPaymentInvoicePanel';
import { ProjectArchiveSummary } from './detail/ProjectArchiveSummary';
import { ProjectStagePopover } from './detail/ProjectStagePopover';
import {
  ProjectActivityFeed,
  type ProjectMilestoneItem,
} from './detail/ProjectActivityFeed';
import {
  buildProjectActivity,
  type ProjectActivityItem,
} from './projectActivityProjection';
import {
  buildContractSigningStageSummary,
  buildProjectTimelineStepOrder,
  buildProjectStageSummaries,
  buildSupplementAgreementStageSummary,
  type ProjectStageCheck,
} from './projectStageSummary';
import './detail/projectDetail360.css';
import { CONTRACT_STATUS } from '../../sales/contracts/utils';

const { Text } = Typography;

const MAIN_TABS = ['activity', 'basic', 'contracts', 'payments', 'team', 'daily', 'tasks'] as const;
const SIDE_TABS = ['follow', 'meetings', 'documents', 'demo', 'quotation', 'contract-records', 'presales', 'travel', 'reimbursement'] as const;
type MainTab = typeof MAIN_TABS[number];
type SideTab = typeof SIDE_TABS[number];

function isMainTab(value: string | null): value is MainTab {
  return MAIN_TABS.includes(value as MainTab);
}

function isSideTab(value: string | null): value is SideTab {
  return SIDE_TABS.includes(value as SideTab);
}

const CONFIRMATION_STATUS_META: StatusMap = {
  已签署: { label: '已签署', tone: 'success' },
  待签署: { label: '待签署', tone: 'warning' },
};

const PAWKEY_PROJECT_ID = 'prod-112';

function getPageBugFixtures(projectId: string | undefined) {
  if (projectId === PAWKEY_PROJECT_ID) {
    return [
      { id: 'pawkey-b1', title: 'Android 大字体下宠物档案信息错位', severity: 'P1', env: '预发布环境', assignee: '林子涵', status: '待验证', createdAt: '2026-08-26' },
      { id: 'pawkey-b2', title: '拒绝相册权限后分享图引导不完整', severity: 'P1', env: 'iOS 测试环境', assignee: '林子涵', status: '处理中', createdAt: '2026-08-27' },
      { id: 'pawkey-b3', title: '生命流长图分享底部留白异常', severity: 'P2', env: '测试环境', assignee: '林子涵', status: '已修复', createdAt: '2026-08-23' },
      { id: 'pawkey-b4', title: '弱网下互动反馈重复出现', severity: 'P2', env: '测试环境', assignee: '陈周伟', status: '已修复', createdAt: '2026-08-22' },
    ];
  }
  return [
    { id: 'b1', title: '列表页横向滚动卡顿', severity: 'P1', env: '测试环境', assignee: '王五', status: '处理中', createdAt: '2026-08-18' },
    { id: 'b2', title: '表单提交后未清空', severity: 'P2', env: '测试环境', assignee: '赵六', status: '待修复', createdAt: '2026-08-19' },
  ];
}

function getTravelFixtures(projectId: string | undefined) {
  if (projectId === PAWKEY_PROJECT_ID) {
    return [
      { id: 'pawkey-tr1', destination: '重庆客户现场', purpose: '需求调研与项目启动', applicant: '何江奇', startDate: '2026-06-08', endDate: '2026-06-09', approvalNo: 'SP-20260605-0594', amount: 2860, status: '已审批' },
      { id: 'pawkey-tr2', destination: '重庆客户现场', purpose: '一期终验与交付培训', applicant: '何江奇', startDate: '2026-09-03', endDate: '2026-09-04', approvalNo: 'SP-20260829-1120', amount: 3180, status: '待审批' },
    ];
  }
  return [{ id: 'tr1', destination: '客户现场', purpose: '原型演示与需求确认', applicant: '李四', startDate: '2026-08-19', endDate: '2026-08-20', approvalNo: 'SP-20260819-0042', amount: 850, status: '已审批' }];
}

function getReimbursementFixtures(projectId: string | undefined) {
  if (projectId === PAWKEY_PROJECT_ID) {
    return [
      { id: 'pawkey-rb1', type: '交通费', description: '重庆启动会往返交通', applicant: '何江奇', amount: 1680, approvalNo: 'BX-20260610-0594', status: '已审批' },
      { id: 'pawkey-rb2', type: '住宿费', description: '启动会现场调研住宿', applicant: '周雨桐', amount: 760, approvalNo: 'BX-20260610-0595', status: '已审批' },
      { id: 'pawkey-rb3', type: '差旅费', description: '一期终验现场差旅预申请', applicant: '何江奇', amount: 3180, approvalNo: 'BX-20260829-1120', status: '待审批' },
    ];
  }
  return [{ id: 'rb1', type: '商务招待', description: '客户工作餐', applicant: '张三', amount: 280, approvalNo: 'BX-20260819-0018', status: '已审批' }];
}

export function ProjectDetail360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProjectById } = useProjects();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const { quotes, createQuote } = useQuotation();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeMainTab: MainTab = isMainTab(searchParams.get('main')) ? searchParams.get('main') as MainTab : 'activity';
  const activeSideTab: SideTab = isSideTab(searchParams.get('side')) ? searchParams.get('side') as SideTab : 'follow';
  const onlyMajor = searchParams.get('major') !== 'false';
  const updateQueryState = (key: 'main' | 'side' | 'major', value: string) => {
    const next = new URLSearchParams(searchParams);
    const isDefault = (key === 'main' && value === 'activity')
      || (key === 'side' && value === 'follow')
      || (key === 'major' && value === 'true');
    if (isDefault) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const setActiveMainTab = (value: string) => isMainTab(value) && updateQueryState('main', value);
  const setActiveSideTab = (value: string) => isSideTab(value) && updateQueryState('side', value);
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
  const [projectOwnedEvents, setProjectOwnedEvents] = useState<ActivityEvent[]>(() => getActivitiesByProjectId(id ?? ''));
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
  const [bugs, setBugs] = useState(() => getPageBugFixtures(id));
  const [travels, setTravels] = useState(() => getTravelFixtures(id));
  const [reimbursements, setReimbursements] = useState(() => getReimbursementFixtures(id));
  const [travelModalVisible, setTravelModalVisible] = useState(false);
  const [travelForm] = Form.useForm();
  const [reimbursementModalVisible, setReimbursementModalVisible] = useState(false);
  const [reimbursementForm] = Form.useForm();

  useEffect(() => {
    setTasks(getProjectTasks(id ?? ''));
    setFollowUps(initialFollowUps.filter((item) => item.projectId === id));
    setProjectOwnedEvents(getActivitiesByProjectId(id ?? ''));
    setMeetings(getMeetingsByProjectId(id ?? ''));
    setDemoEnvs(getDemoEnvsByProjectId(id ?? ''));
    setBugs(getPageBugFixtures(id));
    setTravels(getTravelFixtures(id));
    setReimbursements(getReimbursementFixtures(id));
  }, [id]);

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

  // 项目动态是各业务域事实的只读投影，页面不复制这些台账的所有权。
  const projectActivities = useMemo(() => project ? buildProjectActivity({
    project,
    contracts: linkedContracts,
    collections: visibleProjectCollections,
    confirmations,
    meetings,
    tasks,
    ownedEvents: projectOwnedEvents,
  }) : [], [project, linkedContracts, visibleProjectCollections, confirmations, meetings, tasks, projectOwnedEvents]);

  const stageSummaries = useMemo(() => project ? buildProjectStageSummaries({
    project,
    contracts: linkedContracts,
    collections: visibleProjectCollections,
    confirmations,
    tasks,
    contractAmount,
    receivedAmount,
  }) : null, [project, linkedContracts, visibleProjectCollections, confirmations, tasks, contractAmount, receivedAmount]);

  const contractSigningStageSummary = useMemo(() => project ? buildContractSigningStageSummary({
    project,
    contracts: linkedContracts,
    collections: visibleProjectCollections,
    confirmations,
    tasks,
    contractAmount,
    receivedAmount,
  }) : null, [project, linkedContracts, visibleProjectCollections, confirmations, tasks, contractAmount, receivedAmount]);

  const supplementAgreementStageSummary = useMemo(() => project ? buildSupplementAgreementStageSummary({
    project,
    contracts: linkedContracts,
    collections: visibleProjectCollections,
    confirmations,
    tasks,
    contractAmount,
    receivedAmount,
  }) : null, [project, linkedContracts, visibleProjectCollections, confirmations, tasks, contractAmount, receivedAmount]);

  if (!project || !metrics) {
    return (
      <PageShell breadcrumbs={[{ label: '项目管理', to: '/projects' }, { label: '项目详情' }]}>
        <PageHeader title="项目详情" />
        <SectionCard>
          <EmptyState description="项目不存在" action={<Button onClick={() => navigate('/projects')}>返回列表</Button>} />
        </SectionCard>
      </PageShell>
    );
  }

  const cd = getProjectCountdown(project.startDate, project.expectedEndDate);
  const currentDeliveryStage = getProjectDeliveryStage(project.status, project.progress);
  const budgetHoursLabel = metrics.budgetHours > 0 ? formatHours(metrics.budgetHours) : '未设置';
  const hoursUsageLabel = metrics.budgetHours > 0
    ? `${Math.round(metrics.totalHours / metrics.budgetHours * 100)}%`
    : '未设置';

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
    collectionForm.resetFields();
    collectionForm.setFieldsValue(record ? {
      ...record,
      periods: getCollectionPeriods(record).map(String),
    } : {
      date: '2026-08-27',
      method: '银行汇款',
      contractId: mainContract?.id,
      periods: [],
      amount: 0,
      note: '',
    });
    setCollectionModalVisible(true);
  };

  const saveCollection = () => {
    collectionForm.validate().then((values) => {
      const contract = linkedContracts.find((item) => item.id === values.contractId) ?? mainContract;
      if (!contract) {
        Message.error('未找到关联合同');
        return;
      }
      const periods = ((values.periods ?? []) as string[]).map<CollectionPeriod>((value) => value === 'other' ? 'other' : Number(value));
      const otherCollections = visibleProjectCollections.filter((item) => item.contractId === contract.id && item.id !== editingCollectionId);
      const allocatedRows = computePlanStatusRows({ ...contract, collectionRecords: otherCollections });
      const periodAllocations = allocateCollectionAmount({
        periods,
        amount: Number(values.amount),
        plans: contract.current.paymentPlans,
        allocatedByPeriod: new Map(allocatedRows.map((row) => [row.plan.period, row.allocated])),
      });
      const record: CollectionLedgerEntry = {
        id: editingCollectionId || `project-col-${Date.now()}`,
        contractId: contract.id,
        projectId: project.id,
        period: periods[0],
        periods,
        periodAllocations,
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
  const collectionPercent = contractAmount > 0 ? Math.round(receivedAmount / contractAmount * 100) : 0;
  const timelineSteps = buildProjectTimelineStepOrder({
    includeContractSigning: Boolean(contractSigningStageSummary),
    includeSupplementAgreement: Boolean(supplementAgreementStageSummary),
  }).map((step) => {
    if (step === 'contract') return { key: step, label: '合同签订', summary: contractSigningStageSummary! };
    if (step === 'supplement') return { key: step, label: '补充协议', summary: supplementAgreementStageSummary! };
    return { key: step, label: PROJECT_DELIVERY_STAGE_LABEL[step], summary: stageSummaries![step] };
  });
  const currentTimelineIndex = timelineSteps.findIndex((step) => step.key === currentDeliveryStage);
  const milestones: ProjectMilestoneItem[] = [
    { name: '方案设计', done: project.progress >= 30, date: confirmations.filter((item) => item.status === '已签署' && /原型|UI|视觉/.test(item.type)).at(-1)?.signDate },
    { name: '开发', done: project.progress >= 70, date: tasks.filter((item) => item.type === '开发' && item.status === '已完成').at(-1)?.plannedEndDate },
    { name: '测试', done: project.progress >= 90, date: tasks.filter((item) => item.type === '测试' && item.status === '已完成').at(-1)?.plannedEndDate },
    { name: '验收', done: confirmations.some((item) => item.status === '已签署' && /验收|终验/.test(item.type)), date: confirmations.find((item) => item.status === '已签署' && /验收|终验/.test(item.type))?.signDate },
    { name: '回款结项', done: project.status === '已完成' && collectionPercent >= 100, date: project.status === '已完成' ? project.expectedEndDate : undefined },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduleStartTime = new Date(`${project.startDate}T00:00:00`).getTime();
  const scheduleEndTime = new Date(`${project.expectedEndDate}T00:00:00`).getTime();
  const hasScheduleRange = Number.isFinite(scheduleStartTime)
    && Number.isFinite(scheduleEndTime)
    && scheduleEndTime > scheduleStartTime;
  const scheduleScaleEnd = hasScheduleRange ? Math.max(scheduleEndTime, today.getTime()) : today.getTime();
  const scheduleDuration = hasScheduleRange ? scheduleScaleEnd - scheduleStartTime : 1;
  const schedulePlanPosition = hasScheduleRange
    ? Math.max(0, Math.min(100, (scheduleEndTime - scheduleStartTime) / scheduleDuration * 100))
    : 100;
  const scheduleCurrentPosition = hasScheduleRange
    ? Math.max(0, Math.min(100, (today.getTime() - scheduleStartTime) / scheduleDuration * 100))
    : 0;
  const scheduleStatus = !project.expectedEndDate
    ? '未设置工期'
    : cd.isOverdue
    ? `逾期 ${Math.abs(cd.daysRemaining)} 天`
    : cd.daysRemaining === 0 ? '今日到期' : `剩余 ${cd.daysRemaining} 天`;
  const scheduleStartLabel = project.startDate ? project.startDate.slice(5).replace('-', '.') : '--';
  const scheduleEndLabel = project.expectedEndDate ? project.expectedEndDate.slice(5).replace('-', '.') : '--';

  const hourBlockTotal = 12;
  const hourScale = Math.max(metrics.totalHours, metrics.budgetHours, 1);
  const completedHours = metrics.budgetHours > 0
    ? Math.min(metrics.totalHours, metrics.budgetHours)
    : metrics.totalHours;
  const overrunHours = metrics.budgetHours > 0
    ? Math.max(metrics.totalHours - metrics.budgetHours, 0)
    : 0;
  const completedHourBlocks = Math.min(hourBlockTotal, Math.round(completedHours / hourScale * hourBlockTotal));
  const overrunHourBlocks = Math.min(
    hourBlockTotal - completedHourBlocks,
    Math.round(overrunHours / hourScale * hourBlockTotal),
  );
  const expectedHourBlocks = hourBlockTotal - completedHourBlocks - overrunHourBlocks;
  const hourBlocks = Array.from({ length: hourBlockTotal }, (_, index) => (
    index < completedHourBlocks
      ? 'completed'
      : index < completedHourBlocks + expectedHourBlocks ? 'expected' : 'overrun'
  ));

  const navigateToStageTarget = (target: NonNullable<ProjectStageCheck['target']>) => {
    if (target.route) navigate(target.route);
    else if (target.main && isMainTab(target.main)) setActiveMainTab(target.main);
    else if (target.side && isSideTab(target.side)) setActiveSideTab(target.side);
  };

  const viewActivitySource = (item: ProjectActivityItem) => {
    if (item.sourceTarget.route) {
      navigate(item.sourceTarget.route);
      return;
    }
    if (item.sourceTarget.main) setActiveMainTab(item.sourceTarget.main);
    if (item.sourceTarget.side) setActiveSideTab(item.sourceTarget.side);
    if (item.sourceTarget.anchor) {
      requestAnimationFrame(() => document.getElementById(item.sourceTarget.anchor || '')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  };

  const runActivityAction = (item: ProjectActivityItem) => {
    if (item.primaryAction === 'record-collection') openCollectionEditor();
    else if (item.primaryAction === 'open-confirmation') setActiveSideTab('documents');
    else if (item.primaryAction === 'open-meeting') setActiveSideTab('meetings');
    else if (item.primaryAction === 'open-task') navigate(`/projects/${project.id}/work-items?tab=tasks`);
  };

  const openQuickFollow = (content = '') => {
    setActiveSideTab('follow');
    followForm.resetFields();
    followForm.setFieldsValue({ content, operator: project.owner || '李四', progress: project.progress });
    setFollowModalVisible(true);
  };

  const overviewMetrics: MetricItem[] = [
    {
      key: 'progress',
      label: (
        <span className="project-metric-heading">
          <span className="project-metric-heading__label">
            <ChartBarHorizontal className="project-progress-metric__gantt-icon" size={14} aria-hidden="true" />
            项目进度
          </span>
          <strong>{project.progress}%</strong>
        </span>
      ),
      value: (
        <div className="project-milestone-metric" aria-label={`${milestones.filter((item) => item.done).length} 个里程碑已完成，共 ${milestones.length} 个`}>
          {milestones.map((milestone) => (
            <span
              key={milestone.name}
              className={`project-milestone-metric__item ${milestone.done ? 'is-completed' : 'is-pending'}`}
              title={`${milestone.name}：${milestone.done ? '已完成' : '未完成'}`}
            >
              <Flag size={16} weight={milestone.done ? 'fill' : 'regular'} aria-hidden="true" />
            </span>
          ))}
        </div>
      ),
      onClick: () => navigate(`/projects/${id}/delivery`),
      ariaLabel: '打开项目甘特图',
    },
    {
      key: 'schedule',
      label: (
        <span className="project-metric-heading">
          <span>工期状态</span>
          <strong className={cd.isOverdue ? 'is-overdue' : ''}>{scheduleStatus}</strong>
        </span>
      ),
      value: (
        <div className={`project-schedule-metric ${cd.isOverdue ? 'is-overdue' : ''}`}>
          <span className="project-schedule-metric__track" aria-hidden="true">
            <span
              className="project-schedule-metric__elapsed"
              style={{ width: `${scheduleCurrentPosition}%` }}
            />
            {cd.isOverdue && (
              <span
                className="project-schedule-metric__overrun"
                style={{ left: `${schedulePlanPosition}%`, width: `${100 - schedulePlanPosition}%` }}
              />
            )}
            <span className="project-schedule-metric__marker is-start" />
            <span className="project-schedule-metric__marker is-current" style={{ left: `${scheduleCurrentPosition}%` }} />
            <span className="project-schedule-metric__marker is-plan" style={{ left: `${schedulePlanPosition}%` }} />
          </span>
          <span className="project-schedule-metric__dates">
            <span>启动 {scheduleStartLabel}</span>
            <span>计划 {scheduleEndLabel}</span>
          </span>
        </div>
      ),
      tone: cd.isOverdue ? 'danger' : 'neutral',
      onClick: () => navigate(`/projects/${id}/delivery`),
      ariaLabel: `工期状态：${scheduleStatus}，${scheduleStartLabel} 启动，计划 ${scheduleEndLabel}，查看项目排期`,
    },
    {
      key: 'hours',
      label: (
        <span className="project-metric-heading">
          <span>工时消耗</span>
          <strong>{formatHours(metrics.totalHours)} / {budgetHoursLabel}</strong>
        </span>
      ),
      value: (
        <div
          className="project-hours-metric"
          aria-label={`已完成工时 ${formatHours(completedHours)}，预期剩余工时 ${formatHours(Math.max(metrics.budgetHours - metrics.totalHours, 0))}，超出工时 ${formatHours(overrunHours)}`}
        >
          {hourBlocks.map((kind, index) => (
            <span key={`${kind}-${index}`} className={`project-hours-metric__block is-${kind}`} aria-hidden="true" />
          ))}
        </div>
      ),
      tone: metrics.budgetHours > 0 && metrics.totalHours > metrics.budgetHours ? 'warning' : 'neutral',
      onClick: () => setActiveMainTab('team'),
      ariaLabel: `工时消耗 ${formatHours(metrics.totalHours)}，预算 ${budgetHoursLabel}，查看团队与工时`,
    },
    {
      key: 'collection',
      label: (
        <span className="project-metric-heading">
          <span>合同回款</span>
          {contractAmount > 0 && <strong>{collectionPercent}%</strong>}
        </span>
      ),
      value: contractAmount > 0 ? (
        <div className="project-collection-metric">
          <ProgressBar percent={Math.max(0, Math.min(100, collectionPercent))} tone="success" />
          <span className="project-collection-metric__amount">
            <span>已回 <MoneyText value={receivedAmount} variant="compact" /></span>
            <span>合同 <MoneyText value={contractAmount} variant="compact" /></span>
          </span>
        </div>
      ) : '暂无有效合同',
      tone: contractAmount > 0 && collectionPercent >= 100 ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('payments'),
      ariaLabel: contractAmount > 0
        ? `合同回款 ${collectionPercent}%，已回 ${formatAmount(receivedAmount)}，合同 ${formatAmount(contractAmount)}，查看回款与发票`
        : '暂无有效合同，查看回款与发票',
    },
    {
      key: 'bugs',
      label: '缺陷',
      value: `P0 ${metrics.bugP0Count} · P1 ${metrics.bugP1Count}`,
      tone: metrics.bugP0Count > 0 ? 'danger' : metrics.bugP1Count > 0 ? 'warning' : 'success',
      onClick: () => navigate(`/projects/${id}/work-items?tab=bugs`),
      ariaLabel: '查看项目缺陷',
    },
    {
      key: 'risk-blockers',
      label: '风险 / 阻塞',
      value: activeBlockers.length > 0
        ? `${resolveStatus(PROJECT_RISK_LEVEL_META, project.riskLevel || 'none').label} · ${activeBlockers.length} 项阻塞`
        : resolveStatus(PROJECT_RISK_LEVEL_META, project.riskLevel || 'none').label,
      tone: activeBlockers.length > 0 || project.riskLevel === 'high' ? 'danger' : project.riskLevel === 'medium' ? 'warning' : 'success',
      onClick: () => {
        setActiveMainTab('activity');
        requestAnimationFrame(() => document.getElementById('project-risk')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      },
      ariaLabel: '查看风险与阻塞',
    },
  ];

  return (
    <PageShell
      className="project-detail-360"
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
            <StatusTag meta={resolveStatus(BUSINESS_LINE_META, project.businessLine)} />
            <StatusTag>{project.entity}</StatusTag>
            <StatusTag tone={resolveStatus(PROJECT_PRIORITY_META, project.priority).tone}>优先级: {project.priority}</StatusTag>
            <StatusTag tone={resolveStatus(HEALTH_META, metrics.healthStatus).tone}>健康度: {resolveStatus(HEALTH_META, metrics.healthStatus).label}</StatusTag>
          </>
        )}
        actions={(
          <Space>
            <Button type="primary" size="small" icon={<IconPlus />} onClick={() => openQuickFollow()}>登记跟进</Button>
            <Button size="small" icon={<IconPlus />} onClick={() => { setActiveMainTab('tasks'); openTaskModal(); }}>新建任务</Button>
            <Button size="small" icon={<IconFile />} onClick={() => { setActiveSideTab('meetings'); meetingForm.resetFields(); setMeetingModalVisible(true); }}>录入纪要</Button>
            <Button size="small" icon={<IconCalendar />} onClick={() => navigate(`/projects/${id}/delivery`)}>甘特图</Button>
          </Space>
        )}
        currentStep={currentTimelineIndex}
        steps={timelineSteps.map((step, index) => {
          const status = index === currentTimelineIndex && step.key === 'development'
            ? `${project.progress}%`
            : index === currentTimelineIndex && step.key === 'acceptance'
            ? '终验中'
            : index === currentTimelineIndex && step.key === 'closeout'
            ? `回款 ${collectionPercent}%`
            : project.status === '搁置' && index === currentTimelineIndex
            ? '已暂停'
            : project.status === '延迟' && index === currentTimelineIndex
            ? '延期中'
            : undefined;

          return {
            key: step.key,
            title: (
              <span className="project-stage-step-title">
                <ProjectStagePopover summary={step.summary} onNavigate={navigateToStageTarget}>
                  {step.label}
                </ProjectStagePopover>
                {status && <span className="project-stage-step-status">{status}</span>}
              </span>
            ),
          };
        })}
      />

      <MetricGrid items={overviewMetrics} />

      {/* ========== 主体区域：70:30 分栏 ========== */}
      <SplitLayout>
        {/* 左侧主区域 (70%) */}
        <SplitLayoutMain>
          <ProjectArchiveSummary
            project={project}
            customerName={metrics.customerName}
            budgetHoursLabel={budgetHoursLabel}
          />

          {/* 左侧主 Tab */}
          <SectionCard>
            <SectionTabs
              variant="card"
              activeKey={activeMainTab}
              onChange={setActiveMainTab}
              items={[
                { key: 'basic', label: '基础信息' },
                { key: 'contracts', label: '合同信息' },
                { key: 'payments', label: '回款与发票' },
                { key: 'team', label: '团队与工时' },
                { key: 'tasks', label: '任务管理' },
                { key: 'activity', label: '项目动态' },
              ]}
            />

            <div className="project-detail-360__side-content">
              {/* 基础信息 */}
              {activeMainTab === 'basic' && (
                <div className="project-basic-information">
                  <DescriptionsCard
                    columns={3}
                    items={[
                      { key: 'projectNo', label: '项目编号', value: project.projectNo },
                      { key: 'businessLine', label: '业务线', value: <StatusTag meta={resolveStatus(BUSINESS_LINE_META, project.businessLine)} /> },
                      { key: 'entity', label: '签约主体', value: project.entity },
                      { key: 'owner', label: '项目经理', value: project.owner || '待指派' },
                      { key: 'sales', label: '销售', value: project.salesUsers.join('、') || '-' },
                      { key: 'priority', label: '优先级', value: <StatusTag meta={resolveStatus(PROJECT_PRIORITY_META, project.priority)} /> },
                      { key: 'status', label: '状态', value: <StatusTag meta={resolveStatus(PROJECT_STATUS_META, project.status)} /> },
                      { key: 'progress', label: '项目进度', value: `${project.progress}%` },
                      { key: 'budgetHours', label: '预算工时', value: budgetHoursLabel },
                      { key: 'startDate', label: '开始日期', value: <DateText value={project.startDate} /> },
                      { key: 'expectedEndDate', label: '预计交付', value: <DateText value={project.expectedEndDate} /> },
                      { key: 'createdAt', label: '创建时间', value: <DateText value={project.createdAt} mode="datetime" /> },
                      { key: 'riskLevel', label: '风险等级', value: project.riskLevel ? <StatusTag meta={resolveStatus(PROJECT_RISK_LEVEL_META, project.riskLevel)} /> : '-' },
                      { key: 'blockers', label: '活跃阻塞', value: activeBlockers.length > 0 ? `${activeBlockers.length} 项` : '无' },
                      { key: 'sourceProjectId', label: '生产站 ID', value: project.sourceProjectId ?? '-' },
                      { key: 'customer', label: '客户', value: metrics.customerName || '-', long: true },
                      { key: 'latestProgress', label: '最新进展', value: project.latestProgress || '-', long: true },
                      { key: 'riskNote', label: '风险备注', value: project.riskNote || '-', long: true },
                      { key: 'remark', label: '项目备注', value: project.remark || '-', long: true },
                    ]}
                  />
                </div>
              )}

              {/* 合同信息 */}
              {activeMainTab === 'contracts' && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <SectionCard title="正式主合同">
                      {mainContract ? (
                        <LeadFinalContractPanel contract={mainContract} projectLayout projectFullInfo defaultCollapsed />
                      ) : (
                        <EmptyState description="暂无关联合同" />
                      )}
                    </SectionCard>
                  </div>
                  <SectionCard title={`补充合同（${supplementContracts.length}）`}>
                    {supplementContracts.length > 0 ? (
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {supplementContracts.map((contract) => (
                          <LeadFinalContractPanel key={contract.id} contract={contract} projectLayout defaultCollapsed />
                        ))}
                      </Space>
                    ) : (
                      <EmptyState description="暂无补充合同" />
                    )}
                  </SectionCard>
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
                  <div style={{ marginBottom: 16 }}>
                    <SectionCard title="团队成员与分工">
                      <DataTable rowKey="name" pagination={false} data={teamMembers} emptyDescription="暂无团队成员" columns={[
                        { title: '成员', dataIndex: 'name', render: (name: string) => <Button type="text" style={{ padding: 0 }} onClick={() => { setTeamDrawerMember(name); setTeamDailyPage(1); setTeamDailyKeyword(''); setTeamDailyRiskFilter('all'); }}>{name}</Button> },
                        { title: '岗位', dataIndex: 'position' },
                        { title: '累计工时', dataIndex: 'hours', render: (hours: number) => <Text style={{ fontWeight: 600 }}>{formatHours(hours)}</Text> },
                        { title: '操作', width: 100, fixed: 'right' as const, render: (_: unknown, member: { name: string }) => <Button type="text" size="small" onClick={() => { setTeamDrawerMember(member.name); setTeamDailyPage(1); setTeamDailyKeyword(''); setTeamDailyRiskFilter('all'); }}>查看日报</Button> },
                      ]} />
                    </SectionCard>
                  </div>

                  <SectionCard title="工时统计">
                    <MetricGrid
                      items={[
                        { key: 'budget', label: '预算工时', value: budgetHoursLabel },
                        { key: 'total', label: '已消耗', value: formatHours(metrics.totalHours) },
                        { key: 'usage', label: '消耗比例', value: hoursUsageLabel },
                      ]}
                    />
                    <div style={{ marginTop: 8 }}>
                      <ProgressBar percent={metrics.budgetHours > 0 ? Math.round(metrics.totalHours / metrics.budgetHours * 100) : 0} />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* 日报 */}
              {activeMainTab === 'daily' && (
                <DataTable
                  columns={[
                    { title: '日期', dataIndex: 'date', width: 110, render: (value: string) => <DateText value={value} /> },
                    { title: '成员', dataIndex: 'personName', width: 80 },
                    { title: '岗位', dataIndex: 'position', width: 120 },
                    { title: '工时(h)', dataIndex: 'hours', width: 70 },
                    { title: '工作内容', dataIndex: 'workContent', width: 280 },
                    { title: '风险反馈', dataIndex: 'riskFeedback', width: 160 },
                  ]}
                  data={dailyReports}
                  pagination={false}
                  rowKey="id"
                  emptyDescription="暂无日报记录"
                />
              )}

              {/* 任务管理 */}
              {activeMainTab === 'tasks' && (
                <div>
                  <Text style={{ display: 'block', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 12 }}>工作项概览</Text>
                  <MetricGrid
                    items={[
                      { key: 'requirements', label: '需求总数', value: Math.max(3, tasks.filter((task) => task.type === '产品设计').length), detail: '待处理 1 项 · 点击查看列表', tone: 'neutral', ariaLabel: '查看需求列表', onClick: () => navigate(`/projects/${project.id}/work-items?tab=requirements`) },
                      { key: 'tasks', label: '任务总数', value: tasks.length, detail: `待处理 ${tasks.filter((task) => task.status !== '已完成').length} 项 · 点击查看列表`, tone: 'warning', ariaLabel: '查看任务列表', onClick: () => navigate(`/projects/${project.id}/work-items?tab=tasks`) },
                      { key: 'bugs', label: '缺陷总数', value: bugs.length, detail: `待处理 ${bugs.filter((bug) => bug.status !== '已修复').length} 项 · 点击查看列表`, tone: 'danger', ariaLabel: '查看缺陷列表', onClick: () => navigate(`/projects/${project.id}/work-items?tab=bugs`) },
                    ]}
                  />
                </div>
              )}

              {/* 项目动态 */}
              {activeMainTab === 'activity' && (
                <ProjectActivityFeed
                  items={projectActivities}
                  milestones={milestones}
                  progress={project.progress}
                  onlyMajor={onlyMajor}
                  onOnlyMajorChange={(value) => updateQueryState('major', String(value))}
                  onViewSource={viewActivitySource}
                  onPrimaryAction={runActivityAction}
                />
              )}
            </div>
          </SectionCard>
        </SplitLayoutMain>

        {/* 右侧业务过程 (30%) */}
        <SplitLayoutAside className="project-detail-360__aside">
          <SectionCard>
            <SectionTabs
              variant="card"
              activeKey={activeSideTab}
              onChange={setActiveSideTab}
              items={[
                { key: 'follow', label: '跟进' },
                { key: 'meetings', label: '会议纪要' },
                { key: 'documents', label: '资料' },
                { key: 'demo', label: '演示' },
                { key: 'quotation', label: '报价' },
                { key: 'contract-records', label: '合同' },
                { key: 'presales', label: '售前' },
                { key: 'travel', label: '出差' },
                { key: 'reimbursement', label: '报销' },
              ]}
            />

            <div style={{ marginTop: 16 }}>
              {/* 跟进 */}
              {activeSideTab === 'follow' && (
                <ProcessPanelSection
                  actions={<Button type="primary" size="small" icon={<IconPlus />} onClick={() => openQuickFollow()}>写跟进</Button>}
                >
                  <Timeline>
                    {followUps.map((record) => (
                      <Timeline.Item key={record.id} dotColor="var(--color-border-2)">
                        <div className="project-detail-360__follow-record">
                          <div className="project-detail-360__follow-meta">
                            <StatusTag tone="info">{record.status}</StatusTag>
                            <Text type="secondary"><DateText value={record.createdAt} mode="datetime" /></Text>
                            <Text type="secondary">· {record.operator}</Text>
                          </div>
                          <div className="project-detail-360__follow-content">{record.content}</div>
                          {record.progress > 0 && (
                            <Text type="secondary">进度: {record.progress}%</Text>
                          )}
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                  {followUps.length === 0 && <EmptyState description="暂无跟进记录" />}
                </ProcessPanelSection>
              )}

              {/* 报价 */}
              {activeSideTab === 'quotation' && (
                <ProcessPanelSection
                  actions={(
                    <Button
                      type="primary"
                      size="small"
                      icon={<IconPlus />}
                      disabled={!leadId}
                      onClick={handleCreateQuote}
                    >
                      新建报价
                    </Button>
                  )}
                >
                  {!leadId ? (
                    <EmptyState description="当前项目未关联线索，暂无报价" />
                  ) : leadQuotes.length === 0 ? (
                    <EmptyState description="暂无报价记录" />
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
                          <div className="project-detail-360__side-divider" />
                          <Text type="secondary" className="project-detail-360__side-label">已作废</Text>
                          {voidedQuotes.map((q) => (
                            <ProcessRecordCard
                              key={q.id}
                              muted
                              title={q.basicInfo.projectName}
                              tags={<><StatusTag size="small" tone="info">{q.version}</StatusTag><StatusTag size="small" meta={QUOTE_STATUS[q.status]} /></>}
                              identifier={q.quoteNo}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </ProcessPanelSection>
              )}

              {/* 合同 */}
              {activeSideTab === 'contract-records' && (
                <ProcessPanelSection
                  actions={(
                    <Button
                      type="primary"
                      size="small"
                      icon={<IconPlus />}
                      onClick={() => navigate(`/contracts/new?projectId=${project.id}`)}
                    >
                      新建合同
                    </Button>
                  )}
                >
                  {linkedContracts.map((c) => (
                    <ProcessRecordCard
                      key={c.id}
                      title={c.current.contractName}
                      identifier={<>{c.contractNo} · {c.current.signingEntity}</>}
                      summary={<MoneyText value={c.current.totalAmount} />}
                      actions={<StatusTag meta={resolveStatus(CONTRACT_STATUS, c.status)} />}
                      onClick={() => handleViewContractDetail(c.id)}
                      ariaLabel={`查看合同 ${c.current.contractName}`}
                    />
                  ))}
                  {linkedContracts.length === 0 && <EmptyState description="暂无合同" />}
                </ProcessPanelSection>
              )}

              {/* 售前 */}
              {activeSideTab === 'presales' && (
                <ProjectPresalesHistoryPanel leadId={leadId} contract={mainContract} />
              )}

              {/* 会议纪要 */}
              {activeSideTab === 'meetings' && (
                <ProcessPanelSection
                  actions={<Button size="small" icon={<IconPlus />} onClick={() => { meetingForm.resetFields(); setMeetingModalVisible(true); }}>新增纪要</Button>}
                >
                  {meetings.map((m) => (
                    <ProcessRecordCard
                      key={m.id}
                      title={m.subject}
                      actions={<Text type="secondary"><DateText value={m.meetingTime} mode="datetime" /></Text>}
                      tags={<><StatusTag size="small" tone="info">内部: {m.employeeAttendees.join('、') || '-'}</StatusTag>{m.externalAttendees.length > 0 && <StatusTag size="small" tone="cyan">客户: {m.externalAttendees.join('、')}</StatusTag>}</>}
                      details={<>{m.minutes}<div className="project-detail-360__record-caption">记录人: {m.recorder}</div></>}
                    />
                  ))}
                  {meetings.length === 0 && <EmptyState description="暂无会议纪要" />}
                </ProcessPanelSection>
              )}

              {/* 演示 */}
              {activeSideTab === 'demo' && (
                <ProcessPanelSection
                  actions={<Button size="small" icon={<IconPlus />} onClick={() => { demoForm.resetFields(); setDemoModalVisible(true); }}>新增环境</Button>}
                >
                  {demoEnvs.map((demo) => (
                    <ProcessRecordCard
                      key={demo.id}
                      leading={<StatusTag tone="info">{demo.env}</StatusTag>}
                      title={demo.description}
                      identifier={demo.url}
                      actions={(
                        <Space>
                          <Button type="text" size="small" onClick={() => { navigator.clipboard.writeText(demo.url); Message.success('已复制链接'); }}>复制链接</Button>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDemoEnvs(demoEnvs.filter((d) => d.id !== demo.id)); Message.success('已删除'); }} />
                        </Space>
                      )}
                    />
                  ))}
                  {demoEnvs.length === 0 && <EmptyState description="暂无演示环境" />}
                </ProcessPanelSection>
              )}

              {/* 资料（确认书 + 项目文档） */}
              {activeSideTab === 'documents' && (
                <ProcessPanelSection actions={<Button size="small" icon={<IconUpload />}>上传资料</Button>}>
                  <div className="project-detail-360__record-group">
                    <Text type="secondary" className="project-detail-360__side-label">确认书</Text>
                    {confirmations.map((c) => (
                      <ProcessRecordCard
                        key={c.id}
                        leading={<IconFile />}
                        title={c.type}
                        identifier={<>{c.attachment || '无附件'} · <DateText value={c.signDate} placeholder="未签署" /></>}
                        actions={<StatusTag meta={resolveStatus(CONFIRMATION_STATUS_META, c.status)} />}
                      />
                    ))}
                    {confirmations.length === 0 && <EmptyState description="暂无确认书" />}
                  </div>
                  <div className="project-detail-360__record-group">
                    <Text type="secondary" className="project-detail-360__side-label">项目文档</Text>
                    {documents.map((doc) => (
                      <ProcessRecordCard
                        key={doc.id}
                        leading={<IconFile />}
                        title={doc.title}
                        identifier={<>{doc.owner} · <DateText value={doc.createdAt} /></>}
                        actions={(
                          <Space>
                            {doc.onlineUrl && <Button type="text" size="small" onClick={() => window.open(doc.onlineUrl, '_blank')}>查看</Button>}
                            <Button type="text" size="small">下载</Button>
                          </Space>
                        )}
                      />
                    ))}
                    {documents.length === 0 && <EmptyState description="暂无项目文档" />}
                  </div>
                </ProcessPanelSection>
              )}

              {/* 出差 */}
              {activeSideTab === 'travel' && (
                <ProcessPanelSection
                  actions={<Button size="small" icon={<IconPlus />} onClick={() => { travelForm.resetFields(); setTravelModalVisible(true); }}>新增出差</Button>}
                >
                  {travels.map((travel) => (
                    <ProcessRecordCard
                      key={travel.id}
                      title={`${travel.destination} - ${travel.purpose}`}
                      identifier={<>{travel.applicant} · <DateText value={travel.startDate} /> ~ <DateText value={travel.endDate} /></>}
                      summary={<MoneyText value={travel.amount} />}
                      actions={<><StatusTag tone="success">{travel.status}</StatusTag><Text type="secondary">审批号: {travel.approvalNo}</Text></>}
                    />
                  ))}
                  {travels.length === 0 && <EmptyState description="暂无出差记录" />}
                </ProcessPanelSection>
              )}

              {/* 报销 */}
              {activeSideTab === 'reimbursement' && (
                <ProcessPanelSection
                  actions={<Button size="small" icon={<IconPlus />} onClick={() => { reimbursementForm.resetFields(); setReimbursementModalVisible(true); }}>新增报销</Button>}
                >
                  {reimbursements.map((rb) => (
                    <ProcessRecordCard
                      key={rb.id}
                      title={`${rb.type} - ${rb.description}`}
                      identifier={rb.applicant}
                      summary={<MoneyText value={rb.amount} />}
                      actions={<><StatusTag tone="success">{rb.status}</StatusTag><Text type="secondary">审批号: {rb.approvalNo}</Text></>}
                    />
                  ))}
                  {reimbursements.length === 0 && <EmptyState description="暂无报销记录" />}
                </ProcessPanelSection>
              )}
            </div>
          </SectionCard>
        </SplitLayoutAside>
      </SplitLayout>

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
                description: values.description ?? '',
                logs: [],
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
          <FormGrid columns={2}>
            <Form.Item label="类型" field="type"><Select placeholder="请选择"><Select.Option value="开发">开发</Select.Option><Select.Option value="UI 设计">UI 设计</Select.Option><Select.Option value="产品设计">产品设计</Select.Option><Select.Option value="测试">测试</Select.Option><Select.Option value="账号注册">账号注册</Select.Option><Select.Option value="bug">bug</Select.Option></Select></Form.Item>
            <Form.Item label="负责人" field="assignee" rules={[{ required: true }]}><Select placeholder="请选择">{employees.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item>
            <Form.Item label="状态" field="status" initialValue="未开始"><Select><Select.Option value="未开始">未开始</Select.Option><Select.Option value="进行中">进行中</Select.Option><Select.Option value="已完成">已完成</Select.Option></Select></Form.Item>
            <Form.Item label="优先级" field="priority" initialValue="中"><Select><Select.Option value="高">高</Select.Option><Select.Option value="中">中</Select.Option><Select.Option value="低">低</Select.Option></Select></Form.Item>
            <Form.Item label="截止日期" field="plannedEndDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="进度(%)" field="progress"><InputNumber min={0} max={100} placeholder="0" style={{ width: '100%' }} /></Form.Item>
          </FormGrid>
        </Form>
      </Modal>

      {/* 登记项目跟进 Modal */}
      <Modal
        title="登记跟进"
        visible={followModalVisible}
        onOk={() => {
          followForm.validate().then((values) => {
            const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
            const operator = values.operator ?? '李四';
            setFollowUps([{
              id: `follow-${Date.now()}`,
              projectId: id ?? '',
              status: project.status,
              progress: values.progress ?? project.progress,
              content: values.content,
              attachments: [],
              operator,
              createdAt,
            }, ...followUps]);
            if (values.milestoneTag) {
              setProjectOwnedEvents((current) => [{
                id: `activity-follow-${Date.now()}`,
                projectId: id ?? '',
                type: 'followup',
                title: values.milestoneTag,
                content: values.content,
                operator,
                createdAt,
                isMajor: true,
                milestoneTag: values.milestoneTag,
                severity: 'success',
              }, ...current]);
            }
            Message.success('跟进记录已保存');
            setFollowModalVisible(false);
          });
        }}
        onCancel={() => setFollowModalVisible(false)}
        style={{ width: 560 }}
      >
        <Form form={followForm} layout="vertical">
          <FormGrid columns={2}>
            <Form.Item label="操作人" field="operator" initialValue={project.owner || '李四'}><Select>{employees.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item>
            <Form.Item label="当前进度(%)" field="progress" initialValue={project.progress}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          </FormGrid>
          <Form.Item label="跟进内容" field="content" rules={[{ required: true }]}><Input.TextArea rows={4} maxLength={1000} showWordLimit placeholder="请记录跟进内容" /></Form.Item>
          <Form.Item label="关键节点（选填）" field="milestoneTag" extra="选择后，该跟进会同步进入项目动态与大事记。">
            <Select allowClear placeholder="普通跟进无需选择">
              {[
                '原型与交互确认书盖章',
                'UI设计确认书盖章',
                '需求增项确认单签署',
                '阶段验收单签署',
                '项目终验报告签署',
                '关键版本交付上线',
              ].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="附件">
            <UploadPanel accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" multiple hint="点击或拖拽上传" />
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
          <FormGrid columns={2}>
            <Form.Item label="会议时间" field="meetingTime"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="记录人" field="recorder" initialValue={project.owner || '李四'}><Select>{employees.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item>
          </FormGrid>
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
          <FormGrid columns={2}>
            <Form.Item label="目的地" field="destination" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item>
            <Form.Item label="出差事由" field="purpose" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item>
            <Form.Item label="开始日期" field="startDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="结束日期" field="endDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          </FormGrid>
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
        contracts={linkedContracts.filter((contract) => contract.status !== 'voided')}
        collections={visibleProjectCollections}
        editingCollectionId={editingCollectionId}
        onOk={saveCollection}
        onCancel={() => setCollectionModalVisible(false)}
      />

      <Drawer title={`${teamDrawerMember || ''} · 项目日报`} visible={Boolean(teamDrawerMember)} onCancel={() => setTeamDrawerMember(undefined)} footer={null} width={720}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <MetricGrid
            items={[
              { key: 'hours', label: '累计工时', value: formatHours(selectedMemberReports.reduce((sum, item) => sum + item.hours, 0)) },
              { key: 'count', label: '日报数量', value: selectedMemberReports.length },
              { key: 'risk', label: '风险记录', value: selectedMemberReports.filter((item) => item.riskFeedback && item.riskFeedback !== '无').length },
            ]}
          />
          <DataTable
            rowKey="id"
            pagination={false}
            data={selectedMemberReports.slice((teamDailyPage - 1) * 5, teamDailyPage * 5)}
            toolbar={(
              <Space style={{ width: '100%' }}>
                <Input.Search allowClear placeholder="搜索工作内容或风险反馈" value={teamDailyKeyword} onChange={(value) => { setTeamDailyKeyword(value); setTeamDailyPage(1); }} style={{ flex: 1 }} />
                <Select value={teamDailyRiskFilter} onChange={(value) => { setTeamDailyRiskFilter(value); setTeamDailyPage(1); }} style={{ width: 150 }}><Select.Option value="all">风险（全部）</Select.Option><Select.Option value="risk">仅有风险</Select.Option></Select>
              </Space>
            )}
            emptyDescription="暂无日报记录"
            columns={[
              { title: '日期', dataIndex: 'date', width: 110, render: (value: string) => <DateText value={value} /> }, { title: '工时', dataIndex: 'hours', width: 80, render: (value: number) => `${value}h` },
              { title: '工作内容', dataIndex: 'workContent' }, { title: '风险反馈', dataIndex: 'riskFeedback', width: 180 },
            ]}
          />
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
