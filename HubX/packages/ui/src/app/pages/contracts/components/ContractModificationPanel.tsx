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
  CONTRACT_CHANGE_TYPE_OPTIONS,
  createDefaultContractModRecords,
  downloadAttachment,
  formatDateTime,
  mapUploadFilesToAttachments,
  type ContractModificationRecord,
} from '../contractModification';

const FormItem = Form.Item;

interface Props {
  contractId: string;
  contractNo: string;
  onContractClick?: (contractId: string) => void;
  onCreateContract?: () => void;
  bordered?: boolean;
  size?: 'default' | 'small';
  initialRecords?: ContractModificationRecord[];
}

export function ContractModificationPanel({
  contractId,
  contractNo,
  onContractClick,
  onCreateContract,
  bordered = false,
  size,
  initialRecords,
}: Props) {
  const [records, setRecords] = useState<ContractModificationRecord[]>(
    () => initialRecords ?? createDefaultContractModRecords(contractId, contractNo),
  );
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = () => {
    if (!contractId) {
      Message.warning('暂无关联合同，无法新增修改记录');
      return;
    }

    form.validate().then((values) => {
      const uploadList = Array.isArray(values.attachments) ? values.attachments : [];
      const nextRecord: ContractModificationRecord = {
        id: `cmr-${Date.now()}`,
        changeType: values.changeType,
        content: values.content.trim(),
        contractId,
        contractNo,
        operator: '张三',
        time: formatDateTime(new Date()),
        attachments: mapUploadFilesToAttachments(uploadList),
      };

      setRecords((prev) => [nextRecord, ...prev]);
      Message.success('合同修改记录已保存');
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
          contractId ? (
            <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setVisible(true)}>
              新增记录
            </Button>
          ) : onCreateContract ? (
            <Button type="primary" size="small" icon={<IconPlus />} onClick={onCreateContract}>
              创建合同
            </Button>
          ) : null
        }
      >
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--color-text-3)' }}>
            暂无合同修改记录
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
                      {record.changeType}
                    </Tag>
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>
                      {record.time}
                    </span>
                  </div>
                  {record.content && (
                    <div style={{ color: 'var(--color-text-1)', lineHeight: '20px', marginBottom: 8 }}>
                      {record.content}
                    </div>
                  )}
                  {record.contractNo && (
                    <div style={{ marginBottom: 8 }}>
                      {record.contractId && onContractClick ? (
                        <Button
                          type="text"
                          size="mini"
                          style={{ padding: 0, height: 'auto' }}
                          onClick={() => onContractClick(record.contractId!)}
                        >
                          {record.contractNo}
                        </Button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                          {record.contractNo}
                        </span>
                      )}
                    </div>
                  )}
                  {record.attachments.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {record.attachments.map((file) => (
                          <div
                            key={file.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'var(--color-fill-2)',
                              borderRadius: 4,
                              fontSize: 14,
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
                    操作人: {record.operator}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      <Modal
        title="新增合同修改记录"
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
            label="修改类型"
            field="changeType"
            rules={[{ required: true, message: '请选择修改类型' }]}
          >
            <Select placeholder="请选择本次修改类型">
              {CONTRACT_CHANGE_TYPE_OPTIONS.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </FormItem>

          <FormItem
            label="修改说明"
            field="content"
            rules={[{ required: true, message: '请填写修改说明' }]}
          >
            <Input.TextArea
              placeholder="请详细记录本次合同修改内容，如条款变更、金额调整、补充协议等"
              rows={5}
              maxLength={2000}
              showWordLimit
            />
          </FormItem>

          <FormItem label="合同附件" field="attachments" triggerPropName="fileList">
            <Upload
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              multiple
              drag
              tip="支持上传 PDF、Word、Excel、图片等合同相关附件"
            >
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                  点击或拖拽合同附件到此处上传
                </div>
              </div>
            </Upload>
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
