import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  Card,
  Descriptions,
  Badge,
  Button,
  Drawer,
  Timeline,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Message,
  Tabs,
  Grid,
  Tag,
  Divider,
  Upload,
  Alert,
} from '@arco-design/web-react';
import { useReminders } from '@/app/reminders/ReminderContext';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';
import { useContracts } from '@/app/pages/contracts/ContractsContext';
import { useEmployee } from '@/app/pages/employee';
import { buildLeadContextFromDetail } from '@/app/pages/contracts/leadContextMock';
import type { Contract, ContractVersion } from '@/app/pages/contracts/types';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { DocumentUploadPanel } from '@/app/pages/contracts/components/DocumentUploadPanel';
import {
  downloadAttachment,
  formatDateTime,
  mapUploadFilesToAttachments,
} from '@/app/pages/contracts/contractModification';
import { getLeadDetailProfile } from '@/app/pages/leads/leadDetailProfiles';
import { channelLabel } from '@/app/pages/lead-dispatch/channelDictionary';
import { LEAD_SOURCE_LIST, LEAD_SOURCE_LABEL } from '@/app/pages/leads/types';
import { LeadPaymentInvoicePanel } from '@/app/pages/leads/components/LeadPaymentInvoicePanel';
import { LeadFinalContractPanel } from '@/app/pages/leads/components/LeadFinalContractPanel';
import { LeadFeatureListPanel, initialLeadBusinessEnds, type LeadBusinessEnd } from '@/app/pages/leads/components/LeadFeatureListPanel';
import { useQuotation } from '@/app/pages/quotation/QuotationContext';
import { Stage1FeatureList } from '@/app/pages/quotation/stages/Stage1FeatureList';
import { QuotationWorkbench } from '@/app/pages/quotation/QuotationWorkbench';
import { computeAmountBreakdown } from '@/app/pages/quotation/quoteFlow';
import { QUOTE_STATUS_LABELS, type FeatureModule, type Quote } from '@/app/pages/quotation/types';
import { LeadContractHistoryPanel } from '@/app/pages/leads/components/LeadContractHistoryPanel';
import { LeadCustomerCommunicationPanel } from '@/app/pages/leads/components/LeadCustomerCommunicationPanel';
import { ProjectDemoPanel } from '@/app/pages/project-management/ProjectDetailWorkspace';
import { LeadProjectExecutionPanel } from '@/app/pages/leads/components/LeadProjectExecutionPanel';
import { leadProjectBanner } from '@/app/business-case';
import { useProjects } from '@/app/pages/project-management/ProjectContext';
import { useBusinessCases } from '@/app/business-case/BusinessCaseContext';
import { SIGNING_LEAD_STATUSES } from '@/app/business-case/types';
import { spawnUnconfirmedProject, buildUnconfirmedProject, unconfirmedProjectId } from '@/app/business-case/caseUtils';
import {
  IconLeft,
  IconEdit,
  IconPhone,
  IconMessage,
  IconUser,
  IconUserAdd,
  IconSwap,
  IconPlus,
  IconSearch,
  IconUpload,
  IconDelete,
  IconReply,
  IconEye,
} from '@arco-design/web-react/icon';

const { Text: ArcoText } = Typography;
const TabPane = Tabs.TabPane;
const { Row, Col } = Grid;
const FormItem = Form.Item;

const DEMO_TYPE_OPTIONS = [
  '前端',
  '后台',
  'UI',
  '原型',
  '其他',
] as const;

interface LeadDemoRecord {
  id: string;
  name: string;
  url: string;
  type: string;
  uploader: string;
  uploadTime: string;
  description: string;
}

export function normalizeLeadReminderId(id?: string) {
  if (!id) {
    return '';
  }
  return id.startsWith('lead-') ? id : `lead-${id}`;
}

