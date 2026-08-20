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
import { IconSearch, IconEye, IconUserAdd, IconDelete, IconFilter } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import type { LeadListItem, ClueType, QuickFilter } from './leads/types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_COLOR,
  SALES_STATUS_STEPS,
  getSalesStatusIndex,
  CUSTOMER_LEVEL_COLOR,
  INTENTION_LEVEL_COLOR,
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  QUICK_FILTER_LABEL,
  SALES_STATUS_LIST,
  CUSTOMER_LEVEL_LIST,
  INTENTION_LEVEL_LIST,
} from './leads/types';
import { ALL_LEADS, getTransferRecordsByLeadId } from './leads/mockData';
import {
  searchLeads,
  applyQuickFilterExtended,
  calculateOverdueStatus,
  getCountdownCapsule,
  COUNTDOWN_COLOR,
  COUNTDOWN_BG,
  getQuickFilterCounts,
} from './leads/utils';

export function AllLeads() {
  const navigate = useNavigate();
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

  const leadsWithOverdue = useMemo(() => calculateOverdueStatus(ALL_LEADS), []);
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
                <span style={{ color: '#07C160' }}>💬</span> {r.presalesGroupName}
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
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{r.source}</Tag>
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
          {r.customerLevel && <Tag color={CUSTOMER_LEVEL_COLOR[r.customerLevel as keyof typeof CUSTOMER_LEVEL_COLOR]}>{r.customerLevel}</Tag>}
          <Tag color={INTENTION_LEVEL_COLOR[r.level as keyof typeof INTENTION_LEVEL_COLOR]}>{r.level}</Tag>
        </Space>
      ),
    },
    {
      title: '跟进倒计时',
      width: 130,
      render: (_: unknown, r: LeadListItem) => {
        const capsule = getCountdownCapsule(r.nextFollowTime);
        if (capsule.status === 'none') {
          return <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>-</span>;
        }
        // 有胶囊的（today/overdue）：竖排，上面胶囊下面日期
        if (capsule.status === 'today' || capsule.status === 'overdue') {
          return (
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
          );
        }
        // 无胶囊（normal）：横排
        return (
          <span style={{ fontSize: 12, color: COUNTDOWN_COLOR[capsule.status], whiteSpace: 'nowrap' }}>
            {capsule.label} {capsule.subLabel}
          </span>
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
              {r.owner && <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>· {r.owner}</span>}
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
        const records = getTransferRecordsByLeadId(r.id);
        return (
          <Popover
            title="流转记录"
            trigger="click"
            popupStyle={{ maxWidth: 520 }}
            content={
              <div style={{ fontSize: 12 }}>
                <div style={{ marginBottom: 8, color: 'var(--color-text-3)' }}>
                  跟进 {r.followCount} 次 · 持有 {r.daysHeld} 天{r.historyOwners ? ` · 历史归属: ${r.historyOwners}` : ''}
                </div>
                {records.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border-2)', color: 'var(--color-text-3)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 6px 4px 0', fontWeight: 500, whiteSpace: 'nowrap' }}>操作人</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>操作</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>归属人</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>状态</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>原因</th>
                          <th style={{ textAlign: 'left', padding: '4px 0 4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((tr) => (
                          <tr key={tr.id} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                            <td style={{ padding: '4px 6px 4px 0', whiteSpace: 'nowrap' }}>{tr.operator}</td>
                            <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}><Tag color={TRANSFER_ACTION_COLOR[tr.action]} size="small">{TRANSFER_ACTION_LABEL[tr.action]}</Tag></td>
                            <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{tr.toOwner || '-'}</td>
                            <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{tr.status}</td>
                            <td style={{ padding: '4px 6px', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Tooltip content={tr.reason || ''}><span>{tr.reason || '-'}</span></Tooltip></td>
                            <td style={{ padding: '4px 0 4px 6px', whiteSpace: 'nowrap' }}>{tr.createdAt.slice(5)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-text-4)', textAlign: 'center', padding: 12 }}>暂无流转记录</div>
                )}
              </div>
            }
          >
            <div style={{ fontSize: 12, cursor: 'pointer', color: 'var(--primary-6)' }}>
              <div>{r.followCount}次跟进 · {r.daysHeld}天持有</div>
              {r.budget && <div style={{ color: 'var(--color-text-3)' }}>¥{r.budget.toLocaleString()}</div>}
            </div>
          </Popover>
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
              <Button type="text" icon={<IconDelete />} size="small" status="danger" onClick={() => Message.success('已标记垃圾')} />
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
        <Select placeholder="不限线索类型" style={{ width: '100%' }} allowClear value={clueTypeFilter} onChange={setClueTypeFilter}>
          {Object.entries(CLUE_TYPE_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>线索来源</div>
        <Select placeholder="不限来源" style={{ width: '100%' }} allowClear value={sourceFilter} onChange={setSourceFilter}>
          {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>客户等级</div>
        <Select placeholder="不限等级" style={{ width: '100%' }} allowClear value={customerLevelFilter} onChange={setCustomerLevelFilter}>
          {CUSTOMER_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>意向等级</div>
        <Select placeholder="不限意向" style={{ width: '100%' }} allowClear value={levelFilter} onChange={setLevelFilter}>
          {INTENTION_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>对接主体</div>
        <Select placeholder="不限主体" style={{ width: '100%' }} allowClear value={entityFilter} onChange={setEntityFilter}>
          {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
        </Select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>线索状态</div>
        <Select placeholder="不限状态" style={{ width: '100%' }} allowClear value={statusFilter} onChange={setStatusFilter}>
          {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <div>
      {/* 快捷筛选 Tab */}
      <div style={{ marginBottom: 12 }}>
        <Tabs type="card" activeTab={quickFilter || 'all'} onChange={(v) => setQuickFilter(v === 'all' ? '' : v as QuickFilter)}>
          <Tabs.TabPane key="all" title={`全部 (${leadsWithOverdue.length})`} />
          {Object.entries(QUICK_FILTER_LABEL).map(([key, label]) => (
            <Tabs.TabPane key={key} title={`${label} (${filterCounts[key as QuickFilter]})`} />
          ))}
        </Tabs>
      </div>

      <Card>
        {/* 常驻搜索栏（1行4项） */}
        <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
          <Input style={{ width: 280 }} placeholder="搜索线索名称、电话、联系人" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="线索状态" style={{ width: 130 }} allowClear value={statusFilter} onChange={setStatusFilter}>
            {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear value={sourceFilter} onChange={setSourceFilter}>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear value={entityFilter} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
          <Select placeholder="客户等级" style={{ width: 110 }} allowClear value={customerLevelFilter} onChange={setCustomerLevelFilter}>
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
          {[keyword, statusFilter, entityFilter, clueTypeFilter, sourceFilter, customerLevelFilter, levelFilter, quickFilter].some(Boolean) && (
            <Button
              type="text"
              onClick={() => {
                setKeyword(''); setStatusFilter(''); setEntityFilter('');
                setClueTypeFilter(''); setSourceFilter(''); setCustomerLevelFilter('');
                setLevelFilter(''); setQuickFilter('');
              }}
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
    </div>
  );
}
