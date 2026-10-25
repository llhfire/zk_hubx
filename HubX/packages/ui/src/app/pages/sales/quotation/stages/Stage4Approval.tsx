import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Button, Card, Divider, Empty, Input, Message, Modal, Radio, Select, Space,
  Table, Tabs, Tag, Tooltip, Typography,
} from '@arco-design/web-react';
import {
  IconSend, IconDownload, IconCheckCircle, IconCloseCircle, IconApps, IconCheck,
  IconClose, IconPrinter, IconFile, IconEye, IconExclamationCircleFill, IconCheckCircleFill,
  IconCloseCircleFill, IconUser, IconSwap, IconUpload,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import { computeAmountBreakdown, sumEvalDaysByRole } from '../quoteFlow';
import { PLATFORM_OPTIONS, QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, RISK_META } from '../types';
import type { EvalRole, Quote } from '../types';
import { buildDealQuotePrefill } from '../../contracts/dealQuotePrefill';
import { findCompanyEntityByName } from '../../company-entity/companyEntityData';
import { generateQuoteHtml } from '../quotePdfTemplate';
import { useQuoteAssets } from '../useQuoteAssets';
import { ZKRT_QUOTE_TEMPLATE } from '../quoteDocumentTemplate';
import { createDocxBlob, downloadBlob } from '../../../../documents/wordExport';
import { buildQuoteDiff, QuoteDiffItem } from '../quoteDiff';
import { computeProfitRate, DEFAULT_MIN_PROFIT_RATE } from '../quotePricing';
import { ScanUpload } from '../components/ScanUpload';
import type { ScanFile } from '../fileFlow';
import './Stage4Approval.css';
import { formatMoney as money } from '../../../../utils/money';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-');
}

/** 常用审批通过快捷意见 */
const PRESET_APPROVE_COMMENTS = [
  '数据核验无误，同意报价。',
  '工期与毛利率合规，予以批准。',
  '商务与回款条款满足风控要求，同意。',
  '技术方案与人天评估合理，通过。',
];

/** 常用审批驳回快捷意见 */
const PRESET_REJECT_COMMENTS = [
  '综合毛利率偏低，建议优化增项或压缩非核心技术人天。',
  '首期预付款比例过低或账期过长，存在资金垫资风险。',
  '部分技术模块评估人天不充分，请技术负责人重新核算。',
  '代采项目未注明垫资实报实销条款，请完善合同说明。',
];

export interface Stage4ApprovalProps extends StageProps {
  defaultTab?: 'paper' | 'risk_diff' | 'details';
}

