// 回款实收台账 Context（B4）。期次计划仍读合同 paymentPlans；本层只镜像实收。
// α 注入 mock（合同种子抽出），β 注入 http（apps/web/src/main.tsx）。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { createMockCollectionService, type CollectionService } from '@/services/collectionService';
import type { CollectionLedgerEntry } from '@/services/collectionMutations';

interface CollectionContextValue {
  collections: CollectionLedgerEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  addCollection: (input: Omit<CollectionLedgerEntry, 'id'> & { id?: string }) => Promise<string>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

interface CollectionProviderProps extends PropsWithChildren {
  service?: CollectionService;
}

export function CollectionProvider({ children, service }: CollectionProviderProps) {
  const svc = useMemo(() => service ?? createMockCollectionService(), [service]);
  const [collections, setCollections] = useState<CollectionLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    svc.list().then((rows) => {
      if (cancelled) return;
      setCollections(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [svc]);

  const refresh = useCallback(async () => {
    setCollections(await svc.list());
  }, [svc]);

  const addCollection = useCallback(async (input: Omit<CollectionLedgerEntry, 'id'> & { id?: string }) => {
    const id = await svc.add(input);
    await refresh();
    return id;
  }, [svc, refresh]);

  const value = useMemo<CollectionContextValue>(
    () => ({ collections, loading, refresh, addCollection }),
    [collections, loading, refresh, addCollection],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollections(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollections must be used within CollectionProvider');
  return ctx;
}
