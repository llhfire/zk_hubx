import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconCheckCircle, IconDownload, IconEye, IconFile, IconMessage } from '@arco-design/web-react/icon';
import {
  formatFeedbackAttachmentSize,
  getFeedbackAttachmentFile,
  feedbackStatusLabels,
  feedbackTypeLabels,
  type FeedbackItem,
  type FeedbackAttachment,
  type FeedbackStatus,
  type FeedbackType,
  useFeedback,
} from '../feedback/FeedbackContext';

const Title = Typography.Title;
const Paragraph = Typography.Paragraph;

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

export function FeedbackManagement() {
  const { feedbackItems, markFeedbackProcessed } = useFeedback();
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [handleNote, setHandleNote] = useState('');

  const filteredFeedbackItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return feedbackItems.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesKeyword = !normalizedKeyword
        || item.content.toLowerCase().includes(normalizedKeyword)
        || item.pagePath.toLowerCase().includes(normalizedKeyword)
        || item.id.toLowerCase().includes(normalizedKeyword);
      return matchesStatus && matchesType && matchesKeyword;
    });
  }, [feedbackItems, keyword, statusFilter, typeFilter]);

  const openDetail = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setHandleNote(feedback.handleNote || '');
  };

  const closeDetail = () => {
    setSelectedFeedback(null);
    setHandleNote('');
  };

  const handleProcess = () => {
    if (!selectedFeedback) return;
    markFeedbackProcessed(selectedFeedback.id, handleNote);
    closeDetail();
  };

  const handleDownloadAttachment = async (attachment: FeedbackAttachment) => {
    try {
      const file = await getFeedbackAttachmentFile(attachment.id);
      if (!file) {
        Message.warning('未找到该附件，请让提交人重新上传');
        return;
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      Message.error('附件下载失败，请稍后重试');
    }
  };

  const columns = [
    { title: '反馈编号', dataIndex: 'id', width: 125 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 110,
      render: (value: FeedbackType) => <Tag color="arcoblue">{feedbackTypeLabels[value]}</Tag>,
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      render: (value: string) => <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>{value}</Paragraph>,
    },
    { title: '当前页面', dataIndex: 'pagePath', width: 180, ellipsis: true },
    {
      title: '附件',
      dataIndex: 'attachments',
      width: 80,
      render: (attachments: FeedbackAttachment[] = []) => attachments.length ? `${attachments.length} 个` : '-',
    },
    { title: '提交人', dataIndex: 'reporterName', width: 100 },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 175,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: FeedbackStatus) => (
        <Tag color={value === 'processed' ? 'green' : 'orange'}>{feedbackStatusLabels[value]}</Tag>
      ),
    },
    {
      title: '操作',
      width: 125,
      render: (_: unknown, record: FeedbackItem) => (
        <Space size={4}>
          <Tooltip content="查看">
            <Button type="text" size="small" icon={<IconEye />} onClick={() => openDetail(record)} />
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip content="处理">
              <Button type="text" size="small" icon={<IconCheckCircle />} onClick={() => openDetail(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <Title heading={4} style={{ margin: 0 }}>
            <IconMessage style={{ marginRight: 8 }} />
            意见反馈管理
          </Title>
          <div style={{ color: 'var(--color-text-3)', fontSize: 14, marginTop: 4 }}>
            查看员工提交的使用问题和功能建议，并记录处理结果。
          </div>
        </div>
      </div>

      <Card bordered={false}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select value={statusFilter} onChange={(value) => setStatusFilter(value as 'all' | FeedbackStatus)} style={{ width: 130 }}>
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="pending">待处理</Select.Option>
            <Select.Option value="processed">已处理</Select.Option>
          </Select>
          <Select value={typeFilter} onChange={(value) => setTypeFilter(value as 'all' | FeedbackType)} style={{ width: 130 }}>
            <Select.Option value="all">全部类型</Select.Option>
            {(Object.entries(feedbackTypeLabels) as [FeedbackType, string][]).map(([value, label]) => (
              <Select.Option key={value} value={value}>{label}</Select.Option>
            ))}
          </Select>
          <Input.Search
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索反馈编号、内容或页面"
            style={{ width: 260 }}
            allowClear
          />
        </Space>

        <Table
          columns={columns as any}
          data={filteredFeedbackItems}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: true }}
        />
      </Card>

      <Modal
        title="反馈详情"
        visible={Boolean(selectedFeedback)}
        onCancel={closeDetail}
        onOk={handleProcess}
        okText="标记已处理"
        footer={selectedFeedback?.status === 'pending' ? undefined : <Button onClick={closeDetail}>关闭</Button>}
        unmountOnExit
      >
        {selectedFeedback && (
          <>
            <Descriptions
              column={1}
              size="medium"
              labelStyle={{ width: 92 }}
              data={[
                { label: '反馈编号', value: selectedFeedback.id },
                { label: '反馈类型', value: feedbackTypeLabels[selectedFeedback.type] },
                { label: '当前页面', value: selectedFeedback.pagePath },
                { label: '提交人', value: selectedFeedback.reporterName },
                { label: '提交时间', value: formatDateTime(selectedFeedback.createdAt) },
                { label: '联系方式', value: selectedFeedback.contact || '-' },
                { label: '反馈内容', value: selectedFeedback.content },
                {
                  label: '反馈附件',
                  value: (selectedFeedback.attachments || []).length ? (
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      {(selectedFeedback.attachments || []).map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2">
                          <IconFile style={{ color: 'var(--color-text-3)' }} />
                          <span style={{ flex: 1 }}>{attachment.name}</span>
                          <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
                            {formatFeedbackAttachmentSize(attachment.size)}
                          </span>
                          <Button
                            type="text"
                            size="small"
                            icon={<IconDownload />}
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            下载
                          </Button>
                        </div>
                      ))}
                    </Space>
                  ) : '-',
                },
                ...(selectedFeedback.status === 'processed'
                  ? [
                      { label: '处理人', value: selectedFeedback.handlerName || '-' },
                      { label: '处理时间', value: formatDateTime(selectedFeedback.handledAt) },
                      { label: '处理说明', value: selectedFeedback.handleNote || '-' },
                    ]
                  : []),
              ]}
            />

            {selectedFeedback.status === 'pending' && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>处理说明（选填）</div>
                <Input.TextArea
                  value={handleNote}
                  onChange={setHandleNote}
                  placeholder="填写处理结果或回复内容"
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  maxLength={500}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
