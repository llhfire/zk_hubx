import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CustomerProvider } from '../CustomerContext';
import { ContractsProvider } from '../../contracts/ContractsContext';
import { LeadsProvider } from '../../../leads/LeadContext';
import { ProjectProvider } from '../../project-management/ProjectContext';
import { QuotationProvider } from '../../quotation/QuotationContext';
import { CustomerDetail } from '../../CustomerDetail';

function renderCustomerPage(initialEntry: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CustomerProvider>
        <ContractsProvider>
          <LeadsProvider>
            <ProjectProvider>
              <QuotationProvider>
                <Routes>
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                </Routes>
              </QuotationProvider>
            </ProjectProvider>
          </LeadsProvider>
        </ContractsProvider>
      </CustomerProvider>
    </MemoryRouter>
  );
}

describe('α 客户详情页 ProcessWorkspace 标杆规范', () => {
  it('渲染顶部 ProcessOverview、4 大微可视化指标与双栏框架', () => {
    const html = renderCustomerPage('/customers/customer-pawkey');
    // ProcessOverview
    expect(html).toContain('hubx-process-overview');
    expect(html).toContain('重庆绮算法科技有限公司');
    expect(html).toContain('S 级客户');
    expect(html).toContain('企业客户');

    // 4 大微指标卡
    expect(html).toContain('hubx-process-metrics');
    expect(html).toContain('签约合同总额');
    expect(html).toContain('履约交付项目');
    expect(html).toContain('全链路业务机会');
    expect(html).toContain('关键联系人');

    // 双栏工作区
    expect(html).toContain('hubx-process-workspace');
    expect(html).toContain('hubx-process-workspace__main');
    expect(html).toContain('hubx-process-workspace__aside');
  });

  it('支持 URL query 驱动直达指定主从 Tab（例如合同与经营分析）', () => {
    const html = renderCustomerPage('/customers/customer-pawkey?main=contracts&side=finance');
    // 包含合同与回款台账
    expect(html).toContain('合同与回款');
    expect(html).toContain('合同信息');
    expect(html).toContain('合同状态');
    expect(html).toContain('回款进度');

    // Aside 包含经营分析
    expect(html).toContain('合作价值摘要');
    expect(html).toContain('累计签约总额');
  });

  it('支持 URL query 直达履约项目 Tab 并渲染交付进度', () => {
    const html = renderCustomerPage('/customers/customer-pawkey?main=projects');
    expect(html).toContain('履约项目');
    expect(html).toContain('统计说明');
  });

  it('支持 URL query 直达联系人矩阵 Tab 并展示决策链', () => {
    const html = renderCustomerPage('/customers/customer-pawkey?main=contacts');
    expect(html).toContain('联系人与决策人');
    expect(html).toContain('决策链与沟通矩阵');
    expect(html).toContain('陈女士');
    expect(html).toContain('产品负责人');
    expect(html).toContain('主联系人');
  });
});
