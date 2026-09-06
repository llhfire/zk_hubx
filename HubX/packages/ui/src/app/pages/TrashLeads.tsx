import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Badge,
  Message,
  Space,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconSearch, IconEye, IconUserAdd, IconReply, IconRefresh } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import type { LeadListItem } from './leads/types';
import {
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
} from './leads/types';
import { useLeads } from '@/app/leads/LeadContext';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';
import { searchLeads } from './leads/utils';
import { PageShell, PageHeader, ProcessMetricGrid } from '@/app/components/ui';

export function TrashLeads() {
  const navigate = useNavigate();
  const { leads, claimLead, returnLead } = useLeads();
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const trashPool = useMemo(() => leads.filter((l) => l.clueType === 'trash'), [leads]);

  const filteredLeads = useMemo(() => {
    let result = trashPool;
    if (keyword) result = searchLeads(result, keyword);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    return result;
  }, [trashPool, keyword, sourceFilter, entityFilter]);

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) { Message.warning('暂无权限'); return; }
    const e = findCompanyEntityByName(entityName);
    if (!e) { Message.warning('未找到'); return; }
    setSelectedCompanyEntity(e);
    setCompanyModalVisible(true);
  };

  const handleReclaim = async (record: LeadListItem) => {
    try {
      await claimLead(record.id, CURRENT_LOGIN_USER.name);
      Message.success(`已重新认领线索「${record.name}」至我的线索`);
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '认领失败，请重试');
    }
  };

  const handleReturnPublic = async (record: LeadListItem) => {
    try {
      await returnLead(record.id, CURRENT_LOGIN_USER.name, '从垃圾池释放回公海池');
      Message.success(`线索「${record.name}」已成功释放回公海池`);
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '退回公海失败，请重试');
    }
  };

  const filtersActive = Boolean(keyword || sourceFilter || entityFilter);
  const resetFilters = () => {
    setKeyword('');
    setSourceFilter('');
    setEntityFilter('');
  };

  const highTrashCount = trashPool.filter((l) => l.trashCount >= 3).length;
  const recoverableCount = trashPool.filter((l) => l.trashCount < 3).length;

  // 复合列（与 AllLeads 一致）
  const columns = [
    { title: '编号', dataIndex: 'id', width: 70, fixed: 'left' as const },
    { title: '录入时间', dataIndex: 'createTime', width: 130, render: (v: string) => v?.slice(5) || '-' },
    {
      title: '客户/线索',
      width: 240,
      render: (_: unknown, r: LeadListItem) => (
        <div>
          <a onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'trash' } })} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>{r.name}</a>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{r.contact}</div>
        </div>
      ),
    },
    {
      title: '联系人信息',
      width: 140,
      render: (_: unknown, r: LeadListItem) => (
        <div style={{ fontSize: 14 }}>
          <div>{r.phone || '-'}</div>
          <div style={{ color: 'var(--color-text-3)' }}>{r.wechat || '-'}</div>
        </div>
      ),
    },
    {
      title: '渠道与主体',
      width: 130,
      render: (_: unknown, r: LeadListItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source] || r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>{r.entity}</a>
        </Space>
      ),
    },
    {
      title: '垃圾原因',
      width: 180,
      render: (_: unknown, r: LeadListItem) => (
        <Tooltip content={r.trashReason || ''}>
          <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{r.trashReason || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '退回次数',
      width: 90,
      render: (_: unknown, r: LeadListItem) => (
        <Tag color={r.trashCount >= 3 ? 'red' : 'blue'}>{r.trashCount} 次</Tag>
      ),
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={0}>
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'trash' } })} /></Tooltip>
          <Tooltip content="重新认领"><Button type="text" icon={<IconUserAdd />} size="small" onClick={() => handleReclaim(r)} /></Tooltip>
          <Tooltip content="退回公海"><Button type="text" icon={<IconReply />} size="small" onClick={() => handleReturnPublic(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageShell breadcrumbs={[{ label: '线索管理' }, { label: '垃圾线索池' }]}>
      <PageHeader
        title="垃圾线索池"
        description="收纳退回、无效或报废线索；支持质检核查、挽回重新认领或释放回公海池。"
      />

      <ProcessMetricGrid
        items={[
          {
            key: 'trashTotal',
            label: '垃圾池沉淀总数',
            value: `${trashPool.length} 条`,
            detail: filtersActive ? `当前筛选 ${filteredLeads.length} 条` : '历史标记垃圾',
          },
          {
            key: 'recoverable',
            label: '可激活挽回 (<3次)',
            value: `${recoverableCount} 条`,
            detail: '具备挽回激活潜质',
            tone: recoverableCount > 0 ? 'success' : undefined,
          },
          {
            key: 'highTrash',
            label: '达质检退回上限 (≥3次)',
            value: `${highTrashCount} 条`,
            detail: highTrashCount > 0 ? '退回频次过高沉淀' : '无严重反复退回',
            tone: highTrashCount > 0 ? 'error' : undefined,
          },
          {
            key: 'displayed',
            label: '当前命中视图',
            value: `${filteredLeads.length} 条`,
            detail: filtersActive ? '已应用条件过滤' : '实时可处理状态',
          },
        ]}
      />

      <Card style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--grey-200)' }}>
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: 'var(--color-fill-1)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Input style={{ width: 280 }} placeholder="搜索线索名称、联系人" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="全部线索来源" style={{ width: 140 }} allowClear value={sourceFilter || undefined} onChange={setSourceFilter}>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
          </Select>
          <Select placeholder="全部对接主体" style={{ width: 140 }} allowClear value={entityFilter || undefined} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
          {filtersActive && (
            <Button type="text" icon={<IconRefresh />} onClick={resetFilters} style={{ color: 'var(--color-text-3)' }}>
              重置
            </Button>
          )}
        </div>

        <Table columns={columns} data={filteredLeads} scroll={{ x: 1100 }} pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }} />
      </Card>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </PageShell>
  );
}
