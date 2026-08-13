import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Empty, Form, Input, Message, Modal, Pagination, Select, Space, Tabs, Tag, Typography } from '@arco-design/web-react';
import { useTodos } from '@/app/todos/TodoContext';
import type { TodoPriority } from '@/app/todos/types';

const { Text } = Typography;
const TabPane = Tabs.TabPane;

interface GroupMessage {
  id: string;
  sender: string;
  time: string;
  content: string;
  avatar?: string;
}

interface CommunicationSummary {
  overview: string;
  requirements: string[];
  technical: string[];
  risks: string[];
  progress: string[];
  collaboration: string[];
  actions: CommunicationAction[];
  speakers: string[];
  latestTime: string;
}

interface CommunicationAction {
  title: string;
  description: string;
  priority: TodoPriority;
}

interface CommunicationResponse {
  groupName: string;
  exportedAt: string;
  messages: GroupMessage[];
  summary: CommunicationSummary;
  provider?: 'deepseek' | 'local';
  warning?: string;
}

interface AssigneeOption {
  id: string;
  name: string;
}

interface LeadCustomerCommunicationPanelProps {
  groupName?: string;
  leadId: string;
  leadName: string;
  assignees: AssigneeOption[];
  defaultAssigneeId?: string;
}

const analysisSections: Array<{ key: keyof Pick<CommunicationSummary, 'requirements' | 'technical' | 'risks' | 'progress' | 'collaboration'>; title: string }> = [
  { key: 'requirements', title: '需求与任务管理' },
  { key: 'technical', title: '技术决策与方案' },
  { key: 'risks', title: '问题与风险管理' },
  { key: 'progress', title: '项目进度与状态' },
  { key: 'collaboration', title: '分工与协作' },
];

function getCommunicationCacheKey(groupName: string) {
  return `hubx-customer-communication-v1:${encodeURIComponent(groupName)}`;
}

function readCachedCommunication(groupName: string): CommunicationResponse | null {
  try {
    const cached = window.localStorage.getItem(getCommunicationCacheKey(groupName));
    const result = cached ? JSON.parse(cached) : null;
    return Array.isArray(result?.messages) && result?.summary ? result : null;
  } catch {
    return null;
  }
}

function saveCachedCommunication(groupName: string, result: CommunicationResponse) {
  try {
    window.localStorage.setItem(getCommunicationCacheKey(groupName), JSON.stringify(result));
  } catch {
    // 缓存空间不足时仍保留本次页面展示，不影响读取与分析。
  }
}

