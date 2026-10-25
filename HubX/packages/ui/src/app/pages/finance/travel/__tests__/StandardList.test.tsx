import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { StandardList, CITY_LEVEL_OPTIONS, ALL_LEVELS, SEAT_CLASS_LABELS, formatCurrency } from '../standard/StandardList';

describe('费用标准管理模块 StandardList', () => {
  test('纯函数与工具函数正确导出与运行', () => {
    // 城市等级配置
    expect(CITY_LEVEL_OPTIONS.length).toBe(4);
    expect(CITY_LEVEL_OPTIONS.map((c) => c.value)).toEqual([
      'first_tier',
      'second_tier',
      'third_tier',
      'other',
    ]);

    // 职级配置
    expect(ALL_LEVELS.length).toBe(10);
    expect(ALL_LEVELS).toContain('L1');
    expect(ALL_LEVELS).toContain('L10');

    // 座席标签
    expect(SEAT_CLASS_LABELS.second).toBe('二等座');
    expect(SEAT_CLASS_LABELS.business).toBe('商务座');
    expect(SEAT_CLASS_LABELS.economy).toBe('经济舱');

    // 货币格式化兜底安全
    expect(formatCurrency(500)).toBe('¥500');
    expect(formatCurrency(null)).toBe('¥0');
    expect(formatCurrency(undefined)).toBe('¥0');
  });

  test('静态渲染具备页面头部、4 维核心微指标网格与操作按钮', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/standards'] },
        createElement(StandardList)
      )
    );

    // 标题与描述
    expect(markup).toContain('差旅费用标准');
    expect(markup).toContain('维护集团各生效版本的职级×城市等级标准矩阵');

    // 操作按钮
    expect(markup).toContain('差旅试算器');
    expect(markup).toContain('复制派生新版');
    expect(markup).toContain('新增标准版本');

    // 4 维微指标中枢
    expect(markup).toContain('标准版本总数');
    expect(markup).toContain('规则明细覆盖');
    expect(markup).toContain('最高住宿限额');
    expect(markup).toContain('出差综合津贴');
  });

  test('提供 316px Master 版本卡片列表、搜索与状态过滤单选组', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/standards'] },
        createElement(StandardList)
      )
    );

    // Master 头部与检索
    expect(markup).toContain('标准版本库');
    expect(markup).toContain('搜索版本名称或年份...');
    expect(markup).toContain('全部');
    expect(markup).toContain('启用中');
    expect(markup).toContain('草稿/归档');

    // 立体卡片内容
    expect(markup).toContain('travel-standard-version-card');
    expect(markup).toContain('travel-standard-version-card__metrics');
  });

  test('右侧主工作台具备三大 Tab 体系（规则矩阵、差旅试算器、版本对比）', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/standards'] },
        createElement(StandardList)
      )
    );

    // Tab 标签
    expect(markup).toContain('规则明细矩阵');
    expect(markup).toContain('差旅合规模拟试算器');
    expect(markup).toContain('版本差异对比');
  });

  test('Tab 1 规则矩阵具备多维搜索筛选条与完整表格列定义', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/standards'] },
        createElement(StandardList)
      )
    );

    // 筛选工具栏
    expect(markup).toContain('快速搜索职级/城市/房型...');
    expect(markup).toContain('新增规则明细');

    // 表格核心列
    expect(markup).toContain('适用职级');
    expect(markup).toContain('适用城市等级');
    expect(markup).toContain('交通准乘标准');
    expect(markup).toContain('住宿标准');
    expect(markup).toContain('餐饮与招待');
    expect(markup).toContain('出差津贴');
    expect(markup).toContain('操作');
  });

  test('Master 列表准确呈现基准标、版本生效日期与 2x2 参数栅格', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/standards'] },
        createElement(StandardList)
      )
    );

    // 基准标记与主版本
    expect(markup).toContain('当前基准');
    expect(markup).toContain('集团主版本');

    // 2x2 统计指标参数
    expect(markup).toContain('规则明细');
    expect(markup).toContain('更新日期');
    expect(markup).toContain('住宿上限');
    expect(markup).toContain('最高补贴');

    // 快捷操作
    expect(markup).toContain('设为基准');
  });
});
