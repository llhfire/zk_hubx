// ZK HubX β版后端（Cloudflare Workers + Hono + D1）。
// 报价数据存 D1（SQLite），data 列存整条 Quote 的 JSON。与前端 QuotationService 的 list/upsert 对应。

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// B3 签约联动（ADR-0093）：单源导入 packages/ui 纯函数，禁止复制
import { diffContractEvents, prevSnapshotForWrite, shouldEnsureUnconfirmedProject } from '../../../packages/ui/src/app/pages/contracts/signingOpenEvents';
import {
  spawnUnconfirmedProject,
  buildUnconfirmedProject,
  startDelivery,
  shelveProject,
} from '../../../packages/ui/src/app/business-case/caseUtils';
import { validateProjectStatusWrite } from '../../../packages/ui/src/services/projectMutations';
import { buildCollectionRecord } from '../../../packages/ui/src/services/collectionMutations';

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// 本地联调：β前端 → 后端 跨域，放开 CORS（生产可收紧为具体域名）
app.use('*', cors());

// 示例种子报价（懒写入，INSERT OR IGNORE 幂等）
function seedQuote() {
  return {
    id: 'q-seed-1',
    quoteNo: 'QT-2026-1',
    version: 'v1.0',
    status: 'draft',
    leadId: 'lead-1',
    basicInfo: {
      projectName: '示例报价项目',
      projectType: '企业展示',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: '',
      customerName: '示例客户',
      customerContact: '',
      customerPhone: '',
      quoteValidityDays: 30,
    },
    featureList: [],
    endpointConfigs: [
      { id: 'ep-1', name: '用户端', platforms: ['wechat'] },
      { id: 'ep-2', name: '管理后台', platforms: ['pcweb'] },
    ],
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [],
    auditNodes: [
      { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
      { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
      { auditorId: 'min', auditorName: '闵总', role: '企业决策层', status: 'PENDING' },
    ],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: [],
    salesOwnerName: '张三',
    ccSalesNames: ['张三'],
    createdAt: '2026-08-16 10:00',
    updatedAt: '2026-08-16 10:00',
  };
}

async function ensureSeed(db: D1Database) {
  await db
    .prepare('INSERT OR IGNORE INTO quotes (id, data, updated_at) VALUES (?, ?, ?)')
    .bind('q-seed-1', JSON.stringify(seedQuote()), new Date().toISOString())
    .run();
}

// 报价状态机「合法迁移」表（与前端 quotationMutations TRANSITIONS 对齐，服务端校验用）。
// 终态（confirmed / voided）不再迁移。
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_eval'],
  pending_eval: ['pending_quote'],
  pending_quote: ['pending_eval', 'auditing'],
  rejected: ['pending_quote', 'draft'],
  auditing: ['pending_quote', 'rejected', 'pending_stamp'],
  pending_stamp: ['stamped'],
  stamped: ['sent', 'pending_stamp'],
  sent: ['confirmed', 'stamped'],
  confirmed: [],
  voided: [],
};

function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true; // 字段更新不改状态
  if (to === 'voided') return true; // 任意非终态可作废
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// 读时迁移：旧词表 → 新词表（与 packages/ui quotationMutations.migrateQuote 对齐）
const API_STATUS_MAP: Record<string, string> = {
  feature_confirmed: 'pending_eval',
  eval_completed: 'pending_quote',
  assigned_sales: 'pending_quote',
  quote_summarized: 'pending_quote',
  deal: 'confirmed',
  pending_followup: 'sent',
};

function migrateQuoteApi(q: Record<string, unknown>): Record<string, unknown> {
  const mapped = API_STATUS_MAP[q.status as string];
  if (!mapped) return q;
  return { ...q, status: mapped };
}

// 读路径注入乐观锁 version（ADR-0094）：前端 GET -> 改 -> PUT 全程携带，服务端比对
function withVersion<T extends object>(doc: T, version: number): T & { version: number } {
  return { ...doc, version };
}

// 服务端时钟（ADR-0094）：updatedAt 一律服务端生成，客户端时间只作展示参考。
// 格式与前端 now()/nowString() 对齐（'YYYY-MM-DD HH:mm'）；按北京时间输出。
function domainNow(): string {
  const d = new Date(Date.now() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

app.get('/', (c) => c.json({ ok: true, service: 'zkhubx-api' }));

app.get('/api/quotes', async (c) => {
  await ensureSeed(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT data, version FROM quotes ORDER BY updated_at DESC').all<{ data: string; version: number }>();
  return c.json({ quotes: results.map((r) => withVersion(migrateQuoteApi(JSON.parse(r.data)), r.version ?? 0)) });
});

app.get('/api/quotes/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT data, version FROM quotes WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ data: string; version: number }>();
  return row ? c.json({ quote: withVersion(migrateQuoteApi(JSON.parse(row.data)), row.version ?? 0) }) : c.json({ error: 'not found' }, 404);
});

app.put('/api/quotes/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { status?: string; version?: number };
  const actor = c.req.header('X-Actor') ?? '';

  const old = await c.env.DB
    .prepare('SELECT data, version FROM quotes WHERE id = ?')
    .bind(id)
    .first<{ data: string; version: number }>();
  const currentVersion = old?.version ?? 0;

  // 乐观锁（ADR-0094）：请求携带的 version 与库内不一致 -> 409，客户端提示刷新重试
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }

  // 服务端校验状态迁移：读旧状态，比对新状态是否合法（防止"胖客户端"跳过步骤）
  if (old) {
    const oldStatus = (JSON.parse(old.data) as { status?: string }).status;
    const newStatus = body.status;
    if (oldStatus && newStatus && !isValidTransition(oldStatus, newStatus)) {
      return c.json({ error: `非法状态迁移：${oldStatus} -> ${newStatus}` }, 400);
    }
  }

  // version 是传输层并发令牌，不落进 data；updatedAt 由服务端时钟覆盖
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await c.env.DB
    .prepare('INSERT OR REPLACE INTO quotes (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify({ ...data, updatedAt: serverUpdatedAt }), new Date().toISOString(), currentVersion + 1)
    .run();
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt, actor });
});

