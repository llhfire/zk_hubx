// 文件流转纯函数层
// 清单解析（Excel 五列→两级功能清单）、在线文档状态、扫描件校验

import type { FeatureModule, FeatureSubFeature } from './types';

// ─── 清单解析 ─────────────────────────────────────────────

/** Excel 清单行（五列原始数据） */
export interface Raw清单Row {
  模块: string;
  子功能: string;
  描述: string;
  备注?: string;
  端?: string;
}

/** 解析错误 */
export interface ParseError {
  row: number;
  message: string;
}

/** 解析结果（包含多维度体检指标） */
export interface ParseResult {
  modules: FeatureModule[];
  errors: ParseError[];
  warnings: string[];
  totalRows: number;
  subFeatureCount: number;
  missingDescCount: number;
  endpointSummary: Record<string, number>;
}

/**
 * 表头别名模糊匹配词典
 * 覆盖客户/技术常见的各种口语化与缩写表头
 */
export const HEADER_ALIASES = {
  module: ['模块', '一级模块', '模块名称', '系统模块', '功能模块', '一级功能', '业务模块', 'module'],
  subFeature: ['子功能', '二级功能', '子功能名称', '功能点', '功能项', '细分功能', 'subfeature', 'sub_feature'],
  description: ['描述', '功能描述', '详细描述', '需求说明', '功能说明', 'description', 'desc'],
  remark: ['备注', '开发备注', '说明备注', 'remark', 'notes', 'note'],
  endpoint: ['端', '终端', '所属端', '客户端', '平台', 'endpoint', 'platform'],
} as const;

/** 智能检测表头映射 */
export function detectHeaders(headers: string[]): {
  moduleIdx: number;
  subFeatureIdx: number;
  descriptionIdx: number;
  remarkIdx: number;
  endpointIdx: number;
} | null {
  const cleanHeaders = headers.map(h => (h ? String(h).trim().toLowerCase() : ''));

  const findIdx = (aliases: readonly string[]): number => {
    return cleanHeaders.findIndex(h => aliases.some(alias => alias.toLowerCase() === h));
  };

  const moduleIdx = findIdx(HEADER_ALIASES.module);
  const subFeatureIdx = findIdx(HEADER_ALIASES.subFeature);
  const descriptionIdx = findIdx(HEADER_ALIASES.description);
  const remarkIdx = findIdx(HEADER_ALIASES.remark);
  const endpointIdx = findIdx(HEADER_ALIASES.endpoint);

  // 核心三列：模块、子功能、描述 必须能识别到
  if (moduleIdx === -1 || subFeatureIdx === -1 || descriptionIdx === -1) {
    return null;
  }

  return {
    moduleIdx,
    subFeatureIdx,
    descriptionIdx,
    remarkIdx,
    endpointIdx,
  };
}

/**
 * 校验 Excel 第一行表头是否匹配（支持精确匹配和智能别名模糊匹配）
 */
export function validateHeaders(actual: string[]): boolean {
  if (actual.length < 3) return false;
  // 1. 优先兼容原有的严格前三列校验
  if (
    actual[0]?.trim() === '模块' &&
    actual[1]?.trim() === '子功能' &&
    actual[2]?.trim() === '描述'
  ) {
    return true;
  }
  // 2. 智能别名匹配
  return detectHeaders(actual) !== null;
}

/**
 * 从五列原始数据解析为两级功能清单。
 * 规则：
 * - 模块 + 子功能 必填，缺一报错
 * - 同一模块名下的子功能归为一组
 * - 空行跳过
 * - 0 行有效数据返回空 modules + 错误
 * - 统计缺失描述、端分布与潜在警告
 */
