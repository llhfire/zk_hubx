import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Grid,
} from '@arco-design/web-react';
import type { SopStep } from './types';

const { Row, Col } = Grid;
const { TextArea } = Input;

interface CustomStepModalProps {
  visible: boolean;
  phaseId: string;
  phaseNo: number;
  projectId: string;
  existingCustomStepCount: number;
  onCancel: () => void;
  onSave: (newStep: SopStep) => void;
  projectMembers: Record<string, string[]>;
}

const CustomStepModal: React.FC<CustomStepModalProps> = ({
  visible,
  phaseId,
  phaseNo,
  projectId,
  existingCustomStepCount,
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

  /** 弹窗打开时重置表单 */
  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleOk = async () => {
    try {
      await form.validate();
    } catch {
      return;
    }

    const values = form.getFieldsValue();

    const newStep: SopStep = {
      id: `step-custom-${Date.now()}`,
      phaseId,
      projectId,
      stepNo: `${phaseNo}-C${existingCustomStepCount + 1}`,
      stepName: values.stepName,
      department: values.department || '',
      assignee: values.assignee,
      status: 'pending',
      startDate: values.startDate || '',
      dueDate: values.dueDate || '',
      deliverables: values.deliverables || '',
      description: '',
      notes: '',
      tools: '',
      isCustom: true,
      isEvergreen: false,
      userNotes: values.userNotes || '',
    };

    onSave(newStep);
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="添加自定义步骤"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="添加"
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
            <Form.Item
              label="步骤名称"
              field="stepName"
              rules={[{ required: true, message: '请输入步骤名称' }]}
            >
              <Input placeholder="请输入步骤名称" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="执行人"
              field="assignee"
              rules={[{ required: true, message: '请选择执行人' }]}
            >
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
            <Form.Item label="所属部门" field="department">
              <Input placeholder="请输入所属部门" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="开始日期"
              field="startDate"
              rules={[{ required: true, message: '请选择开始日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="截止日期"
              field="dueDate"
              rules={[{ required: true, message: '请选择截止日期' }]}
            >
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
            <Form.Item label="备注" field="userNotes">
              <TextArea placeholder="请输入备注" autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CustomStepModal;
