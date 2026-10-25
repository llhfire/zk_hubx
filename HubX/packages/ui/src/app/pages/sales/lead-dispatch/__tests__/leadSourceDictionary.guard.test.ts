/**
 * 渠道数据字典 guard 测试（lead-dispatch 阶段 0）
 *
 * 断言：
 * 1. 字典 5 值英文 key 与 CONTEXT.md §线索（来源）一致
 * 2. 线索域 mock 文件中所有 source 字面量都是字典 key，无中文残留
 * 3. LEAD_SOURCE_LIST 从字典派生，不另立词表
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHANNEL_DICTIONARY,
  CHANNEL_LIST,
  CHANNEL_LABEL,
  LEGACY_CHANNEL_MIGRATION,
  channelLabel,
} from '../channelDictionary';
import { LEAD_SOURCE_LIST } from '../../leads/types';

const here = dirname(fileURLToPath(import.meta.url));

/** 线索域存量数据文件（source 值必须是字典 key） */
const LEAD_DATA_FILES = [
  '../../leads/mockData.ts',
  '../../leads/leadDetailProfiles.ts',
  '../../leads/LeadGovernance.tsx',
];

describe('渠道数据字典', () => {
  it('字典种子为 5 值英文 key，与 CONTEXT.md 对齐', () => {
    expect(CHANNEL_LIST).toEqual(['xiaohongshu', 'baidu', 'douyin', 'wechat', 'website']);
    expect(CHANNEL_LABEL.xiaohongshu).toBe('小红书');
    expect(CHANNEL_LABEL.baidu).toBe('百度');
    expect(CHANNEL_LABEL.douyin).toBe('抖音');
    expect(CHANNEL_LABEL.wechat).toBe('微信');
    expect(CHANNEL_LABEL.website).toBe('官网');
    expect(CHANNEL_DICTIONARY).toHaveLength(5);
  });

  it('channelLabel 未知值原样返回（防御 mock 漂移）', () => {
    expect(channelLabel('baidu')).toBe('百度');
    expect(channelLabel('unknown_channel')).toBe('unknown_channel');
  });

  it('LEGACY_CHANNEL_MIGRATION 目标值都在字典内', () => {
    for (const target of Object.values(LEGACY_CHANNEL_MIGRATION)) {
      expect(CHANNEL_LIST).toContain(target);
    }
  });

  it('LEAD_SOURCE_LIST 从字典派生，不另立词表', () => {
    expect(LEAD_SOURCE_LIST).toEqual(CHANNEL_LIST);
  });

  it('线索域 mock 数据无中文渠道残留（guard）', () => {
    for (const file of LEAD_DATA_FILES) {
      const content = readFileSync(resolve(here, file), 'utf8');
      const matches = content.matchAll(/source:\s*'([^']+)'/g);
      const badValues: Array<{ file: string; value: string }> = [];
      for (const match of matches) {
        if (!CHANNEL_LIST.includes(match[1] as never)) {
          badValues.push({ file, value: match[1] });
        }
      }
      // LeadDetail360 文档区 source（客户签署/报价模块）不在本字典域，此处只扫线索 source
      expect(badValues, `${JSON.stringify(badValues)} 存在字典外 source 值`).toEqual([]);
    }
  });
});
