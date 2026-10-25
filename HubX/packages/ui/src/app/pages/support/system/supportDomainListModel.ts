export interface AssetListFilters {
  keyword: string;
  type: string;
  status: string;
  activeType: string;
}

export interface AssetListRecord {
  name: string;
  type: string;
  status: string;
  vendor: string;
  assignee?: string;
  department?: string;
  serialNumber?: string;
}

export function filterAssetRecords<T extends AssetListRecord>(records: T[], filters: AssetListFilters): T[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return records.filter(record => (
    (!keyword || [record.name, record.vendor, record.assignee, record.department, record.serialNumber]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword)))
    && (!filters.type || record.type === filters.type)
    && (!filters.status || record.status === filters.status)
    && (filters.activeType === 'all' || record.type === filters.activeType)
  ));
}

export interface SupplierListFilters {
  keyword: string;
  type: string;
}

export interface SupplierListRecord {
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  skills: string[];
}

export function filterSupplierRecords<T extends SupplierListRecord>(records: T[], filters: SupplierListFilters): T[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return records.filter(record => (
    (!filters.type || record.type === filters.type)
    && (!keyword || [record.name, record.contactPerson, record.phone, record.email, ...record.skills]
      .some(value => value.toLowerCase().includes(keyword)))
  ));
}

export function filterRecordsByKeyword<T>(records: T[], keyword: string, readValues: (record: T) => unknown[]): T[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return records;
  return records.filter(record => readValues(record)
    .filter(value => value !== null && value !== undefined)
    .some(value => String(value).toLowerCase().includes(normalized)));
}

export function hasAssetFilters(filters: AssetListFilters) {
  return Boolean(filters.keyword.trim() || filters.type || filters.status || filters.activeType !== 'all');
}

export function hasSupplierFilters(filters: SupplierListFilters) {
  return Boolean(filters.keyword.trim() || filters.type);
}
