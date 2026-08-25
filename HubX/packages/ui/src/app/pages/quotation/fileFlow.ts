// 文件流转纯函数层
// 清单解析（Excel 五列→两级功能清单）、在线文档状态、扫描件校验

import type { FeatureModule, FeatureSubFeature } from './types';

// ─── 清单解析 ─────────────────────────────────────────────

/** Excel 清单行（五列原始数据） */
export interface Raw清单Row {
  模块: string;
  子功能: string;
  描述: string;
  备注?: string;
  端?: string;
}

/** 解析错误 */
export interface ParseError {
  row: number;
  message: string;
}

/** 解析结果 */
export interface ParseResult {
  modules: FeatureModule[];
  errors: ParseError[];
  totalRows: number;
}

/**
 * 从五列原始数据解析为两级功能清单。
 * 规则：
 * - 模块 + 子功能 必填，缺一报错
 * - 同一模块名下的子功能归为一组
 * - 空行跳过
 * - 0 行有效数据返回空 modules + 错误
 */
export function parseFeature清单(rows: Raw清单Row[]): ParseResult {
  const errors: ParseError[] = [];
  const moduleMap = new Map<string, FeatureModule>();

  let validRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel 行号（第 1 行是表头）

    // 跳过全空行
    if (!row.模块?.trim() && !row.子功能?.trim()) continue;

    if (!row.模块?.trim()) {
      errors.push({ row: rowNum, message: '模块名称不能为空' });
      continue;
    }
    if (!row.子功能?.trim()) {
      errors.push({ row: rowNum, message: '子功能名称不能为空' });
      continue;
    }

    const moduleName = row.模块.trim();
    const subName = row.子功能.trim();

    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, {
        id: `mod-${moduleMap.size + 1}`,
        name: moduleName,
        sort: moduleMap.size + 1,
        subFeatures: [],
        endpointId: row.端?.trim() || 'ep-1',
      });
    }

    const module = moduleMap.get(moduleName)!;
    const subId = `sub-${module.id}-${module.subFeatures.length + 1}`;
    const sub: FeatureSubFeature = {
      id: subId,
      name: subName,
      description: row.描述?.trim() || '',
      remark: row.备注?.trim() || undefined,
    };
    module.subFeatures.push(sub);
    validRows++;
  }

  if (validRows === 0 && rows.length > 0) {
    errors.push({ row: 0, message: '清单无有效数据行' });
  }

  return {
    modules: Array.from(moduleMap.values()),
    errors,
    totalRows: validRows,
  };
}

// ─── 在线文档状态 ─────────────────────────────────────────

export type DocumentStatus = 'empty' | 'draft' | 'saved' | 'finalized';

export interface OnlineDocument {
  status: DocumentStatus;
  savedAt?: string;
  content?: string; // 终稿内容（标准件 + 表单 + 清单）
}

/** 是否可以送审（必须保存过） */
export function canSubmitWithDocument(doc: OnlineDocument): boolean {
  return doc.status === 'saved' || doc.status === 'finalized';
}

/** 退回改清单时作废终稿 */
export function invalidateDocument(doc: OnlineDocument): OnlineDocument {
  return { ...doc, status: 'draft', savedAt: undefined, content: undefined };
}

// ─── 扫描件 ──────────────────────────────────────────────

export interface ScanFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

/** 扫描件可上传的最早状态（待盖章起） */
export const SCAN_UPLOADABLE_STATUSES = ['pending_stamp', 'stamped', 'sent', 'confirmed'] as const;

export function canUploadScan(status: string): boolean {
  return (SCAN_UPLOADABLE_STATUSES as readonly string[]).includes(status);
}

// ─── 五列 Excel 表头校验 ──────────────────────────────────

export const EXPECTED_HEADERS = ['模块', '子功能', '描述', '备注', '端'] as const;

/** 校验 Excel 第一行表头是否完全匹配 */
export function validateHeaders(actual: string[]): boolean {
  if (actual.length < 3) return false; // 至少需要 模块/子功能/描述
  return (
    actual[0]?.trim() === '模块' &&
    actual[1]?.trim() === '子功能' &&
    actual[2]?.trim() === '描述'
  );
}
