
  import { createRoot } from "react-dom/client";
  import App from "@/app/App";
  import "@/styles/index.css";
  import { createHttpQuotationService } from "@/services/quotationService";
  import { createHttpContractService } from "@/services/contractService";
  import { createHttpLeadService } from "@/services/leadService";
  import { createHttpProjectService } from "@/services/projectService";
  import { createHttpCollectionService } from "@/services/collectionService";
  import { createHttpEmployeeService } from "@/services/employeeService";
  import { CURRENT_LOGIN_USER } from "@/app/currentUser";

  // β版：报价+合同+线索+项目+实收+员工走后端（Cloudflare Workers）。本地联调默认 8787，部署时用 VITE_API_BASE_URL 覆盖。
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';

  // X-Actor（ADR-0094）：操作人随写请求上报，服务端记录；登录认证落地后换会话身份。
  const actor = CURRENT_LOGIN_USER.name;

  // B3（ADR-0093）：β 标记，SigningOpenBridge 据此跳过前端联动（Workers 已处理）
  (globalThis as Record<string, unknown>).__ZK_BETA__ = true;

  createRoot(document.getElementById("root")!).render(
    <App
      appVersion="beta"
      quotationService={createHttpQuotationService(apiBaseUrl, { actor })}
      contractService={createHttpContractService(apiBaseUrl, { actor })}
      leadService={createHttpLeadService(apiBaseUrl, { actor })}
      projectService={createHttpProjectService(apiBaseUrl, { actor })}
      collectionService={createHttpCollectionService(apiBaseUrl, { actor })}
      employeeService={createHttpEmployeeService(apiBaseUrl)}
    />
  );
