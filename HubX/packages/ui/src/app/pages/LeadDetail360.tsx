import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
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
import type { LeadDetailInfo, ClueType, FollowUpRecord } from './leads/types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_LIST,
  INTENTION_LEVEL_LIST,
  CUSTOMER_LEVEL_LIST,
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  COMPANY_ENTITY_LIST,
} from './leads/types';
import { channelLabel } from '@/app/pages/lead-dispatch/channelDictionary';
import { BUSINESS_LINE_LABEL, type LeadBusinessLine } from '@/app/pages/lead-dispatch/types';
import { leadDispatchView } from '@/app/pages/lead-dispatch/kpiCalc';
import { getLeadDetailProfile } from './leads/leadDetailProfiles';
import {
  applyLeadEdit,
  findLeadByRouteId,
  mergeLeadDetail,
  type LeadEditValues,
} from './leads/leadDetailEdit';
import { initialEmployees } from './employee/mockData';
import {
  leadAttachmentsToUploadItems,
  uploadItemsToLeadAttachments,
} from './leads/leadAttachments';
import { LeadAttachmentPanel } from './leads/components/LeadAttachmentPanel';
import { LeadFollowUpModal, type LeadFollowUpFormValues } from './leads/components/LeadFollowUpModal';
import { LeadFinalContractPanel } from './leads/components/LeadFinalContractPanel';
import { WeChatIcon } from '@/app/components/ui';
import './leads/components/NewLeadModal.css';
import { useLeads } from '@/app/leads/LeadContext';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';
import { buildLeadContextFromDetail } from './contracts/leadContextMock';
import { useContracts } from './contracts/ContractsContext';
import { useTodos } from '@/app/todos/TodoContext';
import { useCustomers } from './customers/CustomerContext';
import { buildCustomerSnapshot } from './customers/customerModel';
import type { Contract, ContractStatus } from './contracts/types';
import { computePlanStatusRows, effectiveAmount } from './contracts/paymentUtils';
import { useCollections } from '@/app/collections/CollectionContext';
import {
  allocateCollectionAmount,
  collectionsForProject,
  getCollectionPeriods,
  sumReceived,
  type CollectionLedgerEntry,
  type CollectionPeriod,
} from '@/services/collectionMutations';
import { useQuotation } from './quotation/QuotationContext';
import { QuotationWorkbench } from './quotation/QuotationWorkbench';
import { QuoteCard } from './quotation/QuoteCard';
import { QUOTE_STATUS_LABELS } from './quotation/types';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessRecordCard,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '@/app/components/ui';
import {
  CollectionRecordModal,
  ContractPaymentInvoicePanel,
  type PaymentInvoiceRecord,
} from './components/ContractPaymentInvoicePanel';

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

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

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

