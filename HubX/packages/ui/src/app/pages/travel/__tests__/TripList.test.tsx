import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TripList } from '../trip/TripList';

describe('出差申请列表页', () => {
  test('可渲染统一页面头部与交互式指标卡', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips'] },
      createElement(TripList),
    ));

    expect(markup).toContain('出差申请');
    expect(markup).toContain('新建出差申请');
    expect(markup).toContain('集中统筹出差计划');

    // 交互式微指标看板
    expect(markup).toContain('出差申请总数');
    expect(markup).toContain('待我审批');
    expect(markup).toContain('执行中 / 待出发');
    expect(markup).toContain('待报销单据');
    expect(markup).toContain('预计费用总额');
  });

  test('支持状态快捷分段条与细粒度筛选栏', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips'] },
      createElement(TripList),
    ));

    // 状态快速选择
    expect(markup).toContain('全部');
    expect(markup).toContain('待审批');
    expect(markup).toContain('已通过');
    expect(markup).toContain('进行中');
    expect(markup).toContain('待报销');
    expect(markup).toContain('草稿');

    // 搜索与高级过滤
    expect(markup).toContain('搜索单号 / 申请人 / 目的地 / 事由');
    expect(markup).toContain('所属部门');
    expect(markup).toContain('仅看有借款');
  });

  test('采用 7 大高信息密度黄金列排版', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips'] },
      createElement(TripList),
    ));

    // 7 大聚合列表头
    expect(markup).toContain('出差单与事由');
    expect(markup).toContain('申请人 / 归属');
    expect(markup).toContain('行程轨迹与周期');
    expect(markup).toContain('关联业务载体');
    expect(markup).toContain('预计费用 / 借款');
    expect(markup).toContain('当前状态');
    expect(markup).toContain('操作');
  });
});