export function parseFeature清单(rows: Raw清单Row[]): ParseResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const moduleMap = new Map<string, FeatureModule>();
  const endpointSummary: Record<string, number> = {};

  let validRows = 0;
  let missingDescCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel 行号（第 1 行是表头）

    // 跳过全空行
    if (!row.模块?.trim() && !row.子功能?.trim()) continue;

    if (!row.模块?.trim()) {
      errors.push({ row: rowNum, message: '模块名称不能为空' });
      continue;
    }
    if (!row.子功能?.trim()) {
      errors.push({ row: rowNum, message: '子功能名称不能为空' });
      continue;
    }

    const moduleName = row.模块.trim();
    const subName = row.子功能.trim();
    const ep = row.端?.trim() || '通用端';

    endpointSummary[ep] = (endpointSummary[ep] || 0) + 1;

    if (!row.描述?.trim()) {
      missingDescCount++;
    }

    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, {
        id: `mod-${moduleMap.size + 1}`,
        name: moduleName,
        sort: moduleMap.size + 1,
        subFeatures: [],
        endpointId: row.端?.trim() || 'ep-1',
      });
    }

    const module = moduleMap.get(moduleName)!;
    const subId = `sub-${module.id}-${module.subFeatures.length + 1}`;
    const sub: FeatureSubFeature = {
      id: subId,
      name: subName,
      description: row.描述?.trim() || '',
      remark: row.备注?.trim() || undefined,
    };
    module.subFeatures.push(sub);
    validRows++;
  }

  if (validRows === 0 && rows.length > 0) {
    errors.push({ row: 0, message: '清单无有效数据行' });
  }

  if (missingDescCount > 0) {
    warnings.push(`共有 ${missingDescCount} 项功能缺少具体描述，建议补充以防技术评估产生分歧`);
  }

  const modules = Array.from(moduleMap.values());
  const subFeatureCount = modules.reduce((sum, m) => sum + m.subFeatures.length, 0);

  return {
    modules,
    errors,
    warnings,
    totalRows: validRows,
    subFeatureCount,
    missingDescCount,
    endpointSummary,
  };
}

// ─── Excel 模板体系 ──────────────────────────────────────────

/**
 * 示例模板预设数据（电商与营销平台典型需求）
 */
export const SAMPLE_TEMPLATE_ROWS: Raw清单Row[] = [
  {
    模块: '用户与权限中心',
    子功能: '手机号快捷登录与注册',
    描述: '支持短信验证码一键登录、新用户注册自动绑定基础角色并生成会员号',
    备注: '支持腾讯云短信服务对接',
    端: '移动端 (H5/小程序)',
  },
  {
    模块: '用户与权限中心',
    子功能: '个人资料与安全设置',
    描述: '用户头像裁剪上传、修改昵称、绑定微信号、注销账号协议确认',
    备注: '遵循个人信息保护法要求',
    端: '移动端 (H5/小程序)',
  },
  {
    模块: '商品与类目管理',
    子功能: '多规格商品发布与维护',
    描述: '商品类目三级联动、SPU/SKU 笛卡尔积组合规格（颜色/尺码）、阶梯价格与库存配置',
    备注: '支持富文本详情图批量上传',
    端: '管理后台 (PC)',
  },
  {
    模块: '商品与类目管理',
    子功能: '商品全文检索与筛选',
    描述: '商品列表支持按关键词、价格区间、销量升降序、分类标签多维度实时过滤检索',
    备注: '初期可使用数据库模糊查询，后期支持 ES',
    端: '移动端 (H5/小程序)',
  },
  {
    模块: '订单与支付结算',
    子功能: '购物车加购与结算',
    描述: '单品与多品批量加购、失效商品提醒、优惠券自动匹配最优抵扣、总价实时试算',
    备注: '高并发防超卖锁单机制',
    端: '移动端 (H5/小程序)',
  },
  {
    模块: '订单与支付结算',
    子功能: '微信与支付宝收单',
    描述: '调用微信支付与支付宝 Native/JSAPI 接口，支持订单倒计时关闭与异步退款处理',
    备注: '需提前申请商户服务号与秘钥',
    端: '移动端 (H5/小程序)',
  },
];

/**
 * 创建标准 Excel 工作簿
 */
