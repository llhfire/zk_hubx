/**
 * 10 态生命周期轨迹条
 *
 * 设计规约见 case-detail-dev-plan.md §3.1：
 * - buildLifecycleTrack 渲染：当前高亮/挂起黄标/终止灰化/补充标记圆点
 */

import { Tag, Tooltip } from '@arco-design/web-react';
import { buildLifecycleTrack, type LifecycleNode } from '../../calc';
import type { SupplementContractSummary } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  drafting: 'gray',
  quoting: 'blue',
  negotiating: 'blue',
  signed: 'green',
  in_progress: 'green',
  suspended: 'orange',
  accepting: 'cyan',
  collecting: 'purple',
  completed: 'green',
  terminated: 'red',
};

interface StatusTrackProps {
  status: string;
  supplements: SupplementContractSummary[];
}

export function StatusTrack({ status, supplements }: StatusTrackProps) {
  const nodes = buildLifecycleTrack(status as any, supplements);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {nodes.map((node, i) => (
        <div key={node.status} style={{ display: 'flex', alignItems: 'center' }}>
          {/* 节点 */}
          <Tooltip
            content={
              node.current
                ? `当前：${node.label}`
                : node.reached
                  ? `已过：${node.label}`
                  : `未到：${node.label}`
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: node.current ? 600 : 400,
                background: node.current
                  ? `var(--${STATUS_COLOR[node.status] ?? 'blue'}-50)`
                  : node.reached
                    ? 'var(--grey-50)'
                    : 'transparent',
                border: node.current
                  ? `2px solid var(--${STATUS_COLOR[node.status] ?? 'blue'}-500)`
                  : node.reached
                    ? '1px solid var(--grey-300)'
                    : '1px solid var(--grey-200)',
                color: node.terminated
                  ? 'var(--grey-400)'
                  : node.current
                    ? `var(--${STATUS_COLOR[node.status] ?? 'blue'}-600)`
                    : node.reached
                      ? 'var(--grey-600)'
                      : 'var(--grey-400)',
                opacity: node.terminated && !node.current ? 0.5 : 1,
              }}
            >
              {node.suspended && <span style={{ color: 'var(--orange-500)' }}>⏸</span>}
              {node.terminated && node.current && <span>✕</span>}
              <span>{node.label}</span>
              {node.supplementCount > 0 && (
                <span style={{ fontSize: 10, color: 'var(--brand-500)' }}>+{node.supplementCount}</span>
              )}
            </div>
          </Tooltip>

          {/* 连接线 */}
          {i < nodes.length - 1 && (
            <div
              style={{
                width: 16,
                height: 2,
                background: node.reached ? 'var(--grey-300)' : 'var(--grey-200)',
                margin: '0 2px',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
