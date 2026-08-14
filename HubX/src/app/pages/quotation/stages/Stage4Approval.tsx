import { useMemo, useState } from 'react';
import {
  Button, Card, Collapse, Descriptions, Input, Message, Space, Table, Tag, Timeline, Typography,
} from '@arco-design/web-react';
import {
  IconCheck, IconClose, IconStamp, IconSend, IconDownload, IconCheckCircle, IconCloseCircle,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import { computeAmountBreakdown } from '../quoteFlow';
import {
  QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, RISK_META,
} from '../types';
import type { Quote } from '../types';

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
  const { currentRole, decideAudit, stampQuote, markSent, markDeal, markVoided } = useQuotation();
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const auditor = ROLE_TO_AUDITOR[currentRole] ?? null;
  const isAuditor = Boolean(auditor);
  const isStamper = currentRole === 'assistant';
  const isSales = currentRole === 'sales';
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);

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

  const handleDeal = () => {
    markDeal(quote.id);
    Message.success('已标记客户成交');
  };

  const handleVoid = () => {
    if (!voidReason.trim()) { Message.warning('请填写作废原因'); return; }
    markVoided(quote.id, voidReason.trim());
    setVoidVisible(false);
    setVoidReason('');
    Message.success('报价已作废');
  };

  const auditColor = (s: string) => (s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'gray');
  const auditLabel = (s: string) => (s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已驳回' : '待审批');

  return (
    <Card title={<Title heading={6} style={{ margin: 0 }}>工作台四 · 管理层审批与盖章</Title>}>
      <Space style={{ marginBottom: 12 }}>
        <Text type="secondary">当前状态</Text>
        <Tag color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
        <Text type="secondary">总报价 <Text bold style={{ color: 'rgb(var(--red-6))' }}>{money(breakdown.grandTotal)}</Text></Text>
      </Space>

      {/* 穿透式四层明细 */}
      <Collapse defaultActiveKey={['summary']} style={{ marginBottom: 16 }}>
        <Collapse.Item header="第一层 · 报价汇总" name="summary">
          <Descriptions
            column={2}
            data={[
              { label: '项目总报价', value: money(breakdown.grandTotal) },
              { label: '总人天', value: `${breakdown.totalLaborDays.toFixed(1)} 人天` },
              { label: '人力占比', value: `${(breakdown.ratios.labor * 100).toFixed(0)}%` },
              { label: '差旅驻场占比', value: `${(breakdown.ratios.travelOnsite * 100).toFixed(0)}%` },
              { label: '其他成本占比', value: `${(breakdown.ratios.other * 100).toFixed(0)}%` },
              { label: '约定工期', value: `${quote.evalSheet?.manualWorkDays ?? 0} 工作日` },
            ]}
          />
        </Collapse.Item>

        <Collapse.Item header="第二层 · 技术人天与增项" name="labor">
          <Text bold style={{ display: 'block', marginBottom: 8 }}>罗总核定技术工时</Text>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            data={quote.evalSheet?.evaluationUnits ?? []}
            columns={[
              { title: '模块/切片', dataIndex: 'groupName', width: 140, render: (v: string, r: { moduleName: string }) => v ?? r.moduleName },
              ...((quote.evalSheet?.activeRoles ?? []).map((r) => ({ title: r.name, dataIndex: r.key, width: 80, render: (v: number) => v ?? '-' }))),
              { title: '小计', dataIndex: 'totalDays', width: 70, render: (v: number) => v?.toFixed(1) },
              { title: '风险', dataIndex: 'riskLevel', width: 60, render: (l: keyof typeof RISK_META) => <Tag color={RISK_META[l].color} size="small">{RISK_META[l].text}</Tag> },
            ]}
          />
          <Text bold style={{ display: 'block', margin: '12px 0 8px' }}>销售增项</Text>
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
        </Collapse.Item>

        <Collapse.Item header="第三层 · 功能需求清单" name="features">
          {quote.featureList.map((m) => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <Text bold>{m.name}</Text>
              {m.subFeatures.map((f) => (
                <div key={f.id} style={{ padding: '6px 0 6px 12px', borderBottom: '1px dashed var(--color-border-2)' }}>
                  <Text>{f.name}</Text>
                  <div style={{ color: 'var(--color-text-3)', fontSize: 13, marginTop: 2 }}>{f.description}</div>
                </div>
              ))}
            </div>
          ))}
        </Collapse.Item>

        <Collapse.Item header="第四层 · 商务与外部成本" name="cost">
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            data={quote.otherCosts}
            columns={[
              { title: '成本项', dataIndex: 'name', width: 200 },
              { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
              { title: '说明', dataIndex: 'note', render: (v: string) => v || '-' },
            ]}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">出差：{quote.travelOnsite.enableTravel ? money(quote.travelOnsite.travelSubtotal) : '未开启'} · 驻场：{quote.travelOnsite.enableOnsite ? money(quote.travelOnsite.onsiteSubtotal) : '未开启'}</Text>
          </div>
        </Collapse.Item>
      </Collapse>

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

      {/* 操作区：按当前角色与状态动态出按钮 */}
      {!readonly && isAuditor && quote.status === 'auditing' && (
        <Space>
          <Button type="primary" icon={<IconCheck />} onClick={handleApprove}>同意并通过</Button>
          <Button status="danger" icon={<IconClose />} onClick={() => setRejectVisible(!rejectVisible)}>驳回报价</Button>
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
        </Space>
      )}

      {!readonly && isSales && quote.status === 'sent' && (
        <Space>
          <Button type="primary" status="success" icon={<IconCheckCircle />} onClick={handleDeal}>客户已成交</Button>
          <Button status="danger" icon={<IconCloseCircle />} onClick={() => setVoidVisible(true)}>客户放弃，作废</Button>
        </Space>
      )}

      {quote.status === 'sent' && quote.sentAt && (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">正式发送于 {quote.sentAt}，报价有效期至 {calcExpiry(quote.sentAt, quote.basicInfo.quoteValidityDays)}</Text>
        </div>
      )}

      {(quote.status === 'deal' || quote.status === 'voided') && (
        <AlertLike text={quote.status === 'deal' ? '该报价已成交，可据此创建合同。' : '该报价已作废，历史版本保留不可删除。'} />
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
  // sentAt 形如 '2026-08-14 16:10'
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
