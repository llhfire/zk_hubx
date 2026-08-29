import { Breadcrumb } from '@arco-design/web-react';
import { Link } from 'react-router';
import './uiFoundation.css';

export interface PageBreadcrumbItem {
  label: string;
  to?: string;
}

interface PageBreadcrumbProps {
  items: PageBreadcrumbItem[];
}

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  return (
    <Breadcrumb className="hubx-page-breadcrumb" aria-label="页面层级">
      {items.map((item, index) => (
        <Breadcrumb.Item key={`${item.label}-${index}`}>
          {item.to && index < items.length - 1 ? (
            <Link className="hubx-page-breadcrumb__link" to={item.to}>{item.label}</Link>
          ) : item.label}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  );
}

