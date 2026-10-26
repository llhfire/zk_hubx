import type { ReactNode } from 'react';
import { Link } from 'react-router';
import '../components.css';

export interface EntityLinkProps {
  /** 目标路由；按稳定 ID 拼接，不要用名称模糊匹配（M-034/035） */
  to?: string;
  /** 跳转时携带的来源上下文，返回时用于恢复原页签与滚动位置 */
  state?: unknown;
  /** 非路由跳转（例如打开抽屉）时使用 */
  onClick?: () => void;
  /** 无权限或对象缺失时置灰，避免打开空白详情 */
  disabled?: boolean;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * 关联业务对象名称的唯一入口（M-034/M-035）。
 * 线索、合同、客户、项目等互相引用时统一用它，保证链接样式与返回上下文一致。
 */
export function EntityLink({ to, state, onClick, disabled = false, title, children, className }: EntityLinkProps) {
  const classes = ['hubx-entity-link', className].filter(Boolean).join(' ');
  const tooltip = title ?? (disabled ? '无查看权限或对象已不可用' : undefined);

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true" title={tooltip}>
        {children}
      </span>
    );
  }

  if (to) {
    return (
      <Link className={classes} to={to} state={state} title={tooltip}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} title={tooltip}>
      {children}
    </button>
  );
}
