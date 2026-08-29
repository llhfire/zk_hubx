import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button, Card, Checkbox, Empty, Input, Select, Space, Table, Tag, Tabs, Tooltip, Typography,
} from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { useQuotation } from './QuotationContext';
import { computeAmountBreakdown, getPendingOwner, getPendingRoles, isExpired } from './quoteFlow';
import { canViewQuote } from './quoteAccess';
import { loadQuotePermission } from './quotePermissionStore';
import {
  QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, QUOTE_STAGE_NAMES,
} from './types';
import type { Quote, QuoteStage, QuoteStatus } from './types';
import { deriveStage } from './quoteFlow';

const { Text, Title } = Typography;

function money(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

export function QuotationCenter() {
  const navigate = useNavigate();
  const { quotes, currentRole, currentViewer, isAdmin } = useQuotation();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [stageFilter, setStageFilter] = useState<QuoteStage | ''>('');
  const [mineOnly, setMineOnly] = useState(false);
  const permission = useMemo(() => loadQuotePermission(), []);

  // 分组统计
  const stats = useMemo(() => {
    const byStage: Record<QuoteStage, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const q of quotes) byStage[deriveStage(q.status)] += 1;
    return byStage;
  }, [quotes]);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (!canViewQuote(q, currentViewer, isAdmin)) return false;
      if (mineOnly && !getPendingRoles(q).includes(currentRole)) return false;
      if (statusFilter && q.status !== statusFilter) return false;
      if (stageFilter && deriveStage(q.status) !== stageFilter) return false;
      if (keyword) {
        const k = keyword.toLowerCase();
        const hit =
          q.quoteNo.toLowerCase().includes(k) ||
          q.basicInfo.projectName.toLowerCase().includes(k) ||
          q.basicInfo.customerName.toLowerCase().includes(k);
        if (!hit) return false;
      }
      return true;
    });
  }, [quotes, keyword, statusFilter, stageFilter, mineOnly, currentRole, currentViewer, isAdmin]);

  const columns = [
    { title: '报价编号', dataIndex: 'quoteNo', width: 170, render: (v: string) => <Text bold style={{ whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: '版本', dataIndex: 'version', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: '项目', dataIndex: 'projectName', width: 200, render: (_: unknown, r: Quote) => r.basicInfo.projectName },
    { title: '客户', dataIndex: 'customerName', width: 180, render: (_: unknown, r: Quote) => r.basicInfo.customerName || '-' },
    {
      title: '阶段', dataIndex: 'stage', width: 100,
      render: (_: unknown, r: Quote) => <Tag color="arcoblue">{QUOTE_STAGE_NAMES[deriveStage(r.status)]}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 140,
      render: (_: unknown, r: Quote) => (
        <Space size={4}>
          <Tag color={QUOTE_STATUS_COLORS[r.status]}>{QUOTE_STATUS_LABELS[r.status]}</Tag>
          {r.status === 'sent' && isExpired(r, new Date().toISOString().slice(0, 10)) && (
            <Tag color="red" size="small">已过期</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '当前待办人', dataIndex: 'pendingOwner', width: 150,
      render: (_: unknown, r: Quote) => <Text type="secondary">{getPendingOwner(r)}</Text>,
    },
    {
      title: '总报价', dataIndex: 'amount', width: 120, align: 'right' as const,
      render: (_: unknown, r: Quote) => {
        const b = computeAmountBreakdown(r);
        return <Text bold>{b.grandTotal > 0 ? money(b.grandTotal) : '-'}</Text>;
      },
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 160, render: (v: string) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span> },
    {
      title: '操作', dataIndex: 'op', width: 100, fixed: 'right' as const,
      render: (_: unknown, r: Quote) => (
        <Tooltip content="进入报价工作台">
          <Button
            className="hubx-icon-action"
            type="text"
            size="small"
            aria-label={`进入 ${r.quoteNo} 报价工作台`}
            icon={<ArrowSquareOut size={18} weight="regular" />}
            onClick={() => navigate(`/quotation/${r.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Title heading={5} style={{ margin: 0 }}>报价管理</Title>
        </div>
      </Card>

      <Card>
        <Tabs type="card" size="small" activeTab={stageFilter || 'all'} onChange={(value) => setStageFilter(value === 'all' ? '' : Number(value) as QuoteStage)} style={{ marginBottom: 12 }}>
          <Tabs.TabPane key="all" title={`全部 · ${quotes.length}`} />
          {([1, 2, 3, 4] as QuoteStage[]).map((stage) => <Tabs.TabPane key={stage} title={`${QUOTE_STAGE_NAMES[stage]} · ${stats[stage]}`} />)}
        </Tabs>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input
            style={{ width: 240 }}
            placeholder="搜索报价编号 / 项目 / 客户"
            value={keyword}
            onChange={setKeyword}
            allowClear
            prefix={<IconSearch />}
          />
          <Select
            style={{ width: 150 }}
            placeholder="按阶段筛选"
            value={stageFilter || undefined}
            onChange={(v) => setStageFilter((v ?? '') as QuoteStage | '')}
            allowClear
            options={[1, 2, 3, 4].map((s) => ({ label: QUOTE_STAGE_NAMES[s as QuoteStage], value: s }))}
          />
          <Select
            style={{ width: 160 }}
            placeholder="按状态筛选"
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter((v ?? '') as QuoteStatus | '')}
            allowClear
            options={Object.entries(QUOTE_STATUS_LABELS).map(([k, v]) => ({ label: v, value: k }))}
          />
          <Checkbox checked={mineOnly} onChange={setMineOnly}>仅看待我处理</Checkbox>
        </Space>

        {filtered.length === 0 ? (
          <Empty description="暂无符合条件的报价单" />
        ) : (
          <Table
            columns={columns}
            data={filtered}
            rowKey="id"
            scroll={{ x: 1300 }}
            pagination={{ total: filtered.length, pageSize: 10, showTotal: true, sizeCanChange: true }}
          />
        )}
      </Card>
    </div>
  );
}
