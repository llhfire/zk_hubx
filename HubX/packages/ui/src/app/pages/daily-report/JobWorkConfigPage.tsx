import { useState } from 'react';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Tree,
  Typography,
} from '@arco-design/web-react';
import {
  IconDelete,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSave,
  IconUp,
  IconDown,
} from '@arco-design/web-react/icon';
import { useJobWorkConfig } from './JobWorkConfigContext';
import {
  DAILY_PROJECT_CATEGORIES,
  DEFAULT_DEPARTMENT_ROUTINES,
  JOB_DEPARTMENTS,
  type DailyProjectCategory,
  type DepartmentRoutineConfig,
  findJobPosition,
} from './jobWorkConfigData';
import { PageShell } from '@/app/components/ui';
import './JobWorkConfigPage.css';

const { Title, Text } = Typography;
const TabPane = Tabs.TabPane;
const JOB_TREE_DATA = JOB_DEPARTMENTS.map(department => ({
  key: `department:${department.id}`,
  title: department.name,
  children: department.positions.map(position => ({
    key: `position:${position.id}`,
    title: position.name,
    isLeaf: true,
  })),
}));
const DEPARTMENT_TREE_KEYS = JOB_DEPARTMENTS.map(department => `department:${department.id}`);
const DAILY_PROJECT_TREE_DATA = DAILY_PROJECT_CATEGORIES.map(category => ({
  key: `daily-project:${category.id}`,
  title: category.name,
  isLeaf: true,
}));
const DEFAULT_ROUTINE_IDS = new Set(DEFAULT_DEPARTMENT_ROUTINES.map(config => config.id));

function createRoutineDraft(category: DailyProjectCategory, sortOrder = 1): DepartmentRoutineConfig {
  return {
    id: '',
    category,
    departmentId: 'company',
    name: '',
    enabled: true,
    sortOrder,
    remark: '',
  };
}

