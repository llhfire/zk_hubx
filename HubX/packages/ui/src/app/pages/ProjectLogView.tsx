import { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Select, Space, Table, Tooltip, Typography } from '@arco-design/web-react';
import { IconEye, IconRefresh, IconSearch } from '@arco-design/web-react/icon';
import { DailyReportDetail } from './daily-report/DailyReportDetail';
import { mockDailyReports } from './daily-report/mockData';
import {
  DailyReport,
  DailyReportComment,
  DailyReportTask,
  SalesReportContent,
  WORK_KIND_LABELS,
} from './daily-report/types';
import { PageShell } from '@/app/components/ui';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ProjectReportRow {
  id: string;
  report: DailyReport;
  task: DailyReportTask;
  reportDate: string;
  userName: string;
  department: string;
  projectId: string;
  projectName: string;
  workNature: string;
  hours: number;
  content: string;
}

interface ProjectReportFilters {
  reporter: string;
  department: string;
  project: string;
  workNature: string;
  dateRange: string[];
}

const emptyFilters: ProjectReportFilters = {
  reporter: '',
  department: '',
  project: '',
  workNature: '',
  dateRange: [],
};

function getTaskWorkNature(report: DailyReport, task: DailyReportTask) {
  const salesItems = (report.content as SalesReportContent)['work-items'] || [];
  const sourceItem = salesItems.find(item => (
    item.relationId || item.projectId || item.leadId
  ) === task.relationId);

  return sourceItem?.workNature || WORK_KIND_LABELS[task.workKind] || '-';
}

function createProjectReportRows(reports: DailyReport[]): ProjectReportRow[] {
  return reports.flatMap(report => (report.tasks || [])
    .filter(task => task.relationType === 'project')
    .map(task => ({
      id: task.id,
      report,
      task,
      reportDate: task.reportDate,
      userName: task.userName,
      department: task.department,
      projectId: task.relationId,
      projectName: task.relationName,
      workNature: getTaskWorkNature(report, task),
      hours: task.hours,
      content: task.content,
    })));
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).map(value => ({
    label: value,
    value,
  }));
}

