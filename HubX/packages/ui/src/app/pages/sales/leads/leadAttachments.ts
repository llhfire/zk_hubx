import type { UploadItem } from '@arco-design/web-react/es/Upload';
import type { Attachment } from './types';

function fileTypeFromName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension ? extension.toUpperCase() : '文件';
}

export function uploadItemsToLeadAttachments(items: UploadItem[]): Attachment[] {
  return items.map((item, index) => {
    const file = item.originFile;
    const name = item.name || file?.name || `附件${index + 1}`;
    let url = item.url || '';
    if (!url && file && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      url = URL.createObjectURL(file);
    }
    return {
      id: item.uid || `lead-attachment-${index + 1}-${name}`,
      name,
      url,
      size: file?.size ?? 0,
      type: file?.type || fileTypeFromName(name),
    };
  });
}

export function leadAttachmentsToUploadItems(attachments: Attachment[]): UploadItem[] {
  return attachments.map((attachment) => ({
    uid: attachment.id,
    name: attachment.name,
    url: attachment.url,
    status: 'done',
  }));
}

export function formatLeadAttachmentSize(bytes: number): string {
  if (!bytes) return '大小未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
