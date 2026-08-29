import { useMemo, useState } from 'react';
import { Card, Table, Select, Space, Tag, Typography, Button, Modal, Input, Message } from '@arco-design/web-react';
import { buildGanttNodes } from './paymentCalc';
import { CERTAINTY_LABELS, CERTAINTY_COLORS } from './types';
import type { Contract } from '../types';
import type { ForecastNode, ForecastOverride, ForecastCertaintyLevel } from './types';
import { FilterBar } from '@/app/components/ui';

const { Text } = Typography;

interface Props {
  contracts: Contract[];
  overrides?: ForecastOverride[];
  projectDelayMap?: Record<string, number>;
  onOverride?: (override: ForecastOverride) => void;
}

export function ForecastDetailTable({ contracts, overrides = [], projectDelayMap = {}, onOverride }: Props) {
  const [certaintyFilter, setCertaintyFilter] = useState<'all' | ForecastCertaintyLevel>('all');
  const [editModal, setEditModal] = useState<{ node: ForecastNode; newDate: string } | null>(null);

  const nodes = useMemo(() => {
    const all = buildGanttNodes(contracts, overrides, projectDelayMap);
    if (certaintyFilter === 'all') return all;
    return all.filter(n => n.certaintyLevel === certaintyFilter);
  }, [contracts, overrides, projectDelayMap, certaintyFilter]);

  const handleDateChange = (node: ForecastNode, newDate: string) => {
    setEditModal({ node, newDate });
  };

  const confirmOverride = () => {
    if (!editModal || !onOverride) return;
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

  const columns = [
    {
      title: '合同编号', dataIndex: 'contractNo', width: 120,
      render: (v: string, r: ForecastNode) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{v}</div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{r.contractName}</Text>
        </div>
      ),
    },
    { title: '客户', dataIndex: 'customerName', width: 100 },
    {
      title: '期数', dataIndex: 'periodName', width: 80,
      render: (v: string, r: ForecastNode) => (
        <div>
          <div>{v}</div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>¥{r.amount.toLocaleString()}</Text>
        </div>
      ),
    },
    {
      title: '原定到账日', dataIndex: 'plannedDate', width: 100,
      render: (v: string) => <Text style={{ fontSize: 'var(--text-sm)' }}>{v}</Text>,
    },
    {
      title: '动态预测日', dataIndex: 'forecastDate', width: 120,
      render: (v: string, r: ForecastNode) => {
        const isChanged = v !== r.plannedDate;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Text style={{ fontSize: 'var(--text-sm)', color: isChanged ? 'rgb(var(--warning-6))' : undefined }}>{v}</Text>
            {isChanged && <Tag size="small" color="orange">已调期</Tag>}
          </div>
        );
      },
    },
    {
      title: '交付进度', width: 100,
      render: (_: unknown, r: ForecastNode) => {
        if (r.deliveryDelayDays && r.deliveryDelayDays > 0) {
          return <Text style={{ fontSize: 'var(--text-sm)', color: 'rgb(var(--danger-6))' }}>延期 {r.deliveryDelayDays} 天</Text>;
        }
        return <Text style={{ fontSize: 'var(--text-sm)', color: 'rgb(var(--success-6))' }}>正常</Text>;
      },
    },
    {
      title: '确定性', dataIndex: 'certaintyLevel', width: 100,
      render: (v: ForecastCertaintyLevel) => (
        <Tag color={CERTAINTY_COLORS[v]} size="small">{CERTAINTY_LABELS[v]}</Tag>
      ),
    },
    {
      title: '操作', width: 80,
      render: (_: unknown, r: ForecastNode) => {
        if (r.isSettled) return null;
        return (
          <Button
            size="mini"
            type="text"
            onClick={() => {
              const newDate = prompt('输入新预测日期 (YYYY-MM-DD):', r.forecastDate);
              if (newDate && newDate !== r.forecastDate) handleDateChange(r, newDate);
            }}
          >
            调期
          </Button>
        );
      },
    },
  ];

  return (
    <Card title="单合同预测明细">
      {/* 筛选 */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <FilterBar>
          <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>确定性:</Text>
          <Select value={certaintyFilter} onChange={setCertaintyFilter} style={{ width: 120 }}>
            <Select.Option value="all">全部等级</Select.Option>
            <Select.Option value="high">高确信</Select.Option>
            <Select.Option value="medium">正常履约</Select.Option>
            <Select.Option value="low">风险受阻</Select.Option>
            <Select.Option value="blocked">卡点阻滞</Select.Option>
          </Select>
        </FilterBar>
      </div>

      <Table
        rowKey="nodeId"
        data={nodes}
        columns={columns}
        pagination={{ pageSize: 20 }}
        size="small"
        scroll={{ x: 900 }}
      />

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
              <Text type="secondary">调期原因:</Text>
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
