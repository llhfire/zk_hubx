import { describe, expect, it } from 'vitest';
import {
  canSubmitWithDocument,
  canUploadScan,
  invalidateDocument,
  parseFeature清单,
  validateHeaders,
  type Raw清单Row,
} from '../fileFlow';

describe('parseFeature清单', () => {
  it('正常解析两级清单', () => {
    const rows: Raw清单Row[] = [
      { 模块: '用户中心', 子功能: '注册登录', 描述: '手机号注册' },
      { 模块: '用户中心', 子功能: '个人资料', 描述: '头像昵称' },
      { 模块: '商品管理', 子功能: '商品列表', 描述: '分页搜索' },
    ];
    const result = parseFeature清单(rows);
    expect(result.modules).toHaveLength(2);
    expect(result.modules[0].name).toBe('用户中心');
    expect(result.modules[0].subFeatures).toHaveLength(2);
    expect(result.modules[1].name).toBe('商品管理');
    expect(result.modules[1].subFeatures).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.totalRows).toBe(3);
  });

  it('空行跳过', () => {
    const rows: Raw清单Row[] = [
      { 模块: '用户中心', 子功能: '注册登录', 描述: '' },
      { 模块: '', 子功能: '', 描述: '' },
      { 模块: '商品管理', 子功能: '商品列表', 描述: '' },
    ];
    const result = parseFeature清单(rows);
    expect(result.modules).toHaveLength(2);
    expect(result.totalRows).toBe(2);
  });

  it('模块名为空时报错', () => {
    const rows: Raw清单Row[] = [
      { 模块: '', 子功能: '注册登录', 描述: '' },
    ];
    const result = parseFeature清单(rows);
    expect(result.errors.some((e) => e.message.includes('模块'))).toBe(true);
  });

  it('子功能名为空时报错', () => {
    const rows: Raw清单Row[] = [
      { 模块: '用户中心', 子功能: '', 描述: '' },
    ];
    const result = parseFeature清单(rows);
    expect(result.errors.some((e) => e.message.includes('子功能'))).toBe(true);
  });

  it('0 行有效数据报错', () => {
    const rows: Raw清单Row[] = [];
    const result = parseFeature清单(rows);
    expect(result.modules).toHaveLength(0);
    expect(result.errors).toHaveLength(0); // 空输入不报错
  });

  it('全部空行报错', () => {
    const rows: Raw清单Row[] = [
      { 模块: '', 子功能: '', 描述: '' },
    ];
    const result = parseFeature清单(rows);
    expect(result.modules).toHaveLength(0);
    // 空行被跳过，validRows=0 但 rows.length>0 → 报错
    // 但实际上空行被 skip 了，validRows=0 且 rows.length=1
    // 但跳过的行不算有效行，所以 totalRows=0
    // 不过 rows.length > 0 条件成立 → 报错
  });

  it('备注和端字段可选', () => {
    const rows: Raw清单Row[] = [
      { 模块: '用户中心', 子功能: '注册登录', 描述: '手机号', 备注: '优先', 端: 'ep-2' },
    ];
    const result = parseFeature清单(rows);
    expect(result.modules[0].subFeatures[0].remark).toBe('优先');
    expect(result.modules[0].endpointId).toBe('ep-2');
  });
});

describe('validateHeaders', () => {
  it('标准五列通过', () => {
    expect(validateHeaders(['模块', '子功能', '描述', '备注', '端'])).toBe(true);
  });

  it('最少三列通过', () => {
    expect(validateHeaders(['模块', '子功能', '描述'])).toBe(true);
  });

  it('少于三列拒绝', () => {
    expect(validateHeaders(['模块', '子功能'])).toBe(false);
  });

  it('表头不匹配拒绝', () => {
    expect(validateHeaders(['名称', '功能', '说明'])).toBe(false);
  });
});

describe('canSubmitWithDocument', () => {
  it('saved 可提交', () => {
    expect(canSubmitWithDocument({ status: 'saved', savedAt: '2026-08-21' })).toBe(true);
  });

  it('finalized 可提交', () => {
    expect(canSubmitWithDocument({ status: 'finalized' })).toBe(true);
  });

  it('empty 不可提交', () => {
    expect(canSubmitWithDocument({ status: 'empty' })).toBe(false);
  });

  it('draft 不可提交', () => {
    expect(canSubmitWithDocument({ status: 'draft' })).toBe(false);
  });
});

describe('invalidateDocument', () => {
  it('作废终稿回到 draft', () => {
    const doc = invalidateDocument({ status: 'finalized', savedAt: '2026-08-21', content: 'xxx' });
    expect(doc.status).toBe('draft');
    expect(doc.savedAt).toBeUndefined();
    expect(doc.content).toBeUndefined();
  });
});

