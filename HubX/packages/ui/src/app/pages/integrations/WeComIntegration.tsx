import { useEffect, useMemo } from 'react';
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Grid,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconRefresh, IconSafe, IconSync, IconEdit } from '@arco-design/web-react/icon';
import { useIntegration } from '@/app/integrations/IntegrationContext';
import type { SyncDiff, SyncPolicy, WeComConfig } from '@/app/integrations/types';

const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;
const Text = Typography.Text;

const actionMeta = {
  create: { label: '新增', color: 'green' },
  update: { label: '更新', color: 'arcoblue' },
  disable: { label: '停用', color: 'orange' },
  conflict: { label: '冲突', color: 'red' },
} as const;

export function WeComIntegration() {
  const {
    wecomConfig,
    setWeComConfig,
    syncPreview,
    previewSync,
    applySync,
    bindings,
    syncHistory,
    syncPolicy,
    setSyncPolicy,
  } = useIntegration();
  const [form] = Form.useForm<WeComConfig>();
  const [policyForm] = Form.useForm<SyncPolicy>();
  const [editingPolicy, setEditingPolicy] = useState(false);

  useEffect(() => form.setFieldsValue(wecomConfig), [form, wecomConfig]);
  useEffect(() => policyForm.setFieldsValue(syncPolicy), [policyForm, syncPolicy]);

  const stats = useMemo(() => ({
    create: syncPreview.filter((item) => item.action === 'create').length,
    update: syncPreview.filter((item) => item.action === 'update').length,
    disable: syncPreview.filter((item) => item.action === 'disable').length,
    conflict: syncPreview.filter((item) => item.action === 'conflict').length,
  }), [syncPreview]);

  const saveConfig = async () => {
    const values = await form.validate();
    setWeComConfig({ ...wecomConfig, ...values });
    Message.success('企业微信模拟配置已保存');
  };

  const confirmSync = () => {
    Modal.confirm({
      title: '确认应用同步结果？',
      content: '新增、更新和停用项将写入本地模拟数据；冲突项保留待人工处理。HubX 职级、成本、绩效等内部字段不会被覆盖。',
      onOk: () => {
        applySync();
        Message.success('模拟同步完成，冲突项已保留');
      },
    });
  };

  const savePolicy = async () => {
    const values = await policyForm.validate();
    setSyncPolicy(values);
    setEditingPolicy(false);
    Message.success('同步规则已保存');
  };

  const columns = [
    { title: '员工', dataIndex: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '企业微信 UserId', dataIndex: 'wecomUserId', width: 150 },
    { title: '部门', dataIndex: 'department', width: 110 },
    { title: '职位', dataIndex: 'position', width: 120 },
    {
      title: '变更',
      dataIndex: 'action',
      width: 90,
      render: (action: SyncDiff['action']) => <Tag color={actionMeta[action].color}>{actionMeta[action].label}</Tag>,
    },
    { title: '差异说明', dataIndex: 'detail' },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, record: SyncDiff) => record.action === 'conflict'
        ? <Tooltip content="处理冲突"><Button type="text" size="small" icon={<IconEdit />} onClick={() => Message.info('正式接入时可选择匹配员工或创建新员工')} /></Tooltip>
        : <Text type="secondary">自动处理</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <Text type="secondary">统一维护员工通讯录同步、绑定状态和数据边界。</Text>
        </div>
        <Space>
          <Tag color="orange">模拟模式</Tag>
          <Tag color="gray">自建应用未连接</Tag>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        content="当前不会连接真实企业微信。你可以先通过预检同步体验新增、更新、停用和冲突处理流程。"
      />

      <Card bordered={false} bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic title="连接状态" value="未连接" valueStyle={{ fontSize: 20, color: 'rgb(var(--orange-6))' }} />
          </Col>
          <Col span={6}>
            <Statistic title="运行模式" value="模拟" valueStyle={{ fontSize: 20 }} />
          </Col>
          <Col span={6}>
            <Statistic title="自动同步" value={wecomConfig.autoSync ? wecomConfig.syncTime : '已关闭'} valueStyle={{ fontSize: 20 }} />
          </Col>
          <Col span={6}>
            <Statistic title="已绑定员工" value={bindings.filter((item) => item.bindingStatus === 'bound').length} suffix="人" valueStyle={{ fontSize: 20 }} />
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ paddingTop: 4 }}>
        <Tabs defaultActiveTab="sync">
          <Tabs.TabPane key="sync" title="通讯录同步">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <div>
                <Text bold>同步差异预检</Text>
                <div><Text type="secondary">先查看变更清单，确认后再应用；冲突员工不会自动合并。</Text></div>
              </div>
              <Space>
                <Button icon={<IconRefresh />} onClick={previewSync}>预检同步</Button>
                <Button type="primary" icon={<IconSync />} disabled={syncPreview.length === 0} onClick={confirmSync}>应用同步</Button>
              </Space>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: '待新增', value: stats.create, color: 'rgb(var(--green-6))' },
                { label: '待更新', value: stats.update, color: 'rgb(var(--arcoblue-6))' },
                { label: '待停用', value: stats.disable, color: 'rgb(var(--orange-6))' },
                { label: '待处理冲突', value: stats.conflict, color: 'rgb(var(--red-6))' },
              ].map((item) => (
                <div key={item.label} style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--color-fill-1)', border: '1px solid var(--color-border-1)' }}>
                  <Text type="secondary">{item.label}</Text>
                  <div style={{ marginTop: 4, fontSize: 24, fontWeight: 600, color: item.value ? item.color : 'var(--color-text-1)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Table rowKey="id" columns={columns} data={syncPreview} pagination={false} noDataElement="暂无差异，点击右上角“预检同步”开始检查" />
          </Tabs.TabPane>

          <Tabs.TabPane key="connection" title="连接设置">
            <div style={{ maxWidth: 880, paddingTop: 8 }}>
              <div style={{ marginBottom: 20 }}>
                <Text bold>运行设置</Text>
                <div><Text type="secondary">正式创建企业微信自建应用后，再填写连接凭证。</Text></div>
              </div>
              <Form form={form} layout="vertical">
                <Row gutter={24}>
                  <Col span={8}><FormItem label="启用企业微信" field="enabled" triggerPropName="checked"><Switch /></FormItem></Col>
                  <Col span={8}><FormItem label="每日自动同步" field="autoSync" triggerPropName="checked"><Switch /></FormItem></Col>
                  <Col span={8}><FormItem label="同步时间" field="syncTime"><Input type="time" /></FormItem></Col>
                </Row>
                <div style={{ height: 1, background: 'var(--color-border-1)', margin: '4px 0 20px' }} />
                <Text bold>应用凭证</Text>
                <Row gutter={24} style={{ marginTop: 16 }}>
                  <Col span={12}><FormItem label="企业 ID（CorpId）" field="corpId"><Input placeholder="模拟模式可留空" /></FormItem></Col>
                  <Col span={12}><FormItem label="应用 AgentId" field="agentId"><Input placeholder="模拟模式可留空" /></FormItem></Col>
                  <Col span={12}><FormItem label="通讯录 Secret" field="contactSecret"><Input.Password placeholder="保存后仅保留掩码" /></FormItem></Col>
                  <Col span={12}><FormItem label="应用 Secret" field="appSecret"><Input.Password placeholder="保存后仅保留掩码" /></FormItem></Col>
                </Row>
                <Button type="primary" icon={<IconSafe />} onClick={saveConfig}>保存设置</Button>
              </Form>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="rules" title="同步规则">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <div>
                <Text bold>员工同步策略</Text>
                <div><Text type="secondary">配置同步触发方式、身份匹配和异常员工处理方式。</Text></div>
              </div>
              {editingPolicy ? (
                <Space>
                  <Button onClick={() => { policyForm.setFieldsValue(syncPolicy); setEditingPolicy(false); }}>取消</Button>
                  <Button type="primary" onClick={savePolicy}>保存规则</Button>
                </Space>
              ) : (
                <Button onClick={() => setEditingPolicy(true)}>编辑规则</Button>
              )}
            </div>

            {editingPolicy ? (
              <Form form={policyForm} layout="vertical" style={{ maxWidth: 880 }}>
                <Row gutter={24}>
                  <Col span={12}>
                    <FormItem label="同步方式" field="syncMethods" rules={[{ required: true, message: '至少选择一种同步方式' }]}>
                      <Checkbox.Group
                        options={[
                          { label: '定时全量同步', value: 'scheduled' },
                          { label: '回调增量同步', value: 'callback' },
                          { label: '管理员手动同步', value: 'manual' },
                        ]}
                      />
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label="身份匹配顺序" field="matchOrder" rules={[{ required: true }]}>
                      <Select
                        mode="multiple"
                        options={[
                          { label: '企业微信 UserId', value: 'wecomUserId' },
                          { label: '手机号', value: 'phone' },
                          { label: '企业邮箱', value: 'email' },
                        ]}
                      />
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label="匹配冲突处理" field="conflictAction">
                      <Select
                        options={[
                          { label: '进入待处理列表，由管理员确认', value: 'manual' },
                          { label: '跳过冲突员工并记录日志', value: 'skip' },
                        ]}
                      />
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label="企业微信停用/删除员工" field="disabledEmployeeAction">
                      <Select
                        options={[
                          { label: 'HubX 自动标记为已离职', value: 'mark_resigned' },
                          { label: 'HubX 标记为已停用', value: 'mark_disabled' },
                        ]}
                      />
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label="同名员工自动合并" field="sameNameAutoMerge" triggerPropName="checked">
                      <Switch />
                      <Text type="secondary" style={{ marginLeft: 8 }}>建议关闭，避免重名误绑定</Text>
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label="保留离职员工历史记录" field="preserveHistory" triggerPropName="checked">
                      <Switch disabled />
                      <Text type="secondary" style={{ marginLeft: 8 }}>系统安全规则，不允许关闭</Text>
                    </FormItem>
                  </Col>
                </Row>
              </Form>
            ) : (
              <Descriptions
                column={2}
                border
                data={[
                  {
                    label: '同步方式',
                    value: syncPolicy.syncMethods.map((value) => ({
                      scheduled: '定时全量',
                      callback: '回调增量',
                      manual: '管理员手动',
                    }[value])).join(' + '),
                  },
                  {
                    label: '身份匹配顺序',
                    value: syncPolicy.matchOrder.map((value) => ({
                      wecomUserId: '企业微信 UserId',
                      phone: '手机号',
                      email: '企业邮箱',
                    }[value])).join(' → '),
                  },
                  { label: '冲突处理', value: syncPolicy.conflictAction === 'manual' ? '进入待处理列表，由管理员确认' : '跳过并记录日志' },
                  { label: '同名员工', value: syncPolicy.sameNameAutoMerge ? '允许自动合并' : '不自动合并' },
                  { label: '员工停用/删除', value: syncPolicy.disabledEmployeeAction === 'mark_resigned' ? 'HubX 自动标记为已离职' : 'HubX 标记为已停用' },
                  { label: '历史数据', value: '永久保留员工历史业务记录' },
                ]}
              />
            )}

            <Alert
              style={{ marginTop: 20 }}
              type="warning"
              content="数据归属为固定边界：姓名、手机、邮箱、部门、职位和状态由企业微信维护；职级、成本、绩效和能力等内部字段由 HubX 维护。"
            />
            <div style={{ marginTop: 24, marginBottom: 12 }}><Text bold>最近同步记录</Text></div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '同步时间', dataIndex: 'time' },
                { title: '结果', dataIndex: 'summary' },
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color="orange">{value}</Tag> },
              ]}
              data={syncHistory}
              noDataElement="暂无同步记录"
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </Space>
  );
}
