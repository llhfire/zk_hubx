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

  it('8. 渲染资金流彩虹进度条与自定义付款方案模版存储入口', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 资金流彩色里程碑进度条
    expect(html).toContain('stage3-payment-flow-bar');
    expect(html).toContain('stage3-flow-segment');
    expect(html).toContain('合同签订预付款 30%');

    // 保存模版按钮入口
    expect(html).toContain('保存当前方案为模版');
    expect(html).toContain('存为模版');
  });

  it('9. 交付履约服务提供城市标准套用、单地成本小计与复制目的地能力', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 差旅城市标准
    expect(html).toContain('一线标准 (北上广深)');
    expect(html).toContain('省会/二线标准');
    expect(html).toContain('套用标准:');

    // 单地成本小计
    expect(html).toContain('单地小计:');
  });

  it('10. 外部自费代采提供高频常用代采快捷芯片库与备注说明', () => {
    const quote = createMockStage3Quote();
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 常用快捷代采芯片
    expect(html).toContain('快捷添加常用代采:');
    expect(html).toContain('+ 阿里云 ECS/RDS 服务器');
    expect(html).toContain('+ 域名注册与 SSL 国密证书');
    expect(html).toContain('+ 腾讯云短信验证码包');
    expect(html).toContain('+ 微信小程序认证与商户号');
  });

  it('11. 付款比例未达 100% 时提供一键补齐尾款快捷操作', () => {
    const quote = createMockStage3Quote({
      summary: {
        totalLaborDays: 30,
        projectWorkDays: 20,
        grandTotalPrice: 38100,
        paymentTerms: [
          { stage: '首期启动款', percent: 60 },
          { stage: '上线交付款', percent: 20 },
        ],
        taxIncluded: true,
        warrantyYears: 1,
        invoiceType: '专票',
      },
    });
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 一键补齐尾款按钮
    expect(html).toContain('一键补齐尾款 (+20%)');
    // 彩虹条中黄色警告段
    expect(html).toContain('stage3-flow-segment-warning');
    expect(html).toContain('未分配 20%');
  });

  it('12. 商务结算与付款计划完整呈现期数、预计回款日期、回款条件、回款比例与回款金额 5 大字段', () => {
    const quote = createMockStage3Quote({
      summary: {
        totalLaborDays: 30,
        projectWorkDays: 20,
        grandTotalPrice: 100000,
        paymentTerms: [
          {
            stage: '预付款',
            percent: 30,
            expectedDate: '2026-10-01',
            conditionType: 'working_day',
            conditionDays: 5,
            conditionDesc: '合同生效后',
          },
          {
            stage: '尾款',
            percent: 70,
            expectedDate: '2026-12-31',
            conditionType: 'calendar_day',
            conditionDays: 15,
            conditionDesc: '系统终验后',
          },
        ],
        taxIncluded: true,
        warrantyYears: 1,
        invoiceType: '专票',
      },
    });
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 表头 5 个核心字段
    expect(html).toContain('期数 / 阶段名称');
    expect(html).toContain('预计回款日期');
    expect(html).toContain('回款条件（自然日/工作日）');
    expect(html).toContain('回款比例');
    expect(html).toContain('回款金额');

    // 期数序号展示
    expect(html).toContain('第1期');
    expect(html).toContain('第2期');

    // 自然日 / 工作日选择器与描述
    expect(html).toContain('工作日');
    expect(html).toContain('自然日');
    expect(html).toContain('合同生效后');
    expect(html).toContain('系统终验后');

    // 动态回款金额折算 (30,100 * 30% = ¥9,030; 30,100 * 70% = ¥21,070)
    expect(html).toContain('¥9,030');
    expect(html).toContain('¥21,070');
  });

  it('13. 外部自费与代采项目具备统一表头行与各列垂直居中对齐结构', () => {
    const quote = createMockStage3Quote({
      otherCosts: [
        { id: 'c1', name: '阿里云ECS', amount: 5000, note: '客户直购' },
        { id: 'c2', name: '腾讯云短信', amount: 800, note: '我方代采' },
      ],
    });
    const html = renderToStaticMarkup(createElement(Stage3WebAutomation, { quote, readonly: false }));

    // 外部自费统一表头
    expect(html).toContain('费用名称');
    expect(html).toContain('金额');
    expect(html).toContain('备注说明 / 采购属性');
    expect(html).toContain('操作');

    // 条目内容
    expect(html).toContain('阿里云ECS');
    expect(html).toContain('腾讯云短信');
    expect(html).toContain('客户直购');
    expect(html).toContain('我方代采');
  });
});

