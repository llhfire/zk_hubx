import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Input, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { IconPlus, IconSearch } from '@arco-design/web-react/icon';
import { mockPaymentContracts } from './paymentMock';
import { derivePaymentStatus, deriveKanbanSummary, deriveCollectionProgress, findNextPayPeriod } from './paymentCalc';
import { ContractPaymentCard } from './ContractPaymentCard';
import { RecordCollectionModal } from './RecordCollectionModal';
import { BlockerModal } from './BlockerModal';
import { DunningModal } from './DunningModal';
import { PaymentDrawer } from './PaymentDrawer';
import type { Contract } from '../types';
import type { KanbanColumn, PaymentRole } from './types';
import { KANBAN_COLUMNS, KANBAN_PRIORITY, PAYMENT_ROLES } from './types';

const { Title, Text } = Typography;

const TODAY = '2026-08-19';

export default function PaymentDashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState<PaymentRole>('finance');
  const [search, setSearch] = useState('');
  const [collectionVisible, setCollectionVisible] = useState(false);
  const [blockerVisible, setBlockerVisible] = useState(false);
  const [dunningVisible, setDunningVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // 按角色过滤
  const filteredContracts = useMemo(() => {
    let contracts = mockPaymentContracts;
    if (role === 'sales') {
      contracts = contracts.filter(c => c.salesOwner === '张销售'); // α 模拟
    } else if (role === 'pm') {
      contracts = contracts.filter(c => c.projectManager);
    }
    if (search) {
      const kw = search.toLowerCase();
      contracts = contracts.filter(c =>
        c.contractNo.toLowerCase().includes(kw) ||
        c.name.toLowerCase().includes(kw) ||
        c.customerName.toLowerCase().includes(kw)
      );
    }
    return contracts;
  }, [role, search]);

  // 按状态分组
  const grouped = useMemo(() => {
    const groups: Record<KanbanColumn, Contract[]> = {
      normal: [], upcoming: [], overdue: [], blocked: [], settled: [],
    };
    for (const c of filteredContracts) {
      const status = derivePaymentStatus(c, TODAY);
      groups[status].push(c);
    }
    // 按优先级排序
    for (const key of Object.keys(groups) as KanbanColumn[]) {
      groups[key].sort((a, b) => {
        const pa = (a.paymentBlockers ?? []).filter(bl => !bl.resolvedAt).length;
        const pb = (b.paymentBlockers ?? []).filter(bl => !bl.resolvedAt).length;
        return pb - pa; // 卡点多的排前面
      });
    }
    return groups;
  }, [filteredContracts]);

  const summary = useMemo(() => deriveKanbanSummary(filteredContracts, TODAY), [filteredContracts]);

  return (
    <div style={{ padding: 'var(--space-5)' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <Title heading={3}>回款看板</Title>
        <Space>
          <Button disabled title="α 版暂不支持">导出报表</Button>
          <Button icon={<IconPlus />} onClick={() => { setSelectedContract(null); setBlockerVisible(true); }}>登记卡点</Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => { setSelectedContract(null); setCollectionVisible(true); }}>录入回款</Button>
        </Space>
      </div>

      {/* KPI 摘要栏 */}
      <div className="expense-kpi-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">总合同数</div>
          <div className="expense-kpi-value">{summary.totalContracts} 份</div>
        </Card>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">总应收金额</div>
          <div className="expense-kpi-value">¥{summary.totalReceivable.toLocaleString()}</div>
        </Card>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">本月已回款</div>
          <div className="expense-kpi-value" style={{ color: 'var(--success-500)' }}>¥{summary.monthReceived.toLocaleString()}</div>
        </Card>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">预计本月待收</div>
          <div className="expense-kpi-value">¥{summary.monthForecast.toLocaleString()}</div>
        </Card>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">即将到期</div>
          <div className="expense-kpi-value" style={{ color: 'var(--warning-500)' }}>¥{summary.upcomingAmount.toLocaleString()}</div>
        </Card>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">逾期总金额</div>
          <div className="expense-kpi-value" style={{ color: 'var(--destructive-500)' }}>¥{summary.overdueAmount.toLocaleString()}</div>
        </Card>
        <Card className="expense-kpi-card">
          <div className="expense-kpi-label">卡点阻塞</div>
          <div className="expense-kpi-value" style={{ color: 'var(--destructive-500)' }}>¥{summary.blockedAmount.toLocaleString()}</div>
        </Card>
      </div>

      {/* 筛选 */}
      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <Space>
          <Select value={role} onChange={setRole} style={{ width: 140 }}>
            {PAYMENT_ROLES.map(r => <Select.Option key={r.key} value={r.key}>{r.label}</Select.Option>)}
          </Select>
          <Input
            style={{ width: 260 }}
            placeholder="搜索合同编号、名称、客户"
            prefix={<IconSearch />}
            value={search}
            onChange={setSearch}
          />
        </Space>
      </Card>

      {/* 五列看板 */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
        {(Object.keys(KANBAN_COLUMNS) as KanbanColumn[])
          .sort((a, b) => KANBAN_PRIORITY[a] - KANBAN_PRIORITY[b])
          .map(col => {
            const meta = KANBAN_COLUMNS[col];
            const contracts = grouped[col];
            const colAmount = contracts.reduce((s, c) => {
              const progress = deriveCollectionProgress(c);
              return s + (col === 'settled' ? progress.received : progress.remaining);
            }, 0);

            return (
              <div key={col} style={{ minWidth: 280, flex: '1 1 280px' }}>
                <Card
                  size="small"
                  style={{
                    marginBottom: 'var(--space-3)',
                    borderLeft: `3px solid var(--${meta.color === 'red' ? 'destructive' : meta.color === 'green' ? 'success' : meta.color === 'orange' ? 'warning' : 'brand'}-500)`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Tag color={meta.color} size="small">{meta.label}</Tag>
                      <Text style={{ fontWeight: 'var(--font-weight-semibold)' }}>{contracts.length}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>¥{colAmount.toLocaleString()}</Text>
                  </div>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {contracts.map(c => (
                    <ContractPaymentCard
                      key={c.id}
                      contract={c}
                      today={TODAY}
                      onClick={() => { setSelectedContract(c); setDrawerVisible(true); }}
                      onRecordCollection={() => { setSelectedContract(c); setCollectionVisible(true); }}
                      onReportBlocker={() => { setSelectedContract(c); setBlockerVisible(true); }}
                    />
                  ))}
                  {contracts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-5) 0', color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>
                      无合同
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* 弹窗 */}
      <RecordCollectionModal
        visible={collectionVisible}
        contract={selectedContract}
        onClose={() => setCollectionVisible(false)}
      />
      <BlockerModal
        visible={blockerVisible}
        contract={selectedContract}
        onClose={() => setBlockerVisible(false)}
      />
      <DunningModal
        visible={dunningVisible}
        contract={selectedContract}
        onClose={() => setDunningVisible(false)}
      />

      {/* 侧边抽屉 */}
      <PaymentDrawer
        visible={drawerVisible}
        contract={selectedContract}
        onClose={() => setDrawerVisible(false)}
        onRecordCollection={() => { setDrawerVisible(false); setCollectionVisible(true); }}
        onReportBlocker={() => { setDrawerVisible(false); setBlockerVisible(true); }}
        onRecordDunning={() => { setDrawerVisible(false); setDunningVisible(true); }}
      />
    </div>
  );
}
