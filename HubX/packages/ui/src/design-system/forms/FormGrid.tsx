import type { ReactNode } from 'react';
import '../components.css';

export interface FormGridProps {
  /** 列数，默认 2。窄容器（抽屉、弹窗侧栏）用 1 */
  columns?: 1 | 2 | 3 | 4;
  /** 不等宽字段布局，仅允许设计系统登记过的比例变体。 */
  template?: '2-1-1' | '5-7';
  children: ReactNode;
  className?: string;
}

/**
 * 表单字段网格。替代各页面手写的 `<Row gutter><Col span>` ——
 * Arco 的 24 栅格在不同页面里列宽和换行行为都不一致。
 */
export function FormGrid({ columns = 2, template, children, className }: FormGridProps) {
  return (
    <div className={['hubx-form-grid', `hubx-form-grid--${columns}`, template && `hubx-form-grid--template-${template}`, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
