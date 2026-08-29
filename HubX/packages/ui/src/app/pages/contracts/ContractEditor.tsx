import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Grid,
  Input,
  InputNumber,
  Message,
  Modal,
  Result,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import {
  IconBold,
  IconDownload,
  IconItalic,
  IconLeft,
  IconOrderedList,
  IconPlus,
  IconRedo,
  IconUndo,
  IconUnorderedList,
} from '@arco-design/web-react/icon';
import { useContracts } from './ContractsContext';
import { findQuotation, parseQuoteAmount } from './leadContextMock';
import { renderContractDocument } from './templates';
import {
  CONTRACT_STATUS_COLOR,
  CONTRACT_STATUS_LABEL,
  getPaymentPlanExpectedDateLabel,
  getPaymentPlanPeriodLabel,
} from './utils';
import { QuoteMismatchAlert } from './components/QuoteMismatchAlert';
import { PageShell } from '@/app/components/ui';
import {
  contractSigningEntities,
  findCompanyEntityByName,
  getCompanyContractTemplate,
} from '../company-entity/companyEntityData';
import type {
  ContractFormData,
  PaymentPlanAmountType,
  PaymentPlanDateType,
  PaymentPlanItem,
  PaymentRatio,
} from './types';

const Title = Typography.Title;

interface PaymentPlanDraft {
  expectedDateType: PaymentPlanDateType;
  expectedDays: number;
  expectedDate: string;
  condition: string;
  amountType: PaymentPlanAmountType;
  amountValue: number;
}

interface PaymentRatioTemplate {
  id: string;
  ratio: string;
  description: string;
  percentages: number[];
  conditions: string[];
}

const DEFAULT_PAYMENT_RATIO_TEMPLATES: PaymentRatioTemplate[] = [
  { id: '3:3:3:1', ratio: '3:3:3:1', description: '合同签订、中期交付、验收、质保尾款四阶段回款', percentages: [30, 30, 30, 10], conditions: ['合同签订后支付首款', '项目中期阶段成果确认后支付', '项目验收通过后支付', '质保期满且无未解决问题后支付'] },
  { id: '4:5:1', ratio: '4:5:1', description: '合同签订、项目验收、质保尾款三阶段回款', percentages: [40, 50, 10], conditions: ['合同签订后支付首款', '项目验收通过后支付', '质保期满且无未解决问题后支付'] },
];

const EMPTY_PAYMENT_PLAN_DRAFT: PaymentPlanDraft = {
  expectedDateType: 'workday',
  expectedDays: 0,
  expectedDate: '',
  condition: '',
  amountType: 'percentage',
  amountValue: 0,
};

