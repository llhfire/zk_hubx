import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Button,
  Tag,
  Table,
  Space,
  Typography,
  Grid,
} from '@arco-design/web-react';
import {
  IconUp,
  IconDown,
  IconExclamationCircle,
  IconCheckCircle,
  IconClockCircle,
  IconDashboard,
} from '@arco-design/web-react/icon';
import {
  mockCases,
  mockDashboardData,
  CaseStatus,
  HealthStatus,
  caseStatusMap,
  healthStatusMap,
} from '../mockData';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

export default function Dashboard() {
  const navigate = useNavigate();

  // 统计数据
  const statistics = useMemo(() => {
    const totalCases = mockCases.length;
    const inProgressCases = mockCases.filter((c) => c.status === CaseStatus.IN_PROGRESS).length;
    const completedCases = mockCases.filter((c) => c.status === CaseStatus.COMPLETED).length;
    const alertCases = mockCases.filter(
      (c) => c.healthStatus === HealthStatus.YELLOW || c.healthStatus === HealthStatus.RED
    ).length;

    const totalRevenue = mockCases.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const totalCost = mockCases.reduce((sum, c) => sum + (c.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalCases, inProgressCases, completedCases, alertCases, totalRevenue, totalCost, totalProfit, profitMargin };
  }, []);

  // 预警 Case 列表
  const alertCases = useMemo(
    () => mockCases.filter((c) => c.healthStatus === HealthStatus.YELLOW || c.healthStatus === HealthStatus.RED),
    []
  );

  // 最近更新的 Case
  const recentCases = useMemo(
    () => [...mockCases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    []
  );

  const alertColumns = [
    {
      title: '业务单编号',
      dataIndex: 'caseNo',
      width: 120,
      render: (value: string, record: any) => (
        <Button type="text" size="small" onClick={() => navigate(`/financial-delivery/cases/${record.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      width: 150,
      render: (value: string) => value || '-',
    },
    {
      title: '健康状态',
      dataIndex: 'healthStatus',
      width: 100,
      render: (value: string) => (
        <Tag color={value === HealthStatus.YELLOW ? 'orange' : 'red'}>
          {healthStatusMap[value]?.label}
        </Tag>
      ),
    },
    {
      title: '当前利润率',
      dataIndex: 'currentMargin',
      width: 100,
      render: (value: number) => value !== undefined ? `${value}%` : '-',
    },
    {
      title: 'WIP 天数',
      dataIndex: 'wipDays',
      width: 100,
      render: (value: number) => value !== undefined ? `${value}天` : '-',
    },
  ];

  const recentColumns = [
    {
      title: '业务单编号',
      dataIndex: 'caseNo',
      width: 120,
      render: (value: string, record: any) => (
        <Button type="text" size="small" onClick={() => navigate(`/financial-delivery/cases/${record.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => (
        <Tag color={caseStatusMap[value]?.color === 'success' ? 'green' : 'blue'}>
          {caseStatusMap[value]?.label}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title heading={3}>精益交付仪表盘</Title>
        <Space>
          <Button onClick={() => navigate('/financial-delivery/cases')}>业务单管理</Button>
          <Button type="primary" onClick={() => navigate('/financial-delivery/cases/create')}>新建业务单</Button>
        </Space>
      </div>

      {/* 概览统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/financial-delivery/cases')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>总业务单数</Text>
              <IconDashboard style={{ color: '#86909c' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#165dff' }}>{statistics.totalCases}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/financial-delivery/cases')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>进行中</Text>
              <IconClockCircle style={{ color: '#86909c' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b42a' }}>{statistics.inProgressCases}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/financial-delivery/cases')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>已完结</Text>
              <IconCheckCircle style={{ color: '#86909c' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>{statistics.completedCases}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/financial-delivery/cases')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>预警数</Text>
              <IconExclamationCircle style={{ color: '#86909c' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>{statistics.alertCases}</div>
          </Card>
        </Col>
      </Row>

      {/* 财务指标 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>总收入</Text>
              <IconUp style={{ color: '#00b42a' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b42a' }}>
              ¥{statistics.totalRevenue.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>总成本</Text>
              <IconDown style={{ color: '#f53f3f' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f53f3f' }}>
              ¥{statistics.totalCost.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>总利润</Text>
              <IconUp style={{ color: '#00b42a' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b42a' }}>
              ¥{statistics.totalProfit.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#86909c' }}>利润率: {statistics.profitMargin.toFixed(1)}%</div>
          </Card>
        </Col>
      </Row>

      {/* 项目健康度气泡图（简化版） */}
      <Card title="项目健康度" style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', height: 300, border: '1px solid #e5e6eb', borderRadius: 8, padding: 16 }}>
          {/* 坐标轴标签 */}
          <div style={{ position: 'absolute', left: 16, top: 8, fontSize: 12, color: '#86909c' }}>利润率 (%)</div>
          <div style={{ position: 'absolute', right: 8, bottom: 8, fontSize: 12, color: '#86909c' }}>WIP 占用天数</div>

          {/* 气泡 */}
          {mockDashboardData.bubbleChart.map((item) => {
            const x = (item.wipDays / 30) * 80;
            const y = 100 - item.currentMargin;
            const size = Math.max(30, Math.min(60, item.contractAmount / 3000));

            return (
              <div
                key={item.caseId}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  backgroundColor:
                    item.healthStatus === HealthStatus.GREEN
                      ? '#22c55e'
                      : item.healthStatus === HealthStatus.YELLOW
                      ? '#f59e0b'
                      : '#ef4444',
                  opacity: 0.8,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => navigate(`/financial-delivery/cases/${item.caseId}`)}
                title={`${item.caseName}\n利润率: ${item.currentMargin}%\nWIP天数: ${item.wipDays}天\n合同金额: ¥${item.contractAmount.toLocaleString()}`}
              >
                <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{item.currentMargin}%</span>
              </div>
            );
          })}

          {/* 图例 */}
          <div style={{ position: 'absolute', right: 16, top: 16 }}>
            <Space direction="vertical" size={8}>
              <Space size={8}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 12 }}>健康</span>
              </Space>
              <Space size={8}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: 12 }}>预警</span>
              </Space>
              <Space size={8}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontSize: 12 }}>风险</span>
              </Space>
            </Space>
          </div>
        </div>
      </Card>

      {/* 预警列表和最近更新 */}
      <Row gutter={16}>
        <Col span={14}>
          <Card
            title="风险预警"
            extra={
              <Button type="text" onClick={() => navigate('/financial-delivery/cases')}>
                查看全部
              </Button>
            }
          >
            <Table
              columns={alertColumns}
              data={alertCases}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title="最近更新"
            extra={
              <Button type="text" onClick={() => navigate('/financial-delivery/cases')}>
                查看全部
              </Button>
            }
          >
            <Table
              columns={recentColumns}
              data={recentCases}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
