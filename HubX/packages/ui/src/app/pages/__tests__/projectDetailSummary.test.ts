import { describe, expect, it } from 'vitest';
import type { DeliveryPlan, SopPhase, SopStep } from '../delivery-plan/types';
import {
  initialDailyReports,
  initialFollowUps,
  initialLeadRelations,
  initialProjects,
  type Project,
  type ProjectMemberHours,
} from '../project-management/mockData';
import { buildInitialContracts } from '../contracts/mockData';
import { initialDeliveryPlans } from '../delivery-plan/mockData';
import { getLeadDetailProfile } from '../leads/leadDetailProfiles';
import { buildProjectSummaryCards } from '../projectDetailSummary';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    projectNo: 'PRJ202606001',
    name: 'A公司CRM系统开发',
    latestProgress: '进入开发联调阶段。',
    priority: '高',
    entity: '中科软艺',
    status: '进行中',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '李四',
    assistants: ['王五'],
    productUsers: ['李四'],
    uiUsers: ['孙七'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    opsUsers: ['周八'],
    testUsers: ['钱九'],
    legalUsers: ['张三'],
    progress: 65,
    startDate: '2026-05-01',
    expectedEndDate: '2026-06-30',
    remark: '',
    attachments: [],
    contractId: '4',
    createdAt: '2026-05-01 09:30',
    ...overrides,
  };
}

function createPlan(stepOverrides: Partial<SopStep>[] = []): DeliveryPlan {
  const phases: SopPhase[] = [
    {
      id: 'phase-3',
      projectId: 'project-1',
      phaseNo: 3,
      phaseName: '项目交付执行',
      manager: '李四',
      status: 'in_progress',
      startDate: '2026-05-20',
      dueDate: '2026-06-25',
    },
  ];

  const baseSteps: SopStep[] = [
    {
      id: 'step-1',
      phaseId: 'phase-3',
      projectId: 'project-1',
      stepNo: '3.4',
      stepName: '接口联调',
      department: '研发',
      assignee: '王五',
      status: 'in_progress',
      startDate: '2026-06-01',
      dueDate: '2026-06-18',
      deliverables: '联调记录',
      description: '接口联调',
      notes: '',
      tools: 'Apifox',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    },
    {
      id: 'step-2',
      phaseId: 'phase-3',
      projectId: 'project-1',
      stepNo: '3.5',
      stepName: 'UI 走查',
      department: '设计',
      assignee: '孙七',
      status: 'pending',
      startDate: '2026-06-19',
      dueDate: '2026-06-24',
      deliverables: '走查清单',
      description: 'UI 走查',
      notes: '',
      tools: 'Figma',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    },
  ].map((step, index) => ({
    ...step,
    ...(stepOverrides[index] ?? {}),
  }));

  return {
    projectId: 'project-1',
    phases,
    steps: baseSteps,
    milestones: [
      {
        id: 'milestone-1',
        projectId: 'project-1',
        name: '一期交付',
        date: '2026-06-30',
        completed: false,
      },
    ],
    deliveryType: '网站+小程序',
    contractId: '4',
  };
}

const defaultHours: ProjectMemberHours[] = [
  { key: '李四', personName: '李四', position: '产品经理', hours: 32 },
  { key: '王五', personName: '王五', position: '前端工程师', hours: 28 },
  { key: '赵六', personName: '赵六', position: '后端工程师', hours: 20 },
  { key: '孙七', personName: '孙七', position: 'UI 设计师', hours: 12 },
];

