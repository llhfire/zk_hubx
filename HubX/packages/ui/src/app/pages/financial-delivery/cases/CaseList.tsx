import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Button,
  Input,
  Tag,
  Table,
  Select,
  Space,
  Typography,
  Grid,
  Progress,
  Message,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconSearch,
  IconDownload,
  IconEye,
  IconEdit,
} from '@arco-design/web-react/icon';
import {
  mockCases,
  CaseStatus,
  HealthStatus,
  caseStatusMap,
  healthStatusMap,
  industryOptions,
  projectTypeOptions,
} from '../mockData';
import type { Case } from '../mockData';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;

export default function CaseList() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return mockCases.filter((item) => {
      // 关键词筛选
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const match =
          item.caseNo.toLowerCase().includes(keyword) ||
          (item.leadName && item.leadName.toLowerCase().includes(keyword)) ||
          (item.projectName && item.projectName.toLowerCase().includes(keyword));
        if (!match) return false;
      }

      // 状态筛选
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // 行业筛选
      if (industryFilter !== 'all' && item.industry !== industryFilter) {
        return false;
      }

      return true;
    });
  }, [searchKeyword, statusFilter, industryFilter]);

  // 统计数据
  const statistics = useMemo(() => {
    const total = filteredData.length;
    const inProgress = filteredData.filter((item) => item.status === CaseStatus.IN_PROGRESS).length;
    const completed = filteredData.filter((item) => item.status === CaseStatus.COMPLETED).length;
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    const totalCost = filteredData.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const alertCount = filteredData.filter(
      (item) => item.healthStatus === HealthStatus.YELLOW || item.healthStatus === HealthStatus.RED
    ).length;

    return { total, inProgress, completed, totalRevenue, totalCost, totalProfit, profitMargin, alertCount };
  }, [filteredData]);

  const columns = [
    {
      title: '业务单编号',
      dataIndex: 'caseNo',
      width: 150,
      render: (value: string, record: Case) => (
        <Button type="text" size="small" onClick={() => navigate(`/financial-delivery/cases/${record.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: '关联线索/项目',
      dataIndex: 'leadName',
      width: 180,
      render: (value: string, record: Case) => (
        <div>
          {value && <div style={{ fontSize: 14 }}>{value}</div>}
          {record.projectName && (
            <div style={{ fontSize: 12, color: '#86909c' }}>{record.projectName}</div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: CaseStatus) => {
        const config = caseStatusMap[value];
        const colorMap: Record<string, string> = {
          default: 'blue',
          processing: 'orange',
          success: 'green',
          warning: 'orange',
          error: 'red',
        };
        return <Tag color={colorMap[config.color] || 'blue'}>{config.label}</Tag>;
      },
    },
    {
      title: '健康状态',
      dataIndex: 'healthStatus',
      width: 100,
      render: (value: HealthStatus) => {
        const config = healthStatusMap[value];
        const colorMap: Record<string, string> = {
          green: 'green',
          yellow: 'orange',
          red: 'red',
        };
        return <Tag color={colorMap[config.color] || 'blue'}>{config.label}</Tag>;
      },
    },
    {
      title: '行业',
      dataIndex: 'industry',
      width: 100,
      render: (value: string) => value || '-',
    },
    {
      title: '项目类型',
      dataIndex: 'projectType',
      width: 120,
      render: (value: string) => value || '-',
    },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      width: 120,
      align: 'right' as const,
      render: (value: number) => value ? `¥${value.toLocaleString()}` : '-',
    },
    {
      title: '当前利润率',
      dataIndex: 'currentMargin',
      width: 150,
      render: (value: number) => {
        if (value === undefined || value === null) return '-';
        const color = value >= 30 ? '#00b42a' : value >= 20 ? '#fa8c16' : '#f53f3f';
        return (
          <Space>
            <Progress
              percent={Math.min(100, value)}
              size="small"
              style={{ width: 60 }}
              showText={false}
              color={color}
            />
            <span>{value}%</span>
          </Space>
        );
      },
    },
    {
      title: 'WIP 天数',
      dataIndex: 'wipDays',
      width: 100,
      align: 'center' as const,
      render: (value: number) => {
        if (value === undefined || value === null) return '-';
        const color = value <= 7 ? 'green' : value <= 14 ? 'orange' : 'red';
        return <Tag color={color}>{value}天</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Case) => (
        <Space>
          <Button type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/financial-delivery/cases/${record.id}`)} />
          <Button type="text" size="small" icon={<IconEdit />} onClick={() => navigate(`/financial-delivery/cases/${record.id}/edit`)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title heading={3}>业务单管理</Title>
        <Space>
          <Button icon={<IconDownload />}>导出</Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/financial-delivery/cases/create')}>
            新建业务单
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <div><Text>总业务单数</Text></div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#165dff' }}>{statistics.total}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <div><Text>进行中</Text></div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b42a' }}>{statistics.inProgress}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <div><Text>已完结</Text></div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>{statistics.completed}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <div><Text>预警数</Text></div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>{statistics.alertCount}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text>总利润</Text></div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b42a' }}>
              ¥{statistics.totalProfit.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#86909c' }}>
              利润率: {statistics.profitMargin.toFixed(1)}%
            </div>
          </Card>
        </Col>
      </Row>

      {/* 筛选条件 */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Input
            style={{ width: 300 }}
            placeholder="搜索业务单编号、线索名称、项目名称"
            prefix={<IconSearch />}
            value={searchKeyword}
            onChange={setSearchKeyword}
          />
          <Select
            style={{ width: 180 }}
            placeholder="状态"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">全部状态</Option>
            {Object.entries(caseStatusMap).map(([value, { label }]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
          <Select
            style={{ width: 180 }}
            placeholder="行业"
            value={industryFilter}
            onChange={setIndustryFilter}
          >
            <Option value="all">全部行业</Option>
            {industryOptions.map(({ value, label }) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          data={filteredData}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            total: filteredData.length,
            pageSize: 10,
            showTotal: true,
          }}
        />
      </Card>
    </div>
  );
}
