import type { ReactNode } from 'react';
import { EmptyState } from '../data-display/EmptyState';
import '../components.css';

export interface EvaluationWorkloadTableRole {
  key: string;
  name: ReactNode;
}

export interface EvaluationWorkloadTableRow {
  key: string;
  endpointKey: string;
  endpointName: ReactNode;
  platforms?: ReactNode[];
  moduleName: ReactNode;
  subFeatures: ReactNode[];
  granularity: ReactNode;
  selectable?: boolean;
  selected?: boolean;
  totalDays: number;
  canUngroup?: boolean;
}

export interface EvaluationWorkloadTableProps {
  rows: EvaluationWorkloadTableRow[];
  roles: EvaluationWorkloadTableRole[];
  readonly?: boolean;
  emptyDescription?: ReactNode;
  onToggleRow?: (row: EvaluationWorkloadTableRow) => void;
  onRoleReorder?: (fromIndex: number, toIndex: number) => void;
  onRoleRemove?: (role: EvaluationWorkloadTableRole) => void;
  renderWorkloadCell?: (row: EvaluationWorkloadTableRow, role: EvaluationWorkloadTableRole) => ReactNode;
  renderTechRemark?: (row: EvaluationWorkloadTableRow) => ReactNode;
  renderActions?: (row: EvaluationWorkloadTableRow) => ReactNode;
  className?: string;
}

function getEndpointRowSpans(rows: EvaluationWorkloadTableRow[]) {
  const spans = new Map<string, number>();
  rows.forEach((row) => spans.set(row.endpointKey, (spans.get(row.endpointKey) || 0) + 1));
  return spans;
}

/**
 * 可编辑人天评估表：固定端分组和岗位列语义，页面只提供数据与业务回调。
 * 与 FeatureWorkloadMatrix 的只读报价矩阵不同，这里服务于岗位调整、选择和备注编辑。
 */
export function EvaluationWorkloadTable({
  rows,
  roles,
  readonly = false,
  emptyDescription = '暂无人天评估数据',
  onToggleRow,
  onRoleReorder,
  onRoleRemove,
  renderWorkloadCell,
  renderTechRemark,
  renderActions,
  className,
}: EvaluationWorkloadTableProps) {
  if (rows.length === 0) return <EmptyState description={emptyDescription} />;

  const endpointRowSpans = getEndpointRowSpans(rows);
  const firstEndpointRows = new Set<string>();

  return (
    <div className={['hubx-evaluation-workload-table', className].filter(Boolean).join(' ')}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="hubx-evaluation-workload-table__index">序号</th>
            <th scope="col">端</th>
            <th scope="col" className="hubx-evaluation-workload-table__select">选</th>
            <th scope="col">模块</th>
            <th scope="col">评估切片 / 子功能</th>
            <th scope="col">粒度</th>
            {roles.map((role, roleIndex) => (
              <th key={role.key} scope="col">
                <div className="hubx-evaluation-workload-table__role-header">
                  {!readonly && onRoleReorder && (
                    <span
                      className="hubx-evaluation-workload-table__drag-handle"
                      draggable
                      aria-label={`拖动调整${String(role.name)}列顺序`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', String(roleIndex));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                        if (!Number.isNaN(fromIndex) && fromIndex !== roleIndex) onRoleReorder(fromIndex, roleIndex);
                      }}
                    >
                      ⠿
                    </span>
                  )}
                  <span>{role.name}</span>
                  {!readonly && onRoleRemove && (
                    <button
                      type="button"
                      className="hubx-evaluation-workload-table__remove-role"
                      aria-label={`移除${String(role.name)}岗位`}
                      onClick={() => onRoleRemove(role)}
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>
            ))}
            <th scope="col">小计</th>
            <th scope="col">技术备注</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const isFirstEndpointRow = !firstEndpointRows.has(row.endpointKey);
            if (isFirstEndpointRow) firstEndpointRows.add(row.endpointKey);
            const isSelectable = !readonly && row.selectable && onToggleRow;
            const rowClassName = isSelectable ? 'hubx-evaluation-workload-table__row--selectable' : '';

            return (
              <tr key={row.key} data-unit-id={row.key} className={rowClassName}>
                <td className="hubx-evaluation-workload-table__index-cell">{rowIndex + 1}</td>
                {isFirstEndpointRow ? (
                  <td rowSpan={endpointRowSpans.get(row.endpointKey) || 1} className="hubx-evaluation-workload-table__endpoint-cell">
                    <strong>{row.endpointName || '-'}</strong>
                    {row.platforms && row.platforms.length > 0 && (
                      <span className="hubx-evaluation-workload-table__platforms">
                        {row.platforms.map((platform, index) => <span key={`${row.key}:platform:${index}`}>{platform}</span>)}
                      </span>
                    )}
                  </td>
                ) : null}
                <td className="hubx-evaluation-workload-table__select-cell">
                  {isSelectable && (
                    <input
                      type="checkbox"
                      checked={Boolean(row.selected)}
                      onChange={() => onToggleRow(row)}
                      aria-label={`选择${String(row.moduleName)}${row.subFeatures.length > 0 ? `：${row.subFeatures.map(String).join('、')}` : ''}`}
                    />
                  )}
                </td>
                <td className="hubx-evaluation-workload-table__module-cell" onClick={() => isSelectable && onToggleRow(row)}>{row.moduleName}</td>
                <td className="hubx-evaluation-workload-table__feature-cell" onClick={() => isSelectable && onToggleRow(row)}>
                  {row.subFeatures.length > 0 ? row.subFeatures.map((feature, index) => <div key={`${row.key}:feature:${index}`}>{feature}</div>) : <span className="hubx-evaluation-workload-table__muted">-</span>}
                </td>
                <td className="hubx-evaluation-workload-table__granularity-cell" onClick={() => isSelectable && onToggleRow(row)}>{row.granularity}</td>
                {roles.map((role) => (
                  <td key={role.key} className="hubx-evaluation-workload-table__workload-cell">
                    {renderWorkloadCell ? renderWorkloadCell(row, role) : '-'}
                  </td>
                ))}
                <td className="hubx-evaluation-workload-table__total-cell">{row.totalDays.toFixed(1)}</td>
                <td>{renderTechRemark ? renderTechRemark(row) : '-'}</td>
                <td>{renderActions ? renderActions(row) : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
