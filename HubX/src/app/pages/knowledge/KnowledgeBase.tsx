import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tree,
  Tooltip,
  Typography,
  Upload,
} from '@arco-design/web-react';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';
import {
  IconBranch,
  IconDelete,
  IconDownload,
  IconEdit,
  IconFile,
  IconFolder,
  IconPlus,
  IconSearch,
} from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;
const SelectOption = Select.Option;
const Text = Typography.Text;

type DocCategory = 'tech' | 'sop' | 'template' | 'review' | 'other';
type Permission = 'internal' | 'all';

interface KnowledgeDocument {
  id: string;
  title: string;
  category: DocCategory;
  author: string;
  department: string;
  permission: Permission;
  fileName: string;
  fileSize: string;
  description: string;
  updatedAt: string;
  views: number;
  sourceFile?: File;
}

const ORGANIZATION_TREE = [
  {
    key: 'company',
    title: '总公司',
    children: [
      {
        key: 'technology',
        title: '技术部',
        children: [
          { key: 'frontend', title: '前端组' },
          { key: 'backend', title: '后端组' },
        ],
      },
      {
        key: 'sales',
        title: '销售部',
        children: [
          { key: 'east', title: '华东区' },
          { key: 'north', title: '华北区' },
        ],
      },
      { key: 'product', title: '产品部' },
      { key: 'administration', title: '行政部' },
      { key: 'hr', title: '人事部' },
      { key: 'finance', title: '财务部' },
    ],
  },
];

const ORGANIZATION_LABELS: Record<string, string> = {
  company: '总公司',
  technology: '技术部',
  frontend: '前端组',
  backend: '后端组',
  sales: '销售部',
  east: '华东区',
  north: '华北区',
  product: '产品部',
  administration: '行政部',
  hr: '人事部',
  finance: '财务部',
};

const ORGANIZATION_SCOPE: Record<string, string[]> = {
  company: Object.values(ORGANIZATION_LABELS),
  technology: ['技术部', '前端组', '后端组'],
  frontend: ['前端组'],
  backend: ['后端组'],
  sales: ['销售部', '华东区', '华北区'],
  east: ['华东区'],
  north: ['华北区'],
  product: ['产品部'],
  administration: ['行政部'],
  hr: ['人事部'],
  finance: ['财务部'],
};

const CATEGORY_LABELS: Record<DocCategory, string> = {
  tech: '技术方案',
  sop: 'SOP 流程',
  template: '模板',
  review: '项目复盘',
  other: '其他',
};

const PERMISSION_META: Record<Permission, { label: string; color: string; description: string }> = {
  internal: {
    label: '内部公开',
    color: 'arcoblue',
    description: '仅归属部门及下级组织成员可查看',
  },
  all: {
    label: '所有人可查看',
    color: 'green',
    description: 'HubX 内所有员工均可查看',
  },
};

const PREVIEWABLE_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'md', 'csv',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function canPreview(fileName: string) {
  return PREVIEWABLE_EXTENSIONS.has(getFileExtension(fileName));
}

