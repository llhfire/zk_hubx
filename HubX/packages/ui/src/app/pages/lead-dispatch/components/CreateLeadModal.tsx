// 录入表单（PLAN.md 阶段 B：9 字段 + 初始分配二选一）
// 必填：业务线/客户名称/联系人/手机号/来源渠道/主体/初始分配
// 选填：渠道计划（channelPlan 自由文本）/客户等级（默认 B）
// 意向评分不落库、无 D 级（grill 决策 5/6）

import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Radio, Message } from '@arco-design/web-react';
import { LEAD_SOURCE_LIST, LEAD_SOURCE_LABEL, COMPANY_ENTITY_LIST, CUSTOMER_LEVEL_LIST } from '@/app/pages/leads/types';
import { BUSINESS_LINE_LABEL, type LeadBusinessLine } from '../types';
import type { Employee } from '@/app/pages/employee/mockData';

export interface CreateLeadFormPayload {
  businessLine: LeadBusinessLine;
  name: string;
  contact: string;
  phone: string;
  source: string;
  channelPlan: string;
  entity: string;
  customerLevel: string;
  /** 存待派发池（pool）或立即指派（sales） */
  initialAssign: 'pool' | 'sales';
  /** 立即指派时的目标销售姓名 */
  assignee?: string;
}

interface CreateLeadModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLeadFormPayload) => Promise<void>;
  employees: Employee[];
}

const FormItem = Form.Item;

export function CreateLeadModal({ visible, onClose, onSubmit, employees }: CreateLeadModalProps) {
  const [form] = Form.useForm();
  const [initialAssign, setInitialAssign] = useState<'pool' | 'sales'>('pool');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setInitialAssign('pool');
    }
  }, [visible, form]);

  const salesDepartments = useMemo(() => {
    // 销售候选 = 部门或岗位含「销售」的在职员工（不写死名单，grill 决策 9）
    return [...new Set(
      employees
        .filter((e) => e.department.includes('销售') || e.position.includes('销售'))
        .map((e) => e.department),
    )];
  }, [employees]);

  const [department, setDepartment] = useState<string>();
  const salesOfDept = useMemo(
    () => employees.filter((e) => e.department === department && (e.department.includes('销售') || e.position.includes('销售'))),
    [employees, department],
  );

  const handleOk = async () => {
    try {
      const values = await form.validate();
      setSubmitting(true);
      await onSubmit({
        businessLine: values.businessLine,
        name: values.name,
        contact: values.contact,
        phone: values.phone,
        source: values.source,
        channelPlan: values.channelPlan ?? '',
        entity: values.entity,
        customerLevel: values.customerLevel ?? 'B',
        initialAssign,
        assignee: initialAssign === 'sales' ? values.assignee : undefined,
      });
      Message.success(initialAssign === 'sales' ? `已录入并派发给 ${values.assignee}` : '已录入，存入待派发池');
      onClose();
    } catch {
      // 校验失败或提交失败：留在弹窗
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="录入新线索"
      visible={visible}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="确认录入"
      style={{ width: 640 }}
    >
      <Form form={form} layout="vertical" initialValues={{ customerLevel: 'B' }}>
        <Form.Item label="业务线" field="businessLine" rules={[{ required: true, message: '请选择业务线' }]}>
          <Select placeholder="请选择">
            {(Object.keys(BUSINESS_LINE_LABEL) as LeadBusinessLine[]).map((b) => (
              <Select.Option key={b} value={b}>{BUSINESS_LINE_LABEL[b]}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="客户名称" field="name" rules={[{ required: true, message: '请输入客户名称' }]}>
          <Input placeholder="客户 / 线索名称" />
        </Form.Item>
        <Form.Item label="联系人" field="contact" rules={[{ required: true, message: '请输入联系人' }]}>
          <Input placeholder="联系人姓名" />
        </Form.Item>
        <Form.Item
          label="手机号"
          field="phone"
          rules={[
            { required: true, message: '请输入手机号' },
            { match: /^1\d{10}$/, message: '手机号格式不正确' },
          ]}
        >
          <Input placeholder="联系手机号" maxLength={11} />
        </Form.Item>
        <Form.Item label="来源渠道" field="source" rules={[{ required: true, message: '请选择来源渠道' }]}>
          <Select placeholder="请选择（数据字典）">
            {LEAD_SOURCE_LIST.map((c) => (
              <Select.Option key={c} value={c}>{LEAD_SOURCE_LABEL[c]}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="渠道计划（选填）" field="channelPlan">
          <Input placeholder="广告计划 / 投放笔记说明，自由文本" />
        </Form.Item>
        <Form.Item label="主体" field="entity" rules={[{ required: true, message: '请选择主体' }]}>
          <Select placeholder="请选择">
            {COMPANY_ENTITY_LIST.map((e) => (
              <Select.Option key={e} value={e}>{e}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="客户等级（选填）" field="customerLevel">
          <Select placeholder="初始分级，默认 B" allowClear>
            {CUSTOMER_LEVEL_LIST.map((l) => (
              <Select.Option key={l} value={l}>{l} 级</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="初始分配" required>
          <Radio.Group value={initialAssign} onChange={(v) => setInitialAssign(v)}>
            <Radio value="pool">存待派发池（启动 30min 派发监控）</Radio>
            <Radio value="sales">立即指派销售（派发一次做完）</Radio>
          </Radio.Group>
        </Form.Item>
        {initialAssign === 'sales' && (
          <>
            <Form.Item label="指派部门">
              <Select
                placeholder="请选择部门"
                value={department}
                onChange={(v) => { setDepartment(v); form.setFieldValue('assignee', undefined); }}
              >
                {salesDepartments.map((d) => (
                  <Select.Option key={d} value={d}>{d}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="指派销售"
              field="assignee"
              rules={[{ required: true, message: '请选择销售' }]}
            >
              <Select placeholder="请选择销售（来自组织架构）" disabled={!department}>
                {salesOfDept.map((e) => (
                  <Select.Option key={e.id} value={e.name}>{e.name} · {e.position}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
