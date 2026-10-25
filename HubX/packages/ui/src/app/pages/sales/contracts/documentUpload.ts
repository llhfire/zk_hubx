import {
  downloadAttachment,
  formatDateTime,
  mapUploadFilesToAttachments,
  type ContractModAttachment,
} from './contractModification';

export type DocumentUploadFile = ContractModAttachment;

export interface DocumentUploadRecord {
  id: string;
  title: string;
  remark: string;
  uploader: string;
  uploadTime: string;
  files: DocumentUploadFile[];
}

export const DOCUMENT_TITLE_OPTIONS = [
  '需求资料',
  '客户资质',
  '方案文档',
  '会议纪要',
  '其他资料',
] as const;

export function createDefaultDocumentRecords(): DocumentUploadRecord[] {
  return [
    {
      id: 'doc-1',
      title: '需求资料',
      remark: '客户确认后的初版需求文档与原型说明。',
      uploader: '张三',
      uploadTime: '2026-04-11 10:20',
      files: [
        { id: 'doc-f1', name: '需求说明书-V1.pdf', size: '1.8MB' },
        { id: 'doc-f2', name: '原型截图.zip', size: '4.2MB' },
      ],
    },
    {
      id: 'doc-2',
      title: '客户资质',
      remark: '营业执照及授权联系人信息。',
      uploader: '李四',
      uploadTime: '2026-04-09 15:36',
      files: [
        { id: 'doc-f3', name: '营业执照.pdf', size: '620KB' },
      ],
    },
    {
      id: 'doc-3',
      title: '会议纪要',
      remark: '需求调研会议纪要及待确认事项清单。',
      uploader: '张三',
      uploadTime: '2026-04-07 18:05',
      files: [
        { id: 'doc-f4', name: '调研会议纪要.docx', size: '240KB' },
        { id: 'doc-f5', name: '待确认事项.xlsx', size: '88KB' },
      ],
    },
  ];
}

export function buildDocumentRecordFromForm(values: {
  title: string;
  remark?: string;
  files?: Array<{ uid?: string; name?: string; originFile?: File }>;
}): DocumentUploadRecord | null {
  const files = mapUploadFilesToAttachments(Array.isArray(values.files) ? values.files : []);
  if (files.length === 0) return null;

  return {
    id: `doc-${Date.now()}`,
    title: values.title,
    remark: (values.remark || '').trim(),
    uploader: '张三',
    uploadTime: formatDateTime(new Date()),
    files,
  };
}

export { downloadAttachment };
