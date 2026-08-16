import { describe, expect, test } from 'vitest';
import { calculateProjectQuotationSummary, type ProjectQuotationConfig } from '../projectQuotationConfigModel';

const config: ProjectQuotationConfig = {
  frontend: [{
    id: 'frontend-1', category: '微信小程序', role: '用户端', technology: 'uni-app', people: 2, days: 10, dailyRate: 800,
  }],
  backend: [{
    id: 'backend-1', category: 'API 服务', role: '后端开发', technology: 'Java', people: 1, days: 20, dailyRate: 1000,
  }],
  otherRoles: [{
    id: 'role-1', category: 'UI设计', role: 'UI设计师', technology: '', people: 1, days: 8, dailyRate: 700,
  }],
  travel: {
    enabled: true, people: 2, trips: 1, days: 3, transportPerTrip: 500, hotelPerDay: 300, mealPerDay: 100, allowancePerDay: 50,
  },
  onsite: {
    enabled: false, people: 0, trips: 0, days: 0, transportPerTrip: 0, hotelPerDay: 0, mealPerDay: 0, allowancePerDay: 0,
  },
  otherCosts: [{ id: 'other-1', type: '第三方服务', description: '短信服务', amount: 2000 }],
  salesCommissionRate: 10,
};

describe('calculateProjectQuotationSummary', () => {
  test('汇总人力、差旅、其他成本和销售提成', () => {
    const summary = calculateProjectQuotationSummary(config);

    expect(summary.frontendCost).toBe(16000);
    expect(summary.backendCost).toBe(20000);
    expect(summary.otherRoleCost).toBe(5600);
    expect(summary.travelCost).toBe(4700);
    expect(summary.otherFixedCost).toBe(2000);
    expect(summary.salesCommission).toBe(4830);
    expect(summary.totalAmount).toBe(53130);
    expect(summary.totalPersonDays).toBe(48);
    expect(summary.estimatedPeriod).toBe('20天');
  });

  test('停用的出差或驻场不计入成本', () => {
    const summary = calculateProjectQuotationSummary({
      ...config,
      travel: { ...config.travel, enabled: false },
    });

    expect(summary.travelCost).toBe(0);
    expect(summary.totalAmount).toBe(47960);
  });

  test('按平台岗位、标准岗位和驻场月度成本汇总', () => {
    const summary = calculateProjectQuotationSummary({
      ...config,
      frontend: [],
      backend: [],
      otherRoles: [],
      frontendPlatforms: [{
        platformId: 'wechat',
        platformName: '微信小程序',
        customTechnologies: [],
        roles: [{
          id: 'wechat-user', category: '微信小程序', role: '用户端', technology: 'Uni-app', people: 1, days: 5, dailyRate: 1000,
        }],
      }],
      backendPlatforms: [],
      standardRoles: [{ id: 'ui', role: 'UI设计师', enabled: true, people: 1, days: 2, dailyRate: 800 }],
      travel: { ...config.travel, enabled: false },
      onsite: {
        enabled: true, people: 2, trips: 0, days: 31, transportPerTrip: 0, hotelPerDay: 0, mealPerDay: 80, allowancePerDay: 0,
        hotelPerMonth: 3000, transportPerMonth: 500,
      },
      otherCosts: [],
      salesCommissionRate: 10,
      salesOtherCost: 100,
    });

    expect(summary.frontendCost).toBe(5000);
    expect(summary.otherRoleCost).toBe(1600);
    expect(summary.onsiteCost).toBe(18960);
    expect(summary.salesCommission).toBe(2556);
    expect(summary.salesOtherCost).toBe(100);
    expect(summary.totalAmount).toBe(28216);
  });
});
