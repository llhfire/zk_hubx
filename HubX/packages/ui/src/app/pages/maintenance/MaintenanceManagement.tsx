import { useState, useMemo } from 'react';
import {
  Card,
  Empty,
  Grid,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Alert,
  Progress,
  Badge,
} from '@arco-design/web-react';
import {
  IconCalendar,
  IconExclamationCircle,
  IconPlus,
  IconFile,
  IconCustomerService,
  IconRefresh,
  IconSearch,
} from '@arco-design/web-react/icon';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { filterRecordsByKeyword } from '../supportDomainListModel';
import { loadAfterSalesHandoffs } from '../alphaFlowContinuity';
import '../supportDomainLists.css';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const SelectOption = Select.Option;

// ---------- 类型 ----------

type MaintenanceStatus = 'active' | 'expiring' | 'expired' | 'renewed';
type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'assigned' | 'processing' | 'resolved' | 'closed';
type CostRecordStatus = 'pending' | 'confirmed' | 'reimbursed';

interface MaintenanceRecord {
  id: string;
  projectName: string;
  customerName: string;
  contractNo: string;
  deliveryDate: string;
  freeMaintenanceEnd: string;
  status: MaintenanceStatus;
  hasPaidContract: boolean;
  paidContractEnd?: string;
  salesOwner: string;
  notes?: string;
}

interface Ticket {
  id: string;
  title: string;
  customerName: string;
  projectName: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  createdAt: string;
  slaDeadline: string;
  resolvedAt?: string;
  description: string;
}

interface RenewalContract {
  id: string;
  projectName: string;
  customerName: string;
  contractNo: string;
  signDate: string;
  endDate: string;
  amount: number;
  salesOwner: string;
}

interface CostRecord {
  id: string;
  projectName: string;
  customerName: string;
  costType: string;
  amount: number;
  occurredAt: string;
  handler: string;
  status: CostRecordStatus;
  description: string;
}

// ---------- 工具 ----------

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date('2026-07-02').getTime()) / (1000 * 60 * 60 * 24));
}

const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, { label: string; color: string }> = {
  active:   { label: '维护期中', color: 'var(--success-500)' },
  expiring: { label: '即将到期', color: 'var(--warning-500)' },
  expired:  { label: '已到期',   color: 'var(--destructive-500)' },
  renewed:  { label: '已续签',   color: 'var(--primary)' },
};

const TICKET_PRIORITY_LABELS: Record<TicketPriority, { label: string; color: string }> = {
  critical: { label: '紧急', color: 'var(--destructive-500)' },
  high:     { label: '高',   color: 'var(--warning-500)' },
  medium:   { label: '中',   color: 'var(--primary)' },
  low:      { label: '低',   color: 'var(--muted-foreground)' },
};

const TICKET_STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  open:       { label: '待分配', color: 'var(--muted-foreground)' },
  assigned:   { label: '已分配', color: 'var(--primary)' },
  processing: { label: '处理中', color: 'var(--warning-500)' },
  resolved:   { label: '已解决', color: 'var(--success-500)' },
  closed:     { label: '已关闭', color: 'var(--muted-foreground)' },
};

const COST_STATUS_LABELS: Record<CostRecordStatus, { label: string; color: string }> = {
  pending:    { label: '待确认', color: 'var(--warning-500)' },
  confirmed:  { label: '已确认', color: 'var(--primary)' },
  reimbursed: { label: '已报销', color: 'var(--success-500)' },
};

// ---------- 模拟数据 ----------

