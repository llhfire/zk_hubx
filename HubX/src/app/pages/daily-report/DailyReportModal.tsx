// src/app/pages/daily-report/DailyReportModal.tsx

import { useState, useEffect, useRef } from 'react';
import { DatePicker, Modal, Message, Select } from '@arco-design/web-react';
import { SalesDailyTemplate } from './SalesDailyTemplate';
import { GeneralDailyTemplate } from './GeneralDailyTemplate';
import { AdDeliveryDailyTemplate } from './AdDeliveryDailyTemplate';
import { DevDailyTemplate } from './DevDailyTemplate';
import { getDailyReportRuleForUser, mockUsers } from './templateConfig';
import {
  AdDeliveryRow,
  AdDeliveryWorkItem,
  DailyCostBucket,
  DailyReport,
  DailyReportContent,
  DailyReportRule,
  DailyReportTask,
  DailyTemplateType,
  AdDeliveryReportContent,
  DevReportContent,
  GeneralReportContent,
  LeadTrackingItem,
  ProjectTask,
  SalesReportContent,
  SalesWorkItem,
  WorkAttributionCategory,
  WorkAttributionType,
  WorkKind,
} from './types';
import { getWorkAttributionAccounting } from './workAttribution';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (report: DailyReport) => void;
  currentUserId?: string;
  defaultRole?: DailyTemplateType;
  recentReports?: DailyReport[];
  backfill?: boolean;
}

interface DailyReportSessionState {
  reportDate: Date;
  content: DailyReportContent;
}

function createInitialContent(
  templateType: DailyTemplateType,
  currentUserId: string,
  date: Date,
): DailyReportContent {
  if (templateType === 'sales') {
    return {
      'work-items': [{
        id: `sales-work-${Date.now()}`,
        type: 'lead',
        workAttributionCategory: 'software-presales',
        workAttributionType: 'presales-lead',
        content: '',
        hours: 0,
      }],
      'assistance-needed': '',
      'tomorrow-plan': '',
    };
  }
  if (templateType === 'ad-delivery') {
    return {
      'work-items': [],
      'assistance-needed': '',
      'tomorrow-plan': '',
    };
  }
  if (templateType === 'dev') {
    return {
      'work-kind': 'dev-coding',
      'project-tasks': [],
      'code-progress': '',
      'problems-encountered': '',
      'tomorrow-plan': '',
    };
  }
  return {
    'work-kind': 'dev-coding',
    'project-tasks': [],
    'today-summary': '',
    'problems-encountered': '',
    'tomorrow-plan': '',
  };
}

function createSessionState(
  templateType: DailyTemplateType,
  currentUserId: string,
  reportDate: Date,
): DailyReportSessionState {
  return {
    reportDate,
    content: createInitialContent(templateType, currentUserId, reportDate),
  };
}

function normalizeHours(value: unknown) {
  const hours = Number(value || 0);
  return Number.isFinite(hours) ? hours : 0;
}

function formatDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isTodayOrFuture(value: unknown) {
  const candidate = value instanceof Date ? value : new Date(String(value));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return candidate.getTime() >= today.getTime();
}

function getDefaultReportDate(backfill: boolean) {
  const date = new Date();
  if (backfill) date.setDate(date.getDate() - 1);
  return date;
}

function getSalesAttributionType(item: SalesWorkItem): WorkAttributionType {
  return item.workAttributionType || (item.type === 'lead' ? 'presales-lead' : 'external-project');
}

function getAdAttributionType(item: AdDeliveryWorkItem): WorkAttributionType {
  if (item.workAttributionType) return item.workAttributionType;
  if (item.type === 'lead') return 'presales-lead';
  if (item.type === 'project') return 'external-project';
  return 'department-routine';
}

function validateSalesContent(content: SalesReportContent) {
  const items = content['work-items'] || [];
  const activeItems = items.filter(item => normalizeHours(item.hours) > 0 || item.content.trim() || item.relationId || item.leadId || item.projectId || item.workNature || item.riskFeedback);
  const invalid = activeItems.find(item =>
    !(item.relationId || item.leadId || item.projectId) ||
    !item.workNature ||
    !item.content.trim() ||
    normalizeHours(item.hours) <= 0
  );

  if (!invalid) return '';
  if (!(invalid.relationId || invalid.leadId || invalid.projectId)) return '请选择工作归属';
  if (!invalid.workNature) return '请选择工作性质';
  if (!invalid.content.trim()) return '请填写工作内容';
  return '请填写工作项工时';
}

