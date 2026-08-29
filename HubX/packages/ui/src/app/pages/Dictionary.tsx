import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconEye, IconPlus, IconSearch } from '@arco-design/web-react/icon';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import {
  calculateDictionaryMetrics,
  EMPTY_DICTIONARY_FILTERS,
  filterDictionaryItems,
  filterDictionaryTypes,
  hasDictionaryFilters,
  type DictionaryFilterStatus,
  type DictionaryFilters,
  type DictionaryItem,
  type DictionaryStatus,
  type DictionaryType,
} from './dictionaryModel';
import './Dictionary.css';

const FormItem = Form.Item;
const { Text } = Typography;

const INITIAL_DICTIONARY_TYPES: DictionaryType[] = [
  { id: '1', code: 'customer_source', name: '客户来源', description: '客户来源渠道分类', status: '启用', createTime: '2020-01-01' },
  { id: '2', code: 'customer_level', name: '客户等级', description: '客户价值等级分类', status: '启用', createTime: '2020-01-01' },
  { id: '3', code: 'lead_status', name: '线索状态', description: '线索跟进状态分类', status: '启用', createTime: '2020-01-01' },
  { id: '4', code: 'lead_tag', name: '线索标签', description: '线索业务类型标签', status: '启用', createTime: '2020-01-01' },
  { id: '5', code: 'industry', name: '所属行业', description: '客户所属行业分类', status: '启用', createTime: '2020-01-01' },
];