const initialDocuments: KnowledgeDocument[] = [
  { id: 'doc-1', title: 'React 性能优化最佳实践', category: 'tech', author: '黄丽', department: '前端组', permission: 'internal', fileName: 'React性能优化最佳实践.pdf', fileSize: '2.4 MB', description: 'React 应用性能优化的常见手段与检查清单。', updatedAt: '2026-07-25', views: 45 },
  { id: 'doc-2', title: '项目交付 SOP 流程 v2.0', category: 'sop', author: '徐强', department: '技术部', permission: 'all', fileName: '项目交付SOP-v2.0.docx', fileSize: '680 KB', description: '从需求确认到项目验收的标准交付流程。', updatedAt: '2026-07-22', views: 128 },
  { id: 'doc-3', title: '微服务架构设计指南', category: 'tech', author: '李四', department: '后端组', permission: 'internal', fileName: '微服务架构设计指南.pdf', fileSize: '3.1 MB', description: '微服务拆分、服务通信与数据一致性实践。', updatedAt: '2026-07-18', views: 67 },
  { id: 'doc-4', title: '标准报价单模板', category: 'template', author: '赵玲', department: '财务部', permission: 'all', fileName: '标准报价单模板.xlsx', fileSize: '96 KB', description: '包含项目明细、税率与付款方式的报价模板。', updatedAt: '2026-07-15', views: 89 },
  { id: 'doc-5', title: '销售线索跟进规范', category: 'sop', author: '钱七', department: '销售部', permission: 'internal', fileName: '销售线索跟进规范.docx', fileSize: '520 KB', description: '销售线索分级、跟进频率和记录要求。', updatedAt: '2026-07-12', views: 54 },
  { id: 'doc-6', title: '产品需求评审模板', category: 'template', author: '林小红', department: '产品部', permission: 'all', fileName: '产品需求评审模板.docx', fileSize: '330 KB', description: '产品需求评审会议使用的标准模板。', updatedAt: '2026-07-10', views: 76 },
  { id: 'doc-7', title: '客户项目复盘报告', category: 'review', author: '张三', department: '技术部', permission: 'internal', fileName: '客户项目复盘报告.pdf', fileSize: '1.8 MB', description: '项目目标、交付结果和经验改进总结。', updatedAt: '2026-07-08', views: 32 },
  { id: 'doc-8', title: 'HubX 桌面端安装包', category: 'other', author: '李四', department: '技术部', permission: 'internal', fileName: 'HubX-desktop-v1.2.zip', fileSize: '86 MB', description: 'HubX 桌面端安装文件，仅支持下载。', updatedAt: '2026-07-05', views: 18 },
];

