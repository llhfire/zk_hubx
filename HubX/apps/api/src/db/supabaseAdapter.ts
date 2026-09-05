import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseAdapter implements DatabaseAdapter {
  readonly engine = 'supabase' as const;
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // ── 报价域 ──
  async getQuotes(): Promise<DbRecord[]> {
    const { data, error } = await this.client
      .from('quotes')
      .select('id, data, version, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getQuotes] ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    }));
  }

  async getQuote(id: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('quotes')
      .select('id, data, version, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getQuote] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }

  async upsertQuote(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    const { error } = await this.client.from('quotes').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`[Supabase upsertQuote] ${error.message}`);
  }

  async ensureSeedQuote(quote: Record<string, unknown>): Promise<void> {
    const quoteId = (quote.id as string) || 'q-seed-1';
    const { error } = await this.client.from('quotes').upsert(
      {
        id: quoteId,
        data: quote,
        version: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new Error(`[Supabase ensureSeedQuote] ${error.message}`);
  }

  async deleteQuote(id: string): Promise<void> {
    const { error } = await this.client.from('quotes').delete().eq('id', id);
    if (error) throw new Error(`[Supabase deleteQuote] ${error.message}`);
  }

  // ── 合同域 ──
  async getContracts(): Promise<DbRecord[]> {
    const { data, error } = await this.client
      .from('contracts')
      .select('id, data, version, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getContracts] ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    }));
  }

  async getContract(id: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('contracts')
      .select('id, data, version, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getContract] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }

  async upsertContract(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    const { error } = await this.client.from('contracts').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`[Supabase upsertContract] ${error.message}`);
  }

  async deleteContract(id: string): Promise<void> {
    const { error } = await this.client.from('contracts').delete().eq('id', id);
    if (error) throw new Error(`[Supabase deleteContract] ${error.message}`);
  }

  async getContractsForProject(contractId: string, leadId?: string): Promise<{ data: Record<string, unknown> }[]> {
    let query = this.client.from('contracts').select('data');
    if (leadId) {
      query = query.or(`id.eq.${contractId},data->>leadId.eq.${leadId}`);
    } else {
      query = query.eq('id', contractId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`[Supabase getContractsForProject] ${error.message}`);
    return (data ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  // ── 交付项目域 ──
  async getProjects(): Promise<DbRecord[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('id, data, version, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getProjects] ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    }));
  }

  async getProject(id: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('id, data, version, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getProject] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }

  async getProjectByLeadId(leadId: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('id, data, version, updated_at')
      .filter('data->>leadId', 'eq', leadId)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getProjectByLeadId] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }

  async upsertProject(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    const { error } = await this.client.from('projects').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`[Supabase upsertProject] ${error.message}`);
  }

  async insertProjectIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    const { error } = await this.client.from('projects').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new Error(`[Supabase insertProjectIfMissing] ${error.message}`);
    return true;
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.client.from('projects').delete().eq('id', id);
    if (error) throw new Error(`[Supabase deleteProject] ${error.message}`);
  }

  // ── 业务单/商机域 ──
  async getCases(): Promise<DbRecord[]> {
    const { data, error } = await this.client
      .from('cases')
      .select('id, data, version, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getCases] ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    }));
  }

  async getCase(id: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('cases')
      .select('id, data, version, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getCase] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }

  async getCaseByLeadId(leadId: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('cases')
      .select('id, data, version, updated_at')
      .filter('data->>leadId', 'eq', leadId)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getCaseByLeadId] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }

  async upsertCase(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    const { error } = await this.client.from('cases').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`[Supabase upsertCase] ${error.message}`);
  }

  async insertCaseIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    const { error } = await this.client.from('cases').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new Error(`[Supabase insertCaseIfMissing] ${error.message}`);
    return true;
  }

  // ── 回款实收台账域 ──
  async getCollections(contractId?: string): Promise<{ data: Record<string, unknown> }[]> {
    let query = this.client
      .from('collections')
      .select('data')
      .order('updated_at', { ascending: false });

    if (contractId) {
      query = query.filter('data->>contractId', 'eq', contractId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`[Supabase getCollections] ${error.message}`);
    return (data ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async getCollectionsForProject(projectId: string, contractIds: string[]): Promise<{ data: Record<string, unknown> }[]> {
    let query = this.client.from('collections').select('data');
    if (contractIds.length > 0) {
      const contractFilter = contractIds.map((cid) => `data->>contractId.eq.${cid}`).join(',');
      query = query.or(`data->>projectId.eq.${projectId},${contractFilter}`);
    } else {
      query = query.filter('data->>projectId', 'eq', projectId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`[Supabase getCollectionsForProject] ${error.message}`);
    return (data ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async insertCollectionIfMissing(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<boolean> {
    const { error } = await this.client.from('collections').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new Error(`[Supabase insertCollectionIfMissing] ${error.message}`);
    return true;
  }

  // ── 线索域 ──
  async getLeads(): Promise<DbRecord[]> {
    const { data, error } = await this.client
      .from('leads')
      .select('id, data, version, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getLeads] ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    }));
  }

  async getLead(id: string): Promise<DbRecord | null> {
    // 1. 精确主键匹配
    const { data, error } = await this.client
      .from('leads')
      .select('id, data, version, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getLead] ${error.message}`);
    if (data) {
      return {
        id: data.id,
        data: parseJsonData(data.data),
        version: data.version ?? 0,
        updatedAt: data.updated_at,
      };
    }

    // 2. 候选 ID 集合兼容多种命名惯例 (5942 <-> L-5942 <-> public-5942)
    const stripped = id.replace(/^(public|assigned|trash|hightech)-/, '');
    const candidates = [
      id.startsWith('L-') ? id.slice(2) : `L-${id}`,
      stripped,
      `L-${stripped}`,
    ].filter((cand) => cand && cand !== id);

    for (const cand of candidates) {
      const { data: candData } = await this.client
        .from('leads')
        .select('id, data, version, updated_at')
        .eq('id', cand)
        .maybeSingle();
      if (candData) {
        return {
          id: candData.id,
          data: parseJsonData(candData.data),
          version: candData.version ?? 0,
          updatedAt: candData.updated_at,
        };
      }
    }

    // 3. 按 JSON 内 key 或 id 兜底匹配
    const { data: byKey } = await this.client
      .from('leads')
      .select('id, data, version, updated_at')
      .filter('data->>key', 'eq', id)
      .maybeSingle();

    if (byKey) {
      return {
        id: byKey.id,
        data: parseJsonData(byKey.data),
        version: byKey.version ?? 0,
        updatedAt: byKey.updated_at,
      };
    }

    return null;
  }

  async upsertLead(id: string, data: Record<string, unknown>, version: number, updatedAt: string): Promise<void> {
    const { error } = await this.client.from('leads').upsert(
      { id, data, version, updated_at: updatedAt },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`[Supabase upsertLead] ${error.message}`);
  }

  async deleteLead(id: string): Promise<void> {
    const { error } = await this.client.from('leads').delete().eq('id', id);
    if (error) throw new Error(`[Supabase deleteLead] ${error.message}`);
  }

  async getLeadFollowups(leadId: string): Promise<{ data: Record<string, unknown> }[]> {
    const lead = await this.getLead(leadId);
    const realId = lead ? lead.id : leadId;
    const { data, error } = await this.client
      .from('lead_followups')
      .select('data')
      .or(`lead_id.eq."${realId}",lead_id.eq."${leadId}"`)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getLeadFollowups] ${error.message}`);
    return (data ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async saveLeadFollowupAndLead(
    followup: { id: string; leadId: string; data: Record<string, unknown> },
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
  ): Promise<void> {
    const [err1, err2] = await Promise.all([
      this.client.from('lead_followups').upsert(
        { id: followup.id, lead_id: followup.leadId, data: followup.data, updated_at: updatedAt },
        { onConflict: 'id' },
      ),
      this.client.from('leads').upsert(
        { id: followup.leadId, data: updatedLead, version: nextVersion, updated_at: updatedAt },
        { onConflict: 'id' },
      ),
    ]);
    if (err1.error) throw new Error(`[Supabase saveLeadFollowup] ${err1.error.message}`);
    if (err2.error) throw new Error(`[Supabase updateLeadWithFollowup] ${err2.error.message}`);
  }

  async getLeadTransfers(leadId: string): Promise<{ data: Record<string, unknown> }[]> {
    const lead = await this.getLead(leadId);
    const realId = lead ? lead.id : leadId;
    const { data, error } = await this.client
      .from('lead_transfers')
      .select('data')
      .or(`lead_id.eq."${realId}",lead_id.eq."${leadId}"`)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getLeadTransfers] ${error.message}`);
    return (data ?? []).map((r) => ({ data: parseJsonData(r.data) }));
  }

  async saveLeadActionAndTransfer(
    id: string,
    updatedLead: Record<string, unknown>,
    nextVersion: number,
    updatedAt: string,
    transfer?: { id: string; leadId: string; data: Record<string, unknown> } | null,
  ): Promise<void> {
    const tasks: Promise<{ error: unknown }>[] = [
      this.client.from('leads').upsert(
        { id, data: updatedLead, version: nextVersion, updated_at: updatedAt },
        { onConflict: 'id' },
      ),
    ];
    if (transfer) {
      tasks.push(
        this.client.from('lead_transfers').upsert(
          { id: transfer.id, lead_id: transfer.leadId, data: transfer.data, updated_at: updatedAt },
          { onConflict: 'id' },
        ),
      );
    }
    const results = await Promise.all(tasks);
    for (const res of results) {
      if (res.error) {
        throw new Error(`[Supabase saveLeadActionAndTransfer] ${(res.error as { message?: string }).message || String(res.error)}`);
      }
    }
  }

  // ── 员工域 ──
  async getEmployees(): Promise<DbRecord[]> {
    const { data, error } = await this.client
      .from('employees')
      .select('id, data, version, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[Supabase getEmployees] ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      data: parseJsonData(row.data),
      version: row.version ?? 0,
      updatedAt: row.updated_at,
    }));
  }

  async getEmployee(id: string): Promise<DbRecord | null> {
    const { data, error } = await this.client
      .from('employees')
      .select('id, data, version, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`[Supabase getEmployee] ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      data: parseJsonData(data.data),
      version: data.version ?? 0,
      updatedAt: data.updated_at,
    };
  }
}
