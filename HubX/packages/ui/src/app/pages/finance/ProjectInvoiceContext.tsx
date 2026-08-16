import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ProjectInvoiceStatus = '开票中' | '已开票' | '已冲红';

export interface ProjectPaymentPeriodSnapshot {
  periodId: string;
  periodLabel: string;
  expectedAmount: number;
  paidAmount: number;
  expectedDate: string;
  paymentStatus: '未回款' | '部分回款' | '已回款';
}

export interface ProjectInvoiceApplication {
  id: string;
  projectId: string;
  projectName: string;
  projectNo: string;
  contractId?: string;
  periodId: string;
  periodLabel: string;
  expectedAmount: number;
  status: ProjectInvoiceStatus;
  submittedAt: string;
  invoicedAt?: string;
  invoiceType: string;
  taxRate: number;
  amount: number;
  paymentStatus?: '未回款' | '部分回款' | '已回款';
  paymentPeriods?: ProjectPaymentPeriodSnapshot[];
  taxAmount: number;
  customerName: string;
  taxpayerId: string;
  customerAddress: string;
  customerPhone: string;
  bankName: string;
  bankAccount: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  invoiceFiles: string[];
  redFlushReason?: string;
  redFlushedAt?: string;
  redFlushFiles?: string[];
  sourceInvoiceId?: string;
}

type NewApplication = Omit<ProjectInvoiceApplication, 'id' | 'status' | 'submittedAt' | 'invoicedAt' | 'invoiceFiles'>;

interface ProjectInvoiceContextValue {
  applications: ProjectInvoiceApplication[];
  submitApplication: (application: NewApplication) => void;
  completeInvoice: (id: string, invoiceFiles: string[]) => void;
  redFlushInvoice: (id: string, reason: string, files: string[]) => void;
  findApplication: (projectId: string, periodId: string) => ProjectInvoiceApplication | undefined;
  syncPaymentPeriods: (projectId: string, periods: ProjectPaymentPeriodSnapshot[]) => void;
}

const STORAGE_KEY = 'hubx-project-invoice-applications';
const ProjectInvoiceContext = createContext<ProjectInvoiceContextValue | null>(null);

function loadApplications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as ProjectInvoiceApplication[] : [];
  } catch {
    return [];
  }
}

export function ProjectInvoiceProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<ProjectInvoiceApplication[]>(loadApplications);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  const value = useMemo<ProjectInvoiceContextValue>(() => ({
    applications,
    submitApplication: application => {
      setApplications(current => [
        {
          ...application,
          id: `project-invoice-application-${Date.now()}`,
          status: '开票中',
          submittedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
          invoiceFiles: [],
        },
        ...current.filter(item => !(item.projectId === application.projectId && item.periodId === application.periodId)),
      ]);
    },
    completeInvoice: (id, invoiceFiles) => {
      setApplications(current => current.map(item => item.id === id ? {
        ...item,
        status: '已开票',
        invoicedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        invoiceFiles,
      } : item));
    },
    redFlushInvoice: (id, reason, files) => {
      setApplications(current => {
        const source = current.find(item => item.id === id);
        if (!source || source.status !== '已开票') return current;
        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        return [
          { ...source, id: `project-invoice-reissue-${Date.now()}`, status: '开票中', submittedAt: now, invoicedAt: undefined, invoiceFiles: [], sourceInvoiceId: source.id },
          ...current.map(item => item.id === id ? { ...item, status: '已冲红' as const, redFlushReason: reason, redFlushedAt: now, redFlushFiles: files } : item),
        ];
      });
    },
    findApplication: (projectId, periodId) => applications.find(
      item => item.projectId === projectId && item.periodId === periodId,
    ),
    syncPaymentPeriods: (projectId, periods) => {
      setApplications(current => {
        const serialized = JSON.stringify(periods);
        if (!current.some(item => item.projectId === projectId && JSON.stringify(item.paymentPeriods ?? []) !== serialized)) return current;
        return current.map(item => item.projectId === projectId ? { ...item, paymentPeriods: periods } : item);
      });
    },
  }), [applications]);

  return <ProjectInvoiceContext.Provider value={value}>{children}</ProjectInvoiceContext.Provider>;
}

export function useProjectInvoices() {
  const context = useContext(ProjectInvoiceContext);
  if (!context) throw new Error('useProjectInvoices must be used within ProjectInvoiceProvider');
  return context;
}
