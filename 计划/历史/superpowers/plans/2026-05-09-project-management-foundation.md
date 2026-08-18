# 项目管理底座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有项目模块改造成 OA 需求文档中的项目管理底座，覆盖项目台账、详情、关联线索、关联日报、跟进记录和项目文档。

**Architecture:** 保留现有 `/projects` 和 `/projects/:id` 路由，重写 `Projects.tsx` 与 `ProjectDetail.tsx` 的前端原型展示和交互。新增 `src/app/pages/project-management/mockData.ts` 统一管理项目、线索关系、日报、跟进和文档模拟数据，页面内部用 React state 演示新增、编辑、关联、删除等交互，不接后端接口。

**Tech Stack:** React 18、Vite 6、React Router v7、Arco Design Web React、TypeScript TSX、本地模拟数据。

---

## File Structure

### Create

- `src/app/pages/project-management/mockData.ts`
  - 定义项目管理底座的类型、枚举选项、模拟项目、可关联线索、项目日报、跟进记录和文档数据。
  - 提供 `calculateProjectHours()`、`buildProjectMemberHours()`、`createProjectNo()`、`summarizeProgress()` 工具函数。

### Modify

- `src/app/pages/Projects.tsx`
  - 改造成项目台账列表。
  - 支持项目名称、负责人、优先级、状态筛选。
  - 支持新建、编辑、跟进、删除和进入详情。
  - 使用 `mockData.ts` 类型和数据。

- `src/app/pages/ProjectDetail.tsx`
  - 改造成项目详情页。
  - 顶部显示项目状态、进度、负责人、预计结束日期、总工时和成本核算入口说明。
  - 左侧展示基础信息、关联线索、关联客户、关联日报。
  - 右侧展示跟进记录和项目文档。
  - 支持新增跟进、关联线索、解除线索关联、新增/编辑/删除文档。

### No route/menu changes

- `src/app/routes.tsx` 已存在 `/projects` 和 `/projects/:id`。
- `src/app/components/MainLayout.tsx` 已存在项目管理菜单入口。

---

## Task 1: Shared mock data and utilities

**Files:**
- Create: `src/app/pages/project-management/mockData.ts`

- [ ] **Step 1: Create project-management directory**

Run from `HubX/`:

```bash
mkdir -p src/app/pages/project-management
```

Expected: command exits 0.

- [ ] **Step 2: Create shared mock data file**

Create `src/app/pages/project-management/mockData.ts` with:

```ts
export type ProjectPriority = '高' | '中' | '低';
export type ProjectStatus = '未开始' | '进行中' | '已完成' | '验收中' | '搁置' | '延迟' | '催款中';
export type BusinessLine = '外包' | '自研' | '自运营';

export interface ProjectAttachment {
  id: string;
  name: string;
  size: string;
}

export interface Project {
  id: string;
  projectNo: string;
  name: string;
  latestProgress: string;
  priority: ProjectPriority;
  entity: string;
  status: ProjectStatus;
  businessLine: BusinessLine;
  salesUsers: string[];
  owner: string;
  assistants: string[];
  productUsers: string[];
  uiUsers: string[];
  frontendUsers: string[];
  backendUsers: string[];
  progress: number;
  startDate: string;
  expectedEndDate: string;
  remark: string;
  attachments: ProjectAttachment[];
  createdAt: string;
}

export interface ProjectFollowUp {
  id: string;
  projectId: string;
  status: ProjectStatus;
  progress: number;
  content: string;
  attachments: ProjectAttachment[];
  operator: string;
  createdAt: string;
}

export interface ProjectLeadRelation {
  id: string;
  projectId: string;
  leadNo: string;
  leadName: string;
  owner: string;
  preSaleGroupName: string;
  customerCategory: string;
  source: string;
  customerName: string;
  phone: string;
  wechat: string;
  leadCreatedAt: string;
}

export interface ProjectDailyReport {
  id: string;
  projectId: string;
  date: string;
  projectName: string;
  personName: string;
  position: string;
  hours: number;
  workContent: string;
  riskFeedback: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  onlineUrl: string;
  owner: string;
  uploadedFileName: string;
  description: string;
  createdAt: string;
}

export interface ProjectMemberHours {
  key: string;
  personName: string;
  position: string;
  hours: number;
}

export const projectPriorities: ProjectPriority[] = ['高', '中', '低'];
export const projectStatuses: ProjectStatus[] = ['未开始', '进行中', '已完成', '验收中', '搁置', '延迟', '催款中'];
export const businessLines: BusinessLine[] = ['外包', '自研', '自运营'];

export const companyEntities = ['中科软艺', '软艺信息', '巴蜀文攻'];
export const employees = ['张三', '李四', '王五', '赵六', '孙七', '周八', '钱九'];
export const roleEmployees = {
  sales: ['张三', '李四', '钱九'],
  product: ['李四', '孙七'],
  ui: ['孙七', '周八'],
  frontend: ['王五', '钱九'],
  backend: ['赵六', '周八'],
};

export const initialProjects: Project[] = [
  {
    id: '1',
    projectNo: 'PRJ202605001',
    name: 'A公司CRM系统开发',
    latestProgress: '完成项目管理底座需求梳理，进入原型确认阶段。',
    priority: '高',
    entity: '中科软艺',
    status: '进行中',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '李四',
    assistants: ['王五'],
    productUsers: ['李四'],
    uiUsers: ['孙七'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    progress: 65,
    startDate: '2026-05-01',
    expectedEndDate: '2026-06-30',
    remark: '客户重点关注销售跟进、客户管理和项目成本统计。',
    attachments: [{ id: 'att-1', name: '项目需求初稿.pdf', size: '1.2MB' }],
    createdAt: '2026-05-01 09:30',
  },
  {
    id: '2',
    projectNo: 'PRJ202605002',
    name: 'B公司小程序定制开发',
    latestProgress: '客户已确认首页和订单流程，等待 UI 终稿。',
    priority: '中',
    entity: '软艺信息',
    status: '验收中',
    businessLine: '外包',
    salesUsers: ['李四'],
    owner: '王五',
    assistants: ['赵六'],
    productUsers: ['孙七'],
    uiUsers: ['周八'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    progress: 90,
    startDate: '2026-04-10',
    expectedEndDate: '2026-05-20',
    remark: '验收阶段重点跟进客户反馈。',
    attachments: [],
    createdAt: '2026-04-10 10:00',
  },
  {
    id: '3',
    projectNo: 'PRJ202605003',
    name: '内部OA流程优化',
    latestProgress: '已完成流程字段盘点，等待排期。',
    priority: '低',
    entity: '中科软艺',
    status: '未开始',
    businessLine: '自研',
    salesUsers: [],
    owner: '赵六',
    assistants: ['孙七'],
    productUsers: ['李四'],
    uiUsers: [],
    frontendUsers: ['钱九'],
    backendUsers: ['周八'],
    progress: 0,
    startDate: '2026-06-01',
    expectedEndDate: '2026-07-15',
    remark: '内部项目，成本核算阶段再接入人工成本。',
    attachments: [],
    createdAt: '2026-05-08 15:20',
  },
];

export const availableLeads: ProjectLeadRelation[] = [
  {
    id: 'lead-1',
    projectId: '',
    leadNo: 'LD202605001',
    leadName: 'A公司CRM系统开发需求',
    owner: '张三',
    preSaleGroupName: 'A公司售前沟通群',
    customerCategory: '企业客户',
    source: '百度推广',
    customerName: '刘经理',
    phone: '13800138000',
    wechat: 'liujingli-a',
    leadCreatedAt: '2026-04-28 10:30',
  },
  {
    id: 'lead-2',
    projectId: '',
    leadNo: 'LD202605002',
    leadName: 'B公司小程序开发咨询',
    owner: '李四',
    preSaleGroupName: 'B公司项目群',
    customerCategory: '中小企业',
    source: '小红书',
    customerName: '陈总',
    phone: '13900139000',
    wechat: 'chen-b',
    leadCreatedAt: '2026-04-09 14:20',
  },
  {
    id: 'lead-3',
    projectId: '',
    leadNo: 'LD202605003',
    leadName: '内部流程系统升级',
    owner: '钱九',
    preSaleGroupName: '内部需求群',
    customerCategory: '内部需求',
    source: '内部转化',
    customerName: '行政部',
    phone: '027-88888888',
    wechat: 'oa-admin',
    leadCreatedAt: '2026-05-06 09:10',
  },
];

export const initialLeadRelations: ProjectLeadRelation[] = [
  { ...availableLeads[0], id: 'relation-1', projectId: '1' },
  { ...availableLeads[1], id: 'relation-2', projectId: '2' },
];

export const initialDailyReports: ProjectDailyReport[] = [
  {
    id: 'daily-1',
    projectId: '1',
    date: '2026-05-08',
    projectName: 'A公司CRM系统开发',
    personName: '李四',
    position: '产品经理',
    hours: 6,
    workContent: '整理项目管理底座字段和详情页结构。',
    riskFeedback: '客户希望后续能看到成本汇总，需要提前预留入口。',
  },
  {
    id: 'daily-2',
    projectId: '1',
    date: '2026-05-08',
    projectName: 'A公司CRM系统开发',
    personName: '王五',
    position: '前端开发工程师',
    hours: 7.5,
    workContent: '评估现有项目页面和日报页面联动方式。',
    riskFeedback: '无',
  },
  {
    id: 'daily-3',
    projectId: '1',
    date: '2026-05-09',
    projectName: 'A公司CRM系统开发',
    personName: '赵六',
    position: '后端开发工程师',
    hours: 5,
    workContent: '梳理后续项目成本接口字段。',
    riskFeedback: '人工成本设置需要财务权限控制。',
  },
  {
    id: 'daily-4',
    projectId: '2',
    date: '2026-05-08',
    projectName: 'B公司小程序定制开发',
    personName: '王五',
    position: '前端开发工程师',
    hours: 4,
    workContent: '修复验收反馈中的订单页面样式问题。',
    riskFeedback: '客户新增两个展示字段。',
  },
];

export const initialFollowUps: ProjectFollowUp[] = [
  {
    id: 'follow-1',
    projectId: '1',
    status: '进行中',
    progress: 65,
    content: '完成项目管理底座需求梳理，进入原型确认阶段。',
    attachments: [{ id: 'follow-att-1', name: '会议纪要.pdf', size: '860KB' }],
    operator: '李四',
    createdAt: '2026-05-09 10:20',
  },
  {
    id: 'follow-2',
    projectId: '1',
    status: '进行中',
    progress: 45,
    content: '客户确认先做项目管理底座，成本核算拆到后续阶段。',
    attachments: [],
    operator: '张三',
    createdAt: '2026-05-08 16:40',
  },
  {
    id: 'follow-3',
    projectId: '2',
    status: '验收中',
    progress: 90,
    content: '客户反馈首页样式需要微调。',
    attachments: [],
    operator: '王五',
    createdAt: '2026-05-08 11:15',
  },
];

export const initialDocuments: ProjectDocument[] = [
  {
    id: 'doc-1',
    projectId: '1',
    title: '项目需求说明书',
    onlineUrl: 'https://example.com/project-a-requirements',
    owner: '李四',
    uploadedFileName: '',
    description: '记录项目范围、模块拆解和客户确认事项。',
    createdAt: '2026-05-08 18:00',
  },
  {
    id: 'doc-2',
    projectId: '1',
    title: '原型确认截图',
    onlineUrl: '',
    owner: '孙七',
    uploadedFileName: '项目原型截图.zip',
    description: '客户确认过的页面截图。',
    createdAt: '2026-05-09 09:40',
  },
];

export function createProjectNo(index: number) {
  return `PRJ202605${String(index + 1).padStart(3, '0')}`;
}

export function calculateProjectHours(projectId: string, reports: ProjectDailyReport[]) {
  return reports
    .filter((report) => report.projectId === projectId)
    .reduce((sum, report) => sum + report.hours, 0);
}

export function buildProjectMemberHours(projectId: string, reports: ProjectDailyReport[]): ProjectMemberHours[] {
  const map = new Map<string, ProjectMemberHours>();

  reports
    .filter((report) => report.projectId === projectId)
    .forEach((report) => {
      const current = map.get(report.personName) ?? {
        key: report.personName,
        personName: report.personName,
        position: report.position,
        hours: 0,
      };
      current.hours += report.hours;
      map.set(report.personName, current);
    });

  return Array.from(map.values());
}

export function summarizeProgress(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}...` : trimmed;
}
```

- [ ] **Step 3: Run build**

Run from `HubX/`:

```bash
npm run build
```

Expected: build exits 0.

- [ ] **Step 4: Commit shared data**

Run from `HubX/`:

```bash
git add src/app/pages/project-management/mockData.ts
git commit -m "feat: add project management mock data"
```

Expected: commit succeeds. If this repository still has no initial commit and the user does not want to commit, record that the commit step was skipped.

---

## Task 2: Project list page

**Files:**
- Modify: `src/app/pages/Projects.tsx`
- Read: `src/app/pages/project-management/mockData.ts`

- [ ] **Step 1: Replace Projects.tsx imports and component**

Replace `src/app/pages/Projects.tsx` with the code in this step.

```tsx
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
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, record: Project) => (
        <Space size="mini">
          <Button type="text" size="mini" icon={<IconEye />} onClick={() => navigate(`/projects/${record.id}`)}>详情</Button>
          <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openEditModal(record)}>编辑</Button>
          <Button type="text" size="mini" icon={<IconSend />} onClick={() => openFollowModal(record)}>跟进</Button>
          <Popconfirm
            title={initialDailyReports.some((report) => report.projectId === record.id) ? '该项目已有关联日报，确认删除项目吗？' : '确认删除该项目吗？'}
            onOk={() => removeProject(record)}
          >
            <Button type="text" size="mini" status="danger" icon={<IconDelete />}>删除</Button>
          </Popconfirm>
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

        <Table columns={columns} data={filteredProjects} rowKey="id" scroll={{ x: 2100 }} pagination={{ pageSize: 10, showTotal: true }} />
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
```

- [ ] **Step 2: Run build**

Run from `HubX/`:

```bash
npm run build
```

Expected: build exits 0. If TypeScript reports an Arco prop type mismatch, adjust the affected prop in `Projects.tsx` and run the same command again.

- [ ] **Step 3: Commit project list**

Run from `HubX/`:

```bash
git add src/app/pages/Projects.tsx
git commit -m "feat: update project registry list"
```

Expected: commit succeeds, unless the user has asked not to commit.

---

## Task 3: Project detail page

**Files:**
- Modify: `src/app/pages/ProjectDetail.tsx`
- Read: `src/app/pages/project-management/mockData.ts`

- [ ] **Step 1: Replace ProjectDetail.tsx**

Replace `src/app/pages/ProjectDetail.tsx` with the code in this step.

```tsx
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
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
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconFile, IconLeft, IconLink, IconPlus, IconSend } from '@arco-design/web-react/icon';
import {
  ProjectDocument,
  ProjectFollowUp,
  ProjectLeadRelation,
  ProjectStatus,
  availableLeads,
  buildProjectMemberHours,
  calculateProjectHours,
  initialDailyReports,
  initialDocuments,
  initialFollowUps,
  initialLeadRelations,
  initialProjects,
  projectStatuses,
  summarizeProgress,
} from './project-management/mockData';

