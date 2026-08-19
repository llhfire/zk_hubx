import { Typography, Card } from '@arco-design/web-react';
import type { Contract } from '../types';

const { Text, Title } = Typography;

interface Props {
  contract: Contract;
}

export function ContractSnapshotTab({ contract }: Props) {
  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      <Card>
        <Title heading={5} style={{ marginBottom: 'var(--space-4)' }}>合同基本信息</Title>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
        }}>
          <div>
            <Text type="secondary">合同编号</Text>
            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{contract.contractNo}</div>
          </div>
          <div>
            <Text type="secondary">合同名称</Text>
            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{contract.name}</div>
          </div>
          <div>
            <Text type="secondary">客户名称</Text>
            <div>{contract.customerName}</div>
          </div>
          <div>
            <Text type="secondary">合同金额</Text>
            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>¥{contract.totalAmount.toLocaleString()}</div>
          </div>
          <div>
            <Text type="secondary">签约日期</Text>
            <div>{contract.signingDate || '-'}</div>
          </div>
          <div>
            <Text type="secondary">状态</Text>
            <div>{contract.status}</div>
          </div>
          <div>
            <Text type="secondary">商务负责人</Text>
            <div>{contract.salesOwner || '-'}</div>
          </div>
          <div>
            <Text type="secondary">项目经理</Text>
            <div>{(contract as any).projectManager || '-'}</div>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <Title heading={5} style={{ marginBottom: 'var(--space-4)' }}>付款计划</Title>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>期次</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>名称</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>金额</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>计划日期</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {(contract.paymentPlans ?? []).map(p => (
              <tr key={p.periodNo} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                <td style={{ padding: 'var(--space-2)' }}>第{p.periodNo}期</td>
                <td style={{ padding: 'var(--space-2)' }}>{p.planName || '-'}</td>
                <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>¥{p.amount.toLocaleString()}</td>
                <td style={{ padding: 'var(--space-2)' }}>{p.expectedDate}</td>
                <td style={{ padding: 'var(--space-2)' }}>{p.status === 'received' ? '已收' : '待收'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <Title heading={5} style={{ marginBottom: 'var(--space-4)' }}>回款记录</Title>
        {(contract.collectionRecords ?? []).length === 0 ? (
          <Text type="secondary">暂无回款记录</Text>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>到账日期</th>
                <th style={{ textAlign: 'right', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>金额</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>渠道</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-3)' }}>期次</th>
              </tr>
            </thead>
            <tbody>
              {(contract.collectionRecords ?? []).map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                  <td style={{ padding: 'var(--space-2)' }}>{c.date}</td>
                  <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>¥{c.amount.toLocaleString()}</td>
                  <td style={{ padding: 'var(--space-2)' }}>{c.method}</td>
                  <td style={{ padding: 'var(--space-2)' }}>{typeof c.period === 'number' ? `第${c.period}期` : c.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
