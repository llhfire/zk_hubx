# 日报管理-销售人员差异化日报模板 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为销售人员实现专属日报模板（包含线索跟进情况），为通用用户实现标准模板（增加"遇到的问题"字段），支持用户覆盖角色默认模板，支持日报评论功能。

**Architecture:** 使用 React + TypeScript，前端模拟数据层。模板配置存储在 `src/app/pages/daily-report/templateConfig.ts`，日报组件根据用户角色/个人配置动态渲染对应模板UI。评论功能使用本地 state 模拟。

**Tech Stack:** React 18, TypeScript, @arco-design/web-react, React Router v7

---

## 文件结构

```
src/app/
├── pages/
│   ├── daily-report/
│   │   ├── types.ts              # 新增：类型定义
│   │   ├── templateConfig.ts     # 新增：模板配置
│   │   ├── SalesDailyTemplate.tsx    # 新增：销售日报模板组件
│   │   ├── GeneralDailyTemplate.tsx  # 新增：通用日报模板组件
│   │   ├── DailyReportModal.tsx      # 新增：日报提交模态框（根据配置渲染模板）
│   │   ├── DailyReportDetail.tsx    # 新增：日报详情（包含评论功能）
│   │   ├── DailyReportList.tsx      # 修改：添加评论入口和未读badge
│   │   └── DailyReportView.tsx      # 修改：添加评论功能
│   └── components/
│       └── MainLayout.tsx        # 修改：集成日报模态框，支持未读提醒badge
```

---

## Task 1: 类型定义

**Files:**
- Create: `src/app/pages/daily-report/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/app/pages/daily-report/types.ts

// 模板字段类型
export type FieldType = 'text' | 'textarea' | 'lead-tracking' | 'project-task-list' | 'date' | 'select';

// 模板字段定义
export interface TemplateField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  order: number;
  options?: { label: string; value: string }[];
}

// 日报模板
export interface DailyTemplate {
  id: string;
  name: string;
  type: 'sales' | 'general';
  fields: TemplateField[];
  isDefault: boolean;
}

// 项目任务
export interface ProjectTask {
  id: string;
  projectName: string;
  taskForm: string;
  hours: number;
}

// 线索跟进情况
export interface LeadTrackingItem {
  leadId: string;
  leadName: string;
  level: 'S' | 'A' | 'B' | 'C';
  statusChanges: string[];
  followRecords: string[];
}

// 销售日报内容
export interface SalesReportContent {
  'lead-tracking'?: LeadTrackingItem[];
  'assistance-needed'?: string;
  'tomorrow-plan'?: string;
}

// 通用日报内容
export interface GeneralReportContent {
  'project-tasks'?: ProjectTask[];
  'today-summary'?: string;
  'problems-encountered'?: string;
  'tomorrow-plan'?: string;
}

// 日报类型（联合类型）
export type DailyReportContent = SalesReportContent | GeneralReportContent;

// 日报
export interface DailyReport {
  id: string;
  userId: string;
  userName: string;
  department: string;
  reportDate: string;
  templateId: string;
  templateType: 'sales' | 'general';
  content: DailyReportContent;
  status: 'draft' | 'submitted' | 'reviewed';
  createdAt: string;
  updatedAt: string;
  hasUnreadComments?: boolean;
}

// 日报评论
export interface DailyReportComment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  content: string;
  mentionedUsers: string[];
  createdAt: string;
  readBy: string[];
}

// 用户模板配置
export interface UserTemplateConfig {
  userId: string;
  templateId: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\AIwork\OA\HubX
git add src/app/pages/daily-report/types.ts
git commit -m "feat(daily-report): add type definitions for daily report templates"
```

---

## Task 2: 模板配置

**Files:**
- Create: `src/app/pages/daily-report/templateConfig.ts`

- [ ] **Step 1: 创建模板配置文件**

