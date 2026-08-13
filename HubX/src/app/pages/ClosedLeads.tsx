import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  Grid,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconEye, IconSearch } from '@arco-design/web-react/icon';

const { Title, Text } = Typography;

const closedLeads = [
  {
    key: '1',
    id: 'LS001',
    name: '某科技公司APP开发需求',
    customer: '北京科技有限公司',
    contact: '张经理',
    phone: '138****1111',
    source: '百度推广',
    owner: '张三',
    entity: '中科软艺',
    closedStatus: '已签约',
    closeDate: '2026-04-12',
    contractNo: 'ZKRY202604080001',
    contractAmount: 680000,
    receivedAmount: 408000,
    projectName: 'APP开发项目',
    projectStatus: '进行中',
    conversionDays: 18,
    lastFollow: '合同已签署，首期款到账',
  },
  {
    key: '2',
    id: 'LS002',
    name: '企业管理系统定制',
    customer: '上海商贸公司',
    contact: '李总',
    phone: '139****2222',
    source: '小红书',
    owner: '李四',
    entity: '软艺信息',
    closedStatus: '已立项',
    closeDate: '2026-05-02',
    contractNo: 'ZKRY202605020003',
    contractAmount: 420000,
    receivedAmount: 126000,
    projectName: '管理系统一期',
    projectStatus: '需求调研',
    conversionDays: 26,
    lastFollow: '项目已立项，等待原型评审',
  },
  {
    key: '3',
    id: 'LS003',
    name: '小程序开发项目',
    customer: '深圳电商公司',
    contact: '王总',
    phone: '136****3333',
    source: '微信推广',
    owner: '王五',
    entity: '中科集团',
    closedStatus: '回款中',
    closeDate: '2026-05-18',
    contractNo: 'ZKRY202605180006',
    contractAmount: 260000,
    receivedAmount: 130000,
    projectName: '电商小程序',
    projectStatus: '开发中',
    conversionDays: 14,
    lastFollow: '二期款待客户财务排款',
  },
];

export function ClosedLeads() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();

  const filteredLeads = useMemo(() => {
    return closedLeads.filter((lead) => {
      const hitKeyword = !keyword || [lead.id, lead.name, lead.customer, lead.contractNo, lead.projectName]
        .some((item) => item.includes(keyword));
      return hitKeyword && (!status || lead.closedStatus === status);
    });
  }, [keyword, status]);

  const totalAmount = filteredLeads.reduce((sum, lead) => sum + lead.contractAmount, 0);
  const receivedAmount = filteredLeads.reduce((sum, lead) => sum + lead.receivedAmount, 0);

  const columns = [
    { title: '线索ID', dataIndex: 'id', width: 100 },
    {
      title: '线索名称',
      dataIndex: 'name',
      width: 220,
      render: (name: string, record: any) => (
        <Button type="text" size="small" onClick={() => navigate(`/projects/${record.key}`)}>
          {name}
        </Button>
      ),
    },
    { title: '客户名称', dataIndex: 'customer', width: 160 },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    { title: '来源', dataIndex: 'source', width: 110 },
    { title: '归属人', dataIndex: 'owner', width: 100 },
    {
      title: '成交状态',
      dataIndex: 'closedStatus',
      width: 110,
      render: (value: string) => <Tag color={value === '已签约' ? 'green' : value === '已立项' ? 'arcoblue' : 'orange'}>{value}</Tag>,
    },
    { title: '成交日期', dataIndex: 'closeDate', width: 120 },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      width: 130,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '已回款',
      dataIndex: 'receivedAmount',
      width: 130,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    { title: '关联合同', dataIndex: 'contractNo', width: 160 },
    { title: '关联项目', dataIndex: 'projectName', width: 160 },
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Tooltip content="详情">
          <Button type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/projects/${record.key}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4} style={{ margin: 0 }}>已成交线索</Title>
      </div>

      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        <Grid.Col span={6}>
          <Card>
            <Text type="secondary">成交线索数</Text>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{filteredLeads.length}</div>
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card>
            <Text type="secondary">合同总额</Text>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'rgb(var(--primary-6))' }}>¥{totalAmount.toLocaleString()}</div>
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card>
            <Text type="secondary">已回款金额</Text>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'rgb(var(--success-6))' }}>¥{receivedAmount.toLocaleString()}</div>
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card>
            <Text type="secondary">平均转化周期</Text>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{Math.round(filteredLeads.reduce((sum, lead) => sum + lead.conversionDays, 0) / Math.max(filteredLeads.length, 1))} 天</div>
          </Card>
        </Grid.Col>
      </Grid.Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<IconSearch />}
            placeholder="搜索线索、客户、合同或项目"
            value={keyword}
            onChange={setKeyword}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder="成交状态"
            value={status}
            onChange={setStatus}
            style={{ width: 140 }}
          >
            <Select.Option value="已签约">已签约</Select.Option>
            <Select.Option value="已立项">已立项</Select.Option>
            <Select.Option value="回款中">回款中</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          data={filteredLeads}
          rowKey="key"
          scroll={{ x: 1700 }}
          pagination={false}
        />
      </Card>
    </div>
  );
}
