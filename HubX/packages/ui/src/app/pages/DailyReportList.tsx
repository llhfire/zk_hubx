import { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router';
import { Button, Card, DatePicker, Empty, Input, Select, Space, Table, Tag, Tooltip, Typography } from '@arco-design/web-react';
import { IconEye, IconPlus, IconSearch } from '@arco-design/web-react/icon';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { DailyReportDetail } from './daily-report/DailyReportDetail';
import type { DailyReport, DailyReportComment } from './daily-report/types';
import { getDailyReportTotalHours, getDailyReportWorkTypeText, mockDailyReports } from './daily-report/mockData';
import {
  calculateDailyReportListMetrics,
  EMPTY_DAILY_REPORT_FILTERS,
  filterDailyReports,
  hasDailyReportFilters,
  type DailyReportListFilters,
} from './daily-report/dailyReportListModel';
import { DailyReportModal } from './daily-report/DailyReportModal';
import { mockUsers } from './daily-report/templateConfig';
import { useReminders } from '../reminders/ReminderContext';
import './daily-report/dailyReportList.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const REPORT_STATUS_LABEL: Record<DailyReport['status'], string> = {
  draft: '草稿',
  submitted: '已提交',
  reviewed: '已查看',
  locked: '已锁定',
};

const REPORT_STATUS_COLOR: Record<DailyReport['status'], string> = {
  draft: 'gray',
  submitted: 'blue',
  reviewed: 'green',
  locked: 'default',
};