```typescript
// src/app/pages/daily-report/templateConfig.ts

import { DailyTemplate, UserTemplateConfig } from './types';

// 销售日报模板
export const salesTemplate: DailyTemplate = {
  id: 'sales-template-default',
  name: '销售日报模板',
  type: 'sales',
  isDefault: true,
  fields: [
    {
      id: 'lead-tracking',
      name: '线索跟进情况',
      type: 'lead-tracking',
      required: false,
      order: 1,
    },
    {
      id: 'assistance-needed',
      name: '需协助事项',
      type: 'textarea',
      required: false,
      order: 2,
    },
    {
      id: 'tomorrow-plan',
      name: '明日工作计划',
      type: 'textarea',
      required: true,
      order: 3,
    },
  ],
};

// 通用日报模板
export const generalTemplate: DailyTemplate = {
  id: 'general-template-default',
  name: '通用日报模板',
  type: 'general',
  isDefault: true,
  fields: [
    {
      id: 'project-tasks',
      name: '项目任务',
      type: 'project-task-list',
      required: false,
      order: 1,
    },
    {
      id: 'today-summary',
      name: '今日总结',
      type: 'textarea',
      required: false,
      order: 2,
    },
    {
      id: 'problems-encountered',
      name: '遇到的问题',
      type: 'textarea',
      required: false,
      order: 3,
    },
    {
      id: 'tomorrow-plan',
      name: '明日工作计划',
      type: 'textarea',
      required: true,
      order: 4,
    },
  ],
};

// 获取用户模板配置（模拟：当前用户是销售张三）
export function getUserTemplateConfig(userId: string): UserTemplateConfig | null {
  // 模拟数据：可以扩展为从 localStorage 或 API 获取
  const configs: Record<string, UserTemplateConfig> = {
    'user-sales-zhangsan': { userId: 'user-sales-zhangsan', templateId: 'sales-template-default' },
  };
  return configs[userId] || null;
}

// 根据用户ID获取模板
export function getUserTemplate(userId: string, userRole: 'sales' | 'other' = 'other'): DailyTemplate {
  const userConfig = getUserTemplateConfig(userId);
  if (userConfig) {
    if (userConfig.templateId === 'sales-template-default') return salesTemplate;
    if (userConfig.templateId === 'general-template-default') return generalTemplate;
  }
  return userRole === 'sales' ? salesTemplate : generalTemplate;
}

// 模拟用户数据
export const mockUsers = [
  { id: 'user-sales-zhangsan', name: '张三', role: 'sales' as const, department: '销售部' },
  { id: 'user-sales-lisi', name: '李四', role: 'sales' as const, department: '销售部' },
  { id: 'user-tech-wangwu', name: '王五', role: 'other' as const, department: '技术部' },
];

// 获取线索跟进数据（模拟）
export function getSalesDailyLeadsData(userId: string, date: Date) {
  // 模拟数据：当天跟进的线索
  const mockLeads: import('./types').LeadTrackingItem[] = [
    {
      leadId: 'lead-1',
      leadName: '阿里巴巴-企业管理系统',
      level: 'S',
      statusChanges: ['意向低 → 意向高'],
      followRecords: ['今天电话沟通，对方表示有合作意向，希望进一步演示产品。'],
    },
    {
      leadId: 'lead-2',
      leadName: '腾讯-云服务平台',
      level: 'A',
      statusChanges: [],
      followRecords: ['下午发送了产品资料包，对方已确认收到。'],
    },
    {
      leadId: 'lead-3',
      leadName: '字节跳动-协作工具',
      level: 'B',
      statusChanges: ['初步建联 → 已出demo'],
      followRecords: ['上午进行线上demo演示，对方反馈积极。'],
    },
  ];
  return mockLeads;
}

// 判断是否为销售人员
export function isSalesUser(userId: string): boolean {
  const user = mockUsers.find(u => u.id === userId);
  return user?.role === 'sales';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/daily-report/templateConfig.ts
git commit -m "feat(daily-report): add template configuration for sales and general templates"
```

---

## Task 3: 销售日报模板组件

**Files:**
- Create: `src/app/pages/daily-report/SalesDailyTemplate.tsx`

- [ ] **Step 1: 创建销售日报模板组件**

