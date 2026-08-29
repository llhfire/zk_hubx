import { useState } from 'react';
import {
  Card,
  Button,
  Switch,
  Tag,
  Space,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Popconfirm,
  Message,
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete } from '@arco-design/web-react/icon';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import './systemConfigConsistency.css';

const RadioGroup = Radio.Group;

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: 1 | 2;
  status: boolean;
  remark: string;
  order: number;
}

const LABOR_CATEGORY_ID = 'LABOR';

const initialCategories: ExpenseCategory[] = [
  { id: LABOR_CATEGORY_ID, name: '人力成本', code: 'LABOR', parentId: null, level: 1, status: true, remark: '由员工成本和日报工时自动核算', order: 1 },
  { id: 'TRAVEL', name: '差旅成本', code: 'TRAVEL', parentId: null, level: 1, status: true, remark: '项目差旅相关费用', order: 2 },
  { id: 'TRAVEL01', name: '交通', code: 'TRAVEL01', parentId: 'TRAVEL', level: 2, status: true, remark: '', order: 1 },
  { id: 'TRAVEL02', name: '高速', code: 'TRAVEL02', parentId: 'TRAVEL', level: 2, status: true, remark: '', order: 2 },
  { id: 'TRAVEL03', name: '油费', code: 'TRAVEL03', parentId: 'TRAVEL', level: 2, status: true, remark: '', order: 3 },
  { id: 'TRAVEL04', name: '住宿', code: 'TRAVEL04', parentId: 'TRAVEL', level: 2, status: true, remark: '', order: 4 },
  { id: 'TRAVEL05', name: '出差补贴', code: 'TRAVEL05', parentId: 'TRAVEL', level: 2, status: true, remark: '', order: 5 },
  { id: 'PROMOTION', name: '推广成本', code: 'PROMOTION', parentId: null, level: 1, status: true, remark: '项目推广投流费用', order: 3 },
  { id: 'PROMOTION01', name: '百度', code: 'PROMOTION01', parentId: 'PROMOTION', level: 2, status: true, remark: '', order: 1 },
  { id: 'PROMOTION02', name: '抖音', code: 'PROMOTION02', parentId: 'PROMOTION', level: 2, status: true, remark: '', order: 2 },
  { id: 'PROMOTION03', name: '小红书', code: 'PROMOTION03', parentId: 'PROMOTION', level: 2, status: true, remark: '', order: 3 },
  { id: 'PROMOTION04', name: '视频号', code: 'PROMOTION04', parentId: 'PROMOTION', level: 2, status: true, remark: '', order: 4 },
  { id: 'PROMOTION05', name: '其他投流', code: 'PROMOTION05', parentId: 'PROMOTION', level: 2, status: true, remark: '', order: 5 },
  { id: 'BUSINESS', name: '商务成本', code: 'BUSINESS', parentId: null, level: 1, status: true, remark: '项目商务活动费用', order: 4 },
  { id: 'BUSINESS02', name: '商务接待', code: 'BUSINESS02', parentId: 'BUSINESS', level: 2, status: true, remark: '', order: 1 },
  { id: 'BUSINESS03', name: '商务返点', code: 'BUSINESS03', parentId: 'BUSINESS', level: 2, status: true, remark: '', order: 2 },
  { id: 'THIRD_PARTY', name: '第三方费用', code: 'THIRD_PARTY', parentId: null, level: 1, status: true, remark: '项目第三方服务费用', order: 5 },
  { id: 'THIRD_PARTY01', name: '服务器', code: 'THIRD_PARTY01', parentId: 'THIRD_PARTY', level: 2, status: true, remark: '', order: 1 },
  { id: 'THIRD_PARTY02', name: '云服务', code: 'THIRD_PARTY02', parentId: 'THIRD_PARTY', level: 2, status: true, remark: '', order: 2 },
  { id: 'THIRD_PARTY03', name: 'Token', code: 'THIRD_PARTY03', parentId: 'THIRD_PARTY', level: 2, status: true, remark: '', order: 3 },
  { id: 'THIRD_PARTY04', name: '第三方软件', code: 'THIRD_PARTY04', parentId: 'THIRD_PARTY', level: 2, status: true, remark: '', order: 4 },
];

