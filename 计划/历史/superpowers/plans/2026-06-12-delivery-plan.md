# 交付计划模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在项目管理模块中实现基于 SOP 的交付计划功能，包括任务自动生成、甘特图展示和项目进度追踪。

**Architecture:** 两级数据模型（SopPhase + SopStep），独立模块目录 delivery-plan/，纯 CSS+React 自绘甘特图，左右分栏布局，mock 预置数据 + useState 管理。

**Tech Stack:** React 18, Arco Design, TypeScript, date-fns 3.6, Recharts 2.15（环形图）, Tailwind CSS v4

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/app/pages/delivery-plan/types.ts` | 交付计划所有类型定义 |
| `src/app/pages/delivery-plan/constants.ts` | 角色映射、交付类型→步骤过滤规则、板块配色等常量 |
| `src/app/pages/delivery-plan/sopTemplate.ts` | SOP 七大板块模板数据 + 步骤依赖关系 + 时间约束 |
| `src/app/pages/delivery-plan/utils.ts` | 排期推算、完成率计算、状态推导等纯函数 |
| `src/app/pages/delivery-plan/mockData.ts` | 预置交付计划示例数据（项目1） |
| `src/app/pages/delivery-plan/DeliveryConfigModal.tsx` | 生成配置面板 Modal |
| `src/app/pages/delivery-plan/TaskList.tsx` | 左侧任务列表组件 |
| `src/app/pages/delivery-plan/GanttChart.tsx` | 右侧甘特图组件 |
| `src/app/pages/delivery-plan/DeliveryPlanPage.tsx` | 交付计划主页面，组装 TaskList + GanttChart |
| `src/app/pages/delivery-plan/DeliveryProgressCard.tsx` | 项目详情页的交付进度环形图卡片 |
| `src/app/pages/delivery-plan/StepEditModal.tsx` | 步骤编辑 Modal |
| `src/app/pages/delivery-plan/CustomStepModal.tsx` | 新增自定义步骤 Modal |
| `src/app/pages/delivery-plan/__tests__/utils.test.ts` | utils 纯函数测试 |

### 修改文件

| 文件 | 变更内容 |
|------|---------|
| `src/app/pages/project-management/mockData.ts` | Project 接口加 opsUsers/testUsers/legalUsers，初始数据补值，roleEmployees 补角色 |
| `src/app/pages/Contracts.tsx` | 新建合同 Modal 加"交付类型"选择器 |
| `src/app/pages/ContractDetail.tsx` | 基础信息加"交付类型"展示 |
| `src/app/pages/Projects.tsx` | 新建/编辑项目 Modal 加运维/测试/法务选择器 |
| `src/app/pages/ProjectDetail.tsx` | 统计卡片区加交付进度卡片 + 基础信息 Tab 加关联合同功能 |
| `src/app/routes.tsx` | 新增 `/projects/:id/delivery` 路由 |

---

## Task 1: 类型定义

**Files:**
- Create: `src/app/pages/delivery-plan/types.ts`

- [ ] **Step 1: 创建类型文件**

```ts
// src/app/pages/delivery-plan/types.ts

/** 交付类型：决定板块四适用步骤 */
export type DeliveryType =
  | '网站'
  | '小程序'
  | 'APP'
  | '网站+小程序'
  | '网站+APP'
  | '小程序+APP'
  | '全平台';

export const DELIVERY_TYPES: DeliveryType[] = [
  '网站',
  '小程序',
  'APP',
  '网站+小程序',
  '网站+APP',
  '小程序+APP',
  '全平台',
];

/** 步骤状态 */
export type SopStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/** 板块状态（自动推导） */
export type SopPhaseStatus = SopStepStatus;

/** 板块 */
export interface SopPhase {
  id: string;
  projectId: string;
  phaseNo: number;
  phaseName: string;
  manager: string;
  status: SopPhaseStatus;
  startDate: string;
  dueDate: string;
}

/** 步骤 */
export interface SopStep {
  id: string;
  phaseId: string;
  projectId: string;
  stepNo: string;
  stepName: string;
  department: string;
  assignee: string;
  status: SopStepStatus;
  startDate: string;
  dueDate: string;
  deliverables: string;
  description: string;
  notes: string;
  tools: string;
  isCustom: boolean;
  isEvergreen: boolean;
  userNotes: string;
}

/** 里程碑 */
export interface SopMilestone {
  id: string;
  projectId: string;
  name: string;
  date: string;
  completed: boolean;
}

/** 交付计划（一个项目的完整交付计划） */
export interface DeliveryPlan {
  projectId: string;
  phases: SopPhase[];
  steps: SopStep[];
  milestones: SopMilestone[];
  deliveryType: DeliveryType;
  contractId?: string;
}

/** 生成配置 */
export interface DeliveryConfig {
  selectedPhases: number[];
  deliveryType: DeliveryType;
  contractId?: string;
}

/** 甘特图缩放粒度 */
export type GanttZoomLevel = 'day' | 'week' | 'month';
```

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/types.ts
git commit -m "feat(delivery-plan): add type definitions for delivery plan module"
```

---

## Task 2: 常量定义

**Files:**
- Create: `src/app/pages/delivery-plan/constants.ts`

- [ ] **Step 1: 创建常量文件**

```ts
// src/app/pages/delivery-plan/constants.ts

import type { DeliveryType } from './types';

/** SOP 角色到 Project 字段的映射 */
export const ROLE_TO_PROJECT_FIELD: Record<string, string> = {
  '产品经理': 'productUsers',
  '销售': 'salesUsers',
  'UI 设计师': 'uiUsers',
  '开发主管': 'frontendUsers',
  '项目经理': 'owner',
  '运维专员': 'opsUsers',
  '法务专员': 'legalUsers',
  '测试工程师': 'testUsers',
};

/** 板块默认主管映射：phaseNo → project 角色字段 */
export const PHASE_MANAGER_FIELD: Record<number, string> = {
  1: 'productUsers',
  2: 'owner',
  3: 'owner',
  4: 'opsUsers',
  5: 'testUsers',
  6: 'opsUsers',
  7: 'owner',
};

/** 板块配色（Arco 色系） */
export const PHASE_COLORS: Record<number, string> = {
  1: 'rgb(var(--arcoblue-6))',
  2: 'rgb(var(--cyan-6))',
  3: 'rgb(var(--green-6))',
  4: 'rgb(var(--orange-6))',
  5: 'rgb(var(--purple-6))',
  6: 'rgb(var(--red-6))',
  7: 'rgb(var(--magenta-6))',
};

/** 板块配色（浅色 / 未完成态） */
export const PHASE_COLORS_LIGHT: Record<number, string> = {
  1: 'rgb(var(--arcoblue-3))',
  2: 'rgb(var(--cyan-3))',
  3: 'rgb(var(--green-3))',
  4: 'rgb(var(--orange-3))',
  5: 'rgb(var(--purple-3))',
  6: 'rgb(var(--red-3))',
  7: 'rgb(var(--magenta-3))',
};

/** 七大板块定义 */
export const SOP_PHASES = [
  { phaseNo: 1, phaseName: '合同交接' },
  { phaseNo: 2, phaseName: '项目启动准备' },
  { phaseNo: 3, phaseName: '项目交付执行' },
  { phaseNo: 4, phaseName: '资质备案 & 上架' },
  { phaseNo: 5, phaseName: '测试验收' },
  { phaseNo: 6, phaseName: '运维支持' },
  { phaseNo: 7, phaseName: '项目总结' },
] as const;

/** 交付类型 → 板块四适用步骤编号 */
export const DELIVERY_TYPE_PHASE4_STEPS: Record<DeliveryType, string[]> = {
  '网站': ['4.1', '4.2', '4.3', '4.7'],
  '小程序': ['4.1', '4.3', '4.4', '4.6', '4.7'],
  'APP': ['4.1', '4.5', '4.6', '4.7'],
  '网站+小程序': ['4.1', '4.2', '4.3', '4.4', '4.6', '4.7'],
  '网站+APP': ['4.1', '4.2', '4.3', '4.5', '4.6', '4.7'],
  '小程序+APP': ['4.1', '4.3', '4.4', '4.5', '4.6', '4.7'],
  '全平台': ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7'],
};

/** 交付类型 → 板块四步骤名称覆盖（合并展示） */
export const DELIVERY_TYPE_STEP_NAME_OVERRIDES: Partial<Record<DeliveryType, Record<string, string>>> = {
  '网站+小程序': {
    '4.3': 'ICP 备案 / 小程序主体备案',
    '4.6': '小程序正式提审',
  },
  '网站+APP': {
    '4.3': 'ICP 备案',
    '4.6': 'APP 正式提审',
  },
  '小程序+APP': {
    '4.3': '小程序主体备案',
    '4.6': '小程序/APP 正式提审',
  },
  '全平台': {
    '4.3': 'ICP 备案 / 小程序主体备案',
    '4.6': '小程序/APP 正式提审',
  },
};

/** 状态优先级（用于推导板块状态：取最落后的） */
export const STATUS_PRIORITY: Record<string, number> = {
  completed: 4,
  skipped: 3,
  in_progress: 2,
  pending: 1,
};
```

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/constants.ts
git commit -m "feat(delivery-plan): add constants for role mapping, phase colors, delivery type rules"
```

---

## Task 3: SOP 模板数据

**Files:**
- Create: `src/app/pages/delivery-plan/sopTemplate.ts`

此文件定义 SOP 七大板块所有步骤的模板数据、步骤间依赖关系和每步的默认工期（工作日）。这是整个交付计划的核心数据源。

- [ ] **Step 1: 创建 SOP 模板文件**

文件内容包含：
1. `SopStepTemplate` 接口：模板中每个步骤的结构
2. `SOP_STEP_DEPENDENCIES`：步骤前置依赖映射
3. `SOP_STEP_TEMPLATES`：按板块组织的所有步骤模板数组
4. 每个步骤包含：stepNo, stepName, department, assigneeRole, durationDays, description, notes, tools, deliverables, isEvergreen

```ts
// src/app/pages/delivery-plan/sopTemplate.ts

