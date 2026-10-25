import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Tag,
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
  Tabs,
  Drawer,
  Form,
  InputNumber,
  Radio,
  Alert,
  Divider,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconCopy,
  IconSearch,
  IconSwap,
  IconExperiment,
  IconFile,
  IconSync,
} from '@arco-design/web-react/icon';
import type { ExpenseStandard, StandardDetail, CityLevel } from '../types';
import { getExpenseStandardList } from '../travel-api';
import { mockExpenseStandards } from '../mock-data';
import { PageHeader, PageShell, ProcessMetricGrid } from '../../../../components/ui';
import '../travelAdminConsistency.css';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;
const TabPane = Tabs.TabPane;

// 城市等级配置
export const CITY_LEVEL_OPTIONS: { value: CityLevel; label: string; tagColor: string }[] = [
  { value: 'first_tier', label: '一线城市 (北上广深)', tagColor: 'arcoblue' },
  { value: 'second_tier', label: '二线城市 / 省会', tagColor: 'cyan' },
  { value: 'third_tier', label: '三线及地级市', tagColor: 'green' },
  { value: 'other', label: '其他偏远县区', tagColor: 'gray' },
];

// 职级选项 L1 - L10
export const ALL_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];

// 座席翻译字典
export const SEAT_CLASS_LABELS: Record<string, string> = {
  second: '二等座',
  first: '一等座',
  business: '商务座',
  economy: '经济舱',
};

// 安全格式化货币
export function formatCurrency(val?: number | null): string {
  return `¥${Number(val ?? 0).toLocaleString()}`;
}