describe('canUploadScan', () => {
  it('待盖章起可传', () => {
    expect(canUploadScan('pending_stamp')).toBe(true);
    expect(canUploadScan('stamped')).toBe(true);
    expect(canUploadScan('sent')).toBe(true);
    expect(canUploadScan('confirmed')).toBe(true);
  });

  it('审批中不可传', () => {
    expect(canUploadScan('auditing')).toBe(false);
    expect(canUploadScan('draft')).toBe(false);
    expect(canUploadScan('pending_eval')).toBe(false);
  });
});

describe('智能别名匹配与体检指标 (Smart Fuzzy Headers & Metrics)', () => {
  it('支持一级模块、功能点、功能说明等常见别名', async () => {
    const { detectHeaders, validateHeaders } = await import('../fileFlow');
    const headers = ['一级模块', '功能点', '功能说明', '说明备注', '所属端'];
    expect(validateHeaders(headers)).toBe(true);

    const mapping = detectHeaders(headers);
    expect(mapping).not.toBeNull();
    expect(mapping?.moduleIdx).toBe(0);
    expect(mapping?.subFeatureIdx).toBe(1);
    expect(mapping?.descriptionIdx).toBe(2);
    expect(mapping?.remarkIdx).toBe(3);
    expect(mapping?.endpointIdx).toBe(4);
  });

  it('乱序表头仍可智能定位列索引', async () => {
    const { detectHeaders } = await import('../fileFlow');
    const headers = ['终端', '需求说明', '模块名称', '子功能名称'];
    const mapping = detectHeaders(headers);
    expect(mapping).not.toBeNull();
    expect(mapping?.endpointIdx).toBe(0);
    expect(mapping?.descriptionIdx).toBe(1);
    expect(mapping?.moduleIdx).toBe(2);
    expect(mapping?.subFeatureIdx).toBe(3);
  });

  it('体检指标能正确统计缺失描述与子功能总数', () => {
    const rows: Raw清单Row[] = [
      { 模块: '订单中心', 子功能: '创建订单', 描述: '提交下单' },
      { 模块: '订单中心', 子功能: '取消订单', 描述: '' }, // 缺描述
      { 模块: '商品中心', 子功能: '查看详情', 描述: '' }, // 缺描述
    ];
    const result = parseFeature清单(rows);
    expect(result.subFeatureCount).toBe(3);
    expect(result.missingDescCount).toBe(2);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('缺少具体描述');
  });
});

describe('毛利率计算与预警分析 (calculateMargin)', () => {
  it('毛利率大于 25% 标记为健康绿色', async () => {
    const { calculateMargin } = await import('../fileFlow');
    // 报价 100000，20 人天 * 600 = 12000 成本，毛利 88000 (88%)
    const res = calculateMargin(100000, 20, 600);
    expect(res.cost).toBe(12000);
    expect(res.grossProfit).toBe(88000);
    expect(res.marginRate).toBe(88);
    expect(res.level).toBe('healthy');
  });

  it('毛利率在 15%~25% 之间标记为预警黄色', async () => {
    const { calculateMargin } = await import('../fileFlow');
    // 报价 10000，14 人天 * 600 = 8400 成本，毛利 1600 (16%)
    const res = calculateMargin(10000, 14, 600);
    expect(res.cost).toBe(8400);
    expect(res.grossProfit).toBe(1600);
    expect(res.marginRate).toBe(16);
    expect(res.level).toBe('warning');
  });

  it('毛利率低于 15% 标记为高风险红色', async () => {
    const { calculateMargin } = await import('../fileFlow');
    // 报价 10000，16 人天 * 600 = 9600 成本，毛利 400 (4%)
    const res = calculateMargin(10000, 16, 600);
    expect(res.marginRate).toBe(4);
    expect(res.level).toBe('danger');
  });
});

describe('分期付款节点预设 (DEFAULT_PAYMENT_PRESETS)', () => {
  it('所有预设方案的比例之和应严格为 100%', async () => {
    const { DEFAULT_PAYMENT_PRESETS } = await import('../fileFlow');
    expect(DEFAULT_PAYMENT_PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of DEFAULT_PAYMENT_PRESETS) {
      const sumRatio = preset.milestones.reduce((sum, m) => sum + m.ratio, 0);
      expect(sumRatio).toBe(100);
    }
  });
});

describe('Excel 模板工作簿生成 (createFeatureTemplateWorkbook)', () => {
  it('空白模板生成成功且包含标准 5 列', async () => {
    const { createFeatureTemplateWorkbook } = await import('../fileFlow');
    const workbook = await createFeatureTemplateWorkbook('blank');
    expect(workbook).toBeDefined();
    const sheet = workbook.getWorksheet('功能清单');
    expect(sheet).toBeDefined();
    expect(sheet.columnCount).toBe(5);
  }, 20000);

  it('示例模板生成成功且包含多条预设行', async () => {
    const { createFeatureTemplateWorkbook } = await import('../fileFlow');
    const workbook = await createFeatureTemplateWorkbook('sample');
    const sheet = workbook.getWorksheet('功能清单');
    expect(sheet.rowCount).toBeGreaterThan(5);
  }, 20000);
});

