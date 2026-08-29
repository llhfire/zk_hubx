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
import { Badge, Button, Card, Empty, Input, Select, Spin, Tag, Typography } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconCalendar, IconUser, IconFile } from '@arco-design/web-react/icon';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { useSmartMeeting } from './SmartMeetingContext';
import { summarizeMinutes, filterMinutes, monthDeposited, type MinuteListQuery } from './boardQueries';
import { MOCK_USERS } from './mockData';
import type { MinuteStatus } from './types';
import './smartMeetingListPage.css';

const { Text } = Typography;
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

const USER_NAME_BY_ID = new Map(MOCK_USERS.map(user => [user.id, user.name]));

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
    () => summarizeMinutes(minutes, [], DEFAULT_VIEWER, userId => USER_NAME_BY_ID.get(userId) || userId),
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
      <PageShell className="smart-meeting-list">
        <PageHeader title="智能会议" description="集中沉淀会议纪要、确认记录与行动事项。" />
        <Card className="smart-meeting-list__loading"><Spin size={40} /></Card>
      </PageShell>
    );
  }

  const depositedCount = stats.pending_review + stats.confirmed + stats.archived;
  const hasFilters = Boolean(keyword || statusFilter.length > 0);

  const openMinute = (minuteId: string) => navigate(`/smart-meetings/${minuteId}`);

  return (
    <PageShell className="smart-meeting-list">
      <PageHeader
        title="智能会议"
        description="集中沉淀会议纪要、确认记录与行动事项；本页默认展示当前账号可查看的全部纪要。"
        actions={(
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/smart-meetings/new')}>
            新建纪要
          </Button>
        )}
      />

      <ProcessMetricGrid
        items={[
          { key: 'deposited', label: `${currentMonth.replace('-', '年')}月已沉淀`, value: `${depositedCount} 篇`, detail: '不含草稿' },
          { key: 'pending', label: '待确认', value: `${stats.pending_review} 篇`, detail: '等待确认人处理', tone: stats.pending_review > 0 ? 'warning' : 'neutral' },
          { key: 'confirmed', label: '已确认', value: `${stats.confirmed} 篇`, detail: '行动项可同步', tone: stats.confirmed > 0 ? 'success' : 'neutral' },
          { key: 'archived', label: '已归档', value: `${stats.archived} 篇`, detail: '保持只读留痕' },
        ]}
      />

      <Card className="smart-meeting-list__content-card">
        <FilterBar
          actions={hasFilters ? (
            <Button type="text" onClick={() => { setKeyword(''); setStatusFilter([]); }}>重置筛选</Button>
          ) : undefined}
        >
          <Input
            prefix={<IconSearch />}
            placeholder="搜索会议主题、决议关键词、待办内容"
            value={keyword}
            onChange={setKeyword}
            className="smart-meeting-list__search"
            allowClear
          />
          <Select
            mode="multiple"
            placeholder="纪要状态（全部）"
            value={statusFilter}
            onChange={setStatusFilter}
            className="smart-meeting-list__status-filter"
            maxTagCount={2}
            allowClear
          >
            {(Object.keys(STATUS_LABEL) as MinuteStatus[]).map((status) => (
              <Option key={status} value={status}>
                <Tag color={STATUS_COLOR[status]} size="small">{STATUS_LABEL[status]}</Tag>
              </Option>
            ))}
          </Select>
        </FilterBar>

        <div className="smart-meeting-list__result-summary">
          <Text type="secondary">共 {filtered.length} 篇纪要</Text>
          {hasFilters && <Text type="secondary">已按当前搜索与状态条件筛选</Text>}
        </div>

        {filtered.length === 0 ? (
          <div className="smart-meeting-list__empty">
            <Empty description={hasFilters ? '没有符合当前条件的纪要' : '暂无会议纪要'} />
            {hasFilters ? (
              <Button onClick={() => { setKeyword(''); setStatusFilter([]); }}>清除筛选</Button>
            ) : (
              <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/smart-meetings/new')}>新建第一篇纪要</Button>
            )}
          </div>
        ) : (
          <div className="smart-meeting-list__items">
            {filtered.map((summary) => (
              <article
                key={summary.id}
                className="smart-meeting-list__item"
                role="link"
                tabIndex={0}
                aria-label={`打开纪要：${summary.title}`}
                onClick={() => openMinute(summary.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openMinute(summary.id);
                  }
                }}
              >
                <div className="smart-meeting-list__item-main">
                  <div className="smart-meeting-list__title-row">
                    <Tag color={STATUS_COLOR[summary.status]} size="small">{STATUS_LABEL[summary.status]}</Tag>
                    <span className="smart-meeting-list__item-title">{summary.title}</span>
                  </div>

                  <div className="smart-meeting-list__meta-row">
                    <span><IconCalendar />{formatMeetingTime(summary.meetingTime)}</span>
                    <span><IconUser />{summary.attendeeSummary}</span>
                    {summary.openTodoCount > 0 && (
                      <Badge count={summary.openTodoCount}>
                        <span className="smart-meeting-list__todo-label">待办</span>
                      </Badge>
                    )}
                  </div>

                  {summary.refChips.length > 0 && (
                    <div className="smart-meeting-list__refs">
                      <IconFile />
                      {summary.refChips.map((ref, index) => (
                        <Tag key={`${ref.kind}-${ref.id}-${index}`} size="small" color="arcoblue">{ref.displaySnapshot}</Tag>
                      ))}
                    </div>
                  )}
                </div>

                <div className="smart-meeting-list__updated">
                  <Text type="secondary">更新于 {formatUpdatedAt(summary.updatedAt)}</Text>
                  <span className="smart-meeting-list__view-label">查看纪要</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}

/** 格式化会议时间 */
function formatMeetingTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 格式化更新时间（简短） */
function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}天前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
