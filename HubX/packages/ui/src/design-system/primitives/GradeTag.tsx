import '../components.css';

export type Grade = 'S' | 'A' | 'B' | 'C';

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