app.delete('/api/quotes/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM quotes WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ── 合同（与报价同模式，存 D1 contracts 表）────────────────
app.get('/api/contracts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT data, version FROM contracts ORDER BY updated_at DESC').all<{ data: string; version: number }>();
  return c.json({ contracts: results.map((r) => withVersion(JSON.parse(r.data), r.version ?? 0)) });
});

app.get('/api/contracts/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT data, version FROM contracts WHERE id = ?').bind(c.req.param('id')).first<{ data: string; version: number }>();
  return row ? c.json({ contract: withVersion(JSON.parse(row.data), row.version ?? 0) }) : c.json({ error: 'not found' }, 404);
});

app.put('/api/contracts/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const actor = c.req.header('X-Actor') ?? '';

  // 读旧文档（含 data）：乐观锁 + 联动 diff 都需要
  const old = await c.env.DB.prepare('SELECT data, version FROM contracts WHERE id = ?').bind(id).first<{ data: string; version: number }>();
  const currentVersion = old?.version ?? 0;

  // 乐观锁（ADR-0094）：与报价同规则
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }

  // version 不落进 data；updatedAt 由服务端时钟覆盖
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await c.env.DB
    .prepare('INSERT OR REPLACE INTO contracts (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify({ ...data, updatedAt: serverUpdatedAt }), new Date().toISOString(), currentVersion + 1)
    .run();

  // B3 签约联动（ADR-0093）：合同写入后检测事件，在同一请求内完成 spawn / startDelivery / shelve
  // 洞 C 修复：首次 INSERT 也执行联动（使用 prevSnapshotForWrite）
  const oldDoc = old ? (JSON.parse(old.data) as Record<string, unknown>) : null;
  const prevSnapshot = prevSnapshotForWrite(id, oldDoc ? { approvedAt: oldDoc.approvedAt as string | undefined, status: oldDoc.status as string | undefined } : null);
  const nextContract = { id, ...data } as import('../../../packages/ui/src/app/pages/contracts/types').Contract;
  const events = diffContractEvents(prevSnapshot, [nextContract]);

  if (events.created.length > 0 || events.approved.length > 0 || events.voided.length > 0) {
    await handleSigningLinkage(c.env.DB, events as unknown as { created: ContractLike[]; approved: ContractLike[]; voided: ContractLike[] }, serverUpdatedAt);
  }

  // 洞 C ③：草稿/未批准且非作废，该 lead 还没有项目 → 再 spawn（INSERT OR IGNORE，幂等）
  await ensureUnconfirmedProjectIfMissing(c.env.DB, nextContract as ContractLike, serverUpdatedAt);

  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt, actor });
});

