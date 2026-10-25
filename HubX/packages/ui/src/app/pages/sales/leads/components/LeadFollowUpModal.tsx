import { useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Radio,
  Select,
  Tooltip,
  Upload,
} from '@arco-design/web-react';
import { IconFullscreen, IconFullscreenExit, IconUpload } from '@arco-design/web-react/icon';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { INTENTION_LEVEL_LIST, SALES_STATUS_LIST } from '../types';
import './LeadFollowUpModal.css';

const FormItem = Form.Item;

export interface LeadFollowUpFormValues {
  method: string;
  customerStatus: string;
  intentionLevel?: string;
  costHours?: number;
  costMins?: number;
  content: string;
  attachments: UploadItem[];
  nextFollowTime?: unknown;
}

interface LeadFollowUpModalProps {
  visible: boolean;
  submitting?: boolean;
  defaultStatus: string;
  defaultIntention?: string;
  onCancel: () => void;
  onSubmit: (values: LeadFollowUpFormValues) => void | Promise<void>;
}

export function LeadFollowUpModal({
  visible,
  submitting = false,
  defaultStatus,
  defaultIntention,
  onCancel,
  onSubmit,
}: LeadFollowUpModalProps) {
  const [form] = Form.useForm<LeadFollowUpFormValues>();
  const [fullscreen, setFullscreen] = useState(false);
  const [costHours, setCostHours] = useState<number | undefined>();
  const [costMins, setCostMins] = useState<number | undefined>();
  const [attachments, setAttachments] = useState<UploadItem[]>([]);

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    form.setFieldsValue({
      method: '电话沟通',
      customerStatus: defaultStatus,
      intentionLevel: defaultIntention,
    });
    setCostHours(undefined);
    setCostMins(undefined);
    setAttachments([]);
    setFullscreen(false);
  }, [defaultIntention, defaultStatus, form, visible]);

  const close = () => {
    if (submitting) return;
    form.resetFields();
    setAttachments([]);
    onCancel();
  };

  const submit = async () => {
    try {
      const values = await form.validate();
      await onSubmit({
        ...values,
        costHours,
        costMins,
        attachments,
      });
    } catch {
      // 表单校验错误由 Arco 在字段旁展示。
    }
  };

  return (
    <Modal
      className={`lead-followup-modal${fullscreen ? ' lead-followup-modal--fullscreen' : ''}`}
      title={(
        <div className="lead-followup-modal__header">
          <span>添加跟进记录</span>
          <Tooltip content={fullscreen ? '退出全屏' : '全屏填写'}>
            <Button
              className="lead-followup-modal__fullscreen"
              type="text"
              htmlType="button"
              aria-label={fullscreen ? '退出全屏' : '全屏填写'}
              icon={fullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
              onClick={() => setFullscreen((current) => !current)}
            />
          </Tooltip>
        </div>
      )}
      visible={visible}
      onOk={submit}
      onCancel={close}
      confirmLoading={submitting}
      okText="确定"
      cancelText="取消"
      maskClosable={false}
      alignCenter
      unmountOnExit
      style={fullscreen ? undefined : { width: 'calc(100vw - 32px)', maxWidth: 960 }}
      footer={(cancelButtonNode, okButtonNode) => (
        <div className="lead-followup-modal__footer">
          {cancelButtonNode}
          {okButtonNode}
        </div>
      )}
    >
      <Form form={form} layout="horizontal" className="lead-followup-form">
        <FormItem label="跟进方式" field="method" required rules={[{ required: true, message: '请选择跟进方式' }]}>
          <Radio.Group className="lead-followup-form__radios">
            <Radio value="电话沟通">电话沟通</Radio>
            <Radio value="微信沟通">微信沟通</Radio>
            <Radio value="上门拜访">上门拜访</Radio>
            <Radio value="其他">其他</Radio>
          </Radio.Group>
        </FormItem>

        <FormItem label="客户状态" field="customerStatus" required rules={[{ required: true, message: '请选择客户状态' }]}>
          <Select placeholder="请选择客户当前状态" options={SALES_STATUS_LIST.map((value) => ({ label: value, value }))} />
        </FormItem>

        <FormItem label="意向等级" field="intentionLevel">
          <Radio.Group className="lead-followup-form__radios">
            {INTENTION_LEVEL_LIST.map((value) => (
              <Radio key={value} value={value}>{value === '无意向' ? value : `意向${value}`}</Radio>
            ))}
          </Radio.Group>
        </FormItem>

        <FormItem label="消耗时间">
          <div className="lead-followup-form__duration">
            <InputNumber min={0} max={999} precision={0} placeholder="小时" value={costHours} onChange={setCostHours} />
            <span>小时</span>
            <InputNumber min={0} max={59} precision={0} placeholder="分钟" value={costMins} onChange={setCostMins} />
            <span>分钟</span>
          </div>
        </FormItem>

        <FormItem label="跟进详情" field="content" required rules={[{ required: true, message: '请输入跟进详情' }, { maxLength: 2000, message: '最多输入 2000 个字符' }]}>
          <Input.TextArea
            rows={6}
            maxLength={2000}
            showWordLimit
            placeholder="请详细记录本次沟通的内容、客户反馈、关键信息等"
          />
        </FormItem>

        <FormItem label="附件上传" className="lead-followup-form__upload">
          <Upload
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            multiple
            limit={10}
            drag
            autoUpload={false}
            fileList={attachments}
            onChange={setAttachments}
            onRemove={(file) => {
              setAttachments((current) => current.filter((item) => item.uid !== file.uid));
              return false;
            }}
            onExceedLimit={() => Message.warning('跟进附件最多上传 10 个')}
          >
            <div className="lead-followup-form__upload-content">
              <IconUpload />
              <strong>点击或拖拽文件到此处上传</strong>
              <span>支持图片、PDF、Word、Excel，最多 10 个文件</span>
            </div>
          </Upload>
        </FormItem>

        <FormItem label="下次跟进提醒" field="nextFollowTime">
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择下次跟进时间"
            style={{ width: '100%' }}
          />
        </FormItem>
      </Form>
    </Modal>
  );
}
