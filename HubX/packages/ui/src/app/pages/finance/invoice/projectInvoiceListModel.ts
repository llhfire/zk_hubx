import type { ProjectInvoiceApplication, ProjectInvoiceStatus } from './ProjectInvoiceContext';

export type ProjectInvoiceListStatus = '全部' | ProjectInvoiceStatus;

export interface ProjectInvoiceListFilters {
  keyword: string;
  status: ProjectInvoiceListStatus;
}

export interface ProjectInvoiceListMetrics {
  applicationCount: number;
  pendingCount: number;
  completedCount: number;
  redFlushedCount: number;
}

export const EMPTY_PROJECT_INVOICE_FILTERS: ProjectInvoiceListFilters = {
  keyword: '',
  status: '全部',
};

export function filterProjectInvoiceApplications(
  applications: ProjectInvoiceApplication[],
  filters: ProjectInvoiceListFilters,
): ProjectInvoiceApplication[] {
  const keyword = filters.keyword.trim().toLowerCase();

  return applications.filter((application) => {
    if (filters.status !== '全部' && application.status !== filters.status) return false;
    if (!keyword) return true;

    return [
      application.projectNo,
      application.projectName,
      application.customerName,
      application.periodLabel,
      application.invoiceType,
    ].some(value => value.toLowerCase().includes(keyword));
  });
}

export function calculateProjectInvoiceListMetrics(
  applications: ProjectInvoiceApplication[],
): ProjectInvoiceListMetrics {
  return applications.reduce<ProjectInvoiceListMetrics>((metrics, application) => {
    metrics.applicationCount += 1;
    if (application.status === '开票中') metrics.pendingCount += 1;
    if (application.status === '已开票') metrics.completedCount += 1;
    if (application.status === '已冲红') metrics.redFlushedCount += 1;
    return metrics;
  }, {
    applicationCount: 0,
    pendingCount: 0,
    completedCount: 0,
    redFlushedCount: 0,
  });
}

export function hasProjectInvoiceFilters(filters: ProjectInvoiceListFilters): boolean {
  return Boolean(filters.keyword.trim() || filters.status !== '全部');
}