const mockMaintenance: MaintenanceRecord[] = [
  { id: 'mnt-1', projectName: '企业管理系统开发', customerName: '北京科技有限公司', contractNo: 'HT202601001', deliveryDate: '2026-03-20', freeMaintenanceEnd: '2026-09-20', status: 'active',   hasPaidContract: false, salesOwner: '张三' },
  { id: 'mnt-2', projectName: '云服务平台项目',   customerName: '创新科技有限公司', contractNo: 'HT202601002', deliveryDate: '2026-04-01', freeMaintenanceEnd: '2026-07-15', status: 'expiring', hasPaidContract: false, salesOwner: '张三', notes: '即将到期，需跟进续费' },
  { id: 'mnt-3', projectName: '电商平台小程序',   customerName: '东方电子商务有限公司', contractNo: 'HT202601003', deliveryDate: '2026-02-15', freeMaintenanceEnd: '2026-07-01', status: 'expired',  hasPaidContract: true,  paidContractEnd: '2027-07-01', salesOwner: '李四' },
  { id: 'mnt-4', projectName: '智能制造 MES',    customerName: '华夏制造集团',     contractNo: 'HT202601004', deliveryDate: '2026-01-10', freeMaintenanceEnd: '2026-07-10', status: 'expiring', hasPaidContract: false, salesOwner: '王五', notes: '客户有续签意向' },
  { id: 'mnt-5', projectName: '医疗健康 APP',    customerName: '康健医疗科技',     contractNo: 'HT202601005', deliveryDate: '2026-05-10', freeMaintenanceEnd: '2026-11-10', status: 'active',   hasPaidContract: false, salesOwner: '赵六' },
];

const mockTickets: Ticket[] = [
  { id: 'tk-1', title: '登录页面加载缓慢', customerName: '北京科技有限公司', projectName: '企业管理系统开发', priority: 'high',     status: 'processing', assignee: '李四', createdAt: '2026-07-01 09:30', slaDeadline: '2026-07-01 17:00', description: '用户反馈登录页面加载超过 10 秒' },
  { id: 'tk-2', title: '数据导出功能报错', customerName: '创新科技有限公司', projectName: '云服务平台项目',   priority: 'critical', status: 'assigned',   assignee: '王五', createdAt: '2026-07-02 08:00', slaDeadline: '2026-07-02 12:00', description: '导出 Excel 时报 500 错误' },
  { id: 'tk-3', title: '移动端适配问题',  customerName: '东方电子商务有限公司', projectName: '电商平台小程序', priority: 'medium',  status: 'open',       assignee: '',     createdAt: '2026-07-02 10:15', slaDeadline: '2026-07-04 10:15', description: 'iPhone SE 上页面显示异常' },
  { id: 'tk-4', title: '新增数据报表需求', customerName: '华夏制造集团', projectName: '智能制造 MES', priority: 'low',     status: 'resolved',   assignee: '赵六', createdAt: '2026-06-28 14:00', slaDeadline: '2026-07-05 14:00', resolvedAt: '2026-06-30 16:00', description: '客户希望增加生产统计报表' },
  { id: 'tk-5', title: '系统偶尔卡顿',   customerName: '康健医疗科技', projectName: '医疗健康 APP', priority: 'medium',  status: 'closed',     assignee: '李四', createdAt: '2026-06-25 11:00', slaDeadline: '2026-07-02 11:00', resolvedAt: '2026-06-27 09:00', description: '使用高峰期系统响应慢' },
];

const mockRenewalContracts: RenewalContract[] = [
  { id: 'rc-1', projectName: '电商平台小程序', customerName: '东方电子商务有限公司', contractNo: 'WH-2026-001', signDate: '2026-06-25', endDate: '2027-07-01', amount: 36000, salesOwner: '李四' },
];

const mockCostRecords: CostRecord[] = [
  { id: 'cost-1', projectName: '电商平台小程序', customerName: '东方电子商务有限公司', costType: '服务器续费', amount: 12800, occurredAt: '2026-07-03', handler: '李四', status: 'confirmed', description: '售后运维服务器资源续费' },
  { id: 'cost-2', projectName: '云服务平台项目', customerName: '创新科技有限公司', costType: '现场支持', amount: 2600, occurredAt: '2026-07-01', handler: '王五', status: 'reimbursed', description: '客户现场问题排查交通及住宿' },
  { id: 'cost-3', projectName: '智能制造 MES', customerName: '华夏制造集团', costType: '第三方接口', amount: 4800, occurredAt: '2026-06-28', handler: '赵六', status: 'pending', description: '售后接口调用额度补充' },
];

