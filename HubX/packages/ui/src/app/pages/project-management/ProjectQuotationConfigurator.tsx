import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Message,
  Modal,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconPlus } from '@arco-design/web-react/icon';
import {
  calculateLaborItemCost,
  calculateOnsiteItemCost,
  calculateProjectQuotationSummary,
  calculateTravelItemCost,
  getQuotationLaborDetails,
  getQuotationOtherCostDetails,
  type ProjectQuotationConfig,
  type ProjectQuotationSummary,
  type QuotationLaborItem,
  type QuotationOtherCostItem,
  type QuotationPlatformConfig,
  type QuotationStandardRoleItem,
  type QuotationTechnology,
  type QuotationTravelItem,
} from './projectQuotationConfigModel';
import './ProjectQuotationConfigurator.css';

const TabPane = Tabs.TabPane;
const { Text } = Typography;

type QuotationConfigTab = 'frontend' | 'backend' | 'otherRoles' | 'travel' | 'otherCosts' | 'summary';
type PlatformSection = 'frontend' | 'backend';
type TravelSection = 'travel' | 'onsite';

interface PlatformDefinition {
  id: string;
  name: string;
  description: string;
  technologies: QuotationTechnology[];
}

interface StandardRoleDefinition {
  id: string;
  role: string;
  dailyRate: number;
}

interface OtherCostDefinition {
  id: string;
  label: string;
}

const QUOTATION_CONFIG_TABS: Array<{ key: QuotationConfigTab; title: string }> = [
  { key: 'frontend', title: '前端配置' },
  { key: 'backend', title: '后端配置' },
  { key: 'otherRoles', title: '其他岗位' },
  { key: 'travel', title: '出差驻场' },
  { key: 'otherCosts', title: '其他成本' },
  { key: 'summary', title: '报价汇总' },
];

const FRONTEND_PLATFORMS: PlatformDefinition[] = [
  { id: 'wechat', name: '微信小程序', description: '微信生态小程序', technologies: [{ name: '原生开发', dailyRate: 1200 }, { name: 'Taro', dailyRate: 1100 }, { name: 'Uni-app', dailyRate: 1000 }] },
  { id: 'alipay', name: '支付宝小程序', description: '支付宝生态小程序', technologies: [{ name: '原生开发', dailyRate: 1200 }, { name: 'Taro', dailyRate: 1100 }, { name: 'Uni-app', dailyRate: 1000 }] },
  { id: 'douyin', name: '抖音小程序', description: '抖音生态小程序', technologies: [{ name: '原生开发', dailyRate: 1200 }, { name: 'Taro', dailyRate: 1100 }, { name: 'Uni-app', dailyRate: 1000 }] },
  { id: 'ios', name: 'iOS APP', description: '苹果 iOS 应用', technologies: [{ name: 'Swift', dailyRate: 1500 }, { name: 'React Native', dailyRate: 1300 }, { name: 'Flutter', dailyRate: 1400 }] },
  { id: 'android', name: 'Android APP', description: '安卓应用', technologies: [{ name: 'Kotlin', dailyRate: 1400 }, { name: 'Java', dailyRate: 1200 }, { name: 'React Native', dailyRate: 1300 }, { name: 'Flutter', dailyRate: 1400 }] },
  { id: 'harmony', name: '鸿蒙 APP', description: '华为鸿蒙应用', technologies: [{ name: 'ArkTS', dailyRate: 1500 }, { name: 'Flutter', dailyRate: 1400 }] },
  { id: 'h5', name: 'H5 移动端', description: '移动端 H5 网页', technologies: [{ name: 'Vue', dailyRate: 1000 }, { name: 'React', dailyRate: 1100 }, { name: 'Angular', dailyRate: 1200 }] },
  { id: 'pcweb', name: 'PC Web 端', description: '电脑端网页', technologies: [{ name: 'Vue', dailyRate: 1000 }, { name: 'React', dailyRate: 1100 }, { name: 'Angular', dailyRate: 1200 }] },
  { id: 'desktop', name: '桌面应用', description: '桌面客户端', technologies: [{ name: 'Electron', dailyRate: 1200 }, { name: 'Tauri', dailyRate: 1300 }] },
  { id: 'ipad', name: 'iPad 端', description: '苹果 iPad 平板应用', technologies: [{ name: 'Swift', dailyRate: 1500 }, { name: 'React Native', dailyRate: 1300 }, { name: 'Flutter', dailyRate: 1400 }] },
  { id: 'androidpad', name: 'Android 平板端', description: '安卓平板应用', technologies: [{ name: 'Kotlin', dailyRate: 1400 }, { name: 'Java', dailyRate: 1200 }, { name: 'React Native', dailyRate: 1300 }, { name: 'Flutter', dailyRate: 1400 }] },
];

const BACKEND_PLATFORMS: PlatformDefinition[] = [
  { id: 'api', name: 'API 服务', description: '后端 API 服务', technologies: [{ name: 'Java Spring Boot', dailyRate: 1400 }, { name: 'Python Django', dailyRate: 1200 }, { name: 'Go', dailyRate: 1500 }, { name: 'Node.js', dailyRate: 1100 }, { name: 'PHP Laravel', dailyRate: 1000 }] },
  { id: 'admin', name: '管理后台', description: '后台管理系统', technologies: [{ name: 'Vue + Element', dailyRate: 1000 }, { name: 'React + Ant Design', dailyRate: 1100 }] },
  { id: 'database', name: '数据库设计', description: '数据库架构设计', technologies: [{ name: 'MySQL', dailyRate: 1200 }, { name: 'PostgreSQL', dailyRate: 1300 }, { name: 'MongoDB', dailyRate: 1300 }, { name: 'Redis', dailyRate: 1200 }] },
  { id: 'im', name: '即时通讯', description: '实时通讯服务', technologies: [{ name: 'WebSocket', dailyRate: 1200 }, { name: 'MQTT', dailyRate: 1300 }] },
  { id: 'payment', name: '支付服务', description: '支付集成服务', technologies: [{ name: '微信支付', dailyRate: 1200 }, { name: '支付宝', dailyRate: 1200 }, { name: '银联', dailyRate: 1300 }] },
];

