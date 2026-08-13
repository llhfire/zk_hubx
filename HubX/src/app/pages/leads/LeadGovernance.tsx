import { useState, useMemo } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Typography,
  Tabs,
  Tooltip,
  Badge,
  Alert,
  Divider,
} from '@arco-design/web-react';
import {
  IconCustomerService,
  IconExclamationCircle,
  IconCheckCircle,
  IconCloseCircle,
  IconClockCircle,
  IconExperiment,
  IconUser,
  IconCalendar,
  IconArrowRight,
  IconEdit,
} from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;

// ---------- 类型 ----------

type LeadStatus = '未联系' | '未接通' | '初步沟通' | '需求调研' | '方案报价' | '合同洽谈' | '已签单' | '已终止';
type LeadLevel = '高' | '中' | '低';

interface LeadRecord {
  id: string;
  name: string;
  source: string;
  level: LeadLevel;
  status: LeadStatus;
  owner: string;
  entity: string;
  createTime: string;
  claimTime: string;
  lastFollowTime: string;
  nextFollowTime: string;
  followCount: number;
  daysHeld: number;
}

interface SalesGovernance {
  salesName: string;
  department: string;
  totalLeads: number;
  activeLeads: number;
  followedToday: number;
  followedThisWeek: number;
  overdueCount: number;
  avgResponseHours: number;
  conversionCount: number;
  complianceRate: number;
  violations: ViolationRecord[];
}

interface ViolationRecord {
  id: string;
  salesName: string;
  type: 'overdue_followup' | 'no_followup_record' | 'status_not_updated' | 'exceed_hold_days';
  description: string;
  leadName: string;
  severity: 'high' | 'medium' | 'low';
  date: string;
  autoAction?: string;
}

interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  threshold: string;
  enabled: boolean;
  action: string;
}

// ---------- 模拟数据 ----------

const mockLeads: LeadRecord[] = [
  { id: 'LS001', name: '某科技公司APP开发', source: '百度推广', level: '高', status: '需求调研', owner: '张三', entity: '中科软艺', createTime: '2026-06-20', claimTime: '2026-06-20', lastFollowTime: '2026-07-01', nextFollowTime: '2026-06-28', followCount: 5, daysHeld: 12 },
  { id: 'LS002', name: '金融公司管理系统', source: '抖音', level: '高', status: '方案报价', owner: '张三', entity: '软艺信息', createTime: '2026-06-15', claimTime: '2026-06-15', lastFollowTime: '2026-06-29', nextFollowTime: '2026-06-25', followCount: 8, daysHeld: 17 },
  { id: 'LS003', name: '电商平台小程序', source: '百度推广', level: '中', status: '初步沟通', owner: '李四', entity: '中科软艺', createTime: '2026-06-25', claimTime: '2026-06-25', lastFollowTime: '2026-07-02', nextFollowTime: '2026-07-05', followCount: 3, daysHeld: 7 },
  { id: 'LS004', name: '教育行业CRM', source: '小红书', level: '中', status: '未联系', owner: '李四', entity: '巴蜀文攻', createTime: '2026-06-28', claimTime: '2026-06-28', lastFollowTime: '', nextFollowTime: '2026-06-30', followCount: 0, daysHeld: 4 },
  { id: 'LS005', name: '医疗健康APP', source: '百度推广', level: '高', status: '合同洽谈', owner: '王五', entity: '中科软艺', createTime: '2026-06-10', claimTime: '2026-06-10', lastFollowTime: '2026-07-01', nextFollowTime: '2026-07-03', followCount: 12, daysHeld: 22 },
  { id: 'LS006', name: '物流追踪系统', source: '抖音', level: '低', status: '未接通', owner: '王五', entity: '软艺信息', createTime: '2026-06-22', claimTime: '2026-06-22', lastFollowTime: '2026-06-25', nextFollowTime: '2026-06-24', followCount: 2, daysHeld: 10 },
  { id: 'LS007', name: '社交平台开发', source: '微信推广', level: '中', status: '需求调研', owner: '赵六', entity: '中科软艺', createTime: '2026-06-18', claimTime: '2026-06-18', lastFollowTime: '2026-06-30', nextFollowTime: '2026-07-01', followCount: 6, daysHeld: 14 },
  { id: 'LS008', name: '零售POS系统', source: '百度推广', level: '高', status: '已签单', owner: '赵六', entity: '巴蜀文攻', createTime: '2026-06-05', claimTime: '2026-06-05', lastFollowTime: '2026-06-28', nextFollowTime: '', followCount: 15, daysHeld: 27 },
  { id: 'LS009', name: '智能制造MES', source: '抖音', level: '高', status: '初步沟通', owner: '钱七', entity: '软艺信息', createTime: '2026-06-29', claimTime: '2026-06-29', lastFollowTime: '', nextFollowTime: '2026-07-01', followCount: 0, daysHeld: 3 },
  { id: 'LS010', name: '保险行业系统', source: '小红书', level: '中', status: '未联系', owner: '钱七', entity: '中科软艺', createTime: '2026-06-30', claimTime: '2026-06-30', lastFollowTime: '', nextFollowTime: '2026-07-02', followCount: 0, daysHeld: 2 },
];

