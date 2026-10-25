export type ContractTemplateStatus = 'draft' | 'published' | 'disabled';

export interface ContractTemplateVersionRecord {
  id: string;
  versionNo: number;
  html: string;
  variables: string[];
  publishedAt: string;
  publishedBy: string;
}

export interface VersionedContractTemplate {
  id: string;
  name: string;
  signingEntity: string;
  productCategories: string[];
  status: ContractTemplateStatus;
  isDefault: boolean;
  draftHtml: string;
  versions: ContractTemplateVersionRecord[];
  updatedAt: string;
}

export const CONTRACT_TEMPLATE_VARIABLES = [
  'contractName', 'contractNo', 'customerName', 'customerContact', 'customerPhone', 'customerTaxNo',
  'customerAddress', 'customerEmail', 'customerPostalCode', 'bankName', 'bankAccount',
  'signingEntity', 'signingEntityTaxNo', 'signingPerson', 'signingEntityAddress', 'signingEntityPhone',
  'signingEntityEmail', 'signingEntityPostalCode', 'signingEntityBankName', 'signingEntityBankAccount',
  'signDate', 'effectiveDate', 'endDate', 'totalAmount', 'contractContent',
] as const;

const STORAGE_KEY = 'hubx-contract-template-library-v1';
const DEFAULT_BODY = `<h2>第一条 项目内容</h2><p>{{contractContent}}</p><h2>第二条 合同金额</h2><p>本合同总金额为人民币 {{totalAmount}} 元。</p><h2>第三条 合同期限</h2><p>自 {{effectiveDate}} 起至 {{endDate}} 止。</p><h2>第四条 其他</h2><p>甲方：{{customerName}}；乙方：{{signingEntity}}。未尽事宜由双方另行书面约定。</p>`;

const ZKRT_TEMPLATE_BODY = `<h2>中科软通技术服务合同</h2><p>项目：{{contractName}}；合同编号：{{contractNo}}</p><p>甲方：{{customerName}}；乙方：{{signingEntity}}</p><h3>十九章标准正文</h3><p>{{contractContent}}</p><h3>附件一：项目组成清单</h3><p>由成交报价功能清单自动带入。</p><h3>附件二：需求变更备忘录</h3><p>保留变更内容、价格和双方签章字段。</p>`;

const seed: VersionedContractTemplate[] = [
  { id: 'tpl-zkrt-software', name: '中科软通技术服务合同（Word 模板）', signingEntity: '中科软通', productCategories: ['软件开发', '系统集成'], status: 'published', isDefault: true, draftHtml: ZKRT_TEMPLATE_BODY, versions: [{ id: 'tpl-zkrt-software-v1', versionNo: 1, html: ZKRT_TEMPLATE_BODY, variables: ['contractName', 'contractNo', 'customerName', 'signingEntity', 'contractContent'], publishedAt: '2026-08-31T10:01:00.000Z', publishedBy: '黄海' }], updatedAt: '2026-08-31T10:01:00.000Z' },
  { id: 'tpl-zkry-service', name: '技术服务合同', signingEntity: '中科软盈', productCategories: ['技术服务'], status: 'published', isDefault: true, draftHtml: DEFAULT_BODY, versions: [{ id: 'tpl-zkry-service-v1', versionNo: 1, html: DEFAULT_BODY, variables: ['contractContent', 'totalAmount', 'effectiveDate', 'endDate', 'customerName', 'signingEntity'], publishedAt: '2026-08-01T09:00:00.000Z', publishedBy: '黄海' }], updatedAt: '2026-08-01T09:00:00.000Z' },
  { id: 'tpl-zkwl-cloud', name: '云服务订阅合同', signingEntity: '中科网联', productCategories: ['云服务'], status: 'draft', isDefault: false, draftHtml: DEFAULT_BODY, versions: [], updatedAt: '2026-08-20T09:00:00.000Z' },
];

export function loadContractTemplates(): VersionedContractTemplate[] {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as VersionedContractTemplate[];
    const zkrtSeed = seed.find((item) => item.id === 'tpl-zkrt-software');
    return parsed.map((item) => (
      item.id === 'tpl-zkrt-software' && item.name === '软件开发服务合同' && zkrtSeed
        ? zkrtSeed
        : item
    ));
  } catch {
    return seed;
  }
}

export function saveContractTemplates(templates: VersionedContractTemplate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function extractTemplateVariables(html: string): string[] {
  const matches = Array.from(html.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g), (match) => match[1]);
  return Array.from(new Set(matches));
}

export function validateTemplateVariables(html: string) {
  const variables = extractTemplateVariables(html);
  const invalid = variables.filter((variable) => !CONTRACT_TEMPLATE_VARIABLES.includes(variable as typeof CONTRACT_TEMPLATE_VARIABLES[number]));
  return { variables, invalid };
}

export function publishContractTemplate(template: VersionedContractTemplate, actor: string, now = new Date().toISOString()): VersionedContractTemplate {
  const validation = validateTemplateVariables(template.draftHtml);
  if (validation.invalid.length) throw new Error(`存在未授权变量：${validation.invalid.join('、')}`);
  const versionNo = Math.max(0, ...template.versions.map((item) => item.versionNo)) + 1;
  return {
    ...template,
    status: 'published',
    versions: [...template.versions, { id: `${template.id}-v${versionNo}`, versionNo, html: template.draftHtml, variables: validation.variables, publishedAt: now, publishedBy: actor }],
    updatedAt: now,
  };
}

export function findPublishedTemplate(templateId: string, versionId?: string): ContractTemplateVersionRecord | undefined {
  const template = loadContractTemplates().find((item) => item.id === templateId);
  if (!template) return undefined;
  return versionId ? template.versions.find((version) => version.id === versionId) : template.versions.at(-1);
}

export function findDefaultContractTemplate(signingEntity: string, productCategory: string): VersionedContractTemplate | undefined {
  return loadContractTemplates().find((template) => template.status === 'published' && template.isDefault && template.signingEntity === signingEntity && template.productCategories.includes(productCategory));
}
