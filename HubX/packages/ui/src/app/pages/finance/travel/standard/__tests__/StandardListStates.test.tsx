// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getExpenseStandardList } from '../../travel-api';
import { mockExpenseStandards } from '../../mock-data';
import type { ExpenseStandard } from '../../types';
import { StandardList } from '../StandardList';

vi.mock('../../travel-api', () => ({ getExpenseStandardList: vi.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

let container: HTMLDivElement;
let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  vi.mocked(getExpenseStandardList).mockReset();
});

async function renderPage() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<MemoryRouter><StandardList /></MemoryRouter>));
}

function expectPageShell() {
  expect(container.querySelectorAll('.hubx-page-shell')).toHaveLength(1);
  expect(container.querySelectorAll('.hubx-page-header')).toHaveLength(1);
  expect(container.querySelector('h1')?.textContent).toBe('差旅费用标准');
}

describe('StandardList 页面状态', () => {
  test('加载中保留页头，空数据仍保留新增入口与空态', async () => {
    let resolveStandards!: (standards: ExpenseStandard[]) => void;
    vi.mocked(getExpenseStandardList).mockImplementationOnce(() => new Promise((resolve) => { resolveStandards = resolve; }));
    await renderPage();
    expectPageShell();
    expect(container.querySelector('.hubx-async-state')).not.toBeNull();
    expect(container.textContent).not.toContain('新增标准版本');

    await act(async () => resolveStandards([]));
    expectPageShell();
    expect(container.querySelector('.hubx-async-state')).toBeNull();
    expect(container.textContent).toContain('未找到匹配的标准版本');
    expect(container.textContent).toContain('新增标准版本');
  });

  test('失败可重试，成功后恢复版本列表和规则矩阵', async () => {
    vi.mocked(getExpenseStandardList)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(mockExpenseStandards);
    await renderPage();
    expectPageShell();
    expect(container.textContent).toContain('加载费用标准失败');
    const retry = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '重试');
    expect(retry).toBeDefined();
    await act(async () => retry!.click());
    expectPageShell();
    expect(container.querySelector('.hubx-async-state')).toBeNull();
    expect(container.textContent).toContain('标准版本库');
    expect(container.textContent).toContain('规则明细矩阵');
    expect(container.textContent).toContain(mockExpenseStandards[0].name);
  });
});
