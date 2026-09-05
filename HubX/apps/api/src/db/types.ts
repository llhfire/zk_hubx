/**
 * ZK HubX 统一数据库适配层类型定义
 */

export interface DbRecord<T = Record<string, unknown>> {
  id: string;
  data: T;
  version: number;
  updatedAt?: string;
}

export interface DatabaseAdapter {
  readonly engine: 'supabase' | 'd1' | 'memory';

  // 报价域 (Quotes)
  getQuotes(): Promise<DbRecord[]>;
  getQuote(id: string): Promise<DbRecord | null>;
  upsertQuote(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void>;
  ensureSeedQuote(quote: Record<string, unknown>): Promise<void>;
  deleteQuote(id: string): Promise<void>;

  // 合同域 (Contracts)
  getContracts(): Promise<DbRecord[]>;
  getContract(id: string): Promise<DbRecord | null>;
  upsertContract(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void>;
  deleteContract(id: string): Promise<void>;
  getContractsForProject(contractId: string, leadId?: string): Promise<{ data: Record<string, unknown> }[]>;

  // 交付项目域 (Projects)
  getProjects(): Promise<DbRecord[]>;
  getProject(id: string): Promise<DbRecord | null>;
  getProjectByLeadId(leadId: string): Promise<DbRecord | null>;
  upsertProject(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void>;
  insertProjectIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean>;
  deleteProject(id: string): Promise<void>;

  // 业务单/商机域 (Cases)
  getCases(): Promise<DbRecord[]>;
  getCase(id: string): Promise<DbRecord | null>;
  getCaseByLeadId(leadId: string): Promise<DbRecord | null>;
  upsertCase(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void>;
  insertCaseIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean>;

  // 回款实收台账域 (Collections)
  getCollections(contractId?: string): Promise<{ data: Record<string, unknown> }[]>;
  getCollectionsForProject(projectId: string, contractIds: string[]): Promise<{ data: Record<string, unknown> }[]>;
  insertCollectionIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean>;

  // 线索域 (Leads)
  getLeads(): Promise<DbRecord[]>;
  getLead(id: string): Promise<DbRecord | null>;
  upsertLead(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void>;
  deleteLead(id: string): Promise<void>;

  // 线索跟进与流转 (Lead Followups & Transfers)
  getLeadFollowups(leadId: string): Promise<{ data: Record<string, unknown> }[]>;
  saveLeadFollowupAndLead(
    followup: { id: string; leadId: string; data: Record<string, unknown> },
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
  ): Promise<void>;
  getLeadTransfers(leadId: string): Promise<{ data: Record<string, unknown> }[]>;
  saveLeadActionAndTransfer(
    id: string,
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
    transfer?: { id: string; leadId: string; data: Record<string, unknown> } | null,
  ): Promise<void>;

  // 员工档案 (Employees)
  getEmployees(): Promise<DbRecord[]>;
  getEmployee(id: string): Promise<DbRecord | null>;
}
