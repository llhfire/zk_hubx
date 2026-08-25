/**
 * 全局搜索六域适配器
 *
 * 设计规约见 global-search-design.md §0/§4：
 * - 读六域 Context，不直调 service（α 下直调会 new 第二个 mock 实例）
 * - 客户域无 Context，读模块级 mockData
 * - 只读投影，不建数据副本
 */

import { useMemo } from 'react';
import { useLeads } from '@/app/leads/LeadContext';
import { useQuotation } from '@/app/pages/quotation/QuotationContext';
import { useContracts } from '@/app/pages/contracts/ContractsContext';
import { useProjects } from '@/app/pages/project-management/ProjectContext';
import { useEmployee } from '@/app/pages/employee/EmployeeContext';
import { CUSTOMERS } from '@/app/pages/customers/mockData';
import type { SearchItem, SearchEntityKind } from './types';

/** 六域 → SearchItem[] 映射（useMemo 汇总，任一 Context 变化自动重算） */
export function useGlobalSearchIndex(): SearchItem[] {
  const { leads } = useLeads();
  const { quotes } = useQuotation();
  const { contracts } = useContracts();
  const { projects } = useProjects();
  const { employees } = useEmployee();

  return useMemo(() => {
    const items: SearchItem[] = [];

    // 线索：排除 trash
    for (const l of leads) {
      if (l.clueType === 'trash') continue;
      items.push({
        kind: 'lead',
        route: `/leads/${l.id}`,
        title: l.name,
        meta: `${l.id} · 归属: ${l.owner}`,
        fields: [l.name, l.customer, l.contact, l.phone, l.id].filter(Boolean),
        sortKey: l.createTime,
      });
    }

    // 客户（静态模块常量，不进依赖）
    for (const c of CUSTOMERS) {
      items.push({
        kind: 'customer',
        route: `/customers/${c.key}`,
        title: c.name,
        meta: `${c.level} · ${c.status}`,
        fields: [c.name, c.contact, c.phone, c.key],
        sortKey: c.createTime,
      });
    }

    // 报价
    for (const q of quotes) {
      items.push({
        kind: 'quote',
        route: `/quotation/${q.id}`,
        title: q.basicInfo.projectName,
        meta: `${q.quoteNo} · ${q.basicInfo.customerName}`,
        fields: [q.basicInfo.projectName, q.quoteNo, q.basicInfo.customerName].filter(Boolean),
        sortKey: q.quoteNo, // ZK-YYYYMMDD-NNN，字符串倒序=新->旧
      });
    }

    // 合同
    for (const c of contracts) {
      items.push({
        kind: 'contract',
        route: `/contracts/${c.id}`,
        title: c.current.contractName,
        meta: `${c.contractNo} · ${c.current.customerName}`,
        fields: [c.current.contractName, c.contractNo, c.current.customerName].filter(Boolean),
        sortKey: c.contractNo, // CT-YYYYMMNNN
      });
    }

    // 项目
    for (const p of projects) {
      items.push({
        kind: 'project',
        route: `/projects/${p.id}`,
        title: p.name,
        meta: `${p.projectNo} · ${p.owner} · ${p.status}`,
        fields: [p.name, p.projectNo, p.owner].filter(Boolean),
        sortKey: p.createdAt ?? p.startDate ?? '',
      });
    }

    // 员工
    for (const e of employees) {
      items.push({
        kind: 'employee',
        route: `/employees/${e.id}`,
        title: e.name,
        meta: `${e.department} · ${e.position}`,
        fields: [e.name, e.department, e.position, e.jobNumber].filter(Boolean),
        sortKey: e.jobNumber,
      });
    }

    return items;
    // customers 是模块常量，不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, quotes, contracts, projects, employees]);
}
