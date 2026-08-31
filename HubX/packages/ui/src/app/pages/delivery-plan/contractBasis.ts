import type { Contract, ContractDeliveryPlatform } from '../contracts/types';
import { collectionAmountForPeriod } from '../../../services/collectionMutations';
import type {
  DeliveryConfig,
  DeliveryPlan,
  DeliveryPlanContractBasis,
  DeliveryType,
  SopMilestone,
  SopStep,
} from './types';
import { derivePhaseStatus, generateDeliveryPlan } from './utils';

const PLATFORM_ORDER: ContractDeliveryPlatform[] = ['网站', '小程序', 'APP'];

function inferPlatforms(contract: Contract): ContractDeliveryPlatform[] {
  const explicit = contract.current.deliveryPlatforms ?? [];
  if (explicit.length > 0) {
    return PLATFORM_ORDER.filter((platform) => explicit.includes(platform));
  }

  const text = [
    contract.current.contractName,
    contract.current.productCategory,
    contract.current.contractContent,
  ].join(' ');
  const platforms: ContractDeliveryPlatform[] = [];
  if (/网站|网页|Web|H5/i.test(text)) platforms.push('网站');
  if (/小程序/.test(text)) platforms.push('小程序');
  if (/APP|iOS|Android|安卓|双端/i.test(text)) platforms.push('APP');
  return platforms.length > 0 ? platforms : ['网站'];
}

function deliveryTypeFromPlatforms(platforms: ContractDeliveryPlatform[]): DeliveryType {
  const selected = new Set(platforms);
  if (selected.size === 3) return '全平台';
  if (selected.has('网站') && selected.has('小程序')) return '网站+小程序';
  if (selected.has('网站') && selected.has('APP')) return '网站+APP';
  if (selected.has('小程序') && selected.has('APP')) return '小程序+APP';
  return platforms[0] ?? '网站';
}

export function buildContractBasis(contract: Contract): DeliveryPlanContractBasis {
  const paymentConditions = contract.current.paymentPlans.map((payment) => {
    const received = (contract.collectionRecords ?? [])
      .reduce((sum, record) => sum + collectionAmountForPeriod(record, payment.period), 0);
    return {
      period: payment.period,
      name: payment.periodName ?? `第 ${payment.period} 期款`,
      expectedDate: payment.expectedDate,
      condition: payment.condition ?? '',
      amount: payment.amount,
      percentage: payment.percentage,
      completed: received >= payment.amount,
    };
  });

  const explicitDeliveryConditions = contract.current.deliveryConditions ?? [];
  const deliveryConditions = explicitDeliveryConditions.length > 0
    ? explicitDeliveryConditions
    : [{
        name: '合同约定交付完成',
        expectedDate: contract.current.endDate,
        condition: '完成合同标的并达到合同约定的交付与验收要求',
        deliverables: contract.current.contractContent,
      }];

  return {
    contractId: contract.id,
    contractNo: contract.contractNo,
    contractName: contract.current.contractName,
    signDate: contract.current.signDate,
    subjectCategory: contract.current.productCategory,
    subjectContent: contract.current.contractContent,
    paymentConditions,
    deliveryConditions,
  };
}

export function deriveDeliveryConfigFromContract(contract: Contract): DeliveryConfig {
  const platforms = inferPlatforms(contract);
  const basis = buildContractBasis(contract);
  const terms = [
    basis.subjectCategory,
    basis.subjectContent,
    ...basis.deliveryConditions.flatMap((item) => [item.name, item.condition, item.deliverables]),
  ].join(' ');
  const selectedPhases = [1, 2, 3, 5];
  if (/上架|备案|发布|部署|域名|SSL|软著/i.test(terms)) selectedPhases.push(4);
  if (/运维|维护|质保|培训|移交/i.test(terms)) selectedPhases.push(6);
  if (/总结|复盘|结项/.test(terms)) selectedPhases.push(7);

  return {
    selectedPhases: [...selectedPhases].sort((a, b) => a - b),
    deliveryType: deliveryTypeFromPlatforms(platforms),
    contractId: contract.id,
  };
}

function buildContractMilestones(
  contract: Contract,
  basis: DeliveryPlanContractBasis,
): Array<Omit<SopMilestone, 'id' | 'projectId'>> {
  const milestones: Array<Omit<SopMilestone, 'id' | 'projectId'>> = [
    {
      name: '合同签订',
      date: basis.signDate,
      completed: contract.status === 'archived',
      source: 'contract_signing',
      contractId: contract.id,
      condition: '双方签署并生效',
    },
    ...basis.paymentConditions.map((payment) => ({
      name: `${payment.name}（${payment.percentage}%）`,
      date: payment.expectedDate,
      completed: payment.completed,
      source: 'contract_payment' as const,
      contractId: contract.id,
      condition: payment.condition,
      amount: payment.amount,
    })),
    ...basis.deliveryConditions.map((delivery) => ({
      name: delivery.name,
      date: delivery.expectedDate,
      completed: false,
      source: 'contract_delivery' as const,
      contractId: contract.id,
      condition: delivery.condition,
    })),
  ];

  return milestones.sort((a, b) => a.date.localeCompare(b.date));
}

function appendNotes(step: SopStep, value: string): void {
  step.userNotes = [step.userNotes, value].filter(Boolean).join('\n');
}

function applyContractBasis(plan: DeliveryPlan, basis: DeliveryPlanContractBasis): DeliveryPlan {
  const subjectSummary = `合同标的：${basis.subjectCategory}；${basis.subjectContent}`;
  const paymentSummary = basis.paymentConditions
    .map((item) => `${item.name} ${item.percentage}%：${item.condition || '未填写付款条件'}`)
    .join('；');
  const deliverySummary = basis.deliveryConditions
    .map((item) => `${item.name}（${item.expectedDate}）：${item.condition}`)
    .join('；');

  const contractBreakdownStep = plan.steps.find((step) => step.stepNo === '1.2');
  if (contractBreakdownStep) appendNotes(contractBreakdownStep, `${subjectSummary}\n付款条件：${paymentSummary}\n交付条件：${deliverySummary}`);

  const requirementStep = plan.steps.find((step) => step.stepNo === '3.1');
  if (requirementStep) appendNotes(requirementStep, subjectSummary);

  const collectionStep = plan.steps.find((step) => step.stepNo === '3.10');
  if (collectionStep) appendNotes(collectionStep, `合同付款条件：${paymentSummary}`);

  const acceptanceStep = plan.steps.find((step) => step.stepNo === '5.3');
  if (acceptanceStep) appendNotes(acceptanceStep, `合同交付条件：${deliverySummary}`);

  return { ...plan, contractBasis: basis };
}

export function generateDeliveryPlanFromContract(
  contract: Contract,
  project: Record<string, unknown>,
  selectedPhases?: number[],
): DeliveryPlan {
  const basis = buildContractBasis(contract);
  const derivedConfig = deriveDeliveryConfigFromContract(contract);
  const config = selectedPhases ? { ...derivedConfig, selectedPhases } : derivedConfig;
  const plan = generateDeliveryPlan(
    config,
    project,
    basis.signDate,
    buildContractMilestones(contract, basis),
  );
  const enriched = applyContractBasis(plan, basis);

  for (const phase of enriched.phases) {
    phase.status = derivePhaseStatus(enriched.steps.filter((step) => step.phaseId === phase.id));
  }
  return enriched;
}
