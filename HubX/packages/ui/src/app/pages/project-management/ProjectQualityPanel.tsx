import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { RichTextEditor, type RichTextEditorHandle } from '@/app/components/ui';
import type { Project } from './mockData';
import {
  getProjectBugs,
  getProjectBugSummary,
  type BugPriority,
  type BugStatus,
  type ProjectBug,
} from './projectQuality';

const FormItem = Form.Item;
const { Text } = Typography;
const BUG_STATUSES: BugStatus[] = ['新建', '修复中', '待验证', '已关闭'];
const BUG_NEXT_STATUSES: Record<Exclude<BugStatus, '已关闭'>, BugStatus[]> = {
  新建: ['修复中'],
  修复中: ['待验证'],
  待验证: ['已关闭', '修复中'],
};
const BUG_PRIORITIES: BugPriority[] = ['P0', 'P1', 'P2', 'P3'];
const priorityColor: Record<BugPriority, string> = { P0: 'red', P1: 'orangered', P2: 'orange', P3: 'gray' };
const statusColor: Record<BugStatus, string> = { 新建: 'red', 修复中: 'arcoblue', 待验证: 'orange', 已关闭: 'green' };

export function ProjectQualityPanel({ project }: { project: Project }) {
  const [bugs, setBugs] = useState<ProjectBug[]>(() => getProjectBugs(project.id));
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BugStatus>();
  const [assigneeFilter, setAssigneeFilter] = useState<string>();
  const [createVisible, setCreateVisible] = useState(false);
  const [flowVisible, setFlowVisible] = useState(false);
  const [detailBug, setDetailBug] = useState<ProjectBug | null>(null);
  const [selectedBug, setSelectedBug] = useState<ProjectBug | null>(null);
  const [createForm] = Form.useForm();
  const [flowForm] = Form.useForm();
  const descriptionEditorRef = useRef<RichTextEditorHandle>(null);
  const descriptionImageInputRef = useRef<HTMLInputElement>(null);
  const members = Array.from(new Set([project.owner, ...project.productUsers, ...project.frontendUsers, ...project.backendUsers, ...project.testUsers].filter(Boolean)));
  const summary = useMemo(() => getProjectBugSummary(project, bugs), [bugs, project]);
  const filteredBugs = useMemo(() => bugs.filter((bug) => (
    (!keyword || bug.title.includes(keyword) || bug.module.includes(keyword))
    && (!statusFilter || bug.status === statusFilter)
    && (!assigneeFilter || bug.assignee === assigneeFilter)
  )), [assigneeFilter, bugs, keyword, statusFilter]);

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ priority: 'P2', assignee: members[0], reporter: project.owner, environment: '测试环境' });
    setCreateVisible(true);
  };

  const createBug = () => {
    createForm.validate().then((values) => {
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      const bug: ProjectBug = {
        id: `bug-${Date.now()}`, projectId: project.id, title: values.title.trim(), module: values.module.trim(),
        priority: values.priority, status: '新建', reporter: values.reporter, assignee: values.assignee,
        environment: values.environment, description: values.description.trim(),
        flowLogs: [{ id: `bug-log-${Date.now()}`, status: '新建', operator: values.reporter, assignee: values.assignee, time: now, comment: '新建 Bug。' }],
      };
      setBugs((current) => [bug, ...current]);
      setCreateVisible(false);
      Message.success('Bug 已创建');
    });
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
      editor.insertEmbed(range?.index ?? editor.getLength(), 'image', reader.result, 'user');
      editor.setSelection((range?.index ?? editor.getLength()) + 1, 0);
    };
    reader.readAsDataURL(file);
  };

  const descriptionEditorModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: { image: openDescriptionImagePicker },
    },
  }), []);

  const openFlow = (bug: ProjectBug) => {
    if (bug.status === '已关闭') return;
    setSelectedBug(bug);
    flowForm.setFieldsValue({ status: BUG_NEXT_STATUSES[bug.status][0], assignee: bug.assignee, comment: '' });
    setFlowVisible(true);
  };

  const saveFlow = () => {
    if (!selectedBug) return;
    flowForm.validate().then((values) => {
      const nextStatus = values.status as BugStatus;
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      setBugs((current) => current.map((bug) => bug.id !== selectedBug.id ? bug : {
        ...bug,
        status: nextStatus,
        assignee: values.assignee,
        flowLogs: [...bug.flowLogs, { id: `bug-log-${Date.now()}`, status: nextStatus, operator: selectedBug.assignee, assignee: values.assignee, time: now, comment: values.comment?.trim() || `已流转至${nextStatus}，由${values.assignee}处理。` }],
      }));
      setFlowVisible(false);
      setSelectedBug(null);
      Message.success('Bug 状态已更新');
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="flex items-center justify-between">
        <div><Text style={{ fontSize: 16, fontWeight: 600 }}>Bug 管理</Text><Text type="secondary" style={{ marginLeft: 8 }}>仅管理本项目研发与测试阶段的系统缺陷</Text></div>
        <Button type="primary" icon={<IconPlus />} onClick={openCreate}>新建 Bug</Button>
      </div>
      <div className="project-bug-statistics">
        <Card className="project-statistic-card"><Text type="secondary">未关闭</Text><Text className="project-statistic-value">{summary.openCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">新建</Text><Text className="project-statistic-value">{summary.newCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">修复中</Text><Text className="project-statistic-value">{summary.fixingCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">待验证</Text><Text className="project-statistic-value">{summary.verifyingCount}</Text></Card>
      </div>
      <Card bodyStyle={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input value={keyword} onChange={setKeyword} allowClear placeholder="搜索 Bug 标题或模块" style={{ width: 220 }} />
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="状态" style={{ width: 130 }}>{BUG_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
          <Select value={assigneeFilter} onChange={setAssigneeFilter} allowClear placeholder="处理人" style={{ width: 130 }}>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
          <Button onClick={() => { setKeyword(''); setStatusFilter(undefined); setAssigneeFilter(undefined); }}>重置</Button>
        </Space>
        <Table
          rowKey="id" pagination={false} data={filteredBugs} scroll={{ x: 1080 }}
          columns={[
            { title: 'Bug 标题', dataIndex: 'title', width: 250, render: (value: string, bug: ProjectBug) => <Button type="text" style={{ padding: 0 }} onClick={() => setDetailBug(bug)}>{value}</Button> },
            { title: '模块', dataIndex: 'module', width: 120 },
            { title: '优先级', dataIndex: 'priority', width: 90, render: (value: BugPriority) => <Tag color={priorityColor[value]}>{value}</Tag> },
            { title: '状态', dataIndex: 'status', width: 100, render: (value: BugStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
            { title: '提交人', dataIndex: 'reporter', width: 100 },
            { title: '处理人', dataIndex: 'assignee', width: 100 },
            { title: '操作', width: 130, fixed: 'right' as const, render: (_: unknown, bug: ProjectBug) => <Space size="mini"><Button type="text" size="mini" onClick={() => setDetailBug(bug)}>详情</Button>{bug.status !== '已关闭' && <Button type="text" size="mini" onClick={() => openFlow(bug)}>流转</Button>}</Space> },
          ]}
        />
      </Card>

      <Modal title="新建 Bug" visible={createVisible} onOk={createBug} onCancel={() => setCreateVisible(false)} style={{ width: 760 }} bodyStyle={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }} maskClosable={false}>
        <Form form={createForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={16}><FormItem label="Bug 标题" field="title" rules={[{ required: true, message: '请输入 Bug 标题' }]}><Input maxLength={100} placeholder="请简要描述系统缺陷" /></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="所属模块" field="module" rules={[{ required: true, message: '请输入所属模块' }]}><Input placeholder="例如：订单管理" /></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={6}><FormItem label="优先级" field="priority" rules={[{ required: true, message: '请选择优先级' }]}><Select>{BUG_PRIORITIES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="提交人" field="reporter" rules={[{ required: true, message: '请选择提交人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="处理人" field="assignee" rules={[{ required: true, message: '请选择处理人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={6}><FormItem label="环境信息" field="environment" rules={[{ required: true, message: '请选择环境信息' }]}><Select placeholder="请选择环境信息"><Select.Option value="测试环境">测试环境</Select.Option><Select.Option value="正式环境">正式环境</Select.Option></Select></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="Bug 描述" field="description" rules={[{ required: true, message: '请输入 Bug 描述' }]}>
            <RichTextEditor
              ref={descriptionEditorRef}
              className="bug-description-editor"
              modules={descriptionEditorModules}
              placeholder="请描述 Bug 现象、触发条件，可通过工具栏插入截图"
            />
          </FormItem>
          <input ref={descriptionImageInputRef} type="file" accept="image/*" onChange={insertDescriptionImage} style={{ display: 'none' }} />
        </Form>
      </Modal>

      <Modal title={`Bug 流转：${selectedBug?.title || ''}`} visible={flowVisible} onOk={saveFlow} onCancel={() => setFlowVisible(false)} style={{ width: 560 }} maskClosable={false}>
        {selectedBug && <div className="bug-flow-current"><Text type="secondary">当前状态</Text><Tag color={statusColor[selectedBug.status]}>{selectedBug.status}</Tag><Text type="secondary">当前处理人</Text><Text>{selectedBug.assignee}</Text></div>}
        <Form form={flowForm} layout="vertical">
          <FormItem label="下一步状态" field="status" rules={[{ required: true, message: '请选择下一步状态' }]}><Select>{selectedBug && selectedBug.status !== '已关闭' && BUG_NEXT_STATUSES[selectedBug.status].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="下一步处理人" field="assignee" rules={[{ required: true, message: '请选择下一步处理人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>
          <FormItem label="流转说明" field="comment"><Input.TextArea rows={3} placeholder="例如：已修复并部署测试环境，请回归验证" /></FormItem>
        </Form>
      </Modal>

      <Drawer title="Bug 详情" visible={detailBug !== null} width={680} onCancel={() => setDetailBug(null)} footer={null}>
        {detailBug && <div className="bug-detail">
          <div className="bug-detail-summary">
            <Text className="bug-detail-title">{detailBug.title}</Text>
            <Space size="small" className="bug-detail-tags"><Tag color={priorityColor[detailBug.priority]}>{detailBug.priority}</Tag><Tag color={statusColor[detailBug.status]}>{detailBug.status}</Tag></Space>
          </div>

          <section className="bug-detail-section">
            <Text className="bug-detail-section-title">基础信息</Text>
            <Descriptions column={2} data={[{ label: '所属模块', value: detailBug.module }, { label: '环境信息', value: detailBug.environment }, { label: '提交人', value: detailBug.reporter }, { label: '处理人', value: detailBug.assignee }]} />
          </section>

          <section className="bug-detail-section">
            <Text className="bug-detail-section-title">Bug 描述</Text>
            <div className="bug-detail-description"><RichTextEditor theme="bubble" readOnly value={detailBug.description} /></div>
          </section>

          <section className="bug-detail-section">
            <Text className="bug-detail-section-title">流转记录</Text>
            <Timeline className="bug-detail-timeline">
              {detailBug.flowLogs.map((log) => <Timeline.Item key={log.id} label={log.time}>
                <div className="bug-detail-log-title"><Tag color={statusColor[log.status]}>{log.status}</Tag></div>
                <div className="bug-detail-log-meta">操作人：{log.operator} · 下一步处理人：{log.assignee}</div>
                <div className="bug-detail-log-comment">{log.comment}</div>
              </Timeline.Item>)}
            </Timeline>
          </section>
        </div>}
      </Drawer>
    </Space>
  );
}
