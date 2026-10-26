import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router';
import {
  Card,
  Button,
  Space,
  Tag,
  Tabs,
  Typography,
  Grid,
  Steps,
  Descriptions,
  Tooltip,
  Message,
  Divider,
  Drawer,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Timeline,
  Progress,
  Upload,
  Radio,
} from '@arco-design/web-react';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import {
  IconEdit,
  IconPlus,
  IconDelete,
  IconStop,
  IconSwap,
  IconReply,
  IconUserAdd,
  IconCopy,
  IconPhone,
  IconFile,
  IconUpload,
  IconDownload,
  IconFullscreen,
  IconFullscreenExit,
  IconArrowLeft,
  IconArrowRight,
} from '@arco-design/web-react/icon';
import type { LeadDetailInfo, ClueType, FollowUpRecord } from './types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_LIST,
  INTENTION_LEVEL_LIST,
  CUSTOMER_LEVEL_LIST,
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  COMPANY_ENTITY_LIST,
} from './types';
import { channelLabel } from '../lead-dispatch/channelDictionary';
import { BUSINESS_LINE_LABEL, type LeadBusinessLine } from '../lead-dispatch/types';
import { leadDispatchView } from '../lead-dispatch/kpiCalc';
import { getLeadDetailProfile } from './leadDetailProfiles';
import {
  applyLeadEdit,
  findLeadByRouteId,
  mergeLeadDetail,
  type LeadEditValues,
} from './leadDetailEdit';
import { initialEmployees } from '../../support/hr/employee/mockData';
import {
  leadAttachmentsToUploadItems,
  uploadItemsToLeadAttachments,
} from './leadAttachments';
import { LeadAttachmentPanel } from './components/LeadAttachmentPanel';
import { LeadFollowUpModal, type LeadFollowUpFormValues } from './components/LeadFollowUpModal';
import { LeadFinalContractPanel } from './components/LeadFinalContractPanel';
import { LeadStagePopover, type LeadStageSopInfo } from './components/LeadStagePopover';
import { SelectQuoteModeModal } from './components/SelectQuoteModeModal';
import { WeChatIcon } from '@/design-system';
import './components/NewLeadModal.css';
import { useLeads } from '../../../leads/LeadContext';
import { CURRENT_LOGIN_USER } from '../../../currentUser';
import { buildLeadContextFromDetail } from '../contracts/leadContextMock';
import { useContracts } from '../contracts/ContractsContext';
import { useTodos } from '../../../todos/TodoContext';
import { useCustomers } from '../customers/CustomerContext';
import { buildCustomerSnapshot } from '../customers/customerModel';
import type { Contract } from '../contracts/types';
import { computePlanStatusRows, effectiveAmount } from '../contracts/paymentUtils';
import { useCollections } from '../../../collections/CollectionContext';
import {
  allocateCollectionAmount,
  collectionsForProject,
  getCollectionPeriods,
  sumReceived,
  type CollectionLedgerEntry,
  type CollectionPeriod,
} from '../../../../services/collectionMutations';
import { useQuotation } from '../quotation/QuotationContext';
import { formatMoney as money } from '../../../utils/money';
import { QuotationWorkbench } from '../quotation/QuotationWorkbench';
import { QuoteCard } from '../quotation/QuoteCard';
import { QUOTE_STATUS_LABELS, type QuoteCustomerFeedback } from '../quotation/types';
import {
  LeadQuotationManager,
  FEEDBACK_DISPOSITION_MAP,
} from './components/LeadQuotationManager';
import {
  PageShell,
  MetricGrid,
  ProcessOverview,
  ProcessRecordCard,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
} from '@/design-system';
import {
  CollectionRecordModal,
  ContractPaymentInvoicePanel,
  type PaymentInvoiceRecord,
} from '../contracts/components/ContractPaymentInvoicePanel';

const { Text } = Typography;
const TabPane = Tabs.TabPane;
const Step = Steps.Step;
const DEFAULT_LEAD_TAGS = ['APP', '小程序', 'B端', 'C端', '网站', '数据接口', '其他'];
type LeadOperation = 'transfer' | 'return' | 'trash';

function leadListPath(from: string) {
  const pathBySource: Record<string, string> = {
    public: '/leads/public',
    all: '/leads/all',
    closed: '/leads/closed',
    trash: '/leads/trash',
    my: '/leads/my',
  };
  return pathBySource[from] ?? '/leads/my';
}

// 6 步生命周期
const LIFECYCLE_STEPS = [
  { key: 'intake', label: '接入录入', statuses: ['未联系'] },
  { key: 'contact', label: '初步建联', statuses: ['未接通', '初步沟通'] },
  { key: 'research', label: '需求调研', statuses: ['需求调研'] },
  { key: 'contract', label: '主合同签署', statuses: ['方案报价', '合同洽谈'] },
  { key: 'delivery', label: '项目交付中', statuses: ['已签单'] },
  { key: 'closeout', label: '终验结项', statuses: ['已签单'] },
];

function getLifecycleIndex(status: string): number {
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.statuses.includes(status));
  return idx >= 0 ? idx : 0;
}

const STAGE_SOP_MAP: Record<number, LeadStageSopInfo> = {
  0: {
    key: 'intake',
    label: '接入录入',
    target: '核对客户主体与联系方式，完成初始清洗分配',
    checklist: [
      { id: 'c-0-1', label: '核实有效电话与微信', targetTab: 'basic' },
      { id: 'c-0-2', label: '确认业务线与推广渠道', targetTab: 'basic' },
      { id: 'c-0-3', label: '明确线索责任人与对接主体', targetTab: 'basic' },
    ],
    suggestedActionLabel: '核对客户档案',
    suggestedActionKey: 'edit',
    nextStatuses: ['未接通', '初步沟通'],
  },
  1: {
    key: 'contact',
    label: '初步建联',
    target: '24小时内首联，摸清客户行业背景与核心痛点',
    checklist: [
      { id: 'c-1-1', label: '电话初联或微信建群沟通', actionKey: 'quick_follow' },
      { id: 'c-1-2', label: '摸清客户行业与业务场景痛点', actionKey: 'quick_follow' },
      { id: 'c-1-3', label: '明确客户预算范围与意向等级', targetTab: 'basic' },
    ],
    suggestedActionLabel: '快速记跟进',
    suggestedActionKey: 'quick_follow',
    nextStatuses: ['需求调研'],
  },
  2: {
    key: 'research',
    label: '需求调研',
    target: '梳理业务功能边界，输出技术清单与原型示意',
    checklist: [
      { id: 'c-2-1', label: '收集整理客户功能清单与业务流', targetTab: 'basic' },
      { id: 'c-2-2', label: '出具或关联产品原型示意', targetTab: 'assets' },
      { id: 'c-2-3', label: '确认客户期望交付工期与预算上线节点', targetTab: 'quotation' },
    ],
    suggestedActionLabel: '补充需求描述',
    suggestedActionKey: 'edit',
    nextStatuses: ['方案报价'],
  },
  3: {
    key: 'contract',
    label: '主合同签署',
    target: '完成方案报价审批，锁定商务条款，推进合同盖章回执',
    checklist: [
      { id: 'c-3-1', label: '生成正式报价方案并完成内部审批', targetTab: 'quotation' },
      { id: 'c-3-2', label: '发起主合同商务审批与评审流程', targetTab: 'contracts' },
      { id: 'c-3-3', label: '完成双方签署盖章与合同归档', targetTab: 'contracts' },
    ],
    suggestedActionLabel: '新建报价',
    suggestedActionKey: 'quote',
    nextStatuses: ['已签单'],
  },
  4: {
    key: 'delivery',
    label: '项目交付中',
    target: '项目立项启动，推进里程碑交付与按期验收',
    checklist: [
      { id: 'c-4-1', label: '分配项目经理PM并立项启动', targetTab: 'delivery' },
      { id: 'c-4-2', label: '关键里程碑与核心功能阶段交付确认', targetTab: 'delivery' },
      { id: 'c-4-3', label: '按合同节点催收阶段款项并开具发票', targetTab: 'contracts' },
    ],
    suggestedActionLabel: '查看交付看板',
    suggestedActionKey: 'delivery',
    nextStatuses: ['已签单'],
  },
  5: {
    key: 'closeout',
    label: '终验结项',
    target: '完成客户最终验收盖章，核销尾款，沉淀交付案例',
    checklist: [
      { id: 'c-5-1', label: '客户签署终验证书或验收确认单', targetTab: 'delivery' },
      { id: 'c-5-2', label: '核销项目尾款并出具全额发票', targetTab: 'contracts' },
      { id: 'c-5-3', label: '售后服务交接与标杆案例沉淀', targetTab: 'assets' },
    ],
    suggestedActionLabel: '查看合同与回款',
    suggestedActionKey: 'contracts',
    nextStatuses: [],
  },
};

function formDateTime(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) {
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
  if (typeof (value as { format?: unknown }).format === 'function') {
    return (value as { format: (pattern: string) => string }).format('YYYY-MM-DD HH:mm');
  }
  return undefined;
}

interface LeadDetail360Props {
  /** 覆盖路由参数：审批中心等场景在弹窗内嵌渲染，没有 /leads/:id 路由。 */
  leadId?: string;
  /** 初始侧栏页签（如 'quotation'），同样服务于内嵌场景。 */
  initialSideTab?: string;
}

