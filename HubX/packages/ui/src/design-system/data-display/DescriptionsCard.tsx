import type { ReactNode } from 'react';
import { SectionCard } from '../layout/SectionCard';
import '../components.css';

export interface DescriptionItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /**
   * 长字段（链接、地址、备注、说明、原因）必须置 true（M-004/M-005）：
   * 它会被排到字段区末尾并独占整行，不与短字段争夺列宽。
   */
  long?: boolean;
}

export interface DescriptionsCardProps {
  title?: ReactNode;
  extra?: ReactNode;
  items: DescriptionItem[];
  /** 短字段列数，默认 3 */
  columns?: 1 | 2 | 3 | 4;
  /** 只渲染字段区本身，不再包 SectionCard —— 用于嵌进已有卡片或侧栏 */
  bare?: boolean;
  className?: string;
}

/**
 * 详情字段区。短字段走网格，长字段自动落到末尾整行。
 *
 * 替代全仓 46 处直接使用 `<Descriptions>` 的写法 —— 那里长短字段混排，
 * 长链接会把网格撑破，是 M-004/M-005 反复出现的原因。
 */
export function DescriptionsCard({ title, extra, items, columns = 3, bare = false, className }: DescriptionsCardProps) {
  const shortItems = items.filter((item) => !item.long);
  const longItems = items.filter((item) => item.long);

  const body = (
    <>
      <dl className={`hubx-descriptions hubx-descriptions--${columns}`}>
        {shortItems.map((item) => (
          <div key={item.key} className="hubx-descriptions__item">
            <dt className="hubx-descriptions__label">{item.label}</dt>
            <dd className="hubx-descriptions__value">{item.value}</dd>
          </div>
        ))}
      </dl>
      {longItems.length > 0 && (
        <dl className="hubx-descriptions hubx-descriptions--long">
          {longItems.map((item) => (
            <div key={item.key} className="hubx-descriptions__item hubx-descriptions__item--long">
              <dt className="hubx-descriptions__label">{item.label}</dt>
              <dd className="hubx-descriptions__value">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );

  if (bare) {
    return <div className={className}>{body}</div>;
  }

  return (
    <SectionCard title={title} extra={extra} className={className}>
      {body}
    </SectionCard>
  );
}
