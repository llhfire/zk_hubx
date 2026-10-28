import { useCallback, useEffect, useState } from 'react';

const TABS = ['foundation', 'modules', 'frameworks', 'patterns'] as const;
type LibraryTab = (typeof TABS)[number];

function readHash(): string[] {
  return window.location.hash.replace(/^#/, '').split('/').filter(Boolean);
}

/**
 * 组件库的页签位置写进 hash（`#<页签>/<分组>`），刷新和分享链接都能落回同一处。
 * 用 history.replaceState 而不是路由跳转：hash 只表示「看到哪」，不参与路由。
 */
export function useLibraryTabs(defaultTab: LibraryTab, defaultGroups: Partial<Record<LibraryTab, string>> = {}) {
  const initial = readHash();
  const initialTab = TABS.includes(initial[0] as LibraryTab) ? (initial[0] as LibraryTab) : defaultTab;

  const [activeTab, setActiveTabState] = useState<LibraryTab>(initialTab);
  const [groups, setGroups] = useState<Record<string, string>>(() => ({
    ...defaultGroups,
    ...(initial[1] && initialTab ? { [initialTab]: initial[1] } : {}),
  }));

  useEffect(() => {
    const onPop = () => {
      const next = readHash();
      if (TABS.includes(next[0] as LibraryTab)) {
        setActiveTabState(next[0] as LibraryTab);
        if (next[1]) setGroups((prev) => ({ ...prev, [next[0]]: next[1] }));
      }
    };
    window.addEventListener('hashchange', onPop);
    return () => window.removeEventListener('hashchange', onPop);
  }, []);

  const writeHash = useCallback((tab: LibraryTab, group: string | undefined) => {
    const next = group ? `#${tab}/${group}` : `#${tab}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    if (!TABS.includes(tab as LibraryTab)) return;
    setActiveTabState(tab as LibraryTab);
    writeHash(tab as LibraryTab, undefined);
  }, [writeHash]);

  const setGroup = useCallback((tab: LibraryTab, group: string) => {
    setGroups((prev) => ({ ...prev, [tab]: group }));
    writeHash(tab, group);
  }, [writeHash]);

  return {
    activeTab,
    setActiveTab,
    groupOf: (tab: LibraryTab, fallback: string) => groups[tab] ?? fallback,
    setGroup,
  };
}
