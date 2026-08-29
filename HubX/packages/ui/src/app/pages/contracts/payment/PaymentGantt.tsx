import { useMemo, useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Card, Select, Space, Typography, Tag, Button, Modal, Input, Message } from '@arco-design/web-react';
import { buildGanttNodes } from './paymentCalc';
import { CERTAINTY_LABELS, CERTAINTY_COLORS } from './types';
import type { Task } from 'gantt-task-react';
import type { Contract } from '../types';
import type { ForecastNode, ForecastOverride } from './types';

const { Text } = Typography;

interface Props {
  contracts: Contract[];
  projectDelayMap?: Record<string, number>;
  overrides: ForecastOverride[];
  onOverride: (override: ForecastOverride) => void;
}

const TODAY = '2026-08-19';

const CERTAINTY_STYLES: Record<string, { backgroundColor: string; progressColor: string }> = {
  high: { backgroundColor: 'rgb(var(--success-2))', progressColor: 'rgb(var(--success-6))' },
  medium: { backgroundColor: 'rgb(var(--blue-2))', progressColor: 'rgb(var(--blue-6))' },
  low: { backgroundColor: 'rgb(var(--warning-2))', progressColor: 'rgb(var(--warning-6))' },
  blocked: { backgroundColor: 'rgb(var(--danger-2))', progressColor: 'rgb(var(--danger-6))' },
};

export function PaymentGantt({ contracts, projectDelayMap = {}, overrides, onOverride }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [expandedAll, setExpandedAll] = useState(true);
  const [editModal, setEditModal] = useState<{ node: ForecastNode; newDate: string } | null>(null);

  const nodes = useMemo(
    () => buildGanttNodes(contracts, overrides, projectDelayMap),
    [contracts, overrides, projectDelayMap],
  );

  // 转换为 gantt-task-react Task 格式
  const tasks: Task[] = useMemo(() => {
    const result: Task[] = [];

    // 按合同分组，每个合同是一个 project 类型
    const contractMap = new Map<string, ForecastNode[]>();
    for (const node of nodes) {
      if (!contractMap.has(node.contractId)) contractMap.set(node.contractId, []);
      contractMap.get(node.contractId)!.push(node);
    }

    for (const [contractId, contractNodes] of contractMap) {
      const first = contractNodes[0];
      const contractStart = new Date(Math.min(...contractNodes.map(n => new Date(n.forecastDate).getTime())));
      const contractEnd = new Date(Math.max(...contractNodes.map(n => new Date(n.forecastDate).getTime())));

      // 合同行（project 类型）
      result.push({
        id: contractId,
        type: 'project',
        name: `${first.contractNo} ${first.contractName}`,
        start: contractStart,
        end: contractEnd,
        progress: contractNodes.filter(n => n.isSettled).length / contractNodes.length * 100,
        hideChildren: !expandedAll,
        styles: { progressSelectedColor: 'rgb(var(--blue-6))' },
      });

      // 期次行（task 类型）
      for (const node of contractNodes) {
        const start = new Date(node.forecastDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 3); // 显示为 3 天宽的条

        const styles = CERTAINTY_STYLES[node.certaintyLevel] ?? CERTAINTY_STYLES.medium;

        result.push({
          id: node.nodeId,
          type: 'task',
          name: `${node.periodName} ¥${node.amount.toLocaleString()}`,
          start,
          end,
          progress: node.isSettled ? 100 : 0,
          project: contractId,
          styles: {
            backgroundColor: styles.backgroundColor,
            progressColor: node.isSettled ? 'rgb(var(--success-6))' : styles.progressColor,
          },
        });
      }
    }

    return result;
  }, [nodes, expandedAll]);

  // 拖拽调期处理
  const handleDateChange = (task: Task) => {
    const node = nodes.find(n => n.nodeId === task.id);
    if (!node) return;
    const newDate = task.start.toISOString().slice(0, 10);
    if (newDate === node.forecastDate) return;
    setEditModal({ node, newDate });
  };

  const confirmOverride = () => {
    if (!editModal) return;
    onOverride({
      id: `ov-${Date.now()}`,
      contractId: editModal.node.contractId,
      periodIndex: editModal.node.periodIndex,
      originalDate: editModal.node.plannedDate,
      newForecastDate: editModal.newDate,
      reason: editModal.reason || '',
      createdBy: '当前用户',
      createdAt: new Date().toISOString(),
    });
    Message.success('预测日期已更新');
    setEditModal(null);
  };

  return (
    <Card title="付款节点甘特图">
      {/* 工具栏 */}
      <div className="payment-forecast-toolbar">
        <Space wrap>
          <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>视图尺度:</Text>
          <Select value={viewMode} onChange={setViewMode} style={{ width: 100 }}>
            <Select.Option value={ViewMode.Week}>周</Select.Option>
            <Select.Option value={ViewMode.Month}>月</Select.Option>
            <Select.Option value={ViewMode.Year}>季度</Select.Option>
          </Select>
          <Button size="small" onClick={() => setExpandedAll(!expandedAll)}>
            {expandedAll ? '折叠全部' : '展开全部'}
          </Button>
        </Space>
        <Space>
          {Object.entries(CERTAINTY_LABELS).map(([key, label]) => (
            <Space key={key} size={4}>
              <div style={{
                width: 12, height: 12, borderRadius: 2,
                background: CERTAINTY_STYLES[key]?.progressColor ?? 'var(--color-fill-4)',
              }} />
              <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{label}</Text>
            </Space>
          ))}
        </Space>
      </div>

      {/* 甘特图 */}
      {tasks.length > 0 ? (
        <div style={{ overflow: 'auto' }}>
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onDateChange={handleDateChange}
            listCellWidth="240px"
            rowHeight={36}
            barCornerRadius={4}
            todayColor="var(--brand-100)"
            locale="zh"
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-7)', color: 'var(--color-text-3)' }}>
          暂无付款节点数据
        </div>
      )}

      {/* 调期确认弹窗 */}
      <Modal
        title="确认调期"
        visible={!!editModal}
        onCancel={() => setEditModal(null)}
        onOk={confirmOverride}
        okText="确认"
      >
        {editModal && (
          <div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Text type="secondary">合同:</Text> {editModal.node.contractNo} {editModal.node.contractName}
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Text type="secondary">期次:</Text> {editModal.node.periodName} ¥{editModal.node.amount.toLocaleString()}
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Text type="secondary">原定日期:</Text> {editModal.node.plannedDate}
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Text type="secondary">新预测日期:</Text> {editModal.newDate}
            </div>
            <div>
              <Text type="secondary">调期原因（必填）:</Text>
              <Input.TextArea
                value={editModal.reason}
                onChange={v => setEditModal({ ...editModal, reason: v })}
                placeholder="如：客户财务每月25日统批请款"
                style={{ marginTop: 'var(--space-2)' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
