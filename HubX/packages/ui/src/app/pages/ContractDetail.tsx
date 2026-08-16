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
  InputNumber,
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
import {
  SUPPLEMENT_STATUS_LABELS,
  SUPPLEMENT_STATUS_COLORS,
  type ContractVersion,
  type SupplementaryAgreement,
  type SupplementaryAgreementStatus,
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
  const { getById } = useContracts();

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

  // 补充协议
  const [supplements, setSupplements] = useState<SupplementaryAgreement[]>(contract.supplementaryAgreements ?? []);
  const [supplementModalVisible, setSupplementModalVisible] = useState(false);
  const [supplementForm] = Form.useForm();

  const handleAddSupplement = () => {
    supplementForm.validate().then((values) => {
      const amountChange = Number(values.amountChange) || 0;
      const now = new Date();
      const newSupplement: SupplementaryAgreement = {
        id: `sup-${Date.now()}`,
        contractId: contract.id,
        name: values.name || '补充协议',
        amountChange,
        signDate: values.signDate || now.toISOString().slice(0, 10),
        status: 'draft',
        approvalFlow: [
          { step: '发起申请', approver: contract.createdBy || '张三', status: 'approved', time: now.toISOString().slice(0, 16).replace('T', ' '), comment: '' },
          { step: '总经理审批', approver: '赵总 - 总经理', status: 'pending', time: '', comment: '' },
        ],
        paymentPlans: [],
        scanFiles: [],
        receivedAmount: 0,
        createdAt: now.toISOString().slice(0, 10),
        createdBy: contract.createdBy || '张三',
      };
      setSupplements((current) => [...current, newSupplement]);
      setSupplementModalVisible(false);
      supplementForm.resetFields();
    });
  };

  const updateSupplementStatus = (supId: string, status: SupplementaryAgreementStatus) => {
    setSupplements((current) => current.map((s) => (s.id === supId ? { ...s, status } : s)));
  };

  // 回款登记
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentSupplementId, setPaymentSupplementId] = useState<string>('');
  const [paymentForm] = Form.useForm();

  const handleRegisterPayment = () => {
    paymentForm.validate().then((values) => {
      const amount = Number(values.amount) || 0;
      const today = new Date().toISOString().slice(0, 10);
      setSupplements((current) => current.map((s) => {
        if (s.id !== paymentSupplementId) return s;
        return {
          ...s,
          receivedAmount: (s.receivedAmount ?? 0) + amount,
          collectionRecords: [
            ...(s.collectionRecords ?? []),
            { id: `cr-${Date.now()}`, contractId: s.contractId, amount, date: values.date || today, method: values.method || '银行转账', note: values.note || '' },
          ],
        };
      }));
      setPaymentModalVisible(false);
      paymentForm.resetFields();
    });
  };

  // 文件上传（mock：记录文件名）
  const handleUploadBodyFile = (supId: string, fileName: string) => {
    setSupplements((current) => current.map((s) => (s.id === supId ? { ...s, bodyFile: { name: fileName, size: '-' } } : s)));
  };

  const handleUploadScanFile = (supId: string, fileName: string) => {
    setSupplements((current) => current.map((s) => (s.id === supId ? {
      ...s,
      scanFiles: [...s.scanFiles, { id: `sf-${Date.now()}`, fileName, fileSize: 0, mimeType: '', uploadedAt: new Date().toISOString().slice(0, 10), uploadedBy: contract.createdBy || '张三' }],
    } : s)));
  };

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

  // 金额动态计算：只计入「已归档」的补充协议（状态互斥，已归档即非作废）
  const activeSupplements = supplements.filter((s) => s.status === 'archived');
  const supplementAmount = activeSupplements.reduce((sum, s) => sum + s.amountChange, 0);
  const supplementReceived = activeSupplements.reduce((sum, s) => sum + (s.receivedAmount ?? 0), 0);

  const totalAmount = cd.totalAmount + supplementAmount;
  const receivedAmount = (contract.receivedAmount ?? 0) + supplementReceived;
  const receivableAmount = Math.max(0, totalAmount - receivedAmount);
  const collectionRate = totalAmount > 0 ? Math.round((receivedAmount / totalAmount) * 100) : 0;

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

            {supplements.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Text bold style={{ display: 'block', marginBottom: 8 }}>补充协议</Text>
                <Table
                  columns={[
                    { title: '协议名称', dataIndex: 'name' },
                    {
                      title: '变更金额',
                      dataIndex: 'amountChange',
                      width: 130,
                      render: (v: number) => (
                        <span style={{ color: v >= 0 ? 'var(--destructive-500)' : 'var(--success-500)', fontWeight: 600 }}>
                          {v >= 0 ? '+' : ''}{formatMoney(v)}
                        </span>
                      ),
                    },
                    { title: '签订日期', dataIndex: 'signDate', width: 120 },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      width: 90,
                      render: (v: SupplementaryAgreementStatus) => (
                        <Tag color={SUPPLEMENT_STATUS_COLORS[v]} size="small">{SUPPLEMENT_STATUS_LABELS[v]}</Tag>
                      ),
                    },
                    { title: '已回款', dataIndex: 'receivedAmount', width: 120, render: (v: number) => formatMoney(v) },
                    {
                      title: '回款进度',
                      width: 160,
                      render: (_: unknown, record: SupplementaryAgreement) => {
                        const rate = record.amountChange > 0
                          ? Math.round(((record.receivedAmount ?? 0) / record.amountChange) * 100)
                          : 0;
                        return <Progress percent={rate} size="small" />;
                      },
                    },
                    {
                      title: '操作',
                      width: 190,
                      render: (_: unknown, record: SupplementaryAgreement) => (
                        <Space size={0}>
                          {record.status === 'draft' && (
                            <Button type="text" size="mini" onClick={() => updateSupplementStatus(record.id, 'approving')}>提交审批</Button>
                          )}
                          {record.status === 'approving' && (
                            <Button type="text" size="mini" onClick={() => updateSupplementStatus(record.id, 'approved')}>审批通过</Button>
                          )}
                          {record.status === 'approved' && (
                            <Button type="text" size="mini" onClick={() => updateSupplementStatus(record.id, 'archived')}>归档</Button>
                          )}
                          {record.status !== 'voided' && (
                            <Button type="text" size="mini" status="danger" onClick={() => updateSupplementStatus(record.id, 'voided')}>作废</Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                  data={supplements}
                  rowKey="id"
                  pagination={false}
                />
              </div>
            )}
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
              <TabPane key="supplement" title="补充">
                <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                  {supplements.length === 0 ? (
                    <Text type="secondary">暂无补充协议，可上传需求变更导致的合同额增减协议。</Text>
                  ) : (
                    supplements.map((sup) => (
                      <div key={sup.id} style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: 12 }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text bold>{sup.name}</Text>
                            <Tag color={SUPPLEMENT_STATUS_COLORS[sup.status]} size="small">{SUPPLEMENT_STATUS_LABELS[sup.status]}</Tag>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{sup.signDate}</Text>
                          <Text style={{ color: sup.amountChange >= 0 ? 'var(--destructive-500)' : 'var(--success-500)', fontWeight: 600 }}>
                            {sup.amountChange >= 0 ? '+' : ''}{formatMoney(sup.amountChange)}
                          </Text>
                          <Space size={0}>
                            {sup.status === 'draft' && (
                              <Button type="text" size="mini" onClick={() => updateSupplementStatus(sup.id, 'approving')}>提交审批</Button>
                            )}
                            {sup.status === 'approving' && (
                              <Button type="text" size="mini" onClick={() => updateSupplementStatus(sup.id, 'approved')}>审批通过</Button>
                            )}
                            {sup.status === 'approved' && (
                              <Button type="text" size="mini" onClick={() => updateSupplementStatus(sup.id, 'archived')}>归档</Button>
                            )}
                            {sup.status !== 'voided' && (
                              <Button type="text" size="mini" status="danger" onClick={() => updateSupplementStatus(sup.id, 'voided')}>作废</Button>
                            )}
                          </Space>
                          <Space size={0} wrap>
                            <Button
                              type="text"
                              size="mini"
                              onClick={() => { setPaymentSupplementId(sup.id); setPaymentModalVisible(true); }}
                            >
                              登记回款
                            </Button>
                            <Upload autoUpload={false} showUploadList={false} onChange={(_, file) => { if (file?.name) handleUploadBodyFile(sup.id, file.name); }}>
                              <Button type="text" size="mini" icon={<IconUpload />}>上传正文</Button>
                            </Upload>
                            <Upload autoUpload={false} showUploadList={false} onChange={(_, file) => { if (file?.name) handleUploadScanFile(sup.id, file.name); }}>
                              <Button type="text" size="mini" icon={<IconUpload />}>上传扫描件</Button>
                            </Upload>
                          </Space>
                          {(sup.bodyFile || sup.scanFiles.length > 0) && (
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              {sup.bodyFile && <Text type="secondary" style={{ fontSize: 12 }}>正文：{sup.bodyFile.name}</Text>}
                              {sup.scanFiles.length > 0 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>扫描件：{sup.scanFiles.map((f) => f.fileName).join('、')}</Text>
                              )}
                            </Space>
                          )}
                        </Space>
                      </div>
                    ))
                  )}
                  <Button type="outline" icon={<IconUpload />} long onClick={() => setSupplementModalVisible(true)}>
                    上传补充协议
                  </Button>
                </Space>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* 补充协议弹窗 */}
      <Modal
        title="上传补充协议"
        visible={supplementModalVisible}
        onCancel={() => setSupplementModalVisible(false)}
        onOk={handleAddSupplement}
        maskClosable={false}
        style={{ width: 480 }}
      >
        <Form form={supplementForm} layout="vertical">
          <Form.Item label="协议名称" field="name" rules={[{ required: true, message: '请输入协议名称' }]}>
            <Input placeholder="如：补充协议一（需求变更增额）" />
          </Form.Item>
          <Form.Item label="变更金额（正数增额、负数减额）" field="amountChange" rules={[{ required: true, message: '请输入变更金额' }]}>
            <Input placeholder="如：50000 或 -20000" />
          </Form.Item>
          <Form.Item label="签订日期" field="signDate">
            <Input placeholder="如：2026-05-10" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 回款登记弹窗 */}
      <Modal
        title="登记回款"
        visible={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handleRegisterPayment}
        maskClosable={false}
        style={{ width: 420 }}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item label="回款金额" field="amount" rules={[{ required: true, message: '请输入回款金额' }]}>
            <Input placeholder="如：50000" />
          </Form.Item>
          <Form.Item label="回款日期" field="date">
            <Input placeholder="如：2026-06-20" />
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
