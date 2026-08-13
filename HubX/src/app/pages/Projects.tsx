import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Form,
  Grid,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconEye, IconPlus, IconSearch, IconSend } from '@arco-design/web-react/icon';
import {
  BusinessLine,
  Project,
  ProjectPriority,
  ProjectStatus,
  businessLines,
  companyEntities,
  createProjectNo,
  employees,
  initialDailyReports,
  initialProjects,
  projectPriorities,
  projectStatuses,
  roleEmployees,
  summarizeProgress,
} from './project-management/mockData';
import { getProjectBugSummary } from './project-management/projectQuality';

const Title = Typography.Title;
const FormItem = Form.Item;

type ProjectFormValues = {
  name: string;
  latestProgress?: string;
  priority: ProjectPriority;
  entity?: string;
  status: ProjectStatus;
  businessLine?: BusinessLine;
  salesUsers?: string[];
  owner: string;
  assistants?: string[];
  productUsers?: string[];
  uiUsers?: string[];
  frontendUsers?: string[];
  backendUsers?: string[];
  opsUsers?: string[];
  testUsers?: string[];
  legalUsers?: string[];
  progress?: number;
  startDate?: any;
  expectedEndDate?: any;
  remark?: string;
};

function statusBadge(status: ProjectStatus) {
  const map: Record<ProjectStatus, 'default' | 'processing' | 'success' | 'warning' | 'error'> = {
    未开始: 'default',
    进行中: 'processing',
    已完成: 'success',
    验收中: 'processing',
    搁置: 'warning',
    延迟: 'error',
    催款中: 'warning',
  };
  return <Badge status={map[status]} text={status} />;
}

function priorityTag(priority: ProjectPriority) {
  const colorMap: Record<ProjectPriority, string> = { 高: 'red', 中: 'orange', 低: 'gray' };
  return <Tag color={colorMap[priority]}>{priority}</Tag>;
}

function toDateString(value: any) {
  if (!value) return '';
  return value?.format?.('YYYY-MM-DD') ?? value;
}

