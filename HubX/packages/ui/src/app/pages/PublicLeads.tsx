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
  Grid,
  Tooltip,
  Popover,
  Upload,
} from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye, IconUserAdd, IconDelete, IconUpload } from '@arco-design/web-react/icon';
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
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_COLOR,
  SALES_STATUS_LIST,
  INTENTION_LEVEL_LIST,
} from './leads/types';
import { PUBLIC_LEADS, getTransferRecordsByLeadId } from './leads/mockData';
import { searchLeads, getCountdownCapsule, COUNTDOWN_COLOR, COUNTDOWN_BG } from './leads/utils';

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
  const [visible, setVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [customTagVisible, setCustomTagVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState(['APP', '小程序', '管理系统', '官网', '电商系统', 'CMS', 'OA系统']);
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [customerLevelFilter, setCustomerLevelFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [form] = Form.useForm();
  const [trashForm] = Form.useForm();
  const [customTagForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const customerList = [
    { id: '1', name: '北京科技有限公司', contact: '张经理', phone: '13800138000' },
    { id: '2', name: '上海商贸公司', contact: '李总', phone: '13900139000' },
    { id: '3', name: '深圳电商公司', contact: '王总', phone: '13600136000' },
    { id: '4', name: '广州金融公司', contact: '赵经理', phone: '13700137000' },
  ];

  const filteredLeads = useMemo(() => {
    let result = PUBLIC_LEADS;
    if (keyword) result = searchLeads(result, keyword);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (levelFilter) result = result.filter((l) => l.level === levelFilter);
    if (customerLevelFilter) result = result.filter((l) => l.customerLevel === customerLevelFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    return result;
  }, [keyword, sourceFilter, levelFilter, customerLevelFilter, entityFilter]);

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
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', color: COUNTDOWN_COLOR[c.status], backgroundColor: COUNTDOWN_BG[c.status], border: c.status === 'overdue' ? '1px solid rgb(var(--danger-3))' : '1px solid rgb(var(--warning-3))' }}>
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
      title: '统计',
      width: 110,
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
                  跟进 {r.followCount} 次 · 持有 {r.daysHeld} 天
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
            <span style={{ fontSize: 12, cursor: 'pointer', color: 'var(--primary-6)' }}>{r.followCount}次跟进 · {r.daysHeld}天</span>
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
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}?from=public`, { state: { from: 'public' } })} /></Tooltip>
          <Tooltip content="认领"><Button type="text" icon={<IconUserAdd />} size="small" onClick={() => Message.success('认领成功')} /></Tooltip>
          <Tooltip content="标记垃圾"><Button type="text" icon={<IconDelete />} size="small" status="danger" onClick={() => setTrashVisible(true)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreateLead = () => {
    form.setFieldValue('tags', selectedTags);
    form.validate().then((values) => {
      if (!values.phone?.trim() && !values.wechat?.trim()) { Message.warning('电话和微信至少填写一个'); return; }
      Message.success('线索创建成功');
      setVisible(false); form.resetFields(); setSelectedTags([]);
    });
  };

  const handleTagClick = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleAddCustomTag = () => {
    customTagForm.validate().then((values) => {
      const newTag = values.tagName.trim();
      if (newTag && !availableTags.includes(newTag)) { setAvailableTags([...availableTags, newTag]); setSelectedTags([...selectedTags, newTag]); Message.success('标签添加成功'); }
      else if (availableTags.includes(newTag)) { Message.warning('标签已存在'); }
      setCustomTagVisible(false); customTagForm.resetFields();
    });
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
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
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

      {/* 新建线索弹窗 */}
      <Modal title="新建线索" visible={visible} onOk={handleCreateLead} onCancel={() => { setVisible(false); form.resetFields(); setSelectedTags([]); }} style={{ width: 800 }}>
        <Form form={form} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={24}><FormItem label="线索名称" field="name" rules={[{ required: true, message: '请输入线索名称' }, { maxLength: 30, message: '最长30个字符' }]}><Input placeholder="请输入线索名称" maxLength={30} showWordLimit /></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="联系人" field="contact"><Input placeholder="请输入联系人姓名" /></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="联系电话" field="phone"><Input placeholder="请输入手机号" /></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="联系人微信" field="wechat"><Input placeholder="请输入微信号" /></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="线索来源" field="source" rules={[{ required: true, message: '请选择线索来源' }]}>
                <Select placeholder="请选择">{LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}</Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}><FormItem label="推广关键词" field="keyword"><Input placeholder="请输入推广关键词" /></FormItem></Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="所属公司" field="customerId" rules={[{ required: true, message: '请选择所属公司' }]}>
                <Select placeholder="请输入客户名称搜索" showSearch allowClear filterOption={(inputValue, option) => { const c = customerList.find((x) => x.id === option.props?.value); if (!c) return false; return `${c.name} ${c.contact} ${c.phone}`.toLowerCase().includes(inputValue.toLowerCase()); }}>
                  {customerList.map((c) => <Select.Option key={c.id} value={c.id}>{c.name} - {c.contact} - {c.phone}</Select.Option>)}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="意向等级" field="level"><Select placeholder="请选择">{INTENTION_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="客户等级" field="customerLevel"><Select placeholder="请选择"><Select.Option value="S">S</Select.Option><Select.Option value="A">A</Select.Option><Select.Option value="B">B</Select.Option><Select.Option value="C">C</Select.Option></Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="对接主体" field="entity" rules={[{ required: true, message: '请选择对接主体' }]}><Select placeholder="请选择">{COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="意向标签" field="tags">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableTags.map((tag) => <Tag key={tag} checkable checked={selectedTags.includes(tag)} onClick={() => handleTagClick(tag)} style={{ cursor: 'pointer' }}>{tag}</Tag>)}
                  <Button size="small" type="dashed" icon={<IconPlus />} onClick={() => setCustomTagVisible(true)}>新增标签</Button>
                </div>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={24}><FormItem label="初始信息" field="initialRequirement" rules={[{ required: true, message: '请输入初始信息' }, { maxLength: 500, message: '最长500个字符' }]}><Input.TextArea placeholder="请输入客户需求描述" rows={4} maxLength={500} showWordLimit /></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={24}><FormItem label="附件上传" field="attachments"><Upload accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" multiple drag tip="支持上传图片、PDF、Word、Excel等文件"><div style={{ padding: '20px 0', textAlign: 'center' }}><IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} /><div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>点击或拖拽文件到此处上传</div></div></Upload></FormItem></Grid.Col>
          </Grid.Row>
        </Form>
      </Modal>

      <Modal title="标记为垃圾" visible={trashVisible} onOk={() => { trashForm.validate().then(() => { Message.success('已标记为垃圾'); setTrashVisible(false); trashForm.resetFields(); }); }} onCancel={() => { setTrashVisible(false); trashForm.resetFields(); }} style={{ width: 480 }}>
        <Form form={trashForm} layout="vertical"><FormItem label="垃圾原因" field="reason" rules={[{ required: true, message: '请填写垃圾原因' }]}><Input.TextArea placeholder="请说明原因" rows={4} /></FormItem></Form>
      </Modal>

      <Modal title="新增标签" visible={customTagVisible} onOk={handleAddCustomTag} onCancel={() => { setCustomTagVisible(false); customTagForm.resetFields(); }} style={{ width: 400 }}>
        <Form form={customTagForm} layout="vertical"><FormItem label="标签名称" field="tagName" rules={[{ required: true, message: '请输入标签名称' }]}><Input placeholder="请输入标签名称" maxLength={10} /></FormItem></Form>
      </Modal>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </div>
  );
}
