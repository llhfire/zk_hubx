import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Drawer, Form, Grid, Input, Message, Modal, Popconfirm, Select, Space, Table, Tag } from '@arco-design/web-react';
import { IconCopy, IconPlus } from '@arco-design/web-react/icon';
import ReactQuill from 'react-quill';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { contractSigningEntities } from '../company-entity/companyEntityData';
import { CONTRACT_TEMPLATE_VARIABLES, loadContractTemplates, publishContractTemplate, saveContractTemplates, validateTemplateVariables, type VersionedContractTemplate } from './templateStore';
import 'react-quill/dist/quill.snow.css';
import './contractTemplateManager.css';

const Row = Grid.Row;
const Col = Grid.Col;

export function ContractTemplateManager() {
  const [templates, setTemplates] = useState(loadContractTemplates);
  const [editing, setEditing] = useState<VersionedContractTemplate | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [form] = Form.useForm();
  const [html, setHtml] = useState('');

  useEffect(() => saveContractTemplates(templates), [templates]);
  const metrics = useMemo(() => ({ published: templates.filter((item) => item.status === 'published').length, draft: templates.filter((item) => item.status === 'draft').length, versions: templates.reduce((sum, item) => sum + item.versions.length, 0) }), [templates]);

  const openEditor = (template?: VersionedContractTemplate) => {
    const next = template ?? { id: `tpl-${Date.now()}`, name: '', signingEntity: contractSigningEntities[0]?.shortName ?? '中科软通', productCategories: ['软件开发'], status: 'draft', isDefault: false, draftHtml: '<h2>第一条 项目内容</h2><p>{{contractContent}}</p>', versions: [], updatedAt: new Date().toISOString() };
    setEditing(next);
    setHtml(next.draftHtml);
    form.setFieldsValue(next);
    setDrawerVisible(true);
  };

  const saveDraft = async () => {
    const values = await form.validate();
    const next = { ...editing!, ...values, draftHtml: html, status: editing?.status === 'disabled' ? 'disabled' : 'draft', updatedAt: new Date().toISOString() };
    setTemplates((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [next, ...current]);
    setEditing(next);
    Message.success('模板草稿已保存');
  };

  const publish = async () => {
    const values = await form.validate();
    const validation = validateTemplateVariables(html);
    if (validation.invalid.length) {
      Message.error(`未授权变量：${validation.invalid.join('、')}`);
      return;
    }
    try {
      const published = publishContractTemplate({ ...editing!, ...values, draftHtml: html }, '张三');
      setTemplates((current) => {
        const withoutCompetingDefault = published.isDefault ? current.map((item) => item.id !== published.id && item.signingEntity === published.signingEntity && item.productCategories.some((category) => published.productCategories.includes(category)) ? { ...item, isDefault: false } : item) : current;
        return withoutCompetingDefault.some((item) => item.id === published.id) ? withoutCompetingDefault.map((item) => item.id === published.id ? published : item) : [published, ...withoutCompetingDefault];
      });
      setEditing(published);
      Message.success(`模板 V${published.versions.at(-1)?.versionNo} 已发布；旧版本保持只读`);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '发布失败');
    }
  };

  const columns = [
    { title: '模板', dataIndex: 'name', width: 240, render: (_: string, record: VersionedContractTemplate) => <div><strong>{record.name}</strong><div className="table-secondary-text">{record.id}</div></div> },
    { title: '适用签约主体', dataIndex: 'signingEntity', width: 160 },
    { title: '产品分类', width: 220, render: (_: unknown, record: VersionedContractTemplate) => <Space wrap size={4}>{record.productCategories.map((item) => <Tag key={item}>{item}</Tag>)}</Space> },
    { title: '状态', width: 110, render: (_: unknown, record: VersionedContractTemplate) => <Badge status={record.status === 'published' ? 'success' : record.status === 'draft' ? 'processing' : 'default'} text={record.status === 'published' ? '已发布' : record.status === 'draft' ? '草稿' : '已停用'} /> },
    { title: '版本', width: 100, render: (_: unknown, record: VersionedContractTemplate) => record.versions.length ? `V${record.versions.at(-1)?.versionNo}` : '—' },
    { title: '默认', width: 80, render: (_: unknown, record: VersionedContractTemplate) => record.isDefault ? <Tag color="green">默认</Tag> : '—' },
    { title: '操作', width: 240, fixed: 'right' as const, render: (_: unknown, record: VersionedContractTemplate) => <Space size={4}>
      <Button type="text" size="small" onClick={() => openEditor(record)}>{record.status === 'published' ? '创建新版本' : '编辑'}</Button>
      <Button type="text" size="small" onClick={() => { setEditing(record); setHistoryVisible(true); }}>历史</Button>
      <Button type="text" size="small" icon={<IconCopy />} onClick={() => openEditor({ ...record, id: `tpl-${Date.now()}`, name: `${record.name}（副本）`, status: 'draft', isDefault: false, versions: [] })}>复制</Button>
      <Popconfirm title={record.status === 'disabled' ? '确认恢复为草稿？' : '停用不影响历史合同，确认停用？'} onOk={() => setTemplates((current) => current.map((item) => item.id === record.id ? { ...item, status: record.status === 'disabled' ? 'draft' : 'disabled', isDefault: false, updatedAt: new Date().toISOString() } : item))}><Button type="text" size="small" status={record.status === 'disabled' ? 'success' : 'warning'}>{record.status === 'disabled' ? '恢复' : '停用'}</Button></Popconfirm>
    </Space> },
  ];

  return <PageShell breadcrumbs={[{ label: '合同管理', to: '/contracts' }, { label: '合同模板' }]}>
    <PageHeader title="合同模板" description="按签约主体和产品分类维护可追溯的合同正文版本。" actions={<Button type="primary" icon={<IconPlus />} onClick={() => openEditor()}>新建模板</Button>} />
    <ProcessMetricGrid items={[{ key: 'all', label: '模板', value: `${templates.length} 个` }, { key: 'published', label: '已发布', value: `${metrics.published} 个`, tone: 'success' }, { key: 'draft', label: '待发布草稿', value: `${metrics.draft} 个` }, { key: 'versions', label: '历史版本', value: `${metrics.versions} 版` }]} />
    <Card><Table rowKey="id" columns={columns} data={templates} pagination={false} scroll={{ x: 1160 }} /></Card>

    <Drawer title={editing?.versions.length ? `创建新版本 · ${editing.name}` : '新建合同模板'} visible={drawerVisible} width={760} onCancel={() => setDrawerVisible(false)} footer={<Space><Button onClick={() => setDrawerVisible(false)}>关闭</Button><Button onClick={saveDraft}>保存草稿</Button><Button type="primary" onClick={publish}>发布新版本</Button></Space>}>
      <Alert type="info" content="已发布版本不可覆盖。发布后再编辑会生成下一版本，历史合同继续使用原正文快照。" showIcon />
      <Form form={form} layout="vertical" className="contract-template-form"><Row gutter={16}>
        <Col span={16}><Form.Item label="模板名称" field="name" rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={8}><Form.Item label="设为默认模板" field="isDefault"><Select><Select.Option value={true}>是</Select.Option><Select.Option value={false}>否</Select.Option></Select></Form.Item></Col>
        <Col span={12}><Form.Item label="适用签约主体" field="signingEntity" rules={[{ required: true }]}><Select>{contractSigningEntities.map((item) => <Select.Option key={item.id} value={item.shortName}>{item.shortName}</Select.Option>)}</Select></Form.Item></Col>
        <Col span={12}><Form.Item label="产品分类" field="productCategories" rules={[{ required: true }]}><Select mode="multiple" allowCreate>{['软件开发', '系统集成', '技术服务', '云服务', '移民服务'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></Form.Item></Col>
      </Row></Form>
      <div className="contract-template-variable-bar"><span>可用变量</span><Space wrap size={4}>{CONTRACT_TEMPLATE_VARIABLES.map((variable) => <Button key={variable} size="mini" onClick={() => setHtml((value) => `${value}<span>{{${variable}}}</span>`)}>{`{{${variable}}}`}</Button>)}</Space></div>
      <ReactQuill theme="snow" value={html} onChange={setHtml} className="contract-template-editor" modules={{ toolbar: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] }} />
    </Drawer>

    <Modal title={`版本历史 · ${editing?.name ?? ''}`} visible={historyVisible} onCancel={() => setHistoryVisible(false)} footer={<Button onClick={() => setHistoryVisible(false)}>关闭</Button>}>
      <div className="contract-template-history">{[...(editing?.versions ?? [])].reverse().map((version) => <div key={version.id}><strong>V{version.versionNo}</strong><span>{version.publishedAt.replace('T', ' ').slice(0, 16)} · {version.publishedBy}</span><span>{version.variables.length ? `变量：${version.variables.join('、')}` : '无变量'}</span></div>)}{editing?.versions.length === 0 && <p>尚未发布任何版本。</p>}</div>
    </Modal>
  </PageShell>;
}