// ---------- 主组件 ----------

export function MaintenanceManagement() {
  const [activeTab, setActiveTab] = useState('maintenance');
  const [tickets, setTickets] = useState(mockTickets);
  const [costRecords, setCostRecords] = useState(mockCostRecords);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [costModalVisible, setCostModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [costForm] = Form.useForm();
  const [keyword, setKeyword] = useState('');
  const maintenanceRecords = useMemo(() => {
    const imported = loadAfterSalesHandoffs().map<MaintenanceRecord>((handoff) => ({
      id: handoff.id,
      projectName: handoff.projectName,
      customerName: handoff.customerName,
      contractNo: handoff.contractNo,
      deliveryDate: handoff.handedOffAt,
      freeMaintenanceEnd: handoff.maintenanceEnd,
      status: 'active',
      hasPaidContract: false,
      salesOwner: '待指派',
      notes: '由财务结清流程移交，已自动生成六个月维护期',
    }));
    const importedContracts = new Set(imported.map((record) => record.contractNo));
    return [...imported, ...mockMaintenance.filter((record) => !importedContracts.has(record.contractNo))];
  }, []);

  const summary = useMemo(() => {
    const active = maintenanceRecords.filter(m => m.status === 'active').length;
    const expiring = maintenanceRecords.filter(m => m.status === 'expiring').length;
    const expired = maintenanceRecords.filter(m => m.status === 'expired').length;
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'assigned' || t.status === 'processing').length;
    const criticalTickets = tickets.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length;
    return { active, expiring, expired, openTickets, criticalTickets, totalProjects: maintenanceRecords.length };
  }, [maintenanceRecords, tickets]);
  const totalCostAmount = costRecords.reduce((sum, item) => sum + item.amount, 0);
  const filteredMaintenance = useMemo(() => filterRecordsByKeyword(maintenanceRecords, keyword, item => [item.projectName, item.customerName, item.contractNo, item.salesOwner]), [keyword, maintenanceRecords]);
  const filteredTickets = useMemo(() => filterRecordsByKeyword(tickets, keyword, item => [item.title, item.customerName, item.projectName, item.assignee, item.description]), [keyword, tickets]);
  const filteredRenewals = useMemo(() => filterRecordsByKeyword(mockRenewalContracts, keyword, item => [item.projectName, item.customerName, item.contractNo, item.salesOwner]), [keyword]);
  const filteredCosts = useMemo(() => filterRecordsByKeyword(costRecords, keyword, item => [item.projectName, item.customerName, item.costType, item.handler, item.description]), [costRecords, keyword]);
  const currentCount = activeTab === 'maintenance'
    ? filteredMaintenance.length
    : activeTab === 'tickets'
      ? filteredTickets.length
      : activeTab === 'renewal'
        ? filteredRenewals.length
        : filteredCosts.length;
  const filtersActive = Boolean(keyword.trim());

  const handleAddTicket = () => {
    form.resetFields();
    form.setFieldsValue({ priority: 'medium' });
    setTicketModalVisible(true);
  };

  const handleSubmitTicket = () => {
    form.validate().then(values => {
      const newTicket: Ticket = {
        id: `tk-${Date.now()}`,
        ...values,
        status: 'open',
        assignee: values.assignee || '',
        createdAt: '2026-07-02 12:00',
        slaDeadline: values.priority === 'critical' ? '2026-07-02 16:00' : values.priority === 'high' ? '2026-07-03 12:00' : '2026-07-05 12:00',
      };
      setTickets(prev => [newTicket, ...prev]);
      setTicketModalVisible(false);
    });
  };

  const handleAddCostRecord = () => {
    costForm.resetFields();
    costForm.setFieldsValue({ status: 'pending' });
    setCostModalVisible(true);
  };

  const handleSubmitCostRecord = () => {
    costForm.validate().then(values => {
      const project = maintenanceRecords.find(item => item.projectName === values.projectName);
      const newRecord: CostRecord = {
        id: `cost-${Date.now()}`,
        projectName: values.projectName,
        customerName: values.customerName || project?.customerName || '',
        costType: values.costType,
        amount: Number(values.amount || 0),
        occurredAt: values.occurredAt || '',
        handler: values.handler,
        status: values.status || 'pending',
        description: values.description || '',
      };
      setCostRecords(prev => [newRecord, ...prev]);
      setCostModalVisible(false);
    });
  };

  const pageAction = activeTab === 'tickets'
    ? <Button type="primary" icon={<IconPlus />} onClick={handleAddTicket}>新建工单</Button>
    : activeTab === 'costs'
      ? <Button type="primary" icon={<IconPlus />} onClick={handleAddCostRecord}>新增费用</Button>
      : undefined;

  return (
    <PageShell className="support-domain-list maintenance-management-page">
      <PageHeader
        title="售后运维"
        description="集中跟踪维护期、客户工单、续费合同和售后成本，优先处理到期与 SLA 风险。"
        actions={pageAction}
      />

      <ProcessMetricGrid items={[
        { key: 'projects', label: '维护项目', value: summary.totalProjects, detail: `${summary.active} 个维护期中` },
        { key: 'expiry', label: '到期风险', value: summary.expiring + summary.expired, detail: `${summary.expiring} 个临期 · ${summary.expired} 个到期`, tone: summary.expiring + summary.expired ? 'warning' : 'neutral' },
        { key: 'tickets', label: '待处理工单', value: summary.openTickets, detail: `${summary.criticalTickets} 个紧急`, tone: summary.criticalTickets ? 'danger' : 'neutral' },
        { key: 'result', label: '当前结果', value: currentCount, detail: filtersActive ? '关键词筛选结果' : '当前页签记录' },
      ]} />

      {/* 到期预警 */}
      {(summary.expiring > 0 || summary.expired > 0) && (
        <Alert
          type="warning"
          content={
            <span>
              {summary.expiring > 0 && <strong style={{ color: 'var(--warning-500)' }}>{summary.expiring} 个</strong>}
              {summary.expiring > 0 && ' 项目维护期即将到期，请跟进续费。'}
              {summary.expiring > 0 && summary.expired > 0 && ' '}
              {summary.expired > 0 && <strong style={{ color: 'var(--destructive-500)' }}>{summary.expired} 个</strong>}
              {summary.expired > 0 && ' 项目维护期已到期。'}
            </span>
          }
          icon={<IconExclamationCircle />}
        />
      )}

      {/* 主体 Tab */}
      <Card bordered={false} className="support-domain-list__card">
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="maintenance" title={<span><IconCalendar /> 维护期跟踪</span>} />
          <TabPane key="tickets" title={<span><IconCustomerService /> 客户工单 <Badge count={summary.openTickets} color="arcoblue" /></span>} />
          <TabPane key="renewal" title={<span><IconFile /> 续费合同</span>} />
          <TabPane key="costs" title={<span><IconFile /> 费用成本记录</span>} />
        </Tabs>

        <FilterBar actions={filtersActive ? <Button type="text" icon={<IconRefresh />} onClick={() => setKeyword('')}>重置</Button> : undefined}>
          <Input className="support-domain-list__keyword" value={keyword} onChange={setKeyword} prefix={<IconSearch />} placeholder="搜索项目、客户、合同、工单或经办人" allowClear />
        </FilterBar>
        <div className="support-domain-list__result-summary"><span>当前页签共 {currentCount} 条记录</span>{filtersActive && <span>已按关键词筛选</span>}</div>

        <div>
          {currentCount === 0 ? (
            <div className="support-domain-list__empty"><Empty description="当前页签没有符合条件的记录" /><Button type="text" onClick={() => setKeyword('')}>清除筛选</Button></div>
          ) : <>
          {/* 维护期跟踪 Tab */}
          {activeTab === 'maintenance' && (
            <Table
              columns={[
                { title: '项目名称', dataIndex: 'projectName', width: 150, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '客户', dataIndex: 'customerName', width: 130 },
                { title: '合同编号', dataIndex: 'contractNo', width: 130 },
                { title: '交付日期', dataIndex: 'deliveryDate', width: 100 },
                {
                  title: '免费维护截止', dataIndex: 'freeMaintenanceEnd', width: 120,
                  render: (v: string, row: MaintenanceRecord) => {
                    const days = getDaysUntil(v);
                    if (days < 0) return <span style={{ color: 'var(--destructive-500)' }}>{v} (已到期)</span>;
                    if (days <= 30) return <span style={{ color: 'var(--warning-500)' }}>{v} ({days}天)</span>;
                    return v;
                  },
                },
                {
                  title: '状态', dataIndex: 'status', width: 90,
                  render: (s: MaintenanceStatus) => <Tag color={MAINTENANCE_STATUS_LABELS[s].color}>{MAINTENANCE_STATUS_LABELS[s].label}</Tag>,
                },
                {
                  title: '维护进度', width: 120,
                  render: (_: unknown, row: MaintenanceRecord) => {
                    const total = Math.ceil((new Date(row.freeMaintenanceEnd).getTime() - new Date(row.deliveryDate).getTime()) / (1000 * 60 * 60 * 24));
                    const elapsed = total - getDaysUntil(row.freeMaintenanceEnd);
                    return <Progress percent={Math.min(100, Math.round((elapsed / total) * 100))} size="small" />;
                  },
                },
                { title: '付费合同', dataIndex: 'hasPaidContract', width: 80, render: (v: boolean) => v ? <Tag color="var(--success-500)">有</Tag> : <Tag>无</Tag> },
                { title: '销售负责人', dataIndex: 'salesOwner', width: 90 },
              ] as any}
              data={filteredMaintenance}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1040 }}
            />
          )}

          {/* 客户工单 Tab */}
          {activeTab === 'tickets' && (
            <div>
              <Table
                columns={[
                  {
                    title: '优先级', dataIndex: 'priority', width: 70,
                    render: (p: TicketPriority) => <Tag color={TICKET_PRIORITY_LABELS[p].color}>{TICKET_PRIORITY_LABELS[p].label}</Tag>,
                  },
                  { title: '标题', dataIndex: 'title', width: 160, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  { title: '客户', dataIndex: 'customerName', width: 130 },
                  { title: '项目', dataIndex: 'projectName', width: 130 },
                  {
                    title: '状态', dataIndex: 'status', width: 80,
                    render: (s: TicketStatus) => <Tag color={TICKET_STATUS_LABELS[s].color}>{TICKET_STATUS_LABELS[s].label}</Tag>,
                  },
                  { title: '处理人', dataIndex: 'assignee', width: 70, render: (v: string) => v || <span style={{ color: 'var(--color-text-3)' }}>待分配</span> },
                  { title: '创建时间', dataIndex: 'createdAt', width: 130 },
                  {
                    title: 'SLA 截止', dataIndex: 'slaDeadline', width: 130,
                    render: (v: string, row: Ticket) => {
                      if (row.status === 'closed' || row.status === 'resolved') return <span style={{ color: 'var(--color-text-3)' }}>—</span>;
                      const days = getDaysUntil(v);
                      if (days < 0) return <span style={{ color: 'var(--destructive-500)', fontWeight: 600 }}>超时 {Math.abs(days)} 天</span>;
                      if (days === 0) return <span style={{ color: 'var(--warning-500)', fontWeight: 600 }}>今日到期</span>;
                      return v;
                    },
                  },
                ] as any}
                data={filteredTickets}
                rowKey="id"
                pagination={false}
                scroll={{ x: 950 }}
              />
            </div>
          )}

          {/* 续费合同 Tab */}
          {activeTab === 'renewal' && (
            <Table
              columns={[
                { title: '项目', dataIndex: 'projectName', width: 150, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '客户', dataIndex: 'customerName', width: 130 },
                { title: '合同编号', dataIndex: 'contractNo', width: 130 },
                { title: '签订日期', dataIndex: 'signDate', width: 100 },
                { title: '到期日期', dataIndex: 'endDate', width: 100 },
                { title: '合同金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
                { title: '销售负责人', dataIndex: 'salesOwner', width: 90 },
              ] as any}
              data={filteredRenewals}
              rowKey="id"
              pagination={false}
              scroll={{ x: 820 }}
            />
          )}

          {/* 费用成本记录 Tab */}
          {activeTab === 'costs' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Tag color="var(--primary)">记录 {costRecords.length} 条</Tag>
                  <Tag color="var(--warning-500)">总成本 ¥{totalCostAmount.toLocaleString()}</Tag>
                </Space>
              </div>
              <Table
                columns={[
                  { title: '归属项目', dataIndex: 'projectName', width: 150, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  { title: '客户', dataIndex: 'customerName', width: 130 },
                  { title: '费用类型', dataIndex: 'costType', width: 110 },
                  { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
                  { title: '发生日期', dataIndex: 'occurredAt', width: 100 },
                  { title: '经办人', dataIndex: 'handler', width: 80 },
                  {
                    title: '状态', dataIndex: 'status', width: 90,
                    render: (s: CostRecordStatus) => <Tag color={COST_STATUS_LABELS[s].color}>{COST_STATUS_LABELS[s].label}</Tag>,
                  },
                  { title: '费用说明', dataIndex: 'description', width: 220 },
                ] as any}
                data={filteredCosts}
                rowKey="id"
                pagination={false}
                scroll={{ x: 980 }}
              />
            </div>
          )}
          </>}
        </div>
      </Card>

      {/* 新建工单弹窗 */}
      <Modal
        title="新建客户工单"
        visible={ticketModalVisible}
        onOk={handleSubmitTicket}
        onCancel={() => setTicketModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 520 }}
      >
        <Form form={form} layout="vertical">
          <FormItem label="工单标题" field="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="简要描述问题" />
          </FormItem>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="客户" field="customerName" rules={[{ required: true, message: '请输入客户' }]}>
                <Input placeholder="客户名称" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="项目" field="projectName" rules={[{ required: true, message: '请输入项目' }]}>
                <Input placeholder="项目名称" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="优先级" field="priority" rules={[{ required: true }]}>
                <Select placeholder="选择优先级">
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([k, m]) => <SelectOption key={k} value={k}>{m.label}</SelectOption>)}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="处理人" field="assignee">
                <Input placeholder="指定处理人（可选）" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="问题描述" field="description">
            <Input.TextArea placeholder="详细描述问题" autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="新增费用成本记录"
        visible={costModalVisible}
        onOk={handleSubmitCostRecord}
        onCancel={() => setCostModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 620 }}
        maskClosable={false}
      >
        <Form form={costForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="归属项目" field="projectName" rules={[{ required: true, message: '请选择归属项目' }]}>
                <Select
                  placeholder="选择归属项目"
                  onChange={(projectName) => {
                    const project = maintenanceRecords.find(item => item.projectName === projectName);
                    costForm.setFieldsValue({ customerName: project?.customerName || '' });
                  }}
                >
                  {maintenanceRecords.map(item => <SelectOption key={item.id} value={item.projectName}>{item.projectName}</SelectOption>)}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="客户" field="customerName">
                <Input placeholder="选择项目后自动带出" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="费用类型" field="costType" rules={[{ required: true, message: '请输入费用类型' }]}>
                <Input placeholder="如服务器续费、现场支持" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="金额" field="amount" rules={[{ required: true, message: '请输入金额' }]}>
                <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="发生日期" field="occurredAt" rules={[{ required: true, message: '请选择发生日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="经办人" field="handler" rules={[{ required: true, message: '请输入经办人' }]}>
                <Input placeholder="请输入经办人" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="状态" field="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="选择状态">
              {Object.entries(COST_STATUS_LABELS).map(([key, item]) => <SelectOption key={key} value={key}>{item.label}</SelectOption>)}
            </Select>
          </FormItem>
          <FormItem label="费用说明" field="description">
            <Input.TextArea placeholder="请输入费用说明" autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>
    </PageShell>
  );
}
