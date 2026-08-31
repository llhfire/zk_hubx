import { useMemo, useState } from 'react';
import { Alert, Button, Card, Modal, Space, Tag, Typography } from '@arco-design/web-react';
import { IconDownload, IconEye } from '@arco-design/web-react/icon';
import { findCompanyEntityByName } from '../../company-entity/companyEntityData';
import type { QuoteAmountBreakdown } from '../quoteFlow';
import { generateQuoteHtml } from '../quotePdfTemplate';
import { getQuoteTemplateMissingFields, ZKRT_QUOTE_TEMPLATE } from '../quoteDocumentTemplate';
import type { Quote } from '../types';
import { createDocxBlob, downloadBlob } from '../../../documents/wordExport';

const { Text } = Typography;

interface QuoteTemplatePreviewPanelProps {
  quote: Quote;
  breakdown: QuoteAmountBreakdown;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-');
}

export function QuoteTemplatePreviewPanel({ quote, breakdown }: QuoteTemplatePreviewPanelProps) {
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const entity = findCompanyEntityByName(quote.signingEntity ?? ZKRT_QUOTE_TEMPLATE.signingEntity);
  const html = useMemo(() => generateQuoteHtml({
    quote,
    breakdown,
    company: {
      name: entity?.name ?? '中科软通（武汉）科技有限公司',
      address: entity?.address ?? '',
      phone: entity?.contactPhone ?? '',
      representative: entity?.legalPerson ?? '',
    },
    isSupplement: quote.isSupplement,
  }), [breakdown, entity, quote]);
  const missingFields = getQuoteTemplateMissingFields(quote);

  const download = async () => {
    setDownloading(true);
    try {
      const title = `${quote.basicInfo.projectName || quote.quoteNo}-报价单`;
      const blob = await createDocxBlob(html, title);
      downloadBlob(blob, `${sanitizeFileName(title)}.docx`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card size="small" title="报价模板适配">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <Text bold>{ZKRT_QUOTE_TEMPLATE.name}</Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              来源：{ZKRT_QUOTE_TEMPLATE.sourceFileName} · 签约主体：{entity?.name ?? '中科软通（武汉）科技有限公司'}
            </Text>
          </div>
          <Space>
            <Button size="small" icon={<IconEye />} onClick={() => setVisible(true)}>预览报价单</Button>
            <Button size="small" icon={<IconDownload />} loading={downloading} disabled={downloading} onClick={download}>下载 Word</Button>
          </Space>
        </div>
        <Space wrap>
          {ZKRT_QUOTE_TEMPLATE.sections.map((section) => <Tag key={section}>{section}</Tag>)}
        </Space>
        {missingFields.length > 0 ? (
          <Alert type="warning" content={`模板仍缺少：${missingFields.join('、')}。补齐后再提交审批。`} />
        ) : (
          <Alert type="success" content="模板字段已完整映射，可生成客户版报价单。" />
        )}
      </Space>

      <Modal title={`${ZKRT_QUOTE_TEMPLATE.name} · 预览`} visible={visible} onCancel={() => setVisible(false)} footer={null} style={{ width: 'min(920px, calc(100vw - 32px))' }}>
        <div style={{ maxHeight: 'calc(100vh - 180px)', overflow: 'auto', background: 'var(--color-fill-1)', padding: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
      </Modal>
    </Card>
  );
}