app.delete('/api/contracts/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM contracts WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ── B3 签约联动（ADR-0093）：合同事件 → 项目/商机/交付 ──

type ContractLike = Record<string, unknown>;

/** 合同写入后，在同一请求内完成 spawn / startDelivery / shelve（原子性） */
async function handleSigningLinkage(db: D1Database, events: { created: ContractLike[]; approved: ContractLike[]; voided: ContractLike[] }, today: string) {
  // 合同新建 → spawn 未确认项目
  for (const contract of events.created) {
    const leadId = contract.leadId as string | undefined;
    if (!leadId) continue;
    const contractId = contract.id as string;

    // 检查是否已有项目
    const existing = await db.prepare('SELECT id FROM projects WHERE json_extract(data, \'$.leadId\') = ?').bind(leadId).first();
    if (existing) continue; // 已有项目不重复 spawn

    const projectId = 'ap-' + contractId;
    const { project, case: bizCase } = spawnUnconfirmedProject({
      caseId: 'case-' + leadId,
      leadId,
      projectId,
    });
    const fullProject = buildUnconfirmedProject({
      lead: { id: leadId, name: contract.customerName as string | undefined },
      contract: { id: contractId, current: { customerName: contract.customerName as string | undefined, signingEntity: contract.signingEntity as string | undefined } },
      projectId,
      today,
    });
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(projectId, JSON.stringify(fullProject), new Date().toISOString(), 0),
      db.prepare('INSERT OR IGNORE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(bizCase.id, JSON.stringify({ ...bizCase, contractId }), new Date().toISOString(), 0),
    ]);
  }

  // 合同批准 → startDelivery + 关联商机
  for (const contract of events.approved) {
    const leadId = contract.leadId as string | undefined;
    if (!leadId) continue;
    const contractId = contract.id as string;

    const projectRow = await db.prepare('SELECT data, version FROM projects WHERE json_extract(data, \'$.leadId\') = ?').bind(leadId).first<{ data: string; version: number }>();
    if (!projectRow) continue; // ADR-0067：批准时无项目不兜底 spawn

    const project = JSON.parse(projectRow.data) as Record<string, unknown>;
    const patch = startDelivery({
      project: { status: project.status as string, contractId: project.contractId as string | undefined },
      contractId,
      today,
    });

    if (patch) {
      const updatedProject = { ...project, ...patch, updatedAt: today };
      await db.prepare('INSERT OR REPLACE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(project.id as string, JSON.stringify(updatedProject), new Date().toISOString(), (projectRow.version ?? 0) + 1)
        .run();
    }

    // 补全商机关联
    const caseRow = await db.prepare('SELECT data, version FROM cases WHERE json_extract(data, \'$.leadId\') = ?').bind(leadId).first<{ data: string; version: number }>();
    if (caseRow) {
      const bizCase = JSON.parse(caseRow.data) as Record<string, unknown>;
      const updatedCase = { ...bizCase, projectId: bizCase.projectId ?? project.id, contractId: bizCase.contractId ?? contractId, updatedAt: today };
      await db.prepare('INSERT OR REPLACE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(bizCase.id as string, JSON.stringify(updatedCase), new Date().toISOString(), (caseRow.version ?? 0) + 1)
        .run();
    } else {
      const newCase = { id: 'case-' + leadId, leadId, projectId: project.id, contractId, extraContractIds: [], quoteIds: [], updatedAt: today };
      await db.prepare('INSERT OR IGNORE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(newCase.id, JSON.stringify(newCase), new Date().toISOString(), 0)
        .run();
    }
  }

  // 合同作废 → 项目搁置
  for (const contract of events.voided) {
    const leadId = contract.leadId as string | undefined;
    if (!leadId) continue;
    const contractId = contract.id as string;

    const projectRow = await db.prepare('SELECT data, version FROM projects WHERE json_extract(data, \'$.leadId\') = ?').bind(leadId).first<{ data: string; version: number }>();
    if (!projectRow) continue;

    const project = JSON.parse(projectRow.data) as Record<string, unknown>;
    const shelvePatch = shelveProject({
      project: { status: project.status as string, contractId: project.contractId as string | undefined },
      contractId,
      reason: '主合同作废',
    });
    if (shelvePatch) {
      const updatedProject = { ...project, ...shelvePatch, updatedAt: today };
      await db.prepare('INSERT OR REPLACE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
        .bind(project.id as string, JSON.stringify(updatedProject), new Date().toISOString(), (projectRow.version ?? 0) + 1)
        .run();
    }
  }
}

/**
 * 洞 C ③：草稿/未批准且非作废，该 lead 还没有项目 → 再 spawn（INSERT OR IGNORE，幂等）
 * 解决首次 INSERT 跳过联动、或联动失败后无法补救的问题
 */
async function ensureUnconfirmedProjectIfMissing(db: D1Database, contract: ContractLike, today: string) {
  if (!shouldEnsureUnconfirmedProject(
    { approvedAt: contract.approvedAt as string | undefined, status: contract.status as string | undefined, leadId: contract.leadId as string | undefined },
    false, // hasProjectForLead 会在下面查询
  )) {
    return;
  }

  const leadId = contract.leadId as string;
  const contractId = contract.id as string;

  // 检查是否已有项目
  const existing = await db.prepare('SELECT id FROM projects WHERE json_extract(data, \'$.leadId\') = ?').bind(leadId).first();
  if (existing) return; // 已有项目不重复 spawn

  const projectId = 'ap-' + contractId;
  const { project, case: bizCase } = spawnUnconfirmedProject({
    caseId: 'case-' + leadId,
    leadId,
    projectId,
  });

  // 从 contract.current 读取展示字段（洞 C 修复：读 current 而非顶层）
  const cur = (contract.current && typeof contract.current === 'object')
    ? (contract.current as { customerName?: string; signingEntity?: string })
    : {};
  const customerName = cur.customerName ?? (contract.customerName as string | undefined);
  const signingEntity = cur.signingEntity ?? (contract.signingEntity as string | undefined);

  const fullProject = buildUnconfirmedProject({
    lead: { id: leadId, name: customerName },
    contract: { id: contractId, current: { customerName, signingEntity } },
    projectId,
    today,
  });

  await db.batch([
    db.prepare('INSERT OR IGNORE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(projectId, JSON.stringify(fullProject), new Date().toISOString(), 0),
    db.prepare('INSERT OR IGNORE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(bizCase.id, JSON.stringify({ ...bizCase, contractId }), new Date().toISOString(), 0),
  ]);
}

// ── 项目域 CRUD（B3/B4，文档式）──

app.get('/api/projects', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT data, version FROM projects ORDER BY updated_at DESC').all<{ data: string; version: number }>();
  return c.json({ projects: results.map((r) => withVersion(JSON.parse(r.data), r.version ?? 0)) });
});

app.get('/api/projects/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT data, version FROM projects WHERE id = ?').bind(c.req.param('id')).first<{ data: string; version: number }>();
  return row ? c.json({ project: withVersion(JSON.parse(row.data), row.version ?? 0) }) : c.json({ error: 'not found' }, 404);
});

app.post('/api/projects', async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>;
  const id = (typeof body.id === 'string' && body.id) ? body.id : `p-${Date.now()}`;
  const existing = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first();
  if (existing) return c.json({ id });
  const serverUpdatedAt = domainNow();
  const doc = { ...body, id, createdAt: body.createdAt ?? serverUpdatedAt, updatedAt: serverUpdatedAt };
  await c.env.DB.prepare('INSERT OR IGNORE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify(doc), new Date().toISOString(), 0)
    .run();
  return c.json({ id });
});

app.put('/api/projects/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const old = await c.env.DB.prepare('SELECT data, version FROM projects WHERE id = ?').bind(id).first<{ data: string; version: number }>();
  const currentVersion = old?.version ?? 0;
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }
  if (old) {
    const oldDoc = JSON.parse(old.data) as Record<string, unknown>;
    const statusErr = validateProjectStatusWrite(
      String(oldDoc.status ?? ''),
      String(body.status ?? oldDoc.status ?? ''),
      typeof body.owner === 'string' ? body.owner : undefined,
    );
    if (statusErr) return c.json({ error: statusErr }, 400);
  }
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await c.env.DB.prepare('INSERT OR REPLACE INTO projects (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify({ ...data, updatedAt: serverUpdatedAt }), new Date().toISOString(), currentVersion + 1)
    .run();
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt });
});

