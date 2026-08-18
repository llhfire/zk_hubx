# 员工管理 — 设计规格

## 概述

从原有 `Organization.tsx` 的「人员管理」Tab 升级为独立模块「员工管理」，增加职级、标准时薪、转正日期、合同到期日、考勤管理、绩效考核、职级时薪设置，为后续「员工能力建模」「项目成本核算」「日报扩展」提供数据基础。

## 一、模块路由与位置

- **顶级菜单**：新增独立菜单组「员工管理」(`IconTeam`)
- **路由**：`/employees/*`

| 子路由 | 组件 | 菜单名 |
|--------|------|--------|
| `/employees` | `EmployeeList` | 员工列表 |
| `/employees/:id` | `EmployeeDetail` | — （详情页不展示在菜单） |
| `/employees/attendance` | `AttendanceManagement` | 考勤管理 |
| `/employees/performance` | `PerformanceManagement` | 绩效考核 |
| `/employees/level-rates` | `LevelRateSettings` | 职级时薪设置 |

## 二、数据模型

### 2.1 职位与职级

```typescript
type Position = '销售' | '前端开发' | '后端开发' | '全栈开发' | 'UI设计师' | '产品经理' | '项目经理' | '人事' | '财务' | '行政';

// L1-L10 等级体系
type JobLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';

// 员工状态
type EmploymentStatus = '在职' | '试用期' | '已转正' | '已离职' | '休假中';
```

### 2.2 员工主表

```typescript
interface Employee {
  id: string;
  name: string;
  jobNumber: string;       // 工号
  department: string;      // 部门名称
  position: Position;      // 职位
  level: JobLevel;         // 职级 L1-L10
  employmentStatus: EmploymentStatus;
  phone: string;
  email: string;
  hireDate: string;        // 入职日期
 转正Date: string;         // 转正日期（空=未转正）
  contractEndDate: string; // 合同到期日
  standardHourlyRate: number; // 标准时薪（元/小时），关联职级
  avatar?: string;         // 头像（可选）
  idCard?: string;         // 身份证号（脱敏展示）
  bankAccount?: string;    // 银行卡号（脱敏展示）
  emergencyContact?: string; // 紧急联系人
  education?: string;      // 最高学历
  school?: string;         // 毕业院校
  previousExperience?: string; // 入职前经验
}
```

### 2.3 考勤记录

```typescript
// 请假类型
type LeaveType = '年假' | '事假' | '病假' | '调休' | '婚假' | '产假' | '丧假' | '加班';

// 请假/加班申请状态
type AttendanceStatus = '已批准' | '待审批' | '已拒绝' | '已撤销';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;           // 天数
  reason: string;
  status: AttendanceStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// 每月考勤汇总
interface MonthlyAttendance {
  employeeId: string;
  employeeName: string;
  yearMonth: string;      // "2026-07"
  workDays: number;       // 应出勤天数
  actualDays: number;     // 实际出勤天数
  lateCount: number;      // 迟到次数
  leaveDays: number;      // 请假天数
  overtimeHours: number;  // 加班小时
}
```

### 2.4 绩效考核

```typescript
// 考核周期
type ReviewPeriod = '月度' | '季度';

// 考核结果
type PerformanceRank = 'S' | 'A' | 'B' | 'C' | 'D';

interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  period: ReviewPeriod;
  yearMonth: string;      // "2026-Q3" 或 "2026-07"
  kpiScore: number;       // KPI 完成度 0-100
  behaviorScore: number;  // 行为评价 0-100
  totalScore: number;     // 综合得分 = KPI×0.7 + 行为×0.3
  rank: PerformanceRank;  // 评级 S/A/B/C/D
  evaluator: string;      // 考核人
  comment: string;        // 评语
  createdAt: string;
}
```

### 2.5 职级时薪表

