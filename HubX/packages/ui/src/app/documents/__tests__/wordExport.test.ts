// @vitest-environment jsdom

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createDocxBlob } from '../wordExport';

describe('wordExport', () => {
  it('生成可解包的 Office Open XML 文档并保留标题、正文和表格', async () => {
    const blob = await createDocxBlob(`
      <div class="contract-document">
        <h2>技术服务合同</h2>
        <p>甲乙双方确认合同内容。</p>
        <table><tbody><tr><th>项目</th><th>金额</th></tr><tr><td>开发服务</td><td>10000</td></tr></tbody></table>
      </div>
    `, '测试合同');
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(zip.file('word/document.xml')).toBeTruthy();
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('技术服务合同');
    expect(documentXml).toContain('甲乙双方确认合同内容');
    expect(documentXml).toContain('<w:tbl>');
    expect(documentXml).toContain('开发服务');
  });
});
