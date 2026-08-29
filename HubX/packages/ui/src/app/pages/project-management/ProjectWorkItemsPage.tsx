import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Card, Empty, Input, Select, Space, Table, Tabs, Tag, Tooltip, Typography } from '@arco-design/web-react';
import { ArrowLeft, Eye, PencilSimple } from '@phosphor-icons/react';
import { PageHeader, PageShell } from '@/app/components/ui';
import { useProjects } from './ProjectContext';
import { getProjectTasks, type ProjectWorkTask } from './projectTasks';

const { Text } = Typography;

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

  if (!project) return <Empty description="项目不存在" />;

  const matches = (item: { title: string; status: string }) => (!keyword || item.title.includes(keyword)) && (!status || item.status === status);
  const operationColumn = {
    title: '操作', width: 96, fixed: 'right' as const,
    render: () => <Space size={2}><Tooltip content="查看"><Button className="hubx-icon-action" type="text" icon={<Eye size={18} />} /></Tooltip><Tooltip content="编辑"><Button className="hubx-icon-action" type="text" icon={<PencilSimple size={18} />} /></Tooltip></Space>,
  };

  const requirementColumns = [
    { title: '需求名称', dataIndex: 'title', width: 280 }, { title: '负责人', dataIndex: 'owner', width: 110 },
    { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => <Tag color={value === '高' ? 'red' : 'orange'}>{value}</Tag> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => <Tag color={value === '已确认' ? 'green' : value === '评审中' ? 'arcoblue' : 'gray'}>{value}</Tag> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120 }, operationColumn,
  ];
  const taskColumns = [
    { title: '任务名称', dataIndex: 'title', width: 280 }, { title: '类型', dataIndex: 'type', width: 110 }, { title: '负责人', dataIndex: 'assignee', width: 110 },
    { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => <Tag color={value === '高' ? 'red' : value === '中' ? 'orange' : 'gray'}>{value}</Tag> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => <Tag color={value === '已完成' ? 'green' : value === '进行中' ? 'arcoblue' : 'gray'}>{value}</Tag> },
    { title: '计划完成', dataIndex: 'plannedEndDate', width: 120 }, operationColumn,
  ];
  const bugColumns = [
    { title: '缺陷名称', dataIndex: 'title', width: 280 }, { title: '负责人', dataIndex: 'owner', width: 110 },
    { title: '严重程度', dataIndex: 'severity', width: 100, render: (value: string) => <Tag color={value === 'P0' ? 'red' : value === 'P1' ? 'orangered' : 'orange'}>{value}</Tag> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: string) => <Tag color={value === '已修复' ? 'green' : 'arcoblue'}>{value}</Tag> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120 }, operationColumn,
  ];
  const currentRows = activeTab === 'requirements' ? requirementSeed.filter(matches) : activeTab === 'bugs' ? bugSeed.filter(matches) : tasks.filter((item) => matches(item as ProjectWorkTask));

  return <PageShell breadcrumbs={[{ label: '项目管理', to: '/projects' }, { label: project.name, to: `/projects/${id}` }, { label: '工作项列表' }]}>
    <PageHeader title={`${project.name} · 工作项`} description={`${project.projectNo} · 需求、任务与缺陷统一查询入口`} actions={<Button icon={<ArrowLeft size={18} />} onClick={() => navigate(`/projects/${id}`)}>返回项目</Button>} />
    <Card size="small">
      <Tabs activeTab={activeTab} onChange={(tab) => setSearchParams({ tab })}>
        <Tabs.TabPane key="requirements" title={`需求 ${requirementSeed.length}`} />
        <Tabs.TabPane key="tasks" title={`任务 ${tasks.length}`} />
        <Tabs.TabPane key="bugs" title={`缺陷 ${bugSeed.length}`} />
      </Tabs>
      <Space style={{ margin: '12px 0 16px' }} wrap>
        <Input.Search allowClear placeholder={`搜索${activeTab === 'requirements' ? '需求' : activeTab === 'bugs' ? '缺陷' : '任务'}名称`} value={keyword} onChange={setKeyword} style={{ width: 280 }} />
        <Select allowClear placeholder="状态（全部）" value={status} onChange={setStatus} style={{ width: 160 }}>
          {['待确认', '评审中', '已确认', '未开始', '进行中', '已完成', '待修复', '处理中', '已修复'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
        </Select>
        <Text type="secondary">共 {currentRows.length} 条</Text>
      </Space>
      <Table rowKey="id" scroll={{ x: 900 }} pagination={{ pageSize: 10 }} data={currentRows} columns={activeTab === 'requirements' ? requirementColumns : activeTab === 'bugs' ? bugColumns : taskColumns} />
    </Card>
  </PageShell>;
}
