import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
  Button,
  Input,
  Message,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye, IconDownload } from '@arco-design/web-react/icon';
import { useContracts, countByStatus } from './contracts/ContractsContext';
import { ContractStatusBadge } from './contracts/components/ContractStatusBadge';
import { CONTRACT_STATUS_LABEL } from './contracts/utils';
import type { Contract, ContractStatus } from './contracts/types';
import { initialProjects } from './project-management/mockData';
import { FilterBar, PageHeader, PageShell } from '@/app/components/ui';
import { useCollections } from '@/app/collections/CollectionContext';
import { withCollectionLedger } from '@/services/collectionMutations';

const TabPane = Tabs.TabPane;

// "履行中" 是 archived + executionStatus === '履行中' 的组合伪状态。
type ListFilter = 'all' | ContractStatus | 'executing';

function findLinkedProject(contract: Contract) {
  return initialProjects.find((item) => item.id === contract.projectId)
    ?? initialProjects.find((item) => item.contractId === contract.id)
    ?? initialProjects.find((item) => item.leadId === contract.leadId);
}

export function Contracts() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const [filter, setFilter] = useState<ListFilter>('all');
  const [keyword, setKeyword] = useState('');

  const projectContracts = useMemo(
    () => contracts
      .map((contract) => withCollectionLedger(contract, collections))
      .filter((contract) => Boolean(findLinkedProject(contract))),
    [contracts, collections],
  );
  const counts = useMemo(() => countByStatus(projectContracts), [projectContracts]);
  const executingCount = projectContracts.filter(
    (c) => c.status === 'archived' && c.executionStatus === '履行中',
  ).length;

  const filtered = useMemo(() => {
    let list = projectContracts;
    if (filter === 'executing') {
      list = list.filter((c) => c.status === 'archived' && c.executionStatus === '履行中');
    } else if (filter !== 'all') {
      list = list.filter((c) => c.status === filter);
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.contractNo.toLowerCase().includes(kw) ||
          c.current.contractName.toLowerCase().includes(kw) ||
          c.current.customerName.toLowerCase().includes(kw),
      );
    }
    return list;
  }, [projectContracts, filter, keyword]);

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      width: 150,
      render: (_: unknown, c: Contract) => c.contractNo,
    },
    {
      title: '合同名称',
      width: 220,
      render: (_: unknown, c: Contract) => (
        <a
          style={{ color: 'var(--primary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fill-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => navigate(`/contracts/${c.id}`)}
        >
          {c.current.contractName}
        </a>
      ),
    },
    {
      title: '客户名称',
      width: 150,
      render: (_: unknown, c: Contract) => c.current.customerName,
    },
    {
      title: '合同 / 回款金额',
      width: 190,
      render: (_: unknown, c: Contract) => (
        <Space direction="vertical" size={2}>
          <b>合同 ¥{(c.current.totalAmount / 10000).toFixed(0)}万</b>
          <span style={{ color: 'var(--color-text-2)', whiteSpace: 'nowrap' }}>
            已收 {c.receivedAmount !== undefined ? `¥${(c.receivedAmount / 10000).toFixed(0)}万` : '—'} · 待收 {c.receivableAmount !== undefined ? `¥${(c.receivableAmount / 10000).toFixed(0)}万` : '—'}
          </span>
        </Space>
      ),
    },
    {
      title: '形成状态',
      width: 110,
      render: (_: unknown, c: Contract) => <ContractStatusBadge status={c.status} size="small" />,
    },
    {
      title: '版本',
      width: 70,
      render: (_: unknown, c: Contract) => `V${c.versionHistory.length}`,
    },
    {
      title: '签订日期',
      width: 120,
      render: (_: unknown, c: Contract) => c.current.signDate,
    },
    {
      title: '终止日期',
      width: 120,
      render: (_: unknown, c: Contract) => c.current.endDate,
    },
    {
      title: '履行状态',
      width: 100,
      render: (_: unknown, c: Contract) =>
        c.status === 'archived' && c.executionStatus ? (
          <Tag color={c.executionStatus === '已完成' ? 'green' : 'arcoblue'}>
            {c.executionStatus}
          </Tag>
        ) : (
          <span style={{ color: 'var(--color-text-3)' }}>—</span>
        ),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, c: Contract) => (
        <Space>
          <Tooltip content="查看">
            <Button
              type="text"
              icon={<IconEye />}
              size="small"
              onClick={() => navigate(`/contracts/${c.id}`)}
            />
          </Tooltip>
          <Tooltip content="下载">
            <Button type="text" icon={<IconDownload />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="合同管理"
        description="查看合同审批、归档、履行与回款状态，并进入合同详情处理后续工作。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => navigate('/contracts/new')}>新建合同</Button>}
      />

      <Card>
        <Tabs activeTab={filter} onChange={(k) => setFilter(k as ListFilter)} style={{ marginBottom: 12 }}>
          <TabPane key="all" title={`全部 (${projectContracts.length})`} />
          <TabPane key="draft" title={`${CONTRACT_STATUS_LABEL.draft} (${counts.draft})`} />
          <TabPane key="approving" title={`${CONTRACT_STATUS_LABEL.approving} (${counts.approving})`} />
          <TabPane key="executing" title={`履行中 (${executingCount})`} />
          <TabPane key="archived" title={`${CONTRACT_STATUS_LABEL.archived} (${counts.archived})`} />
        </Tabs>

        <FilterBar actions={<Button type="primary" icon={<IconSearch />}>搜索</Button>}>
          <Input
            style={{ width: 280 }}
            placeholder="搜索合同编号、名称或客户"
            prefix={<IconSearch />}
            value={keyword}
            onChange={setKeyword}
            allowClear
          />
        </FilterBar>

        <Table
          style={{ marginTop: 16 }}
          columns={columns}
          data={filtered}
          rowKey="id"
          scroll={{ x: 1480 }}
          pagination={{
            pageSize: 10,
            showTotal: true,
            showJumper: true,
          }}
        />
      </Card>
    </PageShell>
  );
}
