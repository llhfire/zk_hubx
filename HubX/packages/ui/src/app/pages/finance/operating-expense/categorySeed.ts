// ========================================
// 费用科目种子 — 与 ExpenseCategoryManager 共用
// 一级 9 个（8 可录入 + LABOR 内置）
// ========================================

export interface CategoryNode {
  id: string;
  name: string;
  primary: string;
  isSystem: boolean;   // true = 不可改删（LABOR）
  children?: { id: string; name: string }[];
}

export const CATEGORY_SEED: CategoryNode[] = [
  {
    id: 'OFFICE', name: '办公', primary: 'OFFICE', isSystem: false,
    children: [
      { id: 'OFFICE_RENT', name: '房租' },
      { id: 'OFFICE_PROPERTY', name: '物业' },
      { id: 'OFFICE_UTILITIES', name: '水电' },
      { id: 'OFFICE_INTERNET', name: '网络' },
      { id: 'OFFICE_SUPPLIES', name: '用品' },
      { id: 'OFFICE_CLEANING', name: '保洁' },
    ],
  },
  {
    id: 'BENEFIT', name: '福利', primary: 'BENEFIT', isSystem: false,
    children: [
      { id: 'BENEFIT_TEAM', name: '团建' },
      { id: 'BENEFIT_FESTIVAL', name: '节日' },
      { id: 'BENEFIT_CHECKUP', name: '体检' },
    ],
  },
  {
    id: 'HR_ADMIN', name: '人资行政', primary: 'HR_ADMIN', isSystem: false,
    children: [
      { id: 'HR_RECRUIT', name: '招聘' },
      { id: 'HR_TRAINING', name: '培训' },
    ],
  },
  {
    id: 'OTHER', name: '其他', primary: 'OTHER', isSystem: false,
    children: [
      { id: 'OTHER_MISC', name: '杂费' },
    ],
  },
  {
    id: 'TRAVEL', name: '差旅', primary: 'TRAVEL', isSystem: false,
    children: [
      { id: 'TRAVEL_TRANSPORT', name: '交通' },
      { id: 'TRAVEL_HIGHWAY', name: '高速' },
      { id: 'TRAVEL_FUEL', name: '油费' },
      { id: 'TRAVEL_HOTEL', name: '住宿' },
      { id: 'TRAVEL_SUBSIDY', name: '出差补贴' },
    ],
  },
  {
    id: 'PROMOTION', name: '推广', primary: 'PROMOTION', isSystem: false,
    children: [
      { id: 'PROMOTION_ADS', name: '广告' },
      { id: 'PROMOTION_CONTENT', name: '内容' },
    ],
  },
  {
    id: 'BUSINESS', name: '商务', primary: 'BUSINESS', isSystem: false,
    children: [
      { id: 'BIZ_ENTERTAINMENT', name: '招待' },
      { id: 'BIZ_GIFT', name: '礼品' },
    ],
  },
  {
    id: 'THIRD_PARTY', name: '第三方', primary: 'THIRD_PARTY', isSystem: false,
    children: [
      { id: 'TP_CLOUD', name: '云服务' },
      { id: 'TP_DOMAIN', name: '域名' },
      { id: 'TP_SSL', name: 'SSL' },
      { id: 'TP_SMS', name: '短信' },
    ],
  },
  {
    id: 'LABOR', name: '人力成本', primary: 'LABOR', isSystem: true,
    children: [
      { id: 'LABOR_SALARY', name: '工资' },
      { id: 'LABOR_SOCIAL', name: '社保公积金' },
    ],
  },
];