```typescript
interface LevelRateConfig {
  level: JobLevel;
  position: Position;
  minRate: number;        // 最低时薪（元/小时）
  standardRate: number;   // 标准时薪
  maxRate: number;        // 最高时薪
  description: string;    // 该职级描述说明
}
```

## 三、组件架构

```
EmployeeProvider (Context — 跨页面共享员工/考勤/绩效/职级数据)
│
├── EmployeeList              ← 员工列表页
│   ├── EmployeeSummaryBar    ← 顶部指标卡片（在职总数、本月离职、本月入职、试用期人数）
│   ├── EmployeeFilterBar     ← 筛选栏
│   └── EmployeeTable         ← 员工表格 + 操作
│
├── EmployeeDetail            ← 员工详情页
│   ├── EmployeeProfile       ← 基本信息卡片
│   ├── EmployeeTabs          ← Tab 切换
│   │   ├── 档案 Tab          ← 完整档案信息
│   │   ├── 考勤 Tab          ← 该员工考勤记录
│   │   ├── 绩效 Tab          ← 该员工绩效历史
│   │   └── 项目 Tab          ← 历史参与项目
│   └── EmployeeActions       ← 操作按钮栏
│
├── AttendanceManagement      ← 考勤管理页
│   ├── AttendanceSummaryBar  ← 本月考勤汇总指标
│   ├── AttendanceFilterBar   ← 按部门/日期/类型筛选
│   ├── AttendanceCalendar    ← 月度考勤日历视图
│   ├── AttendanceTable       ← 请假/加班申请列表
│   └── AttendanceModal       ← 新增/编辑请假申请
│
├── PerformanceManagement     ← 绩效考核页
│   ├── PerformanceSummaryBar ← 本期考核汇总
│   ├── PerformanceFilterBar  ← 按部门/周期筛选
│   ├── PerformanceTable      ← 考核记录列表
│   └── PerformanceModal      ← 新增考核评分
│
└── LevelRateSettings         ← 职级时薪设置页
    ├── PositionGroupTabs     ← 按职位分组查看
    └── LevelRateTable        ← 职级×时薪配置表
```

## 四、员工列表页

### 4.1 摘要栏（4 指标）

| 指标 | 计算 |
|------|------|
| 在职总数 | `status !== '已离职'` |
| 本月入职 | `hireDate` 在本月 |
| 本月离职 | `employmentStatus === '已离职'` 且 leaveDate 在本月 |
| 试用期人数 | `employmentStatus === '试用期'` |

### 4.2 筛选栏

- 部门（Select，多选）
- 职位（Select，多选）
- 职级（Select，多选）
- 在职状态（Select，多选）
- 姓名/工号（Input，模糊搜索）

### 4.3 表格列

工号 | 姓名 | 部门 | 职位 | 职级 | 状态 | 标准时薪 | 入职日期 | 操作（查看/编辑/更多）

### 4.4 操作

- **查看**：跳转 `/employees/:id`
- **编辑**：弹窗编辑员工信息
- **更多**：转正 / 离职 / 调整职级（含快捷操作菜单）

## 五、员工详情页

### 5.1 基本信息卡片

头像 + 姓名 + 工号 + 部门 + 职位标签 + 职级标签 + 在职状态色标 + 入职天数

### 5.2 四个 Tab

| Tab | 内容 |
|-----|------|
| 档案 | 二栏布局：左栏（个人信息、工作信息、教育背景），右栏（合同信息、银行卡信息、紧急联系人） |
| 考勤 | 本月出勤日历 + 全年请假统计 + 请假记录列表 |
| 绩效 | 雷达图（最近 N 期能力雷达）+ 历史评分折线图 + 绩效记录列表 |
| 项目 | 参与过的项目列表，关联 `project-management` 模块数据 |

## 六、考勤管理

### 6.1 汇总指标

| 指标 | 说明 |
|------|------|
| 本月出勤人数 | 本月有出勤记录的员工数 |
| 本月请假总天数 | 所有已批准请假天数之和 |
| 本月加班总小时 | 所有已批准加班小时之和 |
| 待审批申请数 | status === '待审批' 的条数 |

