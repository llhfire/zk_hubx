import { useState } from 'react';
import {
  Card,
  Grid,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Message,
  Popconfirm,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete, IconEye } from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;

// 模拟字典分类数据
const mockDictTypes = [
  { id: '1', code: 'customer_source', name: '客户来源', description: '客户来源渠道分类', status: '启用', createTime: '2020-01-01' },
  { id: '2', code: 'customer_level', name: '客户等级', description: '客户价值等级分类', status: '启用', createTime: '2020-01-01' },
  { id: '3', code: 'lead_status', name: '线索状态', description: '线索跟进状态分类', status: '启用', createTime: '2020-01-01' },
  { id: '4', code: 'lead_tag', name: '线索标签', description: '线索业务类型标签', status: '启用', createTime: '2020-01-01' },
  { id: '5', code: 'industry', name: '所属行业', description: '客户所属行业分类', status: '启用', createTime: '2020-01-01' },
];

// 模拟字典项数据
const mockDictItems: Record<string, any[]> = {
  '1': [
    { id: '1-1', label: '百度推广', value: 'baidu', sort: 1, status: '启用', remark: '百度搜索推广渠道' },
    { id: '1-2', label: '抖音推广', value: 'douyin', sort: 2, status: '启用', remark: '抖音信息流推广' },
    { id: '1-3', label: '小红书', value: 'xiaohongshu', sort: 3, status: '启用', remark: '小红书推广渠道' },
    { id: '1-4', label: '展会', value: 'exhibition', sort: 4, status: '启用', remark: '线下展会获客' },
    { id: '1-5', label: '老客户推荐', value: 'referral', sort: 5, status: '启用', remark: '老客户转介绍' },
  ],
  '2': [
    { id: '2-1', label: 'VIP客户', value: 'vip', sort: 1, status: '启用', remark: '年签约额>100万' },
    { id: '2-2', label: 'A级客户', value: 'a', sort: 2, status: '启用', remark: '年签约额50-100万' },
    { id: '2-3', label: 'B级客户', value: 'b', sort: 3, status: '启用', remark: '年签约额10-50万' },
    { id: '2-4', label: 'C级客户', value: 'c', sort: 4, status: '启用', remark: '年签约额<10万' },
  ],
  '3': [
    { id: '3-1', label: '未联系', value: 'not_contacted', sort: 1, status: '启用', remark: '' },
    { id: '3-2', label: '未接通', value: 'no_answer', sort: 2, status: '启用', remark: '' },
    { id: '3-3', label: '初步沟通', value: 'initial_contact', sort: 3, status: '启用', remark: '' },
    { id: '3-4', label: '需求调研', value: 'requirement', sort: 4, status: '启用', remark: '' },
    { id: '3-5', label: '方案报价', value: 'quotation', sort: 5, status: '启用', remark: '' },
    { id: '3-6', label: '合同洽谈', value: 'negotiation', sort: 6, status: '启用', remark: '' },
    { id: '3-7', label: '已签单', value: 'signed', sort: 7, status: '启用', remark: '' },
    { id: '3-8', label: '已终止', value: 'terminated', sort: 8, status: '启用', remark: '' },
  ],
  '4': [
    { id: '4-1', label: 'APP开发', value: 'app', sort: 1, status: '启用', remark: '' },
    { id: '4-2', label: '小程序', value: 'miniprogram', sort: 2, status: '启用', remark: '' },
    { id: '4-3', label: '管理系统', value: 'system', sort: 3, status: '启用', remark: '' },
    { id: '4-4', label: 'CMS系统', value: 'cms', sort: 4, status: '启用', remark: '' },
    { id: '4-5', label: '电商平台', value: 'ecommerce', sort: 5, status: '启用', remark: '' },
  ],
  '5': [
    { id: '5-1', label: '互联网', value: 'internet', sort: 1, status: '启用', remark: '' },
    { id: '5-2', label: '金融', value: 'finance', sort: 2, status: '启用', remark: '' },
    { id: '5-3', label: '教育', value: 'education', sort: 3, status: '启用', remark: '' },
    { id: '5-4', label: '医疗', value: 'healthcare', sort: 4, status: '启用', remark: '' },
    { id: '5-5', label: '制造业', value: 'manufacturing', sort: 5, status: '启用', remark: '' },
  ],
};

