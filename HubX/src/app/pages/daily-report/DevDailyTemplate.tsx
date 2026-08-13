import {
  Select,
  Input,
  InputNumber,
  Button,
  Space,
  Card,
  Tag,
  Table,
} from '@arco-design/web-react';
import { IconPlus, IconDelete } from '@arco-design/web-react/icon';
import { DevReportContent, ProjectTask, WorkKind, WORK_KIND_LABELS, WORK_KIND_ABILITY_MAP } from './types';
import { WorkAttributionSelector } from './WorkAttributionSelector';

const SelectOption = Select.Option;

interface Props {
  content: DevReportContent;
  department?: string;
  onChange: (content: DevReportContent) => void;
  omitFollowUpFields?: boolean;
  unrestrictedHours?: boolean;
}

const ALL_WORK_KINDS = Object.keys(WORK_KIND_LABELS) as WorkKind[];

export function DevDailyTemplate({ content, department, onChange, omitFollowUpFields = false, unrestrictedHours = false }: Props) {
  const tasks: ProjectTask[] = content['project-tasks'] || [];

  const updateField = (field: keyof DevReportContent, value: any) => {
    onChange({ ...content, [field]: value });
  };

  const updateTasks = (newTasks: ProjectTask[]) => {
    updateField('project-tasks', newTasks);
  };

  const addTask = () => {
    const newTask: ProjectTask = {
      id: `task-${Date.now()}`,
      projectName: '',
      workKind: 'dev-coding',
      workAttributionCategory: 'development',
      workAttributionType: 'external-project',
      description: '',
      hours: 0,
    };
    updateTasks([...tasks, newTask]);
  };

  const removeTask = (id: string) => {
    updateTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof ProjectTask, value: any) => {
    updateTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const totalHours = tasks.reduce((s, t) => s + (t.hours || 0), 0);

  const taskColumns = [
    {
      title: '工作归属', dataIndex: 'projectName', width: 300,
      render: (_: unknown, record: ProjectTask) => (
        <WorkAttributionSelector
          size="small"
          department={department}
          value={{
            category: record.workAttributionCategory,
            type: record.workAttributionType || 'external-project',
            relationId: record.relationId,
            relationName: record.relationName || record.projectName,
          }}
          onChange={value => updateTasks(tasks.map(task => (
            task.id === record.id
              ? {
                  ...task,
                  workAttributionCategory: value.category,
                  workAttributionType: value.type,
                  relationId: value.relationId,
                  relationName: value.relationName,
                  projectName: value.relationName || '',
                }
              : task
          )))}
        />
      ),
    },
    {
      title: '工种', dataIndex: 'workKind', width: 140,
      render: (_: unknown, record: ProjectTask) => (
        <Select
          value={record.workKind}
          onChange={v => updateTask(record.id, 'workKind', v as WorkKind)}
          size="small"
          style={{ width: '100%' }}
        >
          {ALL_WORK_KINDS.map(k => (
            <SelectOption key={k} value={k}>{WORK_KIND_LABELS[k]}</SelectOption>
          ))}
        </Select>
      ),
    },
    {
      title: '工作描述', dataIndex: 'description',
      render: (_: unknown, record: ProjectTask) => (
        <Input placeholder="做了什么" value={record.description} onChange={v => updateTask(record.id, 'description', v)} size="small" />
      ),
    },
    {
      title: '工时(h)', dataIndex: 'hours', width: 80,
      render: (_: unknown, record: ProjectTask) => (
        <InputNumber min={0} max={unrestrictedHours ? undefined : 24} step={0.5} value={record.hours} onChange={v => updateTask(record.id, 'hours', v || 0)} size="small" style={{ width: '100%' }} />
      ),
    },
    {
      title: '', width: 40,
      render: (_: unknown, record: ProjectTask) => (
        <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => removeTask(record.id)} />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 主要工种 */}
      <Card size="small" title="今日主要工种" bodyStyle={{ padding: '12px 16px' }}>
        <Select
          value={content['work-kind'] || 'dev-coding'}
          onChange={v => updateField('work-kind', v as WorkKind)}
          style={{ width: 200 }}
        >
          {ALL_WORK_KINDS.map(k => (
            <SelectOption key={k} value={k}>
              {WORK_KIND_LABELS[k]}
              <Tag size="small" style={{ marginLeft: 8, fontSize: 10 }}>
                {WORK_KIND_ABILITY_MAP[k].dimension} +{WORK_KIND_ABILITY_MAP[k].xpPer8h}/8h
              </Tag>
            </SelectOption>
          ))}
        </Select>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-3)' }}>
          工种将映射到能力维度，自动累积经验值（每 8 小时）
        </div>
      </Card>

      {/* 任务明细 */}
      <Card
        size="small"
        title="任务明细"
        extra={<Tag color="blue">总工时 {totalHours}h</Tag>}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Table
          columns={taskColumns as any}
          data={tasks}
          rowKey="id"
          pagination={false}
          border
          scroll={{ x: 600 }}
        />
        <Button type="primary" icon={<IconPlus />} size="small" style={{ marginTop: 12 }} onClick={addTask}>
          添加任务
        </Button>
      </Card>

      {/* 代码进展 */}
      <Card size="small" title="代码进展" bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          placeholder="今日代码层面的进展（提交、PR、功能完成等）"
          value={content['code-progress'] || ''}
          onChange={v => updateField('code-progress', v)}
          autoSize={{ minRows: 3, maxRows: 6 }}
          style={{ width: '100%' }}
        />
      </Card>

      {/* 遇到的问题 */}
      <Card size="small" title="遇到的问题" bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          placeholder="遇到的问题或阻塞项"
          value={content['problems-encountered'] || ''}
          onChange={v => updateField('problems-encountered', v)}
          autoSize={{ minRows: 2, maxRows: 4 }}
          style={{ width: '100%' }}
        />
      </Card>

      {/* 明日计划 */}
      {!omitFollowUpFields && <Card size="small" title="明日工作计划" bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          placeholder="请输入明日工作计划（必填）"
          value={content['tomorrow-plan'] || ''}
          onChange={v => updateField('tomorrow-plan', v)}
          autoSize={{ minRows: 2, maxRows: 4 }}
          style={{ width: '100%' }}
        />
      </Card>}
    </Space>
  );
}
