import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Tabs,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Table,
  Statistic,
  Grid,
  Divider,
  Progress,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconUser,
  IconIdcard,
  IconCalendar,
  IconStar,
  IconEdit,
  IconTrophy,
  IconExperiment,
  IconCheck,
} from '@arco-design/web-react/icon';
import { useEmployee } from './EmployeeContext';
import {
  formatCurrency,
  getLevelColor,
  getStatusColor,
  getRankColor,
  calcWorkDays,
  calcWeightedScore,
  calcPromotionProgress,
  ABILITY_DIMENSION_LABELS,
  ABILITY_DIMENSION_COLORS,
  AbilityDimension,
  SkillNode,
  MBTI_DESCRIPTIONS,
  ENNEAGRAM_DESCRIPTIONS,
  MBTIPersonality,
  BigFiveProfile,
  DISCProfile,
  EnneagramProfile,
} from './mockData';

const TabPane = Tabs.TabPane;
const Row = Grid.Row;
const Col = Grid.Col;
const Title = Typography.Title;

// ---------- 员工能力雷达图 ----------
function RadarChart({ scores, size = 240 }: { scores: { tech: number; biz: number; mgmt: number; tool: number; domain: number }; size?: number }) {
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
      {gridPolygons.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="var(--color-border)" strokeWidth={1} strokeOpacity={0.4} />)}
      {dims.map((_, i) => { const a = angleFor(i); return <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)} stroke="var(--color-border)" strokeOpacity={0.3} />; })}
      <polygon points={dataPts} fill="rgb(var(--primary-6))" fillOpacity={0.2} stroke="rgb(var(--primary-6))" strokeWidth={2} />
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