export function ProjectLogView() {
  const projectRows = useMemo(() => createProjectReportRows(mockDailyReports), []);
  const [filterForm, setFilterForm] = useState<ProjectReportFilters>({ ...emptyFilters });
  const [filters, setFilters] = useState<ProjectReportFilters>({ ...emptyFilters });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [comments, setComments] = useState<DailyReportComment[]>([]);

  const reporterOptions = useMemo(
    () => uniqueOptions(mockDailyReports.map(report => report.userName)),
    [],
  );
  const departmentOptions = useMemo(
    () => uniqueOptions(mockDailyReports.map(report => report.department)),
    [],
  );
  const projectOptions = useMemo(() => {
    const projects = new Map<string, string>();
    projectRows.forEach(row => projects.set(row.projectId, row.projectName));
    return Array.from(projects, ([value, label]) => ({ value, label }));
  }, [projectRows]);
  const workNatureOptions = useMemo(
    () => uniqueOptions(projectRows.map(row => row.workNature)),
    [projectRows],
  );

  const filteredRows = useMemo(() => projectRows.filter(row => {
    if (filters.reporter && row.userName !== filters.reporter) return false;
    if (filters.department && row.department !== filters.department) return false;
    if (filters.project && row.projectId !== filters.project) return false;
    if (filters.workNature && row.workNature !== filters.workNature) return false;
    if (filters.dateRange[0] && row.reportDate < filters.dateRange[0]) return false;
    if (filters.dateRange[1] && row.reportDate > filters.dateRange[1]) return false;
    return true;
  }), [filters, projectRows]);

  const handleReset = () => {
    setFilterForm({ ...emptyFilters });
    setFilters({ ...emptyFilters });
  };

  const handleViewReport = (report: DailyReport) => {
    setSelectedReport(report);
    setDetailVisible(true);
  };

  const handleAddComment = (reportId: string, content: string, mentionedUsers: string[]) => {
    setComments(previous => [...previous, {
      id: `comment-${Date.now()}`,
      reportId,
      userId: 'user-sales-zhangsan',
      userName: '张三',
      content,
      mentionedUsers,
      createdAt: new Date().toISOString(),
      readBy: ['user-sales-zhangsan'],
    }]);
  };

  const columns = [
    {
      title: '编号',
      width: 80,
      render: (_: unknown, __: ProjectReportRow, index: number) => String(index + 1).padStart(3, '0'),
    },
    { title: '汇报日期', dataIndex: 'reportDate', width: 120 },
    { title: '汇报人', dataIndex: 'userName', width: 100 },
    { title: '部门', dataIndex: 'department', width: 120 },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      width: 200,
      render: (value: string) => <Text ellipsis={{ showTooltip: true }}>{value}</Text>,
    },
    { title: '工作性质', dataIndex: 'workNature', width: 120 },
    {
      title: '用时',
      dataIndex: 'hours',
      width: 90,
      render: (value: number) => `${value} 小时`,
    },
    {
      title: '工作内容',
      dataIndex: 'content',
      render: (value: string) => (
        <Text ellipsis={{ rows: 2, showTooltip: true }} style={{ maxWidth: 420 }}>
          {value}
        </Text>
      ),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: ProjectReportRow) => (
        <Tooltip content="查看日报">
          <Button
            type="text"
            size="small"
            className="hubx-icon-action"
            aria-label="查看日报"
            icon={<IconEye />}
            onClick={() => handleViewReport(record.report)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <PageShell breadcrumbs={[{ label: '日报', to: '/dailyreport/list' }, { label: '日报列表', to: '/dailyreport/list' }, { label: '项目日报明细' }]}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6 }}>汇报人</div>
            <Select
              style={{ width: 160 }}
              placeholder="请选择汇报人"
              value={filterForm.reporter}
              onChange={value => setFilterForm(previous => ({ ...previous, reporter: value }))}
              options={reporterOptions}
              allowClear
            />
          </div>
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6 }}>部门</div>
            <Select
              style={{ width: 180 }}
              placeholder="请选择部门"
              value={filterForm.department}
              onChange={value => setFilterForm(previous => ({ ...previous, department: value }))}
              options={departmentOptions}
              allowClear
            />
          </div>
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6 }}>项目</div>
            <Select
              style={{ width: 220 }}
              placeholder="请选择项目"
              value={filterForm.project}
              onChange={value => setFilterForm(previous => ({ ...previous, project: value }))}
              options={projectOptions}
              allowClear
            />
          </div>
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6 }}>工作性质</div>
            <Select
              style={{ width: 180 }}
              placeholder="请选择工作性质"
              value={filterForm.workNature}
              onChange={value => setFilterForm(previous => ({ ...previous, workNature: value }))}
              options={workNatureOptions}
              allowClear
            />
          </div>
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6 }}>汇报日期</div>
            <RangePicker
              style={{ width: 260 }}
              placeholder={['开始日期', '结束日期']}
              value={filterForm.dateRange}
              onChange={value => setFilterForm(previous => ({ ...previous, dateRange: value || [] }))}
            />
          </div>
          <Space>
            <Button type="primary" icon={<IconSearch />} onClick={() => setFilters({ ...filterForm })}>
              查询
            </Button>
            <Button icon={<IconRefresh />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </div>
      </Card>

      <Card title="项目日报明细">
        <Table
          rowKey="id"
          columns={columns}
          data={filteredRows}
          scroll={{ x: 1280 }}
          pagination={{
            total: filteredRows.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
          noDataElement="暂无项目日报记录"
        />
      </Card>

      <DailyReportDetail
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        report={selectedReport}
        comments={comments.filter(comment => comment.reportId === selectedReport?.id)}
        onAddComment={handleAddComment}
        currentUserId="user-sales-zhangsan"
      />
    </PageShell>
  );
}
