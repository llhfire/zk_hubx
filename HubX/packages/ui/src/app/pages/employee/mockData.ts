// ============================================================
// HubX 员工管理 — 统一数据模型 & 初始数据
// ============================================================

// ---------- 基础枚举 ----------

export type Position = string;

export type JobLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';
export type EmploymentStatus = '在职' | '试用期' | '已转正' | '已离职' | '休假中';
export type LeaveType = '年假' | '事假' | '病假' | '调休' | '婚假' | '产假' | '丧假' | '加班';
export type AttendanceStatus = '已批准' | '待审批' | '已拒绝' | '已撤销';
export type ReviewPeriod = '月度' | '季度';
export type PerformanceRank = 'S' | 'A' | 'B' | 'C' | 'D';
export type AbilityDimension = 'tech' | 'biz' | 'mgmt' | 'tool' | 'domain';
export type SkillStatus = 'unlocked' | 'locked' | 'learning';
export type SkillMastery = 'beginner' | 'proficient' | 'expert';
export type ExperienceSource = 'daily_report' | 'project_settlement' | 'manager_eval';

// ---------- 能力数值模型 ----------

export interface AbilityScores {
  tech: number;
  biz: number;
  mgmt: number;
  tool: number;
  domain: number;
}

export interface SkillEntry {
  id: string;
  status: SkillStatus;
  mastery: SkillMastery;
  currentXP: number;
  maxXP: number;
}

export interface ExperienceEntry {
  id: string;
  date: string;
  source: ExperienceSource;
  description: string;
  gains: Partial<AbilityScores>;
}

export interface Capability {
  scores: AbilityScores;
  weightedScore: number;
  totalXP: number;
  skills: SkillEntry[];
  experience: ExperienceEntry[];
  promotionEligible: boolean;
}

// ---------- 性格与心理模型评测 ----------

export type MBTIType = 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP' | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP' |
                       'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ' | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export interface MBTIPersonality {
  type: MBTIType;
  /** 四个维度得分：正 = 前者，负 = 后者 */
  EI: number;   // E(+) vs I(-)
  SN: number;   // S(+) vs N(-)
  TF: number;   // T(+) vs F(-)
  JP: number;   // J(+) vs P(-)
  testDate: string;
  description: string;
}

export interface BigFiveProfile {
  openness: number;          // 开放性 0-100
  conscientiousness: number; // 尽责性
  extraversion: number;      // 外向性
  agreeableness: number;     // 宜人性
  neuroticism: number;       // 情绪稳定性（反向）
  testDate: string;
}

export interface DISCProfile {
  dominance: number;      // D 指挥型
  influence: number;      // I 影响型
  steadiness: number;     // S 稳健型
  compliance: number;     // C 服从型
  testDate: string;
  primaryStyle: 'D' | 'I' | 'S' | 'C';
}

export interface EnneagramProfile {
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  wing?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  testDate: string;
}

export interface PersonalityAssessment {
  mbti?: MBTIPersonality;
  bigFive?: BigFiveProfile;
  disc?: DISCProfile;
  enneagram?: EnneagramProfile;
}

/** MBTI 类型描述表 */
export const MBTI_DESCRIPTIONS: Record<MBTIType, { nickname: string; summary: string }> = {
  INTJ: { nickname: '建筑师', summary: '富有想象力和战略性的思想家，一切皆在计划之中。' },
  INTP: { nickname: '逻辑学家', summary: '具有创造力的发明家，对知识有着止不住的渴望。' },
  ENTJ: { nickname: '指挥官', summary: '大胆、富有想象力且意志强大的领导者。' },
  ENTP: { nickname: '辩论家', summary: '聪明好奇的思想者，不会放过任何智力挑战。' },
  INFJ: { nickname: '提倡者', summary: '安静而神秘，同时鼓舞人心且不知疲倦的理想主义者。' },
  INFP: { nickname: '调停者', summary: '诗意、善良的利他主义者，总是热情地为正义事业提供帮助。' },
  ENFJ: { nickname: '主人公', summary: '富有魅力、鼓舞人心的领导者，能够吸引听众。' },
  ENFP: { nickname: '竞选者', summary: '热情、有创造力、社交能力强的自由精神。' },
  ISTJ: { nickname: '物流师', summary: '实际且注重事实的个人，可靠性不容怀疑。' },
  ISFJ: { nickname: '守护者', summary: '非常专注且热情的保护者，时刻准备着保护所爱的人。' },
  ESTJ: { nickname: '总经理', summary: '出色的管理者，在管理事务或人员方面无与伦比。' },
  ESFJ: { nickname: '执政官', summary: '非常关心他人的人，总是热情地帮助他人。' },
  ISTP: { nickname: '鉴赏家', summary: '大胆而实际的实验家，擅长使用各种工具。' },
  ISFP: { nickname: '探险家', summary: '灵活、有魅力的艺术家，时刻准备着探索新体验。' },
  ESTP: { nickname: '企业家', summary: '聪明、充满活力、善于感知的人，真正享受生活在边缘。' },
  ESFP: { nickname: '表演者', summary: '自发的、精力充沛的表演者，生活在他们周围永远不会无聊。' },
};

export const ENNEAGRAM_DESCRIPTIONS: Record<number, { name: string; summary: string }> = {
  1: { name: '完美主义者', summary: '勤奋、有条理、追求高标准，注重改进。' },
  2: { name: '给予者', summary: '慷慨、乐于助人、占有欲强，渴望被爱。' },
  3: { name: '成就者', summary: '成功导向、适应性强、出色、驱动型。' },
  4: { name: '个人主义者', summary: '敏感、内向、表达力强、戏剧化。' },
  5: { name: '调查者', summary: '警觉、好奇、独立、专注发现。' },
  6: { name: '忠诚者', summary: '负责任、焦虑、多疑、忠诚可靠。' },
  7: { name: '热情者', summary: '忙碌、乐观、自发、追求多样性。' },
  8: { name: '挑战者', summary: '自信、果断、意志坚强、对抗性。' },
  9: { name: '和平者', summary: '随和、自我满足、接受性强、安抚人心。' },
};

// ---------- 初始性格评测数据 ----------