/** SOP 步骤模板 */
export interface SopStepTemplate {
  stepNo: string;
  stepName: string;
  phaseNo: number;
  department: string;
  assigneeRole: string;
  durationDays: number;
  description: string;
  notes: string;
  tools: string;
  deliverables: string;
  isEvergreen: boolean;
}

/** 步骤前置依赖：key 依赖 value 中所有步骤完成 */
export const SOP_STEP_DEPENDENCIES: Record<string, string[]> = {
  '1.2': ['1.1'],
  '1.3': ['1.2'],
  '1.4': ['1.3'],
  '1.5': ['1.4'],
  '2.1': ['1.5'],
  '2.2': ['2.1'],
  '2.3': ['2.2'],
  '2.4': ['2.3'],
  '3.1': ['2.4'],
  '3.2': ['3.1'],
  '3.3': ['3.2'],
  '3.4': ['3.3'],
  '3.5': ['3.3'],
  '3.6': ['3.5'],
  '3.7': ['3.4'],
  '3.9': ['3.7'],
  '3.10': ['3.9'],
  '4.2': ['4.1'],
  '4.3': ['4.1'],
  '4.4': ['4.3'],
  '4.5': ['4.3'],
  '4.6': ['4.4'],
  '4.7': [],
  '5.1': ['3.10'],
  '5.2': ['5.1'],
  '5.3': ['5.2'],
  '5.4': ['5.3'],
  '5.5': ['5.4'],
  '6.1': ['5.5'],
  '6.2': ['6.1'],
  '6.3': ['6.1'],
  '6.4': ['6.3'],
  '6.5': ['6.1'],
  '7.1': ['6.1'],
  '7.2': ['7.1'],
  '7.3': ['7.1'],
  '7.4': ['7.1'],
  '7.5': ['7.3'],
};
// 注意：3.8 需求变更管理无前置依赖，为贯穿型任务

/** 板块间依赖：key 板块号依赖 value 板块号完成 */
export const SOP_PHASE_DEPENDENCIES: Record<number, number[]> = {
  2: [1],
  5: [3, 4],
  6: [5],
  7: [6],
  // 板块 3 和板块 4 并行，均依赖板块 2
  3: [2],
  4: [2],
};