export function LeadDetail360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (
    (location.state as { from?: string } | null)?.from
    || new URLSearchParams(location.search).get('from')
    || 'my'
  );
  const [activeMainTab, setActiveMainTab] = useState('basic');
  const [activeSideTab, setActiveSideTab] = useState('follow');
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
  const { createQuote, quotes, updateQuote } = useQuotation();
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
    const state = location.state as { activeMainTab?: string; activeSideTab?: string } | null;
    if (state?.activeSideTab) {
      setActiveSideTab(state.activeSideTab);
      return;
    }
    if (state?.activeMainTab === 'contracts-history') {
      setActiveSideTab('contract-records');
    }
  }, [location.state]);

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
          title: `跟进 ${lead.name}`,
          content: values.content.trim(),
          assigneeId: dispatchLead?.owner || lead.owner || CURRENT_LOGIN_USER.id,
          assigneeName: dispatchLead?.owner || lead.owner || CURRENT_LOGIN_USER.name,
          status: 'pending',
          priority: lead.customerLevel === 'S' ? 'high' : 'medium',
          createdAt: completedAt,
          deadline: nextFollowTime,
          route: `/leads/${id}`,
        });
      }
      setFollowUps(await getFollowUps(serviceLeadId));
      setLeadOverride((current) => ({
        ...current,
        status: values.customerStatus,
        level: values.intentionLevel ?? lead.level,
        nextFollowTime: nextFollowTime ?? '',
        followCount: (lead.followCount ?? 0) + 1,
      }));
      Message.success('跟进记录已保存');
      setFollowVisible(false);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '跟进记录保存失败，请重试');
    } finally {
      setFollowSubmitting(false);
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
        steps={LIFECYCLE_STEPS.map((step, index) => ({
          key: step.key,
          title: step.label,
          description:
                index === 4 && lead.status === '已签单' ? '进行中' :
                index === 5 && lead.status === '已签单' ? '待完成' :
                undefined,
        }))}
      />

      <ProcessMetricGrid
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
      <ProcessWorkspace>
        {/* 左侧主区域 (70%) */}
        <ProcessWorkspaceMain>
          {/* 关键信息档案卡 */}
          <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{lead.name}</span>
            </div>
            <Grid.Row gutter={[8, 4]}>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>来源</Text> <Tag color="gray" size="small" style={{ color: 'var(--color-text-1)', background: 'var(--color-fill-2)' }}>{channelLabel(lead.source)}</Tag></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>客资成本</Text> <Text style={{ fontSize: 14 }}>{lead.customerCost || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>客户称呼</Text> <Text style={{ fontSize: 14 }}>{lead.customerTitle || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>电话</Text> <Text style={{ fontSize: 14 }}>{lead.phone || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>微信</Text> <Text style={{ fontSize: 14 }}>{lead.wechat || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>对接主体</Text> <Text style={{ fontSize: 14 }}>{lead.entity}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>创建人</Text> <Text style={{ fontSize: 14 }}>{lead.creator}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>优化师</Text> <Text style={{ fontSize: 14 }}>{lead.optimizer || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>协助人</Text> <Text style={{ fontSize: 14 }}>{lead.assistant || '-'}</Text></Grid.Col>
            </Grid.Row>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>初始需求</Text>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-1)' }}>{lead.requirement || lead.initialRequirement || '-'}</div>
            </div>
          </Card>

          <LeadAttachmentPanel
            attachments={lead.attachments ?? []}
            onManage={openEditLead}
          />

          {/* 左侧 3 个 Tab */}
          <Card size="small">
            <Tabs activeTab={activeMainTab} onChange={setActiveMainTab} type="card">
              <TabPane key="basic" title="基础信息" />
              <TabPane key="contracts" title="合同信息" />
              <TabPane key="payments" title="回款与发票" />
            </Tabs>

            <div style={{ marginTop: 16 }}>
              {/* 基础信息 */}
              {activeMainTab === 'basic' && (
                <Descriptions
                  column={4}
                  size="small"
                  data={[
                    { label: '对接主体', value: lead.entity },
                    { label: '线索意向', value: lead.intention || '-' },
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

              {/* 合同信息 */}
              {activeMainTab === 'contracts' && (
                <div>
                  <Card size="small" title="正式主合同" style={{ marginBottom: 12 }}>
                    {mainContract ? (
                      <LeadFinalContractPanel contract={mainContract} projectLayout projectFullInfo />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无关联合同</div>
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
              )}
            </div>
          </Card>

          {/* 项目交付执行（独立板块） */}
          <Card size="small" title="项目交付执行">
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
          </Card>
        </ProcessWorkspaceMain>

        {/* 右侧业务过程 (30%) */}
        <ProcessWorkspaceAside>
          {/* 售前聊天群分析（独立板块） */}
          {lead.presalesGroupName && (
            <Card size="small" title="售前聊天群分析">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <WeChatIcon />
                <Text style={{ fontWeight: 500 }}>{lead.presalesGroupName}</Text>
              </div>
              <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14, color: 'var(--color-text-2)' }}>
                <Text type="secondary">AI 摘要分析</Text>
                <div style={{ marginTop: 8 }}>
                  客户对小程序点餐系统需求明确，重点关注多门店管理和微信支付对接。已确认基础功能清单，待确认抖音端增项需求。
                </div>
              </div>
            </Card>
          )}

          {/* 右侧 7 个 Tab */}
          <Card size="small" style={{ flex: 1 }}>
            <Tabs activeTab={activeSideTab} onChange={setActiveSideTab} type="card" size="small">
              <TabPane key="follow" title="跟进" />
              <TabPane key="quotation" title="报价" />
              <TabPane key="contract-records" title="合同" />
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
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setFollowVisible(true)}>写跟进</Button>
                  </div>
                  <Timeline>
                    {followUps.filter((r) => r.leadId === id || r.leadId === '5940').map((record, index) => (
                      <Timeline.Item key={record.id} dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Tag color="blue" size="small">{record.method}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.createdAt}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>· {record.creator}</Text>
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--color-text-1)', marginBottom: 4 }}>{record.content}</div>
                          {record.nextFollowTime && (
                            <Text type="secondary" style={{ fontSize: 12 }}>下次跟进: {record.nextFollowTime}</Text>
                          )}
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
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
                      onClick={() => setQuoteModeVisible(true)}
                    >
                      新建报价
                    </Button>
                  </div>
                  {(() => {
                    const leadQuotes = quotes.filter((q) => q.leadId === id);
                    const active = leadQuotes.filter((q) => q.status !== 'voided');
                    const voided = leadQuotes.filter((q) => q.status === 'voided');
                    if (leadQuotes.length === 0) {
                      return <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无报价记录</div>;
                    }
                    return (
                      <div>
                        {active.map((q) => (
                          <QuoteCard
                            key={q.id}
                            quote={q}
                            onOpen={() => {
                              setQuotationDrawerQuoteId(q.id);
                              setQuotationDrawerVisible(true);
                            }}
                          />
                        ))}
                        {voided.length > 0 && (
                          <>
                            <div style={{ borderTop: '1px dashed var(--color-border-3)', margin: '12px 0' }} />
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>已作废</Text>
                            {voided.map((q) => (
                              <ProcessRecordCard
                                key={q.id}
                                muted
                                title={<span style={{ textDecoration: 'line-through' }}>{q.basicInfo.projectName}</span>}
                                tags={(
                                  <>
                                  <Tag color="arcoblue" size="small">{q.version}</Tag>
                                  <Tag size="small" color="gray">{QUOTE_STATUS_LABELS[q.status]}</Tag>
                                  </>
                                )}
                                identifier={q.quoteNo}
                                notice={`作废原因：${q.timeline.find((t) => t.action === 'mark_voided')?.note || '未知原因'}`}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 合同记录 */}
              {activeSideTab === 'contract-records' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreateContract}>新建合同</Button>
                  </div>
                  {relatedContracts.map((c) => (
                    <ProcessRecordCard
                      key={c.id}
                      title={c.current.contractName}
                      tags={<Tag color={CONTRACT_STATUS_COLORS[c.status]} size="small">{CONTRACT_STATUS_LABELS[c.status]}</Tag>}
                      actions={<Tooltip content="查看合同详情"><span className="hubx-process-record-card__indicator"><IconArrowRight /></span></Tooltip>}
                      identifier={c.contractNo}
                      onClick={() => handleViewContractDetail(c.id)}
                      ariaLabel={`查看合同${c.current.contractName}详情`}
                      summary={(
                        <>
                          <span>签约主体 <strong>{c.current.signingEntity}</strong></span>
                          <span>合同金额 <strong>{money(c.current.totalAmount)}</strong></span>
                        </>
                      )}
                    />
                  ))}
                  {relatedContracts.length === 0 && profile.demoContracts?.map((c) => {
                    const contractStatusColor = c.status === '已归档' || c.status === '已盖章' ? 'green' : c.status === '审批通过' ? 'blue' : 'orange';
                    const liveMatch = allContracts.find((contract) => contract.id === c.id);
                    return (
                      <ProcessRecordCard
                        key={c.id}
                        title={c.name}
                        tags={<Tag color={contractStatusColor} size="small">{c.status}</Tag>}
                        actions={liveMatch ? <Tooltip content="查看合同详情"><span className="hubx-process-record-card__indicator"><IconArrowRight /></span></Tooltip> : undefined}
                        identifier={c.contractNo}
                        onClick={liveMatch ? () => handleViewContractDetail(liveMatch.id) : undefined}
                        ariaLabel={liveMatch ? `查看合同${c.name}详情` : undefined}
                        summary={(
                          <>
                            <span>签约主体 <strong>{c.contractEntity}</strong></span>
                            <span>合同金额 <strong>¥{c.amount}</strong></span>
                          </>
                        )}
                      />
                    );
                  })}
                  {relatedContracts.length === 0 && (!profile.demoContracts || profile.demoContracts.length === 0) && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无合同记录</div>
                  )}
                </div>
              )}

              {/* 演示 */}
              {activeSideTab === 'demo' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { demoForm.resetFields(); setDemoModalVisible(true); }}>新增环境</Button>
                  </div>
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
                </div>
              )}

              {/* 资料 */}
              {activeSideTab === 'documents' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconUpload />} onClick={() => { docForm.resetFields(); setDocUploadItems([]); setDocModalVisible(true); }}>上传资料</Button>
                  </div>
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
                </div>
              )}

              {/* 出差 */}
              {activeSideTab === 'travel' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { travelForm.resetFields(); setTravelModalVisible(true); }}>新增出差</Button>
                  </div>
                  {travels.map((travel) => (
                    <ProcessRecordCard
                      key={travel.id}
                      title={`${travel.destination} · ${travel.purpose}`}
                      tags={<Tag color="green" size="small">{travel.status}</Tag>}
                      actions={<Tooltip content="展开出差详情"><span className="hubx-process-record-card__indicator"><IconArrowLeft /></span></Tooltip>}
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
                </div>
              )}

              {/* 报销 */}
              {activeSideTab === 'reimbursement' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { reimbursementForm.resetFields(); setReimbursementModalVisible(true); }}>新增报销</Button>
                  </div>
                  {reimbursements.map((rb) => (
                    <ProcessRecordCard
                      key={rb.id}
                      title={`${rb.type} · ${rb.description}`}
                      tags={<Tag color="green" size="small">{rb.status}</Tag>}
                      actions={<Tooltip content="展开报销详情"><span className="hubx-process-record-card__indicator"><IconArrowLeft /></span></Tooltip>}
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
                </div>
              )}
            </div>
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

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

      <Modal
        title="选择报价工作台"
        visible={quoteModeVisible}
        onCancel={() => setQuoteModeVisible(false)}
        onOk={async () => {
          const newId = await createQuote(id ?? '', [], {
            projectName: lead.name,
            customerName: lead.customer,
            customerContact: lead.contact,
            customerPhone: lead.phone,
          }, { flowMode: quoteFlowMode });
          const customer = customers.find((item) => item.id === dispatchLead?.customerId || item.name === lead.customer);
          if (customer) {
            await updateQuote(newId, (current) => ({ ...current, customerId: customer.id, customerSnapshot: buildCustomerSnapshot(customer) }));
          }
          setQuoteModeVisible(false);
          setQuotationDrawerQuoteId(newId);
          setQuotationDrawerVisible(true);
        }}
        okText="进入报价流程"
        style={{ width: 620 }}
      >
        <Radio.Group value={quoteFlowMode} onChange={setQuoteFlowMode} style={{ width: '100%' }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Radio value="file">
              <div><b>文件流转方式</b><div style={{ color: 'var(--color-text-3)', marginTop: 4 }}>使用 Excel 文件流转功能清单和工时评估。</div></div>
            </Radio>
            <Radio value="online">
              <div><b>在线表单方式</b><div style={{ color: 'var(--color-text-3)', marginTop: 4 }}>各角色在工作台内协作处理结构化表单数据。</div></div>
            </Radio>
          </Space>
        </Radio.Group>
      </Modal>

      <LeadFollowUpModal
        visible={followVisible}
        submitting={followSubmitting}
        defaultStatus={lead.status}
        defaultIntention={lead.level}
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
    </PageShell>
  );
}
