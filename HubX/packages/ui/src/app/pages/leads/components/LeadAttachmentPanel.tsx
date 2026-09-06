import { Button, Card, Empty, Space, Tooltip, Typography } from '@arco-design/web-react';
import { IconDownload, IconEdit, IconFile } from '@arco-design/web-react/icon';
import type { Attachment } from '../types';
import { formatLeadAttachmentSize } from '../leadAttachments';
import './LeadAttachmentPanel.css';

const { Text } = Typography;

interface LeadAttachmentPanelProps {
  attachments: Attachment[];
  onManage: () => void;
  embedded?: boolean;
}

export function LeadAttachmentPanel({ attachments, onManage, embedded = false }: LeadAttachmentPanelProps) {
  const content = (
    <>
      {attachments.length === 0 ? (
        embedded ? (
          <div className="lead-attachment-panel__empty-inline">
            <Text type="secondary" style={{ fontSize: 12 }}>
              暂无线索附件（可点击右侧「管理附件」上传需求方案、招标文件或客户材料）
            </Text>
          </div>
        ) : (
          <Empty
            className="lead-attachment-panel__empty"
            description="暂无线索附件，可通过编辑线索上传"
          />
        )
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
    </>
  );

  if (embedded) {
    return (
      <div className="lead-attachment-panel lead-attachment-panel--embedded">
        <div className="lead-attachment-panel__header">
          <div className="lead-attachment-panel__title">
            <IconFile style={{ color: 'var(--color-text-2)' }} />
            <span>线索附件</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({attachments.length})
            </Text>
          </div>
          <Button type="text" size="mini" icon={<IconEdit />} onClick={onManage}>
            管理附件
          </Button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card
      size="small"
      title={<Space size={8}><IconFile /><span>线索附件</span><Text type="secondary">{attachments.length}</Text></Space>}
      extra={<Button type="text" size="small" icon={<IconEdit />} onClick={onManage}>管理附件</Button>}
    >
      {content}
    </Card>
  );
}
