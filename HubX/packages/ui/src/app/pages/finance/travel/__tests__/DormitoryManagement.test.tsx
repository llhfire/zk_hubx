import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DormitoryManagement } from '../dormitory/DormitoryManagement';

describe('宿舍管理模块 DormitoryManagement', () => {
  test('可渲染统一页面头部、操作按钮与 4 大核心指标中枢', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dormitory'] },
        createElement(DormitoryManagement),
      )
    );

    // 页面标题与描述
    expect(markup.match(/class="hubx-page-shell"/g)).toHaveLength(1);
    expect(markup.match(/class="hubx-page-header"/g)).toHaveLength(1);
    expect(markup).toContain('宿舍管理');
    expect(markup).toContain('统一管理企业宿舍楼栋档案、房态床位网格');

    // 核心操作按钮
    expect(markup).toContain('新增楼栋');
    expect(markup).toContain('办理入住');

    // 4 大核心指标看板
    expect(markup).toContain('在管楼栋');
    expect(markup).toContain('床位总数');
    expect(markup).toContain('在住床位');
    expect(markup).toContain('待办维保');
  });

  test('支持 4 大功能 Tab 切换架构', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dormitory'] },
        createElement(DormitoryManagement),
      )
    );

    expect(markup).toContain('房态与床位');
    expect(markup).toContain('入住管理');
    expect(markup).toContain('费用管理');
    expect(markup).toContain('维护管理');
  });

  test('房态矩阵提供 Master-Detail 双栏、楼栋档案卡片与房态图例', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dormitory'] },
        createElement(DormitoryManagement),
      )
    );

    // 楼栋清单 Master
    expect(markup).toContain('楼栋清单');
    expect(markup).toContain('按楼栋/城市搜索...');

    // 房态筛选与图例
    expect(markup).toContain('全部房态');
    expect(markup).toContain('仅看有空床');
    expect(markup).toContain('仅看已住满');
    expect(markup).toContain('仅看报修中');
    expect(markup).toContain('已占用');
    expect(markup).toContain('空闲可住');
    expect(markup).toContain('设施报修');
  });

  test('列表与床位信息排版纯净，严格不包含头像元素', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dormitory'] },
        createElement(DormitoryManagement),
      )
    );

    // 不包含头像类名
    expect(markup).not.toContain('arco-avatar');
    expect(markup).not.toContain('hubx-list-avatar');
  });

  test('包含楼栋新增、入住登记与费用录入等核心操作入口', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dormitory'] },
        createElement(DormitoryManagement),
      )
    );

    expect(markup).toContain('新增楼栋');
    expect(markup).toContain('办理入住');
    expect(markup).toContain('录入费用');
    expect(markup).toContain('快速办理入住');
    expect(markup).toContain('退宿');
  });

  test('支持快捷常用城市快选与报修常见故障标签支持', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/travel/dormitory'] },
        createElement(DormitoryManagement),
      )
    );

    expect(markup).toContain('北京');
    expect(markup).toContain('杭州');
  });
});
