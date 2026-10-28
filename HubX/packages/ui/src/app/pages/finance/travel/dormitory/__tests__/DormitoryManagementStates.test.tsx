// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { mockDormitories } from '../../mock-data';
import { getDormitoryList } from '../../travel-api';
import { DormitoryManagement } from '../DormitoryManagement';

vi.mock('../../travel-api', () => ({ getDormitoryList: vi.fn() }));

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
  vi.mocked(getDormitoryList).mockReset();
});

async function renderPage() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<MemoryRouter><DormitoryManagement /></MemoryRouter>));
}

function expectPageShell() {
  expect(container.querySelectorAll('.hubx-page-shell')).toHaveLength(1);
  expect(container.querySelectorAll('.hubx-page-header')).toHaveLength(1);
  expect(container.querySelector('h1')?.textContent).toBe('宿舍管理');
}

describe('DormitoryManagement 页面状态', () => {
  test('加载中保留单一页壳与页头，空结果显示空态并保留新增入口', async () => {
    let resolveBuildings!: (result: Awaited<ReturnType<typeof getDormitoryList>>) => void;
    vi.mocked(getDormitoryList).mockImplementationOnce(() => new Promise((resolve) => { resolveBuildings = resolve; }));
    await renderPage();

    expectPageShell();
    expect(container.querySelector('.hubx-async-state')?.textContent).toContain('正在加载宿舍楼栋');
    expect(container.textContent).not.toContain('新增楼栋');
    expect(container.textContent).not.toContain('办理入住');

    await act(async () => resolveBuildings({ list: [], total: 0 }));

    expectPageShell();
    expect(container.querySelector('.hubx-async-state')).toBeNull();
    expect(container.textContent).toContain('无匹配楼栋');
    expect(container.textContent).toContain('请选择左侧楼栋查看房态矩阵');
    expect(container.textContent).toContain('新增楼栋');
    expect(container.querySelectorAll('.dorm-building-card')).toHaveLength(0);
    expect(container.querySelector('.hubx-dormitory-room-board')).toBeNull();
  });

  test('失败显示可重试错误态，重试经历加载后恢复原有房态工作区', async () => {
    let resolveBuildings!: (result: Awaited<ReturnType<typeof getDormitoryList>>) => void;
    vi.mocked(getDormitoryList)
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveBuildings = resolve; }));
    await renderPage();

    expectPageShell();
    expect(container.textContent).toContain('加载宿舍楼栋失败');
    expect(container.textContent).not.toContain('新增楼栋');
    const retry = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '重试');
    expect(retry).toBeDefined();

    await act(async () => retry!.click());
    expectPageShell();
    expect(container.textContent).toContain('正在加载宿舍楼栋');
    expect(container.textContent).not.toContain('加载宿舍楼栋失败');

    await act(async () => resolveBuildings({ list: mockDormitories, total: mockDormitories.length }));
    expectPageShell();
    expect(container.querySelector('.hubx-async-state')).toBeNull();
    expect(container.textContent).toContain('新增楼栋');
    expect(container.textContent).toContain('办理入住');
    expect(container.textContent).toContain('房态与床位');
    expect(container.textContent).toContain(mockDormitories[0].name);
    expect(container.querySelectorAll('.dorm-building-card')).toHaveLength(mockDormitories.length);
    expect(container.querySelector('.hubx-dormitory-room-board')).not.toBeNull();
  });
});
