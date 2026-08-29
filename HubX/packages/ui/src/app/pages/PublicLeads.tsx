import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
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
} from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye, IconUserAdd, IconDelete } from '@arco-design/web-react/icon';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import type { LeadListItem } from './leads/types';
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
  SALES_STATUS_LIST,
  INTENTION_LEVEL_LIST,
} from './leads/types';
import { useLeads } from '@/app/leads/LeadContext';
import { leadDispatchView } from '@/app/pages/lead-dispatch/kpiCalc';
import { LeadTransferPopover } from '@/app/leads/LeadTransferPopover';
import { searchLeads, getCountdownCapsule, COUNTDOWN_COLOR, COUNTDOWN_BG } from './leads/utils';
import { NewLeadModal, type NewLeadFormValues } from './leads/components/NewLeadModal';
import { uploadItemsToLeadAttachments } from './leads/leadAttachments';
import { WeChatIcon } from '@/app/components/ui';

const FormItem = Form.Item;

function RichTextEditor({ value = '', onChange, ...props }: any) {
  const quillRef = useRef<ReactQuill>(null);
  return (
    <div style={{ marginBottom: 42 }}>
      <ReactQuill ref={quillRef} value={value} onChange={onChange} {...props} />
    </div>
  );
}

export function PublicLeads() {
  const navigate = useNavigate();
  const { leads, createLead } = useLeads();
  const [visible, setVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [customerLevelFilter, setCustomerLevelFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [trashForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const filteredLeads = useMemo(() => {
    const pool = leads.filter((l) => l.clueType === 'public');
    let result = pool;
    if (keyword) result = searchLeads(result, keyword);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (levelFilter) result = result.filter((l) => l.level === levelFilter);
    if (customerLevelFilter) result = result.filter((l) => l.customerLevel === customerLevelFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    return result;
  }, [leads, keyword, sourceFilter, levelFilter, customerLevelFilter, entityFilter]);

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
            <span style={{ fontSize: 12 }}>{r.status}</span>
            {stepIndex >= 0 && (
              <div style={{ display: 'flex', gap: 2, width: 56 }}>
                {SALES_STATUS_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 1, backgroundColor: i <= stepIndex ? 'rgb(var(--primary-4))' : 'var(--color-fill-2)' }} />
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
              <div style={{ fontSize: 12, color: 'rgb(var(--warning-6))', cursor: 'pointer', marginTop: 2 }} onClick={() => { navigator.clipboard.writeText(r.presalesGroupName || ''); Message.success('已复制群名'); }}>
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
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source] || r.source}</Tag>
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
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', color: COUNTDOWN_COLOR[c.status], backgroundColor: COUNTDOWN_BG[c.status], border: c.status === 'overdue' ? '1px solid rgb(var(--danger-3))' : '1px solid rgb(var(--warning-3))' }}>
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
      title: '统计',
      width: 110,
      render: (_: unknown, r: LeadListItem) => (
        <LeadTransferPopover leadId={r.id} followCount={r.followCount} daysHeld={r.daysHeld} />
      ),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={0}>
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}?from=public`, { state: { from: 'public' } })} /></Tooltip>
          <Tooltip content="认领"><Button type="text" icon={<IconUserAdd />} size="small" onClick={() => Message.success('认领成功')} /></Tooltip>
          <Tooltip content="标记垃圾"><Button type="text" icon={<IconDelete />} size="small" status="danger" onClick={() => setTrashVisible(true)} /></Tooltip>
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
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--grey-400)', letterSpacing: '0.025em', textTransform: 'uppercase' }}>公海线索池</div>
        <Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>新建线索</Button>
      </div>

      <Card style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--grey-200)' }}>
        <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
          <Input style={{ width: 280 }} placeholder="搜索线索名称、电话、联系人" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="线索状态" style={{ width: 130 }} allowClear>
            {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear value={sourceFilter} onChange={setSourceFilter}>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear value={entityFilter} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
          <Select placeholder="客户等级" style={{ width: 110 }} allowClear value={customerLevelFilter} onChange={setCustomerLevelFilter}>
            <Select.Option value="S">S</Select.Option><Select.Option value="A">A</Select.Option><Select.Option value="B">B</Select.Option><Select.Option value="C">C</Select.Option>
          </Select>
        </div>

        <Table columns={columns} data={filteredLeads} scroll={{ x: 1300 }} pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }} />
      </Card>

      <NewLeadModal visible={visible} onSubmit={handleCreateLead} onCancel={() => setVisible(false)} />

      <Modal title="标记为垃圾" visible={trashVisible} onOk={() => { trashForm.validate().then(() => { Message.success('已标记为垃圾'); setTrashVisible(false); trashForm.resetFields(); }); }} onCancel={() => { setTrashVisible(false); trashForm.resetFields(); }} style={{ width: 480 }}>
        <Form form={trashForm} layout="vertical"><FormItem label="垃圾原因" field="reason" rules={[{ required: true, message: '请填写垃圾原因' }]}><Input.TextArea placeholder="请说明原因" rows={4} /></FormItem></Form>
      </Modal>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </div>
  );
}
