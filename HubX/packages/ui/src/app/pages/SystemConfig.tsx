import { useState } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Message,
  Divider,
} from '@arco-design/web-react';
import { IconSave } from '@arco-design/web-react/icon';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;

export function SystemConfig() {
  const [activeTab, setActiveTab] = useState('message');
  const [messageForm] = Form.useForm();
  const [backupForm] = Form.useForm();
  const [businessForm] = Form.useForm();

  // 初始化表单值
  useState(() => {
    messageForm.setFieldsValue({
      enableWechat: true,
      wechatWebhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxx',
      enableEmail: true,
      emailHost: 'smtp.company.com',
      emailPort: 465,
      emailUser: 'noreply@company.com',
      emailPassword: '********',
      enableSMS: false,
      smsProvider: 'aliyun',
      smsAccessKey: '',
      smsAccessSecret: '',
    });

    backupForm.setFieldsValue({
      enableAutoBackup: true,
      backupInterval: 'daily',
      backupTime: '02:00',
      backupRetention: 30,
      backupPath: '/data/backups',
    });

    businessForm.setFieldsValue({
      leadRecycleDays: 7,
      followRemindDays: 3,
      contractExpireRemindDays: 30,
      customerInactiveDays: 90,
      enableDuplicateCheck: true,
      enableAutoAssign: false,
    });
  });

  const handleMessageSubmit = () => {
    messageForm.validate().then((values) => {
      console.log('消息渠道配置', values);
      Message.success('保存成功');
    });
  };

  const handleBackupSubmit = () => {
    backupForm.validate().then((values) => {
      console.log('备份配置', values);
      Message.success('保存成功');
    });
  };

  const handleBusinessSubmit = () => {
    businessForm.validate().then((values) => {
      console.log('业务参数配置', values);
      Message.success('保存成功');
    });
  };

  const handleBackupNow = () => {
    Message.loading('正在备份数据...');
    setTimeout(() => {
      Message.success('数据备份成功');
    }, 2000);
  };

  const handleRestore = () => {
    Message.warning('数据恢复功能需谨慎使用,请联系系统管理员');
  };

  return (
    <div>
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="message" title="消息渠道配置">
            <Form form={messageForm} layout="vertical" style={{ maxWidth: 800 }}>
              <Divider orientation="left">企业微信通知</Divider>
              <FormItem label="启用企业微信通知" field="enableWechat" triggerPropName="checked">
                <Switch />
              </FormItem>
              <FormItem label="Webhook地址" field="wechatWebhook">
                <Input placeholder="请输入企业微信机器人Webhook地址" />
              </FormItem>

              <Divider orientation="left">邮件通知</Divider>
              <FormItem label="启用邮件通知" field="enableEmail" triggerPropName="checked">
                <Switch />
              </FormItem>
              <FormItem label="SMTP服务器" field="emailHost">
                <Input placeholder="请输入SMTP服务器地址" />
              </FormItem>
              <FormItem label="SMTP端口" field="emailPort">
                <InputNumber placeholder="请输入SMTP端口" style={{ width: '100%' }} />
              </FormItem>
              <FormItem label="发件人邮箱" field="emailUser">
                <Input placeholder="请输入发件人邮箱" />
              </FormItem>
              <FormItem label="邮箱密码" field="emailPassword">
                <Input.Password placeholder="请输入邮箱密码或授权码" />
              </FormItem>

              <Divider orientation="left">短信通知</Divider>
              <FormItem label="启用短信通知" field="enableSMS" triggerPropName="checked">
                <Switch />
              </FormItem>
              <FormItem label="短信服务商" field="smsProvider">
                <Select placeholder="请选择短信服务商">
                  <Select.Option value="aliyun">阿里云</Select.Option>
                  <Select.Option value="tencent">腾讯云</Select.Option>
                  <Select.Option value="huawei">华为云</Select.Option>
                </Select>
              </FormItem>
              <FormItem label="AccessKey" field="smsAccessKey">
                <Input placeholder="请输入AccessKey" />
              </FormItem>
              <FormItem label="AccessSecret" field="smsAccessSecret">
                <Input.Password placeholder="请输入AccessSecret" />
              </FormItem>

              <FormItem>
                <Button type="primary" icon={<IconSave />} onClick={handleMessageSubmit}>
                  保存配置
                </Button>
              </FormItem>
            </Form>
          </TabPane>

          <TabPane key="backup" title="备份与恢复">
            <Form form={backupForm} layout="vertical" style={{ maxWidth: 800 }}>
              <Divider orientation="left">自动备份配置</Divider>
              <FormItem label="启用自动备份" field="enableAutoBackup" triggerPropName="checked">
                <Switch />
              </FormItem>
              <FormItem label="备份频率" field="backupInterval">
                <Select placeholder="请选择备份频率">
                  <Select.Option value="daily">每日备份</Select.Option>
                  <Select.Option value="weekly">每周备份</Select.Option>
                  <Select.Option value="monthly">每月备份</Select.Option>
                </Select>
              </FormItem>
              <FormItem label="备份时间" field="backupTime">
                <Input placeholder="请输入备份时间,如:02:00" />
              </FormItem>
              <FormItem label="备份保留天数" field="backupRetention">
                <InputNumber placeholder="请输入保留天数" min={1} style={{ width: '100%' }} />
              </FormItem>
              <FormItem label="备份存储路径" field="backupPath">
                <Input placeholder="请输入备份文件存储路径" />
              </FormItem>

              <FormItem>
                <Space>
                  <Button key="save" type="primary" icon={<IconSave />} onClick={handleBackupSubmit}>
                    保存配置
                  </Button>
                  <Button key="backup" onClick={handleBackupNow}>立即备份</Button>
                  <Button key="restore" status="warning" onClick={handleRestore}>
                    数据恢复
                  </Button>
                </Space>
              </FormItem>
            </Form>
          </TabPane>

          <TabPane key="business" title="业务参数配置">
            <Form form={businessForm} layout="vertical" style={{ maxWidth: 800 }}>
              <Divider orientation="left">线索管理</Divider>
              <FormItem
                label="线索自动回收天数"
                field="leadRecycleDays"
                extra="销售认领线索后,若超过设置天数未跟进,系统将自动回收至公海线索"
              >
                <InputNumber placeholder="请输入天数" min={1} style={{ width: '100%' }} />
              </FormItem>
              <FormItem
                label="跟进提醒天数"
                field="followRemindDays"
                extra="线索超过设置天数未跟进,系统将发送提醒通知"
              >
                <InputNumber placeholder="请输入天数" min={1} style={{ width: '100%' }} />
              </FormItem>
              <FormItem label="启用线索查重" field="enableDuplicateCheck" triggerPropName="checked">
                <Switch />
              </FormItem>
              <FormItem label="启用线索自动分配" field="enableAutoAssign" triggerPropName="checked">
                <Switch />
              </FormItem>

              <Divider orientation="left">客户管理</Divider>
              <FormItem
                label="客户闲置天数"
                field="customerInactiveDays"
                extra="客户超过设置天数无任何业务往来,系统将标记为闲置客户"
              >
                <InputNumber placeholder="请输入天数" min={1} style={{ width: '100%' }} />
              </FormItem>

              <Divider orientation="left">合同管理</Divider>
              <FormItem
                label="合同到期提醒天数"
                field="contractExpireRemindDays"
                extra="合同到期前N天发送提醒通知"
              >
                <InputNumber placeholder="请输入天数" min={1} style={{ width: '100%' }} />
              </FormItem>

              <FormItem>
                <Button type="primary" icon={<IconSave />} onClick={handleBusinessSubmit}>
                  保存配置
                </Button>
              </FormItem>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
