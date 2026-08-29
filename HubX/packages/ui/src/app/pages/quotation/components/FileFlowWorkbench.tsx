import { useMemo } from 'react';
import {
  Alert, Button, Card, InputNumber, Message, Space, Typography, Upload,
} from '@arco-design/web-react';
import { IconSend, IconUpload } from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { computeAmountBreakdown } from '../quoteFlow';
import { canSubmitWithDocument } from '../fileFlow';
import type { Quote, QuoteStage } from '../types';
import { FeatureListUpload } from './FeatureListUpload';
import { OnlineDocumentPreview } from './OnlineDocumentPreview';
import { ScanUpload } from './ScanUpload';
import { Stage4Approval } from '../stages/Stage4Approval';

const { Text } = Typography;

interface Props {
  quote: Quote;
  stage: QuoteStage;
  readonly: boolean;
}

const COMPANY = {
  name: '中科集团',
  address: '四川省成都市高新区',
  phone: '028-00000000',
  representative: '授权代表',
};

export function FileFlowWorkbench({ quote, stage, readonly }: Props) {
  const {
    saveFeatureList, submitFeatureList, saveEvalSheet, submitEval,
    updateQuote, submitForAudit, isLeadFrozen,
  } = useQuotation();
  const frozen = isLeadFrozen(quote.id);
  const state = quote.fileFlow ?? { onlineDocument: { status: 'empty' as const }, scans: [] };
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);

  const patchState = (patch: Partial<NonNullable<Quote['fileFlow']>>) => updateQuote(quote.id, (current) => ({
    ...current,
    fileFlow: { ...state, ...patch },
  }));

  const patchPricingState = (patch: Partial<NonNullable<Quote['fileFlow']>>) => patchState({
    ...patch,
    onlineDocument: state.onlineDocument.status === 'saved' || state.onlineDocument.status === 'finalized'
      ? { status: 'draft' }
      : state.onlineDocument,
  });

  if (stage === 1) {
    return (
      <Card title="文件流转 · 功能清单">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert type="info" content="上传五列 Excel：模块、子功能、描述、备注、端。系统只解析清单结构，原文件仍作为业务载体。" />
          {readonly ? (
            <Text>已解析 {quote.featureList.length} 个模块、{quote.featureList.reduce((sum, module) => sum + module.subFeatures.length, 0)} 项功能。</Text>
          ) : (
            <FeatureListUpload initialModules={quote.featureList} onParsed={(modules) => saveFeatureList(quote.id, modules)} />
          )}
          {!readonly && (
            <Button
              type="primary"
              icon={<IconSend />}
              disabled={frozen || quote.featureList.reduce((sum, module) => sum + module.subFeatures.length, 0) === 0}
              onClick={async () => { await submitFeatureList(quote.id); Message.success('清单已提交技术评估'); }}
            >提交技术评估</Button>
          )}
        </Space>
      </Card>
    );
  }

  if (stage === 2) {
    const canSubmit = Boolean(state.evaluationFileName && state.evaluationWorkDays && state.evaluationTotalDays);
    return (
      <Card title="文件流转 · 技术评估">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Upload
            accept=".xlsx,.xls,.pdf"
            showUploadList={false}
            disabled={readonly}
            beforeUpload={(file) => { patchState({ evaluationFileName: file.name }); return false; }}
          >
            <Button icon={<IconUpload />} disabled={readonly}>上传评估文件</Button>
          </Upload>
          <Text>{state.evaluationFileName ?? '尚未上传评估文件'}</Text>
          <Space wrap>
            <Text>评估工期（工作日）</Text>
            <InputNumber min={1} value={state.evaluationWorkDays} disabled={readonly} onChange={(value) => patchState({ evaluationWorkDays: Number(value) || undefined })} />
            <Text>总人天</Text>
            <InputNumber min={0.1} precision={1} value={state.evaluationTotalDays} disabled={readonly} onChange={(value) => patchState({ evaluationTotalDays: Number(value) || undefined })} />
          </Space>
          {!readonly && (
            <Button type="primary" icon={<IconSend />} disabled={frozen || !canSubmit} onClick={async () => {
              if (!quote.evalSheet) return;
              await saveEvalSheet(quote.id, { ...quote.evalSheet, manualWorkDays: state.evaluationWorkDays ?? 0 });
              await submitEval(quote.id);
              Message.success('技术评估已提交销售报价');
            }}>提交评估结果</Button>
          )}
        </Space>
      </Card>
    );
  }

  if (stage === 3) {
    const documentSaved = canSubmitWithDocument(state.onlineDocument);
    const amountValid = quote.isSupplement ? state.quoteAmount != null : (state.quoteAmount ?? 0) > 0;
    return (
      <Card title="文件流转 · 报价与在线文档">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <Text>报价工期（工作日）</Text>
            <InputNumber min={1} value={state.quoteWorkDays} disabled={readonly} onChange={(value) => patchPricingState({ quoteWorkDays: Number(value) || undefined })} />
            <Text>报价总额（元）</Text>
            <InputNumber min={quote.isSupplement ? undefined : 0} value={state.quoteAmount} disabled={readonly} onChange={(value) => patchPricingState({ quoteAmount: typeof value === 'number' ? value : undefined })} />
          </Space>
          <OnlineDocumentPreview
            data={{ quote, breakdown, company: COMPANY, isSupplement: quote.isSupplement }}
            document={state.onlineDocument}
            quoteStatus={quote.status}
            onDocumentChange={(onlineDocument) => patchState({ onlineDocument })}
          />
          {!readonly && (
            <Button type="primary" icon={<IconSend />} disabled={frozen || !documentSaved || !amountValid || !state.quoteWorkDays} onClick={async () => {
              await submitForAudit(quote.id);
              Message.success('报价文档已提交审批');
            }}>提交审批</Button>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Stage4Approval quote={quote} readonly={readonly} />
      <Card title="盖章扫描件">
        <ScanUpload quoteStatus={quote.status} scans={state.scans} onScansChange={(scans) => patchState({ scans })} />
      </Card>
    </Space>
  );
}
