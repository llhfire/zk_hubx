import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Stage4Approval } from '../stages/Stage4Approval';
import type { Quote } from '../types';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const { getMockRole, setMockRole } = vi.hoisted(() => {
  let role = 'sales';
  return {
    getMockRole: () => role,
    setMockRole: (r: string) => {
      role = r;
    },
  };
});

vi.mock('../QuotationContext', () => ({
  useQuotation: () => ({
    get currentRole() {
      return getMockRole();
    },
    currentViewer: '王销售',
    decideAudit: vi.fn(),
    stampQuote: vi.fn(),
    markSent: vi.fn(),
    markConfirmed: vi.fn(),
    markVoided: vi.fn(),
    withdrawSent: vi.fn(),
    returnToStamp: vi.fn(),
    returnToEditFeatures: vi.fn(),
    isLeadFrozen: () => false,
    updateQuote: vi.fn(),
    quotes: [
      {
        id: 'quote-test-s4-v1',
        quoteNo: 'QT-2026-ONLINE-S4',
        version: 'v1.0',
        status: 'rejected',
        leadId: 'lead-test-1',
        salesOwnerName: '王销售',
        flowMode: 'online',
        signingEntity: 'zkrt',
        basicInfo: {
          projectName: '企业级协同管理平台研发',
          projectType: '其他定制',
          creatorName: '李产品',
          techEvaluatorName: '张架构',
          requirementDesc: '初版需求',
          customerName: '某智能集团有限公司',
          customerContact: '陈总',
          customerPhone: '13900008888',
          quoteValidityDays: 30,
        },
        endpointConfigs: [],
        featureList: [],
        salesAddedRoles: [],
        frontendConfig: { platforms: [] },
        backendConfig: { services: [], language: 'Java' },
        travelOnsite: {
          enableTravel: false,
          travelCity: '',
          travelDays: 0,
          travelHeadcount: 0,
          travelSubtotal: 0,
          travelDetails: [],
          enableOnsite: false,
          onsiteCity: '',
          onsiteDays: 0,
          onsiteDailyCost: 0,
          onsiteSubtotal: 0,
          onsiteDetails: [],
        },
        otherCosts: [],
        auditNodes: [],
        stampNode: { stamperName: '印章管理员', status: 'LOCKED' },
        summary: {
          totalLaborDays: 20,
          projectWorkDays: 15,
          grandTotalPrice: 30000,
          paymentTerms: [{ stage: '首款', percent: 100 }],
          taxIncluded: true,
          warrantyYears: 1,
          invoiceType: '专票',
        },
      },
    ],
  }),
}));

function createMockStage4Quote(extra?: Partial<Quote>): Quote {
  return {
    id: 'quote-test-s4-2',
    quoteNo: 'QT-2026-ONLINE-S4',
    version: 'v2.0',
    status: 'auditing',
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
      { id: 'c1', name: '阿里云ECS服务器', amount: 5000, note: '客户直购' },
    ],
    auditNodes: [
      { quoteRole: 'sales_manager', auditorName: '黄奕', role: '销售主管', status: 'PENDING' },
      { quoteRole: 'tech', auditorName: '罗总', role: '技术总监', status: 'PENDING' },
      { quoteRole: 'decision', auditorName: '闵总', role: '财务/决策人', status: 'PENDING' },
    ],
    stampNode: {
      stamperName: '李印管',
      status: 'LOCKED',
    },
    summary: {
      totalLaborDays: 25,
      projectWorkDays: 20,
      grandTotalPrice: 38100,
      paymentTerms: [
        { stage: '合同签订预付款', percent: 40, conditionDays: 5, conditionType: 'working_day', conditionDesc: '合同签署后' },
        { stage: '系统终验交付款', percent: 60, conditionDays: 10, conditionType: 'working_day', conditionDesc: '验收合格后' },
      ],
      taxIncluded: true,
      warrantyYears: 1,
      invoiceType: '专票',
    },
    ...extra,
  };
}

