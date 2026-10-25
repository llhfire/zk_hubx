import { describe, expect, it } from 'vitest';
import { advanceSigningPackage, canAdvanceSigning, complianceSummary } from '../complianceModel';
import type { ElectronicSigningPackage } from '../types';

describe('sales compliance model', () => {
  it('签署演示只允许显式状态转换', () => {
    expect(canAdvanceSigning('pending', 'signing')).toBe(true);
    expect(canAdvanceSigning('pending', 'completed')).toBe(false);
    const pkg: ElectronicSigningPackage = { id: 'p1', status: 'pending', signers: [], deadline: '2026-09-10', createdAt: '2026-08-31', updatedAt: '2026-08-31', evidence: [] };
    expect(advanceSigningPackage(pkg, 'signing', '2026-09-01').status).toBe('signing');
    expect(() => advanceSigningPackage(pkg, 'completed')).toThrow();
  });

  it('合规摘要优先显示异常，其次缺失', () => {
    expect(complianceSummary([{ key: 'a', label: 'A', status: 'complete', source: '', detail: '' }, { key: 'b', label: 'B', status: 'missing', source: '', detail: '' }]).status).toBe('missing');
    expect(complianceSummary([{ key: 'a', label: 'A', status: 'anomaly', source: '', detail: '' }]).status).toBe('anomaly');
  });
});
