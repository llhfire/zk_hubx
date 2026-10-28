import { useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from '@/design-system';
import {
  AlertBanner,
  DateText,
  EmptyState,
  FeatureWorkloadMatrix,
  MetricCard,
  MoneyText,
  RoleRateGrid,
  SectionCard,
  StatusTag,
} from '@/design-system';
import {
  IconPlus, IconDelete, IconSend, IconApps, IconEye, IconCheckCircleFill, IconCloseCircleFill,
  IconExclamationCircleFill, IconRefresh, IconDown, IconUp, IconFile, IconCopy, IconSave,
} from '@/design-system';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import { computeAmountBreakdown, sumEvalDaysByRole, TECH_DAILY_RATE, validateBeforeAudit } from '../quoteFlow';
import { addWorkdays, computeProfitRate, DEFAULT_MIN_PROFIT_RATE } from '../quotePricing';
import { PLATFORM_OPTIONS } from '../types';
import type { CostItem, EvalRole, PaymentTerm, SalesAddedRole, TravelOnsiteConfig } from '../types';
import { QuoteTemplatePreviewPanel } from '../components/QuoteTemplatePreviewPanel';
import { getQuoteTemplateMissingFields, ZKRT_QUOTE_TEMPLATE } from '../quoteDocumentTemplate';
import { contractSigningEntities, findCompanyEntityByName } from '../../company-entity/companyEntityData';
import { generateQuoteHtml } from '../quotePdfTemplate';
import { useQuoteAssets } from '../useQuoteAssets';
import { createDocxBlob, downloadBlob } from '../../../../documents/wordExport';
import {
  deleteCustomPaymentPreset,
  getAllPaymentPresets,
  PaymentPlanPreset,
  saveCustomPaymentPreset,
} from '../paymentPresetStore';
import './Stage3WebAutomation.css';

const { Text, Title } = Typography;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// 常见付款条款模版预设
export const PAYMENT_TERM_PRESETS = [
  {
    name: '标准 3:3:3:1',
    description: '行业标准：预付款 30% - 阶段验收 30% - 交付上线 30% - 质保金 10%',
    terms: [
      { stage: '合同签订预付款', percent: 30 },
      { stage: '中期原型与核心功能验收', percent: 30 },
      { stage: '系统部署上线与终验', percent: 30 },
      { stage: '一年质保期满尾款', percent: 10 },
    ],
  },
  {
    name: '敏捷 5:3:2',
    description: '敏捷项目：预付款 50% - 阶段成果 30% - 交付上线 20%',
    terms: [
      { stage: '首期启动预付款', percent: 50 },
      { stage: '主干功能演示验收', percent: 30 },
      { stage: '系统上线交付验收', percent: 20 },
    ],
  },
  {
    name: '对半 5:5',
    description: '简易轻量项目：预付款 50% - 终验交付 50%',
    terms: [
      { stage: '合同签订首付款', percent: 50 },
      { stage: '系统上线验收交付款', percent: 50 },
    ],
  },
  {
    name: '大型 4:3:2:1',
    description: '大型政企：预付款 40% - 原型与设计 30% - 部署上线 20% - 质保尾款 10%',
    terms: [
      { stage: '项目启动预付款', percent: 40 },
      { stage: '详细设计与阶段验收款', percent: 30 },
      { stage: '初验通过上线款', percent: 20 },
      { stage: '终验及质保金', percent: 10 },
    ],
  },
];

// 常见销售增项预设
export const SALES_ROLE_PRESETS = [
  { roleName: 'PMO 项目管理', reason: '跨部门协作与甲方定期双周汇报协调', dailyRate: 1000 },
  { roleName: '现场技术驻场', reason: '现场环境部署联调与上线保驾护航', dailyRate: 800 },
  { roleName: '系统安全等保配合', reason: '配合第三方测评机构进行等保三级整改与报告出具', dailyRate: 1200 },
  { roleName: '定制化技术培训', reason: '为甲方技术与业务人员提供专场实操培训', dailyRate: 800 },
  { roleName: '源码交付与知识产权移交', reason: '完整工程源码构建脚本、架构文档与合规审计包', dailyRate: 1200 },
];

// 差旅城市标准基准
export const TRAVEL_STANDARDS = [
  { name: '一线标准 (北上广深)', transportFee: 1200, hotelFeePerDay: 450, allowancePerDay: 120 },
  { name: '省会/二线标准', transportFee: 800, hotelFeePerDay: 320, allowancePerDay: 100 },
  { name: '省内周边/同城', transportFee: 300, hotelFeePerDay: 240, allowancePerDay: 80 },
];

// 高频外部自费与代采项目预设
export const PRESET_PROCUREMENT_ITEMS = [
  { name: '阿里云 ECS/RDS 服务器', amount: 6000, note: '[我方代采] 8核16G 10M带宽包年' },
  { name: '域名注册与 SSL 国密证书', amount: 1500, note: '[客户直购] 顶级域名及企业OV证书' },
  { name: '腾讯云短信验证码包', amount: 2000, note: '[我方代采] 5万条行业短信服务' },
  { name: '微信小程序认证与商户号', amount: 300, note: '[客户直购] 腾讯官方企业主体年度认证' },
  { name: 'Apple Developer 开发者年费', amount: 688, note: '[客户直购] 苹果开发者组织账号年费' },
  { name: 'AI 大模型 API Token 算力包', amount: 5000, note: '[我方代采] 预充值调用额度实报实销' },
];

// 资金流动进度条调色板
const FLOW_BAR_COLORS = [
  '#165DFF',
  '#722ED1',
  '#00B42A',
  '#F77234',
  '#0FC6C2',
  '#D91AD9',
  '#FF7D00',
];

export function Stage3WebAutomation({ quote, readonly }: StageProps) {
  const assets = useQuoteAssets();
  const { updateQuote, submitForAudit, isLeadFrozen } = useQuotation();
  const leadFrozen = isLeadFrozen(quote.id);

  // 从工作台一和工作台二获取的数据（只读展示）
  const endpointConfigs = quote.endpointConfigs || [];
  const featureList = quote.featureList || [];
  const evalSheet = quote.evalSheet;
  const roleTotals = useMemo(() => sumEvalDaysByRole(evalSheet), [evalSheet]);

  // 本地折叠面板状态与弹窗
  const [showFeatureDetail, setShowFeatureDetail] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'travel' | 'onsite'>('travel');

  // 自定义付款方案模版引擎状态
  const [paymentPresetsRevision, setPaymentPresetsRevision] = useState(0);
  const [savePresetModalVisible, setSavePresetModalVisible] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const allPaymentPresets = useMemo(() => getAllPaymentPresets(), [paymentPresetsRevision]);

  // 本地状态 - 兼容旧数据格式
  const [travelOnsite, setTravelOnsite] = useState<TravelOnsiteConfig>(() => {
    const t = quote.travelOnsite;
    return {
      ...t,
      travelDetails: (t as any)?.travelDetails || (t as any)?.travelDetail ? [(t as any).travelDetail || { location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }] : [],
      onsiteDetails: (t as any)?.onsiteDetails || (t as any)?.onsiteDetail ? [(t as any).onsiteDetail || { location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }] : [],
    };
  });
  const [otherCosts, setOtherCosts] = useState<CostItem[]>(quote.otherCosts || []);
  const [salesAddedRoles, setSalesAddedRoles] = useState<SalesAddedRole[]>(quote.salesAddedRoles || []);

  // 岗位日均成本：key -> 成本
  const [roleDailyCosts, setRoleDailyCosts] = useState<Record<string, number>>(() => {
    const costs: Record<string, number> = { ...(quote.roleDailyCosts ?? {}) };
    evalSheet?.activeRoles.forEach((r) => {
      if (costs[r.key] == null) costs[r.key] = TECH_DAILY_RATE;
    });
    return costs;
  });

  // 计算总人天和总金额
  const grandTotalDays = useMemo(() => {
    if (!evalSheet) return 0;
    return evalSheet.evaluationUnits.reduce((s, u) => s + u.totalDays, 0);
  }, [evalSheet]);

  const workingQuote = useMemo(() => ({
    ...quote,
    roleDailyCosts,
    salesAddedRoles,
    travelOnsite,
    otherCosts,
  }), [quote, roleDailyCosts, salesAddedRoles, travelOnsite, otherCosts]);

  const breakdown = useMemo(() => computeAmountBreakdown(workingQuote), [workingQuote]);

  const profitRate = useMemo(() => computeProfitRate({
    grandTotal: breakdown.grandTotal,
    upliftTotal: breakdown.addedCost,
    roleCostTotal: breakdown.techLaborCost,
  }), [breakdown]);

  const validationIssues = useMemo(() => validateBeforeAudit(workingQuote), [workingQuote]);
  const blockingIssues = validationIssues.filter((issue) => issue.severity === 'error');
  const warningIssues = validationIssues.filter((issue) => issue.severity === 'warning');
  const templateMissingFields = useMemo(() => getQuoteTemplateMissingFields(workingQuote), [workingQuote]);
  const expectedEndDate = evalSheet?.manualWorkDays
    ? addWorkdays(new Date().toISOString().slice(0, 10), evalSheet.manualWorkDays)
    : null;

  // 付款比例合计与校验
  const paymentTerms = quote.summary?.paymentTerms ?? [];
  const paymentPercentTotal = useMemo(() => {
    return paymentTerms.reduce((sum, term) => sum + (term.percent || 0), 0);
  }, [paymentTerms]);
  const isPayment100 = paymentPercentTotal === 100;

  const persist = (patch: Partial<typeof quote>) => {
    updateQuote(quote.id, (q) => ({ ...q, ...patch }));
  };

  // ─── 费率与付款配置逻辑 ────────────────────────────────────

  const updateRoleDailyCost = (roleKey: string, value: number) => {
    const next = { ...roleDailyCosts, [roleKey]: value };
    setRoleDailyCosts(next);
    persist({ roleDailyCosts: next });
  };

  const resetAllRolesToBaseRate = () => {
    const next: Record<string, number> = {};
    evalSheet?.activeRoles.forEach((r) => {
      next[r.key] = TECH_DAILY_RATE;
    });
    setRoleDailyCosts(next);
    persist({ roleDailyCosts: next });
    Message.success(`已将所有技术岗位日均成本重置为基准 ¥${TECH_DAILY_RATE}/天`);
  };

  const applyPaymentPreset = (preset: { name: string; terms: (PaymentTerm | { stage: string; percent: number })[] }) => {
    persist({
      summary: {
        totalLaborDays: breakdown.totalLaborDays,
        projectWorkDays: evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
        grandTotalPrice: breakdown.grandTotal,
        paymentTerms: preset.terms.map((t) => ({
          stage: t.stage,
          percent: t.percent,
          expectedDate: (t as PaymentTerm).expectedDate,
          conditionType: (t as PaymentTerm).conditionType || 'working_day',
          conditionDays: (t as PaymentTerm).conditionDays ?? 5,
          conditionDesc: (t as PaymentTerm).conditionDesc ?? '',
        })),
        taxIncluded: quote.summary?.taxIncluded ?? true,
        warrantyYears: quote.summary?.warrantyYears ?? 1,
        invoiceType: quote.summary?.invoiceType ?? '专票',
      },
    });
    Message.success(`已套用「${preset.name}」付款模版`);
  };

  // 自动补齐最后一期付款比例到 100%
  const autoBalancePaymentTerm = () => {
    const remainder = 100 - paymentPercentTotal;
    if (remainder <= 0) return;
    if (paymentTerms.length === 0) {
      persist({
        summary: {
          totalLaborDays: breakdown.totalLaborDays,
          projectWorkDays: evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
          grandTotalPrice: breakdown.grandTotal,
          paymentTerms: [{ stage: '首期启动与终验款', percent: 100 }],
          taxIncluded: quote.summary?.taxIncluded ?? true,
          warrantyYears: quote.summary?.warrantyYears ?? 1,
          invoiceType: quote.summary?.invoiceType ?? '专票',
        },
      });
      Message.success('已自动创建 100% 款项');
      return;
    }
    const lastIdx = paymentTerms.length - 1;
    const nextTerms = paymentTerms.map((t, idx) => (
      idx === lastIdx ? { ...t, percent: Math.min(100, Math.max(0, (t.percent || 0) + remainder)) } : t
    ));
    persist({
      summary: {
        totalLaborDays: breakdown.totalLaborDays,
        projectWorkDays: evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
        grandTotalPrice: breakdown.grandTotal,
        paymentTerms: nextTerms,
        taxIncluded: quote.summary?.taxIncluded ?? true,
        warrantyYears: quote.summary?.warrantyYears ?? 1,
        invoiceType: quote.summary?.invoiceType ?? '专票',
      },
    });
    Message.success(`已自动补齐尾款 ${remainder}%，当前比例合计 100%`);
  };

  // 保存当前方案为全局模版
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) {
      Message.warning('请输入付款方案模版名称');
      return;
    }
    if (paymentTerms.length === 0) {
      Message.warning('当前暂无付款期，无法保存为方案模版');
      return;
    }
    saveCustomPaymentPreset(newPresetName, paymentTerms, newPresetDesc);
    setPaymentPresetsRevision((v) => v + 1);
    setSavePresetModalVisible(false);
    setNewPresetName('');
    setNewPresetDesc('');
    Message.success(`已将「${newPresetName}」保存为付款方案模版，其他报价单可直接引用`);
  };

  // 删除自定义模版
  const handleDeleteCustomPreset = (presetId: string, presetName: string) => {
    deleteCustomPaymentPreset(presetId);
    setPaymentPresetsRevision((v) => v + 1);
    Message.info(`已删除自定义模版「${presetName}」`);
  };

  const updatePaymentTerm = (index: number, patch: Partial<PaymentTerm>) => {
    const nextTerms = paymentTerms.map((term, termIndex) => (
      termIndex === index ? { ...term, ...patch } : term
    ));
    persist({
      summary: {
        totalLaborDays: breakdown.totalLaborDays,
        projectWorkDays: evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
        grandTotalPrice: breakdown.grandTotal,
        paymentTerms: nextTerms,
        taxIncluded: quote.summary?.taxIncluded ?? true,
        warrantyYears: quote.summary?.warrantyYears ?? 1,
        invoiceType: quote.summary?.invoiceType ?? '专票',
      },
    });
  };

  const addPaymentTerm = () => {
    const nextTerms: PaymentTerm[] = [
      ...paymentTerms,
      {
        stage: `第 ${paymentTerms.length + 1} 期付款`,
        percent: Math.max(0, 100 - paymentPercentTotal),
        conditionType: 'working_day',
        conditionDays: 5,
        conditionDesc: '阶段成果验收后',
      },
    ];
    persist({
      summary: {
        totalLaborDays: breakdown.totalLaborDays,
        projectWorkDays: evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
        grandTotalPrice: breakdown.grandTotal,
        paymentTerms: nextTerms,
        taxIncluded: quote.summary?.taxIncluded ?? true,
        warrantyYears: quote.summary?.warrantyYears ?? 1,
        invoiceType: quote.summary?.invoiceType ?? '专票',
      },
    });
  };

  const removePaymentTerm = (index: number) => {
    const nextTerms = paymentTerms.filter((_, i) => i !== index);
    persist({
      summary: {
        totalLaborDays: breakdown.totalLaborDays,
        projectWorkDays: evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
        grandTotalPrice: breakdown.grandTotal,
        paymentTerms: nextTerms,
        taxIncluded: quote.summary?.taxIncluded ?? true,
        warrantyYears: quote.summary?.warrantyYears ?? 1,
        invoiceType: quote.summary?.invoiceType ?? '专票',
      },
    });
  };

  // ─── 销售增项岗位 ──────────────────────────────────────────

  const addSalesRolePreset = (preset: typeof SALES_ROLE_PRESETS[0]) => {
    const next: SalesAddedRole[] = [
      ...salesAddedRoles,
      {
        id: uid('ar'),
        roleName: preset.roleName,
        headcount: 1,
        days: 5,
        dailyRate: preset.dailyRate,
        subtotal: preset.dailyRate * 5,
        reason: preset.reason,
      },
    ];
    setSalesAddedRoles(next);
    persist({ salesAddedRoles: next });
    Message.success(`已添加增项「${preset.roleName}」`);
  };

  const cloneSalesRole = (role: SalesAddedRole) => {
    const next: SalesAddedRole[] = [
      ...salesAddedRoles,
      {
        ...role,
        id: uid('ar'),
        roleName: `${role.roleName} (副本)`,
      },
    ];
    setSalesAddedRoles(next);
    persist({ salesAddedRoles: next });
    Message.success(`已复制增项「${role.roleName}」`);
  };

  // ─── 出差配置 ─────────────────────────────────────────────

  const calcTravelSubtotal = (details: any[]) => {
    return details.reduce((sum, d) => {
      const transportFee = (d.transportFee || 0) * (d.headcount || 1);
      const hotelTotal = (d.hotelFeePerDay || 0) * (d.headcount || 1) * (d.days || 1);
      const allowanceTotal = (d.allowancePerDay || 0) * (d.headcount || 1) * (d.days || 1);
      return sum + transportFee + hotelTotal + allowanceTotal;
    }, 0);
  };

  const toggleTravel = (enabled: boolean) => {
    const details = enabled ? (travelOnsite.travelDetails.length > 0 ? travelOnsite.travelDetails : [{ location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }]) : [];
    const next = { ...travelOnsite, enableTravel: enabled, travelDetails: details, travelSubtotal: enabled ? calcTravelSubtotal(details) : 0 };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const addTravelDetail = () => {
    const details = [...travelOnsite.travelDetails, { location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }];
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const applyTravelStandard = (idx: number, std: typeof TRAVEL_STANDARDS[0]) => {
    const details = travelOnsite.travelDetails.map((d, i) => (
      i === idx ? {
        ...d,
        transportFee: std.transportFee,
        hotelFeePerDay: std.hotelFeePerDay,
        allowancePerDay: std.allowancePerDay,
      } : d
    ));
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
    Message.success(`已套用「${std.name}」费率标准`);
  };

  const cloneTravelDetail = (idx: number) => {
    const target = travelOnsite.travelDetails[idx];
    const details = [
      ...travelOnsite.travelDetails,
      { ...target, location: target.location ? `${target.location} (副本)` : '' },
    ];
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
    Message.success('已复制出差目的地');
  };

  const updateTravelDetail = (idx: number, field: string, value: number | string) => {
    const details = travelOnsite.travelDetails.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const removeTravelDetail = (idx: number) => {
    const details = travelOnsite.travelDetails.filter((_, i) => i !== idx);
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  // ─── 驻场配置 ─────────────────────────────────────────────

  const calcOnsiteSubtotal = (details: any[]) => {
    return details.reduce((sum, d) => sum + (d.serviceFeePerDay || 0) * (d.headcount || 1) * (d.days || 1), 0);
  };

  const toggleOnsite = (enabled: boolean) => {
    const details = enabled ? (travelOnsite.onsiteDetails.length > 0 ? travelOnsite.onsiteDetails : [{ location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }]) : [];
    const next = { ...travelOnsite, enableOnsite: enabled, onsiteDetails: details, onsiteSubtotal: enabled ? calcOnsiteSubtotal(details) : 0 };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const addOnsiteDetail = () => {
    const details = [...travelOnsite.onsiteDetails, { location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }];
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const cloneOnsiteDetail = (idx: number) => {
    const target = travelOnsite.onsiteDetails[idx];
    const details = [
      ...travelOnsite.onsiteDetails,
      { ...target, location: target.location ? `${target.location} (副本)` : '' },
    ];
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
    Message.success('已复制现场驻场地点');
  };

  const updateOnsiteDetail = (idx: number, field: string, value: number | string) => {
    const details = travelOnsite.onsiteDetails.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const removeOnsiteDetail = (idx: number) => {
    const details = travelOnsite.onsiteDetails.filter((_, i) => i !== idx);
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  // ─── 其他成本（外部自费与代采） ───────────────────────────

  const addCost = () => {
    const next = [...otherCosts, { id: uid('cost'), name: '', amount: 0, note: '' }];
    setOtherCosts(next);
    persist({ otherCosts: next });
  };

  const addPresetProcurementItem = (item: typeof PRESET_PROCUREMENT_ITEMS[0]) => {
    const next = [...otherCosts, { id: uid('cost'), name: item.name, amount: item.amount, note: item.note }];
    setOtherCosts(next);
    persist({ otherCosts: next });
    Message.success(`已添加代采项「${item.name}」`);
  };

  const updateCost = (id: string, field: keyof CostItem, value: string | number) => {
    const next = otherCosts.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setOtherCosts(next);
    persist({ otherCosts: next });
  };

  const removeCost = (id: string) => {
    const next = otherCosts.filter((c) => c.id !== id);
    setOtherCosts(next);
    persist({ otherCosts: next });
  };

  // ─── 提交审批 ─────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      await submitForAudit(quote.id);
      Message.success('报价已提交审批');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '提交审批失败');
    }
  };

  // 实体与客户版报价单预览
  const entity = findCompanyEntityByName(quote.signingEntity ?? ZKRT_QUOTE_TEMPLATE.signingEntity);
  const quoteHtml = useMemo(() => generateQuoteHtml({
    quote: workingQuote,
    breakdown,
    company: {
      name: entity?.name ?? '中科软通（武汉）科技有限公司',
      address: entity?.address ?? '',
      phone: entity?.contactPhone ?? '',
      representative: entity?.legalPerson ?? '',
    },
    isSupplement: quote.isSupplement,
    assets,
  }), [assets, breakdown, entity, quote.isSupplement, workingQuote]);

  // 成本百分比计算
  const totalCostForBar = Math.max(breakdown.grandTotal, 1);
  const techPercent = Math.round((breakdown.techLaborCost / totalCostForBar) * 100);
  const addedPercent = Math.round((breakdown.addedCost / totalCostForBar) * 100);
  const deliveryPercent = Math.round(((breakdown.travelSubtotal + breakdown.onsiteSubtotal) / totalCostForBar) * 100);

  return (
    <div className="stage3-container hubx-numeral">
      {/* 顶栏：签约法人主体与增补信息轻量横栏 */}
      <SectionCard size="small" style={{ marginBottom: 16, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text bold style={{ fontSize: 'var(--text-sm)' }}>签约主体：</Text>
            <Select
              aria-label="报价单签约主体"
              value={quote.signingEntity || undefined}
              disabled={readonly}
              placeholder="请选择签约主体"
              style={{ width: 280 }}
              options={contractSigningEntities.map((item) => ({ label: item.name, value: item.shortName }))}
              onChange={(signingEntity) => persist({ signingEntity })}
            />
            {entity && (
              <StatusTag tone="info" style={{ fontSize: 'var(--text-xs)' }}>
                信用代码: {entity.taxNumber}
              </StatusTag>
            )}
            {quote.isSupplement ? (
              <StatusTag tone="purple">增补合同报价</StatusTag>
            ) : (
              <StatusTag tone="neutral">标准首版报价</StatusTag>
            )}
          </div>

          {quote.isSupplement && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 'var(--ds-text-dense)' }}>本次变更增减额：</Text>
              <InputNumber
                style={{ width: 140 }}
                value={quote.supplementChangeAmount ?? 0}
                disabled={readonly}
                prefix="¥"
                placeholder="支持负数"
                onChange={(value) => persist({ supplementChangeAmount: typeof value === 'number' ? value : 0 })}
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* 72:28 双栏主体结构 */}
      <div className="stage3-layout">
        {/* 左侧 72%：商务精算与履约配置 */}
        <div className="stage3-main">

          {/* 模块 1：研发成本与岗位费率调优器（核心卡片网格 + 渐进展开明细） */}
          <SectionCard
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconApps style={{ color: 'rgb(var(--arcoblue-6))' }} />
                  <span style={{ fontWeight: 600 }}>研发人力成本与岗位费率</span>
                  {evalSheet && (
                    <StatusTag size="small" tone="info">
                      总工期 {evalSheet.manualWorkDays || '-'} 工作日 / 共 {grandTotalDays.toFixed(1)} 人天
                    </StatusTag>
                  )}
                </div>
                <Space size={8}>
                  {!readonly && (
                    <Button size="mini" type="text" icon={<IconRefresh />} onClick={resetAllRolesToBaseRate}>
                      重置基准 ¥{TECH_DAILY_RATE}/天
                    </Button>
                  )}
                  <Button
                    size="mini"
                    type="outline"
                    icon={showFeatureDetail ? <IconUp /> : <IconDown />}
                    onClick={() => setShowFeatureDetail(!showFeatureDetail)}
                  >
                    {showFeatureDetail ? '收起功能工时明细' : `展开功能工时明细 (${featureList.reduce((s, m) => s + Math.max(m.subFeatures.length, 1), 0)} 项)`}
                  </Button>
                </Space>
              </div>
            }
          >
            {/* 岗位费率紧凑卡片网格 */}
            {evalSheet && evalSheet.activeRoles.length > 0 ? (
              <>
                <RoleRateGrid
                  items={evalSheet.activeRoles.map((role: EvalRole) => ({
                    key: role.key,
                    name: role.name,
                    days: roleTotals[role.key] || 0,
                    dailyRate: roleDailyCosts[role.key] ?? TECH_DAILY_RATE,
                  }))}
                  readonly={readonly}
                  onDailyRateChange={(roleKey, dailyRate) => updateRoleDailyCost(roleKey, dailyRate)}
                />

                {/* 渐进展开：完整功能工时明细表格 */}
                {showFeatureDetail && (
                  <FeatureWorkloadMatrix
                    endpoints={endpointConfigs.map((endpoint) => ({
                      key: endpoint.id,
                      name: endpoint.name,
                      platforms: endpoint.platforms.map((platformId) => PLATFORM_OPTIONS.find((platform) => platform.id === platformId)?.name || platformId),
                    }))}
                    modules={featureList.map((module) => ({
                      key: module.id,
                      endpointKey: module.endpointId,
                      name: module.name,
                      subFeatures: module.subFeatures.map((feature) => ({ key: feature.id, name: feature.name })),
                    }))}
                    roles={evalSheet.activeRoles.map((role) => ({
                      key: role.key,
                      name: role.name,
                      dailyRate: roleDailyCosts[role.key] ?? TECH_DAILY_RATE,
                    }))}
                    units={evalSheet.evaluationUnits.map((unit) => ({
                      subFeatureKeys: unit.boundSubFeatureIds,
                      totalDays: unit.totalDays,
                      workloads: unit.manualWorkload,
                    }))}
                  />
                )}
              </>
            ) : (
              <EmptyState description="暂无评估数据" />
            )}
          </SectionCard>

          {/* 模块 2：销售增项岗位配置 */}
          <SectionCard
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <span style={{ fontWeight: 600 }}>销售商务增项</span>
                  <StatusTag size="small" tone="warning">计入总价 · 不占研发人天</StatusTag>
                </Space>
                {!readonly && (
                  <Space size={6}>
                    <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>快捷添加:</Text>
                    {SALES_ROLE_PRESETS.map((p) => (
                      <StatusTag
                        key={p.roleName}
                        size="small"
                        tone="info"
                        className="stage3-preset-btn"
                        onClick={() => addSalesRolePreset(p)}
                      >
                        + {p.roleName}
                      </StatusTag>
                    ))}
                  </Space>
                )}
              </div>
            }
          >
            {salesAddedRoles.length === 0 ? (
              <div className="stage3-empty-placeholder">
                当前暂无销售商务增项，项目按研发工时与履约服务核算。可点击上方快捷标签一键添加 PMO、等保配合或上线保驾。
              </div>
            ) : (
              salesAddedRoles.map((role) => (
                <div key={role.id} style={{ padding: '10px 12px', border: '1px solid var(--color-border-2)', borderRadius: 'var(--radius-sm)', marginBottom: 8, background: 'var(--color-fill-1)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(180px, 1.6fr) 70px 70px 105px 95px 68px', gap: 10, alignItems: 'center' }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>岗位名称</Text>
                      <Input
                        size="small"
                        value={role.roleName}
                        onChange={(v) => {
                          const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, roleName: v } : r));
                          setSalesAddedRoles(next);
                          persist({ salesAddedRoles: next });
                        }}
                        placeholder="如：PMO 项目管理"
                        disabled={readonly}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>增项事由</Text>
                      <Input
                        size="small"
                        value={role.reason}
                        onChange={(v) => {
                          const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, reason: v } : r));
                          setSalesAddedRoles(next);
                          persist({ salesAddedRoles: next });
                        }}
                        placeholder="增项原因与交付要求"
                        disabled={readonly}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>人数</Text>
                      <InputNumber
                        size="small"
                        min={1}
                        value={role.headcount}
                        onChange={(v) => {
                          const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, headcount: v || 1, subtotal: (v || 1) * r.days * r.dailyRate } : r));
                          setSalesAddedRoles(next);
                          persist({ salesAddedRoles: next });
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>天数</Text>
                      <InputNumber
                        size="small"
                        min={1}
                        value={role.days}
                        onChange={(v) => {
                          const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, days: v || 1, subtotal: r.headcount * (v || 1) * r.dailyRate } : r));
                          setSalesAddedRoles(next);
                          persist({ salesAddedRoles: next });
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>日单价</Text>
                      <InputNumber
                        size="small"
                        min={0}
                        prefix="¥"
                        value={role.dailyRate}
                        onChange={(v) => {
                          const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, dailyRate: v || 0, subtotal: r.headcount * r.days * (v || 0) } : r));
                          setSalesAddedRoles(next);
                          persist({ salesAddedRoles: next });
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>小计</Text>
                      <Text bold style={{ color: 'rgb(var(--danger-6))', fontSize: 'var(--ds-text-dense)' }}><MoneyText value={role.subtotal} tone="danger" /></Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {!readonly && (
                        <>
                          <Tooltip content="复制增项">
                            <Button size="mini" icon={<IconCopy />} onClick={() => cloneSalesRole(role)} />
                          </Tooltip>
                          <Button size="mini" status="danger" icon={<IconDelete />} onClick={() => {
                            const next = salesAddedRoles.filter((r) => r.id !== role.id);
                            setSalesAddedRoles(next);
                            persist({ salesAddedRoles: next });
                          }} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {!readonly && (
                <Button size="small" icon={<IconPlus />} onClick={() => {
                  const next = [...salesAddedRoles, { id: uid('ar'), roleName: '', headcount: 1, days: 1, dailyRate: 800, subtotal: 800, reason: '' }];
                  setSalesAddedRoles(next);
                  persist({ salesAddedRoles: next });
                }}>
                  添加自定义增项
                </Button>
              )}
              {salesAddedRoles.length > 0 && (
                <div style={{ padding: '6px 12px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                    共 {salesAddedRoles.reduce((s, r) => s + r.headcount * r.days, 0)} 人天
                  </Text>
                  <Divider type="vertical" style={{ margin: '0 4px' }} />
                  <Text>增项小计：</Text>
                  <Text bold style={{ color: 'rgb(var(--danger-6))', fontSize: 'var(--text-sm)' }}><MoneyText value={salesAddedRoles.reduce((s, r) => s + r.subtotal, 0)} tone="danger" /></Text>
                </div>
              )}
            </div>
          </SectionCard>

          {/* 模块 3：交付履约配置（出差与驻场服务合并卡片） */}
          <SectionCard
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <span style={{ fontWeight: 600 }}>交付履约服务（出差与驻场）</span>
                  <StatusTag size="small" tone={travelOnsite.enableTravel || travelOnsite.enableOnsite ? 'success' : 'neutral'}>
                    履约合计: <MoneyText value={breakdown.travelSubtotal + breakdown.onsiteSubtotal} />
                  </StatusTag>
                </Space>
              </div>
            }
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {/* 出差区域 */}
              <div style={{ border: '1px solid var(--color-border-2)', borderRadius: 'var(--radius-md)', padding: 12, background: travelOnsite.enableTravel ? 'transparent' : 'var(--color-fill-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: travelOnsite.enableTravel ? 12 : 0 }}>
                  <Space align="center">
                    <Switch checked={travelOnsite.enableTravel} onChange={toggleTravel} disabled={readonly} />
                    <Text bold>异地出差服务</Text>
                    {travelOnsite.enableTravel && (
                      <StatusTag size="small" tone="info">{travelOnsite.travelDetails.length} 个目的地</StatusTag>
                    )}
                  </Space>
                  {travelOnsite.enableTravel && (
                    <Text bold style={{ color: 'rgb(var(--danger-6))', fontSize: 'var(--ds-text-dense)' }}>差旅小计: <MoneyText value={travelOnsite.travelSubtotal} tone="danger" /></Text>
                  )}
                </div>

                {travelOnsite.enableTravel && (
                  <>
                    {travelOnsite.travelDetails.map((detail, idx) => {
                      const destTransport = (detail.transportFee || 0) * (detail.headcount || 1);
                      const destHotel = (detail.hotelFeePerDay || 0) * (detail.headcount || 1) * (detail.days || 1);
                      const destAllowance = (detail.allowancePerDay || 0) * (detail.headcount || 1) * (detail.days || 1);
                      const destSubtotal = destTransport + destHotel + destAllowance;
                      return (
                        <div key={idx} style={{ padding: '10px 12px', background: 'var(--color-fill-1)', border: '1px solid var(--color-border-2)', borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text bold style={{ fontSize: 'var(--text-xs)' }}>出差目的地 {idx + 1}: {detail.location || '待定'}</Text>
                              {!readonly && (
                                <Space size={4}>
                                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>套用标准:</Text>
                                  {TRAVEL_STANDARDS.map((std) => (
                                    <StatusTag
                                      key={std.name}
                                      size="small"
                                      tone="info"
                                      className="stage3-action-chip"
                                      onClick={() => applyTravelStandard(idx, std)}
                                    >
                                      {std.name}
                                    </StatusTag>
                                  ))}
                                </Space>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-1)' }}>
                                单地小计: <MoneyText value={destSubtotal} />
                              </span>
                              {!readonly && (
                                <Space size={4}>
                                  <Tooltip content="复制目的地">
                                    <Button size="mini" icon={<IconCopy />} onClick={() => cloneTravelDetail(idx)} />
                                  </Tooltip>
                                  {travelOnsite.travelDetails.length > 1 && (
                                    <Button size="mini" status="danger" icon={<IconDelete />} onClick={() => removeTravelDetail(idx)} />
                                  )}
                                </Space>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>出差地点</Text>
                              <Input size="small" value={detail.location} onChange={(v) => updateTravelDetail(idx, 'location', v)} placeholder="如：北京、上海" disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>人数</Text>
                              <InputNumber size="small" min={1} value={detail.headcount} onChange={(v) => updateTravelDetail(idx, 'headcount', v || 1)} disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>天数</Text>
                              <InputNumber size="small" min={1} value={detail.days} onChange={(v) => updateTravelDetail(idx, 'days', v || 1)} disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>往返交通/人</Text>
                              <InputNumber size="small" min={0} prefix="¥" value={detail.transportFee} onChange={(v) => updateTravelDetail(idx, 'transportFee', v || 0)} disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>住宿费/天/人</Text>
                              <InputNumber size="small" min={0} prefix="¥" value={detail.hotelFeePerDay} onChange={(v) => updateTravelDetail(idx, 'hotelFeePerDay', v || 0)} disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>补贴/天/人</Text>
                              <InputNumber size="small" min={0} prefix="¥" value={detail.allowancePerDay} onChange={(v) => updateTravelDetail(idx, 'allowancePerDay', v || 0)} disabled={readonly} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!readonly && (
                      <Button size="mini" icon={<IconPlus />} onClick={addTravelDetail}>添加出差地点</Button>
                    )}
                  </>
                )}
              </div>

              {/* 驻场区域 */}
              <div style={{ border: '1px solid var(--color-border-2)', borderRadius: 'var(--radius-md)', padding: 12, background: travelOnsite.enableOnsite ? 'transparent' : 'var(--color-fill-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: travelOnsite.enableOnsite ? 12 : 0 }}>
                  <Space align="center">
                    <Switch checked={travelOnsite.enableOnsite} onChange={toggleOnsite} disabled={readonly} />
                    <Text bold>现场驻场技术服务</Text>
                    {travelOnsite.enableOnsite && (
                      <StatusTag size="small" tone="info">{travelOnsite.onsiteDetails.length} 个驻场地</StatusTag>
                    )}
                  </Space>
                  {travelOnsite.enableOnsite && (
                    <Text bold style={{ color: 'rgb(var(--danger-6))', fontSize: 'var(--ds-text-dense)' }}>驻场小计: <MoneyText value={travelOnsite.onsiteSubtotal} tone="danger" /></Text>
                  )}
                </div>

                {travelOnsite.enableOnsite && (
                  <>
                    {travelOnsite.onsiteDetails.map((detail, idx) => {
                      const siteSubtotal = (detail.serviceFeePerDay || 0) * (detail.headcount || 1) * (detail.days || 1);
                      return (
                        <div key={idx} style={{ padding: '10px 12px', background: 'var(--color-fill-1)', border: '1px solid var(--color-border-2)', borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text bold style={{ fontSize: 'var(--text-xs)' }}>驻场地点 {idx + 1}: {detail.location || '客户现场'}</Text>
                              {!readonly && (
                                <Space size={4}>
                                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>日单价参考:</Text>
                                  {[800, 1000, 1200, 1500].map((rate) => (
                                    <StatusTag
                                      key={rate}
                                      size="small"
                                      tone="info"
                                      className="stage3-action-chip"
                                      onClick={() => updateOnsiteDetail(idx, 'serviceFeePerDay', rate)}
                                    >
                                      ¥{rate}/天
                                    </StatusTag>
                                  ))}
                                </Space>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-1)' }}>
                                单地小计: <MoneyText value={siteSubtotal} />
                              </span>
                              {!readonly && (
                                <Space size={4}>
                                  <Tooltip content="复制驻场地点">
                                    <Button size="mini" icon={<IconCopy />} onClick={() => cloneOnsiteDetail(idx)} />
                                  </Tooltip>
                                  {travelOnsite.onsiteDetails.length > 1 && (
                                    <Button size="mini" status="danger" icon={<IconDelete />} onClick={() => removeOnsiteDetail(idx)} />
                                  )}
                                </Space>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>驻场地点 / 场景</Text>
                              <Input size="small" value={detail.location} onChange={(v) => updateOnsiteDetail(idx, 'location', v)} placeholder="如：客户数据中心机房" disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>人数</Text>
                              <InputNumber size="small" min={1} value={detail.headcount} onChange={(v) => updateOnsiteDetail(idx, 'headcount', v || 1)} disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>天数</Text>
                              <InputNumber size="small" min={1} value={detail.days} onChange={(v) => updateOnsiteDetail(idx, 'days', v || 1)} disabled={readonly} />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginBottom: 2 }}>技术服务费/天/人</Text>
                              <InputNumber size="small" min={0} prefix="¥" value={detail.serviceFeePerDay} onChange={(v) => updateOnsiteDetail(idx, 'serviceFeePerDay', v || 0)} disabled={readonly} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!readonly && (
                      <Button size="mini" icon={<IconPlus />} onClick={addOnsiteDetail}>添加驻场地点</Button>
                    )}
                  </>
                )}
              </div>
            </Space>
          </SectionCard>

          {/* 模块 4：第三方自费或代采项目 */}
          <SectionCard
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <span style={{ fontWeight: 600 }}>外部自费与代采项目</span>
                  <StatusTag size="small" tone="neutral">客户自费/代采 · 不计入我方报价</StatusTag>
                </Space>
                {otherCosts.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                    自费总额：<Text bold><MoneyText value={otherCosts.reduce((s, c) => s + c.amount, 0)} /></Text>
                  </Text>
                )}
              </div>
            }
          >
            {/* 常用高频自费与代采快捷芯片 */}
            {!readonly && (
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>快捷添加常用代采:</Text>
                {PRESET_PROCUREMENT_ITEMS.map((item) => (
                  <StatusTag
                    key={item.name}
                    size="small"
                    tone="neutral"
                    className="stage3-action-chip"
                    onClick={() => addPresetProcurementItem(item)}
                  >
                    + {item.name}
                  </StatusTag>
                ))}
              </div>
            )}

            {otherCosts.length === 0 ? (
              <div className="stage3-empty-placeholder">
                暂无外部自费与代采项目。如涉及服务器、短信、域名证书或第三方 AI 算力，可点击上方常用芯片快速录入。
              </div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                {/* 统一表头行 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.2fr) 110px minmax(180px, 1.6fr) 36px', gap: 10, marginBottom: 6, padding: '0 2px' }}>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>费用名称</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>金额</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>备注说明 / 采购属性</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', textAlign: 'center' }}>操作</Text>
                </div>
                {/* 条目列表 */}
                {otherCosts.map((cost) => (
                  <div key={cost.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.2fr) 110px minmax(180px, 1.6fr) 36px', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <Input size="small" value={cost.name} onChange={(v) => updateCost(cost.id, 'name', v)} placeholder="如：云服务器、短信包" disabled={readonly} />
                    <InputNumber size="small" min={0} prefix="¥" value={cost.amount} onChange={(v) => updateCost(cost.id, 'amount', v || 0)} disabled={readonly} />
                    <Input size="small" value={cost.note} onChange={(v) => updateCost(cost.id, 'note', v)} placeholder="如：[客户直购] 阿里云ECS / [我方代采] 代收代付实报实销" disabled={readonly} />
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {!readonly && (
                        <Button size="mini" status="danger" icon={<IconDelete />} onClick={() => removeCost(cost.id)} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!readonly && (
              <Button size="mini" icon={<IconPlus />} onClick={addCost}>添加自费项目</Button>
            )}
          </SectionCard>

          {/* 模块 5：商务结算条款与付款计划预设 */}
          <SectionCard
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>商务结算与付款计划</span>
                <Space size={8}>
                  <Select
                    size="mini"
                    style={{ width: 130 }}
                    value={quote.summary?.invoiceType ?? '专票'}
                    disabled={readonly}
                    options={[
                      { label: '增值税专票 (6%)', value: '专票' },
                      { label: '增值税普票 (3%)', value: '普票' },
                      { label: '离岸免税 (0%)', value: '免税' },
                    ]}
                    onChange={(invoiceType) => persist({
                      summary: {
                        totalLaborDays: breakdown.totalLaborDays,
                        projectWorkDays: evalSheet?.manualWorkDays ?? 0,
                        grandTotalPrice: breakdown.grandTotal,
                        paymentTerms: quote.summary?.paymentTerms ?? [],
                        taxIncluded: quote.summary?.taxIncluded ?? true,
                        warrantyYears: quote.summary?.warrantyYears ?? 1,
                        invoiceType,
                      },
                    })}
                  />
                  <StatusTag size="small" tone="info">含税人民币</StatusTag>
                  <Select
                    size="mini"
                    style={{ width: 130 }}
                    value={quote.summary?.warrantyYears ?? 1}
                    disabled={readonly}
                    options={[
                      { label: '无质保', value: 0 },
                      { label: '质保 6 个月', value: 0.5 },
                      { label: '质保 1 年 (标准)', value: 1 },
                      { label: '质保 2 年 (+5%维保)', value: 2 },
                      { label: '质保 3 年 (+10%维保)', value: 3 },
                    ]}
                    onChange={(warrantyYears) => persist({
                      summary: {
                        totalLaborDays: breakdown.totalLaborDays,
                        projectWorkDays: evalSheet?.manualWorkDays ?? 0,
                        grandTotalPrice: breakdown.grandTotal,
                        paymentTerms: quote.summary?.paymentTerms ?? [],
                        taxIncluded: quote.summary?.taxIncluded ?? true,
                        invoiceType: quote.summary?.invoiceType ?? '专票',
                        warrantyYears,
                      },
                    })}
                  />
                </Space>
              </div>
            }
          >
            {/* 付款预设快捷选择与自定义方案存储 */}
            {!readonly && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>快捷套用付款比例：</Text>
                  <Button
                    size="mini"
                    type="text"
                    icon={<IconSave />}
                    onClick={() => setSavePresetModalVisible(true)}
                  >
                    保存当前方案为模版
                  </Button>
                </div>
                <div className="stage3-preset-tags">
                  {allPaymentPresets.map((preset) => (
                    <Tooltip key={preset.id || preset.name} content={preset.description} position="top">
                      <StatusTag
                        size="small"
                        tone={preset.isCustom ? 'purple' : 'info'}
                        className={`stage3-preset-btn ${preset.isCustom ? 'stage3-preset-btn-custom' : ''}`}
                        onClose={preset.isCustom ? () => handleDeleteCustomPreset(preset.id, preset.name) : undefined}
                        onClick={() => applyPaymentPreset(preset)}
                      >
                        {preset.name}
                        {preset.isCustom && ' (自定义)'}
                      </StatusTag>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* 可视化资金流动彩色里程碑进度条 */}
            {paymentTerms.length > 0 && (
              <div className="stage3-payment-flow-bar">
                {paymentTerms.map((term, index) => {
                  const termAmount = (breakdown.grandTotal * (term.percent || 0)) / 100;
                  const segmentPercent = Math.min(100, Math.max(0, term.percent || 0));
                  return (
                    <Tooltip
                      key={`bar-${term.stage}-${index}`}
                      content={(
                        <>
                          {term.stage || `第 ${index + 1} 期`}: {term.percent}% (约 <MoneyText value={termAmount} />)
                        </>
                      )}
                    >
                      <div
                        className="stage3-flow-segment"
                        style={{
                          width: `${segmentPercent}%`,
                          background: FLOW_BAR_COLORS[index % FLOW_BAR_COLORS.length],
                        }}
                      >
                        {term.stage || `第${index + 1}期`} {term.percent}%
                      </div>
                    </Tooltip>
                  );
                })}
                {paymentPercentTotal < 100 && (
                  <Tooltip content={`还差 ${100 - paymentPercentTotal}% 未分配，点击下方「一键补齐尾款」可秒级达标`}>
                    <div
                      className="stage3-flow-segment stage3-flow-segment-warning"
                      style={{ width: `${100 - paymentPercentTotal}%` }}
                    >
                      未分配 {100 - paymentPercentTotal}%
                    </div>
                  </Tooltip>
                )}
              </div>
            )}

            {/* 付款期数列表（包含：期数、预计回款日期、回款条件、回款比例、回款金额） */}
            <div style={{ marginBottom: 12, overflowX: 'auto' }}>
              <div style={{ minWidth: 720 }}>
                {/* 统一表头行 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 1.2fr) 130px minmax(230px, 1.8fr) 85px 95px 36px',
                    gap: 8,
                    marginBottom: 6,
                    padding: '0 2px',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>期数 / 阶段名称</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>预计回款日期</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>回款条件（自然日/工作日）</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>回款比例</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', textAlign: 'right' }}>回款金额</Text>
                  <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', textAlign: 'center' }}>操作</Text>
                </div>

                {/* 每一期付款项 */}
                <div style={{ display: 'grid', gap: 8 }}>
                  {paymentTerms.map((term, index) => {
                    const termAmount = (breakdown.grandTotal * (term.percent || 0)) / 100;
                    return (
                      <div
                        key={`${term.stage}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(140px, 1.2fr) 130px minmax(230px, 1.8fr) 85px 95px 36px',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        {/* 1. 期数与阶段名称 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StatusTag size="small" tone="info" style={{ flexShrink: 0, fontWeight: 600 }}>
                            第{index + 1}期
                          </StatusTag>
                          <Input
                            size="small"
                            aria-label={`第 ${index + 1} 期付款节点`}
                            value={term.stage}
                            disabled={readonly}
                            placeholder="如：合同签订预付款"
                            onChange={(stage) => updatePaymentTerm(index, { stage })}
                          />
                        </div>

                        {/* 2. 预计回款日期 */}
                        <DatePicker
                          size="small"
                          placeholder="选择回款日"
                          value={term.expectedDate}
                          disabled={readonly}
                          style={{ width: '100%' }}
                          onChange={(dateStr) => updatePaymentTerm(index, { expectedDate: dateStr })}
                        />

                        {/* 3. 回款条件（自然日、工作日） */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Input
                            size="small"
                            placeholder="如：合同生效后"
                            value={term.conditionDesc ?? ''}
                            disabled={readonly}
                            style={{ flex: 1, minWidth: 80 }}
                            onChange={(conditionDesc) => updatePaymentTerm(index, { conditionDesc })}
                          />
                          <InputNumber
                            size="small"
                            min={0}
                            max={365}
                            placeholder="天数"
                            value={term.conditionDays}
                            disabled={readonly}
                            style={{ width: 56 }}
                            onChange={(conditionDays) => updatePaymentTerm(index, { conditionDays: conditionDays || 0 })}
                          />
                          <Select
                            size="small"
                            value={term.conditionType || 'working_day'}
                            disabled={readonly}
                            style={{ width: 84 }}
                            options={[
                              { label: '工作日', value: 'working_day' },
                              { label: '自然日', value: 'calendar_day' },
                            ]}
                            onChange={(conditionType) => updatePaymentTerm(index, { conditionType })}
                          />
                        </div>

                        {/* 4. 回款比例 */}
                        <InputNumber
                          size="small"
                          aria-label={`第 ${index + 1} 期付款比例`}
                          min={0}
                          max={100}
                          value={term.percent}
                          disabled={readonly}
                          suffix="%"
                          style={{ width: '100%' }}
                          onChange={(percent) => updatePaymentTerm(index, { percent: Number(percent) || 0 })}
                        />

                        {/* 5. 回款金额 */}
                        <div
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-1)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <MoneyText value={termAmount} />
                        </div>

                        {/* 操作：删除 */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {!readonly && paymentTerms.length > 1 && (
                            <Button size="mini" status="danger" icon={<IconDelete />} onClick={() => removePaymentTerm(index)} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 比例校验提示条 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-border-2)', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!readonly && (
                  <>
                    <Button size="mini" icon={<IconPlus />} onClick={addPaymentTerm}>添加付款期</Button>
                    {!isPayment100 && paymentPercentTotal < 100 && (
                      <Button size="mini" type="primary" onClick={autoBalancePaymentTerm}>
                        一键补齐尾款 (+{100 - paymentPercentTotal}%)
                      </Button>
                    )}
                    <Button size="mini" type="text" icon={<IconSave />} onClick={() => setSavePresetModalVisible(true)}>
                      存为模版
                    </Button>
                  </>
                )}
              </div>
              <div>
                {isPayment100 ? (
                  <Text type="success" style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconCheckCircleFill /> 比例合计 100%（合规达标）
                  </Text>
                ) : (
                  <Text type="error" style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconCloseCircleFill />
                    比例合计 {paymentPercentTotal}%
                    {paymentPercentTotal < 100 ? ` (还差 ${100 - paymentPercentTotal}%)` : ` (超出 ${paymentPercentTotal - 100}%)`}
                  </Text>
                )}
              </div>
            </div>
          </SectionCard>

          {/* 模块 6：报价模板适配与导出面板 */}
          <QuoteTemplatePreviewPanel quote={workingQuote} breakdown={breakdown} />

        </div>

        {/* 右侧商务驾驶舱 (紧凑高密度 280px) */}
        <div className="stage3-cockpit-wrapper">
          <div className="stage3-cockpit-card">
            {/* 驾驶舱 Header：总报价 */}
            <div className="stage3-cockpit-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', fontWeight: 500 }}>对外总报价 (含税)</Text>
                <StatusTag size="small" tone="info" style={{ fontSize: 'var(--ds-text-micro)', padding: '0 4px', height: 18, lineHeight: '18px' }}>
                  {quote.summary?.invoiceType ?? '专票'}
                </StatusTag>
              </div>
              <div className="stage3-total-price">
                <MoneyText value={breakdown.grandTotal} />
              </div>
            </div>

            {/* 驾驶舱 Body：毛利率、工期、成本构成、内审清单与提交 */}
            <div className="stage3-cockpit-body">

              {/* 核心指标卡 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <MetricCard
                  className="stage3-metric-tile"
                  label="人力毛利率"
                  value={profitRate == null ? (
                    <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>无法计算</Text>
                  ) : (
                    <StatusTag
                      size="small"
                      tone={
                        profitRate >= DEFAULT_MIN_PROFIT_RATE
                          ? 'success'
                          : profitRate >= 0.4
                            ? 'info'
                            : 'warning'
                      }
                      style={{ fontWeight: 600, fontSize: 'var(--ds-text-caption)', padding: '0 4px', height: 20, lineHeight: '20px' }}
                    >
                      {(profitRate * 100).toFixed(1)}%
                    </StatusTag>
                  )}
                  detail={`底线: ${(DEFAULT_MIN_PROFIT_RATE * 100).toFixed(0)}%`}
                  tone={profitRate == null ? 'default' : profitRate >= DEFAULT_MIN_PROFIT_RATE ? 'success' : 'warning'}
                />

                <MetricCard
                  className="stage3-metric-tile"
                  label="交付工期"
                  value={evalSheet?.manualWorkDays || '-'}
                  suffix="工作日"
                  detail={expectedEndDate ? <>预计 <DateText value={expectedEndDate} /></> : undefined}
                />
              </div>

              {/* 成本积木多维构成条 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-2)' }}>
                  <span>成本构成</span>
                  <span>{breakdown.totalLaborDays.toFixed(1)} 人天</span>
                </div>
                <div className="stage3-brick-bar">
                  <div className="stage3-brick-segment" style={{ width: `${techPercent}%`, background: 'rgb(var(--arcoblue-6))' }} />
                  <div className="stage3-brick-segment" style={{ width: `${addedPercent}%`, background: 'rgb(var(--orange-6))' }} />
                  <div className="stage3-brick-segment" style={{ width: `${deliveryPercent}%`, background: 'rgb(var(--green-6))' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 'var(--ds-text-caption)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--arcoblue-6))', marginRight: 4 }} />技术人力</span>
                    <span style={{ fontWeight: 500 }}><MoneyText value={breakdown.techLaborCost} /></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--orange-6))', marginRight: 4 }} />商务增项</span>
                    <span style={{ fontWeight: 500 }}><MoneyText value={breakdown.addedCost} /></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--green-6))', marginRight: 4 }} />差旅驻场</span>
                    <span style={{ fontWeight: 500 }}><MoneyText value={breakdown.travelSubtotal + breakdown.onsiteSubtotal} /></span>
                  </div>
                  {breakdown.selfPaidSubtotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-3)' }}>
                      <span>客户自费</span>
                      <span><MoneyText value={breakdown.selfPaidSubtotal} /></span>
                    </div>
                  )}
                </div>
              </div>

              <Divider style={{ margin: '2px 0' }} />

              {/* 内审合规体检清单 (Pre-flight Checklist) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text bold style={{ fontSize: 'var(--ds-text-caption)' }}>内审合规体检</Text>
                  {isPayment100 && quote.signingEntity && templateMissingFields.length === 0 && !leadFrozen && (
                    <StatusTag size="small" tone="success" style={{ fontSize: 'var(--ds-text-micro)', padding: '0 4px', height: 18, lineHeight: '18px' }}>合格</StatusTag>
                  )}
                </div>
                <div className="stage3-checklist">
                  {/* 1. 签约主体 */}
                  <div className={`stage3-check-item ${quote.signingEntity ? 'pass' : 'fail'}`}>
                    <span>1. 签约主体</span>
                    <span>{quote.signingEntity ? <IconCheckCircleFill style={{ color: 'rgb(var(--success-6))' }} /> : '未选择'}</span>
                  </div>

                  {/* 2. 付款比例 */}
                  <div className={`stage3-check-item ${isPayment100 ? 'pass' : 'fail'}`}>
                    <span>2. 付款比例 100%</span>
                    <span>{isPayment100 ? <IconCheckCircleFill style={{ color: 'rgb(var(--success-6))' }} /> : `${paymentPercentTotal}% 异常`}</span>
                  </div>

                  {/* 3. 毛利率底线 */}
                  <div className={`stage3-check-item ${profitRate != null && profitRate >= DEFAULT_MIN_PROFIT_RATE ? 'pass' : 'warn'}`}>
                    <span>3. 人力毛利红线 (≥45%)</span>
                    <span>
                      {profitRate != null && profitRate >= DEFAULT_MIN_PROFIT_RATE
                        ? <IconCheckCircleFill style={{ color: 'rgb(var(--success-6))' }} />
                        : <IconExclamationCircleFill style={{ color: 'rgb(var(--warning-6))' }} />}
                    </span>
                  </div>

                  {/* 4. 模版完整性 */}
                  <div className={`stage3-check-item ${templateMissingFields.length === 0 ? 'pass' : 'fail'}`}>
                    <span>4. 报价单模板字段</span>
                    <span>{templateMissingFields.length === 0 ? <IconCheckCircleFill style={{ color: 'rgb(var(--success-6))' }} /> : `缺 ${templateMissingFields.length} 项`}</span>
                  </div>

                  {/* 5. 线索冻结状态 */}
                  <div className={`stage3-check-item ${!leadFrozen ? 'pass' : 'fail'}`}>
                    <span>5. 线索流转状态</span>
                    <span>{!leadFrozen ? <IconCheckCircleFill style={{ color: 'rgb(var(--success-6))' }} /> : '已冻结'}</span>
                  </div>
                </div>
              </div>

              {/* 异常警示提示 */}
              {blockingIssues.length > 0 && (
                <AlertBanner tone="danger" title="提交条件未满足">{blockingIssues.map((i) => i.message).join('；')}</AlertBanner>
              )}
              {warningIssues.length > 0 && (
                <AlertBanner tone="warning" title="请确认以下数字">{`${warningIssues.map((i) => i.message).join('；')}。黄灯项不阻止提交。`}</AlertBanner>
              )}
              {templateMissingFields.length > 0 && (
                <AlertBanner tone="danger" title="客户版报价单未完整">{`还需补齐：${templateMissingFields.join('、')}`}</AlertBanner>
              )}

              {/* 行动按钮 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Button
                  size="default"
                  type="outline"
                  icon={<IconEye />}
                  onClick={() => setPreviewModalVisible(true)}
                  style={{ width: '100%', height: 34, fontSize: 'var(--ds-text-dense)' }}
                >
                  预览客户版报价单
                </Button>

                {!readonly && (
                  <div className="quotation-stage-submit" style={{ width: '100%' }}>
                    <Button
                      size="default"
                      type="primary"
                      icon={<IconSend />}
                      disabled={leadFrozen || blockingIssues.length > 0 || templateMissingFields.length > 0}
                      onClick={handleSubmit}
                      style={{ width: '100%', height: 36, fontSize: 'var(--ds-text-dense)', fontWeight: 600 }}
                    >
                      提交审批
                    </Button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 报价单客户版 1:1 弹窗预览 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconFile />
            <span>客户版报价单预览 · {quote.basicInfo.projectName || quote.quoteNo}</span>
          </div>
        }
        visible={previewModalVisible}
        onOk={() => setPreviewModalVisible(false)}
        onCancel={() => setPreviewModalVisible(false)}
        okText="完成浏览"
        cancelButtonProps={{ style: { display: 'none' } }}
        style={{ width: '88vw', maxWidth: 1080 }}
      >
        <div style={{ maxHeight: '72vh', overflowY: 'auto', padding: '12px 16px', background: "var(--ds-doc-paper-tint)", borderRadius: 'var(--radius-md)' }}>
          <div
            dangerouslySetInnerHTML={{ __html: quoteHtml }}
            style={{
              background: "var(--ds-doc-paper)",
              padding: '24px 32px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--ds-shadow-panel)',
            }}
          />
        </div>
      </Modal>

      {/* 保存自定义付款方案模版弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSave style={{ color: 'rgb(var(--purple-6))' }} />
            <span>保存当前付款方案为模版</span>
          </div>
        }
        visible={savePresetModalVisible}
        onOk={handleSaveCustomPreset}
        onCancel={() => setSavePresetModalVisible(false)}
        okText="保存模版"
        cancelText="取消"
        style={{ width: 480 }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <Text bold style={{ fontSize: 'var(--ds-text-dense)', display: 'block', marginBottom: 4 }}>模版名称（必填）</Text>
            <Input
              placeholder="如：政企四期分付、老客户信贷 6:4"
              value={newPresetName}
              onChange={(val) => setNewPresetName(val)}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 'var(--ds-text-dense)', display: 'block', marginBottom: 4 }}>方案场景说明（可选）</Text>
            <Input
              placeholder="如：首付款较高或阶段验收周期长项目专用"
              value={newPresetDesc}
              onChange={(val) => setNewPresetDesc(val)}
            />
          </div>
          <div style={{ background: 'var(--color-fill-1)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
            <Text bold style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: 6 }}>当前期数构成预览：</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {paymentTerms.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                  <span>
                    {t.stage || `第 ${idx + 1} 期`}
                    {t.conditionDays ? (
                      <span style={{ color: 'var(--color-text-3)', marginLeft: 6, fontSize: 'var(--ds-text-caption)' }}>
                        ({t.conditionDesc ? `${t.conditionDesc} · ` : ''}{t.conditionDays}{t.conditionType === 'calendar_day' ? '自然日' : '工作日'})
                      </span>
                    ) : null}
                  </span>
                  <span style={{ fontWeight: 600 }}>{t.percent}%</span>
                </div>
              ))}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
              <span>比例合计</span>
              <span style={{ color: isPayment100 ? 'rgb(var(--success-6))' : 'rgb(var(--danger-6))' }}>
                {paymentPercentTotal}% {isPayment100 ? '(达标)' : '(异常)'}
              </span>
            </div>
          </div>
          {!isPayment100 && (
            <AlertBanner tone="warning">{`当前比例合计为 ${paymentPercentTotal}%，建议平账至 100% 后保存，避免在其他报价单引用时触发内审校验拦截。`}</AlertBanner>
          )}
        </Space>
      </Modal>
    </div>
  );
}
