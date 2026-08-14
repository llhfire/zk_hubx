import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Message,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Tooltip,
} from '@arco-design/web-react';
import { IconPlus, IconSave, IconUserGroup } from '@arco-design/web-react/icon';
import { useEmployee } from './EmployeeContext';
import {
  type LevelRateConfig,
  formatCurrency,
  getLevelColor,
} from './mockData';

const TabPane = Tabs.TabPane;
const Title = Typography.Title;

interface LevelRateDraft {
  level: string;
  hourlyRate?: number;
  description: string;
}

const EMPTY_LEVEL_RATE_DRAFT: LevelRateDraft = {
  level: '',
  hourlyRate: undefined,
  description: '',
};

export function LevelRateSettings() {
  const {
    levelRates,
    positions,
    updateLevelRate,
    addPosition,
    addLevelRate,
  } = useEmployee();

  const [activePosition, setActivePosition] = useState('前端开发');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [levelRateDraft, setLevelRateDraft] = useState<LevelRateDraft>(EMPTY_LEVEL_RATE_DRAFT);

  const positionRates = useMemo(
    () => levelRates.filter(rate => rate.position === activePosition),
    [levelRates, activePosition],
  );

  const handleEdit = (record: LevelRateConfig) => {
    setEditingKey(`${record.level}-${record.position}`);
    setEditValue(record.standardRate);
  };

  const handleSave = (record: LevelRateConfig) => {
    updateLevelRate(record.level, record.position, editValue);
    setEditingKey(null);
    Message.success(`已更新 ${record.level}·${record.position} 的时薪为 ${formatCurrency(editValue)}/h`);
  };

  const openAddLevel = () => {
    setLevelRateDraft(EMPTY_LEVEL_RATE_DRAFT);
    setLevelModalVisible(true);
  };

  const savePosition = () => {
    const name = newPositionName.trim();
    if (!name) {
      Message.warning('请输入职位名称');
      return;
    }
    if (positions.includes(name)) {
      Message.warning('职位名称已存在');
      return;
    }
    addPosition(name);
    setActivePosition(name);
    setNewPositionName('');
    setPositionModalVisible(false);
    Message.success('职位已新增，请继续配置职级');
  };

  const saveLevelRate = () => {
    const level = levelRateDraft.level.trim();
    const { hourlyRate, description } = levelRateDraft;
    if (!level) {
      Message.warning('请输入职级名称');
      return;
    }
    if (positionRates.some(rate => rate.level === level)) {
      Message.warning('当前职位已存在该职级');
      return;
    }
    if (
      !Number.isFinite(hourlyRate)
      || (hourlyRate || 0) < 0
    ) {
      Message.warning('请填写有效时薪');
      return;
    }

    addLevelRate({
      level,
      position: activePosition,
      minRate: Number(hourlyRate),
      standardRate: Number(hourlyRate),
      maxRate: Number(hourlyRate),
      description: description.trim(),
    });
    setLevelModalVisible(false);
    Message.success('职级已新增');
  };

  const columns = [
    {
      title: '职级',
      dataIndex: 'level',
      width: 90,
      render: (value: string) => (
        <Tag color={getLevelColor(value as any)} style={{ fontWeight: 700 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 120,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '时薪（元/小时）',
      width: 200,
      dataIndex: 'standardRate',
      render: (_: unknown, record: LevelRateConfig) => {
        const key = `${record.level}-${record.position}`;
        if (editingKey === key) {
          return (
            <Space>
              <InputNumber
                style={{ width: 100 }}
                min={0}
                value={editValue}
                onChange={value => setEditValue(Number(value) || 0)}
                prefix="¥"
                suffix="/h"
                size="small"
                autoFocus
              />
              <Button type="text" size="small" onClick={() => handleSave(record)}>保存</Button>
              <Button type="text" size="small" status="danger" onClick={() => setEditingKey(null)}>取消</Button>
            </Space>
          );
        }
        return (
          <span style={{ fontWeight: 700, color: 'rgb(var(--primary-6))', fontSize: 16 }}>
            {formatCurrency(record.standardRate)}/h
          </span>
        );
      },
    },
    { title: '等级描述', dataIndex: 'description' },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, record: LevelRateConfig) => {
        if (editingKey === `${record.level}-${record.position}`) return null;
        return (
          <Tooltip content="编辑时薪">
            <Button type="text" size="small" icon={<IconSave />} onClick={() => handleEdit(record)} />
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title heading={5} style={{ margin: 0 }}>
            <IconUserGroup style={{ marginRight: 8 }} />
            职级时薪设置
          </Title>
          <Button type="primary" icon={<IconPlus />} onClick={() => setPositionModalVisible(true)}>
            新增职位
          </Button>
        </div>

        <Tabs
          activeTab={activePosition}
          onChange={key => setActivePosition(String(key))}
          type="card-gutter"
        >
          {positions.map(position => <TabPane key={position} title={position} />)}
        </Tabs>

        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '12px 0' }}>
          <Button icon={<IconPlus />} onClick={openAddLevel}>新增职级</Button>
        </div>

        <Table
          columns={columns as any}
          data={positionRates}
          rowKey={record => `${record.level}-${record.position}`}
          pagination={false}
        />
      </Card>

      <Modal
        title="新增职位"
        visible={positionModalVisible}
        onCancel={() => {
          setPositionModalVisible(false);
          setNewPositionName('');
        }}
        onOk={savePosition}
        okText="保存"
      >
        <div style={{ marginBottom: 8, fontWeight: 600 }}>
          <span style={{ color: 'rgb(var(--red-6))', marginRight: 4 }}>*</span>职位名称
        </div>
        <Input value={newPositionName} onChange={setNewPositionName} placeholder="请输入职位名称" maxLength={30} />
      </Modal>

      <Modal
        title={`新增职级 - ${activePosition}`}
        visible={levelModalVisible}
        onCancel={() => setLevelModalVisible(false)}
        onOk={saveLevelRate}
        okText="保存"
        style={{ width: 680 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 16px' }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}><span style={{ color: 'rgb(var(--red-6))', marginRight: 4 }}>*</span>职级名称</div>
            <Input
              value={levelRateDraft.level}
              onChange={level => setLevelRateDraft(current => ({ ...current, level }))}
              placeholder="例如：L0"
              maxLength={20}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>等级描述</div>
            <Input
              value={levelRateDraft.description}
              onChange={description => setLevelRateDraft(current => ({ ...current, description }))}
              placeholder="例如：初级专员"
              maxLength={50}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}><span style={{ color: 'rgb(var(--red-6))', marginRight: 4 }}>*</span>时薪</div>
            <InputNumber
              value={levelRateDraft.hourlyRate}
              min={0}
              precision={2}
              prefix="¥"
              suffix="/h"
              placeholder="请输入"
              style={{ width: '100%' }}
              onChange={hourlyRate => setLevelRateDraft(current => ({ ...current, hourlyRate: hourlyRate === undefined ? undefined : Number(hourlyRate) }))}
            />
          </div>
        </div>
      </Modal>
    </Space>
  );
}