app.delete('/api/projects/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ── 回款实收台账（B4，append-only 文档行）──

app.get('/api/collections', async (c) => {
  const contractId = c.req.query('contractId');
  const { results } = contractId
    ? await c.env.DB.prepare('SELECT data FROM collections WHERE json_extract(data, \'$.contractId\') = ? ORDER BY updated_at DESC').bind(contractId).all<{ data: string }>()
    : await c.env.DB.prepare('SELECT data FROM collections ORDER BY updated_at DESC').all<{ data: string }>();
  return c.json({ collections: (results ?? []).map((r) => JSON.parse(r.data)) });
});

app.post('/api/collections', async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>;
  try {
    const rec = buildCollectionRecord({
      id: typeof body.id === 'string' ? body.id : undefined,
      contractId: String(body.contractId ?? ''),
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      period: body.period as number | 'other' | undefined,
      amount: Number(body.amount),
      date: String(body.date ?? ''),
      method: String(body.method ?? '银行汇款'),
      note: String(body.note ?? ''),
    });
    const serverUpdatedAt = domainNow();
    await c.env.DB.prepare('INSERT OR IGNORE INTO collections (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
      .bind(rec.id, JSON.stringify({ ...rec, updatedAt: serverUpdatedAt }), new Date().toISOString(), 0)
      .run();
    return c.json({ id: rec.id });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : '登记实收失败' }, 400);
  }
});