// 技能卡
function SkillCard({ skill, empScore }: { skill: SkillNode; empScore: number }) {
  const dimScore = empScore;
  const prereqsMet = true; // 简化：只根据能力值判断
  const scoreMet = skill.requiredScore ? dimScore >= skill.requiredScore : false;
  const unlocked = prereqsMet && scoreMet;
  const mastery = unlocked ? (skill.requiredScore && dimScore / skill.requiredScore >= 1.3 ? '精通' : '入门') : '未解锁';

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 8,
      border: `1px solid ${unlocked ? ABILITY_DIMENSION_COLORS[skill.domain] : 'var(--color-border)'}`,
      borderLeft: `3px solid ${unlocked ? ABILITY_DIMENSION_COLORS[skill.domain] : 'var(--grey-300)'}`,
      background: unlocked ? '#fff' : 'var(--color-fill-1)',
      opacity: unlocked ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{skill.name}</span>
        {unlocked ? (
          <Tag color={ABILITY_DIMENSION_COLORS[skill.domain]} size="small">{mastery}</Tag>
        ) : (
          <Tag size="small">🔒 {skill.requiredScore}+</Tag>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{skill.description}</div>
    </div>
  );
}

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEmployeeById, getPerformanceByEmployee, attendance, skillTrees } = useEmployee();

  const employee = getEmployeeById(id || '');
  const performance = getPerformanceByEmployee(id || '');
  const empAttendance = attendance.filter(a => a.employeeId === id);

  const [activeTab, setActiveTab] = useState('profile');

  if (!employee) {
    return (
      <Card>
        <Typography.Paragraph style={{ textAlign: 'center', color: 'var(--color-text-3)' }}>员工不存在</Typography.Paragraph>
      </Card>
    );
  }

  const workDays = calcWorkDays(employee.hireDate);
  const latestPerf = performance.length > 0 ? performance[performance.length - 1] : null;
  const cap = employee.capability;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 顶部栏 */}
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space>
            <Button icon={<IconLeft />} type="text" onClick={() => navigate('/employees')}>返回</Button>
            <Divider type="vertical" style={{ height: 24 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgb(var(--primary-6)), rgb(var(--primary-4)))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 700,
              }}>
                {employee.name.slice(0, 1)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Title heading={4} style={{ margin: 0 }}>{employee.name}</Title>
                  <Tag color={getLevelColor(employee.level)} style={{fontWeight: 600 }}>{employee.level}</Tag>
                  <Tag color={getStatusColor(employee.employmentStatus)}>{employee.employmentStatus}</Tag>
                  {cap?.promotionEligible && <Tag color="var(--warning-500)">可晋级</Tag>}
                </div>
                <div style={{ marginTop: 4, color: 'var(--color-text-2)', fontSize: 14 }}>
                  {employee.jobNumber} · {employee.department} · {employee.position}
                </div>
              </div>
            </div>
          </Space>
          <Button type="primary" icon={<IconEdit />} onClick={() => navigate('/employees')}>编辑</Button>
        </div>
      </Card>

      {/* 核心指标 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="入职天数" value={workDays} suffix="天" prefix={<IconCalendar style={{ color: 'rgb(var(--primary-6))' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="标准时薪" value={employee.standardHourlyRate} prefix="¥" suffix="/h" valueStyle={{ color: 'rgb(var(--primary-6))' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="最近评级" value={latestPerf ? latestPerf.rank : '—'} valueStyle={{ color: latestPerf ? getRankColor(latestPerf.rank) : undefined }} /></Card></Col>
        <Col span={4}><Card><Statistic title="加权总分" value={cap ? cap.weightedScore : '—'} suffix="分" prefix={<IconTrophy style={{ color: 'var(--warning-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="已解锁技能" value={cap ? cap.skills.filter(s => s.status === 'unlocked').length : '—'} suffix="个" prefix={<IconCheck style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="累计经验" value={cap ? cap.totalXP : '—'} suffix="XP" prefix={<IconExperiment style={{ color: '#7c3aed' }} />} /></Card></Col>
      </Row>

      {/* Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="profile" title="档案" />
          <TabPane key="capability" title={<span><IconTrophy style={{ color: 'var(--warning-500)' }} /> 能力</span>} />
          <TabPane key="personality" title={<span><IconStar style={{ color: '#7c3aed' }} /> 性格测评</span>} />
          <TabPane key="attendance" title="考勤" />
          <TabPane key="performance" title="绩效" />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 档案 Tab */}
          {activeTab === 'profile' && (
            <div>
              <Title heading={6} style={{ marginBottom: 12 }}><Space><IconUser /> 个人信息</Space></Title>
              <Descriptions column={3} labelStyle={{ color: 'var(--color-text-2)', fontWeight: 500 }} data={[
                { label: '姓名', value: employee.name }, { label: '用户名', value: employee.jobNumber }, { label: '手机号', value: employee.phone },
                { label: '邮箱', value: employee.email }, { label: '身份证', value: employee.idCard || '—' }, { label: '紧急联系人', value: employee.emergencyContact || '—' },
                { label: '最高学历', value: employee.education || '—' }, { label: '毕业院校', value: employee.school || '—' }, { label: '入职前经验', value: employee.previousExperience || '—' },
              ]} />
              <Divider style={{ margin: '20px 0' }} />
              <Title heading={6} style={{ marginBottom: 12 }}><Space><IconIdcard /> 工作信息</Space></Title>
              <Descriptions column={3} labelStyle={{ color: 'var(--color-text-2)', fontWeight: 500 }} data={[
                { label: '所属部门', value: employee.department }, { label: '职位', value: employee.position },
                { label: '职级', value: <Tag color={getLevelColor(employee.level)}>{employee.level}</Tag> },
                { label: '在职状态', value: <Tag color={getStatusColor(employee.employmentStatus)}>{employee.employmentStatus}</Tag> },
                { label: '入职日期', value: employee.hireDate }, { label: '转正日期', value: employee.转正Date || '—' },
                { label: '合同到期日', value: employee.contractEndDate },
                { label: '标准时薪', value: <span style={{ fontWeight: 700, color: 'rgb(var(--primary-6))' }}>{formatCurrency(employee.standardHourlyRate)}/h</span> },
                { label: '每月工天', value: employee.monthlyWorkdays == null ? '—' : `${employee.monthlyWorkdays}天` },
                { label: '分摊公共成本', value: employee.sharedOverheadCost == null ? '—' : formatCurrency(employee.sharedOverheadCost) },
                { label: '银行卡', value: employee.bankAccount || '—' },
              ]} />
            </div>
          )}

          {/* 能力 Tab */}
          {activeTab === 'capability' && cap && (
            <div>
              {/* 雷达图 + 晋级进度 */}
              <Row gutter={24} style={{ marginBottom: 24 }}>
                <Col span={10}>
                  <Card title="能力雷达图" size="small" bodyStyle={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <RadarChart scores={cap.scores} size={280} />
                  </Card>
                </Col>
                <Col span={14}>
                  <Card title="五维能力分数" size="small" bodyStyle={{ padding: '16px 20px' }}>
                    {(Object.keys(cap.scores) as AbilityDimension[]).map(dim => (
                      <div key={dim} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: ABILITY_DIMENSION_COLORS[dim] }}>
                            {ABILITY_DIMENSION_LABELS[dim]}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{cap.scores[dim]}/100</span>
                        </div>
                        <Progress percent={cap.scores[dim]} color={ABILITY_DIMENSION_COLORS[dim]} size="small" />
                      </div>
                    ))}
                  </Card>
                  <Card title="晋级评估" size="small" style={{ marginTop: 12 }} bodyStyle={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>当前加权总分</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: cap.promotionEligible ? 'var(--success-500)' : 'rgb(var(--primary-6))' }}>
                        {cap.weightedScore}
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Progress percent={calcPromotionProgress(cap.weightedScore, employee.level)} color={cap.promotionEligible ? 'var(--success-500)' : 'rgb(var(--primary-6))'} />
                    </div>
                    {cap.promotionEligible ? (
                      <Tag color="var(--success-500)" style={{fontSize: 14, padding: '4px 12px' }}>
                        <IconTrophy /> 已达标，具备晋升资格！
                      </Tag>
                    ) : (
                      <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                        未达晋升门槛，继续积累经验即可晋级
                      </Typography.Text>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* 技能树 */}
              <Title heading={6} style={{ marginBottom: 12 }}><Space><IconExperiment style={{ color: '#7c3aed' }} /> 技能树</Space></Title>
              <Tabs type="card-gutter" defaultActiveTab="tech">
                {(['tech', 'biz', 'mgmt', 'tool', 'domain'] as AbilityDimension[]).map(domain => (
                  <TabPane key={domain} title={
                    <Tag color={ABILITY_DIMENSION_COLORS[domain]}>{ABILITY_DIMENSION_LABELS[domain]}</Tag>
                  }>
                    <Row gutter={16}>
                      {[1, 2, 3].map(layer => {
                        const skills = skillTrees.filter(s => s.domain === domain && s.layer === layer);
                        return (
                          <Col span={8} key={layer}>
                            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Tag color={layer === 1 ? 'var(--success-500)' : layer === 2 ? 'var(--primary)' : '#7c3aed'}>
                                {layer === 1 ? '基础' : layer === 2 ? '进阶' : '专家'}
                              </Tag>
                            </div>
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                              {skills.map(s => <SkillCard key={s.id} skill={s} empScore={cap.scores[s.domain]} />)}
                            </Space>
                          </Col>
                        );
                      })}
                    </Row>
                  </TabPane>
                ))}
              </Tabs>
            </div>
          )}
          {activeTab === 'capability' && !cap && (
            <Typography.Paragraph style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: '40px 0' }}>
              该员工尚未录入能力数值
            </Typography.Paragraph>
          )}

          {/* 性格测评 Tab */}
          {activeTab === 'personality' && employee.personality && (
            <PersonalityView assessment={employee.personality} employeeName={employee.name} />
          )}
          {activeTab === 'personality' && !employee.personality && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🧩</div>
              <Typography.Paragraph>该员工尚未完成性格测评</Typography.Paragraph>
              <Typography.Paragraph style={{ fontSize: 12 }}>完成 MBTI、大五人格、DISC 九型人格测评后，分析数据将自动显示在此处。</Typography.Paragraph>
            </div>
          )}

          {/* 考勤 Tab */}
          {activeTab === 'attendance' && (
            <div>
              <Table
                columns={[
                  { title: '类型', dataIndex: 'type', width: 70, render: (t: any) => <Tag>{t}</Tag> },
                  { title: '开始', dataIndex: 'startDate', width: 110 }, { title: '结束', dataIndex: 'endDate', width: 110 },
                  { title: '天数', dataIndex: 'days', width: 60 }, { title: '事由', dataIndex: 'reason' },
                  { title: '状态', dataIndex: 'status', width: 80, render: (s: any) => <Tag color={s === '已批准' ? 'var(--success-500)' : s === '待审批' ? 'var(--warning-500)' : 'var(--destructive-500)'}>{s}</Tag> },
                  { title: '审批人', dataIndex: 'approvedBy', width: 80 },
                ] as any}
                data={empAttendance} rowKey="id" pagination={false}
              />
              {empAttendance.length === 0 && <Typography.Paragraph style={{ textAlign: 'center', color: 'var(--color-text-3)', marginTop: 24 }}>暂无考勤记录</Typography.Paragraph>}
            </div>
          )}

          {/* 绩效 Tab */}
          {activeTab === 'performance' && (
            <div>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                {[...performance].reverse().slice(0, 4).map(p => (
                  <Col span={6} key={p.id}>
                    <Card>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Statistic title={p.periodLabel} value={p.totalScore} suffix="分" />
                        <Tag color={getRankColor(p.rank)} style={{fontWeight: 700, fontSize: 16 }}>{p.rank}</Tag>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-3)' }}>KPI {p.kpiScore} · 行为 {p.behaviorScore}</div>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Table
                columns={[
                  { title: '周期', dataIndex: 'periodLabel', width: 100 }, { title: 'KPI', dataIndex: 'kpiScore', width: 60 },
                  { title: '行为', dataIndex: 'behaviorScore', width: 60 }, { title: '综合', dataIndex: 'totalScore', width: 60 },
                  { title: '评级', dataIndex: 'rank', width: 60, render: (r: any) => <Tag color={getRankColor(r)}>{r}</Tag> },
                  { title: '考核人', dataIndex: 'evaluator', width: 80 }, { title: '评语', dataIndex: 'comment', ellipsis: true },
                ] as any}
                data={[...performance].reverse()} rowKey="id" pagination={false}
              />
              {performance.length === 0 && <Typography.Paragraph style={{ textAlign: 'center', color: 'var(--color-text-3)', marginTop: 24 }}>暂无考核记录</Typography.Paragraph>}
            </div>
          )}
        </div>
      </Card>
    </Space>
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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 顶部摘要 */}
      <Card bordered={false} style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(236,72,153,0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🧩</div>
          <div>
            <Title heading={5} style={{ margin: 0 }}>{employeeName} · 性格测评报告</Title>
            <Typography.Text type="secondary">已完成 {testCount} 项测评：{[mbti && 'MBTI', bigFive && '大五人格', disc && 'DISC', enneagram && '九型人格'].filter(Boolean).join(' · ')}</Typography.Text>
          </div>
        </div>
      </Card>

      {/* MBTI */}
      {mbti && <MBTICard mbti={mbti} />}

      {/* 大五 + DISC 并排 */}
      <Row gutter={16}>
        <Col span={12}>{bigFive && <BigFiveCard bigFive={bigFive} />}</Col>
        <Col span={12}>{disc && <DISCCard disc={disc} />}</Col>
      </Row>

      {/* 九型人格 */}
      {enneagram && <EnneagramCard enneagram={enneagram} />}
    </Space>
  );
}

