import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { INITIAL_CUSTOMERS } from './mockData';
import { ensureSinglePrimary, findCustomerDuplicate, mergeCustomers } from './customerModel';
import type { Customer, CustomerContact, CustomerCreateInput, InvoiceProfile } from './types';

const STORAGE_KEY = 'hubx-customers-alpha-v1';

function loadCustomers(): Customer[] {
  if (typeof window === 'undefined') return INITIAL_CUSTOMERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_CUSTOMERS;
  } catch {
    return INITIAL_CUSTOMERS;
  }
}

interface CustomerContextValue {
  customers: Customer[];
  getCustomer: (id?: string) => Customer | undefined;
  createCustomer: (input: CustomerCreateInput) => { id?: string; duplicateId?: string; strongDuplicate: boolean };
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  setCustomerActive: (id: string, active: boolean) => void;
  addContact: (customerId: string, input: Omit<CustomerContact, 'id' | 'createdAt'>) => void;
  updateContact: (customerId: string, contactId: string, patch: Partial<CustomerContact>) => void;
  setPrimaryContact: (customerId: string, contactId: string) => void;
  removeContact: (customerId: string, contactId: string) => boolean;
  updateInvoiceProfile: (customerId: string, profile: InvoiceProfile, operator?: string) => void;
  mergeCustomer: (targetId: string, sourceId: string) => void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: PropsWithChildren) {
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  const getCustomer = useCallback((id?: string) => customers.find((item) => item.id === id), [customers]);

  const createCustomer = useCallback((input: CustomerCreateInput) => {
    const duplicate = findCustomerDuplicate(customers, input);
    if (duplicate?.strong) return { duplicateId: duplicate.customer.id, strongDuplicate: true };
    const now = new Date().toISOString();
    const id = `customer-${Date.now()}`;
    const contact = input.contact?.name || input.contact?.phone ? [{
      id: `${id}-contact-1`, name: input.contact.name || input.name, phone: input.contact.phone || '', position: input.contact.position,
      email: input.contact.email, wechat: input.contact.wechat, birthday: input.contact.birthday, active: true, isPrimary: true,
      referenced: false, createdAt: now,
    }] : [];
    setCustomers((current) => [{
      id, kind: input.kind, name: input.name.trim(), creditCode: input.creditCode?.trim(), industry: input.industry, scale: input.scale,
      address: input.address, source: input.source, ownerId: input.ownerId ?? 'sales-zhangsan', ownerName: input.ownerName ?? '张三',
      level: input.level ?? 'B', active: true, contacts: contact, invoiceHistory: [], createdAt: now, updatedAt: now,
    }, ...current]);
    return { id, strongDuplicate: false };
  }, [customers]);

  const updateCustomer = useCallback((id: string, patch: Partial<Customer>) => {
    setCustomers((current) => current.map((item) => item.id === id ? { ...item, ...patch, id, updatedAt: new Date().toISOString() } : item));
  }, []);
  const setCustomerActive = useCallback((id: string, active: boolean) => updateCustomer(id, { active }), [updateCustomer]);

  const addContact = useCallback((customerId: string, input: Omit<CustomerContact, 'id' | 'createdAt'>) => {
    setCustomers((current) => current.map((customer) => {
      if (customer.id !== customerId) return customer;
      const contact = { ...input, id: `${customerId}-contact-${Date.now()}`, createdAt: new Date().toISOString() };
      return { ...customer, contacts: ensureSinglePrimary([...customer.contacts, contact], input.isPrimary ? contact.id : undefined), updatedAt: new Date().toISOString() };
    }));
  }, []);

  const updateContact = useCallback((customerId: string, contactId: string, patch: Partial<CustomerContact>) => {
    setCustomers((current) => current.map((customer) => customer.id !== customerId ? customer : {
      ...customer,
      contacts: ensureSinglePrimary(customer.contacts.map((contact) => contact.id === contactId ? { ...contact, ...patch, id: contactId } : contact), patch.isPrimary ? contactId : undefined),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  const setPrimaryContact = useCallback((customerId: string, contactId: string) => updateContact(customerId, contactId, { isPrimary: true, active: true }), [updateContact]);

  const removeContact = useCallback((customerId: string, contactId: string) => {
    const contact = customers.find((item) => item.id === customerId)?.contacts.find((item) => item.id === contactId);
    if (!contact) return false;
    if (contact.referenced) {
      updateContact(customerId, contactId, { active: false, isPrimary: false });
      return false;
    }
    setCustomers((current) => current.map((customer) => customer.id !== customerId ? customer : {
      ...customer, contacts: ensureSinglePrimary(customer.contacts.filter((item) => item.id !== contactId)), updatedAt: new Date().toISOString(),
    }));
    return true;
  }, [customers, updateContact]);

  const updateInvoiceProfile = useCallback((customerId: string, profile: InvoiceProfile, operator = '张三') => {
    setCustomers((current) => current.map((customer) => {
      if (customer.id !== customerId) return customer;
      const invoiceHistory = customer.invoiceProfile
        ? [{ id: `invoice-history-${Date.now()}`, profile: customer.invoiceProfile, changedAt: profile.updatedAt, changedBy: operator }, ...customer.invoiceHistory]
        : customer.invoiceHistory;
      return { ...customer, invoiceProfile: profile, invoiceHistory, updatedAt: profile.updatedAt };
    }));
  }, []);

  const mergeCustomer = useCallback((targetId: string, sourceId: string) => {
    setCustomers((current) => {
      const target = current.find((item) => item.id === targetId);
      const source = current.find((item) => item.id === sourceId);
      if (!target || !source || targetId === sourceId) return current;
      const merged = mergeCustomers(target, source);
      return current.map((item) => item.id === targetId ? merged.target : item.id === sourceId ? merged.source : item);
    });
  }, []);

  const value = useMemo(() => ({ customers, getCustomer, createCustomer, updateCustomer, setCustomerActive, addContact, updateContact, setPrimaryContact, removeContact, updateInvoiceProfile, mergeCustomer }), [addContact, createCustomer, customers, getCustomer, mergeCustomer, removeContact, setCustomerActive, setPrimaryContact, updateContact, updateCustomer, updateInvoiceProfile]);
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error('useCustomers must be used within CustomerProvider');
  return context;
}

export function useOptionalCustomers() {
  return useContext(CustomerContext);
}
