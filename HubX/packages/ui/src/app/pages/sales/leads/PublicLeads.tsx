import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Form,
  Message,
  Space,
  Tag,
  Tooltip,
  Popover,
} from '@/design-system';
import { IconSearch, IconPlus, IconEye, IconUserAdd, IconRefresh } from '@/design-system';
import { CompanyEntityInfoModal } from '../company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from '../company-entity/companyEntityData';
import type { LeadListItem } from './types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_STEPS,
  getSalesStatusIndex,
  INTENTION_LEVEL_TONE,
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  LEAD_SOURCE_TONE,
  COMPANY_ENTITY_LIST,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  SALES_STATUS_LIST,
  INTENTION_LEVEL_LIST,
  SLA_STATUS_TONE,
} from './types';
import { useLeads } from '../../../leads/LeadContext';
import { CURRENT_LOGIN_USER } from '../../../currentUser';
import { leadDispatchView } from '../lead-dispatch/kpiCalc';
import { LeadTransferPopover } from '../../../leads/LeadTransferPopover';
import { searchLeads, getCountdownCapsule, COUNTDOWN_COLOR, COUNTDOWN_BG } from './utils';
import { NewLeadModal, type NewLeadFormValues } from './components/NewLeadModal';
import { uploadItemsToLeadAttachments } from './leadAttachments';
import {
  PageShell,
  PageHeader,
  MetricGrid,
  TrashLeadIcon,
  WeChatIcon,
  DataTable,
  GradeTag,
  SectionCard,
  StatusTag,
} from '@/design-system';

const FormItem = Form.Item;