export function LeadDetail360({ leadId, initialSideTab }: LeadDetail360Props = {}) {
  const { id: routeId } = useParams();
  const id = leadId ?? routeId;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = (
    (location.state as { from?: string } | null)?.from
    || searchParams.get('from')
    || 'my'
  );

  const resolveMainTab = useCallback((tabOrSide?: string | null): string => {
    if (!tabOrSide) return 'basic';
    if (tabOrSide === 'contract-records' || tabOrSide === 'contracts' || tabOrSide === 'contracts-history') {
      return 'contracts';
    }
    if (tabOrSide === 'quotation') {
      return 'quotation';
    }
    if (tabOrSide === 'travel' || tabOrSide === 'reimbursement') {
      return 'travel';
    }
    if (tabOrSide === 'delivery') {
      return 'delivery';
    }
    if (tabOrSide === 'assets' || tabOrSide === 'demo' || tabOrSide === 'documents') {
      return 'assets';
    }
    if (tabOrSide === 'basic') {
      return 'basic';
    }
    return tabOrSide;
  }, []);

  const [activeMainTabState, setActiveMainTabState] = useState<string>(() => {
    const fromSearch = searchParams.get('tab') || searchParams.get('main');
    return resolveMainTab(fromSearch);
  });
  const [activeSideTab, setActiveSideTab] = useState('follow');

  const activeMainTab = resolveMainTab(searchParams.get('tab') || searchParams.get('main') || activeMainTabState);

  const setActiveMainTab = (tab: string) => {
    const resolved = resolveMainTab(tab);
    setActiveMainTabState(resolved);
    const next = new URLSearchParams(searchParams);
    if (resolved === 'basic') {
      next.delete('tab');
      next.delete('main');
    } else {
      next.set('tab', resolved);
    }
    setSearchParams(next, { replace: true });
  };

  // 阶段推进状态
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [advanceTargetStatus, setAdvanceTargetStatus] = useState<string>('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [advanceNextFollowTime, setAdvanceNextFollowTime] = useState<string>('');
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // 右侧快捷写跟进状态
  const [quickFollowMethod, setQuickFollowMethod] = useState<'电话' | '微信' | '拜访' | '会议'>('电话');
  const [quickFollowContent, setQuickFollowContent] = useState('');
  const [quickFollowNextTime, setQuickFollowNextTime] = useState<string>('');
  const [quickFollowSubmitting, setQuickFollowSubmitting] = useState(false);
  const [timelineFilterMethod, setTimelineFilterMethod] = useState<string>('all');
  const [followVisible, setFollowVisible] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [editLeadVisible, setEditLeadVisible] = useState(false);
  const [editLeadSubmitting, setEditLeadSubmitting] = useState(false);
  const [editLeadFullscreen, setEditLeadFullscreen] = useState(false);
  const [editLeadTags, setEditLeadTags] = useState<string[]>([]);
  const [editLeadAvailableTags, setEditLeadAvailableTags] = useState(DEFAULT_LEAD_TAGS);
  const [addingEditLeadTag, setAddingEditLeadTag] = useState(false);
  const [newEditLeadTag, setNewEditLeadTag] = useState('');
  const [editLeadUploadItems, setEditLeadUploadItems] = useState<UploadItem[]>([]);
  const [editLeadForm] = Form.useForm();
  const [leadOperation, setLeadOperation] = useState<LeadOperation | null>(null);
  const [leadOperationSubmitting, setLeadOperationSubmitting] = useState(false);
  const [leadOperationForm] = Form.useForm();
  const [leadOverride, setLeadOverride] = useState<Partial<LeadDetailInfo> | null>(null);
  const [serviceLeadDetail, setServiceLeadDetail] = useState<LeadDetailInfo | null>(null);
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [demoForm] = Form.useForm();
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docForm] = Form.useForm();
  const [docUploadItems, setDocUploadItems] = useState<UploadItem[]>([]);
  const [travelModalVisible, setTravelModalVisible] = useState(false);
  const [travelForm] = Form.useForm();
  const [reimbursementModalVisible, setReimbursementModalVisible] = useState(false);
  const [reimbursementForm] = Form.useForm();
  const [collectionOverrides, setCollectionOverrides] = useState<Record<string, CollectionLedgerEntry>>({});
  const [addedCollections, setAddedCollections] = useState<CollectionLedgerEntry[]>([]);
  const [deletedCollectionIds, setDeletedCollectionIds] = useState<string[]>([]);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string>();
  const [collectionForm] = Form.useForm();
  const [invoiceRecords, setInvoiceRecords] = useState<PaymentInvoiceRecord[]>([]);
  const { createQuote, quotes, updateQuote, createNewVersion } = useQuotation();
  const { customers } = useCustomers();
  const { contracts: allContracts } = useContracts();
  const { completeTodosBySource, upsertActiveTodo } = useTodos();
  const { collections } = useCollections();
  const {
    leads,
    getDetailInfo,
    getFollowUps,
    addFollowUp,
    updateLead,
    assignLead,
    returnLead,
    markTrash,
    softDelete,
  } = useLeads();
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [quotationDrawerVisible, setQuotationDrawerVisible] = useState(false);
  const [quotationDrawerQuoteId, setQuotationDrawerQuoteId] = useState<string | null>(null);
  const [quoteModeVisible, setQuoteModeVisible] = useState(false);
  const [quoteFlowMode, setQuoteFlowMode] = useState<'online' | 'file'>('online');
  const [travelDetailId, setTravelDetailId] = useState<string | null>(null);
  const [reimbursementDetailId, setReimbursementDetailId] = useState<string | null>(null);
  const employeeOptions = useMemo(
    () => initialEmployees
      .filter((employee) => employee.employmentStatus !== '已离职')
      .map((employee) => ({
        value: employee.name,
        label: `${employee.name} · ${employee.department}`,
      })),
    [],
  );

  // Mock 数据
  const [demos, setDemos] = useState([
    { id: 'dm1', type: '原型演示', url: 'https://demo-prototype.example.com', description: 'Axure 原型演示' },
    { id: 'dm2', type: '测试环境', url: 'https://test-app.example.com', description: '内部测试环境' },
  ]);

  const [documents, setDocuments] = useState([
    { id: 'doc1', name: '需求确认书V1.pdf', type: '确认书', source: '客户签署', uploader: '阎杨', createdAt: '2026-08-15' },
    { id: 'doc2', name: '报价单QT-2026-0035.xlsx', type: '报价单', source: '报价模块', uploader: '阎杨', createdAt: '2026-08-10' },
    { id: 'doc3', name: '原型确认书.pdf', type: '确认书', source: '客户签署', uploader: '李四', createdAt: '2026-08-18' },
  ]);

  const [travels, setTravels] = useState([
    { id: 'tr1', destination: '长沙', purpose: '面单接口调研', applicant: '阎杨', startDate: '2026-08-19', endDate: '2026-08-20', approvalNo: 'SP-20260819-0042', amount: 850, status: '已审批' },
  ]);

  const [reimbursements, setReimbursements] = useState([
    { id: 'rb1', type: '商务招待', description: '商务工作餐', applicant: '阎杨', amount: 280, approvalNo: 'BX-20260819-0018', status: '已审批' },
  ]);

  // 列表路由使用 key，详情档案与数据服务使用真实 id，先统一解析目标线索。
  const dispatchLead = useMemo(() => findLeadByRouteId(leads, id), [leads, id]);
  const profileLeadId = dispatchLead?.id ?? id;
  const profile = useMemo(() => getLeadDetailProfile(profileLeadId, from), [profileLeadId, from]);
  const { quotationHistory, useLiveContracts, demoContracts } = profile ?? {
    quotationHistory: [],
    useLiveContracts: true,
    demoContracts: [],
  };

  const lead = useMemo(
    () => mergeLeadDetail(serviceLeadDetail ?? profile?.leadInfo, dispatchLead, leadOverride),
    [serviceLeadDetail, profile?.leadInfo, dispatchLead, leadOverride],
  );
  const serviceLeadId = dispatchLead?.id ?? id;
  const dispatchView = useMemo(() => dispatchLead ? leadDispatchView(dispatchLead, new Date()) : null, [dispatchLead]);

  const filteredTimeline = useMemo(() => {
    const all = followUps.filter((r) => r.leadId === id || r.leadId === profileLeadId || r.leadId === serviceLeadId);
    const matched = timelineFilterMethod === 'all' ? all : all.filter((r) => r.method === timelineFilterMethod);
    return [...matched].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA;
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [followUps, id, profileLeadId, serviceLeadId, timelineFilterMethod]);

  // 跨路由 key 与业务 id 多向兼容匹配当前线索下的全部方案
  const matchedLeadQuotes = useMemo(() => {
    const candidateIds = new Set<string>();
    if (id) {
      candidateIds.add(id);
      const clean = id.replace(/^(lead-|l-)/i, '');
      candidateIds.add(clean);
      candidateIds.add(`lead-${clean}`);
      candidateIds.add(`l-${clean}`);
      candidateIds.add(`L-${clean}`);
    }
    if (profileLeadId) candidateIds.add(profileLeadId);
    if (serviceLeadId) candidateIds.add(serviceLeadId);
    if (dispatchLead?.id) candidateIds.add(dispatchLead.id);
    if (dispatchLead?.key) candidateIds.add(dispatchLead.key);

    return quotes.filter((q) => candidateIds.has(q.leadId));
  }, [quotes, id, profileLeadId, serviceLeadId, dispatchLead]);

  useEffect(() => {
    setLeadOverride(null);
    setEditLeadVisible(false);
    setLeadOperation(null);
    setCollectionOverrides({});
    setAddedCollections([]);
    setDeletedCollectionIds([]);
    setInvoiceRecords([]);
    setCollectionModalVisible(false);
    setDocModalVisible(false);
    setDocUploadItems([]);
  }, [id, from]);

  useEffect(() => {
    let cancelled = false;
    setServiceLeadDetail(null);
    if (profileLeadId) {
      getDetailInfo(profileLeadId).then((detail) => {
        if (!cancelled) setServiceLeadDetail(detail);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [profileLeadId, getDetailInfo]);

  const relatedContracts = useMemo<Contract[]>(() => {
    if (useLiveContracts) {
      return allContracts.filter((contract) => contract.leadId === id || contract.leadId === profileLeadId);
    }
    return demoContracts
      .map((demoContract) => allContracts.find((contract) => contract.id === demoContract.id))
      .filter((contract): contract is Contract => Boolean(contract));
  }, [allContracts, demoContracts, id, profileLeadId, useLiveContracts]);

  const mainContract = useMemo(
    () => relatedContracts.find((contract) => contract.kind !== 'supplement') ?? relatedContracts[0],
    [relatedContracts],
  );
  const supplementContracts = useMemo(
    () => relatedContracts.filter((contract) => contract.kind === 'supplement' && contract.parentContractId === mainContract?.id),
    [relatedContracts, mainContract?.id],
  );
  const effectiveContractIds = useMemo(
    () => new Set([
      mainContract?.id,
      ...supplementContracts.filter((contract) => contract.status === 'archived').map((contract) => contract.id),
    ].filter(Boolean)),
    [mainContract?.id, supplementContracts],
  );
  const leadCollections = useMemo(
    () => collectionsForProject(collections, {
      projectId: mainContract?.projectId,
      contractIds: relatedContracts.map((contract) => contract.id),
    }).filter((record) => effectiveContractIds.has(record.contractId)),
    [collections, effectiveContractIds, mainContract?.projectId, relatedContracts],
  );
  const visibleLeadCollections = useMemo(() => [
    ...addedCollections,
    ...leadCollections
      .filter((record) => !deletedCollectionIds.includes(record.id))
      .map((record) => collectionOverrides[record.id] || record),
  ], [addedCollections, collectionOverrides, deletedCollectionIds, leadCollections]);
  const paymentContractAmount = mainContract ? effectiveAmount(mainContract, supplementContracts) : 0;
  const paymentReceivedAmount = sumReceived(visibleLeadCollections);

  // 跟进记录：统一走 LeadContext（mock/http 同构），detail 加载后异步拉取
  useEffect(() => {
    let cancelled = false;
    if (serviceLeadId) {
      getFollowUps(serviceLeadId).then((fs) => {
        if (!cancelled) setFollowUps(fs);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [serviceLeadId, getFollowUps]);

  useEffect(() => {
    if (initialSideTab) {
      setActiveSideTab(initialSideTab);
      setActiveMainTab(resolveMainTab(initialSideTab));
      return;
    }
    const state = location.state as { activeMainTab?: string; activeSideTab?: string } | null;
    if (state?.activeSideTab) {
      setActiveSideTab(state.activeSideTab);
      setActiveMainTab(resolveMainTab(state.activeSideTab));
      return;
    }
    if (state?.activeMainTab) {
      setActiveMainTab(resolveMainTab(state.activeMainTab));
    }
  }, [initialSideTab, location.state, resolveMainTab]);

  if (!lead) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Text type="secondary">线索不存在</Text>
          <div style={{ marginTop: 16 }}>
            <Button onClick={() => navigate('/leads/my')}>返回列表</Button>
          </div>
        </div>
      </Card>
    );
  }

  const lifecycleIdx = getLifecycleIndex(lead.status);

  const openCollectionEditor = (record?: CollectionLedgerEntry) => {
    setEditingCollectionId(record?.id);
    collectionForm.resetFields();
    collectionForm.setFieldsValue(record ? {
      ...record,
      periods: getCollectionPeriods(record).map(String),
    } : {
      date: '2026-08-29',
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
      const contract = relatedContracts.find((item) => item.id === values.contractId) ?? mainContract;
      if (!contract) {
        Message.warning('当前线索暂无有效主合同');
        return;
      }
      const periods = ((values.periods ?? []) as string[]).map<CollectionPeriod>((value) => value === 'other' ? 'other' : Number(value));
      const otherCollections = visibleLeadCollections.filter((item) => item.contractId === contract.id && item.id !== editingCollectionId);
      const allocatedRows = computePlanStatusRows({ ...contract, collectionRecords: otherCollections });
      const periodAllocations = allocateCollectionAmount({
        periods,
        amount: Number(values.amount),
        plans: contract.current.paymentPlans,
        allocatedByPeriod: new Map(allocatedRows.map((row) => [row.plan.period, row.allocated])),
      });
      const record: CollectionLedgerEntry = {
        id: editingCollectionId || `lead-col-${Date.now()}`,
        contractId: contract.id,
        projectId: contract.projectId,
        period: periods[0],
        periods,
        periodAllocations,
        amount: Number(values.amount),
        date: values.date,
        method: values.method,
        note: values.note || '',
      };
      if (editingCollectionId) {
        if (addedCollections.some((item) => item.id === editingCollectionId)) {
          setAddedCollections((items) => items.map((item) => item.id === editingCollectionId ? record : item));
        } else {
          setCollectionOverrides((current) => ({ ...current, [editingCollectionId]: record }));
        }
      } else {
        setAddedCollections((current) => [record, ...current]);
      }
      setCollectionModalVisible(false);
      Message.success(editingCollectionId ? '实收记录已更新' : '实收记录已新增');
    });
  };

  const issueInvoice = (collection: CollectionLedgerEntry) => {
    const serial = invoiceRecords.length + 1;
    setInvoiceRecords((current) => [{
      id: `lead-invoice-${Date.now()}`,
      collectionId: collection.id,
      invoiceNo: `INV-202608-${String(serial).padStart(3, '0')}`,
      amount: collection.amount,
      issuedAt: '2026-08-29',
      status: 'valid',
    }, ...current]);
    Message.success('开票记录已生成');
  };

  const redInvoice = (invoice: PaymentInvoiceRecord) => {
    setInvoiceRecords((current) => [{
      id: `lead-invoice-red-${Date.now()}`,
      collectionId: invoice.collectionId,
      invoiceNo: `RED-${invoice.invoiceNo}`,
      amount: -invoice.amount,
      issuedAt: '2026-08-29',
      status: 'red',
      originalInvoiceId: invoice.id,
    }, ...current]);
    Message.success('红冲记录已生成并保留原发票');
  };

  const saveDocument = () => {
    docForm.validate().then((values) => {
      const file = docUploadItems[0];
      if (!file) {
        Message.warning('请选择要上传的资料文件');
        return;
      }
      setDocuments((current) => [{
        id: `doc-${Date.now()}`,
        name: file.name || '未命名资料',
        type: values.type,
        source: values.source,
        uploader: CURRENT_LOGIN_USER.name,
        createdAt: '2026-08-29',
      }, ...current]);
      setDocModalVisible(false);
      setDocUploadItems([]);
      docForm.resetFields();
      Message.success('资料已上传');
    });
  };

  const openEditLead = () => {
    const tags = lead.tags ?? [];
    editLeadForm.setFieldsValue({
      name: lead.name,
      contact: lead.contact,
      phone: lead.phone,
      wechat: lead.wechat,
      source: lead.source,
      keyword: lead.keyword,
      status: lead.status,
      level: lead.level,
      customerLevel: lead.customerLevel,
      tags,
      entity: lead.entity,
      owner: lead.owner,
      optimizer: lead.optimizer,
      assistant: lead.assistant,
      presalesGroupName: lead.presalesGroupName,
      requirement: lead.requirement || lead.initialRequirement,
      customerNote: lead.customerNote,
    });
    setEditLeadTags(tags);
    setEditLeadAvailableTags(Array.from(new Set([...DEFAULT_LEAD_TAGS, ...tags])));
    setAddingEditLeadTag(false);
    setNewEditLeadTag('');
    setEditLeadUploadItems(leadAttachmentsToUploadItems(lead.attachments ?? []));
    setEditLeadFullscreen(false);
    setEditLeadVisible(true);
  };

  const closeEditLead = () => {
    setEditLeadVisible(false);
    setEditLeadFullscreen(false);
    setEditLeadTags([]);
    setAddingEditLeadTag(false);
    setNewEditLeadTag('');
    setEditLeadUploadItems([]);
    editLeadForm.resetFields();
  };

  const toggleEditLeadTag = (tag: string) => {
    setEditLeadTags((current) => {
      const next = current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag];
      editLeadForm.setFieldValue('tags', next);
      return next;
    });
  };

  const confirmNewEditLeadTag = () => {
    const normalized = newEditLeadTag.trim();
    if (!normalized) return;
    if (!editLeadAvailableTags.includes(normalized)) {
      setEditLeadAvailableTags((current) => [...current, normalized]);
    }
    if (!editLeadTags.includes(normalized)) {
      const next = [...editLeadTags, normalized];
      setEditLeadTags(next);
      editLeadForm.setFieldValue('tags', next);
    }
    setNewEditLeadTag('');
    setAddingEditLeadTag(false);
  };

  const saveEditLead = async () => {
    try {
      const values = await editLeadForm.validate() as LeadEditValues;
      const phone = String(values.phone ?? '').trim();
      const wechat = String(values.wechat ?? '').trim();
      if (!phone && !wechat) {
        editLeadForm.setFields({
          phone: { value: values.phone, error: { message: '联系电话和联系微信至少填写一项' } },
          wechat: { value: values.wechat, error: { message: '联系电话和联系微信至少填写一项' } },
        });
        return;
      }

      const normalized: LeadEditValues = {
        ...values,
        name: String(values.name ?? '').trim(),
        contact: String(values.contact ?? '').trim(),
        phone,
        wechat,
        source: String(values.source ?? ''),
        keyword: String(values.keyword ?? '').trim(),
        status: String(values.status ?? ''),
        level: String(values.level ?? ''),
        customerLevel: values.customerLevel ? String(values.customerLevel) : undefined,
        tags: editLeadTags,
        entity: String(values.entity ?? ''),
        owner: String(values.owner ?? '').trim(),
        optimizer: String(values.optimizer ?? '').trim(),
        assistant: String(values.assistant ?? '').trim(),
        presalesGroupName: String(values.presalesGroupName ?? '').trim() || undefined,
        requirement: String(values.requirement ?? '').trim(),
        customerNote: String(values.customerNote ?? '').trim() || undefined,
        attachments: uploadItemsToLeadAttachments(editLeadUploadItems),
      };

      setEditLeadSubmitting(true);
      if (dispatchLead) {
        await updateLead(dispatchLead.id, (current) => applyLeadEdit(current, normalized));
      }
      setLeadOverride((current) => ({
        ...current,
        ...normalized,
        initialRequirement: normalized.requirement,
        updateTime: new Date().toISOString(),
      }));
      Message.success('线索信息已更新');
      closeEditLead();
    } catch {
      // 表单校验错误由 Arco 就地展示。
    } finally {
      setEditLeadSubmitting(false);
    }
  };

  const saveFollowUp = async (values: LeadFollowUpFormValues) => {
    if (!serviceLeadId) {
      Message.error('未找到可跟进的线索');
      return;
    }

    try {
      setFollowSubmitting(true);
      await addFollowUp(serviceLeadId, {
        method: values.method,
        customerStatus: values.customerStatus,
        intentionLevel: values.intentionLevel,
        costHours: values.costHours,
        costMins: values.costMins,
        content: values.content.trim(),
        nextFollowTime: formDateTime(values.nextFollowTime),
        attachments: uploadItemsToLeadAttachments(values.attachments),
        creator: CURRENT_LOGIN_USER.name,
      });
      const completedAt = new Date().toISOString();
      completeTodosBySource('lead_followup', serviceLeadId, completedAt);
      const nextFollowTime = formDateTime(values.nextFollowTime);
      if (nextFollowTime) {
        upsertActiveTodo({
          id: `todo-lead-followup-${serviceLeadId}-${Date.now()}`,
          source: 'lead_followup',
          sourceId: serviceLeadId,
          module: '线索跟进',
          title: `跟进 ${lead?.name || dispatchLead?.name || '线索'}`,
          content: values.content.trim(),
          assigneeId: dispatchLead?.owner || lead?.owner || CURRENT_LOGIN_USER.id,
          assigneeName: dispatchLead?.owner || lead?.owner || CURRENT_LOGIN_USER.name,
          status: 'pending',
          priority: lead?.customerLevel === 'S' ? 'high' : 'medium',
          createdAt: completedAt,
          deadline: nextFollowTime,
          route: `/leads/${id}`,
        });
      }
      setFollowUps(await getFollowUps(serviceLeadId));
      setLeadOverride((current) => ({
        ...current,
        status: values.customerStatus,
        level: values.intentionLevel ?? lead?.level,
        nextFollowTime: nextFollowTime ?? '',
        followCount: ((lead?.followCount) ?? 0) + 1,
      }));
      Message.success('跟进记录已保存');
      setFollowVisible(false);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '跟进记录保存失败，请重试');
    } finally {
      setFollowSubmitting(false);
    }
  };

  const submitQuickFollow = async () => {
    if (!serviceLeadId) {
      Message.error('未找到可跟进的线索');
      return;
    }
    if (!quickFollowContent.trim()) {
      Message.warning('请输入跟进纪要内容');
      return;
    }

    try {
      setQuickFollowSubmitting(true);
      const nextTimeFormatted = formDateTime(quickFollowNextTime);
      await addFollowUp(serviceLeadId, {
        method: quickFollowMethod,
        customerStatus: lead.status,
        intentionLevel: lead.level,
        costHours: 0,
        costMins: 15,
        content: quickFollowContent.trim(),
        nextFollowTime: nextTimeFormatted,
        creator: CURRENT_LOGIN_USER.name,
      });

      const completedAt = new Date().toISOString();
      completeTodosBySource('lead_followup', serviceLeadId, completedAt);
      if (nextTimeFormatted) {
        upsertActiveTodo({
          id: `todo-lead-followup-${serviceLeadId}-${Date.now()}`,
          source: 'lead_followup',
          sourceId: serviceLeadId,
          module: '线索跟进',
          title: `跟进 ${lead?.name || dispatchLead?.name || '线索'}`,
          content: quickFollowContent.trim(),
          assigneeId: dispatchLead?.owner || lead?.owner || CURRENT_LOGIN_USER.id,
          assigneeName: dispatchLead?.owner || lead?.owner || CURRENT_LOGIN_USER.name,
          status: 'pending',
          priority: lead?.customerLevel === 'S' ? 'high' : 'medium',
          createdAt: completedAt,
          deadline: nextTimeFormatted,
          route: `/leads/${id}`,
        });
      }

      setFollowUps(await getFollowUps(serviceLeadId));
      setLeadOverride((current) => ({
        ...current,
        nextFollowTime: nextTimeFormatted ?? lead?.nextFollowTime,
        followCount: (lead?.followCount ?? 0) + 1,
      }));
      setQuickFollowContent('');
      setQuickFollowNextTime('');
      Message.success('跟进记录已快速保存');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setQuickFollowSubmitting(false);
    }
  };
 
  const handleStageAction = (actionKey: string) => {
    if (actionKey === 'edit') {
      openEditLead();
    } else if (actionKey === 'quick_follow') {
      const el = document.getElementById('quick-follow-input');
      if (el) {
        el.focus();
      } else {
        setFollowVisible(true);
      }
    } else if (actionKey === 'quote') {
      setActiveMainTab('quotation');
      setQuoteModeVisible(true);
    } else if (actionKey === 'contracts') {
      setActiveMainTab('contracts');
    } else if (actionKey === 'delivery') {
      setActiveMainTab('delivery');
    }
  };

  const openStageAdvanceModal = () => {
    const currentIdx = getLifecycleIndex(lead.status);
    const nextStep = LIFECYCLE_STEPS[currentIdx + 1];
    if (nextStep && nextStep.statuses.length > 0) {
      setAdvanceTargetStatus(nextStep.statuses[0]);
    } else {
      setAdvanceTargetStatus(lead.status);
    }
    setAdvanceNote('');
    setAdvanceNextFollowTime('');
    setAdvanceModalVisible(true);
  };

  const submitStageAdvance = async () => {
    if (!serviceLeadId || !advanceTargetStatus) {
      Message.warning('请选择目标阶段状态');
      return;
    }

    try {
      setAdvanceSubmitting(true);
      const prevStatus = lead.status;
      if (dispatchLead) {
        await updateLead(dispatchLead.id, (current) => ({
          ...current,
          status: advanceTargetStatus,
        }));
      }
      setLeadOverride((current) => ({
        ...current,
        status: advanceTargetStatus,
      }));

      // 自动写入一条阶段推进的跟进动态
      const advanceFollowContent = `【阶段推进】状态由「${prevStatus}」推进至「${advanceTargetStatus}」${advanceNote.trim() ? `。推进要点：${advanceNote.trim()}` : ''}`;
      const nextTimeFormatted = formDateTime(advanceNextFollowTime);
      await addFollowUp(serviceLeadId, {
        method: '系统流转',
        customerStatus: advanceTargetStatus,
        intentionLevel: lead.level,
        costHours: 0,
        costMins: 5,
        content: advanceFollowContent,
        nextFollowTime: nextTimeFormatted,
        creator: CURRENT_LOGIN_USER.name,
      });

      if (nextTimeFormatted) {
        const completedAt = new Date().toISOString();
        upsertActiveTodo({
          id: `todo-lead-followup-${serviceLeadId}-${Date.now()}`,
          source: 'lead_followup',
          sourceId: serviceLeadId,
          module: '线索跟进',
          title: `跟进 ${lead?.name || dispatchLead?.name || '线索'}`,
          content: advanceFollowContent,
          assigneeId: dispatchLead?.owner || lead?.owner || CURRENT_LOGIN_USER.id,
          assigneeName: dispatchLead?.owner || lead?.owner || CURRENT_LOGIN_USER.name,
          status: 'pending',
          priority: lead?.customerLevel === 'S' ? 'high' : 'medium',
          createdAt: completedAt,
          deadline: nextTimeFormatted,
          route: `/leads/${id}`,
        });
      }

      setFollowUps(await getFollowUps(serviceLeadId));
      Message.success(`阶段已成功推进至「${advanceTargetStatus}」`);
      setAdvanceModalVisible(false);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '阶段推进失败');
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  const openLeadOperation = (operation: LeadOperation) => {
    leadOperationForm.resetFields();
    setLeadOperation(operation);
  };

  const closeLeadOperation = () => {
    if (leadOperationSubmitting) return;
    setLeadOperation(null);
    leadOperationForm.resetFields();
  };

  const submitLeadOperation = async () => {
    if (!leadOperation || !serviceLeadId) {
      Message.error('未找到可操作的线索');
      return;
    }

    try {
      const values = await leadOperationForm.validate() as { targetOwner?: string; reason?: string };
      const reason = String(values.reason ?? '').trim();
      setLeadOperationSubmitting(true);

      if (leadOperation === 'transfer') {
        const targetOwner = String(values.targetOwner ?? '');
        await assignLead(serviceLeadId, targetOwner, CURRENT_LOGIN_USER.name, reason);
        setLeadOverride((current) => ({ ...current, owner: targetOwner, clueType: 'assigned' }));
        Message.success(`线索已转移给 ${targetOwner}`);
        setLeadOperation(null);
        leadOperationForm.resetFields();
        return;
      }

      if (leadOperation === 'return') {
        const nextTrashCount = (lead.trashCount ?? 0) + 1;
        const willEnterTrash = nextTrashCount >= 3;
        await returnLead(serviceLeadId, CURRENT_LOGIN_USER.name, reason);
        Message.success(willEnterTrash ? '该线索已达第 3 次退回，已自动进入垃圾线索' : '线索已扔回公海');
        navigate(willEnterTrash ? '/leads/trash' : '/leads/public');
        return;
      }

      await markTrash(serviceLeadId, CURRENT_LOGIN_USER.name, reason);
      Message.success('线索已标记为垃圾');
      navigate('/leads/trash');
    } catch (error) {
      if (error instanceof Error) {
        Message.error(error.message || '操作失败，请重试');
      }
    } finally {
      setLeadOperationSubmitting(false);
    }
  };

  const deleteLead = () => {
    if (!serviceLeadId) {
      Message.error('未找到可删除的线索');
      return;
    }
    Modal.confirm({
      title: '确认删除线索？',
      content: `删除“${lead.name}”后将从当前线索池隐藏，管理员仍可通过数据恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await softDelete(serviceLeadId);
          Message.success('线索已删除');
          navigate(leadListPath(from));
        } catch (error) {
          Message.error(error instanceof Error ? error.message : '删除失败，请重试');
          throw error;
        }
      },
    });
  };

  // 行动栏按钮（按 clueType 过滤）
  const showAssignActions = lead.clueType === 'assigned';
  const showReturn = lead.clueType === 'assigned' && lead.trashCount < 2;
  const showReturnWithWarning = lead.clueType === 'assigned' && lead.trashCount >= 2;

  const handleViewContractDetail = (contractId: string) => {
    navigate(`/contracts/${contractId}`, {
      state: {
        contractDetailReturn: {
          pathname: `/leads/${id}`,
          state: { from, activeSideTab: 'contract-records' },
        },
      },
    });
  };

  const handleCreateContract = () => {
    const latestApproved = quotationHistory.find(
      (quote) => quote.flowStatus === '已审核' && quote.status === '已报价',
    );
    const params = new URLSearchParams({
      leadId: id ?? '',
      returnTo: 'lead',
      from,
    });
    if (latestApproved) {
      params.set('quoteId', latestApproved.id);
    }

    navigate(`/contracts/new?${params.toString()}`, {
      state: {
        leadContractPrefill: {
          lead: buildLeadContextFromDetail(id ?? '', lead, quotationHistory),
          quoteId: latestApproved?.id,
        },
        from,
      },
    });
  };

  return (
    <PageShell
      breadcrumbs={[
        { label: '线索管理', to: '/leads/my' },
        { label: '我的线索', to: '/leads/my' },
        { label: lead.name },
      ]}
    >
      <ProcessOverview
        identifier={`#${lead.name?.slice(0, 6) || id}`}
        title={lead.name}
        tags={(
          <>
            <Tag color={lead.status === '已签单' ? 'green' : lead.status === '已终止' ? 'red' : 'blue'}>{lead.status}</Tag>
            {lead.customerLevel && <Tag color={lead.customerLevel === 'S' ? 'red' : 'blue'}>{lead.customerLevel}</Tag>}
            <Tag color="gray">{lead.entity}</Tag>
            <Tag color="gray" style={{ color: 'var(--color-text-1)', background: 'var(--color-fill-2)' }}>{channelLabel(lead.source)}</Tag>
          </>
        )}
        actions={(
          <Space wrap>
            {lifecycleIdx < LIFECYCLE_STEPS.length - 1 && (
              <Button size="small" type="primary" onClick={openStageAdvanceModal} style={{ fontWeight: 500 }}>
                推进阶段 &gt;
              </Button>
            )}
            <Button size="small" type="outline" onClick={() => setFollowVisible(true)}>写跟进</Button>
            <Button size="small" icon={<IconEdit />} onClick={openEditLead}>编辑线索</Button>
            {showAssignActions && <Button size="small" icon={<IconSwap />} onClick={() => openLeadOperation('transfer')}>转移给他人</Button>}
            {showReturn && <Button size="small" icon={<IconReply />} status="warning" onClick={() => openLeadOperation('return')}>扔回公海</Button>}
            {showReturnWithWarning && (
              <Tooltip content={`已退回 ${lead.trashCount} 次，本次退回后将自动标记为垃圾`}>
                <Button size="small" icon={<IconReply />} status="warning" onClick={() => openLeadOperation('return')}>扔回公海 ({lead.trashCount}/3)</Button>
              </Tooltip>
            )}
            {lead.clueType !== 'trash' && <Button size="small" icon={<IconStop />} status="warning" onClick={() => openLeadOperation('trash')}>标记垃圾</Button>}
            <Button size="small" icon={<IconDelete />} status="danger" onClick={deleteLead}>删除</Button>
          </Space>
        )}
        currentStep={lifecycleIdx}
        steps={LIFECYCLE_STEPS.map((step, index) => {
          const sopInfo = STAGE_SOP_MAP[index] || STAGE_SOP_MAP[0];
          const nextStage = LIFECYCLE_STEPS[index + 1];
          const isCurrent = index === lifecycleIdx;
          const isDone = index < lifecycleIdx;
          const status = (
            isCurrent ? `进行中 · 已停留 ${lead.daysHeld || 1} 天` :
            isDone ? '已达成' :
            undefined
          );

          return {
            key: step.key,
            title: (
              <span className="lead-stage-step-title">
                <LeadStagePopover
                  stageIndex={index}
                  currentStageIndex={lifecycleIdx}
                  sopInfo={sopInfo}
                  daysHeld={lead.daysHeld || 1}
                  nextStageLabel={nextStage?.label}
                  onNavigateTab={setActiveMainTab}
                  onAction={handleStageAction}
                  onAdvanceStage={openStageAdvanceModal}
                >
                  {step.label}
                </LeadStagePopover>
                {status && (
                  <span className={`lead-stage-step-status ${isCurrent ? 'lead-stage-step-status--active' : 'lead-stage-step-status--done'}`}>
                    {status}
                  </span>
                )}
              </span>
            ),
          };
        })}
      />

      <MetricGrid
        items={[
          {
            key: 'owner',
            label: '负责人',
            value: <>
              <IconUserAdd style={{ color: 'rgb(var(--primary-6))' }} />
              <span>{lead.owner || '公海'}</span>
              {lead.daysHeld > 0 && <Text type="secondary" style={{ fontSize: 12 }}>({lead.daysHeld}天)</Text>}
            </>,
          },
          {
            key: 'contact',
            label: '对接人',
            value: <>
              <IconPhone style={{ color: 'var(--color-text-3)' }} />
              <span>{lead.contact}</span>
              <Tooltip content="复制电话">
                <Button type="text" size="mini" icon={<IconCopy />} onClick={() => { navigator.clipboard.writeText(lead.phone); Message.success('已复制'); }} />
              </Tooltip>
            </>,
          },
          { key: 'amount', label: '总标的', value: <Text style={{ color: 'rgb(var(--success-6))' }}>{lead.customerBudget || '-'}</Text> },
          { key: 'cost', label: '客资成本', value: lead.customerCost || '-' },
          { key: 'follow-count', label: '跟进次数', value: `${lead.followCount}次` },
          { key: 'next-follow', label: '下次跟进', value: lead.nextFollowTime ? lead.nextFollowTime.slice(0, 16) : '-' },
        ]}
      />

      {/* ========== 主体区域：70:30 分栏 ========== */}
      <SplitLayout>
        {/* 左侧主区域 (70%) */}
        <SplitLayoutMain>
          {/* 关键信息档案卡 */}
          <Card
            size="small"
            style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--grey-200)' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-1)' }}>{lead.name}</span>
                {lead.customerTitle && (
                  <Tag color="arcoblue" size="small">称谓: {lead.customerTitle}</Tag>
                )}
                {lead.customerLevel && (
                  <Tag color={lead.customerLevel === 'S' ? 'red' : 'blue'} size="small">{lead.customerLevel} 级客户</Tag>
                )}
              </div>
              {lead.presalesGroupName && (
                <Tooltip content="点击复制群名">
                  <Button
                    type="outline"
                    size="mini"
                    icon={<WeChatIcon size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(lead.presalesGroupName || '');
                      Message.success('已复制售前群名');
                    }}
                    style={{ borderColor: 'rgb(var(--warning-4))', color: 'rgb(var(--warning-7))' }}
                  >
                    {lead.presalesGroupName}
                  </Button>
                </Tooltip>
              )}
            </div>

            {/* 3 组模块化属性胶囊 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--color-fill-1)',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>联系电话</div>
                <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{lead.phone || '-'}</span>
                  {lead.phone && (
                    <Tooltip content="复制电话">
                      <Button
                        type="text"
                        size="mini"
                        icon={<IconCopy />}
                        style={{ padding: 2, height: 'auto', color: 'var(--color-text-3)' }}
                        onClick={() => { navigator.clipboard.writeText(lead.phone); Message.success('已复制电话号码'); }}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>微信号</div>
                <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{lead.wechat || '-'}</span>
                  {lead.wechat && (
                    <Tooltip content="复制微信">
                      <Button
                        type="text"
                        size="mini"
                        icon={<IconCopy />}
                        style={{ padding: 2, height: 'auto', color: 'var(--color-text-3)' }}
                        onClick={() => { navigator.clipboard.writeText(lead.wechat); Message.success('已复制微信号'); }}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>渠道与主体</div>
                <Space size={4}>
                  <Tag color="gray" size="small" style={{ color: 'var(--color-text-1)', background: 'var(--color-fill-2)' }}>{channelLabel(lead.source)}</Tag>
                  <Tag color="blue" size="small">{lead.entity}</Tag>
                </Space>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>客资成本</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: lead.customerCost ? 'rgb(var(--primary-6))' : 'var(--color-text-3)' }}>
                  {lead.customerCost || '¥0.00'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>团队协作</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                  优化师: {lead.optimizer || '-'} · 协助人: {lead.assistant || '-'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>意向标签</div>
                <Space size={4} wrap>
                  {(lead.tags && lead.tags.length > 0) ? lead.tags.map((t) => (
                    <Tag key={t} size="small" color="green">{t}</Tag>
                  )) : <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>暂无标签</span>}
                </Space>
              </div>
            </div>

            {/* 初始需求引用面板 */}
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(var(--primary-1), 0.4)',
                borderLeft: '3px solid rgb(var(--primary-6))',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgb(var(--primary-7))', marginBottom: 2 }}>初始业务需求</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-1)', lineHeight: 1.6 }}>
                {lead.requirement || lead.initialRequirement || '暂无填写的初始需求描述'}
              </div>
            </div>

            {/* 线索附件：内聚在线索详情卡内，消除视觉分割感 */}
            <LeadAttachmentPanel
              embedded
              attachments={lead.attachments ?? []}
              onManage={openEditLead}
            />
          </Card>

          {/* 左侧业务实体工作台：6 大宽幅 Tab */}
          <Card size="small" style={{ flex: 1 }}>
            <Tabs activeTab={activeMainTab} onChange={setActiveMainTab} type="card">
              <TabPane key="basic" title="基础档案" />
              <TabPane key="quotation" title={`方案与报价 (${quotes.filter((q) => q.leadId === id && q.status !== 'voided').length})`} />
              <TabPane key="contracts" title={`合同与财务 (${relatedContracts.length})`} />
              <TabPane key="travel" title={`差旅与费用 (${travels.length + reimbursements.length})`} />
              <TabPane key="delivery" title="交付执行" />
              <TabPane key="assets" title={`资料与环境 (${demos.length + documents.length})`} />
            </Tabs>

            <div style={{ marginTop: 16 }}>
              {/* 1. 基础信息 */}
              {activeMainTab === 'basic' && (
                <Descriptions
                  column={4}
                  size="small"
                  data={[
                    { label: '对接主体', value: lead.entity },
                    { label: '线索意向', value: lead.level || '-' },
                    { label: '线索状态', value: lead.status },
                    { label: '客户类型', value: lead.customerLevel || '-' },
                    { label: '客户预算', value: lead.customerBudget || '-' },
                    { label: '客户主体', value: lead.customer },
                    { label: '售前群名称', value: lead.presalesGroupName || '-' },
                    { label: '威客任务号', value: lead.witkeyTaskNo || '-' },
                    { label: '推广关键词', value: lead.keyword || '-' },
                    { label: '意向标签', value: lead.tags?.join('、') || '-' },
                    // 派发信息
                    { label: '业务线', value: dispatchLead?.businessLine ? BUSINESS_LINE_LABEL[dispatchLead.businessLine as LeadBusinessLine] || dispatchLead.businessLine : '-' },
                    { label: '渠道计划', value: dispatchLead?.channelPlan || '-' },
                    { label: '派发时间', value: dispatchLead?.dispatchedAt || '未派发' },
                    { label: '派发目标', value: dispatchLead?.dispatchTarget === 'sales' ? '指派销售' : dispatchLead?.dispatchTarget === 'pool' ? '公海' : '-' },
                    { label: '派发时效', value: dispatchView ? <Tag color={dispatchView.dispatchSla.status === 'overdue' ? 'red' : dispatchView.dispatchSla.status === 'warning' ? 'orange' : 'green'} size="small">{dispatchView.dispatchSla.label}</Tag> : '-' },
                    { label: '首联时效', value: dispatchView ? <Tag color={dispatchView.firstContactSla.status === 'overdue' ? 'red' : dispatchView.firstContactSla.status === 'warning' ? 'orange' : 'green'} size="small">{dispatchView.firstContactSla.label}</Tag> : '-' },
                    { label: '原型图链接', span: 4, value: lead.prototypeLink ? <a href={lead.prototypeLink} target="_blank" rel="noreferrer" style={{ overflowWrap: 'anywhere' }}>{lead.prototypeLink}</a> : '-' },
                    { label: '客户信息备注', span: 4, value: lead.customerNote || '-' },
                  ]}
                />
              )}

              {/* 2. 方案与报价（精细化管理与商务反馈工作台） */}
              {activeMainTab === 'quotation' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
                      沉淀此线索的技术方案成本测算与多版本报价记录
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<IconPlus />}
                      onClick={() => setQuoteModeVisible(true)}
                    >
                      新建报价
                    </Button>
                  </div>
                  <LeadQuotationManager
                    leadId={profileLeadId || id || ''}
                    leadName={lead?.name || dispatchLead?.name}
                    quotes={matchedLeadQuotes}
                    onOpenWorkbench={(quoteId) => {
                      setQuotationDrawerQuoteId(quoteId);
                      setQuotationDrawerVisible(true);
                    }}
                    onCreateQuote={() => setQuoteModeVisible(true)}
                    onNewVersion={async (sourceQuoteId) => {
                      try {
                        const newId = await createNewVersion(sourceQuoteId);
                        Message.success('已基于反馈成功创建新版本报价');
                        return newId;
                      } catch (err: any) {
                        Message.error(err?.message || '创建新版本失败');
                      }
                    }}
                    onRecordFeedback={async (quoteId, feedback, syncToFollowUp) => {
                      const newFb: QuoteCustomerFeedback = {
                        ...feedback,
                        id: `fb-${Date.now()}`,
                        recordedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        recordedBy: CURRENT_LOGIN_USER.name,
                      };
                      await updateQuote(quoteId, (q) => ({
                        ...q,
                        customerFeedbacks: [newFb, ...(q.customerFeedbacks || [])],
                      }));

                      if (syncToFollowUp && serviceLeadId) {
                        const dispConfig = FEEDBACK_DISPOSITION_MAP[feedback.disposition];
                        const dispText = dispConfig?.label || '方案反馈';
                        const gapDetails = [
                          feedback.targetBudget ? `期望预算 ¥${feedback.targetBudget.toLocaleString()}` : '',
                          feedback.targetDays ? `期望工期 ${feedback.targetDays}工作日` : '',
                        ].filter(Boolean).join('，');

                        const logNote = `【方案客户反馈 · ${dispText}】针对报价方案${gapDetails ? `（${gapDetails}）` : ''}：${feedback.content}${feedback.strategy ? `。销售应对思路：${feedback.strategy}` : ''}`;

                        try {
                          await addFollowUp(serviceLeadId, {
                            method: '电话沟通',
                            customerStatus: lead.status,
                            intentionLevel: lead.level,
                            costHours: 0,
                            costMins: 15,
                            content: logNote,
                            nextFollowTime: feedback.nextAction === 'new_version' ? '次日完成方案调整' : '',
                            creator: CURRENT_LOGIN_USER.name,
                          });
                          setFollowUps(await getFollowUps(serviceLeadId));
                        } catch (err) {
                          console.warn('Sync feedback to follow-up failed:', err);
                        }
                      }
                      Message.success('客户反馈已成功记录');
                    }}
                  />
                </div>
              )}

              {/* 3. 合同与财务 */}
              {activeMainTab === 'contracts' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreateContract}>
                      新建合同
                    </Button>
                  </div>
                  <Card size="small" title="正式主合同" style={{ marginBottom: 16 }}>
                    {mainContract ? (
                      <LeadFinalContractPanel contract={mainContract} projectLayout projectFullInfo />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无关联合同</div>
                    )}
                  </Card>
                  <Card size="small" title={`补充合同（${supplementContracts.length}）`} style={{ marginBottom: 16 }}>
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

                  <Card size="small" title="回款与发票台账">
                    <ContractPaymentInvoicePanel
                      mainContract={mainContract}
                      supplementContracts={supplementContracts}
                      contractAmount={paymentContractAmount}
                      receivedAmount={paymentReceivedAmount}
                      collections={visibleLeadCollections}
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
                  </Card>
                </div>
              )}

              {/* 4. 差旅与费用（宽幅并列） */}
              {activeMainTab === 'travel' && (
                <div>
                  <Grid.Row gutter={16}>
                    <Grid.Col span={12}>
                      <Card
                        size="small"
                        title="出差申请记录"
                        extra={<Button type="primary" size="mini" icon={<IconPlus />} onClick={() => { travelForm.resetFields(); setTravelModalVisible(true); }}>新增出差</Button>}
                      >
                        {travels.map((travel) => (
                          <ProcessRecordCard
                            key={travel.id}
                            title={`${travel.destination} · ${travel.purpose}`}
                            tags={<Tag color="green" size="small">{travel.status}</Tag>}
                            actions={<Tooltip content="展开出差详情"><span className="hubx-process-record-card__indicator"><IconArrowRight /></span></Tooltip>}
                            identifier={`审批号 ${travel.approvalNo}`}
                            onClick={() => setTravelDetailId(travel.id)}
                            ariaLabel={`展开${travel.destination}出差详情`}
                            summary={(
                              <>
                                <span>申请人 <strong>{travel.applicant}</strong></span>
                                <span>{travel.startDate} 至 {travel.endDate}</span>
                                <span>费用 <strong>{money(travel.amount)}</strong></span>
                              </>
                            )}
                          />
                        ))}
                        {travels.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无出差记录</div>}
                      </Card>
                    </Grid.Col>

                    <Grid.Col span={12}>
                      <Card
                        size="small"
                        title="费用报销记录"
                        extra={<Button type="primary" size="mini" icon={<IconPlus />} onClick={() => { reimbursementForm.resetFields(); setReimbursementModalVisible(true); }}>新增报销</Button>}
                      >
                        {reimbursements.map((rb) => (
                          <ProcessRecordCard
                            key={rb.id}
                            title={`${rb.type} · ${rb.description}`}
                            tags={<Tag color="green" size="small">{rb.status}</Tag>}
                            actions={<Tooltip content="展开报销详情"><span className="hubx-process-record-card__indicator"><IconArrowRight /></span></Tooltip>}
                            identifier={`审批号 ${rb.approvalNo}`}
                            onClick={() => setReimbursementDetailId(rb.id)}
                            ariaLabel={`展开${rb.type}报销详情`}
                            summary={(
                              <>
                                <span>申请人 <strong>{rb.applicant}</strong></span>
                                <span>报销金额 <strong>{money(rb.amount)}</strong></span>
                              </>
                            )}
                          />
                        ))}
                        {reimbursements.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无报销记录</div>}
                      </Card>
                    </Grid.Col>
                  </Grid.Row>
                </div>
              )}

              {/* 5. 交付执行 */}
              {activeMainTab === 'delivery' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
                    <Tag color="blue">项目编号</Tag>
                    <Text style={{ fontWeight: 500 }}>PRJ20260820001</Text>
                    <Divider type="vertical" />
                    <Tag color="green">健康度: 正常</Tag>
                    <Divider type="vertical" />
                    <Text type="secondary">PM: 李四</Text>
                    <Divider type="vertical" />
                    <Text type="secondary">进度: 65%</Text>
                    <Progress percent={65} size="small" style={{ width: 100 }} showText={false} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: 'block' }}>交付里程碑</Text>
                    <Steps current={2} size="small">
                      <Step title="立项启动" description="08-20 已确认" />
                      <Step title="UI确认" description="08-28 客户盖章" />
                      <Step title="核心开发" description="进行中 65%" />
                      <Step title="提测预发布" description="计划 09-15" />
                      <Step title="终验上线" description="计划 09-25" />
                    </Steps>
                  </div>

                  <Grid.Row gutter={16}>
                    <Grid.Col span={12}>
                      <Card size="small" title="任务看板">
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>开发中 3 项 · 待分配 1 项 · 已完成 1 项</div>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Card size="small" title="缺陷跟踪">
                        <div style={{ fontSize: 12 }}>
                          <Tag color="red" size="small">P0: 0</Tag>
                          <Tag color="orangered" size="small">P1: 1</Tag>
                          <Tag color="orange" size="small">P2: 0</Tag>
                          <Tag color="blue" size="small">P3: 0</Tag>
                        </div>
                      </Card>
                    </Grid.Col>
                  </Grid.Row>
                </div>
              )}

              {/* 6. 资料与环境 */}
              {activeMainTab === 'assets' && (
                <div>
                  <Grid.Row gutter={16}>
                    <Grid.Col span={12}>
                      <Card
                        size="small"
                        title="演示环境管理"
                        extra={<Button type="primary" size="mini" icon={<IconPlus />} onClick={() => { demoForm.resetFields(); setDemoModalVisible(true); }}>新增环境</Button>}
                      >
                        {demos.map((demo) => (
                          <ProcessRecordCard
                            key={demo.id}
                            leading={<Tag color="blue" size="small">{demo.type}</Tag>}
                            title={demo.description}
                            identifier={(
                              <span className="hubx-process-record-card__identifier-line">
                                <span>{demo.url}</span>
                                <Tooltip content="复制链接">
                                  <Button
                                    className="hubx-icon-action"
                                    type="text"
                                    size="mini"
                                    aria-label={`复制${demo.description}链接`}
                                    icon={<IconCopy />}
                                    onClick={() => { navigator.clipboard.writeText(demo.url); Message.success('已复制链接'); }}
                                  />
                                </Tooltip>
                              </span>
                            )}
                            actions={(
                              <Tooltip content="删除环境">
                                <Button className="hubx-icon-action" aria-label={`删除${demo.description}`} type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDemos(demos.filter((d) => d.id !== demo.id)); Message.success('已删除'); }} />
                              </Tooltip>
                            )}
                          />
                        ))}
                        {demos.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无演示环境</div>}
                      </Card>
                    </Grid.Col>

                    <Grid.Col span={12}>
                      <Card
                        size="small"
                        title="方案资料库"
                        extra={<Button type="primary" size="mini" icon={<IconUpload />} onClick={() => { docForm.resetFields(); setDocUploadItems([]); setDocModalVisible(true); }}>上传资料</Button>}
                      >
                        {documents.map((doc) => (
                          <ProcessRecordCard
                            key={doc.id}
                            leading={<IconFile />}
                            title={doc.name}
                            tags={<><Tag size="small" color="gray">{doc.type}</Tag><Tag size="small" color="arcoblue">{doc.source}</Tag></>}
                            identifier={`${doc.uploader} · ${doc.createdAt}`}
                            actions={(
                              <Space size={4}>
                                <Tooltip content="下载"><Button className="hubx-icon-action" type="text" size="small" aria-label={`下载 ${doc.name}`} icon={<IconDownload />} onClick={() => Message.success(`开始下载 ${doc.name}`)} /></Tooltip>
                                <Tooltip content="删除资料"><Button className="hubx-icon-action" aria-label={`删除 ${doc.name}`} type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDocuments(documents.filter((d) => d.id !== doc.id)); Message.success('已删除'); }} /></Tooltip>
                              </Space>
                            )}
                          />
                        ))}
                        {documents.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无资料</div>}
                      </Card>
                    </Grid.Col>
                  </Grid.Row>
                </div>
              )}
            </div>
          </Card>
        </SplitLayoutMain>

        {/* 右侧互动流与协同 (30%) */}
        <SplitLayoutAside>
          {/* 售前聊天群分析 */}
          {lead.presalesGroupName && (
            <Card size="small" title="售前聊天群分析" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <WeChatIcon />
                <Text style={{ fontWeight: 500 }}>{lead.presalesGroupName}</Text>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)', marginBottom: 4 }}>AI 摘要洞察</div>
                <div>
                  客户对小程序点餐系统需求明确，重点关注多门店管理和微信支付对接。已确认基础功能清单，待确认抖音端增项需求。
                </div>
              </div>
            </Card>
          )}

          {/* 常驻快捷写跟进卡片 */}
          <Card
            size="small"
            title="快捷写跟进"
            extra={
              <Button
                type="text"
                size="mini"
                onClick={() => setFollowVisible(true)}
                style={{ color: 'var(--primary)', padding: 0 }}
              >
                详细表单(传附件)
              </Button>
            }
            style={{ marginBottom: 14 }}
          >
            <Input.TextArea
              id="quick-follow-input"
              value={quickFollowContent}
              onChange={setQuickFollowContent}
              placeholder="就地记录本次跟进要点、客户核心反馈..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Space size={4}>
                {(['电话', '微信', '拜访', '会议'] as const).map((m) => (
                  <Button
                    key={m}
                    size="mini"
                    type={quickFollowMethod === m ? 'primary' : 'secondary'}
                    onClick={() => setQuickFollowMethod(m)}
                  >
                    {m}
                  </Button>
                ))}
              </Space>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <DatePicker
                  size="mini"
                  placeholder="下次跟进"
                  style={{ width: 136 }}
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  value={quickFollowNextTime}
                  onChange={setQuickFollowNextTime}
                />
                <Button
                  type="primary"
                  size="mini"
                  loading={quickFollowSubmitting}
                  onClick={submitQuickFollow}
                >
                  保存
                </Button>
              </div>
            </div>
          </Card>

          {/* 互动时间线卡片 */}
          <Card
            size="small"
            title="跟进与互动动态"
            extra={
              <Space size={4}>
                {[
                  { label: '全部', value: 'all' },
                  { label: '电话', value: '电话' },
                  { label: '微信', value: '微信' },
                  { label: '拜访', value: '拜访' },
                ].map((item) => (
                  <Tag
                    key={item.value}
                    size="small"
                    color={timelineFilterMethod === item.value ? 'arcoblue' : undefined}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setTimelineFilterMethod(item.value)}
                  >
                    {item.label}
                  </Tag>
                ))}
              </Space>
            }
            style={{ flex: 1 }}
          >
            <div style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 4, marginTop: 4 }}>
              <Timeline>
                {filteredTimeline.map((record, index) => (
                  <Timeline.Item key={record.id} dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                        <Space size={6}>
                          <Tag color="blue" size="small">{record.method}</Tag>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)' }}>{record.creator}</span>
                        </Space>
                        <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>{record.createdAt}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-1)', lineHeight: 1.6, marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                        {record.content}
                      </div>
                      {record.nextFollowTime && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>📅 下次跟进:</span>
                          <strong>{record.nextFollowTime}</strong>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
              {filteredTimeline.length === 0 && (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-4)' }}>
                  暂无匹配的跟进记录
                </div>
              )}
            </div>
          </Card>
        </SplitLayoutAside>
      </SplitLayout>

      <Modal
        title={leadOperation === 'transfer' ? '转移给他人' : leadOperation === 'return' ? '扔回公海' : '标记为垃圾'}
        visible={Boolean(leadOperation)}
        onOk={submitLeadOperation}
        onCancel={closeLeadOperation}
        confirmLoading={leadOperationSubmitting}
        okText={leadOperation === 'transfer' ? '确认转移' : leadOperation === 'return' ? '确认退回' : '确认标记'}
        cancelText="取消"
        okButtonProps={leadOperation === 'trash' ? { status: 'danger' } : leadOperation === 'return' ? { status: 'warning' } : undefined}
        maskClosable={!leadOperationSubmitting}
        unmountOnExit
        style={{ width: 520 }}
      >
        <Form form={leadOperationForm} layout="vertical">
          {leadOperation === 'transfer' && (
            <Form.Item label="新负责人" field="targetOwner" rules={[{ required: true, message: '请选择新负责人' }]}>
              <Select
                placeholder="选择要转移给的人员"
                options={employeeOptions.filter((option) => option.value !== lead.owner)}
                showSearch
              />
            </Form.Item>
          )}
          <Form.Item
            label={leadOperation === 'transfer' ? '转移原因' : leadOperation === 'return' ? '退回原因' : '垃圾原因'}
            field="reason"
            rules={[{ required: true, message: '请填写操作原因' }, { maxLength: 200, message: '最多输入 200 个字符' }]}
          >
            <Input.TextArea
              rows={4}
              maxLength={200}
              showWordLimit
              placeholder={leadOperation === 'transfer' ? '说明转移背景，便于新负责人接手' : leadOperation === 'return' ? '说明退回公海的原因' : '说明判定为垃圾线索的原因'}
            />
          </Form.Item>
          {leadOperation === 'return' && (
            <div style={{ color: lead.trashCount >= 2 ? 'rgb(var(--danger-6))' : 'var(--color-text-3)', fontSize: 13, lineHeight: '20px' }}>
              当前已退回 {lead.trashCount} 次；第 3 次退回将自动进入垃圾线索。
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        className={`new-lead-modal${editLeadFullscreen ? ' new-lead-modal--fullscreen' : ''}`}
        title={(
          <div className="new-lead-modal__header">
            <div className="new-lead-modal__heading">
              <span className="new-lead-modal__title">编辑线索</span>
              <span className="new-lead-modal__subtitle">更新客户资料与跟进状态，保存后同步至线索列表</span>
            </div>
            <Tooltip content={editLeadFullscreen ? '退出全屏' : '全屏填写'}>
              <Button
                className="new-lead-modal__fullscreen"
                type="text"
                htmlType="button"
                aria-label={editLeadFullscreen ? '退出全屏' : '全屏填写'}
                icon={editLeadFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
                onClick={() => setEditLeadFullscreen((value) => !value)}
              />
            </Tooltip>
          </div>
        )}
        visible={editLeadVisible}
        onOk={saveEditLead}
        onCancel={closeEditLead}
        confirmLoading={editLeadSubmitting}
        okText="保存修改"
        cancelText="取消"
        maskClosable={false}
        alignCenter
        unmountOnExit
        style={editLeadFullscreen ? undefined : { width: 'calc(100vw - 32px)', maxWidth: 1040 }}
        footer={(cancelButtonNode, okButtonNode) => (
          <div className="new-lead-modal__footer">
            {cancelButtonNode}
            {okButtonNode}
          </div>
        )}
      >
        <Form form={editLeadForm} layout="vertical" className="new-lead-form">
          <div className="new-lead-form__notice" role="note">
            <div>
              <strong>编辑提示</strong>
              <span>带 * 的字段为必填项；联系电话和联系微信至少填写一项。</span>
            </div>
            <span className="new-lead-form__destination">更新当前线索</span>
          </div>

          <section className="new-lead-form__section">
            <div className="new-lead-form__section-heading">
              <span>01</span>
              <div><h3>基本信息</h3><p>维护线索名称、来源渠道和承接主体</p></div>
            </div>
            <div className="new-lead-form__grid">
              <Form.Item className="new-lead-form__span-2" label="线索名称" field="name" required rules={[{ required: true, message: '请输入线索名称' }, { maxLength: 30, message: '最多输入 30 个字符' }]}>
                <Input autoFocus placeholder="如：华东零售门店小程序升级" maxLength={30} showWordLimit allowClear />
              </Form.Item>
              <Form.Item label="线索来源" field="source" required rules={[{ required: true, message: '请选择线索来源' }]}>
                <Select placeholder="选择来源渠道" allowClear>
                  {LEAD_SOURCE_LIST.map((source) => <Select.Option key={source} value={source}>{LEAD_SOURCE_LABEL[source]}</Select.Option>)}
                </Select>
              </Form.Item>
              <Form.Item label="对接主体" field="entity" required rules={[{ required: true, message: '请选择对接主体' }]}>
                <Select placeholder="选择承接主体" allowClear>
                  {COMPANY_ENTITY_LIST.map((entity) => <Select.Option key={entity} value={entity}>{entity}</Select.Option>)}
                </Select>
              </Form.Item>
            </div>
          </section>

          <section className="new-lead-form__section">
            <div className="new-lead-form__section-heading">
              <span>02</span>
              <div><h3>联系人信息</h3><p>维护客户对接人和有效触达方式</p></div>
            </div>
            <div className="new-lead-form__grid new-lead-form__grid--three">
              <Form.Item label="联系人" field="contact" required rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="联系人姓名或称呼" allowClear />
              </Form.Item>
              <Form.Item label="联系电话" field="phone" rules={[{ match: /^$|^1(?:\d{10}|\d{2}\*{4}\d{4})$/, message: '请输入正确的 11 位手机号' }]}>
                <Input placeholder="11 位手机号" maxLength={11} allowClear />
              </Form.Item>
              <Form.Item label="联系微信" field="wechat">
                <Input placeholder="微信号或绑定手机号" allowClear />
              </Form.Item>
            </div>
          </section>

          <section className="new-lead-form__section">
            <div className="new-lead-form__section-heading">
              <span>03</span>
              <div><h3>状态与责任</h3><p>更新销售阶段、客户分级和协作人员</p></div>
            </div>
            <div className="new-lead-form__grid new-lead-form__grid--three">
              <Form.Item label="线索状态" field="status" required rules={[{ required: true, message: '请选择线索状态' }]}>
                <Select placeholder="选择线索状态" options={SALES_STATUS_LIST.map((value) => ({ label: value, value }))} />
              </Form.Item>
              <Form.Item label="意向等级" field="level" required rules={[{ required: true, message: '请选择意向等级' }]}>
                <Select placeholder="选择意向等级" options={INTENTION_LEVEL_LIST.map((value) => ({ label: value, value }))} />
              </Form.Item>
              <Form.Item label="客户等级" field="customerLevel">
                <Select placeholder="选择客户等级" allowClear options={CUSTOMER_LEVEL_LIST.map((value) => ({ label: value, value }))} />
              </Form.Item>
              <Form.Item label="优化师" field="optimizer">
                <Select placeholder="选择优化师" options={employeeOptions} showSearch allowClear />
              </Form.Item>
              <Form.Item label="归属人" field="owner">
                <Select placeholder="选择归属人" options={employeeOptions} showSearch allowClear />
              </Form.Item>
              <Form.Item label="协助人" field="assistant">
                <Select placeholder="选择协助人" options={employeeOptions} showSearch allowClear />
              </Form.Item>
            </div>
          </section>

          <section className="new-lead-form__section">
            <div className="new-lead-form__section-heading">
              <span>04</span>
              <div><h3>需求与投放</h3><p>补充需求记录、渠道索引和售前协作信息</p></div>
            </div>
            <div className="new-lead-form__grid">
              <Form.Item label="推广关键词" field="keyword">
                <Input placeholder="如：小程序定制" allowClear />
              </Form.Item>
              <Form.Item label="售前群名称" field="presalesGroupName">
                <Input placeholder="请输入售前群名称" allowClear />
              </Form.Item>
              <Form.Item className="new-lead-form__span-all new-lead-form__tags" label="意向标签" field="tags">
                <div className="new-lead-form__tag-list">
                  {editLeadAvailableTags.map((tag) => (
                    <Tag key={tag} checkable checked={editLeadTags.includes(tag)} onCheck={() => toggleEditLeadTag(tag)}>{tag}</Tag>
                  ))}
                  {addingEditLeadTag ? (
                    <Input
                      className="new-lead-form__tag-input"
                      size="mini"
                      autoFocus
                      value={newEditLeadTag}
                      maxLength={10}
                      placeholder="标签名称"
                      onChange={setNewEditLeadTag}
                      onPressEnter={confirmNewEditLeadTag}
                      onBlur={confirmNewEditLeadTag}
                    />
                  ) : (
                    <Button size="mini" type="dashed" icon={<IconPlus />} onClick={() => setAddingEditLeadTag(true)}>添加标签</Button>
                  )}
                </div>
              </Form.Item>
              <Form.Item className="new-lead-form__span-all new-lead-form__textarea" label="客户需求" field="requirement" required rules={[{ required: true, message: '请输入客户需求' }, { maxLength: 500, message: '最多输入 500 个字符' }]}>
                <Input.TextArea rows={4} maxLength={500} showWordLimit placeholder="请简要记录业务背景、目标功能、预算或期望交付时间" />
              </Form.Item>
              <Form.Item className="new-lead-form__span-all new-lead-form__textarea" label="客户其他备注" field="customerNote" rules={[{ maxLength: 500, message: '最多输入 500 个字符' }]}>
                <Input.TextArea rows={3} maxLength={500} showWordLimit placeholder="补充沟通偏好、特殊事项或其他背景" />
              </Form.Item>
              <Form.Item className="new-lead-form__span-all new-lead-form__upload" label={`附件管理（${editLeadUploadItems.length}/10）`}>
                <Upload
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  limit={10}
                  drag
                  autoUpload={false}
                  fileList={editLeadUploadItems}
                  onChange={setEditLeadUploadItems}
                  onRemove={(file) => {
                    setEditLeadUploadItems((current) => current.filter((item) => item.uid !== file.uid));
                    return false;
                  }}
                  onPreview={(file) => {
                    if (file.url) window.open(file.url, '_blank', 'noopener,noreferrer');
                  }}
                  onExceedLimit={() => Message.warning('线索附件最多上传 10 个')}
                >
                  <div className="new-lead-form__upload-content">
                    <IconUpload />
                    <div>点击或拖拽文件到此处上传</div>
                    <span>支持图片、PDF、Word、Excel；点击文件列表删除图标可移除附件，保存后生效</span>
                  </div>
                </Upload>
              </Form.Item>
            </div>
          </section>
        </Form>
      </Modal>

      <SelectQuoteModeModal
        visible={quoteModeVisible}
        leadName={lead?.name || dispatchLead?.name || ''}
        customerName={lead?.customer || dispatchLead?.customer}
        contactName={lead?.contact || dispatchLead?.contact}
        contactPhone={lead?.phone || dispatchLead?.phone}
        defaultFlowMode={quoteFlowMode}
        onCancel={() => setQuoteModeVisible(false)}
        onSubmit={async ({ flowMode, projectName }) => {
          try {
            setQuoteFlowMode(flowMode);
            const targetLeadId = profileLeadId || id || '';
            const safeCustomer = lead?.customer || dispatchLead?.customer || '';
            const safeContact = lead?.contact || dispatchLead?.contact || '';
            const safePhone = lead?.phone || dispatchLead?.phone || '';
            const safeOwner = lead?.owner || dispatchLead?.owner;

            const newId = await createQuote(
              targetLeadId,
              [],
              {
                projectName,
                customerName: safeCustomer,
                customerContact: safeContact,
                customerPhone: safePhone,
              },
              { flowMode, salesOwnerName: safeOwner }
            );

            const customer = customers.find(
              // 客户主档 id 在 LeadDetailInfo 上（lead.customerId）；列表项 LeadListItem 没有该字段。
              (item) => item.id === lead?.customerId || (safeCustomer && item.name === safeCustomer)
            );
            if (customer) {
              await updateQuote(newId, (current) => ({
                ...current,
                customerId: customer.id,
                customerSnapshot: buildCustomerSnapshot(customer),
              }));
            }

            setQuoteModeVisible(false);
            Message.success(`已成功创建「${flowMode === 'file' ? '文件流转' : '数据流转'}」新报价单`);
            setQuotationDrawerQuoteId(newId);
            setQuotationDrawerVisible(true);
          } catch (err: any) {
            console.error('Failed to create quote:', err);
            Message.error(err?.message || '创建报价单失败，请重试');
          }
        }}
      />

      <LeadFollowUpModal
        visible={followVisible}
        submitting={followSubmitting}
        defaultStatus={lead?.status || '初步沟通'}
        defaultIntention={lead?.level}
        onCancel={() => setFollowVisible(false)}
        onSubmit={saveFollowUp}
      />

      {/* 新增演示环境 Modal */}
      <Modal title="新增演示环境" visible={demoModalVisible} onOk={() => { demoForm.validate().then((values) => { setDemos([...demos, { id: `dm${Date.now()}`, ...values }]); Message.success('已添加'); setDemoModalVisible(false); }); }} onCancel={() => setDemoModalVisible(false)} style={{ width: 480 }}>
        <Form form={demoForm} layout="vertical">
          <Form.Item label="环境类型" field="type" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="原型演示">原型演示</Select.Option><Select.Option value="测试环境">测试环境</Select.Option><Select.Option value="预发布环境">预发布环境</Select.Option><Select.Option value="正式环境">正式环境</Select.Option></Select></Form.Item>
          <Form.Item label="访问地址" field="url" rules={[{ required: true }]}><Input placeholder="请输入 URL" /></Form.Item>
          <Form.Item label="说明" field="description"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上传资料"
        visible={docModalVisible}
        onOk={saveDocument}
        onCancel={() => { setDocModalVisible(false); setDocUploadItems([]); docForm.resetFields(); }}
        okText="确认上传"
        cancelText="取消"
        style={{ width: 560 }}
      >
        <Form form={docForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <Form.Item label="资料类型" field="type" rules={[{ required: true, message: '请选择资料类型' }]}>
                <Select placeholder="请选择">
                  <Select.Option value="确认书">确认书</Select.Option>
                  <Select.Option value="需求文档">需求文档</Select.Option>
                  <Select.Option value="报价单">报价单</Select.Option>
                  <Select.Option value="原型文件">原型文件</Select.Option>
                  <Select.Option value="其他">其他</Select.Option>
                </Select>
              </Form.Item>
            </Grid.Col>
            <Grid.Col span={12}>
              <Form.Item label="资料来源" field="source" rules={[{ required: true, message: '请选择资料来源' }]}>
                <Select placeholder="请选择">
                  <Select.Option value="客户签署">客户签署</Select.Option>
                  <Select.Option value="客户提供">客户提供</Select.Option>
                  <Select.Option value="内部上传">内部上传</Select.Option>
                  <Select.Option value="报价模块">报价模块</Select.Option>
                </Select>
              </Form.Item>
            </Grid.Col>
          </Grid.Row>
          <Form.Item label="资料文件" required>
            <Upload
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              limit={1}
              drag
              autoUpload={false}
              fileList={docUploadItems}
              onChange={(files) => setDocUploadItems(files.slice(-1))}
              onRemove={(file) => {
                setDocUploadItems((current) => current.filter((item) => item.uid !== file.uid));
                return false;
              }}
              onExceedLimit={() => Message.warning('每次只能上传一个资料文件')}
            >
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 28, color: 'rgb(var(--primary-6))' }} />
                <div style={{ marginTop: 8 }}>点击或拖拽资料文件到此处</div>
                <Text type="secondary" style={{ fontSize: 12 }}>支持图片、PDF、Word、Excel 和 ZIP</Text>
              </div>
            </Upload>
          </Form.Item>
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
        contracts={relatedContracts.filter((contract) => contract.status !== 'voided')}
        collections={visibleLeadCollections}
        editingCollectionId={editingCollectionId}
        onOk={saveCollection}
        onCancel={() => setCollectionModalVisible(false)}
      />

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
      <Drawer title="出差详情与审批流" width={520} visible={Boolean(travelDetailId)} onCancel={() => setTravelDetailId(null)} footer={null}>
        {travels.filter((item) => item.id === travelDetailId).map((item) => <div key={item.id}><Descriptions column={1} data={[{ label: '目的地', value: item.destination }, { label: '事由', value: item.purpose }, { label: '申请人', value: item.applicant }, { label: '日期', value: `${item.startDate} ~ ${item.endDate}` }, { label: '金额', value: money(item.amount) }, { label: '审批号', value: item.approvalNo }]} /><Divider /><Timeline><Timeline.Item dotColor="green">提交申请 · {item.applicant}</Timeline.Item><Timeline.Item dotColor="green">部门负责人审批通过</Timeline.Item><Timeline.Item dotColor="green">财务审批通过 · {item.status}</Timeline.Item></Timeline></div>)}
      </Drawer>
      <Drawer title="报销详情与审批流" width={520} visible={Boolean(reimbursementDetailId)} onCancel={() => setReimbursementDetailId(null)} footer={null}>
        {reimbursements.filter((item) => item.id === reimbursementDetailId).map((item) => <div key={item.id}><Descriptions column={1} data={[{ label: '报销类型', value: item.type }, { label: '说明', value: item.description }, { label: '申请人', value: item.applicant }, { label: '金额', value: money(item.amount) }, { label: '审批号', value: item.approvalNo }]} /><Divider /><Timeline><Timeline.Item dotColor="green">提交报销 · {item.applicant}</Timeline.Item><Timeline.Item dotColor="green">直属负责人审批通过</Timeline.Item><Timeline.Item dotColor="green">财务审批通过 · {item.status}</Timeline.Item></Timeline></div>)}
      </Drawer>

      {/* 阶段推进流转弹窗 */}
      <Modal
        title={`阶段推进：流转至「${advanceTargetStatus}」`}
        visible={advanceModalVisible}
        onOk={submitStageAdvance}
        onCancel={() => setAdvanceModalVisible(false)}
        confirmLoading={advanceSubmitting}
        okText="确认推进阶段"
        cancelText="取消"
        style={{ width: 480 }}
      >
        <Form layout="vertical">
          <Form.Item label="目标阶段与状态" required>
            <Select value={advanceTargetStatus} onChange={setAdvanceTargetStatus}>
              {SALES_STATUS_LIST.map((status) => (
                <Select.Option key={status} value={status}>{status}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="推进要点说明">
            <Input.TextArea
              value={advanceNote}
              onChange={setAdvanceNote}
              placeholder="请填写本次推进的核心达成项、客户反馈或后续计划..."
              rows={3}
            />
          </Form.Item>
          <Form.Item label="安排下次跟进时间">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              value={advanceNextFollowTime}
              onChange={setAdvanceNextFollowTime}
              style={{ width: '100%' }}
              placeholder="请选择下次跟进计划时间"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
