import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Message,
  Grid,
} from '@arco-design/web-react';
import type { SopStep, SopStepStatus } from './types';

const { Row, Col } = Grid;
const { TextArea } = Input;

interface StepEditModalProps {
  visible: boolean;
  step: SopStep | null;
  onCancel: () => void;
  onSave: (stepId: string, updates: Partial<SopStep>) => void;
  projectMembers: Record<string, string[]>;
}

/** 允许的状态转移表 */
const VALID_TRANSITIONS: Record<SopStepStatus, SopStepStatus[]> = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['completed', 'skipped'],
  completed: ['in_progress'],
  skipped: [],
};

const STATUS_OPTIONS: { value: SopStepStatus; label: string }[] = [
  { value: 'pending', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'skipped', label: '已跳过' },
];

const StepEditModal: React.FC<StepEditModalProps> = ({
  visible,
  step,
  onCancel,
  onSave,
  projectMembers,
}) => {
  const [form] = Form.useForm();

  /** 将 projectMembers 扁平化并去重 */
  const memberOptions = useMemo(() => {
    const all = Object.values(projectMembers).flat();
    return [...new Set(all)].map((name) => ({
      value: name,
      label: name,
    }));
  }, [projectMembers]);

  /** 步骤切换时重置表单 */
  useEffect(() => {
    if (visible && step) {
      form.resetFields();
      form.setFieldsValue({
        stepName: step.stepName,
        assignee: step.assignee,
        status: step.status,
        startDate: step.startDate || undefined,
        dueDate: step.dueDate || undefined,
        deliverables: step.deliverables,
        userNotes: step.userNotes,
      });
    }
  }, [visible, step, form]);

  const handleOk = async () => {
    try {
      await form.validate();
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    const newStatus = values.status as SopStepStatus;

    // 校验状态转移合法性
    if (step && newStatus !== step.status) {
      const allowed = VALID_TRANSITIONS[step.status];
      if (!allowed.includes(newStatus)) {
        Message.warning(
          `不允许从"${STATUS_OPTIONS.find((o) => o.value === step.status)?.label}"切换到"${
            STATUS_OPTIONS.find((o) => o.value === newStatus)?.label
          }"`
        );
        return;
      }
    }

    const updates: Partial<SopStep> = {
      stepName: values.stepName,
      assignee: values.assignee,
      status: newStatus,
      startDate: values.startDate || '',
      dueDate: values.dueDate || '',
      deliverables: values.deliverables || '',
      userNotes: values.userNotes || '',
    };

    onSave(step!.id, updates);
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="编辑步骤"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      style={{ width: 620 }}
      maskClosable={false}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="步骤名称" field="stepName">
              <Input
                placeholder="请输入步骤名称"
                disabled={!(step?.isCustom)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="执行人" field="assignee">
              <Select
                placeholder="请选择执行人"
                options={memberOptions}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="状态" field="status">
              <Select
                placeholder="请选择状态"
                options={STATUS_OPTIONS}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="开始日期" field="startDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="截止日期" field="dueDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="执行产物" field="deliverables">
              <TextArea placeholder="请输入执行产物" autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="用户备注" field="userNotes">
              <TextArea placeholder="请输入用户备注" autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default StepEditModal;
