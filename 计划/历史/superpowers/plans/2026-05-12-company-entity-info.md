# Company Entity Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HubX 实现公司主体三 Tab 信息维护，并支持在线索列表只读打开公司资料 Tab。

**Architecture:** 将公司主体类型、mock 数据、权限和文件资料集中到 `company-entity` 子目录；新增 `CompanyEntityInfoModal` 作为管理页和线索页共用的三 Tab 弹窗。管理页以编辑/只读模式调用弹窗，线索页只读调用并默认打开公司资料 Tab。

**Tech Stack:** React 18、Vite 6、React Router v7、Arco Design React、TypeScript/TSX。

---

## Scope Check

本计划只覆盖已批准规格中的公司主体管理、线索列表查看入口、权限树原型展示。文件上传、后端接口、刷新后持久化不在本计划内。

## File Structure

- Create: `src/app/pages/company-entity/companyEntityData.ts`
  - 负责公司主体类型、权限类型、mock 公司主体数据、mock 文件资料、按名称查找主体、权限默认值。
- Create: `src/app/pages/company-entity/CompanyEntityInfoModal.tsx`
  - 负责三 Tab 弹窗；支持 `view`/`edit` 两种模式和 `basic`/`invoice`/`files` 默认 Tab。
- Modify: `src/app/pages/CompanyEntity.tsx`
  - 保留列表页面职责；改为使用共享 mock 数据和弹窗组件。
- Modify: `src/app/pages/UserPermission.tsx`
  - 在 `system-company` 下补充查看、新建、编辑、删除、资料维护权限项。
- Modify: `src/app/pages/MyLeads.tsx`
  - 将“对接主体”列改为可点击文本，打开只读弹窗并默认公司资料 Tab。
- Modify: `src/app/pages/PublicLeads.tsx`
  - 同 `MyLeads.tsx`。

---

### Task 1: Create shared company entity data module

**Files:**
- Create: `src/app/pages/company-entity/companyEntityData.ts`

- [ ] **Step 1: Create the data module**

Create `src/app/pages/company-entity/companyEntityData.ts` with this content:

```ts
export type CompanyFileType = 'pdf' | 'pptx';

export interface CompanyEntityFile {
  id: string;
  name: string;
  type: CompanyFileType;
  size: string;
  updatedAt: string;
  description: string;
}

export interface CompanyEntityRecord {
  id: string;
  name: string;
  shortName: string;
  taxNumber: string;
  legalPerson: string;
  registeredCapital: string;
  address: string;
  contactPhone: string;
  status: '启用' | '禁用';
  createTime: string;
  invoiceTitle: string;
  invoiceTaxNumber: string;
  invoiceBankName: string;
  invoiceBankAccount: string;
  invoiceAddress: string;
  invoicePhone: string;
  files: CompanyEntityFile[];
}

export interface CompanyEntityPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  files: boolean;
}

export const companyEntityPermissions: CompanyEntityPermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  files: true,
};

export const mockCompanyEntities: CompanyEntityRecord[] = [
  {
    id: '1',
    name: '中科软艺科技有限公司',
    shortName: '中科软艺',
    taxNumber: '91110000123456789A',
    legalPerson: '张三',
    registeredCapital: '1000万元',
    address: '北京市海淀区中关村大街1号',
    contactPhone: '010-88888888',
    status: '启用',
    createTime: '2020-01-01',
    invoiceTitle: '中科软艺科技有限公司',
    invoiceTaxNumber: '91110000123456789A',
    invoiceBankName: '中国工商银行北京海淀支行',
    invoiceBankAccount: '0200001234567890123',
    invoiceAddress: '北京市海淀区中关村大街1号',
    invoicePhone: '010-88888888',
    files: [
      {
        id: 'pdf-1',
        name: '中科软艺公司介绍.pdf',
        type: 'pdf',
        size: '2.4MB',
        updatedAt: '2026-05-01',
        description: '用于方案附件的不可编辑公司介绍资料',
      },
      {
        id: 'pptx-1',
        name: '中科软艺方案模板.pptx',
        type: 'pptx',
        size: '6.8MB',
        updatedAt: '2026-05-06',
        description: '用于方案和报价的可编辑模板',
      },
    ],
  },
  {
    id: '2',
    name: '软艺信息技术有限公司',
    shortName: '软艺信息',
    taxNumber: '91110000234567890B',
    legalPerson: '李四',
    registeredCapital: '500万元',
    address: '北京市朝阳区建国路2号',
    contactPhone: '010-99999999',
    status: '启用',
    createTime: '2021-06-15',
    invoiceTitle: '软艺信息技术有限公司',
    invoiceTaxNumber: '91110000234567890B',
    invoiceBankName: '中国建设银行北京朝阳支行',
    invoiceBankAccount: '0200002345678901234',
    invoiceAddress: '北京市朝阳区建国路2号',
    invoicePhone: '010-99999999',
    files: [
      {
        id: 'pdf-2',
        name: '软艺信息资质文件.pdf',
        type: 'pdf',
        size: '1.9MB',
        updatedAt: '2026-04-22',
        description: '用于报价附件的不可编辑资质资料',
      },
      {
        id: 'pptx-2',
        name: '软艺信息报价模板.pptx',
        type: 'pptx',
        size: '5.2MB',
        updatedAt: '2026-04-28',
        description: '用于报价和方案的可编辑模板',
      },
    ],
  },
  {
    id: '3',
    name: '中科集团有限公司',
    shortName: '中科集团',
    taxNumber: '91110000345678901C',
    legalPerson: '王五',
    registeredCapital: '5000万元',
    address: '北京市西城区金融街3号',
    contactPhone: '010-77777777',
    status: '启用',
    createTime: '2019-03-20',
    invoiceTitle: '中科集团有限公司',
    invoiceTaxNumber: '91110000345678901C',
    invoiceBankName: '中国银行北京西城支行',
    invoiceBankAccount: '0200003456789012345',
    invoiceAddress: '北京市西城区金融街3号',
    invoicePhone: '010-77777777',
    files: [
      {
        id: 'pdf-3',
        name: '中科集团公司资料.pdf',
        type: 'pdf',
        size: '3.1MB',
        updatedAt: '2026-04-18',
        description: '用于方案和报价的不可编辑公司资料',
      },
      {
        id: 'pptx-3',
        name: '中科集团通用方案模板.pptx',
        type: 'pptx',
        size: '7.4MB',
        updatedAt: '2026-05-03',
        description: '用于方案和报价的可编辑模板',
      },
    ],
  },
];

export function findCompanyEntityByName(name: string) {
  return mockCompanyEntities.find((item) => item.shortName === name || item.name === name);
}
```

