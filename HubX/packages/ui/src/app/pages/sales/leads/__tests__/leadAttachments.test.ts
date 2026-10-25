import { describe, expect, it } from 'vitest';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import {
  formatLeadAttachmentSize,
  leadAttachmentsToUploadItems,
  uploadItemsToLeadAttachments,
} from '../leadAttachments';

describe('线索附件转换', () => {
  it('将上传列表转换为可保存的线索附件', () => {
    const uploadItems: UploadItem[] = [{
      uid: 'upload-1',
      name: '需求说明.pdf',
      url: 'blob:需求说明',
      originFile: { name: '需求说明.pdf', size: 2048, type: 'application/pdf' } as File,
    }];

    expect(uploadItemsToLeadAttachments(uploadItems)).toEqual([{
      id: 'upload-1',
      name: '需求说明.pdf',
      url: 'blob:需求说明',
      size: 2048,
      type: 'application/pdf',
    }]);
  });

  it('已有附件可回填编辑上传列表', () => {
    const files = leadAttachmentsToUploadItems([
      { id: 'att-1', name: '原型图.png', url: '/files/prototype.png', size: 4096, type: 'image/png' },
    ]);
    expect(files[0]).toMatchObject({ uid: 'att-1', name: '原型图.png', status: 'done' });
  });

  it('附件大小按可读单位展示', () => {
    expect(formatLeadAttachmentSize(0)).toBe('大小未知');
    expect(formatLeadAttachmentSize(2048)).toBe('2.0 KB');
    expect(formatLeadAttachmentSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
