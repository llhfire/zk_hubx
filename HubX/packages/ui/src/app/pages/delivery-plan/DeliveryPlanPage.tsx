import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert, Badge, Button, Card, Message, Popconfirm,
  Radio, Result, Select, Space, Tag, Typography,
} from '@arco-design/web-react';
import { IconDelete } from '@arco-design/web-react/icon';
import { differenceInDays } from 'date-fns';
import {
  PageShell, ProcessOverview, ProcessWorkspace, ProcessWorkspaceMain,
} from '@/app/components/ui';
import { useProjects } from '../project-management/ProjectContext';
import { useOptionalContracts } from '../contracts/ContractsContext';
import type { ProjectStatus } from '../project-management/mockData';
import type { DeliveryPlan, DeliveryType, GanttZoomLevel, SopStep } from './types';
import { SOP_PHASES } from './constants';
import {
  derivePhaseStatus, generateDeliveryPlan, getDefaultZoomLevel,
} from './utils';
import { getDeliveryPlan, removeDeliveryPlan, saveDeliveryPlan } from './deliveryPlanStore';
import { DeliveryConfigModal } from './DeliveryConfigModal';
import StepEditModal from './StepEditModal';
import CustomStepModal from './CustomStepModal';
import TaskList from './TaskList';
import GanttChart from './GanttChart';
import { deriveDeliveryConfigFromContract, generateDeliveryPlanFromContract } from './contractBasis';
import './deliveryPlanPage.css';

const { Text } = Typography;

const CONTRACT_DELIVERY_TYPES: Record<string, DeliveryType> = {
  '1': '全平台', '2': '小程序', '3': '网站', '4': '网站+小程序', '5': 'APP',
  'pawkey-c1': 'APP',
};
const CONTRACT_SIGN_DATES: Record<string, string> = {
  '1': '2026-03-15', '2': '2026-03-20', '3': '2026-04-01', '4': '2026-02-10', '5': '2026-03-01',
  'pawkey-c1': '2026-06-01',
};
const ZOOM_OPTIONS: { label: string; value: GanttZoomLevel }[] = [
  { label: '日', value: 'day' }, { label: '周', value: 'week' }, { label: '月', value: 'month' },
];
function clonePlan(plan: DeliveryPlan | undefined): DeliveryPlan | null {
  return plan ? JSON.parse(JSON.stringify(plan)) as DeliveryPlan : null;
}

function statusBadge(status: ProjectStatus) {
  const map: Record<ProjectStatus, 'default' | 'processing' | 'success' | 'warning' | 'error'> = {
    '未确认': 'warning', '未开始': 'default', '进行中': 'processing', '已完成': 'success',
    '验收中': 'processing', '搁置': 'warning', '延迟': 'error', '催款中': 'warning',
  };
  return <Badge status={map[status]} text={status} />;
}

function getPlanZoom(plan: DeliveryPlan | null): GanttZoomLevel {
  if (!plan) return 'week';
  const dates = plan.steps.flatMap((step) => [step.startDate, step.dueDate]).filter(Boolean).sort();
  if (dates.length < 2) return 'week';
  return getDefaultZoomLevel(differenceInDays(new Date(dates.at(-1)!), new Date(dates[0])));
}

