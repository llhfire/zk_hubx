import { AlertBanner, SectionTabs } from '@/design-system';
import { ContractDetailPattern } from './patterns/ContractDetailPattern';
import { FinanceReportPattern } from './patterns/FinanceReportPattern';
import { LeadListPattern } from './patterns/LeadListPattern';
import { ProjectDetailPattern } from './patterns/ProjectDetailPattern';

export interface PatternsPanelProps {
  group: string;
  onGroupChange: (group: string) => void;
}

/**
 * 业务样板：真实页面切片 + 复制边界。
 * 样板保留经过多轮校准的数据组织和交互规则，不保留业务字段本身。
 */
export function PatternsPanel({ group, onGroupChange }: PatternsPanelProps) {
  return (
    <div className="ui-library-section-stack">
      <AlertBanner tone="info">
        样板用于回答「这类页面长什么样、哪些能抄」。每个样板下面都写了可以复制什么、不要复制什么；
        需要新页面时，先抄结构，再按业务重排字段。
      </AlertBanner>
      <SectionTabs
        size="small"
        activeKey={group}
        onChange={onGroupChange}
        items={[
          { key: 'lead', label: '线索列表', content: <LeadListPattern /> },
          { key: 'project', label: '项目详情', content: <ProjectDetailPattern /> },
          { key: 'contract', label: '合同详情', content: <ContractDetailPattern /> },
          { key: 'finance', label: '财务统计', content: <FinanceReportPattern /> },
        ]}
      />
    </div>
  );
}
