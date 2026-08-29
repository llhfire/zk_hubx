export type ArtifactArchiveStatus = 'pending' | 'archived';
export type AcceptanceStatus = 'pending' | 'submitted' | 'accepted';

export interface DeliveryClosureRecord {
  projectId: string;
  artifactStatus: ArtifactArchiveStatus;
  acceptanceStatus: AcceptanceStatus;
  artifactArchivedAt?: string;
  acceptanceSubmittedAt?: string;
  acceptedAt?: string;
}

export interface AfterSalesHandoff {
  id: string;
  contractId: string;
  contractNo: string;
  projectName: string;
  customerName: string;
  handedOffAt: string;
  maintenanceEnd: string;
}

const DELIVERY_CLOSURE_STORAGE_KEY = 'hubx-alpha-delivery-closure-v1';
const AFTER_SALES_STORAGE_KEY = 'hubx-alpha-after-sales-handoffs-v1';

function readList<T>(key: string): T[] {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? JSON.parse(value) as T[] : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, records: T[]): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(records));
  } catch {
    // α 版允许浏览器禁用本地存储；页面仍可在当前会话内继续操作。
  }
}

export function emptyDeliveryClosure(projectId: string): DeliveryClosureRecord {
  return { projectId, artifactStatus: 'pending', acceptanceStatus: 'pending' };
}

export function loadDeliveryClosure(projectId: string): DeliveryClosureRecord {
  return readList<DeliveryClosureRecord>(DELIVERY_CLOSURE_STORAGE_KEY)
    .find((record) => record.projectId === projectId) ?? emptyDeliveryClosure(projectId);
}

export function saveDeliveryClosure(record: DeliveryClosureRecord): void {
  const records = readList<DeliveryClosureRecord>(DELIVERY_CLOSURE_STORAGE_KEY);
  writeList(DELIVERY_CLOSURE_STORAGE_KEY, [record, ...records.filter((item) => item.projectId !== record.projectId)]);
}

export function archiveDeliveryArtifacts(record: DeliveryClosureRecord, at: string): DeliveryClosureRecord {
  return { ...record, artifactStatus: 'archived', artifactArchivedAt: at };
}

export function submitDeliveryAcceptance(record: DeliveryClosureRecord, at: string): DeliveryClosureRecord {
  if (record.artifactStatus !== 'archived') return record;
  return { ...record, acceptanceStatus: 'submitted', acceptanceSubmittedAt: at };
}

export function acceptDelivery(record: DeliveryClosureRecord, at: string): DeliveryClosureRecord {
  if (record.acceptanceStatus !== 'submitted') return record;
  return { ...record, acceptanceStatus: 'accepted', acceptedAt: at };
}

export function isAfterSalesHandoffReady(input: {
  receivedRate: number;
  invoicedRate: number;
  overdueCount: number;
  invoiceStatuses: string[];
}): boolean {
  const hasPendingInvoice = input.invoiceStatuses.some((status) => status === '开票中');
  return input.receivedRate >= 100
    && input.invoicedRate >= 100
    && input.overdueCount === 0
    && !hasPendingInvoice;
}

export function loadAfterSalesHandoffs(): AfterSalesHandoff[] {
  return readList<AfterSalesHandoff>(AFTER_SALES_STORAGE_KEY);
}

export function saveAfterSalesHandoff(handoff: AfterSalesHandoff): void {
  const records = loadAfterSalesHandoffs();
  writeList(AFTER_SALES_STORAGE_KEY, [handoff, ...records.filter((item) => item.contractId !== handoff.contractId)]);
}

export function buildAfterSalesHandoff(input: {
  contractId: string;
  contractNo: string;
  projectName: string;
  customerName: string;
  handedOffAt: string;
}): AfterSalesHandoff {
  const end = new Date(`${input.handedOffAt}T12:00:00`);
  end.setMonth(end.getMonth() + 6);
  const maintenanceEnd = [
    end.getFullYear(),
    String(end.getMonth() + 1).padStart(2, '0'),
    String(end.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    id: `handoff-${input.contractId}`,
    contractId: input.contractId,
    contractNo: input.contractNo,
    projectName: input.projectName,
    customerName: input.customerName,
    handedOffAt: input.handedOffAt,
    maintenanceEnd,
  };
}
