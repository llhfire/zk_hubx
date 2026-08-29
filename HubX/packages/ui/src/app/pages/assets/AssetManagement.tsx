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
  Select,
  DatePicker,
  Progress,
  Alert,
  Tooltip,
  Popconfirm,
  Badge,
} from '@arco-design/web-react';
import {
  IconCloud,
  IconLanguage,
  IconLock,
  IconMobile,
  IconFile,
  IconApps,
  IconPlus,
  IconEdit,
  IconDelete,
  IconExclamationCircle,
  IconCalendar,
  IconCopyright,
  IconBulb,
  IconRefresh,
  IconSearch,
} from '@arco-design/web-react/icon';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { filterAssetRecords, hasAssetFilters } from '../supportDomainListModel';
import '../supportDomainLists.css';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const SelectOption = Select.Option;

// ---------- 类型 ----------

type AssetType = 'server' | 'domain' | 'ssl' | 'device' | 'license' | 'software-copyright' | 'patent';
type AssetStatus = 'active' | 'expiring' | 'expired' | 'transferred' | 'returned';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  vendor: string;
  purchaseDate: string;
  expiryDate: string;
  cost: number;
  status: AssetStatus;
  assignee?: string;
  department?: string;
  serialNumber?: string;
  notes?: string;
}

interface InventoryRecord {
  id: string;
  date: string;
  operator: string;
  totalAssets: number;
  checkedAssets: number;
  anomalies: number;
  notes: string;
}

// ---------- 工具 ----------

const ASSET_TYPE_LABELS: Record<AssetType, { label: string; icon: React.ReactNode; color: string }> = {
  server:           { label: '服务器',       icon: <IconCloud size={14} />,     color: 'var(--primary)' },
  domain:           { label: '域名',         icon: <IconLanguage size={14} />,  color: 'var(--success-500)' },
  ssl:              { label: 'SSL 证书',     icon: <IconLock size={14} />,      color: 'var(--chart-5)' },
  device:           { label: '设备',         icon: <IconMobile size={14} />,    color: 'var(--warning-500)' },
  license:          { label: '软件许可证',    icon: <IconFile size={14} />,      color: 'var(--info-500)' },
  'software-copyright': { label: '软件著作权', icon: <IconCopyright size={14} />, color: 'var(--chart-5)' },
  patent:           { label: '专利',         icon: <IconBulb size={14} />,      color: 'var(--warning-300)' },
};

const STATUS_LABELS: Record<AssetStatus, { label: string; color: string }> = {
  active:     { label: '正常使用', color: 'var(--success-500)' },
  expiring:   { label: '即将到期', color: 'var(--warning-500)' },
  expired:    { label: '已到期',   color: 'var(--destructive-500)' },
  transferred: { label: '已转让',   color: 'var(--muted-foreground)' },
  returned:   { label: '已归还',   color: 'var(--primary)' },
};

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date('2026-07-02').getTime()) / (1000 * 60 * 60 * 24));
}

function calcStatus(expiryDate: string, currentStatus?: AssetStatus): AssetStatus {
  if (currentStatus === 'transferred' || currentStatus === 'returned') return currentStatus;
  const days = getDaysUntil(expiryDate);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'active';
}

// ---------- 模拟数据 ----------

