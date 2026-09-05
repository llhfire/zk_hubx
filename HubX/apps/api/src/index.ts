// ZK HubX β版后端（Cloudflare Workers + Hono + Supabase / D1）。
// 优先接入 Supabase (PostgreSQL，JSONB 文档式存储)，支持本地 D1 / 内存存储兜底。

import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';

import { getDbAdapter, type DatabaseAdapter, type ApiEnvBindings } from './db';

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
// β 阶段 2：线索详情组装与派发域四动作（纯函数单源，类型导入会被 esbuild 剥离）
import {
  applyDispatchLead,
  applyLevelChange,
  applyQualityConfirm,
  applyUrge,
  buildLeadDetailInfo,
} from '../../../packages/ui/src/services/leadMutations';
import type { LeadListItem, CustomerLevel } from '../../../packages/ui/src/app/pages/leads/types';
import type { DispatchInput } from '../../../packages/ui/src/services/leadMutations';

type Env = ApiEnvBindings;

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

function getActor(c: Context): string {
  const raw = c.req.header('X-Actor') ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function ensureSeed(db: DatabaseAdapter) {
  await db.ensureSeedQuote(seedQuote());
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

app.get('/', (c) => {
  const db = getDbAdapter(c.env);
  return c.json({ ok: true, service: 'zkhubx-api', engine: db.engine });
});

// ── 报价域 ───────────────────────────────────────────────

app.get('/api/quotes', async (c) => {
  const db = getDbAdapter(c.env);
  await ensureSeed(db);
  const records = await db.getQuotes();
  return c.json({ quotes: records.map((r) => withVersion(migrateQuoteApi(r.data), r.version)) });
});

app.get('/api/quotes/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getQuote(c.req.param('id'));
  return row ? c.json({ quote: withVersion(migrateQuoteApi(row.data), row.version) }) : c.json({ error: 'not found' }, 404);
});

app.put('/api/quotes/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { status?: string; version?: number };
  const actor = getActor(c);

  const old = await db.getQuote(id);
  const currentVersion = old?.version ?? 0;

  // 乐观锁（ADR-0094）：请求携带的 version 与库内不一致 -> 409，客户端提示刷新重试
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }

  // 服务端校验状态迁移：读旧状态，比对新状态是否合法（防止"胖客户端"跳过步骤）
  if (old) {
    const oldStatus = (old.data as { status?: string }).status;
    const newStatus = body.status;
    if (oldStatus && newStatus && !isValidTransition(oldStatus, newStatus)) {
      return c.json({ error: `非法状态迁移：${oldStatus} -> ${newStatus}` }, 400);
    }
  }

  // version 是传输层并发令牌，不落进 data；updatedAt 由服务端时钟覆盖；保留 id
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await db.upsertQuote(id, { id, ...data, updatedAt: serverUpdatedAt }, currentVersion + 1, new Date().toISOString());
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt, actor });
});

app.delete('/api/quotes/:id', async (c) => {
  const db = getDbAdapter(c.env);
  await db.deleteQuote(c.req.param('id'));
  return c.json({ ok: true });
});

// ── 合同域 ───────────────────────────────────────────────

app.get('/api/contracts', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getContracts();
  return c.json({ contracts: records.map((r) => withVersion(r.data, r.version)) });
});

app.get('/api/contracts/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getContract(c.req.param('id'));
  return row ? c.json({ contract: withVersion(row.data, row.version) }) : c.json({ error: 'not found' }, 404);
});

type ContractLike = Record<string, unknown>;

