import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ContractModificationPanel } from './ContractModificationPanel';

describe('ContractModificationPanel actions', () => {
  test('未创建合同时显示创建合同按钮', () => {
    const markup = renderToStaticMarkup(createElement(ContractModificationPanel, {
      contractId: '',
      contractNo: '',
      initialRecords: [],
      onCreateContract: () => {},
    }));

    expect(markup).toContain('创建合同');
    expect(markup).not.toContain('新增记录');
  });

  test('已有合同时显示新增记录按钮', () => {
    const markup = renderToStaticMarkup(createElement(ContractModificationPanel, {
      contractId: 'contract-1',
      contractNo: 'HT2026001',
      initialRecords: [],
      onCreateContract: () => {},
    }));

    expect(markup).toContain('新增记录');
    expect(markup).not.toContain('创建合同');
  });
});
