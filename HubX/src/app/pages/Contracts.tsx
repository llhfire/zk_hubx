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
  Typography,
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

const Title = Typography.Title;
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
  const [filter, setFilter] = useState<ListFilter>('all');
  const [keyword, setKeyword] = useState('');

  const projectContracts = useMemo(
    () => contracts.filter((contract) => Boolean(findLinkedProject(contract))),
    [contracts],
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
      title: '合同金额',
      width: 120,
      render: (_: unknown, c: Contract) =>
        `¥${(c.current.totalAmount / 10000).toFixed(0)}万`,
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
      title: '已收款',
      width: 100,
      render: (_: unknown, c: Contract) =>
        c.receivedAmount !== undefined ? `¥${(c.receivedAmount / 10000).toFixed(0)}万` : '—',
    },
    {
      title: '待收款',
      width: 100,
      render: (_: unknown, c: Contract) =>
        c.receivableAmount !== undefined ? `¥${(c.receivableAmount / 10000).toFixed(0)}万` : '—',
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
    <div>
      <div className="flex items-center justify-end" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/contracts/new')}>
          新建合同
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between" style={{ gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Input
              style={{ width: 280 }}
              placeholder="搜索合同编号、名称、客户"
              prefix={<IconSearch />}
              value={keyword}
              onChange={setKeyword}
              allowClear
            />
            <Button type="primary" icon={<IconSearch />}>
              搜索
            </Button>
          </div>
          <Tabs
            activeTab={filter}
            onChange={(k) => setFilter(k as ListFilter)}
            style={{ marginLeft: 'auto' }}
          >
            <TabPane key="all" title={`全部 (${projectContracts.length})`} />
            <TabPane key="draft" title={`${CONTRACT_STATUS_LABEL.draft} (${counts.draft})`} />
            <TabPane key="approving" title={`${CONTRACT_STATUS_LABEL.approving} (${counts.approving})`} />
            <TabPane key="executing" title={`履行中 (${executingCount})`} />
            <TabPane key="archived" title={`${CONTRACT_STATUS_LABEL.archived} (${counts.archived})`} />
          </Tabs>
        </div>

        <Table
          columns={columns}
          data={filtered}
          rowKey="id"
          scroll={{ x: 1700 }}
          pagination={{
            pageSize: 10,
            showTotal: true,
            showJumper: true,
          }}
        />
      </Card>
    </div>
  );
}
