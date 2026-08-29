import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Modal,
  Input,
  Select,
  Table,
  Space,
  Typography,
  Grid,
  Message,
  Spin,
  Tooltip,
  Popconfirm,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconEdit,
  IconDelete,
} from '@arco-design/web-react/icon';
import type { ExpenseStandard, StandardDetail, CityLevel, SubsidyCalcMode } from '../types';
import { getExpenseStandardList } from '../travel-api';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import '../travelAdminConsistency.css';

const { Text } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;

export function StandardList() {
  const [loading, setLoading] = useState(false);
  const [standards, setStandards] = useState<ExpenseStandard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<ExpenseStandard | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingStandardId, setEditingStandardId] = useState<string>();

  // 标准表单
  const [standardForm, setStandardForm] = useState({
    name: '',
    effectiveDate: '',
    expiryDate: '',
  });

  // 明细表单
  const [detailForm, setDetailForm] = useState({
    levels: [] as string[],
    cityLevels: [] as CityLevel[],
    highSpeedRailClass: 'second' as 'second' | 'first' | 'business',
    bulletTrainClass: 'second' as 'second' | 'first',
    airplaneClass: 'economy' as 'economy' | 'business' | 'first',
    selfDriveRate: 0,
    localTransportLimit: 0,
    hotelLimit: 0,
    hotelRoomType: '',
    mealAllowance: 0,
    entertainmentMealLimit: 0,
    communicationAllowance: 0,
    miscellaneousAllowance: 0,
    subsidyCalcMode: 'calendar_day' as SubsidyCalcMode,
    subsidyAmount: 0,
  });

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    setLoading(true);
    try {
      const data = await getExpenseStandardList();
      setStandards(data);
      if (data.length > 0) {
        setSelectedStandard(data[0]);
      }
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openStandardForm = (standard?: ExpenseStandard) => {
    setEditingStandardId(standard?.id);
    setStandardForm(standard ? { name: standard.name, effectiveDate: standard.effectiveDate, expiryDate: standard.expiryDate || '' } : { name: '', effectiveDate: '', expiryDate: '' });
    setFormVisible(true);
  };

  // 保存标准
  const handleSaveStandard = () => {
    if (!standardForm.name || !standardForm.effectiveDate) {
      Message.error('请填写完整信息');
      return;
    }
    const previous = standards.find((item) => item.id === editingStandardId);
    const now = '2026-08-26';
    const record: ExpenseStandard = {
      id: editingStandardId || `standard-${Date.now()}`,
      status: previous?.status || 'inactive', details: previous?.details || [],
      createDate: previous?.createDate || now, updateDate: now, ...standardForm,
      expiryDate: standardForm.expiryDate || undefined,
    };
    setStandards((items) => editingStandardId ? items.map((item) => item.id === editingStandardId ? record : item) : [...items, record]);
    setSelectedStandard(record);
    Message.success(editingStandardId ? '标准已更新' : '标准已创建');
    setFormVisible(false);
  };

  // 职级选项
  const levelOptions = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];

  // 城市等级选项
  const cityLevelOptions: { value: CityLevel; label: string }[] = [
    { value: 'first_tier', label: '一线城市' },
    { value: 'second_tier', label: '二线城市' },
    { value: 'third_tier', label: '三线城市' },
    { value: 'other', label: '其他' },
  ];

  // 座位等级选项
  const seatClassOptions: Record<string, { value: string; label: string }[]> = {
    highSpeedRail: [
      { value: 'second', label: '二等座' },
      { value: 'first', label: '一等座' },
      { value: 'business', label: '商务座' },
    ],
    bulletTrain: [
      { value: 'second', label: '二等座' },
      { value: 'first', label: '一等座' },
    ],
    airplane: [
      { value: 'economy', label: '经济舱' },
      { value: 'business', label: '商务舱' },
      { value: 'first', label: '头等舱' },
    ],
  };

  const columns = [
    {
      title: '职级',
      dataIndex: 'levels',
      width: 100,
      render: (value: string[]) => value.join('、'),
    },
    {
      title: '城市等级',
      dataIndex: 'cityLevels',
      width: 120,
      render: (value: CityLevel[]) => value.map(level => {
        const option = cityLevelOptions.find(o => o.value === level);
        return option?.label || level;
      }).join('、'),
    },
    {
      title: '高铁',
      dataIndex: 'highSpeedRailClass',
      width: 80,
      render: (value: string) => seatClassOptions.highSpeedRail.find(o => o.value === value)?.label,
    },
    {
      title: '动车',
      dataIndex: 'bulletTrainClass',
      width: 80,
      render: (value: string) => seatClassOptions.bulletTrain.find(o => o.value === value)?.label,
    },
    {
      title: '飞机',
      dataIndex: 'airplaneClass',
      width: 80,
      render: (value: string) => seatClassOptions.airplane.find(o => o.value === value)?.label,
    },
    {
      title: '住宿限额',
      dataIndex: 'hotelLimit',
      width: 100,
      render: (value: number) => `¥${value}/晚`,
    },
    {
      title: '餐补',
      dataIndex: 'mealAllowance',
      width: 80,
      render: (value: number) => `¥${value}/天`,
    },
    {
      title: '补贴',
      dataIndex: 'subsidyAmount',
      width: 80,
      render: (value: number) => `¥${value}/天`,
    },
  ];

  const allDetails = standards.flatMap((standard) => standard.details);
  const activeCount = standards.filter((standard) => standard.status === 'active').length;
  const cityLevelCount = new Set(allDetails.flatMap((detail) => detail.cityLevels)).size;
  const maxHotelLimit = allDetails.reduce((max, detail) => Math.max(max, detail.hotelLimit), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="差旅费用标准"
        description="按生效版本维护职级、城市等级、交通、住宿、餐饮和补贴限额。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => openStandardForm()}>新增标准</Button>}
      />

      <ProcessMetricGrid items={[
        { key: 'versions', label: '标准版本', value: `${standards.length} 个`, detail: `启用 ${activeCount} 个` },
        { key: 'rules', label: '标准明细', value: `${allDetails.length} 条`, detail: '职级与城市组合规则' },
        { key: 'cities', label: '覆盖城市等级', value: `${cityLevelCount} 级`, detail: '按当前全部版本统计' },
        { key: 'hotel', label: '最高住宿限额', value: `¥${maxHotelLimit}/晚`, detail: '当前标准上限' },
      ]} />

      <div className="travel-admin-master-detail">
        {/* 左侧：标准列表 */}
        <div>
          <Card title="标准列表">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {standards.map((standard) => (
                <div
                  key={standard.id}
                  className={`travel-admin-selector-item${selectedStandard?.id === standard.id ? ' travel-admin-selector-item--active' : ''}`}
                  onClick={() => setSelectedStandard(standard)}
                >
                  <div className="travel-admin-selector-item__head">
                    <Text style={{ fontWeight: 500 }}>{standard.name}</Text>
                    <Space size={2} onClick={(event) => event.stopPropagation()}>
                      <Tag color={standard.status === 'active' ? 'green' : 'gray'} size="small">{standard.status === 'active' ? '启用' : '禁用'}</Tag>
                      <Tooltip content="编辑标准"><Button aria-label={`编辑${standard.name}`} className="hubx-icon-action" size="mini" type="text" icon={<IconEdit />} onClick={() => openStandardForm(standard)} /></Tooltip>
                      <Popconfirm title="确认删除该标准？" onOk={() => { setStandards((items) => items.filter((item) => item.id !== standard.id)); if (selectedStandard?.id === standard.id) setSelectedStandard(null); }}><Tooltip content="删除标准"><Button aria-label={`删除${standard.name}`} className="hubx-icon-action" size="mini" type="text" status="danger" icon={<IconDelete />} /></Tooltip></Popconfirm>
                    </Space>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>生效日期：{standard.effectiveDate}</Text>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </div>

        {/* 右侧：标准详情 */}
        <div>
          <Card title={selectedStandard ? selectedStandard.name : '请选择标准'}>
            {selectedStandard ? (
              <div>
                {/* 基本信息 */}
                <div className="travel-admin-detail-summary">
                  <Row gutter={16}>
                    <Col span={8}>
                      <div><Text type="secondary">标准名称</Text></div>
                      <div style={{ fontWeight: 500 }}>{selectedStandard.name}</div>
                    </Col>
                    <Col span={8}>
                      <div><Text type="secondary">生效日期</Text></div>
                      <div style={{ fontWeight: 500 }}>{selectedStandard.effectiveDate}</div>
                    </Col>
                    <Col span={8}>
                      <div><Text type="secondary">状态</Text></div>
                      <Tag color={selectedStandard.status === 'active' ? 'green' : 'gray'}>
                        {selectedStandard.status === 'active' ? '启用' : '禁用'}
                      </Tag>
                    </Col>
                  </Row>
                </div>

                {/* 标准明细表格 */}
                <Table
                  columns={columns}
                  data={selectedStandard.details}
                  rowKey="id"
                  pagination={false}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>
                请选择标准查看详情
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 新建标准弹窗 */}
      <Modal
        title={editingStandardId ? '编辑费用标准' : '新增费用标准'}
        visible={formVisible}
        onOk={handleSaveStandard}
        onCancel={() => setFormVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8 }}><Text>标准名称</Text></div>
            <Input
              placeholder="如：2026年差旅费用标准"
              value={standardForm.name}
              onChange={(value) => setStandardForm({ ...standardForm, name: value })}
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>生效日期</Text></div>
              <Input
                type="date"
                value={standardForm.effectiveDate}
                onChange={(value) => setStandardForm({ ...standardForm, effectiveDate: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>失效日期（可选）</Text></div>
              <Input
                type="date"
                value={standardForm.expiryDate}
                onChange={(value) => setStandardForm({ ...standardForm, expiryDate: value })}
              />
            </Col>
          </Row>
        </Space>
      </Modal>
    </PageShell>
  );
}
