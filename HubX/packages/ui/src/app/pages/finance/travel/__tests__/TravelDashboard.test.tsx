import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TravelDashboard } from '../dashboard/TravelDashboard';

describe('差旅看板模块 TravelDashboard', () => {
  test('可渲染统一页面头部与视图模式切换器', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dashboard'] },
        createElement(TravelDashboard),
      )
    );

    expect(markup).toContain('差旅看板');
    expect(markup).toContain('企业差旅支出大盘、组织多维下钻、合规风控监控及绿色集约效益中枢');
    expect(markup).toContain('个人员工视角');
    expect(markup).toContain('管理驾驶舱视角');
  });

  test('管理驾驶舱模式下提供多维下钻筛选控制台与 4 大分析 Tab', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dashboard'] },
        createElement(TravelDashboard),
      )
    );

    // 控制台选择器
    expect(markup).toContain('管理权限：跨组织与项目全景分析');
    expect(markup).toContain('部门：销售部');
    expect(markup).toContain('项目：中科协同平台');
    expect(markup).toContain('人员：全部');

    // 4 大业务 Tab
    expect(markup).toContain('部门差旅大盘');
    expect(markup).toContain('项目成本穿透');
    expect(markup).toContain('合规风控与超标分析');
    expect(markup).toContain('绿色低碳与集约效益');
  });

  test('部门看板包含指标卡、费用科目构成、城市排行榜与月度走势', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dashboard'] },
        createElement(TravelDashboard),
      )
    );

    // 核心指标
    expect(markup).toContain('差旅支出');
    expect(markup).toContain('出差出行人次');
    expect(markup).toContain('人均差旅成本');
    expect(markup).toContain('最大支出科目');

    // 费用分布与城市排行
    expect(markup).toContain('差旅费用科目构成分布');
    expect(markup).toContain('目的地出差城市支出排行 Top 4');
    expect(markup).toContain('月度差旅支出趋势与环比走向');
  });

  test('人员开支排行严格不显示头像元素', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dashboard'] },
        createElement(TravelDashboard),
      )
    );

    // 严格无头像类名
    expect(markup).not.toContain('arco-avatar');
    expect(markup).not.toContain('hubx-list-avatar');
  });
});
