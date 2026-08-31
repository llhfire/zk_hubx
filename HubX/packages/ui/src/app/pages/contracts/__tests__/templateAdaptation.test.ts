import { describe, expect, it } from 'vitest';
import { renderContractDocument } from '../templates';
import type { ContractFormData } from '../types';

const formData: ContractFormData = {
  contractNo: 'ZKRT202608001',
  contractName: '帕奇宠 C 端一期',
  productCategory: '软件开发',
  signingEntity: '中科软通',
  signingEntityTaxNo: '91420100MA4F26KK6B',
  signingPerson: '张三',
  signingEntityAddress: '武汉市东湖新技术开发区',
  signingEntityPhone: '027-00000000',
  signingEntityEmail: 'service@example.com',
  signingEntityPostalCode: '430000',
  signingEntityBankName: '中国农业银行股份有限公司武汉鲁巷支行',
  signingEntityBankAccount: '17039401040023942',
  customerName: '帕奇宠科技有限公司',
  customerContact: '王经理',
  customerPhone: '13800138000',
  customerEmail: 'customer@example.com',
  customerAddress: '武汉市洪山区',
  customerTaxNo: '91420000TEST000001',
  customerPostalCode: '430070',
  bankName: '招商银行武汉分行',
  bankAccount: '6225000000000000',
  contractContent: '完成 C 端小程序设计、开发、测试、上线与培训。',
  projectWorkDays: 45,
  prototypeConfirmDays: 3,
  acceptanceDays: 5,
  warrantyMonths: 12,
  maintenanceAnnualRate: 15,
  invoiceTaxRate: 6,
  invoiceContent: '生产生活服务*研发服务费',
  featureList: [{ endpoint: '用户端（微信小程序）', module: '宠物档案', feature: '档案详情', description: '查看宠物基础资料与健康记录' }],
  signDate: '2026-08-31',
  effectiveDate: '2026-09-01',
  endDate: '2026-11-15',
  paymentMethod: '对公',
  totalAmount: 100000,
  rebateAmount: 0,
  paymentPlans: [
    { period: 1, periodName: '首期款', expectedDate: '', condition: '合同签订后 3 个工作日内', amount: 30000, percentage: 30 },
    { period: 2, periodName: '二期款', expectedDate: '', condition: '项目交付前', amount: 60000, percentage: 60 },
    { period: 3, periodName: '验收款', expectedDate: '', condition: '验收完成后', amount: 10000, percentage: 10 },
  ],
  invoiceType: '专票',
  templateId: 'tpl-zkrt-software',
};

describe('中科软通合同模板适配', () => {
  it('覆盖 19 章、收付款信息和两个附件，并带入成交报价功能清单', () => {
    const html = renderContractDocument(formData);
    expect(html).toContain('技术服务合同');
    expect(html).toContain('第一章　合同说明');
    expect(html).toContain('第十九章　附则');
    expect(html).toContain('中国农业银行股份有限公司武汉鲁巷支行');
    expect(html).toContain('合同签订后 3 个工作日内');
    expect(html).toContain('附件一：《项目组成清单》');
    expect(html).toContain('档案详情');
    expect(html).toContain('附件二：《需求变更备忘录》');
    expect(html).toContain('测试不通过项占比不高于全部测试项的 5%');
    expect(html).toContain('0.05%（万分之五）');
    expect(html).toContain('原告住所地');
    expect(html).toContain('以附件约定为准');
  });

  it('其他签约主体不会套用中科软通 19 章专属合同', () => {
    const html = renderContractDocument({ ...formData, signingEntity: '中科软艺', templateId: 'software_sales' });
    expect(html).toContain('服务内容');
    expect(html).not.toContain('第十九章　附则');
    expect(html).toContain('中科软艺');
  });
});
