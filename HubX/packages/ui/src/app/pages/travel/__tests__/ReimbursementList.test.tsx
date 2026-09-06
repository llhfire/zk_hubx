import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { ReimbursementList } from '../reimbursement/ReimbursementList';

describe('差旅报销管理列表页', () => {
  test('可渲染统一页面头部与交互式指标卡', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/reimbursements'] },
      createElement(ReimbursementList),
    ));

    expect(markup).toContain('报销管理');
    expect(markup).toContain('集中统筹差旅报销申请');

    // 交互式微指标看板
    expect(markup).toContain('报销申请总数');
    expect(markup).toContain('待我审批');
    expect(markup).toContain('待出纳打款');
    expect(markup).toContain('已完成拨付');
    expect(markup).toContain('最终实付总额');
  });

  test('支持状态快捷分段条与细粒度筛选栏', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/reimbursements'] },
      createElement(ReimbursementList),
    ));

    // 状态快速选择
    expect(markup).toContain('全部');
    expect(markup).toContain('待审批');
    expect(markup).toContain('待打款');
    expect(markup).toContain('已打款');
    expect(markup).toContain('已结项');

    // 筛选与高级过滤
    expect(markup).toContain('搜索报销单号 / 出差单 / 申请人');
    expect(markup).toContain('所属部门');
    expect(markup).toContain('仅看有借款冲抵');
  });

  test('采用资金三账合一轧差聚合列排版', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/reimbursements'] },
      createElement(ReimbursementList),
    ));

    // 黄金聚合列
    expect(markup).toContain('报销单号 / 关联出差');
    expect(markup).toContain('申请人 / 归属');
    expect(markup).toContain('费用科目明细');
    expect(markup).toContain('资金综合轧差（报销 - 冲抵 = 实付）');
    expect(markup).toContain('发票材料');
    expect(markup).toContain('状态');
    expect(markup).toContain('操作');
  });
});