export function LeadDetail({ leadId, initialSideTab }: { leadId?: string; initialSideTab?: string } = {}) {
  const routeParams = useParams();
  const id = leadId ?? routeParams.id;
  const leadReminderId = normalizeLeadReminderId(id);
  const { isLeadReminderActive } = useReminders();
  const hasLeadReminder = isLeadReminderActive(leadReminderId);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (
    (location.state as { from?: string } | null)?.from
    || new URLSearchParams(location.search).get('from')
    || 'my'
  ); // 默认为我的线索，地址参数用于刷新后保留来源。
  const leadProfile = useMemo(() => getLeadDetailProfile(id, from), [id, from]);
  const { leadInfo, quotationHistory, useLiveContracts, demoContracts } = leadProfile;
  const { contracts: allContracts } = useContracts();
  const { employees } = useEmployee();
  const { getProjectByLeadId, addProject } = useProjects();
  const { getByLeadId, upsertCase } = useBusinessCases();
  const [leadStatus, setLeadStatus] = useState(leadInfo.status);
  const useProjectStyleSideTabs = from === 'my' || from === 'public';

  const relatedContracts = useMemo<Contract[]>(() => {
    if (useLiveContracts) {
      return allContracts.filter(contract => contract.leadId === id);
    }
    return demoContracts
      .map(demoContract => allContracts.find(contract => contract.id === demoContract.id))
      .filter((contract): contract is Contract => Boolean(contract));
  }, [allContracts, demoContracts, id, useLiveContracts]);

  const approvedContracts = useMemo(
    () => relatedContracts.filter(contract => (
      Boolean(contract.approvedVersionNo) && contract.status !== 'voided'
    )),
    [relatedContracts],
  );
  const approvedContract = approvedContracts[0];
  const hasApprovedContract = Boolean(approvedContract);

  // 共享 ProjectContext：管理员确认指派后条幅状态即时同步
  const linkedProject = getProjectByLeadId(id);

  const projectBanner = leadProjectBanner(linkedProject);
  // 项目确认指派后（已指派/执行中），线索详情出现「项目执行」主 Tab
  const hasConfirmedProject = Boolean(linkedProject) && projectBanner !== 'pending_confirm';
  const projectBannerText = {
    none: '',
    pending_confirm: '项目待管理员确认并指派产品经理',
    assigned: linkedProject?.owner
      ? `已指派产品经理 ${linkedProject.owner}，等待交付启动`
      : '已指派产品经理，等待交付启动',
    in_execution: `项目执行中${linkedProject?.latestProgress ? `：${linkedProject.latestProgress}` : ''}`,
  }[projectBanner];

  const handleViewContractDetail = (contractId: string) => {
    navigate(`/contracts/${contractId}`, {
      state: {
        contractDetailReturn: {
          pathname: `/leads/${id}`,
          state: { from, activeMainTab: 'contracts-history' },
        },
      },
    });
  };

  const handleCreateContract = () => {
    const latestApproved = quotationHistory.find(
      quote => quote.flowStatus === '已审核' && quote.status === '已报价',
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
          lead: buildLeadContextFromDetail(id ?? '', leadInfo, quotationHistory),
          quoteId: latestApproved?.id,
        },
        from,
      },
    });
  };

  const [followVisible, setFollowVisible] = useState(false);
  const [bindCustomerVisible, setBindCustomerVisible] = useState(false);
  const [editLeadVisible, setEditLeadVisible] = useState(false);
  const [customTagVisible, setCustomTagVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [returnPublicVisible, setReturnPublicVisible] = useState(false);
  const [leadFeatureList, setLeadFeatureList] = useState<LeadBusinessEnd[]>(initialLeadBusinessEnds);
  const { createQuote, quotes } = useQuotation();
  const [quotationDrawerVisible, setQuotationDrawerVisible] = useState(false);
  const [quotationDrawerQuoteId, setQuotationDrawerQuoteId] = useState<string | null>(null);

  const handleStartEval = async () => {
    if (!leadFeatureList.some((end) => end.modules.some((m) => m.features.length > 0))) {
      Message.warning('请先添加功能点，再发起工时评估');
      return;
    }
    const featureModules: FeatureModule[] = leadFeatureList.flatMap((end, endIdx) =>
      end.modules.map((mod, modIdx) => ({
        id: `fm-${endIdx}-${modIdx}`,
        name: mod.name,
        sort: modIdx + 1,
        endpointId: `ep-${endIdx + 1}`,
        subFeatures: mod.features.map((f, fIdx) => ({
          id: `fs-${endIdx}-${modIdx}-${fIdx}`,
          name: f.name,
          description: f.description || '',
          remark: '',
        })),
      })),
    );
    const quoteId = await createQuote(id ?? '', featureModules, {
      projectName: leadInfo.name,
      customerName: leadInfo.customer,
      customerContact: leadInfo.contact,
      customerPhone: leadInfo.phone,
    });
    Message.success('已发起工时评估，流转至技术评估');
    navigate(`/quotation/eval/${quoteId}`);
  };
  const [approvalLinkType, setApprovalLinkType] = useState<'travel' | 'reimbursement' | null>(null);
  const [approvalNoInput, setApprovalNoInput] = useState('');
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('basic');
  const [activeSideTab, setActiveSideTab] = useState(initialSideTab ?? 'follow');
  const [presalesGroupName, setPresalesGroupName] = useState(leadInfo.presalesGroupName || '');

  useEffect(() => {
    const state = location.state as { activeMainTab?: string; activeSideTab?: string } | null;
    if (state?.activeMainTab) {
      setActiveMainTab(state.activeMainTab);
    }
    if (state?.activeSideTab) {
      setActiveSideTab(state.activeSideTab);
    }
  }, [location.state]);

  useEffect(() => {
    setPresalesGroupName(leadInfo.presalesGroupName || '');
  }, [leadInfo.presalesGroupName]);

  useEffect(() => {
    // U4：合同信息、回款与发票 Tab 常驻，不再踢回基础信息
    if (!hasConfirmedProject && activeMainTab === 'project-execution') {
      setActiveMainTab('basic');
    }
  }, [activeMainTab, hasConfirmedProject]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState(['APP', '小程序', '管理系统', '官网', '电商系统', 'CMS', 'OA系统']);
  const [form] = Form.useForm();
  const [bindCustomerForm] = Form.useForm();
  const [editLeadForm] = Form.useForm();
  const [customTagForm] = Form.useForm();
  const [trashForm] = Form.useForm();
  const [demoForm] = Form.useForm();
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState('');
  const followHistory = [
    {
      time: '2026-04-09',
      method: '电话',
      effect: '今天 17:42',
      content: '初步接定',
      operator: '张三',
      attachments: [
        { id: 'follow-1-1', name: '会议纪要.pdf', size: '1.2MB' },
        { id: 'follow-1-2', name: '需求截图.png', size: '456KB' },
      ],
    },
    {
      time: '2026-04-07',
      method: '电话',
      effect: '今天 17:42',
      content: '未接通',
      operator: '张三',
      attachments: [],
    },
    {
      time: '2026-04-05',
      method: '认领',
      effect: '未接通',
      content: '',
      operator: '张三',
      attachments: [],
    },
  ];

  const travelApplications = [
    {
      id: '1',
      applicant: '张三',
      department: '销售部',
      destination: '北京',
      startDate: '2026-04-15',
      endDate: '2026-04-17',
      duration: '3天',
      estimatedCost: '3,500',
      purpose: '客户需求调研及方案沟通',
      approver: '李经理',
      status: '已审批',
      createTime: '2026-04-08 09:30',
      approvalFlow: [
        { step: '发起申请', approver: '张三', status: 'approved', time: '2026-04-08 09:30', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'approved', time: '2026-04-08 15:20', comment: '同意出差' },
        { step: '终审', approver: '王五 - 财务审核', status: 'approved', time: '2026-04-09 10:15', comment: '费用合理，准予出差' },
      ],
    },
    {
      id: '2',
      applicant: '李四',
      department: '技术部',
      destination: '上海',
      startDate: '2026-04-20',
      endDate: '2026-04-22',
      duration: '3天',
      estimatedCost: '4,200',
      purpose: '技术交流与项目实施',
      approver: '王总监',
      status: '待审批',
      createTime: '2026-04-10 14:20',
      approvalFlow: [
        { step: '发起申请', approver: '李四', status: 'approved', time: '2026-04-10 14:20', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'rejected', time: '2026-04-10 16:45', comment: '本次出差费用预算填报有误，招待费占比过高，请按照公司最新差旅标准核减后再报。' },
        { step: '终审', approver: '王五 - 财务审核', status: 'pending', time: '', comment: '' },
      ],
    },
  ];

  const reimbursementApplications = [
    {
      id: '1',
      applicant: '张三',
      department: '销售部',
      expenseType: '差旅费',
      invoiceAmount: '1,200',
      reimbursementAmount: '1,200',
      invoiceTitle: '北京科技有限公司',
      taxNumber: '91110000XXXXXXXXXX',
      invoiceType: '增值税专用发票',
      approver: '李经理',
      attachments: [
        { id: 'att-1-1', name: '发票.pdf', size: '856KB' },
        { id: 'att-1-2', name: '行程单.jpg', size: '1.2MB' },
      ],
      status: '已报销',
      createTime: '2026-04-12 16:20',
      approvalFlow: [
        { step: '发起申请', approver: '张三', status: 'approved', time: '2026-04-12 16:20', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'approved', time: '2026-04-13 09:30', comment: '费用合理，同意报销' },
        { step: '终审', approver: '王五 - 财务审核', status: 'approved', time: '2026-04-13 14:20', comment: '发票真实有效，准予报销' },
      ],
    },
    {
      id: '2',
      applicant: '李四',
      department: '技术部',
      expenseType: '招待费',
      invoiceAmount: '3,500',
      reimbursementAmount: '3,200',
      invoiceTitle: '上海商贸公司',
      taxNumber: '91310000YYYYYYYYYY',
      invoiceType: '增值税普通发票',
      approver: '王总监',
      attachments: [
        { id: 'att-2-1', name: '餐饮发票.pdf', size: '652KB' },
      ],
      status: '审批中',
      createTime: '2026-04-10 11:15',
      approvalFlow: [
        { step: '发起申请', approver: '李四', status: 'approved', time: '2026-04-10 11:15', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'pending', time: '', comment: '' },
        { step: '终审', approver: '王五 - 财务审核', status: 'pending', time: '', comment: '' },
      ],
    },
  ];

  const [demoRecords, setDemoRecords] = useState<LeadDemoRecord[]>([
    {
      id: 'demo-1',
      name: 'APP 前端演示',
      url: 'https://demo.hubx.local/app-frontend',
      type: '前端',
      uploader: '张三',
      uploadTime: '2026-04-12 10:20',
      description: '客户演示版前端页面和主流程。',
    },
    {
      id: 'demo-2',
      name: '后台管理原型',
      url: 'https://demo.hubx.local/admin-prototype',
      type: '原型',
      uploader: '李四',
      uploadTime: '2026-04-13 15:40',
      description: '后台权限、合同和回款模块原型。',
    },
  ]);


  const customerList = [
    { id: '1', name: '北京科技有限公司', contact: '张经理', phone: '13800138000' },
    { id: '2', name: '上海商贸公司', contact: '李总', phone: '13900139000' },
    { id: '3', name: '深圳电商公司', contact: '王总', phone: '13600136000' },
    { id: '4', name: '广州金融公司', contact: '赵经理', phone: '13700137000' },
  ];

  const filteredCustomers = customerSearchKeyword
    ? customerList.filter(
        (customer) =>
          customer.name.includes(customerSearchKeyword) ||
          customer.contact.includes(customerSearchKeyword) ||
          customer.phone.includes(customerSearchKeyword)
      )
    : customerList;

  const handleFollow = () => {
    form.validate().then((values) => {
      const newStatus = values.status as string;
      if (newStatus) {
        setLeadStatus(newStatus);

        // 签约开启联动：状态进入合同洽谈/已签单 且 无项目时 spawn
        if (
          (SIGNING_LEAD_STATUSES as readonly string[]).includes(newStatus) &&
          !getProjectByLeadId(id)
        ) {
          const projectId = unconfirmedProjectId({ leadId: id });
          const spawned = spawnUnconfirmedProject({
            caseId: 'case-' + id,
            leadId: id,
            projectId,
          });
          const today = new Date().toISOString().slice(0, 10);
          const fullProject = buildUnconfirmedProject({
            lead: { id, name: leadInfo.name },
            projectId,
            today,
          });
          addProject(fullProject);
          upsertCase(spawned.case);
          Message.success('跟进记录已保存：已生成未确认项目，待管理员确认指派');
        } else {
          Message.success('跟进记录已保存');
        }
      } else {
        Message.success('跟进记录已保存');
      }
      setFollowVisible(false);
      form.resetFields();
    });
  };

  const handleBindCustomer = () => {
    bindCustomerForm.validate().then((values) => {
      console.log(values);
      Message.success('客户主体绑定成功');
      setBindCustomerVisible(false);
      bindCustomerForm.resetFields();
      setCustomerSearchKeyword('');
    });
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    customTagForm.validate().then((values) => {
      const newTag = values.tagName.trim();
      if (newTag && !availableTags.includes(newTag)) {
        setAvailableTags([...availableTags, newTag]);
        setSelectedTags([...selectedTags, newTag]);
        Message.success('标签添加成功');
      } else if (availableTags.includes(newTag)) {
        Message.warning('标签已存在');
      }
      setCustomTagVisible(false);
      customTagForm.resetFields();
    });
  };

  const handleEditLead = () => {
    // 预填充当前线索数据
    setSelectedTags(leadInfo.tags);
    editLeadForm.setFieldsValue({
      name: leadInfo.name,
      contact: leadInfo.contact,
      phone: leadInfo.phone,
      wechat: leadInfo.wechat,
      source: leadInfo.source,
      keyword: leadInfo.keyword,
      level: leadInfo.level,
      entity: leadInfo.entity,
      status: leadInfo.status,
      requirement: leadInfo.requirement,
      presalesGroupName,
    });
    setEditLeadVisible(true);
  };

  const handleEditLeadSubmit = () => {
    editLeadForm.setFieldValue('tags', selectedTags);
    editLeadForm.validate().then((values) => {
      setPresalesGroupName(values.presalesGroupName?.trim() || '');
      console.log(values);
      Message.success('线索更新成功');
      setEditLeadVisible(false);
      editLeadForm.resetFields();
      setSelectedTags([]);
    });
  };

  const handleClaim = () => {
    Message.success('线索认领成功');
  };

  const handleTransfer = () => {
    Message.info('转让功能开发中');
  };

  const handleAbandon = () => {
    Modal.confirm({
      title: '确认放弃线索?',
      content: '放弃后线索将回到公海线索',
      onOk: () => {
        Message.success('已放弃线索');
        navigate('/leads/public');
      },
    });
  };

  const handleMarkAsTrash = () => {
    setTrashVisible(true);
  };

  const handleTrashSubmit = () => {
    trashForm.validate().then(() => {
      Message.success('已标记为垃圾线索');
      setTrashVisible(false);
      trashForm.resetFields();
      navigate('/leads/trash');
    });
  };

  const handleReturnToPublic = () => {
    Modal.confirm({
      title: '确认扔回公海?',
      content: '线索将回到公海线索，其他人可以认领',
      onOk: () => {
        Message.success('已扔回公海线索');
        navigate('/leads/public');
      },
    });
  };

  const handleTransformToCustomer = () => {
    Modal.confirm({
      title: '确认转为客户?',
      content: '将自动创建客户记录（名称/联系人/电话/来源从线索填充），线索状态改为「已签单」，历史跟进记录将同步到客户。',
      onOk: () => {
        Message.success('已成功转为客户，线索状态已更新为「已签单」');
        navigate('/leads/closed');
      },
    });
  };

  const handleDeleteLead = () => {
    Modal.confirm({
      title: '确认删除线索?',
      content: '删除后可通过管理员恢复，关联的跟进记录将一并标记删除。',
      onOk: () => {
        Message.success('线索已删除（软删除）');
        navigate('/leads/my');
      },
    });
  };

  const handleAddDemo = () => {
    demoForm.resetFields();
    setDemoModalVisible(true);
  };

  const handleCreateApprovalLink = () => {
    const approvalNo = approvalNoInput.trim();
    if (!approvalNo) {
      Message.error('请填写审批编号');
      return;
    }
    const typeLabel = approvalLinkType === 'travel' ? '出差' : '报销';
    Message.success(`已关联${typeLabel}审批记录：${approvalNo}`);
    setApprovalLinkType(null);
    setApprovalNoInput('');
  };

  const handleSubmitDemo = () => {
    demoForm.validate().then((values) => {
      const nextRecord: LeadDemoRecord = {
        id: `demo-${Date.now()}`,
        name: values.name.trim(),
        url: values.url.trim(),
        type: values.type,
        uploader: '张三',
        uploadTime: formatDateTime(new Date()),
        description: (values.description || '').trim(),
      };

      setDemoRecords((prev) => [nextRecord, ...prev]);
      Message.success('演示记录已新增');
      setDemoModalVisible(false);
      demoForm.resetFields();
    });
  };


  const handleEditProjectStyleContractVersion = (version: ContractVersion) => {
    const contract = relatedContracts[0];
    if (!contract) return;
    navigate('/contracts/new', {
      state: {
        contractEditorReturn: {
          pathname: `/leads/${id}`,
          state: { from, activeSideTab: 'contract-records' },
        },
        contractEditPrefill: {
          contractId: contract.id,
          contractNo: contract.contractNo,
          leadId: contract.leadId,
          quoteId: contract.quoteId,
          createNewVersion: true,
          formData: version.formData,
        },
      },
    });
  };

  const displayLeadValue = (value: string | number | null | undefined) => {
    if (value == null || String(value).trim() === '') return '-';
    return value;
  };
  const leadPhoneOrWechat = Array.from(new Set(
    [leadInfo.phone, leadInfo.wechat].filter(value => value?.trim()),
  )).join(' / ') || '-';
  const clueTypeLabel: Record<string, string> = {
    public: '公海线索',
    assigned: '已分配',
    trash: '垃圾线索',
    hightech: '高科技线索',
  };

  const leadSummaryItems = [
    { label: '线索来源', value: displayLeadValue(channelLabel(leadInfo.source)) },
    { label: '线索类型', value: displayLeadValue(clueTypeLabel[leadInfo.clueType] || leadInfo.clueType) },
    { label: '客户等级', value: displayLeadValue(leadInfo.customerLevel) },
    { label: '客资成本', value: displayLeadValue(leadInfo.customerCost) },
    { label: '客户称呼', value: displayLeadValue(leadInfo.customerTitle) },
    { label: '联系电话/微信', value: leadPhoneOrWechat },
    { label: '创建人', value: displayLeadValue(leadInfo.creator) },
    { label: '优化师', value: displayLeadValue(leadInfo.optimizer) },
    { label: '归属人', value: displayLeadValue(leadInfo.owner) },
    { label: '协助人', value: displayLeadValue(leadInfo.assistant) },
    {
      label: '初始信息及需求',
      value: displayLeadValue(leadInfo.requirement || leadInfo.initialRequirement),
      fullWidth: true,
    },
    { label: '创建时间', value: displayLeadValue(leadInfo.createTime) },
    { label: '下次跟进时间', value: displayLeadValue(leadInfo.nextFollowTime) },
  ];
  const basicTabInfoItems = [
    { label: '对接主体', value: displayLeadValue(leadInfo.entity) },
    { label: '线索意向', value: displayLeadValue(leadInfo.intention) },
    { label: '线索状态', value: displayLeadValue(leadStatus) },
    { label: '客户类型', value: displayLeadValue(leadInfo.customerType) },
    { label: '客户预算', value: displayLeadValue(leadInfo.customerBudget) },
    { label: '客户主体', value: displayLeadValue(leadInfo.customer) },
    { label: '售前群名称', value: displayLeadValue(presalesGroupName) },
    {
      label: '原型图链接',
      value: leadInfo.prototypeLink ? (
        <a href={leadInfo.prototypeLink} target="_blank" rel="noreferrer">{leadInfo.prototypeLink}</a>
      ) : '-',
    },
    { label: '威客 ID', value: displayLeadValue(leadInfo.witkeyId) },
    { label: '威客任务编号', value: displayLeadValue(leadInfo.witkeyTaskNo) },
    { label: '推广关键词', value: displayLeadValue(leadInfo.keyword) },
    {
      label: '意向标签',
      value: leadInfo.tags.length ? (
        <Space>
          {leadInfo.tags.map((tag, index) => (
            <Tag key={index} color="arcoblue" size="small">
              {tag}
            </Tag>
          ))}
        </Space>
      ) : '-',
    },
    { label: '客户信息备注', value: displayLeadValue(leadInfo.customerNote), span: 2 },
  ];
  const technicalEvaluators = employees.map(employee => employee.name);

  return (
    <div className="lead-detail-page">
      <div className="lead-detail-layout">
        <div className="lead-detail-left">
      <Card className="lead-detail-actions">
        <Space style={{ width: '100%', flexWrap: 'wrap' }}>
          <Button key="back" type="text" size="small" icon={<IconLeft />} onClick={() => navigate(-1)}>
            返回
          </Button>
          {from === 'public' && [
            <Button key="public-claim" type="primary" size="small" icon={<IconUserAdd />} onClick={handleClaim}>
              认领
            </Button>,
            <Button key="public-edit" size="small" icon={<IconEdit />} onClick={handleEditLead}>
              编辑
            </Button>,
            <Button key="public-transfer" size="small" icon={<IconSwap />} onClick={handleTransfer}>
              转给他人
            </Button>,
            <Button key="public-trash" size="small" status="danger" icon={<IconDelete />} onClick={handleMarkAsTrash}>
              标记为垃圾
            </Button>,
            <Button key="public-delete" size="small" status="danger" icon={<IconDelete />} onClick={handleDeleteLead}>
              删除
            </Button>
          ]}
          {from === 'trash' && [
            <Button key="trash-edit" size="small" icon={<IconEdit />} onClick={handleEditLead}>
              编辑
            </Button>,
            <Button key="trash-transfer" size="small" icon={<IconSwap />} onClick={handleTransfer}>
              转给他人
            </Button>,
            <Button key="trash-return" size="small" type="primary" icon={<IconReply />} onClick={handleReturnToPublic}>
              扔回公海
            </Button>,
            <Button key="trash-delete" size="small" status="danger" icon={<IconDelete />} onClick={handleDeleteLead}>
              删除
            </Button>
          ]}
          {from === 'closed' && [
            <Button key="closed-edit" size="small" icon={<IconEdit />} onClick={handleEditLead}>
              编辑
            </Button>
          ]}
          {from !== 'public' && from !== 'trash' && from !== 'closed' && [
            <Button key="my-edit" size="small" icon={<IconEdit />} onClick={handleEditLead}>
              编辑
            </Button>,
            <Button key="my-transfer" size="small" icon={<IconSwap />} onClick={handleTransfer}>
              转移给他人
            </Button>,
            <Button key="my-return" size="small" icon={<IconReply />} onClick={handleReturnToPublic}>
              扔回公海
            </Button>,
            <Button key="my-transform" size="small" type="primary" icon={<IconSwap />} onClick={handleTransformToCustomer}>
              转客户
            </Button>,
            <Button key="my-trash" size="small" status="danger" icon={<IconDelete />} onClick={handleMarkAsTrash}>
              标记为垃圾
            </Button>,
            <Button key="my-delete" size="small" status="danger" icon={<IconDelete />} onClick={handleDeleteLead}>
              删除
            </Button>
          ]}
        </Space>

        <Divider style={{ margin: '16px 0' }} />
        <div className="lead-detail-summary-title">
          【{displayLeadValue(leadInfo.name)}】
        </div>
        {projectBanner !== 'none' && projectBannerText ? (
          <Alert
            style={{ margin: '12px 0 0' }}
            type={projectBanner === 'pending_confirm' ? 'warning' : projectBanner === 'in_execution' ? 'info' : 'success'}
            content={
              <Space>
                <span>{projectBannerText}</span>
                {linkedProject ? (
                  <Button
                    type="text"
                    size="mini"
                    onClick={() => navigate(`/projects/${linkedProject.id}`)}
                  >
                    打开项目
                  </Button>
                ) : null}
              </Space>
            }
          />
        ) : null}
        <div className="lead-detail-summary-grid">
          {leadSummaryItems.map((item) => (
            <div
              key={item.label}
              className={`lead-detail-summary-item${item.fullWidth ? ' lead-detail-summary-item-full' : ''}`}
            >
              <span className="lead-detail-summary-label">{item.label}：</span>
              <span className="lead-detail-summary-value">{item.value}</span>
            </div>
          ))}
        </div>

        {hasLeadReminder ? (
          <Alert
            type="warning"
            closable={false}
            showIcon
            style={{ marginTop: 16 }}
            content="该线索已超过跟进时间且尚未填写新的跟进记录，请优先处理。"
          />
        ) : null}
      </Card>

        <div className="lead-detail-tab-panel">
        <div className="lead-detail-tab-bar lead-detail-main-tabs">
          <Tabs activeTab={activeMainTab} onChange={setActiveMainTab} headerPadding={false}>
            <TabPane key="basic" title="基础信息" />
            <TabPane key="customer-communication" title="客户沟通" />
            {hasConfirmedProject ? <TabPane key="project-execution" title="项目执行" /> : null}
            {/* U4：合同信息、回款与发票 Tab 常驻 */}
            <TabPane key="contracts-history" title="合同信息" />
            <TabPane key="payments-invoice" title="回款与发票" />
          </Tabs>
        </div>

        <div className="lead-detail-left-body">
        {activeMainTab === 'basic' && (
          <Card className="lead-detail-main-content">
                <div style={{ padding: '16px 0' }}>
                  <Descriptions
                    column={2}
                    labelStyle={{ width: 120 }}
                    data={basicTabInfoItems}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
                    <Divider orientation="left" style={{ margin: 0, flex: 1, minWidth: 0, width: 'auto' }}>客户主体信息</Divider>
                    <Button size="small" type="primary" onClick={() => setBindCustomerVisible(true)} style={{ marginLeft: 16 }}>
                      绑定客户主体
                    </Button>
                  </div>
                  <Descriptions
                    column={2}
                    labelStyle={{ width: 120 }}
                    style={{ marginTop: 16 }}
                    data={[
                      { label: '主体名称', value: '武汉某某' },
                      { label: '主体全称', value: '武汉某某科技有限公司' },
                      { label: '通讯地址', value: '湖北省武汉市洪山区光谷软件园D座 10-5' },
                      { label: '公司电话', value: '7801565768' },
                      { label: '电子邮箱', value: '7801565768@qq.com' },
                    ]}
                  />
                </div>
          </Card>
        )}

        {activeMainTab === 'customer-communication' && (
          <LeadCustomerCommunicationPanel
            groupName={presalesGroupName}
            leadId={id || ''}
            leadName={leadInfo.name}
            assignees={employees.filter((employee) => employee.employmentStatus !== '离职').map((employee) => ({ id: employee.id, name: employee.name }))}
            defaultAssigneeId={employees.find((employee) => employee.name === leadInfo.owner)?.id}
          />
        )}

        {hasConfirmedProject && activeMainTab === 'project-execution' && linkedProject ? (
          <LeadProjectExecutionPanel project={linkedProject} />
        ) : null}

        {/* U4：合同信息 Tab 常驻，无合同显示空态 */}
        {activeMainTab === 'contracts-history' && (
          <div className="lead-detail-main-content">
              <Card bordered={false}>
                {approvedContract ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <LeadFinalContractPanel contract={approvedContract} projectLayout projectFullInfo />
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
                    暂无合同信息。从已确认报价生成合同后，此处将展示合同详情。
                  </div>
                )}
              </Card>
          </div>
        )}

        {/* U4：回款与发票 Tab 常驻，无已批准合同显示空态 */}
        {activeMainTab === 'payments-invoice' && (
          <div className="lead-detail-main-content">
              <Card bordered={false}>
                {approvedContract ? (
                  <LeadPaymentInvoicePanel
                    contractAmount={approvedContract.current.totalAmount}
                    projectMode
                    customerInvoiceInfo={{
                      customerName: approvedContract.current.customerName,
                      taxpayerId: approvedContract.current.customerTaxNo,
                      address: approvedContract.current.customerAddress,
                      phone: approvedContract.current.customerPhone,
                      bankName: approvedContract.current.bankName,
                      bankAccount: approvedContract.current.bankAccount,
                      recipientName: approvedContract.current.customerContact,
                      recipientPhone: approvedContract.current.customerPhone,
                      recipientEmail: approvedContract.current.customerEmail,
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
                    暂无已批准合同，回款在合同详情中登记。
                  </div>
                )}
              </Card>
          </div>
        )}

        </div>
        </div>
      </div>

      <div className="lead-detail-right">
        <div className="lead-detail-tab-panel">
        <div className="lead-detail-tab-bar lead-detail-side-tabs">
          <Tabs
            activeTab={activeSideTab}
            onChange={setActiveSideTab}
            headerPadding={false}
            size="small"
          >
            <TabPane key="follow" title="跟进" />
            <TabPane key="quotation" title="报价" />
            <TabPane key="contract-records" title="合同记录" />
            <TabPane key="demo" title="演示" />
            <TabPane key="documents" title="资料" />
            <TabPane key="travel" title="出差" />
            <TabPane key="reimbursement" title="报销" />
          </Tabs>
        </div>

        <div className="lead-detail-right-body">
        {activeSideTab === 'follow' && (
          <div className="lead-detail-side-content">
              <Card
                bordered={false}
                extra={
                  <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setFollowVisible(true)}>
                    记录
                  </Button>
                }
              >
                <Timeline>
                  {followHistory.map((item, index) => (
                    <Timeline.Item
                      key={index}
                      dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Space>
                            <Tag key={`tag-${index}`} color="blue" size="small">跟进方式: {item.method}</Tag>
                            <ArcoText key={`text-${index}`} type="secondary" style={{ fontSize: 12 }}>
                              {item.effect}
                            </ArcoText>
                          </Space>
                        </div>
                        {item.content && (
                          <div style={{ color: 'var(--color-text-1)', marginBottom: 4 }}>
                            {item.content}
                          </div>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <div style={{ marginTop: 8, marginBottom: 8 }}>
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              {item.attachments.map((file: any) => (
                                <div
                                  key={file.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 10px',
                                    background: 'var(--color-fill-2)',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 500 }}>{file.name}</span>
                                    <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: '12px' }}>
                                      {file.size}
                                    </span>
                                  </div>
                                  <Button
                                    type="text"
                                    size="mini"
                                    onClick={() => Message.info(`下载文件: ${file.name}`)}
                                  >
                                    下载
                                  </Button>
                                </div>
                              ))}
                            </Space>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <div style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
                            操作人: {item.operator}
                          </div>
                          <Space size="small">
                            {(() => {
                              // 24h 限制：跟进创建超过 24 小时后不能修改/删除
                              const recordTime = new Date(item.time || Date.now());
                              const now = new Date();
                              const hoursDiff = (now.getTime() - recordTime.getTime()) / (1000 * 60 * 60);
                              const canEdit = hoursDiff < 24;
                              return canEdit ? (
                                <>
                                  <Button type="text" size="mini" onClick={() => Message.info('编辑跟进记录')}>
                                    编辑
                                  </Button>
                                  <Button type="text" size="mini" status="danger" onClick={() => Message.info('删除跟进记录')}>
                                    删除
                                  </Button>
                                </>
                              ) : (
                                <ArcoText type="secondary" style={{ fontSize: 11 }}>超过24小时不可修改</ArcoText>
                              );
                            })()}
                          </Space>
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
          </div>
        )}

        {activeSideTab === 'contract-records' && (
          <div className="lead-detail-side-content">
            <LeadContractHistoryPanel
              contract={relatedContracts[0]}
              onCreateContract={handleCreateContract}
              onContractClick={handleViewContractDetail}
              hideHistorySummary
              hideAddVersion
              hideVersionChangeTypes
              hideEmptyApprovalRecords
              hideContractDetailAction
              projectCompactVersionLayout
              hideFinalArchiveUntilApproved
              approvalOverviewAtTop
              approvalMode="general-manager"
              onEditVersion={handleEditProjectStyleContractVersion}
            />
          </div>
        )}

        {activeSideTab === 'quotation' && (
          <div className="lead-detail-side-content">
            {(() => {
              const leadQuotes = quotes.filter((q) => q.leadId === id);
              const active = leadQuotes.filter((q) => q.status !== 'voided');
              const voided = leadQuotes.filter((q) => q.status === 'voided');
              return (
                <Card
                  bordered={false}
                  extra={
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={async () => {
                      const newId = await createQuote(id ?? '', [], {
                        projectName: leadInfo.name,
                        customerName: leadInfo.customer,
                        customerContact: leadInfo.contact,
                        customerPhone: leadInfo.phone,
                      });
                      setQuotationDrawerQuoteId(newId);
                      setQuotationDrawerVisible(true);
                    }}>新建报价</Button>
                  }
                >
                  {leadQuotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--color-text-3)' }}>
                      暂无报价记录
                    </div>
                  ) : (
                    <div>
                      {active.map((q) => (
                        <QuoteCard key={q.id} quote={q} onOpen={() => { setQuotationDrawerQuoteId(q.id); setQuotationDrawerVisible(true); }} />
                      ))}
                      {voided.length > 0 && (
                        <>
                          <div style={{ borderTop: '1px dashed var(--color-border-3)', margin: '12px 0' }} />
                          <ArcoText type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>已作废</ArcoText>
                          {voided.map((q) => (
                            <div key={q.id} style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 8, opacity: 0.5, background: 'var(--color-fill-1)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <ArcoText bold style={{ textDecoration: 'line-through' }}>{q.basicInfo.projectName}</ArcoText>
                                <Tag color="arcoblue" size="small">{q.version}</Tag>
                                <Tag size="small" color="gray">{QUOTE_STATUS_LABELS[q.status]}</Tag>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>{q.quoteNo}</div>
                              {/* 作废原因 */}
                              <div style={{ fontSize: 12, color: 'rgb(var(--red-6))', background: 'rgb(var(--red-1))', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>
                                作废原因：{q.timeline.find((t) => t.action === 'mark_voided')?.note || '未知原因'}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })()}
          </div>
        )}

        {activeSideTab === 'demo' && (
          <div className="lead-detail-side-content">
            {useProjectStyleSideTabs ? <ProjectDemoPanel /> : <Card
              bordered={false}
              extra={
                <Button type="primary" size="small" icon={<IconPlus />} onClick={handleAddDemo}>
                  新增记录
                </Button>
              }
            >
              {demoRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--color-text-3)' }}>
                  暂无演示记录
                </div>
              ) : (
                <Timeline>
                  {demoRecords.map((record, index) => (
                    <Timeline.Item
                      key={record.id}
                      dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}
                    >
                      <div style={{ marginBottom: 12, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>
                            {record.name}
                          </span>
                          <Tag color="arcoblue" size="small" style={{ flexShrink: 0 }}>
                            {record.type}
                          </Tag>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6, wordBreak: 'break-all' }}>
                          <span style={{ color: 'var(--color-text-3)' }}>网址：</span>
                          <a href={record.url} target="_blank" rel="noreferrer">
                            {record.url}
                          </a>
                        </div>
                        {record.description && (
                          <div style={{ color: 'var(--color-text-1)', lineHeight: '20px', marginBottom: 8 }}>
                            {record.description}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: '20px' }}>
                          <div>上传人：{record.uploader}</div>
                          <div>上传时间：{record.uploadTime}</div>
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              )}
            </Card>}
          </div>
        )}

        {activeSideTab === 'documents' && (
          <div className="lead-detail-side-content">
            <DocumentUploadPanel />
          </div>
        )}

        {activeSideTab === 'travel' && (
          <div className="lead-detail-side-content">
              <Card
                bordered={false}
                extra={
                  <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setApprovalLinkType('travel')}>
                    出差
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="medium">
                  {travelApplications.map((item) => (
                    <div key={item.id} style={{
                      padding: '16px',
                      background: 'var(--color-fill-2)',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>目的地：{item.destination}</div>
                        <Space size="small">
                          <Tag color={item.status === '已审批' ? 'green' : 'orange'} size="small">{item.status}</Tag>
                          <Button type="text" size="mini" icon={<IconDelete />} status="danger" onClick={() => Message.info('删除出差申请')} />
                        </Space>
                      </div>
                      <div>
                        <div style={{
                          background: 'var(--color-bg-2)',
                          borderRadius: 6,
                          padding: '12px',
                          marginBottom: 12,
                          border: '1px solid var(--color-border-1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>出差周期</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>{item.duration}</div>
                            </div>
                            <div style={{ width: 1, height: 35, background: 'var(--color-border-2)' }}></div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>预估费用</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--orange-6))' }}>¥{item.estimatedCost}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px 16px',
                          marginBottom: 10,
                          fontSize: 14,
                          color: 'var(--color-text-2)'
                        }}>
                          <div>
                            <span style={{ color: 'var(--color-text-3)' }}>申请人：</span>
                            <span style={{ fontWeight: 500 }}>{item.applicant}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-3)' }}>申请部门：</span>
                            <span style={{ fontWeight: 500 }}>{item.department}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-3)' }}>开始时间：</span>
                            <span style={{ fontWeight: 500 }}>{item.startDate}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-3)' }}>结束时间：</span>
                            <span style={{ fontWeight: 500 }}>{item.endDate}</span>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: 'var(--color-text-3)' }}>出差事由：</span>
                            <span style={{ fontWeight: 500 }}>{item.purpose}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>审批流程</div>
                          <div style={{
                            background: 'var(--color-bg-2)',
                            borderRadius: 4,
                            padding: '8px 12px',
                            border: '1px solid var(--color-border-1)'
                          }}>
{item.approvalFlow.map((node, index) => (
                              <div key={index} style={{ position: 'relative', paddingLeft: 24 }}>
                                {/* 连接线 */}
                                {index < item.approvalFlow.length - 1 && (
                                  <div style={{
                                    position: 'absolute',
                                    left: 7,
                                    top: 20,
                                    bottom: -8,
                                    width: 2,
                                    background: node.status === 'approved' ? 'rgb(var(--green-6))' : 'var(--color-border-2)',
                                  }}></div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: index < item.approvalFlow.length - 1 ? 12 : 0 }}>
                                  {/* 状态灯 */}
                                  <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    border: '2px solid',
                                    borderColor: node.status === 'approved' ? 'rgb(var(--green-6))' :
                                                node.status === 'pending' ? 'rgb(var(--orange-6))' :
                                                node.status === 'rejected' ? 'rgb(var(--red-6))' :
                                                'var(--color-border-3)',
                                    background: node.status === 'approved' ? 'rgb(var(--green-6))' :
                                               node.status === 'pending' ? 'rgb(var(--orange-6))' :
                                               node.status === 'rejected' ? 'rgb(var(--red-6))' :
                                               'var(--color-bg-2)',
                                    animation: node.status === 'pending' ? 'pulse 2s infinite' : 'none',
                                  }}></div>

                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)' }}>
                                        {node.step}
                                      </span>
                                      <Tag
                                        color={node.status === 'approved' ? 'green' :
                                              node.status === 'pending' ? 'orange' :
                                              node.status === 'rejected' ? 'red' : 'default'}
                                        size="small"
                                      >
                                        {node.step === '发起申请' && node.status === 'approved' ? '已申请' :
                                         node.status === 'approved' ? '已通过' :
                                         node.status === 'pending' ? '待处理' :
                                         node.status === 'rejected' ? '已驳回' : '未到达'}
                                      </Tag>
                                    </div>

                                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>
                                      {node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}
                                    </div>

                                    {node.time && (
                                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>
                                        操作时间：{node.time}
                                      </div>
                                    )}

                                    {/* 驳回理由高亮卡片 */}
                                    {node.status === 'rejected' && node.comment && (
                                      <div style={{
                                        marginTop: 6,
                                        padding: '8px 10px',
                                        background: 'rgb(var(--red-1))',
                                        border: '1px solid rgb(var(--red-3))',
                                        borderRadius: 4,
                                      }}>
                                        <div style={{ fontSize: 12, color: 'rgb(var(--red-7))', fontWeight: 600, marginBottom: 4 }}>
                                          ⚠️ 驳回理由
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgb(var(--red-6))' }}>
                                          {node.comment}
                                        </div>
                                      </div>
                                    )}

                                    {/* 普通审批意见 */}
                                    {node.status === 'approved' && node.comment && (
                                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
                                        意见：{node.comment}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ paddingTop: 8, borderTop: '1px solid var(--color-border-2)' }}>
                        <ArcoText type="secondary" style={{ fontSize: 12 }}>申请时间：{item.createTime}</ArcoText>
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
          </div>
        )}

        {activeSideTab === 'reimbursement' && (
          <div className="lead-detail-side-content">
              <Card
                bordered={false}
                extra={
                  <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setApprovalLinkType('reimbursement')}>
                    报销
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="medium">
                  {reimbursementApplications.map((item) => (
                    <div key={item.id} style={{
                      padding: '16px',
                      background: 'var(--color-fill-2)',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>费用类型：{item.expenseType}</div>
                        <Space size="small">
                          <Tag color={item.status === '已报销' ? 'green' : 'orange'} size="small">{item.status}</Tag>
                          <Button type="text" size="mini" icon={<IconEdit />} onClick={() => Message.info('编辑报销申请')} />
                          <Button type="text" size="mini" icon={<IconDelete />} status="danger" onClick={() => Message.info('删除报销申请')} />
                        </Space>
                      </div>

                      <div style={{
                        background: 'var(--color-bg-2)',
                        borderRadius: 6,
                        padding: '12px',
                        marginBottom: 12,
                        border: '1px solid var(--color-border-1)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>开票金额</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>¥{item.invoiceAmount}</div>
                          </div>
                          <div style={{ width: 1, height: 35, background: 'var(--color-border-2)' }}></div>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>报销金额</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--success-6))' }}>¥{item.reimbursementAmount}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px 16px',
                        marginBottom: 10,
                        fontSize: 14,
                        color: 'var(--color-text-2)'
                      }}>
                        <div>
                          <span style={{ color: 'var(--color-text-3)' }}>申请人：</span>
                          <span style={{ fontWeight: 500 }}>{item.applicant}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-3)' }}>申请部门：</span>
                          <span style={{ fontWeight: 500 }}>{item.department}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-3)' }}>发票抬头：</span>
                          <span style={{ fontWeight: 500 }}>{item.invoiceTitle}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-3)' }}>税号：</span>
                          <span style={{ fontWeight: 500 }}>{item.taxNumber}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-3)' }}>发票类型：</span>
                          <span style={{ fontWeight: 500 }}>{item.invoiceType}</span>
                        </div>
                      </div>

                      {item.attachments && item.attachments.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>附件列表：</div>
                          <Space size="small" wrap>
                            {item.attachments.map((file: any) => (
                              <span
                                key={file.id}
                                style={{
                                  color: 'var(--primary)',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  borderRadius: 4,
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fill-1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                onClick={() => Message.info(`下载附件: ${file.name}`)}
                              >
                                {file.name} ({file.size})
                              </span>
                            ))}
                          </Space>
                        </div>
                      )}

                      <div style={{ marginTop: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>审批流程</div>
                        <div style={{
                          background: 'var(--color-bg-2)',
                          borderRadius: 4,
                          padding: '12px',
                          border: '1px solid var(--color-border-1)'
                        }}>
                          {item.approvalFlow.map((node: any, index: number) => (
                            <div key={index} style={{ position: 'relative', paddingLeft: 24 }}>
                              {/* 连接线 */}
                              {index < item.approvalFlow.length - 1 && (
                                <div style={{
                                  position: 'absolute',
                                  left: 7,
                                  top: 20,
                                  bottom: -8,
                                  width: 2,
                                  background: node.status === 'approved' ? 'rgb(var(--green-6))' : 'var(--color-border-2)',
                                }}></div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: index < item.approvalFlow.length - 1 ? 12 : 0 }}>
                                {/* 状态灯 */}
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  border: '2px solid',
                                  borderColor: node.status === 'approved' ? 'rgb(var(--green-6))' :
                                              node.status === 'pending' ? 'rgb(var(--orange-6))' :
                                              node.status === 'rejected' ? 'rgb(var(--red-6))' :
                                              'var(--color-border-3)',
                                  background: node.status === 'approved' ? 'rgb(var(--green-6))' :
                                             node.status === 'pending' ? 'rgb(var(--orange-6))' :
                                             node.status === 'rejected' ? 'rgb(var(--red-6))' :
                                             'var(--color-bg-2)',
                                  animation: node.status === 'pending' ? 'pulse 2s infinite' : 'none',
                                }}></div>

                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)' }}>
                                      {node.step}
                                    </span>
                                    <Tag
                                      color={node.status === 'approved' ? 'green' :
                                            node.status === 'pending' ? 'orange' :
                                            node.status === 'rejected' ? 'red' : 'default'}
                                      size="small"
                                    >
                                      {node.step === '发起申请' && node.status === 'approved' ? '已申请' :
                                       node.status === 'approved' ? '已通过' :
                                       node.status === 'pending' ? '待处理' :
                                       node.status === 'rejected' ? '已驳回' : '未到达'}
                                    </Tag>
                                  </div>

                                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>
                                    {node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}
                                  </div>

                                  {node.time && (
                                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>
                                      操作时间：{node.time}
                                    </div>
                                  )}

                                  {/* 驳回理由高亮卡片 */}
                                  {node.status === 'rejected' && node.comment && (
                                    <div style={{
                                      marginTop: 6,
                                      padding: '8px 10px',
                                      background: 'rgb(var(--red-1))',
                                      border: '1px solid rgb(var(--red-3))',
                                      borderRadius: 4,
                                    }}>
                                      <div style={{ fontSize: 12, color: 'rgb(var(--red-7))', fontWeight: 600, marginBottom: 4 }}>
                                        ⚠️ 驳回理由
                                      </div>
                                      <div style={{ fontSize: 12, color: 'rgb(var(--red-6))' }}>
                                        {node.comment}
                                      </div>
                                    </div>
                                  )}

                                  {/* 普通审批意见 */}
                                  {node.status === 'approved' && node.comment && (
                                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
                                      意见：{node.comment}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ paddingTop: 8, borderTop: '1px solid var(--color-border-2)' }}>
                        <ArcoText type="secondary" style={{ fontSize: 12 }}>申请时间：{item.createTime}</ArcoText>
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
          </div>
        )}

        </div>
        </div>
      </div>
      </div>

      <Modal
        title="添加跟进记录"
        visible={followVisible}
        onOk={handleFollow}
        onCancel={() => {
          setFollowVisible(false);
          form.resetFields();
        }}
        style={{ width: 680 }}
      >
        <Form form={form} layout="vertical">
          <FormItem
            label="跟进方式"
            field="type"
            rules={[{ required: true, message: '请选择跟进方式' }]}
          >
            <Radio.Group>
              <Radio value="phone">
                <IconPhone style={{ marginRight: 4 }} />
                电话沟通
              </Radio>
              <Radio value="wechat">
                <IconMessage style={{ marginRight: 4 }} />
                微信沟通
              </Radio>
              <Radio value="visit">
                <IconUser style={{ marginRight: 4 }} />
                上门拜访
              </Radio>
              <Radio value="other">其他</Radio>
            </Radio.Group>
          </FormItem>

          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem
                label="客户状态"
                field="status"
                rules={[{ required: true, message: '请选择客户状态' }]}
              >
                <Select placeholder="请选择客户当前状态">
                  <Select.Option key="followup-status-1" value="未联系">未联系</Select.Option>
                  <Select.Option key="followup-status-2" value="未接通">未接通</Select.Option>
                  <Select.Option key="followup-status-3" value="初步沟通">初步沟通</Select.Option>
                  <Select.Option key="followup-status-4" value="需求调研">需求调研</Select.Option>
                  <Select.Option key="followup-status-5" value="方案报价">方案报价</Select.Option>
                  <Select.Option key="followup-status-6" value="合同洽谈">合同洽谈</Select.Option>
                  <Select.Option key="followup-status-7" value="已签单">已签单</Select.Option>
                  <Select.Option key="followup-status-8" value="已终止">已终止</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="意向等级" field="level">
                <Radio.Group>
                  <Radio value="high">高</Radio>
                  <Radio value="medium">中</Radio>
                  <Radio value="low">低</Radio>
                </Radio.Group>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="客户等级" field="customerLevel">
                <Select placeholder="请选择客户等级" allowClear>
                  <Select.Option key="cl-s" value="S">S</Select.Option>
                  <Select.Option key="cl-a" value="A">A</Select.Option>
                  <Select.Option key="cl-b" value="B">B</Select.Option>
                  <Select.Option key="cl-c" value="C">C</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="消耗时间" field="costHours">
                <InputNumber placeholder="小时" min={0} max={24} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label=" " field="costMins">
                <InputNumber placeholder="分钟" min={0} max={59} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <FormItem
            label={
              <Space>
                <span>跟进详情</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 'normal' }}>
                  快捷模板：
                  {['初步建联', '无人接听', '确认需求', '暂无进展'].map((t) => (
                    <Tag
                      key={t}
                      size="small"
                      color="arcoblue"
                      style={{ cursor: 'pointer', marginLeft: 4 }}
                      onClick={() => {
                        const templates: Record<string, string> = {
                          '初步建联': '已电话初步建联，约定明天发方案',
                          '无人接听': '无人接听，已转短信提醒',
                          '确认需求': '已确认需求，进入方案报价阶段',
                          '暂无进展': '客户暂无进展，下周再跟进',
                        };
                        form.setFieldValue('content', templates[t] || '');
                      }}
                    >
                      {t}
                    </Tag>
                  ))}
                </span>
              </Space>
            }
            field="content"
            rules={[{ required: true, message: '请输入跟进详情' }]}
          >
            <Input.TextArea
              placeholder="请详细记录本次沟通的内容、客户反馈、关键信息等"
              rows={6}
              maxLength={1000}
              showWordLimit
            />
          </FormItem>

          <FormItem label="附件上传" field="attachments">
            <Upload
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
              multiple
              drag
              tip="支持上传图片、PDF、Word、Excel等文件"
            >
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                  点击或拖拽文件到此处上传
                </div>
              </div>
            </Upload>
          </FormItem>

          <FormItem label="下次跟进提醒" field="nextFollow">
            <div>
              <Space style={{ marginBottom: 8 }}>
                {[
                  { label: '明天上午10:00', value: '1' },
                  { label: '3天后', value: '3' },
                  { label: '下周一', value: '7' },
                ].map((item) => (
                  <Tag
                    key={item.value}
                    size="small"
                    color="arcoblue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => form.setFieldValue('nextFollow', item.value)}
                  >
                    {item.label}
                  </Tag>
                ))}
              </Space>
              <Select placeholder="或选择跟进提醒时间" defaultValue="3">
                <Select.Option key="follow-1" value="1">1天后（高频跟进）</Select.Option>
                <Select.Option key="follow-3" value="3">3天后（默认）</Select.Option>
                <Select.Option key="follow-7" value="7">7天后（中频跟进）</Select.Option>
                <Select.Option key="follow-10" value="10">10天后（低频跟进）</Select.Option>
                <Select.Option key="follow-15" value="15">15天后</Select.Option>
                <Select.Option key="follow-30" value="30">30天后</Select.Option>
              </Select>
            </div>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="绑定客户主体"
        visible={bindCustomerVisible}
        onOk={handleBindCustomer}
        onCancel={() => {
          setBindCustomerVisible(false);
          bindCustomerForm.resetFields();
          setCustomerSearchKeyword('');
        }}
        style={{ width: 600 }}
      >
        <Form form={bindCustomerForm} layout="vertical">
          <FormItem label="搜索客户">
            <Input
              placeholder="输入客户名称、联系人或电话搜索"
              prefix={<IconSearch />}
              value={customerSearchKeyword}
              onChange={(value) => setCustomerSearchKeyword(value)}
              allowClear
            />
          </FormItem>
          <FormItem
            label="选择客户"
            field="customerId"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select placeholder="请选择客户主体">
              {filteredCustomers.map((customer) => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.contact} - {customer.phone}
                </Select.Option>
              ))}
            </Select>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="编辑线索"
        visible={editLeadVisible}
        onOk={handleEditLeadSubmit}
        onCancel={() => {
          setEditLeadVisible(false);
          editLeadForm.resetFields();
          setSelectedTags([]);
        }}
        style={{ width: 800 }}
      >
        <Form form={editLeadForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="线索名称" field="name" rules={[{ required: true, message: '请输入线索名称' }]}>
                <Input placeholder="请输入线索名称" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="售前群名称" field="presalesGroupName">
                <Input placeholder="请输入微信售前群名称，用于读取客户沟通记录" maxLength={100} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="联系人" field="contact" rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="请输入联系人姓名" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="联系电话" field="phone" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="请输入手机号" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="联系人微信" field="wechat">
                <Input placeholder="请输入微信号" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="线索来源" field="source" rules={[{ required: true, message: '请选择线索来源' }]}>
                <Select placeholder="请选择">
                  {LEAD_SOURCE_LIST.map((s) => (
                    <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="推广关键词" field="keyword">
                <Input placeholder="请输入推广关键词" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="客户主体" field="customerId">
                <Select
                  placeholder="请输入客户名称搜索"
                  showSearch
                  allowClear
                  filterOption={(inputValue, option) => {
                    const customer = customerList.find(c => c.id === option.props?.value);
                    if (!customer) return false;
                    const searchText = `${customer.name} ${customer.contact} ${customer.phone}`.toLowerCase();
                    return searchText.indexOf(inputValue.toLowerCase()) >= 0;
                  }}
                >
                  {customerList.map((customer) => (
                    <Select.Option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.contact} - {customer.phone}
                    </Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="意向等级" field="level" rules={[{ required: true, message: '请选择意向等级' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="high" value="高">高</Select.Option>
                  <Select.Option key="medium" value="中">中</Select.Option>
                  <Select.Option key="low" value="低">低</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="对接主体" field="entity" rules={[{ required: true, message: '请选择对接主体' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="zkry" value="中科软艺">中科软艺</Select.Option>
                  <Select.Option key="ryxx" value="软艺信息">软艺信息</Select.Option>
                  <Select.Option key="zkjt" value="中科集团">中科集团</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="客户状态" field="status" rules={[{ required: true, message: '请选择客户状态' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="newlead-status-1" value="未联系">未联系</Select.Option>
                  <Select.Option key="newlead-status-2" value="未接通">未接通</Select.Option>
                  <Select.Option key="newlead-status-3" value="初步沟通">初步沟通</Select.Option>
                  <Select.Option key="newlead-status-4" value="需求调研">需求调研</Select.Option>
                  <Select.Option key="newlead-status-5" value="方案报价">方案报价</Select.Option>
                  <Select.Option key="newlead-status-6" value="合同洽谈">合同洽谈</Select.Option>
                  <Select.Option key="newlead-status-7" value="已签单">已签单</Select.Option>
                  <Select.Option key="newlead-status-8" value="已终止">已终止</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="意向标签" field="tags">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableTags.map((tag) => (
                    <Tag
                      key={tag}
                      checkable
                      checked={selectedTags.includes(tag)}
                      onClick={() => handleTagClick(tag)}
                      style={{ cursor: 'pointer' }}
                    >
                      {tag}
                    </Tag>
                  ))}
                  <Button
                    size="small"
                    type="dashed"
                    icon={<IconPlus />}
                    onClick={() => setCustomTagVisible(true)}
                  >
                    新增标签
                  </Button>
                </div>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="客户需求梗概" field="requirement">
                <Input.TextArea
                  placeholder="请输入客户需求描述"
                  rows={6}
                  maxLength={1000}
                  showWordLimit
                />
              </FormItem>
              <FormItem label="附件上传" field="attachments">
                <Upload
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  drag
                  tip="支持上传图片、PDF、Word、Excel等文件"
                >
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                    <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                      点击或拖拽文件到此处上传
                    </div>
                  </div>
                </Upload>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
        </Form>
      </Modal>

      <Modal
        title="新增标签"
        visible={customTagVisible}
        onOk={handleAddCustomTag}
        onCancel={() => {
          setCustomTagVisible(false);
          customTagForm.resetFields();
        }}
        style={{ width: 400 }}
      >
        <Form form={customTagForm} layout="vertical">
          <FormItem
            label="标签名称"
            field="tagName"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称，如：物联网、区块链等" maxLength={10} />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="标记为垃圾线索"
        visible={trashVisible}
        onOk={handleTrashSubmit}
        onCancel={() => {
          setTrashVisible(false);
          trashForm.resetFields();
        }}
        style={{ width: 480 }}
      >
        <Form form={trashForm} layout="vertical">
          <FormItem
            label="丢弃原因"
            field="reason"
            rules={[{ required: true, message: '请填写丢弃原因' }]}
          >
            <Input.TextArea
              placeholder="请详细说明该线索为垃圾线索的原因，如：重复线索、虚假信息、无效联系方式等"
              rows={4}
            />
          </FormItem>
        </Form>
      </Modal>


      <Modal
        title={`新增${approvalLinkType === 'travel' ? '出差' : '报销'}审批关联`}
        visible={approvalLinkType !== null}
        onOk={handleCreateApprovalLink}
        onCancel={() => {
          setApprovalLinkType(null);
          setApprovalNoInput('');
        }}
      >
        <FormItem label="审批编号" required>
          <Input
            placeholder="请输入企业微信审批编号"
            value={approvalNoInput}
            onChange={setApprovalNoInput}
          />
        </FormItem>
        <div style={{ color: 'var(--color-text-3)', fontSize: 14, lineHeight: '22px' }}>
          审批编号请在企业微信审批记录中获取。提交后系统会根据审批编号自动关联对应审批记录。
        </div>
      </Modal>
      <Modal
        title="新增演示记录"
        visible={demoModalVisible}
        onOk={handleSubmitDemo}
        onCancel={() => {
          setDemoModalVisible(false);
          demoForm.resetFields();
        }}
        style={{ width: 680 }}
        maskClosable={false}
      >
        <Form form={demoForm} layout="vertical">
          <FormItem
            label="演示记录名称"
            field="name"
            rules={[{ required: true, message: '请输入演示记录名称' }]}
          >
            <Input placeholder="请输入演示记录名称" />
          </FormItem>

          <FormItem
            label="类型"
            field="type"
            rules={[{ required: true, message: '请选择演示类型' }]}
          >
            <Select placeholder="请选择演示类型">
              {DEMO_TYPE_OPTIONS.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </FormItem>

          <FormItem
            label="网址"
            field="url"
            rules={[
              { required: true, message: '请输入演示网址' },
              { type: 'url', message: '请输入有效的网址' },
            ]}
          >
            <Input placeholder="请输入演示网址，如 https://example.com/demo" />
          </FormItem>

          <FormItem label="说明" field="description">
            <Input.TextArea
              placeholder="请输入演示说明（可选）"
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={1000}
              showWordLimit
            />
          </FormItem>
        </Form>
      </Modal>

      <Drawer
        title="报价工作台"
        visible={quotationDrawerVisible}
        onCancel={() => setQuotationDrawerVisible(false)}
        footer={null}
        width="100%"
        style={{ top: 0, bottom: 0 }}
        bodyStyle={{ padding: 24 }}
      >
        {quotationDrawerQuoteId && (
          <QuotationWorkbench embedded quoteId={quotationDrawerQuoteId} onClose={() => setQuotationDrawerVisible(false)} />
        )}
      </Drawer>
    </div>
  );
}

/** 报价卡片组件：显示简要信息 */
function QuoteCard({ quote, onOpen }: { quote: Quote; onOpen: () => void }) {
  const breakdown = computeAmountBreakdown(quote);
  const evalSheet = quote.evalSheet;
  const totalDays = evalSheet ? evalSheet.evaluationUnits.reduce((s: number, u: any) => s + u.totalDays, 0) : 0;
  const epCount = (quote.endpointConfigs || []).length;
  const modCount = (quote.featureList || []).length;
  const subCount = (quote.featureList || []).reduce((s: number, m: any) => s + (m.subFeatures?.length || 0), 0);
  const money = (n: number) => `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;

  return (
    <div style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ArcoText bold>{quote.basicInfo.projectName}</ArcoText>
        <Tag color="arcoblue" size="small">{quote.version}</Tag>
        <Tag size="small" color={quote.status === 'draft' ? 'gray' : undefined}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{quote.quoteNo}</div>
      {/* 简要信息 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
        {evalSheet && <span>工期 <strong>{evalSheet.manualWorkDays}</strong> 工作日</span>}
        <span>人天 <strong>{totalDays.toFixed(1)}</strong></span>
        <span>报价 <strong style={{ color: 'rgb(var(--red-6))' }}>{money(breakdown.grandTotal)}</strong></span>
        <span>{epCount} 端 · {modCount} 模块 · {subCount} 功能</span>
      </div>
      <Button size="mini" type="primary" onClick={onOpen}>进入工作台</Button>
    </div>
  );
}
