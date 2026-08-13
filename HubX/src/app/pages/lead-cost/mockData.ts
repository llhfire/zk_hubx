export type LeadCostPlatform = '百度' | '淘宝' | '威客' | '小红书';

export type VerificationStatus = '待验证' | '有效' | '无效';
export type AppealStatus = '未申诉' | '申诉中' | '申诉成功（退款）' | '申诉失败';
export type LeadQuality = '高' | '中' | '低';

export interface ChannelOption {
  platform: LeadCostPlatform;
  channel: string;
}

export interface DailyCostRecord {
  key: string;
  date: string;
  platform: LeadCostPlatform;
  channel: string;
  optimizer: string;
  spend: number;
  refund: number;
  validLeads: number;
  invalidLeads: number;
  highQualityLeads: number;
}

export interface RechargeRecord {
  key: string;
  date: string;
  platform: LeadCostPlatform;
  amount: number;
  bonusAmount: number;
  operator: string;
  remark: string;
}

export interface RawLeadRecord {
  key: string;
  id: string;
  platform: LeadCostPlatform;
  channel: string;
  phone: string;
  requirement: string;
  optimizer: string;
  createdAt: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  invalidReason?: string;
  appealStatus: AppealStatus;
  refundAmount: number;
  assigned: boolean;
  assignedTo?: string;
  quality: LeadQuality;
}

export interface ChannelSummary {
  key: string;
  platform: LeadCostPlatform;
  channel: string;
  spend: number;
  refund: number;
  validLeads: number;
  invalidLeads: number;
  highQualityLeads: number;
}

export const platforms: LeadCostPlatform[] = ['百度', '淘宝', '威客', '小红书'];

export const channelOptions: ChannelOption[] = [
  { platform: '百度', channel: '百度-搜索推广A' },
  { platform: '百度', channel: '百度-信息流账户B' },
  { platform: '淘宝', channel: '淘宝-服务市场店铺' },
  { platform: '威客', channel: '威客-软件开发频道' },
  { platform: '小红书', channel: '小红书-企业服务投放' },
];

export const optimizers = ['张优化', '李优化', '王优化'];
export const salesUsers = ['李四', '王五', '赵六', '钱七'];

export const initialDailyCostRecords: DailyCostRecord[] = [
  { key: 'daily-1', date: '2026-05-08', platform: '百度', channel: '百度-搜索推广A', optimizer: '张优化', spend: 3600, refund: 300, validLeads: 18, invalidLeads: 7, highQualityLeads: 8 },
  { key: 'daily-2', date: '2026-05-08', platform: '淘宝', channel: '淘宝-服务市场店铺', optimizer: '李优化', spend: 2100, refund: 0, validLeads: 9, invalidLeads: 6, highQualityLeads: 3 },
  { key: 'daily-3', date: '2026-05-08', platform: '威客', channel: '威客-软件开发频道', optimizer: '王优化', spend: 1600, refund: 200, validLeads: 11, invalidLeads: 4, highQualityLeads: 5 },
  { key: 'daily-4', date: '2026-05-08', platform: '小红书', channel: '小红书-企业服务投放', optimizer: '张优化', spend: 2800, refund: 100, validLeads: 13, invalidLeads: 5, highQualityLeads: 7 },
];

export const initialRechargeRecords: RechargeRecord[] = [
  { key: 'recharge-1', date: '2026-05-01', platform: '百度', amount: 20000, bonusAmount: 2000, operator: '张优化', remark: '搜索推广月初充值' },
  { key: 'recharge-2', date: '2026-05-03', platform: '小红书', amount: 12000, bonusAmount: 800, operator: '李优化', remark: '企业服务投放充值' },
  { key: 'recharge-3', date: '2026-05-05', platform: '威客', amount: 8000, bonusAmount: 500, operator: '王优化', remark: '软件开发频道充值' },
];

