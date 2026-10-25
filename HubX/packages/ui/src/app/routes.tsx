import { lazy, type ComponentType } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { NotFound } from "./pages/support/system/NotFound";
import { RouteErrorBoundary } from "./pages/support/system/RouteErrorBoundary";
import {
  AttendanceManagement,
  EmployeeDetail,
  EmployeeList,
  EmployeeSkillTree,
  LevelRateSettings,
  PerformanceManagement,
} from "./pages/support/hr/employee";

function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType,
  }));
}

const Dashboard = lazyNamed(() => import("./pages/support/workbench/Dashboard"), "Dashboard");
const PublicLeads = lazyNamed(() => import("./pages/sales/leads/PublicLeads"), "PublicLeads");
const MyLeads = lazyNamed(() => import("./pages/sales/leads/MyLeads"), "MyLeads");
const AllLeads = lazyNamed(() => import("./pages/sales/leads/AllLeads"), "AllLeads");
const TrashLeads = lazyNamed(() => import("./pages/sales/leads/TrashLeads"), "TrashLeads");
const ClosedLeads = lazyNamed(() => import("./pages/sales/leads/ClosedLeads"), "ClosedLeads");
const Customers = lazyNamed(() => import("./pages/sales/customers/Customers"), "Customers");
const CustomerDetail = lazyNamed(() => import("./pages/sales/customers/CustomerDetail"), "CustomerDetail");
const Contracts = lazyNamed(() => import("./pages/sales/contracts/Contracts"), "Contracts");
const ContractDetail = lazyNamed(() => import("./pages/sales/contracts/ContractDetail"), "ContractDetail");
const ContractWizard = lazyNamed(() => import("./pages/sales/contracts/ContractWizard"), "ContractWizard");
const ContractEditor = lazyNamed(() => import("./pages/sales/contracts/ContractEditor"), "ContractEditor");
const ContractDocumentPreview = lazyNamed(() => import("./pages/sales/contracts/ContractDocumentPreview"), "ContractDocumentPreview");
const ContractTemplateManager = lazyNamed(() => import("./pages/sales/contracts/ContractTemplateManager"), "ContractTemplateManager");
const ProjectList = lazyNamed(() => import("./pages/delivery/project/ProjectList"), "ProjectList");
const ProjectDetail360 = lazyNamed(() => import("./pages/delivery/project/ProjectDetail360"), "ProjectDetail360");
const ProjectWorkItemsPage = lazyNamed(() => import("./pages/delivery/project/ProjectWorkItemsPage"), "ProjectWorkItemsPage");
const LeadDetail360 = lazyNamed(() => import("./pages/sales/leads/LeadDetail360"), "LeadDetail360");
const Reports = lazyNamed(() => import("./pages/cross/reports/Reports"), "Reports");
const Organization = lazyNamed(() => import("./pages/support/system/Organization"), "Organization");
const UserPermission = lazyNamed(() => import("./pages/support/system/UserPermission"), "UserPermission");
const CompanyEntity = lazyNamed(() => import("./pages/sales/company-entity/CompanyEntity"), "CompanyEntity");
const Dictionary = lazyNamed(() => import("./pages/support/system/Dictionary"), "Dictionary");
const SystemLog = lazyNamed(() => import("./pages/support/system/SystemLog"), "SystemLog");
const SystemConfig = lazyNamed(() => import("./pages/support/system/SystemConfig"), "SystemConfig");
const DailyReportList = lazyNamed(() => import("./pages/delivery/daily-report/DailyReportList"), "DailyReportList");
const DailyReportView = lazyNamed(() => import("./pages/delivery/daily-report/DailyReportView"), "DailyReportView");
const QuotationCenter = lazyNamed(() => import("./pages/sales/quotation/QuotationCenter"), "QuotationCenter");
const QuotationWorkbench = lazyNamed(() => import("./pages/sales/quotation/QuotationWorkbench"), "QuotationWorkbench");
const PaymentInvoiceList = lazyNamed(() => import("./pages/finance/PaymentInvoiceList"), "PaymentInvoiceList");
const ContractRecordList = lazyNamed(() => import("./pages/sales/contracts/ContractRecordList"), "ContractRecordList");
const ProjectLogView = lazyNamed(() => import("./pages/delivery/project/ProjectLogView"), "ProjectLogView");
const WorkflowTemplateList = lazyNamed(() => import("./pages/support/system/WorkflowTemplateList"), "WorkflowTemplateList");
const BusinessMappingList = lazyNamed(() => import("./pages/support/system/BusinessMappingList"), "BusinessMappingList");
const ExpenseCategoryManager = lazyNamed(() => import("./pages/finance/operating-expense/ExpenseCategoryManager"), "ExpenseCategoryManager");
const FinancialDashboard = lazyNamed(() => import("./pages/finance/FinancialDashboard"), "FinancialDashboard");
const LeadCostDashboard = lazyNamed(() => import("./pages/acquisition/lead-cost/LeadCostDashboard"), "LeadCostDashboard");
const LeadCostDaily = lazyNamed(() => import("./pages/acquisition/lead-cost/LeadCostDaily"), "LeadCostDaily");
const LeadCostRecharge = lazyNamed(() => import("./pages/acquisition/lead-cost/LeadCostRecharge"), "LeadCostRecharge");
const LeadCostAnalysis = lazyNamed(() => import("./pages/acquisition/lead-cost/LeadCostAnalysis"), "LeadCostAnalysis");
const SalaryPage = lazyNamed(() => import("./pages/finance/contract-cost/SalaryPage"), "SalaryPage");
const ContractCostDetail = lazyNamed(() => import("./pages/finance/contract-cost/ContractCostDetail"), "ContractCostDetail");
const ProjectCostAccounting = lazyNamed(() => import("./pages/finance/contract-cost/ProjectCostAccounting"), "ProjectCostAccounting");
const DeliveryPlanPage = lazyNamed(() => import("./pages/delivery/plan/DeliveryPlanPage"), "default");
const ContractKanban = lazyNamed(() => import("./pages/sales/contracts/ContractKanban"), "ContractKanban");
const PaymentDashboard = lazyNamed(() => import("./pages/sales/contracts/payment/PaymentDashboard"), "default");
const PersonalWorkbench = lazyNamed(() => import("./pages/support/workbench/PersonalWorkbench"), "PersonalWorkbench");
const LeadGovernance = lazyNamed(() => import("./pages/sales/leads/LeadGovernance"), "LeadGovernance");
const LeadDispatchPage = lazyNamed(() => import("./pages/sales/lead-dispatch/LeadDispatchPage"), "LeadDispatchPage");
const AssetManagement = lazyNamed(() => import("./pages/resource/assets/AssetManagement"), "AssetManagement");
const MaintenanceManagement = lazyNamed(() => import("./pages/ops/maintenance/MaintenanceManagement"), "MaintenanceManagement");
const SupplierManagement = lazyNamed(() => import("./pages/resource/suppliers/SupplierManagement"), "SupplierManagement");
const KnowledgeBase = lazyNamed(() => import("./pages/resource/knowledge/KnowledgeBase"), "KnowledgeBase");
const MeetingManagement = lazyNamed(() => import("./pages/support/meetings/MeetingManagement"), "MeetingManagement");
const FullChainROI = lazyNamed(() => import("./pages/cross/roi/FullChainROI"), "FullChainROI");
const AIDriven = lazyNamed(() => import("./pages/cross/ai/AIDriven"), "AIDriven");
const JobWorkConfigPage = lazyNamed(() => import("./pages/delivery/daily-report/JobWorkConfigPage"), "JobWorkConfigPage");
const FeedbackManagement = lazyNamed(() => import("./pages/support/feedback/FeedbackManagement"), "FeedbackManagement");
const WeComIntegration = lazyNamed(() => import("./pages/cross/integrations/WeComIntegration"), "WeComIntegration");
const NotificationSettings = lazyNamed(() => import("./pages/cross/integrations/NotificationSettings"), "NotificationSettings");
const MessageCenter = lazyNamed(() => import("./pages/cross/integrations/MessageCenter"), "MessageCenter");
const ApprovalCenter = lazyNamed(() => import("./pages/support/approvals/ApprovalCenter"), "ApprovalCenter");
const TodoCenter = lazyNamed(() => import("./pages/support/todos/TodoCenter"), "TodoCenter");
const ProjectCostPage = lazyNamed(() => import("./pages/delivery/project/ProjectCostPage"), "ProjectCostPage");
const OperatingExpensePage = lazyNamed(() => import("./pages/finance/operating-expense/OperatingExpensePage"), "OperatingExpensePage");
const ProjectInvoicePage = lazyNamed(() => import("./pages/finance/invoice/ProjectInvoicePage"), "ProjectInvoicePage");
const TripList = lazyNamed(() => import("./pages/finance/travel/trip/TripList"), "TripList");
const TripForm = lazyNamed(() => import("./pages/finance/travel/trip/TripForm"), "TripForm");
const TripDetail = lazyNamed(() => import("./pages/finance/travel/trip/TripDetail"), "TripDetail");
const TravelReimbursementList = lazyNamed(() => import("./pages/finance/travel/reimbursement/ReimbursementList"), "ReimbursementList");
const LoanList = lazyNamed(() => import("./pages/finance/travel/loan/LoanList"), "LoanList");
const DormitoryManagement = lazyNamed(() => import("./pages/finance/travel/dormitory/DormitoryManagement"), "DormitoryManagement");
const StandardList = lazyNamed(() => import("./pages/finance/travel/standard/StandardList"), "StandardList");
const TravelDashboard = lazyNamed(() => import("./pages/finance/travel/dashboard/TravelDashboard"), "TravelDashboard");
const DeliveryDashboard = lazyNamed(() => import("./pages/finance/lean-delivery/dashboard/Dashboard"), "default");
const CaseList = lazyNamed(() => import("./pages/finance/lean-delivery/cases/CaseList"), "default");
const CaseDetail = lazyNamed(() => import("./pages/finance/lean-delivery/cases/CaseDetail"), "default");
const SmartMeetingListPage = lazyNamed(() => import("./pages/support/smart-meetings/SmartMeetingListPage"), "SmartMeetingListPage");
const SmartMeetingWorkbench = lazyNamed(() => import("./pages/support/smart-meetings/SmartMeetingWorkbench"), "SmartMeetingWorkbench");
const UiComponentLibraryPage = lazyNamed(() => import("./pages/ui-library/UiComponentLibraryPage"), "UiComponentLibraryPage");

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    // 渲染期异常兜底：没有它时任一页面抛错都会卸载整棵树变成白屏
    errorElement: <RouteErrorBoundary />,
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

      // 兜底：未知路径不再白屏。必须放最后，React Router 按顺序匹配。
      { path: "*", Component: NotFound },
    ],
  },
]);
