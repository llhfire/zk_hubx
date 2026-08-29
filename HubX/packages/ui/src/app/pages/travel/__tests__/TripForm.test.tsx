import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TripForm } from '../trip/TripForm';

describe('新建出差申请', () => {
  test('可渲染统一面包屑和表单主流程', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips/new'] },
      createElement(TripForm),
    ));

    expect(markup).toContain('aria-label="页面层级"');
    expect(markup).toContain('href="/travel/trips"');
    expect(markup).toContain('新建出差申请');
    expect(markup).toContain('填写关联对象、行程安排、费用预估与借款需求');
    expect(markup).toContain('请填写出差目的');
  });
});