export function LeadCustomerCommunicationPanel({ groupName, leadId, leadName, assignees, defaultAssigneeId }: LeadCustomerCommunicationPanelProps) {
  const { createTodo } = useTodos();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<CommunicationResponse | null>(null);
  const [activeContentTab, setActiveContentTab] = useState('summary');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('requirements');
  const [currentPage, setCurrentPage] = useState(1);
  const [taskVisible, setTaskVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<CommunicationAction | null>(null);
  const [taskForm] = Form.useForm();
  const sortedMessages = data ? [...data.messages].sort((a, b) => b.time.localeCompare(a.time)) : [];
  const pageSize = 50;
  const pagedMessages = sortedMessages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const loadCommunication = async () => {
    if (!groupName?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/wechat/group-communication?groupName=${encodeURIComponent(groupName)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '群消息读取失败');
      setData(result);
      setCurrentPage(1);
      if (result.messages?.length && result.summary) saveCachedCommunication(groupName, result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '群消息读取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!groupName?.trim()) return;
    const cached = readCachedCommunication(groupName);
    setError('');
    setCurrentPage(1);
    if (cached) {
      setData(cached);
      return;
    }
    setData(null);
    loadCommunication();
  }, [groupName]);

  const openActionEditor = (action: CommunicationAction) => {
    setEditingAction(action);
    taskForm.setFieldsValue({
      title: action.title,
      description: action.description,
      priority: action.priority,
      assigneeId: defaultAssigneeId || assignees[0]?.id,
      destination: 'todo',
    });
    setTaskVisible(true);
  };

  const saveAction = async () => {
    const values = await taskForm.validate();
    const assignee = assignees.find((item) => item.id === values.assigneeId);
    if (!assignee) return;
    createTodo({
      id: `customer-communication-${Date.now()}`,
      source: 'customer_communication',
      sourceId: leadId,
      module: values.destination === 'tracking' ? '线索跟进' : '客户沟通',
      title: values.title.trim(),
      content: values.description?.trim() || editingAction?.description || `来自线索“${leadName}”的客户沟通总结。`,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      status: 'pending',
      priority: values.priority,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      route: `/leads/${leadId}`,
    });
    Message.success(values.destination === 'tracking' ? '已写入线索跟进待办' : '已写入待办中心');
    setTaskVisible(false);
    setEditingAction(null);
    taskForm.resetFields();
  };

  if (!groupName?.trim()) {
    return <Card className="lead-detail-main-content"><Empty description="基础信息中未填写售前群名称，无法读取客户沟通记录" /></Card>;
  }

  return (
    <Card className="lead-detail-main-content">
      <div className="lead-customer-communication-header">
        <div><Text strong>售前群：{groupName}</Text><Text type="secondary" style={{ marginLeft: 8 }}>自动读取本机微信聊天记录</Text></div>
        <Button size="small" loading={loading} onClick={loadCommunication}>刷新沟通记录</Button>
      </div>
      {error ? <Alert type="warning" showIcon content={error} style={{ marginTop: 16 }} /> : null}
      {data && <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
        <Tabs activeTab={activeContentTab} onChange={setActiveContentTab} headerPadding={false}>
          <TabPane key="summary" title="智能总结">
            <div className="lead-customer-summary">
              {data.provider === 'deepseek' ? <Tag color="green" style={{ marginBottom: 8 }}>DeepSeek 智能总结</Tag> : null}
              {data.warning ? <Alert type="warning" showIcon content={data.warning} style={{ marginBottom: 12 }} /> : null}
              <div>{data.summary.overview}</div>
              <Tabs activeTab={activeAnalysisTab} onChange={setActiveAnalysisTab} className="lead-customer-analysis-tabs">
                {analysisSections.map(({ key, title }) => (
                  <TabPane key={key} title={title}>
                    {data.summary[key].length ? <div className="lead-customer-analysis-list">{data.summary[key].map((item, index) => <div className="lead-customer-analysis-item" key={`${key}-${index}`}><span className="lead-customer-analysis-index">{String(index + 1).padStart(2, '0')}</span><div className="lead-customer-analysis-text">{item}</div></div>)}</div> : <Empty description="暂未识别到明确内容" />}
                  </TabPane>
                ))}
                <TabPane key="actions" title="待办任务">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {data.summary.actions.length ? data.summary.actions.map((item, index) => <div className="lead-customer-action-item" key={`${item.title}-${index}`}><div><Text>{item.title}</Text>{item.description ? <Text type="secondary" className="lead-customer-action-description">{item.description}</Text> : null}</div><Button size="mini" type="outline" onClick={() => openActionEditor(item)}>编辑并分派</Button></div>) : <Empty description="暂未识别到需要跟进的任务" />}
                  </Space>
                </TabPane>
              </Tabs>
            </div>
          </TabPane>
          <TabPane key="messages" title="聊天内容">
            <div className="lead-customer-message-meta"><Text type="secondary">已导出 {sortedMessages.length} 条消息（最新在前）· 最近消息时间 {data.summary.latestTime || '-'} · 导出时间 {data.exportedAt}</Text></div>
            <div className="lead-customer-message-list">
              {pagedMessages.map((message) => (
                <article className="lead-customer-message-item" key={message.id}>
                  <div className="lead-customer-message-header">
                    <Avatar size={32} className="lead-customer-message-avatar">{message.avatar ? <img src={message.avatar} alt="" /> : message.sender.slice(0, 1)}</Avatar>
                    <Text strong>{message.sender}</Text>
                    <Text type="secondary" className="lead-customer-message-time">{message.time || '-'}</Text>
                  </div>
                  <div className="lead-customer-message-content">{message.content}</div>
                </article>
              ))}
            </div>
            {sortedMessages.length > pageSize ? <Pagination current={currentPage} pageSize={pageSize} total={sortedMessages.length} showTotal onChange={setCurrentPage} className="lead-customer-message-pagination" /> : null}
          </TabPane>
        </Tabs>
      </Space>}
      <Modal title="编辑并分派待办" visible={taskVisible} onCancel={() => setTaskVisible(false)} onOk={saveAction} okText="写入待办" unmountOnExit>
        <Form form={taskForm} layout="vertical">
          <Form.Item label="任务标题" field="title" rules={[{ required: true, message: '请输入任务标题' }]}><Input maxLength={100} /></Form.Item>
          <Form.Item label="任务说明" field="description"><Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={500} /></Form.Item>
          <Form.Item label="处理人" field="assigneeId" rules={[{ required: true, message: '请选择处理人' }]}><Select options={assignees.map((item) => ({ label: item.name, value: item.id }))} /></Form.Item>
          <Form.Item label="优先级" field="priority"><Select options={[{ label: '高', value: 'high' }, { label: '中', value: 'medium' }, { label: '低', value: 'low' }]} /></Form.Item>
          <Form.Item label="写入位置" field="destination"><Select options={[{ label: '待办中心', value: 'todo' }, { label: '线索跟进待办', value: 'tracking' }]} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
