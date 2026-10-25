import { Table } from '@arco-design/web-react';
import type { LeadQuotationSummary } from '../leadDetailProfiles';
import './LeadQuotationSummaryTable.css';

interface LeadQuotationSummaryTableProps {
  summary: LeadQuotationSummary;
  showTitle?: boolean;
}

function formatAmount(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(value: number, total: number) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function LeadQuotationSummaryTable({
  summary,
  showTitle = true,
}: LeadQuotationSummaryTableProps) {
  const rows = [
    { key: 'frontend', name: '前端配置', amount: summary.frontendCost },
    { key: 'backend', name: '后端配置', amount: summary.backendCost },
    { key: 'other-roles', name: '其他岗位', amount: summary.otherRoleCost },
    { key: 'travel', name: '出差费用', amount: summary.travelCost },
    { key: 'onsite', name: '驻场费用', amount: summary.onsiteCost },
    { key: 'other-fixed', name: '其他固定成本', amount: summary.otherFixedCost },
    { key: 'commission', name: '销售提成', amount: summary.salesCommission },
    ...(summary.salesOtherCost ? [{ key: 'sales-other', name: '其他销售费用', amount: summary.salesOtherCost }] : []),
    { key: 'total', name: '报价总额', amount: summary.totalAmount, isTotal: true },
  ];

  return (
    <section className="lead-quotation-summary-table">
      {showTitle ? <strong className="lead-quotation-summary-table-title">报价信息</strong> : null}
      <Table
        rowKey="key"
        border={{ wrapper: true, cell: true }}
        pagination={false}
        size="small"
        data={rows}
        rowClassName={record => record.isTotal ? 'lead-quotation-summary-table-total-row' : ''}
        columns={[
          { title: '费用项目', dataIndex: 'name' },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 160,
            render: (amount: number, record: { isTotal?: boolean }) => (
              <strong className={record.isTotal ? 'is-total' : ''}>{formatAmount(amount)}</strong>
            ),
          },
          {
            title: '占比',
            dataIndex: 'amount',
            width: 92,
            render: (amount: number) => formatPercentage(amount, summary.totalAmount),
          },
        ]}
      />
      <div className="lead-quotation-summary-table-meta">
        <span>总人天：<strong>{summary.totalPersonDays} 人天</strong></span>
        <span>总人数：<strong>{summary.totalPeople} 人</strong></span>
        <span>预估周期：<strong>{summary.estimatedPeriod || '-'}</strong></span>
      </div>
    </section>
  );
}