function validateAdDeliveryContent(content: AdDeliveryReportContent) {
  const items = content['work-items'] || [];
  const activeItems = items.filter(item =>
    normalizeHours(item.hours) > 0 ||
    !!item.relationId ||
    !!item.projectName ||
    !!item.channel ||
    !!item.quantity ||
    !!item.position ||
    !!item.recruitStage ||
    !!item.managementType ||
    !!item.account ||
    item.content.trim() ||
    !!item.spend ||
    !!item.totalLeads ||
    !!item.validLeads
  );
  const invalid = activeItems.find(item =>
    !item.relationId ||
    (item.type === 'lead' && (!item.content.trim() || normalizeHours(item.hours) <= 0)) ||
    (item.type === 'project' && (!item.content.trim() || normalizeHours(item.hours) <= 0)) ||
    ((item.type === 'ad' || item.type === 'ad-account') && (!item.channel || !item.account || !item.content.trim() || normalizeHours(item.hours) <= 0)) ||
    (item.type === 'content' && (!item.channel || !item.quantity || !item.content.trim() || normalizeHours(item.hours) <= 0)) ||
    (item.type === 'recruiting' && (!item.position || !item.recruitStage || !item.content.trim() || normalizeHours(item.hours) <= 0)) ||
    (item.type === 'management' && (!item.managementType || !item.content.trim() || normalizeHours(item.hours) <= 0)) ||
    (item.type === 'other' && (!item.content.trim() || normalizeHours(item.hours) <= 0))
  );

  if (!invalid) return '';
  if (!invalid.relationId) return '请选择工作归属';
  if (invalid.type === 'lead') return '请完善线索相关工作项';
  if (invalid.type === 'project') return '请完善项目相关工作项';
  if (invalid.type === 'ad' || invalid.type === 'ad-account') return '请完善投放工作项';
  if (invalid.type === 'content') return '请完善内容制作工作项';
  if (invalid.type === 'recruiting') return '请完善招聘工作项';
  if (invalid.type === 'management') return '请完善管理工作项';
  if (!invalid.content.trim()) return '请填写工作内容';
  return '请填写工作项工时';
}

function validateProjectTasks(content: DevReportContent | GeneralReportContent) {
  const items = content['project-tasks'] || [];
  const activeItems = items.filter(item =>
    normalizeHours(item.hours) > 0 || item.description.trim() || item.taskForm?.trim() || item.relationId,
  );
  return activeItems.some(item => !item.relationId) ? '请选择工作归属' : '';
}

function buildTask(
  report: Omit<DailyReport, 'tasks'>,
  rule: DailyReportRule,
  index: number,
  task: {
    relationType: DailyReportTask['relationType'];
    relationId: string;
    relationName: string;
    workKind: WorkKind;
    content: string;
    hours: number;
    workAttributionCategory?: WorkAttributionCategory;
    workAttributionType?: WorkAttributionType;
    costBucket?: DailyCostBucket;
  },
): DailyReportTask {
  return {
    id: `${report.id}-task-${index + 1}`,
    reportId: report.id,
    userId: report.userId,
    userName: report.userName,
    department: report.department,
    reportDate: report.reportDate,
    templateType: report.templateType,
    workAttributionCategory: task.workAttributionCategory,
    workAttributionType: task.workAttributionType,
    relationType: task.relationType,
    relationId: task.relationId,
    relationName: task.relationName,
    workKind: task.workKind,
    content: task.content,
    hours: task.hours,
    costBucket: task.costBucket || rule.costBucket,
  };
}

