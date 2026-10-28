// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CollectionProvider } from '../../collections/CollectionContext';
import { ContractDetail } from '../sales/contracts/ContractDetail';
import { ContractsProvider } from '../sales/contracts/ContractsContext';
import { ProjectProvider } from '../delivery/project/ProjectContext';
import { QuotationProvider } from '../sales/quotation/QuotationContext';

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

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

describe('ContractDetail', () => {
  test('异步加载后稳定渲染统一长流程框架', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/contracts/1']}>
          <ContractsProvider>
            <ProjectProvider>
              <CollectionProvider>
                <QuotationProvider>
                  <Routes>
                    <Route path="/contracts/:id" element={<ContractDetail />} />
                  </Routes>
                </QuotationProvider>
              </CollectionProvider>
            </ProjectProvider>
          </ContractsProvider>
        </MemoryRouter>,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(container.textContent).toContain('A公司CRM系统开发合同');
    expect(container.querySelector('.hubx-process-overview')).not.toBeNull();
    expect(container.querySelector('.hubx-process-metrics')).not.toBeNull();
    expect(container.querySelector('.hubx-process-workspace')).not.toBeNull();

    await act(async () => root.unmount());
    // 整页渲染 + 四个 Provider，并发跑全量测试时单次渲染会逼近 5s 默认上限
  }, 20_000);
});
