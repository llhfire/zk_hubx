import { createBrowserRouter, redirect } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { PublicLeads } from "./pages/PublicLeads";
import { MyLeads } from "./pages/MyLeads";
import { TrashLeads } from "./pages/TrashLeads";
import { ClosedLeads } from "./pages/ClosedLeads";
import { LeadDetail } from "./pages/LeadDetail";
import { Customers } from "./pages/Customers";
import { CustomerDetail } from "./pages/CustomerDetail";
import { Contracts } from "./pages/Contracts";
import { ContractDetail } from "./pages/ContractDetail";
import { ContractWizard } from "./pages/contracts/ContractWizard";
import { ContractEditor } from "./pages/contracts/ContractEditor";
import { ContractDocumentPreview } from "./pages/contracts/ContractDocumentPreview";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Reports } from "./pages/Reports";
import { Organization } from "./pages/Organization";
import { UserPermission } from "./pages/UserPermission";
import { CompanyEntity } from "./pages/CompanyEntity";
import { Dictionary } from "./pages/Dictionary";
import { SystemLog } from "./pages/SystemLog";
import { SystemConfig } from "./pages/SystemConfig";
import { DailyReportList } from "./pages/DailyReportList";
import { DailyReportView } from "./pages/DailyReportView";
import { QuotationCenter } from "./pages/quotation/QuotationCenter";
import { QuotationWorkbench } from "./pages/quotation/QuotationWorkbench";
import { BusinessTripList } from "./pages/BusinessTripList";
import { ReimbursementList } from "./pages/ReimbursementList";
import { PaymentInvoiceList } from "./pages/PaymentInvoiceList";
import { ContractRecordList } from "./pages/ContractRecordList";
import { ProjectLogView } from "./pages/ProjectLogView";
import { WorkflowTemplateList } from "./pages/WorkflowTemplateList";
import { BusinessMappingList } from "./pages/BusinessMappingList";
import { ExpenseCategoryManager } from "./pages/ExpenseCategoryManager";
import { FinancialDashboard } from "./pages/FinancialDashboard";
import { LeadCostDashboard } from "./pages/lead-cost/LeadCostDashboard";
import { LeadCostDaily } from "./pages/lead-cost/LeadCostDaily";
import { LeadCostRecharge } from "./pages/lead-cost/LeadCostRecharge";
import { LeadCostAnalysis } from "./pages/lead-cost/LeadCostAnalysis";
import { SalaryPage } from "./pages/contract-cost/SalaryPage";
import { ContractCostDetail } from "./pages/contract-cost/ContractCostDetail";
import { ProjectCostAccounting } from "./pages/contract-cost/ProjectCostAccounting";
import DeliveryPlanPage from "./pages/delivery-plan/DeliveryPlanPage";
import PaymentKanban from "./pages/contracts/PaymentKanban";
import { PaymentKanbanV2 } from "./pages/contracts/PaymentKanbanV2";
import { ContractKanban } from "./pages/contracts/ContractKanban";
import { PaymentForecast } from "./pages/contracts/forecast/PaymentForecast";
import { EmployeeList } from "./pages/employee";
import { EmployeeDetail } from "./pages/employee";
import { AttendanceManagement } from "./pages/employee";
import { PerformanceManagement } from "./pages/employee";
import { LevelRateSettings } from "./pages/employee";
import { PersonalWorkbench } from "./pages/workbench/PersonalWorkbench";
import { LeadGovernance } from "./pages/leads/LeadGovernance";
import { AssetManagement } from "./pages/assets/AssetManagement";
import { MaintenanceManagement } from "./pages/maintenance/MaintenanceManagement";
import { SupplierManagement } from "./pages/suppliers/SupplierManagement";
import { KnowledgeBase } from "./pages/knowledge/KnowledgeBase";
import { MeetingManagement } from "./pages/meetings/MeetingManagement";
import { FullChainROI } from "./pages/roi/FullChainROI";
import { AIDriven } from "./pages/ai/AIDriven";
import { JobWorkConfigPage } from "./pages/daily-report/JobWorkConfigPage";
import { FeedbackManagement } from "./pages/FeedbackManagement";
import { WeComIntegration } from "./pages/integrations/WeComIntegration";
import { NotificationSettings } from "./pages/integrations/NotificationSettings";
import { MessageCenter } from "./pages/integrations/MessageCenter";
import { ApprovalCenter } from "./pages/approvals/ApprovalCenter";
import { TodoCenter } from "./pages/todos/TodoCenter";
import { ProjectCostPage } from "./pages/project-management/ProjectCostPage";
import { HrExpenseManagement } from "./pages/hr/HrExpenseManagement";
import { ProjectInvoicePage } from "./pages/finance/ProjectInvoicePage";
import { TripList } from "./pages/travel/trip/TripList";
import { TripForm } from "./pages/travel/trip/TripForm";
import { TripDetail } from "./pages/travel/trip/TripDetail";
import { ReimbursementList as TravelReimbursementList } from "./pages/travel/reimbursement/ReimbursementList";
import { LoanList } from "./pages/travel/loan/LoanList";
import { DormitoryManagement } from "./pages/travel/dormitory/DormitoryManagement";
import { PunchClock } from "./pages/travel/punch/PunchClock";
import { StandardList } from "./pages/travel/standard/StandardList";
import { TravelDashboard } from "./pages/travel/dashboard/TravelDashboard";
import DeliveryDashboard from "./pages/financial-delivery/dashboard/Dashboard";
import CaseList from "./pages/financial-delivery/cases/CaseList";
import CaseDetail from "./pages/financial-delivery/cases/CaseDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "workbench", Component: PersonalWorkbench },
      { path: "todos", Component: TodoCenter },
      { path: "leads/public", Component: PublicLeads },
      { path: "leads/my", Component: MyLeads },
      { path: "leads/closed", Component: ClosedLeads },
      { path: "leads/trash", Component: TrashLeads },
      { path: "leads/governance", Component: LeadGovernance },
      { path: "leads/:id", Component: LeadDetail },
      { path: "lead-cost/dashboard", Component: LeadCostDashboard },
      { path: "lead-cost/daily", Component: LeadCostDaily },
      { path: "lead-cost/recharge", Component: LeadCostRecharge },
      { path: "lead-cost/analysis", Component: LeadCostAnalysis },
      { path: "customers", Component: Customers },
      { path: "customers/:id", Component: CustomerDetail },
      { path: "contracts", Component: Contracts },
      { path: "contracts/kanban", Component: ContractKanban },
      { path: "contracts/new", Component: ContractWizard },
      { path: "contracts/:id/edit", Component: ContractEditor },
      { path: "contracts/:id/preview", Component: ContractDocumentPreview },
      { path: "contracts/payments", Component: PaymentKanban },
      { path: "contracts/payments-v2", Component: PaymentKanbanV2 },
      { path: "contracts/forecast", Component: PaymentForecast },
      { path: "contracts/:id", Component: ContractDetail },
      { path: "projects", Component: Projects },
      { path: "projects/:id", Component: ProjectDetail },
      { path: "projects/:id/delivery", Component: DeliveryPlanPage },
      { path: "project-cost-accounting", Component: ProjectCostPage },
      { path: "dailyreport/list", Component: DailyReportList },
      { path: "dailyreport/view", Component: DailyReportView },
      { path: "dailyreport/projectlog", Component: ProjectLogView },
      { path: "dailyreport/job-work-config", Component: JobWorkConfigPage },
      { path: "quotation", Component: QuotationCenter },
      { path: "quotation/:quoteId", Component: QuotationWorkbench },
      // 旧三路由收敛为统一工作台，保留兼容已发出的链接与线索页跳转
      { path: "quotation/eval/:quoteId", loader: ({ params }) => redirect(`/quotation/${params.quoteId}`) },
      { path: "quotation/quote/:quoteId", loader: ({ params }) => redirect(`/quotation/${params.quoteId}`) },
      { path: "quotation/approval/:quoteId", loader: ({ params }) => redirect(`/quotation/${params.quoteId}`) },
      { path: "approvals", Component: ApprovalCenter },
      { path: "approvals/templates", Component: WorkflowTemplateList },
      { path: "approvals/business", Component: BusinessMappingList },
      { path: "businesstrip", Component: BusinessTripList },
      { path: "reimbursement", Component: ReimbursementList },
      { path: "paymentinvoice", Component: PaymentInvoiceList },
      { path: "contractrecord", Component: ContractRecordList },
      { path: "reports", Component: Reports },
      { path: "assets", Component: AssetManagement },
      { path: "maintenance", Component: MaintenanceManagement },
      { path: "suppliers", Component: SupplierManagement },
      { path: "knowledge", Component: KnowledgeBase },
      { path: "meetings", Component: MeetingManagement },
      { path: "roi", Component: FullChainROI },
      { path: "ai", Component: AIDriven },
      { path: "employees", Component: EmployeeList },
      { path: "employees/attendance", Component: AttendanceManagement },
      { path: "employees/performance", Component: PerformanceManagement },
      { path: "employees/level-rates", Component: LevelRateSettings },
      { path: "employees/:id", Component: EmployeeDetail },
      { path: "hr/expenses", Component: HrExpenseManagement },
      { path: "system/organization", Component: Organization },
      { path: "system/permission", Component: UserPermission },
      { path: "system/company", Component: CompanyEntity },
      { path: "system/dictionary", Component: Dictionary },
      { path: "system/log", Component: SystemLog },
      { path: "system/config", Component: SystemConfig },
      { path: "system/workflow", Component: WorkflowTemplateList },
      { path: "system/bizapproval", Component: BusinessMappingList },
      { path: "system/expensecategory", Component: ExpenseCategoryManager },
      { path: "system/feedback", Component: FeedbackManagement },
      { path: "system/wecom", Component: WeComIntegration },
      { path: "system/message-settings", Component: NotificationSettings },
      { path: "system/message-center", Component: MessageCenter },
      { path: "finance/dashboard", Component: FinancialDashboard },
      { path: "finance/project-cost", Component: ProjectCostAccounting },
      { path: "finance/salary", Component: SalaryPage },
      { path: "finance/project-invoices", Component: ProjectInvoicePage },
      { path: "finance/contract-cost/:contractId", Component: ContractCostDetail },
      { path: "travel/trips", Component: TripList },
      { path: "travel/trips/new", Component: TripForm },
      { path: "travel/trips/:id", Component: TripDetail },
      { path: "travel/reimbursements", Component: TravelReimbursementList },
      { path: "travel/loans", Component: LoanList },
      { path: "travel/dormitory", Component: DormitoryManagement },
      { path: "travel/punch", Component: PunchClock },
      { path: "travel/standards", Component: StandardList },
      { path: "travel/dashboard", Component: TravelDashboard },
      { path: "financial-delivery/dashboard", Component: DeliveryDashboard },
      { path: "financial-delivery/cases", Component: CaseList },
      { path: "financial-delivery/cases/:id", Component: CaseDetail },
      { path: "financial-delivery/cases/:id/edit", Component: CaseDetail },
      { path: "financial-delivery/cases/create", Component: CaseDetail },
      { path: "financial-delivery/feature-lists", Component: () => <div>功能清单列表</div> },
      { path: "financial-delivery/feature-lists/:id", Component: () => <div>功能清单详情</div> },
      { path: "financial-delivery/quotations", Component: () => <div>报价单列表</div> },
      { path: "financial-delivery/quotations/:id", Component: () => <div>报价单详情</div> },
      { path: "financial-delivery/post-mortems", Component: () => <div>项目决算列表</div> },
      { path: "financial-delivery/post-mortems/:id", Component: () => <div>项目决算详情</div> },
    ],
  },
]);