export function ContractEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    getById,
    saveDraft,
  } = useContracts();

  const contract = getById(id);
  const [formData, setFormData] = useState<ContractFormData | null>(
    contract ? contract.current : null,
  );
  const [paymentPlanModalVisible, setPaymentPlanModalVisible] = useState(false);
  const [editingPaymentPlanIndex, setEditingPaymentPlanIndex] = useState<number | null>(null);
  const [paymentPlanDraft, setPaymentPlanDraft] = useState<PaymentPlanDraft>({
    ...EMPTY_PAYMENT_PLAN_DRAFT,
  });
  const [paymentRatioTemplates, setPaymentRatioTemplates] = useState(DEFAULT_PAYMENT_RATIO_TEMPLATES);
  const [selectedPaymentTemplateId, setSelectedPaymentTemplateId] = useState(formData?.paymentRatio ?? '');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateHtml, setTemplateHtml] = useState(() => (
    contract ? renderContractDocument(contract.current) : ''
  ));
  const templateEditorRef = useRef<HTMLDivElement>(null);
  const templateEditedRef = useRef(false);

  // 当合同对象更新（其他页面操作）但当前未脏时，把 current 同步进编辑表单
  const lastSeenContractRef = useRef(contract);
  useEffect(() => {
    if (contract && contract !== lastSeenContractRef.current) {
      // 简单策略：合同 status 变了或 current 引用变了就重置
      if (lastSeenContractRef.current?.current !== contract.current) {
        setFormData(contract.current);
      }
      lastSeenContractRef.current = contract;
    }
  }, [contract]);

  useEffect(() => {
    if (!formData) return;
    const companyTemplate = getCompanyContractTemplate(formData.signingEntity);
    if (companyTemplate?.contractTemplateId && companyTemplate.contractTemplateId !== formData.templateId) {
      setFormData((prev) => prev ? {
        ...prev,
        templateId: companyTemplate.contractTemplateId!,
        customContractHtml: undefined,
      } : prev);
      return;
    }
    setTemplateHtml(renderContractDocument(formData));
    templateEditedRef.current = false;
  }, [formData]);

  // 关联报价（用于不一致提醒）
  const linkedQuote = useMemo(() => {
    if (!contract) return null;
    return findQuotation(contract.leadId, contract.quoteId);
  }, [contract]);
  const quoteAmount = linkedQuote ? parseQuoteAmount(linkedQuote.amount) : 0;

  if (!contract || !formData) {
    return (
      <PageShell breadcrumbs={[{ label: '合同管理', to: '/contracts' }, { label: '合同列表', to: '/contracts' }, { label: '合同不存在' }]}>
      <Result
        status="404"
        title="合同不存在"
        subTitle="该合同可能已被删除，或链接有误。"
        extra={
          <Button type="primary" onClick={() => navigate('/contracts')}>
            返回合同列表
          </Button>
        }
      />
      </PageShell>
    );
  }

  const isReadonly =
    contract.status !== 'draft' && contract.status !== 'approving';
  const companyEntity = findCompanyEntityByName(formData.signingEntity);
  const companyContractTemplate = getCompanyContractTemplate(formData.signingEntity);
  const publicAccounts = companyEntity?.publicAccounts ?? [];
  const selectedPublicAccount = publicAccounts.find(
    (account) => account.id === formData.publicPaymentAccountId,
  ) ?? publicAccounts[0];
  const firstPaymentPlanIndex = formData.paymentPlans.reduce((firstIndex, plan, index, plans) => {
    if (firstIndex < 0 || plan.period < plans[firstIndex].period) return index;
    return firstIndex;
  }, -1);
  const firstPaymentPlanDateType = firstPaymentPlanIndex >= 0
    ? formData.paymentPlans[firstPaymentPlanIndex].expectedDateType ?? 'fixed'
    : null;

  const handleBack = () => {
    const returnTarget = (location.state as {
      contractEditorReturn?: { pathname: string; state?: Record<string, unknown> };
    } | null)?.contractEditorReturn;

    if (returnTarget?.pathname) {
      navigate(returnTarget.pathname, { state: returnTarget.state, replace: true });
      return;
    }
    navigate(`/contracts/${contract.id}`, { replace: true });
  };

  const updateField = <K extends keyof ContractFormData>(key: K, value: ContractFormData[K]) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSigningEntityChange = (signingEntity: string) => {
    const companyTemplate = getCompanyContractTemplate(signingEntity);
    templateEditedRef.current = false;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        signingEntity,
        templateId: companyTemplate?.contractTemplateId ?? prev.templateId,
        customContractHtml: undefined,
      };
    });
  };

  const getFormDataWithTemplateEdits = (): ContractFormData => {
    if (!templateEditedRef.current || !templateEditorRef.current) return formData;
    const customContractHtml = templateEditorRef.current.innerHTML;
    setTemplateHtml(customContractHtml);
    templateEditedRef.current = false;
    return { ...formData, customContractHtml };
  };

  const commitTemplateEdits = () => {
    if (!templateEditedRef.current) return;
    setFormData(getFormDataWithTemplateEdits());
  };

  const runEditorCommand = (command: string) => {
    templateEditorRef.current?.focus();
    document.execCommand(command);
    templateEditedRef.current = true;
  };

  const handleEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    templateEditedRef.current = true;
  };

  const handleTotalAmountChange = (value: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            totalAmount: value,
            paymentPlans: prev.paymentPlans.map((p) => ({
              ...p,
              amount: p.amountType === 'fixed'
                ? p.amount
                : Math.round(((value * p.percentage) / 100) * 100) / 100,
            })),
          }
        : prev,
    );
  };

  const openPaymentPlanModal = () => {
    setEditingPaymentPlanIndex(null);
    setPaymentPlanDraft({
      ...EMPTY_PAYMENT_PLAN_DRAFT,
      expectedDateType: firstPaymentPlanDateType ?? EMPTY_PAYMENT_PLAN_DRAFT.expectedDateType,
    });
    setPaymentPlanModalVisible(true);
  };

  const openEditPaymentPlanModal = (index: number) => {
    const plan = formData.paymentPlans[index];
    if (!plan) return;
    const amountType = plan.amountType ?? 'percentage';
    const expectedDateType = plan.expectedDateType ?? firstPaymentPlanDateType ?? 'fixed';
    setEditingPaymentPlanIndex(index);
    setPaymentPlanDraft({
      expectedDateType,
      expectedDays: plan.expectedDays ?? 0,
      expectedDate: plan.expectedDate || '',
      condition: plan.condition || '',
      amountType,
      amountValue: amountType === 'percentage' ? plan.percentage : plan.amount,
    });
    setPaymentPlanModalVisible(true);
  };

  const handlePaymentRatioChange = (templateId: string) => {
    const template = paymentRatioTemplates.find(item => item.id === templateId);
    if (!template) return;
    setFormData((prev) => prev ? {
      ...prev,
      paymentRatio: (template.ratio === '3:3:3:1' || template.ratio === '4:5:1' ? template.ratio : undefined) as PaymentRatio | undefined,
      paymentPlans: template.percentages.map((percentage, index) => ({ period: index + 1, expectedDate: '', expectedDateType: 'fixed', condition: template.conditions[index] || '', amount: Math.round(prev.totalAmount * percentage) / 100, percentage, amountType: 'percentage' })),
    } : prev);
    setSelectedPaymentTemplateId(templateId);
  };

  const savePaymentRatioTemplate = () => {
    if (!formData.paymentPlans.length) { Message.warning('请先配置回款计划'); return; }
    if (!templateDescription.trim()) { Message.warning('请输入模板描述'); return; }
    const percentages = formData.paymentPlans.map(plan => plan.percentage);
    const ratio = percentages.map(value => value / 10).join(':');
    const id = `custom-${Date.now()}`;
    setPaymentRatioTemplates(current => [...current, { id, ratio, description: templateDescription.trim(), percentages, conditions: formData.paymentPlans.map(plan => plan.condition || '') }]);
    setSelectedPaymentTemplateId(id);
    setTemplateModalVisible(false);
    setTemplateDescription('');
    Message.success('保存模板成功');
  };

  const paymentPlanAmount = paymentPlanDraft.amountType === 'percentage'
    ? Math.round(((formData.totalAmount * paymentPlanDraft.amountValue) / 100) * 100) / 100
    : paymentPlanDraft.amountValue;

  const addPaymentPlan = () => {
    if (paymentPlanDraft.expectedDateType === 'fixed' && !paymentPlanDraft.expectedDate) {
      Message.error('请选择固定日期');
      return;
    }
    if (
      paymentPlanDraft.expectedDateType !== 'fixed'
      && (!Number.isInteger(paymentPlanDraft.expectedDays) || paymentPlanDraft.expectedDays <= 0)
    ) {
      Message.error('请输入大于 0 的整数天数');
      return;
    }
    if (!paymentPlanDraft.condition.trim()) {
      Message.error('请输入回款条件');
      return;
    }
    if (paymentPlanDraft.amountValue <= 0) {
      Message.error('请输入大于 0 的回款金额');
      return;
    }
    if (
      paymentPlanDraft.amountType === 'percentage'
      && (!Number.isInteger(paymentPlanDraft.amountValue) || paymentPlanDraft.amountValue > 100)
    ) {
      Message.error('百分比仅支持输入 1-100 的整数');
      return;
    }

    setFormData((prev) => {
      if (!prev) return prev;
      const period = Math.max(0, ...prev.paymentPlans.map((plan) => plan.period)) + 1;
      const percentage = paymentPlanDraft.amountType === 'percentage'
        ? paymentPlanDraft.amountValue
        : prev.totalAmount > 0
          ? Math.round(((paymentPlanAmount / prev.totalAmount) * 100) * 100) / 100
          : 0;
      return {
        ...prev,
        paymentPlans: [
          ...prev.paymentPlans,
          {
            period,
            expectedDateType: paymentPlanDraft.expectedDateType,
            expectedDays: paymentPlanDraft.expectedDateType === 'fixed'
              ? undefined
              : paymentPlanDraft.expectedDays,
            expectedDate: paymentPlanDraft.expectedDateType === 'fixed'
              ? paymentPlanDraft.expectedDate
              : '',
            condition: paymentPlanDraft.condition.trim(),
            amount: paymentPlanAmount,
            percentage,
            amountType: paymentPlanDraft.amountType,
          },
        ],
      };
    });
    setPaymentPlanModalVisible(false);
    Message.success('回款计划已新增');
  };

  const updatePaymentPlan = () => {
    if (editingPaymentPlanIndex === null) return;
    const expectedDateType = paymentPlanDraft.expectedDateType;
    if (expectedDateType === 'fixed' && !paymentPlanDraft.expectedDate) {
      Message.error('请选择固定日期');
      return;
    }
    if (
      expectedDateType !== 'fixed'
      && (!Number.isInteger(paymentPlanDraft.expectedDays) || paymentPlanDraft.expectedDays <= 0)
    ) {
      Message.error('请输入大于 0 的整数天数');
      return;
    }
    if (!paymentPlanDraft.condition.trim()) {
      Message.error('请输入回款条件');
      return;
    }
    if (paymentPlanDraft.amountValue <= 0) {
      Message.error('请输入大于 0 的回款金额');
      return;
    }
    if (
      paymentPlanDraft.amountType === 'percentage'
      && (!Number.isInteger(paymentPlanDraft.amountValue) || paymentPlanDraft.amountValue > 100)
    ) {
      Message.error('百分比仅支持输入 1-100 的整数');
      return;
    }

    const amount = paymentPlanDraft.amountType === 'percentage'
      ? Math.round(((formData.totalAmount * paymentPlanDraft.amountValue) / 100) * 100) / 100
      : paymentPlanDraft.amountValue;
    const percentage = paymentPlanDraft.amountType === 'percentage'
      ? paymentPlanDraft.amountValue
      : formData.totalAmount > 0
        ? Math.round(((amount / formData.totalAmount) * 100) * 100) / 100
        : 0;

    setFormData((prev) => prev ? {
      ...prev,
      paymentPlans: prev.paymentPlans.map((plan, index) => {
        if (index === editingPaymentPlanIndex) {
          return {
            ...plan,
            expectedDateType,
            expectedDays: expectedDateType === 'fixed' ? undefined : paymentPlanDraft.expectedDays,
            expectedDate: expectedDateType === 'fixed' ? paymentPlanDraft.expectedDate : '',
            condition: paymentPlanDraft.condition.trim(),
            amount,
            percentage,
            amountType: paymentPlanDraft.amountType,
          };
        }
        return plan;
      }),
    } : prev);
    setPaymentPlanModalVisible(false);
    setEditingPaymentPlanIndex(null);
    Message.success('回款计划已更新');
  };

  const deletePaymentPlan = (index: number) => {
    setFormData((prev) => prev ? {
      ...prev,
      paymentPlans: prev.paymentPlans.filter((_, planIndex) => planIndex !== index),
    } : prev);
    Message.success('回款计划已删除');
  };

  const onSaveDraft = () => {
    const latestFormData = getFormDataWithTemplateEdits();
    setFormData(latestFormData);
    saveDraft(contract.id, latestFormData);
    Message.success('草稿已保存');
  };

  const onNext = () => {
    const latestFormData = getFormDataWithTemplateEdits();
    const requiredFields: Array<[string, string | undefined]> = [
      ['合同名称', latestFormData.contractName],
      ['签约日期', latestFormData.signDate],
      ['公司名称', latestFormData.customerName],
      ['税务登记号', latestFormData.customerTaxNo],
      ['联系人', latestFormData.customerContact],
      ['联系电话', latestFormData.customerPhone],
    ];
    const missingField = requiredFields.find(([, value]) => !value?.trim());
    if (missingField) {
      Message.error(`请填写${missingField[0]}`);
      return;
    }
    if (!latestFormData.totalAmount || latestFormData.totalAmount <= 0) {
      Message.error('请输入有效的合同金额');
      return;
    }
    setFormData(latestFormData);
    saveDraft(contract.id, latestFormData);
    const returnTarget = (location.state as {
      contractEditorReturn?: { pathname: string; state?: Record<string, unknown> };
    } | null)?.contractEditorReturn;
    const createNewVersion = (location.state as { createNewVersion?: boolean } | null)?.createNewVersion;
    navigate(`/contracts/${contract.id}/preview`, {
      state: {
        ...(returnTarget ? { contractPreviewReturn: returnTarget } : {}),
        createNewVersion,
      },
    });
  };

  const handleDownloadTemplate = () => {
    if (!companyContractTemplate) {
      Message.warning('当前签约主体尚未配置合同模板');
      return;
    }
    Message.info(`${companyContractTemplate.name}下载功能暂未接入`);
  };

  const paymentPlanColumns = [
    {
      title: '期数',
      width: 100,
      render: (_: unknown, plan: PaymentPlanItem) => getPaymentPlanPeriodLabel(plan),
    },
    {
      title: '预计回款日期',
      width: 140,
      render: (_: unknown, plan: PaymentPlanItem) => getPaymentPlanExpectedDateLabel(plan),
    },
    {
      title: '回款条件',
      dataIndex: 'condition',
      render: (condition?: string) => condition || '—',
    },
    {
      title: '回款金额',
      width: 150,
      render: (_: unknown, plan: PaymentPlanItem) => (
        <div style={{ color: 'rgb(var(--primary-6))', fontWeight: 600 }}>
          ¥{plan.amount.toLocaleString()}
          {plan.amountType !== 'fixed' && (
            <span style={{ marginLeft: 6, color: 'var(--color-text-3)', fontWeight: 400 }}>
              {plan.percentage}%
            </span>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, _plan: PaymentPlanItem, index: number) => (
        <Space size="mini">
          <Button
            type="text"
            size="small"
            onClick={() => openEditPaymentPlanModal(index)}
            disabled={isReadonly}
          >
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            status="danger"
            onClick={() => deletePaymentPlan(index)}
            disabled={isReadonly}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageShell
      breadcrumbs={[
        { label: '合同管理', to: '/contracts' },
        { label: '合同列表', to: '/contracts' },
        { label: formData.contractName || contract.contractNo },
        { label: '合同编辑' },
      ]}
    >
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<IconLeft />} onClick={handleBack}>
            返回
          </Button>
          <Title heading={4} style={{ margin: 0 }}>
            {formData.contractName || '（未命名合同）'}
          </Title>
          <Tag color="gray">{contract.contractNo}</Tag>
          <Tag color={CONTRACT_STATUS_COLOR[contract.status]}>
            {CONTRACT_STATUS_LABEL[contract.status]}
          </Tag>
        </Space>
      </div>

      <QuoteMismatchAlert
        contractAmount={formData.totalAmount}
        quoteAmount={quoteAmount}
        quoteName={linkedQuote?.name}
      />

      {isReadonly && (
        <Alert
          type="info"
          content="当前合同已进入流转阶段，仅可查看。如需修改请作废后重建。"
          style={{ marginBottom: 16 }}
        />
      )}

      <Grid.Row gutter={16}>
        <Grid.Col span={14}>
          <Card title="合同信息">
            <Form layout="vertical">
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="合同编号">
                    <Input disabled value={contract.contractNo} />
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="合同名称" required>
                    <Input
                      value={formData.contractName}
                      onChange={(v) => updateField('contractName', v)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>

              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="签约主体">
                    <Select
                      value={formData.signingEntity || undefined}
                      onChange={handleSigningEntityChange}
                      placeholder="请选择签约主体"
                      disabled={isReadonly}
                    >
                      {contractSigningEntities.map((entity) => (
                        <Select.Option key={entity.id} value={entity.shortName}>{entity.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="合同金额" required>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={formData.totalAmount}
                      onChange={(v) => handleTotalAmountChange(Number(v) || 0)}
                      min={0}
                      precision={2}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>

              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="产品类别">
                    <Select
                      value={formData.productCategory}
                      onChange={(v) => updateField('productCategory', v)}
                      disabled={isReadonly}
                    >
                      <Select.Option value="软件开发">软件开发</Select.Option>
                      <Select.Option value="系统集成">系统集成</Select.Option>
                      <Select.Option value="技术服务">技术服务</Select.Option>
                      <Select.Option value="云服务">云服务</Select.Option>
                    </Select>
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="签约日期" required>
                    <DatePicker
                      style={{ width: '100%' }}
                      value={formData.signDate}
                      onChange={(v) => updateField('signDate', v as string)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>

            </Form>
          </Card>

          <Card title="甲方（客户）信息" style={{ marginTop: 16 }}>
            <Form layout="vertical">
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="公司名称" required>
                    <Input
                      value={formData.customerName}
                      onChange={(v) => updateField('customerName', v)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="联系人" required>
                    <Input
                      value={formData.customerContact}
                      onChange={(v) => updateField('customerContact', v)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="联系电话" required>
                    <Input
                      value={formData.customerPhone}
                      onChange={(v) => updateField('customerPhone', v)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="电子邮件">
                    <Input
                      value={formData.customerEmail}
                      onChange={(v) => updateField('customerEmail', v)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>
              <Form.Item label="通讯地址">
                <Input.TextArea
                  rows={2}
                  value={formData.customerAddress}
                  onChange={(v) => updateField('customerAddress', v)}
                  disabled={isReadonly}
                />
              </Form.Item>
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="税务登记号" required>
                    <Input
                      value={formData.customerTaxNo}
                      onChange={(v) => updateField('customerTaxNo', v)}
                      disabled={isReadonly}
                    />
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="开户银行 · 账号">
                    <Input.Group compact>
                      <Input
                        style={{ width: '50%' }}
                        value={formData.bankName}
                        onChange={(v) => updateField('bankName', v)}
                        disabled={isReadonly}
                      />
                      <Input
                        style={{ width: '50%' }}
                        value={formData.bankAccount}
                        onChange={(v) => updateField('bankAccount', v)}
                        disabled={isReadonly}
                      />
                    </Input.Group>
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>
            </Form>
          </Card>

          <Card title="付款信息" style={{ marginTop: 16 }}>
            <Form layout="vertical">
              <Grid.Row gutter={16}>
                <Grid.Col span={8}>
                  <Form.Item label="付款方式">
                    <Select
                      value={formData.paymentMethod}
                      onChange={(v) => updateField('paymentMethod', v)}
                      disabled={isReadonly}
                    >
                      <Select.Option value="对公">对公</Select.Option>
                      <Select.Option value="对私">对私</Select.Option>
                    </Select>
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>

              {formData.paymentMethod === '对私' ? (
                <Grid.Row gutter={16}>
                  <Grid.Col span={8}>
                    <Form.Item label="收款方式">
                      <Select
                        value={formData.privatePaymentChannel}
                        onChange={(v) => updateField('privatePaymentChannel', v)}
                        placeholder="请选择收款方式"
                        disabled={isReadonly}
                      >
                        <Select.Option value="微信">微信</Select.Option>
                        <Select.Option value="支付宝">支付宝</Select.Option>
                        <Select.Option value="银行转账">银行转账</Select.Option>
                      </Select>
                    </Form.Item>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Form.Item label="收款人">
                      <Input
                        value={formData.privatePaymentRecipient || ''}
                        onChange={(v) => updateField('privatePaymentRecipient', v)}
                        placeholder="请输入收款人"
                        disabled={isReadonly}
                      />
                    </Form.Item>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Form.Item label="账号">
                      <Input
                        value={formData.privatePaymentAccount || ''}
                        onChange={(v) => updateField('privatePaymentAccount', v)}
                        placeholder="请输入收款账号"
                        disabled={isReadonly}
                      />
                    </Form.Item>
                  </Grid.Col>
                </Grid.Row>
              ) : (
                <Grid.Row gutter={16}>
                  <Grid.Col span={8}>
                    <Form.Item label="对公账户名">
                      <Input disabled value={companyEntity?.invoiceTitle || '-'} />
                    </Form.Item>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Form.Item label="开户行">
                      <Select
                        value={selectedPublicAccount?.id}
                        onChange={(value) => updateField('publicPaymentAccountId', value)}
                        placeholder={publicAccounts.length ? '请选择开户行' : '暂无可用对公账户'}
                        disabled={isReadonly || publicAccounts.length === 0}
                      >
                        {publicAccounts.map((account) => (
                          <Select.Option key={account.id} value={account.id}>{account.bankName}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Form.Item label="账号">
                      <Input disabled value={selectedPublicAccount?.accountNo || '-'} />
                    </Form.Item>
                  </Grid.Col>
                </Grid.Row>
              )}
            </Form>

            <Form layout="vertical">
              <Form.Item label="付款比例">
                <Select
                  value={selectedPaymentTemplateId || undefined}
                  placeholder="请选择付款比例模板"
                  onChange={handlePaymentRatioChange}
                  disabled={isReadonly}
                  style={{ width: '100%' }}
                  renderFormat={(_option, value) => {
                    const template = paymentRatioTemplates.find(item => item.id === value);
                    return template
                      ? `${template.ratio}  ${template.description}`
                      : String(value || '');
                  }}
                >
                  {paymentRatioTemplates.map((template) => (
                    <Select.Option key={template.id} value={template.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, padding: '3px 0' }}>
                        <div style={{ flex: '0 0 72px', fontWeight: 600 }}>{template.ratio}</div>
                        <div style={{ minWidth: 0, overflow: 'hidden', color: 'var(--color-text-3)', fontSize: 12, lineHeight: '18px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {template.description}
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>回款计划</div>
              <Space size={8}>
                <Button
                  size="small"
                  onClick={() => { setTemplateDescription(''); setTemplateModalVisible(true); }}
                  disabled={isReadonly}
                >
                  存为模板
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<IconPlus />}
                  onClick={openPaymentPlanModal}
                  disabled={isReadonly}
                >
                  新增
                </Button>
              </Space>
            </div>
            <Table
              columns={paymentPlanColumns}
              data={formData.paymentPlans}
              rowKey="period"
              pagination={false}
              size="small"
              noDataElement="暂无回款计划，请点击右上角“新增”"
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={10}>
          <div style={{ position: 'sticky', top: 16 }}>
            <Card
              title="合同模板"
              extra={
                companyContractTemplate ? (
                  <Space size={8}>
                    <Typography.Text ellipsis style={{ maxWidth: 220 }} title={companyContractTemplate.name}>
                      {companyContractTemplate.name}
                    </Typography.Text>
                    <Button icon={<IconDownload />} onClick={handleDownloadTemplate} title="下载模板" />
                  </Space>
                ) : (
                  <Typography.Text type="secondary">当前主体未配置合同模板</Typography.Text>
                )
              }
              bodyStyle={{ padding: 0 }}
            >
              {!isReadonly && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    minHeight: 44,
                    padding: '6px 12px',
                    borderBottom: '1px solid var(--color-border-2)',
                  }}
                >
                  {[
                    { command: 'undo', icon: <IconUndo />, title: '撤销' },
                    { command: 'redo', icon: <IconRedo />, title: '重做' },
                    { command: 'bold', icon: <IconBold />, title: '加粗' },
                    { command: 'italic', icon: <IconItalic />, title: '斜体' },
                    { command: 'insertOrderedList', icon: <IconOrderedList />, title: '有序列表' },
                    { command: 'insertUnorderedList', icon: <IconUnorderedList />, title: '无序列表' },
                  ].map((item) => (
                    <Button
                      key={item.command}
                      type="text"
                      size="small"
                      icon={item.icon}
                      title={item.title}
                      style={{ width: 32 }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => runEditorCommand(item.command)}
                    />
                  ))}
                </div>
              )}
              <div
                style={{
                  height: 'calc(100vh - 260px)',
                  minHeight: 520,
                  padding: 16,
                  overflow: 'auto',
                  background: 'var(--color-fill-1)',
                }}
              >
                <div
                  ref={templateEditorRef}
                  contentEditable={!isReadonly}
                  suppressContentEditableWarning
                  onInput={() => { templateEditedRef.current = true; }}
                  onBlur={commitTemplateEdits}
                  onPaste={handleEditorPaste}
                  style={{ outline: 'none' }}
                  dangerouslySetInnerHTML={{ __html: templateHtml }}
                />
              </div>
            </Card>
          </div>
        </Grid.Col>
      </Grid.Row>

      {contract.status === 'draft' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 24,
            marginTop: 24,
            borderTop: '1px solid var(--color-border-2)',
          }}
        >
          <Space size={12}>
            <Button onClick={onSaveDraft}>保存草稿</Button>
            <Button type="primary" onClick={onNext}>下一步</Button>
          </Space>
        </div>
      )}

      <Modal
        title="存为付款比例模板"
        visible={templateModalVisible}
        onOk={savePaymentRatioTemplate}
        onCancel={() => setTemplateModalVisible(false)}
        okText="保存"
        style={{ width: 720 }}
        maskClosable={false}
      >
        <Form layout="vertical">
          <Form.Item label="付款比例">
            <Input disabled value={formData.paymentPlans.map(plan => plan.percentage / 10).join(':') || '—'} />
          </Form.Item>
          <Form.Item label="回款条件">
            <Table
              rowKey="period"
              size="small"
              pagination={false}
              data={formData.paymentPlans}
              columns={[
                { title: '期数', width: 90, render: (_: unknown, plan: PaymentPlanItem) => getPaymentPlanPeriodLabel(plan) },
                { title: '比例', width: 90, render: (_: unknown, plan: PaymentPlanItem) => `${plan.percentage}%` },
                { title: '回款条件', dataIndex: 'condition', render: (value?: string) => value || '—' },
              ]}
            />
          </Form.Item>
          <Form.Item label="描述信息" required>
            <Input.TextArea rows={3} maxLength={200} showWordLimit value={templateDescription} onChange={setTemplateDescription} placeholder="请输入模板适用场景或付款节点说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPaymentPlanIndex === null ? '新增回款计划' : '编辑回款计划'}
        visible={paymentPlanModalVisible}
        onOk={editingPaymentPlanIndex === null ? addPaymentPlan : updatePaymentPlan}
        onCancel={() => {
          setPaymentPlanModalVisible(false);
          setEditingPaymentPlanIndex(null);
        }}
        style={{ width: 640 }}
        maskClosable={false}
      >
        <Form layout="vertical">
          <Form.Item label="预计回款日期" required>
            <div style={{ display: 'grid', gridTemplateColumns: '132px minmax(0, 1fr)', gap: 8 }}>
              <Select
                value={paymentPlanDraft.expectedDateType}
                onChange={(value) => setPaymentPlanDraft((prev) => ({
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
              {paymentPlanDraft.expectedDateType === 'fixed' ? (
                <DatePicker
                  style={{ width: '100%' }}
                  value={paymentPlanDraft.expectedDate}
                  placeholder="请选择固定日期"
                  onChange={(value) => setPaymentPlanDraft((prev) => ({
                    ...prev,
                    expectedDate: (value as string) || '',
                  }))}
                />
              ) : (
                <InputNumber
                  style={{ width: '100%' }}
                  value={paymentPlanDraft.expectedDays || undefined}
                  placeholder="请输入天数"
                  min={1}
                  precision={0}
                  onChange={(value) => setPaymentPlanDraft((prev) => ({
                    ...prev,
                    expectedDays: Number(value) || 0,
                  }))}
                />
              )}
            </div>
          </Form.Item>

          <Form.Item label="回款条件" required>
            <Input.TextArea
              rows={3}
              value={paymentPlanDraft.condition}
              placeholder="请输入回款条件"
              onChange={(value) => setPaymentPlanDraft((prev) => ({ ...prev, condition: value }))}
            />
          </Form.Item>

          <Form.Item label="回款金额" required>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '132px minmax(0, 1fr) 160px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Select
                value={paymentPlanDraft.amountType}
                onChange={(value) => setPaymentPlanDraft((prev) => ({
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
                value={paymentPlanDraft.amountValue || undefined}
                placeholder={paymentPlanDraft.amountType === 'percentage' ? '请输入 1-100' : '请输入固定金额'}
                min={paymentPlanDraft.amountType === 'percentage' ? 1 : 0}
                max={paymentPlanDraft.amountType === 'percentage' ? 100 : undefined}
                precision={paymentPlanDraft.amountType === 'percentage' ? 0 : 2}
                suffix={paymentPlanDraft.amountType === 'percentage' ? '%' : undefined}
                onChange={(value) => setPaymentPlanDraft((prev) => ({
                  ...prev,
                  amountValue: Number(value) || 0,
                }))}
              />
              <div style={{ color: 'rgb(var(--primary-6))', fontWeight: 600, textAlign: 'right' }}>
                回款金额 ¥{paymentPlanAmount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>

    </div>
    </PageShell>
  );
}

// （Alert 已在顶部的统一 import 中导入）
