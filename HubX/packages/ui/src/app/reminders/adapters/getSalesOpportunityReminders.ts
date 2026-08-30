import type { Customer } from '@/app/pages/customers/types';
import type { Contract } from '@/app/pages/contracts/types';
import type { SalesBusinessConfig } from '@/app/pages/systemConfigStore';
import { parseReminderOffsets } from '@/app/pages/systemConfigStore';
import type { ReminderItem } from '../types';

function dateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysBetween(from: Date, target: Date) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

export function getSalesOpportunityReminders(customers: Customer[], contracts: Contract[], config: SalesBusinessConfig, now = new Date()): ReminderItem[] {
  const reminders: ReminderItem[] = [];
  const birthdayOffsets = parseReminderOffsets(config.birthdayReminderDays, [7, 0]);
  customers.filter((customer) => customer.active && !customer.mergedIntoId).forEach((customer) => {
    customer.contacts.filter((contact) => contact.active && contact.birthday).forEach((contact) => {
      const match = contact.birthday!.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
      if (!match) return;
      let target = new Date(now.getFullYear(), Number(match[1]) - 1, Number(match[2]));
      if (daysBetween(now, target) < 0) target = new Date(now.getFullYear() + 1, Number(match[1]) - 1, Number(match[2]));
      const offset = daysBetween(now, target);
      if (!birthdayOffsets.includes(offset)) return;
      reminders.push({
        id: `sales-birthday-${contact.id}-${dateOnly(target)}-${offset}`,
        type: 'customer_birthday', title: offset === 0 ? `${contact.name}今天生日` : `${contact.name}将在 ${offset} 天后生日`,
        content: `${customer.name} · ${contact.position ?? '联系人'}，可转为销售跟进待办。`, sourceId: contact.id, sourceType: 'contact', priority: offset === 0 ? 'high' : 'medium',
        createdAt: now.toISOString(), deadline: target.toISOString(), actionLabel: '查看客户', actionTarget: { kind: 'route', path: `/customers/${customer.id}` },
      });
    });
  });

  const contractOffsets = parseReminderOffsets(config.contractExpireReminderDays, [30, 7, 1]);
  const maintenanceOffsets = parseReminderOffsets(config.maintenanceExpireReminderDays, [30, 7]);
  contracts.filter((contract) => contract.status !== 'voided').forEach((contract) => {
    const end = contract.current.endDate ? new Date(`${contract.current.endDate}T00:00:00`) : null;
    const expiryOffset = end && !Number.isNaN(end.getTime()) ? daysBetween(now, end) : null;
    if (end && expiryOffset !== null && contractOffsets.includes(expiryOffset)) {
      reminders.push({ id: `sales-contract-expiry-${contract.id}-${dateOnly(end)}-${expiryOffset}`, type: 'contract_expiring', title: `${contract.current.contractName}${expiryOffset === 0 ? '今天到期' : `将在 ${expiryOffset} 天后到期`}`, content: `${contract.contractNo} · ${contract.current.customerName}`, sourceId: contract.id, sourceType: 'contract', priority: expiryOffset <= 1 ? 'high' : 'medium', createdAt: now.toISOString(), deadline: end.toISOString(), actionLabel: '查看合同', actionTarget: { kind: 'route', path: `/contracts/${contract.id}` } });
    }
    const maintenanceEnd = contract.maintenanceEndDate ? new Date(`${contract.maintenanceEndDate}T00:00:00`) : null;
    const maintenanceOffset = maintenanceEnd && !Number.isNaN(maintenanceEnd.getTime()) ? daysBetween(now, maintenanceEnd) : null;
    if (maintenanceEnd && maintenanceOffset !== null && maintenanceOffsets.includes(maintenanceOffset)) {
      reminders.push({ id: `sales-maintenance-${contract.id}-${dateOnly(maintenanceEnd)}-${maintenanceOffset}`, type: 'maintenance_expiring', title: `${contract.current.customerName}免费维护期将在 ${maintenanceOffset} 天后到期`, content: `${contract.contractNo} · 可评估续费或转跟进待办。`, sourceId: contract.id, sourceType: 'maintenance', priority: maintenanceOffset <= 7 ? 'high' : 'medium', createdAt: now.toISOString(), deadline: maintenanceEnd.toISOString(), actionLabel: '查看客户合同', actionTarget: { kind: 'route', path: `/contracts/${contract.id}` } });
    }
  });
  return reminders;
}