```typescript
// src/app/pages/daily-report/SalesDailyTemplate.tsx

import { useState, useEffect } from 'react';
import { Input, Button, Space, Tag, Card, Typography } from '@arco-design/web-react';
import { IconPlus, IconDelete } from '@arco-design/web-react/icon';
import { LeadTrackingItem, SalesReportContent } from './types';
import { getSalesDailyLeadsData } from './templateConfig';

const { Text } = Typography;

interface Props {
  userId: string;
  date: Date;
  initialContent?: SalesReportContent;
  onChange: (content: SalesReportContent) => void;
}

export function SalesDailyTemplate({ userId, date, initialContent, onChange }: Props) {
  const [leadTracking, setLeadTracking] = useState<LeadTrackingItem[]>([]);
  const [assistanceNeeded, setAssistanceNeeded] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  // 初始化数据
  useEffect(() => {
    if (initialContent) {
      setLeadTracking(initialContent['lead-tracking'] || []);
      setAssistanceNeeded(initialContent['assistance-needed'] || '');
      setTomorrowPlan(initialContent['tomorrow-plan'] || '');
    } else {
      // 自动获取线索跟进数据
      const leadsData = getSalesDailyLeadsData(userId, date);
      setLeadTracking(leadsData);
    }
  }, [userId, date, initialContent]);

  // 更新内容
  useEffect(() => {
    onChange({
      'lead-tracking': leadTracking,
      'assistance-needed': assistanceNeeded,
      'tomorrow-plan': tomorrowPlan,
    });
  }, [leadTracking, assistanceNeeded, tomorrowPlan]);

  // 更新线索项
  const updateLeadItem = (index: number, field: 'statusChanges' | 'followRecords', value: string) => {
    const newLeads = [...leadTracking];
    if (field === 'statusChanges') {
      newLeads[index] = { ...newLeads[index], statusChanges: [value] };
    } else {
      newLeads[index] = { ...newLeads[index], followRecords: [value] };
    }
    setLeadTracking(newLeads);
  };

  // 级别颜色映射
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = { S: 'red', A: 'orange', B: 'blue', C: 'green' };
    return colors[level] || 'default';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 线索跟进情况 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>线索跟进情况</div>
        {leadTracking.length === 0 ? (
          <Card size="small" style={{ background: 'var(--color-fill-2)' }}>
            <Text type="secondary">今日暂无线索跟进记录</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leadTracking.map((item, index) => (
              <Card key={item.leadId} size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Tag color={getLevelColor(item.level)}>{item.level}</Tag>
                  <Text strong>{item.leadName}</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>状态变更：</Text>
                  {item.statusChanges.length > 0 ? (
                    <span>{item.statusChanges.join(', ')}</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-4)' }}>无</span>
                  )}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>跟进记录：</Text>
                  <Input.TextArea
                    value={item.followRecords.join('\n')}
                    onChange={(value) => updateLeadItem(index, 'followRecords', value)}
                    placeholder="请输入跟进记录..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    style={{ marginTop: 4 }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 需协助事项 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>需协助事项</div>
        <Input.TextArea
          value={assistanceNeeded}
          onChange={(value) => setAssistanceNeeded(value)}
          placeholder="请输入需要协助的事项..."
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </div>

      {/* 明日工作计划 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          明日工作计划 <span style={{ color: 'red' }}>*</span>
        </div>
        <Input.TextArea
          value={tomorrowPlan}
          onChange={(value) => setTomorrowPlan(value)}
          placeholder="请输入明日工作计划（必填）..."
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/daily-report/SalesDailyTemplate.tsx
git commit -m "feat(daily-report): add SalesDailyTemplate component"
```

---

## Task 4: 通用日报模板组件

**Files:**
- Create: `src/app/pages/daily-report/GeneralDailyTemplate.tsx`

- [ ] **Step 1: 创建通用日报模板组件**

