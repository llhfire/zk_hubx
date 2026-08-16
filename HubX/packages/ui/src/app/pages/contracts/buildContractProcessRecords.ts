import type { Contract } from './types';

export interface ContractProcessRecord {
  id: string;
  contractId: string;
  contractNo: string;
  title: string;
  content: string;
  operator: string;
  time: string;
  tag: string;
  color: string;
}

export function buildContractProcessRecords(contracts: Contract[]): ContractProcessRecord[] {
  const records: ContractProcessRecord[] = [];

  contracts.forEach((contract) => {
    records.push({
      id: `${contract.id}-created`,
      contractId: contract.id,
      contractNo: contract.contractNo,
      title: '新增合同',
      content: `创建合同「${contract.current.contractName || '未命名合同'}」`,
      operator: contract.createdBy,
      time: contract.createdAt,
      tag: '已创建',
      color: 'arcoblue',
    });

    contract.versionHistory.slice(1).forEach((version) => {
      records.push({
        id: `${contract.id}-version-${version.versionNo}`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        title: '保存合同版本',
        content: `${version.versionNo} · ${version.label}`,
        operator: version.createdBy,
        time: version.createdAt,
        tag: version.versionNo,
        color: 'purple',
      });
    });

    contract.approvalFlow.forEach((node, index) => {
      if (!node.time || node.status === 'pending') return;
      const isSubmit = node.step === '发起申请' && node.status === 'approved';
      const isRejected = node.status === 'rejected';
      records.push({
        id: `${contract.id}-approval-${index}-${node.time}`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        title: isSubmit ? '提交合同审批' : `${node.step}${isRejected ? '驳回' : '通过'}`,
        content: node.comment || (isSubmit ? '合同已进入审批流程' : `${node.step}已完成处理`),
        operator: node.approver,
        time: node.time,
        tag: isSubmit ? '已提交' : isRejected ? '已驳回' : '已通过',
        color: isSubmit ? 'arcoblue' : isRejected ? 'red' : 'green',
      });
    });

    if (contract.mailedAt) {
      records.push({
        id: `${contract.id}-mailed`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        title: '合同已寄出',
        content: '纸质合同已寄送客户，等待签章回寄',
        operator: '系统记录',
        time: contract.mailedAt,
        tag: '已寄出',
        color: 'orange',
      });
    }

    contract.archivedScans.forEach((entry) => {
      records.push({
        id: `${contract.id}-archive-${entry.id}`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        title: '合同扫描件归档',
        content: `归档 ${entry.files.length} 个文件 · 对应版本 ${entry.linkedVersionNo}`,
        operator: entry.uploadedBy,
        time: entry.uploadedAt,
        tag: entry.isPrimary ? '主件' : '已归档',
        color: 'cyan',
      });
    });

    if (contract.status === 'voided') {
      records.push({
        id: `${contract.id}-voided`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        title: '合同已作废',
        content: '合同流程已终止',
        operator: '系统记录',
        time: contract.updatedAt,
        tag: '已作废',
        color: 'red',
      });
    }
  });

  return records.sort((a, b) => {
    const aTime = new Date(a.time).getTime();
    const bTime = new Date(b.time).getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return b.time.localeCompare(a.time);
    }
    return bTime - aTime;
  });
}
