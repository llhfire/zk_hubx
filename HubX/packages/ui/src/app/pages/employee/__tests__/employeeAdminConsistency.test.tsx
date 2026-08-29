import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { IntegrationProvider } from '@/app/integrations/IntegrationContext';
import { AttendanceManagement } from '../AttendanceManagement';
import { EmployeeProvider } from '../EmployeeContext';
import { EmployeeList } from '../EmployeeList';
import { LevelRateSettings } from '../LevelRateSettings';
import { PerformanceManagement } from '../PerformanceManagement';

function renderPage(page: React.ReactNode, withIntegration = false) {
  const content = <EmployeeProvider>{page}</EmployeeProvider>;
  return renderToStaticMarkup(
    <MemoryRouter>
      {withIntegration ? <IntegrationProvider>{content}</IntegrationProvider> : content}
    </MemoryRouter>,
  );
}

describe('α 人资管理统一页面框架', () => {
  it('员工列表渲染一级页头、共享指标和筛选结果', () => {
    const html = renderPage(<EmployeeList />, true);
    expect(html).toContain('员工管理');
    expect(html).toContain('hubx-process-metrics');
    expect(html).toContain('员工列表');
    expect(html).toContain('名员工');
  });

  it('考勤页渲染二级面包屑、共享指标和申请列表', () => {
    const html = renderPage(<AttendanceManagement />);
    expect(html).toContain('hubx-page-breadcrumb');
    expect(html).toContain('考勤管理');
    expect(html).toContain('待审批申请');
    expect(html).toContain('考勤申请');
  });

  it('绩效页渲染统一页头、指标和筛选列表', () => {
    const html = renderPage(<PerformanceManagement />);
    expect(html).toContain('绩效考核');
    expect(html).toContain('平均 KPI');
    expect(html).toContain('绩效记录');
  });

  it('职位页渲染二级面包屑、费率指标和矩阵', () => {
    const html = renderPage(<LevelRateSettings />);
    expect(html).toContain('职位与职级');
    expect(html).toContain('平均标准时薪');
    expect(html).toContain('职级费率矩阵');
  });
});