const STANDARD_ROLES: StandardRoleDefinition[] = [
  { id: 'ui', role: 'UI设计师', dailyRate: 800 },
  { id: 'pm', role: '产品经理', dailyRate: 1200 },
  { id: 'test', role: '测试工程师', dailyRate: 800 },
  { id: 'project-manager', role: '项目经理', dailyRate: 1500 },
  { id: 'architect', role: '架构师', dailyRate: 2000 },
  { id: 'devops', role: '运维工程师', dailyRate: 1000 },
  { id: 'dba', role: 'DBA工程师', dailyRate: 1200 },
  { id: 'security', role: '安全工程师', dailyRate: 1500 },
  { id: 'support', role: '技术支持', dailyRate: 800 },
];

const OTHER_COST_GROUPS: Array<{ id: string; title: string; items: OtherCostDefinition[] }> = [
  { id: 'business', title: '商务成本', items: [{ id: 'business-reception', label: '商务接待费（元）' }, { id: 'business-banquet', label: '商务宴请费（元）' }, { id: 'business-gift', label: '礼品费（元）' }] },
  { id: 'operation', title: '项目运营成本', items: [{ id: 'training', label: '客户培训费（元）' }, { id: 'document', label: '文档制作费（元）' }, { id: 'version', label: '版本更新费（元）' }] },
  { id: 'third-party', title: '第三方服务成本', items: [{ id: 'cloud-server', label: '云服务器年费（元）' }, { id: 'domain', label: '域名费用（元/年）' }, { id: 'ssl', label: 'SSL 证书费（元/年）' }, { id: 'sms', label: '短信服务费（元）' }, { id: 'push', label: '推送服务费（元）' }, { id: 'payment-channel', label: '支付通道费（元）' }, { id: 'third-party-api', label: '第三方接口费（元）' }, { id: 'license', label: '软件许可证费（元）' }] },
  { id: 'hardware', title: '硬件设备成本', items: [{ id: 'server-purchase', label: '服务器采购费（元）' }, { id: 'equipment', label: '办公设备费（元）' }] },
];

