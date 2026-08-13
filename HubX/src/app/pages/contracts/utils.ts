// 合同模块的纯函数工具集。
//
// 这里集中放与 React/状态/Context 无关的纯计算：
// - 金额转中文大写
// - 状态机转换合法性
// - 版本号自增
// - 合同编号生成
// - 从线索的报价历史中找最近一份"已审批通过的报价"

import type {
  ContractStatus,
  PaymentPlanItem,
  PaymentRatio,
  QuotationRecord,
} from './types';

export const PAYMENT_RATIO_OPTIONS: Array<{ value: PaymentRatio; label: string; percentages: number[] }> = [
  { value: '3:3:3:1', label: '3:3:3:1', percentages: [30, 30, 30, 10] },
  { value: '4:5:1', label: '4:5:1', percentages: [40, 50, 10] },
];

export function buildPaymentPlansForRatio(
  ratio: PaymentRatio,
  totalAmount: number,
): PaymentPlanItem[] {
  const option = PAYMENT_RATIO_OPTIONS.find((item) => item.value === ratio);
  if (!option) return [];

  return option.percentages.map((percentage, index) => ({
    period: index + 1,
    expectedDate: '',
    expectedDateType: 'fixed',
    condition: '',
    amount: Math.round(((totalAmount * percentage) / 100) * 100) / 100,
    percentage,
    amountType: 'percentage',
  }));
}

export function getPaymentPlanPeriodLabel(plan: PaymentPlanItem): string {
  return plan.periodName ?? `第 ${plan.period} 期`;
}

export function getPaymentPlanExpectedDateLabel(plan: PaymentPlanItem): string {
  if (plan.expectedDateType === 'workday') {
    return plan.expectedDays ? `${plan.expectedDays} 个工作日` : '—';
  }
  if (plan.expectedDateType === 'natural') {
    return plan.expectedDays ? `${plan.expectedDays} 个自然日` : '—';
  }
  return plan.expectedDate || '—';
}

// 人民币金额转中文大写。从 LeadDetail.tsx:558 的 convertToChinese 整体迁出。
// 不处理小数（合同金额按"元整"展示）；负数视为绝对值后追加"负"前缀。
export function convertAmountToChinese(amount: number): string {
  if (amount === 0) return '零元整';

  const sign = amount < 0 ? '负' : '';
  const absAmount = Math.abs(amount);

  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿', '万亿'];

  let integerPart = Math.floor(absAmount);
  let result = '';
  let unitIndex = 0;

  while (integerPart > 0) {
    const section = integerPart % 10000;
    if (section !== 0) {
      let sectionStr = '';
      let sectionNum = section;
      let localUnitIndex = 0;

      while (sectionNum > 0) {
        const digit = sectionNum % 10;
        if (digit !== 0) {
          sectionStr = digits[digit] + units[localUnitIndex] + sectionStr;
        } else if (sectionStr && sectionStr[0] !== '零') {
          sectionStr = '零' + sectionStr;
        }
        sectionNum = Math.floor(sectionNum / 10);
        localUnitIndex++;
      }

      result = sectionStr + bigUnits[unitIndex] + result;
    } else if (result && result[0] !== '零') {
      result = '零' + result;
    }

    integerPart = Math.floor(integerPart / 10000);
    unitIndex++;
  }

  return sign + result + '元整';
}

// 状态机转换合法性判断。详见 plan 中的状态机表。
const TRANSITION_TABLE: Record<ContractStatus, ContractStatus[]> = {
  draft: ['approving', 'voided'],
  approving: ['draft', 'pending_mail', 'voided'],
  pending_mail: ['pending_return', 'draft', 'voided'],
  pending_return: ['archived', 'pending_mail', 'voided'],
  archived: ['archived', 'voided'], // archived → archived 表示"补充扫描件不变状态"
  voided: [],
};

export function canTransitionTo(from: ContractStatus, to: ContractStatus): boolean {
  return TRANSITION_TABLE[from]?.includes(to) ?? false;
}

// 版本号自增。所有版本号格式为 `V{N}`，N 从 1 起。
// 容忍历史中存在乱序版本号（如 ['V2','V1']），始终基于"最大数字 + 1"。
export function getNextVersionNo(existing: string[]): string {
  if (existing.length === 0) return 'V1';

  const maxN = existing.reduce<number>((max, v) => {
    const match = /^V(\d+)$/.exec(v);
    if (!match) return max;
    const n = Number(match[1]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `V${maxN + 1}`;
}

// 找最近一份"已审批通过的报价"。
// 标准：flowStatus === '已审核' && status === '已报价'。
// 多份满足时按 createTime 倒序取最近的；createTime 缺失时按数组顺序取最后一条。
export function findLatestApprovedQuote(
  quotations: QuotationRecord[],
): QuotationRecord | null {
  const matches = quotations.filter(
    (q) => q.flowStatus === '已审核' && q.status === '已报价',
  );
  if (matches.length === 0) return null;

  const withTime = matches.filter((q) => q.createTime);
  if (withTime.length === 0) {
    // 都没有 createTime，取数组里最靠后的一份
    return matches[matches.length - 1];
  }

  return withTime
    .slice()
    .sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))[0];
}

// 合同编号生成。新建合同按主体生成：{主体简称首字母}HT-{YYYYMMDD}{seq}。
// 未传主体前缀时保留旧格式，兼容历史数据和已有测试。
// seq 是当天的递增序号，由调用方（ContractsContext）维护一个内存计数器后传入。
// 这里不依赖时间或随机数，是纯函数；单测可控。
export function generateContractNo(now: Date, seq: number, signingEntityPrefix?: string): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seqStr = String(seq).padStart(3, '0');
  if (signingEntityPrefix) {
    return `${signingEntityPrefix}HT-${yyyy}${mm}${dd}${seqStr}`;
  }
  return `CT${yyyy}${mm}${dd}${seqStr}`;
}

// ContractStatus 的中文标签。组件层（StatusBadge / Tab）共用。
export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: '草稿',
  approving: '审批中',
  pending_mail: '待寄出',
  pending_return: '待回寄',
  archived: '已归档',
  voided: '已作废',
};

// 状态对应的 Arco Tag/Badge 颜色。
export const CONTRACT_STATUS_COLOR: Record<ContractStatus, string> = {
  draft: 'gray',
  approving: 'arcoblue',
  pending_mail: 'orange',
  pending_return: 'cyan',
  archived: 'green',
  voided: 'red',
};
