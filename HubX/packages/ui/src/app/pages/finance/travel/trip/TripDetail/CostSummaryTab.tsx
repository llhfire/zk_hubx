import { Divider, Grid, Space, Typography } from '@/design-system';
import { IconCheckCircle, IconExclamationCircle, IconFolder, IconStorage } from '@/design-system';
import type { Trip, TripExpenseType } from '../../types';
import { computeBudgetExecution, computeCostDeposition, sumRecordedExpenses } from '../tripDetailMetrics';
import { DataTable, MoneyText, ProgressBar, StatusTag } from '@/design-system';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface CostSummaryTabProps {
  trip: Trip;
}

const expenseTypeLabels: Record<TripExpenseType, string> = {
  transport: '交通费',
  accommodation: '住宿费',
  meal: '餐饮费',
  communication: '通讯费',
  local_transport: '市内交通',
  entertainment: '招待费',
  office: '办公用品',
  other: '其他支出',
};

export function CostSummaryTab({ trip }: CostSummaryTabProps) {
  const budget = computeBudgetExecution(trip);
  const cost = computeCostDeposition(trip);
  const recorded = sumRecordedExpenses(trip);
  const subsidyAmount = trip.subsidy?.totalAmount ?? 0;

  // 按费用分类归集统计
  const categoryTotals: Record<string, number> = {};
  trip.itinerarySegments?.forEach((seg) => {
    seg.expenses?.forEach((exp) => {
      categoryTotals[exp.type] = (categoryTotals[exp.type] || 0) + exp.amount;
    });
  });

  const categories = Object.entries(categoryTotals).map(([type, amount]) => ({
    key: type,
    type: expenseTypeLabels[type as TripExpenseType] || type,
    amount,
    percentage: recorded > 0 ? Math.round((amount / recorded) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="trip-tab-pane">
      {/* 顶部专业微指标卡片组（4列对齐） */}
      <div className="trip-stat-grid">
        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-info-bg)', color: 'rgb(var(--primary-6))' }}>
                <IconFolder />
              </span>
              成本沉淀归属
            </span>
            <StatusTag size="small" tone="info">项目/部门</StatusTag>
          </div>
          <div className="trip-stat-card__value">
            {cost.value}
          </div>
          <div className="trip-stat-card__meta">
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {cost.detail}
            </span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span
                className="trip-stat-card__icon"
                style={{
                  background: budget.isOverBudget ? '#ffece8' : 'var(--ds-tone-success-bg)',
                  color: budget.isOverBudget ? 'var(--ds-tone-danger-fg)' : 'var(--ds-tone-success-fg)',
                }}
              >
                <IconStorage />
              </span>
              预算执行与偏差
            </span>
            <StatusTag size="small" tone={budget.isOverBudget ? 'danger' : 'success'}>
              {budget.isOverBudget ? '超支' : '在控'}
            </StatusTag>
          </div>
          <div
            className="trip-stat-card__value"
            style={{ color: budget.isOverBudget ? 'var(--ds-tone-danger-fg)' : 'inherit' }}
          >
            {budget.value}
          </div>
          <div className="trip-stat-card__meta">
            <span>执行率：{Math.min(100, budget.rate)}%</span>
            <span>{budget.detail}</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-warning-bg)', color: 'var(--ds-tone-warning-fg)' }}>
                <IconStorage />
              </span>
              实际已发生支出
            </span>
            <StatusTag size="small" tone="warning">已发生</StatusTag>
          </div>
          <div className="trip-stat-card__value">
            <MoneyText value={recorded} />
          </div>
          <div className="trip-stat-card__meta">
            <span>归集科目：{categories.length} 类</span>
            <span>凭据核验入账</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-purple-bg)', color: 'var(--ds-tone-purple-fg)' }}>
                <IconCheckCircle />
              </span>
              出差津贴归集
            </span>
            <StatusTag size="small" tone="purple">薪资津贴</StatusTag>
          </div>
          <div className="trip-stat-card__value">
            <MoneyText value={subsidyAmount} />
          </div>
          <div className="trip-stat-card__meta">
            <span>随当月薪酬归并核发</span>
            <span>个税免征津贴</span>
          </div>
        </div>
      </div>

      {/* 专业精良的操作工具栏 */}
      <div className="trip-section-toolbar">
        <div className="trip-section-toolbar__title">
          <span>支出分类归集明细</span>
          <StatusTag size="small" tone="neutral">
            共 {categories.length} 项科目
          </StatusTag>
        </div>
      </div>

      {/* 分类支出归集明细表格 */}
      <div style={{ marginTop: 8 }}>
        {categories.length > 0 ? (
          <DataTable
            rowKey="key"
            data={categories}
            pagination={false}
            size="small"
            columns={[
              { title: '费用科目', dataIndex: 'type', render: (val) => <Text style={{ fontWeight: 500 }}>{val}</Text> },
              { title: '实际归集金额', dataIndex: 'amount', render: (val) => <Text style={{ color: 'rgb(var(--primary-6))' }}><MoneyText value={val} /></Text> },
              {
                title: '支出占比',
                dataIndex: 'percentage',
                render: (val) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgressBar percent={val} size="small" style={{ width: 140 }} showValue={false} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>{val}%</span>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-3)' }}>
            暂未录入实际发生支出
          </div>
        )}
      </div>
    </div>
  );
}