const mockViolations: ViolationRecord[] = [
  { id: 'v1', salesName: '李四', type: 'overdue_followup', description: '线索 LS004 超期 3 天未跟进', leadName: '教育行业CRM', severity: 'high',   date: '2026-07-02', autoAction: '已发送提醒通知' },
  { id: 'v2', salesName: '钱七', type: 'no_followup_record', description: '线索 LS009 认领 3 天未填写跟进记录', leadName: '智能制造MES', severity: 'medium', date: '2026-07-02' },
  { id: 'v3', salesName: '钱七', type: 'overdue_followup', description: '线索 LS010 超期 2 天未跟进', leadName: '保险行业系统', severity: 'high',   date: '2026-07-02' },
  { id: 'v4', salesName: '张三', type: 'status_not_updated', description: '线索 LS002 跟进 8 次未更新状态', leadName: '金融公司管理系统', severity: 'low', date: '2026-07-01' },
  { id: 'v5', salesName: '王五', type: 'exceed_hold_days', description: '线索 LS005 持有超 20 天未完成', leadName: '医疗健康APP', severity: 'medium', date: '2026-07-01', autoAction: '已标记为重点关注' },
  { id: 'v6', salesName: '李四', type: 'overdue_followup', description: '线索 LS002 超期 5 天未跟进', leadName: '金融公司管理系统', severity: 'high', date: '2026-06-30', autoAction: '已自动回收至公海' },
];

const defaultRules: GovernanceRule[] = [
  { id: 'r1', name: '每日最低跟进次数', description: '每个销售每天至少跟进 3 次（含电话/微信/上门）', threshold: '3 次/天', enabled: true,  action: '未达标时发送提醒' },
  { id: 'r2', name: '线索响应时间', description: '新认领线索必须在 24 小时内首次跟进', threshold: '24 小时', enabled: true,  action: '超时自动回收至公海' },
  { id: 'r3', name: '跟进记录规范', description: '每次跟进必须填写跟进内容和下次跟进时间', threshold: '100%',    enabled: true,  action: '限制提交' },
  { id: 'r4', name: '状态更新频率', description: '每 5 次跟进必须更新一次线索状态', threshold: '5 次跟进',  enabled: true,  action: '系统提醒' },
  { id: 'r5', name: '最大持有天数', description: '线索持有超过 30 天未完成自动回收', threshold: '30 天',     enabled: true,  action: '自动回收至公海' },
  { id: 'r6', name: '垃圾线索比例限制', description: '个人垃圾线索比例超过 30% 限制领取新线索', threshold: '30%', enabled: false, action: '限制领取新线索' },
];

// ---------- 计算治理数据 ----------

function calcSalesGovernance(salesName: string): SalesGovernance {
  const leads = mockLeads.filter(l => l.owner === salesName);
  const activeLeads = leads.filter(l => !['已签单', '已终止'].includes(l.status));
  const overdueCount = leads.filter(l => {
    if (!l.nextFollowTime || ['已签单', '已终止'].includes(l.status)) return false;
    return new Date(l.nextFollowTime) < new Date('2026-07-02');
  }).length;

  const todayFollows = leads.filter(l => l.lastFollowTime === '2026-07-02').length;
  const weekFollows = leads.filter(l => {
    if (!l.lastFollowTime) return false;
    const d = new Date(l.lastFollowTime);
    return d >= new Date('2026-06-26') && d <= new Date('2026-07-02');
  }).length;

  const conversionCount = leads.filter(l => l.status === '已签单').length;
  const violations = mockViolations.filter(v => v.salesName === salesName);

  // 合规率计算
  const totalChecks = activeLeads.length * 3; // 3 项检查：跟进频率、记录完整性、状态更新
  const violationPoints = violations.reduce((s, v) => s + (v.severity === 'high' ? 3 : v.severity === 'medium' ? 2 : 1), 0);
  const complianceRate = Math.max(0, Math.round(((totalChecks - violationPoints) / Math.max(totalChecks, 1)) * 100));

  return {
    salesName,
    department: '销售部',
    totalLeads: leads.length,
    activeLeads: activeLeads.length,
    followedToday: todayFollows,
    followedThisWeek: weekFollows,
    overdueCount,
    avgResponseHours: Math.round(8 + Math.random() * 20),
    conversionCount,
    complianceRate,
    violations,
  };
}