### 6.2 日历视图

- 月份切换
- 每天显示该日请假/出勤人数色块
- 点击某天展开详情列表

### 6.3 请假申请

字段：申请人、类型（下拉）、起止日期、天数、事由、附件入口
操作：新增、编辑、审批、拒绝

## 七、绩效考核

### 7.1 汇总指标

| 指标 | 说明 |
|------|------|
| 本月考核人数 | 有月度考核记录的人数 |
| 本季度考核人数 | 有季度考核记录的人数 |
| 平均 KPI 得分 | Σ kpiScore / count |
| S/A 评级占比 | S+A 人数 / 总考核人数 |

### 7.2 考核打分

字段：被考核人、周期、KPI 得分（滑块 0-100）、行为得分（滑块 0-100）、评语、考核人
- 综合得分自动计算：KPI×0.7 + 行为×0.3
- 评级自动判定：≥90 S / ≥80 A / ≥70 B / ≥60 C / <60 D

## 八、职级时薪设置

### 8.1 数据结构

- 每个 Level × Position 组合一行
- 可编辑「标准时薪」字段
- 修改后同步更新该 Level 下所有员工的标准时薪

### 8.2 表格布局

| 职级 | 职位 | 时薪范围 | 标准时薪（可编辑） | 描述 |

- 标准时薪为可编辑 `InputNumber`
- 修改后自动触发 `EmployeeProvider` 更新对应员工记录

## 九、数据共享层

```
EmployeeProvider (React Context)
├── state: Employee[]
├── state: AttendanceRecord[]
├── state: PerformanceReview[]
├── state: LevelRateConfig[]
├── CRUD: add/update/deleteEmployee
├── CRUD: add/update/approveAttendance
├── CRUD: add/updatePerformance
├── CRUD: updateLevelRate
└── pure utils: 各种计算函数
```

所有子页面通过 `useEmployee()` Hook 消费共享数据，一处修改全局同步。

## 十、与现有模块对接

### 与 Organization.tsx 的关系

- Organization 页面中的「员工管理」Tab 保留为只读视图（原有功能不破坏）
- 员工管理独立模块作为完整的增删改查 + 考勤 + 绩效 + 时薪扩展
- 新建的 `EmployeeProvider` 以 Organization 中现有的 mockEmployees 数据为基础模板，扩展职级/时薪/转正日期等字段

### 为后续模块输出

| 后续模块 | 员工管理输出 |
|----------|------------|
| 员工能力建模 | 员工基本信息、职位、职级 |
| 项目成本核算 | 标准时薪 × 工时 |
| 日报扩展 | 员工（按部门）、角色（职位 → 日报模板映射） |
| 个人工作台 | 个人仪表盘所需的所有个人数据 |

## 十一、菜单与导航变更

### MainLayout.tsx 修改

- 新增顶级菜单组「员工管理」：`key: 'employees'`, `icon: <IconTeam />`, `children: [员工列表, 考勤管理, 绩效考核, 职级时薪设置]`
- 放置在「系统管理」之前（作为业务核心模块之一）

### routes.tsx 修改

```
{ path: "employees", Component: EmployeeList },
{ path: "employees/:id", Component: EmployeeDetail },
{ path: "employees/attendance", Component: AttendanceManagement },
{ path: "employees/performance", Component: PerformanceManagement },
{ path: "employees/level-rates", Component: LevelRateSettings },
```

## 十二、术语

| 术语 | 英文 | 定义 |
|------|------|------|
| 职级 | Job Level | L1-L10 的等级体系 |
| 标准时薪 | Standard Hourly Rate | 该职级对应的标准小时工资 |
| 转正 | Regularization | 试用期结束转为正式员工 |
| 绩效考核 | Performance Review | 对员工 KPI 和行为表现打分评级 |
| 请假/加班申请 | Leave/Overtime Request | 员工提交的请假或加班申请 |