export function StandardList() {
  const [loading, setLoading] = useState(false);
  const [standards, setStandards] = useState<ExpenseStandard[]>(mockExpenseStandards);
  const [selectedStandardId, setSelectedStandardId] = useState<string>(
    mockExpenseStandards.find((s) => s.status === 'active')?.id || mockExpenseStandards[0]?.id || ''
  );
  const [benchmarkId, setBenchmarkId] = useState<string>('std-2026');

  // Master 搜索与状态过滤
  const [versionSearch, setVersionSearch] = useState('');
  const [versionStatusFilter, setVersionStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // 当前主视图 Tab
  const [activeTab, setActiveTab] = useState<'rules' | 'calculator' | 'comparison'>('rules');

  // 规则筛选
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleLevelFilter, setRuleLevelFilter] = useState<string>('all');
  const [ruleCityFilter, setRuleCityFilter] = useState<string>('all');

  // 版本抽屉与状态
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [versionForm] = Form.useForm();

  // 明细规则抽屉与状态
  const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm] = Form.useForm();

  // 差旅模拟试算器表单状态
  const [calcLevel, setCalcLevel] = useState<string>('L4');
  const [calcCityLevel, setCalcCityLevel] = useState<CityLevel>('first_tier');
  const [calcDays, setCalcDays] = useState<number>(3);
  const [calcNights, setCalcNights] = useState<number>(2);
  const [calcTransportMode, setCalcTransportMode] = useState<'highSpeedRail' | 'airplane' | 'selfDrive'>('highSpeedRail');

  // 版本差异对比目标
  const [compareTargetId, setCompareTargetId] = useState<string>('');

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    setLoading(true);
    try {
      const data = await getExpenseStandardList();
      setStandards(data);
      if (data.length > 0) {
        const activeOne = data.find((s) => s.status === 'active') || data[0];
        setSelectedStandardId(activeOne.id);
        setBenchmarkId(activeOne.id);
        const otherOne = data.find((s) => s.id !== activeOne.id);
        if (otherOne) setCompareTargetId(otherOne.id);
      }
    } catch {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 当前选中的标准对象
  const selectedStandard = useMemo(() => {
    return standards.find((s) => s.id === selectedStandardId) || standards[0] || null;
  }, [standards, selectedStandardId]);

  // 比对目标标准对象
  const compareStandard = useMemo(() => {
    return standards.find((s) => s.id === compareTargetId) || null;
  }, [standards, compareTargetId]);

  // 过滤后的版本列表
  const filteredStandards = useMemo(() => {
    return standards.filter((std) => {
      if (versionStatusFilter !== 'all' && std.status !== versionStatusFilter) return false;
      if (versionSearch.trim()) {
        const q = versionSearch.trim().toLowerCase();
        return std.name.toLowerCase().includes(q) || std.effectiveDate.includes(q);
      }
      return true;
    });
  }, [standards, versionSearch, versionStatusFilter]);

  // 过滤后的当前标准明细规则
  const filteredDetails = useMemo(() => {
    if (!selectedStandard) return [];
    return selectedStandard.details.filter((detail) => {
      // 职级过滤
      if (ruleLevelFilter !== 'all' && !detail.levels.includes(ruleLevelFilter)) {
        return false;
      }
      // 城市等级过滤
      if (ruleCityFilter !== 'all' && !detail.cityLevels.includes(ruleCityFilter as CityLevel)) {
        return false;
      }
      // 关键词搜索
      if (ruleSearch.trim()) {
        const q = ruleSearch.trim().toLowerCase();
        const levelMatch = detail.levels.some((lvl) => lvl.toLowerCase().includes(q));
        const cityMatch = detail.cityLevels.some((cl) => {
          const opt = CITY_LEVEL_OPTIONS.find((o) => o.value === cl);
          return (opt?.label.toLowerCase().includes(q) ?? false) || cl.includes(q);
        });
        const roomMatch = (detail.hotelRoomType ?? '').toLowerCase().includes(q);
        return levelMatch || cityMatch || roomMatch;
      }
      return true;
    });
  }, [selectedStandard, ruleLevelFilter, ruleCityFilter, ruleSearch]);

  // 全局 4 维微指标测算
  const allDetails = useMemo(() => standards.flatMap((s) => s.details), [standards]);
  const activeCount = useMemo(() => standards.filter((s) => s.status === 'active').length, [standards]);
  const maxHotelLimit = useMemo(() => {
    return allDetails.reduce((max, d) => Math.max(max, d.hotelLimit ?? 0), 0);
  }, [allDetails]);
  const maxSubsidy = useMemo(() => {
    return allDetails.reduce((max, d) => Math.max(max, d.subsidyAmount ?? 0), 0);
  }, [allDetails]);

  // ===================== 版本操作 =====================
  const handleOpenVersionDrawer = (target?: ExpenseStandard, clone = false) => {
    setIsCloning(clone);
    if (clone && target) {
      versionForm.setFieldsValue({
        id: undefined,
        name: `${target.name} (副本)`,
        effectiveDate: '2027-01-01',
        expiryDate: '',
        status: 'inactive',
      });
    } else if (target) {
      versionForm.setFieldsValue({
        id: target.id,
        name: target.name,
        effectiveDate: target.effectiveDate,
        expiryDate: target.expiryDate || '',
        status: target.status,
      });
    } else {
      versionForm.setFieldsValue({
        id: undefined,
        name: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
        status: 'inactive',
      });
    }
    setVersionDrawerVisible(true);
  };

  const handleSaveVersion = async () => {
    try {
      const values = await versionForm.validate();
      const now = new Date().toISOString().slice(0, 10);

      if (values.id && !isCloning) {
        // 编辑已有版本
        setStandards((prev) =>
          prev.map((item) =>
            item.id === values.id
              ? {
                  ...item,
                  name: values.name,
                  effectiveDate: values.effectiveDate,
                  expiryDate: values.expiryDate || undefined,
                  status: values.status,
                  updateDate: now,
                }
              : item
          )
        );
        Message.success('标准版本更新成功');
      } else {
        // 新建或克隆版本
        const sourceDetails = isCloning && selectedStandard ? selectedStandard.details : [];
        const newId = `std-${Date.now()}`;
        const newRecord: ExpenseStandard = {
          id: newId,
          name: values.name,
          effectiveDate: values.effectiveDate,
          expiryDate: values.expiryDate || undefined,
          status: values.status || 'inactive',
          details: sourceDetails.map((d, index) => ({
            ...d,
            id: `${newId}-d${index + 1}`,
            standardId: newId,
          })),
          createDate: now,
          updateDate: now,
        };
        setStandards((prev) => [newRecord, ...prev]);
        setSelectedStandardId(newId);
        Message.success(isCloning ? '已基于当前标准派生新版本' : '新增标准版本成功');
      }
      setVersionDrawerVisible(false);
    } catch {
      // 验证未通过
    }
  };

  const handleDeleteVersion = (id: string) => {
    if (standards.length <= 1) {
      Message.warning('系统至少需保留一个费用标准版本');
      return;
    }
    setStandards((prev) => prev.filter((s) => s.id !== id));
    if (selectedStandardId === id) {
      const remain = standards.filter((s) => s.id !== id);
      setSelectedStandardId(remain[0]?.id || '');
    }
    Message.success('已删除标准版本');
  };

  const handleSetBenchmark = (id: string) => {
    setBenchmarkId(id);
    setStandards((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s))
    );
    Message.success('已将该版本设为企业基准生效标准');
  };

  // ===================== 规则明细操作 =====================
  const handleOpenRuleDrawer = (rule?: StandardDetail) => {
    if (rule) {
      setEditingRuleId(rule.id);
      ruleForm.setFieldsValue({
        levels: rule.levels,
        cityLevels: rule.cityLevels,
        highSpeedRailClass: rule.highSpeedRailClass,
        bulletTrainClass: rule.bulletTrainClass,
        airplaneClass: rule.airplaneClass,
        selfDriveRate: rule.selfDriveRate ?? 0,
        localTransportLimit: rule.localTransportLimit ?? 0,
        hotelLimit: rule.hotelLimit ?? 0,
        hotelRoomType: rule.hotelRoomType ?? '标准间',
        mealAllowance: rule.mealAllowance ?? 0,
        entertainmentMealLimit: rule.entertainmentMealLimit ?? 0,
        communicationAllowance: rule.communicationAllowance ?? 0,
        miscellaneousAllowance: rule.miscellaneousAllowance ?? 0,
        subsidyCalcMode: rule.subsidyCalcMode ?? 'calendar_day',
        subsidyAmount: rule.subsidyAmount ?? 0,
      });
    } else {
      setEditingRuleId(null);
      ruleForm.setFieldsValue({
        levels: ['L4', 'L5', 'L6'],
        cityLevels: ['second_tier'],
        highSpeedRailClass: 'second',
        bulletTrainClass: 'second',
        airplaneClass: 'economy',
        selfDriveRate: 0.6,
        localTransportLimit: 50,
        hotelLimit: 350,
        hotelRoomType: '标准间',
        mealAllowance: 80,
        entertainmentMealLimit: 150,
        communicationAllowance: 10,
        miscellaneousAllowance: 15,
        subsidyCalcMode: 'calendar_day',
        subsidyAmount: 100,
      });
    }
    setRuleDrawerVisible(true);
  };

  const handleSaveRule = async () => {
    if (!selectedStandard) return;
    try {
      const values = await ruleForm.validate();
      const now = new Date().toISOString().slice(0, 10);

      if (editingRuleId) {
        // 更新现有规则
        const updatedDetails = selectedStandard.details.map((item) =>
          item.id === editingRuleId ? { ...item, ...values } : item
        );
        setStandards((prev) =>
          prev.map((s) =>
            s.id === selectedStandard.id ? { ...s, details: updatedDetails, updateDate: now } : s
          )
        );
        Message.success('规则明细更新成功');
      } else {
        // 新增规则
        const newDetail: StandardDetail = {
          id: `${selectedStandard.id}-d${Date.now()}`,
          standardId: selectedStandard.id,
          ...values,
        };
        const updatedDetails = [newDetail, ...selectedStandard.details];
        setStandards((prev) =>
          prev.map((s) =>
            s.id === selectedStandard.id ? { ...s, details: updatedDetails, updateDate: now } : s
          )
        );
        Message.success('新增规则明细成功');
      }
      setRuleDrawerVisible(false);
    } catch {
      // 表单验证未通过
    }
  };

  const handleDeleteRule = (detailId: string) => {
    if (!selectedStandard) return;
    const now = new Date().toISOString().slice(0, 10);
    const updatedDetails = selectedStandard.details.filter((d) => d.id !== detailId);
    setStandards((prev) =>
      prev.map((s) =>
        s.id === selectedStandard.id ? { ...s, details: updatedDetails, updateDate: now } : s
      )
    );
    Message.success('已移除该规则');
  };

  const handleCopyRule = (rule: StandardDetail) => {
    if (!selectedStandard) return;
    const now = new Date().toISOString().slice(0, 10);
    const cloned: StandardDetail = {
      ...rule,
      id: `${selectedStandard.id}-d${Date.now()}`,
      levels: [...rule.levels],
      cityLevels: [...rule.cityLevels],
    };
    setStandards((prev) =>
      prev.map((s) =>
        s.id === selectedStandard.id ? { ...s, details: [cloned, ...s.details], updateDate: now } : s
      )
    );
    Message.success('已复制并新增一条规则');
  };

  // ===================== 差旅试算器精准推导 =====================
  const simulationResult = useMemo(() => {
    if (!selectedStandard) return null;
    const matchedRule =
      selectedStandard.details.find((d) => {
        const matchLvl = d.levels.includes(calcLevel);
        const matchCity = d.cityLevels.includes(calcCityLevel);
        return matchLvl && matchCity;
      }) ||
      selectedStandard.details.find((d) => d.cityLevels.includes(calcCityLevel)) ||
      selectedStandard.details[0];

    if (!matchedRule) return null;

    const days = Math.max(1, calcDays);
    const nights = Math.max(0, calcNights);
    const hotelTotal = (matchedRule.hotelLimit ?? 0) * nights;
    const subsidyTotal = (matchedRule.subsidyAmount ?? 0) * days;
    const localTransportTotal = (matchedRule.localTransportLimit ?? 0) * days;
    const mealAllowanceTotal = (matchedRule.mealAllowance ?? 0) * days;
    const totalEstimated = hotelTotal + subsidyTotal + localTransportTotal + mealAllowanceTotal;

    // 准乘标准判定
    let allowedSeat = '';
    if (calcTransportMode === 'highSpeedRail') {
      allowedSeat = `高铁 ${SEAT_CLASS_LABELS[matchedRule.highSpeedRailClass] || '二等座'}`;
    } else if (calcTransportMode === 'airplane') {
      allowedSeat = `民航客机 ${SEAT_CLASS_LABELS[matchedRule.airplaneClass] || '经济舱'}`;
    } else {
      allowedSeat = `自驾公差补贴 ${formatCurrency(matchedRule.selfDriveRate)}/公里 (含油费/通行费)`;
    }

    return {
      matchedRule,
      allowedSeat,
      hotelLimitPerNight: matchedRule.hotelLimit ?? 0,
      hotelTotal,
      subsidyPerDay: matchedRule.subsidyAmount ?? 0,
      subsidyTotal,
      localTransportPerDay: matchedRule.localTransportLimit ?? 0,
      localTransportTotal,
      mealAllowancePerDay: matchedRule.mealAllowance ?? 0,
      mealAllowanceTotal,
      totalEstimated,
      roomType: matchedRule.hotelRoomType || '标准间',
    };
  }, [selectedStandard, calcLevel, calcCityLevel, calcDays, calcNights, calcTransportMode]);

  const handleCopySimulationText = () => {
    if (!simulationResult || !selectedStandard) return;
    const text = `【差旅标准试算单】\n基准标准：${selectedStandard.name}\n职级：${calcLevel} | 目的地：${calcCityLevel}\n行程：${calcDays}天 ${calcNights}晚\n1. 交通准乘：${simulationResult.allowedSeat}\n2. 住宿限额：${formatCurrency(simulationResult.hotelLimitPerNight)}/晚 × ${calcNights}晚 = ${formatCurrency(simulationResult.hotelTotal)} (${simulationResult.roomType})\n3. 出差津贴：${formatCurrency(simulationResult.subsidyPerDay)}/天 × ${calcDays}天 = ${formatCurrency(simulationResult.subsidyTotal)}\n4. 市内交通包干：${formatCurrency(simulationResult.localTransportPerDay)}/天 × ${calcDays}天 = ${formatCurrency(simulationResult.localTransportTotal)}\n合计控制额度（除大交通外）：${formatCurrency(simulationResult.totalEstimated)}`;
    navigator.clipboard?.writeText(text);
    Message.success('试算结果已成功复制到剪贴板！');
  };

  // 表格列定义
  const columns = [
    {
      title: '适用职级',
      dataIndex: 'levels',
      width: 130,
      render: (levels: string[]) => (
        <Space size={4} wrap>
          {levels.map((lvl) => (
            <Tag key={lvl} size="small" color="arcoblue" style={{ fontWeight: 600 }}>
              {lvl}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '适用城市等级',
      dataIndex: 'cityLevels',
      width: 160,
      render: (cityLevels: CityLevel[]) => (
        <Space size={4} wrap>
          {cityLevels.map((cl) => {
            const opt = CITY_LEVEL_OPTIONS.find((o) => o.value === cl);
            return (
              <Tag key={cl} size="small" color={opt?.tagColor || 'gray'}>
                {opt?.label.split(' ')[0] || cl}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '交通准乘标准',
      width: 220,
      render: (_: unknown, record: StandardDetail) => (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div>
            <Text type="secondary">高铁：</Text>
            <Text style={{ fontWeight: 500 }}>{SEAT_CLASS_LABELS[record.highSpeedRailClass] || '二等座'}</Text>
            <span style={{ margin: '0 6px', color: 'var(--color-border-3)' }}>|</span>
            <Text type="secondary">飞机：</Text>
            <Text style={{ fontWeight: 500 }}>{SEAT_CLASS_LABELS[record.airplaneClass] || '经济舱'}</Text>
          </div>
          <div>
            <Text type="secondary">自驾补贴：</Text>
            <span>{record.selfDriveRate ? `${record.selfDriveRate}元/km` : '不支持'}</span>
            <span style={{ margin: '0 6px', color: 'var(--color-border-3)' }}>|</span>
            <Text type="secondary">市内交通：</Text>
            <span>{formatCurrency(record.localTransportLimit)}/天</span>
          </div>
        </div>
      ),
    },
    {
      title: '住宿标准',
      width: 150,
      render: (_: unknown, record: StandardDetail) => (
        <div>
          <div style={{ fontWeight: 600, color: 'rgb(var(--primary-6))' }}>
            {formatCurrency(record.hotelLimit)}/晚
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
            {record.hotelRoomType || '标准间'}
          </div>
        </div>
      ),
    },
    {
      title: '餐饮与招待',
      width: 150,
      render: (_: unknown, record: StandardDetail) => (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <div>
            <Text type="secondary">日常餐补：</Text>
            <span>{formatCurrency(record.mealAllowance)}/天</span>
          </div>
          <div>
            <Text type="secondary">招待上限：</Text>
            <span>{formatCurrency(record.entertainmentMealLimit)}/次</span>
          </div>
        </div>
      ),
    },
    {
      title: '出差津贴',
      width: 130,
      render: (_: unknown, record: StandardDetail) => (
        <div>
          <div style={{ fontWeight: 600, color: 'rgb(var(--green-6))' }}>
            {formatCurrency(record.subsidyAmount)}/天
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
            {record.subsidyCalcMode === 'calendar_day' ? '按日历天' : '按工作日'}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: StandardDetail) => (
        <Space size={2}>
          <Tooltip content="编辑该条规则">
            <Button
              size="mini"
              type="text"
              icon={<IconEdit />}
              onClick={() => handleOpenRuleDrawer(record)}
            />
          </Tooltip>
          <Tooltip content="复制该条规则">
            <Button
              size="mini"
              type="text"
              icon={<IconCopy />}
              onClick={() => handleCopyRule(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认移除该明细规则？"
            onOk={() => handleDeleteRule(record.id)}
          >
            <Tooltip content="删除规则">
              <Button size="mini" type="text" status="danger" icon={<IconDelete />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin dot />
      </div>
    );
  }

  return (
    <PageShell>
      {/* 顶部标题与多维行动点 */}
      <PageHeader
        title="差旅费用标准"
        description="维护集团各生效版本的职级×城市等级标准矩阵，涵盖交通准乘、住宿限额、日常餐补及出差津贴，支持在线试算与版本比对。"
        actions={
          <Space>
            <Button
              icon={<IconExperiment />}
              onClick={() => setActiveTab('calculator')}
            >
              差旅试算器
            </Button>
            <Button
              icon={<IconCopy />}
              disabled={!selectedStandard}
              onClick={() => handleOpenVersionDrawer(selectedStandard, true)}
            >
              复制派生新版
            </Button>
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={() => handleOpenVersionDrawer()}
            >
              新增标准版本
            </Button>
          </Space>
        }
      />

      {/* 4 维微指标中枢 */}
      <ProcessMetricGrid
        items={[
          {
            key: 'versions',
            label: '标准版本总数',
            value: `${standards.length} 个版本`,
            detail: `已启用 ${activeCount} 个版本 · 基准: ${benchmarkId}`,
          },
          {
            key: 'rules',
            label: '规则明细覆盖',
            value: `${selectedStandard?.details.length ?? 0} 条规则`,
            detail: `覆盖 10 个职级 × 4 级城市矩阵`,
          },
          {
            key: 'hotel',
            label: '最高住宿限额',
            value: formatCurrency(maxHotelLimit),
            detail: '一线城市高管房费报销上限',
          },
          {
            key: 'subsidy',
            label: '出差综合津贴',
            value: `${formatCurrency(maxSubsidy)}/天`,
            detail: '自然日全勤自动核算计发',
          },
        ]}
      />

      {/* 316px Master-Detail 现代化栅格双栏 */}
      <div className="travel-standard-master-detail">
        {/* 左侧：版本清单 Master */}
        <Card
          title="标准版本库"
          extra={
            <Button
              size="mini"
              type="text"
              icon={<IconSync />}
              onClick={loadStandards}
            >
              刷新
            </Button>
          }
          style={{ height: '100%' }}
        >
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {/* 搜索与状态切换 */}
            <Input
              prefix={<IconSearch />}
              placeholder="搜索版本名称或年份..."
              allowClear
              value={versionSearch}
              onChange={setVersionSearch}
              size="small"
            />

            <Radio.Group
              type="button"
              size="mini"
              value={versionStatusFilter}
              onChange={(val) => setVersionStatusFilter(val)}
              style={{ display: 'flex', width: '100%' }}
            >
              <Radio value="all" style={{ flex: 1, textAlign: 'center' }}>全部</Radio>
              <Radio value="active" style={{ flex: 1, textAlign: 'center' }}>启用中</Radio>
              <Radio value="inactive" style={{ flex: 1, textAlign: 'center' }}>草稿/归档</Radio>
            </Radio.Group>

            <Divider style={{ margin: '4px 0' }} />

            {/* 版本立体卡片列表 */}
            {filteredStandards.map((standard) => {
              const isSelected = selectedStandard?.id === standard.id;
              const isBenchmark = benchmarkId === standard.id;
              const maxH = standard.details.reduce((m, d) => Math.max(m, d.hotelLimit ?? 0), 0);
              const maxS = standard.details.reduce((m, d) => Math.max(m, d.subsidyAmount ?? 0), 0);

              return (
                <div
                  key={standard.id}
                  className={`travel-standard-version-card${isSelected ? ' travel-standard-version-card--active' : ''}`}
                  onClick={() => setSelectedStandardId(standard.id)}
                >
                  <div className="travel-standard-version-card__header">
                    <div>
                      <div className="travel-standard-version-card__name">
                        {standard.name}
                      </div>
                    </div>
                    <Space size={4}>
                      {isBenchmark && (
                        <Tag color="gold" size="small" style={{ fontWeight: 600 }}>
                          当前基准
                        </Tag>
                      )}
                      <Tag
                        color={standard.status === 'active' ? 'green' : 'gray'}
                        size="small"
                      >
                        {standard.status === 'active' ? '已生效' : '未生效'}
                      </Tag>
                    </Space>
                  </div>

                  <div className="travel-standard-version-card__meta">
                    <IconFile style={{ fontSize: 12 }} />
                    <span>生效：{standard.effectiveDate}</span>
                    {standard.expiryDate && <span>至 {standard.expiryDate}</span>}
                  </div>

                  {/* 2x2 参数栅格 */}
                  <div className="travel-standard-version-card__metrics">
                    <div className="travel-standard-version-card__metric-item">
                      <span className="travel-standard-version-card__metric-label">规则明细</span>
                      <span className="travel-standard-version-card__metric-val">{standard.details.length} 条</span>
                    </div>
                    <div className="travel-standard-version-card__metric-item">
                      <span className="travel-standard-version-card__metric-label">更新日期</span>
                      <span className="travel-standard-version-card__metric-val">{standard.updateDate.slice(5)}</span>
                    </div>
                    <div className="travel-standard-version-card__metric-item">
                      <span className="travel-standard-version-card__metric-label">住宿上限</span>
                      <span className="travel-standard-version-card__metric-val">{formatCurrency(maxH)}</span>
                    </div>
                    <div className="travel-standard-version-card__metric-item">
                      <span className="travel-standard-version-card__metric-label">最高补贴</span>
                      <span className="travel-standard-version-card__metric-val">{formatCurrency(maxS)}</span>
                    </div>
                  </div>

                  {/* 快捷操作区 */}
                  <div
                    className="travel-standard-version-card__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isBenchmark ? (
                      <Button
                        size="mini"
                        type="text"
                        status="success"
                        onClick={() => handleSetBenchmark(standard.id)}
                      >
                        设为基准
                      </Button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'rgb(var(--green-6))' }}>✓ 集团主版本</span>
                    )}

                    <Space size={2}>
                      <Tooltip content="编辑版本信息">
                        <Button
                          size="mini"
                          type="text"
                          icon={<IconEdit />}
                          onClick={() => handleOpenVersionDrawer(standard, false)}
                        />
                      </Tooltip>
                      <Tooltip content="基于此版本派生克隆">
                        <Button
                          size="mini"
                          type="text"
                          icon={<IconCopy />}
                          onClick={() => handleOpenVersionDrawer(standard, true)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="确认删除该标准版本？"
                        onOk={() => handleDeleteVersion(standard.id)}
                      >
                        <Tooltip content="删除版本">
                          <Button
                            size="mini"
                            type="text"
                            status="danger"
                            icon={<IconDelete />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  </div>
                </div>
              );
            })}

            {filteredStandards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-4)' }}>
                未找到匹配的标准版本
              </div>
            )}
          </Space>
        </Card>

        {/* 右侧：标准核心工作台 Detail */}
        <div>
          <Card>
            {selectedStandard ? (
              <Tabs
                activeTab={activeTab}
                onChange={(key) => setActiveTab(key as typeof activeTab)}
                type="card"
                extra={
                  <Space>
                    <Tag color="arcoblue" style={{ fontWeight: 500 }}>
                      当前选中: {selectedStandard.name}
                    </Tag>
                  </Space>
                }
              >
                {/* Tab 1: 费用标准明细规则表 */}
                <TabPane
                  key="rules"
                  title={
                    <Space size={4}>
                      <IconFile />
                      <span>规则明细矩阵 ({filteredDetails.length})</span>
                    </Space>
                  }
                >
                  <div style={{ padding: '8px 0' }}>
                    {/* 顶部多维筛选与操作栏 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Space wrap>
                        <Input
                          prefix={<IconSearch />}
                          placeholder="快速搜索职级/城市/房型..."
                          allowClear
                          value={ruleSearch}
                          onChange={setRuleSearch}
                          style={{ width: 200 }}
                          size="small"
                        />
                        <Select
                          placeholder="职级筛选"
                          value={ruleLevelFilter}
                          onChange={setRuleLevelFilter}
                          style={{ width: 110 }}
                          size="small"
                        >
                          <Option value="all">全部职级</Option>
                          {ALL_LEVELS.map((lvl) => (
                            <Option key={lvl} value={lvl}>{lvl}</Option>
                          ))}
                        </Select>
                        <Select
                          placeholder="城市等级"
                          value={ruleCityFilter}
                          onChange={setRuleCityFilter}
                          style={{ width: 140 }}
                          size="small"
                        >
                          <Option value="all">全部城市等级</Option>
                          {CITY_LEVEL_OPTIONS.map((c) => (
                            <Option key={c.value} value={c.value}>{c.label.split(' ')[0]}</Option>
                          ))}
                        </Select>
                        {(ruleSearch || ruleLevelFilter !== 'all' || ruleCityFilter !== 'all') && (
                          <Button
                            size="small"
                            type="text"
                            onClick={() => {
                              setRuleSearch('');
                              setRuleLevelFilter('all');
                              setRuleCityFilter('all');
                            }}
                          >
                            清空筛选
                          </Button>
                        )}
                      </Space>

                      <Space>
                        <Button
                          type="primary"
                          icon={<IconPlus />}
                          size="small"
                          onClick={() => handleOpenRuleDrawer()}
                        >
                          新增规则明细
                        </Button>
                      </Space>
                    </div>

                    {/* 明细表格 */}
                    <Table
                      columns={columns}
                      data={filteredDetails}
                      rowKey="id"
                      pagination={{ pageSize: 8, showTotal: true }}
                      scroll={{ x: 1000 }}
                    />
                  </div>
                </TabPane>

                {/* Tab 2: 差旅标准试算器 */}
                <TabPane
                  key="calculator"
                  title={
                    <Space size={4}>
                      <IconExperiment />
                      <span>差旅合规模拟试算器</span>
                    </Space>
                  }
                >
                  <div className="travel-calculator-panel">
                    <Alert
                      type="info"
                      style={{ marginBottom: 16 }}
                      title="差旅政策即时精算器"
                      content="根据当前基准费用标准，输入员工职级、目的地、出差天数即可一键推导合规舱位、住宿上限、津贴总计与风控红线，支持一键复制到审批申请单。"
                    />

                    <Row gutter={24}>
                      {/* 左侧试算输入 */}
                      <Col span={10}>
                        <Card title="试算输入条件" size="small">
                          <Space direction="vertical" size={14} style={{ width: '100%' }}>
                            <div>
                              <div style={{ marginBottom: 6 }}><Text>申请人员工职级</Text></div>
                              <Select
                                value={calcLevel}
                                onChange={setCalcLevel}
                                style={{ width: '100%' }}
                              >
                                {ALL_LEVELS.map((lvl) => (
                                  <Option key={lvl} value={lvl}>{lvl} 职级员工</Option>
                                ))}
                              </Select>
                            </div>

                            <div>
                              <div style={{ marginBottom: 6 }}><Text>出差目的地城市等级</Text></div>
                              <Select
                                value={calcCityLevel}
                                onChange={setCalcCityLevel}
                                style={{ width: '100%' }}
                              >
                                {CITY_LEVEL_OPTIONS.map((opt) => (
                                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                                ))}
                              </Select>
                            </div>

                            <Row gutter={12}>
                              <Col span={12}>
                                <div><Text>出差天数 (天)</Text></div>
                                <InputNumber
                                  min={1}
                                  max={60}
                                  value={calcDays}
                                  onChange={(val) => {
                                    setCalcDays(val || 1);
                                    if ((val || 1) > 1) {
                                      setCalcNights((val || 1) - 1);
                                    }
                                  }}
                                  style={{ width: '100%', marginTop: 6 }}
                                />
                              </Col>
                              <Col span={12}>
                                <div><Text>住宿晚数 (晚)</Text></div>
                                <InputNumber
                                  min={0}
                                  max={60}
                                  value={calcNights}
                                  onChange={(val) => setCalcNights(val ?? 0)}
                                  style={{ width: '100%', marginTop: 6 }}
                                />
                              </Col>
                            </Row>

                            <div>
                              <div style={{ marginBottom: 6 }}><Text>首选出行交通工具</Text></div>
                              <Radio.Group
                                value={calcTransportMode}
                                onChange={setCalcTransportMode}
                                type="button"
                                style={{ width: '100%', display: 'flex' }}
                              >
                                <Radio value="highSpeedRail" style={{ flex: 1, textAlign: 'center' }}>高铁/动车</Radio>
                                <Radio value="airplane" style={{ flex: 1, textAlign: 'center' }}>民航客机</Radio>
                                <Radio value="selfDrive" style={{ flex: 1, textAlign: 'center' }}>自驾出行</Radio>
                              </Radio.Group>
                            </div>
                          </Space>
                        </Card>
                      </Col>

                      {/* 右侧推导结果 */}
                      <Col span={14}>
                        {simulationResult ? (
                          <div className="travel-calculator-result">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <Title heading={6} style={{ margin: 0, color: 'rgb(var(--primary-7))' }}>
                                  费用标准测算结果
                                </Title>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  基准版本：{selectedStandard.name} · 适用职级：{calcLevel}
                                </Text>
                              </div>
                              <Button
                                type="primary"
                                size="small"
                                icon={<IconCopy />}
                                onClick={handleCopySimulationText}
                              >
                                复制测算单
                              </Button>
                            </div>

                            {/* 核心指标方块 */}
                            <div className="travel-calculator-stat-box">
                              <div className="travel-calculator-stat">
                                <div className="travel-calculator-stat__label">交通合规座席</div>
                                <div className="travel-calculator-stat__val" style={{ fontSize: 14 }}>
                                  {simulationResult.allowedSeat}
                                </div>
                                <div className="travel-calculator-stat__sub">合规上限标准</div>
                              </div>

                              <div className="travel-calculator-stat">
                                <div className="travel-calculator-stat__label">住宿报销限额</div>
                                <div className="travel-calculator-stat__val">
                                  {formatCurrency(simulationResult.hotelTotal)}
                                </div>
                                <div className="travel-calculator-stat__sub">
                                  {formatCurrency(simulationResult.hotelLimitPerNight)}/晚 × {calcNights}晚
                                </div>
                              </div>

                              <div className="travel-calculator-stat">
                                <div className="travel-calculator-stat__label">出差包干津贴</div>
                                <div className="travel-calculator-stat__val">
                                  {formatCurrency(simulationResult.subsidyTotal)}
                                </div>
                                <div className="travel-calculator-stat__sub">
                                  {formatCurrency(simulationResult.subsidyPerDay)}/天 × {calcDays}天
                                </div>
                              </div>

                              <div className="travel-calculator-stat">
                                <div className="travel-calculator-stat__label">除大交通控制额</div>
                                <div className="travel-calculator-stat__val" style={{ color: 'rgb(var(--green-7))' }}>
                                  {formatCurrency(simulationResult.totalEstimated)}
                                </div>
                                <div className="travel-calculator-stat__sub">含住宿+津贴+公杂</div>
                              </div>
                            </div>

                            {/* 政策红线说明 */}
                            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--color-bg-2)', borderRadius: 6 }}>
                              <Text style={{ fontWeight: 600, fontSize: 12 }}>政策合规指引与风险防范：</Text>
                              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.8 }}>
                                <li>
                                  <strong>房型与超标处理</strong>：默认允许预订【{simulationResult.roomType}】。若遇旺季或大型展会房费超标，需提前于系统发起《特殊时期差旅超标预先核准单》。
                                </li>
                                <li>
                                  <strong>综合津贴计发</strong>：出差津贴按自然天数核算（计发 {calcDays} 天），由财务随报销单统一发放，无需提供餐饮或发票凭单。
                                </li>
                                <li>
                                  <strong>市内交通与自驾</strong>：单日市内交通上限为 {formatCurrency(simulationResult.localTransportPerDay)}/天；自驾公差报销需上传里程表始末仪表照片与高速路通行发票。
                                </li>
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-4)' }}>
                            未能根据当前条件匹配到规则明细
                          </div>
                        )}
                      </Col>
                    </Row>
                  </div>
                </TabPane>

                {/* Tab 3: 版本差异比对 */}
                <TabPane
                  key="comparison"
                  title={
                    <Space size={4}>
                      <IconSwap />
                      <span>版本差异对比</span>
                    </Space>
                  }
                >
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <Text style={{ fontWeight: 600 }}>基准对比版本：</Text>
                      <Tag color="arcoblue">{selectedStandard.name} (当前)</Tag>
                      <IconSwap style={{ color: 'var(--color-text-3)' }} />
                      <Text style={{ fontWeight: 600 }}>目标比对版本：</Text>
                      <Select
                        value={compareTargetId}
                        onChange={setCompareTargetId}
                        style={{ width: 260 }}
                        size="small"
                      >
                        {standards
                          .filter((s) => s.id !== selectedStandard.id)
                          .map((s) => (
                            <Option key={s.id} value={s.id}>
                              {s.name} ({s.effectiveDate})
                            </Option>
                          ))}
                      </Select>
                    </div>

                    {compareStandard ? (
                      <Card size="small" title="版本核心指标调整概览">
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                          <Col span={6}>
                            <div className="travel-calculator-stat">
                              <div className="travel-calculator-stat__label">规则条目对比</div>
                              <div className="travel-calculator-stat__val" style={{ fontSize: 14 }}>
                                {selectedStandard.details.length} 条 vs {compareStandard.details.length} 条
                              </div>
                              <div className="travel-calculator-stat__sub">
                                差异 {selectedStandard.details.length - compareStandard.details.length >= 0 ? '+' : ''}
                                {selectedStandard.details.length - compareStandard.details.length} 条
                              </div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="travel-calculator-stat">
                              <div className="travel-calculator-stat__label">最高住宿标准变动</div>
                              <div className="travel-calculator-stat__val" style={{ fontSize: 14 }}>
                                {formatCurrency(maxHotelLimit)} vs {formatCurrency(compareStandard.details.reduce((m, d) => Math.max(m, d.hotelLimit ?? 0), 0))}
                              </div>
                              <div className="travel-calculator-stat__sub">
                                变动幅额：{formatCurrency(maxHotelLimit - compareStandard.details.reduce((m, d) => Math.max(m, d.hotelLimit ?? 0), 0))}
                              </div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="travel-calculator-stat">
                              <div className="travel-calculator-stat__label">出差综合补贴峰值</div>
                              <div className="travel-calculator-stat__val" style={{ fontSize: 14 }}>
                                {formatCurrency(maxSubsidy)}/天 vs {formatCurrency(compareStandard.details.reduce((m, d) => Math.max(m, d.subsidyAmount ?? 0), 0))}/天
                              </div>
                              <div className="travel-calculator-stat__sub">高管与骨干津贴标准</div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="travel-calculator-stat">
                              <div className="travel-calculator-stat__label">生效时间跨度</div>
                              <div className="travel-calculator-stat__val" style={{ fontSize: 12 }}>
                                {selectedStandard.effectiveDate} 起
                              </div>
                              <div className="travel-calculator-stat__sub">
                                比对版本：{compareStandard.effectiveDate}
                              </div>
                            </div>
                          </Col>
                        </Row>

                        {/* 跨版本规则明细横向对照表 */}
                        <Table
                          rowKey="cityLevel"
                          pagination={false}
                          data={CITY_LEVEL_OPTIONS.map((city) => {
                            const curL4 = selectedStandard.details.find(
                              (d) => d.cityLevels.includes(city.value) && (d.levels.includes('L4') || d.levels.includes('L1'))
                            );
                            const cmpL4 = compareStandard.details.find(
                              (d) => d.cityLevels.includes(city.value) && (d.levels.includes('L4') || d.levels.includes('L1'))
                            );
                            return {
                              cityLevel: city.value,
                              cityName: city.label,
                              curHotel: curL4?.hotelLimit ?? 0,
                              cmpHotel: cmpL4?.hotelLimit ?? 0,
                              curSubsidy: curL4?.subsidyAmount ?? 0,
                              cmpSubsidy: cmpL4?.subsidyAmount ?? 0,
                              curTransport: curL4?.localTransportLimit ?? 0,
                              cmpTransport: cmpL4?.localTransportLimit ?? 0,
                            };
                          })}
                          columns={[
                            {
                              title: '城市等级',
                              dataIndex: 'cityName',
                              width: 180,
                            },
                            {
                              title: '骨干/高管住宿限额 (当前 vs 对比)',
                              render: (_: unknown, row: { curHotel: number; cmpHotel: number }) => {
                                const diff = row.curHotel - row.cmpHotel;
                                return (
                                  <Space>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(row.curHotel)}</span>
                                    <Text type="secondary">vs {formatCurrency(row.cmpHotel)}</Text>
                                    {diff !== 0 && (
                                      <Tag color={diff > 0 ? 'green' : 'red'} size="small">
                                        {diff > 0 ? `+¥${diff}` : `-¥${Math.abs(diff)}`}
                                      </Tag>
                                    )}
                                  </Space>
                                );
                              },
                            },
                            {
                              title: '单日综合津贴 (当前 vs 对比)',
                              render: (_: unknown, row: { curSubsidy: number; cmpSubsidy: number }) => {
                                const diff = row.curSubsidy - row.cmpSubsidy;
                                return (
                                  <Space>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(row.curSubsidy)}/天</span>
                                    <Text type="secondary">vs {formatCurrency(row.cmpSubsidy)}/天</Text>
                                    {diff !== 0 && (
                                      <Tag color={diff > 0 ? 'green' : 'red'} size="small">
                                        {diff > 0 ? `+¥${diff}` : `-¥${Math.abs(diff)}`}
                                      </Tag>
                                    )}
                                  </Space>
                                );
                              },
                            },
                            {
                              title: '市内交通包干 (当前 vs 对比)',
                              render: (_: unknown, row: { curTransport: number; cmpTransport: number }) => {
                                const diff = row.curTransport - row.cmpTransport;
                                return (
                                  <Space>
                                    <span>{formatCurrency(row.curTransport)}</span>
                                    <Text type="secondary">vs {formatCurrency(row.cmpTransport)}</Text>
                                    {diff !== 0 && (
                                      <Tag color={diff > 0 ? 'green' : 'red'} size="small">
                                        {diff > 0 ? `+¥${diff}` : `-¥${Math.abs(diff)}`}
                                      </Tag>
                                    )}
                                  </Space>
                                );
                              },
                            },
                          ]}
                        />
                      </Card>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-4)' }}>
                        请选择一个有效的比对版本
                      </div>
                    )}
                  </div>
                </TabPane>
              </Tabs>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-4)' }}>
                请选择左侧标准版本查看详情
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 版本新建/编辑/克隆抽屉 */}
      <Drawer
        title={isCloning ? '克隆派生新标准版本' : versionForm.getFieldValue('id') ? '编辑标准版本' : '新增标准版本'}
        visible={versionDrawerVisible}
        onOk={handleSaveVersion}
        onCancel={() => setVersionDrawerVisible(false)}
        width={460}
        okText="保存版本"
        cancelText="取消"
      >
        <Form form={versionForm} layout="vertical">
          <Form.Item
            label="标准版本名称"
            field="name"
            rules={[{ required: true, message: '请输入标准版本名称' }]}
          >
            <Input placeholder="如：2027年差旅费用标准（优化版）" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="生效日期"
                field="effectiveDate"
                rules={[{ required: true, message: '请选择生效日期' }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="失效日期 (可选)" field="expiryDate">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="发布状态" field="status" initialValue="inactive">
            <Radio.Group type="button">
              <Radio value="active">正式启用 (生效中)</Radio>
              <Radio value="inactive">拟定草稿 / 归档</Radio>
            </Radio.Group>
          </Form.Item>

          {isCloning && selectedStandard && (
            <Alert
              type="info"
              title="派生模式提示"
              content={`本次将全量复制「${selectedStandard.name}」中的全部 ${selectedStandard.details.length} 条明细规则作为新版本基底，保存后可在此基础上自由增删修改。`}
            />
          )}
        </Form>
      </Drawer>

      {/* 规则明细编辑/新增抽屉 */}
      <Drawer
        title={editingRuleId ? '编辑标准明细规则' : '新增标准明细规则'}
        visible={ruleDrawerVisible}
        onOk={handleSaveRule}
        onCancel={() => setRuleDrawerVisible(false)}
        width={560}
        okText="保存规则"
        cancelText="取消"
      >
        <Form form={ruleForm} layout="vertical">
          {/* 维度 1: 适用职级 */}
          <Form.Item
            label="适用职级范围 (多选)"
            field="levels"
            rules={[{ required: true, message: '请至少选择一个职级' }]}
            extra={
              <Space size={6} style={{ marginTop: 4 }}>
                <Button
                  size="mini"
                  type="text"
                  onClick={() => ruleForm.setFieldValue('levels', ALL_LEVELS)}
                >
                  全选职级
                </Button>
                <Button
                  size="mini"
                  type="text"
                  onClick={() => ruleForm.setFieldValue('levels', ['L1', 'L2', 'L3'])}
                >
                  高管组 (L1-L3)
                </Button>
                <Button
                  size="mini"
                  type="text"
                  onClick={() => ruleForm.setFieldValue('levels', ['L4', 'L5', 'L6'])}
                >
                  骨干组 (L4-L6)
                </Button>
                <Button
                  size="mini"
                  type="text"
                  onClick={() => ruleForm.setFieldValue('levels', ['L7', 'L8', 'L9', 'L10'])}
                >
                  基层组 (L7-L10)
                </Button>
              </Space>
            }
          >
            <Select mode="multiple" placeholder="选择适用职级" allowClear>
              {ALL_LEVELS.map((lvl) => (
                <Option key={lvl} value={lvl}>{lvl}</Option>
              ))}
            </Select>
          </Form.Item>

          {/* 维度 2: 适用城市等级 */}
          <Form.Item
            label="适用城市等级"
            field="cityLevels"
            rules={[{ required: true, message: '请选择适用城市等级' }]}
          >
            <Select mode="multiple" placeholder="选择适用城市等级">
              {CITY_LEVEL_OPTIONS.map((c) => (
                <Option key={c.value} value={c.value}>{c.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />
          <Title heading={6} style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--color-text-2)' }}>
            交通与出行准乘标准
          </Title>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="高铁座席" field="highSpeedRailClass" initialValue="second">
                <Select>
                  <Option value="second">二等座</Option>
                  <Option value="first">一等座</Option>
                  <Option value="business">商务座</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="动车座席" field="bulletTrainClass" initialValue="second">
                <Select>
                  <Option value="second">二等座</Option>
                  <Option value="first">一等座</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="民航客机舱位" field="airplaneClass" initialValue="economy">
                <Select>
                  <Option value="economy">经济舱</Option>
                  <Option value="business">商务舱</Option>
                  <Option value="first">头等舱</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="自驾补贴单价 (元/公里)" field="selfDriveRate">
                <InputNumber min={0} step={0.1} placeholder="如：0.6" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="市内交通包干上限 (元/天)" field="localTransportLimit">
                <InputNumber min={0} step={10} placeholder="如：50" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />
          <Title heading={6} style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--color-text-2)' }}>
            住宿与餐饮招待标准
          </Title>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="住宿上限金额 (元/晚)"
                field="hotelLimit"
                rules={[{ required: true, message: '请输入住宿上限' }]}
              >
                <InputNumber min={0} step={50} placeholder="如：400" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="推荐房型限制" field="hotelRoomType" initialValue="标准间">
                <Input placeholder="如：标准间、单人间" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="日常餐补额度 (元/天)" field="mealAllowance">
                <InputNumber min={0} step={10} placeholder="如：80" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="业务招待餐标上限 (元/次)" field="entertainmentMealLimit">
                <InputNumber min={0} step={50} placeholder="如：200" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />
          <Title heading={6} style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--color-text-2)' }}>
            出差综合津贴与通讯公杂
          </Title>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="出差津贴金额 (元/天)"
                field="subsidyAmount"
                rules={[{ required: true, message: '请输入出差津贴' }]}
              >
                <InputNumber min={0} step={10} placeholder="如：120" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="津贴计发模式" field="subsidyCalcMode" initialValue="calendar_day">
                <Select>
                  <Option value="calendar_day">按自然天数 (全勤计发)</Option>
                  <Option value="work_day">按工作日 (剔除法定假日)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="通讯补贴 (元/天)" field="communicationAllowance">
                <InputNumber min={0} step={5} placeholder="如：15" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="公杂补贴 (元/天)" field="miscellaneousAllowance">
                <InputNumber min={0} step={5} placeholder="如：20" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </PageShell>
  );
}