const { Title, Text } = Typography;
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;

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

export function ProjectDetail() {
  const { id = '1' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(initialProjects.find((item) => item.id === id) ?? initialProjects[0]);
  const [leadRelations, setLeadRelations] = useState<ProjectLeadRelation[]>(initialLeadRelations);
  const [followUps, setFollowUps] = useState<ProjectFollowUp[]>(initialFollowUps);
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments);
  const [leadModalVisible, setLeadModalVisible] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  const [leadKeyword, setLeadKeyword] = useState('');
  const [leadForm] = Form.useForm();
  const [followForm] = Form.useForm();
  const [documentForm] = Form.useForm();

  const projectDailyReports = initialDailyReports.filter((report) => report.projectId === project.id);
  const memberHours = buildProjectMemberHours(project.id, initialDailyReports);
  const totalHours = calculateProjectHours(project.id, initialDailyReports);
  const projectLeads = leadRelations.filter((relation) => relation.projectId === project.id);
  const projectFollowUps = followUps.filter((follow) => follow.projectId === project.id);
  const projectDocuments = documents.filter((document) => document.projectId === project.id);

  const filteredAvailableLeads = useMemo(() => {
    const linkedLeadNos = new Set(projectLeads.map((lead) => lead.leadNo));
    return availableLeads.filter((lead) => {
      const keywordMatched = !leadKeyword || lead.leadName.includes(leadKeyword) || lead.leadNo.includes(leadKeyword);
      return keywordMatched && !linkedLeadNos.has(lead.leadNo);
    });
  }, [leadKeyword, projectLeads]);

  const openFollowModal = () => {
    followForm.setFieldsValue({ status: project.status, progress: project.progress });
    setFollowModalVisible(true);
  };

  const saveFollow = () => {
    followForm.validate().then((values) => {
      const attachmentName = values.attachmentName?.trim();
      const nextFollow: ProjectFollowUp = {
        id: `follow-${Date.now()}`,
        projectId: project.id,
        status: values.status,
        progress: values.progress,
        content: values.content,
        attachments: attachmentName ? [{ id: `follow-att-${Date.now()}`, name: attachmentName, size: '模拟文件' }] : [],
        operator: project.owner,
        createdAt: '2026-05-09 11:00',
      };
      setFollowUps([nextFollow, ...followUps]);
      setProject({ ...project, status: values.status, progress: values.progress, latestProgress: summarizeProgress(values.content) });
      setFollowModalVisible(false);
      followForm.resetFields();
      Message.success('跟进记录已新增');
    });
  };

  const saveLeadRelation = () => {
    leadForm.validate().then((values) => {
      const selectedLead = availableLeads.find((lead) => lead.leadNo === values.leadNo);
      if (!selectedLead) return;
      setLeadRelations([
        { ...selectedLead, id: `relation-${Date.now()}`, projectId: project.id },
        ...leadRelations,
      ]);
      setLeadModalVisible(false);
      leadForm.resetFields();
      setLeadKeyword('');
      Message.success('线索已关联到项目');
    });
  };

  const removeLeadRelation = (relationId: string) => {
    setLeadRelations(leadRelations.filter((relation) => relation.id !== relationId));
    Message.success('已解除线索关联');
  };

  const openCreateDocument = () => {
    setEditingDocument(null);
    documentForm.resetFields();
    setDocumentModalVisible(true);
  };

  const openEditDocument = (document: ProjectDocument) => {
    setEditingDocument(document);
    documentForm.setFieldsValue(document as any);
    setDocumentModalVisible(true);
  };

  const saveDocument = () => {
    documentForm.validate().then((values) => {
      const onlineUrl = values.onlineUrl?.trim() ?? '';
      const uploadedFileName = values.uploadedFileName?.trim() ?? '';
      if (!onlineUrl && !uploadedFileName) {
        Message.error('线上地址和上传文档至少填写一个');
        return;
      }

      const nextDocument: ProjectDocument = {
        id: editingDocument?.id ?? `doc-${Date.now()}`,
        projectId: project.id,
        title: values.title,
        onlineUrl,
        owner: values.owner,
        uploadedFileName,
        description: values.description || '',
        createdAt: editingDocument?.createdAt ?? '2026-05-09 11:30',
      };

      setDocuments((current) => {
        if (editingDocument) {
          return current.map((item) => (item.id === editingDocument.id ? nextDocument : item));
        }
        return [nextDocument, ...current];
      });
      setDocumentModalVisible(false);
      documentForm.resetFields();
      Message.success(editingDocument ? '项目文档已更新' : '项目文档已新增');
    });
  };

  const removeDocument = (documentId: string) => {
    setDocuments(documents.filter((document) => document.id !== documentId));
    Message.success('项目文档已删除');
  };

  const memberHourColumns = [
    { title: '编号', width: 80, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: '人员名称', dataIndex: 'personName' },
    { title: '职位', dataIndex: 'position' },
    { title: '已用工时', dataIndex: 'hours', render: (hours: number) => `${hours}H` },
  ];

  const dailyColumns = [
    { title: '日期', dataIndex: 'date', width: 120 },
    { title: '项目名称', dataIndex: 'projectName', width: 180 },
    { title: '人员', dataIndex: 'personName', width: 100 },
    { title: '耗时', dataIndex: 'hours', width: 90, render: (hours: number) => `${hours}H` },
    { title: '工作内容', dataIndex: 'workContent', width: 260 },
    { title: '风险/异常反馈', dataIndex: 'riskFeedback', width: 220 },
  ];

  const leadColumns = [
    { title: '编号', dataIndex: 'leadNo', width: 140 },
    { title: '线索名称', dataIndex: 'leadName', width: 220 },
    { title: '归属人', dataIndex: 'owner', width: 100 },
    { title: '售前群名称', dataIndex: 'preSaleGroupName', width: 160 },
    { title: '客户分类', dataIndex: 'customerCategory', width: 120 },
    { title: '线索来源', dataIndex: 'source', width: 120 },
    { title: '客户称呼', dataIndex: 'customerName', width: 100 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '微信', dataIndex: 'wechat', width: 140 },
    { title: '线索添加时间', dataIndex: 'leadCreatedAt', width: 160 },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: ProjectLeadRelation) => (
        <Popconfirm title="确认解除该线索关联吗？" onOk={() => removeLeadRelation(record.id)}>
          <Button type="text" size="small" status="danger">删除关联</Button>
        </Popconfirm>
      ),
    },
  ];

  const documentColumns = [
    { title: '编号', width: 70, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: '标题', dataIndex: 'title', width: 150 },
    { title: '线上地址', dataIndex: 'onlineUrl', width: 180, render: (value: string) => value || '-' },
    { title: '负责人', dataIndex: 'owner', width: 90 },
    { title: '文档下载', dataIndex: 'uploadedFileName', width: 130, render: (value: string) => value || '-' },
    { title: '文档说明', dataIndex: 'description', width: 180 },
    { title: '添加日期', dataIndex: 'createdAt', width: 140 },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, record: ProjectDocument) => (
        <Space size="mini">
          <Button type="text" size="mini" icon={<IconEdit />} onClick={() => openEditDocument(record)}>编辑</Button>
          <Popconfirm title="确认删除该文档吗？" onOk={() => removeDocument(record.id)}>
            <Button type="text" size="mini" status="danger" icon={<IconDelete />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<IconLeft />} onClick={() => navigate('/projects')}>返回</Button>
          <Title heading={4} style={{ margin: 0 }}>{project.name}</Title>
          {statusBadge(project.status)}
        </Space>
        <Button type="primary" icon={<IconSend />} onClick={openFollowModal}>新增跟进</Button>
      </div>

      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        <Grid.Col span={6}><Card><Statistic title="总进度" value={project.progress} suffix="%" /><Progress percent={project.progress} size="small" /></Card></Grid.Col>
        <Grid.Col span={6}><Card><Statistic title="负责人" value={project.owner} /></Card></Grid.Col>
        <Grid.Col span={6}><Card><Statistic title="预计结束日期" value={project.expectedEndDate || '-'} /></Card></Grid.Col>
        <Grid.Col span={6}><Card><Statistic title="已用总工时" value={totalHours} suffix="H" /></Card></Grid.Col>
      </Grid.Row>

      <Alert type="info" style={{ marginBottom: 16 }} content="成本核算将在后续阶段接入人工成本设置、项目报销、投放日消耗、回款和利润分析；当前阶段先沉淀项目工时入口。" />

      <Grid.Row gutter={16} align="start">
        <Grid.Col span={16}>
          <Card>
            <Tabs defaultActiveTab="basic">
              <TabPane key="basic" title="基础信息">
                <Descriptions
                  column={2}
                  data={[
                    { label: '编号', value: project.projectNo },
                    { label: '项目名称', value: project.name },
                    { label: '总进度', value: `${project.progress}%` },
                    { label: '对接主体', value: project.entity || '-' },
                    { label: '优先级', value: project.priority },
                    { label: '状态', value: project.status },
                    { label: '业务线', value: project.businessLine },
                    { label: '最新进展', value: project.latestProgress },
                    { label: '添加时间', value: project.createdAt },
                    { label: '负责人', value: project.owner },
                    { label: '销售人员', value: project.salesUsers.join('、') || '-' },
                    { label: '协助人', value: project.assistants.join('、') || '-' },
                    { label: '产品', value: project.productUsers.join('、') || '-' },
                    { label: 'UI', value: project.uiUsers.join('、') || '-' },
                    { label: '前端', value: project.frontendUsers.join('、') || '-' },
                    { label: '后端', value: project.backendUsers.join('、') || '-' },
                    { label: '开始日期', value: project.startDate || '-' },
                    { label: '预计结束日期', value: project.expectedEndDate || '-' },
                    { label: '备注', value: project.remark || '-' },
                  ]}
                />
                <Divider orientation="left">附件列表</Divider>
                {project.attachments.length ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {project.attachments.map((file) => <Tag key={file.id} icon={<IconFile />}>{file.name} · {file.size}</Tag>)}
                  </Space>
                ) : <Empty description="暂无附件" />}
              </TabPane>

              <TabPane key="leads" title={`关联线索 (${projectLeads.length})`}>
                <div className="flex justify-end" style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<IconLink />} onClick={() => setLeadModalVisible(true)}>关联线索</Button>
                </div>
                <Table columns={leadColumns} data={projectLeads} rowKey="id" scroll={{ x: 1600 }} pagination={false} />
              </TabPane>

              <TabPane key="customers" title="关联客户">
                <Empty description="关联客户将在后续客户模块联动阶段实现" />
              </TabPane>

              <TabPane key="daily" title={`关联日报 (${projectDailyReports.length})`}>
                <Title heading={6}>总工时列表</Title>
                <Table
                  columns={memberHourColumns}
                  data={memberHours}
                  rowKey="key"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={3}>总计</Table.Summary.Cell>
                      <Table.Summary.Cell>{totalHours}H</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
                <Title heading={6} style={{ marginTop: 24 }}>日报列表</Title>
                <Table columns={dailyColumns} data={projectDailyReports} rowKey="id" scroll={{ x: 1000 }} pagination={false} />
              </TabPane>
            </Tabs>
          </Card>
        </Grid.Col>

        <Grid.Col span={8}>
          <Card title="跟进记录" style={{ marginBottom: 16 }} extra={<Button type="text" icon={<IconPlus />} onClick={openFollowModal}>新增</Button>}>
            <Timeline>
              {projectFollowUps.map((follow) => (
                <Timeline.Item key={follow.id} label={follow.createdAt}>
                  <Space size="mini" style={{ marginBottom: 6 }}>{statusBadge(follow.status)}<Tag>{follow.progress}%</Tag><Text type="secondary">{follow.operator}</Text></Space>
                  <div>{follow.content}</div>
                  {follow.attachments.map((file) => <Tag key={file.id} icon={<IconFile />} style={{ marginTop: 6 }}>{file.name}</Tag>)}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          <Card title="项目文档" extra={<Button type="text" icon={<IconPlus />} onClick={openCreateDocument}>添加文档</Button>}>
            <Table columns={documentColumns} data={projectDocuments} rowKey="id" scroll={{ x: 960 }} pagination={false} />
          </Card>
        </Grid.Col>
      </Grid.Row>

      <Modal title="添加跟进" visible={followModalVisible} onOk={saveFollow} onCancel={() => setFollowModalVisible(false)} style={{ width: 620 }} maskClosable={false}>
        <Form form={followForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><FormItem label="状态" field="status" rules={[{ required: true, message: '请选择状态' }]}><Select>{projectStatuses.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={12}><FormItem label="总进度" field="progress" rules={[{ required: true, message: '请输入总进度' }]}><InputNumber min={0} max={100} precision={0} suffix="%" style={{ width: '100%' }} /></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="跟进详情" field="content" rules={[{ required: true, message: '请输入跟进详情' }]}><Input.TextArea rows={4} /></FormItem>
          <FormItem label="附件上传" field="attachmentName"><Input placeholder="第一版模拟上传，填写附件名称" /></FormItem>
        </Form>
      </Modal>

      <Modal title="关联线索" visible={leadModalVisible} onOk={saveLeadRelation} onCancel={() => setLeadModalVisible(false)} style={{ width: 680 }} maskClosable={false}>
        <Form form={leadForm} layout="vertical">
          <Input.Search placeholder="输入标题或编号搜索线索" value={leadKeyword} onChange={setLeadKeyword} style={{ marginBottom: 16 }} />
          <FormItem label="选择线索" field="leadNo" rules={[{ required: true, message: '请选择线索' }]}>
            <Select placeholder="请选择线索">
              {filteredAvailableLeads.map((lead) => <Select.Option key={lead.leadNo} value={lead.leadNo}>{lead.leadNo} - {lead.leadName}</Select.Option>)}
            </Select>
          </FormItem>
        </Form>
      </Modal>

      <Modal title={editingDocument ? '编辑文档' : '添加文档'} visible={documentModalVisible} onOk={saveDocument} onCancel={() => setDocumentModalVisible(false)} style={{ width: 620 }} maskClosable={false}>
        <Form form={documentForm} layout="vertical">
          <FormItem label="标题" field="title" rules={[{ required: true, message: '请输入标题' }]}><Input /></FormItem>
          <FormItem label="线上地址" field="onlineUrl"><Input placeholder="请输入线上文档地址" /></FormItem>
          <FormItem label="负责人" field="owner" rules={[{ required: true, message: '请选择负责人' }]}><Select>{[project.owner, ...project.assistants, ...project.productUsers, ...project.uiUsers, ...project.frontendUsers, ...project.backendUsers].filter(Boolean).map((user) => <Select.Option key={user} value={user}>{user}</Select.Option>)}</Select></FormItem>
          <FormItem label="上传文档" field="uploadedFileName"><Input placeholder="第一版模拟上传，填写文件名" /></FormItem>
          <FormItem label="文档说明" field="description"><Input.TextArea rows={3} /></FormItem>
        </Form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

Run from `HubX/`:

```bash
npm run build
```

Expected: build exits 0. If `Table.Summary` is unavailable in this Arco version, replace the summary block with a small `<div style={{ marginTop: 12, textAlign: 'right', fontWeight: 600 }}>总计：{totalHours}H</div>` below the member-hours table and rerun the build.

- [ ] **Step 3: Commit detail page**

Run from `HubX/`:

```bash
git add src/app/pages/ProjectDetail.tsx
git commit -m "feat: update project detail workspace"
```

Expected: commit succeeds, unless the user has asked not to commit.

---

## Task 4: Full verification and browser check

**Files:**
- Modify only if verification finds defects:
  - `src/app/pages/Projects.tsx`
  - `src/app/pages/ProjectDetail.tsx`
  - `src/app/pages/project-management/mockData.ts`

- [ ] **Step 1: Run production build**

Run from `HubX/`:

```bash
npm run build
```

Expected: build exits 0.

- [ ] **Step 2: Start development server**

Run from `HubX/`:

```bash
npm run dev -- --host 0.0.0.0
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 3: Verify project list in browser**

Open `/projects` and verify:

- Project table shows: 编号、项目名称、负责人、销售、对接主体、最新进展、业务线、优先级、状态、开始日期、预计结束日期、总进度、添加时间.
- Search by project name filters rows.
- 负责人 filter filters rows.
- 优先级 filter filters rows.
- 状态 filter filters rows.
- 新建项目 opens modal.
- Submitting without 项目名称, 优先级, 状态, or 负责人 shows validation errors.
- Valid new project appears in the table.
- 编辑 updates the row.
- 跟进 updates 最新进展、状态、总进度.
- 删除 opens confirmation; cancel keeps the row; confirm removes the row.

- [ ] **Step 4: Verify project detail in browser**

Open `/projects/1` and verify:

- Top summary shows project name, status, progress, owner, expected end date, total hours, and cost-entry explanation.
- 基础信息 tab shows project fields and attachment list.
- 关联线索 tab shows linked leads.
- 关联线索 modal filters by title or lead number and adds a selected lead.
- 删除关联 removes the relation only from the table.
- 关联客户 tab shows the first-version explanation.
- 关联日报 tab shows member-hour summary first and daily report table second.
- 右侧跟进记录 shows timeline entries.
- 新增跟进 adds a timeline entry and updates top status/progress/latest progress.
- 项目文档 table shows documents.
- 添加文档 rejects submit when title or owner is missing.
- 添加文档 rejects submit when both online URL and uploaded file name are empty.
- Valid document appears in the document table.
- 编辑文档 updates the table.
- 删除文档 removes the table row after confirmation.

- [ ] **Step 5: Fix defects found by verification**

For each defect, make the smallest change in the affected file, then rerun:

```bash
npm run build
```

Expected after each fix: build exits 0.

- [ ] **Step 6: Commit verification fixes**

If verification required fixes, run from `HubX/`:

```bash
git add src/app/pages/Projects.tsx src/app/pages/ProjectDetail.tsx src/app/pages/project-management/mockData.ts
git commit -m "fix: polish project management prototype"
```

Expected: commit succeeds. If no files changed during verification, skip this commit.

---

## Self-Review

- Spec coverage: Tasks cover the project registry list, required list fields, filters, list actions, project detail tabs, right-side follow-up/document areas, follow-up synchronization, lead relation management, daily report hour summary, customer relation first-version explanation, project documents, cost-entry explanation, build validation, and browser verification.
- Scope check: The plan implements only the project management foundation. It does not implement artificial labor cost, reimbursement, ad daily spend, profit, or payment-loop logic, matching the approved first sub-project.
- Placeholder scan: No TBD/TODO/fill-in steps remain. The plan includes exact files, exact commands, expected outcomes, and concrete code for the implementation tasks.
- Type consistency: `Project`, `ProjectFollowUp`, `ProjectLeadRelation`, `ProjectDailyReport`, and `ProjectDocument` are defined once in `mockData.ts` and used consistently by both pages.
