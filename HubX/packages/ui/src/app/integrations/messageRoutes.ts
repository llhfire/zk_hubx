const MODULE_ROUTES: Record<string, string> = {
  '线索与客户': '/leads/my',
  '报价与技术评估': '/quotation',
  '合同': '/contracts',
  '项目与交付': '/projects',
  '回款、发票和费用': '/paymentinvoice',
  '日报与协作': '/dailyreport/list',
  '员工与组织': '/employees',
};

export function getMessageModuleRoute(module: string): string {
  return MODULE_ROUTES[module] ?? '/';
}

