import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Button,
  Space,
  Tag,
  Tabs,
  Typography,
  Grid,
  Steps,
  Descriptions,
  Tooltip,
  Message,
  Divider,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Timeline,
  Progress,
  Upload,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconEdit,
  IconPlus,
  IconDelete,
  IconSwap,
  IconReply,
  IconUserAdd,
  IconCopy,
  IconPhone,
  IconFile,
  IconUpload,
} from '@arco-design/web-react/icon';
import type { LeadDetailInfo, ClueType, FollowUpRecord } from './leads/types';
import {
  CLUE_TYPE_LABEL,
  SALES_STATUS_LIST,
  INTENTION_LEVEL_LIST,
  CUSTOMER_LEVEL_LIST,
  FOLLOWUP_METHODS,
  FOLLOWUP_TEMPLATES,
} from './leads/types';
import { getLeadDetailProfile } from './leads/leadDetailProfiles';
import { FOLLOWUP_RECORDS } from './leads/mockData';

const { Text } = Typography;
const TabPane = Tabs.TabPane;
const Step = Steps.Step;

// 6 步生命周期
const LIFECYCLE_STEPS = [
  { key: 'intake', label: '接入录入', statuses: ['未联系'] },
  { key: 'contact', label: '初步建联', statuses: ['未接通', '初步沟通'] },
  { key: 'research', label: '需求调研', statuses: ['需求调研'] },
  { key: 'contract', label: '主合同签署', statuses: ['方案报价', '合同洽谈'] },
  { key: 'delivery', label: '项目交付中', statuses: ['已签单'] },
  { key: 'closeout', label: '终验结项', statuses: ['已签单'] },
];

function getLifecycleIndex(status: string): number {
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.statuses.includes(status));
  return idx >= 0 ? idx : 0;
}