export const initialRawLeads: RawLeadRecord[] = [
  { key: 'raw-1', id: 'LC-20260508-001', platform: '百度', channel: '百度-搜索推广A', phone: '138****1234', requirement: '需要开发企业 CRM 系统，关注销售流程和客户管理。', optimizer: '张优化', createdAt: '2026-05-08 09:30', verificationStatus: '有效', verifiedBy: '张优化', verifiedAt: '2026-05-08 10:10', appealStatus: '未申诉', refundAmount: 0, assigned: true, assignedTo: '李四', quality: '高' },
  { key: 'raw-2', id: 'LC-20260508-002', platform: '淘宝', channel: '淘宝-服务市场店铺', phone: '139****5678', requirement: '咨询小程序报价，预算较低。', optimizer: '李优化', createdAt: '2026-05-08 10:20', verificationStatus: '待验证', appealStatus: '未申诉', refundAmount: 0, assigned: false, quality: '中' },
  { key: 'raw-3', id: 'LC-20260508-003', platform: '威客', channel: '威客-软件开发频道', phone: '136****2468', requirement: '号码无法接通，需求描述不清晰。', optimizer: '王优化', createdAt: '2026-05-08 11:05', verificationStatus: '无效', verifiedBy: '王优化', verifiedAt: '2026-05-08 11:30', invalidReason: '电话无法接通', appealStatus: '申诉成功（退款）', refundAmount: 200, assigned: false, quality: '低' },
  { key: 'raw-4', id: 'LC-20260508-004', platform: '小红书', channel: '小红书-企业服务投放', phone: '137****9999', requirement: '需要开发品牌官网和后台内容管理。', optimizer: '张优化', createdAt: '2026-05-08 13:20', verificationStatus: '有效', verifiedBy: '张优化', verifiedAt: '2026-05-08 14:00', appealStatus: '未申诉', refundAmount: 0, assigned: false, quality: '高' },
];

export function safeDivide(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return numerator / denominator;
}

export function calculateNominalCost(record: Pick<DailyCostRecord, 'spend' | 'validLeads'>) {
  return safeDivide(record.spend, record.validLeads);
}

export function calculateActualCost(record: Pick<DailyCostRecord, 'spend' | 'refund' | 'validLeads'>) {
  return safeDivide(record.spend - record.refund, record.validLeads);
}

export function calculateValidRate(record: Pick<DailyCostRecord, 'validLeads' | 'invalidLeads'>) {
  return safeDivide(record.validLeads, record.validLeads + record.invalidLeads) * 100;
}

export function buildChannelSummaries(records: DailyCostRecord[]): ChannelSummary[] {
  const summaryMap = new Map<string, ChannelSummary>();
  records.forEach((record) => {
    const key = `${record.platform}-${record.channel}`;
    const current = summaryMap.get(key) ?? { key, platform: record.platform, channel: record.channel, spend: 0, refund: 0, validLeads: 0, invalidLeads: 0, highQualityLeads: 0 };
    current.spend += record.spend;
    current.refund += record.refund;
    current.validLeads += record.validLeads;
    current.invalidLeads += record.invalidLeads;
    current.highQualityLeads += record.highQualityLeads;
    summaryMap.set(key, current);
  });
  return Array.from(summaryMap.values());
}

function normalize(value: number, max: number) {
  return max ? Math.round((value / max) * 100) : 0;
}

export function calculateCompositeScore(summary: ChannelSummary, allSummaries: ChannelSummary[]) {
  const actualCost = safeDivide(summary.spend - summary.refund, summary.validLeads);
  const validRate = safeDivide(summary.validLeads, summary.validLeads + summary.invalidLeads) * 100;
  const qualityRate = safeDivide(summary.highQualityLeads, summary.validLeads) * 100;
  const maxCost = Math.max(...allSummaries.map((item) => safeDivide(item.spend - item.refund, item.validLeads)), 0);
  const maxValidLeads = Math.max(...allSummaries.map((item) => item.validLeads), 0);
  const costScore = maxCost ? Math.round((1 - actualCost / maxCost) * 100) : 0;
  const validRateScore = Math.round(validRate);
  const volumeScore = normalize(summary.validLeads, maxValidLeads);
  const qualityScore = Math.round(qualityRate);
  return Math.round(costScore * 0.3 + validRateScore * 0.25 + volumeScore * 0.2 + qualityScore * 0.25);
}

export function formatCurrency(value: number) {
  return `¥${value.toFixed(2)}`;
}