export function DailyReportList() {
  const layoutContext = useOutletContext<{ openDailyReport?: () => void } | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const [filters, setFilters] = useState<DailyReportListFilters>({ ...EMPTY_DAILY_REPORT_FILTERS });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [comments, setComments] = useState<DailyReportComment[]>([]);
  const [backfillVisible, setBackfillVisible] = useState(false);
  const { dailyReports, submitDailyReport } = useReminders();
  const reports = useMemo(() => [...mockDailyReports, ...dailyReports], [dailyReports]);
  const scopedReports = useMemo(() => projectId
    ? reports.filter((report) => report.tasks?.some((task) => task.relationType === 'project' && task.relationId === projectId))
    : reports, [projectId, reports]);
  const filteredReports = useMemo(() => filterDailyReports(scopedReports, filters), [filters, scopedReports]);
  const metrics = useMemo(() => calculateDailyReportListMetrics(scopedReports), [scopedReports]);
  const departmentOptions = useMemo(() => Array.from(new Set(scopedReports.map(report => report.department).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
    .map(value => ({ label: value, value })), [scopedReports]);
  const hasFilters = hasDailyReportFilters(filters);

  const handleAddComment = (reportId: string, content: string, mentionedUsers: string[]) => {
    const newComment: DailyReportComment = {
      id: `comment-${Date.now()}`,
      reportId,
      userId: 'user-sales-zhangsan',
      userName: '张三',
      content,
      mentionedUsers,
      createdAt: new Date().toISOString(),
      readBy: ['user-sales-zhangsan'],
    };
    setComments(current => [...current, newComment]);
  };

  const columns = [
    {
      title: '日报时间',
      dataIndex: 'reportDate',
      width: 120,
      key: 'reportDate',
      fixed: 'left' as const,
    },
    {
      title: '汇报人',
      dataIndex: 'userName',
      width: 100,
      key: 'userName',
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 120,
      key: 'department',
    },
    {
      title: '工作项类型',
      dataIndex: 'workTypes',
      key: 'workTypes',
      render: (_: string, record: DailyReport) => getDailyReportWorkTypeText(record),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      key: 'status',
      render: (status: DailyReport['status']) => <Tag color={REPORT_STATUS_COLOR[status]}>{REPORT_STATUS_LABEL[status]}</Tag>,
    },
    {
      title: '总工时',
      dataIndex: 'totalHours',
      width: 90,
      key: 'totalHours',
      render: (_: string, record: DailyReport) => `${getDailyReportTotalHours(record)}h`,
      align: 'right' as const,
    },
    {
      title: '操作',
      dataIndex: 'op',
      width: 100,
      key: 'op',
      fixed: 'right' as const,
      render: (_: any, record: DailyReport) => (
        <Tooltip content="查看详情">
          <Button
            type="text"
            size="small"
            className="hubx-icon-action"
            aria-label={`查看${record.userName}的日报`}
            icon={<IconEye />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  const handleReset = () => {
    setFilters({ ...EMPTY_DAILY_REPORT_FILTERS });
  };

  const handleViewDetail = (record: DailyReport) => {
    setSelectedReport(record);
    setDetailVisible(true);
  };

  return (
    <PageShell className="daily-report-list">
      <PageHeader
        title="日报列表"
        description={projectId ? `当前仅展示归属项目 ${projectId} 的日报和任务工时。` : '默认展示当前账号可查看的全部日报，可按汇报人、部门和日期范围快速定位记录。'}
        actions={(
          <Space>
            {projectId && <Button onClick={() => setSearchParams({})}>查看全部日报</Button>}
            <Button onClick={() => setBackfillVisible(true)}>补录日报</Button>
            <Button type="primary" icon={<IconPlus />} onClick={() => layoutContext?.openDailyReport?.()}>
              新增日报
            </Button>
          </Space>
        )}
      />

      <ProcessMetricGrid
        items={[
          { key: 'reports', label: '日报总数', value: `${metrics.reportCount} 份`, detail: '当前可查看范围' },
          { key: 'reporters', label: '汇报人数', value: `${metrics.reporterCount} 人`, detail: '按员工去重' },
          { key: 'hours', label: '累计工时', value: `${metrics.totalHours}h`, detail: '有效任务明细汇总' },
          { key: 'departments', label: '涉及部门', value: `${metrics.departmentCount} 个`, detail: '按部门去重' },
        ]}
      />

      <Card className="daily-report-list__content-card">
        <FilterBar actions={hasFilters ? <Button type="text" onClick={handleReset}>重置筛选</Button> : undefined}>
          <Input
            prefix={<IconSearch />}
            className="daily-report-list__keyword"
            placeholder="搜索汇报人或部门"
            value={filters.keyword}
            onChange={(value) => setFilters(current => ({ ...current, keyword: value }))}
            allowClear
          />
          <Select
            className="daily-report-list__department"
            placeholder="部门（全部）"
            value={filters.department || undefined}
            onChange={(value) => setFilters(current => ({ ...current, department: value || '' }))}
            allowClear
            options={departmentOptions}
          />
          <RangePicker
            className="daily-report-list__date-range"
            placeholder={['开始日期', '结束日期']}
            value={filters.dateRange}
            onChange={(value) => setFilters(current => ({ ...current, dateRange: value || [] }))}
          />
        </FilterBar>

        <div className="daily-report-list__result-summary">
          <Text type="secondary">共 {filteredReports.length} 份日报</Text>
          {hasFilters && <Text type="secondary">已按当前条件筛选</Text>}
        </div>

        {filteredReports.length === 0 ? (
          <div className="daily-report-list__empty">
            <Empty description="没有符合当前条件的日报" />
            <Button onClick={handleReset}>清除筛选</Button>
          </div>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            data={filteredReports}
            scroll={{ x: 920 }}
            pagination={{
              total: filteredReports.length,
              pageSize: 10,
              showTotal: true,
              sizeCanChange: true,
            }}
          />
        )}
      </Card>

      <DailyReportDetail
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        report={selectedReport}
        comments={comments.filter(comment => comment.reportId === selectedReport?.id)}
        onAddComment={handleAddComment}
        currentUserId="user-sales-zhangsan"
      />

      <DailyReportModal
        visible={backfillVisible}
        onCancel={() => setBackfillVisible(false)}
        onSubmit={submitDailyReport}
        currentUserId={mockUsers[0].id}
        backfill
      />
    </PageShell>
  );
}