// ── 商机域 CRUD ──

app.get('/api/cases', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT data, version FROM cases ORDER BY updated_at DESC').all<{ data: string; version: number }>();
  return c.json({ cases: results.map((r) => withVersion(JSON.parse(r.data), r.version ?? 0)) });
});

app.put('/api/cases/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const old = await c.env.DB.prepare('SELECT version FROM cases WHERE id = ?').bind(id).first<{ version: number }>();
  const currentVersion = old?.version ?? 0;
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await c.env.DB.prepare('INSERT OR REPLACE INTO cases (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify({ ...data, updatedAt: serverUpdatedAt }), new Date().toISOString(), currentVersion + 1)
    .run();
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt });
});

// ── 线索域（B2，与报价/合同同文档式模式；接口形态对齐 LeadService，见 packages/ui/services/leadService.ts）──
// 表：leads（主文档+version）、lead_followups / lead_transfers（一条一 JSON 行）。
// 服务端校验：领取前置条件（公海才可领）、退回前置条件（已分配且未成交，第 3 次自动进垃圾）。

app.get('/api/leads', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT data, version FROM leads ORDER BY updated_at DESC').all<{ data: string; version: number }>();
  return c.json({ leads: results.map((r) => withVersion(JSON.parse(r.data), r.version ?? 0)) });
});

app.get('/api/leads/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT data, version FROM leads WHERE id = ?').bind(c.req.param('id')).first<{ data: string; version: number }>();
  return row ? c.json({ lead: withVersion(JSON.parse(row.data), row.version ?? 0) }) : c.json({ error: 'not found' }, 404);
});

function parseLeadDoc(data: string): Record<string, unknown> {
  return JSON.parse(data) as Record<string, unknown>;
}

// 领取前置校验：仅公海线索可认领（与前端 canClaimLead 对齐）
function isValidClaim(oldDoc: Record<string, unknown>): boolean {
  return oldDoc.clueType === 'public';
}

// 退回前置校验：已分配未成交可退回（与前端 canReturnLead 对齐）
function isValidReturn(oldDoc: Record<string, unknown>): boolean {
  if (oldDoc.clueType === 'trash') return true; // 垃圾池退出
  if (oldDoc.clueType !== 'assigned') return false;
  return oldDoc.status !== '已签单' && oldDoc.status !== '已终止';
}

app.post('/api/leads', async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>;
  const id = `L-${Date.now()}`;
  const serverUpdatedAt = domainNow();
  const doc = {
    ...body,
    id,
    key: id,
    clueType: body.clueType ?? 'public',
    status: body.status ?? '未联系',
    trashCount: 0,
    transformStatus: false,
    followCount: 0,
    daysHeld: 0,
    isOverdue: false,
    owner: '',
    createdAt: serverUpdatedAt,
    updatedAt: serverUpdatedAt,
  };
  await c.env.DB
    .prepare('INSERT OR REPLACE INTO leads (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify(doc), new Date().toISOString(), 0)
    .run();
  return c.json({ id });
});

