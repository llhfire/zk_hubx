import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Typography,
  Message,
  Tag,
  DatePicker,
  Radio,
  Checkbox,
  Tooltip,
  Modal,
} from '@arco-design/web-react';
import {
  IconSave,
  IconSend,
  IconPlus,
  IconClose,
  IconThunderbolt,
  IconFile,
  IconCheck,
  IconSafe,
  IconClockCircle,
  IconInfoCircle,
} from '@arco-design/web-react/icon';
import {
  Airplane,
  Train,
  Car,
  Bus,
  Buildings,
  HouseLine,
  Bed,
  Sparkle,
  Suitcase,
  Users,
  Wallet,
  ArrowRight,
  UploadSimple,
  Trash,
} from '@phosphor-icons/react';
import type { Trip, TransportMode, AccommodationType } from '../types';
import { createTrip } from '../travel-api';
import { TravelRuleEngine } from '../components/TravelRuleEngine';
import {
  PageBreadcrumb,
  PageHeader,
  PageShell,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '../../../../components/ui';
import './tripForm.css';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 常用目的地快捷标签
const POPULAR_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安'];

// 出差目的快捷场景
const PURPOSE_SHORTCUTS = [
  '客户拜访与商务洽谈',
  '项目驻场实施与系统交付',
  '参加行业峰会与技术论坛',
  '售前技术支持与方案澄清',
  '分支机构季度业务巡检',
];

// 交通方式磁贴配置
const TRANSPORT_OPTIONS: {
  value: TransportMode;
  title: string;
  desc: string;
  icon: (size: number) => JSX.Element;
}[] = [
  {
    value: 'high_speed_rail',
    title: '高铁/动车',
    desc: '推荐中短途差旅',
    icon: (size) => <Train size={size} weight="duotone" />,
  },
  {
    value: 'airplane',
    title: '飞机',
    desc: '长途与紧急差旅',
    icon: (size) => <Airplane size={size} weight="duotone" />,
  },
  {
    value: 'self_drive',
    title: '自驾/租车',
    desc: '多地辗转或运货',
    icon: (size) => <Car size={size} weight="duotone" />,
  },
  {
    value: 'bus',
    title: '客运大巴',
    desc: '短途联络客运',
    icon: (size) => <Bus size={size} weight="duotone" />,
  },
];

// 真实客户与项目模拟字典
const MOCK_CUSTOMERS = [
  { id: 'cust-001', name: '阿里巴巴（中国）有限公司' },
  { id: 'cust-002', name: '腾讯科技（深圳）有限公司' },
  { id: 'cust-003', name: '字节跳动（中国）有限公司' },
  { id: 'cust-004', name: '美团点评' },
  { id: 'cust-005', name: '百度在线网络技术（北京）有限公司' },
  { id: 'cust-006', name: '华为技术有限公司' },
];

const MOCK_PROJECTS = [
  { id: 'proj-001', name: '阿里巴巴-企业管理系统', customerId: 'cust-001' },
  { id: 'proj-002', name: '腾讯-微信支付接入', customerId: 'cust-002' },
  { id: 'proj-003', name: '字节-飞书集成项目', customerId: 'cust-003' },
  { id: 'proj-004', name: '美团-供应链协同平台', customerId: 'cust-004' },
  { id: 'proj-005', name: '百度-智能搜索算法驻场', customerId: 'cust-005' },
  { id: 'proj-006', name: '华为-鸿蒙智联交付二期', customerId: 'cust-006' },
];

export function TripForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 表单核心数据
  const [form, setForm] = useState({
    purpose: '',
    customerId: '',
    customerName: '',
    projectId: '',
    projectName: '',
    department: '销售部',
    departureCity: '北京',
    destinations: ['杭州'] as string[],
    destinationInput: '',
    startDate: '2026-09-10',
    endDate: '2026-09-13',
    transportModes: ['high_speed_rail'] as TransportMode[],
    accommodationIntent: 'hotel' as AccommodationType,
    companions: [] as { name: string; gender: 'male' | 'female' }[],
    companionNameInput: '',
    companionGenderInput: 'male' as 'male' | 'female',
    estimatedTransportCost: 1100,
    estimatedAccommodationCost: 1050,
    estimatedMealCost: 120,
    estimatedOtherCost: 100,
    needLoan: false,
    loanAmount: 2000,
    loanReason: '差旅期间交通与住宿备用金',
    hasApprovalScreenshot: false,
    attachments: [] as { id: string; name: string; size: string }[],
  });

  // 计算出差自然天数与晚数
  const days = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [form.startDate, form.endDate]);

  const nights = useMemo(() => Math.max(0, days - 1), [days]);

  // 计算预计总费用
  const totalCost = useMemo(() => {
    return (
      (form.estimatedTransportCost || 0) +
      (form.estimatedAccommodationCost || 0) +
      (form.estimatedMealCost || 0) +
      (form.estimatedOtherCost || 0)
    );
  }, [
    form.estimatedTransportCost,
    form.estimatedAccommodationCost,
    form.estimatedMealCost,
    form.estimatedOtherCost,
  ]);

  // 日均成本
  const dailyAverageCost = useMemo(() => {
    return days > 0 ? Math.round(totalCost / days) : 0;
  }, [totalCost, days]);

  // 目的地添加/移除
  const handleAddDestination = (city: string) => {
    const trimmed = city.trim();
    if (trimmed && !form.destinations.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        destinations: [...prev.destinations, trimmed],
        destinationInput: '',
      }));
    }
  };

  const handleRemoveDestination = (index: number) => {
    setForm((prev) => ({
      ...prev,
      destinations: prev.destinations.filter((_, i) => i !== index),
    }));
  };

  // 切换交通方式
  const handleToggleTransport = (mode: TransportMode) => {
    setForm((prev) => {
      const exists = prev.transportModes.includes(mode);
      const nextModes = exists
        ? prev.transportModes.filter((m) => m !== mode)
        : [...prev.transportModes, mode];
      return {
        ...prev,
        transportModes: nextModes.length > 0 ? nextModes : [mode],
      };
    });
  };

  // 同行人添加/移除
  const handleAddCompanion = () => {
    const name = form.companionNameInput.trim();
    if (name && !form.companions.some((c) => c.name === name)) {
      setForm((prev) => ({
        ...prev,
        companions: [
          ...prev.companions,
          { name, gender: form.companionGenderInput },
        ],
        companionNameInput: '',
      }));
    }
  };

  const handleRemoveCompanion = (index: number) => {
    setForm((prev) => ({
      ...prev,
      companions: prev.companions.filter((_, i) => i !== index),
    }));
  };

  // 模拟附件添加
  const handleSimulateUpload = () => {
    const mockFile = {
      id: `att-${Date.now()}`,
      name: `出差报备审批与邀请函_${new Date().toISOString().slice(0, 10)}.png`,
      size: '1.8 MB',
    };
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, mockFile],
      hasApprovalScreenshot: true,
    }));
    Message.success('已模拟上传报备截图材料');
  };

  const handleRemoveAttachment = (id: string) => {
    setForm((prev) => {
      const filtered = prev.attachments.filter((a) => a.id !== id);
      return {
        ...prev,
        attachments: filtered,
        hasApprovalScreenshot: filtered.length > 0,
      };
    });
  };

  // ⚡ 智能按标准自动测算费用
  const handleAutoEstimate = () => {
    if (!form.destinations.length) {
      Message.warning('请先指定目的地以匹配城市差旅标准');
      return;
    }
    const dest = form.destinations[0] || '北京';
    const isFirstTier = ['北京', '上海', '广州', '深圳'].includes(dest);
    const hotelRate = isFirstTier ? 500 : 350;
    const localDaily = isFirstTier ? 80 : 50;

    // 交通基准费
    let transportBase = 800;
    if (form.transportModes.includes('airplane')) transportBase = 1600;
    else if (form.transportModes.includes('high_speed_rail')) transportBase = 900;
    else if (form.transportModes.includes('self_drive')) transportBase = 600;

    const transportTotal = transportBase + localDaily * Math.max(1, days);
    const accommodationTotal =
      form.accommodationIntent === 'hotel' ? hotelRate * nights : 0;
    const mealTotal = 40 * Math.max(0, days - 1);
    const otherTotal = 100;

    setForm((prev) => ({
      ...prev,
      estimatedTransportCost: transportTotal,
      estimatedAccommodationCost: accommodationTotal,
      estimatedMealCost: mealTotal,
      estimatedOtherCost: otherTotal,
    }));

    Message.success(`已根据「${dest}」企业差旅标准与 ${days} 天出差周期智能测算！`);
  };

  // 快捷模版导入
  const handleApplyTemplate = (type: 'ali' | 'sh' | 'sz') => {
    if (type === 'ali') {
      setForm({
        ...form,
        purpose: '阿里巴巴-企业管理系统项目驻场交付与技术联调',
        customerId: 'cust-001',
        customerName: '阿里巴巴（中国）有限公司',
        projectId: 'proj-001',
        projectName: '阿里巴巴-企业管理系统',
        departureCity: '北京',
        destinations: ['杭州'],
        startDate: '2026-09-15',
        endDate: '2026-09-21',
        transportModes: ['high_speed_rail'],
        accommodationIntent: 'hotel',
        estimatedTransportCost: 1100,
        estimatedAccommodationCost: 2100,
        estimatedMealCost: 240,
        estimatedOtherCost: 150,
        needLoan: true,
        loanAmount: 3000,
        loanReason: '7天驻场差旅周转备用金',
      });
      Message.success('已应用「杭州阿里 7 天驻场交付」标准模板');
    } else if (type === 'sh') {
      setForm({
        ...form,
        purpose: '上海重点客户半年度商务洽谈与合同推进',
        customerId: 'cust-004',
        customerName: '美团点评',
        projectId: 'proj-004',
        projectName: '美团-供应链协同平台',
        departureCity: '北京',
        destinations: ['上海'],
        startDate: '2026-09-12',
        endDate: '2026-09-13',
        transportModes: ['high_speed_rail'],
        accommodationIntent: 'hotel',
        estimatedTransportCost: 1200,
        estimatedAccommodationCost: 500,
        estimatedMealCost: 80,
        estimatedOtherCost: 100,
        needLoan: false,
        loanAmount: 0,
        loanReason: '',
      });
      Message.success('已应用「上海 2 天客户商务洽谈」标准模板');
    } else {
      setForm({
        ...form,
        purpose: '大湾区智能硬件与物联技术论坛参会与方案展出',
        customerId: 'cust-002',
        customerName: '腾讯科技（深圳）有限公司',
        projectId: 'proj-002',
        projectName: '腾讯-微信支付接入',
        departureCity: '北京',
        destinations: ['深圳'],
        startDate: '2026-09-18',
        endDate: '2026-09-20',
        transportModes: ['airplane'],
        accommodationIntent: 'hotel',
        estimatedTransportCost: 2400,
        estimatedAccommodationCost: 1000,
        estimatedMealCost: 120,
        estimatedOtherCost: 200,
        needLoan: true,
        loanAmount: 3500,
        loanReason: '深圳展会与客户拜访备用金',
      });
      Message.success('已应用「深圳 3 天展会与客户交流」标准模板');
    }
  };

  // 提交/存草稿统一校验
  const validateForm = () => {
    if (!form.purpose.trim()) {
      Message.error('请填写出差目的');
      return false;
    }
    if (!form.destinations.length) {
      Message.error('请指定至少一个出差目的地');
      return false;
    }
    if (!form.startDate || !form.endDate) {
      Message.error('请选择出差行程日期');
      return false;
    }
    if (form.needLoan && (!form.loanAmount || form.loanAmount <= 0)) {
      Message.error('需要借款时请输入合法的借款金额');
      return false;
    }
    return true;
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await createTrip({
        purpose: form.purpose,
        customerId: form.customerId,
        customerName: form.customerName,
        projectId: form.projectId,
        projectName: form.projectName,
        department: form.department,
        destinations: form.destinations,
        startDate: form.startDate,
        endDate: form.endDate,
        days,
        transportModes: form.transportModes,
        accommodationIntent: form.accommodationIntent,
        companions: form.companions.map((c) => c.name),
        estimatedTransportCost: form.estimatedTransportCost,
        estimatedAccommodationCost: form.estimatedAccommodationCost,
        estimatedMealCost: form.estimatedMealCost,
        estimatedOtherCost: form.estimatedOtherCost,
        estimatedTotalCost: totalCost,
        needLoan: form.needLoan,
        loanAmount: form.needLoan ? form.loanAmount : 0,
        loanReason: form.loanReason,
        status: 'draft',
      });
      Message.success('出差申请草稿已成功保存');
      navigate('/travel/trips');
    } catch {
      Message.error('保存草稿失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 提交申请
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await createTrip({
        purpose: form.purpose,
        customerId: form.customerId,
        customerName: form.customerName,
        projectId: form.projectId,
        projectName: form.projectName,
        department: form.department,
        destinations: form.destinations,
        startDate: form.startDate,
        endDate: form.endDate,
        days,
        transportModes: form.transportModes,
        accommodationIntent: form.accommodationIntent,
        companions: form.companions.map((c) => c.name),
        estimatedTransportCost: form.estimatedTransportCost,
        estimatedAccommodationCost: form.estimatedAccommodationCost,
        estimatedMealCost: form.estimatedMealCost,
        estimatedOtherCost: form.estimatedOtherCost,
        estimatedTotalCost: totalCost,
        needLoan: form.needLoan,
        loanAmount: form.needLoan ? form.loanAmount : 0,
        loanReason: form.loanReason,
        status: 'pending',
      });
      Message.success('出差申请已提交，已进入审批流');
      navigate('/travel/trips');
    } catch {
      Message.error('提交出差申请失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="trip-form-container">
      <PageBreadcrumb
        items={[
          { label: '差旅管理', to: '/travel/trips' },
          { label: '出差申请', to: '/travel/trips' },
          { label: '新建出差申请' },
        ]}
      />

      <PageHeader
        title="新建出差申请"
        description="填写关联对象、行程安排、费用预估与借款需求，结合企业差旅标准进行智能核算与审批流转。"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              placeholder="⚡ 快速导入常用模板"
              style={{ width: 220 }}
              onChange={(val) => handleApplyTemplate(val as 'ali' | 'sh' | 'sz')}
              triggerElement={
                <Button icon={<IconThunderbolt />}>
                  快速应用模板 <IconPlus style={{ marginLeft: 4 }} />
                </Button>
              }
            >
              <Option value="ali">杭州阿里驻场交付（7天·高铁）</Option>
              <Option value="sh">上海客户商务洽谈（2天·高铁）</Option>
              <Option value="sz">深圳行业峰会交流（3天·飞机）</Option>
            </Select>
          </div>
        }
      />

      <ProcessWorkspace>
        {/* 左侧 70% 主工作区表单流 */}
        <ProcessWorkspaceMain>
          {/* 1. 事由与归属 */}
          <div className="trip-form-section">
            <div className="trip-form-section__header">
              <div className="trip-form-section__title-wrap">
                <span className="trip-form-section__badge">1</span>
                <div>
                  <h3 className="trip-form-section__title">事由与归属</h3>
                  <span className="trip-form-section__subtitle">
                    明确出差目的、关联商业客户与项目载体
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-1)' }}>
                    出差目的 <span style={{ color: '#f53f3f' }}>*</span>
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                    可选择快捷场景快速填入
                  </span>
                </div>
                <Input.TextArea
                  placeholder="请填写出差目的（如：与客户进行项目季度验收与技术培训）"
                  rows={3}
                  value={form.purpose}
                  onChange={(val) => setForm((prev) => ({ ...prev, purpose: val }))}
                />
                <div className="trip-form-quick-bar">
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>快捷场景：</span>
                  {PURPOSE_SHORTCUTS.map((p) => (
                    <span
                      key={p}
                      className="trip-form-quick-pill"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          purpose: prev.purpose ? `${prev.purpose}；${p}` : p,
                        }))
                      }
                    >
                      + {p}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                    关联客户
                  </label>
                  <Select
                    placeholder="选择关联客户（可选）"
                    allowClear
                    showSearch
                    value={form.customerId || undefined}
                    onChange={(val) => {
                      const selected = MOCK_CUSTOMERS.find((c) => c.id === val);
                      setForm((prev) => ({
                        ...prev,
                        customerId: val || '',
                        customerName: selected ? selected.name : '',
                      }));
                    }}
                  >
                    {MOCK_CUSTOMERS.map((cust) => (
                      <Option key={cust.id} value={cust.id}>
                        {cust.name}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                    关联项目
                  </label>
                  <Select
                    placeholder="选择关联项目（可选）"
                    allowClear
                    showSearch
                    value={form.projectId || undefined}
                    onChange={(val) => {
                      const selected = MOCK_PROJECTS.find((p) => p.id === val);
                      setForm((prev) => ({
                        ...prev,
                        projectId: val || '',
                        projectName: selected ? selected.name : '',
                      }));
                    }}
                  >
                    {MOCK_PROJECTS.map((proj) => (
                      <Option key={proj.id} value={proj.id}>
                        {proj.name}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                    所属部门 <span style={{ color: '#f53f3f' }}>*</span>
                  </label>
                  <Select
                    value={form.department}
                    onChange={(val) => setForm((prev) => ({ ...prev, department: val }))}
                  >
                    <Option value="销售部">销售部</Option>
                    <Option value="技术部">技术部</Option>
                    <Option value="市场部">市场部</Option>
                    <Option value="行政部">行政部</Option>
                    <Option value="财务部">财务部</Option>
                    <Option value="产品部">产品部</Option>
                    <Option value="运营部">运营部</Option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 行程规划与交通偏好 */}
          <div className="trip-form-section">
            <div className="trip-form-section__header">
              <div className="trip-form-section__title-wrap">
                <span className="trip-form-section__badge">2</span>
                <div>
                  <h3 className="trip-form-section__title">行程规划与交通偏好</h3>
                  <span className="trip-form-section__subtitle">
                    设定出发地、目的地与往返日期周期
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 出发地与目的地 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 2fr', gap: 12, alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                    出发城市 <span style={{ color: '#f53f3f' }}>*</span>
                  </label>
                  <Select
                    value={form.departureCity}
                    onChange={(val) => setForm((prev) => ({ ...prev, departureCity: val }))}
                  >
                    <Option value="北京">北京</Option>
                    <Option value="上海">上海</Option>
                    <Option value="广州">广州</Option>
                    <Option value="深圳">深圳</Option>
                    <Option value="杭州">杭州</Option>
                    <Option value="成都">成都</Option>
                  </Select>
                </div>

                <div style={{ paddingTop: 30, color: 'var(--color-text-3)' }}>
                  <ArrowRight size={20} weight="bold" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                    目的地 <span style={{ color: '#f53f3f' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Input
                      placeholder="输入城市名称（如：杭州）"
                      value={form.destinationInput}
                      onChange={(val) => setForm((prev) => ({ ...prev, destinationInput: val }))}
                      onPressEnter={() => handleAddDestination(form.destinationInput)}
                    />
                    <Button onClick={() => handleAddDestination(form.destinationInput)}>
                      添加
                    </Button>
                  </div>

                  {/* 常用城市快捷胶囊 */}
                  <div className="trip-form-quick-bar">
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>常用城市：</span>
                    {POPULAR_CITIES.map((city) => (
                      <span
                        key={city}
                        className={`trip-form-quick-pill ${
                          form.destinations.includes(city) ? 'trip-form-quick-pill--active' : ''
                        }`}
                        onClick={() => handleAddDestination(city)}
                      >
                        + {city}
                      </span>
                    ))}
                  </div>

                  {/* 已选目的地 */}
                  {form.destinations.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {form.destinations.map((dest, idx) => (
                        <Tag
                          key={dest}
                          closable
                          color="arcoblue"
                          size="medium"
                          onClose={() => handleRemoveDestination(idx)}
                        >
                          📍 {dest}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 日期与周期 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                    往返日期范围 <span style={{ color: '#f53f3f' }}>*</span>
                  </label>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={[form.startDate, form.endDate]}
                    onChange={(_, dateStrings) => {
                      setForm((prev) => ({
                        ...prev,
                        startDate: dateStrings[0] || '',
                        endDate: dateStrings[1] || '',
                      }));
                    }}
                  />
                </div>

                <div
                  style={{
                    background: 'var(--color-fill-2)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>出差天数</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>
                      {days} 天
                    </div>
                  </div>
                  <div style={{ width: 1, height: 24, background: 'var(--color-border-2)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>住宿夜数</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-1)' }}>
                      {nights} 晚
                    </div>
                  </div>
                </div>
              </div>

              {/* 交通方式磁贴 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                  主要交通方式偏好 <span style={{ color: '#f53f3f' }}>*</span>
                </label>
                <div className="trip-form-tile-grid">
                  {TRANSPORT_OPTIONS.map((opt) => {
                    const isSelected = form.transportModes.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        className={`trip-form-tile ${isSelected ? 'trip-form-tile--selected' : ''}`}
                        onClick={() => handleToggleTransport(opt.value)}
                      >
                        {isSelected && (
                          <div className="trip-form-tile__check">
                            <IconCheck />
                          </div>
                        )}
                        <div className="trip-form-tile__icon">{opt.icon(28)}</div>
                        <span className="trip-form-tile__title">{opt.title}</span>
                        <span className="trip-form-tile__desc">{opt.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. 住宿意向与同行人员 */}
          <div className="trip-form-section">
            <div className="trip-form-section__header">
              <div className="trip-form-section__title-wrap">
                <span className="trip-form-section__badge">3</span>
                <div>
                  <h3 className="trip-form-section__title">住宿安排与同行人员</h3>
                  <span className="trip-form-section__subtitle">
                    选择住宿标准形态，登记同行人以联动合住合规校验
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 住宿意向 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'var(--color-text-1)' }}>
                  住宿意向方式
                </label>
                <Radio.Group
                  type="button"
                  value={form.accommodationIntent}
                  onChange={(val) => setForm((prev) => ({ ...prev, accommodationIntent: val }))}
                >
                  <Radio value="hotel">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Bed size={16} /> 酒店住宿（按公司差旅标准）
                    </span>
                  </Radio>
                  <Radio value="dormitory">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Buildings size={16} /> 公司驻场宿舍（免住宿费）
                    </span>
                  </Radio>
                  <Radio value="none">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <HouseLine size={16} /> 无住宿 / 当天往返
                    </span>
                  </Radio>
                </Radio.Group>
              </div>

              {/* 同行人员 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                  同行同事（自动识别同性合住要求）
                </label>
                <div style={{ display: 'flex', gap: 8, maxWidth: 520 }}>
                  <Input
                    placeholder="输入同行同事姓名"
                    style={{ flex: 2 }}
                    value={form.companionNameInput}
                    onChange={(val) => setForm((prev) => ({ ...prev, companionNameInput: val }))}
                    onPressEnter={handleAddCompanion}
                  />
                  <Select
                    value={form.companionGenderInput}
                    style={{ width: 100 }}
                    onChange={(val) => setForm((prev) => ({ ...prev, companionGenderInput: val }))}
                  >
                    <Option value="male">男</Option>
                    <Option value="female">女</Option>
                  </Select>
                  <Button onClick={handleAddCompanion} icon={<IconPlus />}>
                    添加同行人
                  </Button>
                </div>

                {form.companions.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {form.companions.map((comp, idx) => (
                      <Tag
                        key={comp.name}
                        closable
                        color={comp.gender === 'male' ? 'blue' : 'magenta'}
                        onClose={() => handleRemoveCompanion(idx)}
                      >
                        {comp.gender === 'male' ? '👨' : '👩'} {comp.name}（{comp.gender === 'male' ? '男' : '女'}）
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. 费用预估与借款协同 */}
          <div className="trip-form-section">
            <div className="trip-form-section__header">
              <div className="trip-form-section__title-wrap">
                <span className="trip-form-section__badge">4</span>
                <div>
                  <h3 className="trip-form-section__title">费用预估与借款需求</h3>
                  <span className="trip-form-section__subtitle">
                    各科目合理预算，并可一键按企业标准智能试算
                  </span>
                </div>
              </div>
              <Button
                type="outline"
                status="success"
                icon={<IconThunderbolt />}
                onClick={handleAutoEstimate}
              >
                按差旅标准一键试算 ⚡
              </Button>
            </div>

            <div className="trip-form-cost-grid">
              <div className="trip-form-cost-item">
                <div className="trip-form-cost-item__label">
                  <span>预计往返与市内交通费</span>
                  <span className="trip-form-cost-item__hint">机票/高铁/打车</span>
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  min={0}
                  step={50}
                  value={form.estimatedTransportCost}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, estimatedTransportCost: val || 0 }))
                  }
                />
              </div>

              <div className="trip-form-cost-item">
                <div className="trip-form-cost-item__label">
                  <span>预计住宿费</span>
                  <span className="trip-form-cost-item__hint">
                    {form.destinations[0] || '目的地'}上限标准
                  </span>
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  min={0}
                  step={50}
                  value={form.estimatedAccommodationCost}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, estimatedAccommodationCost: val || 0 }))
                  }
                />
              </div>

              <div className="trip-form-cost-item">
                <div className="trip-form-cost-item__label">
                  <span>预计餐补与日常津贴</span>
                  <span className="trip-form-cost-item__hint">标准 40元/天</span>
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  min={0}
                  step={20}
                  value={form.estimatedMealCost}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, estimatedMealCost: val || 0 }))
                  }
                />
              </div>

              <div className="trip-form-cost-item">
                <div className="trip-form-cost-item__label">
                  <span>预计其他杂费</span>
                  <span className="trip-form-cost-item__hint">门票/通讯/应急</span>
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  min={0}
                  step={50}
                  value={form.estimatedOtherCost}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, estimatedOtherCost: val || 0 }))
                  }
                />
              </div>
            </div>

            {/* 借款需求内嵌 */}
            <div className={`trip-form-loan-box ${form.needLoan ? 'trip-form-loan-box--active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Checkbox
                  checked={form.needLoan}
                  onChange={(checked) => setForm((prev) => ({ ...prev, needLoan: checked }))}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>
                    需要申请差旅备用借款（预支款）
                  </span>
                </Checkbox>
                {form.needLoan && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span
                      className="trip-form-quick-pill"
                      onClick={() => setForm((prev) => ({ ...prev, loanAmount: totalCost }))}
                    >
                      预借 100% (¥{totalCost.toLocaleString()})
                    </span>
                    <span
                      className="trip-form-quick-pill"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, loanAmount: Math.round(totalCost * 0.8) }))
                      }
                    >
                      预借 80% (¥{Math.round(totalCost * 0.8).toLocaleString()})
                    </span>
                  </div>
                )}
              </div>

              {form.needLoan && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: 16,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px dashed var(--color-border-2)',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                      借款金额 <span style={{ color: '#f53f3f' }}>*</span>
                    </label>
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="¥"
                      min={100}
                      step={100}
                      value={form.loanAmount}
                      onChange={(val) => setForm((prev) => ({ ...prev, loanAmount: val || 0 }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--color-text-1)' }}>
                      借款事由
                    </label>
                    <Input
                      placeholder="填写借款用途说明"
                      value={form.loanReason}
                      onChange={(val) => setForm((prev) => ({ ...prev, loanReason: val }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. 证明材料与附件 */}
          <div className="trip-form-section">
            <div className="trip-form-section__header">
              <div className="trip-form-section__title-wrap">
                <span className="trip-form-section__badge">5</span>
                <div>
                  <h3 className="trip-form-section__title">材料与凭据</h3>
                  <span className="trip-form-section__subtitle">
                    客户邀请函、机票预订截图或主管报备批复
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  border: '1.5px dashed var(--color-border-3)',
                  borderRadius: 8,
                  padding: '20px',
                  textAlign: 'center',
                  background: 'var(--color-fill-1)',
                  cursor: 'pointer',
                }}
                onClick={handleSimulateUpload}
              >
                <UploadSimple size={32} style={{ color: 'rgb(var(--primary-6))', marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-1)' }}>
                  点击或拖拽上传证明材料（图片 / PDF）
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                  支持企业微信审批截图、会务邀请函等合规凭证
                </div>
              </div>

              {form.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {form.attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--color-fill-2)',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconFile style={{ color: 'rgb(var(--primary-6))' }} />
                        <Text style={{ fontSize: 13 }}>{att.name}</Text>
                        <Tag size="small">{att.size}</Tag>
                      </div>
                      <Button
                        type="text"
                        status="danger"
                        size="small"
                        icon={<Trash size={16} />}
                        onClick={() => handleRemoveAttachment(att.id)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 4 }}>
                <Checkbox
                  checked={form.hasApprovalScreenshot}
                  onChange={(checked) => setForm((prev) => ({ ...prev, hasApprovalScreenshot: checked }))}
                >
                  已获得主管事前报备同意并留存依据
                </Checkbox>
              </div>
            </div>
          </div>
        </ProcessWorkspaceMain>

        {/* 右侧 30% 智能差旅助手 Sticky */}
        <ProcessWorkspaceAside>
          <div className="trip-form-aside-sticky">
            {/* 卡片 1：预算执行与资金试算卡 */}
            <div className="trip-form-summary-card">
              <div className="trip-form-summary-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wallet size={18} weight="duotone" style={{ color: 'rgb(var(--primary-6))' }} />
                  <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>
                    预计差旅总费用
                  </span>
                </div>
                <Tag color="arcoblue">
                  {days}天{nights}晚
                </Tag>
              </div>

              <div className="trip-form-summary-card__amount">
                ¥{totalCost.toLocaleString()}
              </div>

              <div className="trip-form-summary-metrics">
                <div className="trip-form-summary-metric">
                  <span className="trip-form-summary-metric__label">日均预估</span>
                  <span className="trip-form-summary-metric__value">
                    ¥{dailyAverageCost.toLocaleString()} / 天
                  </span>
                </div>

                <div className="trip-form-summary-metric">
                  <span className="trip-form-summary-metric__label">申请借款</span>
                  <span className="trip-form-summary-metric__value">
                    {form.needLoan ? `¥${form.loanAmount.toLocaleString()}` : '无借款'}
                  </span>
                </div>

                <div className="trip-form-summary-metric">
                  <span className="trip-form-summary-metric__label">预计出差人</span>
                  <span className="trip-form-summary-metric__value">
                    {1 + form.companions.length} 人
                  </span>
                </div>

                <div className="trip-form-summary-metric">
                  <span className="trip-form-summary-metric__label">主要交通</span>
                  <span className="trip-form-summary-metric__value">
                    {form.transportModes[0] === 'airplane'
                      ? '飞机'
                      : form.transportModes[0] === 'high_speed_rail'
                      ? '高铁'
                      : '陆运'}
                  </span>
                </div>
              </div>
            </div>

            {/* 卡片 2：AI 规则引擎合规通行体检 */}
            <TravelRuleEngine
              departureCity={form.departureCity}
              destinationCity={form.destinations[0] || ''}
              department={form.department}
              travelDays={days}
              companions={form.companions}
              transportType={(form.transportModes[0] as any) || 'high_speed_rail'}
              hasApprovalScreenshot={form.hasApprovalScreenshot || form.attachments.length > 0}
            />

            {/* 卡片 3：审批路线预判 */}
            <div
              style={{
                background: 'var(--color-bg-2)',
                border: '1px solid var(--color-border-2)',
                borderRadius: 8,
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--color-text-1)',
                }}
              >
                <IconClockCircle style={{ color: 'rgb(var(--primary-6))' }} />
                <span>预计审批流路线预判</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: '20px' }}>
                {days >= 7 || totalCost >= 5000 ? (
                  <div>
                    <Tag color="orange" size="small" style={{ marginBottom: 6 }}>
                      长差 / 大额审批流
                    </Tag>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>1. 发起申请（当前用户）</div>
                      <div>2. 部门经理初审（王经理）</div>
                      <div>3. 部门总监/总经理审批（天数≥7或预算≥5000）</div>
                      <div>4. 财务审核打款（陈财务）</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Tag color="green" size="small" style={{ marginBottom: 6 }}>
                      标准审批流
                    </Tag>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>1. 发起申请（当前用户）</div>
                      <div>2. 部门主管审批（王经理）</div>
                      <div>3. 财务中心归档/备用金审核</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

      {/* 底部吸底操作栏 */}
      <div className="trip-form-sticky-footer">
        <div className="trip-form-sticky-footer__info">
          <span className="trip-form-sticky-footer__total">
            预计总费用：
            <span className="trip-form-sticky-footer__amount">
              ¥{totalCost.toLocaleString()}
            </span>
          </span>
          <Tag color="arcoblue" size="small">
            {form.destinations.join('、') || '未指定'} · {days} 天
          </Tag>
          {form.needLoan && (
            <Tag color="orangered" size="small">
              借款 ¥{form.loanAmount.toLocaleString()}
            </Tag>
          )}
        </div>

        <div className="trip-form-sticky-footer__actions">
          <Button onClick={() => navigate('/travel/trips')}>取消返回</Button>
          <Button icon={<IconSave />} onClick={handleSaveDraft} loading={loading}>
            保存草稿
          </Button>
          <Button
            type="primary"
            icon={<IconSend />}
            onClick={handleSubmit}
            loading={loading}
          >
            提交申请
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
