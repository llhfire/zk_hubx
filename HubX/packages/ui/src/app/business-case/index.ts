export type {
  BusinessCase,
  ContractRef,
  LeadProjectBanner,
  LeadSalesStatus,
  PresalesContractRecord,
  PresalesEvent,
  PresalesEventType,
  PresalesFollowRecord,
  PresalesQuoteRecord,
  UnconfirmedProject,
} from './types';
export { SIGNING_LEAD_STATUSES } from './types';
export {
  buildPresalesTimeline,
  confirmProject,
  filterProjectsForViewer,
  hasEnteredSigning,
  isActiveContract,
  isVisibleToProductManager,
  leadProjectBanner,
  shouldSpawnUnconfirmedProject,
  spawnUnconfirmedProject,
} from './caseUtils';
export { initialBusinessCases } from './mockCases';