export const initialPersonalityData: Record<string, PersonalityAssessment> = {
  '1': { // 张三 - 项目经理
    mbti: { type: 'ENTJ', EI: 62, SN: -30, TF: 45, JP: 70, testDate: '2026-06-15', description: '天生的领导者，善于制定战略和协调资源。' },
    bigFive: { openness: 72, conscientiousness: 85, extraversion: 68, agreeableness: 60, neuroticism: 25, testDate: '2026-06-15' },
    disc: { dominance: 82, influence: 65, steadiness: 45, compliance: 70, testDate: '2026-06-15', primaryStyle: 'D' },
    enneagram: { type: 8, wing: 7, testDate: '2026-06-15' },
  },
  '2': { // 李四 - 后端
    mbti: { type: 'INTJ', EI: -55, SN: -70, TF: 60, JP: 50, testDate: '2026-05-20', description: '独立思考的技术专家，追求系统架构的完美。' },
    bigFive: { openness: 80, conscientiousness: 78, extraversion: 25, agreeableness: 55, neuroticism: 20, testDate: '2026-05-20' },
    disc: { dominance: 55, influence: 30, steadiness: 70, compliance: 80, testDate: '2026-05-20', primaryStyle: 'C' },
    enneagram: { type: 5, wing: 6, testDate: '2026-05-20' },
  },
  '5': { // 钱七 - 销售
    mbti: { type: 'ENFJ', EI: 75, SN: -20, TF: -40, JP: 45, testDate: '2026-04-10', description: '善于激励他人的销售领袖，富有感染力。' },
    bigFive: { openness: 65, conscientiousness: 70, extraversion: 85, agreeableness: 75, neuroticism: 30, testDate: '2026-04-10' },
    disc: { dominance: 70, influence: 85, steadiness: 40, compliance: 45, testDate: '2026-04-10', primaryStyle: 'I' },
    enneagram: { type: 3, wing: 2, testDate: '2026-04-10' },
  },
  '15': { // 徐强 - 高级项目经理
    mbti: { type: 'ESTJ', EI: 50, SN: 45, TF: 55, JP: 80, testDate: '2025-12-01', description: '擅长规划、执行、管控的管理型人才。' },
    bigFive: { openness: 55, conscientiousness: 92, extraversion: 60, agreeableness: 65, neuroticism: 15, testDate: '2025-12-01' },
    disc: { dominance: 75, influence: 55, steadiness: 60, compliance: 85, testDate: '2025-12-01', primaryStyle: 'D' },
    enneagram: { type: 1, wing: 9, testDate: '2025-12-01' },
  },
  '14': { // 黄丽 - 高级前端
    mbti: { type: 'INFP', EI: -60, SN: -55, TF: -50, JP: -30, testDate: '2026-03-22', description: '富有创造力的设计师兼工程师，追求意义感。' },
    bigFive: { openness: 88, conscientiousness: 70, extraversion: 30, agreeableness: 72, neuroticism: 45, testDate: '2026-03-22' },
    disc: { dominance: 35, influence: 40, steadiness: 75, compliance: 65, testDate: '2026-03-22', primaryStyle: 'S' },
    enneagram: { type: 4, wing: 5, testDate: '2026-03-22' },
  },
};

// ---------- 核心员工实体 ----------

export interface Employee {
  id: string;
  name: string;
  jobNumber: string;
  department: string;
  position: Position;
  level: JobLevel;
  employmentStatus: EmploymentStatus;
  phone: string;
  email: string;
  hireDate: string;
  转正Date: string;
  contractEndDate: string;
  standardHourlyRate: number;
  probationSalary?: number;
  regularSalary?: number;
  socialSecurity?: number;
  housingFund?: number;
  salaryAdjustment?: number;
  salaryEffectiveDate?: string;
  sharedOverheadCost?: number;
  monthlyWorkdays?: number;
  idCard?: string;
  bankAccount?: string;
  emergencyContact?: string;
  resumeAttachment?: string;
  education?: string;
  school?: string;
  previousExperience?: string;
  capability?: Capability;
  personality?: PersonalityAssessment;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: AttendanceStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  period: ReviewPeriod;
  periodLabel: string;
  kpiScore: number;
  behaviorScore: number;
  totalScore: number;
  rank: PerformanceRank;
  evaluator: string;
  comment: string;
  createdAt: string;
}

export interface LevelRateConfig {
  level: string;
  position: string;
  minRate: number;
  standardRate: number;
  maxRate: number;
  description: string;
}

// ---------- 参考数据 ----------

export const ALL_POSITIONS: Position[] = [
  '销售', '前端开发', '后端开发', '全栈开发', 'UI设计师',
  '产品经理', '项目经理', '人事', '财务', '行政',
];

export const ALL_JOB_LEVELS: JobLevel[] = [
  'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10',
];
export const ALL_EMPLOYMENT_STATUSES: EmploymentStatus[] = ['在职', '试用期', '已转正', '已离职', '休假中'];
export const ALL_LEAVE_TYPES: LeaveType[] = ['年假', '事假', '病假', '调休', '婚假', '产假', '丧假', '加班'];
export const DEPARTMENTS = ['总公司', '技术部', '前端组', '后端组', '销售部', '华东区', '华北区', '行政部', '人事部', '财务部'];

// ---------- 职位权重表 ----------

export interface PositionWeight {
  position: Position;
  weights: AbilityScores;
}