```typescript
// src/app/pages/daily-report/GeneralDailyTemplate.tsx

import { useState, useEffect } from 'react';
import { Input, Button, Table, Space, InputNumber } from '@arco-design/web-react';
import { IconPlus, IconDelete } from '@arco-design/web-react/icon';
import { ProjectTask, GeneralReportContent } from './types';

interface Props {
  initialContent?: GeneralReportContent;
  onChange: (content: GeneralReportContent) => void;
}

export function GeneralDailyTemplate({ initialContent, onChange }: Props) {
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [todaySummary, setTodaySummary] = useState('');
  const [problemsEncountered, setProblemsEncountered] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  // 初始化数据
  useEffect(() => {
    if (initialContent) {
      setProjectTasks(initialContent['project-tasks'] || []);
      setTodaySummary(initialContent['today-summary'] || '');
      setProblemsEncountered(initialContent['problems-encountered'] || '');
      setTomorrowPlan(initialContent['tomorrow-plan'] || '');
    }
  }, [initialContent]);

  // 更新内容
  useEffect(() => {
    onChange({
      'project-tasks': projectTasks,
      'today-summary': todaySummary,
      'problems-encountered': problemsEncountered,
      'tomorrow-plan': tomorrowPlan,
    });
  }, [projectTasks, todaySummary, problemsEncountered, tomorrowPlan]);

  // 添加项目任务行
  const addProjectTask = () => {
    setProjectTasks([
      ...projectTasks,
      { id: `task-${Date.now()}`, projectName: '', taskForm: '', hours: 0 },
    ]);
  };

  // 删除项目任务行
  const removeProjectTask = (index: number) => {
    setProjectTasks(projectTasks.filter((_, i) => i !== index));
  };

  // 更新项目任务
  const updateProjectTask = (index: number, field: keyof ProjectTask, value: string | number) => {
    const newTasks = [...projectTasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setProjectTasks(newTasks);
  };

  const taskColumns = [
    {
      title: '项目名称',
      dataIndex: 'projectName',
      width: 200,
      render: (value: string, record: ProjectTask, index: number) => (
        <Input
          value={value}
          onChange={(v) => updateProjectTask(index, 'projectName', v)}
          placeholder="请输入项目名称"
        />
      ),
    },
    {
      title: '任务形式',
      dataIndex: 'taskForm',
      width: 120,
      render: (value: string, record: ProjectTask, index: number) => (
        <Input
          value={value}
          onChange={(v) => updateProjectTask(index, 'taskForm', v)}
          placeholder="如：需求沟通"
        />
      ),
    },
    {
      title: '用时（小时）',
      dataIndex: 'hours',
      width: 100,
      render: (value: number, record: ProjectTask, index: number) => (
        <InputNumber
          value={value}
          onChange={(v) => updateProjectTask(index, 'hours', v || 0)}
          min={0}
          placeholder="0"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <Button
          type="text"
          icon={<IconDelete />}
          onClick={() => removeProjectTask(index)}
          status="danger"
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 项目任务 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>项目任务</div>
        <Table
          columns={taskColumns}
          data={projectTasks}
          pagination={false}
          size="small"
          noDataElement={
            <div style={{ padding: 16 }}>
              <Button type="dashed" icon={<IconPlus />} onClick={addProjectTask}>
                添加项目任务
              </Button>
            </div>
          }
        />
        {projectTasks.length > 0 && (
          <Button
            type="dashed"
            icon={<IconPlus />}
            onClick={addProjectTask}
            style={{ marginTop: 8 }}
          >
            添加一行
          </Button>
        )}
      </div>

      {/* 今日总结 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>今日总结</div>
        <Input.TextArea
          value={todaySummary}
          onChange={(value) => setTodaySummary(value)}
          placeholder="请输入今日工作总结..."
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </div>

      {/* 遇到的问题 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>遇到的问题</div>
        <Input.TextArea
          value={problemsEncountered}
          onChange={(value) => setProblemsEncountered(value)}
          placeholder="请输入遇到的问题..."
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </div>

      {/* 明日工作计划 */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          明日工作计划 <span style={{ color: 'red' }}>*</span>
        </div>
        <Input.TextArea
          value={tomorrowPlan}
          onChange={(value) => setTomorrowPlan(value)}
          placeholder="请输入明日工作计划（必填）..."
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/daily-report/GeneralDailyTemplate.tsx
git commit -m "feat(daily-report): add GeneralDailyTemplate component"
```

---

## Task 5: 日报提交模态框

**Files:**
- Create: `src/app/pages/daily-report/DailyReportModal.tsx`

- [ ] **Step 1: 创建日报提交模态框组件**

