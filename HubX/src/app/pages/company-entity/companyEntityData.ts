export type CompanyFileType = 'pdf' | 'pptx' | 'doc' | 'docx';
export type CompanyFileCategory = '公司资料' | '合同模板';

export interface CompanyEntityFile {
  id: string;
  name: string;
  type: CompanyFileType;
  category?: CompanyFileCategory;
  contractTemplateId?: string;
  size: string;
  updatedAt: string;
  description: string;
}

export interface CompanyPublicAccount {
  id: string;
  accountNo: string;
  bankName: string;
}

export interface CompanyEntityRecord {
  id: string;
  name: string;
  shortName: string;
  taxNumber: string;
  legalPerson: string;
  registeredCapital: string;
  address: string;
  contactPhone: string;
  email?: string;
  contractNoPrefix?: string;
  status: '启用' | '禁用';
  createTime: string;
  invoiceTitle: string;
  invoiceTaxNumber: string;
  invoiceBankName: string;
  invoiceBankAccount: string;
  invoiceAddress: string;
  invoicePhone: string;
  publicAccounts: CompanyPublicAccount[];
  files: CompanyEntityFile[];
}

export interface CompanyEntityPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  files: boolean;
}

export const companyEntityPermissions: CompanyEntityPermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  files: true,
};

