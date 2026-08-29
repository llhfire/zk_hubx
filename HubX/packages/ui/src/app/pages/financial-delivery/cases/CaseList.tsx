import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card, Button, Input, Tag, Table, Select, Space, Progress, Tooltip, Message,
} from '@arco-design/web-react';
import { IconPlus, IconSearch, IconDownload, IconEye, IconRefresh } from '@arco-design/web-react/icon';
import { mockCases, mockCostItems, CaseStatus, caseStatusMap, industryOptions } from '../mockData';
import { deriveTotalCost, deriveEac, deriveLifecycleMargin, deriveWip, deriveHealth } from '../calc';
import { getContract, totalCollected } from '../contractSeam';
import { useContracts } from '../../contracts/ContractsContext';
import { useCollections } from '@/app/collections/CollectionContext';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';

export default function CaseList() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // 派生每个 Case 的指标
  const enriched = useMemo(() => {
    return mockCases.map(c => {
      const items = mockCostItems.filter(i => i.caseId === c.id);
      const totalCost = deriveTotalCost(items);
      const eac = deriveEac(items);
      const contract = c.contractId ? getContract(c.contractId, contracts) as any : null;
      const contractAmount = contract?.current?.totalAmount ?? contract?.totalAmount ?? 0;
      const revenue = c.contractId ? totalCollected(c.contractId, collections) : 0;
      const lifecycleMargin = deriveLifecycleMargin(contractAmount, eac);
      const wip = deriveWip(totalCost, revenue, '2026-07-01', '2026-08-19');
      const health = deriveHealth(lifecycleMargin, (c.targetMargin ?? 30) / 100, eac, c.budgetCap ?? 0, wip.days);
      return { ...c, totalCost, eac, contractAmount, revenue, lifecycleMargin, wip, health };
    });
  }, [contracts, collections]);

  const filteredData = useMemo(() => {
    return enriched.filter(item => {
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        if (!item.caseNo.toLowerCase().includes(kw) && !(item.leadName ?? '').toLowerCase().includes(kw) && !(item.projectName ?? '').toLowerCase().includes(kw)) return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (industryFilter !== 'all' && item.industry !== industryFilter) return false;
      return true;
    });
  }, [enriched, searchKeyword, statusFilter, industryFilter]);

  const statistics = useMemo(() => {
    const total = filteredData.length;
    const inProgress = filteredData.filter(i => i.status === CaseStatus.IN_PROGRESS).length;
    const completed = filteredData.filter(i => i.status === CaseStatus.COMPLETED).length;
    const alerts = filteredData.filter(i => i.health === 'red' || i.health === 'yellow').length;
    return { total, inProgress, completed, alerts };
  }, [filteredData]);

  const healthLabel = (h: string) => ({ green: '健康', yellow: '预警', red: '风险' })[h] ?? h;
  const healthColor = (h: string) => ({ green: 'green', yellow: 'orange', red: 'red' })[h] ?? 'blue';
  const filtersActive = Boolean(searchKeyword || statusFilter !== 'all' || industryFilter !== 'all');

  const resetFilters = () => {
    setSearchKeyword('');
    setStatusFilter('all');
    setIndustryFilter('all');
  };

  const handleExport = () => {
    const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredData.map((item) => [
      item.caseNo,
      item.leadName ?? '',
      item.projectName ?? '',
      caseStatusMap[item.status]?.label ?? item.status,
      healthLabel(item.health),
      item.industry ?? '',
      item.contractAmount,
      item.lifecycleMargin === null ? '' : `${(item.lifecycleMargin * 100).toFixed(1)}%`,
      item.wip.days,
      item.createdAt,
    ]);
    const csv = [
      ['业务单编号', '关联线索', '关联项目', '状态', '健康状态', '行业', '标的额', '全周期利润率', 'WIP 天数', '创建时间'],
      ...rows,
    ].map((row) => row.map(escapeCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `业务单-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    Message.success(`已导出 ${filteredData.length} 条业务单`);
  };

  const columns = [
    {
      title: '业务单编号', dataIndex: 'caseNo', width: 150,
      render: (v: string, r: any) => <Button type="text" size="small" onClick={() => navigate(`/financial-delivery/cases/${r.id}`)}>{v}</Button>,
    },
    {
      title: '关联线索/项目', width: 180,
      render: (_: any, r: any) => <div>{r.leadName && <div style={{ fontSize: 14 }}>{r.leadName}</div>}{r.projectName && <div style={{ fontSize: 12, color: '#86909c' }}>{r.projectName}</div>}</div>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: CaseStatus) => { const cfg = caseStatusMap[v]; return <Tag color={cfg.color === 'success' ? 'green' : cfg.color === 'warning' ? 'orange' : 'blue'}>{cfg.label}</Tag>; },
    },
    {
      title: '健康状态', dataIndex: 'health', width: 100,
      render: (v: string) => <Tag color={healthColor(v)}>{healthLabel(v)}</Tag>,
    },
    { title: '行业', dataIndex: 'industry', width: 100, render: (v: string) => v || '-' },
    {
      title: '标的额', width: 120, align: 'right' as const,
      render: (_: any, r: any) => r.contractAmount ? `¥${r.contractAmount.toLocaleString()}` : '-',
    },
    {
      title: '全周期利润率', width: 130,
      render: (_: any, r: any) => {
        if (r.lifecycleMargin === null) return '-';
        const v = r.lifecycleMargin * 100;
        const color = v >= 30 ? 'rgb(var(--success-6))' : v >= 20 ? 'rgb(var(--warning-6))' : 'rgb(var(--danger-6))';
        return <Space><Progress percent={Math.min(100, v)} size="small" style={{ width: 60 }} showText={false} color={color} /><span>{v.toFixed(1)}%</span></Space>;
      },
    },
    {
      title: 'WIP 天数', width: 100, align: 'center' as const,
      render: (_: any, r: any) => { const d = r.wip.days; return <Tag color={d <= 7 ? 'green' : d <= 14 ? 'orange' : 'red'}>{d}天</Tag>; },
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: '操作', width: 100, fixed: 'right' as const,
      render: (_: any, r: any) => <Space>
        <Tooltip content="查看业务单"><Button className="hubx-icon-action" aria-label={`查看业务单${r.caseNo}`} type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/financial-delivery/cases/${r.id}`)} /></Tooltip>
      </Space>,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="业务单管理"
        description="按状态、行业和健康度管理精益交付业务单，并穿透查看全周期成本与利润。"
        actions={(
          <>
            <Button icon={<IconDownload />} onClick={handleExport}>导出</Button>
            <Button type="primary" icon={<IconPlus />} onClick={() => Message.info('业务单由线索签约链路生成，不支持手工创建')}>新建业务单</Button>
          </>
        )}
      />

      <ProcessMetricGrid items={[
        { key: 'total', label: '业务单总数', value: `${statistics.total} 单`, detail: filtersActive ? '当前筛选结果' : '全部业务单' },
        { key: 'progress', label: '进行中', value: `${statistics.inProgress} 单`, detail: '持续监控成本与 WIP' },
        { key: 'completed', label: '已完结', value: `${statistics.completed} 单`, detail: '已进入复盘或归档' },
        { key: 'alerts', label: '风险预警', value: `${statistics.alerts} 单`, detail: statistics.alerts > 0 ? '需优先检查利润率与 WIP' : '当前无风险预警', tone: statistics.alerts > 0 ? 'warning' : 'success' },
      ]} />

      <Card>
        <FilterBar actions={filtersActive ? <Button type="text" icon={<IconRefresh />} onClick={resetFilters}>重置筛选</Button> : <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>共 {filteredData.length} 条</span>}>
          <Input style={{ width: 300 }} placeholder="搜索业务单编号、线索名称、项目名称" prefix={<IconSearch />} value={searchKeyword} onChange={setSearchKeyword} />
          <Select style={{ width: 120 }} value={statusFilter} onChange={setStatusFilter}>
            <Select.Option value="all">全部状态</Select.Option>
            {Object.entries(caseStatusMap).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <Select style={{ width: 120 }} value={industryFilter} onChange={setIndustryFilter}>
            <Select.Option value="all">全部行业</Select.Option>
            {industryOptions.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
          </Select>
        </FilterBar>
        <div style={{ marginTop: 16, color: 'var(--color-text-3)', fontSize: 12 }}>筛选结果：{filteredData.length} 条</div>
        <Table columns={columns} data={filteredData} rowKey="id" pagination={{ pageSize: 20 }} scroll={{ x: 1400 }} />
      </Card>
    </PageShell>
  );
}