```typescript
// src/app/pages/daily-report/DailyReportModal.tsx

import { useState, useEffect } from 'react';
import { Modal, DatePicker, Button, Message } from '@arco-design/web-react';
import { SalesDailyTemplate } from './SalesDailyTemplate';
import { GeneralDailyTemplate } from './GeneralDailyTemplate';
import { getUserTemplate, mockUsers } from './templateConfig';
import { DailyReport, DailyReportContent, SalesReportContent, GeneralReportContent } from './types';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (report: DailyReport) => void;
  currentUserId?: string;
}

export function DailyReportModal({ visible, onCancel, onSubmit, currentUserId = 'user-sales-zhangsan' }: Props) {
  const [reportDate, setReportDate] = useState(new Date());
  const [content, setContent] = useState<DailyReportContent | null>(null);
  const [templateType, setTemplateType] = useState<'sales' | 'general'>('sales');

  // 获取用户模板
  useEffect(() => {
    if (visible) {
      const user = mockUsers.find(u => u.id === currentUserId);
      const template = getUserTemplate(currentUserId, user?.role as 'sales' | 'other');
      setTemplateType(template.type);
      setContent(null);
    }
  }, [visible, currentUserId]);

  const handleContentChange = (newContent: DailyReportContent) => {
    setContent(newContent);
  };

  const handleSubmit = () => {
    // 校验必填项
    if (templateType === 'sales') {
      const salesContent = content as SalesReportContent;
      if (!salesContent?.['tomorrow-plan']) {
        Message.warning('请填写明日工作计划（必填）');
        return;
      }
    } else {
      const generalContent = content as GeneralReportContent;
      if (!generalContent?.['tomorrow-plan']) {
        Message.warning('请填写明日工作计划（必填）');
        return;
      }
    }

    const user = mockUsers.find(u => u.id === currentUserId);
    const report: DailyReport = {
      id: `report-${Date.now()}`,
      userId: currentUserId,
      userName: user?.name || '未知用户',
      department: user?.department || '未知部门',
      reportDate: reportDate.toISOString().split('T')[0],
      templateId: templateType === 'sales' ? 'sales-template-default' : 'general-template-default',
      templateType,
      content,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(report);
    Message.success('日报提交成功');
    onCancel();
  };

  const renderTemplate = () => {
    if (templateType === 'sales') {
      return (
        <SalesDailyTemplate
          userId={currentUserId}
          date={reportDate}
          initialContent={content as SalesReportContent | undefined}
          onChange={handleContentChange}
        />
      );
    } else {
      return (
        <GeneralDailyTemplate
          initialContent={content as GeneralReportContent | undefined}
          onChange={handleContentChange}
        />
      );
    }
  };

  return (
    <Modal
      title="填写日报"
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="提交日报"
      cancelText="取消"
      style={{ width: 700 }}
    >
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 500 }}>日期：</span>
        <DatePicker
          value={reportDate}
          onChange={(date) => date && setReportDate(date)}
          style={{ width: 200 }}
        />
      </div>

      {renderTemplate()}
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/daily-report/DailyReportModal.tsx
git commit -m "feat(daily-report): add DailyReportModal component"
```

---

## Task 6: 日报详情组件（包含评论功能）

**Files:**
- Create: `src/app/pages/daily-report/DailyReportDetail.tsx`

- [ ] **Step 1: 创建日报详情组件**

