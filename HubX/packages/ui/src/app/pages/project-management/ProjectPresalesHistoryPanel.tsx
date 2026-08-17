// 项目详情「售前历程」Tab：把签约前的线索信息、跟进、报价、合同聚合成只读时间线，
// 对应销售域重构五段衔接第 5 条「售前交接包随确认带进项目」。只增不删：本 Tab 不提供任何删改操作。

import { useMemo } from 'react';
import { Card, Descriptions, Empty, Space, Tag, Timeline, Typography } from '@arco-design/web-react';
import type { Contract } from '../contracts/types';
import { getLeadDetailProfile } from '../leads/leadDetailProfiles';
import {
  buildPresalesTimeline,
  type PresalesEvent,
  type PresalesFollowRecord,
} from '@/app/business-case';

const { Text } = Typography;

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  approving: '审批中',
  pending_mail: '待寄出',
  pending_return: '待回寄',
  archived: '已归档',
  voided: '已作废',
};

const EVENT_TYPE_META: Record<PresalesEvent['type'], { label: string; color: string }> = {
  lead: { label: '线索', color: 'gray' },
  follow: { label: '跟进', color: 'arcoblue' },
  quote: { label: '报价', color: 'orange' },
  contract: { label: '合同', color: 'green' },
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

function displayValue(value: string | number | null | undefined) {
  if (value == null || String(value).trim() === '') return '-';
  return value;
}

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
    return <Empty description="当前项目未关联线索，暂无售前历程" />;
  }

  const { leadInfo } = leadProfile;
  const phoneOrWechat = Array.from(new Set(
    [leadInfo.phone, leadInfo.wechat].filter((value) => value?.trim()),
  )).join(' / ') || '-';

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="medium">
      <Card bordered={false} title="售前交接包" size="small">
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          签约前沉淀的线索信息与售前资料，随项目确认自动带入，仅供查阅。
        </Text>
        <Descriptions
          column={2}
          labelStyle={{ width: 96 }}
          data={[
            { label: '线索名称', value: displayValue(leadInfo.name) },
            { label: '客户称呼', value: displayValue(leadInfo.customerTitle || leadInfo.customer) },
            { label: '联系电话/微信', value: phoneOrWechat },
            { label: '线索来源', value: displayValue(leadInfo.source) },
            { label: '归属销售', value: displayValue(leadInfo.owner) },
            { label: '客资成本', value: displayValue(leadInfo.customerCost) },
            { label: '售前群名称', value: displayValue(leadInfo.presalesGroupName) },
            {
              label: '原型图链接',
              value: leadInfo.prototypeLink ? (
                <a href={leadInfo.prototypeLink} target="_blank" rel="noreferrer">{leadInfo.prototypeLink}</a>
              ) : '-',
            },
            { label: '初始信息及需求', value: displayValue(leadInfo.requirement || leadInfo.initialRequirement), span: 2 },
          ]}
        />
      </Card>

      <Card bordered={false} title="售前历程" size="small">
        {events.length === 0 ? (
          <Empty description="暂无售前历程记录" />
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
                      <Tag color={meta.color} size="small">{meta.label}</Tag>
                      <strong style={{ color: 'var(--color-text-1)' }}>{event.title}</strong>
                      {event.status ? <Tag size="small">{event.status}</Tag> : null}
                    </Space>
                  </div>
                  {event.detail ? (
                    <div style={{ color: 'var(--color-text-2)', lineHeight: '20px', marginBottom: 4 }}>
                      {event.detail}
                    </div>
                  ) : null}
                  <Text type="secondary" style={{ fontSize: 12 }}>{event.time}</Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Card>
    </Space>
  );
}
