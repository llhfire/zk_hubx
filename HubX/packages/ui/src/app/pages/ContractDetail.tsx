import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  Card,
  Descriptions,
  Tabs,
  Table,
  Space,
  Grid,
  Result,
  Button,
  Select,
  Tag,
  Progress,
  Timeline,
  Typography,
  Modal,
  Form,
  Input,
  Message,
  Upload,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconEdit,
  IconCheck,
  IconWechatpay,
  IconPushpin,
  IconUpload,
} from '@arco-design/web-react/icon';
import { useContracts } from './contracts/ContractsContext';
import { ContractStatusBadge } from './contracts/components/ContractStatusBadge';
import { renderContractDocument } from './contracts/templates';
import { computePlanStatusRows, PLAN_STATUS_META, effectiveAmount, getReceivedAmount } from './contracts/paymentUtils';
import { registerMainPaymentDualWrite, type DualWriteStatus } from '@/services/collectionMutations';
import { useCollections } from '@/app/collections/CollectionContext';
import { useProjects } from './project-management/ProjectContext';
import {
  type ContractVersion,
} from './contracts/types';

const { Row, Col } = Grid;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

// ─── 跟进记录 ───────────────────────────────────────────────

interface FollowUpRecord {
  id: string;
  type: 'requirement_change' | 'ui_confirm' | 'dunning' | 'other';
  title: string;
  content: string;
  author: string;
  date: string;
}

const FOLLOW_UP_TYPES: Record<FollowUpRecord['type'], { label: string; color: string; icon: ReactNode }> = {
  requirement_change: { label: '需求变更', color: 'orange', icon: <IconEdit /> },
  ui_confirm: { label: 'UI确认', color: 'cyan', icon: <IconCheck /> },
  dunning: { label: '催款记录', color: 'red', icon: <IconWechatpay /> },
  other: { label: '其他', color: 'gray', icon: <IconPushpin /> },
};

const mockFollowUps: FollowUpRecord[] = [
  { id: 'fu-1', type: 'ui_confirm', title: 'CRM 首页设计确认', content: '客户已确认 CRM 首页设计稿 V2，无修改意见，可进入开发阶段。', author: '陈明', date: '2026-06-25 14:00' },
  { id: 'fu-2', type: 'dunning', title: '第二期款项到账', content: '第二期款项 ¥360,000 已到账，客户财务确认本周内支付。', author: '张三', date: '2026-06-22 16:00' },
  { id: 'fu-3', type: 'requirement_change', title: '登录方式调整', content: '客户要求增加微信扫码登录，原有手机验证码登录保留，已评估技术可行性，无额外成本。', author: '李四', date: '2026-06-18 11:30' },
  { id: 'fu-4', type: 'ui_confirm', title: '移动端原型确认', content: '客户已签字确认移动端 APP 原型设计，包含 12 个核心页面流程图。', author: '陈明', date: '2026-06-15 10:00' },
  { id: 'fu-5', type: 'dunning', title: '首期款项到账', content: '首期款项 ¥480,000 已到账，银行回单已归档。', author: '张三', date: '2026-04-10 14:30' },
  { id: 'fu-6', type: 'other', title: '合同签订', content: '合同已正式签订，合同金额 ¥1,200,000，分三期回款。', author: '张三', date: '2026-03-15 10:00' },
];

// ─── 格式化工具 ─────────────────────────────────────────────

