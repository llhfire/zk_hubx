import { Empty } from '@arco-design/web-react';
import type { ReactNode } from 'react';
import '../components.css';

export interface EmptyStateProps {
  /** 说明文字；Arco 的 Empty 用 description 承载内容，写成 children 会被静默丢弃 */
  description?: ReactNode;
  /** 空态下的引导操作 */
  action?: ReactNode;
  className?: string;
}

/**
 * 空态的唯一实现。
 *
 * 改造前全仓 69 处直接使用 `<Empty>`，其中有把按钮写成 children 的 ——
 * Arco 不渲染 children，按钮从来没显示过。
 */
export function EmptyState({ description = '暂无数据', action, className }: EmptyStateProps) {
  return (
    <div className={['hubx-empty-state', className].filter(Boolean).join(' ')}>
      <Empty description={<span className="hubx-empty-state__description">{description}</span>} />
      {action}
    </div>
  );
}
