import { useEffect, useState } from 'react';
import { useIntegration } from '../../../integrations/IntegrationContext';
import type { MessageChannel, NotificationRule, SmsConfig } from '../../../integrations/types';
import {
  Button,
  Checkbox,
  Form,
  FormGrid,
  IconEdit,
  IconPlus,
  IconSend,
  Input,
  InputNumber,
  Message,
  Modal,
  PageHeader,
  PageShell,
  MetricGrid,
  DataTable,
  AlertBanner,
  Select,
  SectionTabs,
  SectionCard,
  Space,
  StatusTag,
  Switch,
  Tabs,
  Tooltip,
  Typography,
  type StatusTone,
} from '@/design-system';
import '../../support/system/systemConfigConsistency.css';

const FormItem = Form.Item;
const Text = Typography.Text;
const channelLabels: Record<MessageChannel, string> = { in_app: '站内信', wecom: '企业微信', sms: '短信' };
const channelTones: Record<MessageChannel, StatusTone> = { in_app: 'info', wecom: 'success', sms: 'warning' };

export function NotificationSettings() {
  const { rules, updateRule, addRule, simulateRule, smsConfig, setSmsConfig } = useIntegration();
  const [smsForm] = Form.useForm<SmsConfig>();
  const [ruleForm] = Form.useForm<NotificationRule>();
  const [visible, setVisible] = useState(false);

  useEffect(() => smsForm.setFieldsValue(smsConfig), [smsConfig, smsForm]);

  const editRule = (rule?: NotificationRule) => {
    ruleForm.setFieldsValue(rule ?? {
      id: `rule-${Date.now()}`,
      name: '',
      module: '线索与客户',
      event: '',
      recipients: ['被指派员工'],
      channels: ['in_app', 'wecom'],
      priority: 'medium',
      enabled: true,
      escalationHours: 24,
    });
    setVisible(true);
  };

  const saveRule = async () => {
    const values = await ruleForm.validate();
    if (rules.some((item) => item.id === values.id)) updateRule(values);
    else addRule(values);
    setVisible(false);
    Message.success('消息规则已保存');
  };

  const columns = [
    { title: '规则名称', dataIndex: 'name', width: 170 },
    { title: '业务模块', dataIndex: 'module', width: 130 },
    { title: '触发事件', dataIndex: 'event', width: 190 },
    {
      title: '接收对象',
      dataIndex: 'recipients',
      render: (values: string[]) => values.map((value) => <StatusTag key={value}>{value}</StatusTag>),
    },
    {
      title: '通道',
      dataIndex: 'channels',
      width: 180,
      render: (values: MessageChannel[]) => values.map((value) => <StatusTag key={value} tone={channelTones[value]}>{channelLabels[value]}</StatusTag>),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (value: string) => <StatusTag tone={value === 'high' ? 'danger' : value === 'medium' ? 'warning' : 'neutral'}>{value === 'high' ? '高' : value === 'medium' ? '中' : '低'}</StatusTag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean, rule: NotificationRule) => <Switch size="small" checked={enabled} onChange={(checked) => updateRule({ ...rule, enabled: checked })} />,
    },
    {
      title: '操作',
      width: 150,
      render: (_: unknown, rule: NotificationRule) => (
        <Space>
          <Tooltip content="编辑">
            <Button type="text" size="small" icon={<IconEdit />} aria-label={`编辑${rule.name}`} onClick={() => editRule(rule)} />
          </Tooltip>
          <Tooltip content="测试">
            <Button type="text" size="small" icon={<IconSend />} aria-label={`测试${rule.name}`} onClick={() => { simulateRule(rule); Message.success('已生成模拟投递记录'); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageShell className="system-config-page" breadcrumbs={[{ label: '系统管理' }, { label: '通知设置' }]}>
      <PageHeader
        title="通知设置"
        description="统一配置业务事件的接收人、发送通道和超时升级策略。"
      />
      <AlertBanner tone="info">当前企业微信和阿里云短信均为模拟投递；站内信会真实写入当前浏览器的消息中心。</AlertBanner>
      <MetricGrid items={[
        { key: 'rules', label: '消息规则', value: rules.length, detail: '覆盖各业务模块' },
        { key: 'enabled', label: '已启用', value: rules.filter((rule) => rule.enabled).length, detail: `停用 ${rules.filter((rule) => !rule.enabled).length} 条`, tone: 'success' },
        { key: 'high', label: '高优先级', value: rules.filter((rule) => rule.priority === 'high').length, detail: '支持超时升级', tone: 'warning' },
        { key: 'channels', label: '发送通道', value: 3, detail: '站内信 / 企业微信 / 短信' },
      ]} />
      <SectionCard className="system-config-card" title="通知与模板" bordered={false}>
        <SectionTabs
          defaultActiveKey={"rules"}
          items={[
            {
              key: 'rules',
              label: "消息规则",
              content: (
                <>
                      <div className="system-config-section-toolbar">
                        <span>共 {rules.length} 条规则，启用后按优先级和通道执行。</span>
                        <Button type="primary" icon={<IconPlus />} onClick={() => editRule()}>新增规则</Button>
                      </div>
                      <DataTable rowKey="id" columns={columns} data={rules} pagination={{ pageSize: 8 }} scroll={{ x: 1280 }} />
                    
                </>
              ),
            },
            {
              key: 'sms',
              label: "阿里云短信",
              content: (
                <>
                      <Form className="system-config-form" form={smsForm} layout="vertical">
                        <FormGrid columns={3}>
                          <FormItem label="启用短信" field="enabled" triggerPropName="checked"><Switch /></FormItem>
                          <FormItem label="模拟模式" field="mockMode" triggerPropName="checked"><Switch disabled /></FormItem>
                          <FormItem label="AccessKey" field="accessKeyConfigured" triggerPropName="checked"><Switch disabled /> <Text type="secondary">暂未配置</Text></FormItem>
                        </FormGrid>
                        <FormGrid columns={2}>
                          <FormItem label="短信签名" field="signName"><Input /></FormItem>
                          <FormItem label="默认模板 Code" field="templateCode"><Input /></FormItem>
                        </FormGrid>
                        <FormGrid columns={3}>
                          <FormItem label="超时升级（小时）" field="escalationHours"><InputNumber min={1} /></FormItem>
                          <FormItem label="每日发送上限" field="dailyLimit"><InputNumber min={1} /></FormItem>
                          <FormItem label="单员工每日上限" field="employeeDailyLimit"><InputNumber min={1} /></FormItem>
                        </FormGrid>
                        <FormGrid columns={1}>
                          <FormItem label="企业微信失败时短信降级" field="fallbackOnWeComFailure" triggerPropName="checked"><Switch /></FormItem>
                        </FormGrid>
                        <Button type="primary" onClick={async () => { setSmsConfig(await smsForm.validate()); Message.success('阿里云短信模拟配置已保存'); }}>保存短信配置</Button>
                      </Form>
                    
                </>
              ),
            },
            {
              key: 'templates',
              label: "消息模板",
              content: (
                <>
                      <DataTable
                        pagination={false}
                        columns={[
                          { title: '模板', dataIndex: 'name' },
                          { title: '适用通道', dataIndex: 'channel', render: (value: string) => <StatusTag>{value}</StatusTag> },
                          { title: '内容示例', dataIndex: 'content' },
                          { title: '状态', render: () => <StatusTag tone="success">启用</StatusTag> },
                        ]}
                        data={[
                          { id: 'tpl-1', name: '待办通知', channel: '站内信/企业微信', content: '【{{业务类型}}】{{业务标题}}待您处理，发起人：{{发起人}}。' },
                          { id: 'tpl-2', name: '审批结果', channel: '站内信/企业微信', content: '{{业务标题}}已{{审批结果}}，审批意见：{{审批意见}}。' },
                          { id: 'tpl-3', name: '高优先级超时', channel: '阿里云短信', content: '【HubX】您有一项{{业务类型}}已超时，请登录系统及时处理。' },
                        ]}
                        rowKey="id"
                      />
                    
                </>
              ),
            },
          ]}
        />
      </SectionCard>

      <Modal title="消息规则" visible={visible} onCancel={() => setVisible(false)} onOk={saveRule} style={{ width: 720, maxWidth: 'calc(100vw - 32px)' }}>
        <Form form={ruleForm} layout="vertical">
          <FormItem field="id" hidden><Input /></FormItem>
          <FormGrid columns={2}>
            <FormItem label="规则名称" field="name" rules={[{ required: true }]}><Input /></FormItem>
            <FormItem label="业务模块" field="module" rules={[{ required: true }]}><Select options={['线索与客户', '报价与技术评估', '合同', '项目与交付', '回款、发票和费用', '日报与协作', '员工与组织'].map((value) => ({ label: value, value }))} /></FormItem>
          </FormGrid>
          <FormGrid columns={1}>
            <FormItem label="触发事件" field="event" rules={[{ required: true }]}><Input placeholder="例如：任务指派/转派/逾期" /></FormItem>
            <FormItem label="接收对象" field="recipients" rules={[{ required: true }]}><Select mode="multiple" options={['业务发起人', '业务负责人', '被指派员工', '当前审批人', '下一审批人', '抄送人', '部门负责人', '直属上级', '指定员工', '指定岗位', '指定部门', '系统管理员', '员工本人', '被提及员工'].map((value) => ({ label: value, value }))} /></FormItem>
            <FormItem label="发送通道" field="channels" rules={[{ required: true }]}><Checkbox.Group options={[{ label: '站内信', value: 'in_app' }, { label: '企业微信', value: 'wecom' }, { label: '短信', value: 'sms' }]} /></FormItem>
          </FormGrid>
          <FormGrid columns={2}>
            <FormItem label="优先级" field="priority"><Select options={[{ label: '高', value: 'high' }, { label: '中', value: 'medium' }, { label: '低', value: 'low' }]} /></FormItem>
            <FormItem label="超时升级（小时）" field="escalationHours"><InputNumber min={1} /></FormItem>
            <FormItem label="启用规则" field="enabled" triggerPropName="checked"><Switch /></FormItem>
          </FormGrid>
        </Form>
      </Modal>
    </PageShell>
  );
}