- [ ] **Step 2: Run build to verify the new module compiles**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: build passes, or fails only with pre-existing unrelated TypeScript/encoding errors. If it fails because this new file has syntax errors, fix this task before continuing.

- [ ] **Step 3: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: `HubX/src/app/pages/company-entity/companyEntityData.ts` appears as untracked. Do not commit unless the user explicitly asks for commits.

---

### Task 2: Create reusable company entity modal

**Files:**
- Create: `src/app/pages/company-entity/CompanyEntityInfoModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `src/app/pages/company-entity/CompanyEntityInfoModal.tsx` with this content:

```tsx
import { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from '@arco-design/web-react';
import { IconDownload, IconEye, IconUpload } from '@arco-design/web-react/icon';
import type { CompanyEntityPermissions, CompanyEntityRecord } from './companyEntityData';

const FormItem = Form.Item;
const TabPane = Tabs.TabPane;

export type CompanyEntityModalMode = 'view' | 'edit';
export type CompanyEntityModalTab = 'basic' | 'invoice' | 'files';

interface CompanyEntityInfoModalProps {
  visible: boolean;
  mode: CompanyEntityModalMode;
  defaultTab?: CompanyEntityModalTab;
  record?: CompanyEntityRecord | null;
  permissions: CompanyEntityPermissions;
  showGoManage?: boolean;
  onOk?: (values: Partial<CompanyEntityRecord>) => void;
  onCancel: () => void;
  onGoManage?: () => void;
}

const emptyRecord: CompanyEntityRecord = {
  id: '',
  name: '',
  shortName: '',
  taxNumber: '',
  legalPerson: '',
  registeredCapital: '',
  address: '',
  contactPhone: '',
  status: '启用',
  createTime: '',
  invoiceTitle: '',
  invoiceTaxNumber: '',
  invoiceBankName: '',
  invoiceBankAccount: '',
  invoiceAddress: '',
  invoicePhone: '',
  files: [],
};

function buildDescriptions(record: CompanyEntityRecord, fields: Array<{ label: string; value: keyof CompanyEntityRecord }>) {
  return fields.map((field) => ({
    label: field.label,
    value: field.value === 'status'
      ? <Tag color={record.status === '启用' ? 'green' : 'red'}>{record.status}</Tag>
      : String(record[field.value] || '-'),
  }));
}

export function CompanyEntityInfoModal({
  visible,
  mode,
  defaultTab = 'basic',
  record,
  permissions,
  showGoManage = false,
  onOk,
  onCancel,
  onGoManage,
}: CompanyEntityInfoModalProps) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<CompanyEntityModalTab>(defaultTab);
  const currentRecord = record || emptyRecord;
  const readonly = mode === 'view';

  useEffect(() => {
    if (!visible) return;
    setActiveTab(defaultTab);
    form.setFieldsValue(currentRecord);
  }, [currentRecord, defaultTab, form, visible]);

  const handleOk = () => {
    if (readonly) {
      onCancel();
      return;
    }

    form.validate().then((values) => {
      onOk?.(values);
    });
  };

  const basicFields = [
    { label: '公司名称', value: 'name' as const },
    { label: '公司简称', value: 'shortName' as const },
    { label: '统一社会信用代码', value: 'taxNumber' as const },
    { label: '法定代表人', value: 'legalPerson' as const },
    { label: '注册资本', value: 'registeredCapital' as const },
    { label: '注册地址', value: 'address' as const },
    { label: '联系电话', value: 'contactPhone' as const },
    { label: '状态', value: 'status' as const },
  ];

  const invoiceFields = [
    { label: '开票抬头', value: 'invoiceTitle' as const },
    { label: '纳税人识别号', value: 'invoiceTaxNumber' as const },
    { label: '开户银行', value: 'invoiceBankName' as const },
    { label: '银行账号', value: 'invoiceBankAccount' as const },
    { label: '开票地址', value: 'invoiceAddress' as const },
    { label: '开票电话', value: 'invoicePhone' as const },
  ];

  const fileColumns = [
    { title: '资料名称', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => <Tag color={type === 'pdf' ? 'red' : 'arcoblue'}>{type.toUpperCase()}</Tag>,
    },
    { title: '大小', dataIndex: 'size', width: 100 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120 },
    { title: '说明', dataIndex: 'description' },
    {
      title: '操作',
      width: permissions.files && !readonly ? 210 : 140,
      render: (_: unknown, file: CompanyEntityRecord['files'][number]) => (
        <Space>
          <Button size="mini" type="text" icon={<IconEye />} onClick={() => Message.info(`查看资料：${file.name}`)}>
            查看
          </Button>
          <Button size="mini" type="text" icon={<IconDownload />} onClick={() => Message.info(`下载资料：${file.name}`)}>
            下载
          </Button>
          {permissions.files && !readonly && file.type === 'pptx' && (
            <Button size="mini" type="text" icon={<IconUpload />} onClick={() => Message.info('原型阶段不接真实上传')}>
              替换
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const footer = readonly ? (
    <Space>
      {showGoManage && permissions.edit && (
        <Button type="primary" onClick={onGoManage}>
          去公司主体管理维护
        </Button>
      )}
      <Button onClick={onCancel}>关闭</Button>
    </Space>
  ) : undefined;

  return (
    <Modal
      title={readonly ? '公司主体详情' : record ? '编辑公司主体' : '新建公司主体'}
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      footer={footer}
      autoFocus={false}
      focusLock
      style={{ width: 860 }}
    >
      <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as CompanyEntityModalTab)}>
        <TabPane key="basic" title="基础信息">
          {readonly ? (
            <Descriptions column={2} data={buildDescriptions(currentRecord, basicFields)} />
          ) : (
            <Form form={form} layout="vertical">
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <FormItem label="公司名称" field="name" rules={[{ required: true, message: '请输入公司名称' }]}>
                    <Input placeholder="请输入公司全称" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="公司简称" field="shortName" rules={[{ required: true, message: '请输入公司简称' }]}>
                    <Input placeholder="请输入公司简称" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="统一社会信用代码" field="taxNumber" rules={[{ required: true, message: '请输入统一社会信用代码' }]}>
                    <Input placeholder="请输入统一社会信用代码" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="法定代表人" field="legalPerson">
                    <Input placeholder="请输入法定代表人" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="注册资本" field="registeredCapital">
                    <Input placeholder="如：1000万元" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="联系电话" field="contactPhone">
                    <Input placeholder="请输入联系电话" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={18}>
                  <FormItem label="注册地址" field="address">
                    <Input placeholder="请输入注册地址" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={6}>
                  <FormItem label="状态" field="status" initialValue="启用">
                    <Select>
                      <Select.Option value="启用">启用</Select.Option>
                      <Select.Option value="禁用">禁用</Select.Option>
                    </Select>
                  </FormItem>
                </Grid.Col>
              </Grid.Row>
            </Form>
          )}
        </TabPane>
        <TabPane key="invoice" title="开票信息">
          {readonly ? (
            <Descriptions column={2} data={buildDescriptions(currentRecord, invoiceFields)} />
          ) : (
            <Form form={form} layout="vertical">
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <FormItem label="开票抬头" field="invoiceTitle" rules={[{ required: true, message: '请输入开票抬头' }]}>
                    <Input placeholder="请输入开票抬头" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="纳税人识别号" field="invoiceTaxNumber" rules={[{ required: true, message: '请输入纳税人识别号' }]}>
                    <Input placeholder="请输入纳税人识别号" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="开户银行" field="invoiceBankName" rules={[{ required: true, message: '请输入开户银行' }]}>
                    <Input placeholder="请输入开户银行" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="银行账号" field="invoiceBankAccount" rules={[{ required: true, message: '请输入银行账号' }]}>
                    <Input placeholder="请输入银行账号" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="开票地址" field="invoiceAddress" rules={[{ required: true, message: '请输入开票地址' }]}>
                    <Input placeholder="请输入开票地址" />
                  </FormItem>
                </Grid.Col>
                <Grid.Col span={12}>
                  <FormItem label="开票电话" field="invoicePhone" rules={[{ required: true, message: '请输入开票电话' }]}>
                    <Input placeholder="请输入开票电话" />
                  </FormItem>
                </Grid.Col>
              </Grid.Row>
            </Form>
          )}
        </TabPane>
        <TabPane key="files" title="公司资料">
          {currentRecord.files.length === 0 ? (
            <Empty description="暂无公司资料" />
          ) : (
            <Table columns={fileColumns} data={currentRecord.files} rowKey="id" pagination={false} />
          )}
          {permissions.files && !readonly && (
            <Button style={{ marginTop: 16 }} icon={<IconUpload />} onClick={() => Message.info('原型阶段不接真实上传')}>
              上传资料
            </Button>
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
}
```

- [ ] **Step 2: Run build to catch component issues**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: PASS. If it fails, fix only errors introduced by `CompanyEntityInfoModal.tsx` before continuing.

- [ ] **Step 3: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: `CompanyEntityInfoModal.tsx` appears as untracked. Do not commit unless the user explicitly asks for commits.

---

### Task 3: Refactor company entity management page to use the shared modal

**Files:**
- Modify: `src/app/pages/CompanyEntity.tsx`

- [ ] **Step 1: Replace the page implementation**

Replace the content of `src/app/pages/CompanyEntity.tsx` with:

```tsx
import { useState } from 'react';
import { Button, Card, Message, Popconfirm, Space, Table, Tag } from '@arco-design/web-react';
import { IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import { CompanyEntityInfoModal, type CompanyEntityModalMode } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  mockCompanyEntities,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';

export function CompanyEntity() {
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
            <Button type="text" size="small" onClick={() => openModal('view', record)}>
              查看
            </Button>
          )}
          {companyEntityPermissions.edit && (
            <Button type="text" size="small" icon={<IconEdit />} onClick={() => openModal('edit', record)}>
              编辑
            </Button>
          )}
          {companyEntityPermissions.delete && (
            <Popconfirm title="确定要删除该主体吗?" onOk={() => Message.success('删除成功')}>
              <Button type="text" size="small" status="danger" icon={<IconDelete />}>
                删除
              </Button>
            </Popconfirm>
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
        <Table columns={columns} data={mockCompanyEntities} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <CompanyEntityInfoModal
        visible={modalVisible}
        mode={modalMode}
        defaultTab="basic"
        record={editingRecord}
        permissions={companyEntityPermissions}
        onOk={() => {
          Message.success(editingRecord ? '编辑成功' : '新建成功');
          setModalVisible(false);
        }}
        onCancel={() => setModalVisible(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run build**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: PASS.

- [ ] **Step 3: Manual browser check**

If the dev server is not running, run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run dev -- --host 0.0.0.0
```

Open `/system/company` and verify:

- Page still shows the company entity table.
- “查看” opens a read-only modal with three tabs.
- “编辑” opens editable fields.
- “新建主体” opens editable modal with basic tab selected.
- “公司资料” tab shows PDF and PPTX mock files.

- [ ] **Step 4: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: `HubX/src/app/pages/CompanyEntity.tsx` is modified. Do not commit unless the user explicitly asks for commits.

---

### Task 4: Add detailed company permissions to user permission tree

**Files:**
- Modify: `src/app/pages/UserPermission.tsx`

- [ ] **Step 1: Replace the `system-company` leaf with children**

In `mockPermissionTree`, replace:

```tsx
{ title: '本公司主体管理', key: 'system-company' },
```

with:

```tsx
{
  title: '本公司主体管理',
  key: 'system-company',
  children: [
    { title: '查看公司主体', key: 'system-company-view' },
    { title: '新建公司主体', key: 'system-company-create' },
    { title: '编辑公司主体', key: 'system-company-edit' },
    { title: '删除公司主体', key: 'system-company-delete' },
    { title: '维护公司资料', key: 'system-company-files' },
  ],
},
```

- [ ] **Step 2: Run build**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: PASS.

- [ ] **Step 3: Manual browser check**

Open `/system/permission` and verify the permission tree shows “本公司主体管理” with five child permission items.

- [ ] **Step 4: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: `HubX/src/app/pages/UserPermission.tsx` is modified. Do not commit unless the user explicitly asks for commits.

---

### Task 5: Add company entity read-only modal to My Leads

**Files:**
- Modify: `src/app/pages/MyLeads.tsx`

- [ ] **Step 1: Add imports**

Add these imports near the existing imports:

```tsx
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
```

- [ ] **Step 2: Add selected company state**

Inside `MyLeads`, after the existing modal state declarations, add:

```tsx
const [companyModalVisible, setCompanyModalVisible] = useState(false);
const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);
```

- [ ] **Step 3: Add click handler**

Inside `MyLeads`, before `const columns = [`, add:

```tsx
const handleOpenCompanyEntity = (entityName: string) => {
  if (!companyEntityPermissions.view) {
    Message.warning('暂无权限查看公司主体详情');
    return;
  }

  const companyEntity = findCompanyEntityByName(entityName);
  if (!companyEntity) {
    Message.warning('未找到公司主体信息');
    return;
  }

  setSelectedCompanyEntity(companyEntity);
  setCompanyModalVisible(true);
};
```

- [ ] **Step 4: Replace the entity column**

Replace:

```tsx
{ title: '对接主体', dataIndex: 'entity', width: 120 },
```

with:

```tsx
{
  title: '对接主体',
  dataIndex: 'entity',
  width: 120,
  render: (entity: string) => (
    <Button type="text" size="mini" onClick={() => handleOpenCompanyEntity(entity)}>
      {entity}
    </Button>
  ),
},
```

- [ ] **Step 5: Render the modal**

Before the final closing `</div>` in the component return, add:

```tsx
<CompanyEntityInfoModal
  visible={companyModalVisible}
  mode="view"
  defaultTab="files"
  record={selectedCompanyEntity}
  permissions={companyEntityPermissions}
  showGoManage
  onCancel={() => setCompanyModalVisible(false)}
  onGoManage={() => navigate('/system/company')}
/>
```

If the return already ends with several modals, place this modal after the existing modals but still inside the root `<div>`.

- [ ] **Step 6: Run build**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: PASS.

- [ ] **Step 7: Manual browser check**

Open `/leads/my` and verify:

- “对接主体” values render as clickable text buttons.
- Clicking a subject opens the company modal.
- The default selected tab is “公司资料”.
- The modal is read-only.
- “去公司主体管理维护” is visible and navigates to `/system/company`.

- [ ] **Step 8: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: `HubX/src/app/pages/MyLeads.tsx` is modified. Do not commit unless the user explicitly asks for commits.

---

### Task 6: Add company entity read-only modal to Public Leads

**Files:**
- Modify: `src/app/pages/PublicLeads.tsx`

- [ ] **Step 1: Add imports**

Add these imports near the existing imports:

```tsx
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
```

- [ ] **Step 2: Add selected company state**

Inside `PublicLeads`, after the existing modal state declarations, add:

```tsx
const [companyModalVisible, setCompanyModalVisible] = useState(false);
const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);
```

- [ ] **Step 3: Add click handler**

Inside `PublicLeads`, before `const columns = [`, add:

```tsx
const handleOpenCompanyEntity = (entityName: string) => {
  if (!companyEntityPermissions.view) {
    Message.warning('暂无权限查看公司主体详情');
    return;
  }

  const companyEntity = findCompanyEntityByName(entityName);
  if (!companyEntity) {
    Message.warning('未找到公司主体信息');
    return;
  }

  setSelectedCompanyEntity(companyEntity);
  setCompanyModalVisible(true);
};
```

- [ ] **Step 4: Replace the entity column**

Replace:

```tsx
{ title: '对接主体', dataIndex: 'entity', width: 120 },
```

with:

```tsx
{
  title: '对接主体',
  dataIndex: 'entity',
  width: 120,
  render: (entity: string) => (
    <Button type="text" size="mini" onClick={() => handleOpenCompanyEntity(entity)}>
      {entity}
    </Button>
  ),
},
```

- [ ] **Step 5: Render the modal**

Before the final closing `</div>` in the component return, add:

```tsx
<CompanyEntityInfoModal
  visible={companyModalVisible}
  mode="view"
  defaultTab="files"
  record={selectedCompanyEntity}
  permissions={companyEntityPermissions}
  showGoManage
  onCancel={() => setCompanyModalVisible(false)}
  onGoManage={() => navigate('/system/company')}
/>
```

If the return already ends with several modals, place this modal after the existing modals but still inside the root `<div>`.

- [ ] **Step 6: Run build**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: PASS.

- [ ] **Step 7: Manual browser check**

Open `/leads/public` and verify:

- “对接主体” values render as clickable text buttons.
- Clicking a subject opens the company modal.
- The default selected tab is “公司资料”.
- The modal is read-only.
- “去公司主体管理维护” is visible and navigates to `/system/company`.

- [ ] **Step 8: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: `HubX/src/app/pages/PublicLeads.tsx` is modified. Do not commit unless the user explicitly asks for commits.

---

### Task 7: Final verification

**Files:**
- Verify: all files modified above

- [ ] **Step 1: Run production build**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run build
```

Expected: PASS.

- [ ] **Step 2: Start dev server for UI verification**

Run:

```powershell
npm --prefix "D:\AIwork\OA\HubX" run dev -- --host 0.0.0.0
```

Expected: Vite prints a local and network URL.

- [ ] **Step 3: Verify company management page**

Open `/system/company` and verify:

- Company table renders.
- New/edit/view use the shared modal.
- Management page modal defaults to “基础信息”.
- “开票信息” tab shows invoice fields.
- “公司资料” tab shows PDF/PPTX rows and placeholder actions.

- [ ] **Step 4: Verify permission page**

Open `/system/permission` and verify:

- “本公司主体管理” expands to five children: 查看、新建、编辑、删除、维护公司资料。

- [ ] **Step 5: Verify lead list entry points**

Open `/leads/my` and `/leads/public` and verify:

- 对接主体 is clickable.
- Clicking opens read-only modal.
- Modal defaults to “公司资料”.
- “去公司主体管理维护” navigates to `/system/company`.

- [ ] **Step 6: Inspect final diff**

Run:

```powershell
git diff -- "D:\AIwork\OA\HubX\src\app\pages\CompanyEntity.tsx" "D:\AIwork\OA\HubX\src\app\pages\UserPermission.tsx" "D:\AIwork\OA\HubX\src\app\pages\MyLeads.tsx" "D:\AIwork\OA\HubX\src\app\pages\PublicLeads.tsx" "D:\AIwork\OA\HubX\src\app\pages\company-entity"
```

Expected: diff only contains the company entity feature changes described in this plan.

- [ ] **Step 7: Git checkpoint**

Run:

```powershell
git status --short
```

Expected: changed files are limited to the plan, spec, and implementation files. Do not commit unless the user explicitly asks for commits.

---

## Self-Review

- Spec coverage: management page three tabs, lead read-only modal defaulting to company files, mock file list, permission tree additions, no backend upload, and final build/browser verification are all covered.
- Placeholder scan: no TBD/TODO/fill-in-later instructions remain; each code-changing task includes exact snippets.
- Type consistency: `CompanyEntityRecord`, `CompanyEntityPermissions`, `CompanyEntityInfoModal`, `CompanyEntityModalMode`, `defaultTab="files"`, and permission property names match across tasks.
