// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { PageBreadcrumb } from '../layout/PageBreadcrumb';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('PageBreadcrumb 面包屑导航组件', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('正确渲染层级，支持 to 与 path 属性跳转链接，最后一项不设链接', async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PageBreadcrumb
            items={[
              { label: '差旅管理', to: '/travel/dashboard' },
              { label: '出差申请', path: '/travel/trips' },
              { label: 'BT20260425001' },
            ]}
          />
        </MemoryRouter>
      );
    });

    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(2);

    // 第 1 级通过 to 配置
    expect(links[0].textContent).toBe('差旅管理');
    expect(links[0].getAttribute('href')).toBe('/travel/dashboard');

    // 第 2 级通过 path 兼容配置
    expect(links[1].textContent).toBe('出差申请');
    expect(links[1].getAttribute('href')).toBe('/travel/trips');

    // 第 3 级（末项）不是 a 链接，仅展示文本
    expect(container.textContent).toContain('BT20260425001');

    act(() => root.unmount());
  });

  test('支持 onClick 自定义点击事件', async () => {
    const handleClick = vi.fn();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PageBreadcrumb
            items={[
              { label: '返回上一级', onClick: handleClick },
              { label: '当前页' },
            ]}
          />
        </MemoryRouter>
      );
    });

    const clickable = container.querySelector('.hubx-page-breadcrumb__link') as HTMLElement;
    expect(clickable).toBeDefined();

    await act(async () => {
      clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleClick).toHaveBeenCalled();
    act(() => root.unmount());
  });
});
