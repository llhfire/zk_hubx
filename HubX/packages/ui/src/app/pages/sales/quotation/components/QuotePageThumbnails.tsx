import React, { useEffect, useRef } from 'react';
import { Typography, Button, Tooltip } from '@/design-system';
import { QuoteThumbnailPage } from '@/design-system/facsimile';
import { IconMenuFold, IconMenuUnfold } from '@/design-system';
import { useQuoteAssets } from '../useQuoteAssets';
import { StatusTag } from '@/design-system';

const { Text } = Typography;

export interface PageThumbnailItem {
  page: number;
  title: string;
  badge: string;
}

export const QUOTE_PAGE_LIST: PageThumbnailItem[] = [
  { page: 1, title: '报价封面', badge: '封面' },
  { page: 2, title: '项目整体报价与盖章', badge: '报价+盖章' },
  { page: 3, title: '公司介绍与资质实力', badge: '公司介绍' },
  { page: 4, title: '详细报价清单 (一)', badge: '清单(一)' },
  { page: 5, title: '详细报价清单 (二)', badge: '清单(二)' },
  { page: 6, title: '自费项目与授权签章', badge: '自费+盖章' },
];

interface Props {
  currentPage: number;
  onSelectPage: (page: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  customerName?: string;
  projectName?: string;
  grandTotal?: number;
}

/**
 * 报价工作台的阅读器缩略图外壳。
 * A4 纸张内容与 160×226 画布属于 `@/design-system/facsimile`，本组件只编排
 * 页面选择、滚动和阅读器壳层；不要在这里新增文档排版 token 或缩印字号。
 */
export function QuotePageThumbnails({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  customerName,
  projectName,
  grandTotal,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const assets = useQuoteAssets();

  // 当当前激活页变化时，平滑滚动让当前缩略卡片可见
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  if (collapsed) {
    return (
      <div
        style={{
          width: 44,
          flexShrink: 0,
          background: 'var(--color-bg-2)',
          borderRight: '1px solid var(--color-border-2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 4px',
          gap: 12,
        }}
      >
        <Tooltip content="展开页面预览缩略图" position="right">
          <Button
            size="mini"
            type="outline"
            icon={<IconMenuUnfold />}
            onClick={onToggleCollapse}
          />
        </Tooltip>

        <div style={{ writingMode: 'vertical-rl', fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', letterSpacing: 2, marginTop: 8 }}>
          缩略图 (6)
        </div>

        {QUOTE_PAGE_LIST.map((item) => (
          <Tooltip key={item.page} content={`${item.title} (${item.badge})`} position="right">
            <div
              onClick={() => onSelectPage(item.page)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                background: currentPage === item.page ? 'rgb(var(--primary-6))' : 'var(--color-fill-2)',
                color: currentPage === item.page ? "var(--ds-viewer-on-overlay)" : 'var(--color-text-2)',
                border: currentPage === item.page ? 'none' : '1px solid var(--color-border-2)',
                transition: 'all 0.15s ease',
              }}
            >
              {item.page}
            </div>
          </Tooltip>
        ))}
      </div>
    );
  }

  // 阅读器外壳走 viewer/产品 token；A4 纸张内容由 facsimile 边界负责。
  return (
    <div
      className="hubx-facsimile"
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--ds-viewer-shell)",
        borderRight: '1px solid var(--ds-viewer-shell-edge)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 侧栏顶栏 */}
      <div
        style={{
          height: 38,
          padding: '0 12px',
          background: "var(--ds-viewer-shell-bar)",
          borderBottom: '1px solid var(--ds-viewer-shell-edge-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: "var(--ds-viewer-on-shell)", fontSize: 'var(--text-xs)', fontWeight: 600 }}>页面缩略图</Text>
          <span style={{ fontSize: 'var(--ds-text-caption)', color: "var(--ds-viewer-on-shell-muted)" }}>共 6 页</span>
        </div>

        <Tooltip content="收起缩略图侧边栏" position="right">
          <Button
            size="mini"
            type="text"
            icon={<IconMenuFold style={{ color: "var(--ds-viewer-on-shell-faint)" }} />}
            onClick={onToggleCollapse}
          />
        </Tooltip>
      </div>

      {/* 缩略图平滑滚动列表 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {QUOTE_PAGE_LIST.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <div
              key={item.page}
              ref={isActive ? activeItemRef : undefined}
              onClick={() => onSelectPage(item.page)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {/* 页码与标牌 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: 160,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusTag size="small" tone={isActive ? 'info' : 'neutral'} style={{ minWidth: 20, textAlign: 'center', padding: '0 4px' }}>
                    {item.page}
                  </StatusTag>
                  <span
                    style={{
                      fontSize: 'var(--ds-text-caption)',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'rgb(var(--primary-6))' : "var(--ds-viewer-on-shell-dim)",
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                {isActive && (
                  <span style={{ fontSize: 'var(--ds-text-micro)', color: 'rgb(var(--primary-6))', fontWeight: 500 }}>当前页</span>
                )}
              </div>

              {/* 160 x 226 A4 等比卡片视口 */}
              <div
                className={`hubx-facsimile__canvas${isActive ? ' hubx-facsimile__canvas--active' : ''}`}
              >
                <QuoteThumbnailPage
                  page={item.page}
                  customerName={customerName}
                  projectName={projectName}
                  grandTotal={grandTotal}
                  logo={assets?.logo}
                  seal={assets?.seal}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
