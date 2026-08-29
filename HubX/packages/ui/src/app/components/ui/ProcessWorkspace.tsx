import type { ReactNode } from 'react';
import './uiFoundation.css';

interface ProcessWorkspaceProps {
  children: ReactNode;
  className?: string;
}

interface ProcessWorkspaceRegionProps {
  children: ReactNode;
  className?: string;
}

export function ProcessWorkspace({ children, className }: ProcessWorkspaceProps) {
  return (
    <div className={['hubx-process-workspace', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function ProcessWorkspaceMain({ children, className }: ProcessWorkspaceRegionProps) {
  return (
    <div className={['hubx-process-workspace__main', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function ProcessWorkspaceAside({ children, className }: ProcessWorkspaceRegionProps) {
  return (
    <aside className={['hubx-process-workspace__aside', className].filter(Boolean).join(' ')}>
      {children}
    </aside>
  );
}
