import { describe, expect, it } from 'vitest';
import { compareContractVersions } from '../contractVersionDiff';
import { buildInitialContracts } from '../mockData';

describe('contract version diff', () => {
  it('比较合同业务字段和模板版本', () => {
    const formData = structuredClone(buildInitialContracts()[0].current);
    const a = { versionNo: 'V1', formData, renderedHtml: '', label: '', createdAt: '', createdBy: '' };
    const b = { ...a, versionNo: 'V2', formData: { ...formData, totalAmount: formData.totalAmount + 1000, templateVersionId: 'tpl-v2' } };
    const diff = compareContractVersions(a, b);
    expect(diff.find((item) => item.key === 'amount')?.changed).toBe(true);
    expect(diff.find((item) => item.key === 'template')?.after).toBe('tpl-v2');
  });
});
