import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Badge, Button, Card, Descriptions, Empty, Form, Grid, Input, Message, Modal, Popconfirm, Space, Switch, Table, Tabs, Tag, Timeline } from '@arco-design/web-react';
import { NotePencil, Plus } from '@phosphor-icons/react';
import { PageShell, ProcessMetricGrid, ProcessOverview, ProcessWorkspace, ProcessWorkspaceAside, ProcessWorkspaceMain } from '../components/ui';
import { useCustomers } from './customers/CustomerContext';
import { deriveCustomerStatus } from './customers/customerModel';
import type { CustomerContact } from './customers/types';
import { useLeads } from '../leads/LeadContext';
import { useQuotation } from './quotation/QuotationContext';
import { useContracts } from './contracts/ContractsContext';
import { useProjects } from './project-management/ProjectContext';
import './customers/customerDetail.css';

const TabPane = Tabs.TabPane;
const Row = Grid.Row;
const Col = Grid.Col;

function money(value: number) {
  return `¥${value.toLocaleString('zh-CN')}`;
}

function normalizeLeadId(id?: string) {
  return id?.replace(/^lead-/, '');
}

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCustomer, updateCustomer, addContact, updateContact, setPrimaryContact, removeContact, updateInvoiceProfile } = useCustomers();
  const { leads } = useLeads();
  const { quotes } = useQuotation();
  const { contracts } = useContracts();
  const { projects } = useProjects();
  const customer = getCustomer(id);
  const [editVisible, setEditVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [editForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();

  const related = useMemo(() => {
    if (!customer) return { leads: [], quotes: [], contracts: [], projects: [] };
    const customerLeads = leads.filter((lead) => lead.customer === customer.name || customer.id === `lead-${lead.id}` || customer.aliases?.includes(lead.customer));
    const leadIds = new Set(customerLeads.map((lead) => normalizeLeadId(lead.id)));
    const customerQuotes = quotes.filter((quote) => leadIds.has(normalizeLeadId(quote.leadId)) || quote.customerId === customer.id || quote.basicInfo.customerName === customer.name);
    const customerContracts = contracts.filter((contract) => contract.customerId === customer.id || contract.current.customerName === customer.name || leadIds.has(normalizeLeadId(contract.leadId)));
    const contractIds = new Set(customerContracts.map((contract) => contract.id));
    const customerProjects = projects.filter((project) => contractIds.has(project.contractId ?? '') || leadIds.has(normalizeLeadId(project.leadId)) || project.customerName === customer.name);
    return { leads: customerLeads, quotes: customerQuotes, contracts: customerContracts, projects: customerProjects };
  }, [contracts, customer, leads, projects, quotes]);

  if (!customer) {
    return <PageShell breadcrumbs={[{ label: '客户管理', to: '/customers' }, { label: '客户不存在' }]}><Card><Empty description="未找到该客户，可能已被合并或链接已失效"><Button onClick={() => navigate('/customers')}>返回客户列表</Button></Empty></Card></PageShell>;
  }

  const contractAmount = related.contracts.filter((item) => item.status !== 'voided').reduce((sum, item) => sum + item.current.totalAmount, 0);
  const received = related.contracts.reduce((sum, item) => sum + (item.receivedAmount ?? item.collectionRecords?.reduce((inner, record) => inner + record.amount, 0) ?? 0), 0);
  const outstanding = Math.max(0, contractAmount - received);
  const status = deriveCustomerStatus({
    activeMainContractCount: related.contracts.filter((item) => item.kind !== 'supplement' && !['draft', 'voided'].includes(item.status)).length,
    hasActiveProject: related.projects.some((item) => !['已完成', '搁置'].includes(item.status)),
    hasOutstandingCollection: outstanding > 0,
    hasActiveMaintenance: false,
    hasHistoricCooperation: related.contracts.some((item) => item.status === 'archived'),
  });
  const primary = customer.contacts.find((item) => item.isPrimary && item.active);

  const openEdit = () => {
    editForm.setFieldsValue(customer);
    setEditVisible(true);
  };
  const openContact = (contact?: CustomerContact) => {
    setEditingContact(contact ?? null);
    contactForm.resetFields();
    contactForm.setFieldsValue(contact ?? { active: true, isPrimary: customer.contacts.filter((item) => item.active).length === 0 });
    setContactVisible(true);
  };
  const openInvoice = () => {
    invoiceForm.setFieldsValue(customer.invoiceProfile ?? { title: customer.kind === 'enterprise' ? customer.name : '', taxNo: customer.creditCode ?? '' });
    setInvoiceVisible(true);
  };

  const businessChains = related.leads.map((lead) => {
    const chainQuotes = related.quotes.filter((quote) => normalizeLeadId(quote.leadId) === normalizeLeadId(lead.id));
    const chainContracts = related.contracts.filter((contract) => normalizeLeadId(contract.leadId) === normalizeLeadId(lead.id));
    const chainProjects = related.projects.filter((project) => normalizeLeadId(project.leadId) === normalizeLeadId(lead.id));
    return { lead, quotes: chainQuotes, contracts: chainContracts, projects: chainProjects };
  });
  const directContracts = related.contracts.filter((contract) => !contract.leadId);

  const contactColumns = [
    { title: '联系人', width: 160, render: (_: unknown, record: CustomerContact) => <div><Space size={6}>{record.name}{record.isPrimary && <Tag color="green">主联系人</Tag>}{!record.active && <Tag>已停用</Tag>}</Space><div className="customer-detail-secondary">{record.position ?? '未维护职位'}</div></div> },
    { title: '联系方式', width: 220, render: (_: unknown, record: CustomerContact) => <div>{record.phone || '—'}<div className="customer-detail-secondary">{record.email || record.wechat || '未维护邮箱或微信'}</div></div> },
    { title: '生日', dataIndex: 'birthday', width: 100, render: (value?: string) => value || '—' },
    { title: '操作', width: 220, render: (_: unknown, record: CustomerContact) => <Space size={4}>
      <Button type="text" size="small" onClick={() => openContact(record)}>编辑</Button>
      {record.active && !record.isPrimary && <Button type="text" size="small" onClick={() => { setPrimaryContact(customer.id, record.id); Message.success('主联系人已切换'); }}>设为主联系人</Button>}
      <Popconfirm title={record.referenced ? '该联系人已被历史业务引用，将改为停用并保留历史。' : '确认删除这位未被引用的联系人？'} onOk={() => { const deleted = removeContact(customer.id, record.id); Message.success(deleted ? '联系人已删除' : '联系人已停用，历史引用保持不变'); }}><Button type="text" status="danger" size="small">{record.referenced ? '停用' : '删除'}</Button></Popconfirm>
    </Space> },
  ];

  return (
    <PageShell breadcrumbs={[{ label: '客户管理', to: '/customers' }, { label: '客户列表', to: '/customers' }, { label: customer.name }]}>
      {customer.mergedIntoId && <Alert type="warning" content={`该档案已并入客户 ${customer.mergedIntoId}，仅供历史回看。`} showIcon />}
      <ProcessOverview
        identifier={`KH-${customer.id.replace(/\D/g, '').slice(-6) || customer.id}`}
        title={customer.name}
        tags={<><Tag color={customer.level === 'S' ? 'green' : 'blue'}>{customer.level}级</Tag><Tag color={status === '合作中' ? 'green' : status === '已合作' ? 'blue' : 'gray'}>{status}</Tag>{!customer.active && <Tag color="red">已停用</Tag>}<Tag>{customer.industry ?? '未分类行业'}</Tag></>}
        actions={<Space wrap><Button size="small" icon={<NotePencil size={18} />} onClick={openEdit}>编辑客户</Button><Button type="primary" size="small" icon={<Plus size={18} />} onClick={() => navigate('/leads/my', { state: { createForCustomerId: customer.id } })}>新建线索</Button></Space>}
        currentStep={status === '待合作' ? 1 : status === '合作中' ? 2 : 3}
        steps={[{ key: 'profile', title: '客户建档', description: customer.createdAt.slice(0, 10) }, { key: 'opportunity', title: '机会推进', description: `${related.leads.length} 条业务机会` }, { key: 'cooperation', title: '签约履约', description: `${related.contracts.length} 份合同` }, { key: 'operation', title: '持续经营', description: outstanding ? `待收 ${money(outstanding)}` : '当前无待收款' }]}
      />
      <ProcessMetricGrid items={[
        { key: 'owner', label: '客户负责人', value: customer.ownerName, detail: customer.source ?? '来源未维护' },
        { key: 'primary', label: '主联系人', value: primary?.name ?? '未设置', detail: primary?.phone ?? '请补充联系方式' },
        { key: 'opportunities', label: '业务机会', value: `${related.leads.length} 条`, detail: `${related.quotes.length} 份报价` },
        { key: 'contracts', label: '合同', value: `${related.contracts.length} 份`, detail: money(contractAmount) },
        { key: 'received', label: '累计实收', value: money(received), tone: 'success' },
        { key: 'outstanding', label: '待收款', value: money(outstanding), tone: outstanding ? 'warning' : 'default' },
      ]} />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <Card className="customer-detail-main">
            <Tabs defaultActiveTab="profile">
              <TabPane key="profile" title="客户档案">
                <Descriptions column={3} data={[
                  { label: '客户类型', value: customer.kind === 'enterprise' ? '企业' : '个人' },
                  { label: '统一社会信用代码', value: customer.creditCode ?? '—', span: 2 },
                  { label: '所属行业', value: customer.industry ?? '—' },
                  { label: '企业规模', value: customer.scale ?? '—' },
                  { label: '客户来源', value: customer.source ?? '—' },
                  { label: '联系地址', value: customer.address ?? '—', span: 3 },
                  { label: '客户等级', value: `${customer.level}级` },
                  { label: '业务状态', value: status },
                  { label: '档案状态', value: customer.active ? '启用' : '停用' },
                  { label: '建档时间', value: customer.createdAt.slice(0, 10) },
                  { label: '最后更新', value: customer.updatedAt.slice(0, 10) },
                  { label: '历史别名', value: customer.aliases?.join('、') || '—' },
                ]} />
                <div className="customer-section-heading"><div><h3>联系人</h3><p>主联系人用于新报价和合同的默认快照，历史记录不会随之改写。</p></div><Button type="text" icon={<Plus size={18} />} onClick={() => openContact()}>添加联系人</Button></div>
                <Table rowKey="id" columns={contactColumns} data={customer.contacts} pagination={false} scroll={{ x: 800 }} />
              </TabPane>

              <TabPane key="chains" title="客户业务链">
                <div className="customer-chain-list">
                  {businessChains.map((chain) => <section key={chain.lead.id} className="customer-chain">
                    <button className="customer-chain-lead" onClick={() => navigate(`/leads/${chain.lead.id}`)}><span>{chain.lead.name}</span><Badge status={chain.lead.status === '已签单' ? 'success' : 'processing'} text={chain.lead.status} /></button>
                    <div className="customer-chain-flow">
                      <span>报价 {chain.quotes.length} 份</span><span aria-hidden>→</span><span>合同 {chain.contracts.length} 份</span><span aria-hidden>→</span><span>项目 {chain.projects.length} 个</span><span aria-hidden>→</span><span>待收 {money(chain.contracts.reduce((sum, item) => sum + Math.max(0, item.current.totalAmount - (item.receivedAmount ?? 0)), 0))}</span>
                    </div>
                    <div className="customer-chain-links">{chain.quotes.map((quote) => <Button key={quote.id} size="mini" onClick={() => navigate(`/quotation/${quote.id}`)}>{quote.quoteNo} · {quote.status}</Button>)}{chain.contracts.map((contract) => <Button key={contract.id} size="mini" onClick={() => navigate(`/contracts/${contract.id}`)}>{contract.contractNo}</Button>)}{chain.projects.map((project) => <Button key={project.id} size="mini" onClick={() => navigate(`/projects/${project.id}`)}>{project.projectNo}</Button>)}</div>
                  </section>)}
                  {directContracts.length > 0 && <section className="customer-chain"><div className="customer-chain-lead"><span>直接签约</span><Tag>{directContracts.length} 份</Tag></div><div className="customer-chain-links">{directContracts.map((contract) => <Button key={contract.id} size="mini" onClick={() => navigate(`/contracts/${contract.id}`)}>{contract.contractNo}</Button>)}</div></section>}
                  {businessChains.length === 0 && directContracts.length === 0 && <Empty description="暂无业务机会或直接签约记录" />}
                </div>
              </TabPane>

              <TabPane key="contracts" title="合同与回款">
                <Table rowKey="id" data={related.contracts} pagination={false} columns={[
                  { title: '合同', render: (_: unknown, record: typeof related.contracts[number]) => <a className="table-primary-link" onClick={() => navigate(`/contracts/${record.id}`)}>{record.contractNo}<div className="table-secondary-text">{record.current.contractName}</div></a> },
                  { title: '类型', render: (_: unknown, record: typeof related.contracts[number]) => record.kind === 'supplement' ? '补充合同' : '主合同' },
                  { title: '状态', dataIndex: 'status' },
                  { title: '合同额', render: (_: unknown, record: typeof related.contracts[number]) => money(record.current.totalAmount) },
                  { title: '实收', render: (_: unknown, record: typeof related.contracts[number]) => money(record.receivedAmount ?? 0) },
                  { title: '到期日', render: (_: unknown, record: typeof related.contracts[number]) => record.current.endDate || '—' },
                ]} />
              </TabPane>

              <TabPane key="activity" title="客户动态">
                <Timeline>
                  {[...customer.invoiceHistory.map((item) => ({ time: item.changedAt, title: '开票资料变更', detail: `${item.changedBy} 更新开票资料，旧资料已保留` })), ...related.contracts.map((item) => ({ time: item.updatedAt, title: item.kind === 'supplement' ? '补充合同更新' : '合同更新', detail: `${item.contractNo} · ${item.current.contractName}` })), { time: customer.createdAt, title: '客户建档', detail: `${customer.ownerName} 建立客户档案` }].sort((a, b) => b.time.localeCompare(a.time)).map((item) => <Timeline.Item key={`${item.time}-${item.title}`} label={item.time.slice(0, 16).replace('T', ' ')}><strong>{item.title}</strong><div className="customer-detail-secondary">{item.detail}</div></Timeline.Item>)}
                </Timeline>
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceMain>

        <ProcessWorkspaceAside>
          <Card title="当前开票资料" extra={<Button type="text" size="small" onClick={openInvoice}>维护</Button>}>
            <Descriptions column={1} data={[
              { label: '抬头', value: customer.invoiceProfile?.title ?? '未维护' },
              { label: '税号', value: customer.invoiceProfile?.taxNo ?? '—' },
              { label: '开户行', value: customer.invoiceProfile?.bankName ?? '—' },
              { label: '银行账号', value: customer.invoiceProfile?.bankAccount ?? '—' },
              { label: '地址电话', value: customer.invoiceProfile ? `${customer.invoiceProfile.address} ${customer.invoiceProfile.phone}` : '—' },
            ]} />
            {customer.invoiceHistory.length > 0 && <div className="customer-invoice-history"><span>历史版本</span><strong>{customer.invoiceHistory.length}</strong></div>}
          </Card>
          <Card title="关系摘要">
            <Descriptions column={1} data={[
              { label: '业务机会', value: `${related.leads.length} 条` },
              { label: '报价', value: `${related.quotes.length} 份` },
              { label: '主 / 补充合同', value: `${related.contracts.filter((item) => item.kind !== 'supplement').length} / ${related.contracts.filter((item) => item.kind === 'supplement').length}` },
              { label: '项目', value: `${related.projects.length} 个` },
            ]} />
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

      <Modal title="编辑客户资料" visible={editVisible} onCancel={() => setEditVisible(false)} onOk={async () => { const values = await editForm.validate(); updateCustomer(customer.id, values); Message.success('客户资料已更新'); setEditVisible(false); }} okText="保存资料" style={{ width: 680 }}>
        <Form form={editForm} layout="vertical"><Row gutter={16}><Col span={16}><Form.Item label="客户名称" field="name" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={8}><Form.Item label="客户等级" field="level"><Input /></Form.Item></Col><Col span={12}><Form.Item label="行业" field="industry"><Input /></Form.Item></Col><Col span={12}><Form.Item label="规模" field="scale"><Input /></Form.Item></Col><Col span={12}><Form.Item label="负责人" field="ownerName"><Input /></Form.Item></Col><Col span={12}><Form.Item label="来源" field="source"><Input /></Form.Item></Col><Col span={24}><Form.Item label="地址" field="address"><Input /></Form.Item></Col></Row></Form>
      </Modal>

      <Modal title={editingContact ? '编辑联系人' : '添加联系人'} visible={contactVisible} onCancel={() => setContactVisible(false)} onOk={async () => {
        const values = await contactForm.validate();
        if (editingContact) updateContact(customer.id, editingContact.id, values);
        else addContact(customer.id, { ...values, active: true, referenced: false });
        Message.success(editingContact ? '联系人已更新' : '联系人已添加');
        setContactVisible(false);
      }} okText="保存联系人">
        <Form form={contactForm} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item label="姓名" field="name" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={12}><Form.Item label="职位" field="position"><Input /></Form.Item></Col><Col span={12}><Form.Item label="手机号" field="phone" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={12}><Form.Item label="生日（月-日）" field="birthday"><Input placeholder="09-18；年份非必填" /></Form.Item></Col><Col span={12}><Form.Item label="微信" field="wechat"><Input /></Form.Item></Col><Col span={12}><Form.Item label="邮箱" field="email"><Input /></Form.Item></Col><Col span={24}><Form.Item label="设为主联系人" field="isPrimary" triggerPropName="checked"><Switch /></Form.Item></Col></Row></Form>
      </Modal>

      <Modal title="维护当前开票资料" visible={invoiceVisible} onCancel={() => setInvoiceVisible(false)} onOk={async () => {
        const values = await invoiceForm.validate();
        updateInvoiceProfile(customer.id, { ...values, updatedAt: new Date().toISOString() });
        Message.success('开票资料已更新；旧资料已写入变更记录');
        setInvoiceVisible(false);
      }} okText="保存新资料" style={{ width: 680 }}>
        <Alert type="info" content="新资料只用于之后创建的报价和合同，不会覆盖历史快照。" showIcon />
        <Form form={invoiceForm} layout="vertical"><Row gutter={16}><Col span={24}><Form.Item label="发票抬头" field="title" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={24}><Form.Item label="纳税人识别号" field="taxNo"><Input /></Form.Item></Col><Col span={12}><Form.Item label="开户行" field="bankName"><Input /></Form.Item></Col><Col span={12}><Form.Item label="银行账号" field="bankAccount"><Input /></Form.Item></Col><Col span={16}><Form.Item label="注册地址" field="address"><Input /></Form.Item></Col><Col span={8}><Form.Item label="注册电话" field="phone"><Input /></Form.Item></Col></Row></Form>
      </Modal>
    </PageShell>
  );
}
