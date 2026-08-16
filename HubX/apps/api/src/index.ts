// ZK HubX β版后端（Cloudflare Workers + Hono）。
// 目前是内存存储骨架：GET/PUT /api/quotes，与前端 QuotationService 的 list/upsert 一一对应。
// 后续把 Map 换成 D1（SQLite）即可持久化。

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// 本地联调：β前端(5174) → 后端(8787) 跨域，放开 CORS
app.use('*', cors());

const store = new Map<string, unknown>();

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
store.set('q-seed-1', seedQuote());

app.get('/', (c) => c.json({ ok: true, service: 'zkhubx-api' }));

app.get('/api/quotes', (c) => c.json({ quotes: [...store.values()] }));

app.get('/api/quotes/:id', (c) => {
  const quote = store.get(c.req.param('id'));
  return quote ? c.json({ quote }) : c.json({ error: 'not found' }, 404);
});

app.put('/api/quotes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  store.set(id, body);
  return c.json({ ok: true, id });
});

export default app;
