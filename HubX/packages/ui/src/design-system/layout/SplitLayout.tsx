import type { ReactNode } from 'react';
import '../foundation.css';

interface SplitLayoutProps {
  children: ReactNode;
  className?: string;
}

interface SplitLayoutRegionProps {
  children: ReactNode;
  className?: string;
}

/**
 * 主区 + 侧栏的两栏布局。详情页、工作台统一用它，不要在页面里手写 grid/flex 两栏。
 * CSS 类名沿用 hubx-process-workspace，避免改动 foundation.css 的既有样式。
 */
export function SplitLayout({ children, className }: SplitLayoutProps) {
  return (
    <div className={['hubx-process-workspace', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function SplitLayoutMain({ children, className }: SplitLayoutRegionProps) {
  return (
    <div className={['hubx-process-workspace__main', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function SplitLayoutAside({ children, className }: SplitLayoutRegionProps) {
  return (
    <aside className={['hubx-process-workspace__aside', className].filter(Boolean).join(' ')}>
      {children}
    </aside>
  );
}
