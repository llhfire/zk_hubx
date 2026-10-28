import { useState } from 'react';
import {
  Button,
  DataTable,
  DatePicker,
  Form,
  FormGrid,
  IconFile,
  IconGift,
  IconPlus,
  Input,
  InputNumber,
  Message,
  MetricGrid,
  Modal,
  MoneyText,
  PageHeader,
  PageShell,
  Select,
  SectionCard,
  Space,
  StatusTag,
  Typography,
} from '@/design-system';
import { RechargeRecord, formatCurrency, initialRechargeRecords, optimizers, platforms } from './mockData';

const Title = Typography.Title;
const FormItem = Form.Item;

export function LeadCostRecharge() {
  const [records, setRecords] = useState<RechargeRecord[]>(initialRechargeRecords);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const totalAmount = records.reduce((sum, item) => sum + item.amount, 0);
  const totalBonus = records.reduce((sum, item) => sum + item.bonusAmount, 0);

  const columns = [
    { title: '充值日期', dataIndex: 'date', width: 120 },
    { title: '平台', dataIndex: 'platform', width: 100, render: (platform: string) => <StatusTag tone="info">{platform}</StatusTag> },
    { title: '充值金额', dataIndex: 'amount', width: 140, render: (value: number) => formatCurrency(value) },
    { title: '赠送金额', dataIndex: 'bonusAmount', width: 140, render: (value: number) => formatCurrency(value) },
    { title: '充值人', dataIndex: 'operator', width: 120 },
    { title: '备注', dataIndex: 'remark' },
  ];

  const handleCreate = () => {
    form.validate().then((values) => {
      const nextRecord: RechargeRecord = {
        key: `recharge-${Date.now()}`,
        date: values.date?.format?.('YYYY-MM-DD') ?? values.date,
        platform: values.platform,
        amount: values.amount,
        bonusAmount: values.bonusAmount ?? 0,
        operator: values.operator,
        remark: values.remark ?? '',
      };

      setRecords([nextRecord, ...records]);
      setVisible(false);
      form.resetFields();
      Message.success('充值记录已新增');
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="充值记录"
        description="维护各平台账户充值、赠送与余额，核对实际可用投放额度。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>新增充值</Button>}
      />

      <MetricGrid
        items={[
          { key: 'recharge', label: <><IconFile /> 本月充值总额</>, value: <MoneyText value={totalAmount} /> },
          { key: 'bonus', label: <><IconGift /> 本月赠送总额</>, value: <MoneyText value={totalBonus} /> },
          { key: 'total', label: '账户总入账', value: <MoneyText value={totalAmount + totalBonus} /> },
        ]}
      />

      <SectionCard>
        <Space style={{ marginBottom: 16 }} wrap>
          <DatePicker.RangePicker style={{ width: 260 }} />
          <Select placeholder="平台" style={{ width: 140 }} allowClear>
            {platforms.map((platform) => <Select.Option key={platform} value={platform}>{platform}</Select.Option>)}
          </Select>
          <Select placeholder="充值人" style={{ width: 140 }} allowClear>
            {optimizers.map((optimizer) => <Select.Option key={optimizer} value={optimizer}>{optimizer}</Select.Option>)}
          </Select>
          <Button type="primary">搜索</Button>
        </Space>

        <DataTable columns={columns} data={records} pagination={{ pageSize: 10, showTotal: true }} />
      </SectionCard>

      <Modal title="新增充值记录" visible={visible} onOk={handleCreate} onCancel={() => setVisible(false)} style={{ width: 640 }}>
        <Form form={form} layout="vertical" initialValues={{ operator: '张优化', bonusAmount: 0 }}>
          <FormGrid columns={2}>
            <FormItem label="充值日期" field="date" rules={[{ required: true, message: '请选择充值日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="充值平台" field="platform" rules={[{ required: true, message: '请选择平台' }]}>
              <Select placeholder="请选择平台">
                {platforms.map((platform) => <Select.Option key={platform} value={platform}>{platform}</Select.Option>)}
              </Select>
            </FormItem>
          </FormGrid>

          <FormGrid columns={2}>
            <FormItem label="充值金额" field="amount" rules={[{ required: true, message: '请输入充值金额' }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="赠送金额" field="bonusAmount">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </FormItem>
          </FormGrid>

          <FormItem label="充值人" field="operator" rules={[{ required: true, message: '请选择充值人' }]}>
            <Select>
              {optimizers.map((optimizer) => <Select.Option key={optimizer} value={optimizer}>{optimizer}</Select.Option>)}
            </Select>
          </FormItem>

          <FormItem label="备注" field="remark">
            <Input.TextArea placeholder="请输入充值备注" rows={3} />
          </FormItem>
        </Form>
      </Modal>
    </PageShell>
  );
}
