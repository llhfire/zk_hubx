import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  Card,
  Descriptions,
  Tabs,
  Timeline,
  Table,
  Space,
  Divider,
  Grid,
  Result,
  Button,
  DatePicker,
  Select,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Message,
  Upload,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconPlus,
  IconEdit,
  IconDelete,
  IconCheck,
  IconUpload,
  IconWechatpay,
  IconPushpin,
} from '@arco-design/web-react/icon';
import { useContracts } from './contracts/ContractsContext';
import { ContractStatusBadge } from './contracts/components/ContractStatusBadge';
import { ContractActionBar } from './contracts/components/ContractActionBar';
import { DocumentUploadPanel } from './contracts/components/DocumentUploadPanel';
import { addBusinessDays } from './delivery-plan/utils';
import {
  getPaymentPlanExpectedDateLabel,
} from './contracts/utils';
import { findLeadContext } from './contracts/leadContextMock';
import { LeadFinalContractPanel } from './leads/components/LeadFinalContractPanel';
import { LeadPaymentInvoicePanel } from './leads/components/LeadPaymentInvoicePanel';
import { LeadContractHistoryPanel } from './leads/components/LeadContractHistoryPanel';
import { LeadQuotationHistoryPanel } from './leads/components/LeadQuotationHistoryPanel';
import { getLeadDetailProfile } from './leads/leadDetailProfiles';
import { formatDateTime } from './contracts/contractModification';

const FormItem = Form.Item;

interface FollowUpRecord {
  id: string;
  type: 'requirement_change' | 'ui_confirm' | 'dunning' | 'other';
  title: string;
  content: string;
  author: string;
  date: string;
}

interface ContractDemoRecord {
  id: string;
  name: string;
  url: string;
  type: string;
  uploader: string;
  uploadTime: string;
  description: string;
}

interface PaymentEditDraft {
  expectedDateType: 'workday' | 'natural' | 'fixed';
  expectedDays: number;
  expectedDate: string;
  condition: string;
  amountType: 'percentage' | 'fixed';
  amountValue: number;
}

interface ContractPaymentRecord {
  id: string;
  period: string;
  name: string;
  expectedAmount: number;
  expectedDate: string;
  expectedDateType: PaymentEditDraft['expectedDateType'];
  expectedDays: number;
  fixedExpectedDate: string;
  condition: string;
  amountType: PaymentEditDraft['amountType'];
  amountValue: number;
  actualAmount: number;
  paymentNote: string;
  actualDate: string;
  status: string;
  overdueDays: number;
  voucher: string;
  invoiceStatus: string;
  taxRate: string;
  invoiceDate: string;
  taxAmount: number;
  invoiceVoucher: string;
  paymentMethod: string;
}

const PAYMENT_NAME_OPTIONS = [
  '首期款',
  '二期款',
  '三期款',
  '四期款',
  '五期款',
  '六期款',
  '七期款',
  '八期款',
  '验收款',
  '尾款',
  '需求变更款',
  '全款',
] as const;

const PERIOD_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const DEMO_TYPE_OPTIONS = [
  '前端',
  '后台',
  'UI',
  '原型',
  '其他',
] as const;

const EMPTY_PAYMENT_EDIT_DRAFT: PaymentEditDraft = {
  expectedDateType: 'workday',
  expectedDays: 0,
  expectedDate: '',
  condition: '',
  amountType: 'percentage',
  amountValue: 0,
};

