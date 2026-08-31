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

  test('项目合同默认折叠时只展示关键摘要', () => {
    const contract = buildInitialContracts()[0];
    const markup = renderToStaticMarkup(createElement(LeadFinalContractPanel, {
      contract,
      projectLayout: true,
      projectFullInfo: true,
      defaultCollapsed: true,
    }));

    expect(markup).toContain('查看合同');
    expect(markup).toContain('下载合同');
    expect(markup).toContain('展开');
    expect(markup).not.toContain('展开合同详情');
    expect(markup.indexOf('查看合同')).toBeLessThan(markup.indexOf('展开'));
    expect(markup.indexOf('下载合同')).toBeLessThan(markup.indexOf('展开'));
    expect(markup).toContain('合同编号');
    expect(markup).toContain('公司名称');
    expect(markup).toContain('签约主体');
    expect(markup).toContain('签约日期');
    expect(markup).not.toContain('我方税务登记号');
    expect(markup).not.toContain('在线查看合同');
  });
});
