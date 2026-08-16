import { useMemo, useState } from 'react';
import { Button, Form, Grid, Input, InputNumber, Message, Modal, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import './LeadFeatureListPanel.css';

const FormItem = Form.Item;
const { Text } = Typography;

export interface LeadFeatureItem { id: string; name: string; description?: string; workdays?: number }
export interface LeadFeatureModule { id: string; name: string; features: LeadFeatureItem[] }
export interface LeadBusinessEnd { id: string; name: string; modules: LeadFeatureModule[] }

export const initialLeadBusinessEnds: LeadBusinessEnd[] = [
  { id: 'end-client', name: '客户端', modules: [
    { id: 'module-account', name: '个人中心', features: [
      { id: 'feature-profile', name: '个人资料', description: '支持查看和修改头像、昵称、联系方式等基础资料。', workdays: 2 },
      { id: 'feature-address', name: '收货地址', description: '支持新增、编辑、删除及设置默认收货地址。', workdays: 2.5 },
    ] },
    { id: 'module-order', name: '订单中心', features: [
      { id: 'feature-order-list', name: '订单列表', description: '按订单状态查看全部、待付款、待发货和已完成订单。', workdays: 3 },
    ] },
  ] },
  { id: 'end-admin', name: '管理后台', modules: [
    { id: 'module-user', name: '用户管理', features: [
      { id: 'feature-user-list', name: '用户列表', description: '支持按姓名、手机号和注册时间查询用户。', workdays: 2 },
    ] },
  ] },
];

type EditorType = 'end' | 'module' | 'feature';
interface EditorState { type: EditorType; endId?: string; moduleId?: string; itemId?: string }

export function LeadFeatureListPanel({ value, onChange }: { value?: LeadBusinessEnd[]; onChange?: (value: LeadBusinessEnd[]) => void }) {
  const [internalBusinessEnds, setInternalBusinessEnds] = useState(initialLeadBusinessEnds);
  const businessEnds = value ?? internalBusinessEnds;
  const setBusinessEnds = (updater: (current: LeadBusinessEnd[]) => LeadBusinessEnd[]) => {
    const next = updater(businessEnds);
    if (onChange) onChange(next);
    else setInternalBusinessEnds(next);
  };
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form] = Form.useForm();
  const summary = useMemo(() => {
    const modules = businessEnds.flatMap(item => item.modules);
    const features = modules.flatMap(item => item.features);
    return { ends: businessEnds.length, modules: modules.length, features: features.length, workdays: features.reduce((sum, item) => sum + (item.workdays ?? 0), 0) };
  }, [businessEnds]);

  const openEditor = (next: EditorState) => {
    form.resetFields();
    if (next.itemId) {
      const end = businessEnds.find(item => item.id === next.endId);
      const module = end?.modules.find(item => item.id === next.moduleId);
      const item = next.type === 'end' ? end : next.type === 'module' ? module : module?.features.find(feature => feature.id === next.itemId);
      form.setFieldsValue(item);
    }
    setEditor(next);
  };

  const saveEditor = () => form.validate().then(values => {
    if (!editor) return;
    const id = editor.itemId || `${editor.type}-${Date.now()}`;
    setBusinessEnds(current => {
      if (editor.type === 'end') return editor.itemId ? current.map(end => end.id === id ? { ...end, name: values.name.trim() } : end) : [...current, { id, name: values.name.trim(), modules: [] }];
      return current.map(end => end.id !== editor.endId ? end : {
        ...end,
        modules: editor.type === 'module'
          ? (editor.itemId ? end.modules.map(module => module.id === id ? { ...module, name: values.name.trim() } : module) : [...end.modules, { id, name: values.name.trim(), features: [] }])
          : end.modules.map(module => module.id !== editor.moduleId ? module : { ...module, features: editor.itemId ? module.features.map(feature => feature.id === id ? { ...feature, name: values.name.trim(), description: values.description?.trim() || undefined, workdays: values.workdays == null ? undefined : Number(values.workdays) } : feature) : [...module.features, { id, name: values.name.trim(), description: values.description?.trim() || undefined, workdays: values.workdays == null ? undefined : Number(values.workdays) }] }),
      });
    });
    Message.success(editor.itemId ? '已保存修改' : '已新增');
    setEditor(null);
  });

  const confirmRemove = (type: EditorType, endId: string, moduleId?: string, itemId?: string) => {
    const label = type === 'end' ? '业务端' : type === 'module' ? '模块' : '功能点';
    Modal.confirm({ title: `删除${label}`, content: `确认删除该${label}吗？${type === 'feature' ? '' : '其下内容将一并删除。'}`, onOk: () => {
      setBusinessEnds(current => type === 'end' ? current.filter(end => end.id !== endId) : current.map(end => end.id !== endId ? end : { ...end, modules: type === 'module' ? end.modules.filter(module => module.id !== moduleId) : end.modules.map(module => module.id !== moduleId ? module : { ...module, features: module.features.filter(feature => feature.id !== itemId) }) }));
      Message.success(`${label}已删除`);
    } });
  };

  return <div className="lead-feature-panel">
    <div className="lead-feature-header">
      <div><div className="lead-feature-title">功能清单</div><Text type="secondary">按业务端和模块梳理需求范围与评估工时</Text></div>
      <Button type="primary" icon={<IconPlus />} onClick={() => openEditor({ type: 'end' })}>新增业务端</Button>
    </div>
    <div className="lead-feature-summary">
      {[['业务端', summary.ends], ['模块', summary.modules], ['功能点', summary.features], ['总工时', `${summary.workdays} 人天`]].map(([label, value]) => <div key={label} className="lead-feature-summary-item"><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <div className="lead-feature-tree">
      {businessEnds.map((end, index) => <details key={end.id} className="lead-feature-end-node" open>
        <summary className="lead-feature-end-row">
          <div className="lead-feature-node-main"><span className="lead-feature-caret" /><span className="lead-feature-end-index">{String(index + 1).padStart(2, '0')}</span><strong>{end.name}</strong><Tag>{end.modules.length} 个模块</Tag></div>
          <Space onClick={event => { event.preventDefault(); event.stopPropagation(); }}><Button size="small" icon={<IconPlus />} onClick={() => openEditor({ type: 'module', endId: end.id })}>新增模块</Button><Button type="text" size="small" icon={<IconEdit />} onClick={() => openEditor({ type: 'end', endId: end.id, itemId: end.id })} /><Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => confirmRemove('end', end.id)} /></Space>
        </summary>
        <div className="lead-feature-end-children">
          {end.modules.length ? end.modules.map(module => <details key={module.id} className="lead-feature-module-node" open>
            <summary className="lead-feature-module-row">
              <div className="lead-feature-node-main"><span className="lead-feature-caret" /><span className="lead-feature-module-icon" /><strong>{module.name}</strong><Text type="secondary">{module.features.length} 个功能点</Text></div>
              <Space onClick={event => { event.preventDefault(); event.stopPropagation(); }}><Button type="text" size="small" icon={<IconPlus />} onClick={() => openEditor({ type: 'feature', endId: end.id, moduleId: module.id })}>新增功能点</Button><Button type="text" size="mini" icon={<IconEdit />} onClick={() => openEditor({ type: 'module', endId: end.id, moduleId: module.id, itemId: module.id })} /><Button type="text" size="mini" status="danger" icon={<IconDelete />} onClick={() => confirmRemove('module', end.id, module.id)} /></Space>
            </summary>
            <div className="lead-feature-module-children">
              {module.features.length ? module.features.map((feature, featureIndex) => <article key={feature.id} className="lead-feature-leaf">
                <span className="lead-feature-leaf-dot" />
                <div className="lead-feature-leaf-content">
                  <div className="lead-feature-leaf-top"><div className="lead-feature-name"><span>{String(featureIndex + 1).padStart(2, '0')}</span><strong>{feature.name}</strong></div><div className="lead-feature-leaf-meta">{feature.workdays != null && <Tag color="arcoblue">{feature.workdays} 人天</Tag>}<Button type="text" size="mini" icon={<IconEdit />} onClick={() => openEditor({ type: 'feature', endId: end.id, moduleId: module.id, itemId: feature.id })} /><Button type="text" size="mini" status="danger" icon={<IconDelete />} onClick={() => confirmRemove('feature', end.id, module.id, feature.id)} /></div></div>
                  {feature.description && <p>{feature.description}</p>}
                </div>
              </article>) : <div className="lead-feature-empty lead-feature-leaf-empty">暂无功能点，点击右上方“新增功能点”开始梳理</div>}
            </div>
          </details>) : <div className="lead-feature-empty">暂无模块，请先新增模块</div>}
        </div>
      </details>)}
    </div>

    <Modal title={`${editor?.itemId ? '编辑' : '新增'}${editor?.type === 'end' ? '业务端' : editor?.type === 'module' ? '模块' : '功能点'}`} visible={editor !== null} onOk={saveEditor} onCancel={() => setEditor(null)} maskClosable={false} style={{ width: editor?.type === 'feature' ? 680 : 480 }}>
      <Form form={form} layout="vertical">
        {editor?.type === 'end' && <FormItem label="业务端" field="name" rules={[{ required: true, message: '请输入业务端' }]}><Select allowCreate showSearch placeholder="例如：客户端、管理后台、小程序、APP 端">{['客户端', '管理后台', '小程序', 'APP 端'].map(item => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem>}
        {editor?.type === 'module' && <FormItem label="模块名" field="name" rules={[{ required: true, message: '请输入模块名' }]}><Input placeholder="例如：个人中心、登录、订单中心" maxLength={50} /></FormItem>}
        {editor?.type === 'feature' && <><Grid.Row gutter={16}><Grid.Col span={16}><FormItem label="功能点" field="name" rules={[{ required: true, message: '请输入功能点' }]}><Input placeholder="请输入功能点名称" maxLength={100} /></FormItem></Grid.Col><Grid.Col span={8}><FormItem label="工时（人天）" field="workdays"><InputNumber min={0.5} step={0.5} precision={1} placeholder="选填" style={{ width: '100%' }} /></FormItem></Grid.Col></Grid.Row><FormItem label="功能说明" field="description"><Input.TextArea rows={4} maxLength={500} showWordLimit placeholder="选填，说明功能范围、使用场景和业务规则" /></FormItem></>}
      </Form>
    </Modal>
  </div>;
}