/** 合同写入后，在同一请求内完成 spawn / startDelivery / shelve（原子性） */
async function handleSigningLinkage(db: DatabaseAdapter, events: { created: ContractLike[]; approved: ContractLike[]; voided: ContractLike[] }, today: string) {
  // 合同新建 → spawn 未确认项目
  for (const contract of events.created) {
    const leadId = contract.leadId as string | undefined;
    if (!leadId) continue;
    const contractId = contract.id as string;

    // 检查是否已有项目
    const existing = await db.getProjectByLeadId(leadId);
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
    await Promise.all([
      db.insertProjectIfMissing(projectId, fullProject, 0, new Date().toISOString()),
      db.insertCaseIfMissing(bizCase.id, { ...bizCase, contractId }, 0, new Date().toISOString()),
    ]);
  }

  // 合同批准 → startDelivery + 关联商机
  for (const contract of events.approved) {
    const leadId = contract.leadId as string | undefined;
    if (!leadId) continue;
    const contractId = contract.id as string;

    const projectRow = await db.getProjectByLeadId(leadId);
    if (!projectRow) continue; // ADR-0067：批准时无项目不兜底 spawn

    const project = projectRow.data as Record<string, unknown>;
    const patch = startDelivery({
      project: { status: project.status as string, contractId: project.contractId as string | undefined },
      contractId,
      today,
    });

    if (patch) {
      const updatedProject = { ...project, ...patch, updatedAt: today };
      await db.upsertProject(project.id as string, updatedProject, (projectRow.version ?? 0) + 1, new Date().toISOString());
    }

    // 补全商机关联
    const caseRow = await db.getCaseByLeadId(leadId);
    if (caseRow) {
      const bizCase = caseRow.data as Record<string, unknown>;
      const updatedCase = { ...bizCase, projectId: bizCase.projectId ?? project.id, contractId: bizCase.contractId ?? contractId, updatedAt: today };
      await db.upsertCase(bizCase.id as string, updatedCase, (caseRow.version ?? 0) + 1, new Date().toISOString());
    } else {
      const newCase = { id: 'case-' + leadId, leadId, projectId: project.id, contractId, extraContractIds: [], quoteIds: [], updatedAt: today };
      await db.insertCaseIfMissing(newCase.id, newCase, 0, new Date().toISOString());
    }
  }

  // 合同作废 → 项目搁置
  for (const contract of events.voided) {
    const leadId = contract.leadId as string | undefined;
    if (!leadId) continue;
    const contractId = contract.id as string;

    const projectRow = await db.getProjectByLeadId(leadId);
    if (!projectRow) continue;

    const project = projectRow.data as Record<string, unknown>;
    const shelvePatch = shelveProject({
      project: { status: project.status as string, contractId: project.contractId as string | undefined },
      contractId,
      reason: '主合同作废',
    });
    if (shelvePatch) {
      const updatedProject = { ...project, ...shelvePatch, updatedAt: today };
      await db.upsertProject(project.id as string, updatedProject, (projectRow.version ?? 0) + 1, new Date().toISOString());
    }
  }
}

/**
 * 洞 C ③：草稿/未批准且非作废，该 lead 还没有项目 → 再 spawn（INSERT OR IGNORE，幂等）
 * 解决首次 INSERT 跳过联动、或联动失败后无法补救的问题
 */
async function ensureUnconfirmedProjectIfMissing(db: DatabaseAdapter, contract: ContractLike, today: string) {
  if (!shouldEnsureUnconfirmedProject(
    { approvedAt: contract.approvedAt as string | undefined, status: contract.status as string | undefined, leadId: contract.leadId as string | undefined },
    false,
  )) {
    return;
  }

  const leadId = contract.leadId as string;
  const contractId = contract.id as string;

  const existing = await db.getProjectByLeadId(leadId);
  if (existing) return; // 已有项目不重复 spawn

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
  await Promise.all([
    db.insertProjectIfMissing(projectId, fullProject, 0, new Date().toISOString()),
    db.insertCaseIfMissing(bizCase.id, { ...bizCase, contractId }, 0, new Date().toISOString()),
  ]);
}

app.put('/api/contracts/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const actor = getActor(c);

  // 读旧文档：乐观锁 + 联动 diff 都需要
  const old = await db.getContract(id);
  const currentVersion = old?.version ?? 0;

  // 乐观锁（ADR-0094）：与报价同规则
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }

  // version 不落进 data；updatedAt 由服务端时钟覆盖；确保 id 保留在文档对象中
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await db.upsertContract(id, { id, ...data, updatedAt: serverUpdatedAt }, currentVersion + 1, new Date().toISOString());

  // B3 签约联动（ADR-0093）：合同写入后检测事件，在同一请求内完成 spawn / startDelivery / shelve
  const oldDoc = old ? (old.data as Record<string, unknown>) : null;
  const prevSnapshot = prevSnapshotForWrite(id, oldDoc ? { approvedAt: oldDoc.approvedAt as string | undefined, status: oldDoc.status as string | undefined } : null);
  const nextContract = { id, ...data } as import('../../../packages/ui/src/app/pages/contracts/types').Contract;
  const events = diffContractEvents(prevSnapshot, [nextContract]);

  if (events.created.length > 0 || events.approved.length > 0 || events.voided.length > 0) {
    await handleSigningLinkage(db, events as unknown as { created: ContractLike[]; approved: ContractLike[]; voided: ContractLike[] }, serverUpdatedAt);
  }

  // 洞 C ③：草稿/未批准且非作废，该 lead 还没有项目 → 再 spawn（幂等）
  await ensureUnconfirmedProjectIfMissing(db, nextContract as ContractLike, serverUpdatedAt);

  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt, actor });
});

