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
import type { QuotationService } from '@/services/quotationService';
import type { ContractService } from '@/services/contractService';

interface AppProps {
  /** 报价数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  quotationService?: QuotationService;
  /** 合同数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  contractService?: ContractService;
}

function App({ quotationService, contractService }: AppProps) {
  return (
    <IntegrationProvider>
      <ApprovalProvider>
        <TodoProvider>
          <FeedbackProvider>
            <ReminderProvider>
              <EmployeeProvider>
                <JobWorkConfigProvider>
                  <ContractsProvider service={contractService}>
                    <ProjectInvoiceProvider>
                      <QuotationProvider service={quotationService}>
                        <RouterProvider router={router} />
                      </QuotationProvider>
                    </ProjectInvoiceProvider>
                  </ContractsProvider>
                </JobWorkConfigProvider>
              </EmployeeProvider>
            </ReminderProvider>
          </FeedbackProvider>
        </TodoProvider>
      </ApprovalProvider>
    </IntegrationProvider>
  );
}

export default App;
