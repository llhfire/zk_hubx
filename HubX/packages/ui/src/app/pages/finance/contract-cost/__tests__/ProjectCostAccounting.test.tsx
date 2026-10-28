// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CollectionProvider } from '../../../../collections/CollectionContext';
import { ContractsProvider } from '../../../sales/contracts/ContractsContext';
import { initialProjects } from '../../../delivery/project/mockData';
import { ProjectCostAccounting } from '../ProjectCostAccounting';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

let container: HTMLDivElement;
let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
});

async function renderAt(path: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={[path]}>
        <ContractsProvider>
          <CollectionProvider>
            <Routes>
              <Route path={path} element={<ProjectCostAccounting />} />
              <Route path="/projects/:id" element={<div>项目详情</div>} />
            </Routes>
          </CollectionProvider>
        </ContractsProvider>
      </MemoryRouter>,
    );
  });
}

function expectSinglePage(title: string) {
  expect(container.querySelectorAll('.hubx-page-shell')).toHaveLength(1);
  expect(container.querySelectorAll('.hubx-page-header')).toHaveLength(1);
  expect(container.querySelector('h1')?.textContent).toBe(title);
}

async function clickTab(label: string) {
  const tab = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'))
    .find((element) => element.textContent?.includes(label));
  expect(tab).toBeDefined();
  await act(async () => tab!.click());
}

describe('ProjectCostAccounting 页面壳层', () => {
  it('财务路由可渲染，切换研发明细不会嵌套壳层，收支与项目入口仍可用', async () => {
    await renderAt('/finance/project-cost');

    expectSinglePage('项目成本核算');
    expect(container.textContent).toContain('项目总数');
    expect(container.textContent).toContain(initialProjects[0].name);

    await clickTab('研发成本明细');

    expectSinglePage('项目成本核算');
    expect(container.textContent).toContain('时薪');
    expect(container.textContent).toContain('合计');
    expect(container.querySelectorAll('.hubx-section-card .hubx-page-shell')).toHaveLength(0);

    await clickTab('项目成本总览');

    const detailButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === '收支明细');
    expect(detailButton).toBeDefined();
    await act(async () => detailButton!.click());

    const drawer = document.querySelector('.arco-drawer');
    expect(drawer?.textContent).toContain(`${initialProjects[0].name} · 收支明细`);
    expect(drawer?.textContent).toContain('收入明细');
    expect(drawer?.textContent).toContain('支出明细');
    const closeButton = drawer?.querySelector<HTMLElement>('.arco-drawer-close-icon');
    expect(closeButton).not.toBeNull();
    await act(async () => closeButton!.click());

    expectSinglePage('项目成本核算');
    const projectButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === initialProjects[0].name);
    expect(projectButton).toBeDefined();
    await act(async () => projectButton!.click());
    expect(container.textContent).toBe('项目详情');
  }, 15_000);

  it('保留费用核算路径的标题', async () => {
    await renderAt('/cost-accounting');
    expectSinglePage('费用核算');
  });
});
