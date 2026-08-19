import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card, Button, Input, Tag, Table, Select, Space, Typography, Grid, Progress,
} from '@arco-design/web-react';
import { IconPlus, IconSearch, IconDownload, IconEye, IconEdit } from '@arco-design/web-react/icon';
import { mockCases, mockCostItems, CaseStatus, caseStatusMap, industryOptions, projectTypeOptions } from '../mockData';
import { deriveTotalCost, deriveEac, deriveLifecycleMargin, deriveWip, deriveHealth } from '../calc';
import { getContract, totalCollected } from '../contractSeam';
import type { Case } from '../types';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

export default function CaseList() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // 派生每个 Case 的指标
  const enriched = useMemo(() => {
    return mockCases.map(c => {
      const items = mockCostItems.filter(i => i.caseId === c.id);
      const totalCost = deriveTotalCost(items);
      const eac = deriveEac(items);
      const contractAmount = c.contractId ? (getContract(c.contractId) as any)?.totalAmount ?? 0 : 0;
      const revenue = c.contractId ? totalCollected(c.contractId) : 0;
      const lifecycleMargin = deriveLifecycleMargin(contractAmount, eac);
      const wip = deriveWip(totalCost, revenue, '2026-07-01', '2026-08-19');
      const health = deriveHealth(lifecycleMargin, (c.targetMargin ?? 30) / 100, eac, c.budgetCap ?? 0, wip.days);
      return { ...c, totalCost, eac, contractAmount, revenue, lifecycleMargin, wip, health };
    });
  }, []);

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
        const color = v >= 30 ? '#00b42a' : v >= 20 ? '#fa8c16' : '#f53f3f';
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
        <Button type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/financial-delivery/cases/${r.id}`)} />
        <Button type="text" size="small" icon={<IconEdit />} onClick={() => navigate(`/financial-delivery/cases/${r.id}/edit`)} />
      </Space>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title heading={3}>业务单管理</Title>
        <Space>
          <Button icon={<IconDownload />}>导出</Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/financial-delivery/cases/create')}>新建业务单</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><div><Text>总业务单数</Text></div><div style={{ fontSize: 28, fontWeight: 'bold', color: '#165dff' }}>{statistics.total}</div></Card></Col>
        <Col span={6}><Card><div><Text>进行中</Text></div><div style={{ fontSize: 28, fontWeight: 'bold', color: '#00b42a' }}>{statistics.inProgress}</div></Card></Col>
        <Col span={6}><Card><div><Text>已完结</Text></div><div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>{statistics.completed}</div></Card></Col>
        <Col span={6}><Card><div><Text>预警数</Text></div><div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>{statistics.alerts}</div></Card></Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Input style={{ width: 300 }} placeholder="搜索业务单编号、线索名称、项目名称" prefix={<IconSearch />} value={searchKeyword} onChange={setSearchKeyword} />
          <Select style={{ width: 120 }} value={statusFilter} onChange={setStatusFilter}>
            <Select.Option value="all">全部状态</Select.Option>
            {Object.entries(caseStatusMap).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <Select style={{ width: 120 }} value={industryFilter} onChange={setIndustryFilter}>
            <Select.Option value="all">全部行业</Select.Option>
            {industryOptions.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
          </Select>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} data={filteredData} rowKey="id" pagination={{ pageSize: 20 }} scroll={{ x: 1400 }} />
      </Card>
    </div>
  );
}
