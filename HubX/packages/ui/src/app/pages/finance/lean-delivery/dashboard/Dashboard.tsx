import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Space,
  Typography,
  Grid,
  Slider,
  Message,
} from '@/design-system';
import {
  DataTable,
  DateText,
  EntityLink,
  MetricCard,
  MetricGrid,
  MoneyText,
  PageHeader,
  PageShell,
  SectionCard,
  StatusTag,
  resolveStatus,
  type StatusMap,
} from '@/design-system';
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
  assembleCaseMetrics,
} from '../calc';
import { getContract, getCollections, getPaymentPlans, getSupplementSummaries } from '../contractSeam';
import type { SupplementContractSummary } from '../types';
import { useContracts } from '../../../sales/contracts/ContractsContext';
import { useCollections } from '../../../../collections/CollectionContext';

const { Text } = Typography;
const { Row, Col } = Grid;

const HEALTH_STATUS: StatusMap<'green' | 'yellow' | 'red'> = {
  green: { label: '健康', tone: 'success' },
  yellow: { label: '预警', tone: 'warning' },
  red: { label: '风险', tone: 'danger' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const { collections } = useCollections();

  // 模拟器状态
  const [scopePct, setScopePct] = useState(100);
  const [targetMargin, setTargetMargin] = useState(30);

  // 派生每个 Case 的指标（使用 assembleCaseMetrics 消除硬编码日期）
  const today = new Date().toISOString().slice(0, 10);
  const caseMetrics = useMemo(() => {
    return mockCases.map(c => {
      const caseItems = mockCostItems.filter(i => i.caseId === c.id);
      const contract = c.contractId ? getContract(c.contractId, contracts) as any : null;
      const mainAmount = contract?.current?.totalAmount ?? contract?.totalAmount ?? 0;
      const supplements: SupplementContractSummary[] = c.extraContractIds
        ? getSupplementSummaries(c.extraContractIds, contracts)
        : [];
      const colls = c.contractId ? getCollections(c.contractId, collections) : [];
      const plans = c.contractId ? getPaymentPlans(c.contractId, contracts) : [];
      const m = assembleCaseMetrics(c, caseItems, mainAmount, supplements, colls, plans, today);
      return { ...c, ...m };
    });
  }, [today, contracts, collections]);

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
      render: (v: string, r: any) => <EntityLink to={`/financial-delivery/cases/${r.id}`}>{v}</EntityLink>,
    },
    { title: '项目名称', dataIndex: 'projectName', width: 150, render: (v: string) => v || '-' },
    {
      title: '健康状态', dataIndex: 'health', width: 100,
      render: (v: 'green' | 'yellow' | 'red') => <StatusTag meta={resolveStatus(HEALTH_STATUS, v)} />,
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
      render: (v: string, r: any) => <EntityLink to={`/financial-delivery/cases/${r.id}`}>{v}</EntityLink>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <StatusTag meta={resolveStatus(caseStatusMap, v)} />,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120, render: (v: string) => <DateText value={v} /> },
  ];

  return (
    <PageShell>
      <PageHeader
        title="精益交付仪表盘"
        description="以全周期口径监控业务单健康度、回款、成本与利润，并支持穿透到风险和业务单明细。"
        actions={(
          <>
            <Button onClick={() => Message.info('业务单由线索签约链路生成，不支持手工创建')}>新建业务单</Button>
            <Button type="primary" onClick={() => navigate('/financial-delivery/cases')}>业务单管理</Button>
          </>
        )}
      />

      <MetricGrid items={[
        {
          key: 'cases',
          label: '业务单总数',
          value: `${statistics.totalCases} 单`,
          detail: `进行中 ${statistics.inProgress} · 已完结 ${statistics.completed}`,
        },
        {
          key: 'alerts',
          label: '风险预警',
          value: `${statistics.alerts} 单`,
          detail: statistics.alerts > 0 ? '需优先处理利润率或 WIP 异常' : '当前无风险预警',
          tone: statistics.alerts > 0 ? 'warning' : 'success',
        },
        {
          key: 'revenue',
          label: '累计回款',
          value: <MoneyText value={statistics.totalRevenue} />,
          detail: <>总成本 <MoneyText value={statistics.totalCost} /></>,
          tone: 'success',
        },
        {
          key: 'profit',
          label: '总利润',
          value: <MoneyText value={statistics.totalProfit} tone={statistics.totalProfit >= 0 ? 'success' : 'danger'} />,
          detail: `利润率 ${statistics.margin.toFixed(1)}%`,
          tone: statistics.totalProfit >= 0 ? 'success' : 'danger',
        },
      ]} />

      {/* 气泡图（全周期利润率 vs WIP） */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionCard title="项目健康度（全周期口径）">
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
                <span style={{ color: 'var(--color-white)', fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>{marginPct.toFixed(0)}%</span>
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
      </SectionCard>
      </div>

      {/* 模拟器 */}
      {simulatorCase && simResult && (
        <div style={{ marginBottom: 24 }}>
        <SectionCard
          title={`敏感性模拟 — ${simulatorCase.projectName ?? simulatorCase.caseNo}`}
        >
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
                <Col span={6}><MetricCard label="EAC" value={<MoneyText value={simResult.eac} />} /></Col>
                <Col span={6}><MetricCard label="模拟利润率" value={`${(simResult.margin * 100).toFixed(1)}%`} /></Col>
                <Col span={6}><MetricCard label="保本额" value={<MoneyText value={simResult.breakevenAmount} />} /></Col>
                <Col span={6}><MetricCard label="底价" value={<MoneyText value={Math.round(simResult.floorPrice)} />} /></Col>
              </Row>
            </Col>
          </Row>
        </SectionCard>
        </div>
      )}

      {/* 预警列表 + 最近更新 */}
      <Row gutter={16}>
        <Col span={14}>
          <SectionCard title="风险预警" extra={<Button type="text" onClick={() => navigate('/financial-delivery/cases')}>查看全部</Button>}>
            <DataTable columns={alertColumns} data={alertCases} rowKey="id" pagination={false} size="small" />
          </SectionCard>
        </Col>
        <Col span={10}>
          <SectionCard title="最近更新" extra={<Button type="text" onClick={() => navigate('/financial-delivery/cases')}>查看全部</Button>}>
            <DataTable columns={recentColumns} data={recentCases} rowKey="id" pagination={false} size="small" />
          </SectionCard>
        </Col>
      </Row>

      {/* 穿透看板：按行业聚合利润 */}
      <div style={{ marginTop: 16 }}>
      <SectionCard title="行业利润穿透">
        <DataTable
          size="small"
          rowKey="industry"
          pagination={false}
          emptyDescription="暂无行业利润数据"
          data={(() => {
            const byIndustry = new Map<string, { profit: number; count: number }>();
            for (const c of caseMetrics) {
              const industry = c.industry ?? '未知';
              const entry = byIndustry.get(industry) ?? { profit: 0, count: 0 };
              entry.profit += (c.contractAmount ?? 0) - (c.eac ?? 0);
              entry.count++;
              byIndustry.set(industry, entry);
            }
            const totalProfit = [...byIndustry.values()].reduce((s, e) => s + e.profit, 0);
            return [...byIndustry.entries()].map(([industry, e]) => ({
              industry,
              profit: e.profit,
              percentage: totalProfit > 0 ? Math.round((e.profit / totalProfit) * 100) : 0,
              count: e.count,
            }));
          })()}
          columns={[
            { title: '行业', dataIndex: 'industry', width: 120 },
            { title: '利润', dataIndex: 'profit', width: 120, align: 'right', render: (v: number) => <MoneyText value={v} /> },
            { title: '占比', dataIndex: 'percentage', width: 80, render: (v: number) => `${v}%` },
            { title: '业务单数', dataIndex: 'count', width: 80 },
          ]}
        />
      </SectionCard>
      </div>

      {/* 相似项目 Top 3 */}
      {simulatorCase && (
        <div style={{ marginTop: 16 }}>
        <SectionCard
          title={`相似项目 — ${simulatorCase.projectName ?? simulatorCase.caseNo}`}
        >
          <DataTable
            size="small"
            rowKey="id"
            pagination={false}
            emptyDescription="暂无相似项目"
            data={caseMetrics
              .filter(c => c.id !== simulatorCase.id && c.industry === simulatorCase.industry && c.status === CaseStatus.COMPLETED)
              .slice(0, 3)
              .map(c => ({
                id: c.id,
                name: c.projectName ?? c.caseNo,
                industry: c.industry,
                margin: c.lifecycleMargin !== null ? `${(c.lifecycleMargin * 100).toFixed(1)}%` : '-',
                totalCost: c.totalCost,
              }))}
            columns={[
              { title: '项目', dataIndex: 'name' },
              { title: '行业', dataIndex: 'industry', width: 100 },
              { title: '利润率', dataIndex: 'margin', width: 80 },
              { title: '总成本', dataIndex: 'totalCost', width: 120, align: 'right', render: (v: number) => <MoneyText value={v} /> },
            ]}
          />
        </SectionCard>
        </div>
      )}
    </PageShell>
  );
}
