import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LeadQuotationManager,
  FEEDBACK_DISPOSITION_MAP,
} from '../components/LeadQuotationManager';
import type { Quote } from '../../quotation/types';

function buildMockQuote(overrides?: Partial<Quote>): Quote {
  return {
    id: 'test-q-1',
    quoteNo: 'QT-2026-TEST-01',
    version: 'v1.0',
    status: 'pending_quote',
    leadId: 'lead-test',
    salesOwnerName: '张三',
    basicInfo: {
      projectName: '智能工业巡检系统',
      projectType: '定制开发',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: '智能工业巡检需求',
      customerName: '某能源集团',
      customerContact: '陈总',
      customerPhone: '13800000000',
      quoteValidityDays: 30,
    },
    endpointConfigs: [
      { id: 'ep-1', name: '巡检Pad端', platforms: ['androidpad'] },
      { id: 'ep-2', name: '管理后台', platforms: ['pcweb'] },
    ],
    featureList: [
      {
        id: 'm1',
        name: '巡检任务流',
        sort: 1,
        endpointId: 'ep-1',
        subFeatures: [
          { id: 'm1-1', name: '任务下发与接单', description: 'Pad端任务推送' },
          { id: 'm1-2', name: '巡检点打卡与拍照', description: '现场打卡' },
        ],
      },
    ],
    evalSheet: {
      id: 'eval-1',
      evaluator: '罗总',
      activeRoles: [{ key: 'fe_days', name: '前端开发' }],
      evaluationUnits: [],
      manualWorkDays: 25,
      techSolutionNote: 'Pad端离线缓存方案',
    },
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0, travelDetails: [], onsiteDetails: [] },
    otherCosts: [],
    summary: {
      totalLaborDays: 45,
      projectWorkDays: 25,
      grandTotalPrice: 280000,
      paymentTerms: [],
      taxIncluded: true,
      warrantyYears: 1,
      invoiceType: '专票',
    },
    auditNodes: [],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: [],
    ccSalesNames: [],
    createdAt: '2026-08-10 10:00',
    updatedAt: '2026-08-12 14:00',
    customerFeedbacks: [
      {
        id: 'fb-1',
        disposition: 'price_high',
        dispositionLabel: '价格偏高',
        targetBudget: 220000,
        targetDays: 18,
        content: '客户陈总认为一期预算上限为 22 万元，当前 28 万超出集团批复预算；同时要求压缩交付周期至 18 个工作日内。',
        strategy: '与技术沟通，一期裁剪高级数据大屏，转入二期；报价下调至 21.8 万，工期压缩至 18 天。',
        nextAction: 'new_version',
        recordedBy: '张三',
        recordedAt: '2026-08-12 14:30',
      },
      {
        id: 'fb-2',
        disposition: 'scope_mismatch',
        dispositionLabel: '范围调整',
        content: '初次交流，客户希望增加离线断网巡检能力。',
        strategy: '已增加 Pad 端 SQLite 离线缓存架构设计。',
        recordedBy: '张三',
        recordedAt: '2026-08-10 16:00',
      },
    ],
    ...overrides,
  };
}

