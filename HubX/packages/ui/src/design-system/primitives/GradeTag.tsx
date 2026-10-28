import type { StatusTone } from './StatusTag';
import '../components.css';

export type Grade = 'S' | 'A' | 'B' | 'C';

/**
 * 等级 → 语义色。
 *
 * **S 是最好的一档，必须是 success，不是 danger。** 历史上项目列表与线索派发
 * 曾把它映射成红色，导致「最优质客户」看起来像告警；有回归测试锁定这一点。
 * 未定等级走 neutral，不冒充任何真实等级。
 */
export const GRADE_TONE: Record<Grade, StatusTone> = {
  S: 'success',
  A: 'info',
  B: 'neutral',
  C: 'neutral',
};

export interface GradeTagProps {
  grade?: Grade | string | null;
  className?: string;
}

/**
 * S/A/B/C 等级标签（M-041：只显示字母，不写「级」）。
 * 未定等级显示 `?`（M-009），不能映射成 C 或任何真实等级。
 */
export function GradeTag({ grade, className }: GradeTagProps) {
  const normalized = (grade ?? '').trim().toUpperCase();
  const isKnown = normalized === 'S' || normalized === 'A' || normalized === 'B' || normalized === 'C';
  const key = isKnown ? normalized.toLowerCase() : 'unknown';

  return (
    <span
      className={['hubx-grade-tag', `hubx-grade-tag--${key}`, className].filter(Boolean).join(' ')}
      title={isKnown ? `客户等级 ${normalized}` : '客户等级未定'}
    >
      {isKnown ? normalized : '?'}
    </span>
  );
}