export function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [keyword, setKeyword] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>();
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority>();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>();
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [followingProject, setFollowingProject] = useState<Project | null>(null);
  const [projectForm] = Form.useForm<ProjectFormValues>();
  const [followForm] = Form.useForm();

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const keywordMatched = !keyword || project.name.includes(keyword);
      const ownerMatched = !ownerFilter || project.owner === ownerFilter;
      const priorityMatched = !priorityFilter || project.priority === priorityFilter;
      const statusMatched = !statusFilter || project.status === statusFilter;
      return keywordMatched && ownerMatched && priorityMatched && statusMatched;
    });
  }, [keyword, ownerFilter, priorityFilter, projects, statusFilter]);

  const openCreateModal = () => {
    setEditingProject(null);
    projectForm.resetFields();
    projectForm.setFieldsValue({ priority: '中', status: '未开始', progress: 0, businessLine: '外包' });
    setProjectModalVisible(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    projectForm.setFieldsValue(project as any);
    setProjectModalVisible(true);
  };

  const saveProject = () => {
    projectForm.validate().then((values) => {
      const nextProject: Project = {
        id: editingProject?.id ?? String(Date.now()),
        projectNo: editingProject?.projectNo ?? createProjectNo(projects.length),
        name: values.name,
        latestProgress: values.latestProgress || '暂无进展',
        priority: values.priority,
        entity: values.entity || '',
        status: values.status,
        businessLine: values.businessLine || '外包',
        salesUsers: values.salesUsers || [],
        owner: values.owner,
        assistants: values.assistants || [],
        productUsers: values.productUsers || [],
        uiUsers: values.uiUsers || [],
        frontendUsers: values.frontendUsers || [],
        backendUsers: values.backendUsers || [],
        opsUsers: values.opsUsers || [],
        testUsers: values.testUsers || [],
        legalUsers: values.legalUsers || [],
        progress: values.progress ?? 0,
        startDate: toDateString(values.startDate),
        expectedEndDate: toDateString(values.expectedEndDate),
        remark: values.remark || '',
        attachments: editingProject?.attachments ?? [],
        createdAt: editingProject?.createdAt ?? '2026-05-09 10:00',
      };

      setProjects((current) => {
        if (editingProject) {
          return current.map((item) => (item.id === editingProject.id ? nextProject : item));
        }
        return [nextProject, ...current];
      });
      setProjectModalVisible(false);
      projectForm.resetFields();
      Message.success(editingProject ? '项目已更新' : '项目已新建');
    });
  };

  const openFollowModal = (project: Project) => {
    setFollowingProject(project);
    followForm.setFieldsValue({ status: project.status, progress: project.progress });
    setFollowModalVisible(true);
  };

  const saveFollow = () => {
    followForm.validate().then((values) => {
      if (!followingProject) return;
      setProjects((current) =>
        current.map((project) =>
          project.id === followingProject.id
            ? {
                ...project,
                status: values.status,
                progress: values.progress,
                latestProgress: summarizeProgress(values.content),
              }
            : project
        )
      );
      setFollowModalVisible(false);
      followForm.resetFields();
      Message.success('跟进记录已保存，项目状态已同步');
    });
  };

  const removeProject = (project: Project) => {
    const hasDailyReports = initialDailyReports.some((report) => report.projectId === project.id);
    setProjects((current) => current.filter((item) => item.id !== project.id));
    Message.success(hasDailyReports ? '项目已删除，关联日报仅在原始日报模块保留' : '项目已删除');
  };

  const columns = [
    { title: '编号', dataIndex: 'projectNo', width: 140 },
    {
      title: '项目名称',
      dataIndex: 'name',
      width: 220,
      render: (name: string, record: Project) => (
        <Button type="text" onClick={() => navigate(`/projects/${record.id}`)} style={{ padding: 0 }}>
          {name}
        </Button>
      ),
    },
    { title: '负责人', dataIndex: 'owner', width: 100 },
    { title: '销售', dataIndex: 'salesUsers', width: 140, render: (users: string[]) => users.join('、') || '-' },
    { title: '对接主体', dataIndex: 'entity', width: 120, render: (value: string) => value || '-' },
    { title: '最新进展', dataIndex: 'latestProgress', width: 260 },
    { title: '业务线', dataIndex: 'businessLine', width: 100 },
    { title: '优先级', dataIndex: 'priority', width: 90, render: priorityTag },
    { title: '状态', dataIndex: 'status', width: 110, render: statusBadge },
    {
      title: 'Bug 状态',
      width: 130,
      render: (_: unknown, record: Project) => {
        const summary = getProjectBugSummary(record);
        const color = summary.status === '预警' ? 'red' : summary.status === '关注' ? 'orange' : 'green';
        return <Tag color={color}>{summary.status} · {summary.openCount}个未关闭</Tag>;
      },
    },
    { title: '开始日期', dataIndex: 'startDate', width: 120, render: (value: string) => value || '-' },
    { title: '预计结束日期', dataIndex: 'expectedEndDate', width: 130, render: (value: string) => value || '-' },
    {
      title: '总进度',
      dataIndex: 'progress',
      width: 150,
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    { title: '添加时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: Project) => (
        <Space size={4}>
          <Tooltip content="详情">
            <Button type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/projects/${record.id}`)} />
          </Tooltip>
          <Tooltip content="编辑">
            <Button type="text" size="small" icon={<IconEdit />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip content="跟进">
            <Button type="text" size="small" icon={<IconSend />} onClick={() => openFollowModal(record)} />
          </Tooltip>
          <Tooltip content="删除">
            <Popconfirm
              title={initialDailyReports.some((report) => report.projectId === record.id) ? '该项目已有关联日报，确认删除项目吗？' : '确认删除该项目吗？'}
              onOk={() => removeProject(record)}
            >
              <Button type="text" size="small" status="danger" icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4}>项目管理</Title>
        <Button type="primary" icon={<IconPlus />} onClick={openCreateModal}>新建项目</Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input style={{ width: 240 }} placeholder="搜索项目名称" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="负责人" style={{ width: 150 }} value={ownerFilter} onChange={setOwnerFilter} allowClear>
            {employees.map((employee) => <Select.Option key={employee} value={employee}>{employee}</Select.Option>)}
          </Select>
          <Select placeholder="优先级" style={{ width: 140 }} value={priorityFilter} onChange={setPriorityFilter} allowClear>
            {projectPriorities.map((priority) => <Select.Option key={priority} value={priority}>{priority}</Select.Option>)}
          </Select>
          <Select placeholder="状态" style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter} allowClear>
            {projectStatuses.map((status) => <Select.Option key={status} value={status}>{status}</Select.Option>)}
          </Select>
          <Button onClick={() => { setKeyword(''); setOwnerFilter(undefined); setPriorityFilter(undefined); setStatusFilter(undefined); }}>重置</Button>
        </Space>

        <Table columns={columns} data={filteredProjects} rowKey="id" scroll={{ x: 2230 }} pagination={{ pageSize: 10, showTotal: true }} />
      </Card>

      <Modal title={editingProject ? '编辑项目' : '新建项目'} visible={projectModalVisible} onOk={saveProject} onCancel={() => setProjectModalVisible(false)} style={{ width: 860 }} maskClosable={false}>
        <Form form={projectForm} layout="vertical" autoComplete="off">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><FormItem label="项目名称" field="name" rules={[{ required: true, message: '请输入项目名称' }]}><Input placeholder="请输入项目名称" /></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="优先级" field="priority" rules={[{ required: true, message: '请选择优先级' }]}><Select>{projectPriorities.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="状态" field="status" rules={[{ required: true, message: '请选择状态' }]}><Select>{projectStatuses.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="对接主体" field="entity"><Select allowClear>{companyEntities.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="业务线" field="businessLine"><Select>{businessLines.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="负责人" field="owner" rules={[{ required: true, message: '请选择负责人' }]}><Select>{employees.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="销售人员" field="salesUsers"><Select mode="multiple" allowClear>{roleEmployees.sales.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="协助人" field="assistants"><Select mode="multiple" allowClear>{employees.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="总进度" field="progress"><InputNumber min={0} max={100} precision={0} suffix="%" style={{ width: '100%' }} /></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={6}><FormItem label="产品" field="productUsers"><Select mode="multiple" allowClear>{roleEmployees.product.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="UI" field="uiUsers"><Select mode="multiple" allowClear>{roleEmployees.ui.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="前端" field="frontendUsers"><Select mode="multiple" allowClear>{roleEmployees.frontend.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="后端" field="backendUsers"><Select mode="multiple" allowClear>{roleEmployees.backend.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="运维" field="opsUsers"><Select mode="multiple" allowClear>{roleEmployees.ops.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="测试" field="testUsers"><Select mode="multiple" allowClear>{roleEmployees.test.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="法务" field="legalUsers"><Select mode="multiple" allowClear>{roleEmployees.legal.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><FormItem label="开始日期" field="startDate"><DatePicker style={{ width: '100%' }} /></FormItem></Grid.Col>
            <Grid.Col span={12}><FormItem label="预计结束日期" field="expectedEndDate"><DatePicker style={{ width: '100%' }} /></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="最新进展" field="latestProgress"><Input.TextArea rows={3} placeholder="请输入最新进展" /></FormItem>
          <FormItem label="备注" field="remark"><Input.TextArea rows={3} placeholder="请输入备注" /></FormItem>
        </Form>
      </Modal>

      <Modal title="新增跟进" visible={followModalVisible} onOk={saveFollow} onCancel={() => setFollowModalVisible(false)} style={{ width: 620 }} maskClosable={false}>
        <Form form={followForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><FormItem label="状态" field="status" rules={[{ required: true, message: '请选择状态' }]}><Select>{projectStatuses.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={12}><FormItem label="总进度" field="progress" rules={[{ required: true, message: '请输入总进度' }]}><InputNumber min={0} max={100} precision={0} suffix="%" style={{ width: '100%' }} /></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="跟进详情" field="content" rules={[{ required: true, message: '请输入跟进详情' }]}><Input.TextArea rows={4} /></FormItem>
          <FormItem label="附件上传" field="attachmentName"><Input placeholder="第一版模拟上传，填写附件名称" /></FormItem>
        </Form>
      </Modal>
    </div>
  );
}
