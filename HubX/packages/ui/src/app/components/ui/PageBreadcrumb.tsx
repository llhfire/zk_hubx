import { Breadcrumb } from '@arco-design/web-react';
import { Link } from 'react-router';
import './uiFoundation.css';

export interface PageBreadcrumbItem {
  label: string;
  to?: string;
  path?: string;
  onClick?: () => void;
}

interface PageBreadcrumbProps {
  items: PageBreadcrumbItem[];
}

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  return (
    <Breadcrumb className="hubx-page-breadcrumb" aria-label="页面层级">
      {items.map((item, index) => {
        const target = item.to || item.path;
        const isLast = index === items.length - 1;

        if (target && !isLast) {
          return (
            <Breadcrumb.Item key={`${item.label}-${index}`}>
              <Link className="hubx-page-breadcrumb__link" to={target} onClick={item.onClick}>
                {item.label}
              </Link>
            </Breadcrumb.Item>
          );
        }

        if (item.onClick && !isLast) {
          return (
            <Breadcrumb.Item key={`${item.label}-${index}`}>
              <span
                className="hubx-page-breadcrumb__link"
                style={{ cursor: 'pointer' }}
                onClick={item.onClick}
              >
                {item.label}
              </span>
            </Breadcrumb.Item>
          );
        }

        return (
          <Breadcrumb.Item key={`${item.label}-${index}`}>
            {item.label}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
}

