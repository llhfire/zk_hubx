import { useState } from 'react';
import { Card, Table, Tooltip, Button, Input, Select, DatePicker, Space, Modal, Descriptions, Tag, Progress } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye } from '@arco-design/web-react/icon';

const { RangePicker } = DatePicker;

export function PaymentInvoiceList() {
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    type: '',
    status: '',
    dateRange: [],
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // 模拟数据
  const mockData = [
    {
      id: '1',
      recordNo: 'PI20260425001',
      contractNo: 'CT20260320001',
      leadName: '阿里巴巴-企业管理系统',
      customerEntity: '阿里巴巴（中国）有限公司',
      ourEntity: '北京科技有限公司',
      totalAmount: 500000,
      receivedAmount: 200000,
      receivedRate: 40,
      invoicedAmount: 150000,
      invoicedRate: 30,
      type: '回款',
      status: '部分收款',
      latestDate: '2026-04-20',
      payments: [
        { period: 1, planDate: '2026-04-01', amount: 200000, actualDate: '2026-04-05', status: '已收款' },
        { period: 2, planDate: '2026-05-01', amount: 150000, actualDate: null, status: '未收款' },
        { period: 3, planDate: '2026-06-01', amount: 150000, actualDate: null, status: '未收款' },
      ],
      invoices: [
        { invoiceNo: 'INV20260410001', amount: 150000, invoiceDate: '2026-04-10', type: '增值税专用发票' },
      ],
    },
    {
      id: '2',
      recordNo: 'PI20260424001',
      contractNo: 'CT20260315001',
      leadName: '腾讯-云服务平台',
      customerEntity: '腾讯科技（深圳）有限公司',
      ourEntity: '北京科技有限公司',
      totalAmount: 800000,
      receivedAmount: 800000,
      receivedRate: 100,
      invoicedAmount: 800000,
      invoicedRate: 100,
      type: '发票',
      status: '已完成',
      latestDate: '2026-04-24',
      payments: [
        { period: 1, planDate: '2026-03-20', amount: 400000, actualDate: '2026-03-22', status: '已收款' },
        { period: 2, planDate: '2026-04-20', amount: 400000, actualDate: '2026-04-18', status: '已收款' },
      ],
      invoices: [
        { invoiceNo: 'INV20260325001', amount: 400000, invoiceDate: '2026-03-25', type: '增值税专用发票' },
        { invoiceNo: 'INV20260424001', amount: 400000, invoiceDate: '2026-04-24', type: '增值税专用发票' },
      ],
    },
  ];

  const columns = [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      width: 140,
    },
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      width: 140,
    },
    {
      title: '线索名称',
      dataIndex: 'leadName',
      width: 200,
    },
    {
      title: '客户主体',
      dataIndex: 'customerEntity',
      width: 200,
    },
    {
      title: '对接主体',
      dataIndex: 'ourEntity',
      width: 150,
    },
    {
      title: '合同总额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '已收金额',
      dataIndex: 'receivedAmount',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '回款进度',
      dataIndex: 'receivedRate',
      width: 150,
      render: (rate: number) => <Progress percent={rate} size="small" />,
    },
    {
      title: '已开票金额',
      dataIndex: 'invoicedAmount',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '开票进度',
      dataIndex: 'invoicedRate',
      width: 150,
      render: (rate: number) => <Progress percent={rate} size="small" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          '部分收款': { color: 'orange', text: '部分收款' },
          '已完成': { color: 'green', text: '已完成' },
          '逾期': { color: 'red', text: '逾期' },
        };
        const config = statusMap[status] || { color: 'gray', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '最新日期',
      dataIndex: 'latestDate',
      width: 120,
    },
    {
      title: '操作',
      dataIndex: 'op',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Tooltip content="查看详情">
          <Button type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  const handleSearch = () => {
    console.log('搜索条件：', searchForm);
  };

  const handleReset = () => {
    setSearchForm({
      keyword: '',
      type: '',
      status: '',
      dateRange: [],
    });
  };

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setDetailVisible(true);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            style={{ width: 200 }}
            placeholder="搜索编号/线索名称"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
            allowClear
          />
          <Select
            style={{ width: 150 }}
            placeholder="类型"
            value={searchForm.type}
            onChange={(value) => setSearchForm({ ...searchForm, type: value })}
            allowClear
            options={[
              { label: '回款', value: '回款' },
              { label: '发票', value: '发票' },
            ]}
          />
          <Select
            style={{ width: 150 }}
            placeholder="选择状态"
            value={searchForm.status}
            onChange={(value) => setSearchForm({ ...searchForm, status: value })}
            allowClear
            options={[
              { label: '部分收款', value: '部分收款' },
              { label: '已完成', value: '已完成' },
              { label: '逾期', value: '逾期' },
            ]}
          />
          <RangePicker
            style={{ width: 280 }}
            placeholder={['开始日期', '结束日期']}
            value={searchForm.dateRange}
            onChange={(value) => setSearchForm({ ...searchForm, dateRange: value })}
          />
          <Button type="primary" icon={<IconSearch />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card
        title="回款与发票列表"
        extra={
          <Button type="primary" icon={<IconPlus />}>
            新增记录
          </Button>
        }
      >
        <Table
          columns={columns}
          data={mockData}
          scroll={{ x: 1800 }}
          pagination={{
            total: mockData.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      <Modal
        title="回款与发票详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 1000 }}
      >
        {selectedRecord && (
          <div>
            <Descriptions
              column={2}
              data={[
                { label: '记录编号', value: selectedRecord.recordNo },
                { label: '合同编号', value: selectedRecord.contractNo },
                { label: '线索名称', value: selectedRecord.leadName },
                { label: '客户主体', value: selectedRecord.customerEntity },
                { label: '对接主体', value: selectedRecord.ourEntity },
                { label: '合同总额', value: `¥${selectedRecord.totalAmount.toLocaleString()}` },
                { label: '已收金额', value: `¥${selectedRecord.receivedAmount.toLocaleString()}` },
                { label: '回款进度', value: `${selectedRecord.receivedRate}%` },
                { label: '已开票金额', value: `¥${selectedRecord.invoicedAmount.toLocaleString()}` },
                { label: '开票进度', value: `${selectedRecord.invoicedRate}%` },
                {
                  label: '状态',
                  value: (
                    <Tag color={selectedRecord.status === '部分收款' ? 'orange' : selectedRecord.status === '已完成' ? 'green' : 'red'}>
                      {selectedRecord.status}
                    </Tag>
                  ),
                },
              ]}
              style={{ marginBottom: 24 }}
            />

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>回款记录</div>
              <Table
                columns={[
                  { title: '期数', dataIndex: 'period', width: 80 },
                  { title: '计划日期', dataIndex: 'planDate', width: 120 },
                  { title: '金额', dataIndex: 'amount', width: 150, render: (v: number) => `¥${v.toLocaleString()}` },
                  { title: '实际日期', dataIndex: 'actualDate', width: 120, render: (v: string | null) => v || '-' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 100,
                    render: (status: string) => (
                      <Tag color={status === '已收款' ? 'green' : 'orange'}>{status}</Tag>
                    ),
                  },
                ]}
                data={selectedRecord.payments}
                pagination={false}
                size="small"
              />
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>发票记录</div>
              <Table
                columns={[
                  { title: '发票号', dataIndex: 'invoiceNo', width: 140 },
                  { title: '金额', dataIndex: 'amount', width: 150, render: (v: number) => `¥${v.toLocaleString()}` },
                  { title: '开票日期', dataIndex: 'invoiceDate', width: 120 },
                  { title: '发票类型', dataIndex: 'type' },
                ]}
                data={selectedRecord.invoices}
                pagination={false}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
