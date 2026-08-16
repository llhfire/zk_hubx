// ZK HubX β版后端（Cloudflare Workers + Hono + D1）。
// 报价数据存 D1（SQLite），data 列存整条 Quote 的 JSON。与前端 QuotationService 的 list/upsert 对应。

import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
    quoteNo: 'ZK-20260816-001',
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

app.get('/', (c) => c.json({ ok: true, service: 'zkhubx-api' }));

app.get('/api/quotes', async (c) => {
  await ensureSeed(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT data FROM quotes ORDER BY updated_at DESC').all<{ data: string }>();
  return c.json({ quotes: results.map((r) => JSON.parse(r.data)) });
});

app.get('/api/quotes/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT data FROM quotes WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ data: string }>();
  return row ? c.json({ quote: JSON.parse(row.data) }) : c.json({ error: 'not found' }, 404);
});

app.put('/api/quotes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB
    .prepare('INSERT OR REPLACE INTO quotes (id, data, updated_at) VALUES (?, ?, ?)')
    .bind(id, JSON.stringify(body), new Date().toISOString())
    .run();
  return c.json({ ok: true, id });
});

export default app;
