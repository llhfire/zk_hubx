import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Progress, Switch, Tag, Typography } from '@arco-design/web-react';
import {
  groupProjectActivity,
  onlyMajorActivity,
  type ProjectActivityAction,
  type ProjectActivityItem,
} from '../projectActivityProjection';

const { Text } = Typography;

const KIND_LABEL: Record<ProjectActivityItem['kind'], string> = {
  contract: '合同',
  collection: '回款',
  confirmation: '确认书',
  meeting: '会议',
  task: '任务',
  followup: '跟进',
  milestone: '里程碑',
  risk: '风险',
  status: '状态',
};

const TONE_COLOR: Record<ProjectActivityItem['severity'], string> = {
  neutral: 'gray',
  success: 'green',
  warning: 'orange',
  danger: 'red',
};

const ACTION_LABEL: Record<ProjectActivityAction, string> = {
  'record-collection': '登记回款',
  'open-confirmation': '查看确认书',
  'open-task': '处理任务',
  'open-meeting': '查看纪要',
};

export interface ProjectMilestoneItem {
  name: string;
  done: boolean;
  date?: string;
}

interface ProjectActivityFeedProps {
  items: ProjectActivityItem[];
  milestones: ProjectMilestoneItem[];
  progress: number;
  onlyMajor: boolean;
  onOnlyMajorChange: (value: boolean) => void;
  onViewSource: (item: ProjectActivityItem) => void;
  onPrimaryAction: (item: ProjectActivityItem) => void;
}

export function ProjectActivityFeed({
  items,
  milestones,
  progress,
  onlyMajor,
  onOnlyMajorChange,
  onViewSource,
  onPrimaryAction,
}: ProjectActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(20);
  const [milestonesExpanded, setMilestonesExpanded] = useState(false);
  const filteredItems = useMemo(() => onlyMajor ? onlyMajorActivity(items) : items, [items, onlyMajor]);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const groups = groupProjectActivity(visibleItems);
  const completedMilestones = milestones.filter((item) => item.done);
  const nextMilestone = milestones.find((item) => !item.done);

  useEffect(() => setVisibleCount(20), [onlyMajor, items.length]);

  return (
    <div className="project-activity-feed">
      <section className="project-milestone-summary">
        <div className="project-milestone-summary__progress">
          <div><Text type="secondary">交付里程碑</Text><strong>{completedMilestones.length}/{milestones.length}</strong></div>
          <Progress percent={progress} size="small" showText={false} />
        </div>
        <div className="project-milestone-summary__next">
          <Text type="secondary">下一节点</Text>
          <strong>{nextMilestone?.name || '全部完成'}</strong>
          <span>{nextMilestone ? '等待前置条件完成' : '项目关键节点已全部完成'}</span>
        </div>
        <Button type="text" size="small" onClick={() => setMilestonesExpanded((value) => !value)}>
          {milestonesExpanded ? '收起节点' : '查看全部节点'}
        </Button>
      </section>

      {milestonesExpanded && (
        <div className="project-milestone-summary__list">
          {milestones.map((milestone) => (
            <div key={milestone.name}>
              <span className={milestone.done ? 'is-done' : ''} aria-hidden>{milestone.done ? '✓' : '○'}</span>
              <strong>{milestone.name}</strong>
              <Text type="secondary">{milestone.done ? `完成于 ${milestone.date || '未记录'}` : '未完成'}</Text>
            </div>
          ))}
        </div>
      )}

      <div className="project-activity-feed__toolbar">
        <div><strong>精选活动</strong><Text type="secondary">只展示影响交付、商务或风险判断的事实</Text></div>
        <label><span>仅看大事记</span><Switch size="small" checked={onlyMajor} onChange={onOnlyMajorChange} /></label>
      </div>

      {groups.length === 0 ? <Empty description={onlyMajor ? '暂无大事记' : '暂无项目活动'} /> : groups.map((group) => (
        <section key={group.key} className="project-activity-group">
          <div className="project-activity-group__date">{group.label}</div>
          <div className="project-activity-group__items">
            {group.items.map((item) => (
              <article key={item.id} className={`project-activity-card project-activity-card--${item.severity}`}>
                <div className="project-activity-card__head">
                  <div>
                    <Tag size="small" color={TONE_COLOR[item.severity]}>{KIND_LABEL[item.kind]}</Tag>
                    {item.isMajor && <Tag size="small" color="arcoblue">大事记</Tag>}
                    <strong>{item.title}</strong>
                  </div>
                  <Text type="secondary">{item.occurredAt}</Text>
                </div>
                <p>{item.summary}</p>
                {item.facts.length > 0 && (
                  <div className="project-activity-card__facts">
                    {item.facts.slice(0, 4).map((fact) => (
                      <div key={`${item.id}-${fact.label}`}>
                        <Text type="secondary">{fact.label}</Text>
                        <span className={fact.tone ? `is-${fact.tone}` : ''}>{fact.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="project-activity-card__foot">
                  <Text type="secondary">记录人：{item.operator}</Text>
                  <div>
                    <Button type="text" size="mini" onClick={() => onViewSource(item)}>查看来源</Button>
                    {item.primaryAction && (
                      <Button size="mini" type={item.severity === 'danger' ? 'primary' : 'secondary'} onClick={() => onPrimaryAction(item)}>
                        {ACTION_LABEL[item.primaryAction]}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {visibleCount < filteredItems.length && (
        <div className="project-activity-feed__more">
          <Button onClick={() => setVisibleCount((value) => value + 20)}>加载更多（剩余 {filteredItems.length - visibleCount}）</Button>
        </div>
      )}
    </div>
  );
}
