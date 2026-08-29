import { useMemo, useState } from 'react';
import { Button, Card, Input, Message, Modal, Select, Space, Table, Tag, Tooltip, Typography } from '@arco-design/web-react';
import { IconRefresh, IconSearch, IconDelete } from '@arco-design/web-react/icon';
import { useIntegration } from '@/app/integrations/IntegrationContext';
import type { DeliveryLog, MessageChannel } from '@/app/integrations/types';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import '../systemConfigConsistency.css';

const Text = Typography.Text;
const channelLabels: Record<MessageChannel, string> = { in_app: '站内信', wecom: '企业微信', sms: '阿里云短信' };
const channelColors: Record<MessageChannel, string> = { in_app: 'arcoblue', wecom: 'green', sms: 'orange' };

export function MessageCenter() {
  const { logs, deleteLogs } = useIntegration();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [module, setModule] = useState('');
  const [recipient, setRecipient] = useState('');
  const [channel, setChannel] = useState<MessageChannel | ''>('');
  const [status, setStatus] = useState('');
  const moduleOptions = useMemo(
    () => [...new Set(logs.map((item) => item.module))].sort().map((value) => ({ label: value, value })),
    [logs],
  );
  const recipientOptions = useMemo(
    () => [...new Set(logs.map((item) => item.recipientName))].sort().map((value) => ({ label: value, value })),
    [logs],
  );
  const data = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return logs.filter((item) => {
      if (module && item.module !== module) return false;
      if (recipient && item.recipientName !== recipient) return false;
      if (channel && item.channel !== channel) return false;
      if (status && item.status !== status) return false;
      if (
        normalizedKeyword
        && ![item.title, item.content, item.eventId]
          .some((value) => value.toLowerCase().includes(normalizedKeyword))
      ) return false;
      return true;
    });
  }, [channel, keyword, logs, module, recipient, status]);

  const resetFilters = () => {
    setKeyword('');
    setModule('');
    setRecipient('');
    setChannel('');
    setStatus('');
  };

  const confirmDelete = (ids: string[]) => {
    Modal.confirm({
      title: ids.length > 1 ? `确认删除选中的 ${ids.length} 条记录？` : '确认删除该记录？',
      content: '删除后将从当前浏览器的消息发送记录中移除，无法撤销。',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        deleteLogs(ids);
        setSelectedRowKeys((current) => current.filter((id) => !ids.includes(id)));
        Message.success(ids.length > 1 ? `已删除 ${ids.length} 条记录` : '记录已删除');
      },
    });
  };

  const columns = [
    {
      title: '消息',
      width: 330,
      render: (_: unknown, record: DeliveryLog) => (
        <Space direction="vertical" size={2}>
          <Space><Text bold={!record.read}>{record.title}</Text>{record.channel === 'in_app' && !record.read ? <Tag color="red">未读</Tag> : null}</Space>
          <Text type="secondary">{record.content}</Text>
        </Space>
      ),
    },
    { title: '业务模块', dataIndex: 'module', width: 140 },
    { title: '接收人', dataIndex: 'recipientName', width: 120 },
    { title: '通道', dataIndex: 'channel', width: 110, render: (value: MessageChannel) => <Tag color={channelColors[value]}>{channelLabels[value]}</Tag> },
    { title: '优先级', dataIndex: 'priority', width: 90, render: (value: string) => <Tag color={value === 'high' ? 'red' : value === 'medium' ? 'orange' : 'gray'}>{value === 'high' ? '高' : value === 'medium' ? '中' : '低'}</Tag> },
    {
      title: '投递状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <Tag color={value === 'success' ? 'green' : value === 'failed' ? 'red' : 'gray'}>{value === 'success' ? '成功' : value === 'failed' ? '失败' : '未触发'}</Tag>,
    },
    { title: '说明', dataIndex: 'reason', width: 200, render: (value?: string) => value || '-' },
    { title: '发送时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 110,
      fixed: 'right' as const,
      render: (_: unknown, record: DeliveryLog) => (
        <Tooltip content="删除">
          <Button
            type="text"
            status="danger"
            size="small"
            icon={<IconDelete />}
            aria-label={`删除消息：${record.title}`}
            onClick={() => confirmDelete([record.id])}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <PageShell className="system-config-page" breadcrumbs={[{ label: '系统管理' }, { label: '消息中心' }]}>
      <PageHeader
        title="消息中心"
        description="统一查看站内信、企业微信和阿里云短信的模拟投递结果。"
      />
      <ProcessMetricGrid items={[
        { key: 'all', label: '全部消息', value: logs.length, detail: '当前浏览器投递记录' },
        { key: 'success', label: '投递成功', value: logs.filter((log) => log.status === 'success').length, detail: '已送达目标通道', tone: 'success' },
        { key: 'failed', label: '投递失败', value: logs.filter((log) => log.status === 'failed').length, detail: '需要检查通道配置', tone: logs.some((log) => log.status === 'failed') ? 'danger' : 'neutral' },
        { key: 'unread', label: '站内未读', value: logs.filter((log) => log.channel === 'in_app' && !log.read).length, detail: '等待当前用户查看', tone: 'warning' },
      ]} />
      <Card className="system-config-card" title="投递记录" bordered={false}>
        <div className="system-config-section-toolbar">
          <Space wrap>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索消息标题、内容或事件编号"
              allowClear
              style={{ width: 280 }}
              value={keyword}
              onChange={setKeyword}
            />
            <Select placeholder="业务模块" allowClear style={{ width: 160 }} value={module || undefined} onChange={(value) => setModule(value || '')} options={moduleOptions} />
            <Select placeholder="接收人" allowClear showSearch style={{ width: 140 }} value={recipient || undefined} onChange={(value) => setRecipient(value || '')} options={recipientOptions} />
            <Select placeholder="发送通道" allowClear style={{ width: 150 }} value={channel || undefined} onChange={(value) => setChannel(value || '')} options={Object.entries(channelLabels).map(([value, label]) => ({ value, label }))} />
            <Select placeholder="投递状态" allowClear style={{ width: 130 }} value={status || undefined} onChange={(value) => setStatus(value || '')} options={[{ label: '成功', value: 'success' }, { label: '失败', value: 'failed' }, { label: '未触发', value: 'skipped' }]} />
            <Button icon={<IconRefresh />} onClick={resetFilters}>重置</Button>
          </Space>
          <Space>
            <Button status="danger" disabled={selectedRowKeys.length === 0} onClick={() => confirmDelete(selectedRowKeys)}>
              批量删除{selectedRowKeys.length > 0 ? `（${selectedRowKeys.length}）` : ''}
            </Button>
          </Space>
        </div>
        <div className="system-config-result-summary">
          <span>筛选结果 {data.length} 条</span>
          <span>{selectedRowKeys.length > 0 ? `已选择 ${selectedRowKeys.length} 条` : '可勾选记录后批量删除'}</span>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          data={data}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1450 }}
        />
      </Card>
    </PageShell>
  );
}
