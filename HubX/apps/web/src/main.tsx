
  import { createRoot } from "react-dom/client";
  import App from "@/app/App";
  import "@/styles/index.css";
  import { createHttpQuotationService } from "@/services/quotationService";

  // β版：报价数据走后端（Cloudflare Workers）。本地联调默认 8787，部署时用 VITE_API_BASE_URL 覆盖。
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';

  createRoot(document.getElementById("root")!).render(
    <App quotationService={createHttpQuotationService(apiBaseUrl)} />
  );
