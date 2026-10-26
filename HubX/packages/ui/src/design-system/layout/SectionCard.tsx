import { Card } from '@arco-design/web-react';
import type { ReactNode } from 'react';
import '../components.css';

export interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** 标题行右侧的操作区（主操作放这里，M-025） */
  extra?: ReactNode;
  /** 内容区是否再包一层 Card 的内边距，默认 true */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 区块卡片。页面里的 `<Card title=... extra=...>` 一律换成它，
 * 保证标题层级、间距和「主操作在标题行右侧」的规则一致（M-025）。
 */
export function SectionCard({ title, description, extra, padded = true, className, children }: SectionCardProps) {
  const hasHead = Boolean(title || description || extra);

  return (
    <Card className={['hubx-section-card', className].filter(Boolean).join(' ')}>
      {hasHead && (
        <div className="hubx-section-card__head">
          <div>
            {title && <h2 className="hubx-section-card__title">{title}</h2>}
            {description && <p className="hubx-section-card__description">{description}</p>}
          </div>
          {extra && <div className="hubx-section-card__extra">{extra}</div>}
        </div>
      )}
      {padded ? <div>{children}</div> : children}
    </Card>
  );
}
