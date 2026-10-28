// 项目详情「售前」Tab：仅保留签约前的跟进、报价与合同时间线。

import { useMemo } from 'react';
import { Space, Timeline, Typography } from '@/design-system';
import { DateText, EmptyState, SectionCard, StatusTag, resolveStatus, type StatusMap } from '@/design-system';
import type { Contract } from '../../sales/contracts/types';
import { getLeadDetailProfile } from '../../sales/leads/leadDetailProfiles';
import {
  buildPresalesTimeline,
  type PresalesEvent,
  type PresalesFollowRecord,
} from '../../../business-case';

const { Text } = Typography;

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  approving: '审批中',
  pending_mail: '待寄出',
  pending_return: '待回寄',
  archived: '已归档',
  voided: '已作废',
};

const EVENT_TYPE_META: StatusMap<PresalesEvent['type']> = {
  lead: { label: '线索', tone: 'neutral' },
  follow: { label: '跟进', tone: 'info' },
  quote: { label: '报价', tone: 'warning' },
  contract: { label: '合同', tone: 'success' },
};

/** 售前跟进 mock：与线索详情跟进侧栏同一套演示数据口径 */
const PRESALES_FOLLOW_MOCK: PresalesFollowRecord[] = [
  {
    id: 'presales-follow-1',
    time: '2026-04-09 17:42',
    method: '电话',
    content: '初步接定，客户表达明确开发意向。',
    operator: '张三',
  },
  {
    id: 'presales-follow-2',
    time: '2026-04-07 15:10',
    method: '电话',
    content: '未接通，改约下次沟通。',
    operator: '张三',
  },
  {
    id: 'presales-follow-3',
    time: '2026-04-05 10:00',
    method: '认领',
    content: '从公海认领线索，开始跟进。',
    operator: '张三',
  },
];

export function ProjectPresalesHistoryPanel({ leadId, contract }: { leadId?: string; contract?: Contract }) {
  const leadProfile = useMemo(() => getLeadDetailProfile(leadId, ''), [leadId]);

  const events = useMemo(() => {
    if (!leadId) return [];
    return buildPresalesTimeline({
      lead: {
        id: leadId,
        name: leadProfile.leadInfo.name,
        createTime: leadProfile.leadInfo.createTime,
        requirement: leadProfile.leadInfo.initialRequirement || leadProfile.leadInfo.requirement,
      },
      followUps: PRESALES_FOLLOW_MOCK,
      quotes: leadProfile.quotationHistory.map((quote) => ({
        id: quote.id,
        name: quote.name,
        createTime: quote.createTime,
        amount: quote.amount,
        status: quote.status,
        flowStatus: quote.flowStatus,
      })),
      contracts: contract
        ? [{
            id: contract.id,
            contractNo: contract.contractNo,
            createTime: contract.createdAt,
            status: CONTRACT_STATUS_LABELS[contract.status] ?? contract.status,
          }]
        : [],
    });
  }, [contract, leadId, leadProfile]);

  if (!leadId) {
    return <EmptyState description="当前项目未关联线索，暂无售前历程" />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="medium">
      <SectionCard title="售前历程">
        {events.length === 0 ? (
          <EmptyState description="暂无售前历程记录" />
        ) : (
          <Timeline>
            {events.map((event, index) => {
              const meta = EVENT_TYPE_META[event.type];
              return (
                <Timeline.Item
                  key={event.id}
                  dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}
                >
                  <div style={{ marginBottom: 4 }}>
                    <Space size={8} wrap>
                      <StatusTag meta={resolveStatus(EVENT_TYPE_META, event.type)} />
                      <strong style={{ color: 'var(--color-text-1)' }}>{event.title}</strong>
                      {event.status ? <StatusTag>{event.status}</StatusTag> : null}
                    </Space>
                  </div>
                  {event.detail ? (
                    <div style={{ color: 'var(--color-text-2)', lineHeight: '20px', marginBottom: 4 }}>
                      {event.detail}
                    </div>
                  ) : null}
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}><DateText value={event.time} mode="datetime" /></Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </SectionCard>
    </Space>
  );
}