/** SOP 七大板块全部步骤模板 */
export const SOP_STEP_TEMPLATES: SopStepTemplate[] = [
  // ===== 板块一：合同交接 =====
  {
    stepNo: '1.1',
    stepName: '合同接收与存档',
    phaseNo: 1,
    department: '售前组、法务组',
    assigneeRole: '销售',
    durationDays: 1,
    description: '接收销售移交的合同、附件、补充协议，分类存档与保密校验。',
    notes: '报价、商务条款加密存储；严禁对外转发完整合同。',
    tools: '项目管理系统、企业网盘、加密文件夹',
    deliverables: '1. 合同电子版 + 扫描件\n2. 合同附件档案',
    isEvergreen: false,
  },
  {
    stepNo: '1.2',
    stepName: '合同核心要素拆解',
    phaseNo: 1,
    department: '售前组、交付组、法务组',
    assigneeRole: '产品经理',
    durationDays: 1,
    description: '解读合同，梳理交付物、节点、付款、验收规则；标注合同约定资源：SSL 证书、第三方接口、大模型 Token、第三方服务、云资源、资质服务，区分免费/付费、有效期、续费责任。',
    notes: '合同原件仅存档，流程流转拆解文档；明确资源采购方（我方/客户）、费用归属、到期续费主体。',
    tools: 'XMind、Excel 拆解模板、项目管理系统',
    deliverables: '1. 合同核心拆解表\n2. 项目风险清单\n3. 项目资源 & 第三方服务清单\n4. 资质服务清单',
    isEvergreen: false,
  },
  {
    stepNo: '1.3',
    stepName: '客户初步需求调研',
    phaseNo: 1,
    department: '客户、销售',
    assigneeRole: '产品经理',
    durationDays: 2,
    description: '调研客户背景、业务、技术环境；收集域名主体、备案资质、第三方接口账号、大模型权限、证书申请材料、第三方服务授权信息。',
    notes: '区分刚需资源与可选增值资源；提前告知第三方接口、Token、证书存在审核/配额/有效期限制。',
    tools: '腾讯会议、企业微信、调研问卷',
    deliverables: '1. 客户需求补充文档\n2. 技术环境统计表\n3. 第三方资源资料收集清单\n4. 资质备案资料清单',
    isEvergreen: false,
  },
  {
    stepNo: '1.4',
    stepName: '项目可行性评估',
    phaseNo: 1,
    department: '开发组、运维组、管理层',
    assigneeRole: '产品经理',
    durationDays: 2,
    description: '评估技术、工期、人力、二开可行性；评估 SSL 证书、第三方接口、大模型 Token、各类第三方服务的稳定性、配额、调用限制、成本、审核周期；同步评估备案、上架、软著风险。',
    notes: '大模型 Token 存在调用频次/额度限制，提前预留冗余；境外接口、证书需确认客户网络环境可正常访问。',
    tools: '可行性评估模板（Word）',
    deliverables: '1. 可行性评估报告\n2. 人力冗余方案\n3. 第三方资源工期 & 风险评估表\n4. 资质事务排期表',
    isEvergreen: false,
  },
  {
    stepNo: '1.5',
    stepName: '客户对接群组建 & 人员介绍',
    phaseNo: 1,
    department: '客户、销售',
    assigneeRole: '销售',
    durationDays: 1,
    description: '介绍交付、产品、开发、资源/资质专职对接人，明确权责、沟通规则、资料对接流程。',
    notes: '多级甲方项目提前统一沟通话术；明确资料补正对接人。',
    tools: '企业微信/钉钉、微信群',
    deliverables: '1. 项目专属沟通群\n2. 全员权责说明（含资源/资质对接）',
    isEvergreen: false,
  },

  // ===== 板块二：项目启动准备 =====
  {
    stepNo: '2.1',
    stepName: '项目立项与审批',
    phaseNo: 2,
    department: '管理层、财务部',
    assigneeRole: '项目经理',
    durationDays: 2,
    description: '提交立项申请，明确目标、范围、工期、预算；单独列明 SSL 证书、第三方接口、大模型 Token、云资源、资质服务的采购预算、付费周期、责任人。',
    notes: '资源预算变更必须重新走审批；区分一次性费用与年度续费费用。',
    tools: 'OA 系统、立项申请表',
    deliverables: '1. 立项审批单\n2. 项目成本台账\n3. 第三方资源预算明细表',
    isEvergreen: false,
  },
  {
    stepNo: '2.2',
    stepName: '项目团队组建与分工',
    phaseNo: 2,
    department: '开发组、UI 组、测试组、运维组',
    assigneeRole: '项目经理',
    durationDays: 3,
    description: '配置项目全员，设立资源 & 第三方服务专职管理员，明确账号管理、资源申请、配置、巡检、续费岗位职责。',
    notes: '核心接口、Token、证书实行双人管理；同步资源保密、权限管控规则。',
    tools: 'Excel 分工表、RACI 职责矩阵',
    deliverables: '1. 团队分工表（含资源管理员）\n2. 岗位权责说明书',
    isEvergreen: false,
  },
  {
    stepNo: '2.3',
    stepName: '全项目计划编制',
    phaseNo: 2,
    department: '全项目组、客户',
    assigneeRole: '项目经理',
    durationDays: 3,
    description: '拆解整体任务，制定内外两套进度表；新增独立里程碑：SSL 证书申请、接口对接、大模型联调、资源配置、资质办理，标注各环节审核/联调周期与缓冲时间。',
    notes: '对外表格简化内部资源细节，只公示整体进度；接口联调、证书审核预留 7~15 天缓冲。',
    tools: '飞书项目/Jira、Project、Excel',
    deliverables: '1. 对内全量项目计划表（含所有资源/资质节点）\n2. 对外客户版进度表',
    isEvergreen: false,
  },
  {
    stepNo: '2.4',
    stepName: '软硬件 & 第三方资源前置部署',
    phaseNo: 2,
    department: '运维组、开发组',
    assigneeRole: '运维专员',
    durationDays: 2,
    description: '搭建开发/测试/预发环境；启动域名查询注册、SSL 证书申请、第三方接口开通、大模型 Token 申领、云服务器/存储等资源初始化，整理全部账号密钥。',
    notes: '政企客户优先使用国产 SSL 证书、国产大模型、境内第三方接口；密钥、Token、接口密钥禁止明文转发，统一加密归档。',
    tools: '服务器后台、域名/证书平台、第三方开发者后台、Git、网盘',
    deliverables: '1. 环境配置文档\n2. 账号权限表\n3. SSL 证书文件、接口密钥、Token 凭证、云资源台账\n4. 资质前置资料包',
    isEvergreen: false,
  },

  // ===== 板块三：项目交付执行 =====
  {
    stepNo: '3.1',
    stepName: '需求文档编制 & 内部评审',
    phaseNo: 3,
    department: '开发组、交付组',
    assigneeRole: '产品经理',
    durationDays: 3,
    description: '编写正式需求文档；补充第三方接口调用规则、大模型交互逻辑、SSL 部署要求、第三方服务接入规范、页面合规要求。',
    notes: '接口字段、请求方式、返回格式提前对齐，减少联调返工。',
    tools: '语雀/Confluence、Word',
    deliverables: '1. 产品需求文档\n2. 评审记录\n3. 第三方资源接入规范文档',
    isEvergreen: false,
  },
  {
    stepNo: '3.2',
    stepName: '原型设计',
    phaseNo: 3,
    department: '内部设计组',
    assigneeRole: '产品经理',
    durationDays: 5,
    description: '按需求制作页面原型、交互逻辑，每日备份源文件。',
    notes: '涉及大模型对话、第三方功能模块，原型标注调用逻辑。',
    tools: 'Axure、Figma、企业网盘',
    deliverables: '1. Axure 原型 (.rp)\n2. Figma 原型 (.fig)',
    isEvergreen: false,
  },
  {
    stepNo: '3.3',
    stepName: '原型设计客户确认',
    phaseNo: 3,
    department: '客户、销售',
    assigneeRole: '产品经理',
    durationDays: 2,
    description: '演示原型，收集意见与变更，完成书面确认。',
    notes: '功能变更若涉及第三方接口/Token，同步评估额度与成本变化。',
    tools: '腾讯会议、企业微信',
    deliverables: '1. 会议记录\n2. 原型确认书',
    isEvergreen: false,
  },
  {
    stepNo: '3.4',
    stepName: '开发交底 & 技术方案设计',
    phaseNo: 3,
    department: '开发组',
    assigneeRole: '开发主管',
    durationDays: 2,
    description: '讲解需求、原型、优先级；输出架构、数据库、接口方案；明确 SSL 部署位置、第三方接口联调顺序、大模型调用频次限制、密钥安全规范。',
    notes: '高频调用接口做限流、容错处理；禁止前端明文存储 Token、接口密钥。',
    tools: '项目管理工具、Visio、Word',
    deliverables: '1. 产品 + 原型共享文档\n2. 交底会议记录\n3. 技术设计方案\n4. 接口/Token 联调计划表',
    isEvergreen: false,
  },
  {
    stepNo: '3.5',
    stepName: 'UI 设计',
    phaseNo: 3,
    department: '内部 UI 组',
    assigneeRole: 'UI 设计师',
    durationDays: 5,
    description: '按原型与客户 VI 完成 UI 设计、切图，主管审核。',
    notes: '页面需预留 SSL 安全标识、第三方服务公示位。',
    tools: 'Figma、国产设计工具、网盘',
    deliverables: '1. UI 源文件\n2. 切图 & 标注文件',
    isEvergreen: false,
  },
  {
    stepNo: '3.6',
    stepName: 'UI 设计客户确认',
    phaseNo: 3,
    department: '客户、销售',
    assigneeRole: 'UI 设计师',
    durationDays: 2,
    description: '演示 UI 方案，收集修改意见，完成确认。',
    notes: '页面布局变更影响接口展示的，同步告知开发与资源管理员。',
    tools: '腾讯会议、企业微信',
    deliverables: '1. UI 会议记录\n2. UI 设计确认书',
    isEvergreen: false,
  },
  {
    stepNo: '3.7',
    stepName: '开发过程每日跟进',
    phaseNo: 3,
    department: '开发组、运维组',
    assigneeRole: '产品经理',
    durationDays: 15,
    description: '每日跟进开发进度、代码质量；运维同步跟进 SSL 证书签发、接口联调、大模型 Token 测试、域名实名、备案进度，记录资源运行状态。',
    notes: '大模型额度不足、接口限流立即切换备用方案；证书驳回、备案错漏第一时间联系客户补正。',
    tools: 'Git、项目管理工具、各类第三方后台',
    deliverables: '1. 开发进度表\n2. 系统设计文档\n3. 第三方资源运行日志\n4. 资质事务进度日志',
    isEvergreen: false,
  },
  {
    stepNo: '3.8',
    stepName: '需求变更全流程管理',
    phaseNo: 3,
    department: '客户、销售、开发组、运维组',
    assigneeRole: '产品经理',
    durationDays: 0, // 贯穿型，工期由板块三范围决定
    description: '评估变更对工期、成本的影响并走审批；重点评估变更对第三方接口、Token 配额、SSL 部署、现有资源的影响。',
    notes: '所有变更书面留痕，无口头变更；资源扩容、增配同步更新预算与合同。新增大量接口/大模型调用，需提前采购 Token、升级配额。',
    tools: '变更申请单、OA、项目管理工具',
    deliverables: '1. 变更申请表\n2. 更新版文档 & 计划\n3. 资源影响评估说明',
    isEvergreen: true,
  },
  {
    stepNo: '3.9',
    stepName: '阶段性节点交付',
    phaseNo: 3,
    department: '客户、销售',
    assigneeRole: '产品经理',
    durationDays: 3,
    description: '按合同节点交付阶段性版本，演示功能并收集反馈。',
    notes: '阶段性交付同步展示第三方功能、大模型调用效果。',
    tools: '腾讯会议、压缩工具',
    deliverables: '1. 节点交付记录\n2. 交付确认书/聊天截图',
    isEvergreen: false,
  },
  {
    stepNo: '3.10',
    stepName: '收款节点跟进',
    phaseNo: 3,
    department: '客户、销售',
    assigneeRole: '销售',
    durationDays: 2,
    description: '达到收款条件后整理交付证明，通知销售对接催款。',
    notes: '收款异常同步评估项目及配套资源是否继续运维。',
    tools: '企业微信、项目管理系统',
    deliverables: '1. 收款进度表\n2. 交付证明材料',
    isEvergreen: false,
  },

  // ===== 板块四：资质备案 & 上架 =====
  {
    stepNo: '4.1',
    stepName: '域名注册与实名认证',
    phaseNo: 4,
    department: '运维组、客户',
    assigneeRole: '运维专员',
    durationDays: 3,
    description: '域名查询、注册、实名、基础解析；保证域名主体与备案主体一致。',
    notes: '提醒客户域名到期续费；禁用违规/境外高风险域名。',
    tools: '域名服务商后台、企业微信',
    deliverables: '1. 域名注册证书\n2. 实名截图\n3. 解析配置表',
    isEvergreen: false,
  },
  {
    stepNo: '4.2',
    stepName: 'SSL 证书申请、签发与配置',
    phaseNo: 4,
    department: '运维组、客户',
    assigneeRole: '运维专员',
    durationDays: 5,
    description: '根据域名类型申请 DV/OV/EV 型 SSL 证书，完成证书下载、部署、全站 HTTPS 配置、强制跳转。',
    notes: '区分免费/付费证书、有效期，记录到期日；证书密钥加密存储，禁止外泄。',
    tools: '证书服务商后台、服务器管理工具',
    deliverables: '1. SSL 证书原件（密钥/证书链）\n2. 证书签发回执\n3. HTTPS 部署配置文档',
    isEvergreen: false,
  },
  {
    stepNo: '4.3',
    stepName: '网站 ICP 备案',
    phaseNo: 4,
    department: '运维组、客户',
    assigneeRole: '运维专员',
    durationDays: 15,
    description: '整理资质资料提交备案，配合官方电话/资料核验。',
    notes: '备案周期 3~20 工作日，提前告知客户；保证联系电话畅通。',
    tools: '备案平台、扫描工具、网盘',
    deliverables: '1. 备案回执\n2. 备案进度表\n3. 备案编号 & 证书',
    isEvergreen: false,
  },
  {
    stepNo: '4.4',
    stepName: '小程序专项资质 & 第三方配置',
    phaseNo: 4,
    department: '运维组、产品经理、客户',
    assigneeRole: '运维专员',
    durationDays: 5,
    description: '小程序主体认证、类目资质、隐私政策上传；配置小程序端第三方接口、大模型 Token、SSL 安全校验。',
    notes: '特殊行业前置资质齐全；小程序内第三方功能需平台允许。',
    tools: '小程序开发者后台、文本工具',
    deliverables: '1. 主体认证凭证\n2. 类目资质文件\n3. 隐私政策\n4. 接口/Token 配置记录',
    isEvergreen: false,
  },
  {
    stepNo: '4.5',
    stepName: 'APP 上架准备（安卓/iOS）',
    phaseNo: 4,
    department: '运维组、测试组、客户',
    assigneeRole: '运维专员',
    durationDays: 7,
    description: '准备软著、隐私政策、备案号、应用素材；完成 APP 内第三方接口、大模型 Token、SSL 安全配置、包名签名。',
    notes: 'iOS/安卓平台对第三方接口、隐私政策审核严格，提前自查。',
    tools: '应用开发者后台、签名工具、录屏工具',
    deliverables: '1. 上架资料包\n2. 正式安装包\n3. 签名 & 资源配置表',
    isEvergreen: false,
  },
  {
    stepNo: '4.6',
    stepName: 'APP/小程序正式提审与跟进',
    phaseNo: 4,
    department: '运维组、产品经理',
    assigneeRole: '运维专员',
    durationDays: 7,
    description: '提交正式版本，跟踪审核状态，驳回及时整改重提。',
    notes: '因第三方接口、Token 违规导致驳回，优先替换/关停违规模块。',
    tools: '开发者后台、企业微信',
    deliverables: '1. 版本提审记录\n2. 整改记录\n3. 上架通过通知/访问链接',
    isEvergreen: false,
  },
  {
    stepNo: '4.7',
    stepName: '软件著作权申请',
    phaseNo: 4,
    department: '运维组、产品经理、客户',
    assigneeRole: '运维专员',
    durationDays: 30,
    description: '整理源码、说明书、证件提交软著申报，跟进受理、补正、下证。',
    notes: '常规下证 30~45 工作日，加急服务单独约定。',
    tools: '软著申报平台、压缩工具、打印设备',
    deliverables: '1. 软著受理通知书\n2. 软著电子 + 纸质证书',
    isEvergreen: false,
  },

  // ===== 板块五：测试验收 =====
  {
    stepNo: '5.1',
    stepName: '项目综合内部测试',
    phaseNo: 5,
    department: '开发组、测试组',
    assigneeRole: '测试工程师',
    durationDays: 5,
    description: '全功能、流程测试，缺陷跟踪修复；重点测试 HTTPS 访问、SSL 有效性、第三方接口调用、大模型对话、Token 额度消耗。',
    notes: '模拟高并发、高调用量，验证限流与容错机制。',
    tools: 'Jira、测试用例表',
    deliverables: '1. 缺陷清单 & 回归记录\n2. 第三方资源联调测试报告',
    isEvergreen: false,
  },
  {
    stepNo: '5.2',
    stepName: '性能 & 安全 & 合规专项测试',
    phaseNo: 5,
    department: '测试组、运维组',
    assigneeRole: '测试工程师',
    durationDays: 3,
    description: '性能、漏洞扫描；核查 SSL 安全状态、密钥安全性、Token 防泄露、备案号/隐私政策/第三方资质公示合规性。',
    notes: '严禁页面出现密钥、Token、明文账号等敏感信息。',
    tools: 'JMeter、漏洞扫描工具',
    deliverables: '1. 性能/安全报告\n2. 合规 & 资源安全检查记录',
    isEvergreen: false,
  },
  {
    stepNo: '5.3',
    stepName: '客户交付演示 & 预验收',
    phaseNo: 5,
    department: '客户',
    assigneeRole: '产品经理',
    durationDays: 2,
    description: '整体演示系统，逐一展示 SSL 安全、第三方功能、大模型交互、域名、备案、上架链接、软著、证书文件，收集问题与意见。',
    notes: '区分程序 BUG、资源配置问题、使用咨询、优化建议。',
    tools: '腾讯会议、演示环境',
    deliverables: '客户问题清单、全资源 & 资质交付清单',
    isEvergreen: false,
  },
  {
    stepNo: '5.4',
    stepName: '问题集中修复 & 回归复测',
    phaseNo: 5,
    department: '开发组、测试组、运维组',
    assigneeRole: '测试工程师',
    durationDays: 5,
    description: '修复程序缺陷、页面问题；整改 SSL、接口、Token、合规公示类问题，全量回归测试。',
    notes: '整改不新增功能，仅修复现有问题与配置错误。',
    tools: 'Git、缺陷管理工具',
    deliverables: '问题修复闭环记录、资源整改记录',
    isEvergreen: false,
  },
  {
    stepNo: '5.5',
    stepName: '项目整体正式验收',
    phaseNo: 5,
    department: '客户、销售',
    assigneeRole: '项目经理',
    durationDays: 2,
    description: '客户按合同完成最终验收；将程序、源码、SSL 证书、接口文档、Token 凭证、云资源信息、域名、备案、上架、软著全部列入交付清单并签字确认。',
    notes: '验收完成同步财务启动尾款结算；同步资源交接注意事项。',
    tools: '验收报告模板',
    deliverables: '1. 完整项目交付清单（含全部资源 + 资质）\n2. 验收确认书',
    isEvergreen: false,
  },

  // ===== 板块六：运维支持 =====
  {
    stepNo: '6.1',
    stepName: '系统正式部署上线',
    phaseNo: 6,
    department: '运维组、客户',
    assigneeRole: '运维专员',
    durationDays: 2,
    description: '正式环境部署、数据备份、监控配置；再次核验 SSL 证书、接口、Token 全部正常运行。',
    notes: '准备版本回滚方案；上线避开客户业务高峰。',
    tools: '部署脚本、监控工具',
    deliverables: '1. 上线部署文档\n2. 备份文件',
    isEvergreen: false,
  },
  {
    stepNo: '6.2',
    stepName: '客户操作 & 资源培训',
    phaseNo: 6,
    department: '客户',
    assigneeRole: '产品经理',
    durationDays: 2,
    description: '系统操作培训；同步讲解 SSL 查看、第三方后台、大模型额度查询、域名/证书后台、资质后台基础操作。',
    notes: '账号、密钥、证书文件单独交付，强调保密要求。',
    tools: 'PPT、操作手册、录屏工具',
    deliverables: '1. 培训课件\n2. 系统操作手册\n3. 第三方资源运维手册',
    isEvergreen: false,
  },
  {
    stepNo: '6.3',
    stepName: '日常运维 & 全资源定期巡检',
    phaseNo: 6,
    department: '客户、运维组',
    assigneeRole: '运维专员',
    durationDays: 30,
    description: '处理故障与咨询；每月固定巡检：域名有效期、SSL 证书到期、大模型 Token 剩余额度、接口可用性、备案状态、APP/小程序上架状态、云资源负载。',
    notes: '所有到期资源提前 30 天发续费提醒；Token 额度低于 20% 及时预警扩容。',
    tools: '工单系统、各类资源后台',
    deliverables: '1. 运维工单记录\n2. 月度全资源巡检报告\n3. 到期/额度预警单',
    isEvergreen: false,
  },
  {
    stepNo: '6.4',
    stepName: '资源续费、扩容、版本更新',
    phaseNo: 6,
    department: '运维组、销售、客户',
    assigneeRole: '运维专员',
    durationDays: 3,
    description: '证书、域名、云资源到期续费；Token 额度不足扩容；第三方服务到期续约。',
    notes: '续费主体、费用严格按照合同约定执行；更新密钥后同步更新项目配置。',
    tools: '各资源服务商后台',
    deliverables: '1. 续费/扩容订单\n2. 新证书/新 Token/新密钥文件\n3. 配置更新记录',
    isEvergreen: false,
  },
  {
    stepNo: '6.5',
    stepName: '后续版本迭代支持',
    phaseNo: 6,
    department: '客户、开发组、运维组',
    assigneeRole: '产品经理',
    durationDays: 5,
    description: '迭代开发前评估对 SSL、接口、Token、上架资质的影响；版本更新后重新提审、重配资源。',
    notes: '大版本变更需重新提交类目资质、隐私政策、接口备案。',
    tools: '需求收集表、项目管理工具',
    deliverables: '迭代需求清单、版本 & 资源更新记录',
    isEvergreen: false,
  },

  // ===== 板块七：项目总结 =====
  {
    stepNo: '7.1',
    stepName: '项目全流程复盘',
    phaseNo: 7,
    department: '全体项目组、管理层',
    assigneeRole: '项目经理',
    durationDays: 2,
    description: '复盘工期、成本、需求偏差；重点复盘 SSL 签发、接口联调、大模型调用、证书驳回、限流、资质审核等问题，输出优化方案。',
    notes: '汇总高频问题，形成内部资源接入避坑手册。',
    tools: '复盘模板、会议工具',
    deliverables: '项目复盘报告（含资源 & 资质专项总结）',
    isEvergreen: false,
  },
  {
    stepNo: '7.2',
    stepName: '客户满意度调研',
    phaseNo: 7,
    department: '客户、销售',
    assigneeRole: '产品经理',
    durationDays: 3,
    description: '收集客户对系统、服务、第三方资源、证书、接口、资质办理的评价与建议。',
    notes: '针对资源不稳定、审核慢等问题优化对接流程。',
    tools: '问卷星、满意度调查表',
    deliverables: '满意度调研报告',
    isEvergreen: false,
  },
  {
    stepNo: '7.3',
    stepName: '全套项目 & 资源 & 资质文档归档',
    phaseNo: 7,
    department: '交付组、文档管理员、运维组',
    assigneeRole: '产品经理',
    durationDays: 3,
    description: '汇总所有项目资料；独立归档：SSL 证书、密钥、接口文档、Token 凭证、云资源台账、域名、备案、上架、软著全套材料。',
    notes: '密钥、Token、证书、账号实行高强度加密存储，严控查看权限。',
    tools: '企业网盘、文档系统',
    deliverables: '完整项目档案 + 独立资源资质加密档案包',
    isEvergreen: false,
  },
  {
    stepNo: '7.4',
    stepName: '客户案例撰写',
    phaseNo: 7,
    department: '销售、市场部',
    assigneeRole: '产品经理',
    durationDays: 5,
    description: '编写行业案例，可体现"开发 + 资源配置 + 证书 + 接口 + 大模型接入 + 备案 + 上架 + 软著"一站式服务。',
    notes: '隐去客户密钥、Token、隐私资质等敏感信息。',
    tools: 'AI 工具、Word',
    deliverables: '行业客户案例文档',
    isEvergreen: false,
  },
  {
    stepNo: '7.5',
    stepName: '功能库 & 资源流程库维护',
    phaseNo: 7,
    department: '开发组、运维组',
    assigneeRole: '开发主管',
    durationDays: 3,
    description: '维护代码复用库；更新 SSL 部署、第三方接口、大模型 Token、各类资质标准化流程、资料清单、审核规则、限流预案。',
    notes: '定期组织内部培训，统一资源接入规范。',
    tools: '代码仓库、流程模板',
    deliverables: '功能复用库 + 第三方资源 & 资质标准流程库',
    isEvergreen: false,
  },
];

