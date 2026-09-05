import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { IntegrationProvider } from '@/app/integrations/IntegrationContext';
import { AttendanceManagement } from '../AttendanceManagement';
import { EmployeeProvider } from '../EmployeeContext';
import { EmployeeDetail } from '../EmployeeDetail';
import { EmployeeList } from '../EmployeeList';
import { EmployeeSkillTree } from '../EmployeeSkillTree';
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
  it('员工列表渲染一级页头、共享指标和筛选结果，并支持跳转完整档案', () => {
    const html = renderPage(<EmployeeList />, true);
    expect(html).toContain('员工管理');
    expect(html).toContain('hubx-process-metrics');
    expect(html).toContain('员工列表');
    expect(html).toContain('名员工');
    expect(html).toContain('table-primary-link');
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

  it('员工详情页渲染 ProcessOverview、微指标、双栏工作区和项目工时履约', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/employees/1']}>
        <EmployeeProvider>
          <Routes>
            <Route path="/employees/:id" element={<EmployeeDetail />} />
          </Routes>
        </EmployeeProvider>
      </MemoryRouter>
    );
    expect(html).toContain('hubx-process-overview');
    expect(html).toContain('hubx-process-metrics');
    expect(html).toContain('hubx-process-workspace');
    expect(html).toContain('hubx-process-workspace__main');
    expect(html).toContain('hubx-process-workspace__aside');
    expect(html).toContain('能力与技能树');
    expect(html).toContain('参与项目与工时');
    // 验证顶部 actions 中包含领域技能树入口
    expect(html).toContain('领域技能树');
    expect(html).toContain('编辑资料');
    // 验证人事档案基础身份资料中包含右对齐头像
    expect(html).toContain('employee-profile-identity-layout');
    expect(html).toContain('employee-avatar-profile');
  });

  it('独立领域技能树页渲染技能解锁矩阵、微指标、雷达图与返回按钮', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/employees/1/skills']}>
        <EmployeeProvider>
          <Routes>
            <Route path="/employees/:id/skills" element={<EmployeeSkillTree />} />
          </Routes>
        </EmployeeProvider>
      </MemoryRouter>
    );
    expect(html).toContain('hubx-process-overview');
    expect(html).toContain('领域技能树');
    expect(html).toContain('技能树解锁率');
    expect(html).toContain('全域技能解锁矩阵');
    expect(html).toContain('五维能力模型与掌控度');
    expect(html).toContain('返回员工档案');
  });
});

