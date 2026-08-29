import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  Input,
  Message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconEye, IconRefresh, IconSearch } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import {
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
} from './leads/types';
import { useLeads } from '@/app/leads/LeadContext';
import { useContracts } from './contracts/ContractsContext';
import { useProjects } from './project-management/ProjectContext';
import { useCollections } from '@/app/collections/CollectionContext';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid, WeChatIcon } from '@/app/components/ui';
import { buildClosedLeadRows, type ClosedLeadRow } from './closedLeadReadModel';

export function ClosedLeads() {
  const navigate = useNavigate();
  const { leads } = useLeads();
  const { contracts } = useContracts();
  const { projects } = useProjects();
  const { collections } = useCollections();
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const dataSource = useMemo(
    () => buildClosedLeadRows({ leads, contracts, projects, collections }),
    [leads, contracts, projects, collections],
  );

  const filteredLeads = useMemo(() => {
    const base = dataSource;
    return base.filter((lead) => {
      const hitKeyword = !keyword || [lead.id, lead.name, lead.customer, lead.contractNo, lead.projectName].some((item) => item.includes(keyword));
      const hitSource = !sourceFilter || lead.source === sourceFilter;
      const hitEntity = !entityFilter || lead.entity === entityFilter;
      return hitKeyword && hitSource && hitEntity;
    });
  }, [keyword, sourceFilter, entityFilter, dataSource]);

  const openRelatedDetail = (record: ClosedLeadRow) => {
    navigate(record.projectId ? `/projects/${record.projectId}` : `/leads/${record.id}`);
  };

  const totalAmount = filteredLeads.reduce((sum, lead) => sum + lead.contractAmount, 0);
  const receivedAmount = filteredLeads.reduce((sum, lead) => sum + lead.receivedAmount, 0);
  const averageConversionDays = Math.round(filteredLeads.reduce((sum, lead) => sum + lead.conversionDays, 0) / Math.max(filteredLeads.length, 1));
  const filtersActive = Boolean(keyword || sourceFilter || entityFilter);

  const resetFilters = () => {
    setKeyword('');
    setSourceFilter('');
    setEntityFilter('');
  };

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) { Message.warning('暂无权限'); return; }
    const e = findCompanyEntityByName(entityName);
    if (!e) { Message.warning('未找到'); return; }
    setSelectedCompanyEntity(e);
    setCompanyModalVisible(true);
  };

  // 复合列（与 AllLeads 一致 + 合同/项目特殊列）
  const columns = [
    { title: '编号', dataIndex: 'id', width: 70, fixed: 'left' as const },
    { title: '成交日期', dataIndex: 'closeDate', width: 110 },
    {
      title: '客户/线索',
      width: 240,
      render: (_: unknown, r: ClosedLeadRow) => (
        <div>
          <a onClick={() => openRelatedDetail(r)} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>{r.name}</a>
          {r.presalesGroupName && (
            <Tooltip content="点击复制群名">
              <div style={{ fontSize: 12, color: 'rgb(var(--warning-6))', cursor: 'pointer', marginTop: 2 }} onClick={() => { navigator.clipboard.writeText(r.presalesGroupName || ''); }}>
                <WeChatIcon size={14} /> {r.presalesGroupName}
              </div>
            </Tooltip>
          )}
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{r.customer} · {r.contact}</div>
        </div>
      ),
    },
    {
      title: '渠道与主体',
      width: 130,
      render: (_: unknown, r: ClosedLeadRow) => (
        <Space direction="vertical" size={2}>
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source] || r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>{r.entity}</a>
        </Space>
      ),
    },
    {
      title: '成交状态',
      width: 100,
      render: (_: unknown, r: ClosedLeadRow) => (
        <Tag color={r.closedStatus === '已签约' ? 'green' : r.closedStatus === '已立项' ? 'arcoblue' : 'orange'}>{r.closedStatus}</Tag>
      ),
    },
    {
      title: '合同金额',
      width: 120,
      render: (_: unknown, r: ClosedLeadRow) => (
        <div>
          <div style={{ fontWeight: 500 }}>¥{r.contractAmount.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>已回款 ¥{r.receivedAmount.toLocaleString()}</div>
        </div>
      ),
    },
    { title: '关联合同', dataIndex: 'contractNo', width: 160 },
    { title: '关联项目', dataIndex: 'projectName', width: 160 },
    {
      title: '归属与协作',
      width: 120,
      render: (_: unknown, r: ClosedLeadRow) => (
        <div style={{ fontSize: 12 }}>
          <div>归属: {r.owner || '-'}</div>
          <div style={{ color: 'var(--color-text-3)' }}>优化: {r.optimizer || '-'}</div>
        </div>
      ),
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, r: ClosedLeadRow) => (
        <Tooltip content="查看详情"><Button className="hubx-icon-action" aria-label={`查看${r.name}详情`} type="text" size="small" icon={<IconEye />} onClick={() => openRelatedDetail(r)} /></Tooltip>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader title="已成交线索" description="统一查看线索成交后关联合同、项目与实收进度。" />
      <ProcessMetricGrid items={[
        { key: 'leads', label: '成交线索', value: `${filteredLeads.length} 条`, detail: filtersActive ? '当前筛选结果' : '已签单线索' },
        { key: 'contracts', label: '合同总额', value: `¥${totalAmount.toLocaleString()}`, detail: '已关联主合同' },
        { key: 'received', label: '已回款金额', value: `¥${receivedAmount.toLocaleString()}`, detail: totalAmount > 0 ? `回款率 ${((receivedAmount / totalAmount) * 100).toFixed(1)}%` : '暂无合同金额', tone: 'success' },
        { key: 'cycle', label: '平均转化周期', value: `${averageConversionDays} 天`, detail: '从创建到签约' },
      ]} />

      <Card>
        <FilterBar actions={filtersActive ? <Button type="text" icon={<IconRefresh />} onClick={resetFilters}>重置筛选</Button> : <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>共 {filteredLeads.length} 条</span>}>
          <Input allowClear prefix={<IconSearch />} placeholder="搜索线索、客户、合同或项目" value={keyword} onChange={setKeyword} style={{ width: 280 }} />
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear value={sourceFilter} onChange={setSourceFilter}>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear value={entityFilter} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
        </FilterBar>
        <div style={{ marginTop: 16, color: 'var(--color-text-3)', fontSize: 12 }}>筛选结果：{filteredLeads.length} 条</div>

        <Table columns={columns} data={filteredLeads} rowKey="key" scroll={{ x: 1400 }} pagination={false} />
      </Card>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </PageShell>
  );
}
