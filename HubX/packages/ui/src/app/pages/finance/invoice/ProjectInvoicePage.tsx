import { useMemo, useState } from 'react';
import { Button, Input, Message, Modal, Space, Tooltip, Typography, Upload } from '@/design-system';
import type { UploadItem } from '@/design-system';
import { IconCopy, IconEye, IconFile, IconSearch } from '@/design-system';
import { formatMoney } from '@/app/utils/money';
import {
  DataTable,
  DateText,
  EmptyState,
  FilterBar,
  FileList,
  MoneyText,
  PageHeader,
  PageShell,
  MetricGrid,
  SectionTabs,
  SectionCard,
  StatusTag,
  type StatusMap,
  DescriptionsCard,
} from '@/design-system';
import { useProjectInvoices, type ProjectInvoiceApplication } from './ProjectInvoiceContext';
import {
  calculateProjectInvoiceListMetrics,
  EMPTY_PROJECT_INVOICE_FILTERS,
  filterProjectInvoiceApplications,
  hasProjectInvoiceFilters,
  type ProjectInvoiceListStatus,
} from './projectInvoiceListModel';
import './ProjectInvoicePage.css';

const { Text } = Typography;

const PAYMENT_STATUS: StatusMap<'未回款' | '部分回款' | '已回款'> = {
  未回款: { label: '未回款', tone: 'neutral' },
  部分回款: { label: '部分回款', tone: 'warning' },
  已回款: { label: '已回款', tone: 'success' },
};

const INVOICE_STATUS: StatusMap<'开票中' | '已开票' | '已冲红'> = {
  开票中: { label: '开票中', tone: 'warning' },
  已开票: { label: '已开票', tone: 'success' },
  已冲红: { label: '已冲红', tone: 'danger' },
};

