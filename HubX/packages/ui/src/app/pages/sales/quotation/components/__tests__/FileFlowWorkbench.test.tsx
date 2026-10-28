import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FileFlowWorkbench } from '../FileFlowWorkbench';
import type { Quote } from '../../types';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../QuotationContext', () => ({
  useQuotation: () => ({
    saveFeatureList: vi.fn(),
    submitFeatureList: vi.fn(),
    saveEvalSheet: vi.fn(),
    submitEval: vi.fn(),
    updateQuote: vi.fn(),
    submitForAudit: vi.fn(),
    isLeadFrozen: () => false,
  }),
}));

function createMockQuote(extra?: Partial<Quote>): Quote {
  return {
    id: 'quote-flow-1',
    quoteNo: 'QT-2026-TEST',
    version: 'v1.0',
    status: 'draft',
    leadId: 'lead-test-1',
    salesOwnerName: '王销售',
    flowMode: 'file',
    basicInfo: {
      projectName: '工业物联网监控看板',
      projectType: '其他定制',
      creatorName: '李产品',
      techEvaluatorName: '张架构',
      requirementDesc: '支持设备采集与实时数据大屏展示',
      customerName: '某智能制造科技公司',
      customerContact: '赵总',
      customerPhone: '13800002222',
      quoteValidityDays: 30,
    },
    endpointConfigs: [],
    featureList: [
      {
        id: 'mod-1',
        name: '边缘数据网关',
        sort: 1,
        subFeatures: [
          { id: 'sub-1', name: 'Modbus协议采集', description: '高频传感器接入' },
        ],
      },
    ],
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: 'Go' },
    travelOnsite: {
      enableTravel: false,
      travelCity: '',
      travelDays: 0,
      onsiteDelivery: false,
      onsiteStaff: '',
      onsiteDays: 0,
    },
    otherCosts: [],
    auditNodes: [],
    stampNode: { status: 'pending' },
    timeline: [],
    ccSalesNames: [],
    fileFlow: {
      evaluationFileName: '工业网关系统技术评估表_v1.xlsx',
      evaluationWorkDays: 25,
      evaluationTotalDays: 40,
      evaluationNotes: '网关基于 Go 语言研发，支持边缘计算与断网续传',
      quoteWorkDays: 30,
      quoteAmount: 200000,
      paymentPlan: {
        presetId: 'standard-3331',
        milestones: [
          { name: '首期款（预付款）', ratio: 30, note: '合同生效后' },
          { name: '中期款（阶段验收）', ratio: 30, note: '边缘网关初测通过' },
          { name: '终验款（上线交付）', ratio: 30, note: '大屏联调合格' },
          { name: '质保金（质保期满）', ratio: 10, note: '质保1年期满' },
        ],
      },
      warrantyYears: 1,
      invoiceType: '专票6%',
      onlineDocument: { status: 'saved', savedAt: '2026-09-06' },
      scans: [],
    },
    ...extra,
  };
}

describe('FileFlowWorkbench 文件流转工作台全链路交互', () => {
  it('1. 阶段一：渲染功能清单导入与结构化汇总', () => {
    const quote = createMockQuote();
    const markup = renderToStaticMarkup(
      createElement(FileFlowWorkbench, {
        quote,
        stage: 1,
        readonly: false,
      })
    );

    expect(markup).toContain('文件流转 · 阶段一：功能清单导入与结构化');
    expect(markup).toContain('边缘数据网关');
    expect(markup).toContain('提交技术评估（共 1 项）');
  });

  it('2. 阶段二：技术评估原件存证、工时与底线成本测算', () => {
    const quote = createMockQuote();
    const markup = renderToStaticMarkup(
      createElement(FileFlowWorkbench, {
        quote,
        stage: 2,
        readonly: false,
      })
    );

    expect(markup).toContain('文件流转 · 阶段二：技术评估与工时存证');
    expect(markup).toContain('工业网关系统技术评估表_v1.xlsx');
    expect(markup).toContain('评估交付工期（工作日）');
    expect(markup).toContain('评估研发总人天（人天）');
    expect(markup).toContain('基准研发底线成本：');
    expect(markup).toContain('¥24,000');
    expect(markup).toContain('40 人天 × 600元/天日成本测算');
    expect(markup).toContain('网关基于 Go 语言研发');
    expect(markup).toContain('提交评估结果至销售');
  });

  it('3. 阶段三：商务报价、底线毛利率健康分析与付款节点分期配置', () => {
    const quote = createMockQuote();
    const markup = renderToStaticMarkup(
      createElement(FileFlowWorkbench, {
        quote,
        stage: 3,
        readonly: false,
      })
    );

    expect(markup).toContain('文件流转 · 阶段三：商务报价、付款方式与在线文档');
    expect(markup).toContain('核心商务报价与毛利率测算（ADR-0014 底线管控）');
    expect(markup).toContain('技术底线成本 (评估 40 人天)');
    expect(markup).toContain('¥24,000');
    expect(markup).toContain('预估毛利润');
    expect(markup).toContain('¥176,000');
    expect(markup).toContain('88%');
    expect(markup).toContain('良好 (毛利高于25%)');
    expect(markup).toContain('分期付款节点（Payment Terms，严格满 100%）');
    expect(markup).toContain('首期款（预付款）');
    expect(markup).toContain('各期付款比例总和为 100%，符合财务合规要求');
    expect(markup).toContain('提交商务与技术方案审批');
  });

  it('4. 阶段四：审批中心顶部穿透展示全套流转文件袋 (File Dossier)', () => {
    const quote = createMockQuote();
    const markup = renderToStaticMarkup(
      createElement(FileFlowWorkbench, {
        quote,
        stage: 4,
        readonly: false,
      })
    );

    expect(markup).toContain('全套流转文件袋（Dossier · 审批人一键穿透调阅）');
    expect(markup).toContain('📂 1. 结构化功能清单');
    expect(markup).toContain('📄 2. 技术评估原件');
    expect(markup).toContain('工业网关系统技术评估表_v1.xlsx');
    expect(markup).toContain('💼 3. 商务财务分析');
    expect(markup).toContain('¥200,000');
    expect(markup).toContain('88%');
    expect(markup).toContain('📝 4. 付款方式与条款');
    expect(markup).toContain('30% : 30% : 30% : 10%');
  });
});
