import type { DatabaseAdapter, DbRecord } from './types';

export class MemoryAdapter implements DatabaseAdapter {
  readonly engine = 'memory' as const;

  private quotes = new Map<string, DbRecord>();
  private contracts = new Map<string, DbRecord>();
  private projects = new Map<string, DbRecord>();
  private cases = new Map<string, DbRecord>();
  private collections = new Map<string, DbRecord>();
  private leads = new Map<string, DbRecord>();
  private leadFollowups: { id: string; leadId: string; data: Record<string, unknown>; updatedAt?: string }[] = [];
  private leadTransfers: { id: string; leadId: string; data: Record<string, unknown>; updatedAt?: string }[] = [];
  private employees = new Map<string, DbRecord>();

  // ── 报价域 ──
  async getQuotes(): Promise<DbRecord[]> {
    return Array.from(this.quotes.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }
  async getQuote(id: string): Promise<DbRecord | null> {
    return this.quotes.get(id) ?? null;
  }
  async upsertQuote(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    this.quotes.set(id, { id, data, version, updatedAt });
  }
  async ensureSeedQuote(quote: Record<string, unknown>): Promise<void> {
    const id = (quote.id as string) || 'q-seed-1';
    if (!this.quotes.has(id)) {
      this.quotes.set(id, { id, data: quote, version: 0, updatedAt: new Date().toISOString() });
    }
  }
  async deleteQuote(id: string): Promise<void> {
    this.quotes.delete(id);
  }

  // ── 合同域 ──
  async getContracts(): Promise<DbRecord[]> {
    return Array.from(this.contracts.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }
  async getContract(id: string): Promise<DbRecord | null> {
    return this.contracts.get(id) ?? null;
  }
  async upsertContract(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    this.contracts.set(id, { id, data, version, updatedAt });
  }
  async deleteContract(id: string): Promise<void> {
    this.contracts.delete(id);
  }
  async getContractsForProject(contractId: string, leadId?: string): Promise<{ data: Record<string, unknown> }[]> {
    return Array.from(this.contracts.values())
      .filter((c) => c.id === contractId || (leadId && (c.data.leadId === leadId)))
      .map((c) => ({ data: c.data }));
  }

  // ── 交付项目域 ──
  async getProjects(): Promise<DbRecord[]> {
    return Array.from(this.projects.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }
  async getProject(id: string): Promise<DbRecord | null> {
    return this.projects.get(id) ?? null;
  }
  async getProjectByLeadId(leadId: string): Promise<DbRecord | null> {
    return Array.from(this.projects.values()).find((p) => p.data.leadId === leadId) ?? null;
  }
  async upsertProject(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    this.projects.set(id, { id, data, version, updatedAt });
  }
  async insertProjectIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    if (!this.projects.has(id)) {
      this.projects.set(id, { id, data, version, updatedAt });
    }
    return true;
  }
  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
  }

  // ── 业务单/商机域 ──
  async getCases(): Promise<DbRecord[]> {
    return Array.from(this.cases.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }
  async getCase(id: string): Promise<DbRecord | null> {
    return this.cases.get(id) ?? null;
  }
  async getCaseByLeadId(leadId: string): Promise<DbRecord | null> {
    return Array.from(this.cases.values()).find((c) => c.data.leadId === leadId) ?? null;
  }
  async upsertCase(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    this.cases.set(id, { id, data, version, updatedAt });
  }
  async insertCaseIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    if (!this.cases.has(id)) {
      this.cases.set(id, { id, data, version, updatedAt });
    }
    return true;
  }

  // ── 回款实收台账域 ──
  async getCollections(contractId?: string): Promise<{ data: Record<string, unknown> }[]> {
    let list = Array.from(this.collections.values());
    if (contractId) {
      list = list.filter((c) => c.data.contractId === contractId);
    }
    return list.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).map((c) => ({ data: c.data }));
  }
  async getCollectionsForProject(projectId: string, contractIds: string[]): Promise<{ data: Record<string, unknown> }[]> {
    const contractSet = new Set(contractIds);
    return Array.from(this.collections.values())
      .filter((c) => c.data.projectId === projectId || (c.data.contractId && contractSet.has(c.data.contractId as string)))
      .map((c) => ({ data: c.data }));
  }
  async insertCollectionIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    if (!this.collections.has(id)) {
      this.collections.set(id, { id, data, version, updatedAt });
    }
    return true;
  }

  // ── 线索域 ──
  async getLeads(): Promise<DbRecord[]> {
    return Array.from(this.leads.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }
  async getLead(id: string): Promise<DbRecord | null> {
    if (this.leads.has(id)) return this.leads.get(id)!;
    const stripped = id.replace(/^(public|assigned|trash|hightech)-/, '');
    const candidates = [
      id.startsWith('L-') ? id.slice(2) : `L-${id}`,
      stripped,
      `L-${stripped}`,
    ].filter((c) => c && c !== id);

    for (const cand of candidates) {
      if (this.leads.has(cand)) return this.leads.get(cand)!;
    }
    for (const r of this.leads.values()) {
      const d = r.data as Record<string, unknown> | undefined;
      if (d?.key === id || d?.id === id) return r;
    }
    return null;
  }
  async upsertLead(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    this.leads.set(id, { id, data, version, updatedAt });
  }
  async deleteLead(id: string): Promise<void> {
    this.leads.delete(id);
  }
  async getLeadFollowups(leadId: string): Promise<{ data: Record<string, unknown> }[]> {
    const lead = await this.getLead(leadId);
    const realId = lead ? lead.id : leadId;
    return this.leadFollowups
      .filter((f) => f.leadId === realId || f.leadId === leadId)
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .map((f) => ({ data: f.data }));
  }
  async saveLeadFollowupAndLead(
    followup: { id: string; leadId: string; data: Record<string, unknown> },
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
  ): Promise<void> {
    this.leadFollowups.unshift({ id: followup.id, leadId: followup.leadId, data: followup.data, updatedAt });
    this.leads.set(followup.leadId, { id: followup.leadId, data: updatedLead, version: nextVersion, updatedAt });
  }
  async getLeadTransfers(leadId: string): Promise<{ data: Record<string, unknown> }[]> {
    const lead = await this.getLead(leadId);
    const realId = lead ? lead.id : leadId;
    return this.leadTransfers
      .filter((t) => t.leadId === realId || t.leadId === leadId)
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .map((t) => ({ data: t.data }));
  }
  async saveLeadActionAndTransfer(
    id: string,
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
    transfer?: { id: string; leadId: string; data: Record<string, unknown> } | null,
  ): Promise<void> {
    this.leads.set(id, { id, data: updatedLead, version: nextVersion, updatedAt });
    if (transfer) {
      this.leadTransfers.unshift({ id: transfer.id, leadId: transfer.leadId, data: transfer.data, updatedAt });
    }
  }

  // ── 员工域 ──
  async getEmployees(): Promise<DbRecord[]> {
    return Array.from(this.employees.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }
  async getEmployee(id: string): Promise<DbRecord | null> {
    return this.employees.get(id) ?? null;
  }
}