function buildDailyReportTasks(
  report: Omit<DailyReport, 'tasks'>,
  content: DailyReportContent,
  rule: DailyReportRule,
): DailyReportTask[] {
  if (report.templateType === 'sales') {
    const salesContent = content as SalesReportContent;
    const workItems = (salesContent['work-items'] || []) as SalesWorkItem[];
    if (workItems.length) {
      return workItems
        .filter(item => normalizeHours(item.hours) > 0)
        .map((item, index) => {
          const workAttributionType = getSalesAttributionType(item);
          const accounting = getWorkAttributionAccounting(workAttributionType);
          const relationId = item.relationId || item.leadId || item.projectId || '';
          const relationName = item.relationName || item.leadName || item.projectName || '关联对象';
          return buildTask(report, rule, index, {
            workAttributionCategory: item.workAttributionCategory,
            workAttributionType,
            relationType: accounting.relationType,
            relationId,
            relationName,
            workKind: workAttributionType === 'presales-lead' ? 'requirement' : 'project-mgmt',
            content: [`工作性质：${item.workNature || '-'}`, item.riskFeedback ? `风险/异常反馈：${item.riskFeedback}` : '', item.content].filter(Boolean).join('\n'),
            hours: normalizeHours(item.hours),
            costBucket: accounting.costBucket,
          });
        });
    }

    const leads = (salesContent['lead-tracking'] || []) as LeadTrackingItem[];
    return leads
      .filter(item => normalizeHours(item.hours) > 0)
      .map((item, index) => buildTask(report, rule, index, {
        relationType: 'lead',
        relationId: item.leadId,
        relationName: item.leadName,
        workKind: 'requirement',
        content: item.followRecords.join('\n') || '售前跟进',
        hours: normalizeHours(item.hours),
        costBucket: 'lead-pending',
      }));
  }

  if (report.templateType === 'ad-delivery') {
    const adContent = content as AdDeliveryReportContent;
    const workItems = (adContent['work-items'] || []) as AdDeliveryWorkItem[];
    if (workItems.length) {
      return workItems
        .filter(item => normalizeHours(item.hours) > 0)
        .map((item, index) => {
          const itemType = item.type === 'ad-account' ? 'ad' : item.type;
          const isAd = itemType === 'ad';
          const workAttributionType = getAdAttributionType(item);
          const accounting = getWorkAttributionAccounting(workAttributionType);
          const metaMap = {
            lead: `线索：${item.relationName || '-'}`,
            project: `项目：${item.relationName || '-'}`,
            ad: `归属：${item.relationName || '-'}，渠道：${item.channel || '-'}，账户：${item.account || '-'}，消耗金额：${item.spend || 0}，总客资数：${item.totalLeads || 0}，有效客资数：${item.validLeads || 0}`,
            content: `归属：${item.relationName || '-'}，渠道：${item.channel || '-'}，数量：${item.quantity || '-'}，新媒体内容`,
            recruiting: `招聘岗位：${item.position || '-'}，阶段：${item.recruitStage || '-'}，候选人数：${item.candidateCount || 0}，面试人数：${item.interviewCount || 0}`,
            management: `管理事项：${item.managementType || '-'}`,
            other: '其他工作',
          } as Record<string, string>;
          return buildTask(report, rule, index, {
            workAttributionCategory: item.workAttributionCategory,
            workAttributionType,
            relationType: accounting.relationType,
            relationId: item.relationId || item.id,
            relationName: item.relationName || item.projectName || '关联对象',
            workKind: itemType === 'lead' ? 'requirement' : itemType === 'project' ? 'project-mgmt' : isAd ? 'ad-optimization' : itemType === 'content' ? 'doc-writing' : itemType === 'recruiting' ? 'meeting' : 'data-analysis',
            content: [metaMap[itemType], item.content].filter(Boolean).join('\n'),
            hours: normalizeHours(item.hours),
            costBucket: accounting.costBucket,
          });
        });
    }

    const rows = (adContent['ad-delivery-data'] || []) as AdDeliveryRow[];
    return rows
      .filter(row => normalizeHours(row.hours) > 0)
      .map((row, index) => buildTask(report, rule, index, {
        relationType: 'ad-account',
        relationId: row.id,
        relationName: `${row.platform || '投放平台'}-${row.account || '账户'}`,
        workKind: 'ad-optimization',
        content: `消耗 ${row.spend || 0} 元，线索 ${row.leads || 0} 条`,
        hours: normalizeHours(row.hours),
        costBucket: 'ad-operation',
      }));
  }

  const projectTasks = ((content as DevReportContent | GeneralReportContent)['project-tasks'] || []) as ProjectTask[];
  return projectTasks
    .filter(item => normalizeHours(item.hours) > 0)
    .map((item, index) => {
      const workAttributionType = item.workAttributionType
        || (report.templateType === 'general' ? 'department-routine' : 'external-project');
      const accounting = getWorkAttributionAccounting(workAttributionType);
      return buildTask(report, rule, index, {
        workAttributionCategory: item.workAttributionCategory,
        workAttributionType,
        relationType: accounting.relationType,
        relationId: item.relationId || item.projectName || 'operation',
        relationName: item.relationName || item.projectName || '公司运营',
        workKind: item.workKind || ((content as DevReportContent | GeneralReportContent)['work-kind'] as WorkKind) || 'dev-coding',
        content: item.description || item.taskForm || '日报任务',
        hours: normalizeHours(item.hours),
        costBucket: accounting.costBucket,
      });
    });
}