function formatMoney(n: number | undefined | null): string {
  if (n === undefined || n === null) return '¥0';
  const rounded = Math.round(n * 100) / 100;
  return `¥${rounded.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function displayValue(value: ReactNode | null | undefined): ReactNode {
  if (value == null || String(value).trim() === '') return '-';
  return value;
}

// ─── 主组件 ───────────────────────────────────────────────

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getById, addCollection } = useContracts();

  const returnTarget = (
    location.state as { contractDetailReturn?: { pathname: string; state?: unknown } } | null
  )?.contractDetailReturn;

  const handleBack = () => {
    if (returnTarget) {
      navigate(returnTarget.pathname, { state: returnTarget.state });
      return;
    }
    navigate(-1);
  };

  const contract = getById(id);

  if (!contract) {
    return (
      <Result
        status="404"
        title="合同不存在"
        subTitle="该合同可能已被删除，或链接有误。"
        extra={<Button type="primary" onClick={handleBack}>返回</Button>}
      />
    );
  }

  const cd = contract.current;
  const versions = contract.versionHistory;
  const latestVersion = versions[versions.length - 1];
  const [selectedVersionNo, setSelectedVersionNo] = useState<string>(
    contract.approvedVersionNo || latestVersion?.versionNo || '',
  );
  const selectedVersion: ContractVersion | undefined =
    versions.find((v) => v.versionNo === selectedVersionNo) || latestVersion;

  // 主合同回款登记（双写：合同嵌套流水 + 实收台账）
  const [mainPaymentModalVisible, setMainPaymentModalVisible] = useState(false);
  const [mainPaymentForm] = Form.useForm();
  const [ledgerRetryId, setLedgerRetryId] = useState<string>('');
  const [lastDualWriteStatus, setLastDualWriteStatus] = useState<DualWriteStatus | null>(null);
  const { add: addLedgerEntry } = useCollections();
  const { getProjectByLeadId } = useProjects();

  const handleRegisterMainPayment = async () => {
    try {
      const values = await mainPaymentForm.validate();
      const periodValue = values.period === 'other' ? 'other' : Number(values.period) || undefined;
      const record = {
        period: periodValue,
        amount: Number(values.amount) || 0,
        date: values.date || new Date().toISOString().slice(0, 10),
        method: values.method || '银行转账',
        note: values.note || '',
      };

      const projectId = contract.projectId
        || getProjectByLeadId(contract.leadId)?.id
        || ('ap-' + contract.id);

      const result = await registerMainPaymentDualWrite({
        contractId: contract.id,
        projectId,
        record,
        addToContract: addCollection,
        addToLedger: async (entry) => {
          const id = await addLedgerEntry(entry);
          return id || '';
        },
      });

      if (result.status === 'ok') {
        Message.success('回款登记成功，已更新合同回款数据');
        setMainPaymentModalVisible(false);
        mainPaymentForm.resetFields();
        setLedgerRetryId('');
        setLastDualWriteStatus(null);
      } else if (result.status === 'contract-failed') {
        // 不再二次 toast（http 已 warning 409）；不关弹窗；主提交保持可用
        setLastDualWriteStatus('contract-failed');
      } else if (result.status === 'ledger-failed') {
        Message.error('合同已记回款，实收台账未写入，请重试台账');
        setLedgerRetryId(result.collectionId);
        setLastDualWriteStatus('ledger-failed');
      }
    } catch {
      // 表单验证失败
    }
  };

  const handleRetryLedger = async () => {
    if (!ledgerRetryId) return;
    const projectId = contract.projectId
      || getProjectByLeadId(contract.leadId)?.id
      || ('ap-' + contract.id);
    const id = await addLedgerEntry({
      id: ledgerRetryId,
      contractId: contract.id,
      projectId,
      amount: Number(mainPaymentForm.getFieldValue('amount')) || 0,
      date: mainPaymentForm.getFieldValue('date') || new Date().toISOString().slice(0, 10),
      method: mainPaymentForm.getFieldValue('method') || '银行转账',
      note: mainPaymentForm.getFieldValue('note') || '',
    });
    if (id) {
      Message.success('台账写入成功');
      setMainPaymentModalVisible(false);
      mainPaymentForm.resetFields();
      setLedgerRetryId('');
      setLastDualWriteStatus(null);
    }
  };

  // 补充合同列表（从 ContractsContext 读取）
  const { contracts: allContracts } = useContracts();
  const supplements = allContracts.filter(
    (c) => c.kind === 'supplement' && c.parentContractId === contract.id,
  );

  // 跟进记录
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(mockFollowUps);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);
  const [followUpForm] = Form.useForm();

  const handleAddFollowUp = () => {
    followUpForm.validate().then((values) => {
      const now = new Date();
      const newFollowUp: FollowUpRecord = {
        id: `fu-${Date.now()}`,
        type: values.type || 'other',
        title: values.title || '跟进记录',
        content: values.content || '',
        author: contract.createdBy || '张三',
        date: now.toISOString().slice(0, 16).replace('T', ' '),
      };
      setFollowUps((current) => [newFollowUp, ...current]);
      setFollowUpModalVisible(false);
      followUpForm.resetFields();
    });
  };

  // 金额计算：使用 effectiveAmount 统一口径（主合同 + 已归档补充合同）
  const totalAmount = effectiveAmount(contract, supplements);
  const receivedAmount = getReceivedAmount(contract);
  const receivableAmount = Math.max(0, totalAmount - receivedAmount);
  const collectionRate = totalAmount > 0 ? Math.round((receivedAmount / totalAmount) * 100) : 0;

  // 期次回款状态
  const planStatusRows = computePlanStatusRows(contract);

  const paymentPlanColumns = [
    { title: '期数', dataIndex: 'period', width: 100, render: (_: unknown, record: { period: number; periodName?: string }) => record.periodName || `第${record.period}期` },
    { title: '预计回款日期', dataIndex: 'expectedDate', width: 160, render: (v: string) => displayValue(v) },
    { title: '比例', dataIndex: 'percentage', width: 120, render: (v: number) => `${v?.toFixed(2)}%` },
    { title: '金额', dataIndex: 'amount', width: 160, render: (v: number) => formatMoney(v) },
  ];

  const contractBodyHtml = selectedVersion?.renderedHtml || renderContractDocument(cd);

  return (
    <div>
      {/* 顶部标题栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space align="start" style={{ marginBottom: 12 }}>
          <Button type="text" icon={<IconLeft />} onClick={handleBack} />
          <Title heading={4} style={{ margin: 0 }}>{cd.contractName}</Title>
          <ContractStatusBadge status={contract.status} size="small" />
          {contract.executionStatus && (
            <Tag color="arcoblue">履行：{contract.executionStatus}</Tag>
          )}
        </Space>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Text type="secondary">合同编号：{contract.contractNo}</Text>
            <Text type="secondary">当前查看版本：</Text>
            <Select
              value={selectedVersionNo}
              onChange={(v) => setSelectedVersionNo(v as string)}
              style={{ width: 220 }}
              size="small"
            >
              {versions.map((v) => (
                <Select.Option key={v.versionNo} value={v.versionNo}>
                  {v.versionNo} - {v.label}
                </Select.Option>
              ))}
            </Select>
          </Space>
          <Space>
            {contract.projectId ? (
              <Button type="outline" onClick={() => navigate(`/projects/${contract.projectId}`)}>
                关联项目
              </Button>
            ) : (
              <Text type="secondary">可在「扫描件归档」Tab 补充上传</Text>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={16}>
        {/* 主内容区 */}
        <Col span={18}>
          {/* 基础信息 */}
          <Card title="基础信息" style={{ marginBottom: 16 }}>
            <Descriptions
              column={4}
              labelStyle={{ color: 'var(--color-text-3)' }}
              style={{ marginBottom: 16 }}
              data={[
                { label: '签约主体', value: displayValue(cd.signingEntity) },
                { label: '产品类别', value: displayValue(cd.productCategory) },
                { label: '合同总额', value: formatMoney(totalAmount) },
                { label: '付款方式', value: displayValue(cd.paymentMethod) },
                { label: '签约日期', value: displayValue(cd.signDate) },
                { label: '生效日期', value: displayValue(cd.effectiveDate) },
                { label: '终止日期', value: displayValue(cd.endDate) },
                { label: '创建人', value: displayValue(contract.createdBy) },
              ]}
            />
            <Text bold style={{ display: 'block', marginBottom: 8 }}>甲方画像信息</Text>
            <Descriptions
              column={4}
              labelStyle={{ color: 'var(--color-text-3)' }}
              data={[
                { label: '公司名称', value: displayValue(cd.customerName) },
                { label: '联系人', value: displayValue(cd.customerContact) },
                { label: '联系电话', value: displayValue(cd.customerPhone) },
                { label: '邮箱', value: displayValue(cd.customerEmail) },
                { label: '地址', value: displayValue(cd.customerAddress) },
                { label: '邮编', value: displayValue(cd.customerPostalCode) },
                { label: '税务登记号', value: displayValue(cd.customerTaxNo) },
                { label: '开户行', value: displayValue(cd.bankName) },
                { label: '银行账号', value: displayValue(cd.bankAccount) },
              ]}
            />
          </Card>

          {/* 款项与回款计划 */}
          <Card title="款项与回款计划" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                background: 'var(--color-fill-1)',
                padding: '16px 20px',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: 'var(--color-text-3)' }}>合同总额</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{formatMoney(totalAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--color-text-3)' }}>已回款</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{formatMoney(receivedAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--color-text-3)' }}>待回款</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--destructive-500)' }}>{formatMoney(receivableAmount)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 4 }}>到账率</div>
                <Progress percent={collectionRate} />
              </div>
            </div>
            <Table
              columns={paymentPlanColumns}
              data={cd.paymentPlans ?? []}
              rowKey={(record) => String(record.period)}
              pagination={false}
            />
          </Card>

          {/* 合同文件 */}
          <Card title="合同文件">
            <Tabs defaultActiveTab="body">
              <TabPane key="body" title="合同正文">
                <div
                  style={{ maxHeight: 900, overflow: 'auto', padding: '0 8px' }}
                  dangerouslySetInnerHTML={{ __html: contractBodyHtml }}
                />
              </TabPane>
              <TabPane key="scans" title={`扫描件归档(${contract.archivedScans.length})`}>
                {contract.archivedScans.length > 0 ? (
                  <Table
                    columns={[
                      { title: '文件', dataIndex: 'fileName', render: (_: unknown, entry: { files: Array<{ fileName: string }> }) => entry.files.map((f) => f.fileName).join('、') },
                      { title: '上传时间', dataIndex: 'uploadedAt' },
                      { title: '上传人', dataIndex: 'uploadedBy' },
                    ]}
                    data={contract.archivedScans}
                    rowKey="id"
                    pagination={false}
                  />
                ) : (
                  <Text type="secondary">暂无扫描件归档，审批通过后可在此上传归档合同文件。</Text>
                )}
              </TabPane>
            </Tabs>
          </Card>
        </Col>

        {/* 右侧跟进记录边栏 */}
        <Col span={6}>
          <Card
            title="跟进记录"
            extra={<Button type="primary" size="small" icon={<IconEdit />} onClick={() => setFollowUpModalVisible(true)}>记录</Button>}
            style={{ height: '100%' }}
          >
            <Tabs defaultActiveTab="followup">
              <TabPane key="followup" title="跟进">
                <Timeline style={{ marginTop: 8 }}>
                  {followUps.map((record) => {
                    const meta = FOLLOW_UP_TYPES[record.type];
                    return (
                      <Timeline.Item key={record.id}>
                        <Space align="start" direction="vertical" size={4}>
                          <Space size={4}>
                            <Tag color={meta.color} size="small">{meta.label}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.date}</Text>
                          </Space>
                          <Text>{record.content}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>操作人：{record.author}</Text>
                        </Space>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </TabPane>
              <TabPane key="approval" title="审批">
                <Timeline style={{ marginTop: 8 }}>
                  {contract.approvalFlow.map((node) => (
                    <Timeline.Item key={node.step + node.time}>
                      <Space direction="vertical" size={2}>
                        <Space size={4}>
                          <Tag
                            color={node.status === 'approved' ? 'green' : node.status === 'rejected' ? 'red' : 'gray'}
                            size="small"
                          >
                            {node.step}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{node.approver}</Text>
                        </Space>
                        {node.time && <Text type="secondary" style={{ fontSize: 12 }}>{node.time}</Text>}
                        {node.comment && <Text>{node.comment}</Text>}
                      </Space>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
              <TabPane key="payment" title="回款">
                <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      已回款 {formatMoney(receivedAmount)} / 待回款 {formatMoney(receivableAmount)}
                    </Text>
                    <Button type="primary" size="mini" onClick={() => setMainPaymentModalVisible(true)}>
                      登记回款
                    </Button>
                  </div>
                  <Progress percent={collectionRate} size="small" />
                  {planStatusRows.length === 0 ? (
                    <Text type="secondary">暂无回款期次，可在合同编辑中配置付款计划。</Text>
                  ) : (
                    planStatusRows.map((row) => {
                      const meta = PLAN_STATUS_META[row.status];
                      const label = row.plan.periodName || `第${row.plan.period}期`;
                      return (
                        <div key={row.plan.period} style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: '8px 12px' }}>
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text bold style={{ fontSize: 13 }}>{label}</Text>
                              <Tag color={meta.color} size="small">{meta.label}</Tag>
                            </div>
                            <Space size={8}>
                              <Text type="secondary" style={{ fontSize: 12 }}>预计 {row.plan.expectedDate || '-'}</Text>
                              <Text style={{ fontSize: 12, fontWeight: 600 }}>{formatMoney(row.plan.amount)}</Text>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              已到账 {formatMoney(row.allocated)}（{row.plan.percentage?.toFixed(0) ?? '-'}%）
                            </Text>
                          </Space>
                        </div>
                      );
                    })
                  )}
                </Space>
              </TabPane>
              <TabPane key="version" title="版本">
                <Timeline style={{ marginTop: 8 }}>
                  {[...versions].reverse().map((v) => (
                    <Timeline.Item key={v.versionNo}>
                      <Space direction="vertical" size={2}>
                        <Space size={4}>
                          <Tag color={v.versionNo === (contract.approvedVersionNo) ? 'arcoblue' : 'gray'} size="small">
                            {v.versionNo}
                          </Tag>
                          <Text>{v.label}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{v.createdAt} · {v.createdBy}</Text>
                      </Space>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
              <TabPane key="supplement" title="补充合同">
                <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                  {supplements.length === 0 ? (
                    <Text type="secondary">暂无补充合同，需求变更请走补充报价→合同向导链路。</Text>
                  ) : (
                    supplements.map((sup) => (
                      <div key={sup.id} style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: 12, cursor: 'pointer' }}
                        onClick={() => navigate(`/contracts/${sup.id}`)}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text bold>{sup.current.contractName}</Text>
                            <Tag color="arcoblue" size="small">补充合同</Tag>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>合同额：{formatMoney(sup.current.totalAmount)}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>来源报价：{sup.sourceQuoteId || '-'}</Text>
                        </Space>
                      </div>
                    ))
                  )}
                </Space>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* 主合同回款登记弹窗 */}
      <Modal
        title="登记回款（主合同）"
        visible={mainPaymentModalVisible}
        onCancel={() => { setMainPaymentModalVisible(false); setLedgerRetryId(''); setLastDualWriteStatus(null); }}
        onOk={lastDualWriteStatus === 'ledger-failed' ? handleRetryLedger : handleRegisterMainPayment}
        okText={lastDualWriteStatus === 'ledger-failed' ? '重试台账' : '确定'}
        okButtonProps={{ disabled: lastDualWriteStatus === 'ledger-failed' && !ledgerRetryId }}
        maskClosable={false}
        style={{ width: 420 }}
      >
        <Form form={mainPaymentForm} layout="vertical">
          <Form.Item label="回款期次" field="period" initialValue={(() => {
            const firstPending = planStatusRows.find((r) => r.status !== 'paid');
            return firstPending ? String(firstPending.plan.period) : 'other';
          })()}>
            <Select placeholder="请选择回款期次">
              {planStatusRows.map((row) => (
                <Select.Option key={row.plan.period} value={String(row.plan.period)}>
                  {row.plan.periodName || `第${row.plan.period}期`} · {formatMoney(row.plan.amount)}
                </Select.Option>
              ))}
              <Select.Option value="other">其他/不分期</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="回款金额" field="amount" rules={[{ required: true, message: '请输入回款金额' }]}>
            <Input placeholder="如：50000" />
          </Form.Item>
          <Form.Item label="回款日期" field="date">
            <Input placeholder="如：2026-06-20（默认今天）" />
          </Form.Item>
          <Form.Item label="回款方式" field="method">
            <Input placeholder="如：银行转账" />
          </Form.Item>
          <Form.Item label="备注" field="note">
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 跟进记录弹窗 */}
      <Modal
        title="添加跟进记录"
        visible={followUpModalVisible}
        onCancel={() => setFollowUpModalVisible(false)}
        onOk={handleAddFollowUp}
        maskClosable={false}
        style={{ width: 480 }}
      >
        <Form form={followUpForm} layout="vertical">
          <Form.Item label="跟进类型" field="type" rules={[{ required: true, message: '请选择跟进类型' }]}>
            <Select placeholder="请选择跟进类型">
              {Object.entries(FOLLOW_UP_TYPES).map(([key, meta]) => (
                <Select.Option key={key} value={key}>{meta.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="跟进标题" field="title">
            <Input placeholder="如：CRM 首页设计确认" />
          </Form.Item>
          <Form.Item label="跟进内容" field="content" rules={[{ required: true, message: '请输入跟进内容' }]}>
            <Input.TextArea rows={3} placeholder="描述本次跟进的内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