export default function DeliveryPlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProjectById, loading } = useProjects();
  const contractsContext = useOptionalContracts();
  const project = getProjectById(id);
  const contract = contractsContext?.getById(project?.contractId);
  const contractConfig = useMemo(
    () => contract ? deriveDeliveryConfigFromContract(contract) : undefined,
    [contract],
  );

  const [plan, setPlan] = useState<DeliveryPlan | null>(() => clonePlan(getDeliveryPlan(id)));
  const [zoomLevel, setZoomLevel] = useState<GanttZoomLevel>(() => getPlanZoom(plan));
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<string[]>(() => plan?.phases.map((phase) => phase.id) ?? []);
  const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editStep, setEditStep] = useState<SopStep | null>(null);
  const [customStepPhaseId, setCustomStepPhaseId] = useState<string | null>(null);
  const [customStepPhaseNo, setCustomStepPhaseNo] = useState(0);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  useEffect(() => {
    const nextPlan = clonePlan(getDeliveryPlan(id));
    setPlan(nextPlan);
    setZoomLevel(getPlanZoom(nextPlan));
    setPhaseFilter(null);
    setExpandedPhaseIds(nextPlan?.phases.map((phase) => phase.id) ?? []);
    setExpandedStepIds([]);
  }, [id]);

  useEffect(() => {
    const listEl = listScrollRef.current;
    const ganttEl = ganttScrollRef.current;
    if (!listEl || !ganttEl) return;
    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      target.scrollTop = source.scrollTop;
      requestAnimationFrame(() => { isSyncingScroll.current = false; });
    };
    const onListScroll = () => syncScroll(listEl, ganttEl);
    const onGanttScroll = () => syncScroll(ganttEl, listEl);
    listEl.addEventListener('scroll', onListScroll);
    ganttEl.addEventListener('scroll', onGanttScroll);
    return () => {
      listEl.removeEventListener('scroll', onListScroll);
      ganttEl.removeEventListener('scroll', onGanttScroll);
    };
  }, [plan, phaseFilter]);

  const filteredPlan = useMemo(() => {
    if (!plan || phaseFilter === null) return plan;
    const phases = plan.phases.filter((phase) => phase.phaseNo === phaseFilter);
    const phaseIds = new Set(phases.map((phase) => phase.id));
    return { ...plan, phases, steps: plan.steps.filter((step) => phaseIds.has(step.phaseId)) };
  }, [phaseFilter, plan]);

  const commitPlan = useCallback((nextPlan: DeliveryPlan) => {
    saveDeliveryPlan(nextPlan);
    setPlan(nextPlan);
  }, []);

  const handleConfigConfirm = useCallback((config: { selectedPhases: number[]; deliveryType: DeliveryType; contractId?: string }) => {
    if (!project) return;
    const signDate = project.contractId ? CONTRACT_SIGN_DATES[project.contractId] : undefined;
    const nextPlan = contract
      ? generateDeliveryPlanFromContract(
          contract,
          project as unknown as Record<string, unknown>,
          config.selectedPhases,
        )
      : generateDeliveryPlan(config, project as unknown as Record<string, unknown>, signDate);
    commitPlan(nextPlan);
    setExpandedPhaseIds(nextPlan.phases.map((phase) => phase.id));
    setExpandedStepIds([]);
    setPhaseFilter(null);
    setZoomLevel(getPlanZoom(nextPlan));
    setConfigModalVisible(false);
    Message.success('交付计划已生成');
  }, [commitPlan, contract, project]);

  const handleStepEditSave = useCallback((stepId: string, updates: Partial<SopStep>) => {
    if (!plan) return;
    const steps = plan.steps.map((step) => step.id === stepId ? { ...step, ...updates } : step);
    const updatedStep = steps.find((step) => step.id === stepId);
    if (!updatedStep) return;
    const phaseSteps = steps.filter((step) => step.phaseId === updatedStep.phaseId);
    const dates = phaseSteps.flatMap((step) => [step.startDate, step.dueDate]).filter(Boolean).sort();
    const phases = plan.phases.map((phase) => phase.id === updatedStep.phaseId ? {
      ...phase,
      status: derivePhaseStatus(phaseSteps),
      startDate: dates[0] ?? phase.startDate,
      dueDate: dates.at(-1) ?? phase.dueDate,
    } : phase);
    commitPlan({ ...plan, steps, phases });
    setEditStep(null);
    Message.success('步骤已更新');
  }, [commitPlan, plan]);

  const handleCustomStepSave = useCallback((newStep: SopStep) => {
    if (!plan) return;
    const steps = [...plan.steps, newStep];
    const phaseSteps = steps.filter((step) => step.phaseId === newStep.phaseId);
    const dates = phaseSteps.flatMap((step) => [step.startDate, step.dueDate]).filter(Boolean).sort();
    const phases = plan.phases.map((phase) => phase.id === newStep.phaseId ? {
      ...phase,
      status: derivePhaseStatus(phaseSteps),
      startDate: dates[0] ?? phase.startDate,
      dueDate: dates.at(-1) ?? phase.dueDate,
    } : phase);
    commitPlan({ ...plan, steps, phases });
    setCustomStepPhaseId(null);
    Message.success('自定义步骤已添加');
  }, [commitPlan, plan]);

  const handleDeletePlan = useCallback(() => {
    if (id) removeDeliveryPlan(id);
    setPlan(null);
    setPhaseFilter(null);
    setExpandedPhaseIds([]);
    setExpandedStepIds([]);
    Message.success('交付计划已删除');
  }, [id]);

  const getExistingCustomStepCount = useCallback(
    (phaseId: string) => plan?.steps.filter((step) => step.phaseId === phaseId && step.isCustom).length ?? 0,
    [plan],
  );

  const breadcrumbs = [
    { label: '项目管理', to: '/projects' },
    ...(project ? [{ label: project.name, to: `/projects/${project.id}` }] : []),
    { label: '交付计划' },
  ];

  if (loading) {
    return <PageShell breadcrumbs={breadcrumbs}><div className="delivery-plan__state">项目信息加载中…</div></PageShell>;
  }
  if (!project) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <Result status="404" title="项目不存在" subTitle="该项目可能已被删除或链接有误"
          extra={<Button type="primary" onClick={() => navigate('/projects')}>返回项目列表</Button>} />
      </PageShell>
    );
  }

  const projectMembers = {
    owner: project.owner ? [project.owner] : [], productUsers: project.productUsers ?? [],
    salesUsers: project.salesUsers ?? [], uiUsers: project.uiUsers ?? [],
    frontendUsers: project.frontendUsers ?? [], backendUsers: project.backendUsers ?? [],
    opsUsers: project.opsUsers ?? [], testUsers: project.testUsers ?? [], legalUsers: project.legalUsers ?? [],
  };
  const contractDeliveryType = contractConfig?.deliveryType
    ?? (project.contractId ? CONTRACT_DELIVERY_TYPES[project.contractId] : undefined);
  if (!plan || !filteredPlan) {
    return (
      <PageShell breadcrumbs={breadcrumbs} className="delivery-plan">
        <ProcessOverview
          identifier={project.projectNo}
          title={`${project.name} · 交付计划`}
          tags={<>{statusBadge(project.status)}<Tag color="gray">尚未生成</Tag></>}
          actions={<Button type="primary" size="small" onClick={() => setConfigModalVisible(true)}>生成交付计划</Button>}
        />
        <Card>
          <Result status="info" title="暂无交付计划"
            subTitle="选择交付类型与 SOP 板块后，系统将生成步骤、里程碑和甘特时间轴。"
            extra={<Button type="primary" onClick={() => setConfigModalVisible(true)}>开始配置</Button>} />
        </Card>
        <DeliveryConfigModal visible={configModalVisible} onCancel={() => setConfigModalVisible(false)}
          onConfirm={handleConfigConfirm} contractId={project.contractId} deliveryType={contractDeliveryType}
          projectStartDate={project.startDate} />
      </PageShell>
    );
  }

  return (
    <PageShell breadcrumbs={breadcrumbs} className="delivery-plan">
      <ProcessOverview
        identifier={project.projectNo}
        title={`${project.name} · 交付计划`}
        tags={<>{statusBadge(project.status)}<Tag color="arcoblue">{plan.deliveryType}</Tag></>}
        actions={(
          <Space wrap>
            <Button size="small" onClick={() => navigate(`/projects/${project.id}`)}>项目详情</Button>
            <Popconfirm title="重新配置会覆盖当前计划，是否继续？" onOk={() => setConfigModalVisible(true)}>
              <Button size="small">重新配置</Button>
            </Popconfirm>
            <Popconfirm title="确定删除交付计划？" onOk={handleDeletePlan}>
              <Button type="text" size="small" status="danger" icon={<IconDelete />}>删除计划</Button>
            </Popconfirm>
          </Space>
        )}
      />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <Card size="small" className="delivery-plan__toolbar-card">
            <div className="delivery-plan__toolbar">
              <div><Text bold>交付排期</Text><Text type="secondary">左侧管理步骤，右侧查看时间轴</Text></div>
              <Space wrap>
                <Select aria-label="板块筛选" value={phaseFilter ?? 0}
                  onChange={(value: number) => setPhaseFilter(value === 0 ? null : value)} style={{ width: 176 }} size="small">
                  <Select.Option value={0}>全部板块</Select.Option>
                  {SOP_PHASES.map((phase) => <Select.Option key={phase.phaseNo} value={phase.phaseNo}>{phase.phaseNo}. {phase.phaseName}</Select.Option>)}
                </Select>
                <Radio.Group aria-label="时间轴粒度" type="button" value={zoomLevel}
                  onChange={(value) => setZoomLevel(value as GanttZoomLevel)} size="small">
                  {ZOOM_OPTIONS.map((option) => <Radio key={option.value} value={option.value}>{option.label}</Radio>)}
                </Radio.Group>
              </Space>
            </div>
          </Card>
          <Alert type="info" content="单击板块或步骤可展开详情；双击步骤可编辑负责人、状态与日期。" />
          <Card size="small" className="delivery-plan__planner-card">
            <div className="delivery-plan__planner">
              <div className="delivery-plan__task-pane">
                <TaskList plan={filteredPlan} project={project as unknown as Record<string, unknown>}
                  onStepEdit={setEditStep}
                  onAddCustomStep={(phaseId, phaseNo) => { setCustomStepPhaseId(phaseId); setCustomStepPhaseNo(phaseNo); }}
                  expandedPhaseIds={expandedPhaseIds} onExpandedPhaseIdsChange={setExpandedPhaseIds}
                  expandedStepIds={expandedStepIds} onExpandedStepIdsChange={setExpandedStepIds} scrollRef={listScrollRef} />
              </div>
              <div className="delivery-plan__gantt-pane">
                <GanttChart plan={filteredPlan} zoomLevel={zoomLevel} scrollRef={ganttScrollRef}
                  expandedPhaseIds={expandedPhaseIds} expandedStepIds={expandedStepIds} />
              </div>
            </div>
          </Card>
        </ProcessWorkspaceMain>

      </ProcessWorkspace>

      <DeliveryConfigModal visible={configModalVisible} onCancel={() => setConfigModalVisible(false)}
        onConfirm={handleConfigConfirm} contractId={project.contractId} deliveryType={contractDeliveryType}
        contractSelectedPhases={contractConfig?.selectedPhases}
        projectStartDate={project.startDate} />
      <StepEditModal visible={!!editStep} step={editStep} onCancel={() => setEditStep(null)}
        onSave={handleStepEditSave} projectMembers={projectMembers} />
      {customStepPhaseId && (
        <CustomStepModal visible phaseId={customStepPhaseId} phaseNo={customStepPhaseNo} projectId={project.id}
          existingCustomStepCount={getExistingCustomStepCount(customStepPhaseId)} onCancel={() => setCustomStepPhaseId(null)}
          onSave={handleCustomStepSave} projectMembers={projectMembers} />
      )}
    </PageShell>
  );
}
