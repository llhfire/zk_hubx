import '../components.css';

export type DateInput = string | number | Date | null | undefined;

export interface DateTextProps {
  value: DateInput;
  /** 区间终点，提供时渲染 `起 ~ 止` */
  end?: DateInput;
  /** date → 2026-04-28；datetime → 2026-04-28 14:30 */
  mode?: 'date' | 'datetime';
  /** 空值占位，默认 `—` */
  placeholder?: string;
  /** 区间后追加的说明，例如 `共 7 天`（M-045） */
  suffix?: string;
  className?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  // 'YYYY-MM-DD' 直接按分量构造，避免被当成 UTC 解析后跨时区偏移一天
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
      const [, y, m, d] = match;
      const timeMatch = /[ T](\d{2}):(\d{2})/.exec(value);
      return new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        timeMatch ? Number(timeMatch[1]) : 0,
        timeMatch ? Number(timeMatch[2]) : 0,
      );
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function format(date: Date, mode: 'date' | 'datetime'): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return mode === 'date' ? day : `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 日期 / 日期区间的唯一展示入口（M-040/M-044/M-045）。
 * 使用 tabular-nums 与 `white-space: nowrap`，保证日期不会在年月日中间断行。
 */
export function DateText({ value, end, mode = 'date', placeholder = '—', suffix, className }: DateTextProps) {
  const start = toDate(value);
  if (!start) {
    return <span className={['hubx-date', className].filter(Boolean).join(' ')}>{placeholder}</span>;
  }

  const endDate = end === undefined ? null : toDate(end);
  const text = endDate ? `${format(start, mode)} ~ ${format(endDate, mode)}` : format(start, mode);

  return (
    <span className={['hubx-date', className].filter(Boolean).join(' ')}>
      {text}
      {suffix && <span className="hubx-metric-card__suffix">{` · ${suffix}`}</span>}
    </span>
  );
}