export async function createFeatureTemplateWorkbook(mode: 'blank' | 'sample'): Promise<any> {
  const ExcelJSModule = await import('exceljs');
  const WorkbookClass = (ExcelJSModule as any).Workbook || (ExcelJSModule as any).default?.Workbook || ExcelJSModule;
  const workbook = new WorkbookClass();

  workbook.creator = 'ZK-HubX 商务报价引擎';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('功能清单', {
    views: [{ showGridLines: true }],
  });

  // 表头定义与列宽
  sheet.columns = [
    { header: '模块', key: 'module', width: 22 },
    { header: '子功能', key: 'subFeature', width: 28 },
    { header: '描述', key: 'description', width: 48 },
    { header: '备注', key: 'remark', width: 26 },
    { header: '端', key: 'endpoint', width: 22 },
  ];

  // 美化表头样式（现代深青蓝色 + 白字加粗居中）
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell: any) => {
    cell.font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF165DFF' }, // Arco Primary 颜色
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E6EB' } },
      bottom: { style: 'medium', color: { argb: 'FF0E42D2' } },
      left: { style: 'thin', color: { argb: 'FFE5E6EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E6EB' } },
    };
  });

  // 写入数据行
  const rowsToWrite = mode === 'sample' ? SAMPLE_TEMPLATE_ROWS : [];

  rowsToWrite.forEach((row) => {
    const r = sheet.addRow({
      module: row.模块,
      subFeature: row.子功能,
      description: row.描述,
      remark: row.备注 ?? '',
      endpoint: row.端 ?? '',
    });
    r.height = 24;
    r.eachCell((cell: any) => {
      cell.font = { name: 'Microsoft YaHei', size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E6EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E6EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E6EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E6EB' } },
      };
    });
  });

  // 如果是空白模板，留出 5 行空单元格并设置网格线边框，以便用户直接填入
  if (mode === 'blank') {
    for (let i = 0; i < 5; i++) {
      const emptyRow = sheet.addRow(['', '', '', '', '']);
      emptyRow.height = 24;
      emptyRow.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.font = { name: 'Microsoft YaHei', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFF2F3F5' } },
          bottom: { style: 'thin', color: { argb: 'FFF2F3F5' } },
          left: { style: 'thin', color: { argb: 'FFF2F3F5' } },
          right: { style: 'thin', color: { argb: 'FFF2F3F5' } },
        };
      });
    }
  }

  return workbook;
}

/**
 * 触发浏览器端下载 Excel 模板
 */
