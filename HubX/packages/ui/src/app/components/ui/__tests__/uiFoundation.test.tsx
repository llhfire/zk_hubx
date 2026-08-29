import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  PageHeader,
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessRecordCard,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
  WeChatIcon,
} from '../index';

function renderInRouter(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: ['/projects/1'] }, element),
  );
}

describe('HubX UI foundation', () => {
  test('PageShell renders linked ancestors and the current breadcrumb item', () => {
    const markup = renderInRouter(
      createElement(
        PageShell,
        {
          breadcrumbs: [
            { label: '项目管理', to: '/projects' },
            { label: '项目列表', to: '/projects' },
            { label: 'A公司CRM系统开发' },
          ],
        },
        createElement('div', null, '页面内容'),
      ),
    );

    expect(markup).toContain('aria-label="页面层级"');
    expect(markup).toContain('href="/projects"');
    expect(markup).toContain('A公司CRM系统开发');
    expect(markup).toContain('hubx-page-shell__content');
  });

  test('PageHeader keeps title, description and actions in one semantic header', () => {
    const markup = renderInRouter(
      createElement(PageHeader, {
        title: '客户管理',
        description: '统一页面说明',
        actions: createElement('button', null, '新建客户'),
      }),
    );

    expect(markup).toContain('<header');
    expect(markup).toContain('<h1');
    expect(markup).toContain('统一页面说明');
    expect(markup).toContain('新建客户');
  });

  test('ProcessOverview and ProcessMetricGrid expose the shared long-flow structure', () => {
    const overview = renderInRouter(
      createElement(ProcessOverview, {
        identifier: 'PRJ-001',
        title: '示例项目',
        currentStep: 1,
        steps: [
          { key: 'start', title: '立项' },
          { key: 'delivery', title: '交付', description: '进行中' },
          { key: 'accept', title: '验收' },
        ],
      }),
    );
    const metrics = renderInRouter(
      createElement(ProcessMetricGrid, {
        items: [
          { key: 'owner', label: '负责人', value: '张三' },
          { key: 'risk', label: '风险', value: '1 项', tone: 'danger' },
        ],
      }),
    );

    expect(overview).toContain('hubx-process-overview');
    expect(overview).toContain('流程进度');
    expect(overview).toContain('进行中');
    expect(metrics).toContain('hubx-process-metric--danger');
    expect(metrics).toContain('负责人');
  });

  test('ProcessWorkspace exposes the shared 70:30 content regions', () => {
    const markup = renderInRouter(
      createElement(
        ProcessWorkspace,
        null,
        createElement(ProcessWorkspaceMain, null, '主工作区'),
        createElement(ProcessWorkspaceAside, null, '业务过程区'),
      ),
    );

    expect(markup).toContain('hubx-process-workspace__main');
    expect(markup).toContain('hubx-process-workspace__aside');
    expect(markup).toContain('<aside');
  });

  test('ProcessRecordCard keeps title, status, identifier, summary and action in one record', () => {
    const markup = renderInRouter(
      createElement(ProcessRecordCard, {
        title: '客户管理系统报价',
        tags: createElement('span', null, '待报价'),
        identifier: 'QT-2026-18',
        summary: createElement('span', null, '报价 ¥68,000'),
        actions: createElement('button', null, '进入工作台'),
      }),
    );

    expect(markup).toContain('<article');
    expect(markup).toContain('hubx-process-record-card__title');
    expect(markup).toContain('QT-2026-18');
    expect(markup).toContain('报价 ¥68,000');
    expect(markup).toContain('进入工作台');
  });

  test('ProcessRecordCard exposes an accessible whole-card action when clickable', () => {
    const markup = renderInRouter(
      createElement(ProcessRecordCard, {
        title: '长沙出差申请',
        onClick: () => undefined,
        ariaLabel: '展开长沙出差详情',
      }),
    );

    expect(markup).toContain('hubx-process-record-card--interactive');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-label="展开长沙出差详情"');
  });

  test('WeChatIcon renders the shared SVG asset at the requested size', () => {
    const markup = renderInRouter(createElement(WeChatIcon, { size: 14 }));

    expect(markup).toContain('hubx-wechat-icon');
    expect(markup).toContain('width="14"');
    expect(markup).toContain('height="14"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
