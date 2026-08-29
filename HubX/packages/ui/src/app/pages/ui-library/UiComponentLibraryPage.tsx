import {
  Alert,
  Button,
  Card,
  DatePicker,
  Divider,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconDownload,
  IconArrowRight,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@arco-design/web-react/icon';
import { Eye, NotePencil, Trash } from '@phosphor-icons/react';
import {
  FilterBar,
  PageHeader,
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessRecordCard,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '@/app/components/ui';
import './UiComponentLibraryPage.css';

const TabPane = Tabs.TabPane;
const { Text } = Typography;

const foundationRows = [
  { key: 'action', category: '操作', components: 'Button、Dropdown、Tooltip', rule: '直接使用 Arco；主操作每个操作区最多一个。' },
  { key: 'input', category: '录入', components: 'Input、Select、DatePicker、Form', rule: '优先使用受控值；筛选条件放入 FilterBar。' },
  { key: 'display', category: '展示', components: 'Card、Table、Descriptions、Tabs', rule: '卡片承载板块，表格承载批量比较，禁止重复造容器。' },
  { key: 'status', category: '状态', components: 'Tag、Badge、Progress、Alert', rule: '颜色表达语义，不只依赖颜色传递状态。' },
  { key: 'feedback', category: '反馈', components: 'Message、Notification、Modal、Drawer', rule: '短反馈用 Message；复杂任务用 Drawer；避免通知堆叠。' },
];

const moduleRows = [
  { key: 'breadcrumb', component: 'PageBreadcrumb', purpose: '二级及以上页面层级导航', source: 'components/ui/PageBreadcrumb.tsx' },
  { key: 'header', component: 'PageHeader', purpose: '普通列表、配置和看板页头', source: 'components/ui/PageHeader.tsx' },
  { key: 'filter', component: 'FilterBar', purpose: '搜索、筛选与批量动作排列', source: 'components/ui/FilterBar.tsx' },
  { key: 'overview', component: 'ProcessOverview', purpose: '长周期业务对象的身份、操作与流程', source: 'components/ui/ProcessOverview.tsx' },
  { key: 'metrics', component: 'ProcessMetricGrid', purpose: '长流程页面的关键摘要指标', source: 'components/ui/ProcessMetricGrid.tsx' },
  { key: 'record-card', component: 'ProcessRecordCard', purpose: '业务过程区的报价、合同、资料、出差等记录摘要', source: 'components/ui/ProcessRecordCard.tsx' },
  { key: 'workspace', component: 'ProcessWorkspace', purpose: '长流程详情的 70:30 主辅工作区', source: 'components/ui/ProcessWorkspace.tsx' },
  { key: 'shell', component: 'PageShell', purpose: '统一面包屑、页面纵向节奏和内容起点', source: 'components/ui/PageShell.tsx' },
];

const librarySteps = [
  { key: 'intake', title: '需求接入' },
  { key: 'confirm', title: '方案确认' },
  { key: 'execute', title: '执行交付', description: '进行中' },
  { key: 'accept', title: '客户验收' },
  { key: 'close', title: '结项归档' },
];

const matureListRows = [
  { key: 'lead-0826-01', name: '海淀智检中台升级', contact: '秦知遥', stage: '需求调研', level: 'S', priority: '高', nextAt: '08-29 10:30' },
  { key: 'lead-0826-02', name: '松澜供应链移动端', contact: '冯予安', stage: '初步沟通', level: 'A', priority: '中', nextAt: '09-02 14:15' },
  { key: 'lead-0826-03', name: '云栖园区访客系统', contact: '唐屿川', stage: '方案报价', level: 'B', priority: '低', nextAt: '09-05 09:40' },
];

function FoundationComponents() {
  return (
    <div className="ui-library-section-stack">
      <Alert
        type="info"
        showIcon
        content="基础 UI 层以 Arco Design 为唯一来源。除非现有组件无法满足业务和可访问性要求，否则不绘制新的基础控件。"
      />
      <Card title="基础组件目录">
        <Table
          rowKey="key"
          pagination={false}
          data={foundationRows}
          columns={[
            { title: '类别', dataIndex: 'category', width: 100 },
            { title: '组件', dataIndex: 'components', width: 260 },
            { title: '使用规则', dataIndex: 'rule' },
          ]}
        />
      </Card>
      <Card title="操作、状态与录入示例">
        <div className="ui-library-preview">
          <div className="ui-library-preview__label">按钮与状态</div>
          <Space wrap>
            <Button type="primary" icon={<IconPlus />}>主操作</Button>
            <Button icon={<IconDownload />}>次操作</Button>
            <Button type="text" icon={<IconRefresh />}>刷新</Button>
            <Button status="danger">危险操作</Button>
            <Tag color="blue">进行中</Tag>
            <Tag color="green">已完成</Tag>
            <Tag color="orange">待处理</Tag>
            <Tag color="red">有风险</Tag>
          </Space>
        </div>
        <div className="ui-library-preview">
          <div className="ui-library-preview__label">筛选控件</div>
          <Space wrap>
            <Input prefix={<IconSearch />} placeholder="搜索名称或编号" style={{ width: 240 }} />
            <Select placeholder="选择状态" style={{ width: 160 }} options={['全部', '进行中', '已完成']} />
            <DatePicker style={{ width: 180 }} />
            <Space><Switch defaultChecked /><Text>仅看待处理</Text></Space>
          </Space>
        </div>
      </Card>
    </div>
  );
}

function ModuleComponents() {
  return (
    <div className="ui-library-section-stack">
      <Card title="模块组件目录">
        <Table
          rowKey="key"
          pagination={false}
          data={moduleRows}
          columns={[
            { title: '组件', dataIndex: 'component', width: 190 },
            { title: '用途', dataIndex: 'purpose' },
            { title: '代码位置', dataIndex: 'source', render: (value: string) => <span className="ui-library-code-path">{value}</span> },
          ]}
        />
      </Card>
      <Card title="普通页面页头与筛选栏">
        <div className="ui-library-preview">
          <PageHeader
            title="客户管理"
            description="标题、说明和主操作保持固定层级；一级页面不显示面包屑。"
            actions={<Button type="primary" icon={<IconPlus />}>新建客户</Button>}
          />
          <Divider />
          <FilterBar actions={<Button>重置</Button>}>
            <Input prefix={<IconSearch />} placeholder="搜索客户" style={{ width: 240 }} />
            <Select placeholder="客户等级" style={{ width: 140 }} options={['S', 'A', 'B', 'C']} />
          </FilterBar>
        </div>
      </Card>
      <ProcessOverview
        identifier="DEMO-2026-001"
        title="长流程对象名称"
        tags={<><Tag color="blue">执行中</Tag><Tag color="gray">示例模块</Tag></>}
        actions={<><Button type="primary" size="small">登记进展</Button><Button size="small">查看记录</Button></>}
        steps={librarySteps}
        currentStep={2}
      />
      <ProcessMetricGrid
        items={[
          { key: 'owner', label: '负责人', value: '张三' },
          { key: 'customer', label: '客户', value: '示例客户' },
          { key: 'amount', label: '合同额', value: '¥320,000' },
          { key: 'progress', label: '当前进度', value: '65%' },
          { key: 'deadline', label: '剩余工期', value: '18 天', tone: 'warning' },
          { key: 'risk', label: '风险', value: '1 项待处理', tone: 'danger' },
        ]}
      />
      <Card title="业务记录卡片">
        <div className="ui-library-preview">
          <ProcessRecordCard
            leading={<Tag color="arcoblue" size="small">数据流转</Tag>}
            title="客户管理系统实施报价"
            tags={<><Tag color="arcoblue" size="small">v1.0</Tag><Tag color="orange" size="small">待报价</Tag></>}
            actions={<Tooltip content="进入工作台"><span className="hubx-process-record-card__indicator" aria-hidden="true"><IconArrowRight /></span></Tooltip>}
            onClick={() => undefined}
            ariaLabel="进入报价工作台"
            identifier="QT-2026-18"
            summary={<><span>人天 <strong>36.5</strong></span><span>报价 <strong>¥68,000</strong></span><span>2 端 · 7 模块</span></>}
          />
        </div>
      </Card>
      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <Card title="主工作区">承载档案、明细表、任务或交付内容。</Card>
        </ProcessWorkspaceMain>
        <ProcessWorkspaceAside>
          <Card title="业务过程区">承载跟进、审批、回款和版本记录。</Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>
    </div>
  );
}

function PageFrameworks() {
  return (
    <div className="ui-library-section-stack">
      <Card title="列表页框架">
        <ol className="ui-library-flow-list">
          <li>PageHeader</li>
          <li>一级页签</li>
          <li>FilterBar</li>
          <li>Table / List</li>
          <li>分页与批量动作</li>
        </ol>
        <Divider />
        <p className="ui-library-component-note">适用于线索、客户、合同、项目和系统配置列表。业务页面只传入标题、筛选项、列配置和数据。</p>
      </Card>
      <Card title="长流程详情框架">
        <ol className="ui-library-flow-list">
          <li>PageBreadcrumb</li>
          <li>ProcessOverview</li>
          <li>ProcessMetricGrid</li>
          <li>70:30 主辅区</li>
          <li>Tab / 任务板块</li>
        </ol>
        <Divider />
        <p className="ui-library-component-note">适用于持续时间长、多人协作、频繁回访或四阶段以上的对象。线索、项目与合同详情是标准实现。</p>
      </Card>
      <Card title="选用顺序">
        <ol>
          <li>先从 Arco 选择基础 UI。</li>
          <li>再从本页“模块组件”选择可复用板块。</li>
          <li>最后选择列表页或长流程详情框架。</li>
          <li>仅当交互目的确实不同且无法组合时，新增组件并同步补充本页和 `DESIGN.md`。</li>
        </ol>
      </Card>
    </div>
  );
}

function MatureBusinessPatterns() {
  return (
    <div className="ui-library-section-stack">
      <Alert
        type="info"
        showIcon
        content="成熟业务样板用于保留经过多轮校准的页面结构。新列表页优先复制数据组织和交互规则，不复制业务字段。"
      />
      <Card>
        <PageHeader
          title="线索列表样板"
          description="固定操作列、明确筛选提示、状态组合、双层时间表达和图标操作，是客户、合同、报价、项目等列表的基准。"
          actions={<Button type="primary" icon={<IconPlus />}>新建线索</Button>}
        />
        <Divider />
        <FilterBar>
          <Input prefix={<IconSearch />} placeholder="搜索名称、联系人或编号" style={{ width: 260 }} />
          <Select placeholder="当前步骤（全部）" style={{ width: 156 }} options={['未联系', '初步沟通', '需求调研', '方案报价']} />
          <Select placeholder="客户等级（全部）" style={{ width: 156 }} options={['S', 'A', 'B', 'C']} />
        </FilterBar>
        <div className="ui-library-list-pattern">
          <Table
            rowKey="key"
            data={matureListRows}
            scroll={{ x: 980 }}
            pagination={false}
            columns={[
              { title: '线索名称', dataIndex: 'name', width: 240 },
              { title: '联系人', dataIndex: 'contact', width: 120 },
              { title: '当前步骤', dataIndex: 'stage', width: 130, render: (value: string) => <Tag color="arcoblue">{value}</Tag> },
              {
                title: '等级 / 优先级',
                width: 150,
                render: (_: unknown, record: typeof matureListRows[number]) => (
                  <Space size={4}><Tag color={record.level === 'S' ? 'red' : 'blue'}>{record.level}级</Tag><Tag>{record.priority}</Tag></Space>
                ),
              },
              {
                title: '下次跟进',
                dataIndex: 'nextAt',
                width: 140,
                render: (value: string) => <div className="ui-library-time-capsule"><span>待跟进</span><strong>{value}</strong></div>,
              },
              {
                title: '操作',
                width: 116,
                fixed: 'right' as const,
                render: (_: unknown, record: typeof matureListRows[number]) => (
                  <Space size={2}>
                    <Button className="hubx-icon-action" type="text" size="small" aria-label={`查看 ${record.name}`} icon={<Eye size={18} weight="regular" />} />
                    <Button className="hubx-icon-action" type="text" size="small" aria-label={`编辑 ${record.name}`} icon={<NotePencil size={18} weight="regular" />} />
                    <Button className="hubx-icon-action" type="text" size="small" status="danger" aria-label={`删除 ${record.name}`} icon={<Trash size={18} weight="regular" />} />
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

export function UiComponentLibraryPage() {
  return (
    <PageShell className="ui-library-page">
      <PageHeader
        title="UI 组件库"
        description="ZK HubX 页面构建的组件目录、模块样例和框架规范。开发与检查页面时，应先在此确认可复用能力。"
        actions={<Tag color="arcoblue">Arco + HubX Modules</Tag>}
      />
      <Tabs defaultActiveTab="foundation">
        <TabPane key="foundation" title="基础 UI"><FoundationComponents /></TabPane>
        <TabPane key="modules" title="模块组件"><ModuleComponents /></TabPane>
        <TabPane key="frameworks" title="页面框架"><PageFrameworks /></TabPane>
        <TabPane key="patterns" title="业务样板"><MatureBusinessPatterns /></TabPane>
      </Tabs>
    </PageShell>
  );
}
