import { Tooltip } from '@arco-design/web-react';
import type { ReactNode } from 'react';
import '../components.css';

export interface IdentifierTextProps {
  value: ReactNode;
  /** 完整值的悬停说明；默认使用 value 的字符串形式 */
  title?: string;
  /** 超出宽度时的最大宽度，默认 100% */
  maxWidth?: number | string;
  /** sm 用于卡片副标题、表格次级列 */
  size?: 'sm' | 'md';
  /** muted 表示纯辅助信息；关键标识（单号、账号）保持 default */
  tone?: 'default' | 'muted';
  className?: string;
}

/**
 * 编号、账号、邮箱、文件名等不可拆分标识（M-033）。
 *
 * 单行 + 省略号 + 悬停看完整值，绝不在字符中间换行。
 */
export function IdentifierText({ value, title, maxWidth, size = 'md', tone = 'default', className }: IdentifierTextProps) {
  const tooltip = title ?? (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined);

  return (
    <Tooltip content={tooltip} disabled={!tooltip}>
      <span
        className={[
          'hubx-identifier',
          size === 'sm' ? 'hubx-identifier--sm' : '',
          tone === 'muted' ? 'hubx-identifier--muted' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={maxWidth === undefined ? undefined : { maxWidth }}
      >
        {value}
      </span>
    </Tooltip>
  );
}
