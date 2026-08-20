import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Badge,
  Message,
  Space,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconSearch, IconEye, IconUserAdd, IconReply } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import type { LeadListItem } from './leads/types';
import {
  LEAD_SOURCE_LIST,
  LEAD_SOURCE_COLOR,
  COMPANY_ENTITY_LIST,
} from './leads/types';
import { TRASH_LEADS } from './leads/mockData';
import { searchLeads } from './leads/utils';

export function TrashLeads() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const filteredLeads = useMemo(() => {
    let result = TRASH_LEADS;
    if (keyword) result = searchLeads(result, keyword);
    if (sourceFilter) result = result.filter((l) => l.source === sourceFilter);
    if (entityFilter) result = result.filter((l) => l.entity === entityFilter);
    return result;
  }, [keyword, sourceFilter, entityFilter]);

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) { Message.warning('暂无权限'); return; }
    const e = findCompanyEntityByName(entityName);
    if (!e) { Message.warning('未找到'); return; }
    setSelectedCompanyEntity(e);
    setCompanyModalVisible(true);
  };

  // 复合列（与 AllLeads 一致）
  const columns = [
    { title: '编号', dataIndex: 'id', width: 70, fixed: 'left' as const },
    { title: '录入时间', dataIndex: 'createTime', width: 130, render: (v: string) => v?.slice(5) || '-' },
    {
      title: '客户/线索',
      width: 240,
      render: (_: unknown, r: LeadListItem) => (
        <div>
          <a onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'trash' } })} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>{r.name}</a>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{r.contact}</div>
        </div>
      ),
    },
    {
      title: '联系人信息',
      width: 140,
      render: (_: unknown, r: LeadListItem) => (
        <div style={{ fontSize: 13 }}>
          <div>{r.phone || '-'}</div>
          <div style={{ color: 'var(--color-text-3)' }}>{r.wechat || '-'}</div>
        </div>
      ),
    },
    {
      title: '渠道与主体',
      width: 130,
      render: (_: unknown, r: LeadListItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={LEAD_SOURCE_COLOR[r.source as keyof typeof LEAD_SOURCE_COLOR] || 'gray'}>{r.source}</Tag>
          <a onClick={() => handleOpenCompanyEntity(r.entity)} style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>{r.entity}</a>
        </Space>
      ),
    },
    {
      title: '垃圾原因',
      width: 180,
      render: (_: unknown, r: LeadListItem) => (
        <Tooltip content={r.trashReason || ''}>
          <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{r.trashReason || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '退回次数',
      width: 90,
      render: (_: unknown, r: LeadListItem) => (
        <Tag color={r.trashCount >= 3 ? 'red' : 'blue'}>{r.trashCount} 次</Tag>
      ),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, r: LeadListItem) => (
        <Space size={0}>
          <Tooltip content="查看详情"><Button type="text" icon={<IconEye />} size="small" onClick={() => navigate(`/leads/${r.key}`, { state: { from: 'trash' } })} /></Tooltip>
          <Tooltip content="重新认领"><Button type="text" icon={<IconUserAdd />} size="small" onClick={() => Message.success('认领成功')} /></Tooltip>
          <Tooltip content="退回公海"><Button type="text" icon={<IconReply />} size="small" onClick={() => Message.success('已退回公海')} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
          <Input style={{ width: 280 }} placeholder="搜索线索名称、联系人" prefix={<IconSearch />} value={keyword} onChange={setKeyword} allowClear />
          <Select placeholder="线索来源" style={{ width: 130 }} allowClear value={sourceFilter} onChange={setSourceFilter}>
            {LEAD_SOURCE_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="对接主体" style={{ width: 130 }} allowClear value={entityFilter} onChange={setEntityFilter}>
            {COMPANY_ENTITY_LIST.map((e) => <Select.Option key={e} value={e}>{e}</Select.Option>)}
          </Select>
        </div>

        <Table columns={columns} data={filteredLeads} scroll={{ x: 1100 }} pagination={{ total: filteredLeads.length, pageSize: 10, showTotal: true, showJumper: true }} />
      </Card>

      <CompanyEntityInfoModal visible={companyModalVisible} mode="view" defaultTab="files" record={selectedCompanyEntity} permissions={companyEntityPermissions} onCancel={() => setCompanyModalVisible(false)} onGoManage={() => navigate('/system/company')} />
    </div>
  );
}
