import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Button, Card, DatePicker, Descriptions, Input, Message, Modal, Progress,
  Select, Space, Table, Tag, Tooltip,
} from '@arco-design/web-react';
import { IconEye } from '@arco-design/web-react/icon';
import { PageHeader, PageShell, ProcessMetricGrid, ProcessOverview } from '@/app/components/ui';
import { useCollections } from '@/app/collections/CollectionContext';
import { useLeads } from '@/app/leads/LeadContext';
import { useContracts } from './contracts/ContractsContext';
import { useProjectInvoices } from './finance/ProjectInvoiceContext';
import {
  buildPaymentInvoiceRows,
  type PaymentInvoiceRecordRow,
  type PaymentInvoiceStatus,
} from './paymentInvoiceReadModel';
import {
  buildAfterSalesHandoff,
  isAfterSalesHandoffReady,
  loadAfterSalesHandoffs,
  saveAfterSalesHandoff,
} from './alphaFlowContinuity';

const { RangePicker } = DatePicker;

const STATUS_COLOR: Record<PaymentInvoiceStatus, string> = {
  待收款: 'gray', 部分收款: 'orange', 逾期: 'red', 已完成: 'green',
};

interface SearchForm {
  keyword: string;
  type: '' | '回款' | '发票';
  status: '' | PaymentInvoiceStatus;
  dateRange: string[];
}

const EMPTY_SEARCH: SearchForm = { keyword: '', type: '', status: '', dateRange: [] };

