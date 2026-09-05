import type { ReactNode } from 'react';
import { Button, Popover, Tag, Typography } from '@arco-design/web-react';
import { IconCheck, IconClockCircle, IconDown, IconInfoCircle, IconRight } from '@arco-design/web-react/icon';
import type { TripStageCheck, TripStageSummary } from './tripStageSummary';
import type { TripMainTabKey, TripSideTabKey } from './tripDetailMetrics';

const { Text } = Typography;

interface TripStagePopoverProps {
  children: ReactNode;
  summary: TripStageSummary;
  onNavigate?: (target: { main?: TripMainTabKey; side?: TripSideTabKey }) => void;
}

export function TripStagePopover({ children, summary, onNavigate }: TripStagePopoverProps) {
  const renderChecks = (
    title: string,
    kind: 'completed' | 'pending',
    checks: TripStageCheck[],
  ) => checks.length > 0 && (
    <section className="trip-stage-popover__section">
      <div className="trip-stage-popover__heading">
        <span>{title}</span>
        <span>{checks.length} 项</span>
      </div>
      <div className="trip-stage-popover__checks">
        {checks.map((check) => {
          const isActionable = Boolean(check.target && onNavigate);
          return (
            <button
              key={check.id}
              type="button"
              className={`trip-stage-popover__check trip-stage-popover__check--${kind}${isActionable ? ' is-actionable' : ''}`}
              disabled={!isActionable}
              onClick={() => check.target && onNavigate?.(check.target)}
            >
              <span className="trip-stage-popover__check-icon" aria-hidden>
                {kind === 'completed' ? <IconCheck /> : <IconClockCircle />}
              </span>
              <span className="trip-stage-popover__check-label">{check.label}</span>
              {isActionable && <IconRight className="trip-stage-popover__check-arrow" />}
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <Popover
      className="trip-stage-popover-popup"
      style={{ width: 360, maxWidth: 'calc(100vw - 32px)' }}
      position="bottom"
      trigger="click"
      content={(
        <div className="trip-stage-popover">
          {/* 阶段标题与状态 */}
          <div className="trip-stage-popover__header">
            <span className="trip-stage-popover__title">{summary.label}</span>
            {summary.statusText && (
              <Tag size="small" color="arcoblue">{summary.statusText}</Tag>
            )}
          </div>

          {/* 关键指标高亮 */}
          {summary.highlights && summary.highlights.length > 0 && (
            <div className="trip-stage-popover__highlights">
              {summary.highlights.map((h, i) => (
                <div key={i} className="trip-stage-popover__highlight-item">
                  <span className="trip-stage-popover__highlight-label">{h.label}</span>
                  <span className={`trip-stage-popover__highlight-val tone-${h.tone || 'neutral'}`}>
                    {h.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 核验清单 */}
          {renderChecks('已完成核验', 'completed', summary.completed)}
          {renderChecks('待处理事项', 'pending', summary.pending)}

          {/* 底部业务指引 */}
          {summary.tips && (
            <div className="trip-stage-popover__tips">
              <IconInfoCircle style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{summary.tips}</span>
            </div>
          )}
        </div>
      )}
    >
      <Button type="text" size="mini" className="trip-stage-popover__trigger">
        <span>{children}</span>
        <IconDown className="trip-stage-popover__chevron" />
      </Button>
    </Popover>
  );
}
