import '../components.css';

export interface CountdownTagProps {
  /** 剩余天数：正数=未到期，0=今天，负数=已逾期 */
  days: number | null | undefined;
  /** 临期阈值，剩余天数小于等于它时用提醒色，默认 3 */
  warningWithin?: number;
  className?: string;
}

/**
 * 工期/截止倒计时胶囊（M-040）。
 *
 * 只显示相对天数，不塞日期 —— 具体日期放在胶囊旁边由 `DateText` 承担。
 * 逾期用危险语义色，临期用提醒色，其余中性；颜色之外文案本身已能区分。
 */
export function CountdownTag({ days, warningWithin = 3, className }: CountdownTagProps) {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return <span className={['hubx-countdown', 'hubx-countdown--normal', className].filter(Boolean).join(' ')}>—</span>;
  }

  const rounded = Math.round(days);
  const tone = rounded < 0 ? 'danger' : rounded <= warningWithin ? 'warning' : 'normal';
  const text = rounded < 0 ? `逾期 ${Math.abs(rounded)} 天` : rounded === 0 ? '今天截止' : `余 ${rounded} 天`;

  return <span className={['hubx-countdown', `hubx-countdown--${tone}`, className].filter(Boolean).join(' ')}>{text}</span>;
}
