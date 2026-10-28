import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  confirmAction,
  DataTable,
  FileList,
  MoneyText,
  StatusTag,
  resolveStatus,
  type StatusMap,
  type StatusTone,
} from '@/design-system';
import {
  Button,
  DatePicker,
  Form,
  FormGrid,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Space,
  Tooltip,
  Upload,
} from '@/design-system';
import type { UploadItem } from '@/design-system';
import {
  IconDelete,
  IconDownCircle,
  IconEdit,
  IconEye,
  IconFile,
  IconPlus,
} from '@/design-system';
import {
  getPaymentPeriodMetrics,
  getPaymentPlanSummary,
  getPeriodActionPermissions,
  type InvoiceRecord,
  type PaymentPeriod,
  type PaymentRecord,
} from '../paymentInvoiceModel';
import { useProjectInvoices } from '../../../finance/invoice/ProjectInvoiceContext';
import './LeadPaymentInvoicePanel.css';
import { formatMoney as formatCurrency } from '../../../../utils/money';

const FormItem = Form.Item;
const PAYMENT_METHOD_OPTIONS = ['公对公', '私对公', '微信', '支付宝', '银行转账', '其他'];
const INVOICE_TYPE_OPTIONS = ['增值税专用发票', '增值税普通发票', '电子发票', '其他'];
const PROJECT_INVOICE_TYPE_OPTIONS = ['增值税专用发票', '增值税普通发票'];

const INITIAL_PERIODS: PaymentPeriod[] = [
  {
    id: 'period-1',
    periodLabel: '一期',
    name: '首期款',
    expectedAmount: 204000,
    expectedDate: '2026-04-15',
    condition: '合同签订后支付',
    payments: [
      {
        id: 'payment-1-1',
        amount: 120000,
        paymentDate: '2026-04-10',
        paymentMethod: '公对公',
        voucherFiles: ['首期款回款凭证-01.jpg'],
        note: '客户首次付款',
      },
      {
        id: 'payment-1-2',
        amount: 84000,
        paymentDate: '2026-04-14',
        paymentMethod: '公对公',
        voucherFiles: ['首期款回款凭证-02.pdf'],
        note: '首期款尾款到账',
      },
    ],
    invoices: [
      {
        id: 'invoice-1-1',
        amount: 120000,
        invoiceType: '增值税专用发票',
        invoiceDate: '2026-04-09',
        invoiceTitle: '武汉某某科技有限公司',
        invoiceFiles: ['首期发票-01.pdf', '首期发票-02.pdf'],
        note: '客户要求先开票',
      },
      {
        id: 'invoice-1-2',
        amount: 84000,
        invoiceType: '电子发票',
        invoiceDate: '2026-04-16',
        invoiceTitle: '武汉某某科技有限公司',
        invoiceFiles: ['首期发票-03.pdf'],
        note: '',
      },
    ],
  },
  {
    id: 'period-2',
    periodLabel: '二期',
    name: '二期款',
    expectedAmount: 204000,
    expectedDate: '2026-05-15',
    condition: '原型确认后支付',
    payments: [
      {
        id: 'payment-2-1',
        amount: 80000,
        paymentDate: '2026-05-18',
        paymentMethod: '公对公',
        voucherFiles: ['二期款回款凭证.jpg'],
        note: '二期款部分到账',
      },
    ],
    invoices: [
      {
        id: 'invoice-2-1',
        amount: 100000,
        invoiceType: '增值税普通发票',
        invoiceDate: '2026-05-12',
        invoiceTitle: '武汉某某科技有限公司',
        invoiceFiles: ['二期款发票.pdf'],
        note: '二期款部分开票',
      },
    ],
  },
  {
    id: 'period-3',
    periodLabel: '三期',
    name: '尾款',
    expectedAmount: 102000,
    expectedDate: '2026-06-30',
    condition: '项目验收后支付',
    payments: [],
    invoices: [],
  },
];

interface RecordEditorState {
  periodId: string;
  recordId?: string;
}

interface LeadPaymentInvoicePanelProps {
  contractAmount: number;
  projectMode?: boolean;
  customerInvoiceInfo?: CustomerInvoiceInfo;
  projectId?: string;
  projectName?: string;
  projectNo?: string;
  contractId?: string;
}

