import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import {
  Tabs,
  Button,
  Space,
  Typography,
  Grid,
  Divider,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Timeline,
  Message,
  FormGrid,
} from '@/design-system';
import {
  IconUser,
  IconIdcard,
  IconCalendar,
  IconStar,
  IconEdit,
  IconTrophy,
  IconExperiment,
  IconCheck,
  IconPlus,
  IconClockCircle,
  IconFolder,
} from '@/design-system';
import { useEmployee } from './EmployeeContext';
import {
  EMPLOYMENT_STATUS,
  calcWorkDays,
  calcPromotionProgress,
  ABILITY_DIMENSION_LABELS,
  ABILITY_DIMENSION_COLORS,
  ABILITY_DIMENSION_TONES,
  AbilityDimension,
  MBTI_DESCRIPTIONS,
  ENNEAGRAM_DESCRIPTIONS,
  MBTIPersonality,
  BigFiveProfile,
  DISCProfile,
  EnneagramProfile,
  type LeaveType,
} from './mockData';
import { initialProjects, initialDailyReports } from '../../../delivery/project/mockData';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  EmptyState,
  MetricCard,
  MetricGrid,
  MoneyText,
  PageShell,
  ProcessOverview,
  ProcessRecordCard,
  SectionTabs,
  SectionCard,
  SplitLayout,
  SplitLayoutMain,
  SplitLayoutAside,
  StatusTag,
  type MetricItem,
  type ProcessOverviewStep,
  type StatusMap,
  type StatusTone,
  ProgressBar,
  STATUS_TONE_VARS,
} from '@/design-system';
import './employeeDetail.css';

const TabPane = Tabs.TabPane;
const Row = Grid.Row;
const Col = Grid.Col;
const { Title, Text, Paragraph } = Typography;
const FormItem = Form.Item;

