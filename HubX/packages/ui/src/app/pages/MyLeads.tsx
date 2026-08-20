import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Modal,
  Form,
  Message,
  Space,
  Tooltip,
  Popover,
  Alert,
  Tabs,
  Tag,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconEye,
  IconEdit,
  IconDelete,
} from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import { useReminders } from '@/app/reminders/ReminderContext';
import type { ReminderItem } from '@/app/reminders/types';
import type { LeadListItem, QuickFilter } from './leads/types';
import {
  SALES_STATUS_COLOR,
  SALES_STATUS_STEPS,
  getSalesStatusIndex,
  CUSTOMER_LEVEL_COLOR,
  INTENTION_LEVEL_COLOR,
  LEAD_SOURCE_COLOR,
  LEAD_SOURCE_LIST,
  COMPANY_ENTITY_LIST,
  GROUP_TYPE_ICON,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  QUICK_FILTER_LABEL,
  SALES_STATUS_LIST,
} from './leads/types';
import { MY_LEADS, MY_CREATED_LEADS, MY_ASSISTED_LEADS, getTransferRecordsByLeadId } from './leads/mockData';
import {
  searchLeads,
  applyQuickFilterExtended,
  calculateOverdueStatus,
  getCountdownCapsule,
  COUNTDOWN_COLOR,
  COUNTDOWN_BG,
  getQuickFilterCounts,
} from './leads/utils';

const TabPane = Tabs.TabPane;

export function getLeadFollowupReminderBanner(reminders: ReminderItem[]) {
  const leadReminders = reminders.filter((r) => r.type === 'lead_followup_overdue');
  if (leadReminders.length === 0) return null;
  const first = leadReminders[0];
  return {
    count: leadReminders.length,
    firstLeadId: first.sourceId,
    firstTargetPath: first.actionTarget.kind === 'route' ? first.actionTarget.path : null,
  };
}

