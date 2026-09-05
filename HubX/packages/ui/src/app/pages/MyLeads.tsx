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
  LEAD_SOURCE_LABEL,
  COMPANY_ENTITY_LIST,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  QUICK_FILTER_LABEL,
  SALES_STATUS_LIST,
} from './leads/types';
import { useLeads } from '@/app/leads/LeadContext';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';
import { leadDispatchView } from '@/app/pages/lead-dispatch/kpiCalc';
import { LeadTransferPopover } from '@/app/leads/LeadTransferPopover';
import {
  searchLeads,
  applyQuickFilterExtended,
  calculateOverdueStatus,
  getCountdownCapsule,
  COUNTDOWN_COLOR,
  COUNTDOWN_BG,
  getQuickFilterCounts,
} from './leads/utils';
import { FollowUpIcon, TrashLeadIcon, WeChatIcon } from '@/app/components/ui';
import { LeadFollowUpModal, type LeadFollowUpFormValues } from './leads/components/LeadFollowUpModal';
import { uploadItemsToLeadAttachments } from './leads/leadAttachments';

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
  const { leads, getTransferRecords, addFollowUp } = useLeads();
  const currentUser = CURRENT_LOGIN_USER.name;
  const banner = getLeadFollowupReminderBanner(reminders);
  const [activeTab, setActiveTab] = useState('my');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter | ''>('');
  const [trashVisible, setTrashVisible] = useState(false);
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
    if (quickFilter) result = applyQuickFilterExtended(result, quickFilter);
    return result;
  }, [leadsWithOverdue, keyword, statusFilter, quickFilter]);

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
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source] || r.source}</Tag>
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
              <Tag size="mini" color={SLA_COLOR[view!.dispatchSla.status]}>派{view!.dispatchSla.label}</Tag>
              <Tag size="mini" color={SLA_COLOR[view!.firstContactSla.status]}>联{view!.firstContactSla.label}</Tag>
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
          <Tooltip content="标记垃圾"><Button type="text" icon={<TrashLeadIcon />} size="small" status="danger" onClick={() => setTrashVisible(true)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const myCount = myPool.length;
  const createdCount = myPool.filter((l) => l.optimizer === currentUser).length;
  const assistedCount = myPool.filter((l) => l.assistant === currentUser).length;

  return (
    <div>
      {banner && !bannerDismissed && (
        <Alert type="warning" closable showIcon
          content={`当前有 ${banner.count} 条线索已超时未跟进，请尽快处理。`}
          style={{ marginBottom: 16, cursor: banner.firstTargetPath ? 'pointer' : 'default' }}
          onClose={(event) => {
            event?.stopPropagation?.();
            setBannerDismissed(true);
          }}
          onClick={() => banner.firstTargetPath && navigate(banner.firstTargetPath, { state: { from: 'my' } })}
        />
      )}

      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 12 }}>
          <TabPane key="my" title={`我的线索 (${myCount})`} />
          <TabPane key="created" title={`我录入的 (${createdCount})`} />
          <TabPane key="assisted" title={`我协助的 (${assistedCount})`} />
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
          <Select placeholder="当前步骤（全部）" style={{ width: 156 }} allowClear value={statusFilter || undefined} onChange={setStatusFilter}>
            {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
        </div>

        <Table
          rowKey="key"
          columns={columns}
          data={filteredLeads}
          scroll={{ x: 1600 }}
          pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }}
        />
      </Card>

      <Modal title="标记为垃圾" visible={trashVisible} onOk={() => { trashForm.validate().then(() => { Message.success('已标记为垃圾'); setTrashVisible(false); trashForm.resetFields(); }); }} onCancel={() => { setTrashVisible(false); trashForm.resetFields(); }} style={{ width: 480 }}>
        <Form form={trashForm} layout="vertical">
          <Form.Item label="垃圾原因" field="reason" rules={[{ required: true, message: '请填写垃圾原因' }]}><Input.TextArea placeholder="请说明原因" rows={3} /></Form.Item>
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
    </div>
  );
}
