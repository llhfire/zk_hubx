// src/app/pages/delivery-plan/DeliveryPlanPage.tsx

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Button,
  Select,
  Typography,
  Message,
  Popconfirm,
  Badge,
  Radio,
  Progress,
} from '@arco-design/web-react';
import { IconLeft, IconDelete } from '@arco-design/web-react/icon';
import { initialProjects } from '../project-management/mockData';
import type { DeliveryPlan, SopStep, GanttZoomLevel, DeliveryType } from './types';
import { SOP_PHASES } from './constants';
import {
  calcOverallCompletion,
  derivePhaseStatus,
  generateDeliveryPlan,
  getDefaultZoomLevel,
  isStepOverdue,
} from './utils';
import { initialDeliveryPlans } from './mockData';
import { DeliveryConfigModal } from './DeliveryConfigModal';
import StepEditModal from './StepEditModal';
import CustomStepModal from './CustomStepModal';
import TaskList from './TaskList';
import GanttChart from './GanttChart';
import { format, differenceInDays } from 'date-fns';

const { Text } = Typography;

/* ---------- Status badge (same pattern as Projects.tsx) ---------- */

type ProjectStatus = '未开始' | '进行中' | '已完成' | '验收中' | '搁置' | '延迟' | '催款中';

function statusBadge(status: ProjectStatus) {
  const map: Record<ProjectStatus, 'default' | 'processing' | 'success' | 'warning' | 'error'> = {
    未开始: 'default',
    进行中: 'processing',
    已完成: 'success',
    验收中: 'processing',
    搁置: 'warning',
    延迟: 'error',
    催款中: 'warning',
  };
  return <Badge status={map[status]} text={status} />;
}

/* ---------- Contract lookup helper ---------- */

/** Simple contract data mirroring Contracts.tsx for deliveryType lookup */
const CONTRACT_DELIVERY_TYPES: Record<string, DeliveryType> = {
  '1': '全平台',
  '2': '小程序',
  '3': '网站',
  '4': '网站+小程序',
  '5': 'APP',
};

const CONTRACT_SIGN_DATES: Record<string, string> = {
  '1': '2026-03-15',
  '2': '2026-03-20',
  '3': '2026-04-01',
  '4': '2026-02-10',
  '5': '2026-03-01',
};

/* ---------- Zoom options ---------- */

const ZOOM_OPTIONS: { label: string; value: GanttZoomLevel }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
];

/* ---------- Main component ---------- */