export const mockCompanyEntities: CompanyEntityRecord[] = [
  {
    id: '1',
    name: '中科软通（武汉）科技有限公司',
    shortName: '中科软通',
    taxNumber: '91110000123456789A',
    legalPerson: '张三',
    registeredCapital: '1000万元',
    address: '北京市海淀区中关村大街1号',
    contactPhone: '010-88888888',
    contractNoPrefix: 'ZKRT',
    status: '启用',
    createTime: '2020-01-01',
    invoiceTitle: '中科软通（武汉）科技有限公司',
    invoiceTaxNumber: '91110000123456789A',
    invoiceBankName: '中国工商银行北京海淀支行',
    invoiceBankAccount: '0200001234567890123',
    invoiceAddress: '北京市海淀区中关村大街1号',
    invoicePhone: '010-88888888',
    publicAccounts: [
      { id: 'public-account-1', accountNo: '0200001234567890123', bankName: '中国工商银行北京海淀支行' },
      { id: 'public-account-2', accountNo: '0200002345678901234', bankName: '中国建设银行北京朝阳支行' },
    ],
    files: [
      {
        id: 'pdf-1',
        name: '中科软通公司介绍.pdf',
        type: 'pdf',
        size: '2.4MB',
        updatedAt: '2026-05-01',
        description: '用于方案附件的不可编辑公司介绍资料',
      },
      {
        id: 'pptx-1',
        name: '中科软通方案模板.pptx',
        type: 'pptx',
        size: '6.8MB',
        updatedAt: '2026-05-06',
        description: '用于方案和报价的可编辑模板',
      },
      {
        id: 'contract-template-1',
        name: '中科软通合同模板.docx',
        type: 'docx',
        category: '合同模板',
        contractTemplateId: 'software_sales',
        size: '156KB',
        updatedAt: '2026-07-27',
        description: '中科软通签约主体合同模板',
      },
    ],
  },
  {
    id: '2',
    name: '中科软艺（武汉）科技有限公司',
    shortName: '中科软艺',
    taxNumber: '91110000234567890B',
    legalPerson: '李四',
    registeredCapital: '500万元',
    address: '北京市朝阳区建国路2号',
    contactPhone: '010-99999999',
    contractNoPrefix: 'ZKRY',
    status: '启用',
    createTime: '2021-06-15',
    invoiceTitle: '中科软艺（武汉）科技有限公司',
    invoiceTaxNumber: '91110000234567890B',
    invoiceBankName: '中国建设银行北京朝阳支行',
    invoiceBankAccount: '0200002345678901234',
    invoiceAddress: '北京市朝阳区建国路2号',
    invoicePhone: '010-99999999',
    publicAccounts: [],
    files: [
      {
        id: 'pdf-2',
        name: '中科软艺资质文件.pdf',
        type: 'pdf',
        size: '1.9MB',
        updatedAt: '2026-04-22',
        description: '用于报价附件的不可编辑资质资料',
      },
      {
        id: 'pptx-2',
        name: '中科软艺报价模板.pptx',
        type: 'pptx',
        size: '5.2MB',
        updatedAt: '2026-04-28',
        description: '用于报价和方案的可编辑模板',
      },
    ],
  },
  {
    id: '3',
    name: '武汉软艺信息技术有限公司',
    shortName: '武汉软艺',
    taxNumber: '91420100WHRY202601',
    legalPerson: '王五',
    registeredCapital: '500万元',
    address: '武汉市东湖新技术开发区光谷大道1号',
    contactPhone: '027-88000001',
    contractNoPrefix: 'WHRY',
    status: '启用',
    createTime: '2026-07-27',
    invoiceTitle: '武汉软艺信息技术有限公司',
    invoiceTaxNumber: '91420100WHRY202601',
    invoiceBankName: '中国工商银行武汉光谷支行',
    invoiceBankAccount: '4202000100000000001',
    invoiceAddress: '武汉市东湖新技术开发区光谷大道1号',
    invoicePhone: '027-88000001',
    publicAccounts: [
      { id: 'public-account-3', accountNo: '4202000100000000001', bankName: '中国工商银行武汉光谷支行' },
    ],
    files: [
      {
        id: 'contract-template-3',
        name: '武汉软艺合同模板.docx',
        type: 'docx',
        category: '合同模板',
        contractTemplateId: 'software_sales',
        size: '152KB',
        updatedAt: '2026-07-27',
        description: '武汉软艺签约主体合同模板',
      },
    ],
  },
  {
    id: '4',
    name: '中科软齐（武汉）科技有限公司',
    shortName: '中科软齐',
    taxNumber: '91420100ZKRQ202602',
    legalPerson: '赵六',
    registeredCapital: '500万元',
    address: '武汉市洪山区珞喻路2号',
    contactPhone: '027-88000002',
    contractNoPrefix: 'ZKRQ',
    status: '启用',
    createTime: '2026-07-27',
    invoiceTitle: '中科软齐（武汉）科技有限公司',
    invoiceTaxNumber: '91420100ZKRQ202602',
    invoiceBankName: '中国建设银行武汉洪山支行',
    invoiceBankAccount: '4202000200000000002',
    invoiceAddress: '武汉市洪山区珞喻路2号',
    invoicePhone: '027-88000002',
    publicAccounts: [
      { id: 'public-account-4', accountNo: '4202000200000000002', bankName: '中国建设银行武汉洪山支行' },
    ],
    files: [
      {
        id: 'contract-template-4',
        name: '中科软齐合同模板.docx',
        type: 'docx',
        category: '合同模板',
        contractTemplateId: 'service_contract',
        size: '148KB',
        updatedAt: '2026-07-27',
        description: '中科软齐签约主体合同模板',
      },
    ],
  },
  {
    id: '5',
    name: '中科软盈（武汉）科技有限公司',
    shortName: '中科软盈',
    taxNumber: '91420100ZKRY202603',
    legalPerson: '钱七',
    registeredCapital: '500万元',
    address: '武汉市武昌区中北路3号',
    contactPhone: '027-88000003',
    contractNoPrefix: 'ZKRY',
    status: '启用',
    createTime: '2026-07-27',
    invoiceTitle: '中科软盈（武汉）科技有限公司',
    invoiceTaxNumber: '91420100ZKRY202603',
    invoiceBankName: '中国银行武汉武昌支行',
    invoiceBankAccount: '4202000300000000003',
    invoiceAddress: '武汉市武昌区中北路3号',
    invoicePhone: '027-88000003',
    publicAccounts: [
      { id: 'public-account-5', accountNo: '4202000300000000003', bankName: '中国银行武汉武昌支行' },
    ],
    files: [
      {
        id: 'contract-template-5',
        name: '中科软盈合同模板.docx',
        type: 'docx',
        category: '合同模板',
        contractTemplateId: 'cloud_service',
        size: '150KB',
        updatedAt: '2026-07-27',
        description: '中科软盈签约主体合同模板',
      },
    ],
  },
  {
    id: '6',
    name: '中科网联（武汉）信息技术有限公司',
    shortName: '中科网联',
    taxNumber: '91420100ZKWL202604',
    legalPerson: '孙八',
    registeredCapital: '500万元',
    address: '武汉市江夏区高新六路4号',
    contactPhone: '027-88000004',
    contractNoPrefix: 'ZKWL',
    status: '启用',
    createTime: '2026-07-27',
    invoiceTitle: '中科网联（武汉）信息技术有限公司',
    invoiceTaxNumber: '91420100ZKWL202604',
    invoiceBankName: '招商银行武汉光谷支行',
    invoiceBankAccount: '4202000400000000004',
    invoiceAddress: '武汉市江夏区高新六路4号',
    invoicePhone: '027-88000004',
    publicAccounts: [
      { id: 'public-account-6', accountNo: '4202000400000000004', bankName: '招商银行武汉光谷支行' },
    ],
    files: [
      {
        id: 'contract-template-6',
        name: '中科网联合同模板.docx',
        type: 'docx',
        category: '合同模板',
        contractTemplateId: 'service_contract',
        size: '149KB',
        updatedAt: '2026-07-27',
        description: '中科网联签约主体合同模板',
      },
    ],
  },
];

const contractSigningEntityShortNames = ['武汉软艺', '中科软齐', '中科软通', '中科软盈', '中科网联'];

export const contractSigningEntities = contractSigningEntityShortNames.map((shortName) => (
  mockCompanyEntities.find((item) => item.shortName === shortName)!
));

export function findCompanyEntityByName(name: string) {
  return mockCompanyEntities.find((item) => item.shortName === name || item.name === name);
}

export function getCompanyContractTemplate(signingEntity: string) {
  return findCompanyEntityByName(signingEntity)?.files.find((file) => file.category === '合同模板');
}

export function updateMockCompanyEntity(id: string, values: Partial<CompanyEntityRecord>) {
  const entity = mockCompanyEntities.find((item) => item.id === id);
  if (entity) Object.assign(entity, values);
}

export function addMockCompanyEntity(entity: CompanyEntityRecord) {
  mockCompanyEntities.push(entity);
}

export function getContractNumberPrefix(signingEntity: string) {
  return findCompanyEntityByName(signingEntity)?.contractNoPrefix ?? 'CT';
}
