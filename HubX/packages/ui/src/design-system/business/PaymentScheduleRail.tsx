import { useId, useState } from 'react';
import '../components.css';

export type PaymentScheduleStatus = 'paid' | 'partial' | 'overdue' | 'upcoming' | 'pending';

export interface PaymentScheduleItem {
  id?: string | number;
  label: string;
  percentage: number;
  amount: number;
  allocated: number;
  status: PaymentScheduleStatus;
  expectedDate?: string;
}

export interface PaymentScheduleRailProps {
  items: PaymentScheduleItem[];
  size?: 'small' | 'default';
  showLegend?: boolean;
  className?: string;
}

const STATUS_LABEL: Record<PaymentScheduleStatus, string> = {
  paid: '已收足',
  partial: '部分已收',
  overdue: '逾期',
  upcoming: '即将到期',
  pending: '待收',
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(safeNumber(value));
}

function getTitle(item: PaymentScheduleItem) {
  const date = item.expectedDate ? ` · 预计 ${item.expectedDate}` : '';
  return `${item.label} · ${item.percentage}% · 应收 ¥${formatAmount(item.amount)} · 已收 ¥${formatAmount(item.allocated)} · ${STATUS_LABEL[item.status]}${date}`;
}

/**
 * 合同回款期次的紧凑可视化：每条线代表一期，长度代表比例，颜色代表回款状态。
 * 组件不绑定合同域类型，页面通过 PaymentScheduleItem 注入已经计算好的状态。
 */
export function PaymentScheduleRail({
  items,
  size = 'default',
  showLegend = false,
  className,
}: PaymentScheduleRailProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const railId = useId().replace(/:/g, '');
  const validItems = items.filter((item) => safeNumber(item.percentage) > 0);
  const totalWeight = validItems.reduce((sum, item) => sum + safeNumber(item.percentage), 0);
  const gap = validItems.length > 1 ? Math.min(2.2, 100 / (validItems.length * 8)) : 0;
  const usableWidth = Math.max(0, 100 - gap * (validItems.length - 1));
  let cursor = 0;
  const segments = validItems.map((item, index) => {
    const weight = totalWeight > 0 ? safeNumber(item.percentage) / totalWeight : 0;
    const width = usableWidth * weight;
    const segment = { item, index, x: cursor, width };
    cursor += width + gap;
    return segment;
  });
  const hoveredItem = hoveredIndex == null ? null : validItems[hoveredIndex] ?? null;

  return (
    <div
      className={['hubx-payment-schedule-rail', `hubx-payment-schedule-rail--${size}`, className].filter(Boolean).join(' ')}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <svg
        className="hubx-payment-schedule-rail__svg"
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
        role="img"
        aria-label={`回款计划，共 ${validItems.length} 期`}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const point = bounds.width > 0 ? ((event.clientX - bounds.left) / bounds.width) * 100 : 0;
          const hit = segments.find((segment) => point >= segment.x && point <= segment.x + segment.width);
          setHoveredIndex(hit?.index ?? null);
        }}
        onFocus={() => setHoveredIndex(0)}
        onBlur={() => setHoveredIndex(null)}
        tabIndex={0}
      >
          {segments.map(({ item, index, x, width }) => {
          const amount = safeNumber(item.amount);
          const allocated = Math.min(amount, safeNumber(item.allocated));
          const paidRatio = amount > 0 ? allocated / amount : item.status === 'paid' ? 1 : 0;
          const paidWidth = width * Math.min(1, Math.max(0, paidRatio));
          const unpaidWidth = Math.max(0, width - paidWidth);
          const isPartial = item.status === 'partial' && paidWidth > 0 && unpaidWidth > 0;
          const gradientId = `${railId}-partial-${index}`;
          const paidStop = Math.max(0, paidRatio * 100 - 18);
          const unpaidStop = Math.min(100, paidRatio * 100 + 18);

          return (
            <g
              className={[
                'hubx-payment-schedule-rail__group',
                hoveredIndex === index ? 'hubx-payment-schedule-rail__group--hovered' : '',
              ].filter(Boolean).join(' ')}
              transform={hoveredIndex === index ? 'translate(0, -1)' : undefined}
              key={item.id ?? `${item.label}-${index}`}
            >
              {isPartial ? (
                <>
                  <defs>
                    <linearGradient
                      id={gradientId}
                      x1={x}
                      x2={x + width}
                      y1="0"
                      y2="0"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="var(--ds-tone-info-fg)" />
                      <stop offset={`${paidStop}%`} stopColor="var(--ds-tone-info-fg)" />
                      <stop offset={`${unpaidStop}%`} stopColor="var(--ds-tone-neutral-border)" />
                      <stop offset="100%" stopColor="var(--ds-tone-neutral-border)" />
                    </linearGradient>
                  </defs>
                  <rect
                    className="hubx-payment-schedule-rail__segment hubx-payment-schedule-rail__segment--partial-gradient"
                    x={x}
                    y="5.5"
                    width={width}
                    height="3"
                    rx="1.5"
                    fill={`url(#${gradientId})`}
                  />
                </>
              ) : paidWidth > 0 ? (
                <rect
                  className="hubx-payment-schedule-rail__segment hubx-payment-schedule-rail__segment--paid"
                  x={x}
                  y="5.5"
                  width={paidWidth}
                  height="3"
                  rx="1.5"
                />
              ) : null}
              {!isPartial && unpaidWidth > 0 && (
                <rect
                  className={`hubx-payment-schedule-rail__segment hubx-payment-schedule-rail__segment--${item.status}`}
                  x={x + paidWidth}
                  y="5.5"
                  width={unpaidWidth}
                  height="3"
                  rx="1.5"
                />
              )}
            </g>
          );
          })}
      </svg>
      {hoveredItem && (
        <div className="hubx-payment-schedule-rail__tooltip" role="tooltip">
          {getTitle(hoveredItem)}
        </div>
      )}
      {showLegend && (
        <div className="hubx-payment-schedule-rail__legend" aria-hidden="true">
          <span><i className="hubx-payment-schedule-rail__legend-dot hubx-payment-schedule-rail__legend-dot--paid" />已收</span>
          <span><i className="hubx-payment-schedule-rail__legend-dot hubx-payment-schedule-rail__legend-dot--pending" />待收</span>
          <span><i className="hubx-payment-schedule-rail__legend-dot hubx-payment-schedule-rail__legend-dot--overdue" />逾期</span>
        </div>
      )}
    </div>
  );
}
