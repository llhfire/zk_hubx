import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Select, DatePicker, Space, Modal, Tooltip } from '@/design-system';
import { IconSearch, IconPlus, IconEye } from '@/design-system';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  MoneyText,
  PageHeader,
  PageShell,
  SectionCard,
  StatusTag,
  resolveStatus,
  type StatusMap,
} from '@/design-system';

const { RangePicker } = DatePicker;

const RECORD_STATUS: StatusMap<string> = {
  '执行中': { label: '执行中', tone: 'info' },
  '已完成': { label: '已完成', tone: 'success' },
  '已终止': { label: '已终止', tone: 'danger' },
};

export function ContractRecordList() {
  const navigate = useNavigate();
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '',
    // 不标注的话 `[]` 会被推断成 never[]，RangePicker 回传的 string[] 无法写入。
    dateRange: [] as string[],
  });
  const [appliedSearch, setAppliedSearch] = useState(searchForm);
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
      render: (value: number) => <MoneyText value={value} />,
    },
    {
      title: '签订日期',
      dataIndex: 'signDate',
      width: 120,
      render: (value: string) => <DateText value={value} />,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      width: 120,
      render: (value: string) => <DateText value={value} />,
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      width: 120,
      render: (value: string) => <DateText value={value} />,
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
      render: (status: string) => <StatusTag meta={resolveStatus(RECORD_STATUS, status, status)} />,
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

  const filteredData = useMemo(() => mockData.filter((contract) => {
    const keyword = appliedSearch.keyword.trim().toLowerCase();
    const range = appliedSearch.dateRange as unknown as Array<string | { format?: (pattern: string) => string }>;
    const start = range?.[0] && (typeof range[0] === 'string' ? range[0] : range[0].format?.('YYYY-MM-DD'));
    const end = range?.[1] && (typeof range[1] === 'string' ? range[1] : range[1].format?.('YYYY-MM-DD'));
    return (!keyword || [contract.contractNo, contract.contractName, contract.leadName, contract.customerEntity]
      .some((value) => value.toLowerCase().includes(keyword)))
      && (!appliedSearch.status || contract.status === appliedSearch.status)
      && (!start || contract.signDate >= start)
      && (!end || contract.signDate <= end);
  }), [appliedSearch]);

  const handleSearch = () => setAppliedSearch(searchForm);

  const handleReset = () => {
    setSearchForm({
      keyword: '',
      status: '',
      dateRange: [],
    });
    setAppliedSearch({ keyword: '', status: '', dateRange: [] });
  };

  const handleViewDetail = (record: any) => {
    setSelectedContract(record);
    setDetailVisible(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="合同列表"
        description="维护正式合同与补充合同的归档、回款与作废状态。"
      />
      <div style={{ marginBottom: 16 }}>
        <SectionCard>
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
        </SectionCard>
      </div>

      <SectionCard
        title="合同记录列表"
        extra={(
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/contracts/new')}>
            新增合同
          </Button>
        )}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          rowKey="id"
          scroll={{ x: 1700 }}
          pagination={{
            total: filteredData.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </SectionCard>

      <Modal
        title="合同详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 900 }}
      >
        {selectedContract && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <DescriptionsCard
                columns={2}
                items={[
                  { key: 'contractNo', label: '合同编号', value: selectedContract.contractNo },
                  { key: 'contractName', label: '合同名称', value: selectedContract.contractName },
                  { key: 'leadName', label: '线索名称', value: selectedContract.leadName },
                  { key: 'customerEntity', label: '客户主体', value: selectedContract.customerEntity },
                  { key: 'ourEntity', label: '对接主体', value: selectedContract.ourEntity },
                  { key: 'amount', label: '合同金额', value: <MoneyText value={selectedContract.amount} /> },
                  { key: 'signDate', label: '签订日期', value: <DateText value={selectedContract.signDate} /> },
                  { key: 'startDate', label: '开始日期', value: <DateText value={selectedContract.startDate} /> },
                  { key: 'endDate', label: '结束日期', value: <DateText value={selectedContract.endDate} /> },
                  { key: 'owner', label: '负责人', value: selectedContract.owner },
                  { key: 'department', label: '部门', value: selectedContract.department },
                  { key: 'paymentTerms', label: '付款条款', value: selectedContract.paymentTerms },
                  {
                    key: 'status',
                    label: '状态',
                    value: <StatusTag meta={resolveStatus(RECORD_STATUS, selectedContract.status, selectedContract.status)} />,
                  },
                ]}
              />
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>合同范围</div>
              <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 'var(--radius-xs)' }}>
                {selectedContract.scope}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
