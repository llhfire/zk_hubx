import type { Quote } from '../quotation/types';
import type { Contract } from '../contracts/types';
import type { ElectronicSigningPackage, ElectronicSigningStatus, SalesComplianceItem } from './types';

const SIGNING_TRANSITIONS: Record<ElectronicSigningStatus, ElectronicSigningStatus[]> = {
  pending: ['signing', 'revoked'],
  signing: ['completed', 'refused', 'expired', 'revoked'],
  completed: [], refused: [], expired: [], revoked: [],
};

export function canAdvanceSigning(from: ElectronicSigningStatus, to: ElectronicSigningStatus) {
  return SIGNING_TRANSITIONS[from].includes(to);
}

export function advanceSigningPackage(pkg: ElectronicSigningPackage, status: ElectronicSigningStatus, now = new Date().toISOString()): ElectronicSigningPackage {
  if (!canAdvanceSigning(pkg.status, status)) throw new Error(`签署状态不能从 ${pkg.status} 变更为 ${status}`);
  return { ...pkg, status, updatedAt: now };
}

export function buildQuoteComplianceArchive(quote: Quote, contract?: Contract): SalesComplianceItem[] {
  const customerReady = Boolean(quote.customerSnapshot?.customerName || quote.basicInfo.customerName);
  const featureReady = quote.flowMode === 'file' ? Boolean(quote.fileFlow?.evaluationFileName) : quote.featureList.some((module) => module.subFeatures.length > 0);
  const auditReady = quote.auditNodes.length > 0 && quote.auditNodes.every((node) => node.status === 'APPROVED');
  const customerFileReady = quote.flowMode === 'file' ? quote.fileFlow?.onlineDocument.status === 'finalized' : Boolean(quote.summary);
  return [
    { key: 'customer', label: '客户快照', status: customerReady ? 'complete' : 'missing', source: '报价基础信息', detail: customerReady ? '已保存客户与联系人快照' : '缺少客户或联系人信息' },
    { key: 'scope', label: '清单与评估', status: featureReady && quote.evalSheet ? 'complete' : 'missing', source: quote.flowMode === 'file' ? '评估文件' : '功能清单', detail: featureReady && quote.evalSheet ? '范围与技术评估齐全' : '功能范围或技术评估不完整' },
    { key: 'approval', label: '审批快照', status: auditReady ? 'complete' : quote.status === 'rejected' ? 'anomaly' : 'missing', source: '报价审批', detail: auditReady ? '会签已完成' : '会签尚未全部通过' },
    { key: 'customer-file', label: '客户报价文件', status: customerFileReady ? 'complete' : 'missing', source: quote.flowMode === 'file' ? '文件流转' : '在线客户件', detail: customerFileReady ? '客户件可追溯' : '尚未形成正式客户件' },
    { key: 'stamp', label: '内部用印', status: quote.stampNode.status === 'COMPLETED' ? 'complete' : 'missing', source: '盖章节点', detail: quote.stampNode.status === 'COMPLETED' ? `盖章人：${quote.stampNode.stamperName}` : '尚未完成内部用印' },
    { key: 'send', label: '发送与确认', status: quote.sentAt ? 'complete' : 'missing', source: '报价时间线', detail: quote.sentAt ? `已于 ${quote.sentAt} 发出` : '尚无正式发出记录' },
    { key: 'version', label: '版本差异', status: quote.previousQuoteId ? 'complete' : 'missing', source: '重新报价链', detail: quote.previousQuoteId ? '可查看与前一报价的差异' : '首版报价，无前序差异' },
    { key: 'signing', label: '外部签署证据', status: quote.signingPackage?.status === 'completed' || quote.signingPackage?.evidence.length ? 'complete' : 'missing', source: '电子签署演示 / 线下证据', detail: quote.signingPackage ? `当前状态：${quote.signingPackage.status}` : '未发起签署演示且无线下证据' },
    { key: 'contract', label: '关联合同', status: contract ? 'complete' : 'missing', source: '合同域', detail: contract ? `${contract.contractNo} · ${contract.current.contractName}` : '尚未生成关联合同', route: contract ? `/contracts/${contract.id}` : undefined },
  ];
}

export function complianceSummary(items: SalesComplianceItem[]) {
  return {
    complete: items.filter((item) => item.status === 'complete').length,
    missing: items.filter((item) => item.status === 'missing').length,
    anomaly: items.filter((item) => item.status === 'anomaly').length,
    status: items.some((item) => item.status === 'anomaly') ? 'anomaly' : items.some((item) => item.status === 'missing') ? 'missing' : 'complete',
  } as const;
}
