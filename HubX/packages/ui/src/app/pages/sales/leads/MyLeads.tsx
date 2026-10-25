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
  IconRefresh,
} from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { CompanyEntityInfoModal } from '../company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from '../company-entity/companyEntityData';
import { useReminders } from '../../../reminders/ReminderContext';
import type { ReminderItem } from '../../../reminders/types';
import type { LeadListItem, QuickFilter } from './types';
import {
  SALES_STATUS_COLOR,
  SALES_STATUS_STEPS,
  getSalesStatusIndex,
  CUSTOMER_LEVEL_COLOR,
  INTENTION_LEVEL_COLOR,
  LEAD_SOURCE_COLOR,
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  COMPANY_ENTITY_LIST,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  QUICK_FILTER_LABEL,
  SALES_STATUS_LIST,
} from './types';
import { useLeads } from '../../../leads/LeadContext';
import { CURRENT_LOGIN_USER } from '../../../currentUser';
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
import { FollowUpIcon, TrashLeadIcon, WeChatIcon, PageShell, PageHeader, ProcessMetricGrid } from '../../../components/ui';
import { LeadFollowUpModal, type LeadFollowUpFormValues } from './components/LeadFollowUpModal';
import { uploadItemsToLeadAttachments } from './leadAttachments';

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
  const { leads, getTransferRecords, addFollowUp, markTrash } = useLeads();
  const currentUser = CURRENT_LOGIN_USER.name;
  const banner = getLeadFollowupReminderBanner(reminders);
  const [activeTab, setActiveTab] = useState('my');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter | ''>('');
  const [trashVisible, setTrashVisible] = useState(false);
  const [selectedTrashLead, setSelectedTrashLead] = useState<LeadListItem | null>(null);
  const [trashForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);
  const [followTargetLead, setFollowTargetLead] = useState<LeadListItem | null>(null);
  const [followSubmitting, setFollowSubmitting] = useState(false);

  const handleFollowUpSubmit = async (values: LeadFollowUpFormValues) => {
    if (!followTargetLead) return;
    try {
      setFollowSubmitting(true);
      const nextFollowTimeStr = typeof values.nextFollowTime === 'string'
        ? values.nextFollowTime
        : (values.nextFollowTime && typeof (values.nextFollowTime as { format?: (fmt: string) => string }).format === 'function'
          ? (values.nextFollowTime as { format: (fmt: string) => string }).format('YYYY-MM-DD HH:mm:ss')
          : undefined);

      await addFollowUp(followTargetLead.id, {
        method: values.method,
        customerStatus: values.customerStatus,
        intentionLevel: values.intentionLevel,
        costHours: values.costHours,
        costMins: values.costMins,
        content: values.content.trim(),
        nextFollowTime: nextFollowTimeStr,
        attachments: uploadItemsToLeadAttachments(values.attachments),
        creator: currentUser,
      });
      Message.success('跟进记录已保存');
      setFollowTargetLead(null);
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '跟进记录保存失败，请重试');
    } finally {
      setFollowSubmitting(false);
    }
  };

  const handleOpenTrashModal = (record: LeadListItem) => {
    setSelectedTrashLead(record);
    setTrashVisible(true);
  };

  const handleConfirmTrash = async () => {
    if (!selectedTrashLead) return;
    try {
      const values = await trashForm.validate();
      await markTrash(selectedTrashLead.id, currentUser, values.reason.trim());
      Message.success(`线索「${selectedTrashLead.name}」已转入垃圾池`);
      setTrashVisible(false);
      setSelectedTrashLead(null);
      trashForm.resetFields();
    } catch {
      // Form validate or markTrash rejection handled
    }
  };

  const myPool = leads.filter((l) => l.clueType === 'assigned');
  const rawLeads = useMemo(() => {
    switch (activeTab) {
      case 'my': return myPool;
      case 'created': return myPool.filter((l) => l.optimizer === currentUser);
      case 'assisted': return myPool.filter((l) => l.assistant === currentUser);
      default: return myPool;
    }
  }, [activeTab, myPool, currentUser]);

  const leadsWithOverdue = useMemo(() => calculateOverdueStatus(rawLeads), [rawLeads]);
  const filterCounts = useMemo(() => getQuickFilterCounts(leadsWithOverdue), [leadsWithOverdue]);

  const filteredLeads = useMemo(() => {
    let result = leadsWithOverdue;
    if (keyword) result = searchLeads(result, keyword);
    if (statusFilter) result = result.filter((l) => l.status === statusFilter);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    if (quickFilter) result = applyQuickFilterExtended(result, quickFilter);
    return result;
  }, [leadsWithOverdue, keyword, statusFilter, sourceFilter, entityFilter, quickFilter]);

  // SLA 视图（派发时效 + 首联时效）
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
                <WeChatIcon size={14} /> {r.presalesGroupName}
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
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source as keyof typeof LEAD_SOURCE_LABEL] || r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>{r.entity}</a>
        </Space>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>等级+意向</span>,
      width: 132,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={4}>
          {r.customerLevel && <Tag color={CUSTOMER_LEVEL_COLOR[r.customerLevel as keyof typeof CUSTOMER_LEVEL_COLOR]}>{r.customerLevel}</Tag>}
          <Tag color={INTENTION_LEVEL_COLOR[r.level as keyof typeof INTENTION_LEVEL_COLOR]}>{r.level}</Tag>
        </Space>
      ),
    },
    {
      title: '跟进倒计时',
      width: 160,
      render: (_: unknown, r: LeadListItem) => {
        const c = getCountdownCapsule(r.nextFollowTime);
        const view = dispatchViews.get(r.id);
        const SLA_COLOR: Record<string, string> = { normal: 'green', warning: 'orange', overdue: 'red', contacted: 'green' };
        const hasSla = view && r.dispatchedAt;
        const capsule = c.status === 'none' && !hasSla
          ? <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>-</span>
          : c.status === 'none'
            ? null
            : c.status === 'today' || c.status === 'overdue'
              ? (
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
              )
              : <span style={{ fontSize: 12, color: COUNTDOWN_COLOR[c.status], whiteSpace: 'nowrap' }}>{c.label} {c.subLabel}</span>;
        if (!hasSla) return capsule;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {capsule}
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
        return (
          <LeadTransferPopover leadId={r.id} followCount={r.followCount} daysHeld={r.daysHeld} historyOwners={r.historyOwners} />
        );
      },
    },
    {
      title: '操作',
      width: 120,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={0}>
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'my' } })} /></Tooltip>
          <Tooltip content="添加跟进"><Button type="text" icon={<FollowUpIcon />} size="small" onClick={() => setFollowTargetLead(r)} /></Tooltip>
          <Tooltip content="标记垃圾"><Button type="text" icon={<TrashLeadIcon />} size="small" status="danger" onClick={() => handleOpenTrashModal(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const myCount = myPool.length;
  const createdCount = myPool.filter((l) => l.optimizer === currentUser).length;
  const assistedCount = myPool.filter((l) => l.assistant === currentUser).length;

  const filtersActive = Boolean(keyword || statusFilter || sourceFilter || entityFilter || quickFilter);
  const resetFilters = () => {
    setKeyword('');
    setStatusFilter('');
    setSourceFilter('');
    setEntityFilter('');
    setQuickFilter('');
  };

  const inNegotiationCount = rawLeads.filter((l) => ['需求调研', '方案报价', '合同洽谈'].includes(l.status)).length;

  const COMMON_TRASH_REASONS = ['电话空号/错号', '暂无采购意向', '预算严重不足', '同行测试/竞对调研', '业务范围不匹配'];

  const handleSelectTrashTag = (reason: string) => {
    const cur = trashForm.getFieldValue('reason') || '';
    if (!cur) {
      trashForm.setFieldValue('reason', reason);
    } else if (!cur.includes(reason)) {
      trashForm.setFieldValue('reason', `${cur}；${reason}`);
    }
  };

  return (
    <PageShell breadcrumbs={[{ label: '线索管理' }, { label: '我的线索' }]}>
      <PageHeader
        title="我的线索工作台"
        description="聚焦负责线索的跟进全周期，实时追踪首联时效、跟进倒计时与商机转化进展。"
      />

      <ProcessMetricGrid
        items={[
          {
            key: 'totalMine',
            label: '在跟线索总数',
            value: `${rawLeads.length} 条`,
            detail: filtersActive ? `当前筛选 ${filteredLeads.length} 条` : '当前责任池沉淀',
          },
          {
            key: 'todayFollow',
            label: '今日需跟进',
            value: `${filterCounts.today_unfollowed} 条`,
            detail: '需完成计划拜访/联络',
            tone: filterCounts.today_unfollowed > 0 ? 'warning' : undefined,
          },
          {
            key: 'overdueFollow',
            label: '逾期未跟进',
            value: `${filterCounts.overdue} 条`,
            detail: filterCounts.overdue > 0 ? '时效严重超时待处理' : '健康履约',
            tone: filterCounts.overdue > 0 ? 'danger' : 'success',
          },
          {
            key: 'negotiation',
            label: '深入方案/合同',
            value: `${inNegotiationCount} 条`,
            detail: '进入重点攻坚阶段',
            tone: inNegotiationCount > 0 ? 'success' : undefined,
          },
        ]}
      />

      {banner && !bannerDismissed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            marginBottom: 16,
            background: 'linear-gradient(90deg, rgba(var(--warning-1), 0.9) 0%, rgba(var(--warning-1), 0.3) 100%)',
            border: '1px solid rgb(var(--warning-3))',
            borderLeft: '4px solid rgb(var(--warning-6))',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: 'rgb(var(--warning-6))' }} />
            <div style={{ fontSize: 13, color: 'var(--color-text-1)' }}>
              <span style={{ fontWeight: 600, color: 'rgb(var(--warning-7))' }}>跟进时效预警：</span>
              当前有 {banner.count} 条线索已超时未跟进，请尽快处理。
            </div>
          </div>
          <Space size={8}>
            {banner.firstTargetPath && (
              <Button type="primary" status="warning" size="mini" onClick={() => navigate(banner.firstTargetPath!, { state: { from: 'my' } })}>
                处理首条逾期
              </Button>
            )}
            <Button type="text" size="mini" onClick={() => setBannerDismissed(true)} style={{ color: 'var(--color-text-3)' }}>
              忽略
            </Button>
          </Space>
        </div>
      )}

      <Card style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--grey-200)' }}>
        <Tabs activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 12 }}>
          <TabPane key="my" title={`我的线索 (${myCount})`} />
          <TabPane key="created" title={`我录入的 (${createdCount})`} />
          <TabPane key="assisted" title={`我协助的 (${assistedCount})`} />
        </Tabs>

        {/* 快捷状态分段筛选器 */}
        <div style={{ marginBottom: 16, padding: '6px 8px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-md)' }}>
          <Tabs type="card" size="small" activeTab={quickFilter || 'all'} onChange={(v) => setQuickFilter(v === 'all' ? '' : v as QuickFilter)}>
            <TabPane key="all" title={`全部 (${leadsWithOverdue.length})`} />
            {Object.entries(QUICK_FILTER_LABEL).map(([key, label]) => (
              <TabPane
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

        {/* 复合工具条容器 */}
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
          <Select placeholder="全部当前步骤" style={{ width: 140 }} allowClear value={statusFilter || undefined} onChange={setStatusFilter}>
            {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
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

        <Table
          rowKey="key"
          columns={columns}
          data={filteredLeads}
          scroll={{ x: 1600 }}
          pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }}
        />
      </Card>

      <Modal
        title={`标记线索「${selectedTrashLead?.name || ''}」为垃圾`}
        visible={trashVisible}
        onOk={handleConfirmTrash}
        onCancel={() => { setTrashVisible(false); setSelectedTrashLead(null); trashForm.resetFields(); }}
        style={{ width: 500 }}
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(var(--warning-1), 0.5)', border: '1px solid rgb(var(--warning-2))', borderRadius: 4, fontSize: 12, color: 'rgb(var(--warning-7))' }}>
          提示：线索标记为垃圾后将移入垃圾线索池并停止跟进倒计时；累计退回 3 次将进入退回质检流程。
        </div>
        <Form form={trashForm} layout="vertical">
          <Form.Item label="快捷原因点选" style={{ marginBottom: 8 }}>
            <Space wrap size={6}>
              {COMMON_TRASH_REASONS.map((r) => (
                <Tag
                  key={r}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSelectTrashTag(r)}
                >
                  {r}
                </Tag>
              ))}
            </Space>
          </Form.Item>
          <Form.Item label="垃圾原因说明" field="reason" rules={[{ required: true, message: '请填写垃圾原因' }]}>
            <Input.TextArea placeholder="请说明标记为垃圾原因（可直接点击上方标签填入）" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />

      {followTargetLead && (
        <LeadFollowUpModal
          visible={Boolean(followTargetLead)}
          submitting={followSubmitting}
          defaultStatus={followTargetLead.status || '初步沟通'}
          defaultIntention={followTargetLead.level}
          onCancel={() => setFollowTargetLead(null)}
          onSubmit={handleFollowUpSubmit}
        />
      )}
    </PageShell>
  );
}
