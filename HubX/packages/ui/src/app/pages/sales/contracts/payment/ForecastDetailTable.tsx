import { useMemo, useState } from 'react';
import { Select, Typography, Button, Modal, Input, Message } from '@/design-system';
import { buildGanttNodes } from './paymentCalc';
import { CERTAINTY_LABELS, CERTAINTY_TONES } from './types';
import type { PaymentAnalysisContract } from './contractPaymentProjection';
import type { ForecastNode, ForecastOverride, ForecastCertaintyLevel } from './types';
import {
  DataTable,
  DateText,
  FilterBar,
  IdentifierText,
  MoneyText,
  SectionCard,
  StatusTag,
} from '@/design-system';

const { Text } = Typography;

interface Props {
  contracts: PaymentAnalysisContract[];
  overrides?: ForecastOverride[];
  projectDelayMap?: Record<string, number>;
  onOverride?: (override: ForecastOverride) => void;
}

export function ForecastDetailTable({ contracts, overrides = [], projectDelayMap = {}, onOverride }: Props) {
  const [certaintyFilter, setCertaintyFilter] = useState<'all' | ForecastCertaintyLevel>('all');
  const [editModal, setEditModal] = useState<{ node: ForecastNode; newDate: string; reason: string } | null>(null);

  const nodes = useMemo(() => {
    const all = buildGanttNodes(contracts, overrides, projectDelayMap);
    if (certaintyFilter === 'all') return all;
    return all.filter(n => n.certaintyLevel === certaintyFilter);
  }, [contracts, overrides, projectDelayMap, certaintyFilter]);

  const handleDateChange = (node: ForecastNode, newDate: string) => {
    setEditModal({ node, newDate, reason: '' });
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
          <IdentifierText value={v} />
          <IdentifierText value={r.contractName} size="sm" tone="muted" />
        </div>
      ),
    },
    { title: '客户', dataIndex: 'customerName', width: 100 },
    {
      title: '期数', dataIndex: 'periodName', width: 80,
      render: (v: string, r: ForecastNode) => (
        <div>
          <div>{v}</div>
          <MoneyText value={r.amount} tone="muted" />
        </div>
      ),
    },
    {
      title: '原定到账日', dataIndex: 'plannedDate', width: 100,
      render: (v: string) => <DateText value={v} />,
    },
    {
      title: '动态预测日', dataIndex: 'forecastDate', width: 120,
      render: (v: string, r: ForecastNode) => {
        const isChanged = v !== r.plannedDate;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <DateText value={v} />
            {isChanged && <StatusTag tone="warning" size="small">已调期</StatusTag>}
          </div>
        );
      },
    },
    {
      title: '交付进度', width: 100,
      render: (_: unknown, r: ForecastNode) => {
        if (r.deliveryDelayDays && r.deliveryDelayDays > 0) {
          return <StatusTag tone="danger">延期 {r.deliveryDelayDays} 天</StatusTag>;
        }
        return <StatusTag tone="success">正常</StatusTag>;
      },
    },
    {
      title: '确定性', dataIndex: 'certaintyLevel', width: 100,
      render: (v: ForecastCertaintyLevel) => (
        <StatusTag meta={{ label: CERTAINTY_LABELS[v], tone: CERTAINTY_TONES[v] }} size="small" />
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
    <SectionCard title="单合同预测明细">
      {/* 筛选 */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <FilterBar>
          <Text type="secondary">确定性:</Text>
          <Select value={certaintyFilter} onChange={setCertaintyFilter} style={{ width: 120 }}>
            <Select.Option value="all">全部等级</Select.Option>
            <Select.Option value="high">高确信</Select.Option>
            <Select.Option value="medium">正常履约</Select.Option>
            <Select.Option value="low">风险受阻</Select.Option>
            <Select.Option value="blocked">卡点阻滞</Select.Option>
          </Select>
        </FilterBar>
      </div>

      <DataTable
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
              <Text type="secondary">期次:</Text> {editModal.node.periodName} <MoneyText value={editModal.node.amount} />
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Text type="secondary">原定日期:</Text> <DateText value={editModal.node.plannedDate} />
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Text type="secondary">新预测日期:</Text> <DateText value={editModal.newDate} />
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
    </SectionCard>
  );
}
