import { describe, it, expect } from 'vitest';
import app, { checkVersion } from '..';

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

describe('乐观锁：省略 version 必须拒绝（ADR-0094）', () => {
  // 历史实现 `typeof body.version === 'number' && ...` 会让「不带 version」跳过校验，
  // 任何客户端省略该字段即可静默覆盖他人修改。以下用例防止回归。

  it('报价 PUT 不带 version → 409', async () => {
    await app.request('/api/quotes'); // 确保种子已写入
    const res = await app.request('/api/quotes/q-seed-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending_eval' }),
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string; currentVersion: number };
    expect(json.error).toBe('version conflict');
    expect(typeof json.currentVersion).toBe('number');
  });

  it('报价 PUT version 为非数字（字符串）→ 409', async () => {
    await app.request('/api/quotes');
    const res = await app.request('/api/quotes/q-seed-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending_eval', version: '0' }),
    });
    expect(res.status).toBe(409);
  });

  it('合同 PUT 不带 version → 409', async () => {
    await app.request('/api/contracts');
    const listRes = await app.request('/api/contracts');
    const list = (await listRes.json()) as { contracts: Array<{ id: string }> };
    const id = list.contracts[0]?.id;
    expect(id).toBeTruthy();
    const res = await app.request(`/api/contracts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    expect(res.status).toBe(409);
  });

  it('新建记录（无 old）不带 version 仍可写入', async () => {
    const res = await app.request('/api/quotes/never-existed-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'never-existed-id', status: 'draft' }),
    });
    expect(res.status).not.toBe(409);
  });
});

describe('checkVersion：判据必须是「行是否存在」，不是「version 是否存在」', () => {
  // 这两条防的是同一类回归：曾经用 old?.version 判空，
  // 结果老行（无 version 列值）被当成新建，乐观锁整体失效。

  it('行存在但 version 缺失 → 仍然校验，不带 version 必须冲突', () => {
    const check = checkVersion({}, undefined);
    expect(check.conflict).toBe(true);
    if (check.conflict) expect(check.currentVersion).toBe(0);
  });

  it('行存在且 version 为 null → 冲突不能与「通过」同形', () => {
    const check = checkVersion({ version: null }, 5);
    expect(check.conflict).toBe(true);
    if (check.conflict) expect(check.currentVersion).toBe(0);
  });

  it('行存在、version 0，请求带 0 → 通过', () => {
    expect(checkVersion({ version: 0 }, 0).conflict).toBe(false);
  });

  it('行不存在 → 一律通过（新建）', () => {
    expect(checkVersion(undefined, undefined).conflict).toBe(false);
    expect(checkVersion(null, 'whatever').conflict).toBe(false);
  });
});