const KNOWN_COST_IDS = new Set(OTHER_COST_GROUPS.flatMap(group => group.items.map(item => item.id)));

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatAmount(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(value: number, total: number) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

function createPlatformRole(section: PlatformSection, platform: PlatformDefinition): QuotationLaborItem {
  const technology = platform.technologies[0];
  return {
    id: createId(`${section}-${platform.id}`),
    category: platform.name,
    role: section === 'frontend' ? `${platform.name}端` : '后端开发',
    technology: technology.name,
    people: 1,
    days: section === 'frontend' ? 20 : 30,
    dailyRate: technology.dailyRate,
  };
}

function createPlatformConfig(section: PlatformSection, platform: PlatformDefinition): QuotationPlatformConfig {
  return {
    platformId: platform.id,
    platformName: platform.name,
    roles: [createPlatformRole(section, platform)],
    customTechnologies: [],
  };
}

function createStandardRole(definition: StandardRoleDefinition): QuotationStandardRoleItem {
  return { id: definition.id, role: definition.role, enabled: false, people: 1, days: 15, dailyRate: definition.dailyRate };
}

function createTravelItem(): QuotationTravelItem {
  return { enabled: false, people: 2, trips: 2, days: 3, transportPerTrip: 1000, hotelPerDay: 400, mealPerDay: 100, allowancePerDay: 50 };
}

function createOnsiteItem(): QuotationTravelItem {
  return { enabled: false, people: 1, trips: 0, days: 30, transportPerTrip: 0, hotelPerDay: 0, mealPerDay: 80, allowancePerDay: 0, hotelPerMonth: 3000, transportPerMonth: 500 };
}

function createFixedCosts(): QuotationOtherCostItem[] {
  return OTHER_COST_GROUPS.flatMap(group => group.items.map(item => ({
    id: item.id,
    type: group.title,
    description: item.label,
    label: item.label,
    group: group.id,
    amount: 0,
  })));
}

function createInitialConfig(): ProjectQuotationConfig {
  return {
    frontend: [],
    backend: [],
    otherRoles: [],
    frontendPlatforms: [],
    backendPlatforms: [],
    standardRoles: STANDARD_ROLES.map(createStandardRole),
    travel: createTravelItem(),
    onsite: createOnsiteItem(),
    otherCosts: createFixedCosts(),
    salesCommissionRate: 0,
    salesOtherCost: 0,
  };
}

function platformsFor(section: PlatformSection) {
  return section === 'frontend' ? FRONTEND_PLATFORMS : BACKEND_PLATFORMS;
}

function platformConfigsFor(config: ProjectQuotationConfig, section: PlatformSection) {
  return section === 'frontend' ? (config.frontendPlatforms ?? []) : (config.backendPlatforms ?? []);
}

function platformKeyFor(section: PlatformSection) {
  return section === 'frontend' ? 'frontendPlatforms' : 'backendPlatforms';
}

function normalizePlatformConfigs(section: PlatformSection, config: ProjectQuotationConfig) {
  const currentPlatforms = platformConfigsFor(config, section);
  if (currentPlatforms.length) return currentPlatforms.map(platform => ({
    ...platform,
    roles: platform.roles.map(role => ({ ...role })),
    customTechnologies: platform.customTechnologies.map(technology => ({ ...technology })),
  }));

  const legacyItems = section === 'frontend' ? config.frontend : config.backend;
  return legacyItems.reduce<QuotationPlatformConfig[]>((platforms, item) => {
    const definition = platformsFor(section).find(platform => platform.name === item.category);
    const platformId = definition?.id ?? `legacy-${item.category}`;
    const existing = platforms.find(platform => platform.platformId === platformId);
    if (existing) {
      existing.roles.push({ ...item });
      return platforms;
    }
    platforms.push({
      platformId,
      platformName: item.category,
      roles: [{ ...item }],
      customTechnologies: [],
    });
    return platforms;
  }, []);
}

function normalizeQuotationConfig(config: ProjectQuotationConfig): ProjectQuotationConfig {
  const initial = createInitialConfig();
  const standardRoles = STANDARD_ROLES.map(definition => {
    const current = config.standardRoles?.find(role => role.id === definition.id);
    return current ? { ...current } : createStandardRole(definition);
  });
  const currentCosts = new Map(config.otherCosts.map(item => [item.id, item]));
  const fixedCosts = createFixedCosts().map(item => ({ ...item, ...(currentCosts.get(item.id) ?? {}) }));
  const customCosts = config.otherCosts
    .filter(item => !KNOWN_COST_IDS.has(item.id))
    .map(item => ({ ...item }));

  return {
    ...initial,
    ...config,
    frontend: config.frontend.map(item => ({ ...item })),
    backend: config.backend.map(item => ({ ...item })),
    otherRoles: config.otherRoles.map(item => ({ ...item })),
    frontendPlatforms: normalizePlatformConfigs('frontend', config),
    backendPlatforms: normalizePlatformConfigs('backend', config),
    standardRoles,
    travel: { ...createTravelItem(), ...config.travel },
    onsite: { ...createOnsiteItem(), ...config.onsite },
    otherCosts: [...fixedCosts, ...customCosts],
    salesOtherCost: config.salesOtherCost ?? 0,
  };
}

function QuotationMetric({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={`project-quotation-config-metric${primary ? ' is-primary' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryCostCard({ title, rows, total }: { title: string; rows: Array<{ name: string; amount: number; detail?: string }>; total: number }) {
  return (
    <section className="project-quotation-summary-cost-card">
      <div className="project-quotation-summary-cost-title">{title}</div>
      <div className="project-quotation-summary-cost-list">
        {rows.length ? rows.map(row => (
          <div className="project-quotation-summary-cost-row" key={`${row.name}-${row.detail ?? ''}`}>
            <div>
              <strong>{row.name}</strong>
              {row.detail ? <span>{row.detail}</span> : null}
            </div>
            <strong>{formatAmount(row.amount)}</strong>
          </div>
        )) : <div className="project-quotation-summary-cost-empty">暂无配置</div>}
      </div>
      <div className="project-quotation-summary-cost-total"><span>{title.replace('明细', '合计')}</span><strong>{formatAmount(total)}</strong></div>
    </section>
  );
}

interface ProjectQuotationConfiguratorProps {
  visible: boolean;
  initialConfig?: ProjectQuotationConfig | null;
  onCancel: () => void;
  onNext: (config: ProjectQuotationConfig, summary: ProjectQuotationSummary) => void;
}

export function ProjectQuotationConfigurator({
  visible,
  initialConfig,
  onCancel,
  onNext,
}: ProjectQuotationConfiguratorProps) {
  const [activeTab, setActiveTab] = useState<QuotationConfigTab>('frontend');
  const [config, setConfig] = useState<ProjectQuotationConfig>(createInitialConfig);
  const [customTechnologyDrafts, setCustomTechnologyDrafts] = useState<Record<string, { name: string; dailyRate: number }>>({});
  const [customTechnologyVisible, setCustomTechnologyVisible] = useState<Record<string, boolean>>({});
  const summary = useMemo(() => calculateProjectQuotationSummary(config), [config]);
  const activeTabIndex = QUOTATION_CONFIG_TABS.findIndex(item => item.key === activeTab);

  useEffect(() => {
    if (visible) {
      setActiveTab('frontend');
      setCustomTechnologyDrafts({});
      setCustomTechnologyVisible({});
      setConfig(initialConfig ? normalizeQuotationConfig(initialConfig) : createInitialConfig());
    }
  }, [initialConfig, visible]);

  const updatePlatformConfigs = (section: PlatformSection, updater: (platforms: QuotationPlatformConfig[]) => QuotationPlatformConfig[]) => {
    const key = platformKeyFor(section);
    setConfig(current => ({ ...current, [key]: updater(platformConfigsFor(current, section)) }));
  };

  const togglePlatform = (section: PlatformSection, definition: PlatformDefinition) => {
    updatePlatformConfigs(section, platforms => platforms.some(platform => platform.platformId === definition.id)
      ? platforms.filter(platform => platform.platformId !== definition.id)
      : [...platforms, createPlatformConfig(section, definition)]);
  };

  const updatePlatformRole = (section: PlatformSection, platformId: string, roleId: string, field: keyof QuotationLaborItem, value: string | number) => {
    updatePlatformConfigs(section, platforms => platforms.map(platform => platform.platformId === platformId ? {
      ...platform,
      roles: platform.roles.map(role => role.id === roleId ? { ...role, [field]: value } : role),
    } : platform));
  };

  const addPlatformRole = (section: PlatformSection, platform: QuotationPlatformConfig) => {
    const definition = platformsFor(section).find(item => item.id === platform.platformId) ?? {
      id: platform.platformId,
      name: platform.platformName,
      description: '',
      technologies: platform.roles[0] ? [{ name: platform.roles[0].technology, dailyRate: platform.roles[0].dailyRate }] : [{ name: '', dailyRate: 0 }],
    };
    updatePlatformConfigs(section, platforms => platforms.map(item => item.platformId === platform.platformId ? {
      ...item,
      roles: [...item.roles, createPlatformRole(section, definition)],
    } : item));
  };

  const removePlatformRole = (section: PlatformSection, platformId: string, roleId: string) => {
    updatePlatformConfigs(section, platforms => platforms.map(platform => platform.platformId === platformId ? {
      ...platform,
      roles: platform.roles.filter(role => role.id !== roleId),
    } : platform));
  };

  const selectTechnology = (section: PlatformSection, platformId: string, roleId: string, technology: QuotationTechnology) => {
    updatePlatformConfigs(section, platforms => platforms.map(platform => platform.platformId === platformId ? {
      ...platform,
      roles: platform.roles.map(role => role.id === roleId ? { ...role, technology: technology.name, dailyRate: technology.dailyRate } : role),
    } : platform));
  };

  const removeCustomTechnology = (section: PlatformSection, platformId: string, technologyName: string) => {
    updatePlatformConfigs(section, platforms => platforms.map(platform => platform.platformId === platformId ? {
      ...platform,
      customTechnologies: platform.customTechnologies.filter(technology => technology.name !== technologyName),
    } : platform));
  };

  const addCustomTechnology = (section: PlatformSection, platformId: string, roleId: string) => {
    const draftKey = `${section}-${platformId}-${roleId}`;
    const draft = customTechnologyDrafts[draftKey];
    const name = draft?.name.trim();
    if (!name) {
      Message.error('请输入自定义技术栈名称');
      return;
    }
    const technology = { name, dailyRate: Number(draft.dailyRate) || 0, isCustom: true };
    updatePlatformConfigs(section, platforms => platforms.map(platform => platform.platformId === platformId ? {
      ...platform,
      customTechnologies: platform.customTechnologies.some(item => item.name === name)
        ? platform.customTechnologies
        : [...platform.customTechnologies, technology],
      roles: platform.roles.map(role => role.id === roleId ? { ...role, technology: technology.name, dailyRate: technology.dailyRate } : role),
    } : platform));
    setCustomTechnologyDrafts(current => ({ ...current, [draftKey]: { name: '', dailyRate: 1200 } }));
  };

  const updateStandardRole = (id: string, field: keyof QuotationStandardRoleItem, value: boolean | number) => {
    setConfig(current => ({
      ...current,
      standardRoles: (current.standardRoles ?? []).map(role => role.id === id ? { ...role, [field]: value } : role),
    }));
  };

  const updateCustomRole = (id: string, field: keyof QuotationLaborItem, value: string | number) => {
    setConfig(current => ({
      ...current,
      otherRoles: current.otherRoles.map(role => role.id === id ? { ...role, [field]: value } : role),
    }));
  };

  const updateTravelItem = (section: TravelSection, field: keyof QuotationTravelItem, value: boolean | number) => {
    setConfig(current => ({ ...current, [section]: { ...current[section], [field]: value } }));
  };

  const updateOtherCost = (id: string, amount: number) => {
    setConfig(current => ({
      ...current,
      otherCosts: current.otherCosts.map(item => item.id === id ? { ...item, amount } : item),
    }));
  };

  const renderPlatformTab = (section: PlatformSection, description: string) => {
    const definitions = platformsFor(section);
    const configuredPlatforms = platformConfigsFor(config, section);

    return (
      <section className="project-quotation-config-section">
        <div className="project-quotation-config-section-head">
          <Text type="secondary">{description}</Text>
        </div>
        <section className="project-quotation-config-card">
          <h4>选择{section === 'frontend' ? '前端平台' : '后端服务'}</h4>
          <div className="project-quotation-platform-grid">
            {definitions.map(definition => {
              const selected = configuredPlatforms.some(platform => platform.platformId === definition.id);
              return (
                <div
                  key={definition.id}
                  className={`project-quotation-platform-card${selected ? ' is-selected' : ''}`}
                  onClick={() => togglePlatform(section, definition)}
                >
                  <div className="project-quotation-platform-card-head">
                    <strong>{definition.name}</strong>
                    <Checkbox checked={selected} onClick={event => event.stopPropagation()} onChange={() => togglePlatform(section, definition)} />
                  </div>
                  <span>{definition.description}</span>
                </div>
              );
            })}
          </div>
        </section>

        {configuredPlatforms.length ? configuredPlatforms.map(platform => {
          const definition = definitions.find(item => item.id === platform.platformId);
          const technologies = [...(definition?.technologies ?? []), ...platform.customTechnologies];
          return (
            <section className="project-quotation-config-card project-quotation-role-platform" key={platform.platformId}>
              <div className="project-quotation-card-head">
                <div>
                  <h4>{platform.platformName}</h4>
                  <Text type="secondary">可配置多个交付角色及对应开发语言、人数和投入天数。</Text>
                </div>
                <Button type="text" status="danger" size="small" onClick={() => updatePlatformConfigs(section, platforms => platforms.filter(item => item.platformId !== platform.platformId))}>移除</Button>
              </div>
              <div className="project-quotation-role-list">
                {platform.roles.map(role => (
                  <div className="project-quotation-role-card" key={role.id}>
                    <div className="project-quotation-role-head">
                      <Input
                        value={role.role}
                        placeholder={section === 'frontend' ? '如：用户端、商家端、司机端' : '请输入岗位角色'}
                        onChange={value => updatePlatformRole(section, platform.platformId, role.id, 'role', value)}
                      />
                      {platform.roles.length > 1 ? <Button type="text" status="danger" size="mini" icon={<IconDelete />} aria-label="删除角色" onClick={() => removePlatformRole(section, platform.platformId, role.id)} /> : null}
                    </div>
                    <div className="project-quotation-technology-row">
                      <span>选择开发语言/框架</span>
                      <div className="project-quotation-technology-pills">
                        {technologies.map(technology => (
                          <div className="project-quotation-technology-pill-wrap" key={technology.name}>
                            <button
                              type="button"
                              className={`project-quotation-technology-pill${role.technology === technology.name ? ' is-selected' : ''}`}
                              onClick={() => selectTechnology(section, platform.platformId, role.id, technology)}
                            >
                              {technology.name}<span>¥{technology.dailyRate}/天</span>
                            </button>
                            {technology.isCustom ? <Button type="text" size="mini" status="danger" icon={<IconDelete />} aria-label={`删除${technology.name}`} onClick={() => removeCustomTechnology(section, platform.platformId, technology.name)} /> : null}
                          </div>
                        ))}
                        <button
                          type="button"
                          className={`project-quotation-technology-pill project-quotation-custom-trigger${customTechnologyVisible[`${section}-${platform.platformId}-${role.id}`] ? ' is-selected' : ''}`}
                          onClick={() => setCustomTechnologyVisible(current => ({
                            ...current,
                            [`${section}-${platform.platformId}-${role.id}`]: !current[`${section}-${platform.platformId}-${role.id}`],
                          }))}
                        >
                          自定义
                        </button>
                      </div>
                    </div>
                    {customTechnologyVisible[`${section}-${platform.platformId}-${role.id}`] ? (() => {
                      const draftKey = `${section}-${platform.platformId}-${role.id}`;
                      const draft = customTechnologyDrafts[draftKey] ?? { name: '', dailyRate: 1200 };
                      return (
                        <div className="project-quotation-custom-technology">
                          <span>自定义技术栈</span>
                          <Input value={draft.name} placeholder="语言/框架名称" onChange={value => setCustomTechnologyDrafts(current => ({ ...current, [draftKey]: { ...draft, name: value } }))} />
                          <InputNumber min={0} precision={2} prefix="¥" suffix="/天" value={draft.dailyRate} onChange={value => setCustomTechnologyDrafts(current => ({ ...current, [draftKey]: { ...draft, dailyRate: Number(value ?? 0) } }))} />
                          <Button size="small" onClick={() => addCustomTechnology(section, platform.platformId, role.id)}>添加</Button>
                        </div>
                      );
                    })() : null}
                    <div className="project-quotation-input-grid project-quotation-role-input-grid">
                      <label><span>人数</span><InputNumber min={0} precision={0} value={role.people} onChange={value => updatePlatformRole(section, platform.platformId, role.id, 'people', Number(value ?? 0))} /></label>
                      <label><span>开发天数</span><InputNumber min={1} precision={0} value={role.days} onChange={value => updatePlatformRole(section, platform.platformId, role.id, 'days', Number(value ?? 0))} /></label>
                      <label><span>日均成本（元）</span><InputNumber min={0} precision={2} prefix="¥" value={role.dailyRate} onChange={value => updatePlatformRole(section, platform.platformId, role.id, 'dailyRate', Number(value ?? 0))} /></label>
                      <div className="project-quotation-inline-total"><span>小计</span><strong>{formatAmount(calculateLaborItemCost(role))}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="dashed" long icon={<IconPlus />} onClick={() => addPlatformRole(section, platform)}>
                添加角色{section === 'frontend' ? '（如：商家端、用户端、司机端、配送端）' : ''}
              </Button>
            </section>
          );
        }) : <div className="project-quotation-config-empty">请在上方选择{section === 'frontend' ? '前端平台' : '后端服务'}，选择后将显示配置项。</div>}
      </section>
    );
  };

  const renderOtherRoles = () => (
    <section className="project-quotation-config-section">
      <div className="project-quotation-config-section-head">
        <div>
          <h3>其他岗位配置</h3>
          <Text type="secondary">启用项目所需的标准岗位，也可新增自定义岗位。</Text>
        </div>
      </div>
      <section className="project-quotation-config-card">
        <h4>标准岗位配置</h4>
        <div className="project-quotation-standard-role-grid">
          {(config.standardRoles ?? []).map(role => (
            <div className={`project-quotation-standard-role${role.enabled ? ' is-enabled' : ''}`} key={role.id}>
              <div className="project-quotation-standard-role-head">
                <strong>{role.role}</strong>
                <Switch checked={role.enabled} checkedText="启用" uncheckedText="未启用" onChange={value => updateStandardRole(role.id, 'enabled', value)} />
              </div>
              {role.enabled ? (
                <div className="project-quotation-input-grid project-quotation-standard-role-inputs">
                  <label><span>人数</span><InputNumber min={0} precision={0} value={role.people} onChange={value => updateStandardRole(role.id, 'people', Number(value ?? 0))} /></label>
                  <label><span>天数</span><InputNumber min={1} precision={0} value={role.days} onChange={value => updateStandardRole(role.id, 'days', Number(value ?? 0))} /></label>
                  <label><span>日均成本（元）</span><InputNumber min={0} precision={2} prefix="¥" value={role.dailyRate} onChange={value => updateStandardRole(role.id, 'dailyRate', Number(value ?? 0))} /></label>
                </div>
              ) : <span className="project-quotation-standard-role-rate">默认日均成本：¥{role.dailyRate}</span>}
            </div>
          ))}
        </div>
      </section>
      <section className="project-quotation-config-card">
        <div className="project-quotation-card-head">
          <div><h4>自定义岗位</h4><Text type="secondary">用于录入标准岗位之外的角色，例如数据分析师。</Text></div>
          <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setConfig(current => ({
            ...current,
            otherRoles: [...current.otherRoles, { id: createId('custom-role'), category: '自定义岗位', role: '', technology: '', people: 1, days: 10, dailyRate: 800 }],
          }))}>新增岗位</Button>
        </div>
        {config.otherRoles.length ? <div className="project-quotation-custom-role-list">{config.otherRoles.map(role => (
          <div className="project-quotation-custom-role" key={role.id}>
            <div className="project-quotation-role-head">
              <Input value={role.role} placeholder="岗位名称，如：数据分析师" onChange={value => updateCustomRole(role.id, 'role', value)} />
              <Button type="text" status="danger" size="mini" icon={<IconDelete />} aria-label="删除岗位" onClick={() => setConfig(current => ({ ...current, otherRoles: current.otherRoles.filter(item => item.id !== role.id) }))} />
            </div>
            <div className="project-quotation-input-grid project-quotation-role-input-grid">
              <label><span>人数</span><InputNumber min={0} precision={0} value={role.people} onChange={value => updateCustomRole(role.id, 'people', Number(value ?? 0))} /></label>
              <label><span>天数</span><InputNumber min={1} precision={0} value={role.days} onChange={value => updateCustomRole(role.id, 'days', Number(value ?? 0))} /></label>
              <label><span>日均成本（元）</span><InputNumber min={0} precision={2} prefix="¥" value={role.dailyRate} onChange={value => updateCustomRole(role.id, 'dailyRate', Number(value ?? 0))} /></label>
              <div className="project-quotation-inline-total"><span>小计</span><strong>{formatAmount(calculateLaborItemCost(role))}</strong></div>
            </div>
          </div>
        ))}</div> : <div className="project-quotation-config-empty">暂无自定义岗位。</div>}
      </section>
    </section>
  );

  const renderTravelBlock = (section: TravelSection) => {
    const item = config[section];
    const isTravel = section === 'travel';
    const subtotal = isTravel ? calculateTravelItemCost(item) : calculateOnsiteItemCost(item);
    return (
      <section className="project-quotation-config-card project-quotation-travel-card">
        <div className="project-quotation-card-head">
          <div>
            <h4>{isTravel ? '出差配置' : '驻场配置'}</h4>
            <Text type="secondary">{isTravel ? '按人员、次数、天数及交通住宿标准核算。' : '按驻场人数、天数、月度住宿与交通标准核算。'}</Text>
          </div>
          <Switch checked={item.enabled} checkedText="启用" uncheckedText="未启用" onChange={value => updateTravelItem(section, 'enabled', value)} />
        </div>
        {isTravel ? (
          <div className="project-quotation-input-grid project-quotation-travel-input-grid">
            <label><span>出差人数</span><InputNumber min={1} precision={0} disabled={!item.enabled} value={item.people} onChange={value => updateTravelItem(section, 'people', Number(value ?? 0))} /></label>
            <label><span>出差次数</span><InputNumber min={1} precision={0} disabled={!item.enabled} value={item.trips} onChange={value => updateTravelItem(section, 'trips', Number(value ?? 0))} /></label>
            <label><span>每次天数</span><InputNumber min={1} precision={0} disabled={!item.enabled} value={item.days} onChange={value => updateTravelItem(section, 'days', Number(value ?? 0))} /></label>
            <label><span>单程交通费（元/人）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.transportPerTrip} onChange={value => updateTravelItem(section, 'transportPerTrip', Number(value ?? 0))} /></label>
            <label><span>住宿费（元/天/间）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.hotelPerDay} onChange={value => updateTravelItem(section, 'hotelPerDay', Number(value ?? 0))} /></label>
            <label><span>餐饮补贴（元/天/人）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.mealPerDay} onChange={value => updateTravelItem(section, 'mealPerDay', Number(value ?? 0))} /></label>
            <label><span>其他补贴（元/天/人）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.allowancePerDay} onChange={value => updateTravelItem(section, 'allowancePerDay', Number(value ?? 0))} /></label>
          </div>
        ) : (
          <div className="project-quotation-input-grid project-quotation-travel-input-grid">
            <label><span>驻场人数</span><InputNumber min={1} precision={0} disabled={!item.enabled} value={item.people} onChange={value => updateTravelItem(section, 'people', Number(value ?? 0))} /></label>
            <label><span>驻场天数</span><InputNumber min={1} precision={0} disabled={!item.enabled} value={item.days} onChange={value => updateTravelItem(section, 'days', Number(value ?? 0))} /></label>
            <label><span>住宿费（元/月/人）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.hotelPerMonth} onChange={value => updateTravelItem(section, 'hotelPerMonth', Number(value ?? 0))} /></label>
            <label><span>餐饮补贴（元/天/人）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.mealPerDay} onChange={value => updateTravelItem(section, 'mealPerDay', Number(value ?? 0))} /></label>
            <label><span>交通补贴（元/月/人）</span><InputNumber min={0} precision={2} prefix="¥" disabled={!item.enabled} value={item.transportPerMonth} onChange={value => updateTravelItem(section, 'transportPerMonth', Number(value ?? 0))} /></label>
          </div>
        )}
        <div className="project-quotation-travel-total"><span>{isTravel ? '出差费用小计' : '驻场费用小计'}</span><strong>{formatAmount(subtotal)}</strong></div>
      </section>
    );
  };

  const renderOtherCosts = () => {
    const findCost = (id: string) => config.otherCosts.find(item => item.id === id);
    const customCosts = config.otherCosts.filter(item => !KNOWN_COST_IDS.has(item.id));
    return (
      <section className="project-quotation-config-section">
        <div className="project-quotation-config-section-head">
          <div><h3>其他成本配置</h3><Text type="secondary">覆盖商务、销售、项目运营、第三方服务、硬件及自定义成本。</Text></div>
        </div>
        <div className="project-quotation-cost-groups">
          {OTHER_COST_GROUPS.slice(0, 1).map(group => (
            <section className="project-quotation-config-card" key={group.id}>
              <h4>{group.title}</h4>
              <div className="project-quotation-input-grid project-quotation-cost-input-grid">
                {group.items.map(definition => {
                  const item = findCost(definition.id);
                  return <label key={definition.id}><span>{definition.label}</span><InputNumber min={0} precision={2} prefix="¥" value={item?.amount ?? 0} onChange={value => updateOtherCost(definition.id, Number(value ?? 0))} /></label>;
                })}
              </div>
            </section>
          ))}
          <section className="project-quotation-config-card">
            <h4>销售成本</h4>
            <div className="project-quotation-input-grid project-quotation-cost-input-grid">
              <label><span>销售提成比例（%）</span><InputNumber min={0} max={100} precision={2} suffix="%" value={config.salesCommissionRate} onChange={value => setConfig(current => ({ ...current, salesCommissionRate: Number(value ?? 0) }))} /></label>
              <label><span>其他销售费用（元）</span><InputNumber min={0} precision={2} prefix="¥" value={config.salesOtherCost ?? 0} onChange={value => setConfig(current => ({ ...current, salesOtherCost: Number(value ?? 0) }))} /></label>
              <div className="project-quotation-inline-total"><span>销售提成</span><strong>{formatAmount(summary.salesCommission)}</strong></div>
            </div>
          </section>
          {OTHER_COST_GROUPS.slice(1).map(group => (
            <section className="project-quotation-config-card" key={group.id}>
              <h4>{group.title}</h4>
              <div className="project-quotation-input-grid project-quotation-cost-input-grid">
                {group.items.map(definition => {
                  const item = findCost(definition.id);
                  return <label key={definition.id}><span>{definition.label}</span><InputNumber min={0} precision={2} prefix="¥" value={item?.amount ?? 0} onChange={value => updateOtherCost(definition.id, Number(value ?? 0))} /></label>;
                })}
              </div>
            </section>
          ))}
          <section className="project-quotation-config-card">
            <div className="project-quotation-card-head">
              <div><h4>自定义成本</h4><Text type="secondary">补充未在标准项中的项目成本。</Text></div>
              <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setConfig(current => ({
                ...current,
                otherCosts: [...current.otherCosts, { id: createId('custom-cost'), type: '自定义成本', description: '', label: '', group: 'custom', amount: 0 }],
              }))}>新增成本</Button>
            </div>
            {customCosts.length ? <div className="project-quotation-custom-cost-list">{customCosts.map(item => (
              <div className="project-quotation-custom-cost" key={item.id}>
                <Input value={item.label || item.description} placeholder="成本名称，如：特殊硬件采购" onChange={value => setConfig(current => ({ ...current, otherCosts: current.otherCosts.map(cost => cost.id === item.id ? { ...cost, label: value, description: value } : cost) }))} />
                <InputNumber min={0} precision={2} prefix="¥" value={item.amount} onChange={value => updateOtherCost(item.id, Number(value ?? 0))} />
                <Button type="text" status="danger" size="mini" icon={<IconDelete />} aria-label="删除成本" onClick={() => setConfig(current => ({ ...current, otherCosts: current.otherCosts.filter(cost => cost.id !== item.id) }))} />
              </div>
            ))}</div> : <div className="project-quotation-config-empty">暂无自定义成本。</div>}
          </section>
        </div>
      </section>
    );
  };

  const renderSummary = () => {
    const laborRows = getQuotationLaborDetails(config).map(item => ({
      name: `${item.sourceName} · ${item.role || '未命名角色'}`,
      detail: `${item.people}人 × ${item.days}天 × ${formatAmount(item.dailyRate)}/天${item.technology ? ` · ${item.technology}` : ''}`,
      amount: calculateLaborItemCost(item),
    }));
    const travelRows: Array<{ name: string; detail?: string; amount: number }> = [];
    if (config.travel.enabled) {
      travelRows.push({ name: '往返交通费', detail: `${config.travel.people}人 × ${config.travel.trips}次 × 往返`, amount: config.travel.transportPerTrip * 2 * config.travel.people * config.travel.trips });
      travelRows.push({ name: '出差住宿费', detail: `${config.travel.people}人 × ${config.travel.trips}次 × ${config.travel.days}天`, amount: config.travel.hotelPerDay * config.travel.people * config.travel.trips * config.travel.days });
      travelRows.push({ name: '出差补贴', detail: `${config.travel.people}人 × ${config.travel.trips}次 × ${config.travel.days}天`, amount: (config.travel.mealPerDay + config.travel.allowancePerDay) * config.travel.people * config.travel.trips * config.travel.days });
    }
    if (config.onsite.enabled) {
      const months = Math.ceil(config.onsite.days / 30);
      travelRows.push({ name: '驻场住宿费', detail: `${config.onsite.people}人 × ${months}月`, amount: (config.onsite.hotelPerMonth ?? 0) * config.onsite.people * months });
      travelRows.push({ name: '驻场餐饮补贴', detail: `${config.onsite.people}人 × ${config.onsite.days}天`, amount: config.onsite.mealPerDay * config.onsite.people * config.onsite.days });
      travelRows.push({ name: '驻场交通补贴', detail: `${config.onsite.people}人 × ${months}月`, amount: (config.onsite.transportPerMonth ?? 0) * config.onsite.people * months });
    }
    const otherRows = getQuotationOtherCostDetails(config);

    return (
      <section className="project-quotation-config-section project-quotation-config-summary-section">
        <div className="project-quotation-config-section-head">
          <div><h3>报价汇总</h3><Text type="secondary">实时汇总六个配置模块，确认后带入报价记录。</Text></div>
          <Tag color="arcoblue">实时计算</Tag>
        </div>
        <div className="project-quotation-config-summary-meta">
          <QuotationMetric label="总人天" value={`${summary.totalPersonDays} 人天`} />
          <QuotationMetric label="总人数" value={`${summary.totalPeople} 人`} />
          <QuotationMetric label="预估工期" value={summary.estimatedPeriod || '-'} />
          <QuotationMetric label="项目总报价" value={formatAmount(summary.totalAmount)} primary />
        </div>
        <div className="project-quotation-summary-cost-grid">
          <SummaryCostCard title="人力成本明细" rows={laborRows} total={summary.laborCost} />
          <SummaryCostCard title="出差驻场成本明细" rows={travelRows} total={summary.travelCost + summary.onsiteCost} />
          <SummaryCostCard title="其他成本明细" rows={otherRows} total={summary.otherCost} />
        </div>
        <div className="project-quotation-total-section">
          <span>项目总报价</span>
          <strong>{formatAmount(summary.totalAmount)}</strong>
          <div>
            <span>人力：{formatPercentage(summary.laborCost, summary.totalAmount)}</span>
            <span>差旅：{formatPercentage(summary.travelCost + summary.onsiteCost, summary.totalAmount)}</span>
            <span>其他：{formatPercentage(summary.otherCost, summary.totalAmount)}</span>
          </div>
        </div>
      </section>
    );
  };

  const goToNextTab = () => {
    if (activeTabIndex < QUOTATION_CONFIG_TABS.length - 1) setActiveTab(QUOTATION_CONFIG_TABS[activeTabIndex + 1].key);
  };

  const goToPreviousTab = () => {
    if (activeTabIndex > 0) setActiveTab(QUOTATION_CONFIG_TABS[activeTabIndex - 1].key);
  };

  const handleNext = () => {
    if (summary.totalAmount <= 0) {
      Message.error('请至少完成一项成本配置');
      return;
    }
    onNext(normalizeQuotationConfig(config), summary);
  };

  return (
    <Modal
      title="报价系统"
      visible={visible}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 1200, maxWidth: 'calc(100vw - 32px)' }}
      bodyStyle={{ padding: '0 20px 20px', maxHeight: 'calc(100vh - 210px)', overflow: 'auto' }}
      footer={(
        <div className="project-quotation-config-footer">
          <Button onClick={onCancel}>取消</Button>
          <Space size={8}>
            {activeTabIndex > 0 ? <Button onClick={goToPreviousTab}>上一步</Button> : null}
            {activeTab === 'summary' ? <Button type="primary" onClick={handleNext}>下一步</Button> : <Button type="primary" onClick={goToNextTab}>下一步</Button>}
          </Space>
        </div>
      )}
    >
      <div className="project-quotation-config-overview">
        <QuotationMetric label="人力成本" value={formatAmount(summary.laborCost)} />
        <QuotationMetric label="差旅与驻场" value={formatAmount(summary.travelCost + summary.onsiteCost)} />
        <QuotationMetric label="其他成本" value={formatAmount(summary.otherCost)} />
        <QuotationMetric label="报价总额" value={formatAmount(summary.totalAmount)} primary />
      </div>
      <Tabs activeTab={activeTab} onChange={key => setActiveTab(key as QuotationConfigTab)} className="project-quotation-config-tabs">
        <TabPane key="frontend" title="前端配置">{renderPlatformTab('frontend', '选择前端平台，每个平台可添加多个角色端（如用户端、商家端），并选择开发语言')}</TabPane>
        <TabPane key="backend" title="后端配置">{renderPlatformTab('backend', '选择后端服务和数据库技术栈，可添加自定义开发语言')}</TabPane>
        <TabPane key="otherRoles" title="其他岗位">{renderOtherRoles()}</TabPane>
        <TabPane key="travel" title="出差驻场"><section className="project-quotation-config-section"><div className="project-quotation-config-section-head"><div><h3>出差驻场配置</h3><Text type="secondary">出差和驻场分别配置，按不同成本规则自动计算。</Text></div></div><div className="project-quotation-travel-list">{renderTravelBlock('travel')}{renderTravelBlock('onsite')}</div></section></TabPane>
        <TabPane key="otherCosts" title="其他成本">{renderOtherCosts()}</TabPane>
        <TabPane key="summary" title="报价汇总">{renderSummary()}</TabPane>
      </Tabs>
    </Modal>
  );
}