export const DEFAULT_POSITION_WEIGHTS: PositionWeight[] = [
  { position: '前端开发', weights: { tech: 0.40, biz: 0.15, mgmt: 0.10, tool: 0.25, domain: 0.10 } },
  { position: '后端开发', weights: { tech: 0.45, biz: 0.10, mgmt: 0.10, tool: 0.20, domain: 0.15 } },
  { position: '全栈开发', weights: { tech: 0.40, biz: 0.15, mgmt: 0.10, tool: 0.20, domain: 0.15 } },
  { position: 'UI设计师', weights: { tech: 0.20, biz: 0.15, mgmt: 0.05, tool: 0.45, domain: 0.15 } },
  { position: '产品经理', weights: { tech: 0.10, biz: 0.35, mgmt: 0.20, tool: 0.15, domain: 0.20 } },
  { position: '项目经理', weights: { tech: 0.15, biz: 0.30, mgmt: 0.35, tool: 0.10, domain: 0.10 } },
  { position: '销售',     weights: { tech: 0.05, biz: 0.40, mgmt: 0.15, tool: 0.10, domain: 0.30 } },
  { position: '人事',     weights: { tech: 0.05, biz: 0.30, mgmt: 0.25, tool: 0.15, domain: 0.25 } },
  { position: '财务',     weights: { tech: 0.10, biz: 0.30, mgmt: 0.15, tool: 0.15, domain: 0.30 } },
  { position: '行政',     weights: { tech: 0.05, biz: 0.25, mgmt: 0.25, tool: 0.20, domain: 0.25 } },
];

// ---------- 晋级门槛 ----------

export interface PromotionThreshold {
  fromLevel: JobLevel;
  toLevel: JobLevel;
  minWeightedScore: number;
  description: string;
}

export const DEFAULT_THRESHOLDS: PromotionThreshold[] = [
  { fromLevel: 'L1', toLevel: 'L2', minWeightedScore: 10,  description: 'L1→L2 入门' },
  { fromLevel: 'L2', toLevel: 'L3', minWeightedScore: 25,  description: 'L2→L3 初级晋升' },
  { fromLevel: 'L3', toLevel: 'L4', minWeightedScore: 35,  description: 'L3→L4 中级' },
  { fromLevel: 'L4', toLevel: 'L5', minWeightedScore: 50,  description: 'L4→L5 高级' },
  { fromLevel: 'L5', toLevel: 'L6', minWeightedScore: 58,  description: 'L5→L6 资深' },
  { fromLevel: 'L6', toLevel: 'L7', minWeightedScore: 65,  description: 'L6→L7 专家' },
  { fromLevel: 'L7', toLevel: 'L8', minWeightedScore: 72,  description: 'L7→L8 高级专家' },
  { fromLevel: 'L8', toLevel: 'L9', minWeightedScore: 80,  description: 'L8→L9 架构师' },
  { fromLevel: 'L9', toLevel: 'L10', minWeightedScore: 90, description: 'L9→L10 总监' },
];

// ---------- 全局技能树定义 ----------

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  domain: AbilityDimension;
  layer: 1 | 2 | 3;
  prerequisites: string[];
  requiredScore?: number;
}

export const ABILITY_DIMENSION_LABELS: Record<AbilityDimension, string> = {
  tech: '技术能力', biz: '业务能力', mgmt: '管理能力', tool: '工具熟练', domain: '领域知识',
};

export const ABILITY_DIMENSION_COLORS: Record<AbilityDimension, string> = {
  tech: 'var(--primary)', biz: 'var(--success-500)', mgmt: 'var(--warning-500)', tool: '#7c3aed', domain: '#eb2f96',
};

export const skillTreeDefinitions: SkillNode[] = [
  // tech
  { id: 'js-basic',      name: 'JavaScript 基础',   description: '基本语法、数据类型、控制流', domain: 'tech', layer: 1, prerequisites: [], requiredScore: 15 },
  { id: 'react-core',    name: 'React 核心',        description: 'JSX、Hooks、组件生命周期', domain: 'tech', layer: 2, prerequisites: ['js-basic'], requiredScore: 35 },
  { id: 'react-perf',    name: 'React 性能优化',     description: '渲染优化、Memo、代码分割',  domain: 'tech', layer: 3, prerequisites: ['react-core'], requiredScore: 60 },
  { id: 'ts-advanced',   name: 'TypeScript 高级',   description: '泛型、类型体操、条件类型',   domain: 'tech', layer: 3, prerequisites: ['js-basic'], requiredScore: 55 },
  { id: 'java-core',     name: 'Java 核心',         description: 'JVM、集合框架、并发编程',   domain: 'tech', layer: 1, prerequisites: [], requiredScore: 15 },
  { id: 'spring-boot',   name: 'Spring Boot',       description: 'IoC、AOP、REST、ORM',      domain: 'tech', layer: 2, prerequisites: ['java-core'], requiredScore: 40 },
  { id: 'microservices', name: '微服务架构',          description: '服务拆分、注册发现、网关',   domain: 'tech', layer: 3, prerequisites: ['spring-boot'], requiredScore: 65 },
  { id: 'system-design', name: '系统设计',           description: '高可用、高并发、分布式',     domain: 'tech', layer: 3, prerequisites: ['microservices'], requiredScore: 75 },
  { id: 'code-review',   name: 'Code Review',       description: '审查流程、质量标准、缺陷识别', domain:'tech', layer: 2, prerequisites: ['js-basic'], requiredScore: 30 },
  // biz
  { id: 'requirements',     name: '需求分析',       description: '业务场景→结构化需求',      domain: 'biz', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'client-comm',      name: '客户沟通',       description: '结构化沟通、需求确认',      domain: 'biz', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'solution-design',  name: '方案设计',       description: '业务流程设计、功能架构',   domain: 'biz', layer: 2, prerequisites: ['requirements'], requiredScore: 35 },
  { id: 'project-planning', name: '项目规划',       description: '里程碑拆解、资源估算',      domain: 'biz', layer: 2, prerequisites: ['requirements', 'client-comm'], requiredScore: 40 },
  // mgmt
  { id: 'task-mgmt',  name: '任务管理',  description: '拆分、优先级、进度跟踪',  domain: 'mgmt', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'team-coord', name: '团队协调',  description: '跨团队沟通、冲突处理',      domain: 'mgmt', layer: 2, prerequisites: ['task-mgmt'], requiredScore: 35 },
  { id: 'perf-review', name: '绩效面谈',  description: '目标设定、评语撰写',         domain: 'mgmt', layer: 2, prerequisites: ['team-coord'], requiredScore: 50 },
  { id: 'coaching',    name: '辅导带教',  description: '新人带教、能力提升',         domain: 'mgmt', layer: 3, prerequisites: ['perf-review'], requiredScore: 65 },
  // tool
  { id: 'git-advanced', name: 'Git 高级',     description: '分支策略、Cherry-pick、Hooks', domain:'tool', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'ci-cd',        name: 'CI/CD',        description: '自动化构建、流水线设计',       domain:'tool', layer: 2, prerequisites: ['git-advanced'], requiredScore: 35 },
  { id: 'figma',        name: 'Figma 设计',   description: '组件设计、自动布局、原型交互',  domain:'tool', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'jira',         name: 'JIRA 管理',    description: '看板配置、工作流、自动化规则',  domain:'tool', layer: 2, prerequisites: [], requiredScore: 25 },
  { id: 'docker',       name: 'Docker 容器化', description: '镜像构建、Compose、网络配置',  domain:'tool', layer: 2, prerequisites: ['git-advanced'], requiredScore: 40 },
  { id: 'monitoring',   name: '监控告警',      description: 'Prometheus、Grafana、告警规则', domain:'tool', layer: 3, prerequisites: ['ci-cd', 'docker'], requiredScore: 60 },
  // domain
  { id: 'ecommerce',      name: '电商领域',        description: '商品管理、交易流程、支付、物流', domain:'domain', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'ad-platform',    name: '投放平台',        description: '百度/抖音/小红书/淘宝推广运营',  domain:'domain', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'finance-basic',  name: '财务基础',        description: '会计准则、税务基础、财务报表',  domain:'domain', layer: 1, prerequisites: [], requiredScore: 10 },
  { id: 'hr-lifecycle',   name: '人力资源全生命周期', description:'招聘、入离职、考勤、绩效、薪酬', domain:'domain', layer: 2, prerequisites: [], requiredScore: 30 },
  { id: 'contract-mgmt',  name: '合同管理',        description: '回款节点、付款流程、法务条款',  domain:'domain', layer: 2, prerequisites: ['finance-basic'], requiredScore: 40 },
];

