/**
 * 全局搜索类型定义
 *
 * 事实源：PRD-全局搜索 + global-search-design.md §3
 * 六实体：线索/客户/报价/合同/项目/员工
 */

/** 六类可搜索实体 */
export type SearchEntityKind =
  | 'lead'
  | 'customer'
  | 'quote'
  | 'contract'
  | 'project'
  | 'employee';

/** 全局搜索统一结果项：六域实体的只读投影 */
export interface SearchItem {
  kind: SearchEntityKind;
  /** 跳转路由（如 `/leads/l-001`） */
  route: string;
  /** 主标题（结果行第一行） */
  title: string;
  /** meta 行（结果行第二行，如 `L-001 · 归属: 李四`） */
  meta: string;
  /** 参与匹配的字段（小写化后 includes） */
  fields: string[];
  /** 类内排序键，新->旧（字符串比较） */
  sortKey: string;
}

/** 搜索结果分组 */
export interface SearchGroup {
  kind: SearchEntityKind;
  label: string;
  items: SearchItem[]; // 已 Top5 截断
}

/** 搜索选项（权限矩阵接缝，本期恒为空） */
export interface SearchOptions {
  actor?: string;
}

/** 六类固定顺序 */
export const ENTITY_ORDER: SearchEntityKind[] = [
  'lead',
  'customer',
  'quote',
  'contract',
  'project',
  'employee',
];

/** 六类中文标签 */
export const ENTITY_LABEL: Record<SearchEntityKind, string> = {
  lead: '线索',
  customer: '客户',
  quote: '报价',
  contract: '合同',
  project: '项目',
  employee: '员工',
};

/** 每类最多返回条数 */
export const PER_KIND_LIMIT = 5;