export function LeadDetail360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState('basic');
  const [activeSideTab, setActiveSideTab] = useState('follow');
  const [followVisible, setFollowVisible] = useState(false);
  const [followForm] = Form.useForm();
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [demoForm] = Form.useForm();
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docForm] = Form.useForm();
  const [travelModalVisible, setTravelModalVisible] = useState(false);
  const [travelForm] = Form.useForm();
  const [reimbursementModalVisible, setReimbursementModalVisible] = useState(false);
  const [reimbursementForm] = Form.useForm();

  // Mock 数据
  const [demos, setDemos] = useState([
    { id: 'dm1', type: '原型演示', url: 'https://demo-prototype.example.com', description: 'Axure 原型演示' },
    { id: 'dm2', type: '测试环境', url: 'https://test-app.example.com', description: '内部测试环境' },
  ]);

  const [documents, setDocuments] = useState([
    { id: 'doc1', name: '需求确认书V1.pdf', type: '确认书', source: '客户签署', uploader: '阎杨', createdAt: '2026-08-15' },
    { id: 'doc2', name: '报价单QT-2026-0035.xlsx', type: '报价单', source: '报价模块', uploader: '阎杨', createdAt: '2026-08-10' },
    { id: 'doc3', name: '原型确认书.pdf', type: '确认书', source: '客户签署', uploader: '李四', createdAt: '2026-08-18' },
  ]);

  const [travels, setTravels] = useState([
    { id: 'tr1', destination: '长沙', purpose: '面单接口调研', applicant: '阎杨', startDate: '2026-08-19', endDate: '2026-08-20', approvalNo: 'SP-20260819-0042', amount: 850, status: '已审批' },
  ]);

  const [reimbursements, setReimbursements] = useState([
    { id: 'rb1', type: '商务招待', description: '商务工作餐', applicant: '阎杨', amount: 280, approvalNo: 'BX-20260819-0018', status: '已审批' },
  ]);

  // 加载线索数据
  const profile = useMemo(() => getLeadDetailProfile(id, 'my'), [id]);
  const lead = profile?.leadInfo;

  if (!lead) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Text type="secondary">线索不存在</Text>
          <div style={{ marginTop: 16 }}>
            <Button onClick={() => navigate('/leads/my')}>返回列表</Button>
          </div>
        </div>
      </Card>
    );
  }

  const lifecycleIdx = getLifecycleIndex(lead.status);

  // 行动栏按钮（按 clueType 过滤）
  const showClaim = lead.clueType === 'public' || lead.clueType === 'trash' || lead.clueType === 'hightech';
  const showAssignActions = lead.clueType === 'assigned';
  const showReturn = lead.clueType === 'assigned' && lead.trashCount < 3;
  const showReturnWithWarning = lead.clueType === 'assigned' && lead.trashCount >= 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ========== 顶部一体化控制台 ========== */}
      <Card bodyStyle={{ padding: '16px 20px' }}>
        {/* 项目元数据 — 右上角操作按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<IconLeft />} onClick={() => navigate(-1)}>返回列表</Button>
            <Divider type="vertical" />
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-text-3)' }}>#{lead.name?.slice(0, 6) || id}</span>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{lead.name}</span>
            <Tag color={lead.status === '已签单' ? 'green' : lead.status === '已终止' ? 'red' : 'blue'}>{lead.status}</Tag>
            {lead.customerLevel && <Tag color={lead.customerLevel === 'S' ? 'red' : 'blue'}>{lead.customerLevel}级</Tag>}
            <Tag color="gray">{lead.entity}</Tag>
            <Tag color="default">{lead.source}</Tag>
          </div>
          <Space wrap>
            <Button size="small" icon={<IconEdit />}>编辑线索</Button>
            {showAssignActions && <Button size="small" icon={<IconSwap />}>转移给他人</Button>}
            {showReturn && <Button size="small" icon={<IconReply />} status="warning">扔回公海</Button>}
            {showReturnWithWarning && (
              <Tooltip content={`已退回${lead.trashCount}次，再退回将自动标记为垃圾`}>
                <Button size="small" icon={<IconReply />} status="warning">扔回公海 ({lead.trashCount}/3)</Button>
              </Tooltip>
            )}
            {lead.clueType !== 'trash' && <Button size="small" icon={<IconDelete />} status="danger">标记垃圾</Button>}
            <Button size="small" icon={<IconDelete />} status="danger">删除</Button>
          </Space>
        </div>

        {/* 6 步生命周期步骤条 — 横向全宽 */}
        <Steps current={lifecycleIdx} size="small" style={{ marginBottom: 16 }}>
          {LIFECYCLE_STEPS.map((step, index) => (
            <Step
              key={step.key}
              title={step.label}
              description={
                index === 4 && lead.status === '已签单' ? '进行中' :
                index === 5 && lead.status === '已签单' ? '待完成' :
                undefined
              }
            />
          ))}
        </Steps>
      </Card>

      {/* 6 维指标胶囊 — 独立卡片 */}
      <Card size="small">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>负责人</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <IconUserAdd style={{ color: 'rgb(var(--primary-6))' }} />
              <Text style={{ fontWeight: 500, fontSize: 14 }}>{lead.owner || '公海'}</Text>
              {lead.daysHeld > 0 && <Text type="secondary" style={{ fontSize: 12 }}>({lead.daysHeld}天)</Text>}
            </div>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>对接人</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <IconPhone style={{ color: 'var(--color-text-3)' }} />
              <Text style={{ fontWeight: 500, fontSize: 14 }}>{lead.contact}</Text>
              <Tooltip content="复制电话">
                <Button type="text" size="mini" icon={<IconCopy />} onClick={() => { navigator.clipboard.writeText(lead.phone); Message.success('已复制'); }} />
              </Tooltip>
            </div>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>总标的</Text>
            <Text style={{ fontWeight: 600, fontSize: 16, color: 'rgb(var(--success-6))', marginTop: 4 }}>{lead.customerBudget || '-'}</Text>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>客资成本</Text>
            <Text style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{lead.customerCost || '-'}</Text>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>跟进次数</Text>
            <Text style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{lead.followCount}次</Text>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>下次跟进</Text>
            <Text style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{lead.nextFollowTime ? lead.nextFollowTime.slice(0, 16) : '-'}</Text>
          </div>
        </div>
      </Card>

      {/* ========== 主体区域：70:30 分栏 ========== */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧主区域 (70%) */}
        <div style={{ flex: 7, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 关键信息档案卡 */}
          <Card size="small">
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{lead.name}</span>
            </div>
            <Grid.Row gutter={[16, 8]}>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>来源:</Text> <Tag color="default">{lead.source}</Tag></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>客资成本:</Text> <Text>{lead.customerCost || '-'}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>客户称呼:</Text> <Text>{lead.customerTitle || '-'}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>电话:</Text> <Text>{lead.phone || '-'}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>微信:</Text> <Text>{lead.wechat || '-'}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>对接主体:</Text> <Text>{lead.entity}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>创建人:</Text> <Text>{lead.creator}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>优化师:</Text> <Text>{lead.optimizer || '-'}</Text></Grid.Col>
              <Grid.Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>协助人:</Text> <Text>{lead.assistant || '-'}</Text></Grid.Col>
            </Grid.Row>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>初始需求:</Text>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-1)' }}>{lead.requirement || lead.initialRequirement || '-'}</div>
            </div>
          </Card>

          {/* 左侧 3 个 Tab */}
          <Card size="small">
            <Tabs activeTab={activeMainTab} onChange={setActiveMainTab} type="card">
              <TabPane key="basic" title="基础信息" />
              <TabPane key="contracts" title="合同信息" />
              <TabPane key="payments" title="回款与发票" />
            </Tabs>

            <div style={{ marginTop: 16 }}>
              {/* 基础信息 */}
              {activeMainTab === 'basic' && (
                <Descriptions
                  column={2}
                  data={[
                    { label: '对接主体', value: lead.entity },
                    { label: '线索意向', value: lead.intention || '-' },
                    { label: '线索状态', value: lead.status },
                    { label: '客户类型', value: lead.customerLevel || '-' },
                    { label: '客户预算', value: lead.customerBudget || '-' },
                    { label: '客户主体', value: lead.customer },
                    { label: '售前群名称', value: lead.presalesGroupName || '-' },
                    { label: '原型图链接', value: lead.prototypeLink ? <a href={lead.prototypeLink} target="_blank" rel="noreferrer">查看原型</a> : '-' },
                    { label: '威客任务号', value: lead.witkeyTaskNo || '-' },
                    { label: '推广关键词', value: lead.keyword || '-' },
                    { label: '意向标签', value: lead.tags?.join('、') || '-' },
                    { label: '客户信息备注', value: lead.customerNote || '-' },
                  ]}
                />
              )}

              {/* 合同信息 */}
              {activeMainTab === 'contracts' && (
                <div>
                  <Card size="small" title="正式主合同" style={{ marginBottom: 12 }}>
                    <Descriptions
                      column={2}
                      data={[
                        { label: '合同编号', value: profile.demoContracts?.[0]?.contractNo || '-' },
                        { label: '标的额', value: profile.demoContracts?.[0]?.amount || '-' },
                        { label: '签约主体', value: profile.demoContracts?.[0]?.contractEntity || '-' },
                        { label: '状态', value: profile.demoContracts?.[0]?.status || '-' },
                        { label: '签约日期', value: profile.demoContracts?.[0]?.signDate || '-' },
                      ]}
                    />
                  </Card>
                  <Card size="small" title="补充合同">
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无补充合同</div>
                  </Card>
                </div>
              )}

              {/* 回款与发票 */}
              {activeMainTab === 'payments' && (
                <div>
                  <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
                    <Grid.Col span={8}>
                      <Card size="small"><Text type="secondary" style={{ fontSize: 12 }}>有效总标的</Text><div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{lead.customerBudget || '-'}</div></Card>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Card size="small"><Text type="secondary" style={{ fontSize: 12 }}>已到账</Text><div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'rgb(var(--success-6))' }}>-</div></Card>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Card size="small"><Text type="secondary" style={{ fontSize: 12 }}>待回款</Text><div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>-</div></Card>
                    </Grid.Col>
                  </Grid.Row>
                  <Card size="small" title="回款期次台账">
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-4)' }}>暂无回款记录</div>
                  </Card>
                </div>
              )}
            </div>
          </Card>

          {/* 项目交付执行（独立板块） */}
          <Card size="small" title="项目交付执行">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--color-fill-2)', borderRadius: 8 }}>
              <Tag color="blue">项目编号</Tag>
              <Text style={{ fontWeight: 500 }}>PRJ20260820001</Text>
              <Divider type="vertical" />
              <Tag color="green">健康度: 正常</Tag>
              <Divider type="vertical" />
              <Text type="secondary">PM: 李四</Text>
              <Divider type="vertical" />
              <Text type="secondary">进度: 65%</Text>
              <Progress percent={65} size="small" style={{ width: 100 }} showText={false} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: 'block' }}>交付里程碑</Text>
              <Steps current={2} size="small">
                <Step title="立项启动" description="08-20 已确认" />
                <Step title="UI确认" description="08-28 客户盖章" />
                <Step title="核心开发" description="进行中 65%" />
                <Step title="提测预发布" description="计划 09-15" />
                <Step title="终验上线" description="计划 09-25" />
              </Steps>
            </div>

            <Grid.Row gutter={16}>
              <Grid.Col span={12}>
                <Card size="small" title="任务看板">
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>开发中 3 项 · 待分配 1 项 · 已完成 1 项</div>
                </Card>
              </Grid.Col>
              <Grid.Col span={12}>
                <Card size="small" title="缺陷跟踪">
                  <div style={{ fontSize: 12 }}>
                    <Tag color="red" size="small">P0: 0</Tag>
                    <Tag color="orangered" size="small">P1: 1</Tag>
                    <Tag color="orange" size="small">P2: 0</Tag>
                    <Tag color="blue" size="small">P3: 0</Tag>
                  </div>
                </Card>
              </Grid.Col>
            </Grid.Row>
          </Card>
        </div>

        {/* 右侧业务过程 (30%) */}
        <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 售前聊天群分析（独立板块） */}
          {lead.presalesGroupName && (
            <Card size="small" title="售前聊天群分析">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ color: '#07C160', fontSize: 16 }}>💬</span>
                <Text style={{ fontWeight: 500 }}>{lead.presalesGroupName}</Text>
              </div>
              <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 14, color: 'var(--color-text-2)' }}>
                <Text type="secondary">AI 摘要分析</Text>
                <div style={{ marginTop: 8 }}>
                  客户对小程序点餐系统需求明确，重点关注多门店管理和微信支付对接。已确认基础功能清单，待确认抖音端增项需求。
                </div>
              </div>
            </Card>
          )}

          {/* 右侧 7 个 Tab */}
          <Card size="small" style={{ flex: 1 }}>
            <Tabs activeTab={activeSideTab} onChange={setActiveSideTab} type="card" size="small">
              <TabPane key="follow" title="跟进" />
              <TabPane key="quotation" title="报价" />
              <TabPane key="contract-records" title="合同记录" />
              <TabPane key="demo" title="演示" />
              <TabPane key="documents" title="资料" />
              <TabPane key="travel" title="出差" />
              <TabPane key="reimbursement" title="报销" />
            </Tabs>

            <div style={{ marginTop: 16 }}>
              {/* 跟进 */}
              {activeSideTab === 'follow' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<IconPlus />} onClick={() => { followForm.resetFields(); setFollowVisible(true); }}>写跟进</Button>
                  </div>
                  <Timeline>
                    {FOLLOWUP_RECORDS.filter((r) => r.leadId === id || r.leadId === '5940').map((record, index) => (
                      <Timeline.Item key={record.id} dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Tag color="blue" size="small">{record.method}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.createdAt}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>· {record.creator}</Text>
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--color-text-1)', marginBottom: 4 }}>{record.content}</div>
                          {record.nextFollowTime && (
                            <Text type="secondary" style={{ fontSize: 12 }}>下次跟进: {record.nextFollowTime}</Text>
                          )}
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>
              )}

              {/* 报价 */}
              {activeSideTab === 'quotation' && (
                <div>
                  {profile.quotationHistory?.map((q) => (
                    <Card key={q.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{q.name}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{q.entity} · {q.period}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>¥{q.amount}</div>
                          <Tag color={q.flowStatus === '已审核' ? 'green' : 'orange'} size="small">{q.flowStatus}</Tag>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {(!profile.quotationHistory || profile.quotationHistory.length === 0) && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无报价记录</div>
                  )}
                </div>
              )}

              {/* 合同记录 */}
              {activeSideTab === 'contract-records' && (
                <div>
                  {profile.demoContracts?.map((c) => (
                    <Card key={c.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{c.name}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{c.contractNo} · {c.contractEntity}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>¥{c.amount}</div>
                          <Tag color="green" size="small">{c.status}</Tag>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {(!profile.demoContracts || profile.demoContracts.length === 0) && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无合同记录</div>
                  )}
                </div>
              )}

              {/* 演示 */}
              {activeSideTab === 'demo' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { demoForm.resetFields(); setDemoModalVisible(true); }}>新增环境</Button>
                  </div>
                  {demos.map((demo) => (
                    <Card key={demo.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Tag color="blue" size="small">{demo.type}</Tag>
                          <Text style={{ marginLeft: 8 }}>{demo.description}</Text>
                        </div>
                        <Space>
                          <Button type="text" size="small" onClick={() => { navigator.clipboard.writeText(demo.url); Message.success('已复制链接'); }}>复制链接</Button>
                          <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDemos(demos.filter((d) => d.id !== demo.id)); Message.success('已删除'); }} />
                        </Space>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{demo.url}</div>
                    </Card>
                  ))}
                  {demos.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无演示环境</div>}
                </div>
              )}

              {/* 资料 */}
              {activeSideTab === 'documents' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconUpload />}>上传资料</Button>
                  </div>
                  {documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border-1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconFile style={{ color: 'var(--color-text-3)' }} />
                        <div>
                          <Text style={{ fontSize: 14 }}>{doc.name}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                            <Tag size="small" color="gray">{doc.type}</Tag>
                            <Tag size="small" color="default">{doc.source}</Tag>
                            {doc.uploader} · {doc.createdAt}
                          </div>
                        </div>
                      </div>
                      <Space>
                        <Button type="text" size="small">下载</Button>
                        <Button type="text" size="small" icon={<IconDelete />} status="danger" onClick={() => { setDocuments(documents.filter((d) => d.id !== doc.id)); Message.success('已删除'); }} />
                      </Space>
                    </div>
                  ))}
                  {documents.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无资料</div>}
                </div>
              )}

              {/* 出差 */}
              {activeSideTab === 'travel' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { travelForm.resetFields(); setTravelModalVisible(true); }}>新增出差</Button>
                  </div>
                  {travels.map((travel) => (
                    <Card key={travel.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{travel.destination} - {travel.purpose}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                            {travel.applicant} · {travel.startDate} ~ {travel.endDate} · ¥{travel.amount}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Tag color="green" size="small">{travel.status}</Tag>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>审批号: {travel.approvalNo}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {travels.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无出差记录</div>}
                </div>
              )}

              {/* 报销 */}
              {activeSideTab === 'reimbursement' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button size="small" icon={<IconPlus />} onClick={() => { reimbursementForm.resetFields(); setReimbursementModalVisible(true); }}>新增报销</Button>
                  </div>
                  {reimbursements.map((rb) => (
                    <Card key={rb.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{rb.type} - {rb.description}</Text>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                            {rb.applicant} · ¥{rb.amount}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Tag color="green" size="small">{rb.status}</Tag>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>审批号: {rb.approvalNo}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {reimbursements.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-4)' }}>暂无报销记录</div>}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 新增跟进 Modal */}
      <Modal
        title="登记跟进"
        visible={followVisible}
        onOk={() => {
          followForm.validate().then(() => {
            Message.success('跟进记录已保存');
            setFollowVisible(false);
          });
        }}
        onCancel={() => setFollowVisible(false)}
        style={{ width: 620 }}
      >
        <Form form={followForm} layout="vertical">
          <Form.Item label="跟进方式" field="method" rules={[{ required: true }]}>
            <Select placeholder="请选择">
              {FOLLOWUP_METHODS.map((m) => <Select.Option key={m} value={m}>{m}</Select.Option>)}
            </Select>
          </Form.Item>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <Form.Item label="客户状态" field="status" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  {SALES_STATUS_LIST.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                </Select>
              </Form.Item>
            </Grid.Col>
            <Grid.Col span={12}>
              <Form.Item label="客户等级" field="customerLevel">
                <Select placeholder="可选" allowClear>
                  {CUSTOMER_LEVEL_LIST.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
                </Select>
              </Form.Item>
            </Grid.Col>
          </Grid.Row>
          <Form.Item label="跟进内容" field="content" rules={[{ required: true }]}>
            <Input.TextArea rows={4} maxLength={1000} showWordLimit placeholder="请记录跟进内容" />
          </Form.Item>
          <Form.Item label="快捷话术">
            <Space wrap>
              {FOLLOWUP_TEMPLATES.map((t) => (
                <Tag key={t.label} size="small" color="arcoblue" style={{ cursor: 'pointer' }} onClick={() => followForm.setFieldValue('content', t.content)}>
                  {t.label}
                </Tag>
              ))}
            </Space>
          </Form.Item>
          <Form.Item label="下次跟进时间" field="nextFollowTime">
            <Space>
              <DatePicker showTime style={{ width: 220 }} />
              <Tag size="small" style={{ cursor: 'pointer' }} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0); followForm.setFieldValue('nextFollowTime', d); }}>明天10:00</Tag>
              <Tag size="small" style={{ cursor: 'pointer' }} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0); followForm.setFieldValue('nextFollowTime', d); }}>3天后</Tag>
            </Space>
          </Form.Item>
          <Form.Item label="附件">
            <Upload accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" multiple drag>
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 24, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>点击或拖拽上传</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增演示环境 Modal */}
      <Modal title="新增演示环境" visible={demoModalVisible} onOk={() => { demoForm.validate().then((values) => { setDemos([...demos, { id: `dm${Date.now()}`, ...values }]); Message.success('已添加'); setDemoModalVisible(false); }); }} onCancel={() => setDemoModalVisible(false)} style={{ width: 480 }}>
        <Form form={demoForm} layout="vertical">
          <Form.Item label="环境类型" field="type" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="原型演示">原型演示</Select.Option><Select.Option value="测试环境">测试环境</Select.Option><Select.Option value="预发布环境">预发布环境</Select.Option><Select.Option value="正式环境">正式环境</Select.Option></Select></Form.Item>
          <Form.Item label="访问地址" field="url" rules={[{ required: true }]}><Input placeholder="请输入 URL" /></Form.Item>
          <Form.Item label="说明" field="description"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增出差 Modal */}
      <Modal title="新增出差" visible={travelModalVisible} onOk={() => { travelForm.validate().then((values) => { setTravels([...travels, { id: `tr${Date.now()}`, ...values, status: '待审批' }]); Message.success('已提交'); setTravelModalVisible(false); }); }} onCancel={() => setTravelModalVisible(false)} style={{ width: 520 }}>
        <Form form={travelForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="目的地" field="destination" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="出差事由" field="purpose" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item></Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><Form.Item label="开始日期" field="startDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
            <Grid.Col span={12}><Form.Item label="结束日期" field="endDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Grid.Col>
          </Grid.Row>
          <Form.Item label="预估费用" field="amount"><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
        </Form>
      </Modal>

      {/* 新增报销 Modal */}
      <Modal title="新增报销" visible={reimbursementModalVisible} onOk={() => { reimbursementForm.validate().then((values) => { setReimbursements([...reimbursements, { id: `rb${Date.now()}`, ...values, status: '待审批' }]); Message.success('已提交'); setReimbursementModalVisible(false); }); }} onCancel={() => setReimbursementModalVisible(false)} style={{ width: 480 }}>
        <Form form={reimbursementForm} layout="vertical">
          <Form.Item label="报销类型" field="type" rules={[{ required: true }]}><Select placeholder="请选择"><Select.Option value="商务招待">商务招待</Select.Option><Select.Option value="交通费">交通费</Select.Option><Select.Option value="住宿费">住宿费</Select.Option><Select.Option value="办公用品">办公用品</Select.Option><Select.Option value="其他">其他</Select.Option></Select></Form.Item>
          <Form.Item label="说明" field="description" rules={[{ required: true }]}><Input placeholder="请输入" /></Form.Item>
          <Form.Item label="金额" field="amount" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
