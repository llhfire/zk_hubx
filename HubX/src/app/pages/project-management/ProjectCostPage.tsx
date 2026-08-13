import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Card, Select, Tag, Typography } from '@arco-design/web-react';
import { useContracts } from '../contracts/ContractsContext';
import { initialDailyReports, initialProjects } from './mockData';
import { ProjectCostPanel } from './ProjectCostPanel';
import type { ProjectTeamRow } from './ProjectDetailWorkspace';

const { Title, Text } = Typography;

export function ProjectCostPage() {
  const { contracts } = useContracts();
  const [projectId, setProjectId] = useState(initialProjects[0]?.id ?? '');
  const project = initialProjects.find(item => item.id === projectId) ?? initialProjects[0];
  const contract = contracts.find(item => item.id === project?.contractId || item.projectId === project?.id);
  const dailyReports = useMemo(
    () => initialDailyReports.filter(item => item.projectId === project?.id),
    [project?.id],
  );
  const [teamRowsByProject] = useState<Record<string, ProjectTeamRow[]>>({});
  const teamRows = project ? teamRowsByProject[project.id] ?? [] : [];

  if (!project) return null;

  return (
    <div className="project-cost-page">
      <div className="project-cost-page-header">
        <div>
          <Title heading={4} style={{ margin: 0 }}>成本核算</Title>
          <Text type="secondary">按项目核算人工及其他开支，分析项目预计成本、实际成本与利润。</Text>
        </div>
        <Select
          value={project.id}
          onChange={setProjectId}
          style={{ width: 320 }}
          showSearch
          placeholder="请选择项目"
        >
          {initialProjects.map(item => (
            <Select.Option key={item.id} value={item.id}>{item.projectNo} · {item.name}</Select.Option>
          ))}
        </Select>
      </div>

      <Card className="project-cost-page-project-card" bodyStyle={{ padding: 0 }}>
        <div className="project-cost-project-summary-main">
          <div>
            <Text type="secondary" className="project-cost-project-no">{project.projectNo}</Text>
            <Link className="project-cost-project-link" to={`/projects/${project.id}`}>{project.name}</Link>
          </div>
          <Tag color="arcoblue">{project.status}</Tag>
        </div>
        <div className="project-cost-project-meta">
          <div>
            <Text type="secondary">负责人</Text>
            <strong>{project.owner}</strong>
          </div>
          <div>
            <Text type="secondary">关联合同</Text>
            {contract
              ? <Link className="project-cost-contract-link" to={`/contracts/${contract.id}`}>{contract.current.contractName}</Link>
              : <Text>未关联</Text>}
          </div>
          <div>
            <Text type="secondary">项目周期</Text>
            <strong>{project.startDate || '-'} 至 {project.expectedEndDate || '-'}</strong>
          </div>
        </div>
      </Card>

      <Card>
        <ProjectCostPanel
          contractAmount={contract?.current.totalAmount}
          projectStartDate={project.startDate}
          projectEndDate={project.expectedEndDate}
          teamRows={teamRows}
          dailyReports={dailyReports}
          reimbursementItems={[]}
        />
      </Card>
    </div>
  );
}
