export type DictionaryStatus = '启用' | '禁用';
export type DictionaryFilterStatus = '全部' | DictionaryStatus;

export interface DictionaryType {
  id: string;
  code: string;
  name: string;
  description: string;
  status: DictionaryStatus;
  createTime: string;
}

export interface DictionaryItem {
  id: string;
  label: string;
  value: string;
  sort: number;
  status: DictionaryStatus;
  remark: string;
}

export interface DictionaryFilters {
  keyword: string;
  status: DictionaryFilterStatus;
}

export interface DictionaryMetrics {
  typeCount: number;
  activeTypeCount: number;
  currentItemCount: number;
  activeCurrentItemCount: number;
}

export const EMPTY_DICTIONARY_FILTERS: DictionaryFilters = {
  keyword: '',
  status: '全部',
};

export function filterDictionaryTypes(types: DictionaryType[], filters: DictionaryFilters): DictionaryType[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return types.filter((type) => {
    if (filters.status !== '全部' && type.status !== filters.status) return false;
    if (!keyword) return true;
    return [type.code, type.name, type.description].some(value => value.toLowerCase().includes(keyword));
  });
}

export function filterDictionaryItems(items: DictionaryItem[], filters: DictionaryFilters): DictionaryItem[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return items
    .filter((item) => {
      if (filters.status !== '全部' && item.status !== filters.status) return false;
      if (!keyword) return true;
      return [item.label, item.value, item.remark].some(value => value.toLowerCase().includes(keyword));
    })
    .sort((left, right) => left.sort - right.sort);
}

export function calculateDictionaryMetrics(
  types: DictionaryType[],
  itemsByType: Record<string, DictionaryItem[]>,
  selectedTypeId: string,
): DictionaryMetrics {
  const currentItems = itemsByType[selectedTypeId] ?? [];
  return {
    typeCount: types.length,
    activeTypeCount: types.filter(type => type.status === '启用').length,
    currentItemCount: currentItems.length,
    activeCurrentItemCount: currentItems.filter(item => item.status === '启用').length,
  };
}

export function hasDictionaryFilters(filters: DictionaryFilters): boolean {
  return Boolean(filters.keyword.trim() || filters.status !== '全部');
}
