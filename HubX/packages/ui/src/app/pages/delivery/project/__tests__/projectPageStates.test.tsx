import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CollectionProvider } from '../../../../collections/CollectionContext';
import { ContractsProvider } from '../../../sales/contracts/ContractsContext';
import { QuotationProvider } from '../../../sales/quotation/QuotationContext';
import { ProjectProvider } from '../ProjectContext';
import { ProjectDetail360 } from '../ProjectDetail360';
import { ProjectWorkItemsPage } from '../ProjectWorkItemsPage';

function renderProjectPage(path: string, route: string, element: ReactNode) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <QuotationProvider>
        <ContractsProvider>
          <ProjectProvider>
            <CollectionProvider>
              <Routes>
                <Route path={route} element={element} />
              </Routes>
            </CollectionProvider>
          </ProjectProvider>
        </ContractsProvider>
      </QuotationProvider>
    </MemoryRouter>,
  );
}

describe('项目页面状态壳层', () => {
  it.each([
    { path: '/projects/missing-project', route: '/projects/:id', title: '项目详情', element: <ProjectDetail360 /> },
    { path: '/projects/missing-project/work-items', route: '/projects/:id/work-items', title: '工作项列表', element: <ProjectWorkItemsPage /> },
  ])('$title 缺失时保留页面壳、标题和列表返回入口', ({ path, route, title, element }) => {
    const markup = renderProjectPage(path, route, element);

    expect(markup.match(/class="hubx-page-shell"/g)).toHaveLength(1);
    expect(markup.match(/class="hubx-page-header"/g)).toHaveLength(1);
    expect(markup).toContain(`<h1 class="hubx-page-header__title">${title}</h1>`);
    expect(markup).toContain('hubx-empty-state');
    expect(markup).toContain('项目不存在');
    expect(markup).toContain('返回列表');
  });

  it('正常详情保留原有流程概览，不重复添加页头', () => {
    const markup = renderProjectPage('/projects/1', '/projects/:id', <ProjectDetail360 />);

    expect(markup.match(/class="hubx-page-shell project-detail-360"/g)).toHaveLength(1);
    expect(markup).toContain('hubx-process-overview__head');
    expect(markup).not.toContain('class="hubx-page-header"');
    expect(markup).toContain('A公司CRM系统开发');
  });

  it('正常工作项保留单个页面壳、页头和返回项目入口', () => {
    const markup = renderProjectPage('/projects/1/work-items', '/projects/:id/work-items', <ProjectWorkItemsPage />);

    expect(markup.match(/class="hubx-page-shell"/g)).toHaveLength(1);
    expect(markup.match(/class="hubx-page-header"/g)).toHaveLength(1);
    expect(markup).toContain('返回项目');
    expect(markup).toContain('客户管理列表筛选交互开发');
  });
});