app.delete('/api/contracts/:id', async (c) => {
  const db = getDbAdapter(c.env);
  await db.deleteContract(c.req.param('id'));
  return c.json({ ok: true });
});

// ── 项目域 CRUD（B3/B4，文档式）───────────────────────────

app.get('/api/projects', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getProjects();
  return c.json({ projects: records.map((r) => withVersion(r.data, r.version)) });
});

app.get('/api/projects/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getProject(c.req.param('id'));
  return row ? c.json({ project: withVersion(row.data, row.version) }) : c.json({ error: 'not found' }, 404);
});

// 项目详情复合接口（β 阶段 2）：项目 + 关联合同 + 项目实收 + 活动事件
app.get('/api/projects/:id/detail', async (c) => {
  const db = getDbAdapter(c.env);
  const id = c.req.param('id');
  const row = await db.getProject(id);
  if (!row) return c.json({ error: 'not found' }, 404);
  const project = withVersion(row.data, row.version) as Record<string, unknown> & { contractId?: string; leadId?: string; activities?: unknown[] };

  const contractId = project.contractId || '';
  const leadId = project.leadId || '';

  const contractRows = await db.getContractsForProject(contractId, leadId);
  const contracts = contractRows.map((r) => r.data);
  const contractIds = contracts.map((ct) => String(ct.id ?? ''));

  const collectionRows = await db.getCollectionsForProject(id, contractIds);
  const collections = collectionRows.map((r) => r.data);

  return c.json({
    project,
    contracts,
    collections,
    activities: project.activities ?? [],
  });
});

app.post('/api/projects', async (c) => {
  const db = getDbAdapter(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const id = (typeof body.id === 'string' && body.id) ? body.id : `p-${Date.now()}`;
  const existing = await db.getProject(id);
  if (existing) return c.json({ id });
  const serverUpdatedAt = domainNow();
  const doc = { ...body, id, createdAt: body.createdAt ?? serverUpdatedAt, updatedAt: serverUpdatedAt };
  await db.insertProjectIfMissing(id, doc, 0, new Date().toISOString());
  return c.json({ id });
});

app.put('/api/projects/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const old = await db.getProject(id);
  const currentVersion = old?.version ?? 0;
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }
  if (old) {
    const oldDoc = old.data as Record<string, unknown>;
    const statusErr = validateProjectStatusWrite(
      String(oldDoc.status ?? ''),
      String(body.status ?? oldDoc.status ?? ''),
      typeof body.owner === 'string' ? body.owner : undefined,
    );
    if (statusErr) return c.json({ error: statusErr }, 400);
  }
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await db.upsertProject(id, { id, ...data, updatedAt: serverUpdatedAt }, currentVersion + 1, new Date().toISOString());
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt });
});

app.delete('/api/projects/:id', async (c) => {
  const db = getDbAdapter(c.env);
  await db.deleteProject(c.req.param('id'));
  return c.json({ ok: true });
});

// ── 回款实收台账（B4）─────────────────────────────────────

app.get('/api/collections', async (c) => {
  const db = getDbAdapter(c.env);
  const contractId = c.req.query('contractId');
  const records = await db.getCollections(contractId);
  return c.json({ collections: records.map((r) => r.data) });
});

app.post('/api/collections', async (c) => {
  const db = getDbAdapter(c.env);
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
    await db.insertCollectionIfMissing(rec.id, { ...rec, updatedAt: serverUpdatedAt }, 0, new Date().toISOString());
    return c.json({ id: rec.id });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : '登记实收失败' }, 400);
  }
});

// ── 商机域 CRUD ───────────────────────────────────────────

app.get('/api/cases', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getCases();
  return c.json({ cases: records.map((r) => withVersion(r.data, r.version)) });
});

app.put('/api/cases/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const old = await db.getCase(id);
  const currentVersion = old?.version ?? 0;
  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }
  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await db.upsertCase(id, { id, ...data, updatedAt: serverUpdatedAt }, currentVersion + 1, new Date().toISOString());
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt });
});

// ── 线索域（B2）───────────────────────────────────────────

app.get('/api/leads', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getLeads();
  return c.json({ leads: records.map((r) => withVersion(r.data, r.version)) });
});

app.get('/api/leads/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getLead(c.req.param('id'));
  return row ? c.json({ lead: withVersion(row.data, row.version) }) : c.json({ error: 'not found' }, 404);
});