export function JobWorkConfigPage() {
  const {
    addDepartmentRoutine,
    deleteDepartmentRoutine,
    departmentRoutineConfigs,
    getWorkNatures,
    resetPosition,
    updateDepartmentRoutine,
    updateWorkNatures,
  } = useJobWorkConfig();
  const [selectedPositionId, setSelectedPositionId] = useState(JOB_DEPARTMENTS[0].positions[0].id);
  const [selectedProjectCategory, setSelectedProjectCategory] = useState<DailyProjectCategory>('operations');
  const [newWorkNature, setNewWorkNature] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineDraft, setRoutineDraft] = useState<DepartmentRoutineConfig>(() => createRoutineDraft('operations'));

  const selectedTarget = findJobPosition(selectedPositionId) || {
    department: JOB_DEPARTMENTS[0],
    position: JOB_DEPARTMENTS[0].positions[0],
  };
  const { department: selectedDepartment, position: selectedPosition } = selectedTarget;
  const workNatures = getWorkNatures(selectedPosition.id);
  const selectedProjectCategoryName = DAILY_PROJECT_CATEGORIES.find(
    category => category.id === selectedProjectCategory,
  )?.name || '运营';
  const departmentRoutines = departmentRoutineConfigs
    .filter(config => config.category === selectedProjectCategory)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-CN'));

  const selectTreeNode = (selectedKeys: string[]) => {
    const key = selectedKeys[0];
    if (!key) return;

    if (key.startsWith('position:')) {
      setSelectedPositionId(key.slice('position:'.length));
    } else if (key.startsWith('department:')) {
      const departmentId = key.slice('department:'.length);
      const department = JOB_DEPARTMENTS.find(item => item.id === departmentId);
      if (department) setSelectedPositionId(department.positions[0].id);
    }
    setEditingIndex(null);
  };

  const addWorkNature = () => {
    const value = newWorkNature.trim();
    if (!value) {
      Message.warning('请输入工作性质');
      return;
    }
    if (workNatures.includes(value)) {
      Message.warning('该工作性质已存在');
      return;
    }
    updateWorkNatures(selectedPosition.id, [...workNatures, value]);
    setNewWorkNature('');
    Message.success('已新增工作性质');
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(workNatures[index]);
  };

  const saveEditing = () => {
    if (editingIndex === null) return;
    const value = editingValue.trim();
    if (!value) {
      Message.warning('工作性质不能为空');
      return;
    }
    if (workNatures.some((item, index) => item === value && index !== editingIndex)) {
      Message.warning('该工作性质已存在');
      return;
    }
    const nextValues = [...workNatures];
    nextValues[editingIndex] = value;
    updateWorkNatures(selectedPosition.id, nextValues);
    setEditingIndex(null);
    Message.success('已更新工作性质');
  };

  const moveWorkNature = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= workNatures.length) return;
    const nextValues = [...workNatures];
    [nextValues[index], nextValues[targetIndex]] = [nextValues[targetIndex], nextValues[index]];
    updateWorkNatures(selectedPosition.id, nextValues);
    if (editingIndex === index) setEditingIndex(targetIndex);
  };

  const deleteWorkNature = (index: number) => {
    updateWorkNatures(selectedPosition.id, workNatures.filter((_, currentIndex) => currentIndex !== index));
    setEditingIndex(null);
    Message.success('已删除工作性质');
  };

  const restoreDefaults = () => {
    resetPosition(selectedPosition.id);
    setEditingIndex(null);
    Message.success(`已恢复${selectedPosition.name}的默认配置`);
  };

  const openAddRoutine = () => {
    const nextSortOrder = departmentRoutines.reduce(
      (maximum, config) => Math.max(maximum, config.sortOrder),
      0,
    ) + 1;
    setEditingRoutineId(null);
    setRoutineDraft(createRoutineDraft(selectedProjectCategory, nextSortOrder));
    setRoutineModalVisible(true);
  };

  const selectProjectCategory = (selectedKeys: string[]) => {
    const key = selectedKeys[0];
    if (!key?.startsWith('daily-project:')) return;
    setSelectedProjectCategory(key.slice('daily-project:'.length) as DailyProjectCategory);
  };

  const openEditRoutine = (config: DepartmentRoutineConfig) => {
    setEditingRoutineId(config.id);
    setRoutineDraft({ ...config });
    setRoutineModalVisible(true);
  };

  const saveRoutine = () => {
    const name = routineDraft.name.trim();
    if (!name) {
      Message.warning('请输入项目名称');
      return;
    }
    if (departmentRoutines.some(config => config.name === name && config.id !== editingRoutineId)) {
      Message.warning('当前类型已存在同名项目');
      return;
    }

    const nextConfig = {
      ...routineDraft,
      id: editingRoutineId || `daily-project-${selectedProjectCategory}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      category: selectedProjectCategory,
      departmentId: routineDraft.departmentId || 'company',
      name,
      remark: routineDraft.remark.trim(),
    };
    if (editingRoutineId) {
      updateDepartmentRoutine(nextConfig);
    } else {
      addDepartmentRoutine(nextConfig);
    }
    setRoutineModalVisible(false);
    Message.success(editingRoutineId ? '日报项目已更新' : '日报项目已新增');
  };

  const routineColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      render: (name: string, record: DepartmentRoutineConfig) => (
        <div>
          <Text>{name}</Text>
          {record.remark && <div className="job-work-config-routine-remark">{record.remark}</div>}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 96,
      render: (enabled: boolean, record: DepartmentRoutineConfig) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={checked => updateDepartmentRoutine({ ...record, enabled: checked })}
        />
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 72 },
    {
      title: '操作',
      width: 116,
      render: (_: unknown, record: DepartmentRoutineConfig) => (
        <Space size={4}>
          <Tooltip content="编辑">
            <Button type="text" icon={<IconEdit />} onClick={() => openEditRoutine(record)} />
          </Tooltip>
          {DEFAULT_ROUTINE_IDS.has(record.id) ? (
            <Tooltip content="默认项目只能停用">
              <Button type="text" status="danger" icon={<IconDelete />} disabled />
            </Tooltip>
          ) : (
            <Popconfirm
              title={`确认删除“${record.name}”？`}
              onOk={() => {
                deleteDepartmentRoutine(record.id);
                Message.success('日报项目已删除');
              }}
            >
              <Tooltip content="删除">
                <Button type="text" status="danger" icon={<IconDelete />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell breadcrumbs={[{ label: '日报', to: '/dailyreport/list' }, { label: '日报列表', to: '/dailyreport/list' }, { label: '岗位与日常工作配置' }]}>
    <div className="job-work-config-page">
      <div className="job-work-config-header">
      </div>

      <Tabs defaultActiveTab="work-nature" className="job-work-config-tabs">
        <TabPane key="work-nature" title="岗位工作性质">
          <div className="job-work-config-workspace">
        <section className="job-work-config-tree-panel">
          <div className="job-work-config-column-header">
            <span>部门与岗位</span>
          </div>
          <div className="job-work-config-tree">
            <Tree
              blockNode
              showLine
              defaultExpandedKeys={DEPARTMENT_TREE_KEYS}
              selectedKeys={[`position:${selectedPosition.id}`]}
              treeData={JOB_TREE_DATA}
              actionOnClick={['select', 'expand']}
              onSelect={selectTreeNode}
            />
          </div>
        </section>

        <section className="job-work-config-editor">
          <div className="job-work-config-editor-header">
            <div>
              <Space size={8}>
                <Title heading={6} style={{ margin: 0 }}>{selectedPosition.name}</Title>
                <Tag>{selectedDepartment.name}</Tag>
              </Space>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary">工作性质 · {workNatures.length} 项</Text>
              </div>
            </div>
            <Popconfirm
              title={`确认恢复${selectedPosition.name}的默认工作性质？`}
              onOk={restoreDefaults}
            >
              <Button icon={<IconRefresh />}>恢复默认</Button>
            </Popconfirm>
          </div>

          <div className="job-work-config-add-row">
            <Input
              value={newWorkNature}
              onChange={setNewWorkNature}
              onPressEnter={addWorkNature}
              maxLength={20}
              allowClear
              placeholder="输入新的工作性质"
            />
            <Button type="primary" icon={<IconPlus />} onClick={addWorkNature}>新增</Button>
          </div>

          {workNatures.length ? (
            <div className="job-work-config-nature-list">
              {workNatures.map((item, index) => (
                <div className="job-work-config-nature-row" key={`${item}-${index}`}>
                  <span className="job-work-config-index">{String(index + 1).padStart(2, '0')}</span>
                  {editingIndex === index ? (
                    <Input
                      value={editingValue}
                      onChange={setEditingValue}
                      onPressEnter={saveEditing}
                      maxLength={20}
                      autoFocus
                    />
                  ) : (
                    <Text>{item}</Text>
                  )}
                  <div className="job-work-config-actions">
                    {editingIndex === index ? (
                      <>
                        <Tooltip content="保存">
                          <Button type="text" icon={<IconSave />} onClick={saveEditing} />
                        </Tooltip>
                        <Button type="text" onClick={() => setEditingIndex(null)}>取消</Button>
                      </>
                    ) : (
                      <>
                        <Tooltip content="编辑">
                          <Button type="text" icon={<IconEdit />} onClick={() => startEditing(index)} />
                        </Tooltip>
                        <Tooltip content="上移">
                          <Button
                            type="text"
                            icon={<IconUp />}
                            disabled={index === 0}
                            onClick={() => moveWorkNature(index, -1)}
                          />
                        </Tooltip>
                        <Tooltip content="下移">
                          <Button
                            type="text"
                            icon={<IconDown />}
                            disabled={index === workNatures.length - 1}
                            onClick={() => moveWorkNature(index, 1)}
                          />
                        </Tooltip>
                        <Popconfirm title={`确认删除“${item}”？`} onOk={() => deleteWorkNature(index)}>
                          <Tooltip content="删除">
                            <Button type="text" status="danger" icon={<IconDelete />} />
                          </Tooltip>
                        </Popconfirm>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="job-work-config-empty">
              <Empty description="暂无工作性质" />
            </div>
          )}
            </section>
          </div>
        </TabPane>

        <TabPane key="department-routine" title="日报项目配置">
          <div className="job-work-config-workspace">
            <section className="job-work-config-tree-panel">
              <div className="job-work-config-column-header">
                <span>业务类型</span>
              </div>
              <div className="job-work-config-tree">
                <Tree
                  blockNode
                  selectedKeys={[`daily-project:${selectedProjectCategory}`]}
                  treeData={DAILY_PROJECT_TREE_DATA}
                  actionOnClick={['select']}
                  onSelect={selectProjectCategory}
                />
              </div>
            </section>

            <section className="job-work-config-editor">
              <div className="job-work-config-editor-header">
                <div>
                  <Space size={8}>
                    <Title heading={6} style={{ margin: 0 }}>{selectedProjectCategoryName}</Title>
                    <Tag>{departmentRoutines.length} 项项目</Tag>
                  </Space>
                </div>
                <Button type="primary" icon={<IconPlus />} onClick={openAddRoutine}>新增项目</Button>
              </div>

              <div className="job-work-config-routine-list">
                <Table
                  columns={routineColumns}
                  data={departmentRoutines}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  noDataElement={<Empty description={`暂无${selectedProjectCategoryName}项目`} />}
                />
              </div>
            </section>
          </div>
        </TabPane>
      </Tabs>

      <Modal
        title={editingRoutineId ? '编辑日报项目' : '新增日报项目'}
        visible={routineModalVisible}
        onCancel={() => setRoutineModalVisible(false)}
        onOk={saveRoutine}
        okText="保存"
        cancelText="取消"
        style={{ width: 620 }}
      >
        <div className="job-work-config-modal-form">
          <div className="job-work-config-field">
            <div className="job-work-config-field-label">业务类型</div>
            <Input value={selectedProjectCategoryName} disabled />
          </div>

          <div className="job-work-config-field">
            <div className="job-work-config-field-label">项目名称</div>
            <Input
              value={routineDraft.name}
              onChange={name => setRoutineDraft(previous => ({ ...previous, name }))}
              maxLength={30}
              showWordLimit
              placeholder="请输入项目名称"
            />
          </div>

          <div className="job-work-config-field">
            <div className="job-work-config-field-label">启用状态</div>
            <div className="job-work-config-switch-row">
              <Switch
                checked={routineDraft.enabled}
                onChange={enabled => setRoutineDraft(previous => ({ ...previous, enabled }))}
              />
              <Text>{routineDraft.enabled ? '启用' : '停用'}</Text>
            </div>
          </div>

          <div className="job-work-config-field">
            <div className="job-work-config-field-label">排序</div>
            <InputNumber
              min={1}
              precision={0}
              value={routineDraft.sortOrder}
              onChange={sortOrder => setRoutineDraft(previous => ({
                ...previous,
                sortOrder: Math.max(1, Math.trunc(Number(sortOrder) || 1)),
              }))}
              style={{ width: 160 }}
            />
          </div>

          <div className="job-work-config-field job-work-config-field-start">
            <div className="job-work-config-field-label">备注</div>
            <Input.TextArea
              value={routineDraft.remark}
              onChange={remark => setRoutineDraft(previous => ({ ...previous, remark }))}
              maxLength={100}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 5 }}
              placeholder="请输入备注（选填）"
            />
          </div>
        </div>
      </Modal>
    </div>
    </PageShell>
  );
}
