import { Button, FileList, Space, Typography } from '@/design-system';
import { EmptyState, SectionCard } from '@/design-system';
import { IconEdit, IconFile } from '@/design-system';
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
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
              暂无线索附件（可点击右侧「管理附件」上传需求方案、招标文件或客户材料）
            </Text>
          </div>
        ) : (
          <EmptyState
            className="lead-attachment-panel__empty"
            description="暂无线索附件，可通过编辑线索上传" />
        )
      ) : (
        <FileList
          className="lead-attachment-panel__list"
          items={attachments.map((attachment) => ({
            key: attachment.id,
            name: attachment.name,
            meta: `${formatLeadAttachmentSize(attachment.size)} · ${attachment.type || '文件'}`,
            onDownload: attachment.url
              ? () => window.open(attachment.url, '_blank', 'noopener,noreferrer')
              : undefined,
          }))}
        />
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
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
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
    <SectionCard
      size="small"
      title={<Space size={8}><IconFile /><span>线索附件</span><Text type="secondary">{attachments.length}</Text></Space>}
      extra={<Button type="text" size="small" icon={<IconEdit />} onClick={onManage}>管理附件</Button>}
    >
      {content}
    </SectionCard>
  );
}
