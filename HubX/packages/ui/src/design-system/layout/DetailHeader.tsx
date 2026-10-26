import { Button } from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import type { ReactNode } from 'react';
import '../components.css';

export interface DetailHeaderProps {
  title: ReactNode;
  /** 返回列表 */
  onBack?: () => void;
  backLabel?: string;
  /** 状态标签（通常传 <StatusTag />） */
  status?: ReactNode;
  /** 单号等标识（通常传 <IdentifierText />） */
  identifier?: ReactNode;
  /** 标题下方的次级信息 */
  meta?: ReactNode;
  /** 业务步骤条（通常传 <ProcessOverview />，M-048） */
  steps?: ReactNode;
  /** 右侧操作区，禁止换行（M-033） */
  actions?: ReactNode;
  className?: string;
}

/**
 * 详情页页头。
 *
 * 详情页此前各自拼「返回 + 标题 + 状态 + 单号 + 操作」，层级和间距都不一致；
 * 长流程详情还要额外插业务步骤条（M-048）。统一到这里。
 */
export function DetailHeader({
  title,
  onBack,
  backLabel = '返回列表',
  status,
  identifier,
  meta,
  steps,
  actions,
  className,
}: DetailHeaderProps) {
  return (
    <header className={['hubx-detail-header', className].filter(Boolean).join(' ')}>
      <div className="hubx-detail-header__bar">
        <div style={{ minWidth: 0 }}>
          {onBack && (
            <div className="hubx-detail-header__back">
              <Button size="mini" type="text" icon={<IconLeft />} onClick={onBack}>
                {backLabel}
              </Button>
            </div>
          )}
          <div className="hubx-detail-header__identity">
            <h1 className="hubx-detail-header__title">{title}</h1>
            {status}
            {identifier}
          </div>
          {meta && <div className="hubx-detail-header__meta">{meta}</div>}
        </div>
        {actions && <div className="hubx-detail-header__actions">{actions}</div>}
      </div>
      {steps}
    </header>
  );
}
