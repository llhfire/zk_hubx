import { Button, Card, Empty, Space, Tooltip, Typography } from '@arco-design/web-react';
import { IconDownload, IconEdit, IconFile } from '@arco-design/web-react/icon';
import type { Attachment } from '../types';
import { formatLeadAttachmentSize } from '../leadAttachments';
import './LeadAttachmentPanel.css';

const { Text } = Typography;

interface LeadAttachmentPanelProps {
  attachments: Attachment[];
  onManage: () => void;
}

export function LeadAttachmentPanel({ attachments, onManage }: LeadAttachmentPanelProps) {
  return (
    <Card
      size="small"
      title={<Space size={8}><IconFile /><span>线索附件</span><Text type="secondary">{attachments.length}</Text></Space>}
      extra={<Button type="text" size="small" icon={<IconEdit />} onClick={onManage}>管理附件</Button>}
    >
      {attachments.length === 0 ? (
        <Empty
          className="lead-attachment-panel__empty"
          description="暂无线索附件，可通过编辑线索上传"
        />
      ) : (
        <div className="lead-attachment-panel__list">
          {attachments.map((attachment) => (
            <div className="lead-attachment-panel__item" key={attachment.id}>
              <div className="lead-attachment-panel__file-icon"><IconFile /></div>
              <div className="lead-attachment-panel__content">
                <Text className="lead-attachment-panel__name" ellipsis={{ showTooltip: true }}>{attachment.name}</Text>
                <Text type="secondary" className="lead-attachment-panel__meta">
                  {formatLeadAttachmentSize(attachment.size)} · {attachment.type || '文件'}
                </Text>
              </div>
              <Tooltip content={attachment.url ? '下载附件' : '该附件暂无可用地址'}>
                <Button
                  className="hubx-icon-action"
                  type="text"
                  size="small"
                  aria-label={`下载 ${attachment.name}`}
                  icon={<IconDownload />}
                  disabled={!attachment.url}
                  onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
