// src/app/pages/daily-report/DailyReportDetail.tsx

import { useState } from 'react';
import { Modal, Descriptions, Card, Typography, Input, Button, Avatar, Tag, Table } from '@arco-design/web-react';
import { AdDeliveryReportContent, AdDeliveryWorkItem, DailyReport, DailyReportComment, SalesReportContent, GeneralReportContent, LeadTrackingItem, ProjectTask, SalesWorkItem } from './types';
import { getWorkAttributionDisplayLabel } from './workAttribution';

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
    const mentionedUsers = extractMentionedUsers(commentText);
    onAddComment(report.id, commentText, mentionedUsers);
    setCommentText('');
  };

  const extractMentionedUsers = (text: string): string[] => {
    const regex = /@(\S+)/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return matches.map(m => m.substring(1));
  };

  const renderSalesContent = (content: SalesReportContent) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {content['work-items'] && content['work-items'].length > 0 && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>销售工作项</Text>
          <Table
            columns={[
              {
                title: '工作归属',
                dataIndex: 'workAttributionType',
                render: (_: unknown, record: SalesWorkItem) => getWorkAttributionDisplayLabel(
                  record.workAttributionCategory,
                  record.workAttributionType || (record.type === 'project' ? 'external-project' : 'presales-lead'),
                ),
              },
              { title: '关联对象', dataIndex: 'relationName', render: (_: unknown, record: SalesWorkItem) => record.relationName || record.projectName || record.leadName || '-' },
              { title: '工作性质', dataIndex: 'workNature', render: (value) => value || '-' },
              { title: '工作内容', dataIndex: 'content' },
              { title: '风险反馈', dataIndex: 'riskFeedback', render: (value) => value || '-' },
              { title: '工时(h)', dataIndex: 'hours', width: 90 },
            ]}
            data={content['work-items']}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      )}
      {content['lead-tracking'] && content['lead-tracking'].length > 0 && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>线索跟进情况</Text>
          {content['lead-tracking'].map((item: LeadTrackingItem) => (
            <Card key={item.leadId} size="small" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag color={item.level === 'S' ? 'red' : item.level === 'A' ? 'orange' : item.level === 'B' ? 'blue' : 'green'}>
                  {item.level}
                </Tag>
                <Text strong>{item.leadName}</Text>
              </div>
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
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>任务明细</Text>
          <Table
            columns={[
              {
                title: '工作归属',
                dataIndex: 'workAttributionType',
                render: (_: unknown, record: ProjectTask) => record.workAttributionType
                  ? getWorkAttributionDisplayLabel(record.workAttributionCategory, record.workAttributionType)
                  : '-',
              },
              { title: '关联对象', dataIndex: 'relationName', render: (_: unknown, record: ProjectTask) => record.relationName || record.projectName || '-' },
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

  const renderAdDeliveryContent = (content: AdDeliveryReportContent) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {content['work-items'] && content['work-items'].length > 0 && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>工作项</Text>
          <Table
            columns={[
              {
                title: '类型',
                dataIndex: 'type',
                render: (value) => value === 'lead' ? '线索相关' : value === 'project' ? '项目相关' : value === 'ad' || value === 'ad-account' ? '新媒体投放' : value === 'content' ? '新媒体内容' : value === 'recruiting' ? '招聘' : value === 'management' ? '管理工作' : '其他',
              },
              {
                title: '工作归属',
                dataIndex: 'workAttributionType',
                render: (_: unknown, record: AdDeliveryWorkItem) => record.workAttributionType
                  ? getWorkAttributionDisplayLabel(record.workAttributionCategory, record.workAttributionType)
                  : '-',
              },
              {
                title: '关联对象',
                dataIndex: 'relationName',
                render: (_: unknown, record: AdDeliveryWorkItem) => record.relationName || record.projectName || record.position || record.managementType || '-',
              },
              {
                title: '补充信息',
                dataIndex: 'channel',
                render: (_: unknown, record: AdDeliveryWorkItem) => record.type === 'ad' || record.type === 'ad-account'
                  ? `${record.channel || '-'} / ${record.account || '-'} / ¥${record.spend || 0} / ${record.totalLeads || 0}-${record.validLeads || 0}`
                  : record.type === 'content'
                    ? `${record.channel || '-'} / ${record.quantity || 0}`
                    : record.type === 'recruiting'
                      ? `${record.recruitStage || '-'} / ${record.candidateCount || 0}-${record.interviewCount || 0}`
                      : '-',
              },
              { title: '工作内容', dataIndex: 'content' },
              { title: '工时(h)', dataIndex: 'hours', width: 90 },
            ]}
            data={content['work-items']}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      )}
      {content['today-summary'] && (
        <div>
          <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>工作内容</Text>
          <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
            {content['today-summary']}
          </div>
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

  const renderContent = () => {
    if (report.templateType === 'sales') {
      return renderSalesContent(report.content as SalesReportContent);
    }
    if (report.templateType === 'ad-delivery') {
      return renderAdDeliveryContent(report.content as AdDeliveryReportContent);
    }
    return renderGeneralContent(report.content as GeneralReportContent);
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