export function Dictionary() {
  const [selectedDictType, setSelectedDictType] = useState<string>('1');
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [typeForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [editingType, setEditingType] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // 字典分类表格列配置
  const typeColumns = [
    { title: '字典编码', dataIndex: 'code', width: 150 },
    { title: '字典名称', dataIndex: 'name', width: 150 },
    { title: '描述', dataIndex: 'description' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', width: 120 },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip content="查看项">
            <Button
              key="view"
              type="text"
              size="small"
              icon={<IconEye />}
              onClick={() => setSelectedDictType(record.id)}
            />
          </Tooltip>
          <Tooltip content="编辑">
            <Button
              key="edit"
              type="text"
              size="small"
              icon={<IconEdit />}
              onClick={() => handleEditType(record)}
            />
          </Tooltip>
          <Tooltip content="删除">
            <Popconfirm
              key="delete"
              title="确定要删除该字典分类吗?"
              onOk={() => handleDeleteType(record.id)}
            >
              <Button type="text" size="small" status="danger" icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 字典项表格列配置
  const itemColumns = [
    { title: '标签名称', dataIndex: 'label' },
    { title: '标签值', dataIndex: 'value' },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark' },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            key="edit"
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEditItem(record)}
          >
            编辑
          </Button>
          <Popconfirm
            key="delete"
            title="确定要删除该字典项吗?"
            onOk={() => handleDeleteItem(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddType = () => {
    setEditingType(null);
    typeForm.resetFields();
    setTypeModalVisible(true);
  };

  const handleEditType = (record: any) => {
    setEditingType(record);
    typeForm.setFieldsValue(record);
    setTypeModalVisible(true);
  };

  const handleDeleteType = (id: string) => {
    Message.success('删除成功');
  };

  const handleTypeSubmit = () => {
    typeForm.validate().then(() => {
      Message.success(editingType ? '编辑成功' : '新建成功');
      setTypeModalVisible(false);
    });
  };

  const handleAddItem = () => {
    setEditingItem(null);
    itemForm.resetFields();
    setItemModalVisible(true);
  };

  const handleEditItem = (record: any) => {
    setEditingItem(record);
    itemForm.setFieldsValue(record);
    setItemModalVisible(true);
  };

  const handleDeleteItem = (id: string) => {
    Message.success('删除成功');
  };

  const handleItemSubmit = () => {
    itemForm.validate().then(() => {
      Message.success(editingItem ? '编辑成功' : '新建成功');
      setItemModalVisible(false);
    });
  };

  const currentDictType = mockDictTypes.find(t => t.id === selectedDictType);
  const currentItems = mockDictItems[selectedDictType] || [];

  return (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Card
            bordered={false}
            title="字典分类"
            extra={
              <Button type="primary" icon={<IconPlus />} onClick={handleAddType}>
                新建分类
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Table
              columns={typeColumns}
              data={mockDictTypes}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={24}>
          <Card
            bordered={false}
            title={`字典项 - ${currentDictType?.name || ''}`}
            extra={
              <Button type="primary" icon={<IconPlus />} onClick={handleAddItem}>
                新建字典项
              </Button>
            }
          >
            <Table
              columns={itemColumns}
              data={currentItems}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      {/* 字典分类编辑弹窗 */}
      <Modal
        title={editingType ? '编辑字典分类' : '新建字典分类'}
        visible={typeModalVisible}
        onOk={handleTypeSubmit}
        onCancel={() => setTypeModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={typeForm} layout="vertical">
          <FormItem label="字典编码" field="code" rules={[{ required: true, message: '请输入字典编码' }]}>
            <Input placeholder="请输入字典编码,如:customer_source" />
          </FormItem>
          <FormItem label="字典名称" field="name" rules={[{ required: true, message: '请输入字典名称' }]}>
            <Input placeholder="请输入字典名称" />
          </FormItem>
          <FormItem label="描述" field="description">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </FormItem>
          <FormItem label="状态" field="status" initialValue="启用">
            <Select placeholder="请选择状态">
              <Select.Option value="启用">启用</Select.Option>
              <Select.Option value="禁用">禁用</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 字典项编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑字典项' : '新建字典项'}
        visible={itemModalVisible}
        onOk={handleItemSubmit}
        onCancel={() => setItemModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={itemForm} layout="vertical">
          <FormItem label="标签名称" field="label" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="请输入标签名称" />
          </FormItem>
          <FormItem label="标签值" field="value" rules={[{ required: true, message: '请输入标签值' }]}>
            <Input placeholder="请输入标签值,如:baidu" />
          </FormItem>
          <FormItem label="排序" field="sort" initialValue={1}>
            <InputNumber placeholder="请输入排序" min={1} style={{ width: '100%' }} />
          </FormItem>
          <FormItem label="备注" field="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </FormItem>
          <FormItem label="状态" field="status" initialValue="启用">
            <Select placeholder="请选择状态">
              <Select.Option value="启用">启用</Select.Option>
              <Select.Option value="禁用">禁用</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