export default function DeliveryPlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ─── Find project ───
  const project = initialProjects.find((p) => p.id === id);

  // ─── Delivery plan state (deep clone from mockData to allow mutations) ───
  const [plan, setPlan] = useState<DeliveryPlan | null>(
    initialDeliveryPlans[id!] ? JSON.parse(JSON.stringify(initialDeliveryPlans[id!])) : null,
  );

  // ─── UI state ───
  const [zoomLevel, setZoomLevel] = useState<GanttZoomLevel>(() => {
    if (!plan) return 'week';
    const allDates = plan.steps
      .flatMap((s) => [s.startDate, s.dueDate])
      .filter(Boolean)
      .sort();
    if (allDates.length < 2) return 'week';
    const totalDays = differenceInDays(new Date(allDates[allDates.length - 1]), new Date(allDates[0]));
    return getDefaultZoomLevel(totalDays);
  });

  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<string[]>(
    plan?.phases.map((p) => p.id) ?? [],
  );
  const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);

  // ─── Modal states ───
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editStep, setEditStep] = useState<SopStep | null>(null);
  const [customStepPhaseId, setCustomStepPhaseId] = useState<string | null>(null);
  const [customStepPhaseNo, setCustomStepPhaseNo] = useState<number>(0);

  // ─── Scroll refs for sync ───
  const listScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);

  // Flag to prevent infinite scroll sync loops
  const isSyncingScroll = useRef(false);

  // ─── Scroll sync: when one pane scrolls vertically, sync the other ───
  useEffect(() => {
    const listEl = listScrollRef.current;
    const ganttEl = ganttScrollRef.current;
    if (!listEl || !ganttEl) return;

    const onListScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      ganttEl.scrollTop = listEl.scrollTop;
      requestAnimationFrame(() => { isSyncingScroll.current = false; });
    };

    const onGanttScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      listEl.scrollTop = ganttEl.scrollTop;
      requestAnimationFrame(() => { isSyncingScroll.current = false; });
    };

    listEl.addEventListener('scroll', onListScroll);
    ganttEl.addEventListener('scroll', onGanttScroll);

    return () => {
      listEl.removeEventListener('scroll', onListScroll);
      ganttEl.removeEventListener('scroll', onGanttScroll);
    };
  }, [plan]); // re-bind when plan changes (scroll refs are set after render)

  // ─── Project not found ───
  if (!project) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 18, color: '#86909c' }}>项目不存在</Text>
        <Button type="primary" onClick={() => navigate('/projects')}>
          返回项目列表
        </Button>
      </div>
    );
  }

  // ─── Contract info ───
  const contractId = project.contractId;
  const contractDeliveryType = contractId ? CONTRACT_DELIVERY_TYPES[contractId] : undefined;
  const contractSignDate = contractId ? CONTRACT_SIGN_DATES[contractId] : undefined;

  // ─── Project members object for modals ───
  const projectMembers = {
    owner: project.owner ? [project.owner] : [],
    productUsers: project.productUsers ?? [],
    salesUsers: project.salesUsers ?? [],
    uiUsers: project.uiUsers ?? [],
    frontendUsers: project.frontendUsers ?? [],
    backendUsers: project.backendUsers ?? [],
    opsUsers: project.opsUsers ?? [],
    testUsers: project.testUsers ?? [],
    legalUsers: project.legalUsers ?? [],
  };

  // ─── Filtered plan ───
  const filteredPlan = useMemo(() => {
    if (!plan) return null;
    if (phaseFilter === null) return plan;

    const filteredPhases = plan.phases.filter((p) => p.phaseNo === phaseFilter);
    const filteredPhaseIds = new Set(filteredPhases.map((p) => p.id));
    const filteredSteps = plan.steps.filter((s) => filteredPhaseIds.has(s.phaseId));

    return { ...plan, phases: filteredPhases, steps: filteredSteps };
  }, [plan, phaseFilter]);

  // ─── Bottom summary calculations ───
  const summary = useMemo(() => {
    if (!plan) return null;

    const today = format(new Date(), 'yyyy-MM-dd');
    const allSteps = plan.steps;
    const filteredSteps = filteredPlan!.steps;

    const totalSteps = allSteps.length;
    const visibleSteps = filteredSteps.length;
    const completion = calcOverallCompletion(plan.phases, allSteps);
    const inProgressCount = filteredSteps.filter((s) => s.status === 'in_progress').length;
    const overdueCount = filteredSteps.filter((s) => isStepOverdue(s, today)).length;

    const allMilestones = plan.milestones;
    const completedMilestones = allMilestones.filter((m) => m.completed).length;
    const totalMilestones = allMilestones.length;

    // Expected end date: latest dueDate across all steps
    const dueDates = allSteps.map((s) => s.dueDate).filter(Boolean).sort();
    const expectedEndDate = dueDates.length > 0 ? dueDates[dueDates.length - 1] : '-';

    return {
      totalSteps,
      visibleSteps,
      completion,
      inProgressCount,
      overdueCount,
      completedMilestones,
      totalMilestones,
      expectedEndDate,
    };
  }, [plan, filteredPlan]);

  // ─── Handlers ───

  const handleConfigConfirm = useCallback(
    (config: { selectedPhases: number[]; deliveryType: DeliveryType; contractId?: string }) => {
      const newPlan = generateDeliveryPlan(
        config,
        project as unknown as Record<string, any>,
        contractSignDate,
      );
      setPlan(newPlan);
      // Also update initialDeliveryPlans for cross-reference
      if (id) {
        initialDeliveryPlans[id] = newPlan;
      }
      setExpandedPhaseIds(newPlan.phases.map((p) => p.id));
      setExpandedStepIds([]);

      // Auto-set zoom level based on total days
      const allDates = newPlan.steps
        .flatMap((s) => [s.startDate, s.dueDate])
        .filter(Boolean)
        .sort();
      if (allDates.length >= 2) {
        const totalDays = differenceInDays(
          new Date(allDates[allDates.length - 1]),
          new Date(allDates[0]),
        );
        setZoomLevel(getDefaultZoomLevel(totalDays));
      }

      setConfigModalVisible(false);
      Message.success('交付计划已生成');
    },
    [project, contractSignDate, id],
  );

  const handleStepEditSave = useCallback(
    (stepId: string, updates: Partial<SopStep>) => {
      if (!plan) return;

      const newSteps = plan.steps.map((s) =>
        s.id === stepId ? { ...s, ...updates } : s,
      );

      // Find the phase this step belongs to and recalculate its status
      const updatedStep = newSteps.find((s) => s.id === stepId);
      if (!updatedStep) return;

      const phaseId = updatedStep.phaseId;
      const phaseSteps = newSteps.filter((s) => s.phaseId === phaseId);
      const newPhaseStatus = derivePhaseStatus(phaseSteps);

      // Recalculate phase date range from steps
      const stepDates = phaseSteps
        .flatMap((s) => [s.startDate, s.dueDate])
        .filter(Boolean)
        .sort();

      const newPhases = plan.phases.map((p) => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          status: newPhaseStatus,
          startDate: stepDates[0] ?? p.startDate,
          dueDate: stepDates[stepDates.length - 1] ?? p.dueDate,
        };
      });

      setPlan({ ...plan, steps: newSteps, phases: newPhases });

      // Close edit modal
      setEditStep(null);
      Message.success('步骤已更新');
    },
    [plan],
  );

  const handleCustomStepSave = useCallback(
    (newStep: SopStep) => {
      if (!plan) return;

      const newSteps = [...plan.steps, newStep];

      // Recalculate the parent phase
      const phaseId = newStep.phaseId;
      const phaseSteps = newSteps.filter((s) => s.phaseId === phaseId);
      const newPhaseStatus = derivePhaseStatus(phaseSteps);

      const stepDates = phaseSteps
        .flatMap((s) => [s.startDate, s.dueDate])
        .filter(Boolean)
        .sort();

      const newPhases = plan.phases.map((p) => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          status: newPhaseStatus,
          startDate: stepDates[0] ?? p.startDate,
          dueDate: stepDates[stepDates.length - 1] ?? p.dueDate,
        };
      });

      setPlan({ ...plan, steps: newSteps, phases: newPhases });

      setCustomStepPhaseId(null);
      Message.success('自定义步骤已添加');
    },
    [plan],
  );

  const handleDeletePlan = useCallback(() => {
    setPlan(null);
    if (id) {
      delete initialDeliveryPlans[id];
    }
    setExpandedPhaseIds([]);
    setExpandedStepIds([]);
    Message.success('交付计划已删除');
  }, [id]);

  const handleStepEdit = useCallback((step: SopStep) => {
    setEditStep(step);
  }, []);

  const handleAddCustomStep = useCallback((phaseId: string, phaseNo: number) => {
    setCustomStepPhaseId(phaseId);
    setCustomStepPhaseNo(phaseNo);
  }, []);

  // ─── Custom step count for a phase ───
  const getExistingCustomStepCount = useCallback(
    (phaseId: string) => {
      if (!plan) return 0;
      return plan.steps.filter((s) => s.phaseId === phaseId && s.isCustom).length;
    },
    [plan],
  );

  // ─── Render ───

  // Empty state: no plan yet
  if (!plan || !filteredPlan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid #e5e6eb',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={<IconLeft />}
            onClick={() => navigate('/projects')}
            style={{ marginRight: 12 }}
          />
          <Text bold style={{ fontSize: 16, marginRight: 16 }}>
            {project.name}
          </Text>
          {statusBadge(project.status as ProjectStatus)}
        </div>

        {/* Empty state */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: '#f7f8fa',
          }}
        >
          <Text style={{ fontSize: 16, color: '#86909c' }}>暂无交付计划</Text>
          <Button type="primary" onClick={() => setConfigModalVisible(true)}>
            生成交付计划
          </Button>
        </div>

        {/* Config modal */}
        <DeliveryConfigModal
          visible={configModalVisible}
          onCancel={() => setConfigModalVisible(false)}
          onConfirm={handleConfigConfirm}
          contractId={contractId}
          deliveryType={contractDeliveryType}
          projectStartDate={project.startDate}
        />
      </div>
    );
  }

  // Plan exists: full layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #e5e6eb',
          background: '#fff',
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* Back button */}
        <Button
          type="text"
          icon={<IconLeft />}
          onClick={() => navigate('/projects')}
        />

        {/* Project name */}
        <Text bold style={{ fontSize: 16, marginRight: 4 }}>
          {project.name}
        </Text>

        {/* Status badge */}
        {statusBadge(project.status as ProjectStatus)}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Phase filter */}
        <Select
          placeholder="板块筛选"
          value={phaseFilter ?? 0}
          onChange={(val: number) => setPhaseFilter(val === 0 ? null : val)}
          style={{ width: 180 }}
          size="small"
        >
          <Select.Option value={0}>全部</Select.Option>
          {SOP_PHASES.map((p) => (
            <Select.Option key={p.phaseNo} value={p.phaseNo}>
              {['一', '二', '三', '四', '五', '六', '七'][p.phaseNo - 1]}、{p.phaseName}
            </Select.Option>
          ))}
        </Select>

        {/* Zoom level */}
        <Radio.Group
          type="button"
          value={zoomLevel}
          onChange={(val) => setZoomLevel(val as GanttZoomLevel)}
          size="small"
        >
          {ZOOM_OPTIONS.map((opt) => (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>

        {/* Delete plan */}
        <Popconfirm
          title="确定删除交付计划？"
          onOk={handleDeletePlan}
        >
          <Button type="text" icon={<IconDelete />} status="danger" size="small" />
        </Popconfirm>
      </div>

      {/* ── Main content: split pane ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: TaskList (480px fixed) */}
        <div style={{ width: 480, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
          <TaskList
            plan={filteredPlan}
            project={project as unknown as Record<string, any>}
            onStepEdit={handleStepEdit}
            onAddCustomStep={handleAddCustomStep}
            expandedPhaseIds={expandedPhaseIds}
            onExpandedPhaseIdsChange={setExpandedPhaseIds}
            expandedStepIds={expandedStepIds}
            onExpandedStepIdsChange={setExpandedStepIds}
            scrollRef={listScrollRef}
          />
        </div>

        {/* Right: GanttChart (flex-1) */}
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <GanttChart
            plan={filteredPlan}
            zoomLevel={zoomLevel}
            onZoomLevelChange={setZoomLevel}
            scrollRef={ganttScrollRef}
          />
        </div>
      </div>

      {/* ── Bottom summary bar ── */}
      {summary && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 20px',
            borderTop: '1px solid #e5e6eb',
            background: '#fff',
            flexShrink: 0,
            gap: 24,
            fontSize: 13,
          }}
        >
          {/* Steps count */}
          <span>
            <Text type="secondary">步骤</Text>{' '}
            <Text bold>{summary.visibleSteps}</Text>
            <Text type="secondary">/{summary.totalSteps}</Text>
          </span>

          {/* Completion */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text type="secondary">完成</Text>
            <Progress
              percent={Math.round(summary.completion * 100)}
              size="small"
              style={{ width: 80 }}
              color={summary.completion >= 0.8 ? 'rgb(var(--green-6))' : 'rgb(var(--arcoblue-6))'}
            />
            <Text bold>{Math.round(summary.completion * 100)}%</Text>
          </span>

          {/* In progress */}
          <span>
            <Text type="secondary">进行中</Text>{' '}
            <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>
              {summary.inProgressCount}
            </Text>
          </span>

          {/* Overdue */}
          <span>
            <Text type="secondary">逾期</Text>{' '}
            <Text bold style={{ color: summary.overdueCount > 0 ? 'rgb(var(--red-6))' : undefined }}>
              {summary.overdueCount}
            </Text>
          </span>

          {/* Milestones */}
          <span>
            <Text type="secondary">里程碑</Text>{' '}
            <Text bold>{summary.completedMilestones}</Text>
            <Text type="secondary">/{summary.totalMilestones}</Text>
          </span>

          {/* Spacer */}
          <span style={{ flex: 1 }} />

          {/* Expected end date */}
          <span>
            <Text type="secondary">预计</Text>{' '}
            <Text bold>{summary.expectedEndDate}</Text>
          </span>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Config modal */}
      <DeliveryConfigModal
        visible={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onConfirm={handleConfigConfirm}
        contractId={contractId}
        deliveryType={contractDeliveryType}
        projectStartDate={project.startDate}
      />

      {/* Step edit modal */}
      <StepEditModal
        visible={!!editStep}
        step={editStep}
        onCancel={() => setEditStep(null)}
        onSave={handleStepEditSave}
        projectMembers={projectMembers}
      />

      {/* Custom step modal */}
      {customStepPhaseId && (
        <CustomStepModal
          visible={!!customStepPhaseId}
          phaseId={customStepPhaseId}
          phaseNo={customStepPhaseNo}
          projectId={project.id}
          existingCustomStepCount={getExistingCustomStepCount(customStepPhaseId)}
          onCancel={() => setCustomStepPhaseId(null)}
          onSave={handleCustomStepSave}
          projectMembers={projectMembers}
        />
      )}
    </div>
  );
}
