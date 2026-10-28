import { InputNumber } from '../foundation/controls';
import { MoneyText } from '../primitives/MoneyText';
import { StatusTag } from '../primitives/StatusTag';
import '../components.css';

export interface RoleRateGridItem {
  key: string;
  name: string;
  days: number;
  dailyRate: number;
  subtotal?: number;
}

export interface RoleRateGridProps {
  items: RoleRateGridItem[];
  readonly?: boolean;
  onDailyRateChange?: (roleKey: string, dailyRate: number) => void;
  className?: string;
}

/** 岗位人天、日均成本和岗位小计的统一编辑网格。 */
export function RoleRateGrid({ items, readonly = false, onDailyRateChange, className }: RoleRateGridProps) {
  return (
    <div className={['hubx-role-rate-grid', className].filter(Boolean).join(' ')}>
      {items.map((item) => {
        const subtotal = item.subtotal ?? item.days * item.dailyRate;
        return (
          <article key={item.key} className="hubx-role-rate-card">
            <div className="hubx-role-rate-card__header">
              <StatusTag size="small" tone="info">{item.name}</StatusTag>
              <span className="hubx-role-rate-card__days">{item.days.toFixed(1)} 人天</span>
            </div>
            <div className="hubx-role-rate-card__input-row">
              <span className="hubx-role-rate-card__label">日均单价:</span>
              <InputNumber
                size="mini"
                min={0}
                step={100}
                value={item.dailyRate}
                disabled={readonly || !onDailyRateChange}
                prefix="¥"
                onChange={(value) => onDailyRateChange?.(item.key, typeof value === 'number' ? value : 0)}
              />
            </div>
            <div className="hubx-role-rate-card__subtotal">
              <span>岗位小计</span>
              <strong><MoneyText value={subtotal} /></strong>
            </div>
          </article>
        );
      })}
    </div>
  );
}
