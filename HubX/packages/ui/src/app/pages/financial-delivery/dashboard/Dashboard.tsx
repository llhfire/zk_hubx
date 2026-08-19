import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Button,
  Tag,
  Table,
  Space,
  Typography,
  Grid,
  Slider,
  Statistic,
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
  mockCostItems,
  CaseStatus,
  caseStatusMap,
} from '../mockData';
import {
  deriveTotalCost,
  deriveEac,
  deriveLifecycleMargin,
  deriveWip,
  deriveHealth,
  simulateSensitivity,
} from '../calc';
import { getContract, totalCollected } from '../contractSeam';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

export default function Dashboard() {
  const navigate = useNavigate();

  // 模拟器状态
  const [scopePct, setScopePct] = useState(100);
  const [targetMargin, setTargetMargin] = useState(30);

  // 派生每个 Case 的指标
  const caseMetrics = useMemo(() => {
    return mockCases.map(c => {
      const caseItems = mockCostItems.filter(i => i.caseId === c.id);
      const totalCost = deriveTotalCost(caseItems);
      const eac = deriveEac(caseItems);
      const revenue = c.contractId ? totalCollected(c.contractId) : 0;
      const contractAmount = c.contractId ? (getContract(c.contractId) as any)?.totalAmount ?? 0 : 0;
      const lifecycleMargin = deriveLifecycleMargin(contractAmount, eac);
      const lastCollDate = c.contractId ? '2026-07-01' : null; // α 简化
      const wip = deriveWip(totalCost, revenue, lastCollDate, '2026-08-19');
      const health = deriveHealth(lifecycleMargin, (c.targetMargin ?? 30) / 100, eac, c.budgetCap ?? 0, wip.days);
      return { ...c, totalCost, eac, revenue, contractAmount, lifecycleMargin, wip, health };
    });
  }, []);

  // 统计
  const statistics = useMemo(() => {
    const totalCases = caseMetrics.length;
    const inProgress = caseMetrics.filter(c => c.status === CaseStatus.IN_PROGRESS).length;
    const completed = caseMetrics.filter(c => c.status === CaseStatus.COMPLETED).length;
    const alerts = caseMetrics.filter(c => c.health === 'red' || c.health === 'yellow').length;
    const totalRevenue = caseMetrics.reduce((s, c) => s + c.revenue, 0);
    const totalCostAll = caseMetrics.reduce((s, c) => s + c.totalCost, 0);
    const totalProfit = totalRevenue - totalCostAll;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalCases, inProgress, completed, alerts, totalRevenue, totalCost: totalCostAll, totalProfit, margin };
  }, [caseMetrics]);

  // 预警列表
  const alertCases = useMemo(
    () => caseMetrics.filter(c => c.health === 'red' || c.health === 'yellow'),
    [caseMetrics],
  );

  // 最近更新
  const recentCases = useMemo(
    () => [...caseMetrics].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [caseMetrics],
  );

  // 模拟器（取第一个 in_progress case）
  const simulatorCase = useMemo(() => caseMetrics.find(c => c.status === CaseStatus.IN_PROGRESS), [caseMetrics]);
  const simResult = useMemo(() => {
    if (!simulatorCase) return null;
    const items = mockCostItems.filter(i => i.caseId === simulatorCase.id);
    return simulateSensitivity(items, simulatorCase.contractAmount, scopePct / 100, targetMargin / 100);
  }, [simulatorCase, scopePct, targetMargin]);

  const healthColor = (h: string) => h === 'green' ? 'var(--success-500)' : h === 'yellow' ? 'var(--warning-500)' : 'var(--destructive-500)';

  const alertColumns = [
    {
      title: '业务单编号', dataIndex: 'caseNo', width: 120,
      render: (v: string, r: any) => <Button type="text" size="small" onClick={() => navigate(`/financial-delivery/cases/${r.id}`)}>{v}</Button>,
    },
    { title: '项目名称', dataIndex: 'projectName', width: 150, render: (v: string) => v || '-' },
    {
      title: '健康状态', dataIndex: 'health', width: 100,
      render: (v: string) => <Tag color={v === 'yellow' ? 'orange' : 'red'}>{v === 'yellow' ? '预警' : '风险'}</Tag>,
    },
    {
      title: '全周期利润率', width: 100,
      render: (_: any, r: any) => r.lifecycleMargin !== null ? `${(r.lifecycleMargin * 100).toFixed(1)}%` : '-',
    },
    { title: 'WIP 天数', dataIndex: 'wip', width: 100, render: (_: any, r: any) => `${r.wip.days}天` },
  ];

  const recentColumns = [
    {
      title: '业务单编号', dataIndex: 'caseNo', width: 120,
      render: (v: string, r: any) => <Button type="text" size="small" onClick={() => navigate(`/financial-delivery/cases/${r.id}`)}>{v}</Button>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={caseStatusMap[v]?.color === 'success' ? 'green' : 'blue'}>{caseStatusMap[v]?.label}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <Title heading={3}>精益交付仪表盘</Title>
        <Space>
          <Button onClick={() => navigate('/financial-delivery/cases')}>业务单管理</Button>
          <Button type="primary" onClick={() => navigate('/financial-delivery/cases/create')}>新建业务单</Button>
        </Space>
      </div>

      {/* 概览统计 */}
      <div className="lean-dashboard-kpi">
        <Card hoverable onClick={() => navigate('/financial-delivery/cases')} className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>总业务单数</Text><IconDashboard style={{ color: 'var(--color-text-3)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--brand-500)' }}>{statistics.totalCases}</div>
        </Card>
        <Card hoverable onClick={() => navigate('/financial-delivery/cases')} className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>进行中</Text><IconClockCircle style={{ color: 'var(--color-text-3)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--success-500)' }}>{statistics.inProgress}</div>
        </Card>
        <Card hoverable onClick={() => navigate('/financial-delivery/cases')} className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>已完结</Text><IconCheckCircle style={{ color: 'var(--color-text-3)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--info-500)' }}>{statistics.completed}</div>
        </Card>
        <Card hoverable onClick={() => navigate('/financial-delivery/cases')} className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>预警数</Text><IconExclamationCircle style={{ color: 'var(--color-text-3)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--warning-500)' }}>{statistics.alerts}</div>
        </Card>
      </div>

      {/* 财务指标（全周期口径） */}
      <div className="expense-overhead-summary" style={{ marginBottom: 'var(--space-5)' }}>
        <Card className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>累计回款</Text><IconUp style={{ color: 'var(--success-500)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--success-500)' }}>¥{statistics.totalRevenue.toLocaleString()}</div>
        </Card>
        <Card className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>总成本</Text><IconDown style={{ color: 'var(--destructive-500)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--destructive-500)' }}>¥{statistics.totalCost.toLocaleString()}</div>
        </Card>
        <Card className="lean-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <Text>总利润</Text><IconUp style={{ color: 'var(--success-500)' }} />
          </div>
          <div className="lean-kpi-value" style={{ color: 'var(--success-500)' }}>¥{statistics.totalProfit.toLocaleString()}</div>
          <div className="expense-kpi-hint">利润率: {statistics.margin.toFixed(1)}%</div>
        </Card>
      </div>

      {/* 气泡图（全周期利润率 vs WIP） */}
      <Card title="项目健康度（全周期口径）" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="lean-bubble-chart">
          <div className="lean-bubble-axis-label top-left">全周期利润率 (%)</div>
          <div className="lean-bubble-axis-label bottom-right">WIP 占用天数</div>
          {caseMetrics.map(c => {
            const marginPct = c.lifecycleMargin !== null ? c.lifecycleMargin * 100 : 0;
            const x = (c.wip.days / 30) * 80;
            const y = 100 - marginPct;
            const size = Math.max(30, Math.min(60, c.contractAmount / 3000));
            return (
              <div
                key={c.id}
                style={{
                  position: 'absolute', left: `${x}%`, top: `${y}%`,
                  width: size, height: size, borderRadius: '50%',
                  backgroundColor: healthColor(c.health), opacity: 0.8,
                  transform: 'translate(-50%, -50%)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={() => navigate(`/financial-delivery/cases/${c.id}`)}
                title={`${c.projectName ?? c.caseNo}\n全周期利润率: ${marginPct.toFixed(1)}%\nWIP: ${c.wip.days}天`}
              >
                <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{marginPct.toFixed(0)}%</span>
              </div>
            );
          })}
          <div className="lean-bubble-legend">
            <Space direction="vertical" size={8}>
              <Space size={8}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success-500)' }} /><span style={{ fontSize: 'var(--text-xs)' }}>健康</span></Space>
              <Space size={8}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--warning-500)' }} /><span style={{ fontSize: 'var(--text-xs)' }}>预警</span></Space>
              <Space size={8}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--destructive-500)' }} /><span style={{ fontSize: 'var(--text-xs)' }}>风险</span></Space>
            </Space>
          </div>
        </div>
      </Card>

      {/* 模拟器 */}
      {simulatorCase && simResult && (
        <Card title={`敏感性模拟 — ${simulatorCase.projectName ?? simulatorCase.caseNo}`} style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 16 }}>
                <Text>范围调节: {scopePct}%</Text>
                <Slider value={scopePct} onChange={setScopePct as any} min={50} max={150} step={5} />
              </div>
              <div>
                <Text>目标利润率: {targetMargin}%</Text>
                <Slider value={targetMargin} onChange={setTargetMargin as any} min={10} max={50} step={5} />
              </div>
            </Col>
            <Col span={16}>
              <Row gutter={16}>
                <Col span={6}><Statistic title="EAC" value={simResult.eac} prefix="¥" /></Col>
                <Col span={6}><Statistic title="模拟利润率" value={`${(simResult.margin * 100).toFixed(1)}%`} /></Col>
                <Col span={6}><Statistic title="保本额" value={simResult.breakevenAmount} prefix="¥" /></Col>
                <Col span={6}><Statistic title="底价" value={Math.round(simResult.floorPrice)} prefix="¥" /></Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {/* 预警列表 + 最近更新 */}
      <Row gutter={16}>
        <Col span={14}>
          <Card title="风险预警" extra={<Button type="text" onClick={() => navigate('/financial-delivery/cases')}>查看全部</Button>}>
            <Table columns={alertColumns} data={alertCases} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="最近更新" extra={<Button type="text" onClick={() => navigate('/financial-delivery/cases')}>查看全部</Button>}>
            <Table columns={recentColumns} data={recentCases} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
