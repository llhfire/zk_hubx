import type { BusinessCase } from './types';

/** 与项目 mock 对齐的业务单：进行中 / 未确认 / 已确认未开工 */
export const initialBusinessCases: BusinessCase[] = [
  {
    id: 'case-1',
    leadId: 'lead-1',
    projectId: '1',
    contractId: '4',
    extraContractIds: [],
    quoteIds: ['quote-1'],
  },
  {
    id: 'case-star',
    leadId: 'LS001',
    projectId: '4',
    contractId: null,
    extraContractIds: [],
    quoteIds: [],
  },
  {
    id: 'case-orange',
    leadId: 'LS002',
    projectId: '5',
    contractId: null,
    extraContractIds: [],
    quoteIds: [],
  },
];
