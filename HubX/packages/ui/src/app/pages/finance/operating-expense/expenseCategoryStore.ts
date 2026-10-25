// 科目 Store（useSyncExternalStore + localStorage merge）
// 与 categorySeed 共用同一棵树，LABOR 只读，不开放任意新增一级。

import { CATEGORY_SEED_VERSION } from './opexConstants';

export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

interface CategoryPersist {
  seedVersion: number;
  extraSecondaries: Array<{ primaryId: string; id: string; name: string }>;
  renamed: Array<{ id: string; name: string }>;
}

const CATEGORY_STORAGE_KEY = 'hubx-expense-category-v1';

let _cache: CategoryNode[] | null = null;
const _listeners = new Set<() => void>();

function notify() {
  _cache = null;
  _listeners.forEach((l) => l());
}

/** 从 categorySeed 加载完整科目树（外部注入，避免循环依赖） */
let _seedLoader: () => CategoryNode[] = () => [];

export function setCategorySeedLoader(loader: () => CategoryNode[]) {
  _seedLoader = loader;
}

export function loadCategories(): CategoryNode[] {
  if (_cache) return _cache;
  const seed = structuredClone(_seedLoader());
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) { _cache = seed; return _cache; }
    const persist: CategoryPersist = JSON.parse(raw);
    if (persist.seedVersion !== CATEGORY_SEED_VERSION) { _cache = seed; return _cache; }

    // 合并 extraSecondaries
    for (const extra of persist.extraSecondaries) {
      const primary = seed.find((p) => p.id === extra.primaryId);
      if (!primary) continue;
      if (primary.children?.some((c) => c.id === extra.id)) continue; // 种子已有，跳过
      if (!primary.children) primary.children = [];
      primary.children.push({ id: extra.id, name: extra.name });
    }

    // 应用 renamed（只改种子里已有的二级）
    for (const r of persist.renamed) {
      for (const primary of seed) {
        const child = primary.children?.find((c) => c.id === r.id);
        if (child) { child.name = r.name; break; }
      }
    }

    _cache = seed;
  } catch {
    _cache = seed;
  }
  return _cache!;
}

/** 新增二级科目 */
export function saveExtraSecondary(primaryId: string, node: { id: string; name: string }): void {
  if (primaryId === 'LABOR') throw new Error('LABOR 科目不可新增子目');
  const persist = loadPersist();
  if (persist.extraSecondaries.some((e) => e.id === node.id)) return;
  persist.extraSecondaries.push({ primaryId, ...node });
  savePersist(persist);
  notify();
}

/** 重命名二级科目 */
export function renameSecondary(id: string, name: string): void {
  const persist = loadPersist();
  const existing = persist.renamed.find((r) => r.id === id);
  if (existing) {
    existing.name = name;
  } else {
    persist.renamed.push({ id, name });
  }
  savePersist(persist);
  notify();
}

/** 检查是否可新增一级（禁止） */
export function canAddPrimary(): boolean {
  return false;
}

/** 检查是否可编辑一级（禁止） */
export function canEditPrimary(_id: string): boolean {
  return false;
}

/** 检查是否可删除一级（禁止） */
export function canDeletePrimary(_id: string): boolean {
  return false;
}

/** 检查是否可编辑 LABOR 子目（禁止） */
export function canEditLabor(): boolean {
  return false;
}

// ─── useSyncExternalStore 兼容 ──────────────────────────

export function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function getSnapshot(): CategoryNode[] {
  return loadCategories();
}

// ─── 内部 persist ──────────────────────────────────────

function loadPersist(): CategoryPersist {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { seedVersion: CATEGORY_SEED_VERSION, extraSecondaries: [], renamed: [] };
}

function savePersist(persist: CategoryPersist): void {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(persist));
  _cache = null;
}