export function Stage4Approval({ quote, readonly, defaultTab }: Stage4ApprovalProps) {
  const assets = useQuoteAssets();
  const {
    currentRole, markSent, markConfirmed, markVoided, withdrawSent,
    returnToStamp, returnToEditFeatures, isLeadFrozen, decideAudit, stampQuote,
    updateQuote, quotes,
  } = useQuotation();

  const leadFrozen = isLeadFrozen(quote.id);
  const navigate = useNavigate();

  // 状态管理
  const [activeTab, setActiveTab] = useState<'paper' | 'risk_diff' | 'details'>(defaultTab || 'paper');
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [approveVisible, setApproveVisible] = useState(false);
  const [approveComment, setApproveComment] = useState('数据核验无误，同意报价。');
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [dualScanModalVisible, setDualScanModalVisible] = useState(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [stampModalVisible, setStampModalVisible] = useState(false);
  const [stampBranch, setStampBranch] = useState<'electronic' | 'scan'>('electronic');
  const [tempScans, setTempScans] = useState<ScanFile[]>(quote.fileFlow?.scans ?? []);

  // 角色判定
  const isSales = currentRole === 'sales';
  const currentAuditorNode = quote.auditNodes?.find((node) => node.quoteRole === currentRole) ?? null;
  const isPendingAuditor = Boolean(currentAuditorNode && currentAuditorNode.status === 'PENDING' && quote.status === 'auditing');
  const isStamper = currentRole === 'assistant' || quote.stampNode?.stamperName === currentRole;

  // 财务核算指标
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);
  const roleTotals = useMemo(() => sumEvalDaysByRole(quote.evalSheet), [quote.evalSheet]);
  const endpointConfigs = quote.endpointConfigs || [];
  const featureList = quote.featureList || [];
  const evalSheet = quote.evalSheet;
  const travelOnsite = quote.travelOnsite;

  // 签约主体信息
  const entity = findCompanyEntityByName(quote.signingEntity ?? ZKRT_QUOTE_TEMPLATE.signingEntity);
  const companyName = entity?.name ?? '北京中科智汇科技有限公司';

  // 毛利率计算
  const profitRate = useMemo(() => {
    return computeProfitRate({
      grandTotal: breakdown.grandTotal,
      upliftTotal: breakdown.addedCost,
      roleCostTotal: breakdown.techLaborCost,
    });
  }, [breakdown]);

  // 版本比对数据查找（同线索下的上一个版本）
  const previousQuote = useMemo(() => {
    if (!quotes || quotes.length === 0) return null;
    const sameLeadQuotes = quotes.filter((q) => q.leadId === quote.leadId && q.id !== quote.id);
    return sameLeadQuotes[0] || null;
  }, [quotes, quote.leadId, quote.id]);

  const diffItems = useMemo<QuoteDiffItem[]>(() => {
    if (!previousQuote) return [];
    return buildQuoteDiff(previousQuote, quote);
  }, [previousQuote, quote]);

  // 高保真正式公函 HTML
  const formalHtml = useMemo(() => {
    return generateQuoteHtml({
      quote,
      breakdown,
      company: {
        name: companyName,
        address: entity?.address ?? '',
        phone: entity?.contactPhone ?? '',
        representative: entity?.legalPerson ?? '',
      },
      isSupplement: quote.isSupplement,
      assets,
    });
  }, [assets, breakdown, companyName, entity, quote]);

  // ─── 审批与流转动作 ──────────────────────────────────────────

  const handleApprove = () => {
    if (!currentAuditorNode) return;
    decideAudit(quote.id, currentAuditorNode.auditorName, 'approve', approveComment.trim() || '同意');
    setApproveVisible(false);
    Message.success('已审批通过并签署意见');
  };

  const handleReject = () => {
    if (!currentAuditorNode) return;
    if (!rejectComment.trim()) {
      Message.warning('请填写驳回意见');
      return;
    }
    decideAudit(quote.id, currentAuditorNode.auditorName, 'reject', rejectComment.trim());
    setRejectVisible(false);
    setRejectComment('');
    Message.info('已驳回报价，退回销售修改并全员重审');
  };

  // 分支 1：系统加盖电子防伪公章
  const handleElectronicStamp = () => {
    stampQuote(quote.id);
    setStampModalVisible(false);
    Message.success('已加盖企业官方电子公章，正式报价单已就绪');
  };

  // 分支 2：线下实体盖章·上传扫描件归档
  const handleScanStamp = () => {
    if (!tempScans || tempScans.length === 0) {
      Message.warning('请至少上传一份线下实体盖章扫描件');
      return;
    }
    updateQuote(quote.id, (current) => ({
      ...current,
      fileFlow: {
        ...(current.fileFlow ?? { onlineDocument: { status: 'empty' as const }, scans: [] }),
        scans: tempScans,
      },
    }));
    stampQuote(quote.id);
    setStampModalVisible(false);
    setCurrentScanIndex(0);
    setDualScanModalVisible(true);
    Message.success('线下盖章扫描件已归档，已为您进入全屏对照审阅');
  };

  // 默认快捷处理
  const handleStamp = () => {
    setStampBranch('electronic');
    setStampModalVisible(true);
  };

  const handleSend = () => {
    markSent(quote.id);
    Message.success('已登记发送客户，报价有效期自今日起算');
  };

  const handleConfirmed = () => {
    markConfirmed(quote.id);
    Message.success('已确认成交，可在下方生成主合同');
  };

  const handleGenerateContract = () => {
    const query = `?leadId=${encodeURIComponent(quote.leadId)}&quoteId=${encodeURIComponent(quote.id)}`;
    navigate(`/contracts/new${query}`, {
      state: { dealQuotePrefill: buildDealQuotePrefill(quote) },
    });
  };

  const linkedContractId = quote.isSupplement ? quote.generatedContractId : quote.contractId;

  const handleVoid = () => {
    if (!voidReason.trim()) {
      Message.warning('请填写作废原因');
      return;
    }
    markVoided(quote.id, voidReason.trim());
    setVoidVisible(false);
    setVoidReason('');
    Message.success('报价已废止');
  };

  const handleWithdrawSent = () => {
    withdrawSent(quote.id);
    Message.success('已撤回发出，报价回到已盖章状态');
  };

  const handleReturnToStamp = () => {
    returnToStamp(quote.id);
    Message.success('已退回盖章，报价回到待盖章状态');
  };

  const handleReturnToEditFeatures = () => {
    returnToEditFeatures(quote.id);
    Message.success('已退回改清单，报价回到草稿状态');
  };

  // 导出与打印
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Message.warning('请允许弹出窗口以打印报价单');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(formalHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadWord = async () => {
    setDownloadingWord(true);
    try {
      const title = `${quote.basicInfo.projectName || quote.quoteNo}-正式报价单`;
      const blob = await createDocxBlob(formalHtml, title);
      downloadBlob(blob, `${sanitizeFileName(title)}.docx`);
      Message.success('Word 格式报价单已导出');
    } catch {
      Message.error('导出失败，请重试');
    } finally {
      setDownloadingWord(false);
    }
  };

  // 是否已正式盖章
  const isStamped = ['stamped', 'sent', 'confirmed'].includes(quote.status);

  // 沙箱化 HTML：未盖章时隐藏模版内部预置印章，盖章后原位精准呈现
  const sandboxedHtml = useMemo(() => {
    let html = formalHtml;
    if (!isStamped) {
      html = html.replace('</style>', '.seal-img-p2, .seal-img-p6 { display: none !important; } </style>');
    }
    return html;
  }, [formalHtml, isStamped]);

  return (
    <div className="stage4-container">
      {/* ── 1. 顶部：审批与流转指挥中心 (Approval Command Bar) ───────────── */}
      <div className="stage4-command-bar">
        <div className="stage4-command-header">
          <div className="stage4-command-title">
            <Title heading={6} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              系统审批与盖章
              <Tag size="small" color={quote.flowMode === 'file' ? 'purple' : 'arcoblue'}>
                {quote.flowMode === 'file' ? '文件流转' : '数据流转'}
              </Tag>
              <Tag size="small" color={QUOTE_STATUS_COLORS[quote.status]}>
                {QUOTE_STATUS_LABELS[quote.status]}
              </Tag>
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {quote.quoteNo} · {quote.version}
            </Text>
          </div>

          {/* 顶栏主操作区（根据用户当前身份与报价单状态智能呈现） */}
          <div className="stage4-command-actions">
            {/* 1. 会签人待审操作 */}
            {!readonly && isPendingAuditor && (
              <Space>
                <Button
                  type="primary"
                  status="success"
                  icon={<IconCheck />}
                  disabled={leadFrozen}
                  onClick={() => setApproveVisible(true)}
                >
                  同意并通过
                </Button>
                <Button
                  status="danger"
                  icon={<IconClose />}
                  disabled={leadFrozen}
                  onClick={() => setRejectVisible(true)}
                >
                  驳回修改
                </Button>
              </Space>
            )}

            {/* 2. 印章管理员（黄海）待盖章操作：支持双分支（系统生成/实体章扫描件） */}
            {!readonly && isStamper && quote.status === 'pending_stamp' && (
              <Space>
                <Button
                  type="primary"
                  icon={<IconCheckCircleFill />}
                  disabled={leadFrozen}
                  onClick={handleStamp}
                >
                  确认使用所选文件并加盖公章
                </Button>
                <Button
                  type="outline"
                  icon={<IconUpload />}
                  disabled={leadFrozen}
                  onClick={() => {
                    setStampBranch('scan');
                    setTempScans(quote.fileFlow?.scans ?? []);
                    setStampModalVisible(true);
                  }}
                >
                  上传实体章扫描件
                </Button>
              </Space>
            )}

            {/* 3. 销售人员：已盖章时可发送 */}
            {!readonly && isSales && quote.status === 'stamped' && (
              <Space>
                <Button
                  type="primary"
                  icon={<IconSend />}
                  disabled={leadFrozen}
                  onClick={handleSend}
                >
                  登记发送客户
                </Button>
                {!quote.sentAt && (
                  <Button onClick={handleReturnToStamp}>退回盖章</Button>
                )}
              </Space>
            )}

            {/* 4. 销售人员：已外发时可确认成交或撤回 */}
            {!readonly && isSales && quote.status === 'sent' && (
              <Space>
                <Button
                  type="primary"
                  status="success"
                  icon={<IconCheckCircle />}
                  disabled={leadFrozen}
                  onClick={handleConfirmed}
                >
                  确认成交
                </Button>
                <Button
                  status="danger"
                  icon={<IconCloseCircle />}
                  disabled={leadFrozen}
                  onClick={() => setVoidVisible(true)}
                >
                  客户放弃·作废
                </Button>
                <Button onClick={handleWithdrawSent}>撤回发出</Button>
              </Space>
            )}

            {/* 5. 销售人员：驳回时退回修改 */}
            {!readonly && isSales && quote.status === 'rejected' && (
              <Button type="primary" onClick={handleReturnToEditFeatures}>
                退回改清单
              </Button>
            )}

            {/* 6. 公共文档导出与打印 */}
            <Button icon={<IconPrinter />} onClick={handlePrint}>
              打印公函
            </Button>
            <Button
              icon={<IconDownload />}
              loading={downloadingWord}
              disabled={downloadingWord}
              onClick={handleDownloadWord}
            >
              导出 Word
            </Button>
          </div>
        </div>

        {/* 审批与盖章全景进程条 */}
        <div className="stage4-stepper">
          {quote.auditNodes && quote.auditNodes.length > 0 ? (
            quote.auditNodes.map((node, index) => {
              const isApproved = node.status === 'APPROVED';
              const isRejected = node.status === 'REJECTED';
              const isCurrent = node.status === 'PENDING' && quote.status === 'auditing';

              return (
                <div key={`${node.auditorName}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tooltip
                    content={
                      <div>
                        <div><b>{node.role} · {node.auditorName}</b></div>
                        <div>状态：{isApproved ? '已同意通过' : isRejected ? '已驳回' : '待审批'}</div>
                        {node.auditTime && <div>时间：{node.auditTime}</div>}
                        {node.comment && <div>意见：{node.comment}</div>}
                      </div>
                    }
                  >
                    <div className={`stage4-step-node ${isApproved ? 'approved' : isRejected ? 'rejected' : isCurrent ? 'active' : ''}`}>
                      <div className="stage4-step-index">{index + 1}</div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{node.auditorName}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{node.role}</span>
                      </div>
                      <Tag
                        size="small"
                        color={isApproved ? 'green' : isRejected ? 'red' : 'gray'}
                        style={{ fontSize: 10, height: 18, lineHeight: '18px', padding: '0 4px' }}
                      >
                        {isApproved ? '已通过' : isRejected ? '已驳回' : '待审'}
                      </Tag>
                    </div>
                  </Tooltip>
                  <span className="stage4-step-arrow">➔</span>
                </div>
              );
            })
          ) : null}

          {/* 盖章节点 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip content={`印章管理员：${quote.stampNode?.stamperName || '公章管理员'} · ${isStamped ? '已盖章' : '待盖章'}`}>
              <div className={`stage4-step-node ${isStamped ? 'approved' : quote.status === 'pending_stamp' ? 'active' : ''}`}>
                <div className="stage4-step-index">印</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{quote.stampNode?.stamperName || '公章管理'}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>企业公章</span>
                </div>
                <Tag
                  size="small"
                  color={isStamped ? 'green' : quote.status === 'pending_stamp' ? 'orange' : 'gray'}
                  style={{ fontSize: 10, height: 18, lineHeight: '18px', padding: '0 4px' }}
                >
                  {isStamped ? '已盖章' : quote.status === 'pending_stamp' ? '待盖章' : '未到'}
                </Tag>
              </div>
            </Tooltip>
            <span className="stage4-step-arrow">➔</span>
          </div>

          {/* 最终结果节点 */}
          <div className={`stage4-step-node ${quote.status === 'confirmed' ? 'approved' : quote.status === 'voided' ? 'rejected' : ''}`}>
            <div className="stage4-step-index">终</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>客户成交</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>商务闭环</span>
            </div>
            <Tag
              size="small"
              color={quote.status === 'confirmed' ? 'green' : quote.status === 'sent' ? 'arcoblue' : quote.status === 'voided' ? 'red' : 'gray'}
              style={{ fontSize: 10, height: 18, lineHeight: '18px', padding: '0 4px' }}
            >
              {quote.status === 'confirmed' ? '已成交' : quote.status === 'sent' ? '已发送' : quote.status === 'voided' ? '已作废' : '待推进'}
            </Tag>
          </div>
        </div>
      </div>

      {/* ── 2. 成交战报里程碑 Banner (若已确认成交) ────────────────────────── */}
      {quote.status === 'confirmed' && (
        <div className="stage4-deal-banner">
          <div>
            <div className="stage4-deal-banner-title">
              <IconCheckCircleFill style={{ color: 'rgb(var(--green-6))', fontSize: 20 }} />
              <span>商业成果达成：该报价单已由客户确认成交！</span>
            </div>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              客户名称：<Text bold>{quote.basicInfo.customerName || '未指定客户'}</Text> · 成交总金额：
              <Text bold style={{ color: 'rgb(var(--red-6))', fontFamily: "'Inter Variable', Arial, sans-serif" }}>
                {money(breakdown.grandTotal)}
              </Text>
              {linkedContractId ? ' · 合同已建档关联' : ' · 建议立即一键生成主合同向导'}
            </Text>
          </div>
          <Space>
            {linkedContractId ? (
              <Button type="primary" onClick={() => navigate(`/contracts/${linkedContractId}`)}>
                查看{quote.isSupplement ? '补充合同' : '主合同'}
              </Button>
            ) : (
              <Button type="primary" status="success" icon={<IconCheck />} onClick={handleGenerateContract}>
                一键生成{quote.isSupplement ? '补充合同' : '主合同'}
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* ── 3. 主工作区与侧边栏栅格 ────────────────────────────────────── */}
      <div className="stage4-workspace-grid">
        {/* 左侧主 Tab 区域 */}
        <div>
          <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as any)} type="rounded" destroyOnHide={false}>
            {/* Tab 1: 正式公函与电子签章 (Paper Document Viewer) */}
            <TabPane key="paper" title={<span><IconFile /> 正式公函与电子签章</span>}>
              <Card
                size="small"
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>标准 A4 客户版公文</span>
                    <Space size={8}>
                      {quote.fileFlow?.scans && quote.fileFlow.scans.length > 0 && (
                        <Button
                          size="mini"
                          type="outline"
                          icon={<IconSwap />}
                          onClick={() => {
                            setCurrentScanIndex(0);
                            setDualScanModalVisible(true);
                          }}
                        >
                          扫描件全屏对照 ({quote.fileFlow.scans.length})
                        </Button>
                      )}
                      {quote.fileFlow?.scans && quote.fileFlow.scans.length > 0 ? (
                        <Tag color="green" size="small">用印方式: 实体章扫描件 ({quote.fileFlow.scans.length})</Tag>
                      ) : isStamped ? (
                        <Tag color="green" size="small">用印方式: 系统电子防伪公章</Tag>
                      ) : null}
                      <Tag color="arcoblue" size="small">签约主体: {companyName}</Tag>
                    </Space>
                  </div>
                }
              >
                {/* 标准 A4 客户版纸质视图（iframe 沙箱隔离，彻底消除排版挤压） */}
                <div className="stage4-paper-container">
                    <div className="stage4-paper-toolbar">
                      <Space size={12}>
                        <span>📄 <b>标准客户版公函（A4 · 共 6 页）</b></span>
                        <Tag size="small" color={isStamped ? 'green' : 'gray'}>
                          {isStamped ? '已加盖企业公章' : '待加盖公章（落款处呈现签字栏）'}
                        </Tag>
                      </Space>
                      <Space size={8}>
                        <Button
                          size="mini"
                          type="secondary"
                          icon={<IconEye />}
                          onClick={() => setFullscreenPreview(true)}
                        >
                          全屏大图审阅
                        </Button>
                        <Button
                          size="mini"
                          type="secondary"
                          icon={<IconPrinter />}
                          onClick={handlePrint}
                        >
                          打印公函
                        </Button>
                        <Button
                          size="mini"
                          type="secondary"
                          icon={<IconDownload />}
                          loading={downloadingWord}
                          onClick={handleDownloadWord}
                        >
                          导出 Word
                        </Button>
                      </Space>
                    </div>

                    <div className="stage4-paper-iframe-wrapper stage4-a4-paper">
                      <iframe
                        srcDoc={sandboxedHtml}
                        title="正式报价公函"
                        className="stage4-paper-iframe"
                      />
                    </div>

                    {/* 防伪编码与数字时间戳底栏 */}
                    <div className="stage4-security-badge" style={{ margin: '8px 12px 12px' }}>
                      <IconCheckCircleFill style={{ color: 'rgb(var(--green-6))' }} />
                      <span>
                        防伪验真编码：{quote.quoteNo}-SEC-{quote.id.slice(-6).toUpperCase()} ·
                        加盖时间：{quote.stampNode?.stampTime || quote.sentAt || new Date().toISOString().slice(0, 10)} ·
                        系统全链路存证有效
                      </span>
                    </div>
                  </div>
              </Card>
            </TabPane>

            {/* Tab 2: 审批风控与版本对比 (Risk & Diff 驾驶舱) */}
            <TabPane key="risk_diff" title={<span><IconEye /> 审批风控与版本变更对比</span>}>
              <Card size="small" style={{ marginBottom: 16 }}>
                <Title heading={6} style={{ marginTop: 0, marginBottom: 12 }}>审批风控体检雷达</Title>
                <div className="stage4-risk-radar-grid">
                  {/* 指标 1：综合毛利率 */}
                  <div className={`stage4-risk-radar-card ${profitRate != null && profitRate < DEFAULT_MIN_PROFIT_RATE ? 'warning' : 'safe'}`}>
                    <Text type="secondary" style={{ fontSize: 12 }}>预估综合毛利率</Text>
                    <div className="stage4-risk-card-value">
                      {profitRate != null ? `${(profitRate * 100).toFixed(1)}%` : '—'}
                    </div>
                    <Text style={{ fontSize: 11, color: profitRate != null && profitRate < DEFAULT_MIN_PROFIT_RATE ? 'rgb(var(--warning-6))' : 'rgb(var(--success-6))' }}>
                      {profitRate != null && profitRate < DEFAULT_MIN_PROFIT_RATE
                        ? `低于基准底线 ${(DEFAULT_MIN_PROFIT_RATE * 100)}%，请审核人审慎折让`
                        : `符合公司基准收益指标 (≥${(DEFAULT_MIN_PROFIT_RATE * 100)}%)`}
                    </Text>
                  </div>

                  {/* 指标 2：技术工期与人天 */}
                  <div className="stage4-risk-radar-card safe">
                    <Text type="secondary" style={{ fontSize: 12 }}>技术人天与交付工期</Text>
                    <div className="stage4-risk-card-value">
                      {breakdown.totalLaborDays.toFixed(1)} 人天
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      评估周期 {evalSheet?.manualWorkDays || '-'} 个工作日 · {evalSheet?.activeRoles.length || 0} 个技术工种
                    </Text>
                  </div>

                  {/* 指标 3：外部自费与代采垫资 */}
                  <div className={`stage4-risk-radar-card ${breakdown.selfPaidSubtotal > 0 ? 'warning' : 'safe'}`}>
                    <Text type="secondary" style={{ fontSize: 12 }}>外部自费与代采项目</Text>
                    <div className="stage4-risk-card-value">
                      {money(breakdown.selfPaidSubtotal)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {quote.otherCosts.length > 0
                        ? `共 ${quote.otherCosts.length} 项（客户直购 / 我方代采）`
                        : '无第三方代采垫资'}
                    </Text>
                  </div>

                  {/* 指标 4：首付比例与付款条款 */}
                  <div className="stage4-risk-radar-card safe">
                    <Text type="secondary" style={{ fontSize: 12 }}>商务结算与付款期数</Text>
                    <div className="stage4-risk-card-value">
                      {quote.summary?.paymentTerms.length || 0} 期分付
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      首付款 {quote.summary?.paymentTerms[0]?.percent || 0}% · 质保维护 {quote.summary?.warrantyYears ?? 1} 年
                    </Text>
                  </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* 版本变更对比面板 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Title heading={6} style={{ margin: 0 }}>
                    版本变更对比 ({quote.version}
                    {previousQuote ? ` vs ${previousQuote.version}` : ' · 初版基准'})
                  </Title>
                  {previousQuote && (
                    <Tag size="small" color="arcoblue">
                      已自动关联历史版本 {previousQuote.quoteNo} ({previousQuote.version})
                    </Tag>
                  )}
                </div>

                {previousQuote && diffItems.length > 0 ? (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="key"
                    data={diffItems}
                    columns={[
                      {
                        title: '对比维度',
                        dataIndex: 'label',
                        width: 120,
                        render: (val: string, row: QuoteDiffItem) => (
                          <Space size={4}>
                            <span style={{ fontWeight: 600 }}>{val}</span>
                            {row.changed && <Tag size="small" color="red">已变动</Tag>}
                          </Space>
                        ),
                      },
                      {
                        title: `上一版本 (${previousQuote.version})`,
                        dataIndex: 'before',
                        render: (val: string) => <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{val}</span>,
                      },
                      {
                        title: `当前版本 (${quote.version})`,
                        dataIndex: 'after',
                        render: (val: string, row: QuoteDiffItem) => (
                          <span style={{ fontWeight: row.changed ? 600 : 400, color: row.changed ? 'rgb(var(--arcoblue-6))' : 'inherit', fontSize: 12 }}>
                            {val}
                          </span>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <div style={{ padding: '16px 20px', background: 'var(--color-fill-1)', borderRadius: 6, textAlign: 'center' }}>
                    <Text type="secondary">当前为该项目的第一个正式报价版本（v1.0），无前序版本差异数据。</Text>
                  </div>
                )}
              </Card>
            </TabPane>

            {/* Tab 3: 功能清单与评估底表 (Details) */}
            <TabPane key="details" title={<span><IconApps /> 功能清单与工时评估底表</span>}>
              <Card size="small" title="功能分解与多角色工时核算" style={{ marginBottom: 16 }}>
                {evalSheet && endpointConfigs.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-fill-1)' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', width: 100 }}>端</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', width: 110 }}>模块</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', width: 130 }}>子功能</th>
                          {evalSheet.activeRoles.map((r: EvalRole) => (
                            <th key={r.key} style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', width: 70 }}>{r.name}</th>
                          ))}
                          <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', width: 65 }}>人天</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', width: 90 }}>风险</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const unitMap = new Map<string, typeof evalSheet.evaluationUnits[0]>();
                          evalSheet.evaluationUnits.forEach((u) => {
                            u.boundSubFeatureIds.forEach((subId) => { unitMap.set(subId, u); });
                          });
                          const epRowSpans: Record<string, number> = {};
                          const epFirstIdx: Record<string, number> = {};
                          let idx = 0;
                          featureList.forEach((m) => {
                            const epId = m.endpointId || '';
                            if (!(epId in epFirstIdx)) { epFirstIdx[epId] = idx; epRowSpans[epId] = 0; }
                            epRowSpans[epId] += Math.max(m.subFeatures.length, 1);
                            idx += Math.max(m.subFeatures.length, 1);
                          });
                          let rowIdx = 0;
                          return featureList.flatMap((m) => {
                            const ep = endpointConfigs.find((e) => e.id === m.endpointId);
                            const isFirstOfEp = epFirstIdx[m.endpointId || ''] === rowIdx;
                            const subs = m.subFeatures.length > 0 ? m.subFeatures : [{ id: 'empty', name: '（暂无子功能）', description: '' }];
                            return subs.map((f, fIdx) => {
                              rowIdx++;
                              const unit = unitMap.get(f.id);
                              const totalDays = unit?.totalDays ?? 0;
                              return (
                                <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                                  {isFirstOfEp && fIdx === 0 && (
                                    <td rowSpan={epRowSpans[m.endpointId || ''] || 1} style={{ padding: '6px 10px', verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid var(--color-border-2)', fontSize: 12 }}>
                                      {ep?.name || '-'}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                                        {(ep?.platforms || []).map((pid) => (
                                          <Tag key={pid} size="small" color="arcoblue" style={{ width: 'fit-content', fontSize: 10 }}>
                                            {PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid}
                                          </Tag>
                                        ))}
                                      </div>
                                    </td>
                                  )}
                                  {fIdx === 0 && (
                                    <td rowSpan={subs.length} style={{ padding: '6px 10px', verticalAlign: 'top', fontWeight: 500, borderRight: '1px solid var(--color-border-2)' }}>{m.name}</td>
                                  )}
                                  <td style={{ padding: '6px 10px', borderRight: '1px solid var(--color-border-2)' }}>{f.name}</td>
                                  {evalSheet.activeRoles.map((r: EvalRole) => (
                                    <td key={r.key} style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-2)', fontFamily: "'Inter Variable', Arial, sans-serif" }}>
                                      {unit && (unit.manualWorkload[r.key] ?? 0) > 0 ? (unit.manualWorkload[r.key] ?? 0).toFixed(1) : '-'}
                                    </td>
                                  ))}
                                  <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-2)', fontFamily: "'Inter Variable', Arial, sans-serif", fontWeight: 500 }}>
                                    {totalDays > 0 ? totalDays.toFixed(1) : '-'}
                                  </td>
                                  <td style={{ padding: '6px 10px', borderRight: '1px solid var(--color-border-2)' }}>
                                    {unit && <Tag size="small" color={RISK_META[unit.riskLevel]?.color}>{RISK_META[unit.riskLevel]?.text}</Tag>}
                                  </td>
                                </tr>
                              );
                            });
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty description="暂无评估数据" />
                )}
              </Card>

              {/* 销售增项与差旅驻场 */}
              {quote.salesAddedRoles.length > 0 && (
                <Card size="small" title="销售商务增项" style={{ marginBottom: 16 }}>
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    data={quote.salesAddedRoles}
                    columns={[
                      { title: '岗位', dataIndex: 'roleName', width: 140 },
                      { title: '人数', dataIndex: 'headcount', width: 70 },
                      { title: '天数', dataIndex: 'days', width: 70 },
                      { title: '日均单价', dataIndex: 'dailyRate', width: 100, render: (v: number) => money(v) },
                      { title: '小计', dataIndex: 'subtotal', width: 110, render: (v: number) => money(v) },
                      { title: '事由', dataIndex: 'reason' },
                    ]}
                  />
                </Card>
              )}

              {/* 外部自费项目 */}
              {quote.otherCosts.length > 0 && (
                <Card size="small" title="外部自费与代采项目" style={{ marginBottom: 16 }}>
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    data={quote.otherCosts}
                    columns={[
                      { title: '费用项', dataIndex: 'name', width: 200 },
                      { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
                      { title: '说明 / 采购属性', dataIndex: 'note', render: (v: string) => v || '-' },
                    ]}
                  />
                </Card>
              )}
            </TabPane>
          </Tabs>
        </div>

        {/* ── 右侧：商务风控驾驶舱 (Cockpit) ─────────────────────────── */}
        <div>
          <div className="stage4-cockpit-card">
            <div className="stage4-cockpit-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>对外总报价 (含税)</Text>
                <Tag size="small" color="arcoblue" style={{ fontSize: 10, height: 18, lineHeight: '18px' }}>
                  {quote.summary?.invoiceType ?? '专票'}
                </Tag>
              </div>
              <div className="stage4-cockpit-price">
                {money(breakdown.grandTotal)}
              </div>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">预估毛利率</Text>
              <Text bold style={{ color: profitRate != null && profitRate < DEFAULT_MIN_PROFIT_RATE ? 'rgb(var(--warning-6))' : 'rgb(var(--success-6))' }}>
                {profitRate != null ? `${(profitRate * 100).toFixed(1)}%` : '—'}
              </Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">项目总工期</Text>
              <Text bold>{evalSheet?.manualWorkDays || '-'} 工作日</Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">技术总人天</Text>
              <Text bold>{breakdown.totalLaborDays.toFixed(1)} 人天</Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">签约实体</Text>
              <Text bold style={{ maxWidth: 140, textAlign: 'right' }} ellipsis>
                {companyName}
              </Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">发票类型</Text>
              <Text bold>{quote.summary?.invoiceType ?? '增值税专票'}</Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">免费质保</Text>
              <Text bold>{quote.summary?.warrantyYears ?? 1} 年</Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">报价有效期</Text>
              <Text bold>{quote.basicInfo.quoteValidityDays || 30} 天</Text>
            </div>

            <Divider style={{ margin: '10px 0' }} />

            <div className="stage4-cockpit-item">
              <Text type="secondary">负责销售</Text>
              <Text bold>{quote.salesOwnerName || '未指定'}</Text>
            </div>

            <div className="stage4-cockpit-item">
              <Text type="secondary">客户名称</Text>
              <Text bold style={{ maxWidth: 140, textAlign: 'right' }} ellipsis>
                {quote.basicInfo.customerName || '未指定'}
              </Text>
            </div>

            {quote.sentAt && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--color-fill-1)', borderRadius: 4, fontSize: 11, color: 'var(--color-text-3)' }}>
                正式发送时间：{quote.sentAt}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 审批通过弹窗 ──────────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconCheckCircleFill style={{ color: 'rgb(var(--green-6))' }} />
            <span>审批通过确认</span>
          </div>
        }
        visible={approveVisible}
        onOk={handleApprove}
        onCancel={() => setApproveVisible(false)}
        okText="确认通过"
        okButtonProps={{ status: 'success' }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>请确认您对当前报价单的评审意见，通过后将推进会签流程：</Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_APPROVE_COMMENTS.map((c) => (
              <Tag
                key={c}
                size="small"
                color="gray"
                style={{ cursor: 'pointer' }}
                onClick={() => setApproveComment(c)}
              >
                + {c}
              </Tag>
            ))}
          </div>
          <Input.TextArea
            rows={3}
            placeholder="填写审批批复意见（默认已填快捷意见）"
            value={approveComment}
            onChange={setApproveComment}
          />
        </Space>
      </Modal>

      {/* ── 审批驳回弹窗 ──────────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconCloseCircleFill style={{ color: 'rgb(var(--red-6))' }} />
            <span>驳回报价确认</span>
          </div>
        }
        visible={rejectVisible}
        onOk={handleReject}
        onCancel={() => setRejectVisible(false)}
        okText="确认驳回"
        okButtonProps={{ status: 'danger' }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="warning" content="驳回后该报价将退回给销售重新编辑修改，会签节点状态将被全员重置为待审。" />
          <Text bold>请选择或输入驳回具体原因（必填）：</Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_REJECT_COMMENTS.map((c) => (
              <Tag
                key={c}
                size="small"
                color="red"
                style={{ cursor: 'pointer' }}
                onClick={() => setRejectComment(c)}
              >
                + {c}
              </Tag>
            ))}
          </div>
          <Input.TextArea
            rows={3}
            placeholder="请详细说明驳回理由，指导销售人员或技术人员进行修改..."
            value={rejectComment}
            onChange={setRejectComment}
          />
        </Space>
      </Modal>

      {/* ── 作废弹窗 ──────────────────────────────────────────────────── */}
      <Modal
        title="作废报价单"
        visible={voidVisible}
        onOk={handleVoid}
        onCancel={() => setVoidVisible(false)}
        okText="确认作废"
        okButtonProps={{ status: 'danger' }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="error" content="作废后该报价单将无法继续流转，历史版本保留不可删除。" />
          <Input.TextArea
            rows={3}
            placeholder="请填写作废原因（如客户放弃、选型变更等，必填）"
            value={voidReason}
            onChange={setVoidReason}
          />
        </Space>
      </Modal>

      {/* ── 印章管理员（黄海）用印双分支处理弹窗 ────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCheckCircleFill style={{ color: 'rgb(var(--green-6))' }} />
            <span>企业公章加盖与正式用印 · 印章管理员（黄海）</span>
          </div>
        }
        visible={stampModalVisible}
        onCancel={() => setStampModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stampBranch === 'electronic'
                ? '分支一：系统在公函中自动加盖防伪电子公章'
                : `分支二：已就绪 ${tempScans.length} 份线下盖章扫描件`}
            </Text>
            <Space>
              <Button onClick={() => setStampModalVisible(false)}>取消</Button>
              {stampBranch === 'electronic' ? (
                <Button
                  type="primary"
                  icon={<IconCheck />}
                  onClick={handleElectronicStamp}
                >
                  确认加盖电子公章
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<IconCheck />}
                  disabled={tempScans.length === 0}
                  onClick={handleScanStamp}
                >
                  确认归档扫描件并完成用印
                </Button>
              )}
            </Space>
          </div>
        }
        style={{ width: 640, top: 40 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert
            type="info"
            content="企业用印流程支持两套合规分支：线上系统自动加盖电子公章，或线下加盖实体红章后上传扫描件归档。"
          />

          <div>
            <Text bold style={{ display: 'block', marginBottom: 8 }}>请选择当前用印流转分支：</Text>
            <Radio.Group
              type="button"
              value={stampBranch}
              onChange={(v) => setStampBranch(v)}
              style={{ width: '100%', display: 'flex' }}
            >
              <Radio value="electronic" style={{ flex: 1, textAlign: 'center' }}>
                分支一：系统加盖电子防伪公章
              </Radio>
              <Radio value="scan" style={{ flex: 1, textAlign: 'center' }}>
                分支二：线下实体盖章·上传扫描件
              </Radio>
            </Radio.Group>
          </div>

          {stampBranch === 'electronic' ? (
            <Card size="small" style={{ background: 'var(--color-fill-1)', borderRadius: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">签约实体单位：</Text>
                  <Text bold>{companyName}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">印章类型：</Text>
                  <Tag size="small" color="red">北京中科官方企业公章</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">印章加盖位置：</Text>
                  <span>公函 Page 2 报价总览与 Page 6 授权代表签字栏</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">安全防伪存证：</Text>
                  <span>附带唯一 SEC 防伪校验码与加盖时间戳</span>
                </div>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card size="small" style={{ background: 'var(--color-fill-1)', borderRadius: 6 }}>
                <div style={{ fontSize: 12, lineHeight: '20px', color: 'var(--color-text-2)' }}>
                  <div>1. 请先点击上方 <b>「打印公函」</b> 下载未盖章纸质公函；</div>
                  <div>2. 在印章室完成物理实体公章加盖及经办人签字；</div>
                  <div>3. 使用高拍仪/扫描仪生成清晰扫描件（PDF/图片），并在下方上传归档。</div>
                </div>
              </Card>

              <div>
                <Text bold style={{ display: 'block', marginBottom: 6 }}>上传实体盖章件（支持多页/多图）：</Text>
                <ScanUpload
                  quoteStatus={quote.status}
                  scans={tempScans}
                  onScansChange={setTempScans}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── 全屏沉浸公函审阅 Modal ────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconFile />
            <span>正式报价公函全屏高清审阅 · {quote.basicInfo.projectName || quote.quoteNo}</span>
          </div>
        }
        visible={fullscreenPreview}
        onOk={() => setFullscreenPreview(false)}
        onCancel={() => setFullscreenPreview(false)}
        style={{ width: '92vw', maxWidth: 1080, top: 20 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isStamped ? '已加盖企业公章 · 落款签署有效' : '尚未盖章 · 审批完成后将加盖印章'}
            </Text>
            <Space>
              <Button icon={<IconPrinter />} onClick={handlePrint}>打印公函</Button>
              <Button type="primary" onClick={() => setFullscreenPreview(false)}>完成审阅并关闭</Button>
            </Space>
          </div>
        }
      >
        <div style={{ height: '78vh', background: '#525659', display: 'flex', justifyContent: 'center', padding: '16px 0', borderRadius: 6, overflow: 'auto' }}>
          <iframe
            srcDoc={sandboxedHtml}
            title="公函全屏审阅"
            style={{ width: 840, height: '100%', border: 'none', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.45)', borderRadius: 4 }}
          />
        </div>
      </Modal>

      {/* ── 扫描件与系统公文全屏宽屏对照 Modal ───────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSwap style={{ color: 'rgb(var(--arcoblue-6))' }} />
            <span>线下实体盖章扫描件 与 系统生成公函 全屏高清对照审阅</span>
            {quote.fileFlow?.scans && quote.fileFlow.scans.length > 1 && (
              <Tag size="small" color="purple">共 {quote.fileFlow.scans.length} 份扫描件</Tag>
            )}
          </div>
        }
        visible={dualScanModalVisible}
        onCancel={() => setDualScanModalVisible(false)}
        style={{ width: '96vw', maxWidth: 1720, top: 15 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              左侧：线下物理实体公章加盖扫描件 · 右侧：系统数据生成的标准客户版 A4 公文
            </Text>
            <Space>
              {quote.fileFlow?.scans?.[currentScanIndex]?.url && (
                <Button
                  icon={<IconEye />}
                  onClick={() => window.open(quote.fileFlow!.scans[currentScanIndex].url, '_blank')}
                >
                  在新窗口查看扫描原件
                </Button>
              )}
              <Button icon={<IconPrinter />} onClick={handlePrint}>打印系统公函</Button>
              <Button type="primary" onClick={() => setDualScanModalVisible(false)}>完成对照并关闭</Button>
            </Space>
          </div>
        }
      >
        {quote.fileFlow?.scans && quote.fileFlow.scans.length > 0 ? (
          <div className="stage4-dual-modal-body">
            {/* 左侧：线下盖章扫描件展示 */}
            <div className="stage4-dual-pane-col">
              <div className="stage4-dual-pane-header">
                <Space size={8}>
                  <span style={{ fontWeight: 600 }}>📄 线下实体公章盖章件</span>
                  {quote.fileFlow.scans.length > 1 && (
                    <Select
                      size="mini"
                      value={currentScanIndex}
                      onChange={(v) => setCurrentScanIndex(v as number)}
                      style={{ width: 160 }}
                    >
                      {quote.fileFlow.scans.map((s, idx) => (
                        <Select.Option key={s.id || idx} value={idx}>
                          第 {idx + 1} 页: {s.name}
                        </Select.Option>
                      ))}
                    </Select>
                  )}
                </Space>
                <Text type="secondary" style={{ fontSize: 11, color: '#94a3b8' }}>
                  {quote.fileFlow.scans[currentScanIndex]?.uploadedAt
                    ? `上传于 ${quote.fileFlow.scans[currentScanIndex].uploadedAt}`
                    : quote.fileFlow.scans[currentScanIndex]?.name}
                </Text>
              </div>
              <div className="stage4-dual-pane-content">
                <img
                  src={quote.fileFlow.scans[currentScanIndex]?.url || quote.fileFlow.scans[0]?.url}
                  alt="实体章扫描件"
                  className="stage4-dual-scan-img"
                />
              </div>
            </div>

            {/* 右侧：系统生成电子数据公文 */}
            <div className="stage4-dual-pane-col">
              <div className="stage4-dual-pane-header">
                <span style={{ fontWeight: 600 }}>🖥️ 系统生成标准公函（A4 · 共 6 页）</span>
                <Tag size="small" color="arcoblue">签约主体: {companyName}</Tag>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <iframe
                  srcDoc={sandboxedHtml}
                  title="全屏公函对照"
                  className="stage4-dual-iframe"
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Empty description="暂无盖章扫描件，请由印章管理员上传后查看对照" />
          </div>
        )}
      </Modal>
    </div>
  );
}
