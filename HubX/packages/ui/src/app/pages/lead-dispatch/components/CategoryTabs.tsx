// 快捷分类 Tab（PLAN.md 决策 15/16：去侧边栏，6 个快捷分类）
// 角色可见性：等级审核 / 质检分桶仅管理员可见

import { Tabs } from '@arco-design/web-react';
import type { DispatchCategory } from '../kpiCalc';
import { filterByCategory, CATEGORY_LABEL } from '../kpiCalc';
import type { LeadListItem } from '@/app/pages/leads/types';
import type { DispatchRole } from '../roleViewFilter';

interface CategoryTabsProps {
  leads: LeadListItem[];
  now: Date;
  role: DispatchRole;
  active: DispatchCategory;
  onChange: (category: DispatchCategory) => void;
}

const ALL_CATEGORIES: DispatchCategory[] = [
  'all',
  'pending_dispatch',
  'first_contact_overdue',
  'sa_focus',
  'level_audit',
  'quality_bucket',
];

export function CategoryTabs({ leads, now, role, active, onChange }: CategoryTabsProps) {
  const visible = ALL_CATEGORIES.filter((c) => {
    if (role !== 'admin' && (c === 'level_audit' || c === 'quality_bucket')) return false;
    return true;
  });

  return (
    <Tabs
      activeTab={active}
      onChange={(key) => onChange(key as DispatchCategory)}
      size="small"
    >
      {visible.map((category) => (
        <Tabs.TabPane
          key={category}
          title={`${CATEGORY_LABEL[category]}（${filterByCategory(leads, category, now).length}）`}
        />
      ))}
    </Tabs>
  );
}