function isValidClaim(oldDoc: Record<string, unknown>): boolean {
  return oldDoc.clueType === 'public';
}

function isValidReturn(oldDoc: Record<string, unknown>): boolean {
  if (oldDoc.clueType === 'trash') return true;
  if (oldDoc.clueType !== 'assigned') return false;
  return oldDoc.status !== '已签单' && oldDoc.status !== '已终止';
}

app.post('/api/leads', async (c) => {
  const db = getDbAdapter(c.env);
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
    owner: (body.owner as string) ?? '',
    createTime: (body.createTime as string) || serverUpdatedAt,
    updateTime: serverUpdatedAt,
    createdAt: serverUpdatedAt,
    updatedAt: serverUpdatedAt,
  };
  await db.upsertLead(id, doc, 0, new Date().toISOString());
  return c.json({ id });
});

app.put('/api/leads/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const id = c.req.param('id');
  const body = (await c.req.json()) as Record<string, unknown> & { version?: number };
  const actor = getActor(c);

  const old = await db.getLead(id);
  const currentVersion = old?.version ?? 0;

  if (old && typeof body.version === 'number' && body.version !== currentVersion) {
    return c.json({ error: 'version conflict', currentVersion }, 409);
  }

  if (old) {
    const oldDoc = old.data as Record<string, unknown>;
    const changedLeadField = (key: string) => oldDoc[key] !== body[key];

    if (changedLeadField('clueType') && body.clueType === 'assigned' && oldDoc.clueType === 'public') {
      if (!isValidClaim(oldDoc)) return c.json({ error: '仅公海线索可认领' }, 400);
    }
    if (changedLeadField('clueType') && body.clueType === 'public' && oldDoc.clueType === 'assigned') {
      if (!isValidReturn(oldDoc)) return c.json({ error: '仅已分配且未成交线索可退回公海' }, 400);
    }
  }

  const { version: _v, ...data } = body;
  const serverUpdatedAt = domainNow();
  await db.upsertLead(
    id,
    { id, ...data, updateTime: serverUpdatedAt, updatedAt: serverUpdatedAt },
    currentVersion + 1,
    new Date().toISOString(),
  );
  return c.json({ ok: true, id, version: currentVersion + 1, serverUpdatedAt, actor });
});

app.delete('/api/leads/:id', async (c) => {
  const db = getDbAdapter(c.env);
  await db.deleteLead(c.req.param('id'));
  return c.json({ ok: true });
});

// ── 跟进记录 ──
app.get('/api/leads/:id/followups', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getLeadFollowups(c.req.param('id'));
  return c.json({ followUps: records.map((r) => r.data) });
});

app.post('/api/leads/:id/followups', async (c) => {
  const db = getDbAdapter(c.env);
  const paramId = c.req.param('id');
  const input = (await c.req.json()) as {
    method?: string;
    customerStatus?: string;
    content?: string;
    nextFollowTime?: string;
    customerLevel?: string;
    creator?: string;
    costHours?: number;
    costMins?: number;
    attachments?: unknown[];
  };
  const leadRow = await db.getLead(paramId);
  if (!leadRow) return c.json({ error: 'not found' }, 404);

  const realId = leadRow.id;
  const leadDoc = leadRow.data as Record<string, unknown>;
  const t = domainNow();
  const record = {
    id: `fu-${realId}-${t.replace(/[-: ]/g, '')}`,
    leadId: realId,
    method: input.method ?? '电话沟通',
    customerStatus: input.customerStatus ?? leadDoc.status,
    customerLevel: input.customerLevel ?? leadDoc.customerLevel,
    costHours: input.costHours,
    costMins: input.costMins,
    content: input.content ?? '',
    nextFollowTime: input.nextFollowTime ?? '',
    attachments: input.attachments ?? [],
    creator: input.creator || getActor(c) || '系统',
    createdAt: t,
    updatedAt: t,
    followupStatus: 'pending',
  };
  const updatedLead = {
    ...leadDoc,
    status: input.customerStatus ?? leadDoc.status,
    customerLevel: input.customerLevel ?? leadDoc.customerLevel,
    lastFollowTime: t,
    lastFollowContent: input.content ?? '',
    nextFollowTime: input.nextFollowTime ?? '',
    followCount: ((leadDoc.followCount as number) ?? 0) + 1,
    updateTime: t,
    updatedAt: t,
  };

  await db.saveLeadFollowupAndLead(
    { id: record.id, leadId: realId, data: record },
    updatedLead,
    (leadRow.version ?? 0) + 1,
    new Date().toISOString(),
  );
  return c.json({ ok: true, id: record.id, leadId: realId });
});

