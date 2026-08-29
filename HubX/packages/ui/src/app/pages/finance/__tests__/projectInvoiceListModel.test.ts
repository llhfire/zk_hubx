import { describe, expect, it } from 'vitest';
import type { ProjectInvoiceApplication } from '../ProjectInvoiceContext';
import {
  calculateProjectInvoiceListMetrics,
  filterProjectInvoiceApplications,
  hasProjectInvoiceFilters,
} from '../projectInvoiceListModel';

const applications: ProjectInvoiceApplication[] = [
  {
    id: 'invoice-1', projectId: 'project-1', projectName: '华信 OA', projectNo: 'ZK-P-001', periodId: 'period-1', periodLabel: '首付款', expectedAmount: 100000,
    status: '开票中', submittedAt: '2026-08-28 09:00:00', invoiceType: '增值税专用发票', taxRate: 6, amount: 100000, taxAmount: 5660,
    customerName: '华信科技', taxpayerId: 'tax-1', customerAddress: '', customerPhone: '13800000000', bankName: '测试银行', bankAccount: '001', recipientName: '张三', recipientPhone: '13800000000', recipientEmail: '', invoiceFiles: [],
  },
  {
    id: 'invoice-2', projectId: 'project-2', projectName: '零售中台', projectNo: 'ZK-P-002', periodId: 'period-2', periodLabel: '验收款', expectedAmount: 200000,
    status: '已开票', submittedAt: '2026-08-27 09:00:00', invoiceType: '增值税普通发票', taxRate: 3, amount: 200000, taxAmount: 5825,
    customerName: '远航零售', taxpayerId: 'tax-2', customerAddress: '', customerPhone: '13900000000', bankName: '测试银行', bankAccount: '002', recipientName: '李四', recipientPhone: '13900000000', recipientEmail: '', invoiceFiles: ['invoice.pdf'],
  },
  {
    id: 'invoice-3', projectId: 'project-3', projectName: '客户门户', projectNo: 'ZK-P-003', periodId: 'period-3', periodLabel: '尾款', expectedAmount: 80000,
    status: '已冲红', submittedAt: '2026-08-26 09:00:00', invoiceType: '增值税专用发票', taxRate: 6, amount: 80000, taxAmount: 4528,
    customerName: '远航科技', taxpayerId: 'tax-3', customerAddress: '', customerPhone: '13700000000', bankName: '测试银行', bankAccount: '003', recipientName: '王五', recipientPhone: '13700000000', recipientEmail: '', invoiceFiles: ['red.pdf'],
  },
];

describe('projectInvoiceListModel', () => {
  it('按项目编号、名称和客户名称检索', () => {
    expect(filterProjectInvoiceApplications(applications, { keyword: 'ZK-P-001', status: '全部' }).map(item => item.id)).toEqual(['invoice-1']);
    expect(filterProjectInvoiceApplications(applications, { keyword: '零售中台', status: '全部' }).map(item => item.id)).toEqual(['invoice-2']);
    expect(filterProjectInvoiceApplications(applications, { keyword: '远航', status: '全部' }).map(item => item.id)).toEqual(['invoice-2', 'invoice-3']);
  });

  it('组合状态和关键词筛选', () => {
    expect(filterProjectInvoiceApplications(applications, { keyword: '远航', status: '已冲红' }).map(item => item.id)).toEqual(['invoice-3']);
    expect(filterProjectInvoiceApplications(applications, { keyword: '华信', status: '已开票' })).toEqual([]);
  });

  it('计算全部开票任务状态摘要', () => {
    expect(calculateProjectInvoiceListMetrics(applications)).toEqual({
      applicationCount: 3,
      pendingCount: 1,
      completedCount: 1,
      redFlushedCount: 1,
    });
  });

  it('识别有效筛选条件', () => {
    expect(hasProjectInvoiceFilters({ keyword: '  ', status: '全部' })).toBe(false);
    expect(hasProjectInvoiceFilters({ keyword: '华信', status: '全部' })).toBe(true);
    expect(hasProjectInvoiceFilters({ keyword: '', status: '开票中' })).toBe(true);
  });
});