function downloadFile(fileName: string) {
  const url = URL.createObjectURL(new Blob([`发票附件：${fileName}`], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectInvoicePage() {
  const { applications, completeInvoice } = useProjectInvoices();
  const [status, setStatus] = useState<ProjectInvoiceListStatus>('全部');
  const [keyword, setKeyword] = useState('');
  const [active, setActive] = useState<ProjectInvoiceApplication | null>(null);
  const [files, setFiles] = useState<UploadItem[]>([]);

  const filters = useMemo(() => ({ keyword, status }), [keyword, status]);
  const data = useMemo(() => filterProjectInvoiceApplications(applications, filters), [applications, filters]);
  const metrics = useMemo(() => calculateProjectInvoiceListMetrics(applications), [applications]);
  const hasFilters = hasProjectInvoiceFilters(filters);

  const resetFilters = () => {
    setKeyword(EMPTY_PROJECT_INVOICE_FILTERS.keyword);
    setStatus(EMPTY_PROJECT_INVOICE_FILTERS.status);
  };

  const openDetail = (record: ProjectInvoiceApplication) => {
    setActive(record);
    setFiles(record.invoiceFiles.map((name, index) => ({ uid: `${name}-${index}`, name, status: 'done' })));
  };

  const submitInvoice = () => {
    if (!active) return;
    const names = files.map(file => file.name || file.originFile?.name || '').filter(Boolean);
    if (!names.length) {
      Message.warning('请先上传发票附件');
      return;
    }
    completeInvoice(active.id, names);
    Message.success('发票已上传，项目开票状态已更新');
    setActive(null);
    setFiles([]);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      Message.success('已复制');
    } catch {
      Message.error('复制失败，请手动复制');
    }
  };

  const copyableValue = (value: string) => (
    <Space size={4}>
      <span>{value}</span>
      <Button type="text" size="mini" icon={<IconCopy />} aria-label={`复制${value}`} onClick={() => void copyText(value)} />
    </Space>
  );

  const copyableMoney = (value: number) => (
    <Space size={4}>
      <MoneyText value={value} />
      {/* 复制内容是纯文本辅助语义，页面金额本身仍由 MoneyText 渲染。 */}
      <Button type="text" size="mini" icon={<IconCopy />} aria-label={`复制${formatMoney(value)}`} onClick={() => void copyText(formatMoney(value))} />
    </Space>
  );

  const columns = [
    { title: '项目编号', dataIndex: 'projectNo', width: 150 },
    { title: '项目名称', dataIndex: 'projectName', width: 220 },
    { title: '开票期数', dataIndex: 'periodLabel', width: 110 },
    { title: '客户名称', dataIndex: 'customerName', width: 200 },
    { title: '开票金额', dataIndex: 'amount', width: 130, align: 'right' as const, render: (value: number) => <MoneyText value={value} /> },
    { title: '回款状态', dataIndex: 'paymentStatus', width: 110, render: (value?: '未回款' | '部分回款' | '已回款') => (
      <StatusTag meta={PAYMENT_STATUS[value || '未回款']} />
    ) },
    { title: '发票类别', dataIndex: 'invoiceType', width: 160 },
    { title: '申请时间', dataIndex: 'submittedAt', width: 170, render: (value: string) => <DateText value={value} mode="datetime" /> },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: '开票中' | '已开票' | '已冲红') => <StatusTag meta={INVOICE_STATUS[value]} /> },
    {
      title: '操作', width: 110, fixed: 'right' as const,
      render: (_: unknown, record: ProjectInvoiceApplication) => (
        <Tooltip content={record.status === '开票中' ? '开票' : '详情'}>
          <Button
            type="text"
            size="small"
            className="hubx-icon-action"
            aria-label={`${record.status === '开票中' ? '处理' : '查看'}${record.projectNo}开票申请`}
            icon={<IconEye />}
            onClick={() => openDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  const detailData = active ? [
    { key: '项目编号', label: '项目编号', value: active.projectNo },
    { key: '项目名称', label: '项目名称', value: active.projectName },
    { key: '开票期数', label: '开票期数', value: active.periodLabel },
    { key: '本期应收', label: '本期应收', value: <MoneyText value={active.expectedAmount} /> },
    { key: '发票类别', label: '发票类别', value: active.invoiceType },
    { key: '发票税率', label: '发票税率', value: `${active.taxRate}%` },
    { key: '开票金额', label: '开票金额', value: copyableMoney(active.amount) },
    { key: '发票税额', label: '发票税额', value: <MoneyText value={active.taxAmount} /> },
    { key: '客户名称', label: '客户名称', value: copyableValue(active.customerName) },
    { key: '纳税人识别号', label: '纳税人识别号', value: copyableValue(active.taxpayerId) },
    { key: '地址', label: '地址', value: active.customerAddress || '-' },
    { key: '手机号', label: '手机号', value: active.customerPhone },
    { key: '开户行', label: '开户行', value: copyableValue(active.bankName) },
    { key: '银行账号', label: '银行账号', value: copyableValue(active.bankAccount) },
    { key: '收票人姓名', label: '收票人姓名', value: active.recipientName },
    { key: '收票人电话', label: '收票人电话', value: active.recipientPhone },
    { key: '收票人邮箱', label: '收票人邮箱', value: active.recipientEmail || '-' },
    { key: '申请时间', label: '申请时间', value: <DateText value={active.submittedAt} mode="datetime" /> },
    ...(active.status === '已冲红' ? [{ key: '冲红时间', label: '冲红时间', value: <DateText value={active.redFlushedAt} mode="datetime" /> }, { key: '冲红原因', label: '冲红原因', value: active.redFlushReason || '-' }] : []),
  ] : [];
  const paymentPeriods = active?.paymentPeriods?.length
    ? active.paymentPeriods
    : active
      ? applications
          .filter(item => item.projectId === active.projectId)
          .filter((item, index, items) => items.findIndex(candidate => candidate.periodId === item.periodId) === index)
          .map(item => ({ periodId: item.periodId, periodLabel: item.periodLabel, expectedAmount: item.expectedAmount, paidAmount: item.paymentStatus === '已回款' ? item.expectedAmount : 0, expectedDate: '-', paymentStatus: item.paymentStatus || '未回款' }))
      : [];

  return (
    <PageShell className="project-invoice-page">
      <PageHeader
        title="开票审核"
        description="集中处理项目提交的开票申请，核对客户与回款信息，并回传发票附件。"
      />

      <MetricGrid
        items={[
          { key: 'applications', label: '申请总数', value: `${metrics.applicationCount} 条`, detail: '当前可查看范围' },
          { key: 'pending', label: '待开票', value: `${metrics.pendingCount} 条`, detail: '等待财务处理', tone: metrics.pendingCount > 0 ? 'warning' : 'neutral' },
          { key: 'completed', label: '已开票', value: `${metrics.completedCount} 条`, detail: '已回传发票附件', tone: 'success' },
          { key: 'red-flushed', label: '已冲红', value: `${metrics.redFlushedCount} 条`, detail: '保留原记录与原因', tone: metrics.redFlushedCount > 0 ? 'danger' : 'neutral' },
        ]}
      />

      <SectionCard className="project-invoice-page__content-card">
        <SectionTabs
          activeKey={status}
          onChange={value => setStatus(value as ProjectInvoiceListStatus)}
          items={[
            {
              key: '全部',
              label: `全部（${metrics.applicationCount}）`,
            },
            {
              key: '开票中',
              label: `待开票（${metrics.pendingCount}）`,
            },
            {
              key: '已开票',
              label: `已开票（${metrics.completedCount}）`,
            },
            {
              key: '已冲红',
              label: `已冲红（${metrics.redFlushedCount}）`,
            },
          ]}
        />

        <FilterBar actions={hasFilters ? <Button type="text" onClick={resetFilters}>重置筛选</Button> : undefined}>
          <Input
            className="project-invoice-page__keyword"
            prefix={<IconSearch />}
            placeholder="搜索项目编号、项目名称或客户"
            value={keyword}
            onChange={setKeyword}
            allowClear
          />
        </FilterBar>

        <div className="project-invoice-page__result-summary">
          <Text type="secondary">共 {data.length} 条开票申请</Text>
          {hasFilters && <Text type="secondary">已按当前条件筛选</Text>}
        </div>

        {data.length === 0 ? (
          <div className="project-invoice-page__empty">
            <EmptyState
              description={applications.length === 0 ? '暂无项目开票申请' : '没有符合当前条件的开票申请'}
              action={hasFilters ? <Button onClick={resetFilters}>清除筛选</Button> : undefined}
            />
          </div>
        ) : (
          <DataTable
            rowKey="id"
            size="small"
            columns={columns}
            data={data}
            pagination={{ pageSize: 10, total: data.length, showTotal: true, sizeCanChange: true }}
            scroll={{ x: 1350 }}
          />
        )}
      </SectionCard>

      <Modal
        title={active?.status === '开票中' ? '项目开票' : '开票详情'}
        visible={Boolean(active)}
        onCancel={() => { setActive(null); setFiles([]); }}
        onOk={active?.status === '开票中' ? submitInvoice : undefined}
        okText="确认开票"
        footer={active?.status !== '开票中' ? null : undefined}
        style={{ width: 820, maxWidth: 'calc(100vw - 32px)' }}
      >
        {active && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <DescriptionsCard columns={2} items={detailData} />
            <div>
              <div className="project-invoice-upload-title">当前项目每期回款情况</div>
              <DataTable
                rowKey="periodId"
                size="small"
                pagination={false}
                data={paymentPeriods}
                emptyDescription="暂无回款期次数据"
                columns={[
                  { title: '期次', dataIndex: 'periodLabel', width: 100 },
                  { title: '应回款', dataIndex: 'expectedAmount', width: 130, render: (value: number) => <MoneyText value={value} /> },
                  { title: '实际回款', dataIndex: 'paidAmount', width: 130, render: (value: number) => <MoneyText value={value} /> },
                  { title: '预计日期', dataIndex: 'expectedDate', width: 120, render: (value: string) => <DateText value={value} placeholder="-" /> },
                  { title: '回款状态', dataIndex: 'paymentStatus', width: 110, render: (value: '未回款' | '部分回款' | '已回款') => <StatusTag meta={PAYMENT_STATUS[value]} /> },
                ]}
              />
            </div>
            <div>
              <div className="project-invoice-upload-title">发票附件</div>
              {active.status === '开票中' ? (
                <Upload autoUpload={false} accept=".pdf,.jpg,.jpeg,.png" limit={5} fileList={files} onChange={setFiles}>
                  <Button icon={<IconFile />}>上传发票</Button>
                </Upload>
              ) : (
                <FileList
                  items={active.invoiceFiles.map(file => ({
                    key: file,
                    name: file,
                    onDownload: () => downloadFile(file),
                  }))}
                  emptyDescription="暂无发票附件"
                />
              )}
            </div>
            {active.status === '已冲红' ? (
              <div>
                <div className="project-invoice-upload-title">冲红附件</div>
                <FileList
                  items={(active.redFlushFiles ?? []).map(file => ({
                    key: file,
                    name: file,
                    onDownload: () => downloadFile(file),
                  }))}
                  emptyDescription="暂无冲红附件"
                />
              </div>
            ) : null}
          </Space>
        )}
      </Modal>
    </PageShell>
  );
}
