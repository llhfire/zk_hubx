// 报价单内嵌标准高清图片资源（离线导出与零外链渲染专用）。
//
// 体积说明：两枚 PNG 的 base64 共约 1.5 MB。曾以静态 `export const` 形式被
// quotePdfTemplate / Stage4Approval / QuotePageThumbnails 静态引用，导致
// QuotationWorkbench chunk 达 1.78 MB（gzip 1.23 MB）。
//
// 约束：报价单 HTML 经 iframe `srcdoc` 渲染，其文档 URL 为 `about:srcdoc`，
// 相对路径无法解析；且「保存文档」会把 iframe 的 outerHTML 整体落库。
// 因此图片必须内联进 HTML —— 不能改成资源 URL。
//
// 方案：数据搬到独立模块，仅在真正生成/预览文档时动态 import()，
// 让首屏 bundle 不再背负这 1.5 MB。

import type { QuoteAssetBundle } from './quoteAssetsData';

export type { QuoteAssetBundle };

let cached: QuoteAssetBundle | null = null;

/** 按需加载内嵌图片资源（首次调用后缓存，重复调用不再触发请求）。 */
export async function loadQuoteAssets(): Promise<QuoteAssetBundle> {
  if (cached) return cached;
  const mod = await import('./quoteAssetsData');
  cached = { logo: mod.ZK_GROUP_LOGO_BASE64, seal: mod.ZKRT_OFFICIAL_SEAL_BASE64 };
  return cached;
}

/** 仅供同步场景（已有缓存时）读取；未加载返回 null。 */
export function getCachedQuoteAssets(): QuoteAssetBundle | null {
  return cached;
}
