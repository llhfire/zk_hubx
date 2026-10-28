import { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from '@/design-system';
import { IconCheckCircle, IconEye, IconRefresh, IconSearch } from '@/design-system';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  FileList,
  FilterBar,
  MetricGrid,
  PageHeader,
  PageShell,
  StatusTag,
  type StatusMap,
  SectionCard,
} from '@/design-system';
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
} from '../../../feedback/FeedbackContext';
import {
  calculateFeedbackMetrics,
  EMPTY_FEEDBACK_FILTERS,
  filterFeedbackItems,
  hasFeedbackFilters,
  type FeedbackManagementFilters,
} from './feedbackManagementModel';
import '../system/systemAdministrationLists.css';

const Paragraph = Typography.Paragraph;

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

const FEEDBACK_STATUS: StatusMap<FeedbackStatus> = {
  pending: { label: feedbackStatusLabels.pending, tone: 'warning' },
  processed: { label: feedbackStatusLabels.processed, tone: 'success' },
};

export function FeedbackManagement() {
  const { feedbackItems, markFeedbackProcessed } = useFeedback();
  const [filters, setFilters] = useState<FeedbackManagementFilters>({ ...EMPTY_FEEDBACK_FILTERS });
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [handleNote, setHandleNote] = useState('');
  const filteredFeedbackItems = useMemo(() => filterFeedbackItems(feedbackItems, filters), [feedbackItems, filters]);
  const metrics = useMemo(() => calculateFeedbackMetrics(feedbackItems), [feedbackItems]);
  const hasFilters = hasFeedbackFilters(filters);

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
      render: (value: FeedbackType) => <StatusTag tone="info">{feedbackTypeLabels[value]}</StatusTag>,
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
      render: (value: string) => <DateText value={value} mode="datetime" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: FeedbackStatus) => <StatusTag meta={FEEDBACK_STATUS[value]} />,
    },
    {
      title: '操作',
      width: 125,
      render: (_: unknown, record: FeedbackItem) => (
        <Space size={4}>
          <Tooltip content="查看">
            <Button type="text" size="small" className="hubx-icon-action" aria-label={`查看反馈${record.id}`} icon={<IconEye />} onClick={() => openDetail(record)} />
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip content="处理">
              <Button type="text" size="small" className="hubx-icon-action" aria-label={`处理反馈${record.id}`} icon={<IconCheckCircle />} onClick={() => openDetail(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell className="system-admin-list feedback-management-page">
      <PageHeader title="意见反馈管理" description="查看员工提交的使用问题和功能建议，并记录处理结果。" />

      <MetricGrid items={[
        { key: 'total', label: '全部反馈', value: metrics.total, detail: '当前已收集' },
        { key: 'pending', label: '待处理', value: metrics.pending, detail: '需要跟进', tone: metrics.pending ? 'warning' : 'neutral' },
        { key: 'processed', label: '已处理', value: metrics.processed, detail: '已完成闭环', tone: 'success' },
        { key: 'result', label: '当前结果', value: filteredFeedbackItems.length, detail: hasFilters ? '筛选结果' : '全部反馈' },
      ]} />

      <SectionCard bordered={false} className="system-admin-list__card">
        <FilterBar actions={hasFilters ? (
          <Button type="text" icon={<IconRefresh />} onClick={() => setFilters({ ...EMPTY_FEEDBACK_FILTERS })}>重置</Button>
        ) : undefined}>
          <Input
            className="system-admin-list__keyword"
            prefix={<IconSearch />}
            value={filters.keyword}
            onChange={(keyword) => setFilters(current => ({ ...current, keyword }))}
            placeholder="搜索反馈编号、内容、提交人或页面"
            allowClear
          />
          <Select className="system-admin-list__select" value={filters.status} onChange={(status) => setFilters(current => ({ ...current, status: status as 'all' | FeedbackStatus }))}>
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="pending">待处理</Select.Option>
            <Select.Option value="processed">已处理</Select.Option>
          </Select>
          <Select className="system-admin-list__select" value={filters.type} onChange={(type) => setFilters(current => ({ ...current, type: type as 'all' | FeedbackType }))}>
            <Select.Option value="all">全部类型</Select.Option>
            {(Object.entries(feedbackTypeLabels) as [FeedbackType, string][]).map(([value, label]) => (
              <Select.Option key={value} value={value}>{label}</Select.Option>
            ))}
          </Select>
        </FilterBar>

        <div className="system-admin-list__result-summary"><span>共 {filteredFeedbackItems.length} 条反馈</span>{hasFilters && <span>已按当前条件筛选</span>}</div>

        <DataTable
          columns={columns as any}
          data={filteredFeedbackItems}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: true }}
          scroll={{ x: 1120 }}
          emptyDescription={feedbackItems.length ? '没有符合当前条件的反馈' : '暂无员工反馈'}
          emptyAction={hasFilters ? <Button type="text" onClick={() => setFilters({ ...EMPTY_FEEDBACK_FILTERS })}>清除筛选</Button> : undefined}
        />
      </SectionCard>

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
            <DescriptionsCard
              bare
              columns={1}
              items={[
                { key: 'id', label: '反馈编号', value: selectedFeedback.id },
                { key: 'type', label: '反馈类型', value: feedbackTypeLabels[selectedFeedback.type] },
                { key: 'pagePath', label: '当前页面', value: selectedFeedback.pagePath },
                { key: 'reporter', label: '提交人', value: selectedFeedback.reporterName },
                { key: 'createdAt', label: '提交时间', value: formatDateTime(selectedFeedback.createdAt) },
                { key: 'contact', label: '联系方式', value: selectedFeedback.contact || '-' },
                { key: 'content', label: '反馈内容', value: selectedFeedback.content, long: true },
                {
                  key: 'attachments',
                  label: '反馈附件',
                  long: true,
                  value: (selectedFeedback.attachments || []).length ? (
                    <FileList
                      items={(selectedFeedback.attachments || []).map((attachment) => ({
                        key: attachment.id,
                        name: attachment.name,
                        meta: formatFeedbackAttachmentSize(attachment.size),
                        onDownload: () => handleDownloadAttachment(attachment),
                      }))}
                    />
                  ) : '-',
                },
                ...(selectedFeedback.status === 'processed'
                  ? [
                      { key: 'handler', label: '处理人', value: selectedFeedback.handlerName || '-' },
                      { key: 'handledAt', label: '处理时间', value: formatDateTime(selectedFeedback.handledAt) },
                      { key: 'handleNote', label: '处理说明', value: selectedFeedback.handleNote || '-', long: true },
                    ]
                  : []),
              ]}
            />

            {selectedFeedback.status === 'pending' && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 8 }}>处理说明（选填）</div>
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
    </PageShell>
  );
}