function MBTICard({ mbti }: { mbti: MBTIPersonality }) {
  const info = MBTI_DESCRIPTIONS[mbti.type];

  const dimensions = [
    { dim: 'E/I', pos: '外向 E', neg: '内向 I', value: mbti.EI },
    { dim: 'S/N', pos: '实感 S', neg: '直觉 N', value: mbti.SN },
    { dim: 'T/F', pos: '思考 T', neg: '情感 F', value: mbti.TF },
    { dim: 'J/P', pos: '判断 J', neg: '感知 P', value: mbti.JP },
  ];

  return (
    <Card title={<span className="flex items-center gap-2"><span style={{ fontSize: 18 }}>🔮</span> MBTI 性格类型</span>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          width: 100, height: 100, borderRadius: 16,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: 2,
        }}>
          {mbti.type}
        </div>
        <div>
          <Title heading={4} style={{ margin: 0 }}>{info.nickname}</Title>
          <Typography.Text type="secondary">{info.summary}</Typography.Text>
          {mbti.description && (
            <Typography.Paragraph style={{ marginTop: 8, fontSize: 14, color: 'var(--color-text-2)' }}>
              💡 {mbti.description}
            </Typography.Paragraph>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>测试日期：{mbti.testDate}</Typography.Text>
        </div>
      </div>

      {/* 四维度 */}
      <Row gutter={16}>
        {dimensions.map(d => {
          const isPos = d.value >= 0;
          const pct = Math.abs(d.value);
          return (
            <Col span={6} key={d.dim}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>{d.dim}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: isPos ? 'var(--primary)' : 'var(--color-text-3)' }}>{d.pos}</span>
                <span style={{ color: !isPos ? 'var(--primary)' : 'var(--color-text-3)' }}>{d.neg}</span>
              </div>
              <Progress
                percent={pct}
                color={isPos ? 'var(--primary)' : '#a855f7'}
                size="small"
              />
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                {isPos ? d.pos : d.neg} {pct}%
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

function BigFiveCard({ bigFive }: { bigFive: BigFiveProfile }) {
  const traits = [
    { label: ' openness', cn: '开放性', value: bigFive.openness, color: '#7c3aed', desc: '好奇心、想象力、尝新' },
    { label: 'conscientiousness', cn: '尽责性', value: bigFive.conscientiousness, color: 'var(--success-500)', desc: '组织性、责任感、目标导向' },
    { label: 'extraversion', cn: '外向性', value: bigFive.extraversion, color: 'var(--warning-500)', desc: '社交性、精力充沛、乐观' },
    { label: 'agreeableness', cn: '宜人性', value: bigFive.agreeableness, color: 'var(--primary)', desc: '合作、信任、利他' },
    { label: 'neuroticism', cn: '情绪稳定性', value: 100 - bigFive.neuroticism, color: '#0fc6c2', desc: '情绪稳定（反向计分）' },
  ];

  const topTrait = traits.reduce((best, t) => (t.value > best.value ? t : best), traits[0]);

  return (
    <Card title={<span><span style={{ fontSize: 16 }}>🧬</span> 大五人格 OCEAN</span>} bodyStyle={{ paddingBottom: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        最突出特征：<Tag color={topTrait.color} style={{marginLeft: 4 }}>{topTrait.cn} {topTrait.value}</Tag>
      </Typography.Text>
      {traits.map(t => (
        <div key={t.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t.cn} <span style={{ color: 'var(--color-text-3)', fontWeight: 400, fontSize: 12 }}>{t.desc}</span></span>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.color }}>{t.value}</span>
          </div>
          <Progress percent={t.value} color={t.color} size="small" />
        </div>
      ))}
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>测试日期：{bigFive.testDate}</Typography.Text>
    </Card>
  );
}

function DISCCard({ disc }: { disc: DISCProfile }) {
  const all = [
    { key: 'D', label: '指挥型', value: disc.dominance, color: 'var(--destructive-500)', icon: '🎯', desc: '结果导向、果断' },
    { key: 'I', label: '影响型', value: disc.influence, color: 'var(--warning-500)', icon: '🤝', desc: '乐观、说服力强' },
    { key: 'S', label: '稳健型', value: disc.steadiness, color: 'var(--success-500)', icon: '🤲', desc: '耐心、稳定、合作' },
    { key: 'C', label: '服从型', value: disc.compliance, color: 'var(--primary)', icon: '📐', desc: '精确、系统化' },
  ];

  return (
    <Card title={<span><span style={{ fontSize: 16 }}>🎭</span> DISC 行为风格</span>} bodyStyle={{ paddingBottom: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>主要风格</Typography.Text>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          {all.map(item => (
            <div key={item.key} style={{
              width: 48, height: 48, borderRadius: 12,
              background: item.key === disc.primaryStyle ? item.color : 'var(--color-fill-2)',
              color: item.key === disc.primaryStyle ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700,
            }}>
              {item.key}
            </div>
          ))}
        </div>
        <Tag color={all.find(a => a.key === disc.primaryStyle)?.color} style={{marginTop: 8 }}>
          {all.find(a => a.key === disc.primaryStyle)?.label}型 · {all.find(a => a.key === disc.primaryStyle)?.desc}
        </Tag>
      </div>

      {all.map(item => (
        <div key={item.key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {item.icon} {item.label}
              <span style={{ color: 'var(--color-text-3)', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>{item.desc}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{item.value}%</span>
          </div>
          <Progress percent={item.value} color={item.color} size="small" />
        </div>
      ))}
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>测试日期：{disc.testDate}</Typography.Text>
    </Card>
  );
}

function EnneagramCard({ enneagram }: { enneagram: EnneagramProfile }) {
  const info = ENNEAGRAM_DESCRIPTIONS[enneagram.type];
  const colors = ['var(--destructive-500)', 'var(--warning-500)', '#f7d038', 'var(--success-500)', '#0fc6c2', 'var(--primary)', '#7c3aed', '#eb2f96', 'var(--grey-400)'];

  return (
    <Card title={<span><span style={{ fontSize: 18 }}>🔢</span> 九型人格</span>}>
      <Row gutter={16}>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors[enneagram.type - 1]}, ${colors[enneagram.type - 1]}aa)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: '#fff', margin: '0 auto 8px',
            }}>
              {enneagram.type}
            </div>
            <Tag color={colors[enneagram.type - 1]} style={{fontSize: 14 }}>{info.name}</Tag>
            {enneagram.wing && <Tag style={{ marginTop: 4 }}>W{enneagram.wing}</Tag>}
          </div>
        </Col>
        <Col span={18}>
          <Typography.Paragraph style={{ marginBottom: 8 }}>{info.summary}</Typography.Paragraph>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map(t => (
              <Tag
                key={t}
                color={t === enneagram.type ? colors[t - 1] : 'var(--color-fill-2)' as any}
                style={{ color: t === enneagram.type ? '#fff' : 'var(--color-text-3)' }}
              >{t}号 · {ENNEAGRAM_DESCRIPTIONS[t].name}</Tag>
            ))}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>测试日期：{enneagram.testDate}</Typography.Text>
        </Col>
      </Row>
    </Card>
  );
}
