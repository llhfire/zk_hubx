import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button, Card, Empty, Input, Message, Space, Table, Tag, Timeline, Typography,
} from '@arco-design/web-react';
import {
  IconCheck, IconClose, IconStamp, IconSend, IconDownload, IconCheckCircle, IconCloseCircle, IconApps,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import { computeAmountBreakdown, sumEvalDaysByRole } from '../quoteFlow';
import { PLATFORM_OPTIONS, QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, RISK_META } from '../types';
import type { EvalRole } from '../types';
import { buildDealQuotePrefill } from '../../contracts/dealQuotePrefill';

const { Text, Title } = Typography;

function money(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

/** 当前视角角色对应的会签人；非会签角色返回 null */
const ROLE_TO_AUDITOR: Record<string, string | null> = {
  sales_manager: '黄奕',
  tech: '罗总',
  decision: '闵总',
  sales: null,
  pm: null,
  assistant: null,
};

export function Stage4Approval({ quote, readonly }: StageProps) {
  const { currentRole, decideAudit, stampQuote, markSent, markConfirmed, markVoided, withdrawSent, returnToStamp, returnToEditFeatures } = useQuotation();
  const navigate = useNavigate();
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const auditor = ROLE_TO_AUDITOR[currentRole] ?? null;
  const isAuditor = Boolean(auditor);
  const isStamper = currentRole === 'assistant';
  const isSales = currentRole === 'sales';
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);
  const roleTotals = useMemo(() => sumEvalDaysByRole(quote.evalSheet), [quote.evalSheet]);
  const endpointConfigs = quote.endpointConfigs || [];
  const featureList = quote.featureList;
  const evalSheet = quote.evalSheet;
  const travelOnsite = quote.travelOnsite;

  const handleApprove = () => {
    if (!auditor) return;
    decideAudit(quote.id, auditor, 'approve', '同意');
    Message.success('已审批通过');
  };

  const handleReject = () => {
    if (!auditor) return;
    if (!rejectComment.trim()) { Message.warning('驳回意见为必填项'); return; }
    decideAudit(quote.id, auditor, 'reject', rejectComment.trim());
    setRejectVisible(false);
    setRejectComment('');
    Message.success('已驳回，退回销售修改，三人会签将重审');
  };

  const handleStamp = () => {
    stampQuote(quote.id);
    Message.success('已加盖公章，可下载正式 PDF 报价单');
  };

  const handleSend = () => {
    markSent(quote.id);
    Message.success('已登记发送客户，报价有效期自今日起算');
  };

  const handleConfirmed = () => {
    markConfirmed(quote.id);
    Message.success('已确认成交，可在下方生成主合同');
  };

  // 阶段 3：成交报价 -> 合同向导（携带真实报价预填，创建成功后由向导回写关联）
  const handleGenerateContract = () => {
    const query = '?leadId=' + encodeURIComponent(quote.leadId) + '&quoteId=' + encodeURIComponent(quote.id);
    navigate('/contracts/new' + query, {
      state: { dealQuotePrefill: buildDealQuotePrefill(quote) },
    });
  };

  const handleVoid = () => {
    if (!voidReason.trim()) { Message.warning('请填写作废原因'); return; }
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

  const auditColor = (s: string) => (s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'gray');
  const auditLabel = (s: string) => (s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已驳回' : '待审批');

  // 计算总人天和总金额
  const grandTotalDays = useMemo(() => {
    if (!evalSheet) return 0;
    return evalSheet.evaluationUnits.reduce((s, u) => s + u.totalDays, 0);
  }, [evalSheet]);

  // PDF 下载功能
  const printRef = useRef<HTMLDivElement>(null);
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${quote.quoteNo}_报价单.pdf`);
      Message.success('报价单已下载');
    } catch {
      Message.error('下载失败，请重试');
    }
  };

  return (
    <Card title={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title heading={6} style={{ margin: 0 }}>工作台四 · 管理层审批与盖章</Title>
        {(quote.status === 'stamped' || quote.status === 'sent' || quote.status === 'confirmed') && (
          <Button size="small" icon={<IconDownload />} onClick={handleDownloadPDF}>下载报价单 PDF</Button>
        )}
      </div>
    }>
      {/* 报价单正文（用于 PDF 下载） */}
      <div ref={printRef} style={{ background: 'white', padding: 8 }}>
        {/* 报价单标题 */}
        <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: '2px solid var(--color-border-2)', marginBottom: 16 }}>
          <Title heading={4} style={{ margin: 0, color: 'var(--color-text-1)' }}>软件项目报价单</Title>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>
            {quote.quoteNo} · {quote.version}
          </div>
          {quote.status === 'stamped' && (
            <div style={{ position: 'absolute', right: 24, top: 24, transform: 'rotate(-20deg)', border: '3px solid rgb(var(--red-6))', color: 'rgb(var(--red-6))', borderRadius: 6, padding: '4px 16px', fontSize: 18, fontWeight: 700, opacity: 0.7 }}>
              中科集团公章
            </div>
          )}
        </div>

      <Space style={{ marginBottom: 12 }}>
        <Text type="secondary">当前状态</Text>
        <Tag color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
        <Text type="secondary">总报价 <Text bold style={{ color: 'rgb(var(--red-6))' }}>{money(breakdown.grandTotal)}</Text></Text>
      </Space>

      {/* 功能清单与工时评估（从工作台三带入） */}
      <Card size="small" title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconApps />
            <span>功能清单与工时评估</span>
          </div>
          {evalSheet && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              总周期 <Text bold>{evalSheet.manualWorkDays || '-'}</Text> 工作日
            </Text>
          )}
        </div>
      } style={{ marginBottom: 16 }}>
        {evalSheet && endpointConfigs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-fill-1)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 100, whiteSpace: 'nowrap' }}>端</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 100, whiteSpace: 'nowrap' }}>模块</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 120, whiteSpace: 'nowrap' }}>子功能</th>
                  {evalSheet.activeRoles.map((r: EvalRole) => (
                    <th key={r.key} style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 70, whiteSpace: 'nowrap' }}>{r.name}</th>
                  ))}
                  <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 60, whiteSpace: 'nowrap' }}>人天</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 120, whiteSpace: 'nowrap' }}>风险</th>
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
                                  <Tag key={pid} size="small" color="arcoblue" style={{ width: 'fit-content', fontSize: 10 }}>{PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid}</Tag>
                                ))}
                              </div>
                            </td>
                          )}
                          {fIdx === 0 && (
                            <td rowSpan={subs.length} style={{ padding: '6px 10px', verticalAlign: 'top', fontWeight: 500, borderRight: '1px solid var(--color-border-2)' }}>{m.name}</td>
                          )}
                          <td style={{ padding: '6px 10px', borderRight: '1px solid var(--color-border-2)' }}>{f.name}</td>
                          {evalSheet.activeRoles.map((r: EvalRole) => (
                            <td key={r.key} style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-2)', fontFamily: 'monospace' }}>
                              {unit && (unit.manualWorkload[r.key] ?? 0) > 0 ? (unit.manualWorkload[r.key] ?? 0).toFixed(1) : '-'}
                            </td>
                          ))}
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-2)', fontFamily: 'monospace', fontWeight: 500 }}>
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

      {/* 销售增项岗位 */}
      {quote.salesAddedRoles.length > 0 && (
        <Card size="small" title="销售增项岗位" style={{ marginBottom: 16 }}>
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

      {/* 出差与驻场 */}
      <Card size="small" title="出差与驻场" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text bold>出差</Text>
            {travelOnsite.enableTravel && travelOnsite.travelDetails.length > 0 ? (
              <Table size="small" rowKey="location" pagination={false} data={travelOnsite.travelDetails}
                columns={[
                  { title: '地点', dataIndex: 'location', width: 80 },
                  { title: '人数', dataIndex: 'headcount', width: 50 },
                  { title: '天数', dataIndex: 'days', width: 50 },
                ]}
              />
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>未开启</Text>
            )}
            {travelOnsite.enableTravel && <Text type="secondary" style={{ fontSize: 12 }}>差旅合计：{money(travelOnsite.travelSubtotal)}</Text>}
          </div>
          <div>
            <Text bold>驻场</Text>
            {travelOnsite.enableOnsite && travelOnsite.onsiteDetails.length > 0 ? (
              <Table size="small" rowKey="location" pagination={false} data={travelOnsite.onsiteDetails}
                columns={[
                  { title: '地点', dataIndex: 'location', width: 80 },
                  { title: '人数', dataIndex: 'headcount', width: 50 },
                  { title: '天数', dataIndex: 'days', width: 50 },
                ]}
              />
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>未开启</Text>
            )}
            {travelOnsite.enableOnsite && <Text type="secondary" style={{ fontSize: 12 }}>驻场合计：{money(travelOnsite.onsiteSubtotal)}</Text>}
          </div>
        </div>
      </Card>

      {/* 其他成本 */}
      {quote.otherCosts.length > 0 && (
        <Card size="small" title="其他成本" style={{ marginBottom: 16 }}>
          <Table size="small" rowKey="id" pagination={false} data={quote.otherCosts}
            columns={[
              { title: '费用项', dataIndex: 'name', width: 200 },
              { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
              { title: '说明', dataIndex: 'note', render: (v: string) => v || '-' },
            ]}
          />
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <Text>其他合计：</Text>
            <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(quote.otherCosts.reduce((s, c) => s + c.amount, 0))}</Text>
          </div>
        </Card>
      )}

      {/* 报价汇总 */}
      <Card size="small" title="报价汇总" style={{ marginBottom: 16 }}>
        {/* 项目综述 */}
        <div style={{ marginBottom: 16 }}>
          <Text bold style={{ display: 'block', marginBottom: 8 }}>项目综述</Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>项目名称</Text>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{quote.basicInfo.projectName || '-'}</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>项目工期</Text>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{evalSheet?.manualWorkDays || '-'} 工作日</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>开发人天</Text>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{grandTotalDays.toFixed(1)} 人天</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, var(--color-primary-6), #4F46E5)', borderRadius: 8, color: 'white' }}>
              <Text type="secondary" style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>项目总价</Text>
              <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4, fontFamily: 'monospace' }}>{money(breakdown.grandTotal)}</div>
            </div>
          </div>
        </div>

        {/* 费用明细 */}
        <Text bold style={{ display: 'block', marginBottom: 8 }}>费用明细</Text>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--color-fill-1)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500 }}>费用项</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 120 }}>金额</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500 }}>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>技术人力成本</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.techLaborCost)}</td>
              <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{evalSheet?.activeRoles.length || 0} 个岗位 × {breakdown.techDays.toFixed(1)} 人天</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>销售增项成本</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.addedCost)}</td>
              <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{quote.salesAddedRoles.length > 0 ? quote.salesAddedRoles.map((r) => r.roleName || '未命名').join('、') : '无增项'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>差旅费用</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.travelSubtotal)}</td>
              <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{travelOnsite.enableTravel ? `${travelOnsite.travelDetails.length} 个出差地点` : '未开启'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>驻场费用</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.onsiteSubtotal)}</td>
              <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{travelOnsite.enableOnsite ? `${travelOnsite.onsiteDetails.length} 个驻场地点` : '未开启'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>其他成本</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.otherCostSubtotal)}</td>
              <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{quote.otherCosts.length > 0 ? quote.otherCosts.map((c) => c.name || '未命名').join('、') : '无其他费用'}</td>
            </tr>
            <tr style={{ background: 'var(--color-fill-1)', fontWeight: 600 }}>
              <td style={{ padding: '10px 12px', borderTop: '2px solid var(--color-border-2)' }}>合计</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', borderTop: '2px solid var(--color-border-2)', fontFamily: 'monospace', fontSize: 16, color: 'var(--color-danger-6)' }}>{money(breakdown.grandTotal)}</td>
              <td style={{ padding: '10px 12px', borderTop: '2px solid var(--color-border-2)' }} />
            </tr>
          </tbody>
        </table>
      </Card>
      </div>

      {/* 三人并行会签 */}
      <Text bold style={{ display: 'block', marginBottom: 8 }}>三人并行会签</Text>
      <Timeline style={{ marginBottom: 16 }}>
        {quote.auditNodes.map((node) => (
          <Timeline.Item
            key={node.auditorId}
            dotColor={node.status === 'APPROVED' ? 'rgb(var(--green-6))' : node.status === 'REJECTED' ? 'rgb(var(--red-6))' : 'rgb(var(--gray-5))'}
          >
            <Space>
              <Text bold>{node.auditorName}（{node.role}）</Text>
              <Tag color={auditColor(node.status)}>{auditLabel(node.status)}</Tag>
              {node.auditTime && <Text type="secondary" style={{ fontSize: 12 }}>{node.auditTime}</Text>}
            </Space>
            {node.comment && <div style={{ marginTop: 2 }}><Text type="secondary">{node.comment}</Text></div>}
          </Timeline.Item>
        ))}
      </Timeline>

      {/* 盖章节点 */}
      <Text bold style={{ display: 'block', marginBottom: 8 }}>盖章节点（{quote.stampNode.stamperName}）</Text>
      <Space style={{ marginBottom: 16 }}>
        <Tag color={quote.stampNode.status === 'COMPLETED' ? 'green' : quote.stampNode.status === 'PENDING_STAMP' ? 'orange' : 'gray'}>
          {quote.stampNode.status === 'COMPLETED' ? '已盖章' : quote.stampNode.status === 'PENDING_STAMP' ? '待盖章' : '待激活（需三人全通）'}
        </Tag>
        {quote.stampNode.stampTime && <Text type="secondary" style={{ fontSize: 12 }}>{quote.stampNode.stampTime}</Text>}
      </Space>

      {/* 操作区 */}
      {!readonly && isAuditor && quote.status === 'auditing' && (
        <Space>
          <Button type="primary" icon={<IconCheck />} onClick={handleApprove}>同意并通过</Button>
          <Button status="danger" icon={<IconClose />} onClick={() => setRejectVisible(!rejectVisible)}>驳回报价</Button>
        </Space>
      )}

      {!readonly && isSales && quote.status === 'rejected' && (
        <Space>
          <Button onClick={handleReturnToEditFeatures}>退回改清单</Button>
        </Space>
      )}

      {rejectVisible && (
        <div style={{ marginTop: 12, padding: 12, background: 'rgb(var(--red-1))', borderRadius: 6 }}>
          <Input.TextArea rows={2} placeholder="驳回意见（必填，将退回销售修改并全员重审）" value={rejectComment} onChange={setRejectComment} style={{ marginBottom: 8 }} />
          <Button type="primary" status="danger" onClick={handleReject}>确认驳回</Button>
        </div>
      )}

      {!readonly && isStamper && quote.status === 'pending_stamp' && (
        <Button type="primary" icon={<IconStamp />} onClick={handleStamp}>确认加盖公章</Button>
      )}

      {!readonly && isSales && quote.status === 'stamped' && (
        <Space>
          <Button type="primary" icon={<IconSend />} onClick={handleSend}>发送客户</Button>
          <Button icon={<IconDownload />} onClick={() => Message.info('下载正式 PDF 报价单（盖章版，占位）')}>下载盖章版 PDF</Button>
          {!quote.sentAt && <Button onClick={handleReturnToStamp}>退回盖章</Button>}
        </Space>
      )}

      {!readonly && isSales && quote.status === 'sent' && (
        <Space>
          <Button type="primary" status="success" icon={<IconCheckCircle />} onClick={handleConfirmed}>确认成交</Button>
          <Button status="danger" icon={<IconCloseCircle />} onClick={() => setVoidVisible(true)}>客户放弃，作废</Button>
          <Button onClick={handleWithdrawSent}>撤回发出</Button>
        </Space>
      )}

      {quote.status === 'sent' && quote.sentAt && (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">正式发送于 {quote.sentAt}，报价有效期至 {calcExpiry(quote.sentAt, quote.basicInfo.quoteValidityDays)}</Text>
        </div>
      )}

      {(quote.status === 'confirmed' || quote.status === 'voided') && (
        quote.status === 'confirmed' ? (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--color-fill-2)', borderRadius: 6 }}>
            <Space>
              <Text>该报价已确认。</Text>
              {quote.contractId ? (
                <Button type="primary" size="small" onClick={() => navigate('/contracts/' + quote.contractId)}>
                  查看主合同
                </Button>
              ) : (
                <Button type="primary" size="small" icon={<IconCheck />} onClick={handleGenerateContract}>
                  生成主合同
                </Button>
              )}
            </Space>
          </div>
        ) : (
          <AlertLike text="该报价已废止，历史版本保留不可删除。" />
        )
      )}

      {/* 驳回弹窗 */}
      {rejectVisible && null}

      {/* 作废弹窗 */}
      {voidVisible && (
        <div style={{ marginTop: 12, padding: 12, background: 'rgb(var(--red-1))', borderRadius: 6 }}>
          <Input.TextArea rows={2} placeholder="作废原因（必填）" value={voidReason} onChange={setVoidReason} style={{ marginBottom: 8 }} />
          <Button type="primary" status="danger" onClick={handleVoid}>确认作废</Button>
        </div>
      )}
    </Card>
  );
}

function calcExpiry(sentAt: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(sentAt);
  if (!m) return '-';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function AlertLike({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--color-fill-2)', borderRadius: 6, color: 'var(--color-text-2)' }}>
      {text}
    </div>
  );
}
