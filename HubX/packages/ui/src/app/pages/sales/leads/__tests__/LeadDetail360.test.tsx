import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApprovalProvider } from '../../../../approvals/ApprovalContext';
import { CollectionProvider } from '../../../../collections/CollectionContext';
import { LeadsProvider } from '../../../../leads/LeadContext';
import { TodoProvider } from '../../../../todos/TodoContext';
import { LeadDetail360 } from '../LeadDetail360';
import { LeadStagePopover, LeadStagePopoverContent } from '../components/LeadStagePopover';
import { ContractsProvider } from '../../contracts/ContractsContext';
import { CustomerProvider } from '../../customers/CustomerContext';
import { ProjectProvider } from '../../../delivery/project/ProjectContext';
import { QuotationProvider } from '../../quotation/QuotationContext';

function renderLeadDetail360Markup(entry = '/leads/my/lead-1') {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [entry] },
      createElement(
        ApprovalProvider,
        null,
        createElement(
          TodoProvider,
          null,
          createElement(
            LeadsProvider,
            null,
            createElement(
              CustomerProvider,
              null,
              createElement(
                ProjectProvider,
                null,
                createElement(
                  ContractsProvider,
                  null,
                  createElement(
                    QuotationProvider,
                    null,
                    createElement(
                      CollectionProvider,
                      null,
                      createElement(
                        Routes,
                        null,
                        createElement(Route, {
                          path: '/leads/:type/:id',
                          element: createElement(LeadDetail360),
                        }),
                        createElement(Route, {
                          path: '/leads/all/:id',
                          element: createElement(LeadDetail360),
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

describe('LeadDetail360 信息架构全面重构验证', () => {
  it('1. 顶部 Header、统一指标网格与步进条驾驶舱完整渲染', () => {
    const markup = renderLeadDetail360Markup('/leads/my/lead-1');

    // 顶部 ProcessOverview
    expect(markup).toContain('hubx-process-overview');
    expect(markup).toContain('A公司CRM系统开发需求');
    expect(markup).toContain('A公司');

    // 统一指标网格 ProcessMetricGrid
    expect(markup).toContain('hubx-process-metrics');
    expect(markup).toContain('负责人');
    expect(markup).toContain('对接人');
    expect(markup).toContain('总标的');
    expect(markup).toContain('客资成本');
    expect(markup).toContain('跟进次数');
    expect(markup).toContain('下次跟进');

    // 步进条步骤下拉面板触发器 (对齐项目管理 LeadStagePopover 规范)
    expect(markup.match(/lead-stage-popover__trigger/g)).toHaveLength(6);
    expect(markup).toContain('接入录入');
    expect(markup).toContain('初步建联');
    expect(markup).toContain('需求调研');
    expect(markup).toContain('主合同签署');
    expect(markup).toContain('项目交付中');
    expect(markup).toContain('终验结项');
    expect(markup).toContain('推进阶段');
    expect(markup).toContain('进行中 · 已停留');
  });

  it('2. 左侧主工作区默认渲染 6 大业务实体 Tab 骨架与基础档案', () => {
    const markup = renderLeadDetail360Markup('/leads/my/lead-1');

    // 6 大业务实体 Tab 标签
    expect(markup).toContain('基础档案');
    expect(markup).toContain('方案与报价');
    expect(markup).toContain('合同与财务');
    expect(markup).toContain('差旅与费用');
    expect(markup).toContain('交付执行');
    expect(markup).toContain('资料与环境');

    // 默认 basic 激活：初始业务需求、档案描述
    expect(markup).toContain('初始业务需求');
    expect(markup).toContain('对接主体');
    expect(markup).toContain('线索意向');
    expect(markup).toContain('线索状态');
    expect(markup).toContain('客户主体');

    // 线索附件内聚在线索详情卡中（embedded 模式无独立外层 Card 割裂）
    expect(markup).toContain('lead-attachment-panel--embedded');
    expect(markup).toContain('线索附件');
    expect(markup).toContain('管理附件');
  });

  it('3. 支持 URL 查询参数切换到方案与报价 Tab 并展现宽屏工作台', () => {
    const markup = renderLeadDetail360Markup('/leads/my/lead-1?tab=quotation');

    // 包含方案与报价主区
    expect(markup).toContain('新建报价');
    expect(markup).toContain('沉淀此线索的技术方案成本测算与多版本报价记录');
  });

  it('4. 支持 URL 查询参数切换到合同与财务 Tab', () => {
    const markup = renderLeadDetail360Markup('/leads/my/lead-1?tab=contracts');

    // 合同与财务内容
    expect(markup).toContain('新建合同');
    expect(markup).toContain('正式主合同');
    expect(markup).toContain('补充合同');
    expect(markup).toContain('回款与发票台账');
  });

  it('5. 向前兼容旧版侧边栏参数 mapping (例如 contract-records 自动映射为 contracts)', () => {
    const markup = renderLeadDetail360Markup('/leads/my/lead-1?tab=contract-records');

    // 映射到 contracts
    expect(markup).toContain('正式主合同');
    expect(markup).toContain('回款与发票台账');
  });

  it('6. 支持差旅与费用、交付执行、资料与环境 Tab', () => {
    const travelMarkup = renderLeadDetail360Markup('/leads/my/lead-1?tab=travel');
    expect(travelMarkup).toContain('出差申请记录');
    expect(travelMarkup).toContain('费用报销记录');

    const deliveryMarkup = renderLeadDetail360Markup('/leads/my/lead-1?tab=delivery');
    expect(deliveryMarkup).toContain('交付里程碑');
    expect(deliveryMarkup).toContain('任务看板');
    expect(deliveryMarkup).toContain('缺陷跟踪');

    const assetsMarkup = renderLeadDetail360Markup('/leads/my/lead-1?tab=assets');
    expect(assetsMarkup).toContain('演示环境管理');
  });

  it('7. 右侧 Aside 区域精简为沟通协同与动态流（AI 摘要 + 常驻快捷写跟进 + 互动时间线）', () => {
    const markup = renderLeadDetail360Markup('/leads/my/lead-1');

    // 售前聊天群分析与 AI 洞察
    expect(markup).toContain('售前聊天群分析');
    expect(markup).toContain('AI 摘要洞察');

    // 常驻快捷写跟进（Quick Logger）
    expect(markup).toContain('快捷写跟进');
    expect(markup).toContain('就地记录本次跟进要点、客户核心反馈...');
    expect(markup).toContain('下次跟进');
    expect(markup).toContain('详细表单(传附件)');

    // 互动时间线与筛选器
    expect(markup).toContain('跟进与互动动态');
    expect(markup).toContain('全部');
    expect(markup).toContain('电话');
    expect(markup).toContain('微信');
    expect(markup).toContain('拜访');
  });

  it('8. 步进条步骤下拉面板 (LeadStagePopover) 展开展示 SOP 指引、动作清单与推进控制器', () => {
    const sopMarkup = renderToStaticMarkup(
      createElement(LeadStagePopoverContent, {
        stageIndex: 2,
        currentStageIndex: 2,
        daysHeld: 3,
        nextStageLabel: '方案报价',
        sopInfo: {
          key: 'research',
          label: '需求调研',
          target: '梳理业务功能边界，输出技术清单与原型示意',
          checklist: [
            { id: 'c-2-1', label: '收集整理客户功能清单与业务流', targetTab: 'basic' },
            { id: 'c-2-2', label: '出具或关联产品原型示意', targetTab: 'assets' },
            { id: 'c-2-3', label: '确认客户期望交付工期与预算上线节点', targetTab: 'quotation' },
          ],
          suggestedActionLabel: '补充需求描述',
          suggestedActionKey: 'edit',
          nextStatuses: ['方案报价'],
        },
        onNavigateTab: () => {},
        onAction: () => {},
        onAdvanceStage: () => {},
      }),
    );

    // 弹窗头部与状态
    expect(sopMarkup).toContain('需求调研');
    expect(sopMarkup).toContain('进行中 · 已停留 3 天');
    expect(sopMarkup).toContain('阶段 SOP 指引');

    // 核心目标
    expect(sopMarkup).toContain('核心目标：');
    expect(sopMarkup).toContain('梳理业务功能边界，输出技术清单与原型示意');

    // 关键动作清单
    expect(sopMarkup).toContain('SOP 关键动作清单');
    expect(sopMarkup).toContain('收集整理客户功能清单与业务流');
    expect(sopMarkup).toContain('出具或关联产品原型示意');

    // 底部动作与推进控制器
    expect(sopMarkup).toContain('补充需求描述');
    expect(sopMarkup).toContain('推进至下一阶段：方案报价 &gt;');
  });
});
