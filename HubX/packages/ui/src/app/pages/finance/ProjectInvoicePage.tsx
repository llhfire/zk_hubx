import { useMemo, useState } from 'react';
import { Button, Card, Descriptions, Message, Modal, Space, Table, Tabs, Tag, Tooltip, Typography, Upload } from '@arco-design/web-react';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { IconCopy, IconEye, IconFile } from '@arco-design/web-react/icon';
import { useProjectInvoices, type ProjectInvoiceApplication } from './ProjectInvoiceContext';
import './ProjectInvoicePage.css';

const { Title, Text } = Typography;

function currency(value: number) {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

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
  const [status, setStatus] = useState('全部');
  const [active, setActive] = useState<ProjectInvoiceApplication | null>(null);
  const [files, setFiles] = useState<UploadItem[]>([]);

  const data = useMemo(
    () => status === '全部' ? applications : applications.filter(item => item.status === status),
    [applications, status],
  );

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

  const columns = [
    { title: '项目编号', dataIndex: 'projectNo', width: 150 },
    { title: '项目名称', dataIndex: 'projectName', width: 220 },
    { title: '开票期数', dataIndex: 'periodLabel', width: 110 },
    { title: '客户名称', dataIndex: 'customerName', width: 200 },
    { title: '开票金额', dataIndex: 'amount', width: 130, render: currency },
    { title: '回款状态', dataIndex: 'paymentStatus', width: 110, render: (value?: string) => {
      const label = value || '未回款';
      return <Tag color={label === '已回款' ? 'green' : label === '部分回款' ? 'orange' : 'gray'}>{label}</Tag>;
    } },
    { title: '发票类别', dataIndex: 'invoiceType', width: 160 },
    { title: '申请时间', dataIndex: 'submittedAt', width: 170 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => <Tag color={value === '已开票' ? 'green' : value === '已冲红' ? 'red' : 'orange'}>{value}</Tag> },
    {
      title: '操作', width: 110, fixed: 'right' as const,
      render: (_: unknown, record: ProjectInvoiceApplication) => (
        <Tooltip content={record.status === '开票中' ? '开票' : '详情'}>
          <Button type="text" size="small" icon={<IconEye />} onClick={() => openDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  const detailData = active ? [
    { label: '项目编号', value: active.projectNo },
    { label: '项目名称', value: active.projectName },
    { label: '开票期数', value: active.periodLabel },
    { label: '本期应收', value: currency(active.expectedAmount) },
    { label: '发票类别', value: active.invoiceType },
    { label: '发票税率', value: `${active.taxRate}%` },
    { label: '开票金额', value: copyableValue(currency(active.amount)) },
    { label: '发票税额', value: currency(active.taxAmount) },
    { label: '客户名称', value: copyableValue(active.customerName) },
    { label: '纳税人识别号', value: copyableValue(active.taxpayerId) },
    { label: '地址', value: active.customerAddress || '-' },
    { label: '手机号', value: active.customerPhone },
    { label: '开户行', value: copyableValue(active.bankName) },
    { label: '银行账号', value: copyableValue(active.bankAccount) },
    { label: '收票人姓名', value: active.recipientName },
    { label: '收票人电话', value: active.recipientPhone },
    { label: '收票人邮箱', value: active.recipientEmail || '-' },
    { label: '申请时间', value: active.submittedAt },
    ...(active.status === '已冲红' ? [{ label: '冲红时间', value: active.redFlushedAt || '-' }, { label: '冲红原因', value: active.redFlushReason || '-' }] : []),
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
    <div className="project-invoice-page">
      <div className="project-invoice-page-header">
        <div><Title heading={5}>开票审核</Title><Text type="secondary">处理项目提交的开票申请并回传发票附件</Text></div>
      </div>
      <Card bordered={false}>
        <Tabs activeTab={status} onChange={setStatus} style={{ marginBottom: 12 }}>
          <Tabs.TabPane key="全部" title={`全部（${applications.length}）`} />
          <Tabs.TabPane key="开票中" title={`待开票（${applications.filter(item => item.status === '开票中').length}）`} />
          <Tabs.TabPane key="已开票" title={`已开票（${applications.filter(item => item.status === '已开票').length}）`} />
          <Tabs.TabPane key="已冲红" title={`已冲红（${applications.filter(item => item.status === '已冲红').length}）`} />
        </Tabs>
        <Table rowKey="id" size="small" columns={columns} data={data} pagination={{ pageSize: 10 }} scroll={{ x: 1350 }} noDataElement="暂无项目开票申请" />
      </Card>

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
            <Descriptions column={2} data={detailData} border />
            <div>
              <div className="project-invoice-upload-title">当前项目每期回款情况</div>
              <Table
                rowKey="periodId"
                size="small"
                pagination={false}
                data={paymentPeriods}
                noDataElement="暂无回款期次数据"
                columns={[
                  { title: '期次', dataIndex: 'periodLabel', width: 100 },
                  { title: '应回款', dataIndex: 'expectedAmount', width: 130, render: currency },
                  { title: '实际回款', dataIndex: 'paidAmount', width: 130, render: currency },
                  { title: '预计日期', dataIndex: 'expectedDate', width: 120, render: (value: string) => value || '-' },
                  { title: '回款状态', dataIndex: 'paymentStatus', width: 110, render: (value: string) => <Tag color={value === '已回款' ? 'green' : value === '部分回款' ? 'orange' : 'gray'}>{value}</Tag> },
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
                <Space wrap>{active.invoiceFiles.map(file => <Button key={file} type="text" icon={<IconFile />} onClick={() => downloadFile(file)}>{file}</Button>)}</Space>
              )}
            </div>
            {active.status === '已冲红' ? <div><div className="project-invoice-upload-title">冲红附件</div>{active.redFlushFiles?.length ? <Space wrap>{active.redFlushFiles.map(file => <Button key={file} type="text" icon={<IconFile />} onClick={() => downloadFile(file)}>{file}</Button>)}</Space> : <Text type="secondary">暂无冲红附件</Text>}</div> : null}
          </Space>
        )}
      </Modal>
    </div>
  );
}
