import type { ReactNode } from 'react';
import { Button, Card, Input, InputNumber, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { IconDelete } from '@arco-design/web-react/icon';
import { AdDeliveryReportContent, AdDeliveryWorkItem, WorkAttributionCategory } from './types';
import { WorkAttributionSelector } from './WorkAttributionSelector';
import { getWorkAttributionTypeForCategory } from './workAttribution';

const { Text } = Typography;
const SelectOption = Select.Option;

const CHANNEL_OPTIONS = ['威客', '百度', '小红书', '抖音', '必应', '淘宝', '互站', '豆包'];
const CONTENT_CHANNEL_OPTIONS = ['小红书', '公众号', '抖音', '其他'];
const ACCOUNT_OPTIONS = ['软艺', '百度软艺', '中科软通', '中科软盈'];
const RECRUIT_STAGE_OPTIONS = ['简历筛选', '初筛沟通', '面试安排', '面试反馈', '入职跟进'];
const MANAGEMENT_OPTIONS = ['团队沟通', '任务安排', '进度跟进', '会议', '流程制度', '其他'];

const ADD_ITEMS = [
  { key: 'lead', label: '线索相关' },
  { key: 'project', label: '项目相关' },
  { key: 'ad', label: '新媒体投放' },
  { key: 'content', label: '新媒体内容' },
  { key: 'recruiting', label: '招聘' },
  { key: 'management', label: '管理工作' },
  { key: 'other', label: '其他' },
];

function createWorkItem(type: AdDeliveryWorkItem['type']): AdDeliveryWorkItem {
  const workAttributionCategory: WorkAttributionCategory = type === 'lead'
    ? 'software-presales'
    : type === 'project'
      ? 'development'
      : type === 'ad' || type === 'content' || type === 'ad-account'
        ? 'promotion'
        : 'operations';
  return {
    id: `work-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    workAttributionCategory,
    workAttributionType: getWorkAttributionTypeForCategory(workAttributionCategory),
    content: '',
    hours: 0,
    spend: 0,
    totalLeads: 0,
    validLeads: 0,
  };
}

function getTypeLabel(type: AdDeliveryWorkItem['type']) {
  if (type === 'lead') return '线索相关';
  if (type === 'project') return '项目相关';
  if (type === 'ad' || type === 'ad-account') return '新媒体投放';
  if (type === 'content') return '新媒体内容';
  if (type === 'recruiting') return '招聘';
  if (type === 'management') return '管理工作';
  return '其他';
}

interface Props {
  content: AdDeliveryReportContent;
  department?: string;
  onChange: (content: AdDeliveryReportContent) => void;
  omitFollowUpFields?: boolean;
}

export function AdDeliveryDailyTemplate({ content, department, onChange, omitFollowUpFields = false }: Props) {
  const workItems = content['work-items'] || [];

  const updateContent = (patch: Partial<AdDeliveryReportContent>) => {
    onChange({ ...content, ...patch });
  };

  const updateWorkItems = (items: AdDeliveryWorkItem[]) => {
    updateContent({ 'work-items': items });
  };

  const updateWorkItem = (id: string, patch: Partial<AdDeliveryWorkItem>) => {
    updateWorkItems(workItems.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const addWorkItem = (type: string) => {
    updateWorkItems([...workItems, createWorkItem(type as AdDeliveryWorkItem['type'])]);
  };

  const removeWorkItem = (id: string) => {
    updateWorkItems(workItems.filter(item => item.id !== id));
  };

  const renderField = (label: string, control: ReactNode) => (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>{label}：</div>
      {control}
    </div>
  );

  const renderSelect = (value: string | undefined, placeholder: string, options: string[], onChangeValue: (value: string) => void) => (
    <Select placeholder={placeholder} value={value} onChange={onChangeValue} style={{ width: '100%' }}>
      {options.map(option => (
        <SelectOption key={option} value={option}>{option}</SelectOption>
      ))}
    </Select>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>工作项</Text>
        <Space size={8} style={{ marginLeft: 'auto' }}>
          {ADD_ITEMS.map(item => (
            <Button key={item.key} size="mini" onClick={() => addWorkItem(item.key)}>
              {item.label}
            </Button>
          ))}
        </Space>
      </div>

      <Text type="secondary" style={{ fontSize: 12 }}>
        根据不同类型（线索、项目、新媒体投放、内容、招聘、管理等），选择对应工作项并填写渠道、账户、消耗、客资等信息和工时。
      </Text>

      {workItems.length === 0 && (
        <Card size="small" style={{ background: 'var(--color-fill-2)' }}>
          <Text type="secondary">请选择一个工作项类型开始填写</Text>
        </Card>
      )}

      {workItems.map((item, index) => (
        <Card
          key={item.id}
          size="small"
          title={<Space><span>工作项 {index + 1}</span><Tag color={item.type === 'ad' || item.type === 'ad-account' ? 'orange' : 'gray'}>{getTypeLabel(item.type)}</Tag></Space>}
          extra={<Button type="text" status="danger" size="small" icon={<IconDelete />} onClick={() => removeWorkItem(item.id)} />}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px', gap: 12, marginBottom: 12 }}>
            {renderField('工作归属', (
              <WorkAttributionSelector
                department={department}
                value={{
                  category: item.workAttributionCategory,
                  type: item.workAttributionType
                    || (item.type === 'lead'
                      ? 'presales-lead'
                      : item.type === 'project'
                        ? 'external-project'
                        : 'department-routine'),
                  relationId: item.relationId,
                  relationName: item.relationName || item.projectName,
                }}
                onChange={value => updateWorkItem(item.id, {
                  workAttributionCategory: value.category,
                  workAttributionType: value.type,
                  relationId: value.relationId,
                  relationName: value.relationName,
                  projectName: value.relationName,
                })}
              />
            ))}
            {renderField('工时', <InputNumber min={0} step={0.5} precision={1} value={item.hours} onChange={(value) => updateWorkItem(item.id, { hours: Number(value) || 0 })} placeholder="工时" style={{ width: '100%' }} />)}
          </div>

          {(item.type === 'ad' || item.type === 'ad-account') && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
                {renderField('渠道', renderSelect(item.channel, '选择渠道', CHANNEL_OPTIONS, (value) => updateWorkItem(item.id, { channel: value })))}
                {renderField('账户', renderSelect(item.account, '选择账户', ACCOUNT_OPTIONS, (value) => updateWorkItem(item.id, { account: value })))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
                {renderField('消耗金额', <InputNumber min={0} value={item.spend || 0} onChange={(value) => updateWorkItem(item.id, { spend: Number(value) || 0 })} placeholder="消耗金额" style={{ width: '100%' }} />)}
                {renderField('总客资数', <InputNumber min={0} value={item.totalLeads || 0} onChange={(value) => updateWorkItem(item.id, { totalLeads: Number(value) || 0 })} placeholder="总客资数" style={{ width: '100%' }} />)}
                {renderField('有效客资数', <InputNumber min={0} value={item.validLeads || 0} onChange={(value) => updateWorkItem(item.id, { validLeads: Number(value) || 0 })} placeholder="有效客资数" style={{ width: '100%' }} />)}
              </div>
            </>
          )}

          {item.type === 'content' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, marginBottom: 12 }}>
                {renderField('渠道', renderSelect(item.channel, '选择渠道', CONTENT_CHANNEL_OPTIONS, (value) => updateWorkItem(item.id, { channel: value })))}
                {renderField('数量', <InputNumber min={0} step={1} precision={0} value={item.quantity} onChange={(value) => updateWorkItem(item.id, { quantity: value == null ? undefined : Math.max(0, Math.trunc(Number(value) || 0)) })} placeholder="数量" style={{ width: '100%' }} />)}
              </div>
            </>
          )}

          {item.type === 'recruiting' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {renderField('招聘岗位', <Input value={item.position || ''} onChange={(value) => updateWorkItem(item.id, { position: value })} placeholder="请输入岗位" />)}
                {renderField('招聘阶段', renderSelect(item.recruitStage, '选择阶段', RECRUIT_STAGE_OPTIONS, (value) => updateWorkItem(item.id, { recruitStage: value })))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 120px)', gap: 12, marginBottom: 12 }}>
                {renderField('候选人数', <InputNumber min={0} step={1} precision={0} value={item.candidateCount} onChange={(value) => updateWorkItem(item.id, { candidateCount: value == null ? undefined : Math.max(0, Math.trunc(Number(value) || 0)) })} placeholder="人数" style={{ width: '100%' }} />)}
                {renderField('面试人数', <InputNumber min={0} step={1} precision={0} value={item.interviewCount} onChange={(value) => updateWorkItem(item.id, { interviewCount: value == null ? undefined : Math.max(0, Math.trunc(Number(value) || 0)) })} placeholder="人数" style={{ width: '100%' }} />)}
              </div>
            </>
          )}

          {item.type === 'management' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
              {renderField('管理事项', renderSelect(item.managementType, '选择事项', MANAGEMENT_OPTIONS, (value) => updateWorkItem(item.id, { managementType: value })))}
            </div>
          )}

          {renderField('工作内容', (
            <Input.TextArea
              value={item.content}
              onChange={(value) => updateWorkItem(item.id, { content: value })}
              placeholder="请输入工作内容"
              autoSize={{ minRows: 2, maxRows: 5 }}
            />
          ))}
        </Card>
      ))}

      {!omitFollowUpFields && <Card size="small" title="需协助事项" bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          value={content['assistance-needed'] || ''}
          onChange={(value) => updateContent({ 'assistance-needed': value })}
          placeholder="请输入需要协助的事项"
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Card>}

      {!omitFollowUpFields && <Card size="small" title={<span>明日工作计划 <span style={{ color: 'red' }}>*</span></span>} bodyStyle={{ padding: '12px 16px' }}>
        <Input.TextArea
          value={content['tomorrow-plan'] || ''}
          onChange={(value) => updateContent({ 'tomorrow-plan': value })}
          placeholder="请输入明日工作计划（必填）"
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Card>}
    </Space>
  );
}
