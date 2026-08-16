import { availableLeads, initialProjects } from '../project-management/mockData';
import {
  DAILY_PROJECT_CATEGORIES,
  type DailyProjectCategory,
  type DepartmentRoutineConfig,
  createDefaultDepartmentRoutineConfigs,
  findJobDepartment,
} from './jobWorkConfigData';
import type {
  DailyCostBucket,
  DailyRelationType,
  WorkAttributionCategory,
  WorkAttributionType,
} from './types';

export interface WorkAttributionOption {
  id: string;
  name: string;
  keyword: string;
}

const LEAD_TRACKING_HOURS_SUMMARY_OPTION: WorkAttributionOption = {
  id: 'lead-tracking-hours-summary',
  name: '线索跟进工时汇总',
  keyword: '线索跟进工时汇总 软件售前',
};

export const WORK_ATTRIBUTION_LABELS: Record<WorkAttributionType, string> = {
  'external-project': '客户项目',
  'internal-project': '内部项目',
  'department-routine': '部门日常',
  'presales-lead': '售前线索',
};

export const WORK_ATTRIBUTION_CATEGORY_LABELS: Record<WorkAttributionCategory, string> = {
  development: '开发',
  operations: '运营',
  'software-presales': '软件售前',
  'immigration-presales': '移民售前',
  promotion: '推广',
  ecommerce: '电商',
};

export const WORK_ATTRIBUTION_CATEGORIES = Object.keys(
  WORK_ATTRIBUTION_CATEGORY_LABELS,
) as WorkAttributionCategory[];

const CATEGORY_TYPE_MAP: Record<WorkAttributionCategory, WorkAttributionType> = {
  development: 'external-project',
  operations: 'internal-project',
  'software-presales': 'presales-lead',
  'immigration-presales': 'presales-lead',
  promotion: 'department-routine',
  ecommerce: 'department-routine',
};

export function getWorkAttributionTypeForCategory(category: WorkAttributionCategory) {
  return CATEGORY_TYPE_MAP[category];
}

export function getDefaultWorkAttributionCategory(type: WorkAttributionType): WorkAttributionCategory {
  if (type === 'external-project') return 'development';
  if (type === 'presales-lead') return 'software-presales';
  return 'operations';
}

export function getWorkAttributionDisplayLabel(
  category: WorkAttributionCategory | undefined,
  type: WorkAttributionType,
) {
  return category ? WORK_ATTRIBUTION_CATEGORY_LABELS[category] : WORK_ATTRIBUTION_LABELS[type];
}

const DAILY_PROJECT_CATEGORY_IDS = new Set<WorkAttributionCategory>(
  DAILY_PROJECT_CATEGORIES.map(category => category.id),
);

export function isDailyProjectCategory(
  category: WorkAttributionCategory,
): category is DailyProjectCategory {
  return DAILY_PROJECT_CATEGORY_IDS.has(category);
}

export function getWorkAttributionOptions(
  type: WorkAttributionType,
  department = '',
  departmentRoutineConfigs: DepartmentRoutineConfig[] = createDefaultDepartmentRoutineConfigs(),
  category?: WorkAttributionCategory,
): WorkAttributionOption[] {
  if (category && isDailyProjectCategory(category)) {
    return departmentRoutineConfigs
      .filter(config => config.category === category && config.enabled)
      .sort((left, right) => (
        left.sortOrder - right.sortOrder
        || left.name.localeCompare(right.name, 'zh-CN')
      ))
      .map(config => ({
        id: config.id,
        name: config.name,
        keyword: `${config.name} ${WORK_ATTRIBUTION_CATEGORY_LABELS[category]}`,
      }));
  }

  if (type === 'external-project') {
    return initialProjects
      .filter(project => project.businessLine === '外包' && project.status !== '已完成')
      .map(project => ({
        id: project.id,
        name: project.name,
        keyword: `${project.projectNo} ${project.name} ${project.entity}`,
      }));
  }

  if (type === 'internal-project') {
    return initialProjects
      .filter(project => project.businessLine !== '外包' && project.status !== '已完成')
      .map(project => ({
        id: project.id,
        name: project.name,
        keyword: `${project.projectNo} ${project.name} ${project.businessLine}`,
      }));
  }

  if (type === 'presales-lead') {
    const leadOptions = availableLeads.map(lead => ({
      id: lead.id,
      name: lead.leadName,
      keyword: `${lead.leadNo} ${lead.leadName} ${lead.customerName} ${lead.phone}`,
    }));

    if (category === 'software-presales') {
      const projectOptions = initialProjects.map(project => ({
        id: project.id,
        name: project.name,
        keyword: `${project.projectNo} ${project.name} ${project.entity} ${project.businessLine}`,
      }));

      return [LEAD_TRACKING_HOURS_SUMMARY_OPTION, ...projectOptions];
    }

    return leadOptions;
  }

  const matchedDepartment = findJobDepartment(department);
  return departmentRoutineConfigs
    .filter(routine => (
      routine.enabled
      && (!matchedDepartment || routine.departmentId === matchedDepartment.id || routine.departmentId === 'company')
    ))
    .sort((left, right) => (
      Number(left.departmentId === 'company') - Number(right.departmentId === 'company')
      || left.sortOrder - right.sortOrder
      || left.name.localeCompare(right.name, 'zh-CN')
    ))
    .map(routine => ({
      id: routine.id,
      name: routine.name,
      keyword: `${routine.name} ${department}`,
    }));
}

export function getWorkAttributionAccounting(type: WorkAttributionType): {
  relationType: DailyRelationType;
  costBucket: DailyCostBucket;
} {
  if (type === 'external-project') {
    return { relationType: 'project', costBucket: 'project' };
  }
  if (type === 'internal-project') {
    return { relationType: 'project', costBucket: 'internal-project' };
  }
  if (type === 'presales-lead') {
    return { relationType: 'lead', costBucket: 'lead-pending' };
  }
  return { relationType: 'operation', costBucket: 'operation' };
}
