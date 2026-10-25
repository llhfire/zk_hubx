// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { loadContractTemplates, saveContractTemplates } from '../templateStore';
import { renderContractDocument } from '../templates';
import type { ContractFormData } from '../types';

const formData: ContractFormData = {
  contractNo: 'ZKRT-TEST-001',
  contractName: '模板版本测试合同',
  productCategory: '软件开发',
  signingEntity: '中科软通',
  customerName: '测试客户',
  customerContact: '王经理',
  customerPhone: '13800000000',
  customerEmail: '',
  customerAddress: '',
  customerTaxNo: 'TEST-TAX-NO',
  bankName: '',
  bankAccount: '',
  contractContent: '测试服务内容',
  signDate: '2026-08-31',
  effectiveDate: '2026-09-01',
  endDate: '2026-12-01',
  paymentMethod: '对公',
  totalAmount: 10000,
  rebateAmount: 0,
  paymentPlans: [{ period: 1, expectedDate: '2026-09-01', condition: '合同签订', amount: 10000, percentage: 100 }],
  templateId: 'tpl-zkrt-software',
};

const storageMap = new Map<string, string>();
const storageMock: Storage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() { return storageMap.size; },
};
Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  configurable: true,
  writable: true,
});

describe('合同模板版本优先级', () => {
  beforeEach(() => storageMock.clear());

  it('管理员发布 V2 后使用 V2 内容，不再被内置中科软通 V1 覆盖', () => {
    const templates = loadContractTemplates();
    const index = templates.findIndex((item) => item.id === 'tpl-zkrt-software');
    const template = templates[index];
    const version2 = {
      id: 'tpl-zkrt-software-v2',
      versionNo: 2,
      html: '<h2>法务修订版 V2</h2><p>客户：{{customerName}}</p>',
      variables: ['customerName'],
      publishedAt: '2026-08-31T12:00:00.000Z',
      publishedBy: '法务管理员',
    };
    templates[index] = { ...template, versions: [...template.versions, version2] };
    saveContractTemplates(templates);

    const html = renderContractDocument({ ...formData, templateVersionId: version2.id });
    expect(html).toContain('法务修订版 V2');
    expect(html).toContain('测试客户');
    expect(html).not.toContain('第十九章　附则');
  });
});