// ---------- 纯函数工具 ----------

/** 计算 KPI+行为得分与评级 */
export function calcPerformance(kpiScore: number, behaviorScore: number): { totalScore: number; rank: PerformanceRank } {
  const totalScore = Math.round(kpiScore * 0.7 + behaviorScore * 0.3);
  let rank: PerformanceRank;
  if (totalScore >= 90) rank = 'S';
  else if (totalScore >= 80) rank = 'A';
  else if (totalScore >= 70) rank = 'B';
  else if (totalScore >= 60) rank = 'C';
  else rank = 'D';
  return { totalScore, rank };
}

export function calcWeightedScore(scores: AbilityScores, position: Position): number {
  const wConfig = DEFAULT_POSITION_WEIGHTS.find(w => w.position === position);
  if (!wConfig) return Math.round((scores.tech + scores.biz + scores.mgmt + scores.tool + scores.domain) / 5);
  const w = wConfig.weights;
  return Math.round(scores.tech * w.tech + scores.biz * w.biz + scores.mgmt * w.mgmt + scores.tool * w.tool + scores.domain * w.domain);
}

export function checkPromotionEligibility(weightedScore: number, currentLevel: JobLevel): boolean {
  const t = DEFAULT_THRESHOLDS.find(x => x.fromLevel === currentLevel);
  return t ? weightedScore >= t.minWeightedScore : false;
}

export function calcPromotionProgress(weightedScore: number, currentLevel: JobLevel): number {
  const t = DEFAULT_THRESHOLDS.find(x => x.fromLevel === currentLevel);
  return t ? Math.min(100, Math.round((weightedScore / t.minWeightedScore) * 100)) : 100;
}