describe('buildProjectSummaryCards', () => {
  it('保留外部 OA 流程优化项目的线索、交付、团队、跟进和工时数据', () => {
    const project = initialProjects.find(item => item.id === '3');
    const dailyReports = initialDailyReports.filter(item => item.projectId === '3');
    const followUps = initialFollowUps.filter(item => item.projectId === '3');
    const leadRelation = initialLeadRelations.find(item => item.projectId === '3');
    const contract = buildInitialContracts().find(item => item.id === '9');
    const leadProfile = getLeadDetailProfile('lead-9', '');

    expect(project).toMatchObject({
      name: '华信科技内部OA流程优化',
      status: '进行中',
      progress: 58,
      businessLine: '外包',
      leadId: 'lead-9',
    });
    expect(project?.contractId).toBe('9');
    expect(project?.productUsers).toEqual(['李四']);
    expect(project?.frontendUsers).toEqual(['王五']);
    expect(project?.backendUsers).toEqual(['赵六']);
    expect(project?.testUsers).toEqual(['钱九']);
    expect(dailyReports).toHaveLength(5);
    expect(dailyReports.reduce((total, item) => total + item.hours, 0)).toBe(30.5);
    expect(followUps).toHaveLength(2);
    expect(followUps[0]).toMatchObject({ status: '进行中', progress: 58 });
    expect(leadRelation).toMatchObject({ id: 'relation-3', leadNo: 'LD202606009', customerCategory: '企业客户' });
    expect(contract).toMatchObject({
      leadId: 'lead-9',
      quoteId: 'quote-9',
      status: 'archived',
      executionStatus: '履行中',
    });
    expect(contract?.projectId).toBeUndefined();
    expect(initialDeliveryPlans['3']?.contractId).toBeUndefined();
    expect(initialDeliveryPlans['3']?.milestones).toHaveLength(4);
    const deliveryCard = buildProjectSummaryCards({
      project: project!,
      allProjects: initialProjects,
      deliveryPlan: initialDeliveryPlans['3'],
      memberHours: [],
      totalHours: 0,
      today: '2026-07-21',
    }).find(item => item.key === 'delivery');
    expect(deliveryCard?.alert).toBe('当前无逾期');
    expect(leadProfile.quotationHistory[0]).toMatchObject({
      id: 'quote-9',
      amount: '960,000',
      flowStatus: '已审核',
    });
  });

  it('存在延期步骤时，交付进度卡显示延期最严重的工作项', () => {
    const cards = buildProjectSummaryCards({
      project: createProject(),
      allProjects: [createProject()],
      deliveryPlan: createPlan([{ dueDate: '2026-06-12' }, { dueDate: '2026-06-15' }]),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const deliveryCard = cards.find((card) => card.key === 'delivery');
    expect(deliveryCard?.level).toBe('严重');
    expect(deliveryCard?.alert).toContain('接口联调');
    expect(deliveryCard?.alert).toContain('8 天');
  });

  it('无交付计划时显示注意态空状态', () => {
    const cards = buildProjectSummaryCards({
      project: createProject(),
      allProjects: [createProject()],
      deliveryPlan: undefined,
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const deliveryCard = cards.find((card) => card.key === 'delivery');
    expect(deliveryCard?.level).toBe('注意');
    expect(deliveryCard?.value).toBe('暂无计划');
    expect(deliveryCard?.alert).toContain('暂未生成');
    expect(deliveryCard?.detail).toContain('无法识别延期');
  });

  it('负责人卡根据其他高优先级项目数量给出预警级别', () => {
    const currentProject = createProject();
    const cards = buildProjectSummaryCards({
      project: currentProject,
      allProjects: [
        currentProject,
        createProject({ id: 'project-2', name: '高优商城项目', status: '进行中' }),
        createProject({ id: 'project-3', name: '高优会员项目', status: '验收中' }),
        createProject({ id: 'project-4', name: '普通项目', priority: '中' }),
      ],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const ownerCard = cards.find((card) => card.key === 'owner');
    expect(ownerCard?.level).toBe('预警');
    expect(ownerCard?.value).toBe('李四');
    expect(ownerCard?.alert).toContain('2 个高优项目');
  });

  it('负责人卡补充说明列出其他高优先级项目名称', () => {
    const currentProject = createProject();
    const cards = buildProjectSummaryCards({
      project: currentProject,
      allProjects: [
        currentProject,
        createProject({ id: 'project-2', name: '高优商城项目', status: '进行中' }),
        createProject({ id: 'project-3', name: '高优会员项目', status: '验收中' }),
      ],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const ownerCard = cards.find((card) => card.key === 'owner');
    expect(ownerCard?.detail).toContain('高优商城项目');
    expect(ownerCard?.detail).toContain('高优会员项目');
  });

  it('未设置预计结束日期时交付时间卡返回注意态', () => {
    const cards = buildProjectSummaryCards({
      project: createProject({ expectedEndDate: '' }),
      allProjects: [createProject({ expectedEndDate: '' })],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const deadlineCard = cards.find((card) => card.key === 'deadline');
    expect(deadlineCard?.level).toBe('注意');
    expect(deadlineCard?.value).toBe('未设置');
    expect(deadlineCard?.alert).toContain('未设置交付日期');
    expect(deadlineCard?.detail).toContain('无法判断');
  });

  it('总工时卡返回前三成员和集中度', () => {
    const cards = buildProjectSummaryCards({
      project: createProject(),
      allProjects: [createProject()],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const hoursCard = cards.find((card) => card.key === 'hours');
    expect(hoursCard?.value).toBe('92H');
    expect(hoursCard?.alert).toContain('李四 32H');
    expect(hoursCard?.alert).toContain('王五 28H');
    expect(hoursCard?.alert).toContain('赵六 20H');
    expect(hoursCard?.detail).toContain('87%');
  });
});
