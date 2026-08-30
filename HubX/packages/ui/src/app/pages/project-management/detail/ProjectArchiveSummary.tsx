import { useState } from 'react';
import { Button, Card, Tag, Typography } from '@arco-design/web-react';
import {
  BLOCKER_SEVERITY_COLOR,
  BLOCKER_SEVERITY_LABEL,
  BUSINESS_LINE_COLOR,
  PROJECT_RISK_LEVEL_COLOR,
  PROJECT_RISK_LEVEL_LABEL,
  type ProjectListItem,
} from '../types';

const { Text } = Typography;

interface ProjectArchiveSummaryProps {
  project: ProjectListItem;
  customerName: string;
  budgetHoursLabel: string;
}

export function ProjectArchiveSummary({
  project,
  customerName,
  budgetHoursLabel,
}: ProjectArchiveSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const activeBlockers = (project.blockers ?? []).filter((item) => !item.resolved);

  return (
    <Card size="small" className="project-archive-summary">
      <div className="project-archive-summary__rows">
        <div className="project-archive-summary__row">
          <div><Text type="secondary">客户</Text><strong>{customerName || '-'}</strong></div>
          <div><Text type="secondary">业务线</Text><Tag size="small" color={BUSINESS_LINE_COLOR[project.businessLine]}>{project.businessLine}</Tag></div>
          <div><Text type="secondary">签约主体</Text><strong>{project.entity}</strong></div>
          <div><Text type="secondary">项目经理</Text><strong>{project.owner || '待指派'}</strong></div>
        </div>
        <div className="project-archive-summary__row project-archive-summary__row--secondary">
          <div><Text type="secondary">项目周期</Text><span>{project.startDate || '-'} 至 {project.expectedEndDate || '-'}</span></div>
          <div><Text type="secondary">预算工时</Text><span>{budgetHoursLabel}</span></div>
          <div><Text type="secondary">销售</Text><span>{project.salesUsers.join('、') || '-'}</span></div>
          <div><Text type="secondary">创建时间</Text><span>{project.createdAt}</span></div>
        </div>
      </div>

      {(activeBlockers.length > 0 || (project.riskLevel && project.riskLevel !== 'none')) && (
        <div className="project-archive-summary__alert" id="project-risk">
          {project.riskLevel && project.riskLevel !== 'none' && (
            <Tag size="small" color={PROJECT_RISK_LEVEL_COLOR[project.riskLevel]}>
              {PROJECT_RISK_LEVEL_LABEL[project.riskLevel]}
            </Tag>
          )}
          {activeBlockers.length > 0 && <Tag size="small" color="red">{activeBlockers.length} 项阻塞</Tag>}
          <span>{activeBlockers[0]?.title || project.riskNote || '风险处理中'}</span>
        </div>
      )}

      <div className="project-archive-summary__progress">
        <Text type="secondary" className="project-archive-summary__label">最新进展</Text>
        <span className="project-archive-summary__value">{project.latestProgress || '-'}</span>
        <Button type="text" size="mini" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起完整档案' : '展开完整档案'}
        </Button>
      </div>

      {expanded && (
        <div className="project-archive-summary__expanded">
          {project.riskNote && <div><Text type="secondary">风险备注</Text><p>{project.riskNote}</p></div>}
          {activeBlockers.length > 0 && (
            <div>
              <Text type="secondary">关键卡点</Text>
              <div className="project-archive-summary__blockers">
                {activeBlockers.map((blocker) => (
                  <div key={blocker.id}>
                    <Tag size="small" color={BLOCKER_SEVERITY_COLOR[blocker.severity]}>
                      {BLOCKER_SEVERITY_LABEL[blocker.severity]}
                    </Tag>
                    <span>{blocker.title}</span>
                    <Text type="secondary">预计解除：{blocker.expectedResolveDate || blocker.customerEta || '未设置'}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}
          {project.acceptanceCriteria?.length > 0 && (
            <div>
              <Text type="secondary">验收标准</Text>
              <ul>{project.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
