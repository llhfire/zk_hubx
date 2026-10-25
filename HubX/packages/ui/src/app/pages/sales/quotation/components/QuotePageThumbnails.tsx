import React, { useEffect, useRef } from 'react';
import { Tag, Typography, Button, Tooltip } from '@arco-design/web-react';
import { IconMenuFold, IconMenuUnfold } from '@arco-design/web-react/icon';
import { useQuoteAssets } from '../useQuoteAssets';

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
 * 6 页标准 A4 高拟真微缩视觉预览卡片
 * 严格按照 1:1.414 A4 比例（160px * 226px）渲染
 */
function MiniPageContent({
  page,
  customerName = '和昇塑料制品有限公司',
  projectName = '微官网系统定制研发项目',
  grandTotal = 19000,
}: {
  page: number;
  customerName?: string;
  projectName?: string;
  grandTotal?: number;
}) {
  const assets = useQuoteAssets();
  const logo = assets?.logo;
  const seal = assets?.seal;

  const headerBar = (
    <div style={{ paddingBottom: 3, borderBottom: '1px solid #333', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
      <img src={logo} alt="中科" style={{ height: 9, width: 'auto' }} />
      <span style={{ fontSize: 6.5, color: '#666', transform: 'scale(0.85)', transformOrigin: 'left center' }}>中科软通</span>
    </div>
  );

  const footerNum = (num: number) => (
    <div style={{ marginTop: 'auto', paddingTop: 3, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 6.5, color: '#888' }}>
      · {num} ·
    </div>
  );

  switch (page) {
    case 1: // 封面
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px 6px' }}>
          <img src={logo} alt="中科集团" style={{ height: 16, width: 'auto', marginBottom: 6 }} />
          <div style={{ fontSize: 7, color: '#444', fontWeight: 600, marginBottom: 8 }}>武汉中科软通软件技术有限公司</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0b3d88', letterSpacing: 2, marginBottom: 4 }}>报 价 单</div>
          <div style={{ height: 2, width: '65%', background: '#1351a8', margin: '0 auto 12px auto' }} />
          <div style={{ width: '88%', background: '#f5f7fa', border: '1px dashed #d0d7de', borderRadius: 2, padding: '4px 6px', fontSize: 7, color: '#333' }}>
            <div style={{ color: '#888', fontSize: 6 }}>致：</div>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName}</div>
          </div>
          <div style={{ marginTop: 'auto', fontSize: 6.5, color: '#888' }}>日期：2026 年 8 月 14 日</div>
        </div>
      );

    case 2: // 项目整体报价
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: '#0b3d88', marginBottom: 3 }}>项目整体报价</div>
          <div style={{ height: 3, width: '92%', background: '#eef0f4', marginBottom: 2 }} />
          <div style={{ height: 3, width: '75%', background: '#eef0f4', marginBottom: 5 }} />

          {/* 表格骨架 */}
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 2, overflow: 'hidden', fontSize: 6, marginBottom: 4 }}>
            <div style={{ background: '#f0f2f5', padding: '2px 4px', borderBottom: '1px solid #e5e6eb', fontWeight: 600 }}>
              {projectName.slice(0, 10)}...
            </div>
            <div style={{ padding: '2px 4px', borderBottom: '1px solid #e5e6eb', color: '#666' }}>工期: 20 工作日 · 34.7人天</div>
            <div style={{ background: '#fff1f0', padding: '3px 4px', color: '#cf1322', fontWeight: 'bold' }}>
              总价: ¥{grandTotal.toLocaleString()}
            </div>
          </div>

          {/* 备注说明 */}
          <div style={{ fontSize: 5.5, color: '#888', lineHeight: 1.4 }}>
            • 含增值税专用发票<br />
            • 质保期 1 年免费维护
          </div>

          {/* 鲜红公章覆盖 */}
          <img
            src={seal}
            alt="公章"
            style={{ position: 'absolute', right: 4, bottom: 20, width: 44, height: 44, opacity: 0.92, pointerEvents: 'none' }}
          />
          {footerNum(2)}
        </div>
      );

    case 3: // 公司介绍
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: '#0b3d88', marginBottom: 2 }}>公司介绍</div>
          <div style={{ fontSize: 6, color: '#555', marginBottom: 4 }}>企业移动/PC 软件定制开发专家</div>
          <div style={{ height: 3, width: '100%', background: '#eef0f4', marginBottom: 2 }} />
          <div style={{ height: 3, width: '85%', background: '#eef0f4', marginBottom: 6 }} />

          {/* 四大服务微缩网格 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 4 }}>
            {['定制研发', '移动/小程序', '系统集成', '运维保障'].map((title, i) => (
              <div key={i} style={{ background: '#f7f8fa', border: '1px solid #e5e6eb', padding: '3px 2px', textAlign: 'center', fontSize: 5.5, color: '#1d2129', borderRadius: 2 }}>
                {title}
              </div>
            ))}
          </div>

          <div style={{ height: 3, width: '90%', background: '#eef0f4', marginBottom: 2 }} />
          <div style={{ height: 3, width: '70%', background: '#eef0f4' }} />
          {footerNum(3)}
        </div>
      );

    case 4: // 详细报价清单 (一)
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: '#0b3d88', marginBottom: 4 }}>详细报价清单 (一)</div>

          {/* 清单表格骨架 */}
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 2, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#eef2f8', padding: '2px 3px', borderBottom: '1px solid #ccc', fontSize: 6, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>模块/功能</span>
              <span>人天</span>
            </div>
            {[
              { m: '首页展示', s: 'Banner轮播/快捷导航' },
              { m: '首页展示', s: '热点推荐/行业分类' },
              { m: '关于我们', s: '企业文化/发展历程' },
              { m: '产品中心', s: '产品分类/详情/搜索' },
              { m: '新闻资讯', s: '公司新闻/行业洞察' },
            ].map((row, idx) => (
              <div key={idx} style={{ padding: '2px 3px', borderBottom: '1px solid #f0f0f0', fontSize: 5.5, background: idx % 2 === 0 ? '#fff' : '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#333' }}>{row.m} · {row.s.slice(0, 5)}</span>
                <span style={{ color: '#165dff' }}>支持</span>
              </div>
            ))}
          </div>
          {footerNum(4)}
        </div>
      );

    case 5: // 详细报价清单 (二)
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: '#0b3d88', marginBottom: 3 }}>详细报价清单 (二)</div>

          {/* 清单续表 */}
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
            {[
              { m: '客户留资', s: '在线表单/数据管理' },
              { m: '会员中心', s: '注册登录/我的记录' },
              { m: '后台管理', s: 'CMS系统/权限管理' },
            ].map((row, idx) => (
              <div key={idx} style={{ padding: '2px 3px', borderBottom: '1px solid #f0f0f0', fontSize: 5.5, background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                {row.m} · {row.s}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 7, fontWeight: 600, color: '#333', marginBottom: 2 }}>可能涉及的自费项目</div>
          <div style={{ border: '1px solid #e5e6eb', borderRadius: 2, padding: '3px', background: '#fcfcfc', fontSize: 5.5, color: '#666' }}>
            服务器 / 存储 OSS (按量代采)
          </div>
          {footerNum(5)}
        </div>
      );

    case 6: // 自费项目与授权签章
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: '#0b3d88', marginBottom: 3 }}>费用汇总与授权签章</div>

          {/* 自费续表 */}
          <div style={{ border: '1px solid #e5e6eb', borderRadius: 2, padding: '3px 4px', fontSize: 5.5, color: '#555', marginBottom: 6, background: '#fafafa' }}>
            短信按量计费 / 域名证书配置
          </div>

          {/* 签章授权落款框 */}
          <div style={{ border: '1px dashed #bfbfbf', borderRadius: 2, padding: '5px 6px', background: '#ffffff', fontSize: 6, lineHeight: 1.4, color: '#333' }}>
            <div style={{ fontWeight: 'bold', fontSize: 6.5 }}>武汉中科软通软件技术有限公司</div>
            <div style={{ color: '#888', fontSize: 5.5 }}>(此处加盖公章)</div>
            <div style={{ marginTop: 3 }}>授权代表：吴丹丹</div>
            <div>日期：2026.08.14</div>
          </div>

          {/* 鲜红公章覆盖 */}
          <img
            src={seal}
            alt="公章"
            style={{ position: 'absolute', right: 6, bottom: 22, width: 44, height: 44, opacity: 0.92, pointerEvents: 'none' }}
          />
          {footerNum(6)}
        </div>
      );

    default:
      return null;
  }
}

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
          transition: 'width 0.2s ease',
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

        <div style={{ writingMode: 'vertical-rl', fontSize: 12, color: 'var(--color-text-3)', letterSpacing: 2, marginTop: 8 }}>
          缩略图 (6)
        </div>

        {QUOTE_PAGE_LIST.map((item) => (
          <Tooltip key={item.page} content={`${item.title} (${item.badge})`} position="right">
            <div
              onClick={() => onSelectPage(item.page)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: currentPage === item.page ? 'var(--primary-6)' : 'var(--color-fill-2)',
                color: currentPage === item.page ? '#ffffff' : 'var(--color-text-2)',
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

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: '#2b2d30',
        borderRight: '1px solid #1e1f22',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}
    >
      {/* 侧栏顶栏 */}
      <div
        style={{
          height: 38,
          padding: '0 12px',
          background: '#232528',
          borderBottom: '1px solid #1a1b1d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#e6e6e6', fontSize: 12, fontWeight: 600 }}>页面缩略图</Text>
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>共 6 页</span>
        </div>

        <Tooltip content="收起缩略图侧边栏" position="right">
          <Button
            size="mini"
            type="text"
            icon={<IconMenuFold style={{ color: '#a6a6a6' }} />}
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
                  <Tag
                    size="small"
                    color={isActive ? 'arcoblue' : 'gray'}
                    style={{ fontWeight: 600, fontSize: 11, minWidth: 20, textAlign: 'center', padding: '0 4px' }}
                  >
                    {item.page}
                  </Tag>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#4080ff' : '#cccccc',
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                {isActive && (
                  <span style={{ fontSize: 10, color: '#4080ff', fontWeight: 500 }}>当前页</span>
                )}
              </div>

              {/* 160 x 226 A4 等比卡片视口 */}
              <div
                style={{
                  width: 160,
                  height: 226,
                  background: '#ffffff',
                  borderRadius: 4,
                  border: isActive ? '2px solid #165dff' : '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: isActive
                    ? '0 0 0 3px rgba(22, 93, 255, 0.35), 0 6px 16px rgba(0, 0, 0, 0.45)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  transition: 'all 0.18s ease-in-out',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <MiniPageContent
                  page={item.page}
                  customerName={customerName}
                  projectName={projectName}
                  grandTotal={grandTotal}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