export function PaymentInvoiceList() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const { applications } = useProjectInvoices();
  const { leads } = useLeads();
  const [searchForm, setSearchForm] = useState<SearchForm>(EMPTY_SEARCH);
  const [selectedRecord, setSelectedRecord] = useState<PaymentInvoiceRecordRow | null>(null);
  const [afterSalesHandoffs, setAfterSalesHandoffs] = useState(loadAfterSalesHandoffs);

  const rows = useMemo(
    () => buildPaymentInvoiceRows({ contracts, collections, applications, leads }),
    [contracts, collections, applications, leads],
  );

  const filteredRows = useMemo(() => rows.filter(record => {
    const keyword = searchForm.keyword.trim().toLowerCase();
    const keywordHit = !keyword || [record.recordNo, record.contractNo, record.leadName, record.customerEntity]
      .some(value => value.toLowerCase().includes(keyword));
    const typeHit = !searchForm.type
      || (searchForm.type === '回款' ? record.hasPayment : record.hasInvoice);
    const statusHit = !searchForm.status || record.status === searchForm.status;
    const dateHit = searchForm.dateRange.length !== 2
      || (record.latestDate >= searchForm.dateRange[0] && record.latestDate <= searchForm.dateRange[1]);
    return keywordHit && typeHit && statusHit && dateHit;
  }), [rows, searchForm]);
  const paymentPeriodCount = rows.reduce((sum, record) => sum + record.payments.length, 0);
  const overdueCount = rows.reduce((sum, record) => sum + record.payments.filter((payment) => payment.status === '逾期').length, 0);
  const invoiceCount = rows.reduce((sum, record) => sum + record.invoices.length, 0);
  const redFlushCount = rows.reduce((sum, record) => sum + record.invoices.filter((invoice) => invoice.status === '已冲红').length, 0);

  const selectedOverdueCount = selectedRecord?.payments.filter((payment) => payment.status === '逾期').length ?? 0;
  const selectedReadyForHandoff = selectedRecord ? isAfterSalesHandoffReady({
    receivedRate: selectedRecord.receivedRate,
    invoicedRate: selectedRecord.invoicedRate,
    overdueCount: selectedOverdueCount,
    invoiceStatuses: selectedRecord.invoices.map((invoice) => invoice.status),
  }) : false;
  const selectedHandoff = selectedRecord
    ? afterSalesHandoffs.find((handoff) => handoff.contractId === selectedRecord.contractId)
    : undefined;

  const handleAfterSalesHandoff = () => {
    if (!selectedRecord || !selectedReadyForHandoff) return;
    const handedOffAt = new Date().toISOString().slice(0, 10);
    saveAfterSalesHandoff(buildAfterSalesHandoff({
      contractId: selectedRecord.contractId,
      contractNo: selectedRecord.contractNo,
      projectName: selectedRecord.leadName,
      customerName: selectedRecord.customerEntity,
      handedOffAt,
    }));
    setAfterSalesHandoffs(loadAfterSalesHandoffs());
    Message.success('已移交售后并生成六个月维护期');
  };

  const columns = [
    { title: '记录编号', dataIndex: 'recordNo', width: 150 },
    {
      title: '合同编号', dataIndex: 'contractNo', width: 140,
      render: (value: string, record: PaymentInvoiceRecordRow) => (
        <a onClick={() => navigate(`/contracts/${record.contractId}`)}>{value}</a>
      ),
    },
    { title: '线索/合同名称', dataIndex: 'leadName', width: 220 },
    { title: '客户主体', dataIndex: 'customerEntity', width: 190 },
    { title: '对接主体', dataIndex: 'ourEntity', width: 130 },
    { title: '合同总额', dataIndex: 'totalAmount', width: 120, render: (value: number) => `¥${value.toLocaleString()}` },
    { title: '已收金额', dataIndex: 'receivedAmount', width: 120, render: (value: number) => `¥${value.toLocaleString()}` },
    { title: '回款进度', dataIndex: 'receivedRate', width: 150, render: (rate: number) => <Progress percent={rate} size="small" /> },
    { title: '已开票金额', dataIndex: 'invoicedAmount', width: 120, render: (value: number) => `¥${value.toLocaleString()}` },
    { title: '开票进度', dataIndex: 'invoicedRate', width: 150, render: (rate: number) => <Progress percent={rate} size="small" /> },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: PaymentInvoiceStatus) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
    },
    { title: '最新日期', dataIndex: 'latestDate', width: 120 },
    {
      title: '操作', width: 80, fixed: 'right' as const,
      render: (_: unknown, record: PaymentInvoiceRecordRow) => (
        <Tooltip content="查看详情">
          <Button type="text" size="small" icon={<IconEye />} aria-label={`查看${record.contractNo}的回款与发票详情`} onClick={() => setSelectedRecord(record)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <PageShell breadcrumbs={[{ label: '财务管理', to: '/finance/dashboard' }, { label: '回款与发票' }]}>
      <PageHeader
        title="回款与发票"
        description="以合同为主线汇总回款计划、实际到账与项目开票记录。"
        actions={(
          <Space>
            <Button onClick={() => navigate('/contracts/payments')}>回款管理</Button>
            <Button type="primary" onClick={() => navigate('/finance/project-invoices')}>开票审核</Button>
          </Space>
        )}
      />

      <ProcessOverview
        identifier="FINANCE-CLOSURE"
        title="合同结清与售后移交流程"
        tags={<><Tag color={overdueCount ? 'red' : 'green'}>{overdueCount ? `${overdueCount} 个逾期期次` : '当前无逾期'}</Tag><Tag color="arcoblue">α 流程接缝</Tag></>}
        steps={[
          { key: 'period', title: '回款期次', description: `${paymentPeriodCount} 个计划期次` },
          { key: 'overdue', title: '逾期处理', description: overdueCount ? `${overdueCount} 个待处理` : '无逾期阻断' },
          { key: 'invoice', title: '开票与红冲', description: `${invoiceCount} 条申请 · ${redFlushCount} 条红冲` },
          { key: 'after-sales', title: '售后移交', description: `${afterSalesHandoffs.length} 个已移交` },
        ]}
        currentStep={afterSalesHandoffs.length ? 3 : invoiceCount ? 2 : overdueCount ? 1 : 0}
      />

      <ProcessMetricGrid items={[
        { key: 'periods', label: '回款期次', value: paymentPeriodCount, detail: `${rows.length} 份履约合同` },
        { key: 'overdue', label: '逾期期次', value: overdueCount, detail: overdueCount ? '需催收或登记卡点' : '当前无阻断', tone: overdueCount ? 'danger' : 'success' },
        { key: 'invoices', label: '开票记录', value: invoiceCount, detail: `含 ${redFlushCount} 条红冲`, tone: redFlushCount ? 'warning' : 'neutral' },
        { key: 'handoffs', label: '售后移交', value: afterSalesHandoffs.length, detail: '满足结清条件后生成维护期', tone: afterSalesHandoffs.length ? 'success' : 'neutral' },
      ]} />

      {overdueCount > 0 && <Alert type="warning" showIcon content={`当前有 ${overdueCount} 个逾期期次。请先在回款管理完成催收、到账或卡点登记，再继续售后移交。`} />}

      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            style={{ width: 240 }} placeholder="搜索记录、合同、客户或名称"
            value={searchForm.keyword}
            onChange={keyword => setSearchForm(current => ({ ...current, keyword }))}
            allowClear
          />
          <Select
            style={{ width: 130 }} placeholder="数据类型" value={searchForm.type}
            onChange={type => setSearchForm(current => ({ ...current, type }))}
            allowClear options={[{ label: '有回款', value: '回款' }, { label: '有发票', value: '发票' }]}
          />
          <Select
            style={{ width: 130 }} placeholder="选择状态" value={searchForm.status}
            onChange={status => setSearchForm(current => ({ ...current, status }))}
            allowClear options={Object.keys(STATUS_COLOR).map(status => ({ label: status, value: status }))}
          />
          <RangePicker
            style={{ width: 260 }} placeholder={['开始日期', '结束日期']}
            value={searchForm.dateRange}
            onChange={dateRange => setSearchForm(current => ({ ...current, dateRange }))}
          />
          <Button onClick={() => setSearchForm(EMPTY_SEARCH)}>重置</Button>
        </Space>
      </Card>

      <Card title={`合同履约台账（${filteredRows.length}）`}>
        <Table
          columns={columns} data={filteredRows} rowKey="id" scroll={{ x: 1750 }}
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: true }}
        />
      </Card>

      <Modal
        title="回款与发票详情" visible={Boolean(selectedRecord)}
        onCancel={() => setSelectedRecord(null)} footer={null} style={{ width: 1000 }}
      >
        {selectedRecord && (
          <div>
            <Card size="small" title="后半程流程接缝" style={{ marginBottom: 20 }}>
              <ProcessMetricGrid items={[
                { key: 'period', label: '回款期次', value: selectedRecord.payments.length, detail: `${selectedOverdueCount} 个逾期`, tone: selectedOverdueCount ? 'danger' : 'success' },
                { key: 'payment', label: '回款完成', value: `${selectedRecord.receivedRate}%`, detail: '按有效合同金额计算' },
                { key: 'invoice', label: '开票完成', value: `${selectedRecord.invoicedRate}%`, detail: selectedRecord.invoices.some((invoice) => invoice.status === '开票中') ? '存在开票中记录' : `红冲 ${selectedRecord.invoices.filter((invoice) => invoice.status === '已冲红').length} 条` },
                { key: 'handoff', label: '售后移交', value: selectedHandoff ? '已移交' : selectedReadyForHandoff ? '可移交' : '待结清', detail: selectedHandoff?.handedOffAt || '需无逾期且回款、开票均完成', tone: selectedHandoff || selectedReadyForHandoff ? 'success' : 'warning' },
              ]} />
              <Space wrap style={{ marginTop: 12 }}>
                <Button onClick={() => navigate(`/contracts/payments?contractId=${selectedRecord.contractId}`)}>{selectedOverdueCount ? '处理逾期与催收' : '查看回款期次'}</Button>
                <Button onClick={() => navigate(`/finance/project-invoices?contractId=${selectedRecord.contractId}`)}>处理开票与红冲</Button>
                <Button type="primary" disabled={!selectedReadyForHandoff || Boolean(selectedHandoff)} onClick={handleAfterSalesHandoff}>{selectedHandoff ? '已移交售后' : '确认移交售后'}</Button>
                {selectedHandoff && <Button onClick={() => navigate('/maintenance')}>查看售后维护</Button>}
              </Space>
            </Card>
            <Descriptions
              column={2}
              data={[
                { label: '记录编号', value: selectedRecord.recordNo },
                { label: '合同编号', value: selectedRecord.contractNo },
                { label: '线索/合同名称', value: selectedRecord.leadName },
                { label: '客户主体', value: selectedRecord.customerEntity },
                { label: '对接主体', value: selectedRecord.ourEntity },
                { label: '合同总额', value: `¥${selectedRecord.totalAmount.toLocaleString()}` },
                { label: '已收金额', value: `¥${selectedRecord.receivedAmount.toLocaleString()}（${selectedRecord.receivedRate}%）` },
                { label: '已开票金额', value: `¥${selectedRecord.invoicedAmount.toLocaleString()}（${selectedRecord.invoicedRate}%）` },
                { label: '状态', value: <Tag color={STATUS_COLOR[selectedRecord.status]}>{selectedRecord.status}</Tag> },
              ]}
              style={{ marginBottom: 24 }}
            />

            <div style={{ fontWeight: 600, marginBottom: 12 }}>回款计划与实收</div>
            <Table
              columns={[
                { title: '合同', dataIndex: 'contractNo', width: 130 },
                { title: '期次', dataIndex: 'periodName', width: 100 },
                { title: '计划日期', dataIndex: 'planDate', width: 120 },
                { title: '应收金额', dataIndex: 'amount', width: 130, render: (value: number) => `¥${value.toLocaleString()}` },
                { title: '实收金额', dataIndex: 'receivedAmount', width: 130, render: (value: number) => `¥${value.toLocaleString()}` },
                { title: '到账日期', dataIndex: 'actualDate', width: 120 },
                { title: '状态', dataIndex: 'status', width: 100, render: (status: string) => <Tag>{status}</Tag> },
              ]}
              data={selectedRecord.payments} rowKey="key" pagination={false} size="small"
              style={{ marginBottom: 24 }}
            />

            <div style={{ fontWeight: 600, marginBottom: 12 }}>开票申请</div>
            <Table
              columns={[
                { title: '申请编号', dataIndex: 'id', width: 190 },
                { title: '期次', dataIndex: 'periodLabel', width: 100 },
                { title: '金额', dataIndex: 'amount', width: 130, render: (value: number) => `¥${value.toLocaleString()}` },
                { title: '申请日期', dataIndex: 'submittedAt', width: 160 },
                { title: '发票类型', dataIndex: 'invoiceType', width: 130 },
                { title: '状态', dataIndex: 'status', width: 100, render: (status: string) => <Tag>{status}</Tag> },
              ]}
              data={selectedRecord.invoices} rowKey="id" pagination={false} size="small"
            />
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
