import { Button } from '@arco-design/web-react';
import { IconClose } from '@arco-design/web-react/icon';
import { useState, type CSSProperties, type ReactNode } from 'react';
import '../components.css';

export type AlertTone = 'warning' | 'info' | 'success' | 'danger';

export interface AlertBannerProps {
  children: ReactNode;
  /** 首行加粗标题；正文照旧放在 children */
  title?: ReactNode;
  tone?: AlertTone;
  /** 提供时显示关闭按钮。关闭只收起当前会话，不代表任务已处理（M-001） */
  closable?: boolean;
  onClose?: () => void;
  /** 紧凑形态：用于卡片内的一行说明，不占整段高度 */
  compact?: boolean;
  className?: string;
  /** 只用于外部布局（外边距、宽度），视觉样式仍写在 components.css */
  style?: CSSProperties;
}

/**
 * 页面顶部的状态提醒（M-001）。
 *
 * 关键语义：**关闭 ≠ 确认/完成/忽略**。组件只负责收起视觉，
 * 是否重新出现在下次刷新由调用方根据真实业务状态重新计算。
 */
export function AlertBanner({
  children,
  title,
  tone = 'warning',
  closable = false,
  onClose,
  compact = false,
  className,
  style,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className={[
        'hubx-alert-banner',
        tone !== 'warning' ? `hubx-alert-banner--${tone}` : '',
        compact ? 'hubx-alert-banner--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      style={style}
    >
      <div className="hubx-alert-banner__content">
        {title && <div className="hubx-alert-banner__title">{title}</div>}
        {children}
      </div>
      {closable && (
        <Button
          className="hubx-alert-banner__close"
          size="mini"
          type="text"
          icon={<IconClose />}
          aria-label="关闭提醒"
          onClick={() => {
            setDismissed(true);
            onClose?.();
          }}
        />
      )}
    </div>
  );
}
