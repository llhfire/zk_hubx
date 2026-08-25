/**
 * 全局搜索弹层组件
 *
 * 设计规约见 global-search-design.md §6/S3：
 * - 自绘弹层，不用 Arco Modal
 * - ⌘K/Ctrl+K 唤起；Esc/点遮罩关闭
 * - ↑↓ 跨类焦点；Enter 执行焦点行；打开自动聚焦全选
 * - 默认视图：六类静态提示卡
 * - 结果行：图标 + 标题（命中词高亮）+ meta +「↵ 跳转」
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { IconSearch, IconUser, IconFile, IconApps, IconCustomerService, IconQuote, IconUserGroup } from '@arco-design/web-react/icon';
import { useGlobalSearchIndex } from './searchIndex';
import { matchEntities, highlightParts, nextFocusIndex } from './matchEntities';
import { ENTITY_ORDER, ENTITY_LABEL, type SearchEntityKind, type SearchGroup } from './types';

/** 六类默认提示卡 */
const HINT_CARDS: Array<{
  kind: SearchEntityKind;
  icon: React.ReactNode;
  hint: string;
  example: string;
}> = [
  { kind: 'lead', icon: <IconCustomerService />, hint: '线索名、公司、联系人、手机号、编号', example: '和昇' },
  { kind: 'customer', icon: <IconUser />, hint: '客户名、联系人、电话、编号', example: '北京' },
  { kind: 'quote', icon: <IconQuote />, hint: '报价名、编号、客户名', example: 'ZK-2026' },
  { kind: 'contract', icon: <IconFile />, hint: '合同名、编号、客户名', example: 'CT-' },
  { kind: 'project', icon: <IconApps />, hint: '项目名、编号、PM', example: '微官网' },
  { kind: 'employee', icon: <IconUserGroup />, hint: '姓名、部门、岗位', example: '张' },
];

/** 每类图标 */
const KIND_ICON: Record<SearchEntityKind, React.ReactNode> = {
  lead: <IconCustomerService style={{ fontSize: 14 }} />,
  customer: <IconUser style={{ fontSize: 14 }} />,
  quote: <IconQuote style={{ fontSize: 14 }} />,
  contract: <IconFile style={{ fontSize: 14 }} />,
  project: <IconApps style={{ fontSize: 14 }} />,
  employee: <IconUserGroup style={{ fontSize: 14 }} />,
};

export function GlobalSearchPalette() {
  const navigate = useNavigate();
  const allItems = useGlobalSearchIndex();

  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 扁平化结果列表（用于键盘导航）
  const groups = useMemo(() => matchEntities(keyword, allItems), [keyword, allItems]);
  const flatItems = useMemo(() => {
    const flat: Array<{ group: SearchGroup; itemIndex: number }> = [];
    for (const g of groups) {
      for (let i = 0; i < g.items.length; i++) {
        flat.push({ group: g, itemIndex: i });
      }
    }
    return flat;
  }, [groups]);

  const doOpen = useCallback(() => {
    setOpen(true);
    setKeyword('');
    setFocusIndex(-1);
    // 聚焦延迟到 DOM 更新
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const doClose = useCallback(() => {
    setOpen(false);
    setKeyword('');
    setFocusIndex(-1);
  }, []);

  // ⌘K / Ctrl+K 全局键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        doOpen();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [doOpen]);

  // 弹层内键盘
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        doClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((prev) => nextFocusIndex(prev, 1, flatItems.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((prev) => nextFocusIndex(prev, -1, flatItems.length));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < flatItems.length) {
          const { group, itemIndex } = flatItems[focusIndex];
          const item = group.items[itemIndex];
          navigate(item.route);
          doClose();
        }
        return;
      }
    },
    [doClose, flatItems, focusIndex, navigate],
  );

  // 点击遮罩关闭
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) doClose();
    },
    [doClose],
  );

  // 点击结果行
  const handleItemClick = useCallback(
    (route: string) => {
      navigate(route);
      doClose();
    },
    [navigate, doClose],
  );

  // 点击提示卡（填入示例词）
  const handleHintClick = useCallback((example: string) => {
    setKeyword(example);
    setFocusIndex(-1);
    inputRef.current?.focus();
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        ref={panelRef}
        onKeyDown={handleKeyDown}
        style={{
          width: 600,
          maxHeight: '60vh',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 搜索输入框 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--grey-200)',
            gap: 8,
          }}
        >
          <IconSearch style={{ fontSize: 18, color: 'var(--grey-400)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setFocusIndex(-1);
            }}
            placeholder="搜索线索、客户、报价、合同、项目、员工…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: 'var(--grey-800)',
              background: 'transparent',
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--grey-100)',
              border: '1px solid var(--grey-200)',
              color: 'var(--grey-500)',
              flexShrink: 0,
            }}
          >
            Esc
          </kbd>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {keyword.trim() === '' ? (
            /* 默认视图：六类提示卡 */
            <div style={{ padding: '8px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 8 }}>可搜索内容</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {HINT_CARDS.map((card) => (
                  <div
                    key={card.kind}
                    onClick={() => handleHintClick(card.example)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      fontSize: 13,
                      color: 'var(--grey-600)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--grey-50)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ color: 'var(--grey-400)' }}>{card.icon}</span>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--grey-700)' }}>{ENTITY_LABEL[card.kind]}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{card.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : groups.length === 0 ? (
            /* 空态 */
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
              未找到「{keyword}」相关结果
            </div>
          ) : (
            /* 搜索结果 */
            (() => {
              let flatIdx = 0;
              return groups.map((group) => (
                <div key={group.kind} style={{ marginBottom: 4 }}>
                  {/* 组标题 */}
                  <div
                    style={{
                      padding: '6px 16px 2px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--grey-400)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {group.label}
                  </div>
                  {/* 结果行 */}
                  {group.items.map((item, i) => {
                    const currentFlatIdx = flatIdx++;
                    const focused = currentFlatIdx === focusIndex;
                    const parts = highlightParts(item.title, keyword);
                    return (
                      <div
                        key={`${group.kind}-${item.route}`}
                        onClick={() => handleItemClick(item.route)}
                        onMouseEnter={() => setFocusIndex(currentFlatIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 16px',
                          cursor: 'pointer',
                          background: focused ? 'var(--grey-50)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--grey-400)', flexShrink: 0 }}>{KIND_ICON[group.kind]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--grey-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {parts.map((p, pi) =>
                              p.hit ? (
                                <mark key={pi} style={{ background: 'var(--brand-100)', color: 'var(--brand-700)', borderRadius: 2, padding: '0 1px' }}>
                                  {p.text}
                                </mark>
                              ) : (
                                <span key={pi}>{p.text}</span>
                              ),
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--grey-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.meta}
                          </div>
                        </div>
                        {focused && (
                          <span style={{ fontSize: 11, color: 'var(--grey-400)', flexShrink: 0 }}>
                            ↵ 跳转
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* 底栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 16px',
            borderTop: '1px solid var(--grey-100)',
            fontSize: 11,
            color: 'var(--grey-400)',
          }}
        >
          <span>↑↓ 导航 · Enter 跳转 · Esc 关闭</span>
          <span>{flatItems.length > 0 ? `${flatItems.length} 条结果` : ''}</span>
        </div>
      </div>
    </div>
  );
}
