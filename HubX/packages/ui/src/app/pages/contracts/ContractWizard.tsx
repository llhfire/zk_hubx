import type { ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  Button,
  Card,
  DatePicker,
  Grid,
  Input,
  InputNumber,
  Message,
  Select,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import { useContracts } from './ContractsContext';
import {
  findLeadContext,
  findQuotationInLead,
  parseQuoteAmount,
  type LeadContext,
  type LeadContractPrefillState,
} from './leadContextMock';
import {
  contractSigningEntities,
  findCompanyEntityByName,
  getCompanyContractTemplate,
  type CompanyEntityRecord,
} from '../company-entity/companyEntityData';
import { findLatestApprovedQuote } from './utils';
import { applyDealQuotePrefill, type DealQuotePrefill } from './dealQuotePrefill';
import { useQuotation } from '../quotation/QuotationContext';
import { useBusinessCases } from '@/app/business-case/BusinessCaseContext';
import { PageShell } from '@/app/components/ui';
import type { ContractFormData, QuotationRecord } from './types';
import { findDefaultContractTemplate } from './templateStore';
import { useCustomers } from '../customers/CustomerContext';
import { buildCustomerSnapshot } from '../customers/customerModel';

const Title = Typography.Title;
const Text = Typography.Text;

interface ContractEditPrefillState {
  contractId: string;
  contractNo: string;
  leadId?: string;
  quoteId?: string;
  projectId?: string;
  createNewVersion?: boolean;
  formData: ContractFormData;
}

const submitControlStyle = { width: '100%', height: 44 };
const submitGridStyle = (columns = 2) => ({
  display: 'grid',
  gridTemplateColumns: columns === 1 ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
  columnGap: 28,
  rowGap: 24,
});

function renderSubmitField(
  label: string,
  control: ReactNode,
  options: { required?: boolean; full?: boolean; textarea?: boolean } = {},
) {
  const labelledControl = isValidElement(control)
    ? cloneElement(control as ReactElement<Record<string, unknown>>, { 'aria-label': label })
    : control;
  return (
    <div
      style={{
        gridColumn: options.full ? '1 / -1' : undefined,
        display: 'flex',
        alignItems: options.textarea ? 'flex-start' : 'center',
        gap: 14,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 120,
          flex: '0 0 120px',
          textAlign: 'right',
          fontWeight: 600,
          fontSize: 16,
          lineHeight: '44px',
          color: 'var(--color-text-1)',
        }}
      >
        {options.required && <span style={{ color: 'rgb(var(--red-6))', marginRight: 4 }}>*</span>}
        {label}：
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{labelledControl}</div>
    </div>
  );
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysStr(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 把 "3个月" 这种工期字面量转成天数；解析失败返回 90 作为兜底。
function periodToDays(period: string | undefined): number {
  if (!period) return 90;
  const m = period.match(/(\d+)\s*个?\s*月/);
  if (m) return Number(m[1]) * 30;
  const d = period.match(/(\d+)\s*天/);
  if (d) return Number(d[1]);
  return 90;
}

function buildSigningEntityFields(entity: CompanyEntityRecord | undefined) {
  return {
    signingEntity: entity?.shortName ?? '',
    signingEntityTaxNo: entity?.taxNumber ?? '',
    signingPerson: entity?.legalPerson ?? '',
    signingEntityAddress: entity?.address ?? '',
    signingEntityPhone: entity?.contactPhone ?? '',
    signingEntityEmail: entity?.email ?? '',
    signingEntityPostalCode: entity?.shortName === '中科软通' ? '430000' : '',
    signingEntityBankName: entity?.invoiceBankName ?? '',
    signingEntityBankAccount: entity?.invoiceBankAccount ?? '',
  };
}

// 根据线索 + 报价初始化 Wizard 表单数据。
function initFormDataFromContext(
  lead: LeadContext | null,
  quote: QuotationRecord | null,
): ContractFormData {
  const leadEntity = lead ? findCompanyEntityByName(lead.customerEntity) : undefined;
  const defaultSigningEntity = contractSigningEntities[0];
  const totalAmount = quote ? parseQuoteAmount(quote.amount) : 0;
  const today = todayStr();
  const effective = addDaysStr(today, 1);
  const end = addDaysStr(effective, periodToDays(quote?.period ?? lead?.estimatedDuration));
  return {
    contractName: lead ? `${lead.customerName}${lead.productCategory}合同` : '',
    productCategory: lead?.productCategory ?? '软件开发',
    ...buildSigningEntityFields(defaultSigningEntity),
    customerName: lead?.customerName ?? '',
    customerContact: lead?.contactPerson ?? '',
    customerPhone: lead?.contactPhone ?? '',
    customerEmail: lead?.contactEmail ?? '',
    customerAddress: leadEntity?.address ?? '',
    customerTaxNo: leadEntity?.invoiceTaxNumber ?? '',
    customerPostalCode: '',
    bankName: leadEntity?.invoiceBankName ?? '',
    bankAccount: leadEntity?.invoiceBankAccount ?? '',
    contractContent:
      '乙方按甲方需求规格说明书完成系统设计、开发、测试、部署及培训，提供 12 个月免费质保。',
    projectWorkDays: 45,
    prototypeConfirmDays: 3,
    acceptanceDays: 5,
    warrantyMonths: 12,
    maintenanceAnnualRate: 15,
    invoiceTaxRate: 6,
    invoiceContent: '生产生活服务*研发服务费',
    featureList: [],
    signDate: today,
    effectiveDate: effective,
    endDate: end,
    paymentMethod: '对公',
    privatePaymentChannel: undefined,
    privatePaymentRecipient: '',
    privatePaymentAccount: '',
    totalAmount,
    rebateAmount: 0,
    paymentPlans: [],
    templateId: 'software_sales',
  };
}

function withDefaultTemplate(formData: ContractFormData): ContractFormData {
  const template = findDefaultContractTemplate(formData.signingEntity, formData.productCategory);
  const version = template?.versions.at(-1);
  if (template) return { ...formData, templateId: template.id, templateVersionId: version?.id, customContractHtml: undefined };
  const companyTemplate = getCompanyContractTemplate(formData.signingEntity);
  return companyTemplate?.contractTemplateId
    ? { ...formData, templateId: companyTemplate.contractTemplateId, templateVersionId: undefined, customContractHtml: undefined }
    : formData;
}

export function ContractWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { createFromWizard, getNextContractNo, saveDraft } = useContracts();
  const { quotes, updateQuote } = useQuotation();
  const { customers } = useCustomers();
  const { getByLeadId: getCaseByLeadId, upsertCase } = useBusinessCases();

  const leadIdParam = searchParams.get('leadId');
  const quoteIdParam = searchParams.get('quoteId');
  const returnTo = searchParams.get('returnTo');
  const fromLead = searchParams.get('from');

  // 阶段 3：报价成交后跳转过来携带的成交报价预填（真实报价域数据，优先于 mock 报价历史）
  const dealQuotePrefill = (location.state as { dealQuotePrefill?: DealQuotePrefill } | null)
    ?.dealQuotePrefill;

  const prefillState = (location.state as { leadContractPrefill?: LeadContractPrefillState } | null)
    ?.leadContractPrefill;
  const editorReturnTarget = (location.state as {
    contractEditorReturn?: { pathname: string; state?: Record<string, unknown> };
  } | null)?.contractEditorReturn;
  const contractEditPrefill = (location.state as {
    contractEditPrefill?: ContractEditPrefillState;
  } | null)?.contractEditPrefill;
  const projectId = contractEditPrefill?.projectId
    ?? (location.state as { projectId?: string } | null)?.projectId;

  const resolvedLead = useMemo<LeadContext | null>(() => {
    if (prefillState?.lead) return prefillState.lead;
    return findLeadContext(leadIdParam);
  }, [prefillState, leadIdParam]);

  const selectedLeadId = contractEditPrefill?.leadId ?? leadIdParam ?? dealQuotePrefill?.leadId ?? prefillState?.lead.id ?? null;
  const lead = resolvedLead ?? findLeadContext(selectedLeadId);

  const initialQuote = useMemo<QuotationRecord | null>(() => {
    const quoteId = contractEditPrefill?.quoteId ?? quoteIdParam ?? prefillState?.quoteId;
    if (lead && quoteId) {
      const matched = findQuotationInLead(lead, quoteId);
      if (matched) return matched;
    }
    if (lead) {
      return findLatestApprovedQuote(lead.quotations);
    }
    return null;
  }, [contractEditPrefill?.quoteId, lead, quoteIdParam, prefillState?.quoteId]);

  const selectedQuoteId = dealQuotePrefill?.quoteId ?? initialQuote?.id ?? null;
  const [formData, setFormData] = useState<ContractFormData>(() => {
    const base = contractEditPrefill
      ? { ...contractEditPrefill.formData, contractNo: contractEditPrefill.contractNo }
      : initFormDataFromContext(lead, initialQuote);
    return withDefaultTemplate(dealQuotePrefill && !contractEditPrefill ? applyDealQuotePrefill(base, dealQuotePrefill) : base);
  });
  const [submitting, setSubmitting] = useState(false);
  const previewContractNo = getNextContractNo(formData.signingEntity);

  const updateField = <K extends keyof ContractFormData>(key: K, value: ContractFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSigningEntityChange = (shortName: string) => {
    setFormData((prev) => withDefaultTemplate({
      ...prev,
      ...buildSigningEntityFields(findCompanyEntityByName(shortName)),
    }));
  };

  const handleProductCategoryChange = (productCategory: string) => {
    setFormData((prev) => withDefaultTemplate({ ...prev, productCategory }));
  };

  // 报价金额变化时，按比例重算每期金额
  const handleTotalAmountChange = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      totalAmount: value,
      paymentPlans: prev.paymentPlans.map((p) => ({
        ...p,
        amount: Math.round((value * p.percentage) / 100),
      })),
    }));
  };

  const finish = async () => {
    if (submitting) return;
    if (contractEditPrefill) {
      saveDraft(contractEditPrefill.contractId, formData);
      Message.success('合同信息已更新');
      navigate(`/contracts/${contractEditPrefill.contractId}/edit`, {
        state: {
          ...(editorReturnTarget ? { contractEditorReturn: editorReturnTarget } : {}),
          createNewVersion: contractEditPrefill.createNewVersion,
        },
      });
      return;
    }

    const requiredFields: Array<[string, string | undefined]> = [
      ['合同名称', formData.contractName],
      ['签约日期', formData.signDate],
      ['签约主体', formData.signingEntity],
      ['公司名称', formData.customerName],
      ['税务登记号', formData.customerTaxNo],
      ['联系人', formData.customerContact],
      ['联系电话', formData.customerPhone],
    ];
    const missingField = requiredFields.find(([, value]) => !value?.trim());
    if (missingField) {
      Message.error(`请填写${missingField[0]}`);
      return;
    }
    if (!formData.totalAmount || (dealQuotePrefill?.kind !== 'supplement' && formData.totalAmount <= 0)) {
      Message.error(dealQuotePrefill?.kind === 'supplement' ? '补充合同变更金额不能为 0' : '请输入有效的合同金额');
      return;
    }
    if ((formData.projectWorkDays ?? 0) <= 0 || (formData.prototypeConfirmDays ?? 0) <= 0 || (formData.acceptanceDays ?? 0) <= 0) {
      Message.error('开发工期、原型确认时限和验收反馈时限必须大于 0');
      return;
    }
    if (formData.paymentPlans.length > 0) {
      const percentTotal = formData.paymentPlans.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(percentTotal - 100) > 0.01) {
        Message.error(`回款期次比例合计为 ${percentTotal}%，必须等于 100%`);
        return;
      }
      const amountTotal = formData.paymentPlans.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(amountTotal - formData.totalAmount) > 0.01) {
        Message.error('回款期次金额合计必须与合同金额一致');
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await createFromWizard({
      leadId: selectedLeadId ?? leadIdParam ?? undefined,
      quoteId: selectedQuoteId ?? undefined,
      projectId,
      kind: dealQuotePrefill?.kind ?? 'main',
      parentContractId: dealQuotePrefill?.parentContractId,
      sourceQuoteId: dealQuotePrefill?.kind === 'supplement' ? dealQuotePrefill.quoteId : undefined,
      customerId: quotes.find((item) => item.id === selectedQuoteId)?.customerId ?? customers.find((item) => item.name === formData.customerName)?.id,
      customerSnapshot: (() => {
        const customer = customers.find((item) => item.id === quotes.find((quote) => quote.id === selectedQuoteId)?.customerId || item.name === formData.customerName);
        return customer ? buildCustomerSnapshot(customer) : undefined;
      })(),
      formData: { ...formData, contractNo: previewContractNo },
    });
      Message.success(`合同 ${created.contractNo} 已创建草稿`);

    // 阶段 3：成交报价生成主合同后，回写报价关联 + 维护商机（quoteIds / contractId）
      if (dealQuotePrefill?.quoteId) {
      const dealQuoteId = dealQuotePrefill.quoteId;
      await updateQuote(dealQuoteId, (q) => q.isSupplement
        ? { ...q, generatedContractId: created.id }
        : { ...q, contractId: created.id });
      const existingCase = getCaseByLeadId(dealQuotePrefill.leadId);
      if (existingCase) {
        upsertCase({
          ...existingCase,
          contractId: existingCase.contractId ?? created.id,
          quoteIds: existingCase.quoteIds.includes(dealQuoteId)
            ? existingCase.quoteIds
            : [...existingCase.quoteIds, dealQuoteId],
        });
      } else {
        upsertCase({
          id: 'case-' + dealQuoteId,
          leadId: dealQuotePrefill.leadId,
          projectId: null,
          contractId: created.id,
          extraContractIds: [],
          quoteIds: [dealQuoteId],
        });
      }
      Message.success('已回写成交报价与商机关联');
      }

      const returnLeadId = selectedLeadId ?? leadIdParam;
      if (returnTo === 'lead' && returnLeadId) {
        navigate(`/contracts/${created.id}/edit`, {
        state: {
          contractEditorReturn: {
            pathname: `/leads/${returnLeadId}`,
            state: {
              from: fromLead ?? (location.state as { from?: string } | null)?.from ?? 'public',
              activeMainTab: 'contracts-history',
            },
          },
        },
        });
        return;
      }

      navigate(`/contracts/${created.id}/edit`, {
        state: editorReturnTarget ? { contractEditorReturn: editorReturnTarget } : undefined,
      });
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '合同创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    navigate(-1);
  };

  // ====== 渲染 ======

  return (
    <PageShell
      breadcrumbs={[
        { label: '合同管理', to: '/contracts' },
        { label: '合同列表', to: '/contracts' },
        { label: contractEditPrefill ? '编辑合同' : '新建合同' },
      ]}
    >
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<IconLeft />} onClick={cancel}>
            返回
          </Button>
          <Title heading={4} style={{ margin: 0 }}>
            {contractEditPrefill ? '编辑合同' : '新建合同'}
          </Title>
          {lead && (
            <Tag color="arcoblue">
              来自线索：{lead.leadName}
            </Tag>
          )}
        </Space>
      </div>

      <SimpleContractForm
        formData={formData}
        contractNo={contractEditPrefill?.contractNo ?? previewContractNo}
        updateField={updateField}
        handleSigningEntityChange={handleSigningEntityChange}
        handleProductCategoryChange={handleProductCategoryChange}
        handleTotalAmountChange={handleTotalAmountChange}
      />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
        <Button onClick={cancel}>取消</Button>
        <Button type="primary" loading={submitting} disabled={submitting} onClick={finish}>下一步</Button>
      </div>
    </div>
    </PageShell>
  );
}

