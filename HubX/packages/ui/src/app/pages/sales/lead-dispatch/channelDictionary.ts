/**
 * 线索来源渠道 - 数据字典
 *
 * 事实源：CONTEXT.md §线索（来源）+ PLAN.md 决策 7：
 * 数据字典维护，英文 key，共 5 值。存量中文值按就近渠道平移。
 */

export type ChannelKey = 'xiaohongshu' | 'baidu' | 'douyin' | 'wechat' | 'website';

export interface ChannelDictItem {
  key: ChannelKey;
  label: string;
}

/** 字典种子（唯一事实源，录入表单/筛选器动态读取） */
export const CHANNEL_DICTIONARY: ChannelDictItem[] = [
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'baidu', label: '百度' },
  { key: 'douyin', label: '抖音' },
  { key: 'wechat', label: '微信' },
  { key: 'website', label: '官网' },
];

export const CHANNEL_LIST: ChannelKey[] = CHANNEL_DICTIONARY.map((item) => item.key);

export const CHANNEL_LABEL: Record<ChannelKey, string> = Object.fromEntries(
  CHANNEL_DICTIONARY.map((item) => [item.key, item.label]),
) as Record<ChannelKey, string>;

/** key -> 中文标签；未知值原样返回（防御 mock 漂移） */
export function channelLabel(key: string): string {
  return CHANNEL_LABEL[key as ChannelKey] ?? key;
}

/** 存量中文值 -> 英文 key 的平移映射（仅迁移期使用，新数据一律写 key） */
export const LEGACY_CHANNEL_MIGRATION: Record<string, ChannelKey> = {
  小红书: 'xiaohongshu',
  百度: 'baidu',
  百度推广: 'baidu',
  抖音: 'douyin',
  微信推广: 'wechat',
  客户转介绍: 'wechat',
  威客: 'website',
  互站: 'website',
  豆包: 'douyin',
};
