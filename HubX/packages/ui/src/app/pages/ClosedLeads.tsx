import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  Grid,
  Input,
  Message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconEye, IconSearch } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import type { LeadListItem } from './leads/types';
import {
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_LABEL,
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
} from './leads/types';
import { useLeads } from '@/app/leads/LeadContext';
import { searchLeads } from './leads/utils';

const { Text } = Typography;

// 已成交线索扩展数据（含合同/项目信息）
interface ClosedLeadItem extends LeadListItem {
  closedStatus: string;
  closeDate: string;
  contractNo: string;
  contractAmount: number;
  receivedAmount: number;
  projectName: string;
  projectStatus: string;
  conversionDays: number;
}

const closedLeadsData: ClosedLeadItem[] = [
  {
    closedStatus: '已签约',
    closeDate: '2026-08-12',
    contractNo: 'ZKRY202608080001',
    contractAmount: 960000,
    receivedAmount: 408000,
    projectName: 'OA流程优化项目',
    projectStatus: '进行中',
    conversionDays: 37,
  },
];

export function ClosedLeads() {
  const navigate = useNavigate();
  const { leads } = useLeads();
  const [keyword, setKeyword] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const dataSource = useMemo<ClosedLeadItem[]>(() => {
    const closedPool = leads.filter((l) => l.transformStatus && l.status === '已签单');
    if (closedPool.length === 0) return closedLeadsData;
    return closedPool.map((lead) => ({
      ...lead,
      closedStatus: '已签约',
      closeDate: lead.lastFollowTime || lead.updateTime || '',
      contractNo: 'ZKRY202608080001',
      contractAmount: Number(lead.customerBudget?.replace(/[¥,]/g, '') || 0),
      receivedAmount: 0,
      projectName: lead.name,
      projectStatus: '进行中',
      conversionDays: lead.daysHeld,
    }));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const base = dataSource;
    return base.filter((lead) => {
      const hitKeyword = !keyword || [lead.id, lead.name, lead.customer, lead.contractNo, lead.projectName].some((item) => item.includes(keyword));
      const hitEntity = !entityFilter || lead.entity === entityFilter;
      return hitKeyword && hitEntity;
    });
  }, [keyword, entityFilter, dataSource]);

  const totalAmount = filteredLeads.reduce((sum, lead) => sum + lead.contractAmount, 0);
  const receivedAmount = filteredLeads.reduce((sum, lead) => sum + lead.receivedAmount, 0);

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) { Message.warning('暂无权限'); return; }
    const e = findCompanyEntityByName(entityName);
    if (!e) { Message.warning('未找到'); return; }
    setSelectedCompanyEntity(e);
    setCompanyModalVisible(true);
  };

  // 复合列（与 AllLeads 一致 + 合同/项目特殊列）
  const columns = [
    { title: '编号', dataIndex: 'id', width: 70, fixed: 'left' as const },
    { title: '成交日期', dataIndex: 'closeDate', width: 110 },
    {
      title: '客户/线索',
      width: 240,
      render: (_: unknown, r: ClosedLeadItem) => (
        <div>
          <a onClick={() => navigate(`/projects/${r.key}`)} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>{r.name}</a>
          {r.presalesGroupName && (
            <Tooltip content="点击复制群名">
              <div style={{ fontSize: 12, color: 'rgb(var(--warning-6))', cursor: 'pointer', marginTop: 2 }} onClick={() => { navigator.clipboard.writeText(r.presalesGroupName || ''); }}>
                <span style={{ color: '#07C160' }}>💬</span> {r.presalesGroupName}
              </div>
            </Tooltip>
          )}
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{r.customer} · {r.contact}</div>
        </div>
      ),
    },
    {
      title: '渠道与主体',
      width: 130,
      render: (_: unknown, r: ClosedLeadItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{LEAD_SOURCE_LABEL[r.source] || r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>{r.entity}</a>
        </Space>
      ),
    },
    {
      title: '成交状态',
      width: 100,
      render: (_: unknown, r: ClosedLeadItem) => (
        <Tag color={r.closedStatus === '已签约' ? 'green' : r.closedStatus === '已立项' ? 'arcoblue' : 'orange'}>{r.closedStatus}</Tag>
      ),
    },
    {
      title: '合同金额',
      width: 120,
      render: (_: unknown, r: ClosedLeadItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>¥{r.contractAmount.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>已回款 ¥{r.receivedAmount.toLocaleString()}</div>
        </div>
      ),
    },
    { title: '关联合同', dataIndex: 'contractNo', width: 160 },
    { title: '关联项目', dataIndex: 'projectName', width: 160 },
    {
      title: '归属与协作',
      width: 120,
      render: (_: unknown, r: ClosedLeadItem) => (
        <div style={{ fontSize: 12 }}>
          <div>归属: {r.owner || '-'}</div>
          <div style={{ color: 'var(--color-text-3)' }}>优化: {r.optimizer || '-'}</div>
        </div>
      ),
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, r: ClosedLeadItem) => (
        <Tooltip content="详情"><Button type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/projects/${r.key}`)} /></Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        <Grid.Col span={6}>
          <Card><Text type="secondary">成交线索数</Text><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{filteredLeads.length}</div></Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card><Text type="secondary">合同总额</Text><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'rgb(var(--primary-6))' }}>¥{totalAmount.toLocaleString()}</div></Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card><Text type="secondary">已回款金额</Text><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'rgb(var(--success-6))' }}>¥{receivedAmount.toLocaleString()}</div></Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card><Text type="secondary">平均转化周期</Text><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{Math.round(filteredLeads.reduce((sum, lead) => sum + lead.conversionDays, 0) / Math.max(filteredLeads.length, 1))} 天</div></Card>
        </Grid.Col>
      </Grid.Row>

      <Card>
        <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
          <Input allowClear prefix={<IconSearch />} placeholder="搜索线索、客户、合同或项目" value={keyword} onChange={setKeyword} style={{ width: 280 }} />
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear value={entityFilter} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
        </div>

        <Table columns={columns} data={filteredLeads} rowKey="key" scroll={{ x: 1400 }} pagination={false} />
      </Card>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </div>
  );
}
