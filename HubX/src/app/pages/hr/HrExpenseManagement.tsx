import { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
} from '@arco-design/web-react';
import { IconDownload, IconPlus, IconUpload } from '@arco-design/web-react/icon';

interface HrExpenseRecord {
  id: string;
  category: string;
  amount: number;
  startDate: string;
  endDate: string;
  effectiveImmediately?: boolean;
  effectiveDate?: string;
  remark: string;
  createdAt: string;
  updatedAt?: string;
}

const formatCurrentTime = () => new Date().toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).replaceAll('/', '-');

const EXPENSE_CATEGORIES = [
  '房租',
  '水电',
  '网络',
  '线上平台充值',
  '培训费',
  '工资',
  '福利',
  '系统与工具',
  '办公费用',
  '其他',
];

const initialRecords: HrExpenseRecord[] = [
  {
    id: 'hr-expense-1',
    category: '房租',
    amount: 15000,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    remark: '办公室月度房租',
    createdAt: '2026-08-01',
  },
  {
    id: 'hr-expense-2',
    category: '水电',
    amount: 3200,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    remark: '办公室水电费用',
    createdAt: '2026-08-01',
  },
  { id: 'hr-expense-3', category: '网络', amount: 980, startDate: '2026-08-01', endDate: '2026-08-31', remark: '办公网络及专线服务', createdAt: '2026-08-02' },
  { id: 'hr-expense-4', category: '线上平台充值', amount: 3000, startDate: '2026-08-01', endDate: '2026-08-31', remark: '线上推广平台账户充值', createdAt: '2026-08-02' },
  { id: 'hr-expense-5', category: '培训费', amount: 4800, startDate: '2026-07-15', endDate: '2026-07-16', remark: '项目管理培训课程', createdAt: '2026-07-10' },
  { id: 'hr-expense-6', category: '工资', amount: 128000, startDate: '2026-07-01', endDate: '2026-07-31', remark: '2026年7月员工工资', createdAt: '2026-08-05' },
  { id: 'hr-expense-7', category: '福利', amount: 8600, startDate: '2026-07-01', endDate: '2026-07-31', remark: '员工餐补及节日福利', createdAt: '2026-08-05' },
  { id: 'hr-expense-8', category: '系统与工具', amount: 2680, startDate: '2026-08-01', endDate: '2026-08-31', remark: '协作工具及代码仓库订阅', createdAt: '2026-08-03' },
  { id: 'hr-expense-9', category: '办公费用', amount: 1760, startDate: '2026-07-01', endDate: '2026-07-31', remark: '打印耗材及办公用品', createdAt: '2026-08-02' },
  { id: 'hr-expense-10', category: '其他', amount: 520, startDate: '2026-07-20', endDate: '2026-07-20', remark: '临时行政支出', createdAt: '2026-07-21' },
  { id: 'hr-expense-11', category: '房租', amount: 15000, startDate: '2026-07-01', endDate: '2026-07-31', remark: '办公室月度房租', createdAt: '2026-07-01' },
  { id: 'hr-expense-12', category: '水电', amount: 2860, startDate: '2026-06-01', endDate: '2026-06-30', remark: '办公室水电费用', createdAt: '2026-07-01' },
  { id: 'hr-expense-13', category: '网络', amount: 980, startDate: '2026-07-01', endDate: '2026-07-31', remark: '办公网络及专线服务', createdAt: '2026-07-02' },
  { id: 'hr-expense-14', category: '线上平台充值', amount: 5000, startDate: '2026-07-01', endDate: '2026-07-31', remark: '广告及平台服务充值', createdAt: '2026-07-03' },
  { id: 'hr-expense-15', category: '培训费', amount: 2200, startDate: '2026-06-18', endDate: '2026-06-18', remark: '员工技能培训', createdAt: '2026-06-20' },
  { id: 'hr-expense-16', category: '工资', amount: 126000, startDate: '2026-06-01', endDate: '2026-06-30', remark: '2026年6月员工工资', createdAt: '2026-07-05' },
  { id: 'hr-expense-17', category: '福利', amount: 6300, startDate: '2026-06-01', endDate: '2026-06-30', remark: '员工福利及团建费用', createdAt: '2026-07-05' },
  { id: 'hr-expense-18', category: '系统与工具', amount: 1980, startDate: '2026-07-01', endDate: '2026-07-31', remark: '设计软件及云服务订阅', createdAt: '2026-07-02' },
  { id: 'hr-expense-19', category: '办公费用', amount: 2340, startDate: '2026-06-01', endDate: '2026-06-30', remark: '办公用品采购', createdAt: '2026-06-28' },
  { id: 'hr-expense-20', category: '其他', amount: 1100, startDate: '2026-06-25', endDate: '2026-06-25', remark: '临时维修费用', createdAt: '2026-06-26' },
];

