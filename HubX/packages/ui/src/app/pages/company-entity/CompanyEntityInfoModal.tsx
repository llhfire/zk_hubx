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
  Upload,
  type UploadItem,
} from '@arco-design/web-react';
import { IconDelete, IconDownload, IconEdit, IconPlus, IconUpload } from '@arco-design/web-react/icon';
import type {
  CompanyEntityPermissions,
  CompanyEntityRecord,
  CompanyFileCategory,
  CompanyFileType,
  CompanyPublicAccount,
} from './companyEntityData';

const FormItem = Form.Item;
const TabPane = Tabs.TabPane;

export type CompanyEntityModalMode = 'view' | 'edit';
export type CompanyEntityModalTab = 'basic' | 'invoice' | 'public-account' | 'files';

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
  email: '',
  status: '启用',
  createTime: '',
  invoiceTitle: '',
  invoiceTaxNumber: '',
  invoiceBankName: '',
  invoiceBankAccount: '',
  invoiceAddress: '',
  invoicePhone: '',
  publicAccounts: [],
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
  const [uploadForm] = Form.useForm();
  const [publicAccountForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<CompanyEntityModalTab>(defaultTab);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [publicAccounts, setPublicAccounts] = useState<CompanyPublicAccount[]>([]);
  const [companyFiles, setCompanyFiles] = useState<CompanyEntityRecord['files']>([]);
  const [uploadFileList, setUploadFileList] = useState<UploadItem[]>([]);
  const [publicAccountModalVisible, setPublicAccountModalVisible] = useState(false);
  const [editingPublicAccount, setEditingPublicAccount] = useState<CompanyPublicAccount | null>(null);
  const currentRecord = record || emptyRecord;
  const readonly = mode === 'view';

  useEffect(() => {
    if (!visible) return;
    setActiveTab(defaultTab);
    form.setFieldsValue(currentRecord);
    setPublicAccounts(currentRecord.publicAccounts || []);
    setCompanyFiles(currentRecord.files || []);
    setUploadFileList([]);
  }, [currentRecord, defaultTab, form, visible]);

  const handleOk = () => {
    if (readonly) {
      onCancel();
      return;
    }

    form.validate().then((values) => {
      onOk?.({ ...values, publicAccounts, files: companyFiles });
    });
  };

  const openPublicAccountModal = (account: CompanyPublicAccount | null) => {
    setEditingPublicAccount(account);
    publicAccountForm.setFieldsValue(account || { accountNo: '', bankName: '' });
    setPublicAccountModalVisible(true);
  };

  const savePublicAccount = () => {
    publicAccountForm.validate().then((values) => {
      if (editingPublicAccount) {
        setPublicAccounts((items) => items.map((item) => (
          item.id === editingPublicAccount.id ? { ...item, ...values } : item
        )));
        Message.success('对公账户已更新');
      } else {
        setPublicAccounts((items) => [
          ...items,
          { id: `public-account-${Date.now()}`, accountNo: values.accountNo, bankName: values.bankName },
        ]);
        Message.success('对公账户已新增');
      }
      setPublicAccountModalVisible(false);
      publicAccountForm.resetFields();
    });
  };

  const removePublicAccount = (id: string) => {
    setPublicAccounts((items) => items.filter((item) => item.id !== id));
    Message.success('对公账户已删除');
  };

  const handleUploadSubmit = () => {
    uploadForm.validate().then((values) => {
      const uploadFile = uploadFileList[0];
      if (!uploadFile) {
        Message.error('请选择文件');
        return;
      }
      const fileName = uploadFile.name || values.name.trim();
      const extension = fileName.split('.').pop()?.toLowerCase();
      const type: CompanyFileType = extension === 'doc' || extension === 'docx' || extension === 'pptx'
        ? extension
        : 'pdf';
      const category = values.category as CompanyFileCategory;
      if (category === '合同模板' && type !== 'doc' && type !== 'docx') {
        Message.error('合同模板仅支持上传 DOC 或 DOCX 文件');
        return;
      }
      const bytes = uploadFile.originFile?.size ?? 0;
      const newFile = {
        id: `company-file-${Date.now()}`,
        name: fileName,
        type,
        category,
        contractTemplateId: category === '合同模板' ? 'software_sales' : undefined,
        size: bytes ? `${Math.max(1, Math.ceil(bytes / 1024))}KB` : '—',
        updatedAt: new Date().toISOString().slice(0, 10),
        description: values.description?.trim() || '',
        blobUrl: uploadFile.originFile ? URL.createObjectURL(uploadFile.originFile) : undefined,
      };
      setCompanyFiles((items) => category === '合同模板'
        ? [...items.filter((item) => item.category !== '合同模板'), newFile]
        : [...items, newFile]);
      Message.success('资料上传成功');
      setUploadVisible(false);
      uploadForm.resetFields();
      setUploadFileList([]);
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
    { label: '邮箱', value: 'email' as const },
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
    {
      title: '资料类型',
      dataIndex: 'category',
      width: 110,
      render: (category?: CompanyFileCategory) => <Tag color={category === '合同模板' ? 'arcoblue' : 'gray'}>{category || '公司资料'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 120 },
    { title: '说明', dataIndex: 'description' },
    {
      title: '操作',
      width: permissions.files && !readonly ? 140 : 140,
      render: (_: unknown, file: CompanyEntityRecord['files'][number]) => (
        <Space>

          <Button
            size="mini"
            type="text"
            icon={<IconDownload />}
            disabled={!file.blobUrl}
            title={file.blobUrl ? '下载原文件' : '演示资料仅保留元数据'}
            onClick={() => {
              if (!file.blobUrl) return;
              const link = document.createElement('a');
              link.href = file.blobUrl;
              link.download = file.name;
              link.click();
            }}
          >
            下载
          </Button>
          {permissions.files && !readonly && (
            <Button
              size="mini"
              type="text"
              status="danger"
              icon={<IconDelete />}
              onClick={() => {
                setCompanyFiles((items) => items.filter((item) => item.id !== file.id));
                Message.success(`已删除资料：${file.name}`);
              }}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const publicAccountColumns = [
    { title: '对公账户号', dataIndex: 'accountNo' },
    { title: '开户行', dataIndex: 'bankName' },
    ...(!readonly ? [{
      title: '操作',
      width: 150,
      render: (_: unknown, account: CompanyPublicAccount) => (
        <Space>
          <Button size="mini" type="text" icon={<IconEdit />} onClick={() => openPublicAccountModal(account)}>
            编辑
          </Button>
          <Button size="mini" type="text" status="danger" icon={<IconDelete />} onClick={() => removePublicAccount(account.id)}>
            删除
          </Button>
        </Space>
      ),
    }] : []),
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
                <Grid.Col span={12}>
                  <FormItem label="邮箱" field="email" rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}>
                    <Input placeholder="请输入邮箱" />
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
        <TabPane key="public-account" title="对公账户">
          {publicAccounts.length === 0 ? (
            <Empty description="暂无对公账户" />
          ) : (
            <Table columns={publicAccountColumns} data={publicAccounts} rowKey="id" pagination={false} />
          )}
          {!readonly && (
            <Button style={{ marginTop: 16 }} type="primary" icon={<IconPlus />} onClick={() => openPublicAccountModal(null)}>
              新增对公账户
            </Button>
          )}
        </TabPane>
        <TabPane key="files" title="公司资料">
          {currentRecord.files.length === 0 ? (
            <Empty description="暂无公司资料" />
          ) : (
            <Table columns={fileColumns} data={currentRecord.files} rowKey="id" pagination={false} />
          )}
          {permissions.files && !readonly && (
            <Button
              style={{ marginTop: 16 }}
              type="primary"
              icon={<IconUpload />}
              onClick={() => {
                uploadForm.setFieldsValue({ category: '公司资料' });
                setUploadFileList([]);
                setUploadVisible(true);
              }}
            >
              上传资料
            </Button>
          )}
        </TabPane>
      </Tabs>
      <Modal
        title={editingPublicAccount ? '编辑对公账户' : '新增对公账户'}
        visible={publicAccountModalVisible}
        onOk={savePublicAccount}
        onCancel={() => {
          setPublicAccountModalVisible(false);
          setEditingPublicAccount(null);
          publicAccountForm.resetFields();
        }}
        autoFocus={false}
        focusLock
        style={{ width: 520 }}
      >
        <Form form={publicAccountForm} layout="vertical">
          <FormItem label="对公账户号" field="accountNo" rules={[{ required: true, message: '请输入对公账户号' }]}>
            <Input placeholder="请输入对公账户号" />
          </FormItem>
          <FormItem label="开户行" field="bankName" rules={[{ required: true, message: '请输入开户行' }]}>
            <Input placeholder="请输入开户行" />
          </FormItem>
        </Form>
      </Modal>
      <Modal
        title="上传资料"
        visible={uploadVisible}
        onOk={handleUploadSubmit}
        onCancel={() => {
          setUploadVisible(false);
          uploadForm.resetFields();
        }}
        autoFocus={false}
        focusLock
        style={{ width: 520 }}
      >
        <Form form={uploadForm} layout="vertical">
          <FormItem label="资料类型" field="category" rules={[{ required: true, message: '请选择资料类型' }]}>
            <Select>
              <Select.Option value="公司资料">公司资料</Select.Option>
              <Select.Option value="合同模板">合同模板</Select.Option>
            </Select>
          </FormItem>
          <FormItem label="资料名称" field="name" rules={[{ required: true, message: '请输入资料名称' }]}>
            <Input placeholder="请输入资料名称" />
          </FormItem>
          <FormItem label="说明" field="description">
            <Input.TextArea placeholder="请输入资料说明" rows={3} />
          </FormItem>
          <FormItem label="选择文件" required>
            <Upload
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              autoUpload={false}
              limit={1}
              fileList={uploadFileList}
              onChange={(files) => {
                setUploadFileList(files);
                if (files[0]?.name) uploadForm.setFieldsValue({ name: files[0].name });
              }}
            >
              <Button icon={<IconUpload />}>选择文件</Button>
            </Upload>
          </FormItem>
        </Form>
      </Modal>
    </Modal>
  );
}
