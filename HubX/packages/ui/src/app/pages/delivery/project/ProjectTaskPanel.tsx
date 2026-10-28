import { useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from 'react';
import {
  Button,
  Drawer,
  Form,
  FormGrid,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Space,
  Timeline,
  Typography,
} from '@/design-system';
import { IconPlus } from '@/design-system';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  MetricGrid,
  RichTextEditor,
  SectionCard,
  StatusTag,
  resolveStatus,
  type RichTextEditorHandle,
  type StatusMap,
  ProgressBar,
} from '@/design-system';
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
const TASK_STATUS_META: StatusMap<ProjectTaskStatus> = {
  未开始: { label: '未开始', tone: 'neutral' },
  进行中: { label: '进行中', tone: 'info' },
  已完成: { label: '已完成', tone: 'success' },
  已搁置: { label: '已搁置', tone: 'warning' },
  已逾期: { label: '已逾期', tone: 'danger' },
  已取消: { label: '已取消', tone: 'neutral' },
};
const TASK_PRIORITY_META: StatusMap<ProjectTaskPriority> = {
  高: { label: '高', tone: 'danger' },
  中: { label: '中', tone: 'warning' },
  低: { label: '低', tone: 'neutral' },
};

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
  const descriptionEditorRef = useRef<RichTextEditorHandle>(null);
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
        <div><Text style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>任务分派</Text><Text type="secondary" style={{ marginLeft: 8 }}>将项目拆分为可执行任务，并明确处理责任</Text></div>
        <Button type="primary" icon={<IconPlus />} onClick={openCreate}>新建任务</Button>
      </div>
      <MetricGrid
        items={[
          { key: 'total', label: '全部任务', value: summary.totalCount },
          { key: 'pending', label: '未开始', value: summary.pendingCount },
          { key: 'in_progress', label: '进行中', value: summary.inProgressCount },
          { key: 'overdue', label: '逾期', value: summary.overdueCount, tone: summary.overdueCount ? 'danger' : undefined },
          { key: 'completed', label: '已完成', value: summary.completedCount },
        ]}
      />
      <SectionCard>
        <DataTable
          rowKey="id"
          pagination={false}
          data={filteredTasks}
          scroll={{ x: 1100 }}
          toolbar={(
            <>
              <Input value={keyword} onChange={setKeyword} allowClear placeholder="搜索任务名称、类型或状态" style={{ width: 220 }} />
              <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="状态" style={{ width: 130 }}>{TASK_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
              <Select value={assigneeFilter} onChange={setAssigneeFilter} allowClear placeholder="处理人" style={{ width: 130 }}>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
              <Button onClick={() => { setKeyword(''); setStatusFilter(undefined); setAssigneeFilter(undefined); }}>重置</Button>
            </>
          )}
          emptyDescription="没有符合当前条件的任务"
          columns={[
            { title: '任务名称', dataIndex: 'title', width: 250, render: (value: string, task: ProjectWorkTask) => <Button type="text" style={{ padding: 0 }} onClick={() => setDetailTask(task)}>{value}</Button> },
            { title: '任务类型', dataIndex: 'type', width: 120 },
            { title: '优先级', dataIndex: 'priority', width: 90, render: (value: ProjectTaskPriority) => <StatusTag meta={resolveStatus(TASK_PRIORITY_META, value)} /> },
            { title: '状态', dataIndex: 'status', width: 100, render: (value: ProjectTaskStatus) => <StatusTag meta={resolveStatus(TASK_STATUS_META, value)} /> },
            { title: '处理人', dataIndex: 'assignee', width: 100 },
            { title: '计划完成', dataIndex: 'plannedEndDate', width: 120, render: (value: string) => <DateText value={value} /> },
            { title: '进度', dataIndex: 'progress', width: 130, render: (value: number) => <ProgressBar percent={value} /> },
            { title: '操作', width: 130, fixed: 'right' as const, render: (_: unknown, task: ProjectWorkTask) => <Space size="mini"><Button type="text" size="mini" onClick={() => setDetailTask(task)}>详情</Button>{task.status !== '已完成' && task.status !== '已取消' && <Button type="text" size="mini" onClick={() => openFlow(task)}>流转</Button>}</Space> },
          ]}
        />
      </SectionCard>

      <Modal className="hubx-modal" title="新建并分派任务" visible={createVisible} onOk={createTask} onCancel={() => setCreateVisible(false)} style={{ width: 760, '--modal-content-max-height': 'calc(100vh - 220px)', '--modal-content-overflow': 'auto' } as CSSProperties} maskClosable={false}>
        <Form form={createForm} layout="vertical">
          <FormGrid columns={3}>
            <FormItem label="任务名称" field="title" rules={[{ required: true, message: '请输入任务名称' }]}><Input maxLength={100} placeholder="例如：客户管理列表筛选交互开发" /></FormItem>
            <FormItem label="任务类型" field="type" rules={[{ required: true, message: '请选择任务类型' }]}><Select placeholder="请选择">{PROJECT_TASK_TYPES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
            <FormItem label="任务状态" field="status" rules={[{ required: true, message: '请选择任务状态' }]}><Select placeholder="请选择">{TASK_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          </FormGrid>
          <FormGrid columns={3}>
            <FormItem label="优先级" field="priority" rules={[{ required: true, message: '请选择优先级' }]}><Select>{TASK_PRIORITIES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
            <FormItem label="处理人" field="assignee" rules={[{ required: true, message: '请选择处理人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
            <FormItem label="计划完成日期" field="plannedEndDate" rules={[{ required: true, message: '请输入计划完成日期' }]}><Input placeholder="2026-08-05" /></FormItem>
          </FormGrid>
          <FormItem label="协作人" field="collaborators"><Select mode="multiple" allowClear placeholder="可选，仅限项目成员">{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="任务说明" field="description" rules={[{ required: true, message: '请输入任务说明' }]}>
            <RichTextEditor ref={descriptionEditorRef} className="project-task-description-editor" modules={descriptionEditorModules} placeholder="说明交付内容、范围或验收要点，可通过工具栏插入截图" />
          </FormItem>
          <input ref={descriptionImageInputRef} type="file" accept="image/*" onChange={insertDescriptionImage} style={{ display: 'none' }} />
        </Form>
      </Modal>

      <Modal title={`任务流转：${selectedTask?.title || ''}`} visible={flowVisible} onOk={saveFlow} onCancel={() => setFlowVisible(false)} style={{ width: 560 }} maskClosable={false}>
        {selectedTask && <div className="project-task-flow-current"><Text type="secondary">当前状态</Text><StatusTag meta={resolveStatus(TASK_STATUS_META, selectedTask.status)} /><Text type="secondary">当前处理人</Text><Text>{selectedTask.assignee}</Text><Text type="secondary">当前进度</Text><Text>{selectedTask.progress}%</Text></div>}
        <Form form={flowForm} layout="vertical">
          <FormItem label="下一步状态" field="status" rules={[{ required: true, message: '请选择下一步状态' }]}><Select>{selectedTask && selectedTask.status !== '已完成' && selectedTask.status !== '已取消' && TASK_NEXT_STATUSES[selectedTask.status].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="下一步处理人" field="assignee" rules={[{ required: true, message: '请选择下一步处理人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="任务进度" field="progress" rules={[{ required: true, message: '请输入任务进度' }]}><InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} /></FormItem>
          <FormItem label="进度说明" field="comment"><Input.TextArea rows={3} placeholder="例如：接口联调完成，提交测试验收" /></FormItem>
        </Form>
      </Modal>

      <Drawer title="任务详情与处理记录" visible={detailTask !== null} width={680} onCancel={() => setDetailTask(null)} footer={null}>
        {detailTask && <div className="project-task-detail">
          <div className="project-task-detail-summary"><Text className="project-task-detail-title">{detailTask.title}</Text><Space size="small" style={{ marginTop: 8 }}><StatusTag meta={resolveStatus(TASK_PRIORITY_META, detailTask.priority)} /><StatusTag meta={resolveStatus(TASK_STATUS_META, detailTask.status)} /></Space><div style={{ marginTop: 16 }}><ProgressBar percent={detailTask.progress} /></div></div>
          <section className="project-task-detail-section"><Text className="project-task-detail-section-title">任务信息</Text><DescriptionsCard columns={2} items={[{ key: 'type', label: '任务类型', value: detailTask.type }, { key: 'status', label: '任务状态', value: detailTask.status }, { key: 'assignee', label: '处理人', value: detailTask.assignee }, { key: 'collaborators', label: '协作人', value: detailTask.collaborators.join('、') || '-' }, { key: 'plannedEndDate', label: '计划完成', value: <DateText value={detailTask.plannedEndDate} /> }]} /></section>
          <section className="project-task-detail-section"><Text className="project-task-detail-section-title">任务说明</Text><div className="project-task-detail-description"><RichTextEditor theme="bubble" readOnly value={detailTask.description} /></div></section>
          <section className="project-task-detail-section"><Text className="project-task-detail-section-title">处理记录</Text><Timeline className="project-task-detail-timeline">{detailTask.logs.map((log) => <Timeline.Item key={log.id} label={log.time}><div className="project-task-detail-log-title"><StatusTag meta={resolveStatus(TASK_STATUS_META, log.status)} /><Text>进度 {log.progress}%</Text></div><div className="project-task-detail-log-meta">操作人：{log.operator} · 下一步处理人：{log.assignee}</div><div className="project-task-detail-log-comment">{log.comment}</div></Timeline.Item>)}</Timeline></section>
        </div>}
      </Drawer>
    </Space>
  );
}
