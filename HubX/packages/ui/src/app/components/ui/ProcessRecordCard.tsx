import type { ReactNode } from 'react';
import './uiFoundation.css';

export interface ProcessRecordCardProps {
  title: ReactNode;
  leading?: ReactNode;
  tags?: ReactNode;
  actions?: ReactNode;
  identifier?: ReactNode;
  summary?: ReactNode;
  notice?: ReactNode;
  muted?: boolean;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * 长流程详情侧栏中的业务记录卡片。
 * 统一报价、合同、资料、出差等记录的标题、状态、编号、摘要和操作层级。
 */
export function ProcessRecordCard({
  title,
  leading,
  tags,
  actions,
  identifier,
  summary,
  notice,
  muted = false,
  className,
  onClick,
  ariaLabel,
}: ProcessRecordCardProps) {
  const interactive = Boolean(onClick);

  return (
    <article
      className={[
        'hubx-process-record-card',
        muted ? 'hubx-process-record-card--muted' : '',
        interactive ? 'hubx-process-record-card--interactive' : '',
        className,
      ].filter(Boolean).join(' ')}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <div className="hubx-process-record-card__head">
        <div className="hubx-process-record-card__identity">
          {leading && <span className="hubx-process-record-card__leading">{leading}</span>}
          <span className="hubx-process-record-card__title">{title}</span>
          {tags && <span className="hubx-process-record-card__tags">{tags}</span>}
        </div>
        {actions && <div className="hubx-process-record-card__actions">{actions}</div>}
      </div>
      {identifier && <div className="hubx-process-record-card__identifier">{identifier}</div>}
      {summary && <div className="hubx-process-record-card__summary">{summary}</div>}
      {notice && <div className="hubx-process-record-card__notice">{notice}</div>}
    </article>
  );
}
