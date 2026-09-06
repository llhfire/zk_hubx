import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { LoanList } from '../loan/LoanList';

describe('员工借款管理列表页', () => {
  test('可渲染统一页面头部与交互式指标卡', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/loans'] },
      createElement(LoanList),
    ));

    expect(markup).toContain('借款管理');
    expect(markup).toContain('集中统筹员工差旅备用借款');

    // 交互式微指标看板
    expect(markup).toContain('借款申请总数');
    expect(markup).toContain('待我审批');
    expect(markup).toContain('待财务打款');
    expect(markup).toContain('冲抵核销中');
    expect(markup).toContain('在途待还余额');
  });

  test('支持状态快捷分段条与细粒度筛选栏', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/loans'] },
      createElement(LoanList),
    ));

    // 状态快速选择
    expect(markup).toContain('全部');
    expect(markup).toContain('待审批');
    expect(markup).toContain('待打款');
    expect(markup).toContain('冲抵中');
    expect(markup).toContain('已结清');

    // 筛选与高级过滤
    expect(markup).toContain('搜索借款单号 / 出差单 / 申请人');
    expect(markup).toContain('借款类型');
    expect(markup).toContain('所属部门');
    expect(markup).toContain('仅看未结清借款');
  });

  test('采用冲抵进度条与高信息密度列排版', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/loans'] },
      createElement(LoanList),
    ));

    // 黄金聚合列
    expect(markup).toContain('借款单号 / 事由');
    expect(markup).toContain('申请人 / 归属');
    expect(markup).toContain('借款类型 / 关联出差');
    expect(markup).toContain('借款总额与冲抵核销进度');
    expect(markup).toContain('打款方式 / 期望日期');
    expect(markup).toContain('状态');
    expect(markup).toContain('操作');
  });
});
