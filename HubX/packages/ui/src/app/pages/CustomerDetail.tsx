import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Message,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from '@arco-design/web-react';
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
} from '@arco-design/web-react/icon';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
  type ProcessMetricItem,
  type ProcessOverviewStep,
} from '../components/ui';
import { useCustomers } from './customers/CustomerContext';
import { deriveCustomerStatus } from './customers/customerModel';
import type { CustomerContact } from './customers/types';
import { useLeads } from '../leads/LeadContext';
import { useQuotation } from './quotation/QuotationContext';
import { QUOTE_STATUS_LABELS } from './quotation/types';
import { useContracts } from './contracts/ContractsContext';
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL } from './contracts/utils';
import type { ContractStatus } from './contracts/types';
import { useProjects } from './project-management/ProjectContext';
import './customers/customerDetail.css';

const TabPane = Tabs.TabPane;
const Row = Grid.Row;
const Col = Grid.Col;
const { Title, Text, Paragraph } = Typography;

const MAIN_TABS = ['chains', 'contracts', 'projects', 'contacts', 'activity'] as const;
const SIDE_TABS = ['profile', 'invoice', 'finance'] as const;

type MainTab = typeof MAIN_TABS[number];
type SideTab = typeof SIDE_TABS[number];

function money(value: number) {
  return `¥${value.toLocaleString('zh-CN')}`;
}

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
    const customerContracts = contracts.filter(
      (contract) =>
        contract.customerId === customer.id ||
        contract.current.customerName === customer.name ||
        leadIds.has(normalizeLeadId(contract.leadId))
    );
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
  }, [contracts, customer, leads, projects, quotes]);

  if (!customer) {
    return (
      <PageShell
        breadcrumbs={[{ label: '客户管理', to: '/customers' }, { label: '客户不存在' }]}
      >
        <Card>
          <Empty description="未找到该客户，可能已被合并或链接已失效">
            <Button onClick={() => navigate('/customers')}>返回客户列表</Button>
          </Empty>
        </Card>
      </PageShell>
    );
  }

  // 核心经营与财务指标计算
  const contractAmount = related.contracts
    .filter((item) => item.status !== 'voided')
    .reduce((sum, item) => sum + item.current.totalAmount, 0);

  const received = related.contracts.reduce(
    (sum, item) =>
      sum +
      (item.receivedAmount ??
        item.collectionRecords?.reduce((inner, record) => inner + record.amount, 0) ??
        0),
    0
  );

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
  const overviewMetrics: ProcessMetricItem[] = [
    {
      key: 'contracts',
      label: (
        <span className="customer-metric-heading">
          <span>签约合同总额</span>
          <strong>{money(contractAmount)}</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <Progress
            percent={collectionRate}
            size="small"
            color="rgb(var(--primary-6))"
            trailColor="var(--color-fill-2)"
            showText={false}
          />
          <div className="customer-metric-detail-row">
            已回款 {money(received)} · 待收敞口 {money(outstanding)} ({collectionRate}%)
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
          <Progress
            percent={avgProjectProgress}
            size="small"
            color="rgb(var(--cyan-6))"
            trailColor="var(--color-fill-2)"
            showText={false}
          />
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
          <Progress
            percent={leadSignRate}
            size="small"
            color="rgb(var(--warning-6))"
            trailColor="var(--color-fill-2)"
            showText={false}
          />
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
            <Tag color="green" size="small">
              {customer.level} 级客户
            </Tag>
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
            {record.isPrimary && <Tag color="green">主联系人</Tag>}
            {!record.active && <Tag>已停用</Tag>}
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
      render: (value?: string) => (value ? <Tag color="arcoblue"><IconCalendar /> {value}</Tag> : '—'),
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
        <Alert
          type="warning"
          content={`该档案已并入客户 ${customer.mergedIntoId}，仅供历史回看。`}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 顶部 ProcessOverview */}
      <ProcessOverview
        identifier={`KH-${customer.id.replace(/\D/g, '').slice(-6) || customer.id}`}
        title={customer.name}
        tags={
          <>
            <Tag color={customer.level === 'S' ? 'green' : 'blue'}>{customer.level} 级客户</Tag>
            <Tag color={status === '合作中' ? 'green' : status === '已合作' ? 'blue' : 'gray'}>
              {status}
            </Tag>
            {!customer.active && <Tag color="red">已停用</Tag>}
            <Tag color="cyan">{customer.kind === 'enterprise' ? '企业客户' : '个人客户'}</Tag>
            <Tag>{customer.industry ?? '未分类行业'}</Tag>
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
          { key: 'profile', title: '客户建档', description: customer.createdAt.slice(0, 10) },
          { key: 'opportunity', title: '机会推进', description: `${related.leads.length} 条业务机会` },
          { key: 'cooperation', title: '签约履约', description: `${related.contracts.length} 份合同` },
          {
            key: 'operation',
            title: '持续经营',
            description: outstanding ? `待收 ${money(outstanding)}` : '当前无待收款',
          },
        ]}
      />

      {/* 顶部 4 大微可视化指标卡 */}
      <ProcessMetricGrid items={overviewMetrics} />

      {/* 主次分流双栏工作区 */}
      <ProcessWorkspace>
        {/* 左侧 Main：业务流转与交付协同 */}
        <ProcessWorkspaceMain>
          <Card className="customer-detail-main" bordered={false}>
            <Tabs activeTab={activeMainTab} onChange={setActiveMainTab}>
              {/* Tab 1: 全链路业务机会 */}
              <TabPane
                key="chains"
                title={
                  <span>
                    <IconBranch /> 业务链路与商机 ({related.leads.length})
                  </span>
                }
              >
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
                              <span style={{ fontSize: 15, color: 'rgb(var(--primary-6))' }}>
                                {chain.lead.name}
                              </span>
                              <Badge
                                status={chain.lead.status === '已签单' ? 'success' : 'processing'}
                                text={chain.lead.status}
                              />
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
                            {money(
                              chain.contracts.reduce(
                                (sum, item) =>
                                  sum + Math.max(0, item.current.totalAmount - (item.receivedAmount ?? 0)),
                                0
                              )
                            )}
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
                          <Tag>{directContracts.length} 份</Tag>
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
                      <Empty description="暂无关联业务机会或签约记录" />
                    )}
                  </div>
                </div>
              </TabPane>

              {/* Tab 2: 合同与回款台账 */}
              <TabPane
                key="contracts"
                title={
                  <span>
                    <IconFile /> 合同与回款 ({related.contracts.length})
                  </span>
                }
              >
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
                      台账统计：累计合同金额 {money(contractAmount)}，已收款 {money(received)}，待收敞口 {money(outstanding)}。
                    </Text>
                  </div>

                  <Table
                    rowKey="id"
                    data={related.contracts}
                    pagination={false}
                    columns={[
                      {
                        title: '合同信息',
                        render: (_: unknown, record) => (
                          <div>
                            <Link
                              to={`/contracts/${record.id}`}
                              className="table-primary-link"
                            >
                              {record.contractNo}
                            </Link>
                            <div className="table-secondary-text">{record.current.contractName}</div>
                          </div>
                        ),
                      },
                      {
                        title: '类型',
                        width: 100,
                        render: (_: unknown, record) =>
                          record.kind === 'supplement' ? (
                            <Tag color="purple">补充合同</Tag>
                          ) : (
                            <Tag color="arcoblue">主合同</Tag>
                          ),
                      },
                      {
                        title: '合同金额',
                        width: 130,
                        render: (_: unknown, record) => (
                          <span style={{ fontWeight: 600 }}>{money(record.current.totalAmount)}</span>
                        ),
                      },
                      {
                        title: '回款进度',
                        width: 180,
                        render: (_: unknown, record) => {
                          const amt = record.current.totalAmount;
                          const rec = record.receivedAmount ?? 0;
                          const pct = amt > 0 ? Math.min(100, Math.round((rec / amt) * 100)) : 0;
                          return (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                                <span>{money(rec)}</span>
                                <span>{pct}%</span>
                              </div>
                              <Progress
                                percent={pct}
                                size="small"
                                color="rgb(var(--primary-6))"
                                trailColor="var(--color-fill-2)"
                                showText={false}
                              />
                            </div>
                          );
                        },
                      },
                      {
                        title: '合同状态',
                        width: 100,
                        dataIndex: 'status',
                        render: (s: ContractStatus) => (
                          <Tag color={CONTRACT_STATUS_COLOR[s] || 'gray'}>
                            {CONTRACT_STATUS_LABEL[s] || s}
                          </Tag>
                        ),
                      },
                      {
                        title: '签署/到期日',
                        width: 130,
                        render: (_: unknown, record) => record.current.endDate || record.createdAt.slice(0, 10),
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

                  {related.contracts.length === 0 && <Empty description="暂无签约合同记录" />}
                </div>
              </TabPane>

              {/* Tab 3: 交付项目与履约进展 */}
              <TabPane
                key="projects"
                title={
                  <span>
                    <IconFolder /> 履约项目 ({related.projects.length})
                  </span>
                }
              >
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
                                <Link
                                  to={`/projects/${proj.id}`}
                                  style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--primary-6))' }}
                                >
                                  {proj.name}
                                </Link>
                                <Tag
                                  color={
                                    proj.status === '进行中'
                                      ? 'arcoblue'
                                      : proj.status === '已完成'
                                      ? 'green'
                                      : 'orange'
                                  }
                                >
                                  {proj.status}
                                </Tag>
                                <Tag size="small">编号：{proj.projectNo}</Tag>
                              </Space>
                              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-3)' }}>
                                项目经理：{proj.owner} · 排期：{proj.startDate || '—'} 至 {proj.expectedEndDate || '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 160 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                <span>交付进度</span>
                                <strong style={{ color: 'var(--color-text-1)' }}>{proj.progress}%</strong>
                              </div>
                              <Progress
                                percent={proj.progress}
                                size="small"
                                color="rgb(var(--cyan-6))"
                                trailColor="var(--color-fill-2)"
                                showText={false}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </Space>
                  ) : (
                    <Empty description="该客户当前暂无执行中的交付项目" />
                  )}
                </div>
              </TabPane>

              {/* Tab 4: 关键联系人矩阵 */}
              <TabPane
                key="contacts"
                title={
                  <span>
                    <IconUser /> 联系人与决策人 ({customer.contacts.length})
                  </span>
                }
              >
                <div style={{ marginTop: 12 }}>
                  <div className="customer-section-heading" style={{ marginTop: 0 }}>
                    <div>
                      <Text bold style={{ fontSize: 14 }}>
                        决策链与沟通矩阵
                      </Text>
                      <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
                        主联系人用于新报价和合同的默认快照，历史记录独立保留。
                      </Paragraph>
                    </div>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => openContact()}>
                      添加联系人
                    </Button>
                  </div>

                  <Table
                    rowKey="id"
                    columns={contactColumns}
                    data={customer.contacts}
                    pagination={false}
                    scroll={{ x: 750 }}
                  />
                </div>
              </TabPane>

              {/* Tab 5: 客户全景动态 */}
              <TabPane
                key="activity"
                title={
                  <span>
                    <IconHistory /> 客户全景动态
                  </span>
                }
              >
                <div style={{ marginTop: 16 }}>
                  <Timeline>
                    {activityList.map((item) => (
                      <Timeline.Item
                        key={`${item.time}-${item.title}`}
                        label={item.time.slice(0, 16).replace('T', ' ')}
                      >
                        <strong>{item.title}</strong>
                        <div className="customer-detail-secondary">{item.detail}</div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceMain>

        {/* 右侧 Aside：工商档案与开票税务伴生 */}
        <ProcessWorkspaceAside>
          <Card bordered={false}>
            <Tabs activeTab={activeSideTab} onChange={setActiveSideTab}>
              {/* Aside Tab 1: 工商基础资料 */}
              <TabPane key="profile" title="企业档案">
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
                    <Descriptions
                      column={1}
                      labelStyle={{ color: 'var(--color-text-2)', width: 90 }}
                      data={[
                        { label: '企业类型', value: customer.kind === 'enterprise' ? '企业客户' : '个人' },
                        { label: '统一信用码', value: customer.creditCode ?? '—' },
                        { label: '所属行业', value: customer.industry ?? '—' },
                        { label: '企业规模', value: customer.scale ?? '—' },
                        { label: '客户来源', value: customer.source ?? '—' },
                        { label: '经营地址', value: customer.address ?? '—' },
                      ]}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border-2)', paddingTop: 12 }}>
                    <Title heading={6} style={{ marginBottom: 8 }}>
                      <Space><IconSafe /> 业务治理状态</Space>
                    </Title>
                    <Descriptions
                      column={1}
                      labelStyle={{ color: 'var(--color-text-2)', width: 90 }}
                      data={[
                        { label: '客户等级', value: <Tag color={customer.level === 'S' ? 'green' : 'blue'}>{customer.level} 级</Tag> },
                        { label: '业务状态', value: status },
                        { label: '档案状态', value: customer.active ? '正常启用' : '已停用' },
                        { label: '建档时间', value: customer.createdAt.slice(0, 10) },
                        { label: '最后更新', value: customer.updatedAt.slice(0, 10) },
                        { label: '历史别名', value: customer.aliases?.join('、') || '—' },
                      ]}
                    />
                  </div>
                </Space>
              </TabPane>

              {/* Aside Tab 2: 开票与税务资料 */}
              <TabPane key="invoice" title="开票资料">
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Title heading={6} style={{ margin: 0 }}>
                      <Space><IconFile /> 当前发票资质</Space>
                    </Title>
                    <Button type="text" size="small" onClick={openInvoice}>
                      维护资料
                    </Button>
                  </div>
                  <Descriptions
                    column={1}
                    labelStyle={{ color: 'var(--color-text-2)', width: 80 }}
                    data={[
                      { label: '发票抬头', value: customer.invoiceProfile?.title ?? '未维护' },
                      { label: '税号识别', value: customer.invoiceProfile?.taxNo ?? '—' },
                      { label: '开户银行', value: customer.invoiceProfile?.bankName ?? '—' },
                      { label: '银行账号', value: customer.invoiceProfile?.bankAccount ?? '—' },
                      {
                        label: '注册电话',
                        value: customer.invoiceProfile ? `${customer.invoiceProfile.phone || '—'}` : '—',
                      },
                      {
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
              </TabPane>

              {/* Aside Tab 3: 客户经营价值分析 */}
              <TabPane key="finance" title="经营分析">
                <div style={{ marginTop: 8 }}>
                  <Title heading={6} style={{ marginBottom: 8 }}>
                    <Space><IconCheck /> 合作价值摘要</Space>
                  </Title>
                  <Descriptions
                    column={1}
                    labelStyle={{ color: 'var(--color-text-2)', width: 90 }}
                    data={[
                      { label: '累计签约总额', value: <span style={{ fontWeight: 700, color: 'rgb(var(--primary-6))' }}>{money(contractAmount)}</span> },
                      { label: '累计到账金额', value: money(received) },
                      { label: '待回款敞口', value: <span style={{ color: outstanding > 0 ? 'var(--warning-500)' : 'var(--success-500)' }}>{money(outstanding)}</span> },
                      {
                        label: '平均合同客单',
                        value:
                          related.contracts.length > 0
                            ? money(Math.round(contractAmount / related.contracts.length))
                            : '—',
                      },
                      { label: '签约合同数', value: `${related.contracts.length} 份` },
                      { label: '交付项目数', value: `${related.projects.length} 个` },
                    ]}
                  />
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

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
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="客户名称" field="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="客户等级" field="level">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="行业" field="industry">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="规模" field="scale">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="负责人" field="ownerName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="来源" field="source">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="地址" field="address">
                <Input />
              </Form.Item>
            </Col>
          </Row>
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="姓名" field="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="职位" field="position">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="手机号" field="phone" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="生日（月-日）" field="birthday">
                <Input placeholder="例如：09-18" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="微信" field="wechat">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="邮箱" field="email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="设为主联系人" field="isPrimary" triggerPropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
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
        <Alert
          type="info"
          content="新资料只用于之后创建的报价和合同，不会覆盖历史快照。"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={invoiceForm} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="发票抬头" field="title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="纳税人识别号" field="taxNo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="开户行" field="bankName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="银行账号" field="bankAccount">
                <Input />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="注册地址" field="address">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="注册电话" field="phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </PageShell>
  );
}
