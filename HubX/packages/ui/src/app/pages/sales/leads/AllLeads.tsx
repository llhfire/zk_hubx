import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Message,
  Space,
  Tag,
  Tooltip,
  Popover,
  Tabs,
} from '@arco-design/web-react';
import { IconSearch, IconEye, IconUserAdd, IconFilter } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal } from '../company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from '../company-entity/companyEntityData';
import type { LeadListItem, ClueType, QuickFilter } from './types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_COLOR,
  SALES_STATUS_STEPS,
  getSalesStatusIndex,
  CUSTOMER_LEVEL_COLOR,
  INTENTION_LEVEL_COLOR,
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  QUICK_FILTER_LABEL,
  SALES_STATUS_LIST,
  CUSTOMER_LEVEL_LIST,
  INTENTION_LEVEL_LIST,
} from './types';
import { useLeads } from '../../../leads/LeadContext';
import { leadDispatchView } from '../lead-dispatch/kpiCalc';
import { LeadTransferPopover } from '../../../leads/LeadTransferPopover';
import {
  searchLeads,
  applyQuickFilterExtended,
  calculateOverdueStatus,
  getCountdownCapsule,
  COUNTDOWN_COLOR,
  COUNTDOWN_BG,
  getQuickFilterCounts,
} from './utils';
import { TrashLeadIcon, WeChatIcon, PageShell, PageHeader, MetricGrid } from '@/design-system';

