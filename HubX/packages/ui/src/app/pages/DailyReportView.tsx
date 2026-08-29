import { useState } from 'react';
import { Card, Tree, Badge, Collapse, Table, DatePicker, Button, Tag } from '@arco-design/web-react';
import { DailyReportDetail } from './daily-report/DailyReportDetail';
import { DailyReport, DailyReportComment } from './daily-report/types';
import {
  getDailyReportTemplateLabel,
  getDailyReportTotalHours,
  getDailyReportWorkItems,
  getDailyReportWorkTypeText,
  mockDailyReportOrgData,
  mockDailyReportsByEmployee,
  WORK_ITEM_LABELS,
} from './daily-report/mockData';
import { WORK_ATTRIBUTION_LABELS } from './daily-report/workAttribution';
import { PageShell } from '@/app/components/ui';

const CollapseItem = Collapse.Item;

export function DailyReportView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
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
        <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: 12 }}>
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
      <Card
        style={{ width: 320, flexShrink: 0 }}
        title="组织架构"
        extra={
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
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
      </Card>

      <Card
        style={{ flex: 1, overflow: 'auto' }}
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
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{report.reportDate} <Tag size="small" color="arcoblue">{getDailyReportTemplateLabel(report)}</Tag></span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                      工作项: {getDailyReportWorkTypeText(report)} | 总工时: {totalHours}h
                    </span>
                  </div>
                }
              >
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>工作项明细</div>
                    <Table
                      columns={[
                        { title: '类型', dataIndex: 'type', render: (value) => WORK_ITEM_LABELS[value] || value },
                        {
                          title: '工作归属',
                          dataIndex: 'workAttributionType',
                          render: (value) => value ? WORK_ATTRIBUTION_LABELS[value] : '-',
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
                      pagination={false}
                      size="small"
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>需协助事项</div>
                    <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
                      {(report.content as any)['assistance-needed'] || '无'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>明日工作计划</div>
                    <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
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
          <div style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 40 }}>
            该员工暂无日报记录
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 40 }}>
            请从左侧选择员工查看日报历史
          </div>
        )}
      </Card>

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
