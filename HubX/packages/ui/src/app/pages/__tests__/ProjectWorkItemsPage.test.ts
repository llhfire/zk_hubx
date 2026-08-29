import { createElement } from 'react';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ProjectProvider } from '../project-management/ProjectContext';
import { ProjectWorkItemsPage } from '../project-management/ProjectWorkItemsPage';

function render(path: string) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: [path] },
    createElement(ProjectProvider, null, createElement(
      Routes,
      null,
      createElement(Route, { path: '/projects/:id/work-items', element: createElement(ProjectWorkItemsPage) }),
    )),
  ));
}

describe('项目工作项独立列表', () => {
  test('提供需求、任务、缺陷三个页签和返回项目入口', () => {
    const markup = render('/projects/1/work-items?tab=tasks');
    expect(markup).toContain('需求 3');
    expect(markup).toContain('任务 2');
    expect(markup).toContain('缺陷 2');
    expect(markup).toContain('返回项目');
    expect(markup).toContain('客户管理列表筛选交互开发');
  });

  test('查询参数可直接打开缺陷列表', () => {
    const markup = render('/projects/1/work-items?tab=bugs');
    expect(markup).toContain('列表页横向滚动卡顿');
    expect(markup).toContain('P1');
  });
});
