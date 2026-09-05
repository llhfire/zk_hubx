import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Grid,
  Progress,
  Tabs,
  Radio,
  Empty,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconTrophy,
  IconExperiment,
  IconLock,
  IconUnlock,
  IconBranch,
  IconInfoCircle,
} from '@arco-design/web-react/icon';
import {
  PageShell,
  ProcessOverview,
  ProcessMetricGrid,
  ProcessWorkspace,
  ProcessWorkspaceMain,
  ProcessWorkspaceAside,
  type ProcessMetricItem,
  type ProcessOverviewStep,
} from '@/app/components/ui';
import { useEmployee } from './EmployeeContext';
import {
  ABILITY_DIMENSION_COLORS,
  ABILITY_DIMENSION_LABELS,
  getLevelColor,
  getStatusColor,
  AbilityDimension,
  SkillNode,
} from './mockData';
import './employeeDetail.css';

const { Title, Text, Paragraph } = Typography;
const TabPane = Tabs.TabPane;
const Row = Grid.Row;
const Col = Grid.Col;

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

// 紧凑型五维雷达图
function RadarChart({ scores, size = 220 }: { scores: Record<AbilityDimension, number>; size?: number }) {
  const dims: AbilityDimension[] = ['tech', 'biz', 'mgmt', 'tool', 'domain'];
  const count = dims.length;
  const radius = (size - 60) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const angleFor = (i: number) => (i * 2 * Math.PI) / count - Math.PI / 2;

  const rings = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = rings.map((r) =>
    dims.map((_, i) => {
      const a = angleFor(i);
      return `${cx + radius * r * Math.cos(a)},${cy + radius * r * Math.sin(a)}`;
    }).join(' ')
  );

  const dataPts = dims
    .map((d, i) => {
      const a = angleFor(i);
      const r = (radius * (scores[d] || 0)) / 100;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    })
    .join(' ');

  const labels = dims.map((d, i) => {
    const a = angleFor(i);
    return {
      x: cx + (radius + 18) * Math.cos(a),
      y: cy + (radius + 18) * Math.sin(a),
      label: ABILITY_DIMENSION_LABELS[d],
      color: ABILITY_DIMENSION_COLORS[d],
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="var(--color-border-2)" strokeWidth={1} strokeOpacity={0.5} />
      ))}
      {dims.map((_, i) => {
        const a = angleFor(i);
        return <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)} stroke="var(--color-border-2)" strokeOpacity={0.3} />;
      })}
      <polygon points={dataPts} fill="rgb(var(--primary-6))" fillOpacity={0.25} stroke="rgb(var(--primary-6))" strokeWidth={2} />
      {dims.map((d, i) => {
        const a = angleFor(i);
        const r = (radius * (scores[d] || 0)) / 100;
        return <circle key={d} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={4} fill="rgb(var(--primary-6))" />;
      })}
      {labels.map((l) => (
        <text key={l.label} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={l.color} fontWeight={600}>
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// 技能树全量卡片
interface SkillCardProps {
  skill: SkillNode;
  empScore: number;
  allSkills: SkillNode[];
  allScores: Record<AbilityDimension, number>;
}

function SkillFullCard({ skill, empScore, allSkills, allScores }: SkillCardProps) {
  const prereqs = skill.prerequisites.map((pid) => allSkills.find((s) => s.id === pid)).filter(Boolean) as SkillNode[];
  const prereqsMet = prereqs.every((p) => {
    const pScore = allScores[p.domain] || 0;
    return p.requiredScore ? pScore >= p.requiredScore : true;
  });
  const scoreMet = skill.requiredScore ? empScore >= skill.requiredScore : false;
  const unlocked = prereqsMet && scoreMet;
  const mastery = unlocked
    ? (skill.requiredScore && empScore / skill.requiredScore >= 1.4 ? '精通专家' : empScore / skill.requiredScore >= 1.15 ? '熟练运用' : '基础入门')
    : '尚未解锁';

  const progressPercent = skill.requiredScore
    ? Math.min(100, Math.round((empScore / skill.requiredScore) * 100))
    : 100;

  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 10,
        border: `1px solid ${unlocked ? 'var(--color-border-2)' : 'var(--color-border-1)'}`,
        background: unlocked ? 'var(--color-bg-2)' : 'var(--color-fill-1)',
        opacity: unlocked ? 1 : 0.72,
        transition: 'all 200ms ease',
        boxShadow: unlocked ? '0 2px 8px rgba(0, 0, 0, 0.04)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 160,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <Space size={6} align="center">
            <span style={{ fontSize: 16 }}>{unlocked ? <IconUnlock style={{ color: 'var(--success-500)' }} /> : <IconLock style={{ color: 'var(--color-text-3)' }} />}</span>
            <Text bold style={{ fontSize: 14 }}>{skill.name}</Text>
          </Space>
          {unlocked ? (
            <Tag color={ABILITY_DIMENSION_COLORS[skill.domain]} size="small" style={{ fontWeight: 600 }}>
              {mastery}
            </Tag>
          ) : (
            <Tag size="small" style={{ color: 'var(--color-text-3)' }}>
              需要 {skill.requiredScore} 分
            </Tag>
          )}
        </div>

        <Paragraph style={{ fontSize: 12, color: 'var(--color-text-2)', margin: '4px 0 10px', minHeight: 36, lineHeight: '18px' }}>
          {skill.description}
        </Paragraph>
      </div>

      <div>
        {/* 前置要求说明 */}
        {prereqs.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 8 }}>
            <span>前置技能：</span>
            {prereqs.map((p) => {
              const pMet = (allScores[p.domain] || 0) >= (p.requiredScore || 0);
              return (
                <Tag
                  key={p.id}
                  size="small"
                  style={{ marginRight: 4, fontSize: 11 }}
                  color={pMet ? 'green' : 'gray'}
                >
                  {p.name} {pMet ? '✓' : '✗'}
                </Tag>
              );
            })}
          </div>
        )}

        {/* 达成进度条 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)', marginBottom: 2 }}>
            <span>当前领域能力积分</span>
            <span>{empScore} / {skill.requiredScore || 0} 分</span>
          </div>
          <Progress
            percent={progressPercent}
            size="small"
            color={unlocked ? ABILITY_DIMENSION_COLORS[skill.domain] : 'var(--color-fill-4)'}
            trailColor="var(--color-fill-2)"
            showText={false}
          />
        </div>
      </div>
    </div>
  );
}

export function EmployeeSkillTree() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEmployeeById, skillTrees } = useEmployee();

  const employee = getEmployeeById(id || '');
  const cap = employee?.capability;

  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedLayer, setSelectedLayer] = useState<number>(0); // 0=all, 1=基础, 2=进阶, 3=专家

  const scores = cap?.scores || { tech: 0, biz: 0, mgmt: 0, tool: 0, domain: 0 };

  // 技能解锁统计
  const skillStats = useMemo(() => {
    let unlockedCount = 0;
    let expertCount = 0;
    const domainStats: Record<string, { total: number; unlocked: number }> = {
      tech: { total: 0, unlocked: 0 },
      biz: { total: 0, unlocked: 0 },
      mgmt: { total: 0, unlocked: 0 },
      tool: { total: 0, unlocked: 0 },
      domain: { total: 0, unlocked: 0 },
    };

    skillTrees.forEach((node) => {
      const dimScore = scores[node.domain] || 0;
      const prereqsMet = node.prerequisites.every((pid) => {
        const p = skillTrees.find((s) => s.id === pid);
        return p ? (scores[p.domain] || 0) >= (p.requiredScore || 0) : true;
      });
      const scoreMet = node.requiredScore ? dimScore >= node.requiredScore : false;
      const unlocked = prereqsMet && scoreMet;

      if (domainStats[node.domain]) {
        domainStats[node.domain].total += 1;
        if (unlocked) {
          domainStats[node.domain].unlocked += 1;
        }
      }

      if (unlocked) {
        unlockedCount += 1;
        if (node.layer === 3) expertCount += 1;
      }
    });

    const totalCount = skillTrees.length;
    const unlockRatio = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      unlockedCount,
      unlockRatio,
      expertCount,
      domainStats,
    };
  }, [skillTrees, scores]);

  // 过滤技能列表
  const filteredSkills = useMemo(() => {
    return skillTrees.filter((s) => {
      if (selectedDomain !== 'all' && s.domain !== selectedDomain) return false;
      if (selectedLayer !== 0 && s.layer !== selectedLayer) return false;
      return true;
    });
  }, [skillTrees, selectedDomain, selectedLayer]);

  if (!employee) {
    return (
      <PageShell
        breadcrumbs={[
          { label: '员工管理', to: '/employees' },
          { label: '员工列表', to: '/employees' },
          { label: '员工不存在' },
        ]}
      >
        <Card>
          <Empty description="未找到该员工档案或链接已失效">
            <Button type="primary" onClick={() => navigate('/employees')}>
              返回员工列表
            </Button>
          </Empty>
        </Card>
      </PageShell>
    );
  }

  // 顶部 4 大技能微指标
  const skillMetrics: ProcessMetricItem[] = [
    {
      key: 'unlockRate',
      label: (
        <span className="employee-metric-heading">
          <span>技能树解锁率</span>
          <strong>{skillStats.unlockedCount} / {skillStats.totalCount} 项</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <Progress
            percent={skillStats.unlockRatio}
            size="small"
            color="rgb(var(--primary-6))"
            trailColor="var(--color-fill-2)"
            showText={false}
          />
          <div className="employee-metric-detail-row">
            整体解锁进度达 {skillStats.unlockRatio}% · 覆盖 5 大维度
          </div>
        </div>
      ),
      tone: skillStats.unlockRatio >= 60 ? 'success' : 'neutral',
    },
    {
      key: 'expertCount',
      label: (
        <span className="employee-metric-heading">
          <span>高阶/专家技能</span>
          <strong>{skillStats.expertCount} 项精通</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="employee-metric-value-row">
            <Tag color="purple" size="small">Layer 3 架构与专家级</Tag>
          </div>
          <div className="employee-metric-detail-row">
            具备技术攻坚与团队导师赋能实力
          </div>
        </div>
      ),
      tone: skillStats.expertCount > 0 ? 'success' : 'neutral',
    },
    {
      key: 'totalXP',
      label: (
        <span className="employee-metric-heading">
          <span>实战经验积累</span>
          <strong>{cap?.totalXP || 0} XP</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="employee-metric-value-row">
            <span>加权能力评分 {cap?.weightedScore || 0} 分</span>
          </div>
          <div className="employee-metric-detail-row">
            通过参与项目交付与日常日报持续累积
          </div>
        </div>
      ),
      tone: 'neutral',
    },
    {
      key: 'tierMatch',
      label: (
        <span className="employee-metric-heading">
          <span>职级契合判定</span>
          <strong>{employee.level} 评级</strong>
        </span>
      ),
      value: (
        <div style={{ width: '100%' }}>
          <div className="employee-metric-value-row">
            <Tag color={getLevelColor(employee.level)} size="small" style={{ fontWeight: 600 }}>
              {employee.level} · {employee.position}
            </Tag>
          </div>
          <div className="employee-metric-detail-row">
            {cap?.promotionEligible ? '🌟 已达晋升要求，可发起评审' : '按照当前成长路径平稳推进中'}
          </div>
        </div>
      ),
      tone: cap?.promotionEligible ? 'success' : 'neutral',
    },
  ];

  return (
    <PageShell
      className="employee-detail-360"
      breadcrumbs={[
        { label: '员工管理', to: '/employees' },
        { label: '员工列表', to: '/employees' },
        { label: employee.name, to: `/employees/${employee.id}` },
        { label: '领域技能树' },
      ]}
    >
      {/* 顶部 ProcessOverview */}
      <ProcessOverview
        identifier={employee.jobNumber}
        title={`${employee.name} · 领域技能树`}
        tags={
          <>
            <Tag color="arcoblue">{employee.department} · {employee.position}</Tag>
            <Tag color={getLevelColor(employee.level)} style={{ fontWeight: 600 }}>{employee.level}</Tag>
            <Tag color={getStatusColor(employee.employmentStatus)}>{employee.employmentStatus}</Tag>
            <Tag color="purple"><IconExperiment /> 技能图谱</Tag>
          </>
        }
        actions={
          <Space>
            <Button
              size="small"
              icon={<IconLeft />}
              onClick={() => navigate(`/employees/${employee.id}`)}
            >
              返回员工档案
            </Button>
            {cap?.promotionEligible && (
              <Button
                type="primary"
                size="small"
                icon={<IconTrophy />}
                onClick={() => navigate(`/employees/${employee.id}?main=capability`)}
              >
                发起晋升评审
              </Button>
            )}
          </Space>
        }
        currentStep={getTierIndex(employee.level)}
        steps={CAREER_TIERS}
      />

      {/* 技能树微可视化指标卡 */}
      <ProcessMetricGrid items={skillMetrics} />

      {/* 主双栏工作区 */}
      <ProcessWorkspace>
        {/* 左侧 Main：技能树图谱主体与筛选器 */}
        <ProcessWorkspaceMain>
          <Card
            bordered={false}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <Space align="center" size={8}>
                  <IconBranch style={{ color: 'rgb(var(--primary-6))' }} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>全域技能解锁矩阵</span>
                  <Tag size="small">{filteredSkills.length} 个节点</Tag>
                </Space>
                <Space size={12}>
                  {/* 层级筛选 */}
                  <Radio.Group
                    type="button"
                    size="small"
                    value={selectedLayer}
                    onChange={setSelectedLayer}
                  >
                    <Radio value={0}>全部层级</Radio>
                    <Radio value={1}>基础节点 (L1)</Radio>
                    <Radio value={2}>进阶技能 (L2)</Radio>
                    <Radio value={3}>专家掌握 (L3)</Radio>
                  </Radio.Group>
                </Space>
              </div>
            }
          >
            {/* 领域分类 Tab 切换 */}
            <Tabs
              type="card-gutter"
              activeTab={selectedDomain}
              onChange={setSelectedDomain}
              style={{ marginBottom: 16 }}
            >
              <TabPane
                key="all"
                title={
                  <span>
                    全景透视
                    <Tag size="small" style={{ marginLeft: 6 }}>
                      {skillStats.unlockedCount}/{skillStats.totalCount}
                    </Tag>
                  </span>
                }
              />
              {(['tech', 'biz', 'mgmt', 'tool', 'domain'] as AbilityDimension[]).map((dim) => {
                const stat = skillStats.domainStats[dim] || { total: 0, unlocked: 0 };
                return (
                  <TabPane
                    key={dim}
                    title={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: ABILITY_DIMENSION_COLORS[dim],
                          }}
                        />
                        <span>{ABILITY_DIMENSION_LABELS[dim]}</span>
                        <Tag size="small" color={stat.unlocked === stat.total ? 'green' : 'gray'}>
                          {stat.unlocked}/{stat.total}
                        </Tag>
                      </span>
                    }
                  />
                );
              })}
            </Tabs>

            {/* 技能卡片列表呈现 */}
            {filteredSkills.length > 0 ? (
              <Row gutter={[16, 16]}>
                {filteredSkills.map((s) => (
                  <Col span={12} key={s.id}>
                    <SkillFullCard
                      skill={s}
                      empScore={scores[s.domain] || 0}
                      allSkills={skillTrees}
                      allScores={scores}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="该筛选条件下暂无技能节点" />
            )}
          </Card>
        </ProcessWorkspaceMain>

        {/* 右侧 Aside：雷达图谱与领域掌控度面板 */}
        <ProcessWorkspaceAside>
          <Card bordered={false} title="五维能力模型与掌控度">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
              <RadarChart scores={scores} size={230} />
            </div>

            <div style={{ borderTop: '1px solid var(--color-border-2)', paddingTop: 16 }}>
              <Title heading={6} style={{ marginBottom: 12, fontSize: 13 }}>领域得分与解锁进度</Title>
              {(['tech', 'biz', 'mgmt', 'tool', 'domain'] as AbilityDimension[]).map((dim) => {
                const stat = skillStats.domainStats[dim] || { total: 0, unlocked: 0 };
                const pct = stat.total > 0 ? Math.round((stat.unlocked / stat.total) * 100) : 0;
                return (
                  <div key={dim} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: ABILITY_DIMENSION_COLORS[dim] }}>
                        {ABILITY_DIMENSION_LABELS[dim]}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                        {scores[dim]} 分 · 解锁 {stat.unlocked}/{stat.total}
                      </span>
                    </div>
                    <Progress
                      percent={pct}
                      size="small"
                      color={ABILITY_DIMENSION_COLORS[dim]}
                      trailColor="var(--color-fill-2)"
                      showText={false}
                    />
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--color-fill-1)',
                border: '1px solid var(--color-border-1)',
              }}
            >
              <Space align="start" size={8}>
                <IconInfoCircle style={{ color: 'rgb(var(--primary-6))', marginTop: 2 }} />
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: '18px' }}>
                  技能解锁依据员工日常项目沉淀与能力模型得分综合判定。达到前置技能要求且能力积分达标后，系统将自动点亮对应技能节点。
                </div>
              </Space>
            </div>
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>
    </PageShell>
  );
}
