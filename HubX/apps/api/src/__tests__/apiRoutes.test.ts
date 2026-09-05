import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Hono API Routes with Database Adapter Layer', () => {
  it('GET / 返回健康检查与服务标识', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; service: string; engine: string };
    expect(json.ok).toBe(true);
    expect(json.service).toBe('zkhubx-api');
    expect(['supabase', 'd1', 'memory']).toContain(json.engine);
  });

  it('报价域：GET /api/quotes 懒写入种子数据并返回列表', async () => {
    const res = await app.request('/api/quotes');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { quotes: Array<{ id: string; version: number }> };
    expect(Array.isArray(json.quotes)).toBe(true);
    expect(json.quotes.length).toBeGreaterThanOrEqual(1);
    expect(json.quotes.some((q) => q.id === 'q-seed-1')).toBe(true);
  });

  it('报价域：PUT 乐观锁版本冲突校验 (409)', async () => {
    const res = await app.request('/api/quotes/q-seed-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'pending_eval',
        version: 999, // 错误的版本号
      }),
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('version conflict');
  });

  it('报价域：PUT 非法状态迁移校验 (400)', async () => {
    // 种子状态为 draft，不能直接跳到 confirmed
    const res = await app.request('/api/quotes/q-seed-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'confirmed',
        version: 0,
      }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('非法状态迁移');
  });

  it('合同域与签约联动：PUT 合同触发未确认项目与商机生成', async () => {
    const testContractId = `ct-test-${Date.now()}`;
    const testLeadId = `lead-test-${Date.now()}`;

    const res = await app.request(`/api/contracts/${testContractId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Actor': 'tester' },
      body: JSON.stringify({
        customerName: '测试客户科技',
        leadId: testLeadId,
        status: 'draft',
        version: 0,
      }),
    });
    expect(res.status).toBe(200);

    // 检查项目复合详情
    const projectDetailRes = await app.request(`/api/projects/ap-${testContractId}/detail`);
    expect(projectDetailRes.status).toBe(200);
    const projectJson = (await projectDetailRes.json()) as {
      project: { id: string; leadId: string };
      contracts: Array<{ id: string }>;
    };
    expect(projectJson.project.id).toBe(`ap-${testContractId}`);
    expect(projectJson.project.leadId).toBe(testLeadId);
    expect(projectJson.contracts.some((c) => c.id === testContractId)).toBe(true);
  });

  it('线索域：POST 创建线索及派发操作', async () => {
    const createRes = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Supabase 改造验证线索',
        clueType: 'public',
      }),
    });
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as { id: string };
    const leadId = createJson.id;
    expect(leadId).toBeTruthy();

    // 派发线索给销售
    const dispatchRes = await app.request(`/api/leads/${leadId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Actor': 'dispatcher' },
      body: JSON.stringify({
        target: 'sales',
        assignee: '张三',
        reason: '跟进重点客户',
      }),
    });
    expect(dispatchRes.status).toBe(200);
    const dispatchJson = (await dispatchRes.json()) as { ok: boolean; version: number };
    expect(dispatchJson.ok).toBe(true);
    expect(dispatchJson.version).toBe(1);

    // 查询详情与流转
    const detailRes = await app.request(`/api/leads/${leadId}/detail`);
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as { detail: { owner: string; clueType: string } };
    expect(detailJson.detail.owner).toBe('张三');
    expect(detailJson.detail.clueType).toBe('assigned');
  });
});
