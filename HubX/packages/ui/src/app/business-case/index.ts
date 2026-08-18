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
  buildUnconfirmedProject,
  confirmProject,
  filterProjectsForViewer,
  hasEnteredSigning,
  isActiveContract,
  isVisibleToProductManager,
  leadProjectBanner,
  shouldSpawnUnconfirmedProject,
  spawnUnconfirmedProject,
  startDelivery,
} from './caseUtils';
export type { DeliveryStartPatch } from './caseUtils';
export { initialBusinessCases } from './mockCases';
export { BusinessCaseProvider, useBusinessCases } from './BusinessCaseContext';