const INITIAL_DICTIONARY_ITEMS: Record<string, DictionaryItem[]> = {
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

type DictionaryTypeFormValues = Pick<DictionaryType, 'code' | 'name' | 'description' | 'status'>;
type DictionaryItemFormValues = Pick<DictionaryItem, 'label' | 'value' | 'sort' | 'status' | 'remark'>;

export function Dictionary() {
  const [dictionaryTypes, setDictionaryTypes] = useState<DictionaryType[]>(INITIAL_DICTIONARY_TYPES);
  const [dictionaryItems, setDictionaryItems] = useState<Record<string, DictionaryItem[]>>(INITIAL_DICTIONARY_ITEMS);
  const [selectedTypeId, setSelectedTypeId] = useState('1');
  const [typeFilters, setTypeFilters] = useState<DictionaryFilters>({ ...EMPTY_DICTIONARY_FILTERS });
  const [itemFilters, setItemFilters] = useState<DictionaryFilters>({ ...EMPTY_DICTIONARY_FILTERS });
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [typeForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [editingType, setEditingType] = useState<DictionaryType | null>(null);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);

  const currentType = dictionaryTypes.find(type => type.id === selectedTypeId) ?? null;
  const currentItems = dictionaryItems[selectedTypeId] ?? [];
  const filteredTypes = useMemo(() => filterDictionaryTypes(dictionaryTypes, typeFilters), [dictionaryTypes, typeFilters]);
  const filteredItems = useMemo(() => filterDictionaryItems(currentItems, itemFilters), [currentItems, itemFilters]);
  const metrics = useMemo(
    () => calculateDictionaryMetrics(dictionaryTypes, dictionaryItems, selectedTypeId),
    [dictionaryItems, dictionaryTypes, selectedTypeId],
  );
  const hasTypeFilters = hasDictionaryFilters(typeFilters);
  const hasItemFilters = hasDictionaryFilters(itemFilters);

  const handleAddType = () => {
    setEditingType(null);
    typeForm.resetFields();
    typeForm.setFieldsValue({ status: '启用' });
    setTypeModalVisible(true);
  };

  const handleEditType = (record: DictionaryType) => {
    setEditingType(record);
    typeForm.setFieldsValue(record);
    setTypeModalVisible(true);
  };

  const handleDeleteType = (id: string) => {
    const nextTypes = dictionaryTypes.filter(type => type.id !== id);
    setDictionaryTypes(nextTypes);
    setDictionaryItems(current => Object.fromEntries(Object.entries(current).filter(([typeId]) => typeId !== id)));
    if (selectedTypeId === id) {
      setSelectedTypeId(nextTypes[0]?.id ?? '');
      setItemFilters({ ...EMPTY_DICTIONARY_FILTERS });
    }
    Message.success('字典分类已删除');
  };

  const handleSelectType = (id: string) => {
    setSelectedTypeId(id);
    setItemFilters({ ...EMPTY_DICTIONARY_FILTERS });
  };

  const handleTypeSubmit = () => {
    typeForm.validate().then((values: DictionaryTypeFormValues) => {
      const normalized = {
        ...values,
        description: values.description || '',
        status: (values.status || '启用') as DictionaryStatus,
      };
      if (editingType) {
        setDictionaryTypes(current => current.map(type => type.id === editingType.id ? { ...type, ...normalized } : type));
        Message.success('字典分类已更新');
      } else {
        const id = `dictionary-type-${Date.now()}`;
        const nextType: DictionaryType = { ...normalized, id, createTime: new Date().toISOString().slice(0, 10) };
        setDictionaryTypes(current => [...current, nextType]);
        setDictionaryItems(current => ({ ...current, [id]: [] }));
        setSelectedTypeId(id);
        setItemFilters({ ...EMPTY_DICTIONARY_FILTERS });
        Message.success('字典分类已新建');
      }
      setTypeModalVisible(false);
    });
  };

  const handleAddItem = () => {
    if (!currentType) return;
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({ sort: currentItems.length + 1, status: '启用' });
    setItemModalVisible(true);
  };

  const handleEditItem = (record: DictionaryItem) => {
    setEditingItem(record);
    itemForm.setFieldsValue(record);
    setItemModalVisible(true);
  };

  const handleDeleteItem = (id: string) => {
    setDictionaryItems(current => ({
      ...current,
      [selectedTypeId]: (current[selectedTypeId] ?? []).filter(item => item.id !== id),
    }));
    Message.success('字典项已删除');
  };

  const handleItemSubmit = () => {
    if (!currentType) return;
    itemForm.validate().then((values: DictionaryItemFormValues) => {
      const normalized = {
        ...values,
        remark: values.remark || '',
        status: (values.status || '启用') as DictionaryStatus,
      };
      setDictionaryItems(current => {
        const items = current[selectedTypeId] ?? [];
        const nextItems = editingItem
          ? items.map(item => item.id === editingItem.id ? { ...item, ...normalized } : item)
          : [...items, { ...normalized, id: `dictionary-item-${Date.now()}` }];
        return { ...current, [selectedTypeId]: nextItems.sort((left, right) => left.sort - right.sort) };
      });
      Message.success(editingItem ? '字典项已更新' : '字典项已新建');
      setItemModalVisible(false);
    });
  };

  const typeColumns = [
    { title: '字典编码', dataIndex: 'code', width: 180 },
    { title: '字典名称', dataIndex: 'name', width: 140 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: (status: DictionaryStatus) => <Tag color={status === '启用' ? 'green' : 'gray'}>{status}</Tag> },
    { title: '创建时间', dataIndex: 'createTime', width: 120 },
    {
      title: '操作', width: 150, fixed: 'right' as const,
      render: (_: unknown, record: DictionaryType) => (
        <Space size={4}>
          <Tooltip content="查看字典项">
            <Button type="text" size="small" className="hubx-icon-action" aria-label={`查看${record.name}字典项`} icon={<IconEye />} onClick={() => handleSelectType(record.id)} />
          </Tooltip>
          <Tooltip content="编辑分类">
            <Button type="text" size="small" className="hubx-icon-action" aria-label={`编辑${record.name}分类`} icon={<IconEdit />} onClick={() => handleEditType(record)} />
          </Tooltip>
          <Tooltip content="删除分类">
            <Popconfirm title={`确定删除“${record.name}”及其全部字典项吗？`} onOk={() => handleDeleteType(record.id)}>
              <Button type="text" size="small" status="danger" className="hubx-icon-action" aria-label={`删除${record.name}分类`} icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: '标签名称', dataIndex: 'label', width: 160 },
    { title: '标签值', dataIndex: 'value', width: 180 },
    { title: '排序', dataIndex: 'sort', width: 80, align: 'right' as const },
    { title: '状态', dataIndex: 'status', width: 90, render: (status: DictionaryStatus) => <Tag color={status === '启用' ? 'green' : 'gray'}>{status}</Tag> },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作', width: 110, fixed: 'right' as const,
      render: (_: unknown, record: DictionaryItem) => (
        <Space size={4}>
          <Tooltip content="编辑字典项">
            <Button type="text" size="small" className="hubx-icon-action" aria-label={`编辑${record.label}字典项`} icon={<IconEdit />} onClick={() => handleEditItem(record)} />
          </Tooltip>
          <Tooltip content="删除字典项">
            <Popconfirm title={`确定删除“${record.label}”吗？`} onOk={() => handleDeleteItem(record.id)}>
              <Button type="text" size="small" status="danger" className="hubx-icon-action" aria-label={`删除${record.label}字典项`} icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageShell className="dictionary-page">
      <PageHeader
        title="数据字典"
        description="统一维护系统枚举分类与字典项；选择分类后可查看、检索和编辑对应值。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={handleAddType}>新建分类</Button>}
      />

      <ProcessMetricGrid
        items={[
          { key: 'types', label: '分类总数', value: `${metrics.typeCount} 个`, detail: '当前 α 会话' },
          { key: 'active-types', label: '启用分类', value: `${metrics.activeTypeCount} 个`, detail: '可用于业务字段', tone: 'success' },
          { key: 'current-items', label: '当前分类项', value: `${metrics.currentItemCount} 个`, detail: currentType?.name || '尚未选择分类' },
          { key: 'active-items', label: '当前启用项', value: `${metrics.activeCurrentItemCount} 个`, detail: '按状态统计', tone: 'success' },
        ]}
      />

      <Card className="dictionary-page__card" title="字典分类">
        <FilterBar actions={hasTypeFilters ? <Button type="text" onClick={() => setTypeFilters({ ...EMPTY_DICTIONARY_FILTERS })}>重置筛选</Button> : undefined}>
          <Input className="dictionary-page__keyword" prefix={<IconSearch />} placeholder="搜索分类编码、名称或描述" value={typeFilters.keyword} onChange={keyword => setTypeFilters(current => ({ ...current, keyword }))} allowClear />
          <Select className="dictionary-page__status" value={typeFilters.status} onChange={status => setTypeFilters(current => ({ ...current, status: status as DictionaryFilterStatus }))}>
            <Select.Option value="全部">全部状态</Select.Option>
            <Select.Option value="启用">启用</Select.Option>
            <Select.Option value="禁用">禁用</Select.Option>
          </Select>
        </FilterBar>
        <div className="dictionary-page__result-summary">
          <Text type="secondary">共 {filteredTypes.length} 个分类</Text>
          {hasTypeFilters && <Text type="secondary">已按当前条件筛选</Text>}
        </div>
        {filteredTypes.length === 0 ? (
          <div className="dictionary-page__empty">
            <Empty description={dictionaryTypes.length === 0 ? '暂无字典分类' : '没有符合当前条件的字典分类'} />
            {hasTypeFilters && <Button onClick={() => setTypeFilters({ ...EMPTY_DICTIONARY_FILTERS })}>清除筛选</Button>}
          </div>
        ) : (
          <Table rowKey="id" columns={typeColumns} data={filteredTypes} scroll={{ x: 980 }} pagination={{ pageSize: 10, total: filteredTypes.length, showTotal: true, sizeCanChange: true }} rowClassName={record => record.id === selectedTypeId ? 'dictionary-page__selected-row' : ''} />
        )}
      </Card>

      <Card className="dictionary-page__card" title={currentType ? `字典项 · ${currentType.name}` : '字典项'} extra={<Button type="primary" icon={<IconPlus />} disabled={!currentType} onClick={handleAddItem}>新建字典项</Button>}>
        <FilterBar actions={hasItemFilters ? <Button type="text" onClick={() => setItemFilters({ ...EMPTY_DICTIONARY_FILTERS })}>重置筛选</Button> : undefined}>
          <Input className="dictionary-page__keyword" prefix={<IconSearch />} placeholder="搜索标签名称、标签值或备注" value={itemFilters.keyword} onChange={keyword => setItemFilters(current => ({ ...current, keyword }))} allowClear disabled={!currentType} />
          <Select className="dictionary-page__status" value={itemFilters.status} onChange={status => setItemFilters(current => ({ ...current, status: status as DictionaryFilterStatus }))} disabled={!currentType}>
            <Select.Option value="全部">全部状态</Select.Option>
            <Select.Option value="启用">启用</Select.Option>
            <Select.Option value="禁用">禁用</Select.Option>
          </Select>
        </FilterBar>
        <div className="dictionary-page__result-summary">
          <Text type="secondary">共 {filteredItems.length} 个字典项</Text>
          {hasItemFilters && <Text type="secondary">已按当前条件筛选</Text>}
        </div>
        {!currentType || filteredItems.length === 0 ? (
          <div className="dictionary-page__empty">
            <Empty description={!currentType ? '请先新建并选择字典分类' : currentItems.length === 0 ? '当前分类暂无字典项' : '没有符合当前条件的字典项'} />
            {currentType && hasItemFilters && <Button onClick={() => setItemFilters({ ...EMPTY_DICTIONARY_FILTERS })}>清除筛选</Button>}
          </div>
        ) : (
          <Table rowKey="id" columns={itemColumns} data={filteredItems} scroll={{ x: 820 }} pagination={{ pageSize: 10, total: filteredItems.length, showTotal: true, sizeCanChange: true }} />
        )}
      </Card>

      <Modal title={editingType ? '编辑字典分类' : '新建字典分类'} visible={typeModalVisible} onOk={handleTypeSubmit} onCancel={() => setTypeModalVisible(false)} autoFocus={false} focusLock>
        <Form form={typeForm} layout="vertical">
          <FormItem label="字典编码" field="code" rules={[{ required: true, message: '请输入字典编码' }]}><Input placeholder="请输入字典编码，如 customer_source" /></FormItem>
          <FormItem label="字典名称" field="name" rules={[{ required: true, message: '请输入字典名称' }]}><Input placeholder="请输入字典名称" /></FormItem>
          <FormItem label="描述" field="description"><Input.TextArea placeholder="请输入描述" rows={3} /></FormItem>
          <FormItem label="状态" field="status"><Select placeholder="请选择状态"><Select.Option value="启用">启用</Select.Option><Select.Option value="禁用">禁用</Select.Option></Select></FormItem>
        </Form>
      </Modal>

      <Modal title={editingItem ? '编辑字典项' : '新建字典项'} visible={itemModalVisible} onOk={handleItemSubmit} onCancel={() => setItemModalVisible(false)} autoFocus={false} focusLock>
        <Form form={itemForm} layout="vertical">
          <FormItem label="标签名称" field="label" rules={[{ required: true, message: '请输入标签名称' }]}><Input placeholder="请输入标签名称" /></FormItem>
          <FormItem label="标签值" field="value" rules={[{ required: true, message: '请输入标签值' }]}><Input placeholder="请输入标签值，如 baidu" /></FormItem>
          <FormItem label="排序" field="sort" rules={[{ required: true, message: '请输入排序' }]}><InputNumber placeholder="请输入排序" min={1} className="dictionary-page__form-number" /></FormItem>
          <FormItem label="备注" field="remark"><Input.TextArea placeholder="请输入备注" rows={3} /></FormItem>
          <FormItem label="状态" field="status"><Select placeholder="请选择状态"><Select.Option value="启用">启用</Select.Option><Select.Option value="禁用">禁用</Select.Option></Select></FormItem>
        </Form>
      </Modal>
    </PageShell>
  );
}
