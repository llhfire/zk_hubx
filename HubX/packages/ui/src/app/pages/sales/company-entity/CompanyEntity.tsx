import { useState } from 'react';
import { Button, Message, Popconfirm, Space, Tooltip } from '@/design-system';
import { IconDelete, IconEdit, IconPlus, IconEye } from '@/design-system';
import { CompanyEntityInfoModal, type CompanyEntityModalMode } from './CompanyEntityInfoModal';
import {
  addMockCompanyEntity,
  companyEntityPermissions,
  mockCompanyEntities,
  type CompanyEntityRecord,
  updateMockCompanyEntity,
} from './companyEntityData';
import {
  DataTable,
  DateText,
  MetricGrid,
  PageHeader,
  PageShell,
  SectionCard,
  StatusTag,
  resolveStatus,
  type StatusMap,
} from '@/design-system';
import '../../support/system/systemConfigConsistency.css';

/** 公司主体启用状态 → 文案 + 语义色（StatusTag 使用）。 */
const ENTITY_STATUS: StatusMap<string> = {
  启用: { label: '启用', tone: 'success' },
  禁用: { label: '禁用', tone: 'danger' },
};

export function CompanyEntity() {
  const [companyEntities, setCompanyEntities] = useState<CompanyEntityRecord[]>(mockCompanyEntities);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<CompanyEntityModalMode>('view');
  const [editingRecord, setEditingRecord] = useState<CompanyEntityRecord | null>(null);

  const openModal = (mode: CompanyEntityModalMode, record: CompanyEntityRecord | null) => {
    setModalMode(mode);
    setEditingRecord(record);
    setModalVisible(true);
  };

  const columns = [
    { title: '公司名称', dataIndex: 'name' },
    { title: '简称', dataIndex: 'shortName' },
    { title: '统一社会信用代码', dataIndex: 'taxNumber' },
    { title: '通讯地址', dataIndex: 'address', width: 240, ellipsis: true },
    { title: '法定代表人', dataIndex: 'legalPerson' },
    { title: '注册资本', dataIndex: 'registeredCapital' },
    { title: '联系电话', dataIndex: 'contactPhone' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => <StatusTag meta={resolveStatus(ENTITY_STATUS, status)} />,
    },
    { title: '创建时间', dataIndex: 'createTime', render: (value: string) => <DateText value={value} /> },
    {
      title: '操作',
      render: (_: unknown, record: CompanyEntityRecord) => (
        <Space>
          {companyEntityPermissions.view && (
            <Tooltip content="查看">
              <Button className="hubx-icon-action" type="text" size="small" icon={<IconEye />} aria-label={`查看公司主体${record.name}`} onClick={() => openModal('view', record)} />
            </Tooltip>
          )}
          {companyEntityPermissions.edit && (
            <Tooltip content="编辑">
              <Button className="hubx-icon-action" type="text" size="small" icon={<IconEdit />} aria-label={`编辑公司主体${record.name}`} onClick={() => openModal('edit', record)} />
            </Tooltip>
          )}
          {companyEntityPermissions.delete && (
            <Tooltip content="删除">
              <Popconfirm title="确定要删除该主体吗?" onOk={() => { Message.success('删除成功'); }}>
                <Button className="hubx-icon-action" type="text" size="small" status="danger" icon={<IconDelete />} aria-label={`删除公司主体${record.name}`} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell
      className="system-config-page"
      breadcrumbs={[{ label: '系统管理' }, { label: '公司主体' }]}
    >
      <PageHeader
        title="公司主体"
        description="维护签约、开票和收付款使用的公司主体及资料。"
        actions={companyEntityPermissions.create ? (
          <Button type="primary" icon={<IconPlus />} onClick={() => openModal('edit', null)}>新建主体</Button>
        ) : undefined}
      />

      <MetricGrid items={[
        { key: 'total', label: '主体总数', value: `${companyEntities.length} 家`, detail: '当前主体台账' },
        { key: 'active', label: '启用主体', value: `${companyEntities.filter(item => item.status === '启用').length} 家`, detail: '可用于业务单据', tone: 'success' },
        { key: 'accounts', label: '对公账户', value: `${companyEntities.reduce((sum, item) => sum + item.publicAccounts.length, 0)} 个`, detail: '全部主体账户' },
        { key: 'files', label: '主体资料', value: `${companyEntities.reduce((sum, item) => sum + item.files.length, 0)} 份`, detail: '资质与合同模板' },
      ]} />

      <SectionCard
        title="主体列表"
        className="system-config-card"
      >
        <DataTable
          columns={columns}
          data={companyEntities}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1350 }}
          caption={`共 ${companyEntities.length} 家公司主体`}
        />
      </SectionCard>

      <CompanyEntityInfoModal
        visible={modalVisible}
        mode={modalMode}
        defaultTab="basic"
        record={editingRecord}
        permissions={companyEntityPermissions}
        onOk={(values) => {
          if (editingRecord) {
            updateMockCompanyEntity(editingRecord.id, values);
            setCompanyEntities((items) => items.map((item) => (
              item.id === editingRecord.id ? { ...item, ...values } : item
            )));
          } else {
            const newEntity: CompanyEntityRecord = {
              id: `company-${Date.now()}`,
              name: '',
              shortName: '',
              taxNumber: '',
              legalPerson: '',
              registeredCapital: '',
              address: '',
              contactPhone: '',
              email: '',
              status: '启用',
              createTime: new Date().toISOString().slice(0, 10),
              invoiceTitle: '',
              invoiceTaxNumber: '',
              invoiceBankName: '',
              invoiceBankAccount: '',
              invoiceAddress: '',
              invoicePhone: '',
              publicAccounts: [],
              files: [],
              ...values,
            };
            addMockCompanyEntity(newEntity);
            setCompanyEntities((items) => [
              ...items,
              newEntity,
            ]);
          }
          Message.success(editingRecord ? '编辑成功' : '新建成功');
          setModalVisible(false);
        }}
        onCancel={() => setModalVisible(false)}
      />
    </PageShell>
  );
}
