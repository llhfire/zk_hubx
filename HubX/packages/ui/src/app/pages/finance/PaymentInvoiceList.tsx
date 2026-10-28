import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, DatePicker, Input, Message, Modal, Select, Space, Tooltip } from '@/design-system';
import { IconEye } from '@/design-system';
import {
  DataTable,
  DateText,
  MoneyText,
  PageHeader,
  PageShell,
  MetricGrid,
  ProcessOverview,
  SectionCard,
  StatusTag,
  type StatusMap,
  DescriptionsCard,
  AlertBanner,
  ProgressBar,
  PaymentProgress,
} from '@/design-system';
import { useCollections } from '../../collections/CollectionContext';
import { useLeads } from '../../leads/LeadContext';
import { useContracts } from '../sales/contracts/ContractsContext';
import { useProjectInvoices } from './invoice/ProjectInvoiceContext';
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
} from '../sales/leads/alphaFlowContinuity';

const { RangePicker } = DatePicker;

const PAYMENT_INVOICE_STATUS: StatusMap<PaymentInvoiceStatus> = {
  待收款: { label: '待收款', tone: 'neutral' },
  部分收款: { label: '部分收款', tone: 'warning' },
  逾期: { label: '逾期', tone: 'danger' },
  已完成: { label: '已完成', tone: 'success' },
};

const PAYMENT_PERIOD_STATUS: StatusMap<'未收款' | '部分收款' | '已收款' | '逾期'> = {
  未收款: { label: '未收款', tone: 'neutral' },
  部分收款: { label: '部分收款', tone: 'warning' },
  已收款: { label: '已收款', tone: 'success' },
  逾期: { label: '逾期', tone: 'danger' },
};