export function KnowledgeBase() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedOrganization, setSelectedOrganization] = useState('company');
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileList, setFileList] = useState<UploadItem[]>([]);
  const [originalAttachmentRemoved, setOriginalAttachmentRemoved] = useState(false);
  const [form] = Form.useForm();

  const selectedLabel = ORGANIZATION_LABELS[selectedOrganization];
  const selectedScope = ORGANIZATION_SCOPE[selectedOrganization] || [selectedLabel];

  const departmentDocuments = useMemo(
    () => documents.filter((document) => selectedScope.includes(document.department)),
    [documents, selectedScope],
  );

  const filteredDocuments = useMemo(() => departmentDocuments.filter((document) => {
    if (activeCategory !== 'all' && document.category !== activeCategory) return false;
    if (keyword && !`${document.title}${document.fileName}`.toLowerCase().includes(keyword.toLowerCase())) return false;
    return true;
  }), [activeCategory, departmentDocuments, keyword]);

  const organizationCounts = useMemo(() => Object.fromEntries(
    Object.entries(ORGANIZATION_SCOPE).map(([key, scope]) => [
      key,
      documents.filter((document) => scope.includes(document.department)).length,
    ]),
  ), [documents]);

  const openUpload = () => {
    setEditingDoc(null);
    setFileList([]);
    setOriginalAttachmentRemoved(false);
    form.resetFields();
    form.setFieldsValue({
      category: 'other',
      permission: 'internal',
    });
    setModalVisible(true);
  };

  const openEdit = (document: KnowledgeDocument) => {
    if (!CURRENT_LOGIN_USER.isAdmin && document.author !== CURRENT_LOGIN_USER.name) {
      Message.warning('仅文档上传者或管理员可以编辑');
      return;
    }
    setEditingDoc(document);
    setFileList([]);
    setOriginalAttachmentRemoved(false);
    form.setFieldsValue(document);
    setModalVisible(true);
  };

  const submitDocument = async () => {
    try {
      const values = await form.validate();
      if (!editingDoc && fileList.length === 0) {
        Message.warning('请选择需要上传的文档');
        return;
      }
      if (editingDoc && originalAttachmentRemoved && fileList.length === 0) {
        Message.warning('删除原附件后，请上传新的附件');
        return;
      }

      if (editingDoc) {
        const replacement = fileList[0];
        setDocuments((current) => current.map((document) => document.id === editingDoc.id ? {
          ...document,
          ...values,
          fileName: replacement?.name || document.fileName,
          fileSize: replacement?.size ? `${Math.max(1, Math.round(replacement.size / 1024))} KB` : document.fileSize,
          sourceFile: (replacement?.originFile as File | undefined) || document.sourceFile,
          updatedAt: '2026-07-29',
        } : document));
        Message.success('文档信息已更新');
      } else {
        const file = fileList[0];
        const newDocument: KnowledgeDocument = {
          id: `doc-${Date.now()}`,
          title: values.title,
          category: values.category,
          author: CURRENT_LOGIN_USER.name,
          department: selectedLabel,
          permission: values.permission,
          fileName: file.name || values.title,
          fileSize: file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : '-',
          description: values.description || '',
          updatedAt: '2026-07-29',
          views: 0,
          sourceFile: file.originFile as File | undefined,
        };
        setDocuments((current) => [newDocument, ...current]);
        Message.success('文档上传成功');
      }
      setModalVisible(false);
    } catch {
      // Form displays field-level validation errors.
    }
  };

  const downloadDocument = (document: KnowledgeDocument) => {
    const blob = document.sourceFile || new Blob(
      [`${document.title}\n\n${document.description}\n\n当前文件为 HubX 前端演示内容。`],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewDoc(null);
  };

  const openDocument = (document: KnowledgeDocument) => {
    if (!canPreview(document.fileName)) {
      downloadDocument(document);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(document.sourceFile ? URL.createObjectURL(document.sourceFile) : '');
    setPreviewDoc(document);
    setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, views: item.views + 1 } : item));
  };

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'title',
      render: (_: unknown, document: KnowledgeDocument) => (
        <div className="flex items-center gap-3">
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary-light-1)', color: 'rgb(var(--primary-6))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconFile />
          </div>
          <div style={{ minWidth: 0 }}>
            <Button type="text" style={{ height: 'auto', padding: 0, fontWeight: 500 }} onClick={() => openDocument(document)}>
              {document.title}
            </Button>
            <button
              type="button"
              onClick={() => openDocument(document)}
              style={{ display: 'block', marginTop: 4, padding: 0, border: 0, background: 'transparent', color: 'var(--color-text-3)', fontSize: 12, cursor: 'pointer' }}
            >
              {document.fileName} · {document.fileSize}
            </button>
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 105,
      render: (category: DocCategory) => <Tag>{CATEGORY_LABELS[category]}</Tag>,
    },
    {
      title: '归属组织',
      dataIndex: 'department',
      width: 110,
    },
    {
      title: '查看权限',
      dataIndex: 'permission',
      width: 125,
      render: (permission: Permission) => <Tag color={PERMISSION_META[permission].color}>{PERMISSION_META[permission].label}</Tag>,
    },
    {
      title: '上传人',
      dataIndex: 'author',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 110,
    },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, document: KnowledgeDocument) => {
        const canManage = CURRENT_LOGIN_USER.isAdmin || document.author === CURRENT_LOGIN_USER.name;
        return canManage ? (
          <Space size={4}>
            <Tooltip content="编辑">
              <Button type="text" size="small" icon={<IconEdit />} onClick={() => openEdit(document)} />
            </Tooltip>
            <Tooltip content="删除">
              <Popconfirm title="确定删除该文档吗？" onOk={() => setDocuments((current) => current.filter((item) => item.id !== document.id))}>
                <Button type="text" size="small" status="danger" icon={<IconDelete />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ) : <Text type="secondary">无操作权限</Text>;
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div>
          <Typography.Title heading={5} style={{ margin: 0 }}>知识库</Typography.Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 7 }}>按组织沉淀和管理业务文档，权限以文档归属组织为边界。</Text>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <Card
          title={<Space><IconBranch /><span>组织架构</span></Space>}
          style={{ position: 'sticky', top: 16, borderRadius: 'var(--radius-lg)' }}
          bodyStyle={{ padding: 12 }}
        >
          <Tree
            blockNode
            defaultExpandAll
            selectedKeys={[selectedOrganization]}
            treeData={ORGANIZATION_TREE}
            onSelect={(keys) => keys[0] && setSelectedOrganization(String(keys[0]))}
            renderTitle={(node) => {
              const nodeKey = Object.entries(ORGANIZATION_LABELS).find(([, label]) => label === String(node.title))?.[0] || '';
              return (
              <div className="flex items-center justify-between" style={{ width: '100%', paddingRight: 4 }}>
                <span>{node.title}</span>
                <span
                  style={{
                    minWidth: 22,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: 'var(--color-fill-2)',
                    color: 'var(--color-text-3)',
                    fontSize: 12,
                    lineHeight: '18px',
                    textAlign: 'center',
                  }}
                >
                  {organizationCounts[nodeKey] || 0}
                </span>
              </div>
              );
            }}
          />
        </Card>

        <Space direction="vertical" size={16} style={{ width: '100%', minWidth: 0 }}>
          <Card
            title={
              <Space>
                <IconFolder />
                <span>{selectedLabel}知识库</span>
              </Space>
            }
            style={{ borderRadius: 'var(--radius-lg)' }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-2)' }}>
              <div className="flex items-center justify-between" style={{ gap: 12 }}>
                <Space wrap>
                  <Input
                    value={keyword}
                    onChange={setKeyword}
                    allowClear
                    prefix={<IconSearch />}
                    placeholder="搜索文档名称或文件名"
                    style={{ width: 230 }}
                  />
                </Space>
                <Button type="primary" icon={<IconPlus />} onClick={openUpload}>上传至{selectedLabel}</Button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {(['all', 'tech', 'sop', 'template', 'review', 'other'] as const).map((category) => (
                  <Button
                    key={category}
                    size="small"
                    type={activeCategory === category ? 'primary' : 'secondary'}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category === 'all' ? '全部文档' : CATEGORY_LABELS[category]}
                  </Button>
                ))}
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <Empty description="当前条件下暂无文档" style={{ padding: 48 }} />
            ) : (
              <Table
                columns={columns}
                data={filteredDocuments}
                rowKey="id"
                pagination={{ pageSize: 8, showTotal: true }}
                borderCell={false}
              />
            )}
          </Card>
        </Space>
      </div>

      <Modal
        title={editingDoc ? '编辑文档' : '上传知识库文档'}
        visible={modalVisible}
        onOk={submitDocument}
        onCancel={() => setModalVisible(false)}
        okText={editingDoc ? '保存' : '确认上传'}
        style={{ width: 620 }}
        autoFocus={false}
      >
        <Form form={form} layout="vertical">
          {!editingDoc ? (
            <FormItem label="选择文件" required>
              <Upload
                drag
                autoUpload={false}
                limit={1}
                fileList={fileList}
                onChange={setFileList}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.rar,.7z,.exe,.dmg,.apk"
                tip="支持文档、图片、压缩包及安装包，当前为前端模拟上传"
              />
            </FormItem>
          ) : (
            <FormItem label="附件">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {!originalAttachmentRemoved ? (
                  <div className="flex items-center justify-between" style={{ padding: '10px 12px', border: '1px solid var(--color-border-2)', borderRadius: 6, background: 'var(--color-fill-1)' }}>
                    <Space>
                      <IconFile style={{ color: 'rgb(var(--primary-6))' }} />
                      <div>
                        <div style={{ fontSize: 13 }}>{editingDoc.fileName}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{editingDoc.fileSize}</Text>
                      </div>
                    </Space>
                    <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => setOriginalAttachmentRemoved(true)}>
                      删除
                    </Button>
                  </div>
                ) : null}
                {originalAttachmentRemoved && fileList.length === 0 ? (
                  <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--color-danger-light-1)', color: 'rgb(var(--danger-6))', fontSize: 13 }}>
                    原附件已移除，请上传新文件后保存。
                  </div>
                ) : null}
                {originalAttachmentRemoved ? (
                  <Upload
                    drag
                    autoUpload={false}
                    limit={1}
                    fileList={fileList}
                    onChange={setFileList}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.rar,.7z,.exe,.dmg,.apk"
                    tip="请选择新的附件"
                  />
                ) : null}
              </Space>
            </FormItem>
          )}
          <FormItem label="文档名称" field="title" rules={[{ required: true, message: '请输入文档名称' }]}>
            <Input placeholder="请输入便于检索的文档名称" />
          </FormItem>
          <Row gutter={16}>
            <Col span={12}>
              <FormItem label="归属组织">
                <div style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', borderRadius: 4, background: 'var(--color-fill-2)', color: 'var(--color-text-2)' }}>
                  {editingDoc?.department || selectedLabel}
                </div>
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem label="文档分类" field="category" rules={[{ required: true, message: '请选择文档分类' }]}>
                <Select placeholder="请选择分类">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => <SelectOption key={key} value={key}>{label}</SelectOption>)}
                </Select>
              </FormItem>
            </Col>
          </Row>
          <FormItem label="查看权限" field="permission" rules={[{ required: true, message: '请选择查看权限' }]}>
            <Select placeholder="请选择查看权限">
              {Object.entries(PERMISSION_META).map(([key, meta]) => (
                <SelectOption key={key} value={key}>
                  <div>
                    <div>{meta.label}</div>
                    <div style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{meta.description}</div>
                  </div>
                </SelectOption>
              ))}
            </Select>
          </FormItem>
          <FormItem label="文档说明" field="description">
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="简要说明文档内容和适用场景" />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={previewDoc?.title || '文件预览'}
        visible={Boolean(previewDoc)}
        onCancel={closePreview}
        footer={
          <Space>
            <Button onClick={closePreview}>关闭</Button>
            {previewDoc && <Button icon={<IconDownload />} onClick={() => downloadDocument(previewDoc)}>下载文件</Button>}
          </Space>
        }
        style={{ width: 820 }}
      >
        {previewDoc && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Tag>{CATEGORY_LABELS[previewDoc.category]}</Tag>
              <Tag color={PERMISSION_META[previewDoc.permission].color}>{PERMISSION_META[previewDoc.permission].label}</Tag>
            </Space>
            <Descriptions
              column={2}
              data={[
                { label: '文件名称', value: previewDoc.fileName },
                { label: '文件大小', value: previewDoc.fileSize },
                { label: '归属组织', value: previewDoc.department },
                { label: '上传人', value: previewDoc.author },
                { label: '更新时间', value: previewDoc.updatedAt },
                { label: '阅读次数', value: `${previewDoc.views + 1} 次` },
              ]}
            />
            {previewUrl && IMAGE_EXTENSIONS.has(getFileExtension(previewDoc.fileName)) ? (
              <div style={{ height: 460, padding: 16, borderRadius: 8, background: 'var(--color-fill-1)', textAlign: 'center' }}>
                <img src={previewUrl} alt={previewDoc.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : previewUrl && getFileExtension(previewDoc.fileName) === 'pdf' ? (
              <iframe title={previewDoc.title} src={previewUrl} style={{ width: '100%', height: 460, border: '1px solid var(--color-border-2)', borderRadius: 8 }} />
            ) : (
              <div style={{ minHeight: 300, padding: 32, borderRadius: 8, background: 'var(--color-fill-1)' }}>
                <div style={{ maxWidth: 600, margin: '0 auto', padding: 28, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-2)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' }}>
                  <Typography.Title heading={5} style={{ marginTop: 0 }}>{previewDoc.title}</Typography.Title>
                  <Text type="secondary">{previewDoc.description || '暂无文档说明'}</Text>
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border-2)', color: 'var(--color-text-3)', fontSize: 12 }}>
                    当前为前端模拟预览；正式接入后将在此加载文件实际内容。
                  </div>
                </div>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
