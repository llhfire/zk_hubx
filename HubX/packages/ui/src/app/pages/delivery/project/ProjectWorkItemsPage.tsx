import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Input, SectionTabs, Select, Space, Tabs, Tooltip } from '@/design-system';
import {
  ArrowLeft,
  DataTable, DateText, EmptyState, PageHeader, PageShell, SectionCard, StatusTag,
  Eye,
  PencilSimple,
  resolveStatus, type StatusMap,
} from '@/design-system';
import { useProjects } from './ProjectContext';
import { getProjectTasks, type ProjectWorkTask } from './projectTasks';

const WORK_PRIORITY_META: StatusMap = {
  高: { label: '高', tone: 'danger' },
  中: { label: '中', tone: 'warning' },
  低: { label: '低', tone: 'neutral' },
};
const REQUIREMENT_STATUS_META: StatusMap = {
  待确认: { label: '待确认', tone: 'neutral' },
  评审中: { label: '评审中', tone: 'info' },
  已确认: { label: '已确认', tone: 'success' },
};
const WORK_TASK_STATUS_META: StatusMap = {
  未开始: { label: '未开始', tone: 'neutral' },
  进行中: { label: '进行中', tone: 'info' },
  已完成: { label: '已完成', tone: 'success' },
  已搁置: { label: '已搁置', tone: 'warning' },
  已逾期: { label: '已逾期', tone: 'danger' },
  已取消: { label: '已取消', tone: 'neutral' },
};
const BUG_SEVERITY_META: StatusMap = {
  P0: { label: 'P0', tone: 'danger' },
  P1: { label: 'P1', tone: 'warning' },
  P2: { label: 'P2', tone: 'info' },
};
const BUG_STATUS_META: StatusMap = {
  待修复: { label: '待修复', tone: 'neutral' },
  处理中: { label: '处理中', tone: 'info' },
  已修复: { label: '已修复', tone: 'success' },
};

const requirementSeed = [
  { id: 'req-1', title: '客户档案与联系人管理', owner: '李四', priority: '高', status: '已确认', updatedAt: '2026-08-18' },
  { id: 'req-2', title: '销售漏斗和商机转化分析', owner: '李四', priority: '中', status: '评审中', updatedAt: '2026-08-20' },
  { id: 'req-3', title: '历史客户数据批量导入', owner: '周八', priority: '中', status: '待确认', updatedAt: '2026-08-22' },
];

const bugSeed = [
  { id: 'bug-1', title: '列表页横向滚动卡顿', owner: '王五', severity: 'P1', status: '处理中', updatedAt: '2026-08-18' },
  { id: 'bug-2', title: '表单提交后未清空', owner: '赵六', severity: 'P2', status: '待修复', updatedAt: '2026-08-19' },
];