export function HrExpenseManagement() {
  const [records, setRecords] = useState<HrExpenseRecord[]>(initialRecords);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingAmountChange, setPendingAmountChange] = useState<{ id: string; amount: number } | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, number>>({});
  const [effectiveImmediately, setEffectiveImmediately] = useState(true);
  const [form] = Form.useForm();
  const [effectiveForm] = Form.useForm();
  const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);

  const openCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validate();
      setRecords(prev => [
        {
          id: `hr-expense-${Date.now()}`,
          category: values.category,
          amount: values.amount,
          startDate: '',
          endDate: '',
          effectiveImmediately: true,
          effectiveDate: new Date().toISOString().slice(0, 10),
          remark: values.remark || '',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: formatCurrentTime(),
        },
        ...prev,
      ]);
      setModalVisible(false);
      Message.success('费用录入成功');
    } catch {
      // 表单校验失败时由 Form 展示字段提示
    }
  };

  const openAmountEffectModal = (record: HrExpenseRecord) => {
    const amount = amountDrafts[record.id];
    if (amount == null || amount === record.amount) return;
    setPendingAmountChange({ id: record.id, amount });
    setEffectiveImmediately(true);
    effectiveForm.resetFields();
    effectiveForm.setFieldsValue({ effectiveImmediately: true });
  };

  const saveAmountChange = async () => {
    if (!pendingAmountChange) return;
    try {
      const values = await effectiveForm.validate();
      if (!values.effectiveImmediately && !values.effectiveDate) {
        Message.warning('请选择生效时间');
        return;
      }
      setRecords(current => current.map(item => item.id === pendingAmountChange.id ? {
        ...item,
        amount: pendingAmountChange.amount,
        effectiveImmediately: values.effectiveImmediately,
        effectiveDate: values.effectiveImmediately ? new Date().toISOString().slice(0, 10) : values.effectiveDate,
        updatedAt: formatCurrentTime(),
      } : item));
      setPendingAmountChange(null);
      Message.success(values.effectiveImmediately ? '金额已立即生效' : '金额修改已设置生效时间');
    } catch {
      // 表单校验失败时由 Form 展示字段提示
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>人资费用管理</h2>
            <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>
              金额汇总：<strong style={{ color: 'rgb(var(--primary-6))', fontSize: 18 }}>¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          </div>
          <div style={{ marginTop: 4, color: 'var(--color-text-3)' }}>按费用项维护金额及生效时间，共 {records.length} 项</div>
        </div>
        <Space>
          <Button icon={<IconUpload />}>导入</Button>
          <Button icon={<IconDownload />}>导出</Button>
          <Button type="primary" icon={<IconPlus />} onClick={openCreate}>新增费用</Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <button
          type="button"
          onClick={openCreate}
          style={{ minHeight: 210, border: '1px dashed rgb(var(--primary-4))', borderRadius: 8, background: 'var(--color-primary-light-1)', color: 'rgb(var(--primary-6))', cursor: 'pointer' }}
        >
          <IconPlus style={{ fontSize: 24 }} />
          <div style={{ marginTop: 8, fontWeight: 600 }}>新增费用项</div>
        </button>
        {records.map(record => {
          const isPendingEffective = Boolean(record.effectiveDate && record.effectiveDate > new Date().toISOString().slice(0, 10));
          return <Card
            key={record.id}
            bordered
            title={<Space><span style={{ fontWeight: 600 }}>{record.category}</span>{isPendingEffective ? <Tag size="small" color="orange">待生效</Tag> : null}</Space>}
            extra={<span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>最后修改 {record.updatedAt || record.createdAt}</span>}
            bodyStyle={{ padding: 16 }}
          >
            <div style={{ marginBottom: 6, color: 'var(--color-text-3)', fontSize: 12 }}>费用金额</div>
            <InputNumber
              value={amountDrafts[record.id] ?? record.amount}
              min={0}
              precision={2}
              prefix="¥"
              onChange={value => setAmountDrafts(current => ({ ...current, [record.id]: value ?? 0 }))}
              onBlur={() => openAmountEffectModal(record)}
              style={{ width: '100%' }}
            />
            {isPendingEffective && <div style={{ marginTop: 14, color: 'rgb(var(--orange-6))', fontSize: 13 }}>生效时间：{record.effectiveDate}</div>}
            <div style={{ minHeight: 40, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-2)', color: 'var(--color-text-3)', fontSize: 13, lineHeight: '20px' }}>
              {record.remark || '暂无备注'}
            </div>
          </Card>;
        })}
      </div>

      <Modal
        title="录入人资费用"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="费用类型" field="category" rules={[{ required: true, message: '请选择费用类型' }]}>
            <Select placeholder="请选择费用类型" options={EXPENSE_CATEGORIES.map(item => ({ label: item, value: item }))} />
          </Form.Item>
          <Form.Item label="金额（元）" field="amount" rules={[{ required: true, message: '请输入费用金额' }]}>
            <InputNumber min={0} precision={2} placeholder="请输入费用金额" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" field="remark">
            <Input.TextArea placeholder="请输入费用说明" autoSize={{ minRows: 3, maxRows: 5 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认金额生效方式"
        visible={Boolean(pendingAmountChange)}
        onCancel={() => {
          if (pendingAmountChange) {
            const record = records.find(item => item.id === pendingAmountChange.id);
            if (record) setAmountDrafts(current => ({ ...current, [record.id]: record.amount }));
          }
          setPendingAmountChange(null);
        }}
        onOk={saveAmountChange}
        okText="确认修改"
        maskClosable={false}
      >
        <Form form={effectiveForm} layout="vertical">
          <Form.Item label="是否立即生效" field="effectiveImmediately" rules={[{ required: true }]}>
            <Radio.Group onChange={value => setEffectiveImmediately(value)}>
              <Radio value>是，立即生效</Radio>
              <Radio value={false}>否，指定生效时间</Radio>
            </Radio.Group>
          </Form.Item>
          {!effectiveImmediately && (
            <Form.Item label="生效时间" field="effectiveDate" rules={[{ required: true, message: '请选择生效时间' }]}>
              <DatePicker style={{ width: '100%' }} placeholder="请选择生效时间" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
