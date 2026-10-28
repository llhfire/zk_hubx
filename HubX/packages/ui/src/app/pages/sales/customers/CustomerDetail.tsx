import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Button,
  Form,
  FormGrid,
  Input,
  Message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tabs,
  Timeline,
  Typography,
} from '@/design-system';
import {
  IconEdit,
  IconPlus,
  IconPhone,
  IconEmail,
  IconUser,
  IconFolder,
  IconFile,
  IconCheck,
  IconHistory,
  IconSafe,
  IconRight,
  IconCalendar,
  IconIdcard,
  IconBranch,
} from '@/design-system';
import {
  AlertBanner,
  DataTable,
  DateText,
  EmptyState,
  EntityLink,
  GradeTag,
  IdentifierText,
  MetricGrid,
  MoneyText,
  PageShell,
  ProcessOverview,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
  resolveStatus,
  type MetricItem,
  type ProcessOverviewStep,
  type StatusMap,
  DescriptionsCard,
  ProgressBar,
  SectionTabs,
  SectionCard,
} from '@/design-system';
import { useCustomers } from './CustomerContext';
import { deriveCustomerStatus } from './customerModel';
import type { CustomerContact } from './types';
import { useLeads } from '../../../leads/LeadContext';
import { useQuotation } from '../quotation/QuotationContext';
import { QUOTE_STATUS_LABELS } from '../quotation/types';
import { useContracts } from '../contracts/ContractsContext';
import { useCollections } from '../../../collections/CollectionContext';
import { withCollectionLedger } from '../../../../services/collectionMutations';
import { getReceivedAmount } from '../contracts/paymentUtils';
import { CONTRACT_STATUS } from '../contracts/utils';
import type { ContractStatus } from '../contracts/types';
import { useProjects } from '../../delivery/project/ProjectContext';
import { PROJECT_STATUS_META } from '../../delivery/project/types';
import './customerDetail.css';

const TabPane = Tabs.TabPane;
const { Title, Text, Paragraph } = Typography;

/** 客户合作状态 → 文案 + 语义色（StatusTag 使用）。 */
const CUSTOMER_STATUS: StatusMap<string> = {
  待合作: { label: '待合作', tone: 'neutral' },
  合作中: { label: '合作中', tone: 'success' },
  已合作: { label: '已合作', tone: 'info' },
};

const LEAD_STATUS: StatusMap<string> = {
  未联系: { label: '未联系', tone: 'info' },
  未接通: { label: '未接通', tone: 'info' },
  初步沟通: { label: '初步沟通', tone: 'info' },
  需求调研: { label: '需求调研', tone: 'info' },
  方案报价: { label: '方案报价', tone: 'info' },
  合同洽谈: { label: '合同洽谈', tone: 'info' },
  已签单: { label: '已签单', tone: 'success' },
  已终止: { label: '已终止', tone: 'danger' },
};

const MAIN_TABS = ['chains', 'contracts', 'projects', 'contacts', 'activity'] as const;
const SIDE_TABS = ['profile', 'invoice', 'finance'] as const;

type MainTab = typeof MAIN_TABS[number];
type SideTab = typeof SIDE_TABS[number];

