import { useState } from 'react';
import { Button, Select, Input, Modal, Form, Timeline, Tag, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useContracts } from '../ContractsContext';
import type { Contract, BlockerType } from '../types';
import { BLOCKER_TYPE_LABELS } from '../types';

const FormItem = Form.Item;
const TimelineItem = Timeline.Item;

interface Props {
  contract: Contract;
}

export function BlockerDunningPanel({ contract }: Props) {
  const { addBlocker, resolveBlocker, addDunning } = useContracts();
  const [blockerVisible, setBlockerVisible] = useState(false);
  const [dunningVisible, setDunningVisible] = useState(false);
  const [blockerForm] = Form.useForm();
  const [dunningForm] = Form.useForm();

  const activeBlockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);
  const resolvedBlockers = (contract.paymentBlockers ?? []).filter(b => b.resolvedAt);
  const dunningRecords = contract.dunningRecords ?? [];

  const handleAddBlocker = () => {
    blockerForm.validate().then((values: Record<string, unknown>) => {
      addBlocker(contract.id, {
        type: values.type as BlockerType,
        title: values.title as string,
        description: (values.description as string) || '',
        amountBlocked: Number(values.amountBlocked) || 0,
      });
      setBlockerVisible(false);
      blockerForm.resetFields();
      Message.success('卡点已添加');
    });
  };

  const handleAddDunning = () => {
    dunningForm.validate().then((values: Record<string, unknown>) => {
      addDunning(contract.id, {
        date: values.date as string,
        method: values.method as string,
        contactPerson: values.contactPerson as string,
        result: (values.result as string) || '',
        nextPlan: (values.nextPlan as string) || '',
      });
      setDunningVisible(false);
      dunningForm.resetFields();
      Message.success('催款记录已添加');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 卡点管理 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>卡点管理</span>
          <Button size="mini" type="primary" icon={<IconPlus />} onClick={() => setBlockerVisible(true)}>
            添加卡点
          </Button>
        </div>
        {activeBlockers.length === 0 && resolvedBlockers.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>暂无卡点</div>
        )}
        {activeBlockers.map(b => (
          <div key={b.id} style={{ background: '#fef2f2', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Tag color="red" size="small">{BLOCKER_TYPE_LABELS[b.type]}</Tag>
                <span style={{ fontWeight: 600, marginLeft: 4 }}>{b.title}</span>
              </div>
              <Button
                size="mini"
                type="outline"
                status="success"
                onClick={() => {
                  resolveBlocker(contract.id, b.id);
                  Message.success('卡点已解决');
                }}
              >
                解决
              </Button>
            </div>
            <div style={{ color: '#94a3b8', marginTop: 4 }}>卡住金额：¥{(b.amountBlocked / 10000).toFixed(1)}万</div>
          </div>
        ))}
        {resolvedBlockers.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            已解决 {resolvedBlockers.length} 个卡点
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb' }} />

      {/* 催款记录 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>催款记录</span>
          <Button size="mini" type="primary" icon={<IconPlus />} onClick={() => setDunningVisible(true)}>
            添加催款
          </Button>
        </div>
        {dunningRecords.length > 0 ? (
          <Timeline>
            {dunningRecords.map(d => (
              <TimelineItem key={d.id} label={d.date}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{d.method}</span> · 联系人：{d.contactPerson}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>结果：{d.result}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>下一步：{d.nextPlan}</div>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>暂无催款记录</div>
        )}
      </div>

      {/* 添加卡点 Modal */}
      <Modal
        title="添加卡点"
        visible={blockerVisible}
        onCancel={() => setBlockerVisible(false)}
        onOk={handleAddBlocker}
      >
        <Form form={blockerForm} layout="vertical">
          <FormItem label="卡点类型" field="type" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="请选择">
              {Object.entries(BLOCKER_TYPE_LABELS).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="标题" field="title" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：客户验收迟迟不签字" />
          </FormItem>
          <FormItem label="描述" field="description">
            <Input.TextArea placeholder="卡点详细描述" />
          </FormItem>
          <FormItem label="卡住金额（元）" field="amountBlocked">
            <Input type="number" placeholder="0" />
          </FormItem>
        </Form>
      </Modal>

      {/* 添加催款 Modal */}
      <Modal
        title="添加催款记录"
        visible={dunningVisible}
        onCancel={() => setDunningVisible(false)}
        onOk={handleAddDunning}
      >
        <Form form={dunningForm} layout="vertical">
          <FormItem label="日期" field="date" rules={[{ required: true, message: '请输入日期' }]}>
            <Input placeholder="2026-07-01" />
          </FormItem>
          <FormItem label="方式" field="method" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="请选择">
              <Select.Option value="电话">电话</Select.Option>
              <Select.Option value="微信">微信</Select.Option>
              <Select.Option value="邮件">邮件</Select.Option>
              <Select.Option value="当面">当面</Select.Option>
            </Select>
          </FormItem>
          <FormItem label="联系人" field="contactPerson" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="对方联系人" />
          </FormItem>
          <FormItem label="结果" field="result">
            <Input.TextArea placeholder="催款结果" />
          </FormItem>
          <FormItem label="下一步计划" field="nextPlan">
            <Input placeholder="下一步计划" />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
