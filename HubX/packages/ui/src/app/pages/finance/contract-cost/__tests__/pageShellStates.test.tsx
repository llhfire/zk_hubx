import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { ContractCostDetail } from '../ContractCostDetail';
import { SalaryPage } from '../SalaryPage';
import { contractCostPermissions, contractNames } from '../contractCostData';

const originalPermissions = { ...contractCostPermissions };

afterEach(() => {
  Object.assign(contractCostPermissions, originalPermissions);
});

function renderPage(page: ReactElement, path = '/finance/salary', routePath = path) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={page} />
      </Routes>
    </MemoryRouter>,
  );
}

function countClass(markup: string, className: string) {
  return Array.from(markup.matchAll(/class="([^"]*)"/g))
    .filter((match) => match[1].split(/\s+/).includes(className)).length;
}

describe('财务成本页面状态壳层', () => {
  test('工资表无查看权限时保留单一页壳与标题，并隐藏数据和导入入口', () => {
    contractCostPermissions.salaryView = false;
    contractCostPermissions.salaryEdit = true;

    const markup = renderPage(<SalaryPage />);

    expect(countClass(markup, 'hubx-page-shell')).toBe(1);
    expect(countClass(markup, 'hubx-page-header')).toBe(1);
    expect(markup).toContain('<h1 class="hubx-page-header__title">工资表</h1>');
    expect(countClass(markup, 'hubx-async-state')).toBe(1);
    expect(markup).toContain('暂无权限查看工资表');
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('员工姓名');
    expect(countClass(markup, 'hubx-page-header__actions')).toBe(0);
    expect(markup).not.toContain('<button');
  });

  test('工资表正常态复用单一页壳并保留工资数据与导入入口', () => {
    contractCostPermissions.salaryView = true;
    contractCostPermissions.salaryEdit = true;

    const markup = renderPage(<SalaryPage />);

    expect(countClass(markup, 'hubx-page-shell')).toBe(1);
    expect(countClass(markup, 'hubx-page-header')).toBe(1);
    expect(markup).toContain('<h1 class="hubx-page-header__title">工资表</h1>');
    expect(countClass(markup, 'hubx-async-state')).toBe(0);
    expect(markup).toContain('<table');
    expect(markup).toContain('员工姓名');
    expect(markup).toContain('名义月工资');
    const buttonLabels = Array.from(markup.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g))
      .map((match) => match[1].replace(/<[^>]*>/g, ''));
    expect(buttonLabels).toContain('导入工资');
    expect(buttonLabels).toContain('导入实际工时');
  });

  test.each([
    { contractId: '999', contractName: '合同999', hasProjects: false },
    { contractId: '1', contractName: contractNames['1'], hasProjects: true },
  ])('合同 $contractId 在关联项目状态为 $hasProjects 时保留单一详情页壳', ({ contractId, contractName, hasProjects }) => {
    const markup = renderPage(
      <ContractCostDetail />,
      `/finance/contracts/${contractId}/cost`,
      '/finance/contracts/:contractId/cost',
    );

    expect(countClass(markup, 'hubx-page-shell')).toBe(1);
    expect(countClass(markup, 'hubx-detail-header')).toBe(1);
    expect(countClass(markup, 'hubx-page-breadcrumb')).toBe(1);
    expect(markup).toContain(`<h1 class="hubx-detail-header__title">${contractName} - 成本明细</h1>`);
    expect(markup).toContain('财务统计');
    expect(markup).toContain('合同成本明细');
    expect(markup).toContain('返回列表');

    if (hasProjects) {
      expect(markup).toContain('科研成本');
      expect(markup).toContain('分摊运营成本');
      expect(markup).toContain('<table');
      expect(markup).not.toContain('该合同未关联项目');
    } else {
      expect(countClass(markup, 'hubx-empty-state')).toBe(1);
      expect(markup).toContain('该合同未关联项目');
      expect(markup).not.toContain('<table');
      expect(markup).not.toContain('科研成本');
    }
  });
});
