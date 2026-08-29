import type { ReactNode } from 'react';
import { PageBreadcrumb, type PageBreadcrumbItem } from './PageBreadcrumb';
import './uiFoundation.css';

interface PageShellProps {
  breadcrumbs?: PageBreadcrumbItem[];
  children: ReactNode;
  className?: string;
}

export function PageShell({ breadcrumbs, children, className }: PageShellProps) {
  return (
    <div className={['hubx-page-shell', className].filter(Boolean).join(' ')}>
      {breadcrumbs && breadcrumbs.length > 0 && <PageBreadcrumb items={breadcrumbs} />}
      <div className="hubx-page-shell__content">{children}</div>
    </div>
  );
}

