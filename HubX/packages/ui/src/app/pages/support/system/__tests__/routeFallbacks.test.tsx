import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFound } from '../NotFound';

/**
 * 路由兜底回归（P0-6）。
 *
 * 缺陷背景：路由表原先既没有 `path: "*"`，也没有 `errorElement`。
 * 访问未知路径时 React Router 渲染空白；页面组件渲染期抛错时整棵树被卸载。
 * 两种情况下用户看到的都是白屏，无法区分"地址错"与"系统故障"。
 */

function renderAt(path: string, Component: () => JSX.Element) {
  const router = createMemoryRouter([{ path, Component }], { initialEntries: [path] });
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('404 兜底页', () => {
  it('渲染错误标题、说明与返回入口', () => {
    const html = renderAt('/nope', NotFound);
    expect(html).toContain('页面不存在');
    expect(html).toContain('地址可能有误');
    expect(html).toContain('返回工作台');
  });

  it('catch-all 路由能匹配任意未知路径', () => {
    const router = createMemoryRouter(
      [{ path: '*', Component: NotFound }],
      { initialEntries: ['/deeply/nested/unknown/path'] },
    );
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain('页面不存在');
  });
});
