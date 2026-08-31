import { useState } from 'react';
import { Button, Message, Modal, Typography } from '@arco-design/web-react';
import { IconEye, IconSave, IconDownload } from '@arco-design/web-react/icon';
import { generateQuoteHtml, getDraftWatermark, type PdfTemplateData } from '../quotePdfTemplate';
import { canSubmitWithDocument, type OnlineDocument } from '../fileFlow';
import { ZKRT_QUOTE_TEMPLATE } from '../quoteDocumentTemplate';

const { Text } = Typography;

interface Props {
  data: PdfTemplateData;
  document: OnlineDocument;
  onDocumentChange: (doc: OnlineDocument) => void;
  quoteStatus: string;
}

/**
 * 在线文档预览+保存组件
 * 初稿 = 标准件模板 + 表单数据 + 清单
 * 必须保存过才能送审
 */
export function OnlineDocumentPreview({ data, document, onDocumentChange, quoteStatus }: Props) {
  const [previewVisible, setPreviewVisible] = useState(false);

  const canSubmit = canSubmitWithDocument(document);

  const handleSave = () => {
    const html = generateQuoteHtml({
      ...data,
      watermark: getDraftWatermark(quoteStatus),
    });
    onDocumentChange({
      status: 'saved',
      savedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      content: html,
    });
    Message.success('文档已保存');
  };

  const handlePreview = () => {
    if (!document.content) {
      // 自动生成预览
      const html = generateQuoteHtml({
        ...data,
        watermark: getDraftWatermark(quoteStatus),
      });
      onDocumentChange({ ...document, content: html });
    }
    setPreviewVisible(true);
  };

  const handleDownload = () => {
    if (!document.content) {
      Message.warning('请先保存文档');
      return;
    }
    const blob = new Blob([document.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `报价单_${data.quote.quoteNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <Text bold>{ZKRT_QUOTE_TEMPLATE.name}</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>封面、整体报价、公司介绍、六列表清单、自费项目与签章已适配</Text>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Button icon={<IconEye />} onClick={handlePreview}>预览</Button>
        <Button type="primary" icon={<IconSave />} onClick={handleSave}>
          保存文档
        </Button>
        <Button icon={<IconDownload />} onClick={handleDownload}>下载</Button>
      </div>

      <div style={{ marginBottom: 8 }}>
        {document.status === 'saved' && (
          <Text type="success">✓ 已保存于 {document.savedAt}</Text>
        )}
        {document.status === 'empty' && (
          <Text type="warning">未保存 — 必须保存过才能送审</Text>
        )}
        {document.status === 'draft' && (
          <Text type="secondary">草稿 — 请保存</Text>
        )}
      </div>

      {!canSubmit && quoteStatus === 'pending_quote' && (
        <Text type="warning" style={{ fontSize: 12 }}>
          请先保存文档再提交审批
        </Text>
      )}

      <Modal
        title="报价单预览"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        style={{ width: 800 }}
      >
        <div
          style={{ border: '1px solid #e5e5e5', borderRadius: 4, maxHeight: 600, overflow: 'auto' }}
          dangerouslySetInnerHTML={{ __html: document.content || '<p>无内容</p>' }}
        />
      </Modal>
    </div>
  );
}
