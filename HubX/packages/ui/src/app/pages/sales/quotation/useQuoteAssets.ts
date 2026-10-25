import { useEffect, useState } from 'react';
import { getCachedQuoteAssets, loadQuoteAssets, type QuoteAssetBundle } from './quoteAssets';

/**
 * 按需加载报价单内嵌图片资源（logo / 印章，约 1.5 MB base64）。
 *
 * 这些资源只用于生成报价单 HTML，不应进入首屏 bundle。组件用本 hook 拿到资源，
 * 再传给 `generateQuoteHtml({ assets })`；资源到达前返回 `undefined`，
 * 模板会退化为透明占位像素（不会出现 "undefined" 字符串）。
 *
 * 模块级缓存，多组件共享同一次 import()。
 */
export function useQuoteAssets(): QuoteAssetBundle | undefined {
  const [assets, setAssets] = useState<QuoteAssetBundle | undefined>(() => getCachedQuoteAssets() ?? undefined);

  useEffect(() => {
    if (assets) return;
    let cancelled = false;
    loadQuoteAssets()
      .then((bundle) => {
        if (!cancelled) setAssets(bundle);
      })
      .catch(() => {
        // 加载失败时保持占位，不阻塞页面渲染
      });
    return () => {
      cancelled = true;
    };
  }, [assets]);

  return assets;
}
