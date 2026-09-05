import { lazy, type ComponentType } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { MainLayout } from "./components/MainLayout";
import {
  AttendanceManagement,
  EmployeeDetail,
  EmployeeList,
  EmployeeSkillTree,
  LevelRateSettings,
  PerformanceManagement,
} from "./pages/employee";

function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType,
  }));
}

const Dashboard = lazyNamed(() => import("./pages/Dashboard"), "Dashboard");
const PublicLeads = lazyNamed(() => import("./pages/PublicLeads"), "PublicLeads");
const MyLeads = lazyNamed(() => import("./pages/MyLeads"), "MyLeads");
const AllLeads = lazyNamed(() => import("./pages/AllLeads"), "AllLeads");
const TrashLeads = lazyNamed(() => import("./pages/TrashLeads"), "TrashLeads");
const ClosedLeads = lazyNamed(() => import("./pages/ClosedLeads"), "ClosedLeads");
const Customers = lazyNamed(() => import("./pages/Customers"), "Customers");
const CustomerDetail = lazyNamed(() => import("./pages/CustomerDetail"), "CustomerDetail");
const Contracts = lazyNamed(() => import("./pages/Contracts"), "Contracts");
const ContractDetail = lazyNamed(() => import("./pages/ContractDetail"), "ContractDetail");
const ContractWizard = lazyNamed(() => import("./pages/contracts/ContractWizard"), "ContractWizard");
const ContractEditor = lazyNamed(() => import("./pages/contracts/ContractEditor"), "ContractEditor");
const ContractDocumentPreview = lazyNamed(() => import("./pages/contracts/ContractDocumentPreview"), "ContractDocumentPreview");
const ContractTemplateManager = lazyNamed(() => import("./pages/contracts/ContractTemplateManager"), "ContractTemplateManager");
const ProjectList = lazyNamed(() => import("./pages/ProjectList"), "ProjectList");
const ProjectDetail360 = lazyNamed(() => import("./pages/ProjectDetail360"), "ProjectDetail360");
const ProjectWorkItemsPage = lazyNamed(() => import("./pages/project-management/ProjectWorkItemsPage"), "ProjectWorkItemsPage");
const LeadDetail360 = lazyNamed(() => import("./pages/LeadDetail360"), "LeadDetail360");
const Reports = lazyNamed(() => import("./pages/Reports"), "Reports");
const Organization = lazyNamed(() => import("./pages/Organization"), "Organization");
const UserPermission = lazyNamed(() => import("./pages/UserPermission"), "UserPermission");
const CompanyEntity = lazyNamed(() => import("./pages/CompanyEntity"), "CompanyEntity");
const Dictionary = lazyNamed(() => import("./pages/Dictionary"), "Dictionary");
const SystemLog = lazyNamed(() => import("./pages/SystemLog"), "SystemLog");
const SystemConfig = lazyNamed(() => import("./pages/SystemConfig"), "SystemConfig");
const DailyReportList = lazyNamed(() => import("./pages/DailyReportList"), "DailyReportList");
const DailyReportView = lazyNamed(() => import("./pages/DailyReportView"), "DailyReportView");
const QuotationCenter = lazyNamed(() => import("./pages/quotation/QuotationCenter"), "QuotationCenter");
const QuotationWorkbench = lazyNamed(() => import("./pages/quotation/QuotationWorkbench"), "QuotationWorkbench");
const PaymentInvoiceList = lazyNamed(() => import("./pages/PaymentInvoiceList"), "PaymentInvoiceList");
const ContractRecordList = lazyNamed(() => import("./pages/ContractRecordList"), "ContractRecordList");
const ProjectLogView = lazyNamed(() => import("./pages/ProjectLogView"), "ProjectLogView");
const WorkflowTemplateList = lazyNamed(() => import("./pages/WorkflowTemplateList"), "WorkflowTemplateList");
const BusinessMappingList = lazyNamed(() => import("./pages/BusinessMappingList"), "BusinessMappingList");
const ExpenseCategoryManager = lazyNamed(() => import("./pages/ExpenseCategoryManager"), "ExpenseCategoryManager");
const FinancialDashboard = lazyNamed(() => import("./pages/FinancialDashboard"), "FinancialDashboard");
const LeadCostDashboard = lazyNamed(() => import("./pages/lead-cost/LeadCostDashboard"), "LeadCostDashboard");
const LeadCostDaily = lazyNamed(() => import("./pages/lead-cost/LeadCostDaily"), "LeadCostDaily");
const LeadCostRecharge = lazyNamed(() => import("./pages/lead-cost/LeadCostRecharge"), "LeadCostRecharge");
const LeadCostAnalysis = lazyNamed(() => import("./pages/lead-cost/LeadCostAnalysis"), "LeadCostAnalysis");
const SalaryPage = lazyNamed(() => import("./pages/contract-cost/SalaryPage"), "SalaryPage");
const ContractCostDetail = lazyNamed(() => import("./pages/contract-cost/ContractCostDetail"), "ContractCostDetail");
const ProjectCostAccounting = lazyNamed(() => import("./pages/contract-cost/ProjectCostAccounting"), "ProjectCostAccounting");
const DeliveryPlanPage = lazyNamed(() => import("./pages/delivery-plan/DeliveryPlanPage"), "default");
const ContractKanban = lazyNamed(() => import("./pages/contracts/ContractKanban"), "ContractKanban");
const PaymentDashboard = lazyNamed(() => import("./pages/contracts/payment/PaymentDashboard"), "default");
const PersonalWorkbench = lazyNamed(() => import("./pages/workbench/PersonalWorkbench"), "PersonalWorkbench");
const LeadGovernance = lazyNamed(() => import("./pages/leads/LeadGovernance"), "LeadGovernance");
const LeadDispatchPage = lazyNamed(() => import("./pages/lead-dispatch/LeadDispatchPage"), "LeadDispatchPage");
const AssetManagement = lazyNamed(() => import("./pages/assets/AssetManagement"), "AssetManagement");
const MaintenanceManagement = lazyNamed(() => import("./pages/maintenance/MaintenanceManagement"), "MaintenanceManagement");
const SupplierManagement = lazyNamed(() => import("./pages/suppliers/SupplierManagement"), "SupplierManagement");
const KnowledgeBase = lazyNamed(() => import("./pages/knowledge/KnowledgeBase"), "KnowledgeBase");
const MeetingManagement = lazyNamed(() => import("./pages/meetings/MeetingManagement"), "MeetingManagement");
const FullChainROI = lazyNamed(() => import("./pages/roi/FullChainROI"), "FullChainROI");
const AIDriven = lazyNamed(() => import("./pages/ai/AIDriven"), "AIDriven");
const JobWorkConfigPage = lazyNamed(() => import("./pages/daily-report/JobWorkConfigPage"), "JobWorkConfigPage");
const FeedbackManagement = lazyNamed(() => import("./pages/FeedbackManagement"), "FeedbackManagement");
const WeComIntegration = lazyNamed(() => import("./pages/integrations/WeComIntegration"), "WeComIntegration");
const NotificationSettings = lazyNamed(() => import("./pages/integrations/NotificationSettings"), "NotificationSettings");
const MessageCenter = lazyNamed(() => import("./pages/integrations/MessageCenter"), "MessageCenter");
const ApprovalCenter = lazyNamed(() => import("./pages/approvals/ApprovalCenter"), "ApprovalCenter");
const TodoCenter = lazyNamed(() => import("./pages/todos/TodoCenter"), "TodoCenter");
const ProjectCostPage = lazyNamed(() => import("./pages/project-management/ProjectCostPage"), "ProjectCostPage");
const OperatingExpensePage = lazyNamed(() => import("./pages/operating-expense/OperatingExpensePage"), "OperatingExpensePage");
const ProjectInvoicePage = lazyNamed(() => import("./pages/finance/ProjectInvoicePage"), "ProjectInvoicePage");
const TripList = lazyNamed(() => import("./pages/travel/trip/TripList"), "TripList");
const TripForm = lazyNamed(() => import("./pages/travel/trip/TripForm"), "TripForm");
const TripDetail = lazyNamed(() => import("./pages/travel/trip/TripDetail"), "TripDetail");
const TravelReimbursementList = lazyNamed(() => import("./pages/travel/reimbursement/ReimbursementList"), "ReimbursementList");
const LoanList = lazyNamed(() => import("./pages/travel/loan/LoanList"), "LoanList");
const DormitoryManagement = lazyNamed(() => import("./pages/travel/dormitory/DormitoryManagement"), "DormitoryManagement");
const StandardList = lazyNamed(() => import("./pages/travel/standard/StandardList"), "StandardList");
const TravelDashboard = lazyNamed(() => import("./pages/travel/dashboard/TravelDashboard"), "TravelDashboard");
const DeliveryDashboard = lazyNamed(() => import("./pages/financial-delivery/dashboard/Dashboard"), "default");
const CaseList = lazyNamed(() => import("./pages/financial-delivery/cases/CaseList"), "default");
const CaseDetail = lazyNamed(() => import("./pages/financial-delivery/cases/CaseDetail"), "default");
const SmartMeetingListPage = lazyNamed(() => import("./pages/smart-meetings/SmartMeetingListPage"), "SmartMeetingListPage");
const SmartMeetingWorkbench = lazyNamed(() => import("./pages/smart-meetings/SmartMeetingWorkbench"), "SmartMeetingWorkbench");
const UiComponentLibraryPage = lazyNamed(() => import("./pages/ui-library/UiComponentLibraryPage"), "UiComponentLibraryPage");

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
      { path: "leads/all", Component: AllLeads },
      { path: "leads/closed", Component: ClosedLeads },
      { path: "leads/trash", Component: TrashLeads },
      { path: "leads/governance", Component: LeadGovernance },
      { path: "lead-dispatch", Component: LeadDispatchPage },
      { path: "leads/:id", Component: LeadDetail360 },
      { path: "lead-cost/dashboard", Component: LeadCostDashboard },
      { path: "lead-cost/daily", Component: LeadCostDaily },
      { path: "lead-cost/recharge", Component: LeadCostRecharge },
      { path: "lead-cost/analysis", Component: LeadCostAnalysis },
      { path: "customers", Component: Customers },
      { path: "customers/:id", Component: CustomerDetail },
      { path: "contracts", Component: Contracts },
      { path: "contracts/kanban", Component: ContractKanban },
      { path: "contracts/templates", Component: ContractTemplateManager },
      { path: "contracts/new", Component: ContractWizard },
      { path: "contracts/:id/edit", Component: ContractEditor },
      { path: "contracts/:id/preview", Component: ContractDocumentPreview },
      { path: "contracts/payments", Component: PaymentDashboard },
      { path: "contracts/payments-v2", loader: () => redirect("/contracts/payments") },
      { path: "contracts/forecast", loader: () => redirect("/contracts/payments?tab=forecast") },
      { path: "contracts/:id", Component: ContractDetail },
      { path: "projects", Component: ProjectList },
      { path: "projects/:id", Component: ProjectDetail360 },
      { path: "projects/:id/work-items", Component: ProjectWorkItemsPage },
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
      { path: "businesstrip", loader: () => redirect("/travel/trips") },
      { path: "reimbursement", loader: () => redirect("/travel/reimbursements") },
      { path: "paymentinvoice", Component: PaymentInvoiceList },
      { path: "contractrecord", Component: ContractRecordList },
      { path: "reports", Component: Reports },
      { path: "assets", Component: AssetManagement },
      { path: "maintenance", Component: MaintenanceManagement },
      { path: "suppliers", Component: SupplierManagement },
      { path: "knowledge", Component: KnowledgeBase },
      { path: "meetings", Component: MeetingManagement },
      { path: "smart-meetings", Component: SmartMeetingListPage },
      { path: "smart-meetings/new", Component: SmartMeetingWorkbench },
      { path: "smart-meetings/:id", Component: SmartMeetingWorkbench },
      { path: "roi", Component: FullChainROI },
      { path: "ai", Component: AIDriven },
      { path: "employees", Component: EmployeeList },
      { path: "employees/attendance", Component: AttendanceManagement },
      { path: "employees/performance", Component: PerformanceManagement },
      { path: "employees/level-rates", Component: LevelRateSettings },
      { path: "employees/:id/skills", Component: EmployeeSkillTree },
      { path: "employees/:id", Component: EmployeeDetail },
      { path: "hr/expenses", loader: () => redirect("/finance/expenses") },
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
      { path: "finance/expenses", Component: OperatingExpensePage },
      { path: "travel/trips", Component: TripList },
      { path: "travel/trips/new", Component: TripForm },
      { path: "travel/trips/:id", Component: TripDetail },
      { path: "travel/reimbursements", Component: TravelReimbursementList },
      { path: "travel/loans", Component: LoanList },
      { path: "travel/dormitory", Component: DormitoryManagement },

      { path: "travel/standards", Component: StandardList },
      { path: "travel/dashboard", Component: TravelDashboard },
      { path: "financial-delivery/dashboard", Component: DeliveryDashboard },
      { path: "financial-delivery/cases", Component: CaseList },
      { path: "financial-delivery/cases/:id", Component: CaseDetail },
      {
        path: "financial-delivery/post-mortems/:id",
        loader: ({ params }) => redirect(`/financial-delivery/cases/${params.id}?tab=post-mortem`),
      },
      { path: "ui-library", Component: UiComponentLibraryPage },
    ],
  },
]);
