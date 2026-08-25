/**
 * 全局搜索纯函数层
 *
 * 规约见 global-search-design.md §5
 * - 空格分词 AND（每个 term 都必须命中至少一个 field）
 * - 大小写不敏感 includes
 * - 每类 Top 5（类内 sortKey 倒序）
 * - 命中 0 条的 kind 不出组
 */

import {
  ENTITY_ORDER,
  ENTITY_LABEL,
  PER_KIND_LIMIT,
  type SearchEntityKind,
  type SearchGroup,
  type SearchItem,
  type SearchOptions,
} from './types';

/**
 * 主入口：keyword -> 分组结果
 * 返回只含命中数>0 的组，按 ENTITY_ORDER 排序
 */
export function matchEntities(
  keyword: string,
  items: SearchItem[],
  opts?: SearchOptions,
): SearchGroup[] {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const terms = trimmed
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return [];

  // 按 kind 分桶
  const buckets = new Map<SearchEntityKind, SearchItem[]>();
  for (const item of items) {
    // 空格分词 AND：每个 term 都必须在至少一个 field 上命中
    const lowerFields = item.fields.map((f) => f.toLowerCase());
    const matched = terms.every((term) =>
      lowerFields.some((field) => field.includes(term)),
    );
    if (!matched) continue;

    const bucket = buckets.get(item.kind) ?? [];
    bucket.push(item);
    buckets.set(item.kind, bucket);
  }

  // 每组：sortKey 倒序（新->旧）→ Top5 截断 → 组装 SearchGroup
  const groups: SearchGroup[] = [];
  for (const kind of ENTITY_ORDER) {
    const bucket = buckets.get(kind);
    if (!bucket || bucket.length === 0) continue;

    bucket.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    groups.push({
      kind,
      label: ENTITY_LABEL[kind],
      items: bucket.slice(0, PER_KIND_LIMIT),
    });
  }

  return groups;
}

/**
 * 高亮分段：把 text 按（大小写不敏感的）命中词切段
 * 返回段数组，hit: true 的段应包 <mark>
 */
export function highlightParts(
  text: string,
  keyword: string,
): Array<{ text: string; hit: boolean }> {
  const trimmed = keyword.trim();
  if (!trimmed) return [{ text, hit: false }];

  const terms = trimmed
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return [{ text, hit: false }];

  // 找出所有命中区间 [start, end)
  const ranges: Array<[number, number]> = [];
  const lowerText = text.toLowerCase();

  for (const term of terms) {
    const lowerTerm = term.toLowerCase();
    let from = 0;
    while (from < lowerText.length) {
      const idx = lowerText.indexOf(lowerTerm, from);
      if (idx === -1) break;
      ranges.push([idx, idx + lowerTerm.length]);
      from = idx + 1;
    }
  }

  if (ranges.length === 0) return [{ text, hit: false }];

  // 合并重叠区间
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) {
      last[1] = Math.max(last[1], ranges[i][1]);
    } else {
      merged.push(ranges[i]);
    }
  }

  // 切段
  const parts: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) {
      parts.push({ text: text.slice(cursor, start), hit: false });
    }
    parts.push({ text: text.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), hit: false });
  }

  return parts;
}

/**
 * 键盘焦点移动：计算下一个焦点下标
 * -1 表示无焦点
 */
export function nextFocusIndex(
  current: number,
  delta: 1 | -1,
  total: number,
): number {
  if (total === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : total - 1;
  const next = current + delta;
  if (next < 0) return total - 1;
  if (next >= total) return 0;
  return next;
}