export function AllLeads() {
  const navigate = useNavigate();
  const { leads } = useLeads();
  const [keyword, setKeyword] = useState('');
  const [clueTypeFilter, setClueTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [customerLevelFilter, setCustomerLevelFilter] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter | ''>('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const leadsWithOverdue = useMemo(() => calculateOverdueStatus(leads), [leads]);
  const filterCounts = useMemo(() => getQuickFilterCounts(leadsWithOverdue), [leadsWithOverdue]);

  const filteredLeads = useMemo(() => {
    let result = leadsWithOverdue;

    if (keyword) result = searchLeads(result, keyword);
    if (clueTypeFilter) result = result.filter((l) => l.clueType === clueTypeFilter);
    if (statusFilter) result = result.filter((l) => l.status === statusFilter);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    if (levelFilter) result = result.filter((l) => l.level === levelFilter);
    if (customerLevelFilter) result = result.filter((l) => l.customerLevel === customerLevelFilter);
    if (quickFilter) result = applyQuickFilterExtended(result, quickFilter);

    return result;
  }, [leadsWithOverdue, keyword, clueTypeFilter, statusFilter, sourceFilter, entityFilter, levelFilter, customerLevelFilter, quickFilter]);

  const now = useMemo(() => new Date(), []);
  const dispatchViews = useMemo(() => {
    const map = new Map<string, ReturnType<typeof leadDispatchView>>();
    for (const l of filteredLeads) map.set(l.id, leadDispatchView(l, now));
    return map;
  }, [filteredLeads, now]);

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) { Message.warning('暂无权限'); return; }
    const e = findCompanyEntityByName(entityName);
    if (!e) { Message.warning('未找到'); return; }
    setSelectedCompanyEntity(e);
    setCompanyModalVisible(true);
  };

  const clueTypeColorMap: Record<ClueType, string> = { public: 'blue', assigned: 'green', trash: 'red', hightech: 'purple' };

  // 复合列定义（31列→14复合单元）
  const columns = [
    { title: '编号', dataIndex: 'id', width: 70, fixed: 'left' as const },
    { title: '录入时间', dataIndex: 'createTime', width: 130, render: (v: string) => v?.slice(5) || '-' },
    {
      title: '状态',
      width: 130,
      render: (_: unknown, r: LeadListItem) => {
        const stepIndex = getSalesStatusIndex(r.status);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12 }}>{r.status}</span>
            {stepIndex >= 0 && (
              <div style={{ display: 'flex', gap: 2, width: 56 }}>
                {SALES_STATUS_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 1, backgroundColor: i <= stepIndex ? 'rgb(var(--primary-4))' : 'var(--color-fill-2)' }} />
                ))}
              </div>
            )}
            {stepIndex < 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-4)' }}>已终止</div>
            )}
          </div>
        );
      },
    },
    {
      title: '客户/线索',
      width: 240,
      render: (_: unknown, r: LeadListItem) => (
        <div>
          <a onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'all' } })} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
            {r.name}
          </a>
          {r.presalesGroupName && (
            <Tooltip content="点击复制群名">
              <div
                style={{ fontSize: 12, color: 'rgb(var(--warning-6))', cursor: 'pointer', marginTop: 2 }}
                onClick={() => { navigator.clipboard.writeText(r.presalesGroupName || ''); Message.success('已复制群名'); }}
              >
                <WeChatIcon size={14} /> {r.presalesGroupName}
              </div>
            </Tooltip>
          )}
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
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source as keyof typeof LEAD_SOURCE_LABEL] || r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>
            {r.entity}
          </a>
        </Space>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>等级+意向</span>,
      width: 100,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={4}>
          {r.customerLevel ? (
            <Tag color={CUSTOMER_LEVEL_COLOR[r.customerLevel as keyof typeof CUSTOMER_LEVEL_COLOR]}>{r.customerLevel}</Tag>
          ) : (
            <Tooltip content="客户等级未定"><Tag color="gray" aria-label="客户等级未定">?</Tag></Tooltip>
          )}
          <Tag color={INTENTION_LEVEL_COLOR[r.level as keyof typeof INTENTION_LEVEL_COLOR]}>{r.level}</Tag>
        </Space>
      ),
    },
    {
      title: '跟进倒计时',
      width: 160,
      render: (_: unknown, r: LeadListItem) => {
        const capsule = getCountdownCapsule(r.nextFollowTime);
        const view = dispatchViews.get(r.id);
        const SLA_COLOR: Record<string, string> = { normal: 'green', warning: 'orange', overdue: 'red', contacted: 'green' };
        const hasSla = view && r.dispatchedAt;
        const countdown = capsule.status === 'none' && !hasSla
          ? <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>-</span>
          : capsule.status === 'none'
            ? null
            : capsule.status === 'today' || capsule.status === 'overdue'
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    color: COUNTDOWN_COLOR[capsule.status], backgroundColor: COUNTDOWN_BG[capsule.status],
                    border: capsule.status === 'overdue' ? '1px solid rgb(var(--danger-3))' : '1px solid rgb(var(--warning-3))',
                  }}>
                    {capsule.status === 'overdue' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgb(var(--danger-6))', marginRight: 4 }} />}
                    {capsule.label}
                  </span>
                  {capsule.subLabel && <span style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{capsule.subLabel}</span>}
                </div>
              )
              : <span style={{ fontSize: 12, color: COUNTDOWN_COLOR[capsule.status], whiteSpace: 'nowrap' }}>{capsule.label} {capsule.subLabel}</span>;
        if (!hasSla) return countdown;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {countdown}
            <div style={{ display: 'flex', gap: 2 }}>
              <Tag size="small" color={SLA_COLOR[view!.dispatchSla.status]}>派{view!.dispatchSla.label}</Tag>
              <Tag size="small" color={SLA_COLOR[view!.firstContactSla.status]}>联{view!.firstContactSla.label}</Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: '最近跟进',
      width: 240,
      render: (_: unknown, r: LeadListItem) => {
        if (!r.lastFollowTime) return <span style={{ color: 'var(--color-text-4)', fontSize: 12 }}>暂无跟进</span>;
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{r.lastFollowTime.slice(5)}</span>
              {r.owner && <span style={{ fontSize: 12, color: 'var(--color-text-1)' }}>· {r.owner}</span>}
            </div>
            <Tooltip content={r.lastFollowContent || ''} disabled={!r.lastFollowContent}>
              <div style={{ fontSize: 14, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {r.lastFollowContent || '-'}
              </div>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: '归属与协作',
      width: 120,
      render: (_: unknown, r: LeadListItem) => (
        <div style={{ fontSize: 12 }}>
          <div>归属: {r.owner || '-'}</div>
          <div style={{ color: 'var(--color-text-3)' }}>优化: {r.optimizer || '-'}</div>
          {r.assistant && <div style={{ color: 'var(--color-text-4)' }}>协助: {r.assistant}</div>}
        </div>
      ),
    },
    {
      title: '跟进/持有/预算',
      width: 130,
      render: (_: unknown, r: LeadListItem) => {
        return (
          <LeadTransferPopover leadId={r.id} followCount={r.followCount} daysHeld={r.daysHeld} historyOwners={r.historyOwners} budget={r.budget} />
        );
      },
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={0}>
          <Tooltip content="查看详情">
            <Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'all' } })} />
          </Tooltip>
          {r.clueType === 'public' && (
            <Tooltip content="认领">
              <Button type="text" icon={<IconUserAdd />} size="small" onClick={() => Message.success('认领成功')} />
            </Tooltip>
          )}
          {r.clueType !== 'trash' && (
            <Tooltip content="标记垃圾">
              <Button type="text" icon={<TrashLeadIcon />} size="small" status="danger" onClick={() => Message.success('已标记垃圾')} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 高级筛选 Popover 内容
  const advancedFilterContent = (
    <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>线索类型</div>
        <Select placeholder="全部线索类型" style={{ width: '100%' }} allowClear value={clueTypeFilter || undefined} onChange={setClueTypeFilter}>
          {Object.entries(CLUE_TYPE_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>线索来源</div>
        <Select placeholder="全部线索来源" style={{ width: '100%' }} allowClear value={sourceFilter || undefined} onChange={setSourceFilter}>
          {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>客户等级</div>
        <Select placeholder="全部客户等级" style={{ width: '100%' }} allowClear value={customerLevelFilter || undefined} onChange={setCustomerLevelFilter}>
          {CUSTOMER_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>意向等级</div>
        <Select placeholder="全部意向等级" style={{ width: '100%' }} allowClear value={levelFilter || undefined} onChange={setLevelFilter}>
          {INTENTION_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>对接主体</div>
        <Select placeholder="全部对接主体" style={{ width: '100%' }} allowClear value={entityFilter || undefined} onChange={setEntityFilter}>
          {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>线索状态</div>
        <Select placeholder="全部线索状态" style={{ width: '100%' }} allowClear value={statusFilter || undefined} onChange={setStatusFilter}>
          {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
        </Select>
      </div>
    </div>
  );

  const assignedCount = leads.filter((l) => l.clueType === 'assigned').length;
  const publicCount = leads.filter((l) => l.clueType === 'public').length;
  const closedCount = leads.filter((l) => l.status === '已签单' || l.transformStatus).length;
  const filtersActive = [keyword, statusFilter, entityFilter, clueTypeFilter, sourceFilter, customerLevelFilter, levelFilter, quickFilter].some(Boolean);

  return (
    <PageShell breadcrumbs={[{ label: '线索管理' }, { label: '全部线索' }]}>
      <PageHeader
        title="全部线索池"
        description="全息透视公司各渠道、各主体与责任人的线索流动全貌，支持复合多维检索与全局流转把控。"
      />

      <MetricGrid
        items={[
          {
            key: 'allTotal',
            label: '全量线索总数',
            value: `${leads.length} 条`,
            detail: filtersActive ? `当前筛选命中 ${filteredLeads.length} 条` : '涵盖公海、在跟、垃圾各池',
          },
          {
            key: 'assigned',
            label: '人员在跟线索',
            value: `${assignedCount} 条`,
            detail: '处于销售责任人跟进中',
            tone: assignedCount > 0 ? 'success' : undefined,
          },
          {
            key: 'public',
            label: '公海资源池',
            value: `${publicCount} 条`,
            detail: '待认领与流通资源',
          },
          {
            key: 'closed',
            label: '已签约转化',
            value: `${closedCount} 条`,
            detail: leads.length > 0 ? `转化率 ${((closedCount / leads.length) * 100).toFixed(1)}%` : '暂无转化',
            tone: closedCount > 0 ? 'success' : undefined,
          },
        ]}
      />

      {/* 快捷状态分段筛选器 */}
      <div style={{ marginBottom: 16, padding: '6px 8px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-md)' }}>
        <Tabs type="card" size="small" activeTab={quickFilter || 'all'} onChange={(v) => setQuickFilter(v === 'all' ? '' : v as QuickFilter)}>
          <Tabs.TabPane key="all" title={`全部 (${leadsWithOverdue.length})`} />
          {Object.entries(QUICK_FILTER_LABEL).map(([key, label]) => (
            <Tabs.TabPane
              key={key}
              title={
                <Space size={6}>
                  <span>{label}</span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      color: (key === 'overdue' && filterCounts.overdue > 0) ? '#fff' : (key === 'today_unfollowed' && filterCounts.today_unfollowed > 0) ? '#fff' : 'var(--color-text-3)',
                      backgroundColor: (key === 'overdue' && filterCounts.overdue > 0) ? 'rgb(var(--danger-6))' : (key === 'today_unfollowed' && filterCounts.today_unfollowed > 0) ? 'rgb(var(--warning-6))' : 'var(--color-fill-3)',
                    }}
                  >
                    {filterCounts[key as QuickFilter]}
                  </span>
                </Space>
              }
            />
          ))}
        </Tabs>
      </div>

      <Card style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--grey-200)' }}>
        {/* 常驻搜索栏（1行4项+高级筛选+重置） */}
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
          <Input style={{ width: 280 }} placeholder="搜索线索名称、电话、联系人" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="全部线索状态" style={{ width: 140 }} allowClear value={statusFilter || undefined} onChange={setStatusFilter}>
            {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="全部线索来源" style={{ width: 140 }} allowClear value={sourceFilter || undefined} onChange={setSourceFilter}>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
          </Select>
          <Select placeholder="全部对接主体" style={{ width: 140 }} allowClear value={entityFilter || undefined} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
          <Select placeholder="全部客户等级" style={{ width: 130 }} allowClear value={customerLevelFilter || undefined} onChange={setCustomerLevelFilter}>
            {CUSTOMER_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
          </Select>
          <Popover content={advancedFilterContent} trigger="click" position="bottom">
            <Button icon={<IconFilter />}>
              高级筛选
              {[clueTypeFilter, sourceFilter, customerLevelFilter, levelFilter].filter(Boolean).length > 0 && (
                <Tag color="blue" size="small" style={{ marginLeft: 4 }}>
                  {[clueTypeFilter, sourceFilter, customerLevelFilter, levelFilter].filter(Boolean).length}
                </Tag>
              )}
            </Button>
          </Popover>
          {filtersActive && (
            <Button
              type="text"
              onClick={() => {
                setKeyword(''); setStatusFilter(''); setEntityFilter('');
                setClueTypeFilter(''); setSourceFilter(''); setCustomerLevelFilter('');
                setLevelFilter(''); setQuickFilter('');
              }}
              style={{ color: 'var(--color-text-3)' }}
            >
              重置
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          data={filteredLeads}
          scroll={{ x: 1700 }}
          rowClassName={(r: LeadListItem) => r.isOverdue ? 'arco-table-row-warning' : ''}
          pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }}
        />
      </Card>

      <CompanyEntityInfoModal
        visible={companyModalVisible}
        mode="view"
        defaultTab="files"
        record={selectedCompanyEntity}
        permissions={companyEntityPermissions}
        onCancel={() => setCompanyModalVisible(false)}
        onGoManage={() => navigate('/system/company')}
      />
    </PageShell>
  );
}