/** 模板版本号（供未来追溯） */
export const SOP_TEMPLATE_VERSION = '1.0';
```

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/sopTemplate.ts
git commit -m "feat(delivery-plan): add SOP template with all 37 steps, dependencies, and durations"
```

---

## Task 4: 工具函数

**Files:**
- Create: `src/app/pages/delivery-plan/utils.ts`
- Create: `src/app/pages/delivery-plan/__tests__/utils.test.ts`

包含：排期推算、完成率计算、板块状态推导、角色映射、交付类型步骤过滤等纯函数。

- [ ] **Step 1: 编写 utils.ts 测试**

```ts
// src/app/pages/delivery-plan/__tests__/utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  filterPhase4Steps,
  derivePhaseStatus,
  calcPhaseCompletion,
  calcOverallCompletion,
  mapRoleToProjectMember,
  mapPhaseManager,
  generateDeliveryPlan,
  addBusinessDays,
} from '../utils';
import type { DeliveryType, SopStep, SopPhase } from '../types';
import { SOP_STEP_TEMPLATES } from '../sopTemplate';

describe('filterPhase4Steps', () => {
  it('returns website steps for 网站 type', () => {
    const result = filterPhase4Steps('网站');
    const stepNos = result.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.2', '4.3', '4.7']);
  });

  it('returns deduplicated steps for 网站+小程序', () => {
    const result = filterPhase4Steps('网站+小程序');
    const stepNos = result.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.2', '4.3', '4.4', '4.6', '4.7']);
  });

  it('overrides step name for combined types', () => {
    const result = filterPhase4Steps('全平台');
    const step43 = result.find((s) => s.stepNo === '4.3');
    expect(step43?.stepName).toBe('ICP 备案 / 小程序主体备案');
  });
});

describe('derivePhaseStatus', () => {
  it('returns the lowest status among steps', () => {
    const steps: SopStep[] = [
      { id: '1', phaseId: 'p1', projectId: 'proj', stepNo: '1.1', stepName: 'A', department: '', assignee: '', status: 'completed', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '2', phaseId: 'p1', projectId: 'proj', stepNo: '1.2', stepName: 'B', department: '', assignee: '', status: 'pending', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
    ];
    expect(derivePhaseStatus(steps)).toBe('pending');
  });

  it('returns in_progress when at least one step is in progress', () => {
    const steps: SopStep[] = [
      { id: '1', phaseId: 'p1', projectId: 'proj', stepNo: '1.1', stepName: 'A', department: '', assignee: '', status: 'completed', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '2', phaseId: 'p1', projectId: 'proj', stepNo: '1.2', stepName: 'B', department: '', assignee: '', status: 'in_progress', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '3', phaseId: 'p1', projectId: 'proj', stepNo: '1.3', stepName: 'C', department: '', assignee: '', status: 'pending', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
    ];
    expect(derivePhaseStatus(steps)).toBe('pending');
  });

  it('returns completed when all steps are completed or skipped', () => {
    const steps: SopStep[] = [
      { id: '1', phaseId: 'p1', projectId: 'proj', stepNo: '1.1', stepName: 'A', department: '', assignee: '', status: 'completed', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '2', phaseId: 'p1', projectId: 'proj', stepNo: '1.2', stepName: 'B', department: '', assignee: '', status: 'skipped', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
    ];
    expect(derivePhaseStatus(steps)).toBe('completed');
  });
});

describe('calcPhaseCompletion', () => {
  it('calculates completion with 50% weight for in_progress steps', () => {
    const steps: SopStep[] = [
      { id: '1', phaseId: 'p1', projectId: 'proj', stepNo: '1.1', stepName: 'A', department: '', assignee: '', status: 'completed', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '2', phaseId: 'p1', projectId: 'proj', stepNo: '1.2', stepName: 'B', department: '', assignee: '', status: 'in_progress', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '3', phaseId: 'p1', projectId: 'proj', stepNo: '1.3', stepName: 'C', department: '', assignee: '', status: 'pending', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
    ];
    // (1 + 0.5) / 3 = 0.5
    expect(calcPhaseCompletion(steps)).toBe(0.5);
  });

  it('excludes skipped steps from denominator', () => {
    const steps: SopStep[] = [
      { id: '1', phaseId: 'p1', projectId: 'proj', stepNo: '1.1', stepName: 'A', department: '', assignee: '', status: 'completed', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
      { id: '2', phaseId: 'p1', projectId: 'proj', stepNo: '1.2', stepName: 'B', department: '', assignee: '', status: 'skipped', startDate: '', dueDate: '', deliverables: '', description: '', notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '' },
    ];
    // 1 / 1 = 1.0
    expect(calcPhaseCompletion(steps)).toBe(1.0);
  });
});

describe('addBusinessDays', () => {
  it('skips weekends', () => {
    // 2026-06-12 is Friday, +1 = Monday
    expect(addBusinessDays('2026-06-12', 1)).toBe('2026-06-15');
  });

  it('handles multi-day spans across weekends', () => {
    // 2026-06-12 is Friday, +3 = Wednesday
    expect(addBusinessDays('2026-06-12', 3)).toBe('2026-06-17');
  });
});

describe('mapRoleToProjectMember', () => {
  it('returns the first member for a known role', () => {
    const project = {
      owner: '李四',
      productUsers: ['李四', '孙七'],
      salesUsers: ['张三'],
      uiUsers: ['孙七'],
      frontendUsers: ['王五'],
      backendUsers: ['赵六'],
      opsUsers: ['周八'],
      testUsers: ['钱九'],
      legalUsers: ['张三'],
    } as any;
    expect(mapRoleToProjectMember('产品经理', project)).toBe('李四');
    expect(mapRoleToProjectMember('运维专员', project)).toBe('周八');
  });

  it('returns the role name when no member found', () => {
    const project = {
      owner: '李四',
      productUsers: [],
      salesUsers: [],
      uiUsers: [],
      frontendUsers: [],
      backendUsers: [],
      opsUsers: [],
      testUsers: [],
      legalUsers: [],
    } as any;
    expect(mapRoleToProjectMember('运维专员', project)).toBe('运维专员');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npx vitest run src/app/pages/delivery-plan/__tests__/utils.test.ts 2>&1 | tail -10`
