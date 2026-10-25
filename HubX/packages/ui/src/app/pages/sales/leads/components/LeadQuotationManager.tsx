import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Message,
  Grid,
  Modal,
  Radio,
  Checkbox,
  Space,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconArrowRight,
  IconCheckCircle,
  IconClockCircle,
  IconDownload,
  IconEdit,
  IconExclamationCircle,
  IconFile,
  IconHistory,
  IconInfoCircle,
  IconMessage,
  IconPlus,
  IconRight,
} from '@arco-design/web-react/icon';
import { computeAmountBreakdown } from '../../quotation/quoteFlow';
import {
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
  type CustomerFeedbackDisposition,
  type Quote,
  type QuoteCustomerFeedback,
} from '../../quotation/types';
import './LeadQuotationManager.css';
import { formatMoney as money } from '../../../../utils/money';

const { Text } = Typography;

export const FEEDBACK_DISPOSITION_MAP: Record<
  CustomerFeedbackDisposition,
  { label: string; tagColor: string; description: string; pillClass: string }
> = {
  price_high: {
    label: '价格偏高',
    tagColor: 'red',
    description: '超出客户预算或审批额度',
    pillClass: 'pill-price_high',
  },
  timeline_long: {
    label: '工期偏长',
    tagColor: 'orange',
    description: '交付工期较长，期望提前上线',
    pillClass: 'pill-timeline_long',
  },
  scope_mismatch: {
    label: '范围调整',
    tagColor: 'arcoblue',
    description: '需调整/裁剪功能模块范围',
    pillClass: 'pill-scope_mismatch',
  },
  payment_terms: {
    label: '付款争议',
    tagColor: 'purple',
    description: '对付款节点或首付比例有异议',
    pillClass: 'pill-payment_terms',
  },
  tech_concerns: {
    label: '技术疑虑',
    tagColor: 'cyan',
    description: '对架构、多端适配或性能有顾虑',
    pillClass: 'pill-scope_mismatch',
  },
  competitor: {
    label: '竞对冲击',
    tagColor: 'magenta',
    description: '竞争对手给出更低报价或赠送增项',
    pillClass: 'pill-price_high',
  },
  approved: {
    label: '基本认可',
    tagColor: 'green',
    description: '认可方案与报价，推进合同签约',
    pillClass: 'pill-approved',
  },
  other: {
    label: '其他反馈',
    tagColor: 'gray',
    description: '其他商务或技术诉求',
    pillClass: '',
  },
};

const NEXT_ACTION_LABELS: Record<string, string> = {
  new_version: '生成新版本报价 (v+1)',
  discount_approval: '申请销售特批折扣',
  tech_meeting: '邀约技术团队与客户沟通澄清',
  maintain_negotiation: '维持原方案继续商务推进',
};

const QUICK_FEEDBACK_PRESETS = [
  '客户反馈超出预算，建议裁剪非核心模块并重新测算',
  '客户要求赶在重要节点前上线，需压缩测试排期或加急',
  '客户不接受首付款比例过高，要求调整为 3/4/2/1 阶段付款',
  '客户对多端架构兼容性存疑，需提供同类成熟案例背书',
  '方案整体符合预期，已提交法务与财务部门进入内审流程',
];

export interface LeadQuotationManagerProps {
  leadId: string;
  leadName?: string;
  quotes: Quote[];
  onOpenWorkbench: (quoteId: string) => void;
  onCreateQuote: () => void;
  onNewVersion?: (sourceQuoteId: string) => Promise<string | void>;
  onRecordFeedback?: (
    quoteId: string,
    feedback: Omit<QuoteCustomerFeedback, 'id' | 'recordedAt'>,
    syncToFollowUp?: boolean,
  ) => Promise<void>;
}