// ---------- 员工能力雷达图 ----------
function RadarChart({ scores, size = 260 }: { scores: { tech: number; biz: number; mgmt: number; tool: number; domain: number }; size?: number }) {
  const dims: AbilityDimension[] = ['tech', 'biz', 'mgmt', 'tool', 'domain'];
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 32;
  const levels = 5;
  const angleFor = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2;

  const gridPolygons = Array.from({ length: levels }, (_, lv) => {
    const r = (radius * (lv + 1)) / levels;
    return dims.map((_, i) => { const a = angleFor(i); return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
  });

  const dataPts = dims.map((d, i) => {
    const a = angleFor(i);
    const r = (radius * scores[d]) / 100;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

  const labels = dims.map((d, i) => {
    const a = angleFor(i);
    return { x: cx + (radius + 20) * Math.cos(a), y: cy + (radius + 20) * Math.sin(a), label: ABILITY_DIMENSION_LABELS[d], color: ABILITY_DIMENSION_COLORS[d] };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="var(--color-border-2)" strokeWidth={1} strokeOpacity={0.5} />)}
      {dims.map((_, i) => { const a = angleFor(i); return <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)} stroke="var(--color-border-2)" strokeOpacity={0.3} />; })}
      <polygon points={dataPts} fill="rgb(var(--primary-6))" fillOpacity={0.25} stroke="rgb(var(--primary-6))" strokeWidth={2} />
      {dims.map((d, i) => {
        const a = angleFor(i);
        const r = (radius * scores[d]) / 100;
        return <circle key={d} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={4} fill="rgb(var(--primary-6))" />;
      })}
      {labels.map(l => (
        <text key={l.label} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={l.color} fontWeight={600}>
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// 职级阶梯定义
const CAREER_TIERS: ProcessOverviewStep[] = [
  { key: 'tier-1', title: '初阶研发 (L1-L3)', description: '规范交付 · 夯实基础' },
  { key: 'tier-2', title: '中坚骨干 (L4-L6)', description: '独立交付 · 模块主程' },
  { key: 'tier-3', title: '资深核心 (L7-L8)', description: '技术攻坚 · 架构设计' },
  { key: 'tier-4', title: '领军专家 (L9-L10)', description: '战略领航 · 团队导师' },
];

function getTierIndex(level: string): number {
  const match = level.match(/L(\d+)/i);
  const num = match ? parseInt(match[1], 10) : 1;
  if (num <= 3) return 0;
  if (num <= 6) return 1;
  if (num <= 8) return 2;
  return 3;
}

const MAIN_TABS = ['capability', 'projects', 'performance', 'attendance'] as const;
const SIDE_TABS = ['profile', 'personality', 'growth'] as const;
type MainTab = typeof MAIN_TABS[number];
type SideTab = typeof SIDE_TABS[number];

const PERF_RANK_STATUS: StatusMap<string> = {
  'S': { label: 'S 级', tone: 'purple' },
  'A': { label: 'A 级', tone: 'success' },
  'B': { label: 'B 级', tone: 'info' },
  'C': { label: 'C 级', tone: 'warning' },
  'D': { label: 'D 级', tone: 'danger' },
};

const ATTENDANCE_STATUS: StatusMap<string> = {
  '已批准': { label: '已批准', tone: 'success' },
  '待审批': { label: '待审批', tone: 'warning' },
  '已拒绝': { label: '已拒绝', tone: 'danger' },
  '已撤销': { label: '已撤销', tone: 'neutral' },
};

const PROJECT_STATUS: StatusMap<string> = {
  '进行中': { label: '进行中', tone: 'info' },
  '已完成': { label: '已完成', tone: 'success' },
  '验收中': { label: '验收中', tone: 'warning' },
  '未确认': { label: '未确认', tone: 'warning' },
  '未开始': { label: '未开始', tone: 'warning' },
  '搁置': { label: '搁置', tone: 'warning' },
  '延迟': { label: '延迟', tone: 'warning' },
  '催款中': { label: '催款中', tone: 'warning' },
};

function levelTone(level: string): StatusTone {
  const parsed = parseInt(level.replace('L', ''), 10);
  if (Number.isNaN(parsed)) return 'neutral';
  return parsed >= 9 ? 'purple' : parsed >= 7 ? 'info' : parsed >= 5 ? 'success' : parsed >= 3 ? 'warning' : 'neutral';
}

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getEmployeeById,
    updateEmployee,
    getPerformanceByEmployee,
    attendance,
    addAttendance,
  } = useEmployee();

  const employee = getEmployeeById(id || '');
  const performance = getPerformanceByEmployee(id || '');
  const empAttendance = attendance.filter((a) => a.employeeId === id);

  // URL 驱动标签页
  const activeMainTab: MainTab = MAIN_TABS.includes(searchParams.get('main') as MainTab)
    ? (searchParams.get('main') as MainTab)
    : 'capability';
  const activeSideTab: SideTab = SIDE_TABS.includes(searchParams.get('side') as SideTab)
    ? (searchParams.get('side') as SideTab)
    : 'profile';

  const updateQueryState = (key: 'main' | 'side', value: string) => {
    const next = new URLSearchParams(searchParams);
    if ((key === 'main' && value === 'capability') || (key === 'side' && value === 'profile')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const setActiveMainTab = (tab: string) => updateQueryState('main', tab);
  const setActiveSideTab = (tab: string) => updateQueryState('side', tab);

  // 弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaveForm] = Form.useForm();
  const [promotionModalVisible, setPromotionModalVisible] = useState(false);

  // 员工与项目、工时履约联动
  const employeeDailyReports = useMemo(() => {
    if (!employee) return [];
    return initialDailyReports.filter((r) => r.personName === employee.name);
  }, [employee]);

  const totalLoggedHours = useMemo(
    () => employeeDailyReports.reduce((sum, r) => sum + r.hours, 0),
    [employeeDailyReports]
  );

  const employeeProjects = useMemo(() => {
    if (!employee) return [];
    const reportProjectIds = new Set(employeeDailyReports.map((r) => r.projectId));
    return initialProjects.filter(
      (p) =>
        reportProjectIds.has(p.id) ||
        p.owner === employee.name ||
        p.frontendUsers?.includes(employee.name) ||
        p.backendUsers?.includes(employee.name) ||
        p.testUsers?.includes(employee.name) ||
        p.productUsers?.includes(employee.name) ||
        p.uiUsers?.includes(employee.name)
    );
  }, [employee, employeeDailyReports]);

  if (!employee) {
    return (
      <PageShell breadcrumbs={[{ label: '员工管理', to: '/employees' }, { label: '员工列表', to: '/employees' }, { label: '员工不存在' }]}>
        <SectionCard>
          <EmptyState
            description="未找到该员工档案或链接已失效"
            action={<Button type="primary" onClick={() => navigate('/employees')}>返回员工列表</Button>}
          />
        </SectionCard>
      </PageShell>
    );
  }

  const workDays = calcWorkDays(employee.hireDate);
  const latestPerf = performance.length > 0 ? performance[performance.length - 1] : null;
  const cap = employee.capability;
  const totalLeaveDays = empAttendance.reduce((sum, a) => sum + (a.status === '已批准' ? a.days : 0), 0);
  const costEquivalent = totalLoggedHours * (employee.standardHourlyRate || 0);

  // 编辑员工提交
  const handleEditSubmit = () => {
    editForm.validate().then((values) => {
      updateEmployee(employee.id, values);
      Message.success('员工档案已更新');
      setEditModalVisible(false);
    });
  };

  // 请假申请提交
  const handleLeaveSubmit = () => {
    leaveForm.validate().then((values) => {
      addAttendance({
        employeeId: employee.id,
        employeeName: employee.name,
        type: values.type,
        startDate: values.dateRange[0],
        endDate: values.dateRange[1],
        days: Number(values.days),
        reason: values.reason,
        status: '待审批',
        createdAt: new Date().toISOString(),
      });
      Message.success('请假申请已提交，等待主管审批');
      setLeaveModalVisible(false);
      leaveForm.resetFields();
    });
  };

  // 顶部 4 大微可视化指标卡
  const overviewMetrics: MetricItem[] = [
    {
      key: 'capability',
      label: (
        <span className="employee-metric-heading">
          <span>加权能力评分</span>
          <strong>{cap ? `${cap.weightedScore} 分` : '未评定'}</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <ProgressBar
            percent={calcPromotionProgress(cap?.weightedScore || 0, employee.level)}
            size="small"
            tone={cap?.promotionEligible ? 'success' : 'info'}
            showValue={false}
          />
          <div className="employee-metric-detail-row">
            {cap?.promotionEligible ? '🏅 已达到晋级门槛，可发起评审' : `当前累计经验 ${cap?.totalXP || 0} XP`}
          </div>
        </div>
      ),
      tone: cap?.promotionEligible ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('capability'),
      ariaLabel: '查看能力与技能树',
    },
    {
      key: 'projects',
      label: (
        <span className="employee-metric-heading">
          <span>项目交付投入</span>
          <strong>{totalLoggedHours} 工时</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="employee-metric-value-row">
            <StatusTag tone="info">{employeeProjects.length} 个交付项目</StatusTag>
            <span>时薪 <MoneyText value={employee.standardHourlyRate} />/h</span>
          </div>
          <div className="employee-metric-detail-row">
            累计产出成本折合 <MoneyText value={costEquivalent} />
          </div>
        </div>
      ),
      tone: totalLoggedHours > 0 ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('projects'),
      ariaLabel: '查看项目与工时投入',
    },
    {
      key: 'performance',
      label: (
        <span className="employee-metric-heading">
          <span>最近考核评级</span>
          <strong>{latestPerf ? latestPerf.periodLabel : '暂无考核'}</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="employee-metric-value-row">
            {latestPerf ? (
              <>
                <StatusTag tone={PERF_RANK_STATUS[latestPerf.rank].tone}>{latestPerf.rank} 级</StatusTag>
                <span>KPI {latestPerf.kpiScore} 分 · 综合 {latestPerf.totalScore} 分</span>
              </>
            ) : (
              <span>待发起季度考评</span>
            )}
          </div>
          <div className="employee-metric-detail-row">
            {latestPerf?.evaluator ? `考核人：${latestPerf.evaluator}` : '完成考核后自动计入画像'}
          </div>
        </div>
      ),
      tone: latestPerf?.rank === 'S' || latestPerf?.rank === 'A' ? 'success' : 'neutral',
      onClick: () => setActiveMainTab('performance'),
      ariaLabel: '查看考核详情',
    },
    {
      key: 'attendance',
      label: (
        <span className="employee-metric-heading">
          <span>在职出勤历程</span>
          <strong>{workDays} 天</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="employee-metric-value-row">
            <StatusTag tone="success">出勤状态正常</StatusTag>
            <span>请假 {totalLeaveDays} 天</span>
          </div>
          <div className="employee-metric-detail-row">
            入职时间 <DateText value={employee.hireDate} /> · 合同在保
          </div>
        </div>
      ),
      tone: 'neutral',
      onClick: () => setActiveMainTab('attendance'),
      ariaLabel: '查看考勤记录',
    },
  ];

  return (
    <PageShell
      className="employee-detail-360"
      breadcrumbs={[
        { label: '员工管理', to: '/employees' },
        { label: '员工列表', to: '/employees' },
        { label: employee.name },
      ]}
    >
      {/* 顶部 ProcessOverview */}
      <ProcessOverview
        identifier={employee.jobNumber}
        title={employee.name}
        tags={
          <>
            <StatusTag tone="info">{employee.department} · {employee.position}</StatusTag>
            <StatusTag tone={levelTone(employee.level)}>{employee.level}</StatusTag>
            <StatusTag meta={EMPLOYMENT_STATUS[employee.employmentStatus]} />
            {cap?.promotionEligible && <StatusTag tone="warning">🌟 具备晋升资格</StatusTag>}
          </>
        }
        actions={
          <Space>
            {cap?.promotionEligible && (
              <Button
                type="primary"
                size="small"
                icon={<IconTrophy />}
                onClick={() => setPromotionModalVisible(true)}
              >
                发起晋升评审
              </Button>
            )}
            <Button
              size="small"
              icon={<IconPlus />}
              onClick={() => {
                leaveForm.resetFields();
                setLeaveModalVisible(true);
              }}
            >
              登记请假
            </Button>
            <Button
              size="small"
              icon={<IconExperiment />}
              onClick={() => navigate(`/employees/${employee.id}/skills`)}
            >
              领域技能树
            </Button>
            <Button
              size="small"
              icon={<IconEdit />}
              onClick={() => {
                editForm.setFieldsValue(employee);
                setEditModalVisible(true);
              }}
            >
              编辑资料
            </Button>
          </Space>
        }
        currentStep={getTierIndex(employee.level)}
        steps={CAREER_TIERS}
      />

      {/* 4 大核心微可视化指标卡 */}
      <MetricGrid items={overviewMetrics} />

      {/* 主次分流双栏工作区 */}
      <SplitLayout>
        {/* 左侧 Main 交付与成长干道 */}
        <SplitLayoutMain>
          <SectionCard>
            <SectionTabs
              activeKey={activeMainTab}
              onChange={setActiveMainTab}
              items={[
                {
                  key: 'capability',
                  label: <span><IconTrophy style={{ color: 'var(--warning-500)' }} /> 能力与技能树</span>,
                  content: (
                    <>
                              {cap ? (
                                <div style={{ marginTop: 12 }}>
                                  <Row gutter={24} style={{ marginBottom: 20 }}>
                                    <Col span={10}>
                                      <SectionCard title="五维能力雷达">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                                          <RadarChart scores={cap.scores} size={250} />
                                        </div>
                                      </SectionCard>
                                    </Col>
                                    <Col span={14}>
                                      <SectionCard title="能力数值分布与晋升判定">
                                        <div style={{ padding: '14px 18px' }}>
                                        {(Object.keys(cap.scores) as AbilityDimension[]).map((dim) => (
                                          <div key={dim} style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                              <span style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)', color: STATUS_TONE_VARS[ABILITY_DIMENSION_TONES[dim]].fg }}>
                                                {ABILITY_DIMENSION_LABELS[dim]}
                                              </span>
                                              <span style={{ fontWeight: 700, fontSize: 'var(--ds-text-dense)' }}>{cap.scores[dim]} / 100</span>
                                            </div>
                                            <ProgressBar percent={cap.scores[dim]} tone={ABILITY_DIMENSION_TONES[dim]} size="small" />
                                          </div>
                                        ))}
              
                                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border-2)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <Text bold style={{ fontSize: 'var(--ds-text-dense)' }}>加权总分及晋升门槛</Text>
                                            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: cap.promotionEligible ? 'var(--success-500)' : 'rgb(var(--primary-6))' }}>
                                              {cap.weightedScore} 分
                                            </span>
                                          </div>
                                          <ProgressBar
                                            percent={calcPromotionProgress(cap.weightedScore, employee.level)}
                                            tone={cap.promotionEligible ? 'success' : 'info'}
                                            size="small"
                                          />
                                          <div style={{ marginTop: 8 }}>
                                            {cap.promotionEligible ? (
                                              <StatusTag tone="success">
                                                <IconCheck /> 数值已达到晋升要求，可点击上方按钮发起职级评审！
                                              </StatusTag>
                                            ) : (
                                              <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                                                通过项目实践与日报填报积累经验值，达标后系统自动开放晋级资格。
                                              </Text>
                                            )}
                                          </div>
                                        </div>
                                        </div>
                                      </SectionCard>
                                    </Col>
                                  </Row>
              
                                  {/* 领域技能树独立图谱概览与入口 */}
                                  <SectionCard
                                    style={{
                                      marginTop: 16,
                                      borderRadius: 'var(--radius-md)',
                                      background: 'linear-gradient(135deg, var(--color-fill-1), var(--color-bg-2))',
                                      border: '1px solid var(--color-border-2)',
                                    }}
                                    bodyStyle={{ padding: '16px 20px' }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                      <div>
                                        <Space size={8} align="center">
                                          <IconExperiment style={{ color: 'rgb(var(--purple-6))', fontSize: 'var(--text-lg)' }} />
                                          <Text bold style={{ fontSize: 'var(--text-sm)' }}>领域技能树全景图谱</Text>
                                          <StatusTag tone="purple" size="small">独立视界</StatusTag>
                                        </Space>
                                        <div style={{ marginTop: 6, fontSize: 'var(--ds-text-dense)', color: 'var(--color-text-2)' }}>
                                          已沉淀包含技术工程、业务理解、项目管理、工具运用、领域专精 5 大维度共 23 项技能节点，点击可进入沉浸式全域图谱查看解锁路径与前置要求。
                                        </div>
                                      </div>
                                      <Button
                                        type="primary"
                                        icon={<IconExperiment />}
                                        onClick={() => navigate(`/employees/${employee.id}/skills`)}
                                      >
                                        进入领域技能树
                                      </Button>
                                    </div>
                                  </SectionCard>
                                </div>
                              ) : (
                                <EmptyState description="该员工暂未录入能力模型数据" />
                              )}
                            
                    </>
                  ),
                },
                {
                  key: 'projects',
                  label: <span><IconFolder /> 参与项目与工时 ({employeeProjects.length})</span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                  <Text type="secondary">
                                    统计说明：归集自项目团队配置及日常项目日报，工时直接沉淀为项目人力成本与员工实战经验。
                                  </Text>
                                  <StatusTag tone="info">累计填报 {totalLoggedHours} 工时</StatusTag>
                                </div>
              
                                {employeeProjects.length > 0 ? (
                                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    {employeeProjects.map((proj) => {
                                      const projReports = employeeDailyReports.filter((r) => r.projectId === proj.id);
                                      const projHours = projReports.reduce((sum, r) => sum + r.hours, 0);
                                      const latestReport = projReports[projReports.length - 1];
                                      return (
                                        <ProcessRecordCard
                                          key={proj.id}
                                          className="employee-project-card"
                                          title={<Link to={`/projects/${proj.id}`}>{proj.name}</Link>}
                                          tags={<><StatusTag meta={PROJECT_STATUS[proj.status]} /><StatusTag size="small">交付进度 {proj.progress}%</StatusTag></>}
                                          identifier={<>项目经理：{proj.owner} · 排期：{proj.startDate ? <DateText value={proj.startDate} /> : '—'} 至 {proj.expectedEndDate ? <DateText value={proj.expectedEndDate} /> : '—'}</>}
                                          summary={<><span><strong>{projHours}</strong> 工时</span><span>折合成本 <MoneyText value={projHours * (employee.standardHourlyRate || 0)} /></span></>}
                                          details={latestReport ? <><span className="employee-project-card__caption">最新填报内容（<DateText value={latestReport.date} />）：</span>{latestReport.workContent}</> : undefined}
                                        />
                                      );
                                    })}
                                  </Space>
                                ) : (
                                  <EmptyState description="该员工暂无关联项目或日报记录" />
                                )}
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'performance',
                  label: <span><IconTrophy /> 绩效考核记录 ({performance.length})</span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                  {[...performance].reverse().slice(0, 4).map((p) => (
                                    <Col span={6} key={p.id}>
                                      <MetricCard
                                        label={p.periodLabel}
                                        value={p.totalScore}
                                        suffix="分"
                                        badge={<StatusTag tone={PERF_RANK_STATUS[p.rank].tone}>{p.rank} 级</StatusTag>}
                                        detail={`KPI ${p.kpiScore} · 行为 ${p.behaviorScore}`}
                                      />
                                    </Col>
                                  ))}
                                </Row>
              
                                <DataTable
                                  columns={[
                                    { title: '考核周期', dataIndex: 'periodLabel', width: 110 },
                                    { title: 'KPI 分数', dataIndex: 'kpiScore', width: 90 },
                                    { title: '行为分数', dataIndex: 'behaviorScore', width: 90 },
                                    { title: '综合得分', dataIndex: 'totalScore', width: 90, render: (score) => <strong>{score}</strong> },
                                    {
                                      title: '绩效评级',
                                      dataIndex: 'rank',
                                      width: 90,
                                      render: (rank) => <StatusTag tone={PERF_RANK_STATUS[rank].tone}>{rank}</StatusTag>,
                                    },
                                    { title: '考核人', dataIndex: 'evaluator', width: 100 },
                                    { title: '考核评语', dataIndex: 'comment', ellipsis: true },
                                  ]}
                                  data={[...performance].reverse()}
                                  rowKey="id"
                                  pagination={false}
                                  emptyDescription="暂无历史绩效记录"
                                />
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'attendance',
                  label: <span><IconCalendar /> 考勤出勤记录 ({empAttendance.length})</span>,
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <Text type="secondary">考勤出勤明细由员工发起，主管审批通过后生效并计入考勤月报。</Text>
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<IconPlus />}
                                    onClick={() => {
                                      leaveForm.resetFields();
                                      setLeaveModalVisible(true);
                                    }}
                                  >
                                    新建请假申请
                                  </Button>
                                </div>
              
                                <DataTable
                                  columns={[
                                    { title: '类型', dataIndex: 'type', width: 90, render: (t) => <StatusTag tone="neutral">{t}</StatusTag> },
                                    { title: '开始日期', dataIndex: 'startDate', width: 120, render: (value) => <DateText value={value} /> },
                                    { title: '结束日期', dataIndex: 'endDate', width: 120, render: (value) => <DateText value={value} /> },
                                    { title: '天数', dataIndex: 'days', width: 70, render: (d) => `${d} 天` },
                                    { title: '请假事由', dataIndex: 'reason' },
                                    {
                                      title: '审批状态',
                                      dataIndex: 'status',
                                      width: 90,
                                      render: (s) => <StatusTag meta={ATTENDANCE_STATUS[s]} />,
                                    },
                                    { title: '审批人', dataIndex: 'approvedBy', width: 100, render: (v) => v || '待审批' },
                                  ]}
                                  data={empAttendance}
                                  rowKey="id"
                                  pagination={false}
                                  emptyDescription="暂无考勤请假记录"
                                />
                              </div>
                            
                    </>
                  ),
                },
              ]}
            />
          </SectionCard>
        </SplitLayoutMain>

        {/* 右侧 Aside 档案与画像伴生 */}
        <SplitLayoutAside>
          <SectionCard>
            <SectionTabs
              activeKey={activeSideTab}
              onChange={setActiveSideTab}
              items={[
                {
                  key: 'profile',
                  label: "人事档案",
                  content: (
                    <>
                              <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 8 }}>
                                <div>
                                  <Title heading={6} style={{ marginBottom: 8 }}><Space><IconUser /> 基础身份资料</Space></Title>
                                  <div className="employee-profile-identity-layout">
                                    <div className="employee-profile-identity-info">
                                      <DescriptionsCard
                                        bare
                                        columns={1}
                                        items={[
                                          { key: 'jobNumber', label: '员工工号', value: employee.jobNumber },
                                          { key: 'phone', label: '手机号码', value: employee.phone },
                                          { key: 'email', label: '电子邮箱', value: employee.email },
                                          { key: 'education', label: '最高学历', value: employee.education || '—' },
                                          { key: 'school', label: '毕业院校', value: employee.school || '—' },
                                          { key: 'emergency', label: '紧急联系', value: employee.emergencyContact || '—' },
                                        ]}
                                      />
                                    </div>
                                    <div className="employee-profile-identity-avatar">
                                      <span className="employee-avatar-badge employee-avatar-profile">
                                        {employee.name.slice(0, 1)}
                                      </span>
                                      <StatusTag meta={EMPLOYMENT_STATUS[employee.employmentStatus]} size="small" />
                                    </div>
                                  </div>
                                </div>
              
                                <Divider style={{ margin: '8px 0' }} />
              
                                <div>
                                  <Title heading={6} style={{ marginBottom: 8 }}><Space><IconIdcard /> 岗位与用工合同</Space></Title>
                                  <DescriptionsCard
                                    bare
                                    columns={1}
                                    items={[
                                      { key: 'department', label: '所属部门', value: employee.department },
                                      { key: 'position', label: '任职职位', value: employee.position },
                                      { key: 'hireDate', label: '入职日期', value: <DateText value={employee.hireDate} /> },
                                      { key: 'regularDate', label: '转正日期', value: employee.转正Date ? <DateText value={employee.转正Date} /> : '已转正' },
                                      { key: 'contractEndDate', label: '合同到期', value: employee.contractEndDate ? <DateText value={employee.contractEndDate} /> : '—' },
                                      { key: 'bankAccount', label: '银行卡号', value: employee.bankAccount || '—' },
                                    ]}
                                  />
                                </div>
              
                                <Divider style={{ margin: '8px 0' }} />
              
                                <div>
                                  <Title heading={6} style={{ marginBottom: 8 }}><Space><IconClockCircle /> 成本核算口径</Space></Title>
                                  <DescriptionsCard
                                    bare
                                    columns={1}
                                    items={[
                                      {
                                        key: 'hourlyRate',
                                        label: '标准时薪',
                                        value: <span style={{ fontWeight: 700, color: 'rgb(var(--primary-6))' }}><MoneyText value={employee.standardHourlyRate} />/h</span>,
                                      },
                                      {
                                        key: 'monthlyWorkdays',
                                        label: '每月工天',
                                        value: employee.monthlyWorkdays ? `${employee.monthlyWorkdays} 天` : '标准 21.75 天',
                                      },
                                      {
                                        key: 'sharedOverhead',
                                        label: '公共分摊',
                                        value: employee.sharedOverheadCost ? <MoneyText value={employee.sharedOverheadCost} /> : '按工时自动计提',
                                      },
                                    ]}
                                  />
                                </div>
                              </Space>
                            
                    </>
                  ),
                },
                {
                  key: 'personality',
                  label: "性格画像",
                  content: (
                    <>
                              <div style={{ marginTop: 8 }}>
                                {employee.personality ? (
                                  <PersonalityView assessment={employee.personality} employeeName={employee.name} />
                                ) : (
                                  <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-3)' }}>
                                    <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 12 }}>🧩</div>
                                    <Paragraph>该员工尚未完成性格测评</Paragraph>
                                    <Paragraph style={{ fontSize: 'var(--text-xs)' }}>完成 MBTI、大五人格、DISC 测评后将自动生成测评画像。</Paragraph>
                                  </div>
                                )}
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'growth',
                  label: "成长足迹",
                  content: (
                    <>
                              <div style={{ marginTop: 12 }}>
                                <Timeline>
                                  {cap?.promotionEligible && (
                                    <Timeline.Item dot={<IconTrophy style={{ color: 'var(--warning-500)' }} />}>
                                      <div className="employee-growth-timeline-item">
                                        <Text bold style={{ color: 'var(--warning-500)' }}>达到职级晋升门槛</Text>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>当前能力加权分 {cap.weightedScore}，具备升级资格</div>
                                      </div>
                                    </Timeline.Item>
                                  )}
                                  {latestPerf && (
                                    <Timeline.Item dot={<IconStar style={{ color: 'rgb(var(--primary-6))' }} />}>
                                      <div className="employee-growth-timeline-item">
                                        <Text bold>{latestPerf.periodLabel} 绩效考核完成</Text>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                          获评 {latestPerf.rank} 级，KPI 得分 {latestPerf.kpiScore}
                                        </div>
                                      </div>
                                    </Timeline.Item>
                                  )}
                                  {totalLoggedHours > 0 && (
                                    <Timeline.Item dot={<IconFolder style={{ color: 'rgb(var(--cyan-6))' }} />}>
                                      <div className="employee-growth-timeline-item">
                                        <Text bold>参与交付 {employeeProjects.length} 个项目</Text>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>累计贡献工时 {totalLoggedHours}h</div>
                                      </div>
                                    </Timeline.Item>
                                  )}
                                  <Timeline.Item dot={<IconCheck style={{ color: 'var(--success-500)' }} />}>
                                    <div className="employee-growth-timeline-item">
                                      <Text bold>入职中科集团</Text>
                                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                        <DateText value={employee.hireDate} /> · {employee.department} {employee.position}（{employee.level}）
                                      </div>
                                    </div>
                                  </Timeline.Item>
                                </Timeline>
                              </div>
                            
                    </>
                  ),
                },
              ]}
            />
          </SectionCard>
        </SplitLayoutAside>
      </SplitLayout>

      {/* 编辑员工资料弹窗 */}
      <Modal
        title="编辑员工信息"
        visible={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        style={{ width: 560 }}
      >
        <Form form={editForm} layout="vertical">
          <FormGrid columns={2}>
              <FormItem label="员工姓名" field="name" rules={[{ required: true }]}>
                <Input />
              </FormItem>
              <FormItem label="手机号码" field="phone" rules={[{ required: true }]}>
                <Input />
              </FormItem>
              <FormItem label="所属部门" field="department" rules={[{ required: true }]}>
                <Input />
              </FormItem>
              <FormItem label="任职职位" field="position" rules={[{ required: true }]}>
                <Input />
              </FormItem>
              <FormItem label="电子邮箱" field="email">
                <Input />
              </FormItem>
              <FormItem label="紧急联系人" field="emergencyContact">
                <Input />
              </FormItem>
              <FormItem label="最高学历" field="education">
                <Input />
              </FormItem>
              <FormItem label="毕业院校" field="school">
                <Input />
              </FormItem>
          </FormGrid>
        </Form>
      </Modal>

      {/* 登记请假弹窗 */}
      <Modal
        title="登记请假申请"
        visible={leaveModalVisible}
        onOk={handleLeaveSubmit}
        onCancel={() => setLeaveModalVisible(false)}
        style={{ width: 480 }}
      >
        <Form form={leaveForm} layout="vertical">
          <FormItem label="请假类型" field="type" rules={[{ required: true }]}>
            <Select placeholder="选择请假种类">
              {(['年假', '事假', '病假', '调休', '婚假', '产假', '丧假'] as LeaveType[]).map((t) => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="请假日期范围" field="dateRange" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </FormItem>
          <FormItem label="请假天数" field="days" rules={[{ required: true }]}>
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
          </FormItem>
          <FormItem label="请假事由" field="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="简述请假事由..." />
          </FormItem>
        </Form>
      </Modal>

      {/* 发起晋升评审弹窗 */}
      <Modal
        title="发起职级晋升评审"
        visible={promotionModalVisible}
        onOk={() => {
          Message.success('已发起职级晋升评审流程，已进入审批中心');
          setPromotionModalVisible(false);
        }}
        onCancel={() => setPromotionModalVisible(false)}
      >
        <Paragraph>
          员工 <strong>{employee.name}</strong> 当前职级为 <strong>{employee.level}</strong>，加权能力分为 <strong>{cap?.weightedScore} 分</strong>，已满足晋升门槛。
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
          点击确认后将生成《员工职级晋升审批单》，抄送部门负责人与总经理进行综合评审。
        </Paragraph>
      </Modal>
    </PageShell>
  );
}

// ============================================================
// 性格测评视图
// ============================================================

interface PersonalityViewProps {
  assessment: NonNullable<import('./mockData').PersonalityAssessment>;
  employeeName: string;
}

function PersonalityView({ assessment, employeeName }: PersonalityViewProps) {
  const { mbti, bigFive, disc, enneagram } = assessment;
  const testCount = [mbti, bigFive, disc, enneagram].filter(Boolean).length;

  return (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      <SectionCard bordered={false} style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--ds-tone-purple-fg) 5%, transparent), color-mix(in srgb, var(--ds-tone-pink-fg) 5%, transparent))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 'var(--text-2xl)' }}>🧩</div>
          <div>
            <Title heading={6} style={{ margin: 0 }}>{employeeName} · 测评画像</Title>
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>已完成 {testCount} 项测试</Text>
          </div>
        </div>
      </SectionCard>

      {mbti && <MBTICard mbti={mbti} />}
      {bigFive && <BigFiveCard bigFive={bigFive} />}
      {disc && <DISCCard disc={disc} />}
      {enneagram && <EnneagramCard enneagram={enneagram} />}
    </Space>
  );
}

