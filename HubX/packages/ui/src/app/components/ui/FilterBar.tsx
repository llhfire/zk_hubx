import type { ReactNode } from 'react';
import './uiFoundation.css';

interface FilterBarProps {
  children: ReactNode;
  actions?: ReactNode;
}

export function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <div className="hubx-filter-bar">
      <div className="hubx-filter-bar__fields">{children}</div>
      {actions && <div className="hubx-filter-bar__actions">{actions}</div>}
    </div>
  );
}

