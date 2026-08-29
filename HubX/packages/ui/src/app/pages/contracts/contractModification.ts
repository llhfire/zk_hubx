import { Message } from '@arco-design/web-react';

export interface ContractModAttachment {
  id: string;
  name: string;
  size: string;
  url?: string;
}

export interface ContractModificationRecord {
  id: string;
  changeType: string;
  content: string;
  contractId?: string;
  contractNo?: string;
  operator: string;
  time: string;
  attachments: ContractModAttachment[];
}

export const CONTRACT_CHANGE_TYPE_OPTIONS = [
  '条款修改',
  '金额调整',
  '主体变更',
  '补充合同附件更新',
  '附件更新',
  '合同归档',
  '其他',
] as const;

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${formatLocalDate(date)} ${hh}:${mi}`;
}

export function downloadAttachment(file: { name: string; url?: string }) {
  if (file.url) {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
    return;
  }
  Message.info(`下载文件: ${file.name}`);
}

export function mapUploadFilesToAttachments(
  uploadList: Array<{ uid?: string; name?: string; originFile?: File }>,
): ContractModAttachment[] {
  return uploadList.map((file, index) => ({
    id: file.uid || `upload-${Date.now()}-${index}`,
    name: file.name || file.originFile?.name || `附件${index + 1}`,
    size: formatFileSize(file.originFile?.size ?? 0),
    url: file.originFile ? URL.createObjectURL(file.originFile) : undefined,
  }));
}

export function createDefaultContractModRecords(
  contractId = '',
  contractNo = 'HT20260409001',
): ContractModificationRecord[] {
  return [
    {
      id: 'cmr-1',
      changeType: '条款修改',
      content: '调整付款周期为两期，首期 40%，验收后支付尾款；同步更新交付周期条款。',
      contractId,
      contractNo,
      operator: '张三',
      time: '2026-04-12 14:30',
      attachments: [
        { id: 'cmr-a1', name: '合同修订版-V2.pdf', size: '2.1MB' },
        { id: 'cmr-a2', name: '付款条款对照表.xlsx', size: '186KB' },
      ],
    },
    {
      id: 'cmr-2',
      changeType: '金额调整',
      content: '应客户要求，合同总额由 480,000 调整为 510,000，差额计入需求变更款。',
      contractId,
      contractNo,
      operator: '张三',
      time: '2026-04-10 11:05',
      attachments: [
        { id: 'cmr-a3', name: '金额变更确认函.pdf', size: '980KB' },
      ],
    },
    {
      id: 'cmr-3',
      changeType: '附件更新',
      content: '上传双方盖章版扫描件，作为当前有效合同附件。',
      contractId,
      contractNo,
      operator: '李四',
      time: '2026-04-08 16:42',
      attachments: [
        { id: 'cmr-a4', name: '盖章合同扫描件.pdf', size: '3.4MB' },
      ],
    },
  ];
}