```typescript
// src/app/pages/daily-report/DailyReportDetail.tsx

import { useState } from 'react';
import { Modal, Descriptions, Card, Typography, Input, Button, Space, Avatar, Tag, Table } from '@arco-design/web-react';
import { DailyReport, DailyReportComment, SalesReportContent, GeneralReportContent, LeadTrackingItem, ProjectTask } from './types';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onCancel: () => void;
  report: DailyReport | null;
  comments: DailyReportComment[];
  onAddComment: (reportId: string, content: string, mentionedUsers: string[]) => void;
  currentUserId: string;
}

export function DailyReportDetail({ visible, onCancel, report, comments, onAddComment, currentUserId }: Props) {
  const [commentText, setCommentText] = useState('');

  if (!report) return null;

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    // 解析 @提及的用户
    const mentionedUsers = extractMentionedUsers(commentText);
    onAddComment(report.id, commentText, mentionedUsers);
    setCommentText('');
  };

  const extractMentionedUsers = (text: string): string[] => {
    const regex = /@(\S+)/g;
    const matches = text.match(regex);
    if (!matches) return [];
    // 简化处理：假设 @后的是用户名
    return matches.map(m => m.substring(1));
  };

  const renderSalesContent = (content: SalesReportContent) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {content['lead-tracking'] && content['lead-tracking'].length > 0 && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>线索跟进情况</Text>
          {content['lead-tracking'].map((item: LeadTrackingItem) => (
            <Card key={item.leadId} size="small" style={{ marginBottom: 8 }}>
              <Space>
                <Tag color={item.level === 'S' ? 'red' : item.level === 'A' ? 'orange' : item.level === 'B' ? 'blue' : 'green'}>
                  {item.level}
                </Tag>
                <Text strong>{item.leadName}</Text>
              </Space>
              {item.statusChanges.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">状态变更：</Text>
                  <Text>{item.statusChanges.join(', ')}</Text>
                </div>
              )}
              {item.followRecords.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">跟进记录：</Text>
                  {item.followRecords.map((record, i) => (
                    <div key={i} style={{ marginLeft: 8 }}>{record}</div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {content['assistance-needed'] && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>需协助事项</Text>
          <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {content['assistance-needed']}
          </div>
        </div>
      )}
      {content['tomorrow-plan'] && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>明日工作计划</Text>
          <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {content['tomorrow-plan']}
          </div>
        </div>
      )}
    </div>
  );

  const renderGeneralContent = (content: GeneralReportContent) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {content['project-tasks'] && content['project-tasks'].length > 0 && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>项目任务</Text>
          <Table
            columns={[
              { title: '项目名称', dataIndex: 'projectName' },
              { title: '任务形式', dataIndex: 'taskForm' },
              { title: '用时（小时）', dataIndex: 'hours' },
            ]}
            data={content['project-tasks']}
            pagination={false}
            size="small"
          />
        </div>
      )}
      {content['today-summary'] && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>今日总结</Text>
          <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {content['today-summary']}
          </div>
        </div>
      )}
      {content['problems-encountered'] && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>遇到的问题</Text>
          <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {content['problems-encountered']}
          </div>
        </div>
      )}
      {content['tomorrow-plan'] && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>明日工作计划</Text>
          <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {content['tomorrow-plan']}
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (report.templateType === 'sales') {
      return renderSalesContent(report.content as SalesReportContent);
    } else {
      return renderGeneralContent(report.content as GeneralReportContent);
    }
  };

  const reportComments = comments.filter(c => c.reportId === report.id);

  return (
    <Modal
      title="日报详情"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      style={{ width: 800 }}
    >
      <Descriptions
        column={2}
        data={[
          { label: '日报日期', value: report.reportDate },
          { label: '汇报人', value: report.userName },
          { label: '部门', value: report.department },
          { label: '模板类型', value: report.templateType === 'sales' ? '销售日报' : '通用日报' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 24 }}>{renderContent()}</div>

      {/* 评论区域 */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>
          评论 ({reportComments.length})
        </Text>

        {reportComments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {reportComments.map((comment) => (
              <Card key={comment.id} size="small" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Avatar size={24}>{comment.userName[0]}</Avatar>
                  <Text strong>{comment.userName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </Text>
                </div>
                <Text>{comment.content}</Text>
              </Card>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Input.TextArea
            value={commentText}
            onChange={(value) => setCommentText(value)}
            placeholder="添加评论... (可使用 @用户名 来提及他人)"
            style={{ flex: 1 }}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
          <Button type="primary" onClick={handleSubmitComment}>
            发送
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/daily-report/DailyReportDetail.tsx
git commit -m "feat(daily-report): add DailyReportDetail component with comments"
```

---

## Task 7: 修改 MainLayout 集成日报功能

**Files:**
- Modify: `src/app/components/MainLayout.tsx:1-240`

- [ ] **Step 1: 修改 MainLayout 添加日报模态框和未读提醒**

在 MainLayout.tsx 中:

1. 导入新增的组件和类型
2. 添加状态管理（日报数据、评论数据、未读状态）
3. 在顶部导航的日报菜单添加红点 badge（当有未读评论时显示）
4. 集成 DailyReportModal

