import type { ReactNode } from 'react';
import '../components.css';

/** 状态语义色。新增变体先改这里，不要新建组件。 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

/** 一个状态对应的文案与语义色。各业务域用映射表提供，不要各写一套颜色。 */
export interface StatusMeta {
  label: ReactNode;
  tone: StatusTone;
}

export type StatusMap<S extends string = string> = Record<S, StatusMeta>;

export interface StatusTagProps {
  /** 直接给语义色 + 文案 */
  tone?: StatusTone;
  children?: ReactNode;
  /** 或者给「状态 → 文案 + 语义色」映射表的结果 */
  meta?: StatusMeta;
  size?: 'small' | 'default';
  /** 悬停说明，例如状态机全称 */
  title?: string;
  className?: string;
}

/**
 * 状态标签的唯一实现。
 *
 * 改造前全仓有 33 个文件各自维护状态色映射（`STATUS_COLOR` / `StatusColor` /
 * `getStatusColor`），同一状态在不同页面颜色不同。现在统一走这里：
 * 业务域只提供 `StatusMap`，不再决定颜色。
 */
export function StatusTag({ tone = 'neutral', children, meta, size = 'small', title, className }: StatusTagProps) {
  const resolvedTone = meta ? meta.tone : tone;
  const content = meta ? meta.label : children;

  return (
    <span
      className={['hubx-status-tag', `hubx-status-tag--${resolvedTone}`, size === 'small' ? 'hubx-status-tag--small' : '', className]
        .filter(Boolean)
        .join(' ')}
      title={title}
    >
      {content}
    </span>
  );
}

/**
 * 语义色对应的 CSS 变量。
 *
 * 用于需要「状态色但不是一个标签」的场景（进度条颜色、卡片左侧强调条、
 * 金额着色）。页面不许自己写 `var(--success-500)` 之类的色值 —— 那是状态色
 * 的第二份定义，会和 StatusTag 漂移。
 */
export const STATUS_TONE_VARS: Record<StatusTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: 'var(--ds-tone-neutral-bg)', fg: 'var(--ds-tone-neutral-fg)', border: 'var(--ds-tone-neutral-border)' },
  info: { bg: 'var(--ds-tone-info-bg)', fg: 'var(--ds-tone-info-fg)', border: 'var(--ds-tone-info-border)' },
  success: { bg: 'var(--ds-tone-success-bg)', fg: 'var(--ds-tone-success-fg)', border: 'var(--ds-tone-success-border)' },
  warning: { bg: 'var(--ds-tone-warning-bg)', fg: 'var(--ds-tone-warning-fg)', border: 'var(--ds-tone-warning-border)' },
  danger: { bg: 'var(--ds-tone-danger-bg)', fg: 'var(--ds-tone-danger-fg)', border: 'var(--ds-tone-danger-border)' },
  purple: { bg: 'var(--ds-tone-purple-bg)', fg: 'var(--ds-tone-purple-fg)', border: 'var(--ds-tone-purple-border)' },
};

/**
 * 从映射表取状态元信息。状态值缺失（历史脏数据、新增未补映射）时退回中性灰，
 * 而不是抛错或渲染空白 —— 未知状态必须显式可见。
 */
export function resolveStatus<S extends string>(
  map: StatusMap<S>,
  status: string | null | undefined,
  fallbackLabel = '未定义',
): StatusMeta {
  const meta = status ? map[status as S] : undefined;
  return meta ?? { label: fallbackLabel, tone: 'neutral' };
}
