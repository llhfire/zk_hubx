import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  Message,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Project } from './mockData';
import {
  getProjectTasks,
  getProjectTaskSummary,
  PROJECT_TASK_TYPES,
  type ProjectTaskPriority,
  type ProjectTaskStatus,
  type ProjectWorkTask,
} from './projectTasks';

const FormItem = Form.Item;
const { Text } = Typography;
const TASK_STATUSES: ProjectTaskStatus[] = ['未开始', '进行中', '已完成', '已搁置', '已逾期', '已取消'];
const TASK_PRIORITIES: ProjectTaskPriority[] = ['高', '中', '低'];
const TASK_NEXT_STATUSES: Record<Exclude<ProjectTaskStatus, '已完成' | '已取消'>, ProjectTaskStatus[]> = {
  未开始: ['进行中', '已搁置', '已取消'],
  进行中: ['已完成', '已搁置', '已逾期', '已取消'],
  已搁置: ['进行中', '已取消'],
  已逾期: ['进行中', '已完成', '已取消'],
};
const priorityColor: Record<ProjectTaskPriority, string> = { 高: 'red', 中: 'orange', 低: 'gray' };
const statusColor: Record<ProjectTaskStatus, string> = { 未开始: 'gray', 进行中: 'arcoblue', 已完成: 'green', 已搁置: 'orange', 已逾期: 'red', 已取消: 'gray' };

