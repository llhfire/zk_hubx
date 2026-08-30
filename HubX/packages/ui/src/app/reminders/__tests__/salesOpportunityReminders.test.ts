import { describe, expect, it } from 'vitest';
import { getSalesOpportunityReminders } from '../adapters/getSalesOpportunityReminders';
import { DEFAULT_SALES_BUSINESS_CONFIG } from '@/app/pages/systemConfigStore';
import { INITIAL_CUSTOMERS } from '@/app/pages/customers/mockData';

describe('sales opportunity reminders', () => {
  it('按联系人和触发日生成稳定生日提醒，停用联系人不触发', () => {
    const customers = structuredClone(INITIAL_CUSTOMERS);
    customers[0].contacts[0].birthday = '09-07';
    const first = getSalesOpportunityReminders(customers, [], DEFAULT_SALES_BUSINESS_CONFIG, new Date('2026-08-31T09:00:00+08:00'));
    const second = getSalesOpportunityReminders(customers, [], DEFAULT_SALES_BUSINESS_CONFIG, new Date('2026-08-31T18:00:00+08:00'));
    expect(first.find((item) => item.type === 'customer_birthday')?.id).toBe(second.find((item) => item.type === 'customer_birthday')?.id);
    customers[0].contacts[0].active = false;
    expect(getSalesOpportunityReminders(customers, [], DEFAULT_SALES_BUSINESS_CONFIG, new Date('2026-08-31T09:00:00+08:00')).some((item) => item.sourceId === customers[0].contacts[0].id)).toBe(false);
  });
});
