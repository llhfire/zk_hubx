import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Tag,
  Timeline,
  Upload,
} from '@arco-design/web-react';
import { IconPlus, IconUpload } from '@arco-design/web-react/icon';
import {
  DOCUMENT_TITLE_OPTIONS,
  buildDocumentRecordFromForm,
  createDefaultDocumentRecords,
  downloadAttachment,
  type DocumentUploadRecord,
} from '../documentUpload';

const FormItem = Form.Item;

interface Props {
  bordered?: boolean;
  size?: 'default' | 'small';
  initialRecords?: DocumentUploadRecord[];
}

export function DocumentUploadPanel({
  bordered = false,
  size,
  initialRecords,
}: Props) {
  const [records, setRecords] = useState<DocumentUploadRecord[]>(
    () => initialRecords ?? createDefaultDocumentRecords(),
  );
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.validate().then((values) => {
      const nextRecord = buildDocumentRecordFromForm(values);
      if (!nextRecord) {
        Message.warning('请至少上传一份资料文件');
        return;
      }

      setRecords((prev) => [nextRecord, ...prev]);
      Message.success('资料记录已保存');
      setVisible(false);
      form.resetFields();
    });
  };

  return (
    <>
      <Card
        bordered={bordered}
        size={size}
        extra={
          <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setVisible(true)}>
            新增资料
          </Button>
        }
      >
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--color-text-3)' }}>
            暂无资料上传记录
          </div>
        ) : (
          <Timeline>
            {records.map((record, index) => (
              <Timeline.Item
                key={record.id}
                dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}
              >
                <div style={{ marginBottom: 12, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Tag color="arcoblue" size="small">
                      {record.title}
                    </Tag>
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>
                      {record.uploadTime}
                    </span>
                  </div>
                  {record.remark && (
                    <div style={{ color: 'var(--color-text-1)', lineHeight: '20px', marginBottom: 8 }}>
                      {record.remark}
                    </div>
                  )}
                  {record.files.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {record.files.map((file) => (
                          <div
                            key={file.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'var(--color-fill-2)',
                              borderRadius: 4,
                              fontSize: 13,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 500 }}>{file.name}</span>
                              <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: 12 }}>
                                {file.size}
                              </span>
                            </div>
                            <Button type="text" size="mini" onClick={() => downloadAttachment(file)}>
                              下载
                            </Button>
                          </div>
                        ))}
                      </Space>
                    </div>
                  )}
                  <div style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
                    上传人: {record.uploader}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      <Modal
        title="新增资料记录"
        visible={visible}
        onOk={handleAdd}
        onCancel={() => {
          setVisible(false);
          form.resetFields();
        }}
        style={{ width: 680 }}
      >
        <Form form={form} layout="vertical">
          <FormItem
            label="资料类型"
            field="title"
            rules={[{ required: true, message: '请选择资料类型' }]}
          >
            <Select placeholder="请选择资料类型">
              {DOCUMENT_TITLE_OPTIONS.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </FormItem>

          <FormItem label="资料说明" field="remark">
            <Input.TextArea
              placeholder="可补充本次上传资料的说明（可选）"
              rows={4}
              maxLength={1000}
              showWordLimit
            />
          </FormItem>

          <FormItem
            label="资料文件"
            field="files"
            triggerPropName="fileList"
            rules={[{ required: true, message: '请上传资料文件' }]}
          >
            <Upload
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
              multiple
              drag
              tip="支持上传文档、表格、压缩包、图片等资料文件"
            >
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                  点击或拖拽资料文件到此处上传
                </div>
              </div>
            </Upload>
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
