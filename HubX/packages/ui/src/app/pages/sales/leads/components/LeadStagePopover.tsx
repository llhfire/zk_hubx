import { useState, type ReactNode } from 'react';
import { Button, Popover } from '@/design-system';
import { IconCheck, IconClockCircle, IconDown, IconRight } from '@/design-system';
import './LeadStagePopover.css';
import { StatusTag } from '@/design-system';

export interface LeadStageCheckItem {
  id: string;
  label: string;
  targetTab?: string;
  actionKey?: string;
}

export interface LeadStageSopInfo {
  key: string;
  label: string;
  target: string;
  checklist: LeadStageCheckItem[];
  suggestedActionLabel: string;
  suggestedActionKey: string;
  nextStatuses: string[];
}

export interface LeadStagePopoverProps {
  children: ReactNode;
  stageIndex: number;
  currentStageIndex: number;
  sopInfo: LeadStageSopInfo;
  daysHeld: number;
  nextStageLabel?: string;
  popupVisible?: boolean;
  defaultVisible?: boolean;
  onNavigateTab: (tab: string) => void;
  onAction: (actionKey: string) => void;
  onAdvanceStage: () => void;
}

export interface LeadStagePopoverContentProps {
  stageIndex: number;
  currentStageIndex: number;
  sopInfo: LeadStageSopInfo;
  daysHeld: number;
  nextStageLabel?: string;
  onNavigateTab: (tab: string) => void;
  onAction: (actionKey: string) => void;
  onAdvanceStage: () => void;
}

export function LeadStagePopoverContent({
  stageIndex,
  currentStageIndex,
  sopInfo,
  daysHeld,
  nextStageLabel,
  onNavigateTab,
  onAction,
  onAdvanceStage,
}: LeadStagePopoverContentProps) {
  const isCompleted = stageIndex < currentStageIndex;
  const isCurrent = stageIndex === currentStageIndex;
  const isPending = stageIndex > currentStageIndex;

  const handleCheckClick = (check: LeadStageCheckItem) => {
    if (check.targetTab) {
      onNavigateTab(check.targetTab);
    } else if (check.actionKey) {
      onAction(check.actionKey);
    }
  };

  return (
    <div className="lead-stage-popover">
      {/* 头部：阶段标签与状态 */}
      <div className="lead-stage-popover__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{sopInfo.label}</span>
          {isCompleted && <StatusTag tone="success" size="small">已达成</StatusTag>}
          {isCurrent && <StatusTag tone="info" size="small">进行中 · 已停留 {daysHeld} 天</StatusTag>}
          {isPending && <StatusTag tone="neutral" size="small">未开始</StatusTag>}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>阶段 SOP 指引</span>
      </div>

      {/* 核心目标 */}
      <div className="lead-stage-popover__target">
        <strong>核心目标：</strong>{sopInfo.target}
      </div>

      {/* SOP 关键动作清单 */}
      <section>
        <div className="lead-stage-popover__heading">
          <span>SOP 关键动作清单</span>
          <span>{sopInfo.checklist.length} 项</span>
        </div>
        <div className="lead-stage-popover__checks">
          {sopInfo.checklist.map((check) => {
            const isCheckDone = isCompleted;
            const isActionable = Boolean(check.targetTab || check.actionKey);
            return (
              <button
                key={check.id}
                type="button"
                className={`lead-stage-popover__check ${isCheckDone ? 'lead-stage-popover__check--completed' : 'lead-stage-popover__check--pending'}${isActionable ? ' is-actionable' : ''}`}
                onClick={() => handleCheckClick(check)}
                disabled={!isActionable}
              >
                <span className="lead-stage-popover__check-icon" aria-hidden>
                  {isCheckDone ? <IconCheck /> : <IconClockCircle />}
                </span>
                <span>{check.label}</span>
                {isActionable && <IconRight className="lead-stage-popover__check-arrow" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* 底部动作区域 */}
      <div className="lead-stage-popover__footer">
        <Button size="small" type="secondary" onClick={() => onAction(sopInfo.suggestedActionKey)}>
          {sopInfo.suggestedActionLabel}
        </Button>
        {isCurrent && nextStageLabel && (
          <Button size="small" type="primary" onClick={onAdvanceStage}>
            推进至下一阶段：{nextStageLabel} &gt;
          </Button>
        )}
      </div>
    </div>
  );
}

export function LeadStagePopover({
  children,
  stageIndex,
  currentStageIndex,
  sopInfo,
  daysHeld,
  nextStageLabel,
  popupVisible,
  defaultVisible,
  onNavigateTab,
  onAction,
  onAdvanceStage,
}: LeadStagePopoverProps) {
  const [internalVisible, setInternalVisible] = useState(defaultVisible ?? false);
  const visible = popupVisible !== undefined ? popupVisible : internalVisible;
  const setVisible = (next: boolean) => setInternalVisible(next);

  return (
    <Popover
      className="lead-stage-popover-popup"
      position="bottom"
      trigger="click"
      popupVisible={visible}
      onVisibleChange={setVisible}
      content={(
        <LeadStagePopoverContent
          stageIndex={stageIndex}
          currentStageIndex={currentStageIndex}
          sopInfo={sopInfo}
          daysHeld={daysHeld}
          nextStageLabel={nextStageLabel}
          onNavigateTab={(tab) => {
            setVisible(false);
            onNavigateTab(tab);
          }}
          onAction={(key) => {
            setVisible(false);
            onAction(key);
          }}
          onAdvanceStage={() => {
            setVisible(false);
            onAdvanceStage();
          }}
        />
      )}
    >
      <Button type="text" size="mini" className="lead-stage-popover__trigger">
        <span>{children}</span>
        <IconDown className="lead-stage-popover__chevron" />
      </Button>
    </Popover>
  );
}