const INVOICE_APPLICATION_STATUS: StatusMap<'开票中' | '已开票' | '已冲红'> = {
  开票中: { label: '开票中', tone: 'warning' },
  已开票: { label: '已开票', tone: 'success' },
  已冲红: { label: '已冲红', tone: 'danger' },
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
    { title: '合同总额', dataIndex: 'totalAmount', width: 120, render: (value: number) => <MoneyText value={value} /> },
    { title: '已收金额', dataIndex: 'receivedAmount', width: 120, render: (value: number) => <MoneyText value={value} /> },
    { title: '回款进度', dataIndex: 'receivedRate', width: 150, render: (_rate: number, record: PaymentInvoiceRecordRow) => <PaymentProgress received={record.receivedAmount} total={record.totalAmount} size="small" showAmounts={false} /> },
    { title: '已开票金额', dataIndex: 'invoicedAmount', width: 120, render: (value: number) => <MoneyText value={value} /> },
    { title: '开票进度', dataIndex: 'invoicedRate', width: 150, render: (rate: number) => <ProgressBar percent={rate} size="small" /> },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: PaymentInvoiceStatus) => <StatusTag meta={PAYMENT_INVOICE_STATUS[status]} />,
    },
    { title: '最新日期', dataIndex: 'latestDate', width: 120, render: (value: string) => <DateText value={value} /> },
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
        tags={<><StatusTag tone={overdueCount ? 'danger' : 'success'}>{overdueCount ? `${overdueCount} 个逾期期次` : '当前无逾期'}</StatusTag><StatusTag tone="info">α 流程接缝</StatusTag></>}
        steps={[
          { key: 'period', title: '回款期次', description: `${paymentPeriodCount} 个计划期次` },
          { key: 'overdue', title: '逾期处理', description: overdueCount ? `${overdueCount} 个待处理` : '无逾期阻断' },
          { key: 'invoice', title: '开票与红冲', description: `${invoiceCount} 条申请 · ${redFlushCount} 条红冲` },
          { key: 'after-sales', title: '售后移交', description: `${afterSalesHandoffs.length} 个已移交` },
        ]}
        currentStep={afterSalesHandoffs.length ? 3 : invoiceCount ? 2 : overdueCount ? 1 : 0}
      />

      <MetricGrid items={[
        { key: 'periods', label: '回款期次', value: paymentPeriodCount, detail: `${rows.length} 份履约合同` },
        { key: 'overdue', label: '逾期期次', value: overdueCount, detail: overdueCount ? '需催收或登记卡点' : '当前无阻断', tone: overdueCount ? 'danger' : 'success' },
        { key: 'invoices', label: '开票记录', value: invoiceCount, detail: `含 ${redFlushCount} 条红冲`, tone: redFlushCount ? 'warning' : 'neutral' },
        { key: 'handoffs', label: '售后移交', value: afterSalesHandoffs.length, detail: '满足结清条件后生成维护期', tone: afterSalesHandoffs.length ? 'success' : 'neutral' },
      ]} />

      {overdueCount > 0 && <AlertBanner tone="warning">{`当前有 ${overdueCount} 个逾期期次。请先在回款管理完成催收、到账或卡点登记，再继续售后移交。`}</AlertBanner>}

      <SectionCard title={`合同履约台账（${filteredRows.length}）`}>
        <DataTable
          columns={columns} data={filteredRows} rowKey="id" scroll={{ x: 1750 }}
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: true }}
          toolbar={(
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
                allowClear options={Object.keys(PAYMENT_INVOICE_STATUS).map(status => ({ label: status, value: status }))}
              />
              <RangePicker
                style={{ width: 260 }} placeholder={['开始日期', '结束日期']}
                value={searchForm.dateRange}
                onChange={dateRange => setSearchForm(current => ({ ...current, dateRange }))}
              />
            </Space>
          )}
          actions={<Button onClick={() => setSearchForm(EMPTY_SEARCH)}>重置</Button>}
        />
      </SectionCard>

      <Modal
        title="回款与发票详情" visible={Boolean(selectedRecord)}
        onCancel={() => setSelectedRecord(null)} footer={null} style={{ width: 1000 }}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <SectionCard title="后半程流程接缝">
                <MetricGrid items={[
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
              </SectionCard>
            </div>
            <DescriptionsCard
              columns={2}
              items={[
              { key: '记录编号', label: '记录编号', value: selectedRecord.recordNo },
              { key: '合同编号', label: '合同编号', value: selectedRecord.contractNo },
              { key: '线索/合同名称', label: '线索/合同名称', value: selectedRecord.leadName },
              { key: '客户主体', label: '客户主体', value: selectedRecord.customerEntity },
              { key: '对接主体', label: '对接主体', value: selectedRecord.ourEntity },
              { key: '合同总额', label: '合同总额', value: <MoneyText value={selectedRecord.totalAmount} /> },
              { key: '已收金额', label: '已收金额', value: <><MoneyText value={selectedRecord.receivedAmount} />（{selectedRecord.receivedRate}%）</> },
              { key: '已开票金额', label: '已开票金额', value: <><MoneyText value={selectedRecord.invoicedAmount} />（{selectedRecord.invoicedRate}%）</> },
              { key: '状态', label: '状态', value: <StatusTag meta={PAYMENT_INVOICE_STATUS[selectedRecord.status]} /> },
            ]}
            />

            <div style={{ fontWeight: 600, marginBottom: 12 }}>回款计划与实收</div>
            <div style={{ marginBottom: 24 }}>
              <DataTable
                columns={[
                  { title: '合同', dataIndex: 'contractNo', width: 130 },
                  { title: '期次', dataIndex: 'periodName', width: 100 },
                  { title: '计划日期', dataIndex: 'planDate', width: 120, render: (value: string) => <DateText value={value} /> },
                  { title: '应收金额', dataIndex: 'amount', width: 130, render: (value: number) => <MoneyText value={value} /> },
                  { title: '实收金额', dataIndex: 'receivedAmount', width: 130, render: (value: number) => <MoneyText value={value} /> },
                  { title: '到账日期', dataIndex: 'actualDate', width: 120, render: (value: string) => <DateText value={value} /> },
                  { title: '状态', dataIndex: 'status', width: 100, render: (status: '未收款' | '部分收款' | '已收款' | '逾期') => <StatusTag meta={PAYMENT_PERIOD_STATUS[status]} /> },
                ]}
                data={selectedRecord.payments} rowKey="key" pagination={false} size="small"
              />
            </div>

            <div style={{ fontWeight: 600, marginBottom: 12 }}>开票申请</div>
            <DataTable
              columns={[
                { title: '申请编号', dataIndex: 'id', width: 190 },
                { title: '期次', dataIndex: 'periodLabel', width: 100 },
                { title: '金额', dataIndex: 'amount', width: 130, render: (value: number) => <MoneyText value={value} /> },
                { title: '申请日期', dataIndex: 'submittedAt', width: 160, render: (value: string) => <DateText value={value} mode="datetime" /> },
                { title: '发票类型', dataIndex: 'invoiceType', width: 130 },
                { title: '状态', dataIndex: 'status', width: 100, render: (status: '开票中' | '已开票' | '已冲红') => <StatusTag meta={INVOICE_APPLICATION_STATUS[status]} /> },
              ]}
              data={selectedRecord.invoices} rowKey="id" pagination={false} size="small"
            />
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
