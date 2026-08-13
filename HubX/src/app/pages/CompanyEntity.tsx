import { useState } from 'react';
import { Button, Card, Message, Popconfirm, Space, Table, Tag, Tooltip } from '@arco-design/web-react';
import { IconDelete, IconEdit, IconPlus, IconEye } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal, type CompanyEntityModalMode } from './company-entity/CompanyEntityInfoModal';
import {
  addMockCompanyEntity,
  companyEntityPermissions,
  mockCompanyEntities,
  type CompanyEntityRecord,
  updateMockCompanyEntity,
} from './company-entity/companyEntityData';

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
      render: (status: string) => <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createTime' },
    {
      title: '操作',
      render: (_: unknown, record: CompanyEntityRecord) => (
        <Space>
          {companyEntityPermissions.view && (
            <Tooltip content="查看">
              <Button type="text" size="small" icon={<IconEye />} onClick={() => openModal('view', record)} />
            </Tooltip>
          )}
          {companyEntityPermissions.edit && (
            <Tooltip content="编辑">
              <Button type="text" size="small" icon={<IconEdit />} onClick={() => openModal('edit', record)} />
            </Tooltip>
          )}
          {companyEntityPermissions.delete && (
            <Tooltip content="删除">
              <Popconfirm title="确定要删除该主体吗?" onOk={() => Message.success('删除成功')}>
                <Button type="text" size="small" status="danger" icon={<IconDelete />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        bordered={false}
        title="本公司主体管理"
        extra={
          companyEntityPermissions.create ? (
            <Button type="primary" icon={<IconPlus />} onClick={() => openModal('edit', null)}>
              新建主体
            </Button>
          ) : null
        }
      >
        <Table columns={columns} data={companyEntities} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

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
    </div>
  );
}
