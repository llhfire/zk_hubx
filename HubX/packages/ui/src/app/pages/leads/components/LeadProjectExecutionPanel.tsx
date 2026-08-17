// 线索详情「项目执行」主 Tab：销售人员不用跳出线索，即可看到签约后项目的执行概况。
// 数据来自共享 ProjectContext 传入的 project；任务/日报复用项目管理模块的既有面板与口径。

import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Descriptions, Progress, Space, Table, Tag, Typography } from '@arco-design/web-react';
import { IconExport } from '@arco-design/web-react/icon';
import {
  buildProjectMemberHours,
  calculateProjectHours,
  initialDailyReports,
  type Project,
} from '@/app/pages/project-management/mockData';
import { ProjectTaskPanel } from '@/app/pages/project-management/ProjectTaskPanel';

const { Text } = Typography;

const STATUS_TAG_COLOR: Record<string, string> = {
  未开始: 'gray',
  进行中: 'arcoblue',
  已完成: 'green',
  验收中: 'cyan',
  搁置: 'orange',
  延迟: 'red',
  催款中: 'orange',
};

export function LeadProjectExecutionPanel({ project }: { project: Project }) {
  const navigate = useNavigate();
  const dailyReports = useMemo(
    () => initialDailyReports.filter((report) => report.projectId === project.id),
    [project.id],
  );
  const memberHours = useMemo(
    () => buildProjectMemberHours(project.id, initialDailyReports),
    [project.id],
  );
  const totalHours = calculateProjectHours(project.id, initialDailyReports);

  return (
    <div className="lead-detail-main-content">
      <Card bordered={false}>
        <Space direction="vertical" style={{ width: '100%' }} size="medium">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Space size={8} wrap>
              <Typography.Title heading={5} style={{ margin: 0 }}>{project.name}</Typography.Title>
              <Tag color={STATUS_TAG_COLOR[project.status] ?? 'arcoblue'}>{project.status}</Tag>
              <Text type="secondary">{project.projectNo}</Text>
            </Space>
            <Button size="small" icon={<IconExport />} onClick={() => navigate(`/projects/${project.id}`)}>
              打开项目详情
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Text type="secondary">总进度</Text>
            <Progress percent={project.progress} style={{ flex: 1, minWidth: 0 }} />
            <Text bold>{project.progress}%</Text>
          </div>

          <Descriptions
            column={2}
            labelStyle={{ width: 110 }}
            data={[
              { label: '负责人', value: project.owner || '-' },
              { label: '销售人员', value: project.salesUsers.join('、') || '-' },
              { label: '产品', value: project.productUsers.join('、') || '-' },
              { label: '最新进展', value: project.latestProgress || '-' },
              { label: '开始日期', value: project.startDate || '-' },
              { label: '预计结束日期', value: project.expectedEndDate || '-' },
            ]}
          />
        </Space>
      </Card>

      <Card bordered={false} title="项目日报" style={{ marginTop: 12 }} size="small">
        <Space direction="vertical" style={{ width: '100%' }} size="medium">
          <Table
            rowKey="key"
            pagination={false}
            size="small"
            data={memberHours}
            columns={[
              { title: '人员名称', dataIndex: 'personName' },
              { title: '职位', dataIndex: 'position' },
              { title: '已用工时', dataIndex: 'hours', render: (hours: number) => `${hours}H` },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={2}>总计</Table.Summary.Cell>
                <Table.Summary.Cell>{totalHours}H</Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            noDataElement={<Text type="secondary">暂无工时记录</Text>}
          />
          <Table
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
            data={dailyReports}
            scroll={{ x: 760 }}
            columns={[
              { title: '日期', dataIndex: 'date', width: 110 },
              { title: '人员', dataIndex: 'personName', width: 90 },
              { title: '耗时', dataIndex: 'hours', width: 70, render: (hours: number) => `${hours}H` },
              { title: '工作内容', dataIndex: 'workContent' },
              { title: '风险/异常反馈', dataIndex: 'riskFeedback' },
            ]}
            noDataElement={<Text type="secondary">暂无项目日报</Text>}
          />
        </Space>
      </Card>

      <Card bordered={false} title="任务管理" style={{ marginTop: 12 }} size="small">
        <ProjectTaskPanel project={project} />
      </Card>
    </div>
  );
}
