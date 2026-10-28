import { useMemo, useState } from 'react';
import { Select, Typography } from '@/design-system';
import {
  DateText,
  EntityLink,
  PageHeader,
  PageShell,
  SectionCard,
  StatusTag,
  resolveStatus,
} from '@/design-system';
import { useContracts } from '../../sales/contracts/ContractsContext';
import { initialDailyReports } from './mockData';
import { useProjects } from './ProjectContext';
import { ProjectCostPanel } from './ProjectCostPanel';
import { PROJECT_STATUS_META } from './types';
import type { ProjectTeamRow } from './ProjectDetailWorkspace';

const { Title, Text } = Typography;

export function ProjectCostPage() {
  const { contracts } = useContracts();
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const project = projects.find(item => item.id === projectId) ?? projects[0];
  const contract = contracts.find(item => item.id === project?.contractId || item.projectId === project?.id);
  const dailyReports = useMemo(
    () => initialDailyReports.filter(item => item.projectId === project?.id),
    [project?.id],
  );
  const [teamRowsByProject] = useState<Record<string, ProjectTeamRow[]>>({});
  const teamRows = project ? teamRowsByProject[project.id] ?? [] : [];

  if (!project) return null;

  return (
    <PageShell className="project-cost-page">
      <PageHeader
        title="项目成本核算"
        description="按项目核算人工及其他开支，分析项目预计成本、实际成本与利润。"
        actions={(
          <Select
            value={project.id}
            onChange={setProjectId}
            style={{ width: 320 }}
            showSearch
            placeholder="请选择项目"
          >
            {projects.map(item => (
              <Select.Option key={item.id} value={item.id}>{item.projectNo} · {item.name}</Select.Option>
            ))}
          </Select>
        )}
      />

      <SectionCard className="project-cost-page-project-card" padded={false}>
        <div className="project-cost-project-summary-main">
          <div>
            <Text type="secondary" className="project-cost-project-no">{project.projectNo}</Text>
            <EntityLink className="project-cost-project-link" to={`/projects/${project.id}`}>{project.name}</EntityLink>
          </div>
          <StatusTag meta={resolveStatus(PROJECT_STATUS_META, project.status)} />
        </div>
        <div className="project-cost-project-meta">
          <div>
            <Text type="secondary">负责人</Text>
            <strong>{project.owner}</strong>
          </div>
          <div>
            <Text type="secondary">关联合同</Text>
            {contract
              ? <EntityLink className="project-cost-contract-link" to={`/contracts/${contract.id}`}>{contract.current.contractName}</EntityLink>
              : <Text>未关联</Text>}
          </div>
          <div>
            <Text type="secondary">项目周期</Text>
            <strong><DateText value={project.startDate} /> 至 <DateText value={project.expectedEndDate} /></strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <ProjectCostPanel
          projectName={project.name}
          projectNo={project.projectNo}
          contractAmount={contract?.current.totalAmount}
          projectStartDate={project.startDate}
          projectEndDate={project.expectedEndDate}
          teamRows={teamRows}
          dailyReports={dailyReports}
          reimbursementItems={[]}
        />
      </SectionCard>
    </PageShell>
  );
}
