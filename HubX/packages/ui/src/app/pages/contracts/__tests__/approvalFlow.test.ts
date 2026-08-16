import { describe, expect, it } from 'vitest';
import { createInitialApprovalFlow } from '../ContractsContext';

describe('createInitialApprovalFlow', () => {
  it('creates a general-manager-only flow for project contract records', () => {
    expect(createInitialApprovalFlow('general-manager')).toEqual([
      { step: '发起申请', approver: '张三', status: 'pending', time: '', comment: '' },
      { step: '总经理审批', approver: '赵总 - 总经理', status: 'pending', time: '', comment: '' },
    ]);
  });

  it('defaults to the general-manager single-node flow', () => {
    expect(createInitialApprovalFlow()).toEqual([
      { step: '发起申请', approver: '张三', status: 'pending', time: '', comment: '' },
      { step: '总经理审批', approver: '赵总 - 总经理', status: 'pending', time: '', comment: '' },
    ]);
  });
});