export async function downloadFeatureTemplate(mode: 'blank' | 'sample'): Promise<void> {
  const workbook = await createFeatureTemplateWorkbook(mode);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `标准功能清单模板_${mode === 'sample' ? '带示例' : '空白'}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── 商务底线成本与毛利预警（对齐 ADR-0014） ────────────────────────

export interface MarginAnalysis {
  cost: number;
  grossProfit: number;
  marginRate: number;
  level: 'danger' | 'warning' | 'healthy';
  label: string;
}

/**
 * 计算报价毛利率与风险预警
 * @param quoteAmount 商务报价总额（元）
 * @param totalDays 评估总人天
 * @param dailyCost 默认岗位基准日成本（元/天，默认 600）
 */
export function calculateMargin(
  quoteAmount: number = 0,
  totalDays: number = 0,
  dailyCost: number = 600,
): MarginAnalysis {
  const cost = Math.max(0, totalDays * dailyCost);
  const grossProfit = quoteAmount - cost;
  const marginRate = quoteAmount > 0 ? (grossProfit / quoteAmount) * 100 : (cost > 0 ? -100 : 0);

  let level: MarginAnalysis['level'] = 'healthy';
  let label = '健康';

  if (marginRate < 15) {
    level = 'danger';
    label = '亏损/极高风险 (毛利低于15%)';
  } else if (marginRate < 25) {
    level = 'warning';
    label = '偏低风险 (毛利在15%~25%之间)';
  } else {
    level = 'healthy';
    label = '良好 (毛利高于25%)';
  }

  return {
    cost: Math.round(cost),
    grossProfit: Math.round(grossProfit),
    marginRate: Number(marginRate.toFixed(1)),
    level,
    label,
  };
}

// ─── 分期付款节点预设（Payment Terms，严格落地 ADR-0014） ──────────────

export interface PaymentMilestone {
  name: string;
  ratio: number;
  note?: string;
}

export interface PaymentPlanPreset {
  id: string;
  name: string;
  description: string;
  milestones: PaymentMilestone[];
}

export const DEFAULT_PAYMENT_PRESETS: PaymentPlanPreset[] = [
  {
    id: 'standard-3331',
    name: '行业标准款 (3:3:3:1)',
    description: '首付 30% / 原型确认 30% / 终验上线 30% / 质保尾款 10%',
    milestones: [
      { name: '首期款（预付款）', ratio: 30, note: '合同签订后 3 个工作日内' },
      { name: '中期款（阶段验收）', ratio: 30, note: '原型与架构方案确认后' },
      { name: '终验款（上线交付）', ratio: 30, note: '系统试运行合格并签署终验报告' },
      { name: '质保金（质保期满）', ratio: 10, note: '系统免费维保期满后付清' },
    ],
  },
  {
    id: 'fast-532',
    name: '快捷交付款 (5:3:2)',
    description: '首付 50% / 预验收 30% / 交付尾款 20%',
    milestones: [
      { name: '预付款', ratio: 50, note: '合同签订后 3 个工作日内' },
      { name: '中期进度款', ratio: 30, note: '核心功能部署并演示通过' },
      { name: '交付结算款', ratio: 20, note: '交付全套源码与部署上线' },
    ],
  },
  {
    id: 'government-3421',
    name: '政企/国央企款 (3:4:2:1)',
    description: '首付 30% / 阶段交付 40% / 竣工初验 20% / 质保金 10%',
    milestones: [
      { name: '启动款', ratio: 30, note: '合同生效且方案开工报审通过' },
      { name: '开发进度款', ratio: 40, note: '项目主体开发完成并通过内部测试' },
      { name: '初验款', ratio: 20, note: '通过第三方测评并初验合格' },
      { name: '质保尾款', ratio: 10, note: '质保期（1年）届满无遗留质量问题' },
    ],
  },
  {
    id: 'half-55',
    name: '双阶段款 (5:5)',
    description: '首付 50% / 上线终验 50%',
    milestones: [
      { name: '预付款', ratio: 50, note: '合同签署后支付' },
      { name: '终验款', ratio: 50, note: '项目上线验收合格后支付' },
    ],
  },
];

// ─── 文件袋与流转附件（Dossier） ─────────────────────────────

export interface FileFlowAttachment {
  id: string;
  name: string;
  size?: number;
  url?: string;
  uploadedAt: string;
  uploadedBy?: string;
  category: 'feature_list' | 'tech_eval' | 'quotation_doc' | 'scan_copy' | 'other';
  note?: string;
}

// ─── 在线文档状态 ─────────────────────────────────────────

export type DocumentStatus = 'empty' | 'draft' | 'saved' | 'finalized';

export interface OnlineDocument {
  status: DocumentStatus;
  savedAt?: string;
  content?: string; // 终稿内容（标准件 + 表单 + 清单）
}

/** 是否可以送审（必须保存过） */
export function canSubmitWithDocument(doc: OnlineDocument): boolean {
  return doc.status === 'saved' || doc.status === 'finalized';
}

/** 退回改清单时作废终稿 */
export function invalidateDocument(doc: OnlineDocument): OnlineDocument {
  return { ...doc, status: 'draft', savedAt: undefined, content: undefined };
}

// ─── 扫描件 ──────────────────────────────────────────────

export interface ScanFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

/** 扫描件可上传的最早状态（待盖章起） */
export const SCAN_UPLOADABLE_STATUSES = ['pending_stamp', 'stamped', 'sent', 'confirmed'] as const;

export function canUploadScan(status: string): boolean {
  return (SCAN_UPLOADABLE_STATUSES as readonly string[]).includes(status);
}

// ─── 五列 Excel 表头配置 ──────────────────────────────────

export const EXPECTED_HEADERS = ['模块', '子功能', '描述', '备注', '端'] as const;

