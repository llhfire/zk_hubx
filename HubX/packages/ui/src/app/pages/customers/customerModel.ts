import type { Customer, CustomerBusinessStatus, CustomerContact, CustomerCreateInput, CustomerSnapshot, InvoiceProfile } from './types';

export type DuplicateMatch = { customer: Customer; reason: 'creditCode' | 'phone' | 'similarName'; strong: boolean };

export function normalizePhone(value = ''): string {
  return value.replace(/\D/g, '');
}

export function normalizeCreditCode(value = ''): string {
  return value.replace(/\s/g, '').toUpperCase();
}

export function normalizeCustomerName(value = ''): string {
  return value.replace(/[\s（）()]/g, '').replace(/有限公司$|有限责任公司$/g, '').toLowerCase();
}

export function findCustomerDuplicate(customers: Customer[], input: Pick<CustomerCreateInput, 'kind' | 'name' | 'creditCode' | 'contact'>): DuplicateMatch | null {
  if (input.kind === 'enterprise' && normalizeCreditCode(input.creditCode)) {
    const found = customers.find((item) => item.kind === 'enterprise' && normalizeCreditCode(item.creditCode) === normalizeCreditCode(input.creditCode));
    if (found) return { customer: found, reason: 'creditCode', strong: true };
  }
  if (input.kind === 'individual' && normalizePhone(input.contact?.phone)) {
    const phone = normalizePhone(input.contact?.phone);
    const found = customers.find((item) => item.kind === 'individual' && item.contacts.some((contact) => normalizePhone(contact.phone) === phone));
    if (found) return { customer: found, reason: 'phone', strong: true };
  }
  const normalizedName = normalizeCustomerName(input.name);
  const found = normalizedName ? customers.find((item) => normalizeCustomerName(item.name) === normalizedName) : undefined;
  return found ? { customer: found, reason: 'similarName', strong: false } : null;
}

export function ensureSinglePrimary(contacts: CustomerContact[], primaryId?: string): CustomerContact[] {
  const active = contacts.filter((item) => item.active);
  const selectedId = primaryId && active.some((item) => item.id === primaryId)
    ? primaryId
    : active.find((item) => item.isPrimary)?.id ?? active[0]?.id;
  return contacts.map((item) => ({ ...item, isPrimary: item.active && item.id === selectedId }));
}

export function buildCustomerSnapshot(customer: Customer, contactId?: string, capturedAt = new Date().toISOString()): CustomerSnapshot {
  const contact = customer.contacts.find((item) => item.id === contactId && item.active)
    ?? customer.contacts.find((item) => item.isPrimary && item.active);
  return {
    customerId: customer.id,
    customerName: customer.name,
    customerKind: customer.kind,
    contactId: contact?.id,
    contactName: contact?.name,
    contactPhone: contact?.phone,
    contactEmail: contact?.email,
    invoiceProfile: customer.invoiceProfile ? { ...customer.invoiceProfile } : undefined,
    capturedAt,
  };
}

export function deriveCustomerStatus(input: { activeMainContractCount: number; hasActiveProject: boolean; hasOutstandingCollection: boolean; hasActiveMaintenance: boolean; hasHistoricCooperation: boolean }): CustomerBusinessStatus {
  if (input.hasActiveProject || input.hasOutstandingCollection || input.hasActiveMaintenance) return '合作中';
  if (input.activeMainContractCount > 0 || input.hasHistoricCooperation) return '已合作';
  return '待合作';
}

export function invoiceProfilesEqual(a?: InvoiceProfile, b?: InvoiceProfile): boolean {
  if (!a || !b) return a === b;
  return ['title', 'taxNo', 'bankName', 'bankAccount', 'address', 'phone'].every((key) => a[key as keyof InvoiceProfile] === b[key as keyof InvoiceProfile]);
}

export function mergeCustomers(target: Customer, source: Customer, now = new Date().toISOString()): { target: Customer; source: Customer } {
  const existingPhones = new Set(target.contacts.map((item) => normalizePhone(item.phone)).filter(Boolean));
  const importedContacts = source.contacts.filter((item) => !existingPhones.has(normalizePhone(item.phone))).map((item) => ({ ...item, id: `${target.id}-${item.id}`, isPrimary: false }));
  return {
    target: { ...target, contacts: ensureSinglePrimary([...target.contacts, ...importedContacts]), aliases: Array.from(new Set([...(target.aliases ?? []), source.name, ...(source.aliases ?? [])])), updatedAt: now },
    source: { ...source, active: false, mergedIntoId: target.id, updatedAt: now },
  };
}