```typescript
// 在 MainLayout.tsx 顶部添加导入
import { DailyReportModal } from '../pages/daily-report/DailyReportModal';
import { DailyReport, DailyReportComment } from '../pages/daily-report/types';
import { mockUsers } from '../pages/daily-report/templateConfig';

// 在组件内添加状态
const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
const [comments, setComments] = useState<DailyReportComment[]>([]);
const [hasUnreadComments, setHasUnreadComments] = useState(false);

// 当前用户（模拟）
const currentUserId = 'user-sales-zhangsan';

// 处理日报提交
const handleDailyReportSubmit = (report: DailyReport) => {
  setDailyReports([report, ...dailyReports]);
};

// 处理评论提交
const handleAddComment = (reportId: string, content: string, mentionedUsers: string[]) => {
  const user = mockUsers.find(u => u.id === currentUserId);
  const newComment: DailyReportComment = {
    id: `comment-${Date.now()}`,
    reportId,
    userId: currentUserId,
    userName: user?.name || '未知',
    content,
    mentionedUsers,
    createdAt: new Date().toISOString(),
    readBy: [currentUserId],
  };
  setComments([...comments, newComment]);
  setHasUnreadComments(true);
};

// 在菜单项中添加未读提醒
// 修改 dailyreport 菜单项为包含 badge 的元素
```

具体修改：找到菜单定义中 `key: 'dailyreport'` 的 SubMenu，将其包装并添加 Badge 状态判断。

- [ ] **Step 2: Commit**

```bash
git add src/app/components/MainLayout.tsx
git commit -m "feat(daily-report): integrate daily report modal in MainLayout"
```

---

## Task 8: 修改日报列表页面

**Files:**
- Modify: `src/app/pages/DailyReportList.tsx:1-228`

- [ ] **Step 1: 修改日报列表页面支持评论入口**

在 DailyReportList.tsx 中:

1. 导入 DailyReportDetail 和类型
2. 添加状态管理
3. 在"查看详情"按钮点击时打开详情模态框
4. 列表项显示未读评论红点

```typescript
// 添加导入
import { DailyReportDetail } from './daily-report/DailyReportDetail';
import { DailyReport, DailyReportComment } from './daily-report/types';

// 添加状态
const [detailVisible, setDetailVisible] = useState(false);
const [comments, setComments] = useState<DailyReportComment[]>([]);

// 添加评论处理
const handleAddComment = (reportId: string, content: string, mentionedUsers: string[]) => {
  // 同 Task 6
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/DailyReportList.tsx
git commit -m "feat(daily-report): update DailyReportList with comment support"
```

---

## Task 9: 修改日报视图页面

**Files:**
- Modify: `src/app/pages/DailyReportView.tsx`

- [ ] **Step 1: 修改日报视图页面添加评论功能**

类似于 Task 8，添加评论功能到日报视图页面。

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/DailyReportView.tsx
git commit -m "feat(daily-report): update DailyReportView with comment support"
```

---

## Task 10: 添加未提交提醒（18:00后红色问号）

**Files:**
- Modify: `src/app/components/MainLayout.tsx`

- [ ] **Step 1: 实现未提交提醒逻辑**

在 MainLayout 中添加：

```typescript
// 检查是否需要显示未提交提醒
const [showUnsubmittedBadge, setShowUnsubmittedBadge] = useState(false);

useEffect(() => {
  const checkUnsubmittedReport = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // 仅在18:00后检查
    if (hour >= 18) {
      // 检查今日是否已提交日报
      const today = now.toISOString().split('T')[0];
      const hasSubmittedToday = dailyReports.some(
        r => r.userId === currentUserId && r.reportDate === today
      );
      setShowUnsubmittedBadge(!hasSubmittedToday);
    } else {
      setShowUnsubmittedBadge(false);
    }
  };

  checkUnsubmittedReport();
  // 每分钟检查一次
  const interval = setInterval(checkUnsubmittedReport, 60000);
  return () => clearInterval(interval);
}, [dailyReports, currentUserId]);
```

在导航栏日报图标处显示红色问号 badge：

```tsx
<Badge count={showUnsubmittedBadge ? <IconQuestionCircle style={{ color: 'red' }} /> : 0} size="small">
  <IconCalendar />
</Badge>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/MainLayout.tsx
git commit -m "feat(daily-report): add 6pm unsubmitted report reminder badge"
```

---

## 实现顺序

1. Task 1 - 类型定义
2. Task 2 - 模板配置
3. Task 3 - 销售日报模板
4. Task 4 - 通用日报模板
5. Task 5 - 日报提交模态框
6. Task 6 - 日报详情（评论功能）
7. Task 7 - 集成到 MainLayout
8. Task 8 - 日报列表
9. Task 9 - 日报视图
10. Task 10 - 未提交提醒

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-14-daily-report-template-implementation.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?