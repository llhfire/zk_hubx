import { afterEach, describe, expect, it } from 'vitest';
import {
  approveTrip,
  closeTrip,
  createTrip,
  deleteTrip,
  endTrip,
  getTripDetail,
  startTrip,
  submitTrip,
} from '../travel-api';

const TEST_ID = 'trip-lifecycle-test';

afterEach(async () => {
  if (await getTripDetail(TEST_ID)) await deleteTrip(TEST_ID);
});

describe('α 出差生命周期', () => {
  it('状态动作持续写回出差台账', async () => {
    await createTrip({
      id: TEST_ID,
      applicantName: '测试申请人',
      destinations: ['上海'],
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      days: 2,
    });

    expect((await submitTrip(TEST_ID)).status).toBe('pending');
    expect((await approveTrip(TEST_ID, 'approve', '同意')).status).toBe('approved');
    expect((await startTrip(TEST_ID)).status).toBe('in_progress');
    expect((await endTrip(TEST_ID)).status).toBe('to_reimburse');
    expect((await closeTrip(TEST_ID)).status).toBe('closed');
    expect((await getTripDetail(TEST_ID))?.status).toBe('closed');
  }, 10_000);
});
