import type { DatabaseAdapter, DbRecord } from './types';

function parseJsonData<T = Record<string, unknown>>(data: unknown): T {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data as T;
    }
  }
  return (data ?? {}) as T;
}

export class D1Adapter implements DatabaseAdapter {
  readonly engine = 'd1' as const;

  constructor(private db: D1Database) {}

  // ── 报价域 ──
  async getQuotes(): Promise<DbRecord[]> {
    const { results } = await this.db
      .prepare('SELECT id, data, version, updated_at FROM quotes ORDER BY updated_at DESC')
      .all<{ id: string; data: string; version: number; updated_at?: string }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      data: parseJsonData(r.data),
      version: r.version ?? 0,
      updatedAt: r.updated_at,
    }));
  }

  async getQuote(id: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare('SELECT id, data, version, updated_at FROM quotes WHERE id = ?')
      .bind(id)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async upsertQuote(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    await this.db
      .prepare('INSERT OR REPLACE INTO quotes (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
  }

  async ensureSeedQuote(quote: Record<string, unknown>): Promise<void> {
    const quoteId = (quote.id as string) || 'q-seed-1';
    await this.db
      .prepare('INSERT OR IGNORE INTO quotes (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(quoteId, JSON.stringify(quote), new Date().toISOString(), 0)
      .run();
  }

  async deleteQuote(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM quotes WHERE id = ?').bind(id).run();
  }

  // ── 合同域 ──
  async getContracts(): Promise<DbRecord[]> {
    const { results } = await this.db
      .prepare('SELECT id, data, version, updated_at FROM contracts ORDER BY updated_at DESC')
      .all<{ id: string; data: string; version: number; updated_at?: string }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      data: parseJsonData(r.data),
      version: r.version ?? 0,
      updatedAt: r.updated_at,
    }));
  }

  async getContract(id: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare('SELECT id, data, version, updated_at FROM contracts WHERE id = ?')
      .bind(id)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async upsertContract(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    await this.db
      .prepare('INSERT OR REPLACE INTO contracts (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
  }

  async deleteContract(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM contracts WHERE id = ?').bind(id).run();
  }

  async getContractsForProject(contractId: string, leadId?: string): Promise<{ data: Record<string, unknown> }[]> {
    const { results } = await this.db
      .prepare("SELECT data FROM contracts WHERE id = ? OR (? != '' AND json_extract(data, '$.leadId') = ?)")
      .bind(contractId, leadId ?? '', leadId ?? '')
      .all<{ data: string }>();

    return (results ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  // ── 交付项目域 ──
  async getProjects(): Promise<DbRecord[]> {
    const { results } = await this.db
      .prepare('SELECT id, data, version, updated_at FROM projects ORDER BY updated_at DESC')
      .all<{ id: string; data: string; version: number; updated_at?: string }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      data: parseJsonData(r.data),
      version: r.version ?? 0,
      updatedAt: r.updated_at,
    }));
  }

  async getProject(id: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare('SELECT id, data, version, updated_at FROM projects WHERE id = ?')
      .bind(id)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async getProjectByLeadId(leadId: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare("SELECT id, data, version, updated_at FROM projects WHERE json_extract(data, '$.leadId') = ?")
      .bind(leadId)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async upsertProject(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    await this.db
      .prepare('INSERT OR REPLACE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
  }

  async insertProjectIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    await this.db
      .prepare('INSERT OR IGNORE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
    return true;
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  }

  // ── 业务单/商机域 ──
  async getCases(): Promise<DbRecord[]> {
    const { results } = await this.db
      .prepare('SELECT id, data, version, updated_at FROM cases ORDER BY updated_at DESC')
      .all<{ id: string; data: string; version: number; updated_at?: string }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      data: parseJsonData(r.data),
      version: r.version ?? 0,
      updatedAt: r.updated_at,
    }));
  }

  async getCase(id: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare('SELECT id, data, version, updated_at FROM cases WHERE id = ?')
      .bind(id)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async getCaseByLeadId(leadId: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare("SELECT id, data, version, updated_at FROM cases WHERE json_extract(data, '$.leadId') = ?")
      .bind(leadId)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async upsertCase(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    await this.db
      .prepare('INSERT OR REPLACE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
  }

  async insertCaseIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    await this.db
      .prepare('INSERT OR IGNORE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
    return true;
  }

  // ── 回款实收台账域 ──
  async getCollections(contractId?: string): Promise<{ data: Record<string, unknown> }[]> {
    const query = contractId
      ? this.db.prepare("SELECT data FROM collections WHERE json_extract(data, '$.contractId') = ? ORDER BY updated_at DESC").bind(contractId)
      : this.db.prepare('SELECT data FROM collections ORDER BY updated_at DESC');

    const { results } = await query.all<{ data: string }>();
    return (results ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async getCollectionsForProject(projectId: string, contractIds: string[]): Promise<{ data: Record<string, unknown> }[]> {
    const { results } = await this.db
      .prepare("SELECT data FROM collections WHERE json_extract(data, '$.projectId') = ? OR json_extract(data, '$.contractId') IN (SELECT value FROM json_each(?))")
      .bind(projectId, JSON.stringify(contractIds))
      .all<{ data: string }>();

    return (results ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async insertCollectionIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    await this.db
      .prepare('INSERT OR IGNORE INTO collections (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
    return true;
  }

  // ── 线索域 ──
  async getLeads(): Promise<DbRecord[]> {
    const { results } = await this.db
      .prepare('SELECT id, data, version, updated_at FROM leads ORDER BY updated_at DESC')
      .all<{ id: string; data: string; version: number; updated_at?: string }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      data: parseJsonData(r.data),
      version: r.version ?? 0,
      updatedAt: r.updated_at,
    }));
  }

  async getLead(id: string): Promise<DbRecord | null> {
    const stripped = id.replace(/^(public|assigned|trash|hightech)-/, '');
    const alt = id.startsWith('L-') ? id.slice(2) : `L-${id}`;
    const altStripped = `L-${stripped}`;
    const row = await this.db
      .prepare('SELECT id, data, version, updated_at FROM leads WHERE id IN (?, ?, ?, ?) OR json_extract(data, "$.key") = ? OR json_extract(data, "$.id") = ? LIMIT 1')
      .bind(id, alt, stripped, altStripped, id, id)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }

  async upsertLead(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    await this.db
      .prepare('INSERT OR REPLACE INTO leads (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(id, JSON.stringify(data), updatedAt, version)
      .run();
  }

  async deleteLead(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  }

  async getLeadFollowups(leadId: string): Promise<{ data: Record<string, unknown> }[]> {
    const lead = await this.getLead(leadId);
    const realId = lead ? lead.id : leadId;
    const { results } = await this.db
      .prepare('SELECT data FROM lead_followups WHERE lead_id IN (?, ?) ORDER BY updated_at DESC')
      .bind(realId, leadId)
      .all<{ data: string }>();

    return (results ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async saveLeadFollowupAndLead(
    followup: { id: string; leadId: string; data: Record<string, unknown> },
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
  ): Promise<void> {
    await this.db.batch([
      this.db
        .prepare('INSERT OR REPLACE INTO lead_followups (id, lead_id, data, updated_at) VALUES (?, ?, ?, ?)')
        .bind(followup.id, followup.leadId, JSON.stringify(followup.data), updatedAt),
      this.db
        .prepare('INSERT OR REPLACE INTO leads (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(followup.leadId, JSON.stringify(updatedLead), updatedAt, nextVersion),
    ]);
  }

  async getLeadTransfers(leadId: string): Promise<{ data: Record<string, unknown> }[]> {
    const lead = await this.getLead(leadId);
    const realId = lead ? lead.id : leadId;
    const { results } = await this.db
      .prepare('SELECT data FROM lead_transfers WHERE lead_id IN (?, ?) ORDER BY updated_at DESC')
      .bind(realId, leadId)
      .all<{ data: string }>();

    return (results ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async saveLeadActionAndTransfer(
    id: string,
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
    transfer?: { id: string; leadId: string; data: Record<string, unknown> } | null,
  ): Promise<void> {
    const statements = [
      this.db
        .prepare('INSERT OR REPLACE INTO leads (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(id, JSON.stringify(updatedLead), updatedAt, nextVersion),
    ];
    if (transfer) {
      statements.push(
        this.db
          .prepare('INSERT OR REPLACE INTO lead_transfers (id, lead_id, data, updated_at) VALUES (?, ?, ?, ?)')
          .bind(transfer.id, transfer.leadId, JSON.stringify(transfer.data), updatedAt),
      );
    }
    await this.db.batch(statements);
  }

  // ── 员工域 ──
  async getEmployees(): Promise<DbRecord[]> {
    const { results } = await this.db
      .prepare('SELECT id, data, version, updated_at FROM employees ORDER BY updated_at DESC')
      .all<{ id: string; data: string; version: number; updated_at?: string }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      data: parseJsonData(r.data),
      version: r.version ?? 0,
      updatedAt: r.updated_at,
    }));
  }

  async getEmployee(id: string): Promise<DbRecord | null> {
    const row = await this.db
      .prepare('SELECT id, data, version, updated_at FROM employees WHERE id = ?')
      .bind(id)
      .first<{ id: string; data: string; version: number; updated_at?: string }>();

    if (!row) return null;
    return {
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    };
  }
}
