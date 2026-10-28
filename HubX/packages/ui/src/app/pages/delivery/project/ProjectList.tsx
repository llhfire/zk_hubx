import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Input,
  Select,
  Space,
  Tooltip,
  FormGrid,
  Typography,
  Popover,
  Drawer,
  Form,
  DatePicker,
  InputNumber,
  Message,
  Modal,
} from '@/design-system';
import {
  IconSearch,
  IconEye,
  IconEdit,
  IconCalendar,
  IconPlus,
  IconList,
  IconLayout,
  IconFilter,
  UserSwitch,
} from '@/design-system';
import type {
  ProjectListItem,
  ProjectStatus,
  ProjectPriority,
  BusinessLine,
  ProjectQuickFilter,
  KanbanLane,
} from './types';
import {
  PROJECT_STATUS_LIST,
  PROJECT_STATUS_META,
  PROJECT_PRIORITY_LIST,
  PROJECT_PRIORITY_META,
  BUSINESS_LINE_LIST,
  BUSINESS_LINE_META,
  COMPANY_ENTITY_LIST,
  PROJECT_QUICK_FILTER_LABEL,
  KANBAN_LANES,
  type HealthStatus,
} from './types';
import { PROJECT_LIST } from './projectMockData';
import { useProjects } from './ProjectContext';
import { deriveProjectViewMetrics } from './projectViewMetrics';
import { filterProjectsForViewer } from '../../../business-case';
import { CURRENT_LOGIN_USER } from '../../../currentUser';
import {
  calculateHealthStatus,
  getProjectCountdown,
  calculateMetrics,
  applyProjectQuickFilter,
  getProjectQuickFilterCounts,
  getProjectsByKanbanLane,
  searchProjects,
  formatHours,
  formatAmount,
} from './utils';
import {
  CountdownTag,
  DataTable,
  DateText,
  EmptyState,
  EntityLink,
  FilterBar,
  FollowUpIcon,
  GradeTag,
  IdentifierText,
  MetricGrid,
  PageHeader,
  PageShell,
  SectionCard,
  SectionTabs,
  FormSection,
  StatusTag,
  resolveStatus,
  type StatusMeta,
  ProgressBar,
} from '@/design-system';

const { Text } = Typography;

const CUSTOMER_LEVEL_BY_NAME: Record<string, 'S' | 'A' | 'B' | 'C'> = {
  A公司: 'A',
  B公司: 'B',
  D公司: 'B',
  E平台: 'A',
  G公司: 'S',
  H教育: 'B',
};

/** 列表里的健康度只用两种提醒语义，文案比 HEALTH_LABEL 更适合表格列。 */
const HEALTH_TAG_META: Record<Exclude<HealthStatus, 'normal'>, StatusMeta> = {
  danger: { label: '项目预警', tone: 'danger' },
  warning: { label: '需要关注', tone: 'warning' },
};


function shortProjectNo(projectNo: string) {
  return `P${projectNo.slice(-6)}`;
}