export function DailyReportModal({ visible, onCancel, onSubmit, currentUserId = 'user-sales-zhangsan', defaultRole, recentReports = [], backfill = false }: Props) {
  const currentRule: DailyReportRule = {
    position: '统一日报',
    templateType: 'ad-delivery',
    relationTypes: ['lead', 'project', 'ad-account', 'operation'],
    workKinds: ['requirement', 'project-mgmt', 'ad-optimization', 'doc-writing', 'meeting', 'data-analysis'],
    costBucket: 'operation',
    requireRelation: false,
  };
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUserId);
  const effectiveUserId = backfill ? selectedEmployeeId : currentUserId;
  const currentTemplateType: DailyTemplateType = backfill
    ? (defaultRole || getDailyReportRuleForUser(currentUserId).templateType)
    : (defaultRole || 'ad-delivery');
  const currentUser = mockUsers.find(u => u.id === effectiveUserId);
  const [sessionState, setSessionState] = useState<DailyReportSessionState>(() =>
    createSessionState(currentTemplateType, currentUserId, getDefaultReportDate(backfill)),
  );
  const wasVisibleRef = useRef(visible);
  const openingSessionRef = useRef<DailyReportSessionState | null>(null);

  if (visible && !wasVisibleRef.current && openingSessionRef.current === null) {
    const openingUserId = backfill ? currentUserId : effectiveUserId;
    const openingTemplateType = currentTemplateType;
    openingSessionRef.current = createSessionState(openingTemplateType, openingUserId, getDefaultReportDate(backfill));
  }
  if (!visible && openingSessionRef.current !== null) {
    openingSessionRef.current = null;
  }

  const currentSessionState = openingSessionRef.current ?? sessionState;
  const { reportDate, content } = currentSessionState;

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      const nextUserId = backfill ? currentUserId : effectiveUserId;
      setSelectedEmployeeId(nextUserId);
      setSessionState(createSessionState(currentTemplateType, nextUserId, getDefaultReportDate(backfill)));
    }
    if (openingSessionRef.current) {
      setSessionState(openingSessionRef.current);
      openingSessionRef.current = null;
    }
    wasVisibleRef.current = visible;
  }, [visible]);

  const handleContentChange = (newContent: DailyReportContent) => {
    setSessionState(prev => ({ ...prev, content: newContent }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
  };

  const handleDateChange = (value: string | undefined) => {
    if (!value) return;
    const [year, month, day] = value.split('-').map(Number);
    setSessionState(prev => ({ ...prev, reportDate: new Date(year, month - 1, day) }));
  };

  const handleSubmit = () => {
    if (!backfill && !content?.['tomorrow-plan']) {
      Message.warning('请填写明日工作计划（必填）');
      return;
    }
    if (currentTemplateType === 'sales') {
      const salesError = validateSalesContent(content as SalesReportContent);
      if (salesError) {
        Message.warning(salesError);
        return;
      }
    }
    if (currentTemplateType === 'ad-delivery') {
      const adError = validateAdDeliveryContent(content as AdDeliveryReportContent);
      if (adError) {
        Message.warning(adError);
        return;
      }
    }
    if (currentTemplateType === 'dev' || currentTemplateType === 'general') {
      const attributionError = validateProjectTasks(
        content as DevReportContent | GeneralReportContent,
      );
      if (attributionError) {
        Message.warning(attributionError);
        return;
      }
    }

    const templateIdMap: Record<DailyTemplateType, string> = {
      sales: 'sales-template-default',
      'ad-delivery': 'ad-delivery-template-default',
      dev: 'dev-template-default',
      general: 'general-template-default',
    };
    const submittedContent = backfill
      ? Object.fromEntries(Object.entries(content).filter(([key]) => key !== 'assistance-needed' && key !== 'tomorrow-plan')) as DailyReportContent
      : content;

    const reportBase: Omit<DailyReport, 'tasks'> = {
      id: `report-${Date.now()}`,
      userId: effectiveUserId,
      userName: currentUser?.name || '未知用户',
      department: currentUser?.department || '未知部门',
      reportDate: formatDate(reportDate),
      templateId: templateIdMap[currentTemplateType],
      templateType: currentTemplateType,
      content: submittedContent,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const tasks = buildDailyReportTasks(reportBase, submittedContent, currentRule);
    const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);

    if (tasks.length === 0) {
      Message.warning('请至少填写一条任务明细和工时');
      return;
    }
    if (!backfill && totalHours > 24) {
      Message.warning('单日工时不能超过 24 小时');
      return;
    }
    if (!backfill && totalHours > 12 && !window.confirm(`今日合计 ${totalHours} 小时，确认继续提交吗？`)) {
      return;
    }

    const report: DailyReport = {
      ...reportBase,
      tasks,
    };

    onSubmit(report);
    Message.success('日报提交成功');
    onCancel();
  };

  const renderTemplate = () => {
    switch (currentTemplateType) {
      case 'sales':
        return <SalesDailyTemplate userId={effectiveUserId} date={reportDate} department={currentUser?.department} initialContent={content as SalesReportContent} recentReports={recentReports} onChange={handleContentChange} omitFollowUpFields={backfill} omitRiskFeedback={backfill} />;
      case 'ad-delivery':
        return <AdDeliveryDailyTemplate department={currentUser?.department} content={content as AdDeliveryReportContent} onChange={handleContentChange} omitFollowUpFields={backfill} />;
      case 'dev':
        return <DevDailyTemplate department={currentUser?.department} content={content as DevReportContent} onChange={handleContentChange} omitFollowUpFields={backfill} unrestrictedHours={backfill} />;
      default:
        return <GeneralDailyTemplate department={currentUser?.department} initialContent={content as GeneralReportContent | undefined} onChange={handleContentChange} omitFollowUpFields={backfill} />;
    }
  };

  return (
    <Modal
      title={backfill ? '补录日报' : '填写日报'}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={backfill ? '保存补录' : '提交日报'}
      cancelText="取消"
      style={{ width: 920, maxWidth: 'calc(100vw - 32px)' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>日期</div>
          {backfill ? (
            <DatePicker
              value={formatDate(reportDate)}
              onChange={handleDateChange}
              disabledDate={isTodayOrFuture}
              style={{ width: '100%' }}
            />
          ) : (
            <div style={{ height: 32, lineHeight: '32px', padding: '0 12px', background: 'var(--color-fill-2)', borderRadius: 4 }}>
              {formatDate(reportDate)}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>撰写人</div>
          {backfill ? (
            <Select
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
              options={mockUsers.map(user => ({ label: user.name, value: user.id }))}
              style={{ width: '100%' }}
            />
          ) : (
            <div style={{ height: 32, lineHeight: '32px', padding: '0 12px', background: 'var(--color-fill-2)', borderRadius: 4 }}>
              {currentUser?.name || '未知用户'}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>部门</div>
          <div style={{ height: 32, lineHeight: '32px', padding: '0 12px', background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {currentUser?.department || '未知部门'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>岗位</div>
          <div style={{ height: 32, lineHeight: '32px', padding: '0 12px', background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {currentUser?.position || '未知岗位'}
          </div>
        </div>
      </div>
      {renderTemplate()}
    </Modal>
  );
}