function MBTICard({ mbti }: { mbti: MBTIPersonality }) {
  const info = MBTI_DESCRIPTIONS[mbti.type] || { nickname: '未知', summary: '' };

  const dimensions = [
    { dim: 'E/I', pos: '外向 E', neg: '内向 I', value: mbti.EI },
    { dim: 'S/N', pos: '实感 S', neg: '直觉 N', value: mbti.SN },
    { dim: 'T/F', pos: '思考 T', neg: '情感 F', value: mbti.TF },
    { dim: 'J/P', pos: '判断 J', neg: '感知 P', value: mbti.JP },
  ];

  return (
    <SectionCard title={<span className="flex items-center gap-2">🔮 MBTI 性格 · {mbti.type}</span>}>
      <div style={{ marginBottom: 12 }}>
        <Title heading={6} style={{ margin: '0 0 4px' }}>{info.nickname}</Title>
        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{info.summary}</Text>
      </div>

      <Row gutter={8}>
        {dimensions.map((d) => {
          const isPos = d.value >= 0;
          const pct = Math.abs(d.value);
          return (
            <Col span={6} key={d.dim}>
              <div style={{ textAlign: 'center', fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-3)', marginBottom: 2 }}>{d.dim}</div>
              <ProgressBar percent={pct} tone={isPos ? 'info' : 'purple'} size="small" showValue={false} />
              <div style={{ textAlign: 'center', fontSize: 'var(--ds-text-micro)', color: 'var(--color-text-2)', marginTop: 2 }}>
                {isPos ? d.pos : d.neg} {pct}%
              </div>
            </Col>
          );
        })}
      </Row>
    </SectionCard>
  );
}

function BigFiveCard({ bigFive }: { bigFive: BigFiveProfile }) {
  const traits = [
    { label: 'openness', cn: '开放性', value: bigFive.openness, tone: 'purple' as const },
    { label: 'conscientiousness', cn: '尽责性', value: bigFive.conscientiousness, tone: 'success' as const },
    { label: 'extraversion', cn: '外向性', value: bigFive.extraversion, tone: 'warning' as const },
    { label: 'agreeableness', cn: '宜人性', value: bigFive.agreeableness, tone: 'info' as const },
    { label: 'neuroticism', cn: '情绪稳定', value: 100 - bigFive.neuroticism, tone: 'cyan' as const },
  ];

  return (
    <SectionCard title="🧬 大五人格 OCEAN">
      {traits.map((t) => (
        <div key={t.label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>{t.cn}</span>
            <span style={{ fontWeight: 700, color: STATUS_TONE_VARS[t.tone].fg }}>{t.value}</span>
          </div>
          <ProgressBar percent={t.value} tone={t.tone} size="small" showValue={false} />
        </div>
      ))}
    </SectionCard>
  );
}

function DISCCard({ disc }: { disc: DISCProfile }) {
  const all = [
    { key: 'D', label: '指挥型', value: disc.dominance, tone: 'danger' as const },
    { key: 'I', label: '影响型', value: disc.influence, tone: 'warning' as const },
    { key: 'S', label: '稳健型', value: disc.steadiness, tone: 'success' as const },
    { key: 'C', label: '服从型', value: disc.compliance, tone: 'info' as const },
  ];

  return (
    <SectionCard title="🎭 DISC 行为风格">
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {all.map((item) => (
          <StatusTag key={item.key} tone={item.key === disc.primaryStyle ? item.tone : 'neutral'}>
            {item.key} {item.label} {item.value}%
          </StatusTag>
        ))}
      </div>
      {all.map((item) => (
        <div key={item.key} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 2 }}>
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </div>
          <ProgressBar percent={item.value} tone={item.tone} size="small" showValue={false} />
        </div>
      ))}
    </SectionCard>
  );
}

function EnneagramCard({ enneagram }: { enneagram: EnneagramProfile }) {
  const info = ENNEAGRAM_DESCRIPTIONS[enneagram.type] || { name: '未知', summary: '' };

  return (
    <SectionCard title="🔢 九型人格">
      <Space size={8} align="center">
        <StatusTag tone="purple" style={{ fontSize: 'var(--text-sm)' }}>{enneagram.type} 号 · {info.name}</StatusTag>
        {enneagram.wing && <StatusTag>侧翼 W{enneagram.wing}</StatusTag>}
      </Space>
      <Paragraph style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
        {info.summary}
      </Paragraph>
    </SectionCard>
  );
}
