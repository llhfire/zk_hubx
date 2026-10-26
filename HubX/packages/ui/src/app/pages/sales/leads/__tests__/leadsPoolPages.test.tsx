import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { LeadsProvider } from '../../../../leads/LeadContext';
import { ReminderProvider } from '../../../../reminders/ReminderContext';
import { ContractsProvider } from '../../contracts/ContractsContext';
import { ProjectProvider } from '../../../delivery/project/ProjectContext';
import { CollectionProvider } from '../../../../collections/CollectionContext';
import { PublicLeads } from '../PublicLeads';
import { MyLeads } from '../MyLeads';
import { TrashLeads } from '../TrashLeads';
import { AllLeads } from '../AllLeads';
import { ClosedLeads } from '../ClosedLeads';

describe('线索各池工作台页面规范化与微指标测试', () => {
  test('公海线索池 PublicLeads 具备统一 PageShell、PageHeader 与 MetricGrid', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/leads/public'] },
        createElement(
          LeadsProvider,
          null,
          createElement(PublicLeads)
        )
      )
    );

    // 标题与说明
    expect(markup).toContain('公海线索池');
    expect(markup).toContain('沉淀共享待认领与退回公海的线索资产');
    expect(markup).toContain('新建线索');

    // 4 维微指标网格
    expect(markup).toContain('公海沉淀总数');
    expect(markup).toContain('优质高意向 (S/A级)');
    expect(markup).toContain('待首建联');
    expect(markup).toContain('当前命中视图');

    // 搜索与表格
    expect(markup).toContain('搜索线索名称、电话、联系人');
    expect(markup).toContain('线索状态');
    expect(markup).toContain('线索来源');
    expect(markup).toContain('对接主体');
    expect(markup).toContain('客户等级');
  });

  test('我的线索 MyLeads 具备统一 PageShell、PageHeader 与 MetricGrid', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/leads/my'] },
        createElement(
          LeadsProvider,
          null,
          createElement(
            ReminderProvider,
            null,
            createElement(MyLeads)
          )
        )
      )
    );

    // 标题与说明
    expect(markup).toContain('我的线索工作台');
    expect(markup).toContain('聚焦负责线索的跟进全周期');

    // 4 维微指标网格
    expect(markup).toContain('在跟线索总数');
    expect(markup).toContain('今日需跟进');
    expect(markup).toContain('逾期未跟进');
    expect(markup).toContain('深入方案/合同');

    // 列表 Tab 与状态
    expect(markup).toContain('我的线索');
    expect(markup).toContain('我录入的');
    expect(markup).toContain('我协助的');
    expect(markup).toContain('全部当前步骤');
    expect(markup).toContain('全部线索来源');
    expect(markup).toContain('全部对接主体');
  });

  test('垃圾线索池 TrashLeads 具备统一 PageShell、PageHeader 与 MetricGrid', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/leads/trash'] },
        createElement(
          LeadsProvider,
          null,
          createElement(TrashLeads)
        )
      )
    );

    // 标题与说明
    expect(markup).toContain('垃圾线索池');
    expect(markup).toContain('收纳退回、无效或报废线索');

    // 4 维微指标网格
    expect(markup).toContain('垃圾池沉淀总数');
    expect(markup).toContain('可激活挽回 (&lt;3次)');
    expect(markup).toContain('达质检退回上限 (≥3次)');
    expect(markup).toContain('当前命中视图');

    // 搜索与列表头
    expect(markup).toContain('搜索线索名称、联系人');
    expect(markup).toContain('垃圾原因');
    expect(markup).toContain('退回次数');
  });

  test('全部线索池 AllLeads 具备统一 PageShell、PageHeader 与 MetricGrid', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/leads/all'] },
        createElement(
          LeadsProvider,
          null,
          createElement(AllLeads)
        )
      )
    );

    // 标题与说明
    expect(markup).toContain('全部线索池');
    expect(markup).toContain('全息透视公司各渠道、各主体与责任人的线索流动全貌');

    // 4 维微指标网格
    expect(markup).toContain('全量线索总数');
    expect(markup).toContain('人员在跟线索');
    expect(markup).toContain('公海资源池');
    expect(markup).toContain('已签约转化');

    // 高级筛选
    expect(markup).toContain('高级筛选');
  });

  test('验证公海池、我的线索与垃圾池跨池生命周期状态闭环流转', async () => {
    const { createMockLeadService } = await import('../../../../../services/leadService');
    const service = createMockLeadService();
    const list = await service.list();
    const publicLead = list.find((l) => l.clueType === 'public');
    expect(publicLead).toBeDefined();

    // 1. 公海认领 -> 流转为 我的线索 (assigned)
    await service.claimLead(publicLead!.id, '张三');
    let updated = (await service.list()).find((l) => l.id === publicLead!.id);
    expect(updated?.clueType).toBe('assigned');
    expect(updated?.owner).toBe('张三');

    // 2. 标记垃圾 -> 流转为 垃圾池 (trash)
    await service.markTrash(publicLead!.id, '张三', '联系方式为空号');
    updated = (await service.list()).find((l) => l.id === publicLead!.id);
    expect(updated?.clueType).toBe('trash');
    expect(updated?.trashReason).toBe('联系方式为空号');

    // 3. 垃圾池退回公海 -> 释放回公海池 (public)
    await service.returnLead(publicLead!.id, '张三', '从垃圾池释放回公海池');
    updated = (await service.list()).find((l) => l.id === publicLead!.id);
    expect(updated?.clueType).toBe('public');

    // 4. 再次由销售认领 -> 恢复为 assigned
    await service.claimLead(publicLead!.id, '李四');
    updated = (await service.list()).find((l) => l.id === publicLead!.id);
    expect(updated?.clueType).toBe('assigned');
    expect(updated?.owner).toBe('李四');
  });

  test('已成交线索池 ClosedLeads 具备统一 PageShell、PageHeader 与默认筛选说明', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/leads/closed'] },
        createElement(
          LeadsProvider,
          null,
          createElement(
            ContractsProvider,
            null,
            createElement(
              ProjectProvider,
              null,
              createElement(
                CollectionProvider,
                null,
                createElement(ClosedLeads)
              )
            )
          )
        )
      )
    );

    // 标题与说明
    expect(markup).toContain('已成交线索');
    expect(markup).toContain('统一查看线索成交后关联合同、项目与实收进度');

    // 4 维微指标网格
    expect(markup).toContain('成交线索');
    expect(markup).toContain('合同总额');
    expect(markup).toContain('已回款金额');
    expect(markup).toContain('平均转化周期');

    // 统一筛选说明与占位
    expect(markup).toContain('搜索线索、客户、合同或项目');
    expect(markup).toContain('全部成交状态');
    expect(markup).toContain('全部线索来源');
    expect(markup).toContain('全部对接主体');
  });
});
