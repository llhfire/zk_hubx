import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Card, Table, Tooltip, Button, Input, Select, DatePicker, Space } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye } from '@arco-design/web-react/icon';
import { DailyReportDetail } from './daily-report/DailyReportDetail';
import { DailyReport, DailyReportComment } from './daily-report/types';
import { getDailyReportTotalHours, getDailyReportWorkTypeText, mockDailyReports } from './daily-report/mockData';
import { DailyReportModal } from './daily-report/DailyReportModal';
import { mockUsers } from './daily-report/templateConfig';
import { useReminders } from '../reminders/ReminderContext';

const { RangePicker } = DatePicker;

export function DailyReportList() {
  const layoutContext = useOutletContext<{ openDailyReport?: () => void } | undefined>();
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    department: '',
    dateRange: [],
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [comments, setComments] = useState<DailyReportComment[]>([]);
  const [backfillVisible, setBackfillVisible] = useState(false);
  const { dailyReports, submitDailyReport } = useReminders();
  const reports = [...mockDailyReports, ...dailyReports];

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
    setComments([...comments, newComment]);
  };

  const columns = [
    {
      title: '日报时间',
      dataIndex: 'reportDate',
      width: 120,
      key: 'reportDate',
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
      title: '总工时',
      dataIndex: 'totalHours',
      width: 90,
      key: 'totalHours',
      render: (_: string, record: DailyReport) => `${getDailyReportTotalHours(record)}h`,
    },
    {
      title: '操作',
      dataIndex: 'op',
      width: 100,
      key: 'op',
      render: (_: any, record: DailyReport) => (
        <Tooltip content="查看详情">
          <Button type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  const handleSearch = () => {
    console.log('搜索条件：', searchForm);
  };

  const handleReset = () => {
    setSearchForm({
      keyword: '',
      department: '',
      dateRange: [],
    });
  };

  const handleViewDetail = (record: DailyReport) => {
    setSelectedReport(record);
    setDetailVisible(true);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            style={{ width: 200 }}
            placeholder="搜索汇报人"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
            allowClear
          />
          <Select
            style={{ width: 200 }}
            placeholder="选择部门"
            value={searchForm.department}
            onChange={(value) => setSearchForm({ ...searchForm, department: value })}
            allowClear
            options={[
              { label: '销售部', value: '销售部' },
              { label: '新媒体部门', value: '新媒体部门' },
              { label: '行政财务', value: '行政财务' },
              { label: '技术部', value: '技术部' },
            ]}
          />
          <RangePicker
            style={{ width: 280 }}
            placeholder={['开始日期', '结束日期']}
            value={searchForm.dateRange}
            onChange={(value) => setSearchForm({ ...searchForm, dateRange: value })}
          />
          <Button type="primary" icon={<IconSearch />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card
        title="日报列表"
        extra={
          <Space>
            <Button onClick={() => setBackfillVisible(true)}>补录日报</Button>
            <Button type="primary" icon={<IconPlus />} onClick={layoutContext?.openDailyReport}>
              新增日报
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          data={reports}
          pagination={{
            total: reports.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      <DailyReportDetail
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        report={selectedReport}
        comments={comments}
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
    </div>
  );
}
