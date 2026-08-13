import {
  calculateLaborItemCost,
  calculateOnsiteItemCost,
  calculateTravelItemCost,
  getQuotationLaborDetails,
  getQuotationOtherCostDetails,
  type ProjectQuotationConfig,
  type ProjectQuotationSummary,
} from './projectQuotationConfigModel';
import './QuotationSummaryReport.css';

interface QuotationReportRow {
  name: string;
  detail?: string;
  amount: number;
}

export interface QuotationSummaryReportData {
  totalPersonDays: number;
  totalPeople: number;
  estimatedPeriod: string;
  totalAmount: number;
  laborCost: number;
  travelCost: number;
  otherCost: number;
  laborRows: QuotationReportRow[];
  travelRows: QuotationReportRow[];
  otherRows: QuotationReportRow[];
}

type QuotationSummaryReportSummary = Omit<ProjectQuotationSummary, 'salesOtherCost'> & {
  salesOtherCost?: number;
};

function formatAmount(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(value: number, total: number) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function createQuotationSystemRecordFileName(systemName: string, timestamp = Date.now()) {
  const date = new Date(timestamp);
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const timestampSuffix = String(timestamp).slice(-6).padStart(6, '0');
  const safeSystemName = systemName.trim().replace(/[\\/:*?"<>|]/g, '_') || '未命名系统';

  return `${safeSystemName}报价单${datePart}${timestampSuffix}.png`;
}

function toNumber(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(value ?? 0, 0) : 0;
}

export function buildQuotationSummaryReportData(
  config: ProjectQuotationConfig,
  summary: QuotationSummaryReportSummary,
): QuotationSummaryReportData {
  const laborRows = getQuotationLaborDetails(config).map(item => ({
    name: `${item.sourceName} · ${item.role || '未命名角色'}`,
    detail: `${item.people}人 × ${item.days}天 × ${formatAmount(item.dailyRate)}/天${item.technology ? ` · ${item.technology}` : ''}`,
    amount: calculateLaborItemCost(item),
  }));
  const travelRows: QuotationReportRow[] = [];

  if (config.travel.enabled) {
    travelRows.push(
      { name: '往返交通费', detail: `${config.travel.people}人 × ${config.travel.trips}次 × 往返`, amount: toNumber(config.travel.transportPerTrip) * 2 * config.travel.people * config.travel.trips },
      { name: '出差住宿费', detail: `${config.travel.people}人 × ${config.travel.trips}次 × ${config.travel.days}天`, amount: toNumber(config.travel.hotelPerDay) * config.travel.people * config.travel.trips * config.travel.days },
      { name: '出差补贴', detail: `${config.travel.people}人 × ${config.travel.trips}次 × ${config.travel.days}天`, amount: (toNumber(config.travel.mealPerDay) + toNumber(config.travel.allowancePerDay)) * config.travel.people * config.travel.trips * config.travel.days },
    );
  }
  if (config.onsite.enabled) {
    const months = Math.ceil(config.onsite.days / 30);
    travelRows.push(
      { name: '驻场住宿费', detail: `${config.onsite.people}人 × ${months}月`, amount: toNumber(config.onsite.hotelPerMonth) * config.onsite.people * months },
      { name: '驻场餐饮补贴', detail: `${config.onsite.people}人 × ${config.onsite.days}天`, amount: toNumber(config.onsite.mealPerDay) * config.onsite.people * config.onsite.days },
      { name: '驻场交通补贴', detail: `${config.onsite.people}人 × ${months}月`, amount: toNumber(config.onsite.transportPerMonth) * config.onsite.people * months },
    );
  }

  return {
    totalPersonDays: summary.totalPersonDays,
    totalPeople: summary.totalPeople,
    estimatedPeriod: summary.estimatedPeriod || '-',
    totalAmount: summary.totalAmount,
    laborCost: summary.laborCost,
    travelCost: summary.travelCost + summary.onsiteCost,
    otherCost: summary.otherCost,
    laborRows,
    travelRows,
    otherRows: getQuotationOtherCostDetails(config),
  };
}

function QuotationDetailBlock({ title, rows, total }: { title: string; rows: QuotationReportRow[]; total: number }) {
  return (
    <section className="quotation-summary-report-block">
      <div className="quotation-summary-report-block-title">{title}</div>
      <div className="quotation-summary-report-block-body">
        {rows.length ? rows.map(row => (
          <div className="quotation-summary-report-row" key={`${row.name}-${row.detail ?? ''}`}>
            <div>
              <strong>{row.name}</strong>
              {row.detail ? <span>{row.detail}</span> : null}
            </div>
            <strong>{formatAmount(row.amount)}</strong>
          </div>
        )) : <div className="quotation-summary-report-empty">暂无配置</div>}
      </div>
      <div className="quotation-summary-report-subtotal"><span>{title.replace('明细', '合计')}</span><strong>{formatAmount(total)}</strong></div>
    </section>
  );
}

interface QuotationSummaryReportProps {
  config: ProjectQuotationConfig;
  summary: QuotationSummaryReportSummary;
  quotedAmount?: number;
  upliftRate?: number;
}

export function QuotationSummaryReport({ config, summary, quotedAmount, upliftRate }: QuotationSummaryReportProps) {
  const report = buildQuotationSummaryReportData(config, summary);
  const displayedTotalAmount = Number.isFinite(quotedAmount) ? quotedAmount as number : report.totalAmount;
  const upliftText = Number.isFinite(upliftRate) ? `（上浮比例：${upliftRate}%）` : '';
  return (
    <section className="quotation-summary-report">
      <strong className="quotation-summary-report-title">报价信息</strong>
      <div className="quotation-summary-report-metrics">
        <div><span>总人天</span><strong>{report.totalPersonDays} 人天</strong></div>
        <div><span>总人数</span><strong>{report.totalPeople} 人</strong></div>
        <div><span>预计工期</span><strong>{report.estimatedPeriod}</strong></div>
        <div className="is-primary"><span>项目报价</span><strong>{formatAmount(report.totalAmount)}</strong></div>
      </div>
      <div className="quotation-summary-report-blocks">
        <QuotationDetailBlock title="人力成本明细" rows={report.laborRows} total={report.laborCost} />
        <QuotationDetailBlock title="出差驻场成本明细" rows={report.travelRows} total={report.travelCost} />
        <QuotationDetailBlock title="其他成本明细" rows={report.otherRows} total={report.otherCost} />
      </div>
      <div className="quotation-summary-report-total">
        <span>项目总报价</span>
        <strong>{formatAmount(displayedTotalAmount)}{upliftText}</strong>
        <div>
          <span>人力：{formatPercentage(report.laborCost, displayedTotalAmount)}</span>
          <span>差旅：{formatPercentage(report.travelCost, displayedTotalAmount)}</span>
          <span>其他：{formatPercentage(report.otherCost, displayedTotalAmount)}</span>
        </div>
      </div>
    </section>
  );
}

function drawText(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string) {
  context.fillStyle = color;
  context.font = font;
  context.fillText(text, x, y);
}

function drawReportBlock(
  context: CanvasRenderingContext2D,
  title: string,
  rows: QuotationReportRow[],
  total: number,
  y: number,
  width: number,
) {
  const blockRows = rows.length ? rows : [{ name: '暂无配置', amount: 0 }];
  const blockHeight = 44 + blockRows.length * 44 + 42;
  context.fillStyle = '#ffffff';
  context.fillRect(40, y, width - 80, blockHeight);
  context.strokeStyle = '#e5e6eb';
  context.strokeRect(40, y, width - 80, blockHeight);
  context.fillStyle = '#f7f8fa';
  context.fillRect(40, y, width - 80, 44);
  drawText(context, title, 58, y + 28, '#1d2129', '600 18px PingFang SC, sans-serif');

  blockRows.forEach((row, index) => {
    const rowY = y + 44 + index * 44;
    drawText(context, row.name, 58, rowY + 19, '#1d2129', '500 15px PingFang SC, sans-serif');
    if (row.detail) drawText(context, row.detail, 58, rowY + 36, '#86909c', '13px PingFang SC, sans-serif');
    const amount = formatAmount(row.amount);
    context.textAlign = 'right';
    drawText(context, amount, width - 58, rowY + 26, '#1d2129', '600 15px PingFang SC, sans-serif');
    context.textAlign = 'left';
  });

  const totalY = y + 44 + blockRows.length * 44;
  context.fillStyle = '#f7f8fa';
  context.fillRect(40, totalY, width - 80, 42);
  drawText(context, title.replace('明细', '合计'), 58, totalY + 26, '#4e5969', '600 15px PingFang SC, sans-serif');
  context.textAlign = 'right';
  drawText(context, formatAmount(total), width - 58, totalY + 26, '#165dff', '600 16px PingFang SC, sans-serif');
  context.textAlign = 'left';
  return y + blockHeight + 18;
}

export async function createQuotationSummaryImageUrl(config: ProjectQuotationConfig, summary: ProjectQuotationSummary) {
  if (typeof document === 'undefined') return undefined;
  const report = buildQuotationSummaryReportData(config, summary);
  const width = 1120;
  const reportRows = Math.max(1, report.laborRows.length) + Math.max(1, report.travelRows.length) + Math.max(1, report.otherRows.length);
  const height = 318 + reportRows * 44 + 3 * 104 + 132;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  context.fillStyle = '#f2f3f5';
  context.fillRect(0, 0, width, height);
  drawText(context, '报价汇总', 40, 50, '#1d2129', '600 28px PingFang SC, sans-serif');
  drawText(context, '由报价系统自动生成', 40, 76, '#86909c', '14px PingFang SC, sans-serif');

  const metricLabels = ['总人天', '总人数', '预计工期', '项目总报价'];
  const metricValues = [`${report.totalPersonDays} 人天`, `${report.totalPeople} 人`, report.estimatedPeriod, formatAmount(report.totalAmount)];
  metricLabels.forEach((label, index) => {
    const x = 40 + index * 260;
    context.fillStyle = '#ffffff';
    context.fillRect(x, 100, 240, 74);
    drawText(context, label, x + 16, 126, '#86909c', '14px PingFang SC, sans-serif');
    drawText(context, metricValues[index], x + 16, 156, index === 3 ? '#165dff' : '#1d2129', '600 20px PingFang SC, sans-serif');
  });

  let y = 194;
  y = drawReportBlock(context, '人力成本明细', report.laborRows, report.laborCost, y, width);
  y = drawReportBlock(context, '出差驻场成本明细', report.travelRows, report.travelCost, y, width);
  y = drawReportBlock(context, '其他成本明细', report.otherRows, report.otherCost, y, width);

  context.fillStyle = '#165dff';
  context.fillRect(40, y, width - 80, 92);
  drawText(context, '项目总报价', 62, y + 34, '#ffffff', '16px PingFang SC, sans-serif');
  drawText(context, formatAmount(report.totalAmount), 62, y + 66, '#ffffff', '600 30px PingFang SC, sans-serif');
  context.textAlign = 'right';
  drawText(context, `人力：${formatPercentage(report.laborCost, report.totalAmount)}    差旅：${formatPercentage(report.travelCost, report.totalAmount)}    其他：${formatPercentage(report.otherCost, report.totalAmount)}`, width - 62, y + 62, '#ffffff', '14px PingFang SC, sans-serif');
  context.textAlign = 'left';

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  return blob ? URL.createObjectURL(blob) : undefined;
}