Expected: FAIL — utils.ts 不存在

- [ ] **Step 3: 实现 utils.ts**

```ts
// src/app/pages/delivery-plan/utils.ts

import { addDays, format, parseISO, isWeekend } from 'date-fns';
import type { DeliveryType, SopPhase, SopPhaseStatus, SopStep, SopStepStatus, DeliveryPlan, DeliveryConfig, SopMilestone } from './types';
import { STATUS_PRIORITY, DELIVERY_TYPE_PHASE4_STEPS, DELIVERY_TYPE_STEP_NAME_OVERRIDES, PHASE_MANAGER_FIELD } from './constants';
import { SOP_STEP_TEMPLATES, SOP_STEP_DEPENDENCIES, SOP_PHASE_DEPENDENCIES } from './sopTemplate';

/** 跳过周末，加 N 个工作日 */
export function addBusinessDays(dateStr: string, days: number): string {
  let current = parseISO(dateStr);
  let remaining = days;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (!isWeekend(current)) {
      remaining--;
    }
  }
  return format(current, 'yyyy-MM-dd');
}

/** 过滤板块四适用步骤（按交付类型） */
export function filterPhase4Steps(deliveryType: DeliveryType): SopStep[] {
  const allowedStepNos = DELIVERY_TYPE_PHASE4_STEPS[deliveryType];
  const nameOverrides = DELIVERY_TYPE_STEP_NAME_OVERRIDES[deliveryType] ?? {};

  return SOP_STEP_TEMPLATES
    .filter((t) => t.phaseNo === 4 && allowedStepNos.includes(t.stepNo))
    .map((t) => ({
      id: `step-${t.stepNo}`,
      phaseId: `phase-4`,
      projectId: '',
      stepNo: t.stepNo,
      stepName: nameOverrides[t.stepNo] ?? t.stepName,
      department: t.department,
      assignee: t.assigneeRole,
      status: 'pending' as SopStepStatus,
      startDate: '',
      dueDate: '',
      deliverables: t.deliverables,
      description: t.description,
      notes: t.notes,
      tools: t.tools,
      isCustom: false,
      isEvergreen: t.isEvergreen,
      userNotes: '',
    }));
}

/** 推导板块状态（取最落后的步骤状态） */
export function derivePhaseStatus(steps: SopStep[]): SopPhaseStatus {
  if (steps.length === 0) return 'pending';
  const minPriority = Math.min(...steps.map((s) => STATUS_PRIORITY[s.status] ?? 0));
  const statusEntry = Object.entries(STATUS_PRIORITY).find(([, v]) => v === minPriority);
  return (statusEntry?.[0] ?? 'pending') as SopPhaseStatus;
}

/** 计算板块完成率（跳过不计分母，进行中 50% 折算） */
export function calcPhaseCompletion(steps: SopStep[]): number {
  const effective = steps.filter((s) => s.status !== 'skipped');
  if (effective.length === 0) return 1.0;
  const score = effective.reduce((sum, s) => {
    if (s.status === 'completed') return sum + 1;
    if (s.status === 'in_progress') return sum + 0.5;
    return sum;
  }, 0);
  return score / effective.length;
}

/** 计算整体完成率（各板块简单平均） */
export function calcOverallCompletion(phases: SopPhase[], allSteps: SopStep[]): number {
  if (phases.length === 0) return 0;
  const phaseCompletions = phases.map((phase) => {
    const phaseSteps = allSteps.filter((s) => s.phaseId === phase.id);
    return calcPhaseCompletion(phaseSteps);
  });
  return phaseCompletions.reduce((a, b) => a + b, 0) / phaseCompletions.length;
}

/** SOP 角色映射到项目成员 */
export function mapRoleToProjectMember(role: string, project: Record<string, any>): string {
  const fieldMap: Record<string, string> = {
    '产品经理': 'productUsers',
    '销售': 'salesUsers',
    'UI 设计师': 'uiUsers',
    '开发主管': 'frontendUsers',
    '项目经理': 'owner',
    '运维专员': 'opsUsers',
    '法务专员': 'legalUsers',
    '测试工程师': 'testUsers',
  };
  const field = fieldMap[role];
  if (!field) return role;
  const value = project[field];
  if (!value) return role;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : role;
  }
  return value || role;
}

/** 映射板块主管 */
export function mapPhaseManager(phaseNo: number, project: Record<string, any>): string {
  const field = PHASE_MANAGER_FIELD[phaseNo];
  if (!field) return '未指定';
  const value = project[field];
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : `${field}（未指定）`;
  }
  return value || `${field}（未指定）`;
}

/** 判断步骤是否逾期 */
export function isStepOverdue(step: SopStep, today: string): boolean {
  if (step.status === 'completed' || step.status === 'skipped') return false;
  return step.dueDate < today;
}

/** 获取默认缩放粒度 */
export function getDefaultZoomLevel(totalDays: number): 'day' | 'week' | 'month' {
  if (totalDays <= 30) return 'day';
  if (totalDays <= 90) return 'week';
  return 'month';
}

/** 生成交付计划核心函数 */
export function generateDeliveryPlan(
  config: DeliveryConfig,
  project: Record<string, any>,
  contractSignDate?: string,
  contractMilestones?: Array<{ name: string; completed: boolean; date: string }>,
): DeliveryPlan {
  const { selectedPhases, deliveryType, contractId } = config;
  const projectStartDate = project.startDate;
  const phases: SopPhase[] = [];
  const steps: SopStep[] = [];

  // 记录每个板块的起止日期
  const phaseDateRanges: Record<number, { start: string; end: string }> = {};

  // 按依赖顺序处理板块
  // 先确定板块执行顺序（拓扑排序简化版）
  const phaseOrder: number[] = [];
  const visited = new Set<number>();
  function visitPhase(no: number) {
    if (visited.has(no)) return;
    visited.add(no);
    const deps = SOP_PHASE_DEPENDENCIES[no] ?? [];
    for (const dep of deps) {
      if (selectedPhases.includes(dep)) visitPhase(dep);
    }
    if (selectedPhases.includes(no)) phaseOrder.push(no);
  }
  for (const no of selectedPhases.sort((a, b) => a - b)) {
    visitPhase(no);
  }

  for (const phaseNo of phaseOrder) {
    // 确定板块锚点日期
    let anchorDate: string;
    const phaseDeps = SOP_PHASE_DEPENDENCIES[phaseNo] ?? [];
    if (phaseDeps.length > 0) {
      // 依赖板块中最晚结束的日期 +1 天
      const depEndDates = phaseDeps
        .filter((d) => phaseDateRanges[d])
        .map((d) => phaseDateRanges[d].end);
      anchorDate = depEndDates.length > 0
        ? addBusinessDays(depEndDates.sort().reverse()[0], 1)
        : projectStartDate;
    } else if (phaseNo === 1 && contractSignDate) {
      // 板块一以合同签订日为锚点
      anchorDate = contractSignDate;
    } else {
      anchorDate = projectStartDate;
    }

    // 获取该板块的步骤模板
    let templates = SOP_STEP_TEMPLATES.filter((t) => t.phaseNo === phaseNo);
    if (phaseNo === 4) {
      templates = templates.filter((t) =>
        DELIVERY_TYPE_PHASE4_STEPS[deliveryType].includes(t.stepNo)
      );
    }

    const phaseId = `phase-${phaseNo}`;
    let currentDate = anchorDate;
    let maxEndDate = anchorDate;

    for (const template of templates) {
      const deps = SOP_STEP_DEPENDENCIES[template.stepNo] ?? [];
      // 计算步骤开始日期（取前置最晚结束 +1）
      if (deps.length > 0 && !template.isEvergreen) {
        const depEndDates = deps
          .map((depNo) => {
            const depStep = steps.find((s) => s.stepNo === depNo);
            return depStep?.dueDate;
          })
          .filter(Boolean) as string[];
        if (depEndDates.length > 0) {
          currentDate = addBusinessDays(depEndDates.sort().reverse()[0], 1);
        }
      }

      const nameOverrides = DELIVERY_TYPE_STEP_NAME_OVERRIDES[deliveryType] ?? {};
      const stepName = nameOverrides[template.stepNo] ?? template.stepName;

      const step: SopStep = {
        id: `step-${template.stepNo}`,
        phaseId,
        projectId: project.id || '',
        stepNo: template.stepNo,
        stepName,
        department: template.department,
        assignee: mapRoleToProjectMember(template.assigneeRole, project),
        status: 'pending',
        startDate: template.isEvergreen ? anchorDate : currentDate,
        dueDate: template.isEvergreen
          ? '' // 贯穿型任务截止日期稍后设置
          : addBusinessDays(currentDate, template.durationDays - 1),
        deliverables: template.deliverables,
        description: template.description,
        notes: template.notes,
        tools: template.tools,
        isCustom: false,
        isEvergreen: template.isEvergreen,
        userNotes: '',
      };

      if (!template.isEvergreen) {
        currentDate = addBusinessDays(step.dueDate, 1);
        if (step.dueDate > maxEndDate) maxEndDate = step.dueDate;
      }

      steps.push(step);
    }

    // 处理贯穿型任务的截止日期 = 板块最晚日期
    const evergreenSteps = steps.filter((s) => s.phaseId === phaseId && s.isEvergreen);
    for (const es of evergreenSteps) {
      es.dueDate = maxEndDate;
    }

    // 推导板块日期范围
    const phaseSteps = steps.filter((s) => s.phaseId === phaseId);
    const allStartDates = phaseSteps.map((s) => s.startDate).filter(Boolean).sort();
    const allEndDates = phaseSteps.map((s) => s.dueDate).filter(Boolean).sort();
    const phaseStart = allStartDates[0] ?? anchorDate;
    const phaseEnd = allEndDates[allEndDates.length - 1] ?? maxEndDate;

    phaseDateRanges[phaseNo] = { start: phaseStart, end: phaseEnd };

    phases.push({
      id: phaseId,
      projectId: project.id || '',
      phaseNo,
      phaseName: ['合同交接', '项目启动准备', '项目交付执行', '资质备案 & 上架', '测试验收', '运维支持', '项目总结'][phaseNo - 1],
      manager: mapPhaseManager(phaseNo, project),
      status: 'pending',
      startDate: phaseStart,
      dueDate: phaseEnd,
    });
  }

  // 生成里程碑
  const milestones: SopMilestone[] = (contractMilestones ?? [])
    .filter((m) => m.date)
    .map((m, i) => ({
      id: `milestone-${i + 1}`,
      projectId: project.id || '',
      name: m.name,
      date: m.date,
      completed: m.completed,
    }));

  return { projectId: project.id || '', phases, steps, milestones, deliveryType, contractId };
}

/** 增量追加新板块到现有交付计划 */
export function appendPhasesToPlan(
  existingPlan: DeliveryPlan,
  newPhases: number[],
  project: Record<string, any>,
  contractSignDate?: string,
  contractMilestones?: Array<{ name: string; completed: boolean; date: string }>,
): DeliveryPlan {
  const config: DeliveryConfig = {
    selectedPhases: newPhases,
    deliveryType: existingPlan.deliveryType,
    contractId: existingPlan.contractId,
  };
  const newPlan = generateDeliveryPlan(config, project, contractSignDate, contractMilestones);
  return {
    ...existingPlan,
    phases: [...existingPlan.phases, ...newPlan.phases],
    steps: [...existingPlan.steps, ...newPlan.steps],
    milestones: [...existingPlan.milestones, ...newPlan.milestones],
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npx vitest run src/app/pages/delivery-plan/__tests__/utils.test.ts 2>&1 | tail -15`
Expected: 所有测试 PASS