export function MyLeads() {
  const navigate = useNavigate();
  const { reminders } = useReminders();
  const banner = getLeadFollowupReminderBanner(reminders);
  const [activeTab, setActiveTab] = useState('my');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter | ''>('');
  const [trashVisible, setTrashVisible] = useState(false);
  const [trashForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const rawLeads = useMemo(() => {
    switch (activeTab) {
      case 'my': return MY_LEADS;
      case 'created': return MY_CREATED_LEADS;
      case 'assisted': return MY_ASSISTED_LEADS;
      default: return MY_LEADS;
    }
  }, [activeTab]);

  const leadsWithOverdue = useMemo(() => calculateOverdueStatus(rawLeads), [rawLeads]);
  const filterCounts = useMemo(() => getQuickFilterCounts(leadsWithOverdue), [leadsWithOverdue]);

  const filteredLeads = useMemo(() => {
    let result = leadsWithOverdue;
    if (keyword) result = searchLeads(result, keyword);
    if (statusFilter) result = result.filter((l) => l.status === statusFilter);
    if (quickFilter) result = applyQuickFilterExtended(result, quickFilter);
    return result;
  }, [leadsWithOverdue, keyword, statusFilter, quickFilter]);

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) { Message.warning('暂无权限'); return; }
    const e = findCompanyEntityByName(entityName);
    if (!e) { Message.warning('未找到'); return; }
    setSelectedCompanyEntity(e);
    setCompanyModalVisible(true);
  };

  const columns = [
    { title: '编号', dataIndex: 'id', width: 70, fixed: 'left' as const },
    { title: '录入时间', dataIndex: 'createTime', width: 130, render: (v: string) => v?.slice(5) || '-' },
    {
      title: '状态',
      width: 140,
      render: (_: unknown, r: LeadListItem) => {
        const stepIndex = getSalesStatusIndex(r.status);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12 }}>{r.status}</span>
            {stepIndex >= 0 && (
              <div style={{ display: 'flex', gap: 2, width: 56 }}>
                {SALES_STATUS_STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 1,
                      backgroundColor: i <= stepIndex ? 'rgb(var(--primary-4))' : 'var(--color-fill-2)',
                    }}
                  />
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
          <a onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'my' } })} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
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
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{r.customer} · {r.contact}</div>
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
      width: 120,
      render: (_: unknown, r: LeadListItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>{r.entity}</a>
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
        const c = getCountdownCapsule(r.nextFollowTime);
        if (c.status === 'none') {
          return <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>-</span>;
        }
        if (c.status === 'today' || c.status === 'overdue') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                color: COUNTDOWN_COLOR[c.status], backgroundColor: COUNTDOWN_BG[c.status],
                border: c.status === 'overdue' ? '1px solid rgb(var(--danger-3))' : '1px solid rgb(var(--warning-3))',
              }}>
                {c.status === 'overdue' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgb(var(--danger-6))', marginRight: 4 }} />}
                {c.label}
              </span>
              {c.subLabel && <span style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{c.subLabel}</span>}
            </div>
          );
        }
        return (
          <span style={{ fontSize: 12, color: COUNTDOWN_COLOR[c.status], whiteSpace: 'nowrap' }}>
            {c.label} {c.subLabel}
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
      title: '跟进/持有',
      width: 100,
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
            <span style={{ fontSize: 12, cursor: 'pointer', color: 'var(--primary-6)' }}>{r.followCount}次 · {r.daysHeld}天</span>
          </Popover>
        );
      },
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size="small">
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'my' } })} /></Tooltip>
          <Tooltip content="添加跟进"><Button type="text" icon={<IconEdit />} size="small" /></Tooltip>
          <Tooltip content="标记垃圾"><Button type="text" icon={<IconDelete />} size="small" status="danger" onClick={() => setTrashVisible(true)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {banner && (
        <Alert type="warning" closable={false} showIcon
          content={`当前有 ${banner.count} 条线索已超时未跟进，请尽快处理。`}
          style={{ marginBottom: 16, cursor: banner.firstTargetPath ? 'pointer' : 'default' }}
          onClick={() => banner.firstTargetPath && navigate(banner.firstTargetPath, { state: { from: 'my' } })}
        />
      )}

      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 12 }}>
          <TabPane key="my" title={`我的线索 (${MY_LEADS.length})`} />
          <TabPane key="created" title={`我录入的 (${MY_CREATED_LEADS.length})`} />
          <TabPane key="assisted" title={`我协助的 (${MY_ASSISTED_LEADS.length})`} />
        </Tabs>

        {/* 快捷筛选 Tab */}
        <div style={{ marginBottom: 12 }}>
          <Tabs type="card" size="small" activeTab={quickFilter || 'all'} onChange={(v) => setQuickFilter(v === 'all' ? '' : v as QuickFilter)}>
            <TabPane key="all" title={`全部 (${leadsWithOverdue.length})`} />
            {Object.entries(QUICK_FILTER_LABEL).map(([key, label]) => (
              <TabPane key={key} title={`${label} (${filterCounts[key as QuickFilter]})`} />
            ))}
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
          <Input style={{ width: 280 }} placeholder="搜索线索名称、电话、联系人" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="线索状态" style={{ width: 130 }} allowClear value={statusFilter} onChange={setStatusFilter}>
            {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
        </div>

        <Table columns={columns} data={filteredLeads} scroll={{ x: 1500 }} pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }} />
      </Card>

      <Modal title="标记为垃圾" visible={trashVisible} onOk={() => { trashForm.validate().then(() => { Message.success('已标记为垃圾'); setTrashVisible(false); trashForm.resetFields(); }); }} onCancel={() => { setTrashVisible(false); trashForm.resetFields(); }} style={{ width: 480 }}>
        <Form form={trashForm} layout="vertical">
          <Form.Item label="垃圾原因" field="reason" rules={[{ required: true, message: '请填写垃圾原因' }]}><Input.TextArea placeholder="请说明原因" rows={3} /></Form.Item>
        </Form>
      </Modal>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </div>
  );
}