describe('LeadQuotationManager 方案精细化管理与客户反馈看板', () => {
  it('1. 渲染双栏布局：左侧方案卡片与右侧精细化管理控制台', () => {
    const quote = buildMockQuote();
    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-test',
        quotes: [quote],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    // 容器与双栏
    expect(markup).toContain('lead-quotation-manager');
    expect(markup).toContain('lead-quotation-manager__sidebar');
    expect(markup).toContain('lead-quotation-manager__main');

    // 左侧方案卡片
    expect(markup).toContain('方案版本 (1)');
    expect(markup).toContain('智能工业巡检系统');
    expect(markup).toContain('v1.0');
    expect(markup).toContain('待报价');
    expect(markup).toContain('25 工作日');
    expect(markup).toContain('45.0 人天');

    // 反馈徽章（价格偏高）。原来是 `● 反馈: …` 的手写文本，现已由 StatusTag 承担
    // 语义色，圆点由组件样式替代，断言改为一律比对纯文本。
    const plain = markup.replace(/<[^>]+>/g, '');
    expect(plain).toContain('反馈: 价格偏高');
    expect(plain).toContain('期望 ¥220,000');
  });

  it('2. 右侧展示 3 栏核心商务指标网格（商务总报价、交付工期与人天、方案规模与覆盖）', () => {
    const quote = buildMockQuote();
    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-test',
        quotes: [quote],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    expect(markup).toContain('商务总报价');
    expect(markup).toContain('交付工期与人天');
    expect(markup).toContain('方案规模与覆盖');
    expect(markup).toContain('25');
    expect(markup).toContain('工作日');
    expect(markup).toContain('2');
    expect(markup).toContain('端');
    expect(markup).toContain('1 个一级模块');
    expect(markup).toContain('2 个二级功能');
  });

  it('3. 客户商务反馈与博弈跟踪看板：深度展示最新反馈、量化差距、原话与应对策略', () => {
    const quote = buildMockQuote();
    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-test',
        quotes: [quote],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    // 核心标题与操作
    expect(markup).toContain('客户商务反馈与博弈跟踪');
    expect(markup).toContain('共 2 次沟通反馈');
    expect(markup).toContain('记录客户反馈');

    // 标签与记录人
    expect(markup).toContain('价格偏高');
    expect(markup).toContain('超出客户预算或审批额度');
    // 时间已改由 DateText 渲染（`记录人：张三 · <span class="hubx-date">…</span>`），走纯文本比对
    expect(markup.replace(/<[^>]+>/g, '')).toContain('记录人：张三 · 2026-08-12 14:30');

    // 差距量化对比（预算与工期差距）
    expect(markup).toContain('客户期望预算');
    expect(markup).toContain('¥220,000');
    expect(markup).toContain('超出客户预算');
    expect(markup).toContain('客户期望工期');
    expect(markup).toContain('18 工作日');
    expect(markup).toContain('超出客户期望');

    // 客户反馈原话
    expect(markup).toContain('客户陈总认为一期预算上限为 22 万元');

    // 销售内部应对策略
    expect(markup).toContain('销售应对策略与改版思路');
    expect(markup).toContain('一期裁剪高级数据大屏，转入二期');

    // 处置建议与行动入口
    expect(markup).toContain('处置建议');
    expect(markup).toContain('生成新版本报价 (v+1)');
  });

  it('4. 当方案尚无客户反馈时，呈现引导式空状态与快捷录入按钮', () => {
    const quoteWithoutFb = buildMockQuote({ customerFeedbacks: [] });
    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-test',
        quotes: [quoteWithoutFb],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    expect(markup).toContain('待跟进客户反馈');
    expect(markup).toContain('方案已生成，尚未记录客户商务反馈');
    expect(markup).toContain('立即记录客户反馈');
  });

  it('5. 当线索暂无任何报价方案时，展示空状态与首次发起报价入口', () => {
    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-test',
        quotes: [],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    expect(markup).toContain('暂无报价方案');
    expect(markup).toContain('立即发起首次报价');
  });

  it('6. 验证反馈配置字典覆盖 8 种细致商业诉求', () => {
    expect(FEEDBACK_DISPOSITION_MAP.price_high.label).toBe('价格偏高');
    expect(FEEDBACK_DISPOSITION_MAP.timeline_long.label).toBe('工期偏长');
    expect(FEEDBACK_DISPOSITION_MAP.scope_mismatch.label).toBe('范围调整');
    expect(FEEDBACK_DISPOSITION_MAP.payment_terms.label).toBe('付款争议');
    expect(FEEDBACK_DISPOSITION_MAP.tech_concerns.label).toBe('技术疑虑');
    expect(FEEDBACK_DISPOSITION_MAP.competitor.label).toBe('竞对冲击');
    expect(FEEDBACK_DISPOSITION_MAP.approved.label).toBe('基本认可');
    expect(FEEDBACK_DISPOSITION_MAP.other.label).toBe('其他反馈');
  });

  it('7. 左侧激活方案卡片采用内嵌高亮指示（左侧蓝条+检视中徽章），与右侧详情形成自然且干净的关联呼应，无多余悬空连线或箭头', () => {
    const quote = buildMockQuote();
    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-test',
        quotes: [quote],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    // 激活卡片内嵌高亮与状态
    expect(markup).toContain('is-active');
    expect(markup).toContain('检视中');

    // 绝无生硬或突出的悬空指示箭头
    expect(markup).not.toContain('lead-quote-mini-card__connector');

    // 右侧详情头部的关联标识
    expect(markup).toContain('关联方案详情');
  });
});