export function ProjectTaskPanel({ project }: { project: Project }) {
  const [tasks, setTasks] = useState<ProjectWorkTask[]>(() => getProjectTasks(project.id));
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectTaskStatus>();
  const [assigneeFilter, setAssigneeFilter] = useState<string>();
  const [createVisible, setCreateVisible] = useState(false);
  const [flowVisible, setFlowVisible] = useState(false);
  const [detailTask, setDetailTask] = useState<ProjectWorkTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectWorkTask | null>(null);
  const [createForm] = Form.useForm();
  const [flowForm] = Form.useForm();
  const descriptionEditorRef = useRef<ReactQuill>(null);
  const descriptionImageInputRef = useRef<HTMLInputElement>(null);
  const members = Array.from(new Set([project.owner, ...project.assistants, ...project.productUsers, ...project.uiUsers, ...project.frontendUsers, ...project.backendUsers, ...project.opsUsers, ...project.testUsers].filter(Boolean)));
  const summary = useMemo(() => getProjectTaskSummary(project, tasks), [project, tasks]);
  const filteredTasks = useMemo(() => tasks.filter((task) => (
    (!keyword || task.title.includes(keyword) || task.type.includes(keyword) || task.status.includes(keyword))
    && (!statusFilter || task.status === statusFilter)
    && (!assigneeFilter || task.assignee === assigneeFilter)
  )), [assigneeFilter, keyword, statusFilter, tasks]);

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ priority: '中', assignee: project.owner, collaborators: [], plannedEndDate: '' });
    setCreateVisible(true);
  };

  const openDescriptionImagePicker = () => descriptionImageInputRef.current?.click();

  const insertDescriptionImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const editor = descriptionEditorRef.current?.getEditor();
      if (!editor || typeof reader.result !== 'string') return;
      const range = editor.getSelection(true);
      const index = range?.index ?? editor.getLength();
      editor.insertEmbed(index, 'image', reader.result, 'user');
      editor.setSelection(index + 1, 0);
    };
    reader.readAsDataURL(file);
  };

  const descriptionEditorModules = useMemo(() => ({
    toolbar: {
      container: [[{ header: [1, 2, false] }], ['bold', 'italic', 'underline', 'strike'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']],
      handlers: { image: openDescriptionImagePicker },
    },
  }), []);

  const createTask = () => {
    createForm.validate().then((values) => {
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      const task: ProjectWorkTask = {
        id: `project-task-${Date.now()}`, projectId: project.id, title: values.title.trim(), type: values.type, priority: values.priority,
        status: values.status, assignee: values.assignee, collaborators: values.collaborators || [], plannedEndDate: values.plannedEndDate.trim(),
        progress: values.status === '已完成' ? 100 : 0, description: values.description.trim(),
        logs: [{ id: `project-task-log-${Date.now()}`, status: values.status, operator: project.owner, assignee: values.assignee, progress: values.status === '已完成' ? 100 : 0, time: now, comment: '已创建并分派任务。' }],
      };
      setTasks((current) => [task, ...current]);
      setCreateVisible(false);
      Message.success('任务已创建并分派');
    });
  };

  const openFlow = (task: ProjectWorkTask) => {
    if (task.status === '已完成' || task.status === '已取消') return;
    setSelectedTask(task);
    flowForm.setFieldsValue({ status: TASK_NEXT_STATUSES[task.status][0], assignee: task.assignee, progress: task.progress, comment: '' });
    setFlowVisible(true);
  };

  const saveFlow = () => {
    if (!selectedTask) return;
    flowForm.validate().then((values) => {
      const status = values.status as ProjectTaskStatus;
      const progress = status === '已完成' ? 100 : values.progress;
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      setTasks((current) => current.map((task) => task.id !== selectedTask.id ? task : {
        ...task, status, assignee: values.assignee, progress,
        logs: [...task.logs, { id: `project-task-log-${Date.now()}`, status, operator: selectedTask.assignee, assignee: values.assignee, progress, time: now, comment: values.comment?.trim() || `任务已流转至${status}。` }],
      }));
      setFlowVisible(false);
      setSelectedTask(null);
      Message.success('任务状态已更新');
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="flex items-center justify-between">
        <div><Text style={{ fontSize: 16, fontWeight: 600 }}>任务分派</Text><Text type="secondary" style={{ marginLeft: 8 }}>将项目拆分为可执行任务，并明确处理责任</Text></div>
        <Button type="primary" icon={<IconPlus />} onClick={openCreate}>新建任务</Button>
      </div>
      <div className="project-task-statistics">
        <Card className="project-statistic-card"><Text type="secondary">全部任务</Text><Text className="project-statistic-value">{summary.totalCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">未开始</Text><Text className="project-statistic-value">{summary.pendingCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">进行中</Text><Text className="project-statistic-value">{summary.inProgressCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">逾期</Text><Text className="project-statistic-value" style={{ color: summary.overdueCount ? 'rgb(var(--red-6))' : undefined }}>{summary.overdueCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">已完成</Text><Text className="project-statistic-value">{summary.completedCount}</Text></Card>
      </div>
      <Card bodyStyle={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input value={keyword} onChange={setKeyword} allowClear placeholder="搜索任务名称、类型或状态" style={{ width: 220 }} />
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="状态" style={{ width: 130 }}>{TASK_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
          <Select value={assigneeFilter} onChange={setAssigneeFilter} allowClear placeholder="处理人" style={{ width: 130 }}>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
          <Button onClick={() => { setKeyword(''); setStatusFilter(undefined); setAssigneeFilter(undefined); }}>重置</Button>
        </Space>
        <Table
          rowKey="id" pagination={false} data={filteredTasks} scroll={{ x: 1100 }}
          columns={[
            { title: '任务名称', dataIndex: 'title', width: 250, render: (value: string, task: ProjectWorkTask) => <Button type="text" style={{ padding: 0 }} onClick={() => setDetailTask(task)}>{value}</Button> },
            { title: '任务类型', dataIndex: 'type', width: 120 },
            { title: '优先级', dataIndex: 'priority', width: 90, render: (value: ProjectTaskPriority) => <Tag color={priorityColor[value]}>{value}</Tag> },
            { title: '状态', dataIndex: 'status', width: 100, render: (value: ProjectTaskStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
            { title: '处理人', dataIndex: 'assignee', width: 100 },
            { title: '计划完成', dataIndex: 'plannedEndDate', width: 120 },
            { title: '进度', dataIndex: 'progress', width: 130, render: (value: number) => <Progress percent={value} size="small" /> },
            { title: '操作', width: 130, fixed: 'right' as const, render: (_: unknown, task: ProjectWorkTask) => <Space size="mini"><Button type="text" size="mini" onClick={() => setDetailTask(task)}>详情</Button>{task.status !== '已完成' && task.status !== '已取消' && <Button type="text" size="mini" onClick={() => openFlow(task)}>流转</Button>}</Space> },
          ]}
        />
      </Card>

      <Modal title="新建并分派任务" visible={createVisible} onOk={createTask} onCancel={() => setCreateVisible(false)} style={{ width: 760 }} bodyStyle={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }} maskClosable={false}>
        <Form form={createForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={10}><FormItem label="任务名称" field="title" rules={[{ required: true, message: '请输入任务名称' }]}><Input maxLength={100} placeholder="例如：客户管理列表筛选交互开发" /></FormItem></Grid.Col>
            <Grid.Col span={7}><FormItem label="任务类型" field="type" rules={[{ required: true, message: '请选择任务类型' }]}><Select placeholder="请选择">{PROJECT_TASK_TYPES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={7}><FormItem label="任务状态" field="status" rules={[{ required: true, message: '请选择任务状态' }]}><Select placeholder="请选择">{TASK_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={6}><FormItem label="优先级" field="priority" rules={[{ required: true, message: '请选择优先级' }]}><Select>{TASK_PRIORITIES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="处理人" field="assignee" rules={[{ required: true, message: '请选择处理人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="计划完成日期" field="plannedEndDate" rules={[{ required: true, message: '请输入计划完成日期' }]}><Input placeholder="2026-08-05" /></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="协作人" field="collaborators"><Select mode="multiple" allowClear placeholder="可选，仅限项目成员">{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="任务说明" field="description" rules={[{ required: true, message: '请输入任务说明' }]}>
            <ReactQuill ref={descriptionEditorRef} className="project-task-description-editor" modules={descriptionEditorModules} placeholder="说明交付内容、范围或验收要点，可通过工具栏插入截图" />
          </FormItem>
          <input ref={descriptionImageInputRef} type="file" accept="image/*" onChange={insertDescriptionImage} style={{ display: 'none' }} />
        </Form>
      </Modal>

      <Modal title={`任务流转：${selectedTask?.title || ''}`} visible={flowVisible} onOk={saveFlow} onCancel={() => setFlowVisible(false)} style={{ width: 560 }} maskClosable={false}>
        {selectedTask && <div className="project-task-flow-current"><Text type="secondary">当前状态</Text><Tag color={statusColor[selectedTask.status]}>{selectedTask.status}</Tag><Text type="secondary">当前处理人</Text><Text>{selectedTask.assignee}</Text><Text type="secondary">当前进度</Text><Text>{selectedTask.progress}%</Text></div>}
        <Form form={flowForm} layout="vertical">
          <FormItem label="下一步状态" field="status" rules={[{ required: true, message: '请选择下一步状态' }]}><Select>{selectedTask && selectedTask.status !== '已完成' && selectedTask.status !== '已取消' && TASK_NEXT_STATUSES[selectedTask.status].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="下一步处理人" field="assignee" rules={[{ required: true, message: '请选择下一步处理人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="任务进度" field="progress" rules={[{ required: true, message: '请输入任务进度' }]}><InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} /></FormItem>
          <FormItem label="进度说明" field="comment"><Input.TextArea rows={3} placeholder="例如：接口联调完成，提交测试验收" /></FormItem>
        </Form>
      </Modal>

      <Drawer title="任务详情与处理记录" visible={detailTask !== null} width={680} onCancel={() => setDetailTask(null)} footer={null}>
        {detailTask && <div className="project-task-detail">
          <div className="project-task-detail-summary"><Text className="project-task-detail-title">{detailTask.title}</Text><Space size="small" style={{ marginTop: 8 }}><Tag color={priorityColor[detailTask.priority]}>{detailTask.priority}</Tag><Tag color={statusColor[detailTask.status]}>{detailTask.status}</Tag></Space><Progress percent={detailTask.progress} style={{ marginTop: 16 }} /></div>
          <section className="project-task-detail-section"><Text className="project-task-detail-section-title">任务信息</Text><Descriptions column={2} data={[{ label: '任务类型', value: detailTask.type }, { label: '任务状态', value: detailTask.status }, { label: '处理人', value: detailTask.assignee }, { label: '协作人', value: detailTask.collaborators.join('、') || '-' }, { label: '计划完成', value: detailTask.plannedEndDate }]} /></section>
          <section className="project-task-detail-section"><Text className="project-task-detail-section-title">任务说明</Text><div className="project-task-detail-description"><ReactQuill theme="bubble" readOnly value={detailTask.description} /></div></section>
          <section className="project-task-detail-section"><Text className="project-task-detail-section-title">处理记录</Text><Timeline className="project-task-detail-timeline">{detailTask.logs.map((log) => <Timeline.Item key={log.id} label={log.time}><div className="project-task-detail-log-title"><Tag color={statusColor[log.status]}>{log.status}</Tag><Text>进度 {log.progress}%</Text></div><div className="project-task-detail-log-meta">操作人：{log.operator} · 下一步处理人：{log.assignee}</div><div className="project-task-detail-log-comment">{log.comment}</div></Timeline.Item>)}</Timeline></section>
        </div>}
      </Drawer>
    </Space>
  );
}
