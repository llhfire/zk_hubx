import { useMemo } from 'react';
import {
  AlertBanner,
  DataTable,
  DateText,
  DocumentActionRow,
  FileList,
  FormGrid,
  MoneyText,
  SectionCard,
  StatusTag,
  UploadPanel,
} from '@/design-system';
import {
  Button,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  Message,
  Select,
  Space,
  Typography,
  Upload,
} from '@/design-system';
import {
  IconDownload,
  IconFile,
  IconPlus,
  IconDelete,
  IconSend,
  IconFolder,
} from '@/design-system';
import { useQuotation } from '../QuotationContext';
import { computeAmountBreakdown } from '../quoteFlow';
import {
  canSubmitWithDocument,
  calculateMargin,
  DEFAULT_PAYMENT_PRESETS,
  type PaymentMilestone,
} from '../fileFlow';
import type { Quote, QuoteStage } from '../types';
import { FeatureListUpload } from './FeatureListUpload';
import { OnlineDocumentPreview } from './OnlineDocumentPreview';
import { Stage4Approval } from '../stages/Stage4Approval';
import { findCompanyEntityByName } from '../../company-entity/companyEntityData';
import { ZKRT_QUOTE_TEMPLATE } from '../quoteDocumentTemplate';

const { Text } = Typography;
const { Row, Col } = Grid;
const { TextArea } = Input;
const FormItem = Form.Item;

interface Props {
  quote: Quote;
  stage: QuoteStage;
  readonly: boolean;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '未知大小';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function downloadFile(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
}

export function FileFlowWorkbench({ quote, stage, readonly }: Props) {
  const {
    saveFeatureList,
    submitFeatureList,
    saveEvalSheet,
    submitEval,
    updateQuote,
    submitForAudit,
    isLeadFrozen,
  } = useQuotation();

  const frozen = isLeadFrozen(quote.id);
  const state = quote.fileFlow ?? { onlineDocument: { status: 'empty' as const }, scans: [] };
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);
  const companyEntity = findCompanyEntityByName(quote.signingEntity ?? ZKRT_QUOTE_TEMPLATE.signingEntity);
  const company = {
    name: companyEntity?.name ?? '中科软通（武汉）科技有限公司',
    address: companyEntity?.address ?? '',
    phone: companyEntity?.contactPhone ?? '',
    representative: companyEntity?.legalPerson ?? '',
  };

  const patchState = (patch: Partial<NonNullable<Quote['fileFlow']>>) =>
    updateQuote(quote.id, (current) => ({
      ...current,
      fileFlow: { ...state, ...patch },
    }));

  const patchPricingState = (patch: Partial<NonNullable<Quote['fileFlow']>>) =>
    patchState({
      ...patch,
      onlineDocument:
        state.onlineDocument.status === 'saved' || state.onlineDocument.status === 'finalized'
          ? { status: 'draft' }
          : state.onlineDocument,
    });

