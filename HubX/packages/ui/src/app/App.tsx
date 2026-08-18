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
import { ApprovalDeliveryBridge } from './pages/contracts/ApprovalDeliveryBridge';
import type { QuotationService } from '@/services/quotationService';
import type { ContractService } from '@/services/contractService';
import { AppVersionProvider } from './version/AppVersionContext';
import type { AppVersion } from './version/versionMatrix';

interface AppProps {
  /** 报价数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  quotationService?: QuotationService;
  /** 合同数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  contractService?: ContractService;
  /** 当前版本标识：α版=prototype（缺省），β版=web。控制侧边栏版本标识与功能对比弹窗。 */
  appVersion?: AppVersion;
}

function App({ quotationService, contractService, appVersion = 'alpha' }: AppProps) {
  return (
    <AppVersionProvider version={appVersion}>
      <IntegrationProvider>
      <ApprovalProvider>
        <TodoProvider>
          <FeedbackProvider>
            <ReminderProvider>
              <EmployeeProvider>
                <JobWorkConfigProvider>
                  <ContractsProvider service={contractService}>
                    <ProjectProvider>
                      <BusinessCaseProvider>
                      <ProjectInvoiceProvider>
                        <QuotationProvider service={quotationService}>
                          {/* 合同批准 -> 交付启动 联动桥（无 UI，见 ApprovalDeliveryBridge 注释） */}
                          <ApprovalDeliveryBridge />
                          <RouterProvider router={router} />
                        </QuotationProvider>
                      </ProjectInvoiceProvider>
                      </BusinessCaseProvider>
                    </ProjectProvider>
                  </ContractsProvider>
                </JobWorkConfigProvider>
              </EmployeeProvider>
            </ReminderProvider>
          </FeedbackProvider>
        </TodoProvider>
      </ApprovalProvider>
    </IntegrationProvider>
    </AppVersionProvider>
  );
}

export default App;