export const LeadQuotationManager: React.FC<LeadQuotationManagerProps> = ({
  leadId,
  leadName,
  quotes,
  onOpenWorkbench,
  onCreateQuote,
  onNewVersion,
  onRecordFeedback,
}) => {
  const activeQuotes = useMemo(() => quotes.filter((q) => q.status !== 'voided'), [quotes]);
  const voidedQuotes = useMemo(() => quotes.filter((q) => q.status === 'voided'), [quotes]);

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(() => {
    return activeQuotes[0]?.id || quotes[0]?.id || null;
  });

  // 当外部新增方案时，自动切换高亮至最新加入的方案
  const prevQuoteIdsRef = useRef<string[]>(quotes.map((q) => q.id));
  useEffect(() => {
    const currentIds = quotes.map((q) => q.id);
    const newId = currentIds.find((id) => !prevQuoteIdsRef.current.includes(id));
    if (newId) {
      setSelectedQuoteId(newId);
    }
    prevQuoteIdsRef.current = currentIds;
  }, [quotes]);

  // 如果 selectedQuoteId 不在列表中或为空，修正为第一个
  const currentQuote = useMemo(() => {
    if (!selectedQuoteId) return activeQuotes[0] || quotes[0] || null;
    return quotes.find((q) => q.id === selectedQuoteId) || activeQuotes[0] || quotes[0] || null;
  }, [quotes, activeQuotes, selectedQuoteId]);

  // 反馈弹窗状态
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackForm] = Form.useForm();
  const [showHistoryTimeline, setShowHistoryTimeline] = useState(false);

  // 监听当前方案计算
  const quoteBreakdown = useMemo(() => {
    if (!currentQuote) return null;
    return computeAmountBreakdown(currentQuote);
  }, [currentQuote]);

  const currentWorkDays =
    currentQuote?.flowMode === 'file'
      ? (currentQuote?.fileFlow?.quoteWorkDays ?? currentQuote?.fileFlow?.evaluationWorkDays ?? 0)
      : (currentQuote?.evalSheet?.manualWorkDays ?? currentQuote?.summary?.projectWorkDays ?? 0);
  const currentTotalLaborDays =
    currentQuote?.flowMode === 'file'
      ? (currentQuote?.fileFlow?.evaluationTotalDays ?? 0)
      : (quoteBreakdown?.totalLaborDays ?? currentQuote?.summary?.totalLaborDays ?? 0);
  const currentGrandTotal =
    currentQuote?.flowMode === 'file'
      ? (currentQuote?.fileFlow?.quoteAmount ?? 0)
      : (quoteBreakdown?.grandTotal ?? currentQuote?.summary?.grandTotalPrice ?? 0);

  // 客户反馈列表（按时间倒序）
  const feedbacks = useMemo(() => {
    const list = currentQuote?.customerFeedbacks || [];
    return [...list].sort((a, b) => {
      const tA = new Date(a.recordedAt || '').getTime();
      const tB = new Date(b.recordedAt || '').getTime();
      if (!isNaN(tA) && !isNaN(tB)) return tB - tA;
      return (b.recordedAt || '').localeCompare(a.recordedAt || '');
    });
  }, [currentQuote?.customerFeedbacks]);
  const latestFeedback = feedbacks[0] || null;

  // 实时表单反馈倾向与输入预算/工期对比
  const formDisposition = Form.useWatch('disposition', feedbackForm) as CustomerFeedbackDisposition | undefined;
  const formTargetBudget = Form.useWatch('targetBudget', feedbackForm) as number | undefined;
  const formTargetDays = Form.useWatch('targetDays', feedbackForm) as number | undefined;

  // 打开反馈录入弹窗
  const handleOpenFeedbackModal = () => {
    feedbackForm.resetFields();
    feedbackForm.setFieldsValue({
      disposition: 'price_high',
      syncToFollowUp: true,
      nextAction: 'new_version',
    });
    setFeedbackModalVisible(true);
  };

  // 提交客户反馈
  const handleSubmitFeedback = async () => {
    try {
      const values = await feedbackForm.validate();
      if (!currentQuote) return;

      setFeedbackSubmitting(true);
      const dispositionConfig = FEEDBACK_DISPOSITION_MAP[values.disposition as CustomerFeedbackDisposition];

      await onRecordFeedback?.(
        currentQuote.id,
        {
          disposition: values.disposition,
          dispositionLabel: dispositionConfig?.label || '方案反馈',
          targetBudget: values.targetBudget ? Number(values.targetBudget) : undefined,
          targetDays: values.targetDays ? Number(values.targetDays) : undefined,
          content: values.content.trim(),
          strategy: values.strategy ? values.strategy.trim() : undefined,
          nextAction: values.nextAction,
          recordedBy: '当前销售',
        },
        values.syncToFollowUp,
      );

      setFeedbackModalVisible(false);

      // 如果建议发起新版本，提示是否立即生成
      if (values.nextAction === 'new_version' && onNewVersion) {
        Modal.confirm({
          title: '已记录客户反馈，是否立即发起新版本报价？',
          content: `当前反馈明确需调整方案，可立即基于 ${currentQuote.version} 生成修改版并调整工时与清单。`,
          okText: '立即发起新版本',
          cancelText: '稍后手动发起',
          onOk: async () => {
            const newId = await onNewVersion(currentQuote.id);
            if (newId) {
              setSelectedQuoteId(newId);
            }
          },
        });
      }
    } catch (err) {
      // 校验未通过
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (quotes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-4)' }}>
        <IconFile style={{ fontSize: 40, marginBottom: 12, color: 'var(--color-text-4)' }} />
        <div style={{ fontSize: 14, marginBottom: 6, color: 'var(--color-text-2)' }}>暂无报价方案</div>
        <div style={{ fontSize: 12, marginBottom: 16 }}>可发起在线表单或文件流转的多版本方案与人天测算</div>
        <Button size="small" type="primary" icon={<IconPlus />} onClick={onCreateQuote}>
          立即发起首次报价
        </Button>
      </div>
    );
  }

  return (
    <div className="lead-quotation-manager">
      {/* ─── 左栏：方案卡片列表与版本链 ─── */}
      <aside className="lead-quotation-manager__sidebar">
        <div className="lead-quotation-manager__sidebar-header">
          <span className="lead-quotation-manager__sidebar-title">
            方案版本 ({activeQuotes.length})
          </span>
          <Button type="primary" size="mini" icon={<IconPlus />} onClick={onCreateQuote}>
            新建方案
          </Button>
        </div>

        <div className="lead-quotation-manager__list">
          {activeQuotes.map((q) => {
            const b = computeAmountBreakdown(q);
            const isSelected = q.id === (currentQuote?.id || activeQuotes[0]?.id);
            const latestFb = q.customerFeedbacks?.[0];
            const disp = latestFb ? FEEDBACK_DISPOSITION_MAP[latestFb.disposition] : null;

            const totalDays =
              q.flowMode === 'file'
                ? (q.fileFlow?.evaluationTotalDays ?? 0)
                : (b.totalLaborDays > 0 ? b.totalLaborDays : (q.summary?.totalLaborDays || 0));
            const grandTotal =
              q.flowMode === 'file'
                ? (q.fileFlow?.quoteAmount ?? 0)
                : (b.grandTotal > 0 ? b.grandTotal : (q.summary?.grandTotalPrice || 0));
            const workDays =
              q.flowMode === 'file'
                ? (q.fileFlow?.quoteWorkDays ?? q.fileFlow?.evaluationWorkDays ?? '-')
                : (q.evalSheet?.manualWorkDays || q.summary?.projectWorkDays || '-');

            return (
              <div
                key={q.id}
                className={`lead-quote-mini-card ${isSelected ? 'is-active' : ''}`}
                onClick={() => setSelectedQuoteId(q.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
              >
                <div className="lead-quote-mini-card__head">
                  <Space size={6}>
                    <Tag size="small" color="arcoblue">
                      {q.version}
                    </Tag>
                    <Tag size="small" color={QUOTE_STATUS_COLORS[q.status]}>
                      {QUOTE_STATUS_LABELS[q.status]}
                    </Tag>
                  </Space>
                  <Space size={4}>
                    {isSelected && (
                      <Tag size="small" color="arcoblue" style={{ fontSize: 11, padding: '0 6px', fontWeight: 600 }}>
                        检视中
                      </Tag>
                    )}
                    <Tag size="small" color={q.flowMode === 'file' ? 'purple' : 'gray'}>
                      {q.flowMode === 'file' ? '文件' : '在线'}
                    </Tag>
                  </Space>
                </div>

                <div className="lead-quote-mini-card__title" title={q.basicInfo.projectName}>
                  {q.basicInfo.projectName}
                </div>

                <div className="lead-quote-mini-card__metrics">
                  <span className="lead-quote-mini-card__price">{money(grandTotal)}</span>
                  <span className="lead-quote-mini-card__sub">
                    {workDays} 工作日 · {totalDays.toFixed(1)} 人天
                  </span>
                </div>

                {disp ? (
                  <div className={`lead-quote-mini-card__feedback-pill ${disp.pillClass}`}>
                    <span style={{ fontWeight: 600 }}>● 反馈: {disp.label}</span>
                    {latestFb?.targetBudget ? (
                      <span>(期望 {money(latestFb.targetBudget)})</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="lead-quote-mini-card__feedback-pill" style={{ color: 'var(--color-text-4)' }}>
                    <span>待跟进客户反馈</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 历史作废方案折叠 */}
        {voidedQuotes.length > 0 && (
          <Collapse
            bordered={false}
            style={{ marginTop: 8, background: 'transparent' }}
          >
            <Collapse.Item
              name="voided"
              header={<span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>已作废历史版本 ({voidedQuotes.length})</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {voidedQuotes.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--color-fill-2)',
                      borderRadius: 6,
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ textDecoration: 'line-through' }}>{q.basicInfo.projectName}</span>
                      <Tag size="small" color="gray">{q.version}</Tag>
                    </div>
                    <div style={{ color: 'var(--color-text-4)', fontSize: 11 }}>
                      作废原因：{q.timeline.find((t) => t.action === 'mark_voided')?.note || '未知原因'}
                    </div>
                  </div>
                ))}
              </div>
            </Collapse.Item>
          </Collapse>
        )}
      </aside>

      {/* ─── 右栏：当前选中方案的精细化管理与商务反馈控制台 ─── */}
      {currentQuote && (
        <main className="lead-quotation-manager__main">
          <div className="lead-quote-detail-card">
            {/* 方案头部 */}
            <div className="lead-quote-detail-head">
              <div className="lead-quote-detail-head__left">
                <div className="lead-quote-detail-head__title-row">
                  <span className="lead-quote-detail-head__title">
                    {currentQuote.basicInfo.projectName}
                  </span>
                  <Tag color="arcoblue">{currentQuote.version}</Tag>
                  <Tag color={QUOTE_STATUS_COLORS[currentQuote.status]}>
                    {QUOTE_STATUS_LABELS[currentQuote.status]}
                  </Tag>
                  <Tag color={currentQuote.flowMode === 'file' ? 'purple' : 'gray'}>
                    {currentQuote.flowMode === 'file' ? '文件流转' : '在线数据流转'}
                  </Tag>
                  <Tag color="cyan" size="small" style={{ fontSize: 11 }}>
                    关联方案详情
                  </Tag>
                </div>
                <div className="lead-quote-detail-head__meta">
                  <span>编号：<strong>{currentQuote.quoteNo}</strong></span>
                  <span>销售责任人：{currentQuote.salesOwnerName || '张三'}</span>
                  <span>技术评估人：{currentQuote.basicInfo.techEvaluatorName || '罗总'}</span>
                  <span>更新时间：{currentQuote.updatedAt || currentQuote.createdAt}</span>
                  {currentQuote.flowMode === 'file' && currentQuote.fileFlow?.evaluationFileName && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      评估原件：<strong>{currentQuote.fileFlow.evaluationFileName}</strong>
                      {currentQuote.fileFlow.evaluationAttachment?.url && (
                        <Button
                          size="mini"
                          type="text"
                          icon={<IconDownload />}
                          style={{ padding: '0 4px', height: 20 }}
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = currentQuote.fileFlow!.evaluationAttachment!.url!;
                            a.download = currentQuote.fileFlow!.evaluationFileName!;
                            a.click();
                          }}
                        >
                          下载原件
                        </Button>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div className="lead-quote-detail-head__actions">
                {onNewVersion && (
                  <Button
                    size="small"
                    icon={<IconHistory />}
                    onClick={async () => {
                      const newId = await onNewVersion(currentQuote.id);
                      if (newId) setSelectedQuoteId(newId);
                    }}
                  >
                    基于此方案重新报价 (v+1)
                  </Button>
                )}
                <Button
                  type="primary"
                  size="small"
                  icon={<IconArrowRight />}
                  onClick={() => onOpenWorkbench(currentQuote.id)}
                >
                  进入工作台
                </Button>
              </div>
            </div>

            {/* 核心商务指标 3 栏网格 */}
            <div className="lead-quote-metrics-grid">
              <div className="lead-quote-metric-item">
                <div className="lead-quote-metric-item__label">商务总报价</div>
                <div className="lead-quote-metric-item__val" style={{ color: 'rgb(var(--red-6))' }}>
                  {money(currentGrandTotal)}
                </div>
                <div className="lead-quote-metric-item__sub">
                  含税 · 质保 {currentQuote.summary?.warrantyYears ?? 1} 年 · {currentQuote.summary?.invoiceType || '专票'}
                </div>
              </div>

              <div className="lead-quote-metric-item">
                <div className="lead-quote-metric-item__label">交付工期与人天</div>
                <div className="lead-quote-metric-item__val">
                  {currentWorkDays} <span style={{ fontSize: 13, fontWeight: 'normal' }}>工作日</span>
                </div>
                <div className="lead-quote-metric-item__sub">
                  合计 {currentTotalLaborDays.toFixed(1)} 人天 ·{' '}
                  {currentQuote.evalSheet?.evaluationUnits?.length ?? 0} 个估算单元
                </div>
              </div>

              <div className="lead-quote-metric-item">
                <div className="lead-quote-metric-item__label">方案规模与覆盖</div>
                <div className="lead-quote-metric-item__val">
                  {(currentQuote.endpointConfigs || []).length}{' '}
                  <span style={{ fontSize: 13, fontWeight: 'normal' }}>端</span>
                </div>
                <div className="lead-quote-metric-item__sub">
                  {(currentQuote.featureList || []).length} 个一级模块 ·{' '}
                  {(currentQuote.featureList || []).reduce((s, m) => s + (m.subFeatures?.length || 0), 0)} 个二级功能
                </div>
              </div>
            </div>

            {/* ─── 客户商务反馈与诉求跟踪（核心高亮专区） ─── */}
            <section className="lead-quote-feedback-section">
              <div className="lead-quote-feedback-section__head">
                <div className="lead-quote-feedback-section__title">
                  <IconMessage style={{ color: 'rgb(var(--primary-6))' }} />
                  <span>客户商务反馈与博弈跟踪</span>
                  {feedbacks.length > 0 && (
                    <Tag size="small" color="blue">
                      共 {feedbacks.length} 次沟通反馈
                    </Tag>
                  )}
                </div>
                <Button
                  size="mini"
                  type="outline"
                  icon={<IconEdit />}
                  onClick={handleOpenFeedbackModal}
                >
                  记录客户反馈
                </Button>
              </div>

              {latestFeedback ? (
                <div>
                  {/* 最新一条反馈卡片 */}
                  <div className="lead-quote-feedback-card">
                    <div className="lead-quote-feedback-card__meta">
                      <Space size={8}>
                        <Tag
                          color={FEEDBACK_DISPOSITION_MAP[latestFeedback.disposition]?.tagColor || 'blue'}
                        >
                          {FEEDBACK_DISPOSITION_MAP[latestFeedback.disposition]?.label || '方案反馈'}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {FEEDBACK_DISPOSITION_MAP[latestFeedback.disposition]?.description}
                        </Text>
                      </Space>
                      <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                        记录人：{latestFeedback.recordedBy} · {latestFeedback.recordedAt}
                      </span>
                    </div>

                    {/* 量化差距对比面板（预算差距、工期差距） */}
                    {(latestFeedback.targetBudget || latestFeedback.targetDays) && (
                      <div className="lead-quote-feedback-gaps">
                        {latestFeedback.targetBudget && (
                          <div className="lead-quote-feedback-gap-card">
                            <div className="lead-quote-feedback-gap-card__header">
                              <span>客户期望预算</span>
                              <span>当前报价</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>
                                {money(latestFeedback.targetBudget)}
                              </span>
                              <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
                                {money(currentGrandTotal)}
                              </span>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              {currentGrandTotal > latestFeedback.targetBudget ? (
                                <span className="diff-alert-red lead-quote-feedback-gap-card__diff">
                                  超出客户预算 {money(currentGrandTotal - latestFeedback.targetBudget)} (
                                  +{(((currentGrandTotal - latestFeedback.targetBudget) / latestFeedback.targetBudget) * 100).toFixed(1)}%)
                                </span>
                              ) : (
                                <span className="diff-alert-green lead-quote-feedback-gap-card__diff">
                                  在客户预算范围内 (节余 {money(latestFeedback.targetBudget - currentGrandTotal)})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {latestFeedback.targetDays && (
                          <div className="lead-quote-feedback-gap-card">
                            <div className="lead-quote-feedback-gap-card__header">
                              <span>客户期望工期</span>
                              <span>当前方案工期</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>
                                {latestFeedback.targetDays} 工作日
                              </span>
                              <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
                                {currentWorkDays} 工作日
                              </span>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              {currentWorkDays > latestFeedback.targetDays ? (
                                <span className="diff-alert-orange lead-quote-feedback-gap-card__diff">
                                  超出客户期望 {currentWorkDays - latestFeedback.targetDays} 工作日（需排期前置或压缩测试）
                                </span>
                              ) : (
                                <span className="diff-alert-green lead-quote-feedback-gap-card__diff">
                                  满足工期预期（提前 {latestFeedback.targetDays - currentWorkDays} 工作日）
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 客户原话/核心诉求 */}
                    <div className="lead-quote-feedback-card__voice">
                      <strong>客户反馈原话：</strong>
                      {latestFeedback.content}
                    </div>

                    {/* 销售内部应对策略 */}
                    {latestFeedback.strategy && (
                      <div className="lead-quote-feedback-card__strategy">
                        <IconInfoCircle style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <strong>销售应对策略与改版思路：</strong>
                          {latestFeedback.strategy}
                        </div>
                      </div>
                    )}

                    {/* 下一步建议操作 */}
                    {latestFeedback.nextAction && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Space size={6}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>处置建议：</span>
                          <Tag size="small" color="arcoblue">
                            {NEXT_ACTION_LABELS[latestFeedback.nextAction] || latestFeedback.nextAction}
                          </Tag>
                        </Space>
                        {latestFeedback.nextAction === 'new_version' && onNewVersion && (
                          <Button
                            type="text"
                            size="mini"
                            icon={<IconHistory />}
                            onClick={async () => {
                              const newId = await onNewVersion(currentQuote.id);
                              if (newId) setSelectedQuoteId(newId);
                            }}
                          >
                            立即发起新版本报价
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 历史反馈日志折叠展示 */}
                  {feedbacks.length > 1 && (
                    <div className="lead-quote-feedback-history">
                      <Button
                        type="text"
                        size="mini"
                        icon={<IconHistory />}
                        onClick={() => setShowHistoryTimeline(!showHistoryTimeline)}
                      >
                        {showHistoryTimeline ? '收起更早反馈记录' : `展开更早反馈记录 (${feedbacks.length - 1})`}
                      </Button>

                      {showHistoryTimeline && (
                        <div style={{ marginTop: 12 }}>
                          <Timeline>
                            {feedbacks.slice(1).map((fb) => (
                              <Timeline.Item
                                key={fb.id}
                                label={fb.recordedAt}
                                dotColor={FEEDBACK_DISPOSITION_MAP[fb.disposition]?.tagColor === 'red' ? '#f53f3f' : '#165dff'}
                              >
                                <div style={{ fontSize: 12 }}>
                                  <Tag size="small" color={FEEDBACK_DISPOSITION_MAP[fb.disposition]?.tagColor}>
                                    {FEEDBACK_DISPOSITION_MAP[fb.disposition]?.label}
                                  </Tag>
                                  <span style={{ marginLeft: 8, color: 'var(--color-text-1)' }}>{fb.content}</span>
                                  {fb.strategy && (
                                    <div style={{ color: 'var(--color-text-3)', marginTop: 4 }}>策略：{fb.strategy}</div>
                                  )}
                                </div>
                              </Timeline.Item>
                            ))}
                          </Timeline>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="lead-quote-feedback-empty">
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 4 }}>
                    方案已生成，尚未记录客户商务反馈
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-4)', marginBottom: 12 }}>
                    向客户出具报价或方案后，可在此记录客户对价格、交付周期、功能范围等商务意见，便于针对性调整方案
                  </div>
                  <Button size="small" type="primary" icon={<IconEdit />} onClick={handleOpenFeedbackModal}>
                    立即记录客户反馈
                  </Button>
                </div>
              )}
            </section>

            {/* ─── 交付物与方案构成穿透 ─── */}
            <div className="lead-quote-scope-panel">
              <div className="lead-quote-scope-panel__title">
                方案端与平台架构配置 ({(currentQuote.endpointConfigs || []).length} 端)
              </div>
              <div className="lead-quote-scope-endpoints">
                {(currentQuote.endpointConfigs || []).map((ep) => {
                  const boundModules = (currentQuote.featureList || []).filter((m) => m.endpointId === ep.id);
                  const boundSubs = boundModules.reduce((s, m) => s + (m.subFeatures?.length || 0), 0);
                  return (
                    <div key={ep.id} className="lead-quote-scope-endpoint-item">
                      <Space size={8}>
                        <strong>{ep.name}</strong>
                        <span style={{ color: 'var(--color-text-3)' }}>
                          适配平台：{(ep.platforms || []).join('、') || '默认'}
                        </span>
                      </Space>
                      <span style={{ color: 'var(--color-text-3)' }}>
                        {boundModules.length} 个一级模块 · {boundSubs} 个二级功能点
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ─── 记录客户反馈弹窗 ─── */}
      <Modal
        title={
          <Space>
            <IconMessage />
            <span>记录客户反馈 · {currentQuote?.basicInfo?.projectName} ({currentQuote?.version})</span>
          </Space>
        }
        visible={feedbackModalVisible}
        onOk={handleSubmitFeedback}
        onCancel={() => setFeedbackModalVisible(false)}
        confirmLoading={feedbackSubmitting}
        okText="保存反馈"
        cancelText="取消"
        style={{ width: 620 }}
      >
        <Form form={feedbackForm} layout="vertical">
          {/* 反馈核心倾向 */}
          <Form.Item
            label="反馈倾向与核心诉求"
            field="disposition"
            rules={[{ required: true, message: '请选择客户反馈倾向' }]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Grid.Row gutter={[8, 8]}>
                {Object.entries(FEEDBACK_DISPOSITION_MAP).map(([key, config]) => (
                  <Grid.Col span={12} key={key}>
                    <Radio value={key}>
                      <span style={{ fontWeight: 500 }}>{config.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginLeft: 4 }}>
                        ({config.description})
                      </span>
                    </Radio>
                  </Grid.Col>
                ))}
              </Grid.Row>
            </Radio.Group>
          </Form.Item>

          {/* 期望预算与工期（当反馈为价格高或工期长时强烈建议录入） */}
          <Grid.Row gutter={12}>
            <Grid.Col span={12}>
              <Form.Item
                label={
                  <Space>
                    <span>客户期望预算 (元)</span>
                    <Tooltip content={`当前方案报价 ${money(currentGrandTotal)}`}>
                      <IconInfoCircle />
                    </Tooltip>
                  </Space>
                }
                field="targetBudget"
                extra={
                  formTargetBudget ? (
                    currentGrandTotal > formTargetBudget ? (
                      <span style={{ color: 'rgb(var(--red-6))', fontSize: 11 }}>
                        当前报价超出客户预算 {money(currentGrandTotal - formTargetBudget)}
                      </span>
                    ) : (
                      <span style={{ color: 'rgb(var(--green-6))', fontSize: 11 }}>
                        在客户预算范围内
                      </span>
                    )
                  ) : '如客户提到心理预算，可在此录入'
                }
              >
                <InputNumber
                  placeholder="如：200000"
                  step={5000}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Grid.Col>

            <Grid.Col span={12}>
              <Form.Item
                label={
                  <Space>
                    <span>客户期望工期 (工作日)</span>
                    <Tooltip content={`当前方案约定工期 ${currentWorkDays} 工作日`}>
                      <IconInfoCircle />
                    </Tooltip>
                  </Space>
                }
                field="targetDays"
                extra={
                  formTargetDays ? (
                    currentWorkDays > formTargetDays ? (
                      <span style={{ color: 'rgb(var(--orange-6))', fontSize: 11 }}>
                        当前工期超出客户预期 {currentWorkDays - formTargetDays} 工作日
                      </span>
                    ) : (
                      <span style={{ color: 'rgb(var(--green-6))', fontSize: 11 }}>
                        符合客户交付工期要求
                      </span>
                    )
                  ) : '如客户要求提前交付，可在此录入'
                }
              >
                <InputNumber
                  placeholder="如：15"
                  step={1}
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Grid.Col>
          </Grid.Row>

          {/* 客户原话/核心关切 */}
          <Form.Item
            label="客户反馈原话 / 核心关切"
            field="content"
            rules={[{ required: true, message: '请录入客户具体的反馈内容' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="详细记录客户在会议/电话沟通中的关键意见，例如预算权限、要求砍掉的模块、或付款条款要求..."
            />
          </Form.Item>

          {/* 快捷填词建议 */}
          <div style={{ marginTop: -8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginRight: 6 }}>快捷填入：</span>
            <Space wrap size={6}>
              {QUICK_FEEDBACK_PRESETS.map((preset, idx) => (
                <Tag
                  key={idx}
                  size="small"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const prev = feedbackForm.getFieldValue('content') || '';
                    feedbackForm.setFieldValue('content', prev ? `${prev}；${preset}` : preset);
                  }}
                >
                  {preset.slice(0, 16)}...
                </Tag>
              ))}
            </Space>
          </div>

          {/* 销售内部应对策略与改动思路 */}
          <Form.Item
            label="内部应对策略 / 改版思路 (选填)"
            field="strategy"
            extra="如针对价格高，建议剥离非核心端/模块；或针对工期紧，建议技术排期加急或压缩测试时间"
          >
            <Input.TextArea
              rows={2}
              placeholder="如：与技术罗总评估，一期削减管理端数据大屏，转入二期；向商务部申请 95 折特批..."
            />
          </Form.Item>

          {/* 下一步动作推进 */}
          <Form.Item label="处置推进建议" field="nextAction">
            <Radio.Group>
              <Radio value="new_version">发起新版本报价 (v+1)</Radio>
              <Radio value="discount_approval">申请销售特批折扣</Radio>
              <Radio value="tech_meeting">邀约技术澄清答疑</Radio>
              <Radio value="maintain_negotiation">维持方案商务博弈</Radio>
            </Radio.Group>
          </Form.Item>

          {/* 同步生成跟进记录 */}
          <Form.Item field="syncToFollowUp" style={{ marginBottom: 0 }}>
            <Checkbox defaultChecked>
              同步生成一条线索跟进记录（沉淀至线索 360 沟通协同与动态时间线）
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