export function ProjectWorkItemsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getProjectById } = useProjects();
  const project = getProjectById(id);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const activeTab = searchParams.get('tab') || 'tasks';
  const tasks = useMemo(() => getProjectTasks(id), [id]);

  if (!project) {
    return (
      <PageShell breadcrumbs={[{ label: '项目管理', to: '/projects' }, { label: '工作项列表' }]}>
        <PageHeader title="工作项列表" />
        <SectionCard>
          <EmptyState description="项目不存在" action={<Button onClick={() => navigate('/projects')}>返回列表</Button>} />
        </SectionCard>
      </PageShell>
    );
  }

  const matches = (item: { title: string; status: string }) => (!keyword || item.title.includes(keyword)) && (!status || item.status === status);
  const operationColumn = {
    title: '操作', width: 96, fixed: 'right' as const,
    render: () => <Space size={2}><Tooltip content="查看"><Button className="hubx-icon-action" type="text" icon={<Eye size={18} />} /></Tooltip><Tooltip content="编辑"><Button className="hubx-icon-action" type="text" icon={<PencilSimple size={18} />} /></Tooltip></Space>,
  };

  const requirementColumns = [
    { title: '需求名称', dataIndex: 'title', width: 280 }, { title: '负责人', dataIndex: 'owner', width: 110 },
    { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => <StatusTag meta={resolveStatus(WORK_PRIORITY_META, value)} /> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => <StatusTag meta={resolveStatus(REQUIREMENT_STATUS_META, value)} /> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120, render: (value: string) => <DateText value={value} /> }, operationColumn,
  ];
  const taskColumns = [
    { title: '任务名称', dataIndex: 'title', width: 280 }, { title: '类型', dataIndex: 'type', width: 110 }, { title: '负责人', dataIndex: 'assignee', width: 110 },
    { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => <StatusTag meta={resolveStatus(WORK_PRIORITY_META, value)} /> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => <StatusTag meta={resolveStatus(WORK_TASK_STATUS_META, value)} /> },
    { title: '计划完成', dataIndex: 'plannedEndDate', width: 120, render: (value: string) => <DateText value={value} /> }, operationColumn,
  ];
  const bugColumns = [
    { title: '缺陷名称', dataIndex: 'title', width: 280 }, { title: '负责人', dataIndex: 'owner', width: 110 },
    { title: '严重程度', dataIndex: 'severity', width: 100, render: (value: string) => <StatusTag meta={resolveStatus(BUG_SEVERITY_META, value)} /> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => <StatusTag meta={resolveStatus(BUG_STATUS_META, value)} /> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120, render: (value: string) => <DateText value={value} /> }, operationColumn,
  ];
  // 三个页签的数据形状不同（需求/缺陷/任务），但都满足「id + title + status」。
  // 用显式联合类型收口，避免三元表达式被推断成三个数组类型的并集、Table 无法接收。
  type WorkItemRow =
    | (typeof requirementSeed)[number]
    | (typeof bugSeed)[number]
    | ProjectWorkTask;
  const currentRows: WorkItemRow[] = activeTab === 'requirements'
    ? requirementSeed.filter(matches)
    : activeTab === 'bugs'
      ? bugSeed.filter(matches)
      : tasks.filter((item) => matches(item));

  return <PageShell breadcrumbs={[{ label: '项目管理', to: '/projects' }, { label: project.name, to: `/projects/${id}` }, { label: '工作项列表' }]}>
    <PageHeader title={`${project.name} · 工作项`} description={`${project.projectNo} · 需求、任务与缺陷统一查询入口`} actions={<Button icon={<ArrowLeft size={18} />} onClick={() => navigate(`/projects/${id}`)}>返回项目</Button>} />
    <SectionCard>
      <SectionTabs
        activeKey={activeTab}
        onChange={(tab) => setSearchParams({ tab })}
        items={[
          {
            key: 'requirements',
            label: `需求 ${requirementSeed.length}`,
          },
          {
            key: 'tasks',
            label: `任务 ${tasks.length}`,
          },
          {
            key: 'bugs',
            label: `缺陷 ${bugSeed.length}`,
          },
        ]}
      />
      <DataTable
        rowKey="id"
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10 }}
        data={currentRows}
        columns={activeTab === 'requirements' ? requirementColumns : activeTab === 'bugs' ? bugColumns : taskColumns}
        toolbar={(
          <Space wrap>
            <Input.Search allowClear placeholder={`搜索${activeTab === 'requirements' ? '需求' : activeTab === 'bugs' ? '缺陷' : '任务'}名称`} value={keyword} onChange={setKeyword} style={{ width: 280 }} />
            <Select allowClear placeholder="状态（全部）" value={status} onChange={setStatus} style={{ width: 160 }}>
              {['待确认', '评审中', '已确认', '未开始', '进行中', '已完成', '待修复', '处理中', '已修复'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
            </Select>
          </Space>
        )}
        caption={`共 ${currentRows.length} 条`}
        emptyDescription="没有符合当前条件的工作项"
      />
    </SectionCard>
  </PageShell>;
}
