import { Empty, Timeline, Typography } from '@arco-design/web-react';
import { QUOTE_ACTION_LABELS } from '../types';
import type { Quote, QuoteTimelineEvent } from '../types';

const { Text } = Typography;

const DOT_COLOR: Partial<Record<QuoteTimelineEvent['action'], string>> = {
  raise_tech_issue: 'rgb(var(--red-6))',
  resolve_tech_issue: 'rgb(var(--green-6))',
  audit_reject: 'rgb(var(--red-6))',
  return_to_tech: 'rgb(var(--orange-6))',
  withdraw_audit: 'rgb(var(--orange-6))',
  mark_voided: 'rgb(var(--red-6))',
  stamp: 'rgb(var(--green-6))',
  mark_confirmed: 'rgb(var(--green-6))',
};

/** 流转轨迹：按 timeline 倒序展示，最新在顶，便于一眼看到当前卡点 */
export function QuoteTimeline({ quote }: { quote: Quote }) {
  const events = [...quote.timeline].reverse();
  if (events.length === 0) {
    return <Empty description="暂无流转记录" />;
  }
  return (
    <Timeline>
      {events.map((e) => (
        <Timeline.Item key={e.id} dotColor={DOT_COLOR[e.action]}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text bold>{QUOTE_ACTION_LABELS[e.action]}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{e.actorName}（{e.actorRole}）</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{e.time}</Text>
          </div>
          {e.note && (
            <div style={{ marginTop: 4, color: 'var(--color-text-2)', fontSize: 13, lineHeight: 1.5 }}>{e.note}</div>
          )}
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