  // ─── Stage 1：功能清单 ─────────────────────────────────────────
  if (stage === 1) {
    const totalSubs = quote.featureList.reduce((sum, module) => sum + module.subFeatures.length, 0);

    return (
      <SectionCard
        title={
          <Space>
            <IconFolder style={{ color: 'var(--primary-6)' }} />
            <span>文件流转 · 阶段一：功能清单导入与结构化</span>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <AlertBanner tone="info">文件流转模式下，您可通过 Excel 标准模板批量导入两级功能清单。系统将完成结构化校验，原文件将作为流转附件全程留存。</AlertBanner>

          {readonly ? (
            <div
              style={{
                padding: '16px',
                background: 'var(--color-fill-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Text bold>已归档功能清单：</Text>
              <Space style={{ marginTop: 8 }} wrap>
                <StatusTag tone="info">一级模块：{quote.featureList.length} 个</StatusTag>
                <StatusTag tone="cyan">细分功能：{totalSubs} 项</StatusTag>
              </Space>
            </div>
          ) : (
            <FeatureListUpload
              initialModules={quote.featureList}
              onParsed={(modules) => saveFeatureList(quote.id, modules)}
            />
          )}

          {!readonly && (
            <div className="quotation-stage-submit" style={{ marginTop: 12 }}>
              <Button
                type="primary"
                icon={<IconSend />}
                disabled={frozen || totalSubs === 0}
                onClick={async () => {
                  try {
                    await submitFeatureList(quote.id);
                    Message.success('功能清单已锁定并提交技术评估');
                  } catch (error) {
                    Message.error(error instanceof Error ? error.message : '提交技术评估失败');
                  }
                }}
              >
                提交技术评估（共 {totalSubs} 项）
              </Button>
            </div>
          )}
        </Space>
      </SectionCard>
    );
  }

  // ─── Stage 2：技术评估 ─────────────────────────────────────────
  if (stage === 2) {
    const canSubmit = Boolean(
      state.evaluationFileName && state.evaluationWorkDays && state.evaluationTotalDays
    );
    const totalDays = state.evaluationTotalDays ?? 0;
    const baseCost = Math.round(totalDays * 600);
    const handleEvaluationUpload = (file: File) => {
      const url = URL.createObjectURL(file);
      patchState({
        evaluationFileName: file.name,
        evaluationAttachment: {
          id: `att-eval-${Date.now()}`,
          name: file.name,
          size: file.size,
          url,
          uploadedAt: new Date().toISOString(),
          uploadedBy: '技术负责人',
        },
      });
      Message.success(`评估文件已暂存：${file.name}`);
      return false;
    };

    return (
      <SectionCard
        title={
          <Space>
            <IconFile style={{ color: 'var(--primary-6)' }} />
            <span>文件流转 · 阶段二：技术评估与工时存证</span>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <AlertBanner tone="info">技术团队评估完成后，请上传技术评估表或估算文件。系统支持存证溯源，并作为后续销售底线成本核算依据。</AlertBanner>

          {/* 评估文件上传与存证卡片 */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-2)',
            }}
          >
            <Text bold style={{ display: 'block', marginBottom: 12 }}>
              1. 技术评估表原始附件
            </Text>

            {state.evaluationFileName ? (
              <DocumentActionRow
                context="技术评估表原始附件"
                name={state.evaluationFileName}
                meta={
                  <>
                    {formatFileSize(state.evaluationAttachment?.size)} · 上传时间：
                    <DateText
                      value={state.evaluationAttachment?.uploadedAt}
                      mode="datetime"
                      placeholder="已保存"
                    />
                  </>
                }
                actions={
                  <Space wrap>
                    {state.evaluationAttachment?.url && (
                      <Button
                        size="small"
                        icon={<IconDownload />}
                        aria-label={`下载 ${state.evaluationFileName}`}
                        onClick={() =>
                          downloadFile(state.evaluationAttachment!.url!, state.evaluationFileName!)
                        }
                      >
                        下载原件
                      </Button>
                    )}
                    {!readonly && (
                      <Upload
                        accept=".xlsx,.xls,.pdf,.doc,.docx"
                        showUploadList={false}
                        beforeUpload={handleEvaluationUpload}
                      >
                        <Button size="small" type="outline">
                          替换文件
                        </Button>
                      </Upload>
                    )}
                  </Space>
                }
              />
            ) : (
              <UploadPanel
                accept=".xlsx,.xls,.pdf,.doc,.docx"
                showUploadList={false}
                disabled={readonly}
                hint="点击或拖拽技术评估文件到此处上传"
                description="支持 Excel、PDF、Word 文件"
                beforeUpload={handleEvaluationUpload}
              />
            )}
          </div>

          {/* 工期与人天核算 */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-2)',
            }}
          >
            <Text bold style={{ display: 'block', marginBottom: 12 }}>
              2. 工期与总人天确认
            </Text>

            <FormGrid columns={2}>
              <FormItem label="评估交付工期（工作日）" required>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="如：30"
                  suffix="工作日"
                  value={state.evaluationWorkDays}
                  disabled={readonly}
                  onChange={(value) =>
                    patchState({ evaluationWorkDays: Number(value) || undefined })
                  }
                />
              </FormItem>
              <FormItem label="评估研发总人天（人天）" required>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.1}
                  precision={1}
                  placeholder="如：45.5"
                  suffix="人天"
                  value={state.evaluationTotalDays}
                  disabled={readonly}
                  onChange={(value) =>
                    patchState({ evaluationTotalDays: Number(value) || undefined })
                  }
                />
              </FormItem>
            </FormGrid>

            {totalDays > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  background: 'var(--color-primary-light-1)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 'var(--ds-text-dense)', color: 'var(--primary-6)' }}>
                  基准研发底线成本：<MoneyText value={baseCost} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginLeft: 8 }}>
                    (按 {totalDays} 人天 × 600元/天日成本测算)
                  </span>
                </Text>
                <StatusTag tone="info">供销售阶段毛利预警参考</StatusTag>
              </div>
            )}
          </div>

          {/* 技术方案备忘录 */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-2)',
            }}
          >
            <Text bold style={{ display: 'block', marginBottom: 8 }}>
              3. 技术方案备忘与关键假设（选填）
            </Text>
            <TextArea
              placeholder="可记录技术栈选型、第三方接口风险、客户需自备软硬件或开发特别假设..."
              value={state.evaluationNotes ?? ''}
              disabled={readonly}
              rows={3}
              maxLength={500}
              showWordLimit
              onChange={(value) => patchState({ evaluationNotes: value })}
            />
          </div>

          {!readonly && (
            <div className="quotation-stage-submit" style={{ marginTop: 8 }}>
              <Button
                type="primary"
                icon={<IconSend />}
                disabled={frozen || !canSubmit}
                onClick={async () => {
                  try {
                    if (quote.evalSheet) {
                      await saveEvalSheet(quote.id, {
                        ...quote.evalSheet,
                        manualWorkDays: state.evaluationWorkDays ?? 0,
                      });
                    }
                    await submitEval(quote.id);
                    Message.success('技术评估结果已提交销售报价');
                  } catch (error) {
                    Message.error(error instanceof Error ? error.message : '提交评估结果失败');
                  }
                }}
              >
                提交评估结果至销售
              </Button>
            </div>
          )}
        </Space>
      </SectionCard>
    );
  }

  // ─── Stage 3：商务报价与商业条款 ─────────────────────────────────
  if (stage === 3) {
    const documentSaved = canSubmitWithDocument(state.onlineDocument);
    const amountValid = quote.isSupplement
      ? state.quoteAmount != null
      : (state.quoteAmount ?? 0) > 0;

    // 毛利测算 (ADR-0014)
    const evalDays = state.evaluationTotalDays ?? 0;
    const margin = calculateMargin(state.quoteAmount ?? 0, evalDays, 600);

    // 付款节点管理
    const currentMilestones: PaymentMilestone[] =
      state.paymentPlan?.milestones ?? DEFAULT_PAYMENT_PRESETS[0].milestones;
    const totalRatio = currentMilestones.reduce((s, m) => s + (Number(m.ratio) || 0), 0);
    const isRatioValid = totalRatio === 100;

    const handleApplyPreset = (presetId: string) => {
      const preset = DEFAULT_PAYMENT_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        patchPricingState({
          paymentPlan: {
            presetId: preset.id,
            milestones: [...preset.milestones],
          },
        });
        Message.success(`已套用付款方案：${preset.name}`);
      }
    };

    const handleUpdateMilestone = (index: number, patch: Partial<PaymentMilestone>) => {
      const updated = currentMilestones.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      );
      patchPricingState({
        paymentPlan: {
          presetId: 'custom',
          milestones: updated,
        },
      });
    };

    const handleAddMilestone = () => {
      const updated = [
        ...currentMilestones,
        { name: `阶段款项 ${currentMilestones.length + 1}`, ratio: 0, note: '' },
      ];
      patchPricingState({
        paymentPlan: {
          presetId: 'custom',
          milestones: updated,
        },
      });
    };

    const handleDeleteMilestone = (index: number) => {
      if (currentMilestones.length <= 1) {
        Message.warning('至少保留一个付款阶段');
        return;
      }
      const updated = currentMilestones.filter((_, idx) => idx !== index);
      patchPricingState({
        paymentPlan: {
          presetId: 'custom',
          milestones: updated,
        },
      });
    };

    const milestoneColumns = [
      {
        title: '付款阶段名称',
        dataIndex: 'name',
        width: 160,
        render: (text: string, _: any, idx: number) =>
          readonly ? (
            <Text bold>{text}</Text>
          ) : (
            <Input
              size="small"
              value={text}
              onChange={(v) => handleUpdateMilestone(idx, { name: v })}
            />
          ),
      },
      {
        title: '分期比例 (%)',
        dataIndex: 'ratio',
        width: 120,
        render: (val: number, _: any, idx: number) =>
          readonly ? (
            <Text>{val}%</Text>
          ) : (
            <InputNumber
              size="small"
              min={1}
              max={100}
              suffix="%"
              value={val}
              onChange={(v) => handleUpdateMilestone(idx, { ratio: Number(v) || 0 })}
            />
          ),
      },
      {
        title: '预计应付金额 (元)',
        width: 150,
        render: (_: any, record: PaymentMilestone) => {
          const amt = state.quoteAmount ? Math.round((state.quoteAmount * record.ratio) / 100) : 0;
          return <Text bold><MoneyText value={amt} /></Text>;
        },
      },
      {
        title: '付款触发条件与节点说明',
        dataIndex: 'note',
        render: (text: string, _: any, idx: number) =>
          readonly ? (
            <Text type="secondary">{text || '-'}</Text>
          ) : (
            <Input
              size="small"
              placeholder="如：签署合同后 3 个工作日内..."
              value={text ?? ''}
              onChange={(v) => handleUpdateMilestone(idx, { note: v })}
            />
          ),
      },
      {
        title: '操作',
        width: 70,
        align: 'center' as const,
        render: (_: any, __: any, idx: number) =>
          readonly ? null : (
            <Button
              type="text"
              status="danger"
              size="mini"
              icon={<IconDelete />}
              onClick={() => handleDeleteMilestone(idx)}
            />
          ),
      },
    ];

    const canSubmitAudit =
      !frozen &&
      documentSaved &&
      amountValid &&
      Boolean(state.quoteWorkDays) &&
      isRatioValid;

    return (
      <SectionCard
        title={
          <Space>
            <IconFile style={{ color: 'var(--primary-6)' }} />
            <span>文件流转 · 阶段三：商务报价、付款方式与在线文档</span>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 1. 核心报价与毛利率分析面板 (ADR-0014) */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-2)',
            }}
          >
            <Text bold style={{ display: 'block', marginBottom: 12 }}>
              1. 核心商务报价与毛利率测算（ADR-0014 底线管控）
            </Text>

            <FormGrid columns={2}>
              <FormItem label="商务报价总额（元）" required>
                <InputNumber
                  style={{ width: '100%' }}
                  min={quote.isSupplement ? undefined : 0}
                  step={1000}
                  prefix="¥"
                  placeholder="请输入对客总报价"
                  value={state.quoteAmount}
                  disabled={readonly}
                  onChange={(value) =>
                    patchPricingState({
                      quoteAmount: typeof value === 'number' ? value : undefined,
                    })
                  }
                />
              </FormItem>
              <FormItem label="承诺交付工期（工作日）" required>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  suffix="工作日"
                  placeholder="如：30"
                  value={state.quoteWorkDays}
                  disabled={readonly}
                  onChange={(value) =>
                    patchPricingState({ quoteWorkDays: Number(value) || undefined })
                  }
                />
              </FormItem>
            </FormGrid>

            {/* 毛利与成本分析卡片 */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background:
                  margin.level === 'healthy'
                    ? 'rgba(0, 180, 42, 0.06)'
                    : margin.level === 'warning'
                    ? 'rgba(255, 125, 0, 0.08)'
                    : 'rgba(245, 63, 63, 0.08)',
                border: `1px solid ${
                  margin.level === 'healthy'
                    ? 'rgba(0, 180, 42, 0.3)'
                    : margin.level === 'warning'
                    ? 'rgba(255, 125, 0, 0.3)'
                    : 'rgba(245, 63, 63, 0.3)'
                }`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Space size={20} wrap>
                  <div>
                    <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                      技术底线成本 (评估 {evalDays} 人天)
                    </Text>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
                      <MoneyText value={margin.cost} />
                    </div>
                  </div>
                  <Divider type="vertical" style={{ height: 28 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                      预估毛利润
                    </Text>
                    <div
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                      }}
                    >
                      <MoneyText value={margin.grossProfit} tone={margin.grossProfit < 0 ? 'danger' : 'default'} />
                    </div>
                  </div>
                  <Divider type="vertical" style={{ height: 28 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                      预估毛利率
                    </Text>
                    <div
                      style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        color:
                          margin.level === 'healthy'
                            ? 'rgb(var(--green-6))'
                            : margin.level === 'warning'
                            ? 'rgb(var(--orange-6))'
                            : 'rgb(var(--red-6))',
                      }}
                    >
                      {margin.marginRate}%
                    </div>
                  </div>
                </Space>

                <StatusTag tone={
                    margin.level === 'healthy'
                      ? 'success'
                      : margin.level === 'warning'
                      ? 'warning'
                      : 'danger'
                  }>
                  {margin.label}
                </StatusTag>
              </div>

              {margin.level === 'danger' && (
                <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'rgb(var(--danger-6))' }}>
                  ⚠️ 毛利率低于 15%，触碰公司商务底线红线。提交审批后将自动触发高管/财务一票否决权！
                </div>
              )}
            </div>
          </div>

          {/* 2. 分期付款节点选择与配置 */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text bold>2. 分期付款节点（Payment Terms，严格满 100%）</Text>

              {!readonly && (
                <Space>
                  <Select
                    placeholder="快速套用付款方案"
                    style={{ width: 220 }}
                    size="small"
                    value={state.paymentPlan?.presetId ?? 'standard-3331'}
                    onChange={handleApplyPreset}
                  >
                    {DEFAULT_PAYMENT_PRESETS.map((p) => (
                      <Select.Option key={p.id} value={p.id}>
                        {p.name}
                      </Select.Option>
                    ))}
                  </Select>

                  <Button size="small" icon={<IconPlus />} onClick={handleAddMilestone}>
                    增加阶段
                  </Button>
                </Space>
              )}
            </div>

            <DataTable
              data={currentMilestones}
              columns={milestoneColumns}
              pagination={false}
              border={{ cell: true }}
              rowKey="name"
              style={{ marginBottom: 8 }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                background: isRatioValid ? 'var(--color-fill-2)' : 'rgba(255, 125, 0, 0.1)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <Text type={isRatioValid ? 'secondary' : 'warning'} style={{ fontSize: 'var(--text-xs)' }}>
                {isRatioValid
                  ? '各期付款比例总和为 100%，符合财务合规要求'
                  : `当前各期比例总和为 ${totalRatio}%，必须调整至 100% 才能提交审批`}
              </Text>
              <StatusTag tone={isRatioValid ? 'success' : 'warning'}>
                总比例：{totalRatio}% / 100%
              </StatusTag>
            </div>
          </div>

          {/* 3. 商业与交付条款 */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-2)',
            }}
          >
            <Text bold style={{ display: 'block', marginBottom: 12 }}>
              3. 商务交付与维保条款
            </Text>

            <FormGrid columns={2}>
              <FormItem label="免费质保期">
                <Select
                  style={{ width: '100%' }}
                  value={state.warrantyYears ?? 1}
                  disabled={readonly}
                  onChange={(v) => patchPricingState({ warrantyYears: Number(v) })}
                >
                  <Select.Option value={0.5}>半年免费质保</Select.Option>
                  <Select.Option value={1}>1 年免费质保（标准）</Select.Option>
                  <Select.Option value={2}>2 年免费质保</Select.Option>
                  <Select.Option value={3}>3 年免费质保</Select.Option>
                </Select>
              </FormItem>
              <FormItem label="发票类型">
                <Select
                  style={{ width: '100%' }}
                  value={state.invoiceType ?? '专票6%'}
                  disabled={readonly}
                  onChange={(v) => patchPricingState({ invoiceType: String(v) })}
                >
                  <Select.Option value="专票6%">增值税专用发票 (技术服务 6%)</Select.Option>
                  <Select.Option value="普票">增值税普通发票 (免税/零税率)</Select.Option>
                  <Select.Option value="专票13%">增值税专用发票 (软硬件集成 13%)</Select.Option>
                </Select>
              </FormItem>
            </FormGrid>
          </div>

          {/* 4. 在线报价文档终稿预览与生成 */}
          <div style={{ marginTop: 8 }}>
            <Text bold style={{ display: 'block', marginBottom: 8 }}>
              4. 客户版标准报价单文档预览与保存
            </Text>
            <OnlineDocumentPreview
              data={{ quote, breakdown, company, isSupplement: quote.isSupplement }}
              document={state.onlineDocument}
              quoteStatus={quote.status}
              onDocumentChange={(onlineDocument) => patchState({ onlineDocument })}
            />
          </div>

          {/* 提交审批门禁提示 */}
          {!readonly && !canSubmitAudit && (
            <AlertBanner tone="warning">{`提交审批前请补齐以下必备事项：${[
                !documentSaved ? '在上方点击保存报价文档终稿' : '',
                !state.quoteWorkDays ? '承诺交付工期' : '',
                !amountValid ? '商务报价总额' : '',
                !isRatioValid ? '分期付款比例凑齐 100%' : '',
              ]
                .filter(Boolean)
                .join('、')}`}</AlertBanner>
          )}

          {!readonly && (
            <div className="quotation-stage-submit">
              <Button
                type="primary"
                icon={<IconSend />}
                disabled={!canSubmitAudit}
                onClick={async () => {
                  try {
                    await submitForAudit(quote.id);
                    Message.success('报价单及商务方案已成功提交审批');
                  } catch (error) {
                    Message.error(error instanceof Error ? error.message : '提交审批失败');
                  }
                }}
              >
                提交商务与技术方案审批
              </Button>
            </div>
          )}
        </Space>
      </SectionCard>
    );
  }

  // ─── Stage 4：审批与全套流转文件袋穿透 ─────────────────────────────
  const totalSubs = quote.featureList.reduce((sum, module) => sum + module.subFeatures.length, 0);
  const evalDays = state.evaluationTotalDays ?? 0;
  const margin = calculateMargin(state.quoteAmount ?? 0, evalDays, 600);
  const milestones = state.paymentPlan?.milestones ?? DEFAULT_PAYMENT_PRESETS[0].milestones;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 全套流转文件袋（File Dossier）穿透卡片 */}
      <SectionCard
        title={
          <Space>
            <IconFolder style={{ color: 'var(--primary-6)' }} />
            <span>全套流转文件袋（Dossier · 审批人一键穿透调阅）</span>
          </Space>
        }
      >
        <Row gutter={16}>
          {/* 资产 1：功能清单 */}
          <Col span={6}>
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-fill-1)',
              }}
            >
              <Text bold style={{ display: 'block', fontSize: 'var(--ds-text-dense)' }}>
                📂 1. 结构化功能清单
              </Text>
              <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
                一级模块：{quote.featureList.length} 个<br />
                细分功能：{totalSubs} 项
              </div>
              <StatusTag size="small" tone="info" style={{ marginTop: 8 }}>
                已锁定入库
              </StatusTag>
            </div>
          </Col>

          {/* 资产 2：技术评估原件 */}
          <Col span={6}>
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-fill-1)',
              }}
            >
              <Text bold style={{ display: 'block', fontSize: 'var(--ds-text-dense)' }}>
                📄 2. 技术评估原件
              </Text>
              <FileList
                items={
                  state.evaluationFileName
                    ? [
                        {
                          key: state.evaluationAttachment?.id ?? state.evaluationFileName,
                          name: state.evaluationFileName,
                          meta: (
                            <>
                              工期：{state.evaluationWorkDays ?? '-'} 天 · 人天：{evalDays}
                              {state.evaluationAttachment?.uploadedAt && (
                                <>
                                  {' · 上传于 '}
                                  <DateText
                                    value={state.evaluationAttachment.uploadedAt}
                                    mode="datetime"
                                  />
                                </>
                              )}
                            </>
                          ),
                          onDownload: state.evaluationAttachment?.url
                            ? () =>
                                downloadFile(
                                  state.evaluationAttachment!.url!,
                                  state.evaluationFileName!,
                                )
                            : undefined,
                        },
                      ]
                    : []
                }
                emptyDescription="暂无附件"
              />
              {!state.evaluationAttachment?.url && (
                <StatusTag size="small" tone="neutral" style={{ marginTop: 6 }}>
                  无在线链接
                </StatusTag>
              )}
            </div>
          </Col>

          {/* 资产 3：财务与商务测算 */}
          <Col span={6}>
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-fill-1)',
              }}
            >
              <Text bold style={{ display: 'block', fontSize: 'var(--ds-text-dense)' }}>
                💼 3. 商务财务分析
              </Text>
              <div style={{ marginTop: 6, fontSize: 'var(--text-xs)' }}>
                报价：<Text bold><MoneyText value={state.quoteAmount ?? 0} /></Text>
                <br />
                毛利：{margin.marginRate}% (<MoneyText value={margin.grossProfit} tone={margin.grossProfit < 0 ? 'danger' : 'default'} />)
              </div>
              <StatusTag size="small" tone={
                  margin.level === 'healthy'
                    ? 'success'
                    : margin.level === 'warning'
                    ? 'warning'
                    : 'danger'
                } style={{ marginTop: 8 }}>
                {margin.label}
              </StatusTag>
            </div>
          </Col>

          {/* 资产 4：商业条款与付款方式 */}
          <Col span={6}>
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-fill-1)',
              }}
            >
              <Text bold style={{ display: 'block', fontSize: 'var(--ds-text-dense)' }}>
                📝 4. 付款方式与条款
              </Text>
              <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
                分期：{milestones.map((m) => `${m.ratio}%`).join(' : ')}
                <br />
                质保：{state.warrantyYears ?? 1} 年 ({state.invoiceType ?? '专票6%'})
              </div>
              <StatusTag size="small" tone="cyan" style={{ marginTop: 8 }}>
                {state.onlineDocument.status === 'saved' ||
                state.onlineDocument.status === 'finalized'
                  ? '终稿文档已就绪'
                  : '草稿状态'}
              </StatusTag>
            </div>
          </Col>
        </Row>
      </SectionCard>

      {/* 原有审批流转组件 */}
      <Stage4Approval quote={quote} readonly={readonly} />
    </Space>
  );
}