const mockAssets: Asset[] = [
  { id: 'ast-1', name: '阿里云 ECS-生产服务器', type: 'server',   vendor: '阿里云',   purchaseDate: '2025-01-15', expiryDate: '2027-01-15', cost: 48000, status: 'active',     serialNumber: 'ECS-2025-001', notes: '主生产环境' },
  { id: 'ast-2', name: '公司官网域名 hubx.cn', type: 'domain',   vendor: '万网',     purchaseDate: '2024-08-01', expiryDate: '2026-08-01', cost: 500,   status: 'expiring',   assignee: '张三', department: '技术部' },
  { id: 'ast-3', name: '通配符SSL证书 *.hubx.cn', type: 'ssl',   vendor: 'DigiCert', purchaseDate: '2025-06-01', expiryDate: '2026-06-01', cost: 3200,  status: 'expired',    notes: '需要续签' },
  { id: 'ast-4', name: 'MacBook Pro M3 16寸', type: 'device',   vendor: 'Apple',    purchaseDate: '2025-09-01', expiryDate: '2028-09-01', cost: 18999, status: 'active',     assignee: '李四', department: '技术部', serialNumber: 'MBP-2025-012' },
  { id: 'ast-5', name: 'Figma 团队版许可证',     type: 'license', vendor: 'Figma',    purchaseDate: '2026-01-01', expiryDate: '2027-01-01', cost: 12000, status: 'active',     assignee: '陈明', department: '技术部' },
  { id: 'ast-6', name: '阿里云 OSS 存储',        type: 'server',   vendor: '阿里云',   purchaseDate: '2025-03-01', expiryDate: '2026-09-15', cost: 12000, status: 'expiring',   notes: '对象存储服务' },
  { id: 'ast-7', name: 'iPhone 16 Pro',         type: 'device',   vendor: 'Apple',    purchaseDate: '2026-03-01', expiryDate: '2029-03-01', cost: 8999,  status: 'active',     assignee: '王五', department: '销售部', serialNumber: 'IP16-003' },
  { id: 'ast-8', name: 'JetBrains 全家桶',      type: 'license', vendor: 'JetBrains', purchaseDate: '2026-02-01', expiryDate: '2027-02-01', cost: 6800,  status: 'active',     assignee: '技术部', department: '技术部' },
  { id: 'ast-9', name: '测试服务器-华为云',       type: 'server',   vendor: '华为云',   purchaseDate: '2025-06-01', expiryDate: '2026-07-20', cost: 24000, status: 'expiring',   notes: '测试环境' },
  { id: 'ast-10', name: '域名 hubx.com',        type: 'domain',  vendor: 'GoDaddy',  purchaseDate: '2024-05-01', expiryDate: '2026-07-15', cost: 800,   status: 'expiring',   assignee: '张三', department: '技术部' },
  { id: 'ast-11', name: 'Dell 显示器 27寸',      type: 'device',  vendor: 'Dell',     purchaseDate: '2024-11-01', expiryDate: '2027-11-01', cost: 3500,  status: 'active',     assignee: '赵六', department: '产品部', serialNumber: 'DELL-MON-005' },
  { id: 'ast-12', name: 'Microsoft 365 商业版', type: 'license', vendor: 'Microsoft', purchaseDate: '2026-04-01', expiryDate: '2027-04-01', cost: 15000, status: 'active',     assignee: '全公司', department: '行政部' },
  { id: 'ast-13', name: 'HubX CRM 系统软件 V1.0', type: 'software-copyright', vendor: '自研', purchaseDate: '2025-08-15', expiryDate: '2075-08-15', cost: 0, status: 'active', serialNumber: '软著登字第2025SR001234号', notes: '公司核心产品软著，永久有效' },
  { id: 'ast-14', name: '智能投放优化算法', type: 'patent', vendor: '自研', purchaseDate: '2025-11-20', expiryDate: '2045-11-20', cost: 25000, status: 'active', serialNumber: 'ZL202510000000.X', notes: '发明专利：基于AI的广告投放优化方法' },
  { id: 'ast-15', name: 'HubX 数据分析平台 V2.0', type: 'software-copyright', vendor: '自研', purchaseDate: '2026-02-01', expiryDate: '2076-02-01', cost: 0, status: 'active', serialNumber: '软著登字第2026SR005678号' },
  { id: 'ast-16', name: '一种分布式任务调度系统', type: 'patent', vendor: '自研', purchaseDate: '2026-04-10', expiryDate: '2046-04-10', cost: 30000, status: 'active', serialNumber: 'ZL202610000000.X', notes: '发明专利，已受理' },
];

const mockInventoryRecords: InventoryRecord[] = [
  { id: 'inv-1', date: '2026-06-15', operator: '张三', totalAssets: 12, checkedAssets: 12, anomalies: 0, notes: '季度盘点，全部正常' },
  { id: 'inv-2', date: '2026-03-15', operator: '李四', totalAssets: 11, checkedAssets: 10, anomalies: 1, notes: '一台显示器无法开机，已报修' },
  { id: 'inv-3', date: '2025-12-15', operator: '张三', totalAssets: 10, checkedAssets: 10, anomalies: 0, notes: '年度盘点' },
];

// ---------- 主组件 ----------

