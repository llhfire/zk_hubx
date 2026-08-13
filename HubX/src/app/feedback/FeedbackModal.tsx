import { useEffect, useState } from 'react';
import { Form, Input, Message, Modal, Select, Upload } from '@arco-design/web-react';
import { IconUpload } from '@arco-design/web-react/icon';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { useLocation } from 'react-router';
import { feedbackTypeLabels, type FeedbackType, useFeedback } from './FeedbackContext';

const FormItem = Form.Item;

interface FeedbackModalProps {
  visible: boolean;
  onCancel: () => void;
}

export function FeedbackModal({ visible, onCancel }: FeedbackModalProps) {
  const [form] = Form.useForm();
  const location = useLocation();
  const { submitFeedback } = useFeedback();
  const currentPath = `${location.pathname}${location.search}`;
  const [attachmentFileList, setAttachmentFileList] = useState<UploadItem[]>([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ type: 'suggestion' });
      setAttachmentFileList([]);
    }
  }, [form, visible]);

  const handleSubmit = () => {
    form.validate().then(async (values) => {
      try {
        await submitFeedback({
          type: values.type as FeedbackType,
          content: values.content,
          pagePath: currentPath,
          attachments: attachmentFileList
            .map((item) => item.originFile)
            .filter((file): file is File => file instanceof File),
        });
        Message.success('反馈已提交，感谢你的建议');
        onCancel();
      } catch {
        Message.error('附件保存失败，请重新选择后提交');
      }
    });
  };

  return (
    <Modal
      title="意见反馈"
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="提交反馈"
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <FormItem label="反馈类型" field="type" rules={[{ required: true, message: '请选择反馈类型' }]}>
          <Select placeholder="请选择反馈类型">
            {(Object.entries(feedbackTypeLabels) as [FeedbackType, string][]).map(([value, label]) => (
              <Select.Option key={value} value={value}>{label}</Select.Option>
            ))}
          </Select>
        </FormItem>
        <FormItem
          label="反馈内容"
          field="content"
          rules={[
            { required: true, message: '请填写反馈内容' },
            { maxLength: 500, message: '反馈内容不能超过 500 个字符' },
          ]}
        >
          <Input.TextArea placeholder="请描述遇到的问题或你的建议" autoSize={{ minRows: 5, maxRows: 8 }} maxLength={500} />
        </FormItem>
        <FormItem label="反馈附件（选填）">
          <Upload
            autoUpload={false}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
            multiple
            limit={5}
            drag
            fileList={attachmentFileList}
            onChange={setAttachmentFileList}
            tip="支持图片、PDF、Word、Excel、压缩包等文件，最多 5 个"
          >
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <IconUpload style={{ fontSize: 28, color: 'var(--color-text-3)' }} />
              <div style={{ marginTop: 6, color: 'var(--color-text-2)' }}>点击或拖拽文件到此处上传</div>
            </div>
          </Upload>
        </FormItem>
        <FormItem label="当前页面">
          <Input value={currentPath} disabled />
        </FormItem>
      </Form>
    </Modal>
  );
}
