import type { CollectionLedgerEntry } from '../../services/collectionMutations';
import { sumReceived } from '../../services/collectionMutations';
import type { Contract } from './contracts/types';
import type { LeadListItem } from './leads/types';
import type { Project } from './project-management/mockData';

export interface ClosedLeadRow extends LeadListItem {
  closedStatus: '已签约' | '已立项' | '待关联';
  closeDate: string;
  contractId?: string;
  contractNo: string;
  contractAmount: number;
  receivedAmount: number;
  projectId?: string;
  projectName: string;
  projectStatus: string;
  conversionDays: number;
}

function normalizeRelationText(value = ''): string {
  return value
    .toLowerCase()
    .replace(/[\s（）()·\-_]/g, '')
    .replace(/有限责任公司|股份有限公司|有限公司|公司/g, '')
    .replace(/需求|合同|项目/g, '');
}

function leadAliases(lead: LeadListItem): Set<string> {
  const values = [lead.id, lead.key];
  return new Set(values.flatMap(value => [value, value.startsWith('lead-') ? value : `lead-${value}`]));
}

function findContract(lead: LeadListItem, contracts: Contract[]): Contract | undefined {
  const candidates = contracts.filter(contract => contract.status !== 'voided' && contract.kind !== 'supplement');
  const aliases = leadAliases(lead);
  const exact = candidates.find(contract => contract.leadId && aliases.has(contract.leadId));
  if (exact) return exact;

  const customer = normalizeRelationText(lead.customer);
  const name = normalizeRelationText(lead.name);
  return candidates
    .map(contract => {
      const contractCustomer = normalizeRelationText(contract.current.customerName);
      const contractName = normalizeRelationText(contract.current.contractName);
      const customerHit = customer.length >= 2 && contractCustomer.length >= 2
        && (customer === contractCustomer || customer.includes(contractCustomer) || contractCustomer.includes(customer));
      const nameHit = name.length >= 4 && contractName.length >= 4
        && (name.includes(contractName) || contractName.includes(name));
      return { contract, score: (customerHit ? 4 : 0) + (nameHit ? 2 : 0) };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.contract.updatedAt.localeCompare(a.contract.updatedAt))[0]?.contract;
}

function findProject(lead: LeadListItem, contract: Contract | undefined, projects: Project[]): Project | undefined {
  if (contract) {
    const byContract = projects.find(project => project.id === contract.projectId || project.contractId === contract.id);
    if (byContract) return byContract;
  }
  const aliases = leadAliases(lead);
  const byLead = projects.find(project => project.leadId && aliases.has(project.leadId));
  if (byLead) return byLead;
  const leadName = normalizeRelationText(lead.name);
  return projects.find(project => {
    const projectName = normalizeRelationText(project.name);
    return leadName.length >= 4 && projectName.length >= 4
      && (leadName.includes(projectName) || projectName.includes(leadName));
  });
}

function calculateConversionDays(lead: LeadListItem, closeDate: string): number {
  const startedAt = Date.parse(lead.createTime);
  const closedAt = Date.parse(closeDate);
  if (Number.isFinite(startedAt) && Number.isFinite(closedAt) && closedAt >= startedAt) {
    return Math.max(1, Math.ceil((closedAt - startedAt) / 86_400_000));
  }
  return lead.daysHeld;
}

export function buildClosedLeadRows(input: {
  leads: LeadListItem[];
  contracts: Contract[];
  projects: Project[];
  collections: CollectionLedgerEntry[];
}): ClosedLeadRow[] {
  return input.leads
    .filter(lead => lead.transformStatus && lead.status === '已签单')
    .map(lead => {
      const contract = findContract(lead, input.contracts);
      const project = findProject(lead, contract, input.projects);
      const contractCollections = contract
        ? input.collections.filter(record => record.contractId === contract.id)
        : [];
      const closeDate = contract?.current.signDate || lead.lastFollowTime || lead.createTime;
      return {
        ...lead,
        closedStatus: project ? '已立项' : contract ? '已签约' : '待关联',
        closeDate: closeDate.slice(0, 10),
        contractId: contract?.id,
        contractNo: contract?.contractNo || '-',
        contractAmount: contract?.current.totalAmount || lead.budget || 0,
        receivedAmount: sumReceived(contractCollections),
        projectId: project?.id,
        projectName: project?.name || '未立项',
        projectStatus: project?.status || '-',
        conversionDays: calculateConversionDays(lead, closeDate),
      };
    });
}
