import { useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconEye, IconPlus } from '@arco-design/web-react/icon';
import type { Project } from './mockData';
import { initialProjectBugs } from './projectQuality';
import { initialProjectTasks } from './projectTasks';
import {
  getProjectFeatureModules,
  getProjectFeatures,
  getProjectFeatureSummary,
  type FeaturePriority,
  type FeatureStatus,
  type ProjectFeature,
  type ProjectFeatureModule,
} from './projectFeatures';

const FormItem = Form.Item;
const { Text } = Typography;
const FEATURE_PRIORITIES: FeaturePriority[] = ['高', '中', '低'];
const FEATURE_STATUSES: FeatureStatus[] = ['待确认', '已确认', '开发中', '待测试', '已上线', '已取消'];
const priorityColor: Record<FeaturePriority, string> = { 高: 'red', 中: 'orange', 低: 'gray' };
const statusColor: Record<FeatureStatus, string> = { 待确认: 'gray', 已确认: 'arcoblue', 开发中: 'purple', 待测试: 'orange', 已上线: 'green', 已取消: 'red' };
type ModuleSummaryStatus = '未开始' | '开发中' | '已完成';
const moduleStatusColor: Record<ModuleSummaryStatus, string> = { 未开始: 'gray', 开发中: 'arcoblue', 已完成: 'green' };

interface FeatureTreeRow {
  id: string;
  type: '模块' | '功能点';
  name: string;
  status: FeatureStatus | ModuleSummaryStatus;
  owner: string;
  priority?: FeaturePriority;
  featureCount?: number;
  module?: ProjectFeatureModule;
  feature?: ProjectFeature;
  children?: FeatureTreeRow[];
}

interface ImportedFeatureRow {
  rowNumber: number;
  moduleName: string;
  moduleDescription: string;
  featureName: string;
  description: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  owner: string;
  version: string;
  acceptanceCriteria: string;
}

const IMPORT_HEADERS = {
  moduleName: '模块名称',
  moduleDescription: '模块说明',
  featureName: '功能点名称',
  description: '功能说明',
  priority: '优先级',
  status: '状态',
  owner: '负责人',
  version: '版本',
  acceptanceCriteria: '验收说明',
} as const;