function SimpleContractForm({
  formData,
  contractNo,
  updateField,
  handleSigningEntityChange,
  handleProductCategoryChange,
  handleTotalAmountChange,
}: {
  formData: ContractFormData;
  contractNo?: string;
  updateField: <K extends keyof ContractFormData>(k: K, v: ContractFormData[K]) => void;
  handleSigningEntityChange: (shortName: string) => void;
  handleProductCategoryChange: (productCategory: string) => void;
  handleTotalAmountChange: (v: number) => void;
}) {
  return (
    <>
      <Card bodyStyle={{ padding: '20px 24px' }}>
        <div style={submitGridStyle(2)}>
          {renderSubmitField('合同编号', (
            <Input disabled value={contractNo || '系统生成，保存后自动生成'} style={submitControlStyle} />
          ))}
          {renderSubmitField('合同名称', (
            <Input
              value={formData.contractName}
              onChange={(value) => updateField('contractName', value)}
              placeholder="请输入合同名称"
              style={submitControlStyle}
            />
          ), { required: true })}
          {renderSubmitField('合同金额', (
            <Input
              value={formData.totalAmount ? String(formData.totalAmount) : ''}
              onChange={(value) => handleTotalAmountChange(parseQuoteAmount(value))}
              placeholder="请输入合同金额"
              style={submitControlStyle}
            />
          ), { required: true })}
          {renderSubmitField('签约日期', (
            <DatePicker
              value={formData.signDate}
              onChange={(value) => updateField('signDate', value as string)}
              style={submitControlStyle}
            />
          ), { required: true })}
        </div>
      </Card>

      <Grid.Row gutter={16} style={{ marginTop: 16 }}>
        <Grid.Col xs={24} md={12}>
          <Card title="我方信息" bodyStyle={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderSubmitField('签约主体', (
                <Select
                  value={formData.signingEntity || undefined}
                  onChange={handleSigningEntityChange}
                  placeholder="请选择签约主体"
                  style={submitControlStyle}
                >
                  {contractSigningEntities.map((entity) => (
                    <Select.Option key={entity.id} value={entity.shortName}>{entity.name}</Select.Option>
                  ))}
                </Select>
              ))}
              {renderSubmitField('税务登记号', (
                <Input
                  value={formData.signingEntityTaxNo ?? ''}
                  onChange={(value) => updateField('signingEntityTaxNo', value)}
                  placeholder="请输入税务登记号"
                  style={submitControlStyle}
                />
              ))}
              {renderSubmitField('签约人', (
                <Input
                  value={formData.signingPerson ?? ''}
                  onChange={(value) => updateField('signingPerson', value)}
                  placeholder="请输入签约人"
                  style={submitControlStyle}
                />
              ))}
              {renderSubmitField('通讯地址', (
                <Input
                  value={formData.signingEntityAddress ?? ''}
                  onChange={(value) => updateField('signingEntityAddress', value)}
                  placeholder="请输入通讯地址"
                  style={submitControlStyle}
                />
              ))}
              {renderSubmitField('联系电话', (
                <Input
                  value={formData.signingEntityPhone ?? ''}
                  onChange={(value) => updateField('signingEntityPhone', value)}
                  placeholder="请输入联系电话"
                  style={submitControlStyle}
                />
              ))}
              {renderSubmitField('电子邮箱', (
                <Input
                  value={formData.signingEntityEmail ?? ''}
                  onChange={(value) => updateField('signingEntityEmail', value)}
                  placeholder="请输入电子邮箱"
                  style={submitControlStyle}
                />
              ))}
              {renderSubmitField('邮政编码', (
                <Input
                  value={formData.signingEntityPostalCode ?? ''}
                  onChange={(value) => updateField('signingEntityPostalCode', value)}
                  placeholder="请输入邮政编码"
                  style={submitControlStyle}
                />
              ))}
              {renderSubmitField('产品类别', (
                <Select
                  value={formData.productCategory || undefined}
                  onChange={handleProductCategoryChange}
                  placeholder="请选择产品类别"
                  style={submitControlStyle}
                >
                  <Select.Option value="软件开发">软件开发</Select.Option>
                  <Select.Option value="系统集成">系统集成</Select.Option>
                  <Select.Option value="技术服务">技术服务</Select.Option>
                  <Select.Option value="云服务">云服务</Select.Option>
                </Select>
              ))}
            </div>
          </Card>
        </Grid.Col>

        <Grid.Col xs={24} md={12}>
          <Card title="客户信息" bodyStyle={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {renderSubmitField('公司名称', (
          <Input
            value={formData.customerName}
            onChange={(value) => updateField('customerName', value)}
            placeholder="请输入公司名称"
            style={submitControlStyle}
          />
        ), { required: true })}
        {renderSubmitField('税务登记号', (
          <Input
            value={formData.customerTaxNo}
            onChange={(value) => updateField('customerTaxNo', value)}
            placeholder="请输入税务登记号"
            style={submitControlStyle}
          />
        ), { required: true })}
        {renderSubmitField('联系人', (
          <Input
            value={formData.customerContact}
            onChange={(value) => updateField('customerContact', value)}
            placeholder="请输入联系人"
            style={submitControlStyle}
          />
        ), { required: true })}
        {renderSubmitField('通讯地址', (
          <Input
            value={formData.customerAddress}
            onChange={(value) => updateField('customerAddress', value)}
            placeholder="请输入通讯地址"
            style={submitControlStyle}
          />
        ))}
        {renderSubmitField('联系电话', (
          <Input
            value={formData.customerPhone}
            onChange={(value) => updateField('customerPhone', value)}
            placeholder="请输入联系电话"
            style={submitControlStyle}
          />
        ), { required: true })}
        {renderSubmitField('电子邮箱', (
          <Input
            value={formData.customerEmail}
            onChange={(value) => updateField('customerEmail', value)}
            placeholder="请输入电子邮箱"
            style={submitControlStyle}
          />
        ))}
        {renderSubmitField('邮政编码', (
          <Input
            value={formData.customerPostalCode ?? ''}
            onChange={(value) => updateField('customerPostalCode', value)}
            placeholder="请输入邮政编码"
            style={submitControlStyle}
          />
        ))}
        {renderSubmitField('开户银行*账号', (
          <Input.Group compact style={{ width: '100%' }}>
            <Input
              value={formData.bankName}
              onChange={(value) => updateField('bankName', value)}
              placeholder="开户银行"
              style={{ width: '50%', height: 44 }}
            />
            <Input
              value={formData.bankAccount}
              onChange={(value) => updateField('bankAccount', value)}
              placeholder="账号"
              style={{ width: '50%', height: 44 }}
            />
          </Input.Group>
        ))}
            </div>
          </Card>
        </Grid.Col>
      </Grid.Row>

      <Card
        title="模板关键条款"
        extra={<Tag color="arcoblue">{formData.signingEntity === '中科软通' ? '中科软通技术服务合同 · 19 章 + 2 个附件' : `${formData.signingEntity || '签约主体'} · 软件服务合同`}</Tag>}
        bodyStyle={{ padding: '20px 24px' }}
        style={{ marginTop: 16 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          以下字段直接写入合同模板的项目期限、确认验收、免费维护和开票条款；成交报价的功能清单与付款节点会自动带入附件一和第七章。
        </Text>
        <div style={submitGridStyle(2)}>
          {renderSubmitField('开发工期', (
            <InputNumber min={1} value={formData.projectWorkDays} onChange={(value) => updateField('projectWorkDays', Number(value) || 0)} suffix="工作日" style={submitControlStyle} />
          ))}
          {renderSubmitField('原型确认时限', (
            <InputNumber min={1} value={formData.prototypeConfirmDays} onChange={(value) => updateField('prototypeConfirmDays', Number(value) || 0)} suffix="工作日" style={submitControlStyle} />
          ))}
          {renderSubmitField('验收反馈时限', (
            <InputNumber min={1} value={formData.acceptanceDays} onChange={(value) => updateField('acceptanceDays', Number(value) || 0)} suffix="工作日" style={submitControlStyle} />
          ))}
          {renderSubmitField('免费维护期', (
            <InputNumber min={0} value={formData.warrantyMonths} onChange={(value) => updateField('warrantyMonths', Number(value) || 0)} suffix="个月" style={submitControlStyle} />
          ))}
          {renderSubmitField('续费维护比例', (
            <InputNumber min={0} max={100} value={formData.maintenanceAnnualRate} onChange={(value) => updateField('maintenanceAnnualRate', Number(value) || 0)} suffix="%/年" style={submitControlStyle} />
          ))}
          {renderSubmitField('开票税率', (
            <InputNumber min={0} max={100} value={formData.invoiceTaxRate} onChange={(value) => updateField('invoiceTaxRate', Number(value) || 0)} suffix="%" style={submitControlStyle} />
          ))}
          {renderSubmitField('发票类型', (
            <Select value={formData.invoiceType ?? '专票'} onChange={(value) => updateField('invoiceType', value)} style={submitControlStyle} options={[{ label: '增值税专用发票', value: '专票' }, { label: '增值税普通发票', value: '普票' }]} />
          ))}
          {renderSubmitField('开票内容', (
            <Input value={formData.invoiceContent ?? ''} onChange={(value) => updateField('invoiceContent', value)} placeholder="如：生产生活服务*研发服务费" style={submitControlStyle} />
          ))}
        </div>
      </Card>
    </>
  );
}