function buildTree(categories: ExpenseCategory[]) {
  const parents = categories.filter((c) => c.level === 1).sort((a, b) => a.order - b.order);
  return parents.map((p) => ({
    ...p,
    children: categories.filter((c) => c.parentId === p.id).sort((a, b) => a.order - b.order),
  }));
}

export function ExpenseCategoryManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [selectedParentId, setSelectedParentId] = useState('TRAVEL');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [form] = Form.useForm();
  const [formLevel, setFormLevel] = useState<1 | 2>(1);

  const tree = buildTree(categories);

  const parents = categories.filter((c) => c.level === 1 && c.status && c.id !== LABOR_CATEGORY_ID);

  const selectedParent = tree.find((parent) => parent.id === selectedParentId);
  const displayList = selectedParent?.children || [];
  const enabledCount = categories.filter((category) => category.status).length;

  const openCreate = (level: 1 | 2, parentId?: string) => {
    setEditing(null);
    setFormLevel(level);
    form.resetFields();
    form.setFieldsValue({ level, parentId: parentId || undefined });
    setModalVisible(true);
  };

  const openEdit = (record: ExpenseCategory) => {
    if (record.id === LABOR_CATEGORY_ID) return;
    setEditing(record);
    setFormLevel(record.level);
    form.setFieldsValue({
      level: record.level,
      parentId: record.parentId || undefined,
      name: record.name,
      code: record.code,
      remark: record.remark,
    });
    setModalVisible(true);
  };

  const handleToggleStatus = (id: string, val: boolean) => {
    if (id === LABOR_CATEGORY_ID) return;
    setCategories((prev) => prev.map((c) => {
      if (c.id === id) return { ...c, status: val };
      if (!val && c.parentId === id) return { ...c, status: false };
      return c;
    }));
  };

  const handleDelete = (record: ExpenseCategory) => {
    if (record.id === LABOR_CATEGORY_ID) return;
    if (record.level === 1) {
      const childCount = categories.filter((c) => c.parentId === record.id).length;
      if (childCount > 0) {
        Modal.confirm({
          title: '确认删除',
          content: `该分类下包含 ${childCount} 个二级分类，删除将导致关联业务报错，是否确认？`,
          okButtonProps: { status: 'danger' },
          onOk: () => {
            setCategories((prev) => prev.filter((c) => c.id !== record.id && c.parentId !== record.id));
            if (selectedParentId === record.id) {
              setSelectedParentId(tree.find((parent) => parent.id !== record.id && parent.id !== LABOR_CATEGORY_ID)?.id || '');
            }
            Message.success('已删除');
          },
        });
        return;
      }
    }
    setCategories((prev) => prev.filter((c) => c.id !== record.id));
    Message.success('已删除');
  };

  const handleSave = () => {
    form.validate().then((values) => {
      const codeExists = categories.some(
        (c) => c.code === values.code && (!editing || c.id !== editing.id)
      );
      if (codeExists) { Message.error('分类编码已存在，请修改'); return; }

      if (editing) {
        setCategories((prev) => prev.map((c) =>
          c.id === editing.id
            ? { ...c, ...values }
            : c
        ));
        Message.success('已更新');
      } else {
        const newCat: ExpenseCategory = {
          id: values.code,
          name: values.name,
          code: values.code,
          parentId: values.level === 2 ? values.parentId : null,
          level: values.level,
          status: true,
          remark: values.remark || '',
          order: categories.filter((c) => values.level === 1 ? c.level === 1 : c.parentId === values.parentId).length + 1,
        };
        setCategories((prev) => [...prev, newCat]);
        Message.success('已创建');
      }
      setModalVisible(false);
    });
  };

  return (
    <PageShell
      className="system-config-page"
      breadcrumbs={[{ label: '系统管理' }, { label: '费用分类' }]}
    >
      <PageHeader
        title="费用分类"
        description="维护项目成本核算使用的一级分类和费用小项。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => openCreate(1)}>新增一级分类</Button>}
      />

      <ProcessMetricGrid items={[
        { key: 'parents', label: '一级分类', value: tree.length, detail: '成本归集主类' },
        { key: 'children', label: '二级分类', value: categories.filter((category) => category.level === 2).length, detail: '费用核算小项' },
        { key: 'enabled', label: '已启用', value: enabledCount, detail: `共 ${categories.length} 项`, tone: 'success' },
        { key: 'locked', label: '系统内置', value: 1, detail: '人力成本不可删除' },
      ]} />

      <div className="system-config-master-detail">
        <Card className="system-config-card" title="一级分类" bodyStyle={{ padding: 8 }}>
          <div className="system-config-master-list">
            {tree.map((parent) => {
              const isLocked = parent.id === LABOR_CATEGORY_ID;
              const isSelected = parent.id === selectedParentId;
              return (
                <button
                  type="button"
                  key={parent.id}
                  disabled={isLocked}
                  onClick={() => !isLocked && setSelectedParentId(parent.id)}
                  className={`system-config-master-item${isSelected ? ' is-selected' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span>{parent.name}</span>
                  <Space size={4}>
                    {isLocked && <Tag size="small" color="gray">系统</Tag>}
                    {!parent.status && <Tag size="small" color="gray">停用</Tag>}
                    <span>{parent.children.length}</span>
                  </Space>
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          className="system-config-card"
          title={selectedParent ? `${selectedParent.name} · 二级分类` : '二级分类'}
          extra={selectedParent && (
            <Space>
              <Button size="small" icon={<IconEdit />} onClick={() => openEdit(selectedParent)}>编辑一级分类</Button>
              <Tooltip content="删除">
                <Popconfirm
                  title={`该分类下有 ${selectedParent.children.length} 个子分类，确认删除？`}
                  onOk={() => handleDelete(selectedParent)}
                >
                <Button size="small" status="danger" icon={<IconDelete />} aria-label="删除一级分类" />
                </Popconfirm>
              </Tooltip>
              <Button size="small" type="primary" icon={<IconPlus />} onClick={() => openCreate(2, selectedParent.id)}>
                新增二级分类
              </Button>
            </Space>
          )}
        >
          <div className="system-config-result-summary">
            <span>当前共 {displayList.length} 个二级分类</span>
            <span>{selectedParent?.status ? '一级分类已启用' : '一级分类已停用'}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table className="system-config-category-table">
            <thead>
              <tr>
                {['分类名称', '编码', '状态', '操作'].map((h) => (
                  <th key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayList.map((item) => {
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td className="system-config-category-table__code">
                      {item.code}
                    </td>
                    <td>
                      <Switch
                        checked={item.status}
                        size="small"
                        onChange={(v) => handleToggleStatus(item.id, v)}
                      />
                    </td>
                    <td>
                      <Space>
                        <Button type="text" size="small" icon={<IconEdit />} onClick={() => openEdit(item)}>编辑</Button>
                        <Popconfirm
                          title="确认删除该分类？"
                          onOk={() => handleDelete(item)}
                        >
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" aria-label={`删除${item.name}`} />
                        </Popconfirm>
                      </Space>
                    </td>
                  </tr>
                );
              })}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={4} className="system-config-category-empty">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>

      <Modal
        title={editing ? '编辑费用分类' : '新增费用分类'}
        visible={modalVisible}
        maskClosable={false}
        style={{ width: 560 }}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="保存"
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item label="分类级别" field="level" rules={[{ required: true }]}>
            <RadioGroup onChange={(v) => setFormLevel(v)}>
              <Radio value={1}>一级分类</Radio>
              <Radio value={2}>二级分类</Radio>
            </RadioGroup>
          </Form.Item>

          {formLevel === 2 && (
            <Form.Item label="所属父级" field="parentId" rules={[{ required: true, message: '请选择父级分类' }]}>
              <Select placeholder="请选择一级分类">
                {parents.map((p) => (
                  <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <div className="system-config-modal-grid">
            <Form.Item label="分类名称" field="name" rules={[{ required: true, message: '请输入分类名称' }]}>
              <Input placeholder="如：差旅费" />
            </Form.Item>
            <Form.Item label="分类编码" field="code" rules={[{ required: true, message: '请输入分类编码' }]}>
              <Input placeholder="如：B01（全局唯一）" />
            </Form.Item>
          </div>

          <Form.Item label="备注" field="remark">
            <Input.TextArea placeholder="分类说明或用途备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
