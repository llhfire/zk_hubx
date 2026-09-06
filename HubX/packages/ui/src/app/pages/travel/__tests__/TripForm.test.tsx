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

  test('支持 70:30 双栏双轨流式信息架构与 5 大表单区块', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips/new'] },
      createElement(TripForm),
    ));

    // 70:30 工作区
    expect(markup).toContain('hubx-process-workspace__main');
    expect(markup).toContain('hubx-process-workspace__aside');

    // 5 大主表单区块
    expect(markup).toContain('事由与归属');
    expect(markup).toContain('行程规划与交通偏好');
    expect(markup).toContain('住宿安排与同行人员');
    expect(markup).toContain('费用预估与借款需求');
    expect(markup).toContain('材料与凭据');
  });

  test('包含常用城市胶囊、交通磁贴与智能测算工具', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips/new'] },
      createElement(TripForm),
    ));

    // 常用城市快捷胶囊
    expect(markup).toContain('常用城市：');
    expect(markup).toContain('+ 北京');
    expect(markup).toContain('+ 上海');
    expect(markup).toContain('+ 杭州');
    expect(markup).toContain('+ 深圳');

    // 交通方式磁贴
    expect(markup).toContain('高铁/动车');
    expect(markup).toContain('飞机');
    expect(markup).toContain('自驾/租车');

    // 智能测算工具
    expect(markup).toContain('按差旅标准一键试算 ⚡');
    expect(markup).toContain('快速应用模板');
  });

  test('支持右侧实时预算看板、审批预判与底部吸底操作栏', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/travel/trips/new'] },
      createElement(TripForm),
    ));

    // 右侧预算与审批预判
    expect(markup).toContain('预计差旅总费用');
    expect(markup).toContain('日均预估');
    expect(markup).toContain('预计审批流路线预判');

    // 底部吸底操作栏
    expect(markup).toContain('trip-form-sticky-footer');
    expect(markup).toContain('预计总费用：');
    expect(markup).toContain('取消返回');
    expect(markup).toContain('保存草稿');
    expect(markup).toContain('提交申请');
  });
});