- [ ] **Step 5: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 6: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/utils.ts src/app/pages/delivery-plan/__tests__/utils.test.ts
git commit -m "feat(delivery-plan): add utility functions with tests — scheduling, completion, role mapping"
```

---

## Task 5: 数据模型变更 — Project 新增角色字段

**Files:**
- Modify: `src/app/pages/project-management/mockData.ts`

- [ ] **Step 1: 在 Project 接口中新增字段**

在 `Project` 接口的 `backendUsers` 后面添加：

```ts
  opsUsers: string[];
  testUsers: string[];
  legalUsers: string[];
```

- [ ] **Step 2: 在 roleEmployees 中补充新角色**

在 `roleEmployees` 对象中添加：

```ts
export const roleEmployees = {
  sales: ['张三', '李四', '钱九'],
  product: ['李四', '孙七'],
  ui: ['孙七', '周八'],
  frontend: ['王五', '钱九'],
  backend: ['赵六', '周八'],
  ops: ['周八', '王五'],
  test: ['钱九', '赵六'],
  legal: ['张三'],
};
```

- [ ] **Step 3: 在 initialProjects 的每个项目数据中补值**

项目1 (A公司CRM系统开发): 添加 `opsUsers: ['周八'], testUsers: ['钱九'], legalUsers: ['张三']`

项目2 (B公司小程序定制开发): 添加 `opsUsers: ['王五'], testUsers: ['钱九'], legalUsers: []`

项目3 (内部OA流程优化): 添加 `opsUsers: [], testUsers: [], legalUsers: []`（内部项目无运维/法务）

- [ ] **Step 4: 更新 Projects.tsx 项目编辑表单**

在 `Projects.tsx` 中，项目新建/编辑 Modal 里，在"后端"选择器后面添加三行：

```tsx
<Grid.Col span={6}><FormItem label="运维" field="opsUsers"><Select mode="multiple" allowClear>{roleEmployees.ops.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
<Grid.Col span={6}><FormItem label="测试" field="testUsers"><Select mode="multiple" allowClear>{roleEmployees.test.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
<Grid.Col span={6}><FormItem label="法务" field="legalUsers"><Select mode="multiple" allowClear>{roleEmployees.legal.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
```

同时需要：
1. 在文件顶部的 import 中添加 `roleEmployees`（已有但需确认导出了 ops/test/legal）
2. 在 `ProjectFormValues` 类型中添加 `opsUsers?: string[]; testUsers?: string[]; legalUsers?: string[];`
3. 在 `saveProject` 中构建 `nextProject` 时添加 `opsUsers: values.opsUsers || [], testUsers: values.testUsers || [], legalUsers: values.legalUsers || [],`
4. 增加一行 `<Grid.Row gutter={16}>` 来放这三个字段

- [ ] **Step 5: 更新 ProjectDetail.tsx 基础信息展示**

在 `ProjectDetail.tsx` 的 `Descriptions` data 数组中，在"后端"行后面添加：

```ts
{ label: '运维', value: project.opsUsers.join('、') || '-' },
{ label: '测试', value: project.testUsers.join('、') || '-' },
{ label: '法务', value: project.legalUsers.join('、') || '-' },
```

- [ ] **Step 6: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 7: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/project-management/mockData.ts src/app/pages/Projects.tsx src/app/pages/ProjectDetail.tsx
git commit -m "feat(project): add ops/test/legal role fields to Project model and forms"
```

---

## Task 6: 合同数据模型变更 — 新增 deliveryType

**Files:**
- Modify: `src/app/pages/Contracts.tsx`
- Modify: `src/app/pages/ContractDetail.tsx`

- [ ] **Step 1: 在 Contracts.tsx 新建合同 Modal 中添加"交付类型"选择器**

在合同新建 Modal 中，找到表单区域，在"备注"字段之前添加：

```tsx
<FormItem label="交付类型" field="deliveryType" rules={[{ required: true, message: '请选择交付类型' }]}>
  <Select placeholder="请选择交付类型">
    {DELIVERY_TYPES.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
  </Select>
</FormItem>
```

需要在文件顶部添加 import：
```ts
import { DELIVERY_TYPES } from './delivery-plan/types';
```

同时在合同列表的数据对象中为每条合同添加 `deliveryType` 字段：
- 第一条合同添加 `deliveryType: '全平台'`
- 第二条（B公司小程序）添加 `deliveryType: '小程序'`
- 第三条（内部OA）添加 `deliveryType: '网站'`

- [ ] **Step 2: 在 ContractDetail.tsx 基础信息中展示"交付类型"**

在 `contractData` 对象中添加 `deliveryType: '全平台'`。

在 Descriptions data 数组中，`productCategory` 行后面添加：

```ts
{ label: '交付类型', value: contractData.deliveryType },
```

- [ ] **Step 3: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 4: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/Contracts.tsx src/app/pages/ContractDetail.tsx
git commit -m "feat(contract): add deliveryType field to contract model and forms"
```

---

## Task 7: Mock 预置数据

**Files:**
- Create: `src/app/pages/delivery-plan/mockData.ts`

为项目1（A公司CRM系统开发，合同4，deliveryType='网站+小程序'）预生成一份完整的交付计划数据。

- [ ] **Step 1: 创建预置数据文件**

```ts
// src/app/pages/delivery-plan/mockData.ts

import type { DeliveryPlan } from './types';
import { generateDeliveryPlan } from './utils';

/** 为项目1预生成的交付计划 */
export const initialDeliveryPlans: Record<string, DeliveryPlan> = {};

// 项目1: A公司CRM系统开发 — 合同4, 交付类型: 网站+小程序
const project1Config = {
  selectedPhases: [1, 2, 3, 4, 5, 6, 7],
  deliveryType: '网站+小程序' as const,
  contractId: '4',
};

const project1Data = {
  id: '1',
  startDate: '2026-05-01',
  owner: '李四',
  productUsers: ['李四'],
  salesUsers: ['张三'],
  uiUsers: ['孙七'],
  frontendUsers: ['王五'],
  backendUsers: ['赵六'],
  opsUsers: ['周八'],
  testUsers: ['钱九'],
  legalUsers: ['张三'],
};

const contract4Milestones = [
  { name: '项目立项', completed: true, date: '2026-05-05' },
  { name: '原型确认', completed: true, date: '2026-05-20' },
  { name: '一期交付', completed: false, date: '2026-06-15' },
];

const plan1 = generateDeliveryPlan(
  project1Config,
  project1Data,
  '2026-04-28', // 合同签订日
  contract4Milestones,
);

// 标记部分步骤为已完成（模拟项目进行中状态）
const completedStepNos = ['1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3'];
for (const step of plan1.steps) {
  if (completedStepNos.includes(step.stepNo)) {
    step.status = 'completed';
  } else if (step.stepNo === '3.4') {
    step.status = 'in_progress';
  }
}

// 同步里程碑完成状态
for (const m of plan1.milestones) {
  if (m.name === '项目立项' || m.name === '原型确认') {
    m.completed = true;
  }
}

initialDeliveryPlans['1'] = plan1;

// 项目2: B公司小程序定制开发 — 合同2, 交付类型: 小程序
const project2Config = {
  selectedPhases: [1, 2, 3, 4, 5, 6, 7],
  deliveryType: '小程序' as const,
  contractId: '2',
};

const project2Data = {
  id: '2',
  startDate: '2026-04-10',
  owner: '王五',
  productUsers: ['孙七'],
  salesUsers: ['李四'],
  uiUsers: ['周八'],
  frontendUsers: ['王五'],
  backendUsers: ['赵六'],
  opsUsers: ['王五'],
  testUsers: ['钱九'],
  legalUsers: [],
};

const plan2 = generateDeliveryPlan(
  project2Config,
  project2Data,
  '2026-04-08',
  [
    { name: '需求确认', completed: true, date: '2026-04-20' },
    { name: '开发完成', completed: true, date: '2026-05-10' },
    { name: '验收通过', completed: false, date: '2026-05-18' },
  ],
);

// 项目2大部分已完成
for (const step of plan2.steps) {
  if (['6.3', '6.4', '6.5', '7.1', '7.2', '7.3', '7.4', '7.5'].includes(step.stepNo)) {
    step.status = 'pending';
  } else if (step.stepNo === '6.1' || step.stepNo === '6.2') {
    step.status = 'in_progress';
  } else {
    step.status = 'completed';
  }
}

initialDeliveryPlans['2'] = plan2;
```

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/mockData.ts
git commit -m "feat(delivery-plan): add pre-populated mock delivery plans for projects 1 and 2"
```

---

## Task 8: 生成配置面板 Modal

**Files:**
- Create: `src/app/pages/delivery-plan/DeliveryConfigModal.tsx`

- [ ] **Step 1: 创建配置面板组件**

此组件为 Modal，内容包含：
- 合同信息展示（有合同时）/ 提示无合同
- 交付类型展示（有合同只读）/ 选择器（无合同必填）
- 板块勾选（默认全选，无合同板块一不可勾选）
- 板块四将自动包含的步骤预览
- 确认/取消按钮

Props:
```ts
interface DeliveryConfigModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (config: DeliveryConfig) => void;
  contractId?: string;
  deliveryType?: DeliveryType; // 有合同时传入
  projectStartDate?: string;
}
```

组件内使用 Arco 的 `Modal`, `Form`, `Checkbox`, `Select`, `Typography` 组件实现。

- 有合同：交付类型只读展示，板块默认全选，板块一可选
- 无合同：交付类型必填下拉，板块一禁用不勾选，其余默认勾选

板块四预览区根据交付类型和 `DELIVERY_TYPE_PHASE4_STEPS` 动态展示将包含的步骤名称。

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/DeliveryConfigModal.tsx
git commit -m "feat(delivery-plan): add delivery config modal for plan generation"
```

---

## Task 9: 步骤编辑 & 新增自定义步骤 Modal

**Files:**
- Create: `src/app/pages/delivery-plan/StepEditModal.tsx`
- Create: `src/app/pages/delivery-plan/CustomStepModal.tsx`

- [ ] **Step 1: 创建步骤编辑 Modal**

`StepEditModal` 允许编辑：assignee, status, startDate, dueDate, deliverables, userNotes。

自定义步骤的 stepName 也可编辑。

使用 Arco `Modal` + `Form`，字段：
- 执行人（Select，从项目成员列表选择）
- 状态（Select: pending/in_progress/completed/skipped）
- 开始日期（DatePicker）
- 截止日期（DatePicker）
- 执行产物（TextArea）
- 用户备注（TextArea）
- 步骤名称（Input，仅 isCustom 时可编辑）

状态变更验证：仅允许 pending→in_progress→completed，completed→in_progress（返工），任意非 completed→skipped。

- [ ] **Step 2: 创建新增自定义步骤 Modal**

`CustomStepModal` 允许新增自定义步骤到指定板块。

必填：stepName, assignee, startDate, dueDate
可选：department, deliverables, userNotes

系统自动填充：stepNo（板块号-C序号），phaseId，projectId，status='pending'，isCustom=true，isEvergreen=false。

- [ ] **Step 3: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 4: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/StepEditModal.tsx src/app/pages/delivery-plan/CustomStepModal.tsx
git commit -m "feat(delivery-plan): add step edit and custom step creation modals"
```

---

## Task 10: 左侧任务列表组件

**Files:**
- Create: `src/app/pages/delivery-plan/TaskList.tsx`

- [ ] **Step 1: 创建任务列表组件**

核心功能：
- 板块行：加粗、背景色、折叠箭头、主管名、步骤进度（如"3/5"）、"添加步骤"图标按钮
- 步骤行：编号 + 名称 + 执行人 + 状态徽标 + 起止日期。自定义步骤名称旁加"自"Tag
- 里程碑行：💎 钻石图标 + 名称 + 日期 + 完成✅/待开始
- 点击步骤行展开内嵌详情（description, notes, tools, deliverables, userNotes）
- 点击步骤行弹出编辑 Modal
- 板块折叠/展开
- 里程碑按日期插入对应板块内

使用 Arco 的 `Collapse`, `Tag`, `Badge`, `Typography`, `Button`, `Space` 组件。

Props:
```ts
interface TaskListProps {
  plan: DeliveryPlan;
  project: Record<string, any>;
  onStepEdit: (step: SopStep) => void;
  onStepStatusChange: (stepId: string, status: SopStepStatus) => void;
  onAddCustomStep: (phaseId: string) => void;
  expandedRowKeys: string[];
  onExpandedRowKeysChange: (keys: string[]) => void;
}
```

左侧固定宽度 480px，可纵向滚动，与右侧甘特图同步 scrollTop。

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/TaskList.tsx
git commit -m "feat(delivery-plan): add task list component with collapsible phases and expandable steps"
```

---

## Task 11: 右侧甘特图组件

**Files:**
- Create: `src/app/pages/delivery-plan/GanttChart.tsx`

这是最复杂的组件，自绘实现。

- [ ] **Step 1: 创建甘特图组件**

核心功能：
- 顶部日期刻度行（sticky）：按日/周/月粒度显示
- 主体区域：每行对应左侧任务列表的行（板块/步骤/里程碑）
- 步骤横条：left 和 width 按日期比例计算，颜色按板块配色
- 贯穿型任务：虚线边框 + 斜线填充图案
- 逾期步骤：红色横条 + 右端警告图标
- 里程碑：钻石符号 💎，绝对定位
- 今日线：红色垂直虚线
- 板块行：汇总横条（浅色背景条，从板块最早到最晚）
- 自适应缩放：顶部 [日] [周] [月] 按钮切换
- 水平可滚动，左侧固定宽度

计算逻辑：
- 时间轴范围：所有步骤最早 startDate ~ 最晚 dueDate，两端各加 7 天
- 每个像素代表的日期数取决于缩放级别和容器宽度
- 横条位置：`left = (stepStart - timelineStart) / totalDays * totalWidth`

使用纯 div + CSS 绝对定位渲染，不依赖第三方图表库。

Props:
```ts
interface GanttChartProps {
  plan: DeliveryPlan;
  zoomLevel: GanttZoomLevel;
  onZoomLevelChange: (level: GanttZoomLevel) => void;
  containerHeight: number;
}
```

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/GanttChart.tsx
git commit -m "feat(delivery-plan): add custom CSS-based gantt chart component"
```

---

## Task 12: 交付计划主页面

**Files:**
- Create: `src/app/pages/delivery-plan/DeliveryPlanPage.tsx`

- [ ] **Step 1: 创建主页面**

组装 TaskList + GanttChart + 顶部栏 + 底部汇总条 + 所有 Modal。

页面结构：
```
┌─────────────────────────────────────────────────────────┐
│ ← 返回   项目名称   状态   [板块筛选▼]  [日|周|月]        │
├──────────────────┬──────────────────────────────────────┤
│ TaskList         │ GanttChart                           │
│ (480px 固定)     │ (flex-1, 可横滚)                      │
│                  │                                      │
├──────────────────┴──────────────────────────────────────┤
│ 步骤 22/35 │ 已完成 62% │ 进行中 4 │ 逾期 1 │ 里程碑 2/3 │ 预计 2026-09-15 │
└─────────────────────────────────────────────────────────┘
```

状态管理：
- `plan: DeliveryPlan | null` — 从 `initialDeliveryPlans[projectId]` 初始化
- `zoomLevel: GanttZoomLevel`
- `phaseFilter: number | null` — 板块筛选
- 各种 Modal 的 visible 状态
- 左右分栏滚动同步：onScroll 联动 scrollTop

逻辑：
1. 从路由获取 `projectId`，查找项目和交付计划
2. 如果无交付计划 → 显示配置面板引导
3. 如果有 → 渲染左右分栏
4. 步骤编辑后更新 plan.steps，同时重新推导对应板块的 status/startDate/dueDate
5. 删除交付计划：二次确认后清空
6. 底部汇总条：从 plan 实时计算

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/DeliveryPlanPage.tsx
git commit -m "feat(delivery-plan): add delivery plan main page with task list + gantt chart layout"
```

---

## Task 13: 交付进度环形图卡片

**Files:**
- Create: `src/app/pages/delivery-plan/DeliveryProgressCard.tsx`

- [ ] **Step 1: 创建环形进度图组件**

使用 Recharts 的 `PieChart` + `Pie` 组件，7 段按板块配色，未完成部分灰色。

Props:
```ts
interface DeliveryProgressCardProps {
  projectId: string;
  onClick: () => void;
}
```

内部逻辑：
1. 从 `initialDeliveryPlans[projectId]` 获取 plan
2. 无 plan → 显示灰色空圆环 + "点击生成交付计划"
3. 有 plan → 计算各板块完成率，渲染 7 段环形图，中间显示整体完成百分比

使用 Recharts:
```tsx
<PieChart width={120} height={120}>
  <Pie
    data={pieData}
    dataKey="value"
    innerRadius={36}
    outerRadius={52}
    startAngle={90}
    endAngle={-270}
    stroke="none"
  />
</PieChart>
```

- [ ] **Step 2: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 3: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/delivery-plan/DeliveryProgressCard.tsx
git commit -m "feat(delivery-plan): add delivery progress ring chart card component"
```

---

## Task 14: 项目详情页集成 + 路由

**Files:**
- Modify: `src/app/pages/ProjectDetail.tsx`
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: 在 ProjectDetail 统计卡片区添加交付进度卡片**

在 `ProjectDetail.tsx` 的 `Grid.Row` 统计卡片区（4 张 Card），改为 5 张或 2 行布局。

在第 4 张卡片后添加 `DeliveryProgressCard`：

```tsx
<Grid.Col span={6}>
  <DeliveryProgressCard projectId={project.id} onClick={() => navigate(`/projects/${project.id}/delivery`)} />
</Grid.Col>
```

需要 import:
```ts
import { DeliveryProgressCard } from './delivery-plan/DeliveryProgressCard';
```

- [ ] **Step 2: 在基础信息 Tab 添加"关联合同"功能**

在 Descriptions data 数组后面，添加一个合同关联区域：

- 如果 `project.contractId` 存在：显示"关联合同: [合同编号]"，带"更换"和"解除"按钮
- 如果不存在：显示"关联合同: 未关联"，带"选择合同"按钮
- 已有交付计划时：更换和解除按钮 disabled，tooltip 提示"请先删除交付计划"

使用 Arco 的 `Modal` + `Select` 实现合同选择器。

- [ ] **Step 3: 添加路由**

在 `routes.tsx` 中添加：

```ts
import { DeliveryPlanPage } from './pages/delivery-plan/DeliveryPlanPage';
```

在 children 数组中，`projects/:id` 路由后面添加：

```ts
{ path: "projects/:id/delivery", Component: DeliveryPlanPage },
```

- [ ] **Step 4: 验证构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1 | tail -5`

- [ ] **Step 5: 提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/ProjectDetail.tsx src/app/routes.tsx
git commit -m "feat(delivery-plan): integrate delivery progress card, contract association, and route"
```

---

## Task 15: 端到端验证

**Files:** 无新增

- [ ] **Step 1: 运行完整构建**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run build 2>&1`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 2: 运行测试**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm test 2>&1 | tail -20`
Expected: 所有测试通过（包括新增的 utils.test.ts 和原有 reminders 测试）

- [ ] **Step 3: 启动开发服务器手动验证**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run dev`

手动验证清单：
1. 项目列表页 → 点击"A公司CRM系统开发"进入详情页
2. 详情页统计卡片区应显示"交付进度"环形图卡片
3. 点击环形图卡片 → 跳转到交付计划页面
4. 交付计划页面：左侧任务列表 + 右侧甘特图
5. 板块可折叠/展开，步骤可展开详情
6. 点击步骤 → 弹出编辑 Modal
7. 点击板块的"添加步骤"→ 弹出自定义步骤 Modal
8. 切换日/周/月缩放 → 甘特图粒度变化
9. 底部汇总条显示正确数据
10. 内部项目（项目3）点击交付进度卡片 → 配置面板中板块一不可勾选

- [ ] **Step 4: 最终提交**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add -A
git commit -m "feat(delivery-plan): complete delivery plan module with SOP generation, gantt chart, and progress tracking"
```
