// src/app/pages/daily-report/SalesDailyTemplate.tsx

import type { ReactNode } from 'react';
import { Button, Card, Input, InputNumber, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { IconDelete, IconPlus } from '@arco-design/web-react/icon';
import type { DailyReport, SalesReportContent, SalesWorkItem } from './types';
import { useJobWorkConfig } from './JobWorkConfigContext';
import { WorkAttributionSelector } from './WorkAttributionSelector';
import { WORK_ATTRIBUTION_CATEGORY_LABELS } from './workAttribution';

const { Text } = Typography;
const SelectOption = Select.Option;
interface Props {
  userId: string;
  date: Date;
  department?: string;
  initialContent?: SalesReportContent;
  recentReports?: DailyReport[];
  onChange: (content: SalesReportContent) => void;
  omitFollowUpFields?: boolean;
  omitRiskFeedback?: boolean;
}

function createWorkItem(): SalesWorkItem {
  return {
    id: `sales-work-${Date.now()}`,
    type: 'lead',
    workAttributionCategory: 'software-presales',
    workAttributionType: 'presales-lead',
    content: '',
    hours: 0,
  };
}

export function getRecentWorkRecords(reports: DailyReport[], userId: string) {
  const records = reports
    .filter(report => report.userId === userId && report.templateType === 'sales')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .flatMap(report => (report.content as SalesReportContent)['work-items'] || [])
    .map(item => {
      const attribution = item.workAttributionCategory
        ? WORK_ATTRIBUTION_CATEGORY_LABELS[item.workAttributionCategory]
        : '';
      const project = item.relationName || item.leadName || item.projectName || '';
      const label = attribution && project && item.workNature
        ? `${attribution}/${project}/${item.workNature}`
        : '';
      return { label, item };
    })
    .filter(record => record.label);

  return [...new Map(records.map(record => [record.label, record])).values()].slice(0, 5);
}

export function getRecentWorkRecordLabels(reports: DailyReport[], userId: string) {
  return getRecentWorkRecords(reports, userId).map(record => record.label);
}

export function SalesDailyTemplate({ userId, department, initialContent, recentReports = [], onChange, omitFollowUpFields = false, omitRiskFeedback = false }: Props) {
  const { getWorkNatures } = useJobWorkConfig();
  const workNatureOptions = getWorkNatures('sales');
  const content = initialContent || {};
  const workItems = content['work-items']?.length ? content['work-items'] : [createWorkItem()];
  const recentWorkRecords = getRecentWorkRecords(recentReports, userId);

  const updateContent = (patch: Partial<SalesReportContent>) => {
    onChange({ ...content, ...patch });
  };

  const updateWorkItems = (items: SalesWorkItem[]) => {
    updateContent({ 'work-items': items });
  };

  const updateWorkItem = (id: string, patch: Partial<SalesWorkItem>) => {
    updateWorkItems(workItems.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const addWorkItem = () => {
    updateWorkItems([...workItems, createWorkItem()]);
  };

  const removeWorkItem = (id: string) => {
    updateWorkItems(workItems.length > 1 ? workItems.filter(item => item.id !== id) : [createWorkItem()]);
  };

  const renderInlineField = (label: string, control: ReactNode, required = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <div style={{ width: 120, textAlign: 'right', fontWeight: 600, color: 'var(--color-text-1)', flex: '0 0 auto' }}>
        {required && <span style={{ color: 'rgb(var(--red-6))', marginRight: 4 }}>*</span>}
        {label}：
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{control}</div>
    </div>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Text strong>工作项</Text>

      {workItems.map(item => (
        <div
          key={item.id}
          style={{
            border: '1px dashed var(--color-border-3)',
            borderRadius: 6,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {recentWorkRecords.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
              <div style={{ width: 120, textAlign: 'right', fontWeight: 600, color: 'var(--color-text-1)', lineHeight: '24px', flex: '0 0 auto' }}>
                最近记录：
              </div>
              <Space wrap size={[8, 8]} style={{ flex: 1, minWidth: 0 }}>
                {recentWorkRecords.map(record => (
                  <Tag
                    key={record.label}
                    tabIndex={0}
                    role="button"
                    style={{ cursor: 'pointer' }}
                    onClick={() => updateWorkItem(item.id, {
                      type: record.item.type,
                      workAttributionCategory: record.item.workAttributionCategory,
                      workAttributionType: record.item.workAttributionType,
                      relationId: record.item.relationId,
                      relationName: record.item.relationName,
                      leadId: record.item.leadId,
                      leadName: record.item.leadName,
                      projectId: record.item.projectId,
                      projectName: record.item.projectName,
                      workNature: record.item.workNature,
                    })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.currentTarget.click();
                      }
                    }}
                  >
                    {record.label}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 200px auto', gap: 14, alignItems: 'center' }}>
            {renderInlineField('工作归属', (
              <WorkAttributionSelector
                department={department}
                value={{
                  category: item.workAttributionCategory,
                  type: item.workAttributionType || (item.type === 'lead' ? 'presales-lead' : 'external-project'),
                  relationId: item.relationId || item.leadId || item.projectId,
                  relationName: item.relationName || item.leadName || item.projectName,
                }}
                onChange={(value) => updateWorkItem(item.id, {
                  workAttributionCategory: value.category,
                  workAttributionType: value.type,
                  relationId: value.relationId,
                  relationName: value.relationName,
                  type: value.type === 'presales-lead' ? 'lead' : 'project',
                  leadId: value.type === 'presales-lead' ? value.relationId : undefined,
                  leadName: value.type === 'presales-lead' ? value.relationName : undefined,
                  projectId: value.type !== 'presales-lead' ? value.relationId : undefined,
                  projectName: value.type !== 'presales-lead' ? value.relationName : undefined,
                })}
              />
            ), true)}
            {renderInlineField('用时（小时）', (
              <InputNumber
                min={0}
                step={0.5}
                precision={1}
                value={item.hours}
                onChange={(value) => updateWorkItem(item.id, { hours: Number(value) || 0 })}
                placeholder="用时（小时）"
                style={{ width: '100%' }}
              />
            ), true)}
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => removeWorkItem(item.id)}>
              删除
            </Button>
          </div>

          {renderInlineField('工作性质', (
            <Select
              placeholder="请选择工作性质"
              value={item.workNature}
              onChange={(value) => updateWorkItem(item.id, { workNature: value })}
              style={{ width: '100%' }}
            >
              {workNatureOptions.map(option => <SelectOption key={option} value={option}>{option}</SelectOption>)}
            </Select>
          ), true)}

          {renderInlineField('工作内容/成果', (
            <Input.TextArea
              value={item.content}
              onChange={(value) => updateWorkItem(item.id, { content: value })}
              placeholder="请输入工作内容/成果"
              maxLength={500}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          ), true)}

          {!omitRiskFeedback && renderInlineField('风险/异常反馈', (
            <Input
              value={item.riskFeedback || ''}
              onChange={(value) => updateWorkItem(item.id, { riskFeedback: value })}
              placeholder="请输入风险/异常反馈（选填）"
            />
          ))}

          <Button
            type="outline"
            icon={<IconPlus />}
            onClick={addWorkItem}
            style={{ borderStyle: 'dashed', width: '100%', justifyContent: 'center' }}
          >
            新增今日工作详情
          </Button>
        </div>
      ))}

      {!omitFollowUpFields && <Card size="small" title="需协助事项" bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          value={content['assistance-needed'] || ''}
          onChange={(value) => updateContent({ 'assistance-needed': value })}
          placeholder="请输入需要协助的事项..."
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Card>}

      {!omitFollowUpFields && <Card size="small" title={<span>明日工作计划 <span style={{ color: 'red' }}>*</span></span>} bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          value={content['tomorrow-plan'] || ''}
          onChange={(value) => updateContent({ 'tomorrow-plan': value })}
          placeholder="请输入明日工作计划（必填）..."
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Card>}
    </Space>
  );
}
