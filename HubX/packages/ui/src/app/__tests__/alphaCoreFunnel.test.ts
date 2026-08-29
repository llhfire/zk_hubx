import { describe, expect, it } from 'vitest';
import { buildUnconfirmedProject, startDelivery, unconfirmedProjectId } from '@/app/business-case';
import { buildInitialContracts } from '@/app/pages/contracts/mockData';
import { applyDealQuotePrefill, buildDealQuotePrefill } from '@/app/pages/contracts/dealQuotePrefill';
import { diffContractEvents } from '@/app/pages/contracts/signingOpenEvents';
import type { ContractSnapshotEntry } from '@/app/pages/contracts/signingOpenEvents';
import { initialQuotes } from '@/app/pages/quotation/mockData';
import {
  QUOTE_APPROVAL_BINDING,
  QUOTE_PARALLEL_TEMPLATE,
  buildAuditSnapshotFromConfig,
} from '@/app/pages/quotation/quoteAuditSnapshot';
import { collectionsForProject, registerMainPaymentDualWrite } from '@/services/collectionMutations';
import { createMockCollectionService } from '@/services/collectionService';
import { createMockContractService } from '@/services/contractService';
import { createMockLeadService } from '@/services/leadService';
import { createMockProjectService } from '@/services/projectService';
import { createMockQuotationService } from '@/services/quotationService';

function contractSnapshot(contracts: Awaited<ReturnType<ReturnType<typeof createMockContractService>['list']>>) {
  return Object.fromEntries(contracts.map((contract) => [
    contract.id,
    { approvedAt: contract.approvedAt, status: contract.status } satisfies ContractSnapshotEntry,
  ]));
}

