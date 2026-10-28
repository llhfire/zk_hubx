import type { ReactNode } from 'react';
import { EmptyState } from '../data-display/EmptyState';
import { MoneyText } from '../primitives/MoneyText';
import { StatusTag } from '../primitives/StatusTag';
import '../components.css';

export interface FeatureWorkloadMatrixRole {
  key: string;
  name: ReactNode;
  dailyRate?: number;
}

export interface FeatureWorkloadMatrixEndpoint {
  key: string;
  name: ReactNode;
  platforms?: ReactNode[];
}

export interface FeatureWorkloadMatrixModule {
  key: string;
  endpointKey?: string;
  name: ReactNode;
  subFeatures: Array<{ key: string; name: ReactNode }>;
}

export interface FeatureWorkloadMatrixUnit {
  subFeatureKeys: string[];
  totalDays: number;
  workloads: Record<string, number>;
  risk?: ReactNode;
}

export interface FeatureWorkloadMatrixProps {
  endpoints: FeatureWorkloadMatrixEndpoint[];
  modules: FeatureWorkloadMatrixModule[];
  roles: FeatureWorkloadMatrixRole[];
  units: FeatureWorkloadMatrixUnit[];
  emptyDescription?: ReactNode;
  showSummary?: boolean;
  showRiskColumn?: boolean;
  riskLabel?: ReactNode;
  className?: string;
}

interface MatrixRow {
  key: string;
  endpoint?: FeatureWorkloadMatrixEndpoint;
  endpointRowSpan: number;
  isFirstEndpointRow: boolean;
  module: FeatureWorkloadMatrixModule;
  moduleRowSpan: number;
  isFirstModuleRow: boolean;
  subFeature: { key: string; name: ReactNode };
  workloads: Record<string, number>;
  totalDays: number;
  risk?: ReactNode;
}

const UNASSIGNED_ENDPOINT = '__unassigned__';

function getSubFeatures(module: FeatureWorkloadMatrixModule) {
  return module.subFeatures.length > 0
    ? module.subFeatures
    : [{ key: `${module.key}:empty`, name: '（暂无子功能）' }];
}

/**
 * 报价研发工时矩阵：端 / 模块 / 子功能 × 岗位工时。
 *
 * 该结构曾被报价页直接用原生 table 和大量页面内联样式实现。它是稳定的
 * 产品语汇，因此在设计系统中统一处理行合并、岗位合计、成本展示和横向滚动。
 */
export function FeatureWorkloadMatrix({
  endpoints,
  modules,
  roles,
  units,
  emptyDescription = '暂无功能工时明细',
  showSummary = true,
  showRiskColumn = false,
  riskLabel = '风险',
  className,
}: FeatureWorkloadMatrixProps) {
  if (modules.length === 0 || roles.length === 0) {
    return <EmptyState description={emptyDescription} />;
  }

  const endpointMap = new Map(endpoints.map((endpoint) => [endpoint.key, endpoint]));
  const unitMap = new Map<string, FeatureWorkloadMatrixUnit>();
  units.forEach((unit) => unit.subFeatureKeys.forEach((key) => unitMap.set(key, unit)));

  const endpointRowSpans = new Map<string, number>();
  const endpointFirstRow = new Map<string, number>();
  let rowCursor = 0;
  modules.forEach((module) => {
    const endpointKey = module.endpointKey || UNASSIGNED_ENDPOINT;
    if (!endpointFirstRow.has(endpointKey)) endpointFirstRow.set(endpointKey, rowCursor);
    endpointRowSpans.set(endpointKey, (endpointRowSpans.get(endpointKey) || 0) + getSubFeatures(module).length);
    rowCursor += getSubFeatures(module).length;
  });

  const rows: MatrixRow[] = [];
  let currentRow = 0;
  modules.forEach((module) => {
    const subFeatures = getSubFeatures(module);
    const endpointKey = module.endpointKey || UNASSIGNED_ENDPOINT;
    subFeatures.forEach((subFeature, subFeatureIndex) => {
      const unit = unitMap.get(subFeature.key);
      rows.push({
        key: `${module.key}:${subFeature.key}`,
        endpoint: endpointMap.get(endpointKey),
        endpointRowSpan: endpointRowSpans.get(endpointKey) || 1,
        isFirstEndpointRow: endpointFirstRow.get(endpointKey) === currentRow,
        module,
        moduleRowSpan: subFeatures.length,
        isFirstModuleRow: subFeatureIndex === 0,
        subFeature,
        workloads: unit?.workloads || {},
        totalDays: unit?.totalDays || 0,
        risk: unit?.risk,
      });
      currentRow += 1;
    });
  });

  const roleTotals = roles.map((role) => rows.reduce((sum, row) => sum + (row.workloads[role.key] || 0), 0));
  const totalDays = rows.reduce((sum, row) => sum + row.totalDays, 0);

  return (
    <div className={['hubx-feature-workload-matrix', className].filter(Boolean).join(' ')}>
      <table>
        <thead>
          <tr>
            <th scope="col">端</th>
            <th scope="col">模块</th>
            <th scope="col">子功能</th>
            {roles.map((role) => (
              <th key={role.key} scope="col" className="hubx-feature-workload-matrix__number-cell">
                <span>{role.name}</span>
                {role.dailyRate != null && <small>¥{role.dailyRate.toFixed(0)}/天</small>}
              </th>
            ))}
            <th scope="col" className="hubx-feature-workload-matrix__number-cell">人天</th>
            {showRiskColumn && <th scope="col">{riskLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.isFirstEndpointRow && (
                <td rowSpan={row.endpointRowSpan} className="hubx-feature-workload-matrix__endpoint-cell">
                  <strong>{row.endpoint?.name || '未分组'}</strong>
                  {row.endpoint?.platforms && row.endpoint.platforms.length > 0 && (
                    <span className="hubx-feature-workload-matrix__platforms">
                      {row.endpoint.platforms.map((platform, index) => (
                        <StatusTag key={`${row.key}:platform:${index}`} size="small" tone="info">{platform}</StatusTag>
                      ))}
                    </span>
                  )}
                </td>
              )}
              {row.isFirstModuleRow && (
                <td rowSpan={row.moduleRowSpan} className="hubx-feature-workload-matrix__module-cell">
                  {row.module.name}
                </td>
              )}
              <td className="hubx-feature-workload-matrix__feature-cell">{row.subFeature.name}</td>
              {roles.map((role) => {
                const days = row.workloads[role.key] || 0;
                return <td key={role.key} className="hubx-feature-workload-matrix__number-cell">{days > 0 ? days.toFixed(1) : '-'}</td>;
              })}
              <td className="hubx-feature-workload-matrix__number-cell hubx-feature-workload-matrix__total-cell">
                {row.totalDays > 0 ? row.totalDays.toFixed(1) : '-'}
              </td>
              {showRiskColumn && <td>{row.risk || '-'}</td>}
            </tr>
          ))}
          {showSummary && (
            <tr className="hubx-feature-workload-matrix__summary-row">
              <th scope="row">研发人天合计</th>
              <td colSpan={2} />
              {roles.map((role, index) => {
                const days = roleTotals[index];
                return (
                  <td key={role.key} className="hubx-feature-workload-matrix__number-cell">
                    <span>{days.toFixed(1)}</span>
                    {role.dailyRate != null && <small><MoneyText value={days * role.dailyRate} /></small>}
                  </td>
                );
              })}
              <td className="hubx-feature-workload-matrix__number-cell">{totalDays.toFixed(1)}</td>
              {showRiskColumn && <td />}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