app.put('/api/leads/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const actor = c.req.header('X-Actor') ?? '';

  const old = await c.env.DB.prepare('SELECT data, version FROM leads WHERE id = ?').bind(id).first<{ data: string; version: number }>();
  const currentVersion = old?.version ?? 0;

  // 乐观锁（ADR-0094）：与报价/合同同规则
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }

  // 服务端校验（B2）：领取/退回前置条件，防“胖客户端”跳过规则
  if (old) {
    const oldDoc = parseLeadDoc(old.data);
    const changedLeadField = (key: string) => oldDoc[key] !== body[key];

    if (changedLeadField('clueType') && body.clueType === 'assigned' && oldDoc.clueType === 'public') {
      // 认领跳转：公海 → 我的，仅公海有效
      if (!isValidClaim(oldDoc)) return c.json({ error: '仅公海线索可认领' }, 400);
    }
    if (changedLeadField('clueType') && body.clueType === 'public' && oldDoc.clueType === 'assigned') {
      // 退回公海：已分配未成交才可退；第 3 次自动垃圾在 mutation 内已算好
      if (!isValidReturn(oldDoc)) return c.json({ error: '仅已分配且未成交线索可退回公海' }, 400);
    }
  }

  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await c.env.DB
    .prepare('INSERT OR REPLACE INTO leads (id, data, updated_at, version) VALUES (?, ?, ?, ?)')
    .bind(id, JSON.stringify({ ...data, updatedAt: serverUpdatedAt }), new Date().toISOString(), currentVersion + 1)
    .run();
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt, actor });
});

app.delete('/api/leads/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ── 跟进记录（写入时顺带同步线索状态/等级/时间）──
app.get('/api/leads/:id/followups', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT data FROM lead_followups WHERE lead_id = ? ORDER BY updated_at DESC')
    .bind(c.req.param('id'))
    .all<{ data: string }>();
  return c.json({ followUps: (results ?? []).map((r) => JSON.parse(r.data)) });
});

app.post('/api/leads/:id/followups', async (c) => {
  const id = c.req.param('id');
  const input = (await c.req.json()) as { method?: string; customerStatus?: string; content?: string; nextFollowTime?: string; customerLevel?: string; creator?: string };
  const leadRow = await c.env.DB.prepare('SELECT data, version FROM leads WHERE id = ?').bind(id).first<{ data: string; version: number }>();
  if (!leadRow) return c.json({ error: 'not found' }, 404);

  const leadDoc = parseLeadDoc(leadRow.data);
  const t = domainNow();
  const record = {
    id: `fu-${id}-${t.replace(/[-: ]/g, '')}`,
    leadId: id,
    method: input.method ?? '电话',
    customerStatus: input.customerStatus ?? leadDoc.status,
    customerLevel: input.customerLevel ?? leadDoc.customerLevel,
    content: input.content ?? '',
    nextFollowTime: input.nextFollowTime ?? '',
    attachments: [],
    creator: input.creator ?? '',
    createdAt: t,
    updatedAt: t,
    followupStatus: 'pending',
  };
  // 同步线索状态与跟进时间（服务端时钟）
  const updatedLead = {
    ...leadDoc,
    status: input.customerStatus ?? leadDoc.status,
    customerLevel: input.customerLevel ?? leadDoc.customerLevel,
    lastFollowTime: t,
    lastFollowContent: input.content ?? '',
    nextFollowTime: input.nextFollowTime ?? '',
    followCount: ((leadDoc.followCount as number) ?? 0) + 1,
    updatedAt: t,
  };
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT OR REPLACE INTO lead_followups (id, lead_id, data, updated_at) VALUES (?, ?, ?, ?)').bind(record.id, id, JSON.stringify(record), new Date().toISOString()),
    c.env.DB.prepare('INSERT OR REPLACE INTO leads (id, data, updated_at, version) VALUES (?, ?, ?, ?)').bind(id, JSON.stringify(updatedLead), new Date().toISOString(), (leadRow.version ?? 0) + 1),
  ]);
  return c.json({ ok: true });
});

// ── 流转记录 ──
app.get('/api/leads/:id/transfers', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT data FROM lead_transfers WHERE lead_id = ? ORDER BY updated_at DESC')
    .bind(c.req.param('id'))
    .all<{ data: string }>();
  return c.json({ transfers: (results ?? []).map((r) => JSON.parse(r.data)) });
});

// ── 员工/用户域（B5，β 前端 EmployeeContext 数据源）──

app.get('/api/employees', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT data, version FROM employees ORDER BY updated_at DESC').all<{ data: string; version: number }>();
  return c.json({ employees: results.map((r) => withVersion(JSON.parse(r.data), r.version ?? 0)) });
});

app.get('/api/employees/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT data, version FROM employees WHERE id = ?').bind(c.req.param('id')).first<{ data: string; version: number }>();
  return row ? c.json({ employee: withVersion(JSON.parse(row.data), row.version ?? 0) }) : c.json({ error: 'not found' }, 404);
});

export default app;
