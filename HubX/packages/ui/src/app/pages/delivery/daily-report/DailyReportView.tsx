import { useState } from 'react';
import { Tree, Badge, Collapse, DatePicker, Button } from '@/design-system';
import { DataTable, DateText, EmptyState, SectionCard, StatusTag } from '@/design-system';
import { DailyReportDetail } from './DailyReportDetail';
import { DailyReport, DailyReportComment } from './types';
import {
  getDailyReportTemplateLabel,
  getDailyReportTotalHours,
  getDailyReportWorkItems,
  getDailyReportWorkTypeText,
  mockDailyReportOrgData,
  mockDailyReportsByEmployee,
  WORK_ITEM_LABELS,
} from './mockData';
import { WORK_ATTRIBUTION_LABELS } from './workAttribution';
import { PageShell } from '@/design-system';

const CollapseItem = Collapse.Item;

export function DailyReportView() {
  // Arco DatePicker 的 value 是 Dayjs | string | number，不是 Date；
  // onChange 的第一个参数就是格式化后的字符串，直接用它作为状态，避免存 Date 再隐式转换。
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['dept-sales']);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [comments, setComments] = useState<DailyReportComment[]>([]);

  const handleAddComment = (reportId: string, content: string, mentionedUsers: string[]) => {
    const newComment: DailyReportComment = {
      id: `comment-${Date.now()}`,
      reportId,
      userId: 'user-sales-zhangsan',
      userName: '张三',
      content,
      mentionedUsers,
      createdAt: new Date().toISOString(),
      readBy: ['user-sales-zhangsan'],
    };
    setComments([...comments, newComment]);
  };

  const handleViewDetail = (report: DailyReport) => {
    setSelectedReport(report);
    setDetailVisible(true);
  };

  const renderTreeTitle = (node: any) => {
    if (node.isLeaf) {
      return (
        <span>
          {node.title}
          {node.reported ? (
            <Badge status="success" text="已汇报" style={{ marginLeft: 8 }} />
          ) : (
            <Badge status="default" text="未汇报" style={{ marginLeft: 8 }} />
          )}
        </span>
      );
    }
    return (
      <span>
        {node.title}
        <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: 'var(--text-xs)' }}>
          ({node.reported}/{node.total})
        </span>
      </span>
    );
  };

  const handleSelect = (selectedKeys: string[]) => {
    const key = selectedKeys[0];
    if (key && key.startsWith('emp-')) {
      setSelectedEmployee(key);
    }
  };

  return (
    <PageShell breadcrumbs={[{ label: '日报', to: '/dailyreport/list' }, { label: '日报列表', to: '/dailyreport/list' }, { label: '员工日报视图' }]}>
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 146px)' }}>
      <div style={{ width: 320, flexShrink: 0 }}>
        <SectionCard
          title="组织架构"
          extra={
            <DatePicker
              value={selectedDate}
              onChange={(dateString) => setSelectedDate(dateString)}
              style={{ width: 140 }}
              format="YYYY-MM-DD"
            />
          }
        >
          <Tree
            treeData={mockDailyReportOrgData}
            expandedKeys={expandedKeys}
            onExpand={setExpandedKeys}
            onSelect={handleSelect}
            renderTitle={renderTreeTitle}
          />
        </SectionCard>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <SectionCard
          title={selectedEmployee ? `员工日报历史` : '选择员工查看日报'}
        >
        {selectedEmployee && mockDailyReportsByEmployee[selectedEmployee] ? (
          <Collapse defaultActiveKey={['0']}>
            {mockDailyReportsByEmployee[selectedEmployee].map((report, index) => {
              const workItems = getDailyReportWorkItems(report);
              const totalHours = getDailyReportTotalHours(report);

              return (
              <CollapseItem
                key={index.toString()}
                name={index.toString()}
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><DateText value={report.reportDate} /> <StatusTag size="small" tone="info">{getDailyReportTemplateLabel(report)}</StatusTag></span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                      工作项: {getDailyReportWorkTypeText(report)} | 总工时: {totalHours}h
                    </span>
                  </div>
                }
              >
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>工作项明细</div>
                    <DataTable
                      columns={[
                        { title: '类型', dataIndex: 'type', render: (value) => WORK_ITEM_LABELS[value as keyof typeof WORK_ITEM_LABELS] || value },
                        {
                          title: '工作归属',
                          dataIndex: 'workAttributionType',
                          render: (value) => value ? WORK_ATTRIBUTION_LABELS[value as keyof typeof WORK_ATTRIBUTION_LABELS] : '-',
                        },
                        {
                          title: '对象',
                          dataIndex: 'relationName',
                          render: (_: unknown, record: any) => record.relationName || record.projectName || record.position || record.managementType || '-',
                        },
                        { title: '工作内容', dataIndex: 'content' },
                        { title: '工时(h)', dataIndex: 'hours', width: 100 },
                      ]}
                      data={workItems}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>需协助事项</div>
                    <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 'var(--radius-xs)' }}>
                      {(report.content as any)['assistance-needed'] || '无'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>明日工作计划</div>
                    <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 'var(--radius-xs)' }}>
                      {(report.content as any)['tomorrow-plan'] || '无'}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button type="primary" size="small" onClick={() => handleViewDetail(report)}>
                      查看详情 & 评论
                    </Button>
                  </div>
                </div>
              </CollapseItem>
              );
            })}
          </Collapse>
        ) : selectedEmployee ? (
          <EmptyState description="该员工暂无日报记录" />
        ) : (
          <EmptyState description="请从左侧选择员工查看日报历史" />
        )}
        </SectionCard>
      </div>

      <DailyReportDetail
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        report={selectedReport}
        comments={comments}
        onAddComment={handleAddComment}
        currentUserId="user-sales-zhangsan"
      />
    </div>
    </PageShell>
  );
}
