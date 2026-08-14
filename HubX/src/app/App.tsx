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

function App() {
  return (
    <IntegrationProvider>
      <ApprovalProvider>
        <TodoProvider>
          <FeedbackProvider>
            <ReminderProvider>
              <EmployeeProvider>
                <JobWorkConfigProvider>
                  <ContractsProvider>
                    <ProjectInvoiceProvider>
                      <QuotationProvider>
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
