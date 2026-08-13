export type QuotationLaborSection = 'frontend' | 'backend' | 'otherRoles';

export interface QuotationLaborItem {
  id: string;
  category: string;
  role: string;
  technology: string;
  people: number;
  days: number;
  dailyRate: number;
}

export interface QuotationTechnology {
  name: string;
  dailyRate: number;
  isCustom?: boolean;
}

export interface QuotationPlatformConfig {
  platformId: string;
  platformName: string;
  roles: QuotationLaborItem[];
  customTechnologies: QuotationTechnology[];
}

export interface QuotationStandardRoleItem {
  id: string;
  role: string;
  enabled: boolean;
  people: number;
  days: number;
  dailyRate: number;
}

export interface QuotationTravelItem {
  enabled: boolean;
  people: number;
  trips: number;
  days: number;
  transportPerTrip: number;
  hotelPerDay: number;
  mealPerDay: number;
  allowancePerDay: number;
  hotelPerMonth?: number;
  transportPerMonth?: number;
}

export interface QuotationOtherCostItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  group?: string;
  label?: string;
}

export interface ProjectQuotationConfig {
  /** 保留旧结构，历史报价仍可正常展示和编辑。 */
  frontend: QuotationLaborItem[];
  backend: QuotationLaborItem[];
  otherRoles: QuotationLaborItem[];
  travel: QuotationTravelItem;
  onsite: QuotationTravelItem;
  otherCosts: QuotationOtherCostItem[];
  salesCommissionRate: number;
  frontendPlatforms?: QuotationPlatformConfig[];
  backendPlatforms?: QuotationPlatformConfig[];
  standardRoles?: QuotationStandardRoleItem[];
  salesOtherCost?: number;
}

export interface ProjectQuotationSummary {
  frontendCost: number;
  backendCost: number;
  otherRoleCost: number;
  laborCost: number;
  travelCost: number;
  onsiteCost: number;
  otherFixedCost: number;
  salesCommission: number;
  salesOtherCost: number;
  otherCost: number;
  totalAmount: number;
  totalPersonDays: number;
  totalPeople: number;
  estimatedDays: number;
  estimatedPeriod: string;
}

export interface QuotationLaborDetail extends QuotationLaborItem {
  section: QuotationLaborSection;
  sourceName: string;
}

const toNumber = (value: number | undefined) => Number.isFinite(value) ? Math.max(value ?? 0, 0) : 0;

export function calculateLaborItemCost(item: QuotationLaborItem) {
  return toNumber(item.people) * toNumber(item.days) * toNumber(item.dailyRate);
}

export function calculateTravelItemCost(item: QuotationTravelItem) {
  if (!item.enabled) return 0;

  const people = toNumber(item.people);
  const trips = toNumber(item.trips);
  const days = toNumber(item.days);

  return toNumber(item.transportPerTrip) * 2 * people * trips
    + toNumber(item.hotelPerDay) * days * people * trips
    + (toNumber(item.mealPerDay) + toNumber(item.allowancePerDay)) * days * people * trips;
}

export function calculateOnsiteItemCost(item: QuotationTravelItem) {
  if (!item.enabled) return 0;

  const people = toNumber(item.people);
  const days = toNumber(item.days);
  const months = Math.ceil(days / 30);

  return toNumber(item.hotelPerMonth) * people * months
    + toNumber(item.mealPerDay) * days * people
    + toNumber(item.transportPerMonth) * people * months;
}