describe('α 核心漏斗冒烟', () => {
  it('线索录入到实收登记使用真实 α 服务完整走通', async () => {
    const leads = createMockLeadService();
    const quotes = createMockQuotationService();
    const contracts = createMockContractService();
    const projects = createMockProjectService();
    const collections = createMockCollectionService();

    // 1. 线索录入、派发与首联
    const leadId = await leads.createLead({
      name: 'α 核心漏斗测试线索',
      customer: 'α 测试客户',
      contact: '王经理',
      phone: '13800000001',
      source: '官网表单',
      entity: '中科软艺',
      initialRequirement: '建设客户协同系统',
    });
    await leads.dispatchLead(leadId, { target: 'sales', assignee: '张三', reason: '核心漏斗冒烟' }, '派发管理员');
    await leads.addFollowUp(leadId, {
      method: '电话',
      customerStatus: '方案报价',
      customerLevel: 'A',
      content: '已确认需求范围，进入报价。',
      creator: '张三',
    });
    expect(await leads.getById(leadId)).toMatchObject({ owner: '张三', status: '方案报价' });

    // 2. 主报价从草稿推进到已确认
    const quoteId = await quotes.createQuote(leadId, [], {
      projectName: 'α 客户协同系统',
      customerName: 'α 测试客户',
      customerContact: '王经理',
      customerPhone: '13800000001',
    }, { salesOwnerName: '张三', flowMode: 'online' });
    await quotes.submitFeatureList(quoteId);
    await quotes.saveEvalSheet(quoteId, initialQuotes[0].evalSheet!);
    await quotes.submitEval(quoteId);
    await quotes.assignToSales(quoteId);
    const snapshot = buildAuditSnapshotFromConfig(QUOTE_APPROVAL_BINDING, QUOTE_PARALLEL_TEMPLATE);
    await quotes.submitForAudit(quoteId, snapshot);
    for (const auditor of snapshot.auditNodes) {
      await quotes.decideAudit(quoteId, auditor.auditorName, 'approve');
    }
    await quotes.stampQuote(quoteId);
    await quotes.markSent(quoteId);
    await quotes.markConfirmed(quoteId);
    const confirmedQuote = (await quotes.getById(quoteId))!;
    expect(confirmedQuote.status).toBe('confirmed');
    expect(confirmedQuote.summary?.grandTotalPrice).toBeGreaterThan(0);

    // 2.5 线索先进入合同洽谈，生成唯一未确认项目
    await leads.addFollowUp(leadId, {
      method: '电话',
      customerStatus: '合同洽谈',
      customerLevel: 'A',
      content: '报价已确认，进入主合同洽谈。',
      creator: '张三',
    });
    const projectId = unconfirmedProjectId({ leadId });
    await projects.create(buildUnconfirmedProject({
      lead: { id: leadId, name: 'α 测试客户' },
      projectId,
      today: '2026-08-28',
    }));
    expect(await projects.getById(projectId)).toMatchObject({ status: '未确认', leadId });

    // 3. 已确认报价生成主合同，并回写报价关联
    const prefill = buildDealQuotePrefill(confirmedQuote);
    const seedForm = buildInitialContracts()[0].current;
    const formData = applyDealQuotePrefill({
      ...seedForm,
      contractName: '',
      customerName: '',
      customerContact: '',
      customerPhone: '',
    }, prefill);
    const beforeCreate = contractSnapshot(await contracts.list());
    const contract = await contracts.createFromWizard({
      leadId,
      quoteId,
      kind: 'main',
      formData,
    });
    await quotes.updateQuote(quoteId, (quote) => ({ ...quote, contractId: contract.id }));
    expect(diffContractEvents(beforeCreate, await contracts.list()).created.map((item) => item.id)).toContain(contract.id);
    expect((await quotes.getById(quoteId))?.contractId).toBe(contract.id);

    // 4. 合同入口幂等补齐同一项目，不创建 ap-{合同id} 第二条记录
    const unconfirmed = buildUnconfirmedProject({
      lead: { id: leadId, name: 'α 测试客户' },
      contract: { id: contract.id, current: contract.current },
      projectId,
      today: '2026-08-28',
    });
    await projects.create(unconfirmed);
    expect(await projects.getById(projectId)).toMatchObject({ status: '未确认', contractId: contract.id });
    expect((await projects.list()).filter(item => item.leadId === leadId)).toHaveLength(1);
    await projects.confirmAssign(projectId, '张产品');

    const beforeApproval = contractSnapshot(await contracts.list());
    await contracts.submitForApproval(contract.id, contract.current);
    await contracts.approveStep(contract.id, 1, '同意启动交付');
    const approvedContract = (await contracts.getById(contract.id))!;
    expect(diffContractEvents(beforeApproval, await contracts.list()).approved.map((item) => item.id)).toContain(contract.id);
    const project = (await projects.getById(projectId))!;
    const deliveryPatch = startDelivery({ project, contractId: contract.id, today: '2026-08-28' });
    expect(deliveryPatch).not.toBeNull();
    await projects.updateProject(projectId, (current) => ({ ...current, ...deliveryPatch! }));
    expect(await projects.getById(projectId)).toMatchObject({ status: '进行中', contractId: contract.id });

    // 5. 登记实收：合同兼容记录与独立台账沿用同一流水 ID
    const payment = await registerMainPaymentDualWrite({
      contractId: contract.id,
      projectId,
      record: { amount: 10000, date: '2026-08-28', method: '银行转账', note: '首期到账' },
      addToContract: contracts.addCollection,
      addToLedger: collections.add,
    });
    expect(payment.status).toBe('ok');
    const contractRecord = (await contracts.getById(contract.id))?.collectionRecords?.find((item) => item.id === payment.collectionId);
    const ledgerRecord = (await collections.listByContract(contract.id)).find((item) => item.id === payment.collectionId);
    expect(contractRecord?.amount).toBe(10000);
    expect(ledgerRecord).toMatchObject({ amount: 10000, projectId });
    expect(collectionsForProject(await collections.list(), { projectId, contractIds: [contract.id] })).toHaveLength(1);

    // 同一流水补偿重试不应在合同兼容记录中重复入账。
    await contracts.addCollection(contract.id, {
      id: payment.collectionId,
      amount: 10000,
      date: '2026-08-28',
      method: '银行转账',
      note: '首期到账',
    });
    expect((await contracts.getById(contract.id))?.collectionRecords?.filter((item) => item.id === payment.collectionId)).toHaveLength(1);
  });
});
