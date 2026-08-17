import { createContext, useContext, type ReactNode } from 'react';
import type { AppVersion } from './versionMatrix';

// 当前运行版本（α版=prototype / β版=web），由各 app 入口经 App.tsx 注入。
// MainLayout 是路由元素拿不到 prop，走 context 下发。
const AppVersionContext = createContext<AppVersion>('alpha');

export function AppVersionProvider({ version, children }: { version: AppVersion; children: ReactNode }) {
  return <AppVersionContext.Provider value={version}>{children}</AppVersionContext.Provider>;
}

export function useAppVersion() {
  return useContext(AppVersionContext);
}
