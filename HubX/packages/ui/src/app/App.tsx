import { useCallback, type ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { ReminderProvider } from './reminders/ReminderContext';
import { ContractsProvider } from './pages/contracts/ContractsContext';
import { EmployeeProvider } from './pages/employee';
import { JobWorkConfigProvider } from './pages/daily-report/JobWorkConfigContext';
import { FeedbackProvider } from './feedback/FeedbackContext';
import { IntegrationProvider } from './integrations/IntegrationContext';
import { ApprovalProvider } from './approvals/ApprovalContext';
import { TodoProvider } from './todos/TodoContext';
import { router } from './routes';
import { ProjectInvoiceProvider } from './pages/finance/ProjectInvoiceContext';
import { QuotationProvider } from './pages/quotation/QuotationContext';
import { ProjectProvider } from './pages/project-management/ProjectContext';
import { BusinessCaseProvider } from './business-case/BusinessCaseContext';
import { SmartMeetingProvider } from './pages/smart-meetings/SmartMeetingContext';
import { SigningOpenBridge } from './pages/contracts/ApprovalDeliveryBridge';
import type { QuotationService } from '@/services/quotationService';
import type { ContractService } from '@/services/contractService';
import type { LeadService } from '@/services/leadService';
import type { ProjectService } from '@/services/projectService';
import type { CollectionService } from '@/services/collectionService';
import type { EmployeeService } from '@/services/employeeService';
import { LeadsProvider, useLeads } from './leads/LeadContext';
import { CollectionProvider } from './collections/CollectionContext';
import { AppVersionProvider } from './version/AppVersionContext';
import type { AppVersion } from './version/versionMatrix';
import { CustomerProvider } from './pages/customers/CustomerContext';

interface AppProps {
  /** 报价数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  quotationService?: QuotationService;
  /** 合同数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  contractService?: ContractService;
  /** 线索数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  leadService?: LeadService;
  /** 项目数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  projectService?: ProjectService;
  /** 回款实收台账：α版注入 mock，β版注入 http。缺省 mock。 */
  collectionService?: CollectionService;
  /** 员工数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  employeeService?: EmployeeService;
  /** 当前版本标识：α版=prototype（缺省），β版=web。控制侧边栏版本标识与功能对比弹窗。 */
  appVersion?: AppVersion;
}

function QuotationWithLeadBridge({ children, service }: { children: ReactNode; service?: QuotationService }) {
  const { getById } = useLeads();
  const leadBriefProvider = useCallback((leadId: string) => {
    const lead = getById(leadId);
    return lead ? { status: lead.status, ownerName: lead.owner } : null;
  }, [getById]);

  return (
    <QuotationProvider service={service} leadBriefProvider={leadBriefProvider}>
      {children}
    </QuotationProvider>
  );
}

function App({ quotationService, contractService, leadService, projectService, collectionService, employeeService, appVersion = 'alpha' }: AppProps) {
  return (
    <AppVersionProvider version={appVersion}>
      <IntegrationProvider>
      <ApprovalProvider>
        <TodoProvider>
          <FeedbackProvider>
            <CustomerProvider>
              <ContractsProvider service={contractService}>
              <ReminderProvider>
              <EmployeeProvider service={employeeService}>
                <JobWorkConfigProvider>
                    <LeadsProvider service={leadService}>
                    <ProjectProvider service={projectService}>
                      <CollectionProvider service={collectionService}>
                      <BusinessCaseProvider>
                      <ProjectInvoiceProvider>
                        <QuotationWithLeadBridge service={quotationService}>
                          <SmartMeetingProvider>
                          {/* 签约开启联动桥（无 UI，见 SigningOpenBridge 注释） */}
                          <SigningOpenBridge />
                          <RouterProvider router={router} />
                          </SmartMeetingProvider>
                        </QuotationWithLeadBridge>
                      </ProjectInvoiceProvider>
                      </BusinessCaseProvider>
                      </CollectionProvider>
                    </ProjectProvider>
                    </LeadsProvider>
                </JobWorkConfigProvider>
              </EmployeeProvider>
            </ReminderProvider>
            </ContractsProvider>
            </CustomerProvider>
          </FeedbackProvider>
        </TodoProvider>
      </ApprovalProvider>
    </IntegrationProvider>
    </AppVersionProvider>
  );
}

export default App;