// ---------- 主组件 ----------

export function LeadGovernance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [rules, setRules] = useState(defaultRules);

  const salesList = useMemo(() => {
    const names = [...new Set(mockLeads.map(l => l.owner))];
    return names.map(name => calcSalesGovernance(name));
  }, []);

  const summary = useMemo(() => {
    const total = mockLeads.length;
    const active = mockLeads.filter(l => !['已签单', '已终止'].includes(l.status)).length;
    const overdue = mockLeads.filter(l => {
      if (!l.nextFollowTime || ['已签单', '已终止'].includes(l.status)) return false;
      return new Date(l.nextFollowTime) < new Date('2026-07-02');
    }).length;
    const violations = mockViolations.length;
    const avgCompliance = Math.round(salesList.reduce((s, sg) => s + sg.complianceRate, 0) / Math.max(salesList.length, 1));
    const conversions = mockLeads.filter(l => l.status === '已签单').length;
    return { total, active, overdue, violations, avgCompliance, conversions };
  }, [salesList]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 摘要栏 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="线索总数" value={summary.total} suffix="条" prefix={<IconCustomerService style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="活跃线索" value={summary.active} suffix="条" icon={<IconExperiment style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="逾期未跟进" value={summary.overdue} suffix="条" prefix={<IconExclamationCircle style={{ color: 'var(--destructive-500)' }} />} valueStyle={{ color: summary.overdue > 0 ? 'var(--destructive-500)' : 'var(--success-500)' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="违规记录" value={summary.violations} suffix="条" prefix={<IconCloseCircle style={{ color: 'var(--warning-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="平均合规率" value={summary.avgCompliance} suffix="%" prefix={<IconCheckCircle style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="已转化" value={summary.conversions} suffix="条" prefix={<IconUser style={{ color: 'var(--chart-5)' }} />} /></Card></Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="overview" title={<span><IconUser /> 人员合规看板</span>} />
          <TabPane key="violations" title={<span><IconExclamationCircle /> 违规记录</span>} />
          <TabPane key="rules" title={<span><IconEdit /> 治理规则</span>} />
          <TabPane key="leads" title={<span><IconCustomerService /> 线索明细</span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 人员合规 Tab */}
          {activeTab === 'overview' && (
            <Table
              columns={[
                { title: '销售', dataIndex: 'salesName', width: 80, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '活跃线索', dataIndex: 'activeLeads', width: 80, render: (v: number) => `${v}条` },
                { title: '今日跟进', dataIndex: 'followedToday', width: 80, render: (v: number) => `${v}次` },
                { title: '本周跟进', dataIndex: 'followedThisWeek', width: 90, render: (v: number) => `${v}次` },
                { title: '逾期线索', dataIndex: 'overdueCount', width: 80, render: (v: number) => v > 0 ? <Tag color="red">{v}条</Tag> : <Tag color="green">0</Tag> },
                { title: '平均响应', dataIndex: 'avgResponseHours', width: 90, render: (v: number) => `${v}h` },
                { title: '已转化', dataIndex: 'conversionCount', width: 70, render: (v: number) => `${v}条` },
                {
                  title: '合规率', dataIndex: 'complianceRate', width: 140,
                  render: (v: number) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Progress percent={v} size="small" color={v >= 80 ? 'var(--success-500)' : v >= 60 ? 'var(--warning-500)' : 'var(--destructive-500)'} style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, width: 36 }}>{v}%</span>
                    </div>
                  ),
                  sorter: (a: SalesGovernance, b: SalesGovernance) => a.complianceRate - b.complianceRate,
                },
                {
                  title: '违规', dataIndex: 'violations', width: 60,
                  render: (_: unknown, row: SalesGovernance) => row.violations.length > 0
                    ? <Badge count={row.violations.length} style={{ background: 'var(--destructive-500)' }} />
                    : <Tag color="green">无</Tag>,
                },
              ] as any}
              data={salesList}
              rowKey="salesName"
              pagination={false}
            />
          )}

          {/* 违规记录 Tab */}
          {activeTab === 'violations' && (
            <div>
              {mockViolations.filter(v => v.severity === 'high').length > 0 && (
                <Alert
                  type="error"
                  content={`当前有 ${mockViolations.filter(v => v.severity === 'high').length} 条高严重性违规，建议立即处理。`}
                  style={{ marginBottom: 16 }}
                  icon={<IconExclamationCircle />}
                />
              )}
              <Table
                columns={[
                  {
                    title: '严重度', dataIndex: 'severity', width: 80,
                    render: (s: string) => (
                      <Tag color={s === 'high' ? 'var(--destructive-500)' : s === 'medium' ? 'var(--warning-500)' : 'var(--muted-foreground)'}>
                        {s === 'high' ? '高' : s === 'medium' ? '中' : '低'}
                      </Tag>
                    ),
                  },
                  { title: '销售', dataIndex: 'salesName', width: 70 },
                  { title: '违规类型', dataIndex: 'type', width: 130, render: (t: string) => {
                    const map: Record<string, string> = { overdue_followup: '逾期未跟进', no_followup_record: '无跟进记录', status_not_updated: '状态未更新', exceed_hold_days: '超期持有' };
                    return <Tag>{map[t] || t}</Tag>;
                  }},
                  { title: '描述', dataIndex: 'description' },
                  { title: '相关线索', dataIndex: 'leadName', width: 130 },
                  { title: '日期', dataIndex: 'date', width: 100 },
                  {
                    title: '自动处置', dataIndex: 'autoAction', width: 140,
                    render: (a: string) => a ? <Tag color="orange">{a}</Tag> : <span style={{ color: 'var(--color-text-3)' }}>—</span>,
                  },
                ] as any}
                data={mockViolations}
                rowKey="id"
                pagination={false}
              />
            </div>
          )}

          {/* 治理规则 Tab */}
          {activeTab === 'rules' && (
            <div>
              <Row gutter={16}>
                {rules.map(rule => (
                  <Col span={8} key={rule.id} style={{ marginBottom: 16 }}>
                    <Card size="small" style={{ borderColor: rule.enabled ? 'var(--primary)' : 'var(--color-border)', borderWidth: rule.enabled ? 2 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{rule.name}</span>
                        <Tag color={rule.enabled ? 'var(--primary)' : 'default'}>
                          {rule.enabled ? '已启用' : '已禁用'}
                        </Tag>
                      </div>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{rule.description}</Typography.Text>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ fontSize: 12 }}>
                        <div><span style={{ color: 'var(--color-text-3)' }}>阈值：</span>{rule.threshold}</div>
                        <div><span style={{ color: 'var(--color-text-3)' }}>处置：</span>{rule.action}</div>
                      </div>
                      <Button
                        type={rule.enabled ? 'secondary' : 'primary'}
                        size="small"
                        long
                        style={{ marginTop: 12 }}
                        onClick={() => toggleRule(rule.id)}
                      >
                        {rule.enabled ? '禁用规则' : '启用规则'}
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {/* 线索明细 Tab */}
          {activeTab === 'leads' && (
            <Table
              columns={[
                { title: '线索名称', dataIndex: 'name', width: 160 },
                { title: '来源', dataIndex: 'source', width: 90, render: (v: string) => <Tag>{v}</Tag> },
                { title: '等级', dataIndex: 'level', width: 60, render: (v: string) => <Tag color={v === '高' ? 'var(--destructive-500)' : v === '中' ? 'var(--warning-500)' : 'var(--muted-foreground)'}>{v}</Tag> },
                {
                  title: '状态', dataIndex: 'status', width: 90,
                  render: (s: string) => {
                    const map: Record<string, string> = { '未联系': 'var(--muted-foreground)', '未接通': 'var(--warning-500)', '初步沟通': 'var(--primary)', '需求调研': 'var(--info-500)', '方案报价': 'var(--chart-5)', '合同洽谈': 'var(--warning-500)', '已签单': 'var(--success-500)', '已终止': 'var(--destructive-500)' };
                    return <Tag color={map[s] || 'var(--muted-foreground)'}>{s}</Tag>;
                  },
                },
                { title: '负责人', dataIndex: 'owner', width: 70 },
                { title: '跟进次数', dataIndex: 'followCount', width: 80, render: (v: number) => `${v}次` },
                { title: '持有天数', dataIndex: 'daysHeld', width: 80, render: (v: number) => <span style={{ color: v > 20 ? 'var(--destructive-500)' : v > 14 ? 'var(--warning-500)' : 'inherit' }}>{v}天</span> },
                {
                  title: '下次跟进', dataIndex: 'nextFollowTime', width: 100,
                  render: (v: string, row: LeadRecord) => {
                    if (!v || ['已签单', '已终止'].includes(row.status)) return '—';
                    const isOverdue = new Date(v) < new Date('2026-07-02');
                    return <span style={{ color: isOverdue ? 'var(--destructive-500)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>{v}{isOverdue ? ' ' : ''}{isOverdue && <IconExclamationCircle style={{ color: 'var(--warning-500)' }} />}</span>;
                  },
                },
              ] as any}
              data={mockLeads}
              rowKey="id"
              pagination={{ pageSize: 10, showTotal: true }}
            />
          )}
        </div>
      </Card>
    </Space>
  );
}
