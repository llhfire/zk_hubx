// 模板共用工具：HTML 转义、付款计划表渲染、签章占位、A4 纸样式包装。
//
// 模板文件直接拼字符串生成 HTML（避免引入额外渲染库）；本文件提供
// 一组小函数把容易出错或重复的部分封装起来。

import type { ContractFormData, PaymentPlanItem } from '../types';
import {
  convertAmountToChinese,
  getPaymentPlanExpectedDateLabel,
  getPaymentPlanPeriodLabel,
} from '../utils';

// 防 XSS：所有从 formData 进入 HTML 的字符串都过这里。
export function escape(input: string | number | undefined | null): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 把多行文本变成 <p>，空行作为段落分隔。
export function paragraphs(text: string): string {
  if (!text) return '';
  return text
    .split(/\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escape(p.trim())}</p>`)
    .join('');
}

export function renderPaymentPlanTable(plans: PaymentPlanItem[]): string {
  if (!plans || plans.length === 0) {
    return '<p class="empty-hint">（暂未填写回款计划）</p>';
  }
  const rows = plans
    .map(
      (p) => `<tr>
        <td>${escape(getPaymentPlanPeriodLabel(p))}</td>
        <td>${escape(getPaymentPlanExpectedDateLabel(p))}</td>
        <td>${escape(p.condition || '—')}</td>
        <td>¥${(p.amount || 0).toLocaleString()}</td>
        <td>${(p.percentage || 0).toFixed(2)}%</td>
      </tr>`,
    )
    .join('');
  const total = plans.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPct = plans.reduce((sum, p) => sum + (p.percentage || 0), 0);
  return `<table class="payment-plan-table">
    <thead>
      <tr><th>期数</th><th>预计回款日期</th><th>回款条件</th><th>金额</th><th>占比</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td><strong>合计</strong></td>
        <td>—</td>
        <td>—</td>
        <td><strong>¥${total.toLocaleString()}</strong></td>
        <td><strong>${totalPct.toFixed(2)}%</strong></td>
      </tr>
    </tfoot>
  </table>`;
}

export function renderSignatureBlock(formData: ContractFormData): string {
  return `<div class="signature-block">
    <div class="party">
      <div class="party-title">甲方（盖章）</div>
      <div class="seal-placeholder">［此处加盖甲方公章］</div>
      <div class="party-info">
        <div>单位名称：${escape(formData.customerName)}</div>
        <div>授权代表：____________________</div>
        <div>签订日期：${escape(formData.signDate || '____年__月__日')}</div>
      </div>
    </div>
    <div class="party">
      <div class="party-title">乙方（盖章）</div>
      <div class="seal-placeholder">［此处加盖乙方公章］</div>
      <div class="party-info">
        <div>单位名称：${escape(formData.signingEntity || '北京科技有限公司')}</div>
        <div>授权代表：____________________</div>
        <div>签订日期：${escape(formData.signDate || '____年__月__日')}</div>
      </div>
    </div>
  </div>`;
}

// 把模板正文（template body）包进 A4 纸样式 + "草案"水印。
// 所有模板都通过这个函数包装，保证视觉风格统一。
export function wrapDocument(formData: ContractFormData, body: string, opts?: { showWatermark?: boolean }): string {
  const showWatermark = opts?.showWatermark !== false;
  return `<style>${A4_STYLE}</style>
  <div class="contract-doc">
    ${showWatermark ? '<div class="watermark">草案</div>' : ''}
    <div class="contract-header">
      <h1 class="contract-title">${escape(formData.contractName || '合同名称待填')}</h1>
    </div>
    <div class="contract-meta">
      <div>甲方：<strong>${escape(formData.customerName)}</strong></div>
      <div>乙方：<strong>${escape(formData.signingEntity || '北京科技有限公司')}</strong></div>
      <div>签约日期：${escape(formData.signDate || '____')}</div>
    </div>
    <div class="contract-body">
      ${body}
    </div>
    ${renderSignatureBlock(formData)}
  </div>`;
}

// 渲染"合同金额"段落（数字 + 大写）
export function renderAmountClause(formData: ContractFormData): string {
  const amount = formData.totalAmount || 0;
  return `<p>合同总金额：人民币 <strong>¥${amount.toLocaleString()}</strong>
    （大写：<strong>${convertAmountToChinese(amount)}</strong>）。</p>`;
}

// 内嵌样式。颜色刻意低饱和、克制，模拟真实合同文档的视觉。
const A4_STYLE = `
.contract-doc {
  position: relative;
  width: 100%;
  max-width: 794px;
  margin: 0 auto;
  padding: 48px 56px;
  background: #fff;
  color: #1d2129;
  font-size: 14px;
  line-height: 1.85;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  box-shadow: 0 0 0 1px var(--color-border-2), 0 8px 24px rgba(0,0,0,0.08);
  box-sizing: border-box;
  overflow: hidden;
}
.contract-doc .watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 96px;
  font-weight: 700;
  color: rgba(0,0,0,0.05);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}
.contract-doc .contract-header { text-align: center; margin-bottom: 24px; }
.contract-doc .contract-title { font-size: 22px; font-weight: 700; margin: 0; }
.contract-doc .contract-meta {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: var(--color-text-2);
  border-bottom: 1px solid var(--color-border-2);
  padding-bottom: 12px;
  margin-bottom: 20px;
}
.contract-doc .contract-body p { margin: 0 0 12px 0; text-align: justify; }
.contract-doc .contract-body h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 24px 0 12px;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--primary-6));
}
.contract-doc .contract-body ol { padding-left: 24px; margin: 0 0 12px; }
.contract-doc .contract-body ol li { margin-bottom: 6px; }
.contract-doc .empty-hint { color: var(--color-text-3); font-style: italic; }
.contract-doc .payment-plan-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}
.contract-doc .payment-plan-table th,
.contract-doc .payment-plan-table td {
  border: 1px solid var(--color-border-3);
  padding: 8px 12px;
  text-align: center;
}
.contract-doc .payment-plan-table thead th { background: var(--color-fill-2); font-weight: 600; }
.contract-doc .payment-plan-table tfoot { background: var(--color-fill-1); }
.contract-doc .signature-block {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px dashed var(--color-border-2);
}
.contract-doc .party { flex: 1; }
.contract-doc .party-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
.contract-doc .seal-placeholder {
  border: 1.5px dashed var(--color-border-3);
  padding: 32px 12px;
  text-align: center;
  color: var(--color-text-3);
  font-size: 13px;
  margin-bottom: 12px;
  border-radius: 4px;
}
.contract-doc .party-info { font-size: 13px; line-height: 1.9; color: var(--color-text-2); }
`;
