import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Space } from '@arco-design/web-react';
import {
  IconBold,
  IconItalic,
  IconOrderedList,
  IconRedo,
  IconUndo,
  IconUnorderedList,
} from '@arco-design/web-react/icon';
import type { ProjectQuotationConfig, ProjectQuotationSummary } from '../../project-management/projectQuotationConfigModel';
import type { LeadBusinessEnd } from './LeadFeatureListPanel';
import './QuotationDocumentPreviewModal.css';

export interface QuotationDocumentData {
  projectName: string;
  customerName: string;
  amount: number;
  upliftRate: number;
  upliftType: 'rate' | 'fixed';
  upliftAmount?: number;
  period: string;
  operator: string;
  technicalEvaluator: string;
  description: string;
  config: ProjectQuotationConfig;
  summary: ProjectQuotationSummary;
  featureList?: LeadBusinessEnd[];
}

export interface GeneratedQuotationDocument {
  name: string;
  url: string;
}

interface QuotationDocumentPreviewModalProps {
  visible: boolean;
  data: QuotationDocumentData | null;
  onCancel: () => void;
  onSubmit: (document: GeneratedQuotationDocument) => void;
}

const formatMoney = (value: number) => value.toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const sanitizeFileName = (value: string) => value.replace(/[\\/:*?"<>|]/g, '-');

const wordDocumentStyles = `
  body{font-family:SimSun,"Songti SC",serif;color:#1d2129;line-height:1.75}
  .quotation-doc-cover{min-height:900px;padding-top:160px;text-align:center;border-bottom:2px solid #124b7d}
  .quotation-doc-logo{display:inline-flex;align-items:center;gap:12px;font-family:Arial,sans-serif;font-size:32px;font-weight:700}
  .quotation-doc-logo>b{color:#1484bd;font-size:52px;font-style:italic}.quotation-doc-logo span{display:flex;flex-direction:column}.quotation-doc-logo small{font-size:12px;letter-spacing:2px}
  .quotation-doc-cover h1{margin-top:110px;color:#124b7d;font-size:30px}.quotation-doc-cover-line{width:78%;margin:36px auto 80px;border-top:2px solid #124b7d}.quotation-doc-cover time{display:block;margin-top:80px;color:#c00;font-size:20px}
  .quotation-doc-page{min-height:980px;padding-top:10px;page-break-before:always}header{padding-bottom:8px;border-bottom:2px solid #124b7d;color:#124b7d;font-weight:700}
  h2{margin:42px 0 36px;color:#124b7d;text-align:center}h3{margin-top:34px;color:#124b7d}table{width:100%;margin:24px 0;border-collapse:collapse}th,td{padding:8px 10px;border:1px solid #333;text-align:left}th{background:#e8edf4}
  .quotation-doc-details{font-size:12px}.quotation-doc-details thead th{background:#124b7d;color:#fff;text-align:center}.quotation-doc-total th,.quotation-doc-total td{background:#fff2cc;color:#c00;font-weight:700}.quotation-doc-signature{margin-top:100px;text-align:right}
`;

function createQuotationDocumentHtml(data: QuotationDocumentData) {
  const featureRows = (data.featureList ?? []).flatMap(end => {
    const endRowCount = end.modules.reduce((count, module) => count + module.features.length, 0);
    let endRendered = false;
    return end.modules.flatMap(module => {
      const moduleRowCount = module.features.length;
      return module.features.map((feature, featureIndex) => {
        const workdays = feature.workdays ?? 0;
        const dailyRate = 1200;
        const subtotal = workdays * dailyRate;
        const endCell = !endRendered ? `<td rowspan="${endRowCount}">${escapeHtml(end.name)}</td>` : '';
        const moduleCell = featureIndex === 0 ? `<td rowspan="${moduleRowCount}">${escapeHtml(module.name)}</td>` : '';
        endRendered = true;
        return `<tr>${endCell}${moduleCell}<td>${escapeHtml(feature.name)}</td><td>${escapeHtml(feature.description || '-')}</td><td>${feature.workdays == null ? '-' : feature.workdays}</td><td>¥${formatMoney(dailyRate)}</td><td>¥${formatMoney(subtotal)}</td></tr>`;
      });
    });
  }).join('');
  const today = new Date();
  const dateText = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return `
    <div class="quotation-doc-cover">
      <div class="quotation-doc-logo"><b>ZK</b><span>中科集团<small>ZHONG KE GROUP</small></span></div>
      <h1>${escapeHtml(data.projectName)}项目报价方案</h1>
      <div class="quotation-doc-cover-line"></div>
      <p>客户名称：${escapeHtml(data.customerName || '-')}</p>
      <time>${dateText}</time>
    </div>
    <div class="quotation-doc-page">
      <header><span>中科集团</span></header>
      <h2>报　价　单</h2>
      <p>致：${escapeHtml(data.customerName || '-')}</p>
      <table class="quotation-doc-summary"><tbody>
        <tr><th>项目名称</th><td>${escapeHtml(data.projectName)}</td></tr>
        <tr><th>项目工期</th><td>${escapeHtml(data.period || '-')}</td></tr>
        <tr><th>开发人天</th><td>${data.summary.totalPersonDays}人天</td></tr>
        <tr><th>项目基础报价</th><td>¥${formatMoney(data.summary.totalAmount)}</td></tr>
        <tr class="quotation-doc-total"><th>项目总价</th><td>人民币 ¥${formatMoney(data.amount)}</td></tr>
      </tbody></table>
      <h3>报价说明</h3>
      <p>${escapeHtml(data.description || '本报价根据双方已确认的项目需求和技术评估结果制定。')}</p>
      <ol><li>以上报价为含税价格。</li><li>具体付款方式以双方签订的合同为准。</li><li>如需增加功能点，双方协商另行计费。</li></ol>
    </div>
    <div class="quotation-doc-page">
      <header><span>中科集团</span></header>
      <h2>详细报价清单</h2>
      <table class="quotation-doc-details"><thead><tr><th>业务端</th><th>功能模块</th><th>功能点</th><th>功能描述</th><th>工时</th><th>单价</th><th>小计</th></tr></thead><tbody>
        ${featureRows || '<tr><td colspan="7">暂无功能清单</td></tr>'}
        <tr class="quotation-doc-total"><td colspan="6">项目总价</td><td>¥${formatMoney(data.amount)}</td></tr>
      </tbody></table>
      <h3>技术评估信息</h3>
      <p>报价人：${escapeHtml(data.operator || '-')}</p>
      <p>技术评估人：${escapeHtml(data.technicalEvaluator || '-')}</p>
      <div class="quotation-doc-signature"><p>中科软盈（武汉）科技有限公司</p><p>（此处加盖公章）</p><p>${dateText}</p></div>
    </div>`;
}

export function QuotationDocumentPreviewModal({ visible, data, onCancel, onSubmit }: QuotationDocumentPreviewModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [documentHtml, setDocumentHtml] = useState('');

  useEffect(() => {
    if (visible && data) setDocumentHtml(createQuotationDocumentHtml(data));
  }, [data, visible]);

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command);
  };

  const submitDocument = () => {
    if (!data || !editorRef.current) return;
    const body = editorRef.current.innerHTML;
    const file = new Blob([
      '<!doctype html><html><head><meta charset="utf-8"><title>报价单</title><style>',
      wordDocumentStyles,
      '</style></head><body>',
      body,
      '</body></html>',
    ], { type: 'application/msword' });
    onSubmit({
      name: `${sanitizeFileName(data.projectName)}-报价单.doc`,
      url: URL.createObjectURL(file),
    });
  };

  return (
    <Modal
      title="报价单预览"
      visible={visible}
      footer={null}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 1120, maxWidth: 'calc(100vw - 32px)' }}
    >
      <div style={{ border: '1px solid var(--color-border-2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid var(--color-border-2)' }}>
          {[
            ['undo', <IconUndo />, '撤销'], ['redo', <IconRedo />, '重做'], ['bold', <IconBold />, '加粗'],
            ['italic', <IconItalic />, '斜体'], ['insertOrderedList', <IconOrderedList />, '有序列表'],
            ['insertUnorderedList', <IconUnorderedList />, '无序列表'],
          ].map(([command, icon, title]) => (
            <Button key={String(command)} type="text" size="small" icon={icon} title={String(title)} onMouseDown={event => event.preventDefault()} onClick={() => runCommand(String(command))} />
          ))}
          <span style={{ marginLeft: 8, color: 'var(--color-text-3)', lineHeight: '32px' }}>可直接点击文档内容进行编辑</span>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto', padding: 24, background: 'var(--color-fill-1)' }}>
          <div
            ref={editorRef}
            className="quotation-document-editor"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <Space><Button onClick={onCancel}>上一步</Button><Button type="primary" onClick={submitDocument}>提交</Button></Space>
      </div>
    </Modal>
  );
}
