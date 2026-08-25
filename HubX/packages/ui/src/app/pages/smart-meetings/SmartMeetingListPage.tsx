/**
 * 智能会议纪要列表页
 *
 * 设计规约见 smart-meetings-ui-design.md §3：
 * - MonthStatsBar：本月沉淀会议统计
 * - FilterBar：搜索 + 状态筛选
 * - MinuteList：纪要卡片列表
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, Tag, Button, Input, Select, Badge, Space, Typography, Empty, Spin } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconCalendar, IconUser, IconFile } from '@arco-design/web-react/icon';
import { useSmartMeeting } from './SmartMeetingContext';
import { summarizeMinutes, filterMinutes, monthDeposited, type MinuteListQuery } from './boardQueries';
import type { MinuteStatus } from './types';

const { Title, Text } = Typography;
const Option = Select.Option;

const STATUS_LABEL: Record<MinuteStatus, string> = {
  draft: '草稿',
  pending_review: '待确认',
  confirmed: '已确认',
  archived: '已归档',
};

const STATUS_COLOR: Record<MinuteStatus, string> = {
  draft: 'gray',
  pending_review: 'orange',
  confirmed: 'blue',
  archived: 'default',
};

/** 默认查看者（α 模拟登录：管理员视角） */
const DEFAULT_VIEWER = {
  userId: 'user_zhang',
  isAdmin: true,
  canViewBiz: () => true,
};

export function SmartMeetingListPage() {
  const navigate = useNavigate();
  const { minutes, loading } = useSmartMeeting();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<MinuteStatus[]>([]);

  // 本月 YYYY-MM
  const currentMonth = new Date().toISOString().slice(0, 7);

  // 月度统计
  const stats = useMemo(() => monthDeposited(minutes, currentMonth), [minutes, currentMonth]);

  // 列表摘要
  const summaries = useMemo(
    () => summarizeMinutes(minutes, [], DEFAULT_VIEWER),
    [minutes],
  );

  // 筛选
  const query: MinuteListQuery = useMemo(
    () => ({
      keyword: keyword || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
    }),
    [keyword, statusFilter],
  );

  const filtered = useMemo(() => filterMinutes(summaries, query), [summaries, query]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Spin size={40} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title heading={4} style={{ margin: 0 }}>智能会议</Title>
        <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/smart-meetings/new')}>
          新建纪要
        </Button>
      </div>

      {/* MonthStatsBar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Text style={{ fontWeight: 500 }}>
            {currentMonth.replace('-', '年')}月沉淀会议{' '}
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-500)' }}>
              {stats.pending_review + stats.confirmed + stats.archived}
            </span>{' '}
            篇
          </Text>
          <Space size={16}>
            <Badge status="warning" text={`待确认 ${stats.pending_review}`} />
            <Badge status="processing" text={`已确认 ${stats.confirmed}`} />
            <Badge status="default" text={`已归档 ${stats.archived}`} />
          </Space>
        </div>
      </Card>

      {/* FilterBar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          prefix={<IconSearch style={{ color: 'var(--grey-400)' }} />}
          placeholder="搜索会议主题、决议关键词、待办内容..."
          value={keyword}
          onChange={setKeyword}
          style={{ flex: 1 }}
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ minWidth: 180 }}
          maxTagCount={2}
          allowClear
        >
          {(Object.keys(STATUS_LABEL) as MinuteStatus[]).map((s) => (
            <Option key={s} value={s}>
              <Tag color={STATUS_COLOR[s]} size="small" style={{ marginRight: 4 }}>
                {STATUS_LABEL[s]}
              </Tag>
            </Option>
          ))}
        </Select>
      </div>

      {/* MinuteList */}
      {filtered.length === 0 ? (
        <Card>
          <Empty description="暂无纪要" />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((summary) => (
            <Card
              key={summary.id}
              size="small"
              hoverable
              onClick={() => navigate(`/smart-meetings/${summary.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 标题行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Tag color={STATUS_COLOR[summary.status]} size="small">
                      {STATUS_LABEL[summary.status]}
                    </Tag>
                    <Text style={{ fontWeight: 500, fontSize: 15 }}>{summary.title}</Text>
                  </div>

                  {/* 信息行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--grey-500)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconCalendar style={{ fontSize: 12 }} />
                      {formatMeetingTime(summary.meetingTime)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconUser style={{ fontSize: 12 }} />
                      {summary.attendeeSummary}
                    </span>
                    {summary.openTodoCount > 0 && (
                      <Badge count={summary.openTodoCount} style={{ backgroundColor: 'var(--brand-500)' }}>
                        <span style={{ fontSize: 12 }}>待办</span>
                      </Badge>
                    )}
                  </div>

                  {/* 引用 chips */}
                  {summary.refChips.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {summary.refChips.map((ref, i) => (
                        <Tag key={`${ref.kind}-${ref.id}-${i}`} size="small" color="arcoblue">
                          {ref.displaySnapshot}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                {/* 右侧：更新时间 */}
                <Text style={{ fontSize: 12, color: 'var(--grey-400)', flexShrink: 0, marginLeft: 12 }}>
                  {formatUpdatedAt(summary.updatedAt)}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** 格式化会议时间 */
function formatMeetingTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

/** 格式化更新时间（简短） */
function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