export function calcWorkDays(hireDateStr: string): number {
  if (!hireDateStr) return 0;
  const hire = new Date(hireDateStr);
  const now = new Date();
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatCurrency(n: number | undefined | null): string {
  if (n === undefined || n === null) return '¥0';
  const rounded = Math.round(n * 100) / 100;
  return `¥${rounded.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function getLevelColor(level: JobLevel): string {
  const l = parseInt(level.replace('L', ''), 10);
  return l >= 9 ? 'var(--chart-5)' : l >= 7 ? 'var(--primary)' : l >= 5 ? 'var(--success-500)' : l >= 3 ? 'var(--warning-500)' : 'var(--muted-foreground)';
}

export function getStatusColor(s: EmploymentStatus): string {
  return { '已转正': 'var(--success-500)', '在职': 'var(--primary)', '试用期': 'var(--warning-500)', '休假中': 'var(--info-500)', '已离职': 'var(--muted-foreground)' }[s] || 'var(--muted-foreground)';
}

export function getRankColor(r: PerformanceRank): string {
  return { 'S': 'var(--chart-5)', 'A': 'var(--success-500)', 'B': 'var(--primary)', 'C': 'var(--warning-500)', 'D': 'var(--destructive-500)' }[r] || 'var(--muted-foreground)';
}

/** 根据技能树全局定义 + 员工能力值推导技能状态 */
function deriveSkills(scores: AbilityScores): SkillEntry[] {
  const masteryMap: Record<string, SkillMastery> = {};
  return skillTreeDefinitions.map(node => {
    const dimScore = scores[node.domain];
    const prereqsMet = node.prerequisites.every(p => masteryMap[p] && masteryMap[p] !== 'beginner');
    const scoreMet = node.requiredScore ? dimScore >= node.requiredScore : false;
    const unlocked = prereqsMet && scoreMet;
    let mastery: SkillMastery = 'beginner';
    if (unlocked && node.requiredScore) {
      const ratio = dimScore / node.requiredScore;
      mastery = ratio >= 1.5 ? 'expert' : ratio >= 1.2 ? 'proficient' : 'beginner';
    }
    masteryMap[node.id] = mastery;
    return {
      id: node.id,
      status: unlocked ? 'unlocked' : 'locked',
      mastery,
      currentXP: unlocked ? Math.round(dimScore * (node.layer || 1)) : 0,
      maxXP: (node.requiredScore || 20) * 5,
    };
  });
}

/** 根据分数+职位生成 Capability */
function makeCapability(scores: AbilityScores, position: Position, level: JobLevel): Capability {
  const weightedScore = calcWeightedScore(scores, position);
  const skills = deriveSkills(scores);
  const totalXP = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) * 2.5);
  return { scores, weightedScore, totalXP, skills, experience: [], promotionEligible: checkPromotionEligibility(weightedScore, level) };
}

// ---------- 初始员工数据 ----------

const employeeBaseData: Omit<Employee, 'capability'>[] = [
  { id: '1',  name: '张三',   jobNumber: 'EMP001', department: '总公司',   position: '项目经理', level: 'L8', employmentStatus: '已转正', phone: '13800138001', email: 'zhangsan@company.com',   hireDate: '2020-01-01', 转正Date: '2020-04-01', contractEndDate: '2027-01-01', standardHourlyRate: 180, idCard: '310***********1234', bankAccount: '622************5678', emergencyContact: '配偶 / 13900001111', education: '本科', school: '上海交通大学',   previousExperience: '5年项目管理经验' },
  { id: '2',  name: '李四',   jobNumber: 'EMP002', department: '技术部',   position: '后端开发', level: 'L7', employmentStatus: '已转正', phone: '13800138002', email: 'lisi@company.com',     hireDate: '2020-03-15', 转正Date: '2020-06-15', contractEndDate: '2027-03-15', standardHourlyRate: 150, idCard: '310***********2345', bankAccount: '622************6789', emergencyContact: '父母 / 13900002222', education: '硕士', school: '复旦大学',       previousExperience: '3年 Java 开发经验' },
  { id: '3',  name: '王五',   jobNumber: 'EMP003', department: '前端组',   position: '前端开发', level: 'L6', employmentStatus: '已转正', phone: '13800138003', email: 'wangwu@company.com',   hireDate: '2020-06-01', 转正Date: '2020-09-01', contractEndDate: '2027-06-01', standardHourlyRate: 120, idCard: '310***********3456', bankAccount: '622************7890', emergencyContact: '配偶 / 13900003333', education: '本科', school: '同济大学',       previousExperience: '2年前端开发经验' },
  { id: '4',  name: '赵六',   jobNumber: 'EMP004', department: '后端组',   position: '后端开发', level: 'L5', employmentStatus: '已转正', phone: '13800138004', email: 'zhaoliu@company.com',  hireDate: '2020-08-20', 转正Date: '2020-11-20', contractEndDate: '2027-08-20', standardHourlyRate: 100, idCard: '310***********4567', bankAccount: '622************8901', emergencyContact: '父母 / 13900004444', education: '本科', school: '华东理工大学',   previousExperience: '1年 Python 开发经验' },
  { id: '5',  name: '钱七',   jobNumber: 'EMP005', department: '销售部',   position: '销售',     level: 'L7', employmentStatus: '已转正', phone: '13800138005', email: 'qianqi@company.com',    hireDate: '2021-01-10', 转正Date: '2021-04-10', contractEndDate: '2027-01-10', standardHourlyRate: 140, idCard: '310***********5678', bankAccount: '622************9012', emergencyContact: '配偶 / 13900005555', education: '大专', school: '上海财经大学',   previousExperience: '4年软件销售经验' },
  { id: '6',  name: '孙八',   jobNumber: 'EMP006', department: '华东区',   position: '销售',     level: 'L5', employmentStatus: '试用期', phone: '13800138006', email: 'sunba@company.com',     hireDate: '2026-05-15', 转正Date: '',             contractEndDate: '2029-05-15', standardHourlyRate: 80,  idCard: '310***********6789', bankAccount: '622************0123', emergencyContact: '父母 / 13900006666', education: '本科', school: '南京大学',       previousExperience: '应届生' },
  { id: '7',  name: '周九',   jobNumber: 'EMP007', department: '华北区',   position: '销售',     level: 'L6', employmentStatus: '已转正', phone: '13800138007', email: 'zhoujiu@company.com',   hireDate: '2022-02-01', 转正Date: '2022-05-01', contractEndDate: '2028-02-01', standardHourlyRate: 110, idCard: '310***********7890', bankAccount: '622************1234', emergencyContact: '配偶 / 13900007777', education: '本科', school: '浙江大学',       previousExperience: '3年销售经验' },
  { id: '8',  name: '吴十',   jobNumber: 'EMP008', department: '行政部',   position: '行政',     level: 'L3', employmentStatus: '已转正', phone: '13800138008', email: 'wushi@company.com',     hireDate: '2021-06-15', 转正Date: '2021-09-15', contractEndDate: '2027-06-15', standardHourlyRate: 60,  idCard: '310***********8901', bankAccount: '622************2345', emergencyContact: '配偶 / 13900008888', education: '本科', school: '华东师范大学',   previousExperience: '2年行政经验' },
  { id: '9',  name: '陈明',   jobNumber: 'EMP009', department: '技术部',   position: 'UI设计师', level: 'L5', employmentStatus: '已转正', phone: '13800138009', email: 'chenming@company.com',  hireDate: '2022-09-01', 转正Date: '2022-12-01', contractEndDate: '2028-09-01', standardHourlyRate: 90,  idCard: '310***********9012', bankAccount: '622************3456', emergencyContact: '父母 / 13900009999', education: '本科', school: '东华大学',       previousExperience: '1年 UI 设计经验' },
  { id: '10', name: '林小红', jobNumber: 'EMP010', department: '产品部',   position: '产品经理', level: 'L7', employmentStatus: '已转正', phone: '13800138010', email: 'linxh@company.com',     hireDate: '2023-03-01', 转正Date: '2023-06-01', contractEndDate: '2029-03-01', standardHourlyRate: 140, idCard: '310***********0123', bankAccount: '622************4567', emergencyContact: '配偶 / 13900010000', education: '硕士', school: '同济大学',       previousExperience: '3年产品经验' },
  { id: '11', name: '张伟',   jobNumber: 'EMP011', department: '人事部',   position: '人事',     level: 'L4', employmentStatus: '在职',   phone: '13800138011', email: 'zhangwei@company.com',  hireDate: '2025-11-01', 转正Date: '',             contractEndDate: '2028-11-01', standardHourlyRate: 70,  idCard: '310***********1111', bankAccount: '622************5678', emergencyContact: '父母 / 13900011000', education: '本科', school: '上海大学',       previousExperience: '1年人事经验' },
  { id: '12', name: '赵玲',   jobNumber: 'EMP012', department: '财务部',   position: '财务',     level: 'L5', employmentStatus: '已转正', phone: '13800138012', email: 'zhaoling@company.com',  hireDate: '2021-10-01', 转正Date: '2022-01-01', contractEndDate: '2027-10-01', standardHourlyRate: 95,  idCard: '310***********2222', bankAccount: '622************6789', emergencyContact: '配偶 / 13900012000', education: '本科', school: '上海财经大学',   previousExperience: '3年财务经验' },
  { id: '13', name: '刘洋',   jobNumber: 'EMP013', department: '后端组',   position: '后端开发', level: 'L4', employmentStatus: '试用期', phone: '13800138013', email: 'liuyang@company.com',   hireDate: '2026-06-15', 转正Date: '',             contractEndDate: '2029-06-15', standardHourlyRate: 70,  idCard: '310***********3333', bankAccount: '622************7890', emergencyContact: '父母 / 13900013000', education: '本科', school: '华东师范大学',   previousExperience: '应届生' },
  { id: '14', name: '黄丽',   jobNumber: 'EMP014', department: '前端组',   position: '前端开发', level: 'L8', employmentStatus: '已转正', phone: '13800138014', email: 'huangli@company.com',   hireDate: '2021-04-01', 转正Date: '2021-07-01', contractEndDate: '2027-04-01', standardHourlyRate: 160, idCard: '310***********4444', bankAccount: '622************8901', emergencyContact: '配偶 / 13900014000', education: '硕士', school: '上海交通大学',   previousExperience: '4年前端经验' },
  { id: '15', name: '徐强',   jobNumber: 'EMP015', department: '技术部',   position: '项目经理', level: 'L9', employmentStatus: '已转正', phone: '13800138015', email: 'xuqiang@company.com',   hireDate: '2019-03-01', 转正Date: '2019-06-01', contractEndDate: '2027-03-01', standardHourlyRate: 220, idCard: '310***********5555', bankAccount: '622************9012', emergencyContact: '配偶 / 13900015000', education: '硕士', school: '复旦大学',       previousExperience: '6年技术管理' },
  { id: '16', name: '杨帆',   jobNumber: 'EMP016', department: '销售部',   position: '销售',     level: 'L6', employmentStatus: '休假中', phone: '13800138016', email: 'yangfan@company.com',   hireDate: '2022-07-01', 转正Date: '2022-10-01', contractEndDate: '2028-07-01', standardHourlyRate: 100, idCard: '310***********6666', bankAccount: '622************0123', emergencyContact: '配偶 / 13900016000', education: '本科', school: '华东理工大学',   previousExperience: '2年销售' },
];

const abilitySeedMap: Record<string, AbilityScores> = {
  '1':  { tech: 72, biz: 80, mgmt: 88, tool: 65, domain: 75 },
  '2':  { tech: 85, biz: 60, mgmt: 70, tool: 80, domain: 65 },
  '3':  { tech: 78, biz: 55, mgmt: 60, tool: 82, domain: 50 },
  '4':  { tech: 65, biz: 48, mgmt: 50, tool: 70, domain: 45 },
  '5':  { tech: 30, biz: 82, mgmt: 65, tool: 40, domain: 78 },
  '6':  { tech: 25, biz: 35, mgmt: 28, tool: 32, domain: 30 },
  '7':  { tech: 35, biz: 75, mgmt: 60, tool: 45, domain: 70 },
  '8':  { tech: 40, biz: 65, mgmt: 70, tool: 50, domain: 60 },
  '9':  { tech: 55, biz: 60, mgmt: 45, tool: 80, domain: 52 },
  '10': { tech: 50, biz: 78, mgmt: 70, tool: 60, domain: 75 },
  '11': { tech: 30, biz: 60, mgmt: 55, tool: 45, domain: 55 },
  '12': { tech: 35, biz: 72, mgmt: 55, tool: 55, domain: 75 },
  '13': { tech: 28, biz: 25, mgmt: 22, tool: 30, domain: 20 },
  '14': { tech: 88, biz: 65, mgmt: 68, tool: 90, domain: 60 },
  '15': { tech: 80, biz: 82, mgmt: 90, tool: 75, domain: 78 },
  '16': { tech: 32, biz: 68, mgmt: 55, tool: 42, domain: 60 },
};

function getFutureSalaryEffectiveDate(employeeId: string) {
  const date = new Date();
  date.setDate(date.getDate() + Number(employeeId) % 20 + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const initialEmployees: Employee[] = employeeBaseData.map(emp => {
  const scores = abilitySeedMap[emp.id] || { tech: 50, biz: 50, mgmt: 50, tool: 50, domain: 50 };
  const regularSalary = emp.standardHourlyRate * 160;
  const salaryAdjustment = Number(emp.id) % 7 === 0 ? -1000 : Number(emp.id) % 3 === 0 ? 1000 : Number(emp.id) % 5 === 0 ? 2000 : 0;
  return {
    ...emp,
    probationSalary: Math.round(regularSalary * 0.8),
    regularSalary,
    socialSecurity: Math.round(regularSalary * 0.1),
    housingFund: Math.round(regularSalary * 0.07),
    salaryAdjustment,
    salaryEffectiveDate: salaryAdjustment ? getFutureSalaryEffectiveDate(emp.id) : '',
    resumeAttachment: `${emp.name}-个人简历.pdf`,
    sharedOverheadCost: 1200 + Number(emp.id) % 4 * 300,
    monthlyWorkdays: Number(emp.id) % 3 === 0 ? 21.5 : 22,
    capability: makeCapability(scores, emp.position, emp.level),
    personality: initialPersonalityData[emp.id],
  };
});

// ---------- 初始考勤记录 ----------

export const initialAttendance: AttendanceRecord[] = [
  { id: 'a1', employeeId: '1', employeeName: '张三',   type: '年假', startDate: '2026-07-15', endDate: '2026-07-17', days: 3, reason: '家庭旅行',       status: '已批准', approvedBy: '徐强', approvedAt: '2026-07-10', createdAt: '2026-07-08' },
  { id: 'a2', employeeId: '5', employeeName: '钱七',   type: '事假', startDate: '2026-07-20', endDate: '2026-07-20', days: 1, reason: '办理证件',       status: '待审批', createdAt: '2026-07-16' },
  { id: 'a3', employeeId: '3', employeeName: '王五',   type: '加班', startDate: '2026-07-12', endDate: '2026-07-12', days: 1, reason: '项目赶工',       status: '已批准', approvedBy: '徐强', approvedAt: '2026-07-13', createdAt: '2026-07-12' },
  { id: 'a4', employeeId: '10', employeeName: '林小红', type: '年假', startDate: '2026-08-01', endDate: '2026-08-05', days: 5, reason: '暑期亲子游',    status: '已批准', approvedBy: '徐强', approvedAt: '2026-07-15', createdAt: '2026-07-14' },
  { id: 'a5', employeeId: '7', employeeName: '周九',   type: '病假', startDate: '2026-07-05', endDate: '2026-07-07', days: 3, reason: '肠胃不适需休息', status: '已批准', approvedBy: '钱七', approvedAt: '2026-07-05', createdAt: '2026-07-05' },
  { id: 'a6', employeeId: '4', employeeName: '赵六',   type: '调休', startDate: '2026-07-19', endDate: '2026-07-19', days: 1, reason: '周末加班调休',   status: '待审批', createdAt: '2026-07-17' },
  { id: 'a7', employeeId: '15', employeeName: '徐强',  type: '年假', startDate: '2026-07-25', endDate: '2026-07-31', days: 5, reason: '暑期休假',       status: '已批准', approvedBy: '张三', approvedAt: '2026-07-20', createdAt: '2026-07-18' },
];

// ---------- 初始绩效考核 ----------

export const initialPerformanceReviews: PerformanceReview[] = [
  { id: 'p1',  employeeId: '1',  employeeName: '张三',   department: '总公司', period: '季度', periodLabel: '2026-Q2', kpiScore: 88, behaviorScore: 92, totalScore: 89, rank: 'A', evaluator: '徐强', comment: '整体表现优秀，跨项目协调能力强。', createdAt: '2026-07-02' },
  { id: 'p2',  employeeId: '2',  employeeName: '李四',   department: '技术部', period: '季度', periodLabel: '2026-Q2', kpiScore: 82, behaviorScore: 85, totalScore: 83, rank: 'A', evaluator: '徐强', comment: '后端架构能力突出，代码质量稳定。', createdAt: '2026-07-02' },
  { id: 'p3',  employeeId: '3',  employeeName: '王五',   department: '前端组', period: '季度', periodLabel: '2026-Q2', kpiScore: 75, behaviorScore: 80, totalScore: 77, rank: 'B', evaluator: '黄丽', comment: '工作认真负责，需加强新技术学习。', createdAt: '2026-07-02' },
  { id: 'p4',  employeeId: '5',  employeeName: '钱七',   department: '销售部', period: '季度', periodLabel: '2026-Q2', kpiScore: 92, behaviorScore: 88, totalScore: 91, rank: 'S', evaluator: '张三', comment: 'Q2 业绩超额完成 150%，团队销售冠军。', createdAt: '2026-07-02' },
  { id: 'p5',  employeeId: '6',  employeeName: '孙八',   department: '华东区', period: '月度', periodLabel: '2026-06', kpiScore: 65, behaviorScore: 72, totalScore: 67, rank: 'C', evaluator: '钱七', comment: '实习生，正在学习销售技能。', createdAt: '2026-07-01' },
  { id: 'p6',  employeeId: '9',  employeeName: '陈明',   department: '技术部', period: '季度', periodLabel: '2026-Q2', kpiScore: 78, behaviorScore: 84, totalScore: 80, rank: 'A', evaluator: '徐强', comment: '设计产出质量高，UI 规范落地到位。', createdAt: '2026-07-02' },
  { id: 'p7',  employeeId: '10', employeeName: '林小红', department: '产品部', period: '季度', periodLabel: '2026-Q2', kpiScore: 85, behaviorScore: 88, totalScore: 86, rank: 'A', evaluator: '徐强', comment: '产品规划与落地能力强。', createdAt: '2026-07-02' },
  { id: 'p8',  employeeId: '14', employeeName: '黄丽',   department: '前端组', period: '季度', periodLabel: '2026-Q2', kpiScore: 90, behaviorScore: 93, totalScore: 91, rank: 'S', evaluator: '徐强', comment: '技术能力突出，团队核心骨干。', createdAt: '2026-07-02' },
  { id: 'p9',  employeeId: '15', employeeName: '徐强',   department: '技术部', period: '季度', periodLabel: '2026-Q2', kpiScore: 93, behaviorScore: 95, totalScore: 94, rank: 'S', evaluator: '张三', comment: '管理能力强，多个重点项目顺利交付。', createdAt: '2026-07-02' },
  { id: 'p10', employeeId: '16', employeeName: '杨帆',   department: '销售部', period: '月度', periodLabel: '2026-06', kpiScore: 70, behaviorScore: 75, totalScore: 72, rank: 'B', evaluator: '钱七', comment: '基本完成销售指标，需加大客户开发。', createdAt: '2026-07-01' },
];

// ---------- 职级时薪配置 ----------

export const initialLevelRates: LevelRateConfig[] = [
  { level: 'L1', position: '行政',     minRate: 30,  standardRate: 45,  maxRate: 60,  description: '实习生/助理' },
  { level: 'L2', position: '行政',     minRate: 45,  standardRate: 60,  maxRate: 75,  description: '初级专员' },
  { level: 'L3', position: '行政',     minRate: 60,  standardRate: 75,  maxRate: 95,  description: '中级/主管' },
  { level: 'L4', position: '行政',     minRate: 90,  standardRate: 110, maxRate: 140, description: '高级/经理' },
  { level: 'L1', position: '人事',     minRate: 40,  standardRate: 55,  maxRate: 70,  description: '实习生/助理' },
  { level: 'L2', position: '人事',     minRate: 55,  standardRate: 70,  maxRate: 90,  description: '初级专员' },
  { level: 'L3', position: '人事',     minRate: 70,  standardRate: 90,  maxRate: 110, description: '中级/主管' },
  { level: 'L4', position: '人事',     minRate: 90,  standardRate: 110, maxRate: 140, description: '高级/经理' },
  { level: 'L1', position: '财务',     minRate: 40,  standardRate: 60,  maxRate: 80,  description: '实习生/助理' },
  { level: 'L2', position: '财务',     minRate: 60,  standardRate: 80,  maxRate: 105, description: '初级会计' },
  { level: 'L3', position: '财务',     minRate: 80,  standardRate: 100, maxRate: 130, description: '中级/主管' },
  { level: 'L4', position: '财务',     minRate: 100, standardRate: 130, maxRate: 160, description: '高级/经理' },
  { level: 'L1', position: '销售',     minRate: 30,  standardRate: 50,  maxRate: 70,  description: '销售助理' },
  { level: 'L2', position: '销售',     minRate: 50,  standardRate: 70,  maxRate: 95,  description: '初级销售' },
  { level: 'L3', position: '销售',     minRate: 70,  standardRate: 90,  maxRate: 120, description: '中级销售' },
  { level: 'L4', position: '销售',     minRate: 90,  standardRate: 110, maxRate: 140, description: '高级销售' },
  { level: 'L5', position: '销售',     minRate: 110, standardRate: 130, maxRate: 170, description: '销售主管' },
  { level: 'L6', position: '销售',     minRate: 130, standardRate: 150, maxRate: 200, description: '销售经理' },
  { level: 'L7', position: '销售',     minRate: 150, standardRate: 180, maxRate: 230, description: '销售总监' },
  { level: 'L1', position: 'UI设计师', minRate: 35,  standardRate: 55,  maxRate: 75,  description: '实习设计师' },
  { level: 'L2', position: 'UI设计师', minRate: 55,  standardRate: 75,  maxRate: 100, description: '初级设计师' },
  { level: 'L3', position: 'UI设计师', minRate: 75,  standardRate: 95,  maxRate: 125, description: '中级设计师' },
  { level: 'L4', position: 'UI设计师', minRate: 95,  standardRate: 120, maxRate: 155, description: '高级设计师' },
  { level: 'L5', position: 'UI设计师', minRate: 120, standardRate: 145, maxRate: 185, description: '设计主管' },
  { level: 'L1', position: '前端开发', minRate: 40,  standardRate: 65,  maxRate: 85,  description: '实习前端' },
  { level: 'L2', position: '前端开发', minRate: 65,  standardRate: 85,  maxRate: 110, description: '初级前端' },
  { level: 'L3', position: '前端开发', minRate: 85,  standardRate: 105, maxRate: 130, description: '中级前端' },
  { level: 'L4', position: '前端开发', minRate: 105, standardRate: 130, maxRate: 160, description: '高级前端' },
  { level: 'L5', position: '前端开发', minRate: 130, standardRate: 155, maxRate: 195, description: '前端专家' },
  { level: 'L6', position: '前端开发', minRate: 155, standardRate: 185, maxRate: 230, description: '前端架构师' },
  { level: 'L7', position: '前端开发', minRate: 185, standardRate: 220, maxRate: 280, description: '高级架构师' },
  { level: 'L1', position: '后端开发', minRate: 40,  standardRate: 65,  maxRate: 85,  description: '实习后端' },
  { level: 'L2', position: '后端开发', minRate: 65,  standardRate: 85,  maxRate: 110, description: '初级后端' },
  { level: 'L3', position: '后端开发', minRate: 85,  standardRate: 105, maxRate: 130, description: '中级后端' },
  { level: 'L4', position: '后端开发', minRate: 105, standardRate: 130, maxRate: 160, description: '高级后端' },
  { level: 'L5', position: '后端开发', minRate: 130, standardRate: 155, maxRate: 195, description: '后端专家' },
  { level: 'L6', position: '后端开发', minRate: 155, standardRate: 185, maxRate: 230, description: '后端架构师' },
  { level: 'L7', position: '后端开发', minRate: 185, standardRate: 220, maxRate: 280, description: '技术总监' },
  { level: 'L1', position: '全栈开发', minRate: 45,  standardRate: 70,  maxRate: 95,  description: '实习全栈' },
  { level: 'L2', position: '全栈开发', minRate: 70,  standardRate: 95,  maxRate: 120, description: '初级全栈' },
  { level: 'L3', position: '全栈开发', minRate: 95,  standardRate: 120, maxRate: 150, description: '中级全栈' },
  { level: 'L4', position: '全栈开发', minRate: 120, standardRate: 150, maxRate: 185, description: '高级全栈' },
  { level: 'L5', position: '全栈开发', minRate: 150, standardRate: 180, maxRate: 220, description: '全栈专家' },
  { level: 'L1', position: '产品经理', minRate: 45,  standardRate: 70,  maxRate: 95,  description: '产品助理' },
  { level: 'L2', position: '产品经理', minRate: 70,  standardRate: 95,  maxRate: 120, description: '初级产品经理' },
  { level: 'L3', position: '产品经理', minRate: 95,  standardRate: 120, maxRate: 150, description: '中级产品经理' },
  { level: 'L4', position: '产品经理', minRate: 120, standardRate: 150, maxRate: 190, description: '高级产品经理' },
  { level: 'L5', position: '产品经理', minRate: 150, standardRate: 180, maxRate: 230, description: '产品总监' },
  { level: 'L1', position: '项目经理', minRate: 50,  standardRate: 80,  maxRate: 110, description: '项目助理' },
  { level: 'L2', position: '项目经理', minRate: 80,  standardRate: 110, maxRate: 140, description: '初级项目经理' },
  { level: 'L3', position: '项目经理', minRate: 110, standardRate: 140, maxRate: 175, description: '中级项目经理' },
  { level: 'L4', position: '项目经理', minRate: 140, standardRate: 170, maxRate: 210, description: '高级项目经理' },
  { level: 'L5', position: '项目经理', minRate: 170, standardRate: 200, maxRate: 250, description: '项目总监' },
  { level: 'L6', position: '项目经理', minRate: 200, standardRate: 240, maxRate: 300, description: '高级项目总监' },
];
