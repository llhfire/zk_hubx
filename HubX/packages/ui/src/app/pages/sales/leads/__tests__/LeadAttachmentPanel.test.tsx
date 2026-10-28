import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LeadAttachmentPanel } from '../components/LeadAttachmentPanel';

describe('LeadAttachmentPanel 组件验证', () => {
  it('embedded=true 时内嵌渲染，无独立外层 Card，包含嵌入式样式与空状态提示', () => {
    const markup = renderToStaticMarkup(
      createElement(LeadAttachmentPanel, {
        attachments: [],
        onManage: () => {},
        embedded: true,
      }),
    );

    expect(markup).toContain('lead-attachment-panel--embedded');
    expect(markup).toContain('线索附件');
    expect(markup).toContain('(0)');
    expect(markup).toContain('管理附件');
    expect(markup).toContain('暂无线索附件');
    // embedded 模式下不应该渲染 Arco Card 结构
    expect(markup).not.toContain('arco-card');
  });

  it('embedded=true 且有附件时正确展示附件列表、文件名、格式化大小与真实动作', () => {
    const markup = renderToStaticMarkup(
      createElement(LeadAttachmentPanel, {
        attachments: [
          { id: 'att-1', name: '需求规格说明书.pdf', size: 1048576, type: 'application/pdf', url: 'https://example.com/spec.pdf' },
          { id: 'att-2', name: '系统架构拓扑.png', size: 204800, type: 'image/png', url: 'https://example.com/arch.png' },
          { id: 'att-3', name: '演示元数据.docx', size: 0, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: '' },
        ],
        onManage: () => {},
        embedded: true,
      }),
    );

    expect(markup).toContain('lead-attachment-panel--embedded');
    expect(markup).toContain('线索附件');
    expect(markup).toContain('(3)');
    expect(markup).toContain('需求规格说明书.pdf');
    expect(markup).toContain('1.0 MB');
    expect(markup).toContain('系统架构拓扑.png');
    expect(markup).toContain('200.0 KB');
    expect(markup).toContain('aria-label="下载 需求规格说明书.pdf"');
    expect(markup).toContain('演示元数据.docx');
    expect(markup).not.toContain('aria-label="下载 演示元数据.docx"');
  });

  it('embedded=false 时保留经典 Card 容器与 Empty 状态', () => {
    const markup = renderToStaticMarkup(
      createElement(LeadAttachmentPanel, {
        attachments: [],
        onManage: () => {},
        embedded: false,
      }),
    );

    expect(markup).toContain('arco-card');
    expect(markup).toContain('线索附件');
    expect(markup).toContain('管理附件');
    expect(markup).toContain('暂无线索附件，可通过编辑线索上传');
  });
});