function normalizeLeadId(id?: string) {
  return id?.replace(/^lead-/, '');
}

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    getCustomer,
    updateCustomer,
    addContact,
    updateContact,
    setPrimaryContact,
    removeContact,
    updateInvoiceProfile,
  } = useCustomers();

  const { leads } = useLeads();
  const { quotes } = useQuotation();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const { projects } = useProjects();

  const customer = getCustomer(id);

  // URL 驱动标签页
  const activeMainTab: MainTab = MAIN_TABS.includes(searchParams.get('main') as MainTab)
    ? (searchParams.get('main') as MainTab)
    : 'chains';
  const activeSideTab: SideTab = SIDE_TABS.includes(searchParams.get('side') as SideTab)
    ? (searchParams.get('side') as SideTab)
    : 'profile';

  const updateQueryState = (key: 'main' | 'side', value: string) => {
    const next = new URLSearchParams(searchParams);
    if ((key === 'main' && value === 'chains') || (key === 'side' && value === 'profile')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const setActiveMainTab = (tab: string) => updateQueryState('main', tab);
  const setActiveSideTab = (tab: string) => updateQueryState('side', tab);

  // 弹窗状态
  const [editVisible, setEditVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [editForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();

  // 业务链穿透归集
  const related = useMemo(() => {
    if (!customer) return { leads: [], quotes: [], contracts: [], projects: [] };
    const customerLeads = leads.filter(
      (lead) =>
        lead.customer === customer.name ||
        customer.id === `lead-${lead.id}` ||
        customer.aliases?.includes(lead.customer)
    );
    const leadIds = new Set(customerLeads.map((lead) => normalizeLeadId(lead.id)));
    const customerQuotes = quotes.filter(
      (quote) =>
        leadIds.has(normalizeLeadId(quote.leadId)) ||
        quote.customerId === customer.id ||
        quote.basicInfo.customerName === customer.name
    );
    // 金额口径统一走台账投影（CONTEXT.md §实收：金额事实来自独立实收台账）。
    // 投影后 receivedAmount / collectionRecords 都来自 collections，不再读合同上的兼容字段。
    const customerContracts = contracts
      .filter(
        (contract) =>
          contract.customerId === customer.id ||
          contract.current.customerName === customer.name ||
          leadIds.has(normalizeLeadId(contract.leadId))
      )
      .map((contract) => withCollectionLedger(contract, collections));
    const contractIds = new Set(customerContracts.map((contract) => contract.id));
    const customerProjects = projects.filter(
      (project) =>
        contractIds.has(project.contractId ?? '') ||
        leadIds.has(normalizeLeadId(project.leadId)) ||
        project.customerName === customer.name
    );
    return {
      leads: customerLeads,
      quotes: customerQuotes,
      contracts: customerContracts,
      projects: customerProjects,
    };
  }, [collections, contracts, customer, leads, projects, quotes]);

  if (!customer) {
    return (
      <PageShell
        breadcrumbs={[{ label: '客户管理', to: '/customers' }, { label: '客户不存在' }]}
      >
        <SectionCard>
          <EmptyState description="未找到该客户，可能已被合并或链接已失效" action={<Button onClick={() => navigate('/customers')}>返回客户列表</Button>} />
        </SectionCard>
      </PageShell>
    );
  }

  // 核心经营与财务指标计算
  const contractAmount = related.contracts
    .filter((item) => item.status !== 'voided')
    .reduce((sum, item) => sum + item.current.totalAmount, 0);

  const received = related.contracts.reduce((sum, item) => sum + getReceivedAmount(item), 0);

  const outstanding = Math.max(0, contractAmount - received);
  const collectionRate = contractAmount > 0 ? Math.min(100, Math.round((received / contractAmount) * 100)) : 0;

  const status = deriveCustomerStatus({
    activeMainContractCount: related.contracts.filter(
      (item) => item.kind !== 'supplement' && !['draft', 'voided'].includes(item.status)
    ).length,
    hasActiveProject: related.projects.some((item) => !['已完成', '搁置'].includes(item.status)),
    hasOutstandingCollection: outstanding > 0,
    hasActiveMaintenance: false,
    hasHistoricCooperation: related.contracts.some((item) => item.status === 'archived'),
  });

  const primary = customer.contacts.find((item) => item.isPrimary && item.active);

  // 平均项目交付进度
  const avgProjectProgress = useMemo(() => {
    if (related.projects.length === 0) return 0;
    const sum = related.projects.reduce((s, p) => s + (p.progress || 0), 0);
    return Math.round(sum / related.projects.length);
  }, [related.projects]);

  // 商机签单率
  const leadSignRate = useMemo(() => {
    if (related.leads.length === 0) return 0;
    const signedCount = related.leads.filter((l) => l.status === '已签单').length;
    return Math.round((signedCount / related.leads.length) * 100);
  }, [related.leads]);

  // 弹窗唤起操作
  const openEdit = () => {
    editForm.setFieldsValue(customer);
    setEditVisible(true);
  };

  const openContact = (contact?: CustomerContact) => {
    setEditingContact(contact ?? null);
    contactForm.resetFields();
    contactForm.setFieldsValue(
      contact ?? { active: true, isPrimary: customer.contacts.filter((item) => item.active).length === 0 }
    );
    setContactVisible(true);
  };

  const openInvoice = () => {
    invoiceForm.setFieldsValue(
      customer.invoiceProfile ?? {
        title: customer.kind === 'enterprise' ? customer.name : '',
        taxNo: customer.creditCode ?? '',
      }
    );
    setInvoiceVisible(true);
  };

  // 全链路业务映射
  const businessChains = related.leads.map((lead) => {
    const chainQuotes = related.quotes.filter(
      (quote) => normalizeLeadId(quote.leadId) === normalizeLeadId(lead.id)
    );
    const chainContracts = related.contracts.filter(
      (contract) => normalizeLeadId(contract.leadId) === normalizeLeadId(lead.id)
    );
    const chainProjects = related.projects.filter(
      (project) => normalizeLeadId(project.leadId) === normalizeLeadId(lead.id)
    );
    return { lead, quotes: chainQuotes, contracts: chainContracts, projects: chainProjects };
  });

  const directContracts = related.contracts.filter((contract) => !contract.leadId);

  // 客户动态足迹
  const activityList = useMemo(() => {
    const list = [
      ...customer.invoiceHistory.map((item) => ({
        time: item.changedAt,
        title: '开票资料变更',
        detail: `${item.changedBy} 更新开票资料，旧版本已安全归档`,
      })),
      ...related.contracts.map((item) => ({
        time: item.updatedAt,
        title: item.kind === 'supplement' ? '补充合同更新' : '合同签约履约',
        detail: `${item.contractNo} · ${item.current.contractName}`,
      })),
      {
        time: customer.createdAt,
        title: '客户建立初始档案',
        detail: `${customer.ownerName} 录入客户信息并完成建档`,
      },
    ];
    return list.sort((a, b) => b.time.localeCompare(a.time));
  }, [customer, related.contracts]);

  // 顶部 4 大微可视化指标卡
  const overviewMetrics: MetricItem[] = [
    {
      key: 'contracts',
      label: (
        <span className="customer-metric-heading">
          <span>签约合同总额</span>
          <strong><MoneyText value={contractAmount} /></strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <ProgressBar percent={collectionRate} size="small" showValue={false} />
          <div className="customer-metric-detail-row">
            已回款 <MoneyText value={received} /> · 待收敞口 <MoneyText value={outstanding} /> ({collectionRate}%)
          </div>
        </div>
      ),
      tone: received > 0 ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('contracts'),
      ariaLabel: '查看合同与回款台账',
    },
    {
      key: 'projects',
      label: (
        <span className="customer-metric-heading">
          <span>履约交付项目</span>
          <strong>{related.projects.length} 个</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <ProgressBar percent={avgProjectProgress} size="small" tone="cyan" showValue={false} />
          <div className="customer-metric-detail-row">
            {related.projects.length > 0
              ? `综合交付进度 ${avgProjectProgress}% · ${related.projects.filter((p) => p.status === '已完成').length} 个已结项`
              : '当前暂无执行中项目'}
          </div>
        </div>
      ),
      tone: related.projects.length > 0 ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('projects'),
      ariaLabel: '查看交付项目与工时',
    },
    {
      key: 'chains',
      label: (
        <span className="customer-metric-heading">
          <span>全链路业务机会</span>
          <strong>{related.leads.length} 条商机</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <ProgressBar percent={leadSignRate} size="small" tone="warning" showValue={false} />
          <div className="customer-metric-detail-row">
            签单转化率 {leadSignRate}% · 报价沉淀 {related.quotes.length} 份
          </div>
        </div>
      ),
      tone: related.leads.length > 0 ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('chains'),
      ariaLabel: '查看业务链路与商机',
    },
    {
      key: 'contacts',
      label: (
        <span className="customer-metric-heading">
          <span>关键联系人</span>
          <strong>{primary?.name ?? '未设主联系人'}</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="customer-metric-value-row">
            <Space size={4}>
              <GradeTag grade={customer.level} />
              <span>级客户</span>
            </Space>
            <span>{primary?.position ?? '主接口人'}</span>
          </div>
          <div className="customer-metric-detail-row">
            {primary?.phone ? `联系电话：${primary.phone}` : `负责人：${customer.ownerName}`}
          </div>
        </div>
      ),
      tone: primary ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('contacts'),
      ariaLabel: '查看联系人与决策矩阵',
    },
  ];

  const contactColumns = [
    {
      title: '联系人',
      width: 170,
      render: (_: unknown, record: CustomerContact) => (
        <div>
          <Space size={6}>
            <Text bold>{record.name}</Text>
            {record.isPrimary && <StatusTag tone="success">主联系人</StatusTag>}
            {!record.active && <StatusTag>已停用</StatusTag>}
          </Space>
          <div className="customer-detail-secondary">{record.position ?? '未维护职位'}</div>
        </div>
      ),
    },
    {
      title: '联系方式',
      width: 220,
      render: (_: unknown, record: CustomerContact) => (
        <div>
          <div>
            <IconPhone style={{ marginRight: 4, color: 'var(--color-text-3)' }} />
            {record.phone || '—'}
          </div>
          <div className="customer-detail-secondary">
            {record.email && (
              <span style={{ marginRight: 8 }}>
                <IconEmail style={{ marginRight: 2 }} /> {record.email}
              </span>
            )}
            {record.wechat && <span>微信号：{record.wechat}</span>}
            {!record.email && !record.wechat && '未维护邮箱或微信'}
          </div>
        </div>
      ),
    },
    {
      title: '生日关怀',
      dataIndex: 'birthday',
      width: 120,
      render: (value?: string) => (
        value ? <span className="customer-detail-secondary"><IconCalendar /> {value}</span> : '—'
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_: unknown, record: CustomerContact) => (
        <Space size={4}>
          <Button type="text" size="small" onClick={() => openContact(record)}>
            编辑
          </Button>
          {record.active && !record.isPrimary && (
            <Button
              type="text"
              size="small"
              onClick={() => {
                setPrimaryContact(customer.id, record.id);
                Message.success('主联系人已切换');
              }}
            >
              设为主联系人
            </Button>
          )}
          <Popconfirm
            title={
              record.referenced
                ? '该联系人已被历史业务引用，将改为停用并保留历史。'
                : '确认删除这位未被引用的联系人？'
            }
            onOk={() => {
              const deleted = removeContact(customer.id, record.id);
              Message.success(deleted ? '联系人已删除' : '联系人已停用，历史引用保持不变');
            }}
          >
            <Button type="text" status="danger" size="small">
              {record.referenced ? '停用' : '删除'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageShell
      className="customer-detail-360"
      breadcrumbs={[
        { label: '客户管理', to: '/customers' },
        { label: '客户列表', to: '/customers' },
        { label: customer.name },
      ]}
    >
      {customer.mergedIntoId && (
        <AlertBanner tone="warning">
          该档案已并入客户 {customer.mergedIntoId}，仅供历史回看。
        </AlertBanner>
      )}

      {/* 顶部 ProcessOverview */}
      <ProcessOverview
        identifier={<IdentifierText value={`KH-${customer.id.replace(/\D/g, '').slice(-6) || customer.id}`} />}
        title={customer.name}
        tags={
          <>
            <GradeTag grade={customer.level} />
            <StatusTag meta={resolveStatus(CUSTOMER_STATUS, status)} />
            {!customer.active && <StatusTag tone="danger">已停用</StatusTag>}
            <StatusTag tone="cyan">{customer.kind === 'enterprise' ? '企业客户' : '个人客户'}</StatusTag>
            <StatusTag>{customer.industry ?? '未分类行业'}</StatusTag>
          </>
        }
        actions={
          <Space wrap>
            <Button
              type="primary"
              size="small"
              icon={<IconPlus />}
              onClick={() =>
                navigate('/leads/my', { state: { createForCustomerId: customer.id } })
              }
            >
              新建线索
            </Button>
            <Button size="small" icon={<IconUser />} onClick={() => openContact()}>
              添加联系人
            </Button>
            <Button size="small" icon={<IconFile />} onClick={openInvoice}>
              维护开票
            </Button>
            <Button size="small" icon={<IconEdit />} onClick={openEdit}>
              编辑客户
            </Button>
          </Space>
        }
        currentStep={status === '待合作' ? 1 : status === '合作中' ? 2 : 3}
        steps={[
          { key: 'profile', title: '客户建档', description: <DateText value={customer.createdAt} /> },
          { key: 'opportunity', title: '机会推进', description: `${related.leads.length} 条业务机会` },
          { key: 'cooperation', title: '签约履约', description: `${related.contracts.length} 份合同` },
          {
            key: 'operation',
            title: '持续经营',
            description: outstanding ? <>待收 <MoneyText value={outstanding} /></> : '当前无待收款',
          },
        ]}
      />

      {/* 顶部 4 大微可视化指标卡 */}
      <MetricGrid items={overviewMetrics} />

      {/* 主次分流双栏工作区 */}
      <SplitLayout>
        {/* 左侧 Main：业务流转与交付协同 */}
        <SplitLayoutMain>
          <SectionCard className="customer-detail-main" bordered={false}>
            <SectionTabs
              activeKey={activeMainTab}
              onChange={setActiveMainTab}
              items={[
                {
                  key: 'chains',
                  label: <span>
                                <IconBranch /> 业务链路与商机 ({related.leads.length})
                              </span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                  }}
                                >
                                  <Text type="secondary">
                                    穿透链路：以商机线索为源头，串联报价单、签约合同、项目履约与待收款项闭环。
                                  </Text>
                                  <Button
                                    type="outline"
                                    size="small"
                                    icon={<IconPlus />}
                                    onClick={() =>
                                      navigate('/leads/my', { state: { createForCustomerId: customer.id } })
                                    }
                                  >
                                    发起新商机
                                  </Button>
                                </div>
              
                                <div className="customer-chain-list">
                                  {businessChains.map((chain) => (
                                    <section key={chain.lead.id} className="customer-chain">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button
                                          className="customer-chain-lead"
                                          onClick={() => navigate(`/leads/${chain.lead.id}`)}
                                        >
                                          <Space size={8} align="center">
                                            <span style={{ fontSize: 'var(--text-sm)', color: 'rgb(var(--primary-6))' }}>
                                              {chain.lead.name}
                                            </span>
                                            <StatusTag meta={resolveStatus(LEAD_STATUS, chain.lead.status, chain.lead.status)} />
                                          </Space>
                                          <IconRight style={{ color: 'var(--color-text-3)' }} />
                                        </button>
                                      </div>
              
                                      <div className="customer-chain-flow">
                                        <span>报价 {chain.quotes.length} 份</span>
                                        <span aria-hidden>→</span>
                                        <span>合同 {chain.contracts.length} 份</span>
                                        <span aria-hidden>→</span>
                                        <span>项目 {chain.projects.length} 个</span>
                                        <span aria-hidden>→</span>
                                        <span style={{ fontWeight: 600 }}>
                                          待收{' '}
                                          <MoneyText
                                            value={chain.contracts.reduce(
                                              (sum, item) =>
                                                sum + Math.max(0, item.current.totalAmount - getReceivedAmount(item)),
                                              0
                                            )}
                                          />
                                        </span>
                                      </div>
              
                                      <div className="customer-chain-links">
                                        {chain.quotes.map((quote) => (
                                          <Button
                                            key={quote.id}
                                            size="mini"
                                            onClick={() => navigate(`/quotation/${quote.id}`)}
                                          >
                                            报价：{quote.quoteNo} · {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                                          </Button>
                                        ))}
                                        {chain.contracts.map((contract) => (
                                          <Button
                                            key={contract.id}
                                            size="mini"
                                            onClick={() => navigate(`/contracts/${contract.id}`)}
                                          >
                                            合同：{contract.contractNo}
                                          </Button>
                                        ))}
                                        {chain.projects.map((project) => (
                                          <Button
                                            key={project.id}
                                            size="mini"
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                          >
                                            项目：{project.name}
                                          </Button>
                                        ))}
                                      </div>
                                    </section>
                                  ))}
              
                                  {directContracts.length > 0 && (
                                    <section className="customer-chain">
                                      <div className="customer-chain-lead">
                                        <span>直接签约主合同（无关联线索）</span>
                                        <StatusTag>{directContracts.length} 份</StatusTag>
                                      </div>
                                      <div className="customer-chain-links">
                                        {directContracts.map((contract) => (
                                          <Button
                                            key={contract.id}
                                            size="mini"
                                            onClick={() => navigate(`/contracts/${contract.id}`)}
                                          >
                                            {contract.contractNo} · {contract.current.contractName}
                                          </Button>
                                        ))}
                                      </div>
                                    </section>
                                  )}
              
                                  {businessChains.length === 0 && directContracts.length === 0 && (
                                    <EmptyState description="暂无关联业务机会或签约记录" />
                                  )}
                                </div>
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'contracts',
                  label: <span>
                                <IconFile /> 合同与回款 ({related.contracts.length})
                              </span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                  }}
                                >
                                  <Text type="secondary">
                                    台账统计：累计合同金额 <MoneyText value={contractAmount} />，已收款 <MoneyText value={received} />，待收敞口 <MoneyText value={outstanding} />。
                                  </Text>
                                </div>
              
                                <DataTable
                                  rowKey="id"
                                  data={related.contracts}
                                  pagination={false}
                                  columns={[
                                    {
                                      title: '合同信息',
                                      render: (_: unknown, record) => (
                                        <div>
                                          <EntityLink
                                            to={`/contracts/${record.id}`}
                                            className="table-primary-link"
                                          >
                                            {record.contractNo}
                                          </EntityLink>
                                          <div className="table-secondary-text">{record.current.contractName}</div>
                                        </div>
                                      ),
                                    },
                                    {
                                      title: '类型',
                                      width: 100,
                                      render: (_: unknown, record) =>
                                        record.kind === 'supplement' ? (
                                          <StatusTag tone="purple">补充合同</StatusTag>
                                        ) : (
                                          <StatusTag tone="info">主合同</StatusTag>
                                        ),
                                    },
                                    {
                                      title: '合同金额',
                                      width: 130,
                                      render: (_: unknown, record) => (
                                        <span style={{ fontWeight: 600 }}><MoneyText value={record.current.totalAmount} /></span>
                                      ),
                                    },
                                    {
                                      title: '回款进度',
                                      width: 180,
                                      render: (_: unknown, record) => {
                                        const amt = record.current.totalAmount;
                                        const rec = getReceivedAmount(record);
                                        const pct = amt > 0 ? Math.min(100, Math.round((rec / amt) * 100)) : 0;
                                        return (
                                          <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 2 }}>
                                              <span><MoneyText value={rec} /></span>
                                              <span>{pct}%</span>
                                            </div>
                                            <ProgressBar percent={pct} size="small" showValue={false} />
                                          </div>
                                        );
                                      },
                                    },
                                    {
                                      title: '合同状态',
                                      width: 100,
                                      dataIndex: 'status',
                                      render: (s: ContractStatus) => (
                                        <StatusTag meta={resolveStatus(CONTRACT_STATUS, s)} />
                                      ),
                                    },
                                    {
                                      title: '签署/到期日',
                                      width: 130,
                                      render: (_: unknown, record) => <DateText value={record.current.endDate || record.createdAt} />,
                                    },
                                    {
                                      title: '操作',
                                      width: 90,
                                      render: (_: unknown, record) => (
                                        <Button
                                          type="text"
                                          size="small"
                                          onClick={() => navigate(`/contracts/${record.id}`)}
                                        >
                                          详情
                                        </Button>
                                      ),
                                    },
                                  ]}
                                />
              
                                {related.contracts.length === 0 && <EmptyState description="暂无签约合同记录" />}
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'projects',
                  label: <span>
                                <IconFolder /> 履约项目 ({related.projects.length})
                              </span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                  }}
                                >
                                  <Text type="secondary">
                                    统计说明：归集属于该客户的合同履约与研发交付项目，点击可穿透进入项目 360 工作台。
                                  </Text>
                                </div>
              
                                {related.projects.length > 0 ? (
                                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    {related.projects.map((proj) => (
                                      <div key={proj.id} className="customer-project-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <div>
                                            <Space size={8} align="center">
                                              <EntityLink to={`/projects/${proj.id}`}>
                                                {proj.name}
                                              </EntityLink>
                                              <StatusTag meta={resolveStatus(PROJECT_STATUS_META, proj.status, proj.status)} />
                                              <StatusTag size="small">编号：{proj.projectNo}</StatusTag>
                                            </Space>
                                            <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                              项目经理：{proj.owner} · 排期：<DateText value={proj.startDate} /> 至 <DateText value={proj.expectedEndDate} />
                                            </div>
                                          </div>
                                          <div style={{ textAlign: 'right', minWidth: 160 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                                              <span>交付进度</span>
                                              <strong style={{ color: 'var(--color-text-1)' }}>{proj.progress}%</strong>
                                            </div>
                                            <ProgressBar percent={proj.progress} size="small" tone="cyan" showValue={false} />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </Space>
                                ) : (
                                  <EmptyState description="该客户当前暂无执行中的交付项目" />
                                )}
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'contacts',
                  label: <span>
                                <IconUser /> 联系人与决策人 ({customer.contacts.length})
                              </span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <div className="customer-section-heading" style={{ marginTop: 0 }}>
                                  <div>
                                    <Text bold style={{ fontSize: 'var(--text-sm)' }}>
                                      决策链与沟通矩阵
                                    </Text>
                                    <Paragraph style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                      主联系人用于新报价和合同的默认快照，历史记录独立保留。
                                    </Paragraph>
                                  </div>
                                  <Button type="primary" size="small" icon={<IconPlus />} onClick={() => openContact()}>
                                    添加联系人
                                  </Button>
                                </div>
              
                                <DataTable
                                  rowKey="id"
                                  columns={contactColumns}
                                  data={customer.contacts}
                                  pagination={false}
                                  scroll={{ x: 750 }}
                                />
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'activity',
                  label: <span>
                                <IconHistory /> 客户全景动态
                              </span>,
                  content: (
                    <>
                              <div style={{ marginTop: 16 }}>
                                <Timeline>
                                  {activityList.map((item) => (
                                    <Timeline.Item
                                      key={`${item.time}-${item.title}`}
                                      label={<DateText value={item.time} mode="datetime" />}
                                    >
                                      <strong>{item.title}</strong>
                                      <div className="customer-detail-secondary">{item.detail}</div>
                                    </Timeline.Item>
                                  ))}
                                </Timeline>
                              </div>
                            
                    </>
                  ),
                },
              ]}
            />
          </SectionCard>
        </SplitLayoutMain>

        {/* 右侧 Aside：工商档案与开票税务伴生 */}
        <SplitLayoutAside>
          <SectionCard bordered={false}>
            <SectionTabs
              activeKey={activeSideTab}
              onChange={setActiveSideTab}
              items={[
                {
                  key: 'profile',
                  label: "企业档案",
                  content: (
                    <>
                              <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 8 }}>
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Title heading={6} style={{ margin: 0 }}>
                                      <Space><IconIdcard /> 工商认证信息</Space>
                                    </Title>
                                    <Button type="text" size="small" onClick={openEdit}>
                                      编辑
                                    </Button>
                                  </div>
                                  <DescriptionsCard
                                    columns={1}
                                    bare
                                    items={[
                                      { key: '企业类型', label: '企业类型', value: customer.kind === 'enterprise' ? '企业客户' : '个人' },
                                      { key: '统一信用码', label: '统一信用码', value: customer.creditCode ?? '—' },
                                      { key: '所属行业', label: '所属行业', value: customer.industry ?? '—' },
                                      { key: '企业规模', label: '企业规模', value: customer.scale ?? '—' },
                                      { key: '客户来源', label: '客户来源', value: customer.source ?? '—' },
                                      { key: '经营地址', label: '经营地址', value: customer.address ?? '—' },
                                    ]}
                                  />
                                </div>
              
                                <div style={{ borderTop: '1px solid var(--color-border-2)', paddingTop: 12 }}>
                                  <Title heading={6} style={{ marginBottom: 8 }}>
                                    <Space><IconSafe /> 业务治理状态</Space>
                                  </Title>
                                  <DescriptionsCard
                                    columns={1}
                                    bare
                                    items={[
                                      { key: '客户等级', label: '客户等级', value: <GradeTag grade={customer.level} /> },
                                      { key: '业务状态', label: '业务状态', value: <StatusTag meta={resolveStatus(CUSTOMER_STATUS, status)} /> },
                                      {
                                        key: '档案状态',
                                        label: '档案状态',
                                        value: <StatusTag tone={customer.active ? 'success' : 'danger'}>{customer.active ? '正常启用' : '已停用'}</StatusTag>,
                                      },
                                      { key: '建档时间', label: '建档时间', value: <DateText value={customer.createdAt} /> },
                                      { key: '最后更新', label: '最后更新', value: <DateText value={customer.updatedAt} /> },
                                      { key: '历史别名', label: '历史别名', value: customer.aliases?.join('、') || '—' },
                                    ]}
                                  />
                                </div>
                              </Space>
                            
                    </>
                  ),
                },
                {
                  key: 'invoice',
                  label: "开票资料",
                  content: (
                    <>
                              <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <Title heading={6} style={{ margin: 0 }}>
                                    <Space><IconFile /> 当前发票资质</Space>
                                  </Title>
                                  <Button type="text" size="small" onClick={openInvoice}>
                                    维护资料
                                  </Button>
                                </div>
                                <DescriptionsCard
                                  columns={1}
                                  bare
                                  items={[
                                    { key: '发票抬头', label: '发票抬头', value: customer.invoiceProfile?.title ?? '未维护' },
                                    { key: '税号识别', label: '税号识别', value: customer.invoiceProfile?.taxNo ?? '—' },
                                    { key: '开户银行', label: '开户银行', value: customer.invoiceProfile?.bankName ?? '—' },
                                    { key: '银行账号', label: '银行账号', value: customer.invoiceProfile?.bankAccount ?? '—' },
                                    {
                                      key: '注册电话',
                                      label: '注册电话',
                                      value: customer.invoiceProfile ? `${customer.invoiceProfile.phone || '—'}` : '—',
                                    },
                                    {
                                      key: '注册地址',
                                      label: '注册地址',
                                      value: customer.invoiceProfile ? `${customer.invoiceProfile.address || '—'}` : '—',
                                    },
                                  ]}
                                />
              
                                {customer.invoiceHistory.length > 0 && (
                                  <div className="customer-invoice-history">
                                    <span>已归档历史版本</span>
                                    <strong>{customer.invoiceHistory.length} 份</strong>
                                  </div>
                                )}
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'finance',
                  label: "经营分析",
                  content: (
                    <>
                              <div style={{ marginTop: 8 }}>
                                <Title heading={6} style={{ marginBottom: 8 }}>
                                  <Space><IconCheck /> 合作价值摘要</Space>
                                </Title>
                                <DescriptionsCard
                                  columns={1}
                                  bare
                                  items={[
                                    { key: '累计签约总额', label: '累计签约总额', value: <span style={{ fontWeight: 700, color: 'rgb(var(--primary-6))' }}><MoneyText value={contractAmount} /></span> },
                                    { key: '累计到账金额', label: '累计到账金额', value: <MoneyText value={received} /> },
                                    { key: '待回款敞口', label: '待回款敞口', value: <MoneyText value={outstanding} tone={outstanding > 0 ? 'danger' : 'success'} /> },
                                    {
                                      key: '平均合同客单',
                                      label: '平均合同客单',
                                      value:
                                        related.contracts.length > 0
                                          ? <MoneyText value={Math.round(contractAmount / related.contracts.length)} />
                                          : '—',
                                    },
                                    { key: '签约合同数', label: '签约合同数', value: `${related.contracts.length} 份` },
                                    { key: '交付项目数', label: '交付项目数', value: `${related.projects.length} 个` },
                                  ]}
                                />
                              </div>
                            
                    </>
                  ),
                },
              ]}
            />
          </SectionCard>
        </SplitLayoutAside>
      </SplitLayout>

      {/* 模态弹窗：编辑客户资料 */}
      <Modal
        title="编辑客户资料"
        visible={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={async () => {
          const values = await editForm.validate();
          updateCustomer(customer.id, values);
          Message.success('客户资料已更新');
          setEditVisible(false);
        }}
        okText="保存资料"
        style={{ width: 680 }}
      >
        <Form form={editForm} layout="vertical">
          <FormGrid columns={2}>
              <Form.Item label="客户名称" field="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="客户等级" field="level">
                <Input />
              </Form.Item>
              <Form.Item label="行业" field="industry">
                <Input />
              </Form.Item>
              <Form.Item label="规模" field="scale">
                <Input />
              </Form.Item>
              <Form.Item label="负责人" field="ownerName">
                <Input />
              </Form.Item>
              <Form.Item label="来源" field="source">
                <Input />
              </Form.Item>
          </FormGrid>
          <FormGrid columns={1}>
              <Form.Item label="地址" field="address">
                <Input />
              </Form.Item>
          </FormGrid>
        </Form>
      </Modal>

      {/* 模态弹窗：编辑/添加联系人 */}
      <Modal
        title={editingContact ? '编辑联系人' : '添加联系人'}
        visible={contactVisible}
        onCancel={() => setContactVisible(false)}
        onOk={async () => {
          const values = await contactForm.validate();
          if (editingContact) updateContact(customer.id, editingContact.id, values);
          else addContact(customer.id, { ...values, active: true, referenced: false });
          Message.success(editingContact ? '联系人已更新' : '联系人已添加');
          setContactVisible(false);
        }}
        okText="保存联系人"
      >
        <Form form={contactForm} layout="vertical">
          <FormGrid columns={2}>
              <Form.Item label="姓名" field="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="职位" field="position">
                <Input />
              </Form.Item>
              <Form.Item label="手机号" field="phone" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="生日（月-日）" field="birthday">
                <Input placeholder="例如：09-18" />
              </Form.Item>
              <Form.Item label="微信" field="wechat">
                <Input />
              </Form.Item>
              <Form.Item label="邮箱" field="email">
                <Input />
              </Form.Item>
          </FormGrid>
          <FormGrid columns={1}>
              <Form.Item label="设为主联系人" field="isPrimary" triggerPropName="checked">
                <Switch />
              </Form.Item>
          </FormGrid>
        </Form>
      </Modal>

      {/* 模态弹窗：维护当前开票资料 */}
      <Modal
        title="维护当前开票资料"
        visible={invoiceVisible}
        onCancel={() => setInvoiceVisible(false)}
        onOk={async () => {
          const values = await invoiceForm.validate();
          updateInvoiceProfile(customer.id, { ...values, updatedAt: new Date().toISOString() });
          Message.success('开票资料已更新；旧资料已写入变更记录');
          setInvoiceVisible(false);
        }}
        okText="保存新资料"
        style={{ width: 680 }}
      >
        <AlertBanner tone="info">
          新资料只用于之后创建的报价和合同，不会覆盖历史快照。
        </AlertBanner>
        <Form form={invoiceForm} layout="vertical">
          <FormGrid columns={1}>
              <Form.Item label="发票抬头" field="title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="纳税人识别号" field="taxNo">
                <Input />
              </Form.Item>
          </FormGrid>
          <FormGrid columns={2}>
              <Form.Item label="开户行" field="bankName">
                <Input />
              </Form.Item>
              <Form.Item label="银行账号" field="bankAccount">
                <Input />
              </Form.Item>
          </FormGrid>
          <FormGrid columns={2}>
              <Form.Item label="注册地址" field="address">
                <Input />
              </Form.Item>
              <Form.Item label="注册电话" field="phone">
                <Input />
              </Form.Item>
          </FormGrid>
        </Form>
      </Modal>
    </PageShell>
  );
}
