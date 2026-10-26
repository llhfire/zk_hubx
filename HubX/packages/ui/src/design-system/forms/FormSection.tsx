import type { ReactNode } from 'react';
import '../components.css';

export interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 表单/详情里的字段分组。分组标题层级固定，不再由各页面用 Typography 各自设置。
 */
export function FormSection({ title, description, extra, children, className }: FormSectionProps) {
  return (
    <section className={['hubx-form-section', className].filter(Boolean).join(' ')}>
      {(title || extra) && (
        <div className="hubx-section-card__head">
          <div>
            {title && <h3 className="hubx-form-section__title">{title}</h3>}
            {description && <p className="hubx-section-card__description">{description}</p>}
          </div>
          {extra && <div className="hubx-section-card__extra">{extra}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
