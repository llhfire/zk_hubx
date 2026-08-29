import type { ReactNode } from 'react';
import './uiFoundation.css';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="hubx-page-header">
      <div className="hubx-page-header__main">
        <h1 className="hubx-page-header__title">{title}</h1>
        {description && <p className="hubx-page-header__description">{description}</p>}
      </div>
      {actions && <div className="hubx-page-header__actions">{actions}</div>}
    </header>
  );
}