export function PublicLeads() {
  const navigate = useNavigate();
  const { leads, createLead, claimLead, markTrash } = useLeads();
  const [visible, setVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [selectedTrashLead, setSelectedTrashLead] = useState<LeadListItem | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [customerLevelFilter, setCustomerLevelFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [trashForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const publicPool = useMemo(() => leads.filter((l) => l.clueType === 'public'), [leads]);

  const filteredLeads = useMemo(() => {
    let result = publicPool;
    if (keyword) result = searchLeads(result, keyword);
    if (statusFilter) result = result.filter((l) => l.status === statusFilter);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (levelFilter) result = result.filter((l) => l.level === levelFilter);
    if (customerLevelFilter) result = result.filter((l) => l.customerLevel === customerLevelFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    return result;
  }, [publicPool, keyword, statusFilter, sourceFilter, levelFilter, customerLevelFilter, entityFilter]);

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

  const handleClaim = async (r: LeadListItem) => {
    try {
      await claimLead(r.id, CURRENT_LOGIN_USER.name);
      Message.success(`成功认领线索「${r.name}」至我的线索`);
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '认领失败，请重试');
    }
  };

  const handleOpenTrashModal = (r: LeadListItem) => {
    setSelectedTrashLead(r);
    setTrashVisible(true);
  };

  const handleConfirmTrash = async () => {
    if (!selectedTrashLead) return;
    try {
      const values = await trashForm.validate();
      await markTrash(selectedTrashLead.id, CURRENT_LOGIN_USER.name, values.reason.trim());
      Message.success(`线索「${selectedTrashLead.name}」已转入垃圾池`);
      setTrashVisible(false);
      setSelectedTrashLead(null);
      trashForm.resetFields();
    } catch {
      // Form validate or markTrash rejection handled
    }
  };

  const filtersActive = Boolean(keyword || statusFilter || sourceFilter || entityFilter || customerLevelFilter || levelFilter);
  const resetFilters = () => {
    setKeyword('');
    setStatusFilter('');
    setSourceFilter('');
    setLevelFilter('');
    setCustomerLevelFilter('');
    setEntityFilter('');
  };

  // 统计指标
  const highIntentionCount = publicPool.filter((l) => l.customerLevel === 'S' || l.customerLevel === 'A' || l.level === '高').length;
  const pendingContactCount = publicPool.filter((l) => l.status === '未联系' || l.status === '未接通').length;

  // 复合列（与 AllLeads 一致）
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
            <span style={{ fontSize: 'var(--text-xs)' }}>{r.status}</span>
            {stepIndex >= 0 && (
              <div style={{ display: 'flex', gap: 2, width: 56 }}>
                {SALES_STATUS_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 'var(--radius-xs)', backgroundColor: i <= stepIndex ? 'rgb(var(--primary-4))' : 'var(--color-fill-2)' }} />
                ))}
              </div>
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
          <a onClick={() => navigate(`/leads/${r.key}?from=public`, { state: { from: 'public' } })} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>{r.name}</a>
          {r.presalesGroupName && (
            <Tooltip content="点击复制群名">
              <div style={{ fontSize: 'var(--text-xs)', color: 'rgb(var(--warning-6))', cursor: 'pointer', marginTop: 2 }} onClick={() => { navigator.clipboard.writeText(r.presalesGroupName || ''); Message.success('已复制群名'); }}>
                <WeChatIcon size={14} /> {r.presalesGroupName}
              </div>
            </Tooltip>
          )}
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>{r.contact}</div>
        </div>
      ),
    },
    {
      title: '联系人信息',
      width: 140,
      render: (_: unknown, r: LeadListItem) => (
        <div style={{ fontSize: 'var(--text-sm)' }}>
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
          <StatusTag tone={LEAD_SOURCE_TONE[r.source as keyof typeof LEAD_SOURCE_TONE] || 'neutral'}>{LEAD_SOURCE_LABEL[r.source as keyof typeof LEAD_SOURCE_LABEL] || r.source}</StatusTag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>{r.entity}</a>
        </Space>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>等级+意向</span>,
      width: 100,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={4}>
          {r.customerLevel && <GradeTag grade={r.customerLevel} />}
          <StatusTag tone={INTENTION_LEVEL_TONE[r.level as keyof typeof INTENTION_LEVEL_TONE]}>{r.level}</StatusTag>
        </Space>
      ),
    },
    {
      title: '跟进倒计时',
      width: 160,
      render: (_: unknown, r: LeadListItem) => {
        const c = getCountdownCapsule(r.nextFollowTime);
        const view = dispatchViews.get(r.id);
        const hasSla = view && r.dispatchedAt;
        const capsule = c.status === 'none' && !hasSla
          ? <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-4)' }}>-</span>
          : c.status === 'none'
            ? null
            : c.status === 'today' || c.status === 'overdue'
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-xs)', fontWeight: 500, whiteSpace: 'nowrap', color: COUNTDOWN_COLOR[c.status], backgroundColor: COUNTDOWN_BG[c.status], border: c.status === 'overdue' ? '1px solid rgb(var(--danger-3))' : '1px solid rgb(var(--warning-3))' }}>
                    {c.status === 'overdue' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgb(var(--danger-6))', marginRight: 4 }} />}
                    {c.label}
                  </span>
                  {c.subLabel && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{c.subLabel}</span>}
                </div>
              )
              : <span style={{ fontSize: 'var(--text-xs)', color: COUNTDOWN_COLOR[c.status], whiteSpace: 'nowrap' }}>{c.label} {c.subLabel}</span>;
        if (!hasSla) return capsule;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {capsule}
            <div style={{ display: 'flex', gap: 2 }}>
              <StatusTag size="small" tone={SLA_STATUS_TONE[view!.dispatchSla.status]}>派{view!.dispatchSla.label}</StatusTag>
              <StatusTag size="small" tone={SLA_STATUS_TONE[view!.firstContactSla.status]}>联{view!.firstContactSla.label}</StatusTag>
            </div>
          </div>
        );
      },
    },
    {
      title: '统计',
      width: 110,
      render: (_: unknown, r: LeadListItem) => (
        <LeadTransferPopover leadId={r.id} followCount={r.followCount} daysHeld={r.daysHeld} />
      ),
    },
    {
      title: '操作',
      width: 110,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={0}>
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}?from=public`, { state: { from: 'public' } })} /></Tooltip>
          <Tooltip content="认领"><Button type="text" icon={<IconUserAdd />} size="small" onClick={() => handleClaim(r)} /></Tooltip>
          <Tooltip content="标记垃圾"><Button type="text" icon={<TrashLeadIcon />} size="small" status="danger" onClick={() => handleOpenTrashModal(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreateLead = async (values: NewLeadFormValues) => {
    try {
      await createLead({
        name: values.name.trim(),
        contact: values.customerTitle?.trim() || '未填写',
        phone: values.phone?.trim() || '',
        wechat: values.wechat?.trim(),
        source: values.source,
        keyword: values.keyword?.trim(),
        entity: values.entity,
        tags: values.tags,
        initialRequirement: values.initialRequirement.trim(),
        optimizer: values.optimizer,
        owner: values.owner,
        assistant: values.assistant,
        attachments: uploadItemsToLeadAttachments(values.attachments ?? []),
      });
      Message.success('线索创建成功');
      setVisible(false);
    } catch {
      Message.error('线索创建失败，请重试');
      throw new Error('create lead failed');
    }
  };

  return (
    <PageShell breadcrumbs={[{ label: '线索管理' }, { label: '公海线索池' }]}>
      <PageHeader
        title="公海线索池"
        description="沉淀共享待认领与退回公海的线索资产，支持销售人员自由认领、跟进与转化流转。"
        actions={
          <Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>
            新建线索
          </Button>
        }
      />

      <MetricGrid
        items={[
          {
            key: 'publicTotal',
            label: '公海沉淀总数',
            value: `${publicPool.length} 条`,
            detail: filtersActive ? `当前筛选 ${filteredLeads.length} 条` : '全量可认领资源',
          },
          {
            key: 'highIntention',
            label: '优质高意向 (S/A级)',
            value: `${highIntentionCount} 条`,
            detail: '重点商机优先抢占',
            tone: highIntentionCount > 0 ? 'success' : undefined,
          },
          {
            key: 'pendingContact',
            label: '待首建联',
            value: `${pendingContactCount} 条`,
            detail: '尚未取得有效沟通',
            tone: pendingContactCount > 0 ? 'warning' : undefined,
          },
          {
            key: 'displayed',
            label: '当前命中视图',
            value: `${filteredLeads.length} 条`,
            detail: filtersActive ? '已应用条件过滤' : '实时可操作状态',
          },
        ]}
      />

      <SectionCard style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--grey-200)' }}>
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
            <Select.Option value="S">S</Select.Option><Select.Option value="A">A</Select.Option><Select.Option value="B">B</Select.Option><Select.Option value="C">C</Select.Option>
          </Select>
          {filtersActive && (
            <Button type="text" icon={<IconRefresh />} onClick={resetFilters} style={{ color: 'var(--color-text-3)' }}>
              重置
            </Button>
          )}
        </div>

        <DataTable columns={columns} data={filteredLeads} scroll={{ x: 1300 }} pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }} />
      </SectionCard>

      <NewLeadModal visible={visible} onSubmit={handleCreateLead} onCancel={() => setVisible(false)} />

      <Modal
        title={`标记线索「${selectedTrashLead?.name || ''}」为垃圾`}
        visible={trashVisible}
        onOk={handleConfirmTrash}
        onCancel={() => { setTrashVisible(false); setSelectedTrashLead(null); trashForm.resetFields(); }}
        style={{ width: 500 }}
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(var(--warning-1), 0.5)', border: '1px solid rgb(var(--warning-2))', borderRadius: 'var(--radius-xs)', fontSize: 'var(--text-xs)', color: 'rgb(var(--warning-7))' }}>
          提示：标记为垃圾后将自动从公海移入垃圾线索池；历史退回质检记录将被保留。
        </div>
        <Form form={trashForm} layout="vertical">
          <FormItem label="快捷原因" style={{ marginBottom: 8 }}>
            <Space wrap size={6}>
              {['电话空号/错号', '暂无采购意向', '预算严重不足', '同行测试/调研', '业务范围不匹配'].map((r) => (
                <StatusTag
                  key={r}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const cur = trashForm.getFieldValue('reason') || '';
                    trashForm.setFieldValue('reason', cur ? `${cur}；${r}` : r);
                  }}
                >
                  {r}
                </StatusTag>
              ))}
            </Space>
          </FormItem>
          <FormItem label="垃圾原因" field="reason" rules={[{ required: true, message: '请填写垃圾原因' }]}>
            <Input.TextArea placeholder="请详述标记为垃圾线索的具体原因（可点选上方标签）" rows={3} />
          </FormItem>
        </Form>
      </Modal>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </PageShell>
  );
}
