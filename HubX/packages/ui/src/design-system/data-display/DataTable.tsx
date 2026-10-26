import { Table } from '@arco-design/web-react';
import type { TableColumnProps, TableProps } from '@arco-design/web-react';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import '../components.css';

export interface DataTableProps<T extends object> {
  columns: TableColumnProps<T>[];
  data: T[];
  /**
   * 必填。Arco 的 rowKey 只接受字段名或 `(record) => Key`，**没有 index 参数**；
   * 写成 `(record, index)` 会让行 key 全部变成 undefined。
   */
  rowKey: keyof T | ((record: T) => React.Key);
  loading?: boolean;
  /** 表格上方左侧：筛选、搜索 */
  toolbar?: ReactNode;
  /** 表格上方右侧：新建、导出等操作 */
  actions?: ReactNode;
  /** 表格上方左侧的摘要文字（例如「共 128 条」） */
  summary?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  pagination?: TableProps<T>['pagination'];
  scroll?: TableProps<T>['scroll'];
  size?: TableProps<T>['size'];
  border?: TableProps<T>['border'];
  stripe?: TableProps<T>['stripe'];
  onRow?: TableProps<T>['onRow'];
  className?: string;
}

/**
 * 表格的唯一实现。
 *
 * 改造前全仓 210 处直接使用 `<Table>`，每处各自处理空态、分页、工具栏与操作列宽度。
 * 这里固化：工具栏结构、空态（Arco 的 `children` 会被丢弃）、加载、行 key 契约。
 */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  toolbar,
  actions,
  summary,
  emptyDescription = '暂无数据',
  emptyAction,
  pagination,
  scroll,
  size = 'small',
  border,
  stripe = false,
  onRow,
  className,
}: DataTableProps<T>) {
  const hasToolbar = Boolean(toolbar || actions || summary);

  return (
    <div className={className}>
      {hasToolbar && (
        <div className="hubx-data-table__toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {toolbar}
            {summary && <span className="hubx-data-table__summary">{summary}</span>}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
        </div>
      )}
      <Table<T>
        columns={columns}
        data={data}
        rowKey={rowKey as never}
        loading={loading}
        size={size}
        border={border}
        stripe={stripe}
        onRow={onRow}
        scroll={scroll}
        pagination={pagination}
        noDataElement={<EmptyState description={emptyDescription} action={emptyAction} />}
      />
    </div>
  );
}