describe('Stage 4 Approval & Stamping (系统审批与盖章重构)', () => {
  it('1. 渲染顶部流转指挥中心 (Approval Command Bar) 与会签进度条', () => {
    setMockRole('sales');
    const quote = createMockStage4Quote();
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    // 标题与流转模式标签
    expect(html).toContain('系统审批与盖章');
    expect(html).toContain('数据流转');
    expect(html).toContain('待审核');
    expect(html).toContain('QT-2026-ONLINE-S4');
    expect(html).toContain('v2.0');

    // 审批节点展示
    expect(html).toContain('黄奕');
    expect(html).toContain('罗总');
    expect(html).toContain('闵总');
    expect(html).toContain('销售主管');
    expect(html).toContain('技术总监');
    expect(html).toContain('企业公章');
    expect(html).toContain('客户成交');
  });

  it('2. 当前审批人处在待审节点时高亮呈现「同意并通过」与「驳回修改」', () => {
    setMockRole('sales_manager'); // 黄奕角色
    const quote = createMockStage4Quote({ status: 'auditing' });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    expect(html).toContain('同意并通过');
    expect(html).toContain('驳回修改');
  });

  it('3. 状态处在待盖章 (pending_stamp) 时印章管理员呈现盖章动作入口（支持双分支）', () => {
    setMockRole('assistant');
    const quote = createMockStage4Quote({
      status: 'pending_stamp',
      stampNode: { stamperName: '黄海', status: 'PENDING_STAMP' },
    });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    expect(html).toContain('确认使用所选文件并加盖公章');
    expect(html).toContain('上传实体章扫描件');
  });

  it('4. 状态处于已盖章 (stamped) 时销售人员展示「登记发送客户」与「退回盖章」', () => {
    setMockRole('sales');
    const quote = createMockStage4Quote({
      status: 'stamped',
      stampNode: { stamperName: '李印管', status: 'COMPLETED', stampTime: '2026-09-07 10:00' },
    });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    expect(html).toContain('登记发送客户');
    expect(html).toContain('退回盖章');
  });

  it('5. 状态处于已发送 (sent) 时展示「确认成交」、「客户放弃·作废」与「撤回发出」', () => {
    setMockRole('sales');
    const quote = createMockStage4Quote({
      status: 'sent',
      sentAt: '2026-09-07 10:30',
    });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    expect(html).toContain('确认成交');
    expect(html).toContain('客户放弃·作废');
    expect(html).toContain('撤回发出');
    expect(html).toContain('正式发送时间：2026-09-07 10:30');
  });

  it('6. 状态处于已成交 (confirmed) 时渲染商业成果战报并提供合同向导直通车', () => {
    setMockRole('sales');
    const quote = createMockStage4Quote({
      status: 'confirmed',
    });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    // 战报 Banner
    expect(html).toContain('商业成果达成：该报价单已由客户确认成交！');
    expect(html).toContain('某智能集团有限公司');
    expect(html).toContain('一键生成主合同');
  });

  it('7. 正式公函与电子签章 Tab 渲染标准 A4 纸质公函并带防伪验真编码', () => {
    setMockRole('sales');
    const quote = createMockStage4Quote({
      status: 'stamped',
      stampNode: { stamperName: '李印管', status: 'COMPLETED', stampTime: '2026-09-07 10:00' },
    });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    expect(html).toContain('标准 A4 客户版公文');
    expect(html).toContain('stage4-a4-paper');
    expect(html).toContain('防伪验真编码：QT-2026-ONLINE-S4-SEC-');
    expect(html).toContain('系统全链路存证有效');
  });

  it('8. 审批风控与版本对比 Tab 呈现 4 维体检卡与前序版本差异 Diff', () => {
    setMockRole('decision');
    const quote = createMockStage4Quote({ status: 'auditing' });
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false, defaultTab: 'risk_diff' }));

    // 审批风控体检雷达指标
    expect(html).toContain('审批风控体检雷达');
    expect(html).toContain('预估综合毛利率');
    expect(html).toContain('技术人天与交付工期');
    expect(html).toContain('外部自费与代采项目');
    expect(html).toContain('商务结算与付款期数');

    // 版本对比
    expect(html).toContain('版本变更对比');
    expect(html).toContain('v2.0 vs v1.0');
    expect(html).toContain('已自动关联历史版本');
    expect(html).toContain('总报价');
    expect(html).toContain('技术人天');
  });

  it('9. 右侧商务风控驾驶舱呈现总报价、发票、质保期与责任人', () => {
    setMockRole('sales');
    const quote = createMockStage4Quote();
    const html = renderToStaticMarkup(createElement(Stage4Approval, { quote, readonly: false }));

    expect(html).toContain('对外总报价 (含税)');
    expect(html).toContain('负责销售');
    expect(html).toContain('王销售');
    expect(html).toContain('报价有效期');
    expect(html).toContain('30 天');
    expect(html).toContain('免费质保');
    expect(html).toContain('1 年');
  });
});
