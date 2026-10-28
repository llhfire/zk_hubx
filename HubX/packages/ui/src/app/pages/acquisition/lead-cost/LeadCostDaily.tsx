import { useState } from 'react';
import {
  Button,
  DataTable,
  DatePicker,
  Form,
  FormGrid,
  IconPlus,
  InputNumber,
  Message,
  Modal,
  PageHeader,
  PageShell,
  Select,
  SectionCard,
  Space,
  StatusTag,
  Typography,
} from '@/design-system';
import {
  DailyCostRecord,
  calculateActualCost,
  calculateNominalCost,
  calculateValidRate,
  channelOptions,
  formatCurrency,
  initialDailyCostRecords,
  optimizers,
  platforms,
} from './mockData';

const Title = Typography.Title;
const FormItem = Form.Item;

export function LeadCostDaily() {
  const [records, setRecords] = useState<DailyCostRecord[]>(initialDailyCostRecords);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    { title: '日期', dataIndex: 'date', width: 120 },
    { title: '平台', dataIndex: 'platform', width: 100, render: (platform: string) => <StatusTag tone="info">{platform}</StatusTag> },
    { title: '渠道/账户', dataIndex: 'channel', width: 200 },
    { title: '录入人', dataIndex: 'optimizer', width: 100 },
    { title: '消耗金额', dataIndex: 'spend', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '退款金额', dataIndex: 'refund', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '有效线索', dataIndex: 'validLeads', width: 100 },
    { title: '无效线索', dataIndex: 'invalidLeads', width: 100 },
    { title: '有效率', width: 100, render: (_: unknown, record: DailyCostRecord) => `${calculateValidRate(record).toFixed(1)}%` },
    { title: '名义成本', width: 120, render: (_: unknown, record: DailyCostRecord) => formatCurrency(calculateNominalCost(record)) },
    { title: '实际成本', width: 120, render: (_: unknown, record: DailyCostRecord) => formatCurrency(calculateActualCost(record)) },
  ];

  const handleCreate = () => {
    form.validate().then((values) => {
      const nextRecord: DailyCostRecord = {
        key: `daily-${Date.now()}`,
        date: values.date?.format?.('YYYY-MM-DD') ?? values.date,
        platform: values.platform,
        channel: values.channel,
        optimizer: values.optimizer,
        spend: values.spend,
        refund: values.refund ?? 0,
        validLeads: values.validLeads,
        invalidLeads: values.invalidLeads,
        highQualityLeads: values.highQualityLeads ?? 0,
      };

      setRecords([nextRecord, ...records]);
      setVisible(false);
      form.resetFields();
      Message.success('投放日报已新增');
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="投放日报"
        description="记录每日各平台投放消耗与线索产出，是成本核算的原始数据。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>新增日报</Button>}
      />

      <SectionCard>
        <Space style={{ marginBottom: 16 }} wrap>
          <DatePicker.RangePicker style={{ width: 260 }} />
          <Select placeholder="平台" style={{ width: 140 }} allowClear>
            {platforms.map((platform) => <Select.Option key={platform} value={platform}>{platform}</Select.Option>)}
          </Select>
          <Select placeholder="渠道" style={{ width: 220 }} allowClear>
            {channelOptions.map((item) => <Select.Option key={item.channel} value={item.channel}>{item.channel}</Select.Option>)}
          </Select>
          <Select placeholder="录入人" style={{ width: 140 }} allowClear>
            {optimizers.map((optimizer) => <Select.Option key={optimizer} value={optimizer}>{optimizer}</Select.Option>)}
          </Select>
          <Button type="primary">搜索</Button>
        </Space>

        <DataTable columns={columns} data={records} scroll={{ x: 1300 }} pagination={{ pageSize: 10, showTotal: true }} />
      </SectionCard>

      <Modal title="新增投放日报" visible={visible} onOk={handleCreate} onCancel={() => setVisible(false)} style={{ width: 760 }}>
        <Form form={form} layout="vertical" initialValues={{ optimizer: '张优化', refund: 0, highQualityLeads: 0 }}>
          <FormGrid columns={3}>
            <FormItem label="日期" field="date" rules={[{ required: true, message: '请选择日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="平台" field="platform" rules={[{ required: true, message: '请选择平台' }]}>
              <Select placeholder="请选择平台">
                {platforms.map((platform) => <Select.Option key={platform} value={platform}>{platform}</Select.Option>)}
              </Select>
            </FormItem>
            <FormItem label="渠道/账户" field="channel" rules={[{ required: true, message: '请选择渠道' }]}>
              <Select placeholder="请选择渠道">
                {channelOptions.map((item) => <Select.Option key={item.channel} value={item.channel}>{item.channel}</Select.Option>)}
              </Select>
            </FormItem>
          </FormGrid>
          <FormGrid columns={3}>
            <FormItem label="消耗金额" field="spend" rules={[{ required: true, message: '请输入消耗金额' }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="退款金额" field="refund">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="录入人" field="optimizer" rules={[{ required: true, message: '请选择录入人' }]}>
              <Select>
                {optimizers.map((optimizer) => <Select.Option key={optimizer} value={optimizer}>{optimizer}</Select.Option>)}
              </Select>
            </FormItem>
          </FormGrid>
          <FormGrid columns={3}>
            <FormItem label="有效线索数" field="validLeads" rules={[{ required: true, message: '请输入有效线索数' }]}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="无效线索数" field="invalidLeads" rules={[{ required: true, message: '请输入无效线索数' }]}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </FormItem>
            <FormItem label="高意向线索数" field="highQualityLeads">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </FormItem>
          </FormGrid>
        </Form>
      </Modal>
    </PageShell>
  );
}