export function AssetManagement() {
  const [activeTab, setActiveTab] = useState('all');
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form] = Form.useForm();
  const [filterType, setFilterType] = useState<AssetType | ''>('');
  const [filterStatus, setFilterStatus] = useState<AssetStatus | ''>('');
  const [keyword, setKeyword] = useState('');

  // 计算状态
  const assetsWithStatus = useMemo(() => {
    return assets.map(a => ({ ...a, status: calcStatus(a.expiryDate, a.status) }));
  }, [assets]);

  const summary = useMemo(() => {
    const total = assetsWithStatus.length;
    const expiring = assetsWithStatus.filter(a => a.status === 'expiring').length;
    const expired = assetsWithStatus.filter(a => a.status === 'expired').length;
    const totalValue = assetsWithStatus.reduce((s, a) => s + a.cost, 0);
    return { total, expiring, expired, active: total - expiring - expired, totalValue };
  }, [assetsWithStatus]);

  const filteredAssets = useMemo(() => filterAssetRecords(assetsWithStatus, {
    keyword,
    type: filterType,
    status: filterStatus,
    activeType: activeTab,
  }), [activeTab, assetsWithStatus, filterStatus, filterType, keyword]);
  const filtersActive = hasAssetFilters({ keyword, type: filterType, status: filterStatus, activeType: activeTab });

  // 按类型分组
  const assetsByType = useMemo(() => {
    const groups: Record<AssetType, Asset[]> = { server: [], domain: [], ssl: [], device: [], license: [], 'software-copyright': [], patent: [] };
    assetsWithStatus.forEach(a => groups[a.type].push(a));
    return groups;
  }, [assetsWithStatus]);

  const handleAdd = () => {
    setEditingAsset(null);
    form.resetFields();
    form.setFieldsValue({ type: 'server', purchaseDate: '2026-07-02' });
    setModalVisible(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    form.setFieldsValue(asset);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = () => {
    form.validate().then(values => {
      if (editingAsset) {
        setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, ...values } : a));
      } else {
        const newAsset: Asset = { id: `ast-${Date.now()}`, ...values, status: 'active' };
        setAssets(prev => [...prev, newAsset]);
      }
      setModalVisible(false);
    });
  };

  const resetFilters = () => {
    setKeyword('');
    setFilterType('');
    setFilterStatus('');
    setActiveTab('all');
  };

  return (
    <PageShell className="support-domain-list asset-management-page">
      <PageHeader
        title="资产管理"
        description="统一管理数字资产、设备、许可证与知识产权，持续跟踪归属和到期风险。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={handleAdd}>新增资产</Button>}
      />

      <ProcessMetricGrid items={[
        { key: 'total', label: '资产总数', value: summary.total, detail: `总值 ¥${summary.totalValue.toLocaleString()}` },
        { key: 'active', label: '正常使用', value: summary.active, detail: '当前有效资产', tone: 'success' },
        { key: 'risk', label: '到期风险', value: summary.expiring + summary.expired, detail: `${summary.expiring} 件临期 · ${summary.expired} 件到期`, tone: summary.expiring + summary.expired ? 'warning' : 'neutral' },
        { key: 'result', label: '当前结果', value: filteredAssets.length, detail: filtersActive ? '筛选结果' : '全部资产' },
      ]} />

      {/* 到期预警 */}
      {(summary.expiring > 0 || summary.expired > 0) && (
        <Alert
          type="warning"
          content={
            <span>
              有 <strong style={{ color: 'var(--destructive-500)' }}>{summary.expired} 件</strong> 资产已到期，
              <strong style={{ color: 'var(--warning-500)' }}>{summary.expiring} 件</strong> 即将在 30 天内到期，请及时处理续费或回收。
            </span>
          }
          icon={<IconExclamationCircle />}
        />
      )}

      {/* 主体 Tab */}
      <Card bordered={false} className="support-domain-list__card">
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="all" title={<span><IconApps /> 全部资产</span>} />
          {Object.entries(ASSET_TYPE_LABELS).map(([key, meta]) => (
            <TabPane key={key} title={<span>{meta.icon} {meta.label} ({assetsByType[key as AssetType].length})</span>} />
          ))}
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 筛选 + 操作 */}
          <FilterBar actions={filtersActive ? <Button type="text" icon={<IconRefresh />} onClick={resetFilters}>重置</Button> : undefined}>
            <Input className="support-domain-list__keyword" value={keyword} onChange={setKeyword} prefix={<IconSearch />} placeholder="搜索资产、供应商、使用人或序列号" allowClear />
            <Select className="support-domain-list__select" placeholder="全部类型" allowClear value={filterType || undefined} onChange={v => setFilterType((v || '') as AssetType | '')}>
              {Object.entries(ASSET_TYPE_LABELS).map(([k, m]) => <SelectOption key={k} value={k}>{m.icon} {m.label}</SelectOption>)}
            </Select>
            <Select className="support-domain-list__select" placeholder="全部状态" allowClear value={filterStatus || undefined} onChange={v => setFilterStatus((v || '') as AssetStatus | '')}>
              {Object.entries(STATUS_LABELS).map(([k, m]) => <SelectOption key={k} value={k}>{m.label}</SelectOption>)}
            </Select>
          </FilterBar>

          <div className="support-domain-list__result-summary"><span>共 {filteredAssets.length} 件资产</span>{filtersActive && <span>已按当前条件筛选</span>}</div>

          {/* 资产表格 */}
          {filteredAssets.length ? <Table
            columns={[
              {
                title: '名称', dataIndex: 'name', width: 180,
                render: (_: unknown, row: Asset) => (
                  <Space>
                    <span style={{ fontSize: 16 }}>{ASSET_TYPE_LABELS[row.type].icon}</span>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                  </Space>
                ),
              },
              {
                title: '类型', dataIndex: 'type', width: 90,
                render: (t: AssetType) => <Tag color={ASSET_TYPE_LABELS[t].color}>{ASSET_TYPE_LABELS[t].label}</Tag>,
              },
              { title: '供应商', dataIndex: 'vendor', width: 100 },
              {
                title: '到期日', dataIndex: 'expiryDate', width: 110,
                render: (v: string, row: Asset) => {
                  const days = getDaysUntil(v);
                  if (days < 0) return <span style={{ color: 'var(--destructive-500)' }}>{v} (已到期)</span>;
                  if (days <= 30) return <span style={{ color: 'var(--warning-500)' }}>{v} ({days}天)</span>;
                  return v;
                },
              },
              {
                title: '状态', dataIndex: 'status', width: 90,
                render: (s: AssetStatus) => <Tag color={STATUS_LABELS[s].color}>{STATUS_LABELS[s].label}</Tag>,
              },
              { title: '使用人', dataIndex: 'assignee', width: 80, render: (v: string) => v || '—' },
              { title: '部门', dataIndex: 'department', width: 80, render: (v: string) => v || '—' },
              { title: '成本', dataIndex: 'cost', width: 90, render: (v: number) => `¥${v.toLocaleString()}` },
              {
                title: '操作', width: 120,
                render: (_: unknown, row: Asset) => (
                  <Space>
                    <Tooltip content="编辑">
                      <Button type="text" size="small" className="hubx-icon-action" aria-label={`编辑资产${row.name}`} icon={<IconEdit />} onClick={() => handleEdit(row)} />
                    </Tooltip>
                    <Tooltip content="删除">
                      <Popconfirm title="确定删除该资产?" onOk={() => handleDelete(row.id)}>
                        <Button type="text" size="small" status="danger" className="hubx-icon-action" aria-label={`删除资产${row.name}`} icon={<IconDelete />} />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                ),
              },
            ] as any}
            data={filteredAssets}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: true }}
            scroll={{ x: 980 }}
          /> : <div className="support-domain-list__empty"><Empty description="没有符合当前条件的资产" /><Button type="text" onClick={resetFilters}>清除筛选</Button></div>}
        </div>
      </Card>

      {/* 盘点记录 */}
      <Card bordered={false} title={<span><IconCalendar /> 盘点记录</span>}>
        <Table
          columns={[
            { title: '盘点日期', dataIndex: 'date', width: 120 },
            { title: '操作人', dataIndex: 'operator', width: 80 },
            { title: '资产总数', dataIndex: 'totalAssets', width: 90, render: (v: number) => `${v}件` },
            { title: '已盘点', dataIndex: 'checkedAssets', width: 90, render: (v: number) => `${v}件` },
            {
              title: '完成率', width: 120,
              render: (_: unknown, row: InventoryRecord) => (
                <Progress percent={Math.round((row.checkedAssets / Math.max(row.totalAssets, 1)) * 100)} size="small" />
              ),
            },
            {
              title: '异常', dataIndex: 'anomalies', width: 70,
              render: (v: number) => v > 0 ? <Tag color="red">{v}项</Tag> : <Tag color="green">无</Tag>,
            },
            { title: '备注', dataIndex: 'notes' },
          ] as any}
          data={mockInventoryRecords}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingAsset ? '编辑资产' : '新增资产'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 560 }}
      >
        <Form form={form} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="资产名称" field="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="如：阿里云ECS服务器" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="资产类型" field="type" rules={[{ required: true }]}>
                <Select placeholder="选择类型">
                  {Object.entries(ASSET_TYPE_LABELS).map(([k, m]) => <SelectOption key={k} value={k}>{m.icon} {m.label}</SelectOption>)}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="供应商" field="vendor" rules={[{ required: true, message: '请输入供应商' }]}>
                <Input placeholder="如：阿里云" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="成本（元）" field="cost" rules={[{ required: true, message: '请输入成本' }]}>
                <Input type="number" placeholder="0" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="购买日期" field="purchaseDate" rules={[{ required: true }]}>
                <DatePicker placeholder="选择日期" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="到期日期" field="expiryDate" rules={[{ required: true }]}>
                <DatePicker placeholder="选择日期" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="使用人" field="assignee">
                <Input placeholder="如：张三" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="所属部门" field="department">
                <Input placeholder="如：技术部" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="序列号" field="serialNumber">
            <Input placeholder="设备序列号（可选）" />
          </FormItem>
          <FormItem label="备注" field="notes">
            <Input.TextArea placeholder="备注信息" autoSize={{ minRows: 2, maxRows: 4 }} />
          </FormItem>
        </Form>
      </Modal>
    </PageShell>
  );
}
