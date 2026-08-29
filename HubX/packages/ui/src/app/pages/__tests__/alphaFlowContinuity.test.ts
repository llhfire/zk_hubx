import { describe, expect, test } from 'vitest';
import {
  acceptDelivery,
  archiveDeliveryArtifacts,
  buildAfterSalesHandoff,
  emptyDeliveryClosure,
  isAfterSalesHandoffReady,
  submitDeliveryAcceptance,
} from '../alphaFlowContinuity';

describe('α 后半程流程接缝', () => {
  test('交付物未归档时不能提交验收，且验收必须先提交再确认', () => {
    const initial = emptyDeliveryClosure('project-1');
    expect(submitDeliveryAcceptance(initial, '2026-08-28')).toEqual(initial);
    expect(acceptDelivery(initial, '2026-08-28')).toEqual(initial);

    const archived = archiveDeliveryArtifacts(initial, '2026-08-28');
    const submitted = submitDeliveryAcceptance(archived, '2026-08-29');
    const accepted = acceptDelivery(submitted, '2026-08-30');
    expect(accepted).toMatchObject({ artifactStatus: 'archived', acceptanceStatus: 'accepted', acceptedAt: '2026-08-30' });
  });

  test('售后移交要求无逾期、全额回款、全额开票且没有开票中记录', () => {
    expect(isAfterSalesHandoffReady({ receivedRate: 100, invoicedRate: 100, overdueCount: 0, invoiceStatuses: ['已开票'] })).toBe(true);
    expect(isAfterSalesHandoffReady({ receivedRate: 100, invoicedRate: 100, overdueCount: 1, invoiceStatuses: ['已开票'] })).toBe(false);
    expect(isAfterSalesHandoffReady({ receivedRate: 100, invoicedRate: 100, overdueCount: 0, invoiceStatuses: ['已冲红', '开票中'] })).toBe(false);
  });

  test('移交售后默认生成六个月维护期', () => {
    expect(buildAfterSalesHandoff({ contractId: 'c-1', contractNo: 'HT-001', projectName: 'CRM', customerName: '甲方', handedOffAt: '2026-08-28' }))
      .toMatchObject({ id: 'handoff-c-1', maintenanceEnd: '2027-02-28' });
  });
});
