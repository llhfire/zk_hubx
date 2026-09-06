import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Stage3WebAutomation } from '../stages/Stage3WebAutomation';
import type { Quote } from '../types';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../QuotationContext', () => ({
  useQuotation: () => ({
    updateQuote: vi.fn(),
    submitForAudit: vi.fn(),
    isLeadFrozen: () => false,
  }),
}));

function createMockStage3Quote(extra?: Partial<Quote>): Quote {
  return {
    id: 'quote-test-s3-1',
    quoteNo: 'QT-2026-ONLINE-S3',
    version: 'v1.0',
    status: 'draft',
    leadId: 'lead-test-1',
    salesOwnerName: '王销售',
    flowMode: 'online',
    signingEntity: 'zkrt',
    basicInfo: {
      projectName: '企业级协同管理平台研发',
      projectType: '其他定制',
      creatorName: '李产品',
      techEvaluatorName: '张架构',
      requirementDesc: '支持多端协同与审批流引擎',
      customerName: '某智能集团有限公司',
      customerContact: '陈总',
      customerPhone: '13900008888',
      quoteValidityDays: 30,
    },
    endpointConfigs: [
      { id: 'ep-web', name: 'Web管理后台', platforms: ['web'] },
    ],
    featureList: [
      {
        id: 'mod-1',
        name: '工作台与权限',
        sort: 1,
        endpointId: 'ep-web',
        subFeatures: [
          { id: 'sub-1', name: '组织架构与多租户权限', description: 'RBAC 模型' },
        ],
      },
    ],
    evalSheet: {
      evaluationUnits: [
        {
          id: 'unit-1',
          boundSubFeatureIds: ['sub-1'],
          manualWorkload: { frontend: 10, backend: 15 },
          totalDays: 25,
        },
      ],
      activeRoles: [
        { key: 'frontend', name: '前端开发工程师' },
        { key: 'backend', name: '后端开发工程师' },
      ],
      manualWorkDays: 20,
    },
    roleDailyCosts: {
      frontend: 800,
      backend: 900,
    },
    salesAddedRoles: [
      {
        id: 'ar-1',
        roleName: 'PMO 项目管理',
        headcount: 1,
        days: 5,
        dailyRate: 1000,
        subtotal: 5000,
        reason: '跨部门组织协调与汇报',
      },
    ],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: 'Java' },
    travelOnsite: {
      enableTravel: true,
      travelCity: '上海',
      travelDays: 3,
      travelHeadcount: 2,
      travelSubtotal: 3600,
      travelDetails: [
        { location: '上海', headcount: 2, days: 3, transportFee: 1000, hotelFeePerDay: 400, allowancePerDay: 100 },
      ],
      enableOnsite: false,
      onsiteCity: '',
      onsiteDays: 0,
      onsiteDailyCost: 0,
      onsiteSubtotal: 0,
      onsiteDetails: [],
    },
    otherCosts: [
      { id: 'cost-1', name: '阿里云ECS服务器', amount: 6000, note: '首年客户自费代采' },
    ],
    summary: {
      totalLaborDays: 30,
      projectWorkDays: 20,
      grandTotalPrice: 38100,
      paymentTerms: [
        { stage: '合同签订预付款', percent: 30 },
        { stage: '中期原型与核心功能验收', percent: 30 },
        { stage: '系统部署上线与终验', percent: 30 },
        { stage: '一年质保期满尾款', percent: 10 },
      ],
      taxIncluded: true,
      warrantyYears: 1,
      invoiceType: '专票',
    },
    ...extra,
  };
}

describe('Stage 3 Web Automation 在线报价配置页面重构 (Stage3WebAutomation)', () => {
  it('1. 渲染 72:28 响应式双栏布局与常驻商业决策驾驶舱', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 双栏与驾驶舱结构
    expect(html).toContain('stage3-layout');
    expect(html).toContain('stage3-cockpit-wrapper');
    expect(html).toContain('stage3-total-price');

    // 核心对外总报价与指标
    expect(html).toContain('对外总报价 (含税)');
    expect(html).toContain('人力毛利率');
    expect(html).toContain('交付工期');
    expect(html).toContain('20 工作日');
  });

  it('2. 渲染岗位费率卡片网格并默认收起冗长明细', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 岗位费率卡片网格
    expect(html).toContain('stage3-role-grid');
    expect(html).toContain('前端开发工程师');
    expect(html).toContain('后端开发工程师');
    expect(html).toContain('10.0 人天');
    expect(html).toContain('15.0 人天');

    // 展开/收起功能明细按钮
    expect(html).toContain('展开功能工时明细');
    expect(html).toContain('重置基准');
  });

  it('3. 渲染付款计划预设模版引擎与 100% 校验通过提示', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 付款预设模版快捷按钮
    expect(html).toContain('标准 3:3:3:1');
    expect(html).toContain('敏捷 5:3:2');
    expect(html).toContain('对半 5:5');
    expect(html).toContain('大型 4:3:2:1');

    // aria-label 兼容性
    expect(html).toContain('第 1 期付款节点');
    expect(html).toContain('第 1 期付款比例');

    // 比例 100% 合规达标
    expect(html).toContain('比例合计 100%（合规达标）');
  });

  it('4. 销售增项提供快捷预设标签并准确计算增项小计', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 预设快捷标签
    expect(html).toContain('+ PMO 项目管理');
    expect(html).toContain('+ 现场技术驻场');
    expect(html).toContain('+ 系统安全等保配合');

    // 已添加的增项
    expect(html).toContain('跨部门组织协调与汇报');
    expect(html).toContain('增项小计：');
  });

  it('5. 履约服务整合出差与驻场配置', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    expect(html).toContain('交付履约服务（出差与驻场）');
    expect(html).toContain('异地出差服务');
    expect(html).toContain('现场驻场技术服务');
    expect(html).toContain('差旅小计:');
  });

  it('6. 驾驶舱内审合规体检清单正确展示绿灯项与操作按钮', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 5 项体检项
    expect(html).toContain('内审合规体检');
    expect(html).toContain('1. 签约主体');
    expect(html).toContain('2. 付款比例 100%');
    expect(html).toContain('3. 人力毛利红线 (≥45%)');
    expect(html).toContain('4. 报价单模板字段');
    expect(html).toContain('5. 线索流转状态');

    // 操作按钮
    expect(html).toContain('预览客户版报价单');
    expect(html).toContain('提交审批');
  });

  it('7. 当付款比例不等于 100% 时体检清单亮红灯并高亮差额警告', () => {
    const quote = createMockStage3Quote({
      summary: {
        totalLaborDays: 30,
        projectWorkDays: 20,
        grandTotalPrice: 38100,
        paymentTerms: [
          { stage: '首付款', percent: 40 },
          { stage: '尾款', percent: 40 },
        ],
        taxIncluded: true,
        warrantyYears: 1,
        invoiceType: '专票',
      },
    });
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    expect(html).toContain('80% 异常');
    expect(html).toContain('比例合计 80%');
    expect(html).toContain('还差 20%');
  });
});
