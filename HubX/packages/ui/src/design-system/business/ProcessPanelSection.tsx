import type { ReactNode } from 'react';
import '../components.css';

export interface ProcessPanelSectionProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 业务过程侧栏的单个页签内容区。
 * 统一顶部动作栏与内容间距，避免页面重复拼装同一组布局样式。
 */
export function ProcessPanelSection({ actions, children, className }: ProcessPanelSectionProps) {
  return (
    <section className={['hubx-process-panel-section', className].filter(Boolean).join(' ')}>
      {actions && <div className="hubx-process-panel-section__actions">{actions}</div>}
      <div className="hubx-process-panel-section__content">{children}</div>
    </section>
  );
}
