import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { buildInitialContracts } from '../../../contracts/mockData';
import { LeadFinalContractPanel } from '../LeadFinalContractPanel';

describe('LeadFinalContractPanel', () => {
  test('展示在线查看和下载合同操作', () => {
    const contract = buildInitialContracts()[0];
    const markup = renderToStaticMarkup(createElement(LeadFinalContractPanel, { contract }));

    expect(markup).toContain('在线查看合同');
    expect(markup).toContain('下载合同');
    expect(markup).toContain(contract.contractNo);
  });

  test('尚未生成版本快照时仍可查看和下载当前合同', () => {
    const source = buildInitialContracts()[0];
    const contract = { ...source, versionHistory: [], approvedVersionNo: undefined };
    const markup = renderToStaticMarkup(createElement(LeadFinalContractPanel, { contract }));

    expect(markup).toContain('当前版');
    expect(markup).toContain('在线查看合同');
    expect(markup).toContain('下载合同');
  });
});
