import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

function renderError(error: unknown) {
  const router = createMemoryRouter(
    [{ id: 'root', path: '*', element: <div>正常页面</div>, errorElement: <RouteErrorBoundary /> }],
    { initialEntries: ['/broken'], hydrationData: { errors: { root: error } } },
  );
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('路由错误状态壳层', () => {
  it.each([
    { label: '运行时异常', error: new Error('详情数据异常'), title: '页面出错了', detail: '详情数据异常' },
    { label: '字符串异常', error: '页面模块加载失败', title: '页面出错了', detail: '页面模块加载失败' },
    { label: '无权限响应', error: { status: 403, statusText: 'Forbidden', data: '没有访问权限', internal: false }, title: '403 Forbidden', detail: '没有访问权限' },
    { label: '结构化响应', error: { status: 500, statusText: '', data: { message: '隐藏的结构化数据' }, internal: false }, title: '500', detail: '' },
    { label: '未知异常', error: {}, title: '页面出错了', detail: '' },
  ])('$label 保留单个壳层、错误信息及恢复入口', ({ error, title, detail }) => {
    const markup = renderError(error);

    expect(markup.match(/class="hubx-page-shell"/g)).toHaveLength(1);
    expect(markup.match(/class="hubx-page-header"/g)).toHaveLength(1);
    expect(markup).toContain(`<h1 class="hubx-page-header__title">${title}</h1>`);
    expect(markup).toContain('arco-result');
    expect(markup).toContain('该页面渲染时发生异常');
    expect(markup).toContain('重新加载');
    expect(markup).toContain('返回工作台');
    expect(markup).not.toContain('正常页面');
    expect(markup).not.toContain('隐藏的结构化数据');
    if (detail) expect(markup).toContain(detail);
  });
});
