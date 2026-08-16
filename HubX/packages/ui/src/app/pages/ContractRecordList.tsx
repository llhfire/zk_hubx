import { useState } from 'react';
import { Card, Table, Tooltip, Button, Input, Select, DatePicker, Space, Modal, Descriptions, Tag } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye } from '@arco-design/web-react/icon';

const { RangePicker } = DatePicker;

export function ContractRecordList() {
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '',
    dateRange: [],
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // 模拟数据
  const mockData = [
    {
      id: '1',
      contractNo: 'CT20260320001',
      contractName: '企业管理系统开发合同',
      leadName: '阿里巴巴-企业管理系统',
      customerEntity: '阿里巴巴（中国）有限公司',
      ourEntity: '北京科技有限公司',
      amount: 500000,
      signDate: '2026-03-20',
      startDate: '2026-04-01',
      endDate: '2026-09-30',
      status: '执行中',
      paymentTerms: '分3期付款',
      owner: '张三',
      department: '销售部',
      scope: '包括系统需求分析、设计开发、测试部署、培训及1年维护服务。',
    },
    {
      id: '2',
      contractNo: 'CT20260315001',
      contractName: '云服务平台建设合同',
      leadName: '腾讯-云服务平台',
      customerEntity: '腾讯科技（深圳）有限公司',
      ourEntity: '北京科技有限公司',
      amount: 800000,
      signDate: '2026-03-15',
      startDate: '2026-03-20',
      endDate: '2026-08-20',
      status: '已完成',
      paymentTerms: '分2期付款',
      owner: '李四',
      department: '销售部',
      scope: '云平台架构设计、开发部署、系统集成及技术支持服务。',
    },
    {
      id: '3',
      contractNo: 'CT20260310001',
      contractName: '协作工具定制开发合同',
      leadName: '字节跳动-协作工具',
      customerEntity: '北京字节跳动科技有限公司',
      ourEntity: '上海分公司',
      amount: 350000,
      signDate: '2026-03-10',
      startDate: '2026-03-15',
      endDate: '2026-07-15',
      status: '已终止',
      paymentTerms: '签约付30%，交付付70%',
      owner: '王五',
      department: '销售部',
      scope: '协作系统功能定制、界面设计、开发测试及上线部署。',
    },
  ];

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      width: 140,
    },
    {
      title: '合同名称',
      dataIndex: 'contractName',
      width: 200,
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
      title: '合同金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '签订日期',
      dataIndex: 'signDate',
      width: 120,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      width: 120,
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      width: 120,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          '执行中': { color: 'blue', text: '执行中' },
          '已完成': { color: 'green', text: '已完成' },
          '已终止': { color: 'red', text: '已终止' },
        };
        const config = statusMap[status] || { color: 'gray', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
      status: '',
      dateRange: [],
    });
  };

  const handleViewDetail = (record: any) => {
    setSelectedContract(record);
    setDetailVisible(true);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            key="search-input"
            style={{ width: 200 }}
            placeholder="搜索合同编号/名称"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
            allowClear
          />
          <Select
            key="status-select"
            style={{ width: 150 }}
            placeholder="选择状态"
            value={searchForm.status}
            onChange={(value) => setSearchForm({ ...searchForm, status: value })}
            allowClear
            options={[
              { label: '执行中', value: '执行中' },
              { label: '已完成', value: '已完成' },
              { label: '已终止', value: '已终止' },
            ]}
          />
          <RangePicker
            key="date-range"
            style={{ width: 280 }}
            placeholder={['开始日期', '结束日期']}
            value={searchForm.dateRange}
            onChange={(value) => setSearchForm({ ...searchForm, dateRange: value })}
          />
          <Button key="search-btn" type="primary" icon={<IconSearch />} onClick={handleSearch}>
            搜索
          </Button>
          <Button key="reset-btn" onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card
        title="合同记录列表"
        extra={
          <Button type="primary" icon={<IconPlus />}>
            新增合同
          </Button>
        }
      >
        <Table
          columns={columns}
          data={mockData}
          rowKey="id"
          scroll={{ x: 1700 }}
          pagination={{
            total: mockData.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      <Modal
        title="合同详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 900 }}
      >
        {selectedContract && (
          <div>
            <Descriptions
              column={2}
              data={[
                { label: '合同编号', value: selectedContract.contractNo },
                { label: '合同名称', value: selectedContract.contractName },
                { label: '线索名称', value: selectedContract.leadName },
                { label: '客户主体', value: selectedContract.customerEntity },
                { label: '对接主体', value: selectedContract.ourEntity },
                { label: '合同金额', value: `¥${selectedContract.amount.toLocaleString()}` },
                { label: '签订日期', value: selectedContract.signDate },
                { label: '开始日期', value: selectedContract.startDate },
                { label: '结束日期', value: selectedContract.endDate },
                { label: '负责人', value: selectedContract.owner },
                { label: '部门', value: selectedContract.department },
                { label: '付款条款', value: selectedContract.paymentTerms },
                {
                  label: '状态',
                  value: (
                    <Tag color={selectedContract.status === '执行中' ? 'blue' : selectedContract.status === '已完成' ? 'green' : 'red'}>
                      {selectedContract.status}
                    </Tag>
                  ),
                },
              ]}
              style={{ marginBottom: 24 }}
            />

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>合同范围</div>
              <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
                {selectedContract.scope}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
