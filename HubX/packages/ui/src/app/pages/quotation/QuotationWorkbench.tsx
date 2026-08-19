import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Card, Drawer, Input, Message, Modal, Result, Space, Steps, Tag, Typography } from '@arco-design/web-react';
import { IconLeft, IconHistory, IconUser } from '@arco-design/web-react/icon';
import { useQuotation } from './QuotationContext';
import { QuoteTimeline } from './components/QuoteTimeline';
import { Stage1FeatureList } from './stages/Stage1FeatureList';
import { Stage2EvalSheet } from './stages/Stage2EvalSheet';
import { Stage3WebAutomation } from './stages/Stage3WebAutomation';
import { Stage4Approval } from './stages/Stage4Approval';
import { canViewQuote } from './quoteAccess';
import {
  QUOTE_STAGE_NAMES,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from './types';
import type { Quote, QuoteStage } from './types';
import { deriveStage, getPendingOwner, getStageAccess, isTerminalStatus } from './quoteFlow';

const { Text, Title } = Typography;

const STAGES: QuoteStage[] = [1, 2, 3, 4];

/** 工作台底部流转操作栏：按当前状态与角色动态出按钮。实际动作调用在各 Stage 内部。 */
function ActionBar({ quote }: { quote: Quote }) {
  // 各阶段组件内部已包含自己的流转按钮，这里仅作占位说明
  return null;
}

export function QuotationWorkbench({ embedded, quoteId: propQuoteId, onClose }: { embedded?: boolean; quoteId?: string; onClose?: () => void } = {}) {
  const { quoteId: urlQuoteId } = useParams();
  const quoteId = propQuoteId ?? urlQuoteId;
  const navigate = useNavigate();
  const { getQuoteById, currentRole, currentViewer, isAdmin, markVoided, reassignOwner, loading } = useQuotation();
  const handleBack = onClose ?? (() => navigate('/quotation'));
  const quote = quoteId ? getQuoteById(quoteId) : undefined;
  const [viewedStage, setViewedStage] = useState<QuoteStage | null>(null);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [reassignVisible, setReassignVisible] = useState(false);
  const [reassignField, setReassignField] = useState<'salesOwnerName' | 'techEvaluatorName'>('salesOwnerName');
  const [reassignValue, setReassignValue] = useState('');

  const currentStage = useMemo(() => (quote ? deriveStage(quote.status) : 1), [quote]);
  const stage = viewedStage ?? currentStage;

  const handleVoid = () => {
    if (!quote) return;
    if (!voidReason.trim()) { Message.warning('请填写作废原因'); return; }
    markVoided(quote.id, voidReason.trim());
    setVoidVisible(false);
    setVoidReason('');
    Message.success('报价已废止');
    handleBack();
  };

  const handleReassign = async () => {
    if (!quote) return;
    if (!reassignValue.trim()) { Message.warning('请填写目标人员姓名'); return; }
    await reassignOwner(quote.id, reassignField, reassignValue.trim());
    setReassignVisible(false);
    setReassignValue('');
    Message.success(`已改指${reassignField === 'salesOwnerName' ? '销售' : '评估人'}为 ${reassignValue.trim()}`);
  };

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-3)' }}>报价单加载中…</div>;
  }

  if (!quote) {
    return (
      <Result
        status="404"
        title="报价单不存在"
        subTitle="该报价单可能已被删除或链接有误"
        extra={<Button type="primary" onClick={handleBack}>返回报价中心</Button>}
      />
    );
  }

  if (!canViewQuote(quote, currentViewer, isAdmin)) {
    return (
      <Result
        status="403"
        title="无权访问"
        subTitle="您没有权限查看此报价单"
        extra={<Button type="primary" onClick={handleBack}>返回报价中心</Button>}
      />
    );
  }

  const access = getStageAccess(quote, currentRole, stage);

  const renderStage = () => {
    const props = { quote, readonly: access !== 'editable' };
    switch (stage) {
      case 1:
        return <Stage1FeatureList {...props} />;
      case 2:
        return <Stage2EvalSheet {...props} />;
      case 3:
        return <Stage3WebAutomation {...props} />;
      case 4:
        return <Stage4Approval {...props} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* 顶部一行：返回 + 角色切换器 + 精简阶段导航 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button icon={<IconLeft />} onClick={handleBack}>返回列表</Button>
        <Button icon={<IconHistory />} onClick={() => setTimelineVisible(true)}>流转轨迹</Button>
        {!isTerminalStatus(quote.status) && (
          <Button onClick={() => setReassignVisible(true)}>改指</Button>
        )}
        <Button status="danger" onClick={() => setVoidVisible(true)}>作废</Button>
        <div style={{ flex: 1 }} />
      </div>

      {/* 精简阶段导航条 - 箭头形式 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12, overflowX: 'auto' }}>
        {STAGES.map((s, idx) => {
          const a = getStageAccess(quote, currentRole, s);
          const isCurrent = s === stage;
          const isClickable = a !== 'locked';
          const isCompleted = s < currentStage;
          const bgColor = isCurrent ? 'rgb(var(--arcoblue-6))' : isCompleted ? 'rgb(var(--green-5))' : 'var(--color-fill-2)';
          const textColor = isCurrent || isCompleted ? 'white' : 'var(--color-text-3)';
          const nextBgColor = idx < STAGES.length - 1
            ? (STAGES[idx + 1] === stage ? 'rgb(var(--arcoblue-6))' : STAGES[idx + 1] < currentStage ? 'rgb(var(--green-5))' : 'var(--color-fill-2)')
            : bgColor;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => {
                  if (!isClickable) { Message.warning('该阶段尚未到达'); return; }
                  setViewedStage(s);
                }}
                className="step-arrow-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px 10px 14px',
                  cursor: isClickable ? 'pointer' : 'default',
                  background: bgColor,
                  color: textColor,
                  opacity: a === 'locked' ? 0.45 : 1,
                  fontWeight: isCurrent ? 600 : 400,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  clipPath: idx === 0
                    ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                    : idx === STAGES.length - 1
                    ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)'
                    : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)',
                  marginRight: idx < STAGES.length - 1 ? -1 : 0,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: isCurrent || isCompleted ? 'rgba(255,255,255,0.3)' : 'var(--color-border-2)', fontSize: 11, fontWeight: 700 }}>
                  {s}
                </span>
                {QUOTE_STAGE_NAMES[s]}
              </div>
            </div>
          );
        })}
      </div>

      {/* 项目信息条 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Title heading={6} style={{ margin: 0 }}>{quote.basicInfo.projectName}</Title>
        <Tag color="arcoblue">{quote.version}</Tag>
        <Tag color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
        <Text type="secondary">编号 {quote.quoteNo}</Text>
        <Text type="secondary">客户 {quote.basicInfo.customerName || '-'}</Text>
        <Text type="secondary">待办人 {getPendingOwner(quote)}</Text>
        {quote.deadline && <Text type="warning">评估截止 {quote.deadline}</Text>}
      </div>

      {access === 'readonly' && stage < currentStage && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 6 }}>
          <Text type="secondary">当前为历史阶段回看，内容只读。如需修改请回到阶段 {currentStage}。</Text>
        </div>
      )}
      {access === 'readonly' && stage === currentStage && currentRole !== 'assistant' && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 6 }}>
          <Space>
            <IconUser style={{ color: 'var(--color-text-3)' }} />
            <Text type="secondary">当前阶段由其他角色处理，你为只读视角。请在顶栏切换当前身份以处理对应环节。</Text>
          </Space>
        </div>
      )}

      {renderStage()}

      <ActionBar quote={quote} />

      <Drawer
        title="流转轨迹"
        visible={timelineVisible}
        onCancel={() => setTimelineVisible(false)}
        footer={null}
        width={460}
      >
        <QuoteTimeline quote={quote} />
      </Drawer>

      <Modal
        title="作废报价单"
        visible={voidVisible}
        onOk={handleVoid}
        onCancel={() => setVoidVisible(false)}
        okText="确认作废"
        okButtonProps={{ status: 'danger' }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">作废后该报价单将不再参与后续流程，历史版本保留不可删除。</Text>
        </div>
        <Input.TextArea
          rows={3}
          placeholder="请填写作废原因（必填）"
          value={voidReason}
          onChange={setVoidReason}
        />
      </Modal>

      <Modal
        title="改指负责人"
        visible={reassignVisible}
        onOk={handleReassign}
        onCancel={() => { setReassignVisible(false); setReassignValue(''); }}
        okText="确认改指"
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">改指后原负责人将不再收到该报价单的待办提醒。</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text bold style={{ display: 'block', marginBottom: 4 }}>改指类型</Text>
            <Space>
              <Button
                size="small"
                type={reassignField === 'salesOwnerName' ? 'primary' : 'outline'}
                onClick={() => setReassignField('salesOwnerName')}
              >销售</Button>
              <Button
                size="small"
                type={reassignField === 'techEvaluatorName' ? 'primary' : 'outline'}
                onClick={() => setReassignField('techEvaluatorName')}
              >评估人</Button>
            </Space>
          </div>
          <div>
            <Text bold style={{ display: 'block', marginBottom: 4 }}>目标人员</Text>
            <Input
              placeholder="请输入姓名"
              value={reassignValue}
              onChange={setReassignValue}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
