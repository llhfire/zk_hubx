import type { CSSProperties } from 'react';

export interface QuoteThumbnailPageProps {
  page: number;
  customerName?: string;
  projectName?: string;
  grandTotal?: number;
  logo?: string;
  seal?: string;
}

type MiniStyle = CSSProperties;

/**
 * 报价单专用 A4 缩略页内容。
 *
 * 这里的裸字号、间距和纸张结构是缩印复刻尺寸，不是产品 UI 规范；只允许在
 * `design-system/facsimile` 内新增同类样式，并由 check-design-system 显式登记。
 */
export function QuoteThumbnailPage({
  page,
  customerName = '和昇塑料制品有限公司',
  projectName = '微官网系统定制研发项目',
  grandTotal = 19000,
  logo,
  seal,
}: QuoteThumbnailPageProps) {
  const headerBar = (
    <div style={{ paddingBottom: 3, borderBottom: '1px solid var(--ds-facsimile-ink)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
      <img src={logo} alt="中科" style={{ height: 9, width: 'auto' }} />
      <span style={{ fontSize: 6.5, color: 'var(--ds-facsimile-ink-tertiary)', transform: 'scale(0.85)', transformOrigin: 'left center' }}>中科软通</span>
    </div>
  );

  const footerNum = (num: number) => (
    <div style={{ marginTop: 'auto', paddingTop: 3, borderTop: '1px solid var(--ds-facsimile-rule-strong)', textAlign: 'center', fontSize: 6.5, color: 'var(--ds-facsimile-ink-muted)' }}>
      · {num} ·
    </div>
  );

  const pageStack: MiniStyle = { height: '100%', display: 'flex', flexDirection: 'column' };

  switch (page) {
    case 1:
      return (
        <div style={{ ...pageStack, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px 6px' }}>
          <img src={logo} alt="中科集团" style={{ height: 16, width: 'auto', marginBottom: 6 }} />
          <div style={{ fontSize: 7, color: 'var(--ds-facsimile-ink-faint)', fontWeight: 600, marginBottom: 8 }}>武汉中科软通软件技术有限公司</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--ds-facsimile-brand)', letterSpacing: 2, marginBottom: 4 }}>报 价 单</div>
          <div style={{ height: 2, width: '65%', background: 'var(--ds-facsimile-brand-bar)', margin: '0 auto 12px auto' }} />
          <div style={{ width: '88%', background: 'var(--ds-facsimile-wash-2)', border: '1px dashed var(--ds-facsimile-rule-dashed)', borderRadius: 2, padding: '4px 6px', fontSize: 7, color: 'var(--ds-facsimile-ink)' }}>
            <div style={{ color: 'var(--ds-facsimile-ink-muted)', fontSize: 6 }}>致：</div>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName}</div>
          </div>
          <div style={{ marginTop: 'auto', fontSize: 6.5, color: 'var(--ds-facsimile-ink-muted)' }}>日期：2026 年 8 月 14 日</div>
        </div>
      );

    case 2:
      return (
        <div style={{ ...pageStack, position: 'relative' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: 'var(--ds-facsimile-brand)', marginBottom: 3 }}>项目整体报价</div>
          <div style={{ height: 3, width: '92%', background: 'var(--ds-facsimile-wash)', marginBottom: 2 }} />
          <div style={{ height: 3, width: '75%', background: 'var(--ds-facsimile-wash)', marginBottom: 5 }} />

          <div style={{ border: '1px solid var(--ds-facsimile-rule-strong)', borderRadius: 2, overflow: 'hidden', fontSize: 6, marginBottom: 4 }}>
            <div style={{ background: 'var(--ds-facsimile-wash-2)', padding: '2px 4px', borderBottom: '1px solid var(--ds-facsimile-rule)', fontWeight: 600 }}>
              {projectName.slice(0, 10)}...
            </div>
            <div style={{ padding: '2px 4px', borderBottom: '1px solid var(--ds-facsimile-rule)', color: 'var(--ds-facsimile-ink-tertiary)' }}>工期: 20 工作日 · 34.7人天</div>
            <div style={{ background: 'var(--ds-facsimile-danger-bg)', padding: '3px 4px', color: 'var(--ds-facsimile-danger-fg)', fontWeight: 'bold' }}>
              总价: ¥{grandTotal.toLocaleString()}
            </div>
          </div>

          <div style={{ fontSize: 5.5, color: 'var(--ds-facsimile-ink-muted)', lineHeight: 1.4 }}>
            • 含增值税专用发票<br />
            • 质保期 1 年免费维护
          </div>

          <img src={seal} alt="公章" style={{ position: 'absolute', right: 4, bottom: 20, width: 44, height: 44, opacity: 0.92, pointerEvents: 'none' }} />
          {footerNum(2)}
        </div>
      );

    case 3:
      return (
        <div style={pageStack}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: 'var(--ds-facsimile-brand)', marginBottom: 2 }}>公司介绍</div>
          <div style={{ fontSize: 6, color: 'var(--ds-facsimile-ink-secondary)', marginBottom: 4 }}>企业移动/PC 软件定制开发专家</div>
          <div style={{ height: 3, width: '100%', background: 'var(--ds-facsimile-wash)', marginBottom: 2 }} />
          <div style={{ height: 3, width: '85%', background: 'var(--ds-facsimile-wash)', marginBottom: 6 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 4 }}>
            {['定制研发', '移动/小程序', '系统集成', '运维保障'].map((title) => (
              <div key={title} style={{ background: 'var(--ds-facsimile-paper-tint)', border: '1px solid var(--ds-facsimile-rule)', padding: '3px 2px', textAlign: 'center', fontSize: 5.5, color: 'var(--ds-facsimile-ink-strong)', borderRadius: 2 }}>
                {title}
              </div>
            ))}
          </div>

          <div style={{ height: 3, width: '90%', background: 'var(--ds-facsimile-wash)', marginBottom: 2 }} />
          <div style={{ height: 3, width: '70%', background: 'var(--ds-facsimile-wash)' }} />
          {footerNum(3)}
        </div>
      );

    case 4:
      return (
        <div style={pageStack}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: 'var(--ds-facsimile-brand)', marginBottom: 4 }}>详细报价清单 (一)</div>

          <div style={{ border: '1px solid var(--ds-facsimile-rule-strong)', borderRadius: 2, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'var(--ds-facsimile-wash-blue)', padding: '2px 3px', borderBottom: '1px solid var(--ds-facsimile-rule-strong)', fontSize: 6, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
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
              <div key={row.m + row.s} style={{ padding: '2px 3px', borderBottom: '1px solid var(--ds-facsimile-rule-soft)', fontSize: 5.5, background: idx % 2 === 0 ? 'var(--ds-facsimile-paper)' : 'var(--ds-facsimile-paper-tint)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ds-facsimile-ink)' }}>{row.m} · {row.s.slice(0, 5)}</span>
                <span style={{ color: 'var(--ds-facsimile-accent)' }}>支持</span>
              </div>
            ))}
          </div>
          {footerNum(4)}
        </div>
      );

    case 5:
      return (
        <div style={pageStack}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: 'var(--ds-facsimile-brand)', marginBottom: 3 }}>详细报价清单 (二)</div>

          <div style={{ border: '1px solid var(--ds-facsimile-rule-strong)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
            {[
              { m: '客户留资', s: '在线表单/数据管理' },
              { m: '会员中心', s: '注册登录/我的记录' },
              { m: '后台管理', s: 'CMS系统/权限管理' },
            ].map((row, idx) => (
              <div key={row.m} style={{ padding: '2px 3px', borderBottom: '1px solid var(--ds-facsimile-rule-soft)', fontSize: 5.5, background: idx % 2 === 0 ? 'var(--ds-facsimile-paper)' : 'var(--ds-facsimile-paper-tint)' }}>
                {row.m} · {row.s}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 7, fontWeight: 600, color: 'var(--ds-facsimile-ink)', marginBottom: 2 }}>可能涉及的自费项目</div>
          <div style={{ border: '1px solid var(--ds-facsimile-rule)', borderRadius: 2, padding: 3, background: 'var(--ds-facsimile-paper-tint-2)', fontSize: 5.5, color: 'var(--ds-facsimile-ink-tertiary)' }}>
            服务器 / 存储 OSS (按量代采)
          </div>
          {footerNum(5)}
        </div>
      );

    case 6:
      return (
        <div style={{ ...pageStack, position: 'relative' }}>
          {headerBar}
          <div style={{ fontSize: 8, fontWeight: 'bold', color: 'var(--ds-facsimile-brand)', marginBottom: 3 }}>费用汇总与授权签章</div>

          <div style={{ border: '1px solid var(--ds-facsimile-rule)', borderRadius: 2, padding: '3px 4px', fontSize: 5.5, color: 'var(--ds-facsimile-ink-secondary)', marginBottom: 6, background: 'var(--ds-facsimile-paper-tint)' }}>
            短信按量计费 / 域名证书配置
          </div>

          <div style={{ border: '1px dashed var(--ds-facsimile-rule-frame)', borderRadius: 2, padding: '5px 6px', background: 'var(--ds-facsimile-paper)', fontSize: 6, lineHeight: 1.4, color: 'var(--ds-facsimile-ink)' }}>
            <div style={{ fontWeight: 'bold', fontSize: 6.5 }}>武汉中科软通软件技术有限公司</div>
            <div style={{ color: 'var(--ds-facsimile-ink-muted)', fontSize: 5.5 }}>(此处加盖公章)</div>
            <div style={{ marginTop: 3 }}>授权代表：吴丹丹</div>
            <div>日期：2026.08.14</div>
          </div>

          <img src={seal} alt="公章" style={{ position: 'absolute', right: 6, bottom: 22, width: 44, height: 44, opacity: 0.92, pointerEvents: 'none' }} />
          {footerNum(6)}
        </div>
      );

    default:
      return null;
  }
}