export function ProjectList() {
  const navigate = useNavigate();
  const { projects, confirmAssign, updateProject } = useProjects();
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [quickFilter, setQuickFilter] = useState<ProjectQuickFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [lineFilter, setLineFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null);
  const [form] = Form.useForm();
  const [followVisible, setFollowVisible] = useState(false);
  const [followProject, setFollowProject] = useState<ProjectListItem | null>(null);
  const [followForm] = Form.useForm();
  const [assignVisible, setAssignVisible] = useState(false);
  const [assignProject, setAssignProject] = useState<ProjectListItem | null>(null);
  const [assignForm] = Form.useForm();

  const currentUser = CURRENT_LOGIN_USER.name;
  const isAdmin = CURRENT_LOGIN_USER.isAdmin;

  const visibleProjects = useMemo(() => {
    const filtered = filterProjectsForViewer(projects, { isAdmin, viewerName: currentUser });
    return filtered.map((p) => {
      const seed = PROJECT_LIST.find((s) => s.id === p.id);
      if (seed) {
        return {
          ...seed,
          status: p.status,
          owner: p.owner,
          salesUsers: p.salesUsers,
          progress: p.progress,
          latestProgress: p.latestProgress,
          startDate: p.startDate,
          expectedEndDate: p.expectedEndDate,
          name: p.name,
          entity: p.entity,
          priority: p.priority,
          businessLine: p.businessLine,
        };
      }
      return deriveProjectViewMetrics(p);
    });
  }, [projects, isAdmin, currentUser]);

  // 计算指标
  const metrics = useMemo(() => calculateMetrics(visibleProjects), [visibleProjects]);

  // 快捷分栏计数
  const filterCounts = useMemo(() => getProjectQuickFilterCounts(visibleProjects, currentUser), [visibleProjects]);

  // 筛选
  const filteredProjects = useMemo(() => {
    let result = applyProjectQuickFilter(visibleProjects, quickFilter, currentUser);
    if (keyword) result = searchProjects(result, keyword);
    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    if (priorityFilter) result = result.filter((p) => p.priority === priorityFilter);
    if (lineFilter) result = result.filter((p) => p.businessLine === lineFilter);
    if (entityFilter) result = result.filter((p) => p.entity === entityFilter);
    return result;
  }, [visibleProjects, quickFilter, keyword, statusFilter, priorityFilter, lineFilter, entityFilter]);

  // Kanban 数据
  const kanbanData = useMemo(() => getProjectsByKanbanLane(filteredProjects), [filteredProjects]);

  // 编辑项目
  const openEditDrawer = (project: ProjectListItem) => {
    setEditingProject(project);
    form.setFieldsValue(project as any);
    setDrawerVisible(true);
  };

  // 新增跟进
  const openFollowModal = (project: ProjectListItem) => {
    setFollowProject(project);
    followForm.resetFields();
    setFollowVisible(true);
  };

  // 指派 PM
  const openAssignModal = (project: ProjectListItem) => {
    setAssignProject(project);
    assignForm.resetFields();
    setAssignVisible(true);
  };

  const handleAssign = () => {
    if (!assignProject) return;
    assignForm.validate().then(async (values) => {
      try {
        await confirmAssign(assignProject.id, values.productManager);
        Message.success(`已确认并指派 ${values.productManager}`);
        setAssignVisible(false);
      } catch (error) {
        Message.error(error instanceof Error ? error.message : '确认失败');
      }
    });
  };

  const handleFollow = () => {
    if (!followProject) return;
    followForm.validate().then(async (values) => {
      const current = projects.find((p) => p.id === followProject.id);
      if (!current) return;
      await updateProject({
        ...current,
        status: values.status,
        progress: values.progress ?? current.progress,
        latestProgress: values.content || current.latestProgress,
      });
      Message.success('跟进记录已保存，项目状态已同步');
      setFollowVisible(false);
    });
  };

  const handleSaveProject = () => {
    form.validate().then(() => {
      Message.success(editingProject ? '项目已更新' : '项目创建成功');
      setDrawerVisible(false);
      setEditingProject(null);
      form.resetFields();
    });
  };

  // 复合列定义
  const columns = [
    {
      title: '编号',
      dataIndex: 'projectNo',
      width: 96,
      fixed: 'left' as const,
      render: (v: string) => <IdentifierText value={shortProjectNo(v)} title={v} size="sm" />,
    },
    {
      title: '项目名称',
      width: 220,
      fixed: 'left' as const,
      render: (_: unknown, r: ProjectListItem) => (
        <div>
          <EntityLink to={`/projects/${r.id}`}>{r.name}</EntityLink>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <StatusTag meta={resolveStatus(BUSINESS_LINE_META, r.businessLine)} />
            <Text type="secondary">{r.entity}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '负责人',
      width: 100,
      render: (_: unknown, r: ProjectListItem) => (
        r.owner ? <span>{r.owner}</span> : <Text type="secondary">待指派</Text>
      ),
    },
    {
      title: '分级 / 优先级',
      width: 126,
      render: (_: unknown, r: ProjectListItem) => {
        const customerLevel = r.customerName ? CUSTOMER_LEVEL_BY_NAME[r.customerName] : undefined;
        return (
          <Space size={4}>
            {customerLevel
              ? <GradeTag grade={customerLevel} />
              : <StatusTag tone="neutral" size="small">未分级</StatusTag>}
            <StatusTag meta={resolveStatus(PROJECT_PRIORITY_META, r.priority)} />
          </Space>
        );
      },
    },
    {
      title: '状态',
      width: 130,
      render: (_: unknown, r: ProjectListItem) => {
        const health = r.healthStatus;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <StatusTag meta={resolveStatus(PROJECT_STATUS_META, r.status)} />
            {health !== 'normal' && <StatusTag meta={HEALTH_TAG_META[health]} />}
          </div>
        );
      },
    },
    {
      title: '交付进度',
      width: 120,
      render: (_: unknown, r: ProjectListItem) => (
        <ProgressBar percent={r.progress} tone={r.progress >= 80 ? 'success' : 'info'} />
      ),
    },
    {
      title: 'Bug 质量',
      width: 100,
      render: (_: unknown, r: ProjectListItem) => {
        const hasBug = r.bugP0Count > 0 || r.bugP1Count > 0;
        return hasBug
          ? <StatusTag tone="danger">P0:{r.bugP0Count} P1:{r.bugP1Count}</StatusTag>
          : <StatusTag tone="success">无缺陷</StatusTag>;
      },
    },
    {
      title: '工期倒计时',
      width: 150,
      render: (_: unknown, r: ProjectListItem) => {
        const cd = getProjectCountdown(r.startDate, r.expectedEndDate);
        if (!r.expectedEndDate) return <Text type="secondary">-</Text>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
            <CountdownTag days={cd.daysRemaining} warningWithin={7} />
            <Text type="secondary"><DateText value={r.expectedEndDate} /></Text>
          </div>
        );
      },
    },
    {
      title: '累计 / 预计工时',
      width: 132,
      render: (_: unknown, r: ProjectListItem) => {
        const ratio = r.budgetHours > 0 ? r.totalHours / r.budgetHours : 0;
        const totalTone = ratio > 1 ? 'danger' : ratio >= 0.9 ? 'warning' : undefined;
        return (
          <Text>
            <Text bold={ratio >= 0.9} style={totalTone ? { color: `rgb(var(--${totalTone}-6))` } : undefined}>
              {formatHours(r.totalHours)}
            </Text>
            {' / '}{r.budgetHours > 0 ? formatHours(r.budgetHours) : '未设置'}
          </Text>
        );
      },
    },
    {
      title: '最新进展',
      width: 200,
      render: (_: unknown, r: ProjectListItem) => (
        <IdentifierText value={r.latestProgress || '-'} maxWidth={180} size="sm" tone="muted" />
      ),
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, r: ProjectListItem) => (
        <Space size={2}>
          {r.status === '未确认' && (
            <Tooltip content="指派PM">
              <Button type="text" className="hubx-icon-action" aria-label="指派项目经理" icon={<UserSwitch size={18} />} size="small" onClick={() => openAssignModal(r)} />
            </Tooltip>
          )}
          <Tooltip content="查看详情"><Button type="text" className="hubx-icon-action" aria-label="查看项目详情" icon={<IconEye />} size="small" onClick={() => navigate(`/projects/${r.id}`)} /></Tooltip>
          <Tooltip content="添加跟进"><Button type="text" className="hubx-icon-action" aria-label="添加项目跟进" icon={<FollowUpIcon />} size="small" onClick={() => openFollowModal(r)} /></Tooltip>
          <Tooltip content="编辑项目"><Button type="text" className="hubx-icon-action" aria-label="编辑项目" icon={<IconEdit />} size="small" onClick={() => openEditDrawer(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  // 高级筛选
  const advancedFilterContent = (
    <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 4 }}>签约主体</div>
        <Select placeholder="签约主体（全部）" style={{ width: '100%' }} allowClear value={entityFilter || undefined} onChange={setEntityFilter}>
          {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
        </Select>
      </div>
    </div>
  );

  // Kanban 卡片渲染
  const renderKanbanCard = (project: ProjectListItem) => {
    const cd = getProjectCountdown(project.startDate, project.expectedEndDate);
    return (
      <div key={project.id} style={{ padding: 12, marginBottom: 8, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-2)', cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <IdentifierText value={project.projectNo} size="sm" tone="muted" />
          <StatusTag meta={resolveStatus(PROJECT_PRIORITY_META, project.priority)} />
        </div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 8 }}>{project.name}</div>
        <Text type="secondary">
          {project.owner || '待指派'} · {project.businessLine} · {project.entity}
        </Text>
        <div style={{ margin: '8px 0' }}>
          <ProgressBar percent={project.progress} tone={project.progress >= 80 ? 'success' : 'info'} />
        </div>
        {project.expectedEndDate && (
          <CountdownTag days={cd.daysRemaining} warningWithin={7} />
        )}
      </div>
    );
  };

  // 创建项目
  const handleCreateProject = () => {
    form.validate().then(() => {
      Message.success('项目创建成功');
      setDrawerVisible(false);
      form.resetFields();
    });
  };

  // 3. 搜索与筛选控件（表格走 DataTable toolbar，看板直接铺在 FilterBar 里）
  const filterControls = (
    <>
      <Input style={{ width: 280 }} placeholder="搜索编号、名称、客户" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
      <Select placeholder="项目状态（全部）" style={{ width: 150 }} allowClear value={statusFilter || undefined} onChange={setStatusFilter}>
        {PROJECT_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
      </Select>
      <Select placeholder="负责人（全部）" style={{ width: 140 }} allowClear>
        <Select.Option value="李四">李四</Select.Option>
        <Select.Option value="王五">王五</Select.Option>
        <Select.Option value="赵六">赵六</Select.Option>
        <Select.Option value="孙七">孙七</Select.Option>
      </Select>
      <Select placeholder="业务线（全部）" style={{ width: 140 }} allowClear value={lineFilter || undefined} onChange={setLineFilter}>
        {BUSINESS_LINE_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
      </Select>
      <Select placeholder="优先级（全部）" style={{ width: 140 }} allowClear value={priorityFilter || undefined} onChange={setPriorityFilter}>
        {PROJECT_PRIORITY_LIST.map((p) => <Select.Option key={p} value={p}>{p}</Select.Option>)}
      </Select>
      <Popover content={advancedFilterContent} trigger="click">
        <Button icon={<IconFilter />}>高级筛选</Button>
      </Popover>
      {[keyword, statusFilter, priorityFilter, lineFilter, entityFilter].some(Boolean) && (
        <Button type="text" onClick={() => { setKeyword(''); setStatusFilter(''); setPriorityFilter(''); setLineFilter(''); setEntityFilter(''); }}>重置</Button>
      )}
    </>
  );

  // 4. 视图切换
  const viewSwitch = (
    <Space>
      <Button icon={<IconList />} type={viewMode === 'table' ? 'primary' : 'default'} onClick={() => setViewMode('table')}>表格</Button>
      <Button icon={<IconLayout />} type={viewMode === 'kanban' ? 'primary' : 'default'} onClick={() => setViewMode('kanban')}>看板</Button>
    </Space>
  );

  return (
    <PageShell>
      <PageHeader
        title="项目管理"
        description="集中查看项目交付状态、工期风险、累计工时和最新进展。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => setDrawerVisible(true)}>新建项目</Button>}
      />

      <MetricGrid
        items={[
          {
            key: 'active',
            label: '活跃项目',
            value: `${metrics.activeCount} 个`,
            detail: `外包 ${metrics.activeByLine['外包']} · 自研 ${metrics.activeByLine['自研']} · 自运营 ${metrics.activeByLine['自运营']}`,
          },
          {
            key: 'warning',
            label: '健康度预警',
            value: `${metrics.warningCount} 个`,
            detail: '工期延期或缺陷积压',
            tone: metrics.warningCount > 0 ? 'danger' : 'success',
          },
          {
            key: 'assign',
            label: '待确认指派',
            value: `${metrics.pendingConfirmCount} 个`,
            detail: '等待指派项目经理',
            tone: metrics.pendingConfirmCount > 0 ? 'warning' : 'neutral',
          },
          {
            key: 'hours',
            label: '本月工时投入',
            value: `${metrics.monthlyHours}h`,
            detail: '全员有效工时',
          },
        ]}
      />

      {/* 2. 快捷分栏 */}
      <div style={{ marginBottom: 12 }}>
        <SectionTabs
          variant="card"
          activeKey={quickFilter}
          onChange={(v) => setQuickFilter(v as ProjectQuickFilter)}
          items={Object.entries(PROJECT_QUICK_FILTER_LABEL).map(([key, label]) => ({
            key,
            label,
            count: filterCounts[key as ProjectQuickFilter],
          }))}
        />
      </div>

      <SectionCard>
        {/* 3. 双视图 */}
        {viewMode === 'table' ? (
          <DataTable
            columns={columns}
            data={filteredProjects}
            rowKey="id"
            scroll={{ x: 1600 }}
            rowClassName={(r: ProjectListItem) => r.isOverdue ? 'arco-table-row-warning' : ''}
            pagination={{ total: filteredProjects.length, pageSize: 10, showTotal: true, showJumper: true }}
            toolbar={<FilterBar>{filterControls}</FilterBar>}
            actions={viewSwitch}
            emptyDescription="没有符合当前条件的项目"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FilterBar actions={viewSwitch}>{filterControls}</FilterBar>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
            {KANBAN_LANES.filter((l) => l.key !== 'shelved').map((lane) => (
              <div key={lane.key} style={{ minWidth: 260, flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 'var(--radius-sm)' }}>
                  {lane.label} ({kanbanData[lane.key].length})
                </div>
                {kanbanData[lane.key].map(renderKanbanCard)}
                {kanbanData[lane.key].length === 0 && (
                  <EmptyState description="暂无项目" />
                )}
              </div>
            ))}
            {/* 搁置/延迟侧栏 */}
            <div style={{ minWidth: 220, flex: 0.8, borderLeft: '2px dashed var(--color-border-3)', paddingLeft: 16 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-3)' }}>
                搁置/延迟 ({kanbanData.shelved.length})
              </div>
              {kanbanData.shelved.map(renderKanbanCard)}
            </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 新建/编辑项目 Drawer */}
      <Drawer
        title={editingProject ? '编辑项目' : '新建项目'}
        visible={drawerVisible}
        onCancel={() => { setDrawerVisible(false); setEditingProject(null); form.resetFields(); }}
        onOk={handleSaveProject}
        width={760}
        footer={<div style={{ textAlign: 'right' }}><Button onClick={() => { setDrawerVisible(false); setEditingProject(null); form.resetFields(); }} style={{ marginRight: 8 }}>取消</Button><Button type="primary" onClick={handleSaveProject}>{editingProject ? '保存' : '创建'}</Button></div>}
      >
        <Form form={form} layout="vertical">
          {/* 第一步：基础信息与客户 */}
          <FormSection title="基础信息与客户">
            <FormGrid template="2-1-1">
              <Form.Item label="项目名称" field="name" rules={[{ required: true, message: '请输入项目名称' }]}><Input placeholder="请输入项目名称" maxLength={50} showWordLimit /></Form.Item>
              <Form.Item label="业务线" field="businessLine" rules={[{ required: true, message: '请选择业务线' }]}><Select placeholder="请选择">{BUSINESS_LINE_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}</Select></Form.Item>
              <Form.Item label="优先级" field="priority" rules={[{ required: true, message: '请选择优先级' }]}><Select placeholder="请选择">{PROJECT_PRIORITY_LIST.map((p) => <Select.Option key={p} value={p}>{p}</Select.Option>)}</Select></Form.Item>
            </FormGrid>
            <FormGrid columns={2}>
              <Form.Item label="签约主体" field="entity"><Select placeholder="请选择">{COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}</Select></Form.Item>
              <Form.Item label="关联客户" field="customerName"><Input placeholder="请输入客户名称" /></Form.Item>
            </FormGrid>
          </FormSection>

          {/* 第二步：交付周期与预算 */}
          <FormSection title="交付周期与预算">
            <FormGrid columns={3}>
              <Form.Item label="计划开始日期" field="startDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="计划结束日期" field="expectedEndDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="预算总工时(h)" field="budgetHours"><InputNumber min={0} placeholder="0" style={{ width: '100%' }} /></Form.Item>
            </FormGrid>
            <FormGrid columns={2}>
              <Form.Item label="关联合同标的额(¥)" field="contractAmount"><InputNumber min={0} placeholder="0" style={{ width: '100%' }} /></Form.Item>
            </FormGrid>
          </FormSection>

          {/* 第三步：团队组织与负责人 */}
          <FormSection title="团队组织与负责人">
            <FormGrid columns={3}>
              <Form.Item label="项目经理 PM" field="owner" rules={[{ required: true, message: '请选择PM' }]}><Select placeholder="请选择"><Select.Option value="李四">李四</Select.Option><Select.Option value="王五">王五</Select.Option><Select.Option value="赵六">赵六</Select.Option></Select></Form.Item>
              <Form.Item label="商务/销售" field="salesUsers"><Select mode="multiple" placeholder="可选"><Select.Option value="张三">张三</Select.Option><Select.Option value="李四">李四</Select.Option></Select></Form.Item>
              <Form.Item label="产品" field="productUsers"><Select mode="multiple" placeholder="可选"><Select.Option value="李四">李四</Select.Option><Select.Option value="孙七">孙七</Select.Option></Select></Form.Item>
            </FormGrid>
            <FormGrid columns={4}>
              <Form.Item label="UI" field="uiUsers"><Select mode="multiple" placeholder="可选"><Select.Option value="孙七">孙七</Select.Option></Select></Form.Item>
              <Form.Item label="前端" field="frontendUsers"><Select mode="multiple" placeholder="可选"><Select.Option value="王五">王五</Select.Option></Select></Form.Item>
              <Form.Item label="后端" field="backendUsers"><Select mode="multiple" placeholder="可选"><Select.Option value="赵六">赵六</Select.Option></Select></Form.Item>
              <Form.Item label="测试" field="testUsers"><Select mode="multiple" placeholder="可选"><Select.Option value="钱九">钱九</Select.Option></Select></Form.Item>
            </FormGrid>
          </FormSection>

          {/* 第四步：最新进展与初始资料 */}
          <FormSection title="最新进展与初始资料">
            <Form.Item label="交付目标描述" field="remark"><Input.TextArea rows={3} placeholder="请输入交付目标" /></Form.Item>
            <Form.Item label="最新进展" field="latestProgress"><Input.TextArea rows={3} placeholder="请输入最新进展" /></Form.Item>
          </FormSection>
        </Form>
      </Drawer>

      {/* 指派 PM Modal */}
      <Modal
        title="确认并指派产品经理"
        visible={assignVisible}
        onOk={handleAssign}
        onCancel={() => setAssignVisible(false)}
        style={{ width: 480 }}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item label="项目"><Text>{assignProject?.name}</Text></Form.Item>
          <Form.Item label="产品经理" field="productManager" rules={[{ required: true, message: '请指定产品经理' }]}>
            <Select placeholder="请选择产品经理">
              <Select.Option value="李四">李四</Select.Option>
              <Select.Option value="王五">王五</Select.Option>
              <Select.Option value="赵六">赵六</Select.Option>
              <Select.Option value="孙七">孙七</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="备注" field="remark">
            <Input.TextArea placeholder="选填" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增跟进 Modal */}
      <Modal
        title={`新增跟进 - ${followProject?.name || ''}`}
        visible={followVisible}
        onOk={handleFollow}
        onCancel={() => setFollowVisible(false)}
        style={{ width: 620 }}
      >
        <Form form={followForm} layout="vertical">
          <FormGrid columns={2}>
              <Form.Item label="项目状态" field="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select placeholder="请选择">
                  {PROJECT_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                </Select>
              </Form.Item>
              <Form.Item label="进度(%)" field="progress">
                <InputNumber min={0} max={100} placeholder="0-100" style={{ width: '100%' }} />
              </Form.Item>
          </FormGrid>
          <Form.Item label="跟进内容" field="content" rules={[{ required: true, message: '请输入跟进内容' }]}>
            <Input.TextArea placeholder="请记录本次跟进内容" rows={4} maxLength={1000} showWordLimit />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
