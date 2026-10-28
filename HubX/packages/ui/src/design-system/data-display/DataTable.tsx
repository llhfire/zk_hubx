import { Table } from '@arco-design/web-react';
import type { TableColumnProps, TableProps } from '@arco-design/web-react';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import '../components.css';

/**
 * Arco `Table` 的全部能力都透传（`rowClassName`、`expandedRowRender`、`rowSelection`、
 * `onChange`、`scroll`、`pagination`、`summary`…），因为表格的交互参数本就是 Arco 的
 * 公开契约，逐条转写只会把它们挡在门外。
 *
 * 只有三处被接管：`columns` / `data` 的必填约束、`noDataElement`（统一空态）、
 * `rowKey`（坑见下）。
 *
 * ⚠️ 合计行的唯一正确写法是 `summary={() => <Table.Summary.Row>…</Table.Summary.Row>}`。
 * Arco 的 Table **完全不读 children**，把 `<Table.Summary>` 当子节点写会被静默丢弃，
 * 页面上什么都不会出现、也不会报错。
 */
export interface DataTableProps<T extends object>
  extends Omit<TableProps<T>, 'columns' | 'data' | 'noDataElement' | 'rowKey' | 'className'> {
  columns: TableColumnProps<T>[];
  data: T[];
  /**
   * 行 key。Arco 只接受字段名或 `(record) => Key`，**没有 index 参数**；
   * 写成 `(record, index)` 会让行 key 全部变成 undefined。
   *
   * 纯展示表格可以省略（沿用 Arco 的按序索引）；凡是支持勾选、展开或行内状态
   * 的表格**必须**显式指定，否则翻页/筛选后会错位。
   */
  rowKey?: keyof T | ((record: T) => React.Key);
  /** 表格上方左侧：筛选、搜索 */
  toolbar?: ReactNode;
  /** 表格上方右侧：新建、导出等操作 */
  actions?: ReactNode;
  /** 表格上方左侧的摘要文字（例如「共 128 条」）。合计行请用 Arco 的 `summary` 函数。 */
  caption?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  className?: string;
}

/**
 * 表格的唯一实现。
 *
 * 改造前全仓 210 处直接使用 `<Table>`，每处各自处理空态、分页、工具栏与操作列宽度。
 * 这里固化：工具栏结构、空态、加载、行 key 契约。
 */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  toolbar,
  actions,
  caption,
  emptyDescription = '暂无数据',
  emptyAction,
  size = 'small',
  stripe = false,
  className,
  ...rest
}: DataTableProps<T>) {
  const hasToolbar = Boolean(toolbar || actions || caption);

  return (
    <div className={className}>
      {hasToolbar && (
        <div className="hubx-data-table__toolbar">
          <div className="hubx-data-table__toolbar-start">
            {toolbar}
            {caption && <span className="hubx-data-table__summary">{caption}</span>}
          </div>
          {actions && <div className="hubx-data-table__toolbar-end">{actions}</div>}
        </div>
      )}
      <Table<T>
        {...rest}
        columns={columns}
        data={data}
        rowKey={rowKey as never}
        loading={loading}
        size={size}
        stripe={stripe}
        noDataElement={<EmptyState description={emptyDescription} action={emptyAction} />}
      />
    </div>
  );
}
