import { useState } from 'react';
import {
  Card,
  Button,
  Switch,
  Tag,
  Space,
  Typography,
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

const { Title, Text } = Typography;
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
  { id: 'BUSINESS01', name: '商务差旅', code: 'BUSINESS01', parentId: 'BUSINESS', level: 2, status: true, remark: '', order: 1 },
  { id: 'BUSINESS02', name: '商务接待', code: 'BUSINESS02', parentId: 'BUSINESS', level: 2, status: true, remark: '', order: 2 },
  { id: 'BUSINESS03', name: '商务返点', code: 'BUSINESS03', parentId: 'BUSINESS', level: 2, status: true, remark: '', order: 3 },
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
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <Title heading={4} style={{ margin: 0 }}>费用分类管理</Title>
          <Text type="secondary">维护项目成本核算使用的一级分类和费用小项</Text>
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={() => openCreate(1)}>新增一级分类</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <Card title="一级分类" bodyStyle={{ padding: 8 }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {tree.map((parent) => {
              const isLocked = parent.id === LABOR_CATEGORY_ID;
              const isSelected = parent.id === selectedParentId;
              return (
                <div
                  key={parent.id}
                  onClick={() => !isLocked && setSelectedParentId(parent.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 4,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isLocked ? 'var(--color-fill-2)' : isSelected ? 'rgb(var(--primary-1))' : 'transparent',
                    color: isLocked ? 'var(--color-text-4)' : isSelected ? 'rgb(var(--primary-6))' : 'var(--color-text-1)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span>{parent.name}</span>
                  <Space size={4}>
                    {isLocked && <Tag size="small" color="gray">系统</Tag>}
                    {!parent.status && <Tag size="small" color="gray">停用</Tag>}
                    <Text type="secondary">{parent.children.length}</Text>
                  </Space>
                </div>
              );
            })}
          </Space>
        </Card>

        <Card
          title={selectedParent ? `${selectedParent.name} · 二级分类` : '二级分类'}
          extra={selectedParent && (
            <Space>
              <Button size="small" icon={<IconEdit />} onClick={() => openEdit(selectedParent)}>编辑一级分类</Button>
              <Tooltip content="删除">
                <Popconfirm
                  title={`该分类下有 ${selectedParent.children.length} 个子分类，确认删除？`}
                  onOk={() => handleDelete(selectedParent)}
                >
                  <Button size="small" status="danger" icon={<IconDelete />} />
                </Popconfirm>
              </Tooltip>
              <Button size="small" type="primary" icon={<IconPlus />} onClick={() => openCreate(2, selectedParent.id)}>
                新增二级分类
              </Button>
            </Space>
          )}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--color-fill-2)', borderBottom: '1px solid var(--color-border-2)' }}>
                {['分类名称', '编码', '状态', '操作'].map((h) => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--color-text-2)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayList.map((item) => {
                return (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--color-border-2)' }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--color-text-2)' }}>
                      {item.code}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Switch
                        checked={item.status}
                        size="small"
                        onChange={(v) => handleToggleStatus(item.id, v)}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Space>
                        <Button type="text" size="small" icon={<IconEdit />} onClick={() => openEdit(item)}>编辑</Button>
                        <Popconfirm
                          title="确认删除该分类？"
                          onOk={() => handleDelete(item)}
                        >
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" />
                        </Popconfirm>
                      </Space>
                    </td>
                  </tr>
                );
              })}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)' }}>
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
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
    </div>
  );
}
