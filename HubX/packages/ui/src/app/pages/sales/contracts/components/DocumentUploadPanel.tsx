import { useState } from 'react';
import { Button, Form, Input, Message, Modal, Select, Timeline } from '@/design-system';
import { IconPlus } from '@/design-system';
import {
  DOCUMENT_TITLE_OPTIONS,
  buildDocumentRecordFromForm,
  createDefaultDocumentRecords,
  downloadAttachment,
  type DocumentUploadRecord,
} from '../documentUpload';
import { EmptyState, FileList, SectionCard, UploadPanel, StatusTag } from '@/design-system';

const FormItem = Form.Item;

interface Props {
  bordered?: boolean;
  size?: 'default' | 'small';
  initialRecords?: DocumentUploadRecord[];
}

export function DocumentUploadPanel({ initialRecords }: Props) {
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
      <SectionCard
        extra={
          <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setVisible(true)}>
            新增资料
          </Button>
        }
      >
        {records.length === 0 ? (
          <EmptyState description="暂无资料上传记录" />
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
                    <StatusTag tone="info" size="small">
                      {record.title}
                    </StatusTag>
                    <span style={{ fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                      {record.uploadTime}
                    </span>
                  </div>
                  {record.remark && (
                    <div style={{ lineHeight: '20px', marginBottom: 8 }}>
                      {record.remark}
                    </div>
                  )}
                  {record.files.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <FileList
                        items={record.files.map((file) => ({
                          key: file.id,
                          name: file.name,
                          meta: file.size,
                          onDownload: () => downloadAttachment(file),
                        }))}
                      />
                    </div>
                  )}
                  <div style={{ fontSize: 'var(--text-xs)' }}>
                    上传人: {record.uploader}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </SectionCard>

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
            <UploadPanel
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
              multiple
              hint="点击或拖拽资料文件到此处上传"
              description="支持上传文档、表格、压缩包、图片等资料文件"
            />
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
