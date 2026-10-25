// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { mockTrips } from '../../mock-data';
import { TripDetail } from '../TripDetail';

vi.mock('../../travel-api', async () => {
  const actual = await vi.importActual<typeof import('../../travel-api')>('../../travel-api');
  return {
    ...actual,
    getTripDetail: vi.fn(async (id: string) => mockTrips.find((t) => t.id === id) || null),
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

async function waitForRender(container: HTMLElement) {
  for (let i = 0; i < 30; i++) {
    if (container.querySelector('.trip-detail')) break;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

describe('TripDetail 标杆化升级与 70:30 信息架构', () => {
  test('异步加载出差详情并渲染 6 维微指标、强化步进条与左侧核心档案穿透', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;

    // 1. 面包屑与页头
    expect(html).toContain('差旅管理');
    expect(html).toContain('BT20260425001');
    expect(html).toContain('张三 · 杭州');
    const breadcrumbLinks = Array.from(container.querySelectorAll('.hubx-page-breadcrumb a'));
    expect(breadcrumbLinks.length).toBeGreaterThanOrEqual(2);
    expect(breadcrumbLinks[0].getAttribute('href')).toBe('/travel/dashboard');
    expect(breadcrumbLinks[1].getAttribute('href')).toBe('/travel/trips');

    // 2. 标杆化步进条胶囊+下拉面板（去除了横幅 step-banner）
    expect(html).toContain('trip-stage-popover__trigger');
    expect(html).toContain('trip-stage-step-title');
    expect(html).toContain('申请填写');
    expect(html).toContain('审批核决');
    expect(html).toContain('待出发');
    expect(html).toContain('出差执行');
    expect(html).toContain('报销核销');
    expect(html).toContain('归档结项');
    expect(html).toContain('已全审通过');
    expect(html).not.toContain('trip-detail__step-banner');
    expect(html).not.toContain('当前阶段：');

    // 3. 标杆化 6 维微指标
    expect(html).toContain('差旅预算执行率');
    expect(html).toContain('报销核销比');
    expect(html).toContain('审批合规节点');
    expect(html).toContain('关联成本沉淀');
    expect(html).toContain('行程与周期');
    expect(html).toContain('差旅补贴核定');

    // 4. 左侧 70% 核心事实卡片（TripCoreProfileCard）
    expect(html).toContain('trip-core-profile-card');
    expect(html).toContain('出差目的与任务事由');
    // 申请人链接与快捷操作
    expect(html).toContain('/employees/1');
    expect(html).toContain('张三');
    // 关联项目链接与快捷操作
    expect(html).toContain('/projects/1');
    expect(html).toContain('进入项目看板');
    // 关联客户链接与快捷操作
    expect(html).toContain('/customers/1');
    expect(html).toContain('进入客户主页');

    // 5. 左侧高密度业务主 Tabs（宽幅彻底舒展）
    expect(html).toContain('记账流水 &amp; OCR');
    expect(html).toContain('报销管理');
    expect(html).toContain('借款台账');
    expect(html).toContain('异地考勤补贴');
    expect(html).toContain('预算与标准');
    expect(html).toContain('成本沉淀归集');
    // 默认激活高频核心：记账流水 & 智能识别
    expect(html).toContain('费用记录');
    expect(html).toContain('OCR 识别发票');
    expect(html).toContain('总费用');

    // 6. 右侧 30% 专职垂直流：旅程轨迹 + 审批轨迹双轨 Tabs + 差旅制度速查卡片
    expect(html).toContain('trip-detail__aside-timeline-card');
    expect(html).toContain('旅程轨迹');
    expect(html).toContain('审批流转');
    // 默认激活旅程轨迹
    expect(html).toContain('全程行程规划');
    expect(html).toContain('添加航段');
    expect(html).toContain('trip-detail__aside-policy-card');
    expect(html).toContain('企业差旅制度速查');
    expect(html).toContain('住宿标准');
    expect(html).toContain('市内交通');

    await act(async () => root.unmount());
  });

  test('支持通过 URL 参数 ?tab=reimbursement 驱动激活报销管理 Tab，且内嵌报销合规指引', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1?tab=reimbursement']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;
    // 1. 验证激活报销管理工作区
    expect(html).toContain('报销记录');
    expect(html).toContain('新增报销');
    expect(html).toContain('报销总额');
    // 2. 验证报销合规指引内嵌在报销管理页签内
    expect(html).toContain('报销合规指引');
    expect(html).toContain('杭州 · 7天 · 二线');

    await act(async () => root.unmount());
  });

  test('支持通过 URL 参数 ?tab=loan 驱动激活借款台账 Tab', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1?tab=loan']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;
    // 验证激活借款台账
    expect(html).toContain('借款总额');
    expect(html).toContain('借款记录');
    expect(html).toContain('新增借款');

    await act(async () => root.unmount());
  });

  test('支持通过 URL 参数 ?tab=cost 驱动激活关联成本沉淀 Tab', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1?tab=cost']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;
    // 验证激活成本沉淀 Tab
    expect(html).toContain('成本沉淀归属');
    expect(html).toContain('预算执行与偏差');
    expect(html).toContain('支出分类归集明细');

    await act(async () => root.unmount());
  });

  test('支持通过 URL 参数 ?side=approval 驱动激活右侧审批流转 Tab', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1?side=approval']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;
    // 验证激活右侧审批流转时间线
    expect(html).toContain('审批流转轨迹');
    expect(html).toContain('发起申请');
    expect(html).toContain('主管审批');

    await act(async () => root.unmount());
  });

  test('验证三账合一资金综合轧差清算看板与借款资金闭环环形看板', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1?tab=reimbursement']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;
    // 验证报销 Tab 内的三账合一轧差清算看板
    expect(html).toContain('差旅资金综合轧差清算看板');
    expect(html).toContain('三账合一');
    expect(html).toContain('报销申报总额');
    expect(html).toContain('异地考勤津贴');
    expect(html).toContain('已领备用金借款');

    await act(async () => root.unmount());
  });

  test('验证车票质感行程卡、右侧差旅协同助手与套打功能', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    const html = container.innerHTML;
    // 验证机票/车票质感行程卡
    expect(html).toContain('trip-ticket-card');
    expect(html).toContain('trip-ticket-route');
    expect(html).toContain('北京');
    expect(html).toContain('杭州');

    // 验证右侧协同助手新功能
    expect(html).toContain('企微/手机扫码拍票同步');
    expect(html).toContain('企业商旅免垫资直订通道');
    expect(html).toContain('差旅行政应急与保障热线');

    await act(async () => root.unmount());
  });

  test('验证右侧航段卡片点击后，左侧记账流水与时间轴均同步联动筛选', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/travel/trips/1']}>
          <Routes>
            <Route path="/travel/trips/:id" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitForRender(container);

    // 默认展示全部流水（14笔）
    expect(container.innerHTML).toContain('共 14 条记录');

    // 查找右侧第二张车票卡片（杭州 → 北京）
    const ticketCards = container.querySelectorAll('.trip-ticket-card');
    expect(ticketCards.length).toBeGreaterThanOrEqual(2);

    // 点击第二个航段
    await act(async () => {
      (ticketCards[1] as HTMLElement).click();
    });

    const htmlAfterClick = container.innerHTML;
    // 验证左侧提示条与明细记录联动更新为 2 笔
    expect(htmlAfterClick).toContain('trip-filter-alert');
    expect(htmlAfterClick).toContain('杭州 → 北京');
    expect(htmlAfterClick).toContain('共 2 条记录');

    // 点击切换到时间轴走势视图
    const timelineBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('时间轴走势')
    );
    expect(timelineBtn).toBeTruthy();
    await act(async () => {
      timelineBtn?.click();
    });

    // 验证时间轴顶部的日期仅包含联动航段的日期 05-04，去除了第一段的日期
    const htmlInTimeline = container.innerHTML;
    expect(htmlInTimeline).toContain('05-04');

    await act(async () => root.unmount());
  });
});
