import type { ReactNode } from 'react';
import { DataTable } from '../data-display/DataTable';
import { DateText } from '../primitives/DateText';
import { MoneyText } from '../primitives/MoneyText';
import '../components.css';

/** 合同回款计划表的纯展示行，不绑定任何业务域类型。 */
export interface PaymentPlanTableRow {
  period: number;
  periodName?: string;
  amount: number;
  percentage?: number;
  expectedDate?: string;
  condition?: string;
}

export interface PaymentPlanTableProps {
  data: PaymentPlanTableRow[];
  /** 合同详情按当前合同状态渲染的业务状态列。 */
  renderStatus?: (row: PaymentPlanTableRow) => ReactNode;
  showPercentage?: boolean;
  showCondition?: boolean;
  conditionWidth?: number;
  emptyDescription?: ReactNode;
  rowKeyPrefix?: string;
}

/**
 * 合同回款计划的统一列骨架。
 *
 * 财务对账期次与回款预测节点不是同一语义，不通过这个组件强行合并；
 * 它们继续由各自页面用 DataTable 编排。
 */
export function PaymentPlanTable({
  data,
  renderStatus,
  showPercentage = true,
  showCondition = false,
  conditionWidth = 180,
  emptyDescription = '暂无回款期次',
  rowKeyPrefix,
}: PaymentPlanTableProps) {
  const columns = [
    {
      title: '期次',
      dataIndex: 'period',
      width: 100,
      render: (_value: number, row: PaymentPlanTableRow) => row.periodName || `第${row.period}期`,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 140,
      render: (value: number) => <MoneyText value={value} />,
    },
    ...(showPercentage
      ? [{
        title: '比例',
        dataIndex: 'percentage',
        width: 90,
        render: (value: number) => `${value == null ? '-' : `${value}%`}`,
      }]
      : []),
    {
      title: '预计日期',
      dataIndex: 'expectedDate',
      width: 140,
      render: (value: string) => <DateText value={value} placeholder="-" />,
    },
    ...(showCondition
      ? [{ title: '触发条件', dataIndex: 'condition', width: conditionWidth }]
      : []),
    ...(renderStatus
      ? [{
        title: '回款状态',
        width: 120,
        render: (_value: unknown, row: PaymentPlanTableRow) => renderStatus(row),
      }]
      : []),
  ];
  const scrollX = columns.reduce((sum, column) => sum + (typeof column.width === 'number' ? column.width : 0), 0);

  return (
    <DataTable
      className="hubx-payment-plan-table"
      columns={columns}
      data={data}
      rowKey={(row) => `${rowKeyPrefix ?? 'payment-plan'}-${row.period}`}
      pagination={false}
      scroll={{ x: scrollX }}
      emptyDescription={emptyDescription}
    />
  );
}