export interface CustomerInvoiceInfo {
  customerName: string;
  taxpayerId: string;
  address?: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUploadItems(files: string[]): UploadItem[] {
  return files.map((name, index) => ({
    uid: `${name}-${index}`,
    name,
    status: 'done',
  }));
}

function getFileNames(files: UploadItem[]) {
  return files.map(file => file.name || file.originFile?.name || '').filter(Boolean);
}

const PERIOD_PAYMENT_STATUS: StatusMap<string> = {
  已回款: { label: '已回款', tone: 'success' },
  部分回款: { label: '部分回款', tone: 'warning' },
  已逾期: { label: '已逾期', tone: 'danger' },
  未回款: { label: '未回款', tone: 'neutral' },
};

const PERIOD_INVOICE_STATUS: StatusMap<string> = {
  已开票: { label: '已开票', tone: 'info' },
  部分开票: { label: '部分开票', tone: 'purple' },
  未开票: { label: '未开票', tone: 'neutral' },
};

function paymentStatusTag(status: string) {
  return <StatusTag meta={resolveStatus(PERIOD_PAYMENT_STATUS, status)} />;
}

function invoiceStatusTag(status: string) {
  return <StatusTag meta={resolveStatus(PERIOD_INVOICE_STATUS, status)} />;
}

export function LeadPaymentInvoicePanel({ contractAmount, projectMode = false, customerInvoiceInfo, projectId, projectName, projectNo, contractId }: LeadPaymentInvoicePanelProps) {
  return projectMode
    ? <ProjectPaymentInvoicePanel contractAmount={contractAmount} customerInvoiceInfo={customerInvoiceInfo} projectId={projectId} projectName={projectName} projectNo={projectNo} contractId={contractId} />
    : <StandardPaymentInvoicePanel contractAmount={contractAmount} />;
}

function StandardPaymentInvoicePanel({ contractAmount }: Pick<LeadPaymentInvoicePanelProps, 'contractAmount'>) {
  const [periods, setPeriods] = useState<PaymentPeriod[]>(INITIAL_PERIODS);
  const [paymentEditor, setPaymentEditor] = useState<RecordEditorState | null>(null);
  const [invoiceEditor, setInvoiceEditor] = useState<RecordEditorState | null>(null);
  const [paymentFiles, setPaymentFiles] = useState<UploadItem[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<UploadItem[]>([]);
  const [paymentForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();

  const summary = useMemo(() => getPaymentPlanSummary(periods), [periods]);
  const pendingAmount = Math.max(0, summary.expectedAmount - summary.paidAmount);

  const findPeriod = (periodId: string) => periods.find(period => period.id === periodId);

  const getPaymentLimit = (editor: RecordEditorState | null) => {
    if (!editor) return 0;
    const period = findPeriod(editor.periodId);
    if (!period) return 0;
    const usedAmount = period.payments
      .filter(record => record.id !== editor.recordId)
      .reduce((total, record) => total + record.amount, 0);
    return Math.max(0, period.expectedAmount - usedAmount);
  };

  const getInvoiceLimit = (editor: RecordEditorState | null) => {
    if (!editor) return 0;
    const period = findPeriod(editor.periodId);
    if (!period) return 0;
    const usedAmount = period.invoices
      .filter(record => record.id !== editor.recordId)
      .reduce((total, record) => total + record.amount, 0);
    return Math.max(0, period.expectedAmount - usedAmount);
  };

  const openPaymentModal = (period: PaymentPeriod, record?: PaymentRecord) => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue(record ? {
      amount: record.amount,
      paymentDate: record.paymentDate,
      paymentMethod: record.paymentMethod,
      note: record.note,
    } : {
      paymentDate: formatDate(new Date()),
      paymentMethod: '公对公',
    });
    setPaymentFiles(toUploadItems(record?.voucherFiles || []));
    setPaymentEditor({ periodId: period.id, recordId: record?.id });
  };

  const openInvoiceModal = (period: PaymentPeriod, record?: InvoiceRecord) => {
    invoiceForm.resetFields();
    invoiceForm.setFieldsValue(record ? {
      amount: record.amount,
      invoiceType: record.invoiceType,
      invoiceDate: record.invoiceDate,
      invoiceTitle: record.invoiceTitle,
      note: record.note,
    } : {
      invoiceDate: formatDate(new Date()),
      invoiceType: '增值税专用发票',
      invoiceTitle: '武汉某某科技有限公司',
    });
    setInvoiceFiles(toUploadItems(record?.invoiceFiles || []));
    setInvoiceEditor({ periodId: period.id, recordId: record?.id });
  };

  const closePaymentModal = () => {
    setPaymentEditor(null);
    setPaymentFiles([]);
    paymentForm.resetFields();
  };

  const closeInvoiceModal = () => {
    setInvoiceEditor(null);
    setInvoiceFiles([]);
    invoiceForm.resetFields();
  };

  const savePaymentRecord = () => {
    if (!paymentEditor) return;
    paymentForm.validate().then(values => {
      const amount = Number(values.amount);
      const amountLimit = getPaymentLimit(paymentEditor);
      if (amount > amountLimit) {
        Message.error(`回款金额不能超过本期剩余可登记金额 ${formatCurrency(amountLimit)}`);
        return;
      }

      setPeriods(current => current.map(period => {
        if (period.id !== paymentEditor.periodId) return period;
        const nextRecord: PaymentRecord = {
          id: paymentEditor.recordId || `payment-${Date.now()}`,
          amount,
          paymentDate: values.paymentDate,
          paymentMethod: values.paymentMethod,
          voucherFiles: getFileNames(paymentFiles),
          note: values.note?.trim() || '',
        };
        return {
          ...period,
          payments: paymentEditor.recordId
            ? period.payments.map(record => record.id === paymentEditor.recordId ? nextRecord : record)
            : [...period.payments, nextRecord],
        };
      }));
      Message.success(paymentEditor.recordId ? '回款记录已更新' : '回款记录已新增');
      closePaymentModal();
    }).catch(() => {
      // 表单组件负责展示字段校验信息。
    });
  };

  const saveInvoiceRecord = () => {
    if (!invoiceEditor) return;
    invoiceForm.validate().then(values => {
      const amount = Number(values.amount);
      const amountLimit = getInvoiceLimit(invoiceEditor);
      if (amount > amountLimit) {
        Message.error(`开票金额不能超过本期剩余可登记金额 ${formatCurrency(amountLimit)}`);
        return;
      }

      setPeriods(current => current.map(period => {
        if (period.id !== invoiceEditor.periodId) return period;
        const nextRecord: InvoiceRecord = {
          id: invoiceEditor.recordId || `invoice-${Date.now()}`,
          amount,
          invoiceType: values.invoiceType,
          invoiceDate: values.invoiceDate,
          invoiceTitle: values.invoiceTitle.trim(),
          invoiceFiles: getFileNames(invoiceFiles),
          note: values.note?.trim() || '',
        };
        return {
          ...period,
          invoices: invoiceEditor.recordId
            ? period.invoices.map(record => record.id === invoiceEditor.recordId ? nextRecord : record)
            : [...period.invoices, nextRecord],
        };
      }));
      Message.success(invoiceEditor.recordId ? '开票记录已更新' : '开票记录已新增');
      closeInvoiceModal();
    }).catch(() => {
      // 表单组件负责展示字段校验信息。
    });
  };

  const deletePaymentRecord = (period: PaymentPeriod, record: PaymentRecord) => {
    confirmAction({
      title: '删除回款记录',
      content: `确认删除 ${formatCurrency(record.amount)} 的回款记录？删除后将重新计算本期回款状态。`,
      tone: 'danger',
      onOk: () => {
        setPeriods(current => current.map(item => item.id === period.id
          ? { ...item, payments: item.payments.filter(payment => payment.id !== record.id) }
          : item));
        Message.success('回款记录已删除');
      },
    });
  };

  const deleteInvoiceRecord = (period: PaymentPeriod, record: InvoiceRecord) => {
    confirmAction({
      title: '删除开票记录',
      content: `确认删除 ${formatCurrency(record.amount)} 的开票记录？删除后将重新计算本期开票状态。`,
      tone: 'danger',
      onOk: () => {
        setPeriods(current => current.map(item => item.id === period.id
          ? { ...item, invoices: item.invoices.filter(invoice => invoice.id !== record.id) }
          : item));
        Message.success('开票记录已删除');
      },
    });
  };

  const renderFiles = (files: string[]) => files.length ? (
    <FileList
      items={files.map((file, index) => ({
        key: `${file}-${index}`,
        name: file,
      }))}
    />
  ) : '-';

  const renderPaymentDetails = (period: PaymentPeriod) => {
    const metrics = getPaymentPeriodMetrics(period);
    const paymentColumns = [
      { title: '回款日期', dataIndex: 'paymentDate', width: 112 },
      {
        title: '回款金额',
        dataIndex: 'amount',
        width: 120,
        render: (amount: number) => (
          <strong className="lead-payment-record-amount is-paid"><MoneyText value={amount} /></strong>
        ),
      },
      { title: '回款方式', dataIndex: 'paymentMethod', width: 96 },
      {
        title: '回款凭证',
        dataIndex: 'voucherFiles',
        width: 180,
        render: (files: string[]) => renderFiles(files),
      },
      { title: '回款说明', dataIndex: 'note', render: (note: string) => note || '-' },
      {
        title: '操作',
        width: 84,
        fixed: 'right' as const,
        render: (_: unknown, record: PaymentRecord) => (
          <Space size={2}>
            <Tooltip content="编辑回款记录">
              <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openPaymentModal(period, record)} />
            </Tooltip>
            <Tooltip content="删除回款记录">
              <Button type="text" size="mini" status="danger" icon={<IconDelete />} onClick={() => deletePaymentRecord(period, record)} />
            </Tooltip>
          </Space>
        ),
      },
    ];
    const invoiceColumns = [
      { title: '开票日期', dataIndex: 'invoiceDate', width: 112 },
      {
        title: '开票金额',
        dataIndex: 'amount',
        width: 120,
        render: (amount: number) => (
          <strong className="lead-payment-record-amount is-invoiced"><MoneyText value={amount} /></strong>
        ),
      },
      { title: '发票类型', dataIndex: 'invoiceType', width: 132 },
      { title: '发票抬头', dataIndex: 'invoiceTitle', width: 180 },
      {
        title: '发票文件',
        dataIndex: 'invoiceFiles',
        width: 180,
        render: (files: string[]) => renderFiles(files),
      },
      { title: '备注', dataIndex: 'note', render: (note: string) => note || '-' },
      {
        title: '操作',
        width: 84,
        fixed: 'right' as const,
        render: (_: unknown, record: InvoiceRecord) => (
          <Space size={2}>
            <Tooltip content="编辑开票记录">
              <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openInvoiceModal(period, record)} />
            </Tooltip>
            <Tooltip content="删除开票记录">
              <Button type="text" size="mini" status="danger" icon={<IconDelete />} onClick={() => deleteInvoiceRecord(period, record)} />
            </Tooltip>
          </Space>
        ),
      },
    ];

    return (
      <div className="lead-payment-expanded">
        <section className="lead-payment-detail-section is-payment">
          <div className="lead-payment-detail-header">
            <div className="lead-payment-detail-heading">
              <span className="lead-payment-detail-icon"><IconDownCircle /></span>
              <div>
                <div className="lead-payment-detail-title-row">
                  <span className="lead-payment-detail-title">回款记录</span>
                  <span className="lead-payment-detail-count">{period.payments.length} 笔</span>
                </div>
                <div className="lead-payment-detail-summary">
                  累计回款 <strong><MoneyText value={metrics.paidAmount} /></strong>
                  <span className="lead-payment-detail-separator">·</span>
                  剩余可登记 <MoneyText value={metrics.remainingPaymentAmount} />
                </div>
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<IconPlus />}
              disabled={metrics.remainingPaymentAmount <= 0}
              onClick={() => openPaymentModal(period)}
            >
              新增回款记录
            </Button>
          </div>
          <DataTable
            rowKey="id"
            size="small"
            pagination={false}
            columns={paymentColumns}
            data={period.payments}
            scroll={{ x: 900 }}
            emptyDescription="暂无回款记录"
            className="lead-payment-detail-table"
          />
        </section>

        <section className="lead-payment-detail-section is-invoice">
          <div className="lead-payment-detail-header">
            <div className="lead-payment-detail-heading">
              <span className="lead-payment-detail-icon"><IconFile /></span>
              <div>
                <div className="lead-payment-detail-title-row">
                  <span className="lead-payment-detail-title">开票记录</span>
                  <span className="lead-payment-detail-count">{period.invoices.length} 笔</span>
                </div>
                <div className="lead-payment-detail-summary">
                  累计开票 <strong><MoneyText value={metrics.invoicedAmount} /></strong>
                  <span className="lead-payment-detail-separator">·</span>
                  剩余可登记 <MoneyText value={metrics.remainingInvoiceAmount} />
                </div>
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<IconPlus />}
              disabled={metrics.remainingInvoiceAmount <= 0}
              onClick={() => openInvoiceModal(period)}
            >
              新增开票记录
            </Button>
          </div>
          <DataTable
            rowKey="id"
            size="small"
            pagination={false}
            columns={invoiceColumns}
            data={period.invoices}
            scroll={{ x: 980 }}
            emptyDescription="暂无开票记录"
            className="lead-payment-detail-table"
          />
        </section>
      </div>
    );
  };

  const periodColumns = [
    {
      title: '期次 / 回款名称',
      width: 178,
      render: (_: unknown, period: PaymentPeriod) => (
        <div className="lead-payment-period-name">
          <div className="lead-payment-period-title">{period.periodLabel} · {period.name}</div>
          <div className="lead-payment-period-condition">{period.condition || '暂无回款条件'}</div>
        </div>
      ),
    },
    {
      title: '应回款金额',
      dataIndex: 'expectedAmount',
      width: 122,
      render: (amount: number) => <span className="lead-payment-primary-amount"><MoneyText value={amount} /></span>,
    },
    { title: '预计回款日期', dataIndex: 'expectedDate', width: 116 },
    {
      title: '实际回款',
      width: 142,
      render: (_: unknown, period: PaymentPeriod) => {
        const metrics = getPaymentPeriodMetrics(period);
        return (
          <div>
            <div className="lead-payment-primary-amount is-paid"><MoneyText value={metrics.paidAmount} /></div>
            <div className="lead-payment-cell-note">最后回款：{metrics.lastPaymentDate || '-'}</div>
          </div>
        );
      },
    },
    {
      title: '开票情况',
      width: 142,
      render: (_: unknown, period: PaymentPeriod) => {
        const metrics = getPaymentPeriodMetrics(period);
        return (
          <div>
            <div className="lead-payment-primary-amount is-invoiced"><MoneyText value={metrics.invoicedAmount} /></div>
            <div className="lead-payment-cell-note">待开：<MoneyText value={metrics.remainingInvoiceAmount} /></div>
          </div>
        );
      },
    },
    {
      title: '状态',
      width: 156,
      render: (_: unknown, period: PaymentPeriod) => {
        const metrics = getPaymentPeriodMetrics(period);
        return (
          <Space size={4} wrap>
            {paymentStatusTag(metrics.paymentStatus)}
            {invoiceStatusTag(metrics.invoiceStatus)}
          </Space>
        );
      },
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, period: PaymentPeriod) => {
        const metrics = getPaymentPeriodMetrics(period);
        return (
          <Space direction="vertical" size={2}>
            <Button
              type="text"
              size="mini"
              icon={<IconPlus />}
              disabled={metrics.remainingPaymentAmount <= 0}
              onClick={() => openPaymentModal(period)}
            >
              新增回款
            </Button>
            <Button
              type="text"
              size="mini"
              icon={<IconPlus />}
              disabled={metrics.remainingInvoiceAmount <= 0}
              onClick={() => openInvoiceModal(period)}
            >
              新增开票
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="lead-payment-panel">
      <div className="lead-payment-summary">
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">合同总额</div>
          <div className="lead-payment-summary-value"><MoneyText value={contractAmount} /></div>
        </div>
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">实际回款金额</div>
          <div className="lead-payment-summary-value is-paid"><MoneyText value={summary.paidAmount} /></div>
        </div>
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">待回款金额</div>
          <div className="lead-payment-summary-value is-pending"><MoneyText value={pendingAmount} /></div>
        </div>
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">已开票金额</div>
          <div className="lead-payment-summary-value is-invoiced"><MoneyText value={summary.invoicedAmount} /></div>
        </div>
      </div>

      <DataTable
        rowKey="id"
        size="small"
        pagination={false}
        columns={periodColumns}
        data={periods}
        scroll={{ x: 1080 }}
        expandedRowRender={record => renderPaymentDetails(record)}
        expandProps={{ width: 42, columnTitle: '明细' }}
      />

      <Modal
        title={paymentEditor?.recordId ? '编辑回款记录' : '新增回款记录'}
        visible={Boolean(paymentEditor)}
        onOk={savePaymentRecord}
        onCancel={closePaymentModal}
        okText="保存"
        cancelText="取消"
        maskClosable={false}
        style={{ width: 680, maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={paymentForm} layout="vertical">
          <FormGrid columns={2}>
            <div>
              <FormItem
                label="回款金额"
                field="amount"
                rules={[{ required: true, message: '请输入回款金额' }]}
              >
                <InputNumber
                  min={0.01}
                  max={getPaymentLimit(paymentEditor)}
                  precision={2}
                  prefix="¥"
                  placeholder="请输入本次回款金额"
                  style={{ width: '100%' }}
                />
              </FormItem>
              <div className="lead-payment-modal-limit">
                本期剩余可登记 <MoneyText value={getPaymentLimit(paymentEditor)} />
              </div>
            </div>
            <div>
              <FormItem
                label="实际回款日期"
                field="paymentDate"
                rules={[{ required: true, message: '请选择实际回款日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </FormItem>
            </div>
          </FormGrid>
          <FormItem
            label="回款方式"
            field="paymentMethod"
            rules={[{ required: true, message: '请选择回款方式' }]}
          >
            <Select placeholder="请选择回款方式">
              {PAYMENT_METHOD_OPTIONS.map(option => (
                <Select.Option key={option} value={option}>{option}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="回款凭证">
            <Upload
              autoUpload={false}
              accept=".jpg,.jpeg,.png,.pdf"
              limit={1}
              fileList={paymentFiles}
              onChange={setPaymentFiles}
            >
              <Button icon={<IconFile />}>选择凭证文件</Button>
            </Upload>
          </FormItem>
          <FormItem label="回款说明" field="note">
            <Input.TextArea
              placeholder="请输入回款说明"
              maxLength={300}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={invoiceEditor?.recordId ? '编辑开票记录' : '新增开票记录'}
        visible={Boolean(invoiceEditor)}
        onOk={saveInvoiceRecord}
        onCancel={closeInvoiceModal}
        okText="保存"
        cancelText="取消"
        maskClosable={false}
        style={{ width: 720, maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={invoiceForm} layout="vertical">
          <FormGrid columns={2}>
            <div>
              <FormItem
                label="开票金额"
                field="amount"
                rules={[{ required: true, message: '请输入开票金额' }]}
              >
                <InputNumber
                  min={0.01}
                  max={getInvoiceLimit(invoiceEditor)}
                  precision={2}
                  prefix="¥"
                  placeholder="请输入本次开票金额"
                  style={{ width: '100%' }}
                />
              </FormItem>
              <div className="lead-payment-modal-limit">
                本期剩余可登记 <MoneyText value={getInvoiceLimit(invoiceEditor)} />
              </div>
            </div>
            <div>
              <FormItem
                label="发票类型"
                field="invoiceType"
                rules={[{ required: true, message: '请选择发票类型' }]}
              >
                <Select placeholder="请选择发票类型">
                  {INVOICE_TYPE_OPTIONS.map(option => (
                    <Select.Option key={option} value={option}>{option}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </div>
          </FormGrid>
          <FormGrid columns={2}>
            <div>
              <FormItem
                label="开票日期"
                field="invoiceDate"
                rules={[{ required: true, message: '请选择开票日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </FormItem>
            </div>
            <div>
              <FormItem
                label="发票抬头"
                field="invoiceTitle"
                rules={[{ required: true, message: '请输入发票抬头' }]}
              >
                <Input placeholder="请输入发票抬头" maxLength={100} />
              </FormItem>
            </div>
          </FormGrid>
          <FormItem label="发票文件">
            <Upload
              autoUpload={false}
              accept=".jpg,.jpeg,.png,.pdf"
              multiple
              limit={5}
              fileList={invoiceFiles}
              onChange={setInvoiceFiles}
            >
              <Button icon={<IconFile />}>选择发票文件</Button>
            </Upload>
          </FormItem>
          <FormItem label="备注" field="note">
            <Input.TextArea
              placeholder="请输入备注"
              maxLength={300}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

interface ProjectRecordEditorState {
  periodId: string;
}

interface ProjectPaymentViewerState {
  record: PaymentRecord;
}

interface ProjectInvoiceViewerState {
  record: InvoiceRecord;
}

interface ProjectPeriodAttachment {
  id: string;
  type: string;
  name: string;
  description: string;
  files: string[];
}

const PROJECT_ATTACHMENT_TYPE_OPTIONS = [
  '回款凭证',
  '发票',
  '原型确认书',
  'UI 确认书',
  '需求变更确认书',
  '增项确认书',
  '验收单',
  '其他',
];

function getProjectPeriodLabel(period: PaymentPeriod, index: number) {
  return /^第\d+期(?:-\d+)?$/.test(period.periodLabel)
    ? period.periodLabel
    : `第${index + 1}期`;
}

function getProjectInitialPeriods(): PaymentPeriod[] {
  return INITIAL_PERIODS.map((period, index) => {
    if (index !== 0) return { ...period, payments: [], invoices: [] };

    return {
      ...period,
      payments: [{
        id: 'project-payment-1',
        amount: period.expectedAmount,
        paymentDate: '2026-04-14',
        paymentMethod: '公对公',
        voucherFiles: ['首期款回款凭证.pdf'],
        note: '首期款已到账',
      }],
      invoices: [{
        id: 'project-invoice-1',
        amount: period.expectedAmount,
        invoiceType: '增值税专用发票',
        invoiceDate: '2026-04-16',
        invoiceTitle: '武汉某某科技有限公司',
        invoiceFiles: ['首期发票.pdf'],
        note: '首期款已开票',
      }],
    };
  });
}

function ProjectStatusTag({
  status,
  tone,
  onClick,
}: {
  status: string;
  tone: StatusTone;
  onClick: () => void;
}) {
  return <StatusTag tone={tone} size="small" onClick={onClick}>{status}</StatusTag>;
}

function ProjectRecordFiles({
  files,
}: {
  files: string[];
}) {
  if (!files.length) return <span className="project-payment-empty-value">-</span>;

  return <FileList items={files.map((file, index) => ({ key: `${file}-${index}`, name: file }))} />;
}

const attachmentColumns = [
  {
    title: '附件类型',
    dataIndex: 'type',
    width: 124,
    render: (type: string) => <StatusTag size="small">{type}</StatusTag>,
  },
  {
    title: '附件名称',
    dataIndex: 'name',
    width: 180,
    render: (name: string) => <span className="project-payment-attachment-name">{name}</span>,
  },
  {
    title: '说明',
    dataIndex: 'description',
    render: (description: string) => (
      <span className="project-payment-attachment-description">{description || '-'}</span>
    ),
  },
  {
    title: '附件文件',
    dataIndex: 'files',
    width: 180,
    render: (files: string[]) => <ProjectRecordFiles files={files} />,
  },
];

function getProjectPeriodSystemAttachments(period: PaymentPeriod): ProjectPeriodAttachment[] {
  return [
    ...period.payments
      .filter(record => record.voucherFiles.length > 0)
      .map(record => ({
        id: `payment-voucher-${record.id}`,
        type: '回款凭证',
        name: `回款凭证 ${record.paymentDate}`,
        description: record.note,
        files: record.voucherFiles,
      })),
    ...period.invoices
      .filter(record => record.invoiceFiles.length > 0)
      .map(record => ({
        id: `invoice-file-${record.id}`,
        type: '发票',
        name: `发票 ${record.invoiceDate}`,
        description: record.note,
        files: record.invoiceFiles,
      })),
  ];
}

function ProjectPaymentInvoicePanel({ contractAmount, customerInvoiceInfo, projectId = 'project-demo', projectName = '关联项目', projectNo = '-', contractId }: Pick<LeadPaymentInvoicePanelProps, 'contractAmount' | 'customerInvoiceInfo' | 'projectId' | 'projectName' | 'projectNo' | 'contractId'>) {
  const { applications, submitApplication, findApplication, redFlushInvoice, syncPaymentPeriods } = useProjectInvoices();
  const [periods, setPeriods] = useState<PaymentPeriod[]>(getProjectInitialPeriods);
  const [paymentEditor, setPaymentEditor] = useState<ProjectRecordEditorState | null>(null);
  const [invoiceEditor, setInvoiceEditor] = useState<ProjectRecordEditorState | null>(null);
  const [paymentViewer, setPaymentViewer] = useState<ProjectPaymentViewerState | null>(null);
  const [invoiceViewer, setInvoiceViewer] = useState<ProjectInvoiceViewerState | null>(null);
  const [detailPeriodId, setDetailPeriodId] = useState<string | null>(null);
  const [redFlushApplicationId, setRedFlushApplicationId] = useState<string | null>(null);
  const [redFlushReason, setRedFlushReason] = useState('');
  const [redFlushFiles, setRedFlushFiles] = useState<UploadItem[]>([]);
  const [splitPeriodId, setSplitPeriodId] = useState<string | null>(null);
  const [splitRecordCount, setSplitRecordCount] = useState(2);
  const [attachmentPeriodId, setAttachmentPeriodId] = useState<string | null>(null);
  const [attachmentFormVisible, setAttachmentFormVisible] = useState(false);
  const [periodAttachments, setPeriodAttachments] = useState<Record<string, ProjectPeriodAttachment[]>>({});
  const [paymentFiles, setPaymentFiles] = useState<UploadItem[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<UploadItem[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<UploadItem[]>([]);
  const [paymentForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();
  const [splitForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();

  const summary = useMemo(() => getPaymentPlanSummary(periods), [periods]);
  const paymentPeriodSnapshots = useMemo(() => periods.filter(item => !item.isSplitParent).map((item, index) => {
    const paidAmount = item.payments.reduce((total, record) => total + record.amount, 0);
    return {
      periodId: item.id,
      periodLabel: getProjectPeriodLabel(item, index),
      expectedAmount: item.expectedAmount,
      paidAmount,
      expectedDate: item.expectedDate,
      paymentStatus: paidAmount >= item.expectedAmount && item.expectedAmount > 0
        ? '已回款' as const
        : paidAmount > 0
          ? '部分回款' as const
          : '未回款' as const,
    };
  }), [periods]);
  useEffect(() => {
    syncPaymentPeriods(projectId, paymentPeriodSnapshots);
  }, [paymentPeriodSnapshots, projectId, syncPaymentPeriods]);
  const completedInvoiceAmount = useMemo(() => applications
    .filter(item => item.projectId === projectId && item.status === '已开票')
    .reduce((total, item) => total + item.amount, 0), [applications, projectId]);
  const pendingAmount = Math.max(0, summary.expectedAmount - summary.paidAmount);
  const findPeriod = (periodId: string) => periods.find(period => period.id === periodId);
  const splitPeriod = splitPeriodId ? findPeriod(splitPeriodId) : undefined;
  const attachmentPeriod = attachmentPeriodId ? findPeriod(attachmentPeriodId) : undefined;
  const detailPeriod = detailPeriodId ? findPeriod(detailPeriodId) : undefined;
  const attachmentPeriodIndex = attachmentPeriod
    ? periods.findIndex(period => period.id === attachmentPeriod.id)
    : -1;
  const attachmentRecords = attachmentPeriod
    ? [
        ...getProjectPeriodSystemAttachments(attachmentPeriod),
        ...(periodAttachments[attachmentPeriod.id] || []),
      ]
    : [];

  const openPaymentEditor = (period: PaymentPeriod) => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      amount: period.expectedAmount,
      paymentDate: formatDate(new Date()),
      paymentMethod: '公对公',
      note: '',
    });
    setPaymentFiles([]);
    setPaymentEditor({ periodId: period.id });
  };

  const openInvoiceEditor = (period: PaymentPeriod) => {
    invoiceForm.resetFields();
    invoiceForm.setFieldsValue({
      amount: period.expectedAmount,
      invoiceType: '增值税专用发票',
      taxRate: 6,
      taxAmount: Math.round(period.expectedAmount * 0.06 * 100) / 100,
      invoiceTitle: customerInvoiceInfo?.customerName || '武汉某某科技有限公司',
      taxpayerId: customerInvoiceInfo?.taxpayerId || '',
      customerAddress: customerInvoiceInfo?.address || '',
      customerPhone: customerInvoiceInfo?.phone || '',
      bankName: customerInvoiceInfo?.bankName || '',
      bankAccount: customerInvoiceInfo?.bankAccount || '',
      recipientName: customerInvoiceInfo?.recipientName || '',
      recipientPhone: customerInvoiceInfo?.recipientPhone || '',
      recipientEmail: customerInvoiceInfo?.recipientEmail || '',
    });
    setInvoiceFiles([]);
    setInvoiceEditor({ periodId: period.id });
  };

  const closePaymentEditor = () => {
    setPaymentEditor(null);
    setPaymentFiles([]);
    paymentForm.resetFields();
  };

  const closeInvoiceEditor = () => {
    setInvoiceEditor(null);
    setInvoiceFiles([]);
    invoiceForm.resetFields();
  };

  const savePayment = () => {
    if (!paymentEditor) return;
    const period = findPeriod(paymentEditor.periodId);
    if (!period) return;

    paymentForm.validate().then(values => {
      const amount = Number(values.amount);
      if (amount > period.expectedAmount) {
        Message.error(`回款金额不能超过应回款金额 ${formatCurrency(period.expectedAmount)}`);
        return;
      }

      const record: PaymentRecord = {
        id: `project-payment-${Date.now()}`,
        amount,
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod,
        voucherFiles: getFileNames(paymentFiles),
        note: values.note?.trim() || '',
      };
      setPeriods(current => current.map(item => item.id === period.id
        ? { ...item, payments: [record] }
        : item));
      Message.success('回款信息已保存');
      closePaymentEditor();
    }).catch(() => {});
  };

  const saveInvoice = () => {
    if (!invoiceEditor) return;
    const period = findPeriod(invoiceEditor.periodId);
    if (!period) return;

    invoiceForm.validate().then(values => {
      const amount = Number(values.amount);
      if (amount > period.expectedAmount) {
        Message.error(`开票金额不能超过应回款金额 ${formatCurrency(period.expectedAmount)}`);
        return;
      }

      submitApplication({
        projectId,
        projectName,
        projectNo,
        contractId,
        periodId: period.id,
        periodLabel: getProjectPeriodLabel(period, periods.findIndex(item => item.id === period.id)),
        expectedAmount: period.expectedAmount,
        paymentStatus: period.payments.reduce((total, record) => total + record.amount, 0) >= period.expectedAmount
          ? '已回款'
          : period.payments.length
            ? '部分回款'
            : '未回款',
        paymentPeriods: paymentPeriodSnapshots,
        amount,
        invoiceType: values.invoiceType,
        taxRate: Number(values.taxRate),
        taxAmount: Number(values.taxAmount),
        customerName: values.invoiceTitle.trim(),
        taxpayerId: values.taxpayerId.trim(),
        customerAddress: values.customerAddress?.trim() || '',
        customerPhone: values.customerPhone.trim(),
        bankName: values.bankName.trim(),
        bankAccount: values.bankAccount.trim(),
        recipientName: values.recipientName.trim(),
        recipientPhone: values.recipientPhone.trim(),
        recipientEmail: values.recipientEmail?.trim() || '',
      });
      Message.success('开票申请已提交');
      closeInvoiceEditor();
    }).catch(() => {});
  };

  const openSplitModal = (period: PaymentPeriod) => {
    const existingChildren = period.isSplitParent
      ? periods.filter(item => item.parentPeriodId === period.id)
      : [];
    const firstAmount = Math.round((period.expectedAmount / 2) * 100) / 100;
    const draftRecords = existingChildren.length
      ? existingChildren
      : [
          {
            expectedAmount: firstAmount,
            expectedDate: period.expectedDate,
            condition: period.condition,
          },
          {
            expectedAmount: Math.round((period.expectedAmount - firstAmount) * 100) / 100,
            expectedDate: period.expectedDate,
            condition: period.condition,
          },
        ];
    const fields = draftRecords.reduce<Record<string, string | number>>((values, item, index) => {
      const recordNo = index + 1;
      values[`splitAmount${recordNo}`] = item.expectedAmount;
      values[`splitDate${recordNo}`] = item.expectedDate;
      values[`splitCondition${recordNo}`] = item.condition;
      return values;
    }, {});

    splitForm.resetFields();
    splitForm.setFieldsValue(fields);
    setSplitRecordCount(draftRecords.length);
    setSplitPeriodId(period.id);
  };

  const closeSplitModal = () => {
    setSplitPeriodId(null);
    setSplitRecordCount(2);
    splitForm.resetFields();
  };

  const addSplitRecord = () => {
    if (!splitPeriod) return;
    const nextRecordNo = splitRecordCount + 1;
    splitForm.setFieldsValue({
      [`splitDate${nextRecordNo}`]: splitPeriod.expectedDate,
      [`splitCondition${nextRecordNo}`]: splitPeriod.condition,
    });
    setSplitRecordCount(nextRecordNo);
  };

  const openAttachmentModal = (period: PaymentPeriod) => {
    setAttachmentPeriodId(period.id);
    setAttachmentFormVisible(false);
    setAttachmentFiles([]);
    attachmentForm.resetFields();
  };

  const closeAttachmentModal = () => {
    setAttachmentPeriodId(null);
    setAttachmentFormVisible(false);
    setAttachmentFiles([]);
    attachmentForm.resetFields();
  };

  const saveAttachment = () => {
    if (!attachmentPeriod) return;
    attachmentForm.validate().then(values => {
      if (!attachmentFiles.length) {
        Message.error('请上传附件文件');
        return;
      }
      const attachment: ProjectPeriodAttachment = {
        id: `project-attachment-${Date.now()}`,
        type: values.type,
        name: values.name.trim(),
        description: values.description?.trim() || '',
        files: getFileNames(attachmentFiles),
      };
      setPeriodAttachments(current => ({
        ...current,
        [attachmentPeriod.id]: [...(current[attachmentPeriod.id] || []), attachment],
      }));
      Message.success('附件记录已新增');
      setAttachmentFormVisible(false);
      setAttachmentFiles([]);
      attachmentForm.resetFields();
    }).catch(() => {});
  };

  const saveSplitPeriods = () => {
    if (!splitPeriod) return;
    splitForm.validate().then(values => {
      const splitRecords = Array.from({ length: splitRecordCount }, (_, index) => {
        const recordNo = index + 1;
        return {
          amount: Number(values[`splitAmount${recordNo}`]),
          expectedDate: values[`splitDate${recordNo}`],
          condition: values[`splitCondition${recordNo}`]?.trim() || '',
        };
      });
      const totalAmount = splitRecords.reduce((total, record) => total + record.amount, 0);
      if (Math.abs(totalAmount - splitPeriod.expectedAmount) > 0.005) {
        Message.error(`拆分金额合计应等于 ${formatCurrency(splitPeriod.expectedAmount)}`);
        return;
      }

      setPeriods(current => {
        const index = current.findIndex(period => period.id === splitPeriod.id);
        if (index < 0) return current;
        const baseLabel = getProjectPeriodLabel(splitPeriod, index).replace(/-\d+$/, '');
        const splitTimestamp = Date.now();
        const parentPeriod: PaymentPeriod = {
          ...splitPeriod,
          isSplitParent: true,
          parentPeriodId: undefined,
          payments: splitPeriod.isSplitParent ? splitPeriod.payments : [],
          invoices: splitPeriod.isSplitParent ? splitPeriod.invoices : [],
        };
        const existingChildren = current.filter(period => period.parentPeriodId === splitPeriod.id);
        const nextPeriods: PaymentPeriod[] = splitRecords.map((record, recordIndex) => ({
          ...splitPeriod,
          ...existingChildren[recordIndex],
          id: existingChildren[recordIndex]?.id || `${splitPeriod.id}-${recordIndex + 1}-${splitTimestamp}`,
          periodLabel: `${baseLabel}-${recordIndex + 1}`,
          isSplitParent: false,
          parentPeriodId: splitPeriod.id,
          expectedAmount: record.amount,
          expectedDate: record.expectedDate,
          condition: record.condition,
          payments: existingChildren[recordIndex]?.payments || [],
          invoices: existingChildren[recordIndex]?.invoices || [],
        }));
        return current.flatMap(period => {
          if (period.id === splitPeriod.id) return [parentPeriod, ...nextPeriods];
          if (period.parentPeriodId === splitPeriod.id) return [];
          return [period];
        });
      });
      Message.success('回款期次已拆分');
      closeSplitModal();
    }).catch(() => {});
  };

  const getSplitParentStatuses = (children: PaymentPeriod[]) => {
    const expectedAmount = children.reduce((total, child) => total + child.expectedAmount, 0);
    const paidAmount = children.reduce(
      (total, child) => total + child.payments.reduce((amount, record) => amount + record.amount, 0),
      0,
    );
    const invoicedAmount = children.reduce(
      (total, child) => total + child.invoices.reduce((amount, record) => amount + record.amount, 0),
      0,
    );

    return {
      payment: paidAmount >= expectedAmount && expectedAmount > 0
        ? PERIOD_PAYMENT_STATUS.已回款
        : paidAmount > 0
          ? PERIOD_PAYMENT_STATUS.部分回款
          : PERIOD_PAYMENT_STATUS.未回款,
      invoice: invoicedAmount >= expectedAmount && expectedAmount > 0
        ? PERIOD_INVOICE_STATUS.已开票
        : invoicedAmount > 0
          ? PERIOD_INVOICE_STATUS.部分开票
          : PERIOD_INVOICE_STATUS.未开票,
    };
  };

  // P0② 统一状态权限矩阵：回款四态×开票状态×申请态×拆分角色 -> 拆分/回款/开票/冲红操作显隐的唯一判断源
  const getPeriodPermissions = (period: PaymentPeriod) => getPeriodActionPermissions({
    metrics: getPaymentPeriodMetrics(period),
    isSplitParent: Boolean(period.isSplitParent),
    isSplitChild: Boolean(period.parentPeriodId),
    applicationStatus: findApplication(projectId, period.id)?.status,
  });

  const periodColumns = [
    {
      title: '期次',
      width: 168,
      fixed: 'left' as const,
      render: (_: unknown, period: PaymentPeriod, index: number) => {
        const isSplitParent = Boolean(period.isSplitParent);
        const isSplitChild = Boolean(period.parentPeriodId);
        const childPeriods = periods.filter(item => item.parentPeriodId === period.id);
        const hasPayment = period.payments.length > 0;
        const invoiceApplication = findApplication(projectId, period.id);
        const hasInvoice = period.invoices.length > 0 || invoiceApplication?.status === '已开票';

        if (isSplitParent) {
          const statuses = getSplitParentStatuses(childPeriods);
          return (
            <div className="project-payment-period-cell is-split-parent">
              <div className="project-payment-period-parent-title">
                <strong>{getProjectPeriodLabel(period, index)}</strong>
                <StatusTag tone="info" size="small">已拆分</StatusTag>
              </div>
              <div className="project-payment-period-parent-statuses">
                <StatusTag meta={statuses.payment} />
                <StatusTag meta={statuses.invoice} />
              </div>
            </div>
          );
        }

        return (
          <div className={`project-payment-period-cell${isSplitChild ? ' is-split-child' : ''}`}>
            <strong>{getProjectPeriodLabel(period, index)}</strong>
            <div className="project-payment-period-statuses">
              <ProjectStatusTag
                status={hasPayment ? '已回款' : '未回款'}
                tone={hasPayment ? 'success' : 'neutral'}
                onClick={() => {
                  const record = period.payments[period.payments.length - 1];
                  if (record) setPaymentViewer({ record });
                  else openPaymentEditor(period);
                }}
              />
              <ProjectStatusTag
                status={invoiceApplication?.status || (hasInvoice ? '已开票' : '未开票')}
                tone={invoiceApplication?.status === '开票中' ? 'warning' : hasInvoice ? 'info' : 'neutral'}
                onClick={() => {
                  const record = period.invoices[period.invoices.length - 1];
                  if (invoiceApplication?.status === '开票中') Message.info('开票申请已提交，财务正在处理中');
                  else if (invoiceApplication?.status === '已开票') setInvoiceViewer({ record: {
                    id: invoiceApplication.id,
                    amount: invoiceApplication.amount,
                    invoiceDate: invoiceApplication.invoicedAt || '-',
                    invoiceType: invoiceApplication.invoiceType,
                    invoiceTitle: invoiceApplication.customerName,
                    taxRate: invoiceApplication.taxRate,
                    taxAmount: invoiceApplication.taxAmount,
                    taxpayerId: invoiceApplication.taxpayerId,
                    customerAddress: invoiceApplication.customerAddress,
                    customerPhone: invoiceApplication.customerPhone,
                    bankName: invoiceApplication.bankName,
                    bankAccount: invoiceApplication.bankAccount,
                    recipientName: invoiceApplication.recipientName,
                    recipientPhone: invoiceApplication.recipientPhone,
                    recipientEmail: invoiceApplication.recipientEmail,
                    invoiceFiles: invoiceApplication.invoiceFiles,
                    note: '',
                  } });
                  else if (record) setInvoiceViewer({ record });
                  else openInvoiceEditor(period);
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: '应回款',
      width: 146,
      render: (_: unknown, period: PaymentPeriod) => (
        <div>
          <div className="lead-payment-primary-amount"><MoneyText value={period.expectedAmount} /></div>
          <div className="lead-payment-cell-note">预计日期：{period.expectedDate || '-'}</div>
        </div>
      ),
    },
    {
      title: '回款条件',
      dataIndex: 'condition',
      render: (condition: string) => condition || '-',
    },
    {
      title: '实际回款',
      width: 146,
      render: (_: unknown, period: PaymentPeriod) => {
        if (period.isSplitParent) return <span className="project-payment-empty-value">-</span>;
        const paidAmount = period.payments.reduce((total, record) => total + record.amount, 0);
        const latestPayment = period.payments[period.payments.length - 1];
        return (
          <div>
            <div className="lead-payment-primary-amount is-paid">
              {paidAmount ? <MoneyText value={paidAmount} /> : '-'}
            </div>
            <div className="lead-payment-cell-note">回款日期：{latestPayment?.paymentDate || '-'}</div>
          </div>
        );
      },
    },
    {
      title: '操作',
      width: 210,
      fixed: 'right' as const,
      render: (_: unknown, period: PaymentPeriod) => {
        const permissions = getPeriodPermissions(period);
        return (
          <Space size={4}>
            <Button type="text" size="mini" onClick={() => setDetailPeriodId(period.id)}>详情</Button>
            {permissions.canRegisterPayment && <Button type="text" size="mini" onClick={() => openPaymentEditor(period)}>回款</Button>}
            {permissions.canApplyInvoice && <Button type="text" size="mini" onClick={() => openInvoiceEditor(period)}>开票</Button>}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="lead-payment-panel project-payment-panel">
      <div className="lead-payment-summary">
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">合同总额</div>
          <div className="lead-payment-summary-value"><MoneyText value={contractAmount} /></div>
        </div>
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">实际回款金额</div>
          <div className="lead-payment-summary-value is-paid"><MoneyText value={summary.paidAmount} /></div>
        </div>
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">待回款金额</div>
          <div className="lead-payment-summary-value is-pending"><MoneyText value={pendingAmount} /></div>
        </div>
        <div className="lead-payment-summary-item">
          <div className="lead-payment-summary-label">已开票金额</div>
          <div className="lead-payment-summary-value is-invoiced"><MoneyText value={summary.invoicedAmount + completedInvoiceAmount} /></div>
        </div>
      </div>

      <DataTable
        rowKey="id"
        size="small"
        pagination={false}
        columns={periodColumns}
        data={periods}
        rowClassName={(period: PaymentPeriod) => (
          period.isSplitParent
            ? 'project-payment-split-parent-row'
            : period.parentPeriodId
              ? 'project-payment-split-child-row'
              : ''
        )}
        scroll={{ x: 800 }}
      />

      <Modal className="hubx-modal"
        title={detailPeriod ? `${getProjectPeriodLabel(detailPeriod, periods.findIndex(item => item.id === detailPeriod.id))} 详情` : '回款与发票详情'}
        visible={Boolean(detailPeriod)}
        onCancel={() => setDetailPeriodId(null)}
        footer={null}
        style={{ width: 860, maxWidth: 'calc(100vw - 32px)', '--modal-content-bg': 'var(--grey-100)' } as CSSProperties}
      >
        {detailPeriod && (() => {
          const application = findApplication(projectId, detailPeriod.id);
          const detailPermissions = getPeriodPermissions(detailPeriod);
          const attachments = [...getProjectPeriodSystemAttachments(detailPeriod), ...(periodAttachments[detailPeriod.id] || [])];
          const payment = detailPeriod.payments[detailPeriod.payments.length - 1];
          return <div className="project-period-detail">
            <div className="project-period-detail-hero">
              <div className="project-period-detail-amount"><span>本期应回款</span><div className="project-period-detail-amount-row"><strong><MoneyText value={detailPeriod.expectedAmount} /></strong><div className="project-period-detail-status"><span className={payment ? 'is-paid' : 'is-muted'}>{payment ? '已回款' : '未回款'}</span><span className={application?.status === '已开票' ? 'is-invoiced' : application?.status === '已冲红' ? 'is-red-flushed' : application?.status === '开票中' ? 'is-invoicing' : 'is-muted'}>{application?.status || (detailPeriod.invoices.length ? '已开票' : '未开票')}</span></div></div><small>预计回款日期：{detailPeriod.expectedDate || '-'}</small></div>
              <div className="project-period-detail-hero-actions">{detailPermissions.canSplit && <Button className="project-period-split-button" onClick={() => openSplitModal(detailPeriod)}>拆分期次</Button>}{detailPermissions.canRedFlush && application && <Button className="project-period-red-flush-button" onClick={() => { setRedFlushApplicationId(application.id); setRedFlushReason(''); setRedFlushFiles([]); }}>冲红</Button>}</div>
            </div>
            <div className="project-period-detail-body">
              <section className="project-period-detail-section"><div className="project-period-detail-section-title"><span>01</span><div><strong>回款条件</strong><small>本期触发回款的业务节点</small></div></div><p className="project-period-detail-condition">{detailPeriod.condition || '暂未填写回款条件'}</p></section>
              <section className="project-period-detail-section"><div className="project-period-detail-section-title"><span>02</span><div><strong>回款记录</strong><small>每个期次仅保留一条有效回款记录</small></div></div>{payment ? <div className="project-payment-record-card"><div className="project-payment-record-amount"><span>实际回款</span><strong><MoneyText value={payment.amount} /></strong></div><div className="project-payment-record-meta"><div><span>回款日期</span><strong>{payment.paymentDate}</strong></div><div><span>回款方式</span><strong>{payment.paymentMethod}</strong></div><div><span>回款说明</span><strong>{payment.note || '-'}</strong></div></div><div className="project-payment-record-files"><span>回款凭证</span><ProjectRecordFiles files={payment.voucherFiles} /></div></div> : <div className="project-period-detail-empty">当前期次尚未登记回款</div>}</section>
              <section className="project-period-detail-section"><div className="project-period-detail-section-title"><span>03</span><div><strong>附件资料</strong><small>当前期次的回款凭证、发票及其他资料</small></div></div>{attachments.length ? <div className="project-period-detail-attachments">{attachments.map(item => <div key={item.id} className="project-period-detail-attachment"><div><StatusTag size="small">{item.type}</StatusTag><strong>{item.name}</strong><small>{item.description || '暂无说明'}</small></div><ProjectRecordFiles files={item.files} /></div>)}</div> : <div className="project-period-detail-empty">暂无附件资料</div>}<div className="project-period-detail-actions"><Button type="text" icon={<IconPlus />} onClick={() => openAttachmentModal(detailPeriod)}>新增附件</Button></div></section>
            </div>
          </div>;
        })()}
      </Modal>

      <Modal title="发票冲红" visible={Boolean(redFlushApplicationId)} okText="确认冲红" onCancel={() => { setRedFlushApplicationId(null); setRedFlushFiles([]); }} onOk={() => { if (!redFlushReason.trim()) { Message.warning('请填写冲红原因'); return; } redFlushInvoice(redFlushApplicationId!, redFlushReason.trim(), getFileNames(redFlushFiles)); setRedFlushApplicationId(null); setRedFlushFiles([]); setDetailPeriodId(null); Message.success('已冲红并生成新的待开票记录'); }} okButtonProps={{ status: 'danger' }}>
        <FormItem label="冲红原因" required><Input.TextArea value={redFlushReason} onChange={setRedFlushReason} rows={4} maxLength={300} showWordLimit placeholder="请说明开错票的原因" /></FormItem>
        <FormItem label="冲红附件"><Upload autoUpload={false} multiple accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" fileList={redFlushFiles} onChange={setRedFlushFiles}><Button icon={<IconFile />}>上传文件</Button></Upload><div style={{ marginTop: 6, color: 'var(--color-text-3)', fontSize: 'var(--text-xs)' }}>支持图片、PDF、Word、Excel、PPT、文本和压缩包，可上传多个文件</div></FormItem>
      </Modal>

      <Modal
        title="填写回款信息"
        visible={Boolean(paymentEditor)}
        onOk={savePayment}
        onCancel={closePaymentEditor}
        okText="提交"
        maskClosable={false}
        style={{ width: 680, maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={paymentForm} layout="vertical">
          <div className="project-payment-modal-notice">请确认是否已回款，若已回款请提交回款信息</div>
          <FormGrid columns={2}>
            <div>
              <FormItem label="回款金额" field="amount" rules={[{ required: true, message: '请输入回款金额' }]}>
                <InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} />
              </FormItem>
            </div>
            <div>
              <FormItem label="回款日期" field="paymentDate" rules={[{ required: true, message: '请选择回款日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </FormItem>
            </div>
          </FormGrid>
          <FormItem label="回款方式" field="paymentMethod" rules={[{ required: true, message: '请选择回款方式' }]}>
            <Select placeholder="请选择回款方式">
              {PAYMENT_METHOD_OPTIONS.map(option => <Select.Option key={option} value={option}>{option}</Select.Option>)}
            </Select>
          </FormItem>
          <FormItem label="回款凭证">
            <Upload autoUpload={false} accept=".jpg,.jpeg,.png,.pdf" limit={5} fileList={paymentFiles} onChange={setPaymentFiles}>
              <Button icon={<IconFile />}>上传回款凭证</Button>
            </Upload>
          </FormItem>
          <FormItem label="回款说明" field="note">
            <Input.TextArea placeholder="请输入回款说明" maxLength={300} showWordLimit autoSize={{ minRows: 3, maxRows: 5 }} />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="回款信息"
        visible={Boolean(paymentViewer)}
        onCancel={() => setPaymentViewer(null)}
        footer={null}
        style={{ width: 640, maxWidth: 'calc(100vw - 32px)' }}
      >
        {paymentViewer && (
          <div className="project-payment-view-grid">
            <div><span>回款金额</span><strong className="lead-payment-primary-amount is-paid"><MoneyText value={paymentViewer.record.amount} /></strong></div>
            <div><span>回款日期</span><strong>{paymentViewer.record.paymentDate}</strong></div>
            <div><span>回款方式</span><strong>{paymentViewer.record.paymentMethod}</strong></div>
            <div className="is-full"><span>回款凭证</span><ProjectRecordFiles files={paymentViewer.record.voucherFiles} /></div>
            <div className="is-full"><span>回款说明</span><strong>{paymentViewer.record.note || '-'}</strong></div>
          </div>
        )}
      </Modal>

      <Modal className="hubx-modal"
        title="填写开票信息"
        visible={Boolean(invoiceEditor)}
        onOk={saveInvoice}
        onCancel={closeInvoiceEditor}
        okText="提交开票申请"
        cancelText="取消"
        maskClosable={false}
        style={{ width: 820, maxWidth: 'calc(100vw - 32px)', '--modal-content-max-height': 'calc(100vh - 180px)', '--modal-content-overflow': 'auto', '--modal-content-padding': '20px 24px 8px' } as CSSProperties}
      >
        <Form form={invoiceForm} layout="vertical" className="project-invoice-application-form">
          <div className="project-invoice-form-tip">客户信息已根据关联合同自动带入，提交前请核对并按实际开票资料修改。</div>
          <div className="project-invoice-form-section-title"><span>1</span><div><strong>发票信息</strong><small>选择发票类别，填写金额和税率</small></div></div>
          <FormGrid columns={2}>
            <div>
              <FormItem label="发票类别" field="invoiceType" rules={[{ required: true, message: '请选择发票类别' }]}>
                <Select placeholder="请选择发票类别">
                  {PROJECT_INVOICE_TYPE_OPTIONS.map(option => <Select.Option key={option} value={option}>{option}</Select.Option>)}
                </Select>
              </FormItem>
            </div>
            <div>
              <FormItem label="发票税率" field="taxRate" rules={[{ required: true, message: '请输入发票税率' }]}>
                <InputNumber
                  min={0}
                  precision={2}
                  suffix="%"
                  style={{ width: '100%' }}
                  onChange={value => {
                    const amount = Number(invoiceForm.getFieldValue('amount')) || 0;
                    invoiceForm.setFieldValue('taxAmount', Math.round(amount * (Number(value) || 0)) / 100);
                  }}
                />
              </FormItem>
            </div>
          </FormGrid>
          <FormGrid columns={2}>
            <div>
              <FormItem label="开票金额" field="amount" rules={[{ required: true, message: '请输入开票金额' }]}>
                <InputNumber
                  min={0.01}
                  precision={2}
                  prefix="¥"
                  style={{ width: '100%' }}
                  onChange={value => {
                    const taxRate = Number(invoiceForm.getFieldValue('taxRate')) || 0;
                    invoiceForm.setFieldValue('taxAmount', Math.round((Number(value) || 0) * taxRate) / 100);
                  }}
                />
              </FormItem>
            </div>
            <div>
              <FormItem className="project-invoice-tax-amount" label="发票税额（自动计算）" field="taxAmount" rules={[{ required: true, message: '请输入发票税额' }]}>
                <InputNumber min={0} precision={2} prefix="¥" disabled style={{ width: '100%' }} />
              </FormItem>
            </div>
          </FormGrid>
          <div className="project-invoice-form-section-title"><span>2</span><div><strong>购方开票信息</strong><small>请与客户提供的开票资料保持一致</small></div></div>
          <FormGrid columns={2}>
            <FormItem label="客户名称" field="invoiceTitle" rules={[{ required: true, message: '请输入客户名称' }]}><Input maxLength={100} /></FormItem>
            <FormItem label="纳税人识别号" field="taxpayerId" rules={[{ required: true, message: '请输入纳税人识别号' }]}><Input maxLength={30} /></FormItem>
          </FormGrid>
          <FormGrid columns={2}>
            <FormItem label="地址" field="customerAddress"><Input maxLength={200} /></FormItem>
            <FormItem label="手机号" field="customerPhone" rules={[{ required: true, message: '请输入手机号' }]}><Input maxLength={30} /></FormItem>
          </FormGrid>
          <FormGrid columns={2}>
            <FormItem label="开户行" field="bankName" rules={[{ required: true, message: '请输入开户行' }]}><Input maxLength={100} /></FormItem>
            <FormItem label="银行账号" field="bankAccount" rules={[{ required: true, message: '请输入银行账号' }]}><Input maxLength={40} /></FormItem>
          </FormGrid>
          <div className="project-invoice-form-section-title"><span>3</span><div><strong>收票人信息</strong><small>用于发票送达和联系</small></div></div>
          <FormGrid columns={2}>
            <FormItem label="收票人姓名" field="recipientName" rules={[{ required: true, message: '请输入收票人姓名' }]}><Input maxLength={50} /></FormItem>
            <FormItem label="收票人电话" field="recipientPhone" rules={[{ required: true, message: '请输入收票人电话' }]}><Input maxLength={30} /></FormItem>
          </FormGrid>
          <FormGrid columns={2}>
            <FormItem label="收票人邮箱" field="recipientEmail"><Input maxLength={100} /></FormItem>
          </FormGrid>
        </Form>
      </Modal>

      <Modal
        title="开票信息"
        visible={Boolean(invoiceViewer)}
        onCancel={() => setInvoiceViewer(null)}
        footer={null}
        style={{ width: 680, maxWidth: 'calc(100vw - 32px)' }}
      >
        {invoiceViewer && (
          <div className="project-payment-view-grid">
            <div><span>开票日期</span><strong>{invoiceViewer.record.invoiceDate}</strong></div>
            <div><span>开票金额</span><strong className="lead-payment-primary-amount is-invoiced"><MoneyText value={invoiceViewer.record.amount} /></strong></div>
            <div><span>发票类型</span><strong>{invoiceViewer.record.invoiceType}</strong></div>
            <div><span>发票税率</span><strong>{invoiceViewer.record.taxRate == null ? '-' : `${invoiceViewer.record.taxRate}%`}</strong></div>
            <div><span>发票税额</span><strong>{invoiceViewer.record.taxAmount == null ? '-' : <MoneyText value={invoiceViewer.record.taxAmount} />}</strong></div>
            <div><span>发票抬头</span><strong>{invoiceViewer.record.invoiceTitle}</strong></div>
            <div><span>纳税人识别号</span><strong>{invoiceViewer.record.taxpayerId || '-'}</strong></div>
            <div><span>地址</span><strong>{invoiceViewer.record.customerAddress || '-'}</strong></div>
            <div><span>手机号</span><strong>{invoiceViewer.record.customerPhone || '-'}</strong></div>
            <div><span>开户行</span><strong>{invoiceViewer.record.bankName || '-'}</strong></div>
            <div><span>银行账号</span><strong>{invoiceViewer.record.bankAccount || '-'}</strong></div>
            <div><span>收票人姓名</span><strong>{invoiceViewer.record.recipientName || '-'}</strong></div>
            <div><span>收票人电话</span><strong>{invoiceViewer.record.recipientPhone || '-'}</strong></div>
            <div className="is-full"><span>收票人邮箱</span><strong>{invoiceViewer.record.recipientEmail || '-'}</strong></div>
            <div className="is-full"><span>发票文件</span><ProjectRecordFiles files={invoiceViewer.record.invoiceFiles} /></div>
            <div className="is-full"><span>备注信息</span><strong>{invoiceViewer.record.note || '-'}</strong></div>
          </div>
        )}
      </Modal>

      <Modal
        title={attachmentPeriod ? `${getProjectPeriodLabel(attachmentPeriod, attachmentPeriodIndex)} 附件` : '附件'}
        visible={Boolean(attachmentPeriod)}
        onCancel={closeAttachmentModal}
        footer={null}
        style={{ width: 720, maxWidth: 'calc(100vw - 32px)' }}
      >
        {attachmentPeriod && (
          <div>
            <div className="project-payment-attachment-header">
              <strong>附件列表</strong>
              <Button
                type="primary"
                size="small"
                icon={<IconPlus />}
                onClick={() => {
                  attachmentForm.resetFields();
                  setAttachmentFiles([]);
                  setAttachmentFormVisible(true);
                }}
              >
                新增附件
              </Button>
            </div>

            {attachmentRecords.length ? (
              <DataTable
                className="project-payment-attachment-table"
                rowKey="id"
                size="small"
                pagination={false}
                columns={attachmentColumns}
                data={attachmentRecords}
                scroll={{ x: 620 }}
              />
            ) : (
              <div className="project-payment-attachment-empty">暂无附件记录</div>
            )}

            {attachmentFormVisible && (
              <div className="project-payment-attachment-form">
                <strong>新增附件记录</strong>
                <Form form={attachmentForm} layout="vertical" style={{ marginTop: 12 }}>
                  <FormGrid columns={2}>
                    <div>
                      <FormItem label="附件类型" field="type" rules={[{ required: true, message: '请选择附件类型' }]}>
                        <Select placeholder="请选择附件类型">
                          {PROJECT_ATTACHMENT_TYPE_OPTIONS.map(option => (
                            <Select.Option key={option} value={option}>{option}</Select.Option>
                          ))}
                        </Select>
                      </FormItem>
                    </div>
                    <div>
                      <FormItem label="附件名称" field="name" rules={[{ required: true, message: '请输入附件名称' }]}>
                        <Input placeholder="请输入附件名称" maxLength={100} />
                      </FormItem>
                    </div>
                  </FormGrid>
                  <FormItem label="说明" field="description">
                    <Input.TextArea placeholder="请输入附件说明" maxLength={300} showWordLimit autoSize={{ minRows: 2, maxRows: 4 }} />
                  </FormItem>
                  <FormItem label="附件文件">
                    <Upload
                      autoUpload={false}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      limit={5}
                      fileList={attachmentFiles}
                      onChange={setAttachmentFiles}
                    >
                      <Button icon={<IconFile />}>上传附件文件</Button>
                    </Upload>
                  </FormItem>
                  <div className="project-payment-attachment-form-actions">
                    <Button onClick={() => {
                      setAttachmentFormVisible(false);
                      setAttachmentFiles([]);
                      attachmentForm.resetFields();
                    }}>
                      取消
                    </Button>
                    <Button type="primary" onClick={saveAttachment}>保存</Button>
                  </div>
                </Form>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="拆分回款期次"
        visible={Boolean(splitPeriod)}
        onOk={saveSplitPeriods}
        onCancel={closeSplitModal}
        okText="提交"
        maskClosable={false}
        style={{ width: 680, maxWidth: 'calc(100vw - 32px)' }}
      >
        {splitPeriod && (
          <Form form={splitForm} layout="vertical">
            {Array.from({ length: splitRecordCount }, (_, index) => index + 1).map(item => {
              const periodIndex = periods.findIndex(period => period.id === splitPeriod.id);
              const baseLabel = getProjectPeriodLabel(splitPeriod, periodIndex).replace(/-\d+$/, '');
              return (
                <div key={item} className="project-payment-split-item">
                  <strong>{baseLabel}-{item}</strong>
                  <FormGrid columns={2}>
                    <div>
                      <FormItem label="回款金额" field={`splitAmount${item}`} rules={[{ required: true, message: '请输入回款金额' }]}>
                        <InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} />
                      </FormItem>
                    </div>
                    <div>
                      <FormItem label="预计回款日期" field={`splitDate${item}`} rules={[{ required: true, message: '请选择预计回款日期' }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </FormItem>
                    </div>
                  </FormGrid>
                  <FormItem label="回款条件" field={`splitCondition${item}`}>
                    <Input placeholder="请输入回款条件" />
                  </FormItem>
                </div>
              );
            })}
            <div className="project-payment-split-add-action">
              <Button type="text" size="small" icon={<IconPlus />} onClick={addSplitRecord}>
                新增记录
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