export function getQuotationLaborDetails(config: ProjectQuotationConfig): QuotationLaborDetail[] {
  const fromPlatforms = (
    section: 'frontend' | 'backend',
    platforms: QuotationPlatformConfig[] | undefined,
    legacyItems: QuotationLaborItem[],
  ) => {
    if (platforms?.length) {
      return platforms.flatMap(platform => platform.roles.map(item => ({
        ...item,
        section,
        sourceName: platform.platformName,
      })));
    }

    return legacyItems.map(item => ({ ...item, section, sourceName: item.category }));
  };

  const standardRoles = (config.standardRoles ?? [])
    .filter(role => role.enabled)
    .map(role => ({
      id: role.id,
      category: '标准岗位',
      role: role.role,
      technology: '',
      people: role.people,
      days: role.days,
      dailyRate: role.dailyRate,
      section: 'otherRoles' as const,
      sourceName: '标准岗位',
    }));

  return [
    ...fromPlatforms('frontend', config.frontendPlatforms, config.frontend),
    ...fromPlatforms('backend', config.backendPlatforms, config.backend),
    ...standardRoles,
    ...config.otherRoles.map(item => ({ ...item, section: 'otherRoles' as const, sourceName: item.category || '自定义岗位' })),
  ];
}

export function getQuotationOtherCostDetails(config: ProjectQuotationConfig) {
  const fixedCosts = config.otherCosts
    .filter(item => toNumber(item.amount) > 0)
    .map(item => ({
      name: item.label || item.description || item.type,
      amount: toNumber(item.amount),
    }));
  const directCost = getQuotationLaborDetails(config).reduce((total, item) => total + calculateLaborItemCost(item), 0)
    + calculateTravelItemCost(config.travel)
    + calculateOnsiteItemCost(config.onsite)
    + fixedCosts.reduce((total, item) => total + item.amount, 0);
  const salesCommission = directCost * toNumber(config.salesCommissionRate) / 100;

  if (salesCommission > 0) {
    fixedCosts.push({ name: `销售提成（${toNumber(config.salesCommissionRate)}%）`, amount: salesCommission });
  }
  if (toNumber(config.salesOtherCost) > 0) {
    fixedCosts.push({ name: '其他销售费用', amount: toNumber(config.salesOtherCost) });
  }

  return fixedCosts;
}

export function calculateProjectQuotationSummary(config: ProjectQuotationConfig): ProjectQuotationSummary {
  const laborDetails = getQuotationLaborDetails(config);
  const frontendCost = laborDetails
    .filter(item => item.section === 'frontend')
    .reduce((total, item) => total + calculateLaborItemCost(item), 0);
  const backendCost = laborDetails
    .filter(item => item.section === 'backend')
    .reduce((total, item) => total + calculateLaborItemCost(item), 0);
  const otherRoleCost = laborDetails
    .filter(item => item.section === 'otherRoles')
    .reduce((total, item) => total + calculateLaborItemCost(item), 0);
  const laborCost = frontendCost + backendCost + otherRoleCost;
  const travelCost = calculateTravelItemCost(config.travel);
  const onsiteCost = calculateOnsiteItemCost(config.onsite);
  const otherFixedCost = config.otherCosts.reduce((total, item) => total + toNumber(item.amount), 0);
  const directCost = laborCost + travelCost + onsiteCost + otherFixedCost;
  const salesCommission = directCost * toNumber(config.salesCommissionRate) / 100;
  const salesOtherCost = toNumber(config.salesOtherCost);
  const otherCost = otherFixedCost + salesCommission + salesOtherCost;
  const totalAmount = laborCost + travelCost + onsiteCost + otherCost;
  const totalPersonDays = laborDetails.reduce(
    (total, item) => total + toNumber(item.people) * toNumber(item.days),
    0,
  );
  const totalPeople = laborDetails.reduce((total, item) => total + toNumber(item.people), 0);
  const estimatedDays = laborDetails.reduce((maximum, item) => Math.max(maximum, toNumber(item.days)), 0);

  return {
    frontendCost,
    backendCost,
    otherRoleCost,
    laborCost,
    travelCost,
    onsiteCost,
    otherFixedCost,
    salesCommission,
    salesOtherCost,
    otherCost,
    totalAmount,
    totalPersonDays,
    totalPeople,
    estimatedDays,
    estimatedPeriod: estimatedDays ? `${estimatedDays}天` : '',
  };
}