// ── 流转记录 ──
app.get('/api/leads/:id/transfers', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getLeadTransfers(c.req.param('id'));
  return c.json({ transfers: records.map((r) => r.data) });
});

// ── 线索详情复合接口 ──
app.get('/api/leads/:id/detail', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getLead(c.req.param('id'));
  if (!row) return c.json({ error: 'not found' }, 404);
  const lead = row.data as LeadListItem & { leadEvents?: unknown[] };
  return c.json({
    detail: buildLeadDetailInfo(lead),
    events: lead.leadEvents ?? [],
    version: row.version ?? 0,
  });
});

// ── 派发域写端点 ──

async function appendLeadAction(
  c: Context<{ Bindings: Env }>,
  id: string,
  build: (lead: LeadListItem, actor: string, now: string, eventId: string) => { lead: LeadListItem; transfer: { id: string } | null },
) {
  const db = getDbAdapter(c.env);
  const row = await db.getLead(id);
  if (!row) return c.json({ error: 'not found' }, 404);
  const actor = getActor(c);
  const now = domainNow();
  const eventId = `evt-${Date.now()}-${id}`;
  const lead = row.data as unknown as LeadListItem;
  const { lead: updated, transfer } = build(lead, actor, now, eventId);

  await db.saveLeadActionAndTransfer(
    id,
    { ...updated, updateTime: now, updatedAt: now },
    (row.version ?? 0) + 1,
    new Date().toISOString(),
    transfer ? { id: transfer.id, leadId: id, data: transfer as unknown as Record<string, unknown> } : null,
  );
  return c.json({ ok: true, id, version: (row.version ?? 0) + 1, serverUpdatedAt: now });
}

app.post('/api/leads/:id/dispatch', async (c) => {
  const body = (await c.req.json()) as { target?: string; assignee?: string; reason?: string };
  if (body.target !== 'sales' && body.target !== 'pool') {
    return c.json({ error: 'target 必须是 sales 或 pool' }, 400);
  }
  if (body.target === 'sales' && !body.assignee) {
    return c.json({ error: '派发给销售必须指定 assignee' }, 400);
  }
  const input: DispatchInput = { target: body.target, assignee: body.assignee, reason: body.reason };
  return appendLeadAction(c, c.req.param('id'), (lead, actor, now, eventId) =>
    applyDispatchLead(lead, input, actor, now, eventId));
});

app.post('/api/leads/:id/urge', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { note?: string };
  return appendLeadAction(c, c.req.param('id'), (lead, actor, now, eventId) => ({
    lead: applyUrge(lead, actor, body.note ?? '', now, eventId),
    transfer: null,
  }));
});

app.post('/api/leads/:id/level-change', async (c) => {
  const body = (await c.req.json()) as { from?: string; to?: string };
  const from = body.from as CustomerLevel | undefined;
  const to = body.to as CustomerLevel | undefined;
  if (!from || !to || !['S', 'A', 'B', 'C'].includes(from) || !['S', 'A', 'B', 'C'].includes(to)) {
    return c.json({ error: 'from/to 必须是 S/A/B/C' }, 400);
  }
  return appendLeadAction(c, c.req.param('id'), (lead, actor, now, eventId) => ({
    lead: applyLevelChange(lead, from, to, actor, now, eventId),
    transfer: null,
  }));
});

app.post('/api/leads/:id/level-audit', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { note?: string };
  return appendLeadAction(c, c.req.param('id'), (lead, actor, now, eventId) => ({
    lead: applyQualityConfirm(lead, actor, body.note ?? '', now, eventId),
    transfer: null,
  }));
});

app.get('/api/leads/:id/events', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getLead(c.req.param('id'));
  if (!row) return c.json({ error: 'not found' }, 404);
  const lead = row.data as LeadListItem & { leadEvents?: unknown[] };
  return c.json({ events: lead.leadEvents ?? [] });
});

// ── 员工/用户域（B5）───────────────────────────────────────

app.get('/api/employees', async (c) => {
  const db = getDbAdapter(c.env);
  const records = await db.getEmployees();
  return c.json({ employees: records.map((r) => withVersion(r.data, r.version)) });
});

app.get('/api/employees/:id', async (c) => {
  const db = getDbAdapter(c.env);
  const row = await db.getEmployee(c.req.param('id'));
  return row ? c.json({ employee: withVersion(row.data, row.version) }) : c.json({ error: 'not found' }, 404);
});

export default app;
