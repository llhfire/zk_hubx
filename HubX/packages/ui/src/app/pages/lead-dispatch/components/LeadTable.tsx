// 列表表格（PLAN.md 阶段 B：14 列口径 + 分页 + 行高亮）
// 列组：checkbox / 业务线 / 客户信息 / 主体渠道 / 客户分级 / 录入派发时间 /
//       时效监控（派发+首联两道 SLA） / 承接销售部门 / 跟进状态 / 操作
// 行高亮优先级：红（首联超时）> 橙（派发超期）> 琥珀（待审核），调 kpiCalc 同一纯函数

import { useMemo } from 'react';
import { Table, Tag, Button, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router';
import type { LeadListItem } from '@/app/pages/leads/types';
import { LEAD_SOURCE_LABEL } from '@/app/pages/leads/types';
import { BUSINESS_LINE_LABEL, type LeadBusinessLine } from '../types';
import { leadDispatchView, type RowHighlight } from '../kpiCalc';
import { canBeDispatched } from '../dispatchRules';
import { hasPendingLevelAudit, returnActorsOf } from '../kpiCalc';

interface LeadTableProps {
  leads: LeadListItem[];
  now: Date;
  loading: boolean;
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  /** 部门字典：销售姓名 -> 部门（来自 EmployeeContext） */
  departmentByOwner: Map<string, string>;
  onDispatch: (lead: LeadListItem) => void;
  onUrge: (lead: LeadListItem) => void;
  onLevelAdjust: (lead: LeadListItem) => void;
  onQualityConfirm: (lead: LeadListItem) => void;
}

const HIGHLIGHT_BG: Record<Exclude<RowHighlight, null>, string> = {
  first_contact_overdue: 'rgba(var(--danger-1), 0.55)',
  dispatch_overdue: 'rgba(var(--warning-1), 0.45)',
  level_audit: 'rgba(var(--gold-1), 0.6)',
};

const SLA_TAG_COLOR: Record<string, string> = {
  normal: 'green',
  warning: 'orange',
  overdue: 'red',
  contacted: 'green',
};

const LEVEL_COLOR: Record<string, string> = { S: 'red', A: 'orange', B: 'blue', C: 'gray' };

export function LeadTable({
  leads, now, loading, selectedIds, onSelectChange, departmentByOwner, onDispatch, onUrge, onLevelAdjust, onQualityConfirm,
}: LeadTableProps) {
  const navigate = useNavigate();

  const views = useMemo(() => {
    const map = new Map<string, ReturnType<typeof leadDispatchView>>();
    for (const l of leads) map.set(l.id, leadDispatchView(l, now));
    return map;
  }, [leads, now]);

  const columns = useMemo(() => [
    {
      title: '业务线',
      dataIndex: 'businessLine',
      width: 110,
      render: (v: string) => v
        ? <Tag size="small" color="arcoblue">{BUSINESS_LINE_LABEL[v as LeadBusinessLine] ?? v}</Tag>
        : <Tag size="small">未设</Tag>,
    },
    {
      title: '客户信息',
      dataIndex: 'name',
      width: 200,
      render: (_: string, record: LeadListItem) => (
        <div style={{ lineHeight: 1.4 }}>
          <Typography.Text style={{ fontWeight: 500 }}>{record.name}</Typography.Text>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            {record.contact} · {record.phone}
            {record.customer ? ` · ${record.customer}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: '主体 / 渠道',
      dataIndex: 'entity',
      width: 160,
      render: (_: string, record: LeadListItem) => (
        <div style={{ lineHeight: 1.4 }}>
          <div>{record.entity}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            {LEAD_SOURCE_LABEL[record.source as keyof typeof LEAD_SOURCE_LABEL] ?? record.source}
            {record.channelPlan ? ` · ${record.channelPlan}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: '分级',
      dataIndex: 'customerLevel',
      width: 70,
      render: (v: string) => v
        ? <Tag size="small" color={LEVEL_COLOR[v] ?? 'gray'}>{v}</Tag>
        : '-',
    },
    {
      title: '录入 / 派发',
      dataIndex: 'createTime',
      width: 180,
      render: (_: string, record: LeadListItem) => (
        <div style={{ lineHeight: 1.4, fontSize: 12 }}>
          <div>{record.createTime}</div>
          <div style={{ color: 'var(--color-text-3)' }}>
            {record.dispatchedAt ?? '未派发'}
          </div>
        </div>
      ),
    },
    {
      title: '时效监控',
      dataIndex: 'dispatchedAt',
      width: 170,
      render: (_: string, record: LeadListItem) => {
        const view = views.get(record.id);
        if (!view) return '-';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Tag size="small" color={SLA_TAG_COLOR[view.dispatchSla.status]}>
              派发 {view.dispatchSla.label}
            </Tag>
            <Tag size="small" color={SLA_TAG_COLOR[view.firstContactSla.status]}>
              首联 {view.firstContactSla.label}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '承接销售 / 部门',
      dataIndex: 'owner',
      width: 140,
      render: (v: string, record: LeadListItem) => {
        if (!v && record.dispatchTarget === 'pool') return <Tag size="small">公海待领取</Tag>;
        return (
          <div style={{ lineHeight: 1.4, fontSize: 12 }}>
            <div>{v || '-'}</div>
            <div style={{ color: 'var(--color-text-3)' }}>{v ? (departmentByOwner.get(v) ?? '-') : ''}</div>
          </div>
        );
      },
    },
    {
      title: '跟进状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag size="small">{v}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: LeadListItem) => {
        const dispatchable = canBeDispatched({
          clueType: record.clueType,
          status: record.status,
          dispatchedAt: record.dispatchedAt,
          dispatchTarget: record.dispatchTarget,
        });
        const pendingAudit = hasPendingLevelAudit(record);
        const qualityActors = returnActorsOf(record);
        const needsQualityConfirm = qualityActors.length >= 3;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {dispatchable && (
              <Button size="mini" type="primary" onClick={() => onDispatch(record)}>派发</Button>
            )}
            <Button size="mini" onClick={() => onUrge(record)}>催办</Button>
            <Button size="mini" onClick={() => onLevelAdjust(record)}>
              {pendingAudit ? '审核中' : '调级'}
            </Button>
            {needsQualityConfirm && (
              <Button size="mini" status="warning" onClick={() => onQualityConfirm(record)}>质检</Button>
            )}
            <Button size="mini" type="text" onClick={() => navigate(`/leads/${record.id}`)}>详情</Button>
          </div>
        );
      },
    },
  ], [views, departmentByOwner, navigate, onDispatch, onUrge, onLevelAdjust, onQualityConfirm]);

  return (
    <Table
      rowKey="id"
      loading={loading}
      columns={columns}
      data={leads}
      pagination={{ pageSize: 10, showTotal: true, sizeCanChange: true }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectChange(keys as string[]),
      }}
      rowClassName={(record) => {
        const view = views.get(record.id);
        return view?.highlight ? `dispatch-highlight-${view.highlight}` : '';
      }}
      onRow={(record) => {
        const view = views.get(record.id);
        const bg = view?.highlight ? HIGHLIGHT_BG[view.highlight] : undefined;
        return bg ? { style: { backgroundColor: bg } } : {};
      }}
    />
  );
}
