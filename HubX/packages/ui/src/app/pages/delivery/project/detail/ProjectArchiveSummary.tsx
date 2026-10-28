import { useState } from 'react';
import { Button, Typography } from '@/design-system';
import { DateText, SectionCard, StatusTag, resolveStatus } from '@/design-system';
import {
  BLOCKER_SEVERITY_META,
  BUSINESS_LINE_META,
  PROJECT_RISK_LEVEL_META,
} from '../types';
import type { Project } from '../mockData';

const { Text } = Typography;

/**
 * 归档摘要只需要项目的这些字段。
 *
 * 原先这里写的是 `ProjectListItem`（带 key/daysRemaining/isOverdue/healthStatus 的列表投影），
 * 但详情页拿到的是 `Project` 本体，两者互不兼容。改成按需 Pick 后，
 * `Project` 与 `ProjectListItem` 都能传入，也不再有「为了满足类型而伪造计算字段」的需求。
 */
type ProjectArchiveProject = Pick<Project,
  | 'businessLine' | 'entity' | 'owner' | 'salesUsers'
  | 'startDate' | 'expectedEndDate' | 'latestProgress' | 'createdAt'
  | 'blockers' | 'riskLevel' | 'riskNote' | 'acceptanceCriteria'
>;

interface ProjectArchiveSummaryProps {
  project: ProjectArchiveProject;
  /** 详情页的 metrics 可能还没有客户名，允许为空 */
  customerName?: string;
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
    <SectionCard className="project-archive-summary">
      <div className="project-archive-summary__rows">
        <div className="project-archive-summary__row">
          <div><Text type="secondary">客户</Text><strong>{customerName || '-'}</strong></div>
          <div><Text type="secondary">业务线</Text><StatusTag meta={resolveStatus(BUSINESS_LINE_META, project.businessLine)} /></div>
          <div><Text type="secondary">签约主体</Text><strong>{project.entity}</strong></div>
          <div><Text type="secondary">项目经理</Text><strong>{project.owner || '待指派'}</strong></div>
        </div>
        <div className="project-archive-summary__row project-archive-summary__row--secondary">
          <div><Text type="secondary">项目周期</Text><span><DateText value={project.startDate} /> 至 <DateText value={project.expectedEndDate} /></span></div>
          <div><Text type="secondary">预算工时</Text><span>{budgetHoursLabel}</span></div>
          <div><Text type="secondary">销售</Text><span>{project.salesUsers.join('、') || '-'}</span></div>
          <div><Text type="secondary">创建时间</Text><span><DateText value={project.createdAt} mode="datetime" /></span></div>
        </div>
      </div>

      {(activeBlockers.length > 0 || (project.riskLevel && project.riskLevel !== 'none')) && (
        <div className="project-archive-summary__alert" id="project-risk">
          {project.riskLevel && project.riskLevel !== 'none' && (
            <StatusTag meta={resolveStatus(PROJECT_RISK_LEVEL_META, project.riskLevel)} />
          )}
          {activeBlockers.length > 0 && <StatusTag tone="danger">{activeBlockers.length} 项阻塞</StatusTag>}
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
                    <StatusTag meta={resolveStatus(BLOCKER_SEVERITY_META, blocker.severity)} />
                    <span>{blocker.title}</span>
                    <Text type="secondary">预计解除：<DateText value={blocker.expectedResolveDate || blocker.customerEta} placeholder="未设置" /></Text>
                  </div>
                ))}
              </div>
            </div>
          )}
          {project.acceptanceCriteria && project.acceptanceCriteria.length > 0 && (
            <div>
              <Text type="secondary">验收标准</Text>
              <ul>{project.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