export function ProjectFeaturePanel({ project }: { project: Project }) {
  const [modules, setModules] = useState<ProjectFeatureModule[]>(() => getProjectFeatureModules(project.id));
  const [features, setFeatures] = useState<ProjectFeature[]>(() => getProjectFeatures(project.id));
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeatureStatus>();
  const [ownerFilter, setOwnerFilter] = useState<string>();
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>(() => modules.map((module) => module.id));
  const [featureEditorVisible, setFeatureEditorVisible] = useState(false);
  const [moduleEditorVisible, setModuleEditorVisible] = useState(false);
  const [detailFeature, setDetailFeature] = useState<ProjectFeature | null>(null);
  const [editingFeature, setEditingFeature] = useState<ProjectFeature | null>(null);
  const [editingModule, setEditingModule] = useState<ProjectFeatureModule | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<ImportedFeatureRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [featureForm] = Form.useForm();
  const [moduleForm] = Form.useForm();
  const importFileRef = useRef<HTMLInputElement>(null);
  const members = Array.from(new Set([project.owner, ...project.assistants, ...project.productUsers, ...project.uiUsers, ...project.frontendUsers, ...project.backendUsers, ...project.opsUsers, ...project.testUsers].filter(Boolean)));
  const projectTasks = initialProjectTasks.filter((task) => task.projectId === project.id);
  const projectBugs = initialProjectBugs.filter((bug) => bug.projectId === project.id);
  const summary = useMemo(() => getProjectFeatureSummary(project, features), [features, project]);
  const filteredFeatures = useMemo(() => features.filter((feature) => {
    const moduleName = modules.find((module) => module.id === feature.moduleId)?.name || '';
    return (!keyword || feature.name.includes(keyword) || moduleName.includes(keyword))
      && (!statusFilter || feature.status === statusFilter)
      && (!ownerFilter || feature.owner === ownerFilter);
  }), [features, keyword, modules, ownerFilter, statusFilter]);

  const openCreateFeature = (moduleId?: string) => {
    featureForm.resetFields();
    featureForm.setFieldsValue({ moduleId: moduleId || modules[0]?.id, priority: '中', status: '待确认', owner: project.owner, taskIds: [], bugIds: [] });
    setEditingFeature(null);
    setFeatureEditorVisible(true);
  };

  const openEditFeature = (feature: ProjectFeature) => {
    featureForm.setFieldsValue(feature);
    setEditingFeature(feature);
    setFeatureEditorVisible(true);
  };

  const saveFeature = () => {
    featureForm.validate().then((values) => {
      const feature: ProjectFeature = {
        id: editingFeature?.id || `feature-${Date.now()}`, projectId: project.id, moduleId: values.moduleId,
        name: values.name.trim(), description: values.description.trim(), priority: values.priority, status: values.status,
        owner: values.owner, version: editingFeature?.version || '', acceptanceCriteria: values.acceptanceCriteria?.trim() || '', taskIds: values.taskIds || [], bugIds: values.bugIds || [],
      };
      setFeatures((current) => editingFeature ? current.map((item) => item.id === feature.id ? feature : item) : [feature, ...current]);
      if (detailFeature?.id === feature.id) setDetailFeature(feature);
      setFeatureEditorVisible(false);
      Message.success(editingFeature ? '功能点已更新' : '功能点已创建');
    });
  };

  const openCreateModule = () => {
    moduleForm.resetFields();
    moduleForm.setFieldsValue({ owner: project.owner, sortOrder: modules.length + 1 });
    setEditingModule(null);
    setModuleEditorVisible(true);
  };

  const openEditModule = (module: ProjectFeatureModule) => {
    moduleForm.setFieldsValue(module);
    setEditingModule(module);
    setModuleEditorVisible(true);
  };

  const saveModule = () => {
    moduleForm.validate().then((values) => {
      const module: ProjectFeatureModule = {
        id: editingModule?.id || `feature-module-${Date.now()}`, projectId: project.id, name: values.name.trim(),
        description: values.description?.trim() || '', owner: values.owner, sortOrder: Number(values.sortOrder),
      };
      setModules((current) => (editingModule ? current.map((item) => item.id === module.id ? module : item) : [...current, module]).sort((a, b) => a.sortOrder - b.sortOrder));
      setModuleEditorVisible(false);
      Message.success(editingModule ? '功能模块已更新' : '功能模块已创建');
    });
  };

  const removeModule = (module: ProjectFeatureModule) => {
    if (features.some((feature) => feature.moduleId === module.id)) {
      Message.warning('该模块下仍有功能点，请先将功能点迁移至其他模块');
      return;
    }
    Modal.confirm({ title: '删除功能模块', content: `确认删除“${module.name}”吗？`, onOk: () => { setModules((current) => current.filter((item) => item.id !== module.id)); Message.success('功能模块已删除'); } });
  };

  const resetImport = () => {
    setImportFileName('');
    setImportRows([]);
    setImportErrors([]);
  };

  const readExcelFile = async (file: File) => {
    setImportLoading(true);
    resetImport();
    setImportFileName(file.name);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()));
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('Excel 中没有可读取的工作表');

      const headerIndexes = new Map<string, number>();
      worksheet.getRow(1).eachCell((cell, columnNumber) => headerIndexes.set(cell.text.trim(), columnNumber));
      const missingHeaders = [IMPORT_HEADERS.moduleName, IMPORT_HEADERS.featureName]
        .filter(header => !headerIndexes.has(header));
      if (missingHeaders.length) throw new Error(`缺少必填列：${missingHeaders.join('、')}`);

      const rows: ImportedFeatureRow[] = [];
      const errors: string[] = [];
      const getText = (rowNumber: number, header: string) => {
        const columnNumber = headerIndexes.get(header);
        return columnNumber ? worksheet.getRow(rowNumber).getCell(columnNumber).text.trim() : '';
      };
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const moduleName = getText(rowNumber, IMPORT_HEADERS.moduleName);
        const featureName = getText(rowNumber, IMPORT_HEADERS.featureName);
        if (!moduleName && !featureName) continue;
        if (!moduleName || !featureName) {
          errors.push(`第 ${rowNumber} 行：模块名称和功能点名称不能为空`);
          continue;
        }
        const priorityText = getText(rowNumber, IMPORT_HEADERS.priority) || '中';
        const statusText = getText(rowNumber, IMPORT_HEADERS.status) || '待确认';
        if (!FEATURE_PRIORITIES.includes(priorityText as FeaturePriority)) {
          errors.push(`第 ${rowNumber} 行：优先级“${priorityText}”无效`);
          continue;
        }
        if (!FEATURE_STATUSES.includes(statusText as FeatureStatus)) {
          errors.push(`第 ${rowNumber} 行：状态“${statusText}”无效`);
          continue;
        }
        rows.push({
          rowNumber,
          moduleName,
          moduleDescription: getText(rowNumber, IMPORT_HEADERS.moduleDescription),
          featureName,
          description: getText(rowNumber, IMPORT_HEADERS.description) || featureName,
          priority: priorityText as FeaturePriority,
          status: statusText as FeatureStatus,
          owner: getText(rowNumber, IMPORT_HEADERS.owner) || project.owner,
          version: getText(rowNumber, IMPORT_HEADERS.version),
          acceptanceCriteria: getText(rowNumber, IMPORT_HEADERS.acceptanceCriteria),
        });
      }
      setImportRows(rows);
      setImportErrors(errors);
      if (!rows.length && !errors.length) setImportErrors(['Excel 中没有可导入的数据']);
    } catch (error) {
      setImportErrors([error instanceof Error ? error.message : 'Excel 解析失败，请检查文件格式']);
    } finally {
      setImportLoading(false);
    }
  };

  const confirmImport = () => {
    if (!importRows.length || importErrors.length) return;
    const nextModules = [...modules];
    const moduleIdByName = new Map(nextModules.map(module => [module.name, module.id]));
    importRows.forEach(row => {
      if (moduleIdByName.has(row.moduleName)) return;
      const id = `feature-module-import-${Date.now()}-${moduleIdByName.size}`;
      moduleIdByName.set(row.moduleName, id);
      nextModules.push({ id, projectId: project.id, name: row.moduleName, description: row.moduleDescription, owner: row.owner, sortOrder: nextModules.length + 1 });
    });
    const existingKeys = new Set(features.map(feature => `${feature.moduleId}::${feature.name}`));
    const nextFeatures = importRows.flatMap((row, index) => {
      const moduleId = moduleIdByName.get(row.moduleName)!;
      const key = `${moduleId}::${row.featureName}`;
      if (existingKeys.has(key)) return [];
      existingKeys.add(key);
      return [{ id: `feature-import-${Date.now()}-${index}`, projectId: project.id, moduleId, name: row.featureName, description: row.description, priority: row.priority, status: row.status, owner: row.owner, version: row.version, acceptanceCriteria: row.acceptanceCriteria, taskIds: [], bugIds: [] } satisfies ProjectFeature];
    });
    setModules(nextModules);
    setFeatures(current => [...nextFeatures, ...current]);
    setExpandedModuleIds(nextModules.map(module => module.id));
    setImportVisible(false);
    resetImport();
    Message.success(`成功导入 ${nextFeatures.length} 个功能点`);
  };

  const getTaskName = (id: string) => projectTasks.find((task) => task.id === id)?.title || id;
  const getBugName = (id: string) => projectBugs.find((bug) => bug.id === id)?.title || id;
  const getModuleName = (id: string) => modules.find((module) => module.id === id)?.name || '-';
  const getModuleSummaryStatus = (moduleFeatures: ProjectFeature[]): ModuleSummaryStatus => {
    if (!moduleFeatures.length || moduleFeatures.every((feature) => feature.status === '待确认' || feature.status === '已确认')) return '未开始';
    if (moduleFeatures.every((feature) => feature.status === '已上线')) return '已完成';
    return '开发中';
  };
  const treeData = useMemo<FeatureTreeRow[]>(() => modules.flatMap((module) => {
    const moduleFeatures = features.filter((feature) => feature.moduleId === module.id);
    const visibleFeatures = filteredFeatures.filter((feature) => feature.moduleId === module.id);
    if ((keyword || statusFilter || ownerFilter) && !visibleFeatures.length) return [];
    return [{
      id: module.id, type: '模块', name: module.name, status: getModuleSummaryStatus(moduleFeatures), owner: module.owner,
      featureCount: moduleFeatures.length, module,
      children: visibleFeatures.map((feature) => ({ id: feature.id, type: '功能点' as const, name: feature.name, status: feature.status, owner: feature.owner, priority: feature.priority, feature })),
    }];
  }), [features, filteredFeatures, keyword, modules, ownerFilter, statusFilter]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="flex items-center justify-between">
        <div><Text style={{ fontSize: 16, fontWeight: 600 }}>功能清单</Text><Text type="secondary" style={{ marginLeft: 8 }}>按功能模块管理项目交付范围，并关联执行任务与缺陷</Text></div>
        <Space>
          <input ref={importFileRef} type="file" accept=".xlsx" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setImportVisible(true); void readExcelFile(file); } event.target.value = ''; }} />
          <Button onClick={() => importFileRef.current?.click()}>Excel 导入</Button>
          <Button onClick={openCreateModule}>新增模块</Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => openCreateFeature()}>新增功能点</Button>
        </Space>
      </div>
      <div className="project-feature-statistics">
        <Card className="project-statistic-card"><Text type="secondary">全部功能</Text><Text className="project-statistic-value">{summary.totalCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">待确认</Text><Text className="project-statistic-value">{summary.pendingCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">开发中</Text><Text className="project-statistic-value">{summary.developingCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">待测试</Text><Text className="project-statistic-value">{summary.testingCount}</Text></Card>
        <Card className="project-statistic-card"><Text type="secondary">已上线</Text><Text className="project-statistic-value">{summary.releasedCount}</Text></Card>
      </div>
      <Card bodyStyle={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input value={keyword} onChange={setKeyword} allowClear placeholder="搜索功能名称或模块" style={{ width: 220 }} />
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="范围状态" style={{ width: 130 }}>{FEATURE_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
          <Select value={ownerFilter} onChange={setOwnerFilter} allowClear placeholder="负责人" style={{ width: 130 }}>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select>
          <Button onClick={() => { setKeyword(''); setStatusFilter(undefined); setOwnerFilter(undefined); }}>重置</Button>
        </Space>
        <div className="project-feature-tree-actions"><Button size="small" onClick={() => setExpandedModuleIds(treeData.map((item) => item.id))}>全部展开</Button><Button size="small" onClick={() => setExpandedModuleIds([])}>全部收起</Button></div>
        <Table
          rowKey="id"
          pagination={false}
          data={treeData}
          expandedRowKeys={expandedModuleIds}
          onExpandedRowsChange={(keys) => setExpandedModuleIds(keys as string[])}
          indentSize={16}
          rowClassName={(record: FeatureTreeRow) => record.type === '模块' ? 'project-feature-module-row' : ''}
          scroll={{ x: 980 }}
          columns={[
            { title: '功能点', dataIndex: 'name', width: 300, render: (value: string, record: FeatureTreeRow) => record.type === '模块' ? <Space size="small"><Text strong>{value}</Text><Text type="secondary">{record.featureCount} 个功能点</Text></Space> : <Button type="text" style={{ padding: 0 }} onClick={() => setDetailFeature(record.feature!)}>{value}</Button> },
            { title: '状态', dataIndex: 'status', width: 110, render: (value: FeatureTreeRow['status'], record: FeatureTreeRow) => <Tag color={record.type === '模块' ? moduleStatusColor[value as ModuleSummaryStatus] : statusColor[value as FeatureStatus]}>{value}</Tag> },
            { title: '负责人', dataIndex: 'owner', width: 110 },
            { title: '优先级', dataIndex: 'priority', width: 90, render: (value: FeaturePriority | undefined) => value ? <Tag color={priorityColor[value]}>{value}</Tag> : '-' },
            { title: '操作', width: 120, render: (_: unknown, record: FeatureTreeRow) => record.type === '模块' ? <Space size="mini"><Tooltip content="编辑模块"><Button type="text" size="mini" aria-label="编辑模块" icon={<IconEdit />} onClick={() => openEditModule(record.module!)} /></Tooltip><Tooltip content="新增功能点"><Button type="text" size="mini" aria-label="新增功能点" icon={<IconPlus />} onClick={() => openCreateFeature(record.id)} /></Tooltip><Tooltip content="删除模块"><Button type="text" size="mini" status="danger" aria-label="删除模块" icon={<IconDelete />} onClick={() => removeModule(record.module!)} /></Tooltip></Space> : <Space size="mini"><Tooltip content="查看功能点"><Button type="text" size="mini" aria-label="查看功能点" icon={<IconEye />} onClick={() => setDetailFeature(record.feature!)} /></Tooltip><Tooltip content="编辑功能点"><Button type="text" size="mini" aria-label="编辑功能点" icon={<IconEdit />} onClick={() => openEditFeature(record.feature!)} /></Tooltip></Space> },
          ]}
        />
      </Card>

      <Modal title="Excel 导入功能清单" visible={importVisible} onOk={confirmImport} onCancel={() => { setImportVisible(false); resetImport(); }} okButtonProps={{ disabled: importLoading || !importRows.length || importErrors.length > 0 }} style={{ width: 860 }} maskClosable={false}>
        <Text type="secondary">支持 .xlsx 文件。必填列：模块名称、功能点名称；可选列：模块说明、功能说明、优先级、状态、负责人、版本、验收说明。</Text>
        {importFileName ? <div style={{ marginTop: 12 }}><Tag color="arcoblue">{importFileName}</Tag></div> : null}
        {importLoading ? <div style={{ padding: 32, textAlign: 'center' }}>正在解析 Excel...</div> : null}
        {importErrors.length ? <div className="project-feature-import-errors">{importErrors.map(error => <div key={error}>{error}</div>)}</div> : null}
        {!importLoading && importRows.length ? <Table rowKey="rowNumber" pagination={false} data={importRows} scroll={{ x: 760, y: 320 }} style={{ marginTop: 16 }} columns={[
          { title: 'Excel 行', dataIndex: 'rowNumber', width: 80 },
          { title: '模块名称', dataIndex: 'moduleName', width: 140 },
          { title: '功能点名称', dataIndex: 'featureName', width: 200 },
          { title: '优先级', dataIndex: 'priority', width: 90 },
          { title: '状态', dataIndex: 'status', width: 100 },
          { title: '负责人', dataIndex: 'owner', width: 100 },
        ]} /> : null}
      </Modal>

      <Modal title={editingFeature ? '编辑功能点' : '新增功能点'} visible={featureEditorVisible} onOk={saveFeature} onCancel={() => setFeatureEditorVisible(false)} style={{ width: 760 }} bodyStyle={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }} maskClosable={false}>
        <Form form={featureForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="所属模块" field="moduleId" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择所属模块">{modules.map((module) => <Select.Option key={module.id} value={module.id}>{module.name}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={16}><FormItem label="功能点名称" field="name" rules={[{ required: true, message: '请输入功能点名称' }]}><Input maxLength={100} placeholder="例如：客户列表筛选" /></FormItem></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={8}><FormItem label="优先级" field="priority" rules={[{ required: true, message: '请选择优先级' }]}><Select>{FEATURE_PRIORITIES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="范围状态" field="status" rules={[{ required: true, message: '请选择范围状态' }]}><Select>{FEATURE_STATUSES.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={8}><FormItem label="负责人" field="owner" rules={[{ required: true, message: '请选择负责人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="功能说明" field="description" rules={[{ required: true, message: '请输入功能说明' }]}><Input.TextArea rows={3} placeholder="说明功能范围与使用场景" /></FormItem>
          <FormItem label="验收说明" field="acceptanceCriteria"><Input.TextArea rows={2} placeholder="可选，说明验收标准或客户确认结论" /></FormItem>
          <FormItem label="关联任务" field="taskIds"><Select multiple placeholder="可选，选择当前项目任务">{projectTasks.map((task) => <Select.Option key={task.id} value={task.id}>{task.title}</Select.Option>)}</Select></FormItem>
          <FormItem label="关联 Bug" field="bugIds"><Select multiple placeholder="可选，选择当前项目 Bug">{projectBugs.map((bug) => <Select.Option key={bug.id} value={bug.id}>{bug.title}</Select.Option>)}</Select></FormItem>
        </Form>
      </Modal>

      <Modal title={editingModule ? '编辑功能模块' : '新增功能模块'} visible={moduleEditorVisible} onOk={saveModule} onCancel={() => setModuleEditorVisible(false)} style={{ width: 560 }} maskClosable={false}>
        <Form form={moduleForm} layout="vertical">
          <FormItem label="模块名称" field="name" rules={[{ required: true, message: '请输入模块名称' }]}><Input maxLength={50} placeholder="例如：客户管理" /></FormItem>
          <FormItem label="模块说明" field="description"><Input.TextArea rows={2} placeholder="可选，说明模块范围" /></FormItem>
          <Grid.Row gutter={16}><Grid.Col span={12}><FormItem label="模块负责人" field="owner" rules={[{ required: true, message: '请选择模块负责人' }]}><Select>{members.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col><Grid.Col span={12}><FormItem label="排序" field="sortOrder" rules={[{ required: true, message: '请输入排序' }]}><Input type="number" min="1" /></FormItem></Grid.Col></Grid.Row>
        </Form>
      </Modal>

      <Drawer title="功能点详情" visible={detailFeature !== null} width={680} onCancel={() => setDetailFeature(null)} footer={null}>
        {detailFeature && <div className="project-feature-detail">
          <div className="project-feature-detail-summary"><Text className="project-feature-detail-title">{detailFeature.name}</Text><Space size="small" style={{ marginTop: 8 }}><Tag>{getModuleName(detailFeature.moduleId)}</Tag><Tag color={priorityColor[detailFeature.priority]}>{detailFeature.priority}</Tag><Tag color={statusColor[detailFeature.status]}>{detailFeature.status}</Tag></Space></div>
          <section className="project-feature-detail-section"><Text className="project-feature-detail-section-title">基础信息</Text><Descriptions column={2} data={[{ label: '所属模块', value: getModuleName(detailFeature.moduleId) }, { label: '负责人', value: detailFeature.owner }, { label: '所属版本', value: detailFeature.version }]} /></section>
          <section className="project-feature-detail-section"><Text className="project-feature-detail-section-title">功能说明</Text><div className="project-feature-detail-text">{detailFeature.description}</div></section>
          <section className="project-feature-detail-section"><Text className="project-feature-detail-section-title">验收说明</Text><div className="project-feature-detail-text">{detailFeature.acceptanceCriteria || '-'}</div></section>
          <section className="project-feature-detail-section"><Text className="project-feature-detail-section-title">关联任务</Text><Space wrap>{detailFeature.taskIds.length ? detailFeature.taskIds.map((id) => <Tag key={id} color="arcoblue">{getTaskName(id)}</Tag>) : <Text type="secondary">暂未关联任务</Text>}</Space></section>
          <section className="project-feature-detail-section"><Text className="project-feature-detail-section-title">关联 Bug</Text><Space wrap>{detailFeature.bugIds.length ? detailFeature.bugIds.map((id) => <Tag key={id} color="orange">{getBugName(id)}</Tag>) : <Text type="secondary">暂未关联 Bug</Text>}</Space></section>
        </div>}
      </Drawer>
    </Space>
  );
}