const FOLLOW_UP_TYPES: Record<FollowUpRecord['type'], { label: string; color: string; icon: ReactNode }> = {
  requirement_change: { label: '需求变更', color: 'orange', icon: <IconEdit size={12} /> },
  ui_confirm: { label: 'UI/原型确认', color: 'cyan', icon: <IconCheck size={12} /> },
  dunning: { label: '催款记录', color: 'red', icon: <IconWechatpay size={12} /> },
  other: { label: '其他', color: 'gray', icon: <IconPushpin size={12} /> },
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addNaturalDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

const mockFollowUps: FollowUpRecord[] = [
  { id: 'fu-1', type: 'requirement_change', title: '新增报表功能需求', content: '客户希望增加月度统计报表功能，预计增加工作量 3 人天，费用增加 ¥15,000。', author: '张三', date: '2026-06-28' },
  { id: 'fu-2', type: 'ui_confirm', title: 'CRM 首页设计确认', content: '客户已确认 CRM 首页设计稿 V2，无修改意见，可以进入开发阶段。', author: '陈明', date: '2026-06-25' },
  { id: 'fu-3', type: 'dunning', title: '第二期款项催款', content: '已电话联系联系客户财务，对方确认本周内支付第二期款项 ¥360,000。', author: '张三', date: '2026-06-22' },
  { id: 'fu-4', type: 'requirement_change', title: '登录方式调整', content: '客户要求增加微信扫码登录，原有手机验证码登录保留。已评估技术可行性，无额外成本。', author: '李四', date: '2026-06-18' },
  { id: 'fu-5', type: 'ui_confirm', title: '移动端原型确认', content: '客户已签字确认移动端 APP 原型设计，包含 12 个核心页面流程图。', author: '陈明', date: '2026-06-15' },
  { id: 'fu-6', type: 'dunning', title: '首期款项到账确认', content: '已收到客户首期款项 ¥480,000，银行回单已归档。', author: '张三', date: '2026-06-10' },
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

const { Row, Col } = Grid;
const TabPane = Tabs.TabPane;
type ApprovalLinkType = 'travel' | 'reimbursement';

interface ContractDetailReturnTarget {
  pathname: string;
  state?: unknown;
}

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getById } = useContracts();
  const returnTarget = (
    location.state as { contractDetailReturn?: ContractDetailReturnTarget } | null
  )?.contractDetailReturn;

  const handleBack = () => {
    if (returnTarget) {
      navigate(returnTarget.pathname, { state: returnTarget.state });
      return;
    }
    navigate(-1);
  };

  const contract = getById(id);

  if (!contract) {
    return (
      <Result
        status="404"
        title="合同不存在"
        subTitle="该合同可能已被删除，或链接有误。"
        extra={
          <Button type="primary" onClick={handleBack}>
            返回
          </Button>
        }
      />
    );
  }

  const cd = contract.current;
  const relatedLead = findLeadContext(contract.leadId);
  const contractQuotationHistory = useMemo(
    () => getLeadDetailProfile(contract.leadId ?? undefined, '').quotationHistory,
    [contract.leadId],
  );

  const displayContractSummaryValue = (value: ReactNode | null | undefined) => {
    if (value == null || String(value).trim() === '') return '-';
    return value;
  };
  const contractLeadName = relatedLead?.leadName
    || (cd.customerName && cd.productCategory ? `${cd.customerName}${cd.productCategory}需求` : cd.customerName);
  const contractLeadPhoneOrWechat = Array.from(new Set(
    [relatedLead?.contactPhone, cd.customerPhone].filter(value => value?.trim()),
  )).join(' / ') || '-';
  const contractLeadSummaryItems = [
    { label: '线索来源', value: '-' },
    { label: '客资成本', value: '-' },
    {
      label: '客户称呼',
      value: displayContractSummaryValue(relatedLead?.contactPerson || cd.customerContact),
    },
    { label: '联系电话/微信', value: contractLeadPhoneOrWechat },
    { label: '创建人', value: displayContractSummaryValue(contract.createdBy) },
    { label: '优化师', value: '-' },
    { label: '归属人', value: displayContractSummaryValue(contract.createdBy) },
    { label: '协助人', value: '-' },
    {
      label: '初始信息及需求',
      value: displayContractSummaryValue(relatedLead?.leadName || cd.contractContent),
      fullWidth: true,
    },
    { label: '创建时间', value: displayContractSummaryValue(contract.createdAt) },
    { label: '下次跟进时间', value: '-' },
  ];

  const totalAmount = cd.totalAmount;
  const collectionRecords = contract.collectionRecords ?? [];

  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(mockFollowUps);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [demoRecords, setDemoRecords] = useState<ContractDemoRecord[]>([
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
  const [followUpForm] = Form.useForm();
  const [demoForm] = Form.useForm();
  const [approvalLinkType, setApprovalLinkType] = useState<ApprovalLinkType | null>(null);
  const [approvalNoInput, setApprovalNoInput] = useState('');
  const [paymentPeriodVisible, setPaymentPeriodVisible] = useState(false);
  const [paymentEditVisible, setPaymentEditVisible] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState<'add' | 'edit'>('edit');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentEditDraft, setPaymentEditDraft] = useState<PaymentEditDraft>({
    ...EMPTY_PAYMENT_EDIT_DRAFT,
  });
  const [invoiceEditVisible, setInvoiceEditVisible] = useState(false);
  const [paymentPeriodForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();
  const [paymentRecords, setPaymentRecords] = useState<ContractPaymentRecord[]>(() =>
    cd.paymentPlans.map((plan, index) => {
      const collection = collectionRecords.find((record) => record.period === plan.period)
        ?? collectionRecords[index];
      const isHistoricalPayment = collectionRecords.length === 0
        && (contract.receivedAmount ?? 0) > 0
        && index === 0;
      const actualAmount = collection?.amount
        ?? (isHistoricalPayment ? Math.min(contract.receivedAmount ?? 0, plan.amount) : 0);
      const actualDate = collection?.date
        ?? (isHistoricalPayment ? contract.updatedAt.slice(0, 10) : '');
      const expectedTimestamp = plan.expectedDate ? new Date(plan.expectedDate).getTime() : 0;
      const overdueDays = !actualDate && expectedTimestamp && Date.now() > expectedTimestamp
        ? Math.floor((Date.now() - expectedTimestamp) / 86400000)
        : 0;
      const invoiceStatus = actualDate ? '已开票' : '未开票';

      return {
        id: `${contract.id}-${plan.period}`,
        period: `${PERIOD_NAMES[index] || index + 1}期`,
        name: plan.periodName
          || (cd.paymentPlans.length === 1
            ? '全款'
            : index === 0
              ? '首期款'
              : index === cd.paymentPlans.length - 1
                ? '尾款'
                : PAYMENT_NAME_OPTIONS[index] || '需求变更款'),
        expectedAmount: plan.amount,
        expectedDate: getPaymentPlanExpectedDateLabel(plan),
        expectedDateType: plan.expectedDateType || 'fixed',
        expectedDays: plan.expectedDays || 0,
        fixedExpectedDate: plan.expectedDate || '',
        condition: plan.condition || '',
        amountType: plan.amountType || 'fixed',
        amountValue: plan.amountType === 'percentage' ? plan.percentage : plan.amount,
        actualAmount,
        paymentNote: collection?.note || '',
        actualDate,
        status: actualDate
          ? actualAmount >= plan.amount ? '已到账' : '部分到账'
          : '未到账',
        overdueDays,
        voucher: actualDate ? '回款凭证.jpg' : '',
        invoiceStatus,
        taxRate: '6%',
        invoiceDate: actualDate,
        taxAmount: Math.round((plan.amount * 0.06) * 100) / 100,
        invoiceVoucher: invoiceStatus === '已开票' ? '发票.pdf' : '',
        paymentMethod: collection?.method || cd.paymentMethod,
      };
    }),
  );
  const paymentPeriods = paymentRecords.length;
  const receivedAmount = paymentRecords.reduce((sum, record) => sum + record.actualAmount, 0);
  const receivableAmount = Math.max(totalAmount - receivedAmount, 0);
  const invoicedAmount = paymentRecords.reduce(
    (sum, record) => record.invoiceStatus === '已开票'
      ? sum + record.expectedAmount + record.taxAmount
      : sum,
    0,
  );

  const handleAddFollowUp = () => {
    followUpForm.validate().then(values => {
      const newRecord: FollowUpRecord = {
        id: `fu-${Date.now()}`,
        ...values,
        author: '当前用户',
        date: '2026-07-02',
      };
      setFollowUps(prev => [newRecord, ...prev]);
      setFollowUpModalVisible(false);
      Message.success('跟进记录已添加');
    });
  };

  const handleAddDemo = () => {
    demoForm.resetFields();
    setDemoModalVisible(true);
  };

  const handleSubmitDemo = () => {
    demoForm.validate().then((values) => {
      const nextRecord: ContractDemoRecord = {
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

  const openApprovalLinkModal = (type: ApprovalLinkType) => {
    setApprovalLinkType(type);
    setApprovalNoInput('');
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

  const handleAddPaymentPeriod = () => {
    setSelectedPaymentId(null);
    paymentForm.resetFields();
    setPaymentEditDraft({ ...EMPTY_PAYMENT_EDIT_DRAFT });
    setPaymentModalMode('add');
    setPaymentEditVisible(true);
  };

  const handleResetPaymentPeriods = () => {
    setPaymentPeriodVisible(true);
  };

  const handleInitializePaymentPeriods = () => {
    paymentPeriodForm.validate().then((values) => {
      const periodCount = values.periods === 'custom'
        ? parseInt(values.customPeriods, 10)
        : parseInt(values.periods, 10);
      const newRecords: ContractPaymentRecord[] = Array.from({ length: periodCount }, (_, index) => ({
        id: `${contract.id}-manual-${Date.now()}-${index}`,
        period: `${PERIOD_NAMES[index] || index + 1}期`,
        name: periodCount === 1
          ? '全款'
          : index === 0
            ? '首期款'
            : index === periodCount - 1
              ? '尾款'
              : PAYMENT_NAME_OPTIONS[index] || '需求变更款',
        expectedAmount: 0,
        expectedDate: '',
        expectedDateType: 'workday',
        expectedDays: 0,
        fixedExpectedDate: '',
        condition: '',
        amountType: 'percentage',
        amountValue: 0,
        actualAmount: 0,
        paymentNote: '',
        actualDate: '',
        status: '未到账',
        overdueDays: 0,
        voucher: '',
        invoiceStatus: '未开票',
        taxRate: '6%',
        invoiceDate: '',
        taxAmount: 0,
        invoiceVoucher: '',
        paymentMethod: '公对公',
      }));

      setPaymentRecords(newRecords);
      setPaymentPeriodVisible(false);
      paymentPeriodForm.resetFields();
      Message.success(`已初始化回款期数为${periodCount}期`);
    });
  };

  const paymentEditAmount = paymentEditDraft.amountType === 'percentage'
    ? Math.round(((totalAmount * paymentEditDraft.amountValue) / 100) * 100) / 100
    : paymentEditDraft.amountValue;
  const calculatedExpectedPaymentDate = paymentEditDraft.expectedDateType === 'fixed'
    ? paymentEditDraft.expectedDate
    : paymentEditDraft.expectedDays > 0
      ? paymentEditDraft.expectedDateType === 'workday'
        ? addBusinessDays(formatLocalDate(new Date()), paymentEditDraft.expectedDays)
        : addNaturalDays(formatLocalDate(new Date()), paymentEditDraft.expectedDays)
      : '';

  const openPaymentEditModal = (payment: ContractPaymentRecord) => {
    setSelectedPaymentId(payment.id);
    setPaymentModalMode('edit');
    setPaymentEditDraft({
      expectedDateType: payment.expectedDateType,
      expectedDays: payment.expectedDays,
      expectedDate: payment.fixedExpectedDate,
      condition: payment.condition,
      amountType: payment.amountType,
      amountValue: payment.amountValue,
    });
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      name: payment.name,
      paymentMethod: payment.paymentMethod,
      actualDate: payment.actualDate,
      status: payment.status === '部分到账' ? '未到账' : payment.status,
      paymentNote: payment.paymentNote,
    });
    setPaymentEditVisible(true);
  };

  const handleUpdatePaymentInfo = () => {
    if (paymentEditDraft.expectedDateType === 'fixed' && !paymentEditDraft.expectedDate) {
      Message.error('请选择固定日期');
      return;
    }
    if (
      paymentEditDraft.expectedDateType !== 'fixed'
      && (!Number.isInteger(paymentEditDraft.expectedDays) || paymentEditDraft.expectedDays <= 0)
    ) {
      Message.error('请输入大于 0 的整数天数');
      return;
    }
    if (paymentEditDraft.amountValue <= 0) {
      Message.error('请输入大于 0 的回款金额');
      return;
    }
    if (
      paymentEditDraft.amountType === 'percentage'
      && (!Number.isInteger(paymentEditDraft.amountValue) || paymentEditDraft.amountValue > 100)
    ) {
      Message.error('百分比仅支持输入 1-100 的整数');
      return;
    }

    paymentForm.validate().then((values) => {
      const recordValues = {
        name: values.name,
        expectedAmount: paymentEditAmount,
        expectedDate: calculatedExpectedPaymentDate,
        expectedDateType: paymentEditDraft.expectedDateType,
        expectedDays: paymentEditDraft.expectedDays,
        fixedExpectedDate: paymentEditDraft.expectedDate,
        condition: paymentEditDraft.condition,
        amountType: paymentEditDraft.amountType,
        amountValue: paymentEditDraft.amountValue,
        actualAmount: values.status === '已到账' ? paymentEditAmount : 0,
        paymentNote: values.paymentNote || '',
        actualDate: values.actualDate || '',
        status: values.status,
        overdueDays: 0,
        paymentMethod: values.paymentMethod,
      };

      if (paymentModalMode === 'add') {
        const newPeriodNumber = paymentRecords.length + 1;
        setPaymentRecords((records) => [
          ...records,
          {
            id: `${contract.id}-manual-${Date.now()}`,
            period: `${PERIOD_NAMES[newPeriodNumber - 1] || newPeriodNumber}期`,
            ...recordValues,
            voucher: '',
            invoiceStatus: '未开票',
            taxRate: '6%',
            invoiceDate: '',
            taxAmount: Math.round((paymentEditAmount * 0.06) * 100) / 100,
            invoiceVoucher: '',
          },
        ]);
      } else if (selectedPaymentId) {
        setPaymentRecords((records) => records.map((record) => (
          record.id === selectedPaymentId
            ? {
                ...record,
                ...recordValues,
                taxAmount: Math.round((paymentEditAmount * 0.06) * 100) / 100,
              }
            : record
        )));
      }

      Message.success(paymentModalMode === 'add' ? '回款信息添加成功' : '回款信息更新成功');
      setPaymentEditVisible(false);
      setSelectedPaymentId(null);
      paymentForm.resetFields();
      setPaymentEditDraft({ ...EMPTY_PAYMENT_EDIT_DRAFT });
    }).catch(() => {
      // 表单组件会展示字段校验信息。
    });
  };

  const openInvoiceEditModal = (payment: ContractPaymentRecord) => {
    setSelectedPaymentId(payment.id);
    invoiceForm.resetFields();
    invoiceForm.setFieldsValue({
      invoiceStatus: payment.invoiceStatus,
      taxRate: payment.taxRate,
      invoiceDate: payment.invoiceDate,
      taxAmount: payment.taxAmount || undefined,
      paymentMethod: payment.paymentMethod,
    });
    setInvoiceEditVisible(true);
  };

  const handleUpdateInvoiceInfo = () => {
    invoiceForm.validate().then((values) => {
      if (selectedPaymentId) {
        setPaymentRecords((records) => records.map((record) => (
          record.id === selectedPaymentId
            ? {
                ...record,
                invoiceStatus: values.invoiceStatus,
                taxRate: values.taxRate,
                invoiceDate: values.invoiceDate || '',
                taxAmount: Number(values.taxAmount) || 0,
                paymentMethod: values.paymentMethod,
              }
            : record
        )));
      }
      Message.success('发票信息更新成功');
      setInvoiceEditVisible(false);
      setSelectedPaymentId(null);
      invoiceForm.resetFields();
    }).catch(() => {
      // 表单组件会展示字段校验信息。
    });
  };

  return (
    <div>
      <div className="contract-detail-layout">
        <div className="contract-detail-left">
      <Card className="contract-detail-actions" style={{ marginBottom: 16 }}>
        <div className="contract-detail-action-row">
          <div className="contract-detail-action-title-group">
            <Button
              className="contract-detail-back-action"
              type="text"
              size="small"
              icon={<IconLeft />}
              onClick={handleBack}
            >
              返回
            </Button>
            <div className="contract-detail-action-heading">
              <div className="contract-detail-action-title-line">
                <div className="contract-detail-action-title">
                  {displayContractSummaryValue(cd.contractName)}
                </div>
                <ContractStatusBadge status={contract.status} />
                {contract.executionStatus ? <Tag color="purple">履行：{contract.executionStatus}</Tag> : null}
              </div>
              <div className="contract-detail-action-contract-no">
                {displayContractSummaryValue(contract.contractNo)}
              </div>
            </div>
          </div>
          <div className="contract-detail-action-buttons">
            <ContractActionBar contract={contract} />
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <div className="contract-detail-summary-title">
          <span>【{displayContractSummaryValue(contractLeadName)}】</span>
        </div>
        <div className="contract-detail-summary-grid">
          {contractLeadSummaryItems.map((item) => (
            <div
              key={item.label}
              className={`contract-detail-summary-item${item.fullWidth ? ' contract-detail-summary-item-full' : ''}`}
            >
              <span className="contract-detail-summary-label">{item.label}：</span>
              <span className="contract-detail-summary-value">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="contract-detail-tab-panel">
      <Tabs defaultActiveTab="basic" headerPadding={false}>
        <TabPane key="basic" title="基础信息">
          <>
            <Descriptions
              column={2}
              data={[
                { label: '签约主体', value: cd.signingEntity },
                { label: '产品类别', value: cd.productCategory },
                { label: '合同总额', value: `¥${cd.totalAmount.toLocaleString()}` },
                { label: '付款方式', value: cd.paymentMethod },
                { label: '签约日期', value: cd.signDate },
                { label: '生效日期', value: cd.effectiveDate },
                { label: '终止日期', value: cd.endDate },
                { label: '创建人', value: contract.createdBy },
              ]}
            />

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ fontWeight: 600, marginBottom: 12 }}>客户信息</div>
            <Descriptions
              column={2}
              data={[
                { label: '公司名称', value: cd.customerName },
                { label: '联系人', value: cd.customerContact },
                { label: '联系电话', value: cd.customerPhone },
                { label: '税务登记号', value: cd.customerTaxNo || '—' },
              ]}
            />
          </>
        </TabPane>

        <TabPane key="contract" title="合同信息">
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <LeadFinalContractPanel contract={contract} hideInfoItems />
            </Space>
          </Card>
        </TabPane>

        <TabPane key="payments" title="回款与发票">
          <Card bordered={false}>
            <LeadPaymentInvoicePanel contractAmount={totalAmount} />
          </Card>
        </TabPane>

      </Tabs>
      </div>
        </div>

        <div className="contract-detail-right">
      <div className="contract-detail-tab-panel">
      <Tabs defaultActiveTab="followup" headerPadding={false}>

        <TabPane key="followup" title="跟进">
          <Card
            size="small"
            style={{ borderRadius: 8 }}
            extra={<Button type="text" icon={<IconPlus />} size="small" onClick={() => setFollowUpModalVisible(true)} />}
          >
            <Timeline>
              {followUps.map(fu => {
                const typeMeta = FOLLOW_UP_TYPES[fu.type];
                return (
                  <Timeline.Item key={fu.id} dot={typeMeta.icon}>
                    <div style={{ marginBottom: 2 }}>
                      <Tag color={typeMeta.color} size="small">{typeMeta.label}</Tag>
                      <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 4 }}>{fu.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>{fu.date} · {fu.author}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)', padding: '4px 8px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
                      {fu.content}
                    </div>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Card>
        </TabPane>

        <TabPane key="quotation" title="报价">
          <LeadQuotationHistoryPanel
            quotations={contractQuotationHistory}
            onCreate={() => Message.info('新增报价')}
            onEdit={() => Message.info('编辑报价')}
            onDelete={() => Message.info('删除报价单')}
          />
        </TabPane>

        <TabPane key="contract-records" title="合同记录">
          <LeadContractHistoryPanel
            contract={contract}
            onCreateContract={() => navigate('/contracts/new')}
            onContractClick={(contractId) => navigate(`/contracts/${contractId}`)}
          />
        </TabPane>

        <TabPane key="demo" title="演示">
          <Card
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
                      <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 6, wordBreak: 'break-all' }}>
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
          </Card>
        </TabPane>

        <TabPane key="documents" title="资料">
          <DocumentUploadPanel size="small" bordered />
        </TabPane>

        <TabPane key="travel" title="出差">
          <Card
            bordered={false}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<IconPlus />}
                onClick={() => openApprovalLinkModal('travel')}
              >
                新增出差
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="medium">
              {travelApplications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    background: 'var(--color-fill-2)',
                    borderRadius: 6,
                    border: '1px solid var(--color-border-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>目的地：{item.destination}</div>
                    <Space size="small">
                      <Tag color={item.status === '已审批' ? 'green' : 'orange'} size="small">{item.status}</Tag>
                      <Button type="text" size="mini" icon={<IconDelete />} status="danger" onClick={() => Message.info('删除出差申请')} />
                    </Space>
                  </div>
                  <div style={{ background: 'var(--color-bg-2)', borderRadius: 6, padding: '12px', marginBottom: 12, border: '1px solid var(--color-border-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>出差周期</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>{item.duration}</div>
                      </div>
                      <div style={{ width: 1, height: 35, background: 'var(--color-border-2)' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>预估费用</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--orange-6))' }}>¥{item.estimatedCost}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 10, fontSize: 13, color: 'var(--color-text-2)' }}>
                    <div><span style={{ color: 'var(--color-text-3)' }}>申请人：</span><span style={{ fontWeight: 500 }}>{item.applicant}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>申请部门：</span><span style={{ fontWeight: 500 }}>{item.department}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>开始时间：</span><span style={{ fontWeight: 500 }}>{item.startDate}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>结束时间：</span><span style={{ fontWeight: 500 }}>{item.endDate}</span></div>
                    <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-text-3)' }}>出差事由：</span><span style={{ fontWeight: 500 }}>{item.purpose}</span></div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>审批流程</div>
                    <div style={{ background: 'var(--color-bg-2)', borderRadius: 4, padding: '8px 12px', border: '1px solid var(--color-border-1)' }}>
                      {item.approvalFlow.map((node, index) => (
                        <div key={index} style={{ position: 'relative', paddingLeft: 24 }}>
                          {index < item.approvalFlow.length - 1 && (
                            <div style={{ position: 'absolute', left: 7, top: 20, bottom: -8, width: 2, background: node.status === 'approved' ? 'rgb(var(--green-6))' : 'var(--color-border-2)' }} />
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: index < item.approvalFlow.length - 1 ? 12 : 0 }}>
                            <div style={{ position: 'absolute', left: 0, width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: node.status === 'approved' ? 'rgb(var(--green-6))' : node.status === 'pending' ? 'rgb(var(--orange-6))' : node.status === 'rejected' ? 'rgb(var(--red-6))' : 'var(--color-border-3)', background: node.status === 'approved' ? 'rgb(var(--green-6))' : node.status === 'pending' ? 'rgb(var(--orange-6))' : node.status === 'rejected' ? 'rgb(var(--red-6))' : 'var(--color-bg-2)', animation: node.status === 'pending' ? 'pulse 2s infinite' : 'none' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-1)' }}>{node.step}</span>
                                <Tag color={node.status === 'approved' ? 'green' : node.status === 'pending' ? 'orange' : node.status === 'rejected' ? 'red' : 'default'} size="small">
                                  {node.step === '发起申请' && node.status === 'approved' ? '已申请' : node.status === 'approved' ? '已通过' : node.status === 'pending' ? '待处理' : node.status === 'rejected' ? '已驳回' : '未到达'}
                                </Tag>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>{node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}</div>
                              {node.time && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>操作时间：{node.time}</div>}
                              {node.status === 'rejected' && node.comment && (
                                <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgb(var(--red-1))', border: '1px solid rgb(var(--red-3))', borderRadius: 4 }}>
                                  <div style={{ fontSize: 12, color: 'rgb(var(--red-7))', fontWeight: 600, marginBottom: 4 }}>驳回理由</div>
                                  <div style={{ fontSize: 12, color: 'rgb(var(--red-6))' }}>{node.comment}</div>
                                </div>
                              )}
                              {node.status === 'approved' && node.comment && <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>意见：{node.comment}</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--color-border-2)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>申请时间：{item.createTime}</div>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </TabPane>

        <TabPane key="reimbursement" title="报销">
          <Card
            bordered={false}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<IconPlus />}
                onClick={() => openApprovalLinkModal('reimbursement')}
              >
                新增报销
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="medium">
              {reimbursementApplications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    background: 'var(--color-fill-2)',
                    borderRadius: 6,
                    border: '1px solid var(--color-border-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>费用类型：{item.expenseType}</div>
                    <Space size="small">
                      <Tag color={item.status === '已报销' ? 'green' : 'orange'} size="small">{item.status}</Tag>
                      <Button type="text" size="mini" icon={<IconEdit />} onClick={() => Message.info('编辑报销申请')} />
                      <Button type="text" size="mini" icon={<IconDelete />} status="danger" onClick={() => Message.info('删除报销申请')} />
                    </Space>
                  </div>

                  <div style={{ background: 'var(--color-bg-2)', borderRadius: 6, padding: '12px', marginBottom: 12, border: '1px solid var(--color-border-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>开票金额</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>¥{item.invoiceAmount}</div>
                      </div>
                      <div style={{ width: 1, height: 35, background: 'var(--color-border-2)' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>报销金额</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--success-6))' }}>¥{item.reimbursementAmount}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 10, fontSize: 13, color: 'var(--color-text-2)' }}>
                    <div><span style={{ color: 'var(--color-text-3)' }}>申请人：</span><span style={{ fontWeight: 500 }}>{item.applicant}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>申请部门：</span><span style={{ fontWeight: 500 }}>{item.department}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>发票抬头：</span><span style={{ fontWeight: 500 }}>{item.invoiceTitle}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>税号：</span><span style={{ fontWeight: 500 }}>{item.taxNumber}</span></div>
                    <div><span style={{ color: 'var(--color-text-3)' }}>发票类型：</span><span style={{ fontWeight: 500 }}>{item.invoiceType}</span></div>
                  </div>

                  {item.attachments.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>附件列表：</div>
                      <Space size="small" wrap>
                        {item.attachments.map((file) => (
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
                    <div style={{ background: 'var(--color-bg-2)', borderRadius: 4, padding: '12px', border: '1px solid var(--color-border-1)' }}>
                      {item.approvalFlow.map((node, index) => (
                        <div key={index} style={{ position: 'relative', paddingLeft: 24 }}>
                          {index < item.approvalFlow.length - 1 && <div style={{ position: 'absolute', left: 7, top: 20, bottom: -8, width: 2, background: node.status === 'approved' ? 'rgb(var(--green-6))' : 'var(--color-border-2)' }} />}
                          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: index < item.approvalFlow.length - 1 ? 12 : 0 }}>
                            <div style={{ position: 'absolute', left: 0, width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: node.status === 'approved' ? 'rgb(var(--green-6))' : node.status === 'pending' ? 'rgb(var(--orange-6))' : node.status === 'rejected' ? 'rgb(var(--red-6))' : 'var(--color-border-3)', background: node.status === 'approved' ? 'rgb(var(--green-6))' : node.status === 'pending' ? 'rgb(var(--orange-6))' : node.status === 'rejected' ? 'rgb(var(--red-6))' : 'var(--color-bg-2)', animation: node.status === 'pending' ? 'pulse 2s infinite' : 'none' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-1)' }}>{node.step}</span>
                                <Tag color={node.status === 'approved' ? 'green' : node.status === 'pending' ? 'orange' : node.status === 'rejected' ? 'red' : 'default'} size="small">
                                  {node.step === '发起申请' && node.status === 'approved' ? '已申请' : node.status === 'approved' ? '已通过' : node.status === 'pending' ? '待处理' : node.status === 'rejected' ? '已驳回' : '未到达'}
                                </Tag>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>{node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}</div>
                              {node.time && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>操作时间：{node.time}</div>}
                              {node.status === 'approved' && node.comment && <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>意见：{node.comment}</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--color-border-2)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>申请时间：{item.createTime}</div>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </TabPane>
      </Tabs>
      </div>
        </div>
      </div>

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
        <div style={{ color: 'var(--color-text-3)', fontSize: 13, lineHeight: '22px' }}>
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

      <Modal
        title={paymentPeriods > 0 ? '重设回款期数' : '初始化回款期数'}
        visible={paymentPeriodVisible}
        onOk={handleInitializePaymentPeriods}
        onCancel={() => {
          setPaymentPeriodVisible(false);
          paymentPeriodForm.resetFields();
        }}
        style={{ width: 480 }}
      >
        <Form form={paymentPeriodForm} layout="vertical">
          {paymentPeriods > 0 && (
            <div style={{
              padding: 12,
              background: 'rgba(var(--warning-2), 0.5)',
              border: '1px solid rgb(var(--warning-3))',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14,
              color: 'var(--color-text-1)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>重设提醒</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                重设期数将清空所有现有的回款与发票记录，包括已录入的金额、日期、凭证等信息。请谨慎操作。
              </div>
            </div>
          )}
          <FormItem
            label="回款期数"
            field="periods"
            rules={[{ required: true, message: '请选择回款期数' }]}
          >
            <Select placeholder="请选择回款期数">
              <Select.Option value="1">一期</Select.Option>
              <Select.Option value="2">二期</Select.Option>
              <Select.Option value="3">三期</Select.Option>
              <Select.Option value="4">四期</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </FormItem>
          <FormItem
            noStyle
            shouldUpdate={(prev, current) => prev.periods !== current.periods}
          >
            {(values) => values.periods === 'custom' ? (
              <FormItem
                label="自定义期数"
                field="customPeriods"
                rules={[{ required: true, message: '请输入自定义期数' }]}
              >
                <Input placeholder="请输入期数" type="number" />
              </FormItem>
            ) : null}
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={paymentModalMode === 'add' ? '添加回款信息' : '编辑回款信息'}
        visible={paymentEditVisible}
        onOk={handleUpdatePaymentInfo}
        onCancel={() => {
          setPaymentEditVisible(false);
          setSelectedPaymentId(null);
          paymentForm.resetFields();
          setPaymentEditDraft({ ...EMPTY_PAYMENT_EDIT_DRAFT });
        }}
        style={{ width: 760 }}
        maskClosable={false}
      >
        <Form form={paymentForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem
                label="回款名称"
                field="name"
                rules={[{ required: true, message: '请选择回款名称' }]}
              >
                <Select placeholder="请选择回款名称">
                  {PAYMENT_NAME_OPTIONS.map((option) => (
                    <Select.Option key={option} value={option}>
                      {option}
                    </Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem
                label={(
                  <span>
                    预计回款日期
                    {paymentEditDraft.expectedDateType !== 'fixed' && calculatedExpectedPaymentDate && (
                      <span style={{ marginLeft: 8, color: 'rgb(var(--primary-6))' }}>
                        预计日期：{calculatedExpectedPaymentDate}
                      </span>
                    )}
                  </span>
                )}
                required
              >
                <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 8 }}>
                  <Select
                    value={paymentEditDraft.expectedDateType}
                    onChange={(value) => setPaymentEditDraft((prev) => ({
                      ...prev,
                      expectedDateType: value,
                      expectedDays: 0,
                      expectedDate: '',
                    }))}
                  >
                    <Select.Option value="workday">工作日</Select.Option>
                    <Select.Option value="natural">自然日</Select.Option>
                    <Select.Option value="fixed">固定日期</Select.Option>
                  </Select>
                  {paymentEditDraft.expectedDateType === 'fixed' ? (
                    <DatePicker
                      style={{ width: '100%' }}
                      value={paymentEditDraft.expectedDate}
                      placeholder="请选择固定日期"
                      onChange={(value) => setPaymentEditDraft((prev) => ({
                        ...prev,
                        expectedDate: (value as string) || '',
                      }))}
                    />
                  ) : (
                    <InputNumber
                      style={{ width: '100%' }}
                      value={paymentEditDraft.expectedDays || undefined}
                      placeholder="请输入天数"
                      min={1}
                      precision={0}
                      onChange={(value) => setPaymentEditDraft((prev) => ({
                        ...prev,
                        expectedDays: Number(value) || 0,
                      }))}
                    />
                  )}
                </div>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <FormItem label="回款条件">
            <Input
              value={paymentEditDraft.condition}
              placeholder="请输入回款条件"
              onChange={(value) => setPaymentEditDraft((prev) => ({ ...prev, condition: value }))}
            />
          </FormItem>

          <Grid.Row gutter={16}>
            <Grid.Col span={7}>
              <FormItem
                label="回款方式"
                field="paymentMethod"
                rules={[{ required: true, message: '请选择回款方式' }]}
              >
                <Select placeholder="请选择回款方式">
                  <Select.Option value="公对公">公对公</Select.Option>
                  <Select.Option value="私对公">私对公</Select.Option>
                  <Select.Option value="微信">微信</Select.Option>
                  <Select.Option value="支付宝">支付宝</Select.Option>
                  <Select.Option value="银行转账">银行转账</Select.Option>
                  <Select.Option value="其他">其他</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={17}>
              <FormItem label="应回款金额" required>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '112px minmax(0, 1fr) 150px',
                  gap: 8,
                  alignItems: 'center',
                }}>
                  <Select
                    value={paymentEditDraft.amountType}
                    onChange={(value) => setPaymentEditDraft((prev) => ({
                      ...prev,
                      amountType: value,
                      amountValue: 0,
                    }))}
                  >
                    <Select.Option value="percentage">百分比</Select.Option>
                    <Select.Option value="fixed">固定金额</Select.Option>
                  </Select>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={paymentEditDraft.amountValue || undefined}
                    placeholder={paymentEditDraft.amountType === 'percentage' ? '请输入 1-100' : '请输入固定金额'}
                    min={paymentEditDraft.amountType === 'percentage' ? 1 : 0}
                    max={paymentEditDraft.amountType === 'percentage' ? 100 : undefined}
                    precision={paymentEditDraft.amountType === 'percentage' ? 0 : 2}
                    suffix={paymentEditDraft.amountType === 'percentage' ? '%' : undefined}
                    onChange={(value) => setPaymentEditDraft((prev) => ({
                      ...prev,
                      amountValue: Number(value) || 0,
                    }))}
                  />
                  <div style={{ color: 'rgb(var(--primary-6))', fontWeight: 600, textAlign: 'right' }}>
                    回款金额 ¥{paymentEditAmount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="实际回款日期" field="actualDate">
                <Input type="date" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem
                label="到账状态"
                field="status"
                rules={[{ required: true, message: '请选择到账状态' }]}
              >
                <Select placeholder="请选择">
                  <Select.Option value="已到账">已到账</Select.Option>
                  <Select.Option value="未到账">未到账</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <FormItem label="回款说明" field="paymentNote">
            <Input placeholder="请输入回款说明" />
          </FormItem>

          <FormItem label="回款凭证" field="voucher">
            <Upload accept=".jpg,.jpeg,.png,.pdf" drag>
              <div style={{ padding: 20, textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                  点击或拖拽文件到此处上传
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-3)' }}>
                  支持图片和PDF文件
                </div>
              </div>
            </Upload>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="编辑发票信息"
        visible={invoiceEditVisible}
        onOk={handleUpdateInvoiceInfo}
        onCancel={() => {
          setInvoiceEditVisible(false);
          setSelectedPaymentId(null);
          invoiceForm.resetFields();
        }}
        style={{ width: 680 }}
      >
        <Form form={invoiceForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem
                label="开票状态"
                field="invoiceStatus"
                rules={[{ required: true, message: '请选择开票状态' }]}
              >
                <Select placeholder="请选择">
                  <Select.Option value="已开票">已开票</Select.Option>
                  <Select.Option value="未开票">未开票</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem
                label="开票税率"
                field="taxRate"
                rules={[{ required: true, message: '请输入开票税率' }]}
              >
                <Input placeholder="例如：6%" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="开票日期" field="invoiceDate">
                <Input type="date" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem
                label="开票税额"
                field="taxAmount"
                rules={[{ required: true, message: '请输入开票税额' }]}
              >
                <Input placeholder="请输入税额（单位：元）" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <FormItem
            label="收款方式"
            field="paymentMethod"
            rules={[{ required: true, message: '请选择收款方式' }]}
          >
            <Select placeholder="请选择">
              <Select.Option value="公对公">公对公</Select.Option>
              <Select.Option value="支付宝">支付宝</Select.Option>
              <Select.Option value="微信">微信</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </FormItem>

          <FormItem label="发票凭证" field="invoiceVoucher">
            <Upload accept=".jpg,.jpeg,.png,.pdf" drag>
              <div style={{ padding: 20, textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                  点击或拖拽文件到此处上传
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-3)' }}>
                  支持发票截图和PDF文件
                </div>
              </div>
            </Upload>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="添加跟进记录"
        visible={followUpModalVisible}
        onOk={handleAddFollowUp}
        onCancel={() => setFollowUpModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 520 }}
      >
        <Form form={followUpForm} layout="vertical">
          <FormItem label="跟进类型" field="type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="选择跟进类型">
              {Object.entries(FOLLOW_UP_TYPES).map(([k, m]) => (
                <Select.Option key={k} value={k}>{m.icon} {m.label}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="标题" field="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="简要描述" />
          </FormItem>
          <FormItem label="详细内容" field="content" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea placeholder="详细描述跟进内容..." autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
