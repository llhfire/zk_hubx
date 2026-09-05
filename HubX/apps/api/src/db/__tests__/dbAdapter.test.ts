import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDbAdapter, MemoryAdapter, D1Adapter, SupabaseAdapter } from '../index';

describe('Database Adapter Layer (Supabase / D1 / Memory)', () => {
  it('优先根据 SUPABASE_URL 和 SUPABASE_KEY 返回 SupabaseAdapter', () => {
    const adapter = getDbAdapter({
      SUPABASE_URL: 'https://xyzcompany.supabase.co',
      SUPABASE_KEY: 'test-supabase-key',
    });
    expect(adapter).toBeInstanceOf(SupabaseAdapter);
    expect(adapter.engine).toBe('supabase');
  });

  it('支持 SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_ANON_KEY 作为凭证', () => {
    const adapter1 = getDbAdapter({
      SUPABASE_URL: 'https://xyzcompany.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key',
    });
    expect(adapter1).toBeInstanceOf(SupabaseAdapter);

    const adapter2 = getDbAdapter({
      SUPABASE_URL: 'https://xyzcompany.supabase.co',
      SUPABASE_ANON_KEY: 'anon-public-key',
    });
    expect(adapter2).toBeInstanceOf(SupabaseAdapter);
  });

  it('未配置 Supabase 时回退到 D1Adapter', () => {
    const mockD1 = {
      prepare: vi.fn(),
      batch: vi.fn(),
    } as unknown as D1Database;

    const adapter = getDbAdapter({ DB: mockD1 });
    expect(adapter).toBeInstanceOf(D1Adapter);
    expect(adapter.engine).toBe('d1');
  });

  it('两方均未配置时平滑回退到 MemoryAdapter', () => {
    const adapter = getDbAdapter({});
    expect(adapter).toBeInstanceOf(MemoryAdapter);
    expect(adapter.engine).toBe('memory');
  });
});

describe('MemoryAdapter 功能完整性', () => {
  let mem: MemoryAdapter;

  beforeEach(() => {
    mem = new MemoryAdapter();
  });

  it('报价域：支持 ensureSeedQuote, getQuotes, getQuote, upsertQuote, deleteQuote', async () => {
    await mem.ensureSeedQuote({ id: 'q-seed-1', title: '测试种子' });
    let quotes = await mem.getQuotes();
    expect(quotes.length).toBe(1);
    expect(quotes[0].id).toBe('q-seed-1');

    await mem.upsertQuote('q-2', { title: '自定义报价' }, 1, '2026-09-05 12:00');
    quotes = await mem.getQuotes();
    expect(quotes.length).toBe(2);

    const q2 = await mem.getQuote('q-2');
    expect(q2?.data.title).toBe('自定义报价');
    expect(q2?.version).toBe(1);

    await mem.deleteQuote('q-2');
    expect(await mem.getQuote('q-2')).toBeNull();
  });

  it('合同域与项目域：支持签约联动相关写入与查询', async () => {
    await mem.upsertContract('ct-1', { customerName: '客户A', leadId: 'lead-1' }, 1, '2026-09-05 12:00');
    const ct = await mem.getContract('ct-1');
    expect(ct?.data.customerName).toBe('客户A');

    const contracts = await mem.getContractsForProject('ct-1', 'lead-1');
    expect(contracts.length).toBe(1);

    await mem.insertProjectIfMissing('p-1', { name: '项目1', leadId: 'lead-1' }, 0, '2026-09-05 12:00');
    const p = await mem.getProjectByLeadId('lead-1');
    expect(p?.id).toBe('p-1');

    await mem.insertCaseIfMissing('case-1', { leadId: 'lead-1' }, 0, '2026-09-05 12:00');
    const c = await mem.getCaseByLeadId('lead-1');
    expect(c?.id).toBe('case-1');
  });

  it('线索域与跟进流转：支持原子联动', async () => {
    await mem.upsertLead('L-100', { name: '线索A', clueType: 'public', status: '未联系' }, 0, '2026-09-05 12:00');
    let lead = await mem.getLead('L-100');
    expect(lead?.data.name).toBe('线索A');

    await mem.saveLeadFollowupAndLead(
      { id: 'fu-1', leadId: 'L-100', data: { content: '初次电联' } },
      { name: '线索A', clueType: 'assigned', status: '跟进中' },
      1,
      '2026-09-05 12:30',
    );

    lead = await mem.getLead('L-100');
    expect(lead?.version).toBe(1);
    expect(lead?.data.status).toBe('跟进中');

    const followups = await mem.getLeadFollowups('L-100');
    expect(followups.length).toBe(1);
    expect(followups[0].data.content).toBe('初次电联');

    // 兼容多种 ID 格式（如 '100' 解析到 'L-100'）
    const leadByNumber = await mem.getLead('100');
    expect(leadByNumber?.id).toBe('L-100');
    const followupsByNumber = await mem.getLeadFollowups('100');
    expect(followupsByNumber.length).toBe(1);
  });
});
