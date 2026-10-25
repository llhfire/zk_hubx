import React from 'react';
import { Space, Typography, Button, Tag } from '@arco-design/web-react';
import {
  IconCalendar,
  IconLeft,
  IconRight,
  IconClockCircle,
} from '@arco-design/web-react/icon';
import type { TenDaySegment } from './timeSegmentUtils';

const { Text } = Typography;

export interface ExpensePeriodSelectorProps {
  segments: TenDaySegment[];
  activeIndex: number;
  onChange: (index: number) => void;
  totalSpanDays: number;
}

export const ExpensePeriodSelector: React.FC<ExpensePeriodSelectorProps> = ({
  segments,
  activeIndex,
  onChange,
  totalSpanDays,
}) => {
  if (totalSpanDays <= 7 || segments.length === 0) {
    return null;
  }

  const safeActiveIndex = Math.max(0, Math.min(activeIndex, segments.length - 1));
  const currentSegment = segments[safeActiveIndex] || segments[0];

  const handlePrev = () => {
    if (safeActiveIndex > 0) {
      onChange(safeActiveIndex - 1);
    }
  };

  const handleNext = () => {
    if (safeActiveIndex < segments.length - 1) {
      onChange(safeActiveIndex + 1);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: '12px 16px',
        backgroundColor: 'var(--color-fill-1, #f7f8fa)',
        border: '1px solid var(--color-border-2, #e5e6eb)',
        borderRadius: 8,
      }}
    >
      {/* 头部导航与操作区 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Space size={8} align="center">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: 'var(--color-primary-light-1, #e8f3ff)',
              color: 'var(--color-primary-6, #165dff)',
            }}
          >
            <IconCalendar />
          </div>
          <Text style={{ fontWeight: 600, fontSize: 13 }}>时间段选择器</Text>
          <Tag size="small" color="arcoblue">
            按每 10 天一个显示段
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            （共 {segments.length} 个阶段，总跨度 {totalSpanDays} 天）
          </Text>
        </Space>

        <Space size={6} align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            第 {safeActiveIndex + 1} / {segments.length} 段
          </Text>
          <Button
            size="mini"
            type="secondary"
            icon={<IconLeft />}
            disabled={safeActiveIndex === 0}
            onClick={handlePrev}
          />
          <Button
            size="mini"
            type="secondary"
            icon={<IconRight />}
            disabled={safeActiveIndex >= segments.length - 1}
            onClick={handleNext}
          />
        </Space>
      </div>

      {/* 10 天分段胶囊按钮组 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {segments.map((seg, idx) => {
          const isActive = idx === safeActiveIndex;
          const hasExpenses = seg.totalAmount > 0;

          return (
            <div
              key={seg.id}
              data-testid={`period-segment-${idx}`}
              role="button"
              tabIndex={0}
              onClick={() => onChange(idx)}
              style={{
                cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: 6,
                border: isActive
                  ? '1px solid var(--color-primary-6, #165dff)'
                  : '1px solid var(--color-border-2, #e5e6eb)',
                backgroundColor: isActive
                  ? 'var(--color-primary-light-1, #e8f3ff)'
                  : 'var(--color-bg-2, #ffffff)',
                boxShadow: isActive ? '0 1px 4px rgba(22, 93, 255, 0.15)' : 'none',
                transition: 'all 0.2s ease',
                minWidth: 128,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? 'var(--color-primary-6, #165dff)'
                      : 'var(--color-text-1, #1d2129)',
                  }}
                >
                  {seg.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-3, #86909c)',
                  }}
                >
                  {seg.days}天
                </span>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: isActive
                    ? 'var(--color-primary-5, #4080ff)'
                    : 'var(--color-text-3, #86909c)',
                }}
              >
                {seg.dateRangeLabel}
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: hasExpenses ? 600 : 400,
                  color: hasExpenses
                    ? isActive
                      ? 'var(--color-primary-6, #165dff)'
                      : 'var(--color-text-1, #1d2129)'
                    : 'var(--color-text-4, #c9cdd4)',
                }}
              >
                {hasExpenses ? `¥${seg.totalAmount.toLocaleString()} (${seg.expenseCount}笔)` : '无记账'}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部当前焦点提示 */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px dashed var(--color-border-2, #e5e6eb)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: 'var(--color-text-2, #4e5969)',
        }}
      >
        <Space size={4}>
          <IconClockCircle style={{ color: 'var(--color-primary-6, #165dff)' }} />
          <span>
            当前聚焦：<strong>{currentSegment.startDate}</strong> 至{' '}
            <strong>{currentSegment.endDate}</strong>（第{' '}
            {currentSegment.startDayNumber}~{currentSegment.endDayNumber} 天，共{' '}
            {currentSegment.days} 天）
          </span>
        </Space>
        <span>
          该段产生费用：
          <strong style={{ color: currentSegment.totalAmount > 0 ? '#ff7d00' : 'inherit' }}>
            ¥{currentSegment.totalAmount.toLocaleString()}
          </strong>
        </span>
      </div>
    </div>
  );
};
