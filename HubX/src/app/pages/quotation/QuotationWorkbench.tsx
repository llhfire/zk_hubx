import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Card, Drawer, Message, Result, Space, Steps, Tag, Typography } from '@arco-design/web-react';
import { IconLeft, IconHistory, IconUser } from '@arco-design/web-react/icon';
import { useQuotation } from './QuotationContext';
import { RoleSwitcher } from './components/RoleSwitcher';
import { QuoteTimeline } from './components/QuoteTimeline';
import { Stage1FeatureList } from './stages/Stage1FeatureList';
import { Stage2EvalSheet } from './stages/Stage2EvalSheet';
import { Stage3QuoteWizard } from './stages/Stage3QuoteWizard';
import { Stage3WebAutomation } from './stages/Stage3WebAutomation';
import { Stage4Approval } from './stages/Stage4Approval';
import {
  QUOTE_STAGE_NAMES,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from './types';
import type { Quote, QuoteStage } from './types';
import { deriveStage, getPendingOwner, getStageAccess } from './quoteFlow';

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
  const { getQuoteById, currentRole } = useQuotation();
  const handleBack = onClose ?? (() => navigate('/quotation'));
  const quote = quoteId ? getQuoteById(quoteId) : undefined;
  const [viewedStage, setViewedStage] = useState<QuoteStage | null>(null);
  const [timelineVisible, setTimelineVisible] = useState(false);

  const currentStage = useMemo(() => (quote ? deriveStage(quote.status) : 1), [quote]);
  const stage = viewedStage ?? currentStage;

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
        <div style={{ flex: 1 }} />
        <RoleSwitcher />
      </div>

      {/* 精简阶段导航条 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12, background: 'var(--color-fill-1)', borderRadius: 6, padding: '0 4px', overflow: 'auto' }}>
        {STAGES.map((s, idx) => {
          const a = getStageAccess(quote, currentRole, s);
          const isCurrent = s === stage;
          const isClickable = a !== 'locked';
          return (
            <div
              key={s}
              onClick={() => {
                if (!isClickable) { Message.warning('该阶段尚未到达'); return; }
                setViewedStage(s);
              }}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 12px',
                cursor: isClickable ? 'pointer' : 'default',
                borderBottom: isCurrent ? '2px solid rgb(var(--arcoblue-6))' : '2px solid transparent',
                background: isCurrent ? 'var(--color-bg-2)' : 'transparent',
                borderRadius: idx === 0 ? '6px 0 0 0' : idx === STAGES.length - 1 ? '0 6px 0 0' : 0,
                opacity: a === 'locked' ? 0.45 : 1,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'rgb(var(--arcoblue-6))' : 'var(--color-text-1)' }}>
                {s}. {QUOTE_STAGE_NAMES[s]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                {a === 'editable' ? '可编辑' : a === 'locked' ? '未到达' : '只读'}
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
            <Text type="secondary">当前阶段由其他角色处理，你为只读视角。可切换上方角色查看不同操作权限。</Text>
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
    </div>
  );
}
