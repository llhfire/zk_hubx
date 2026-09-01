import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Card, Drawer, Input, Message, Modal, Radio, Result, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { IconCheck, IconClose, IconLeft, IconHistory, IconUser } from '@arco-design/web-react/icon';
import { useQuotation } from './QuotationContext';
import { QuoteTimeline } from './components/QuoteTimeline';
import { Stage1FeatureList } from './stages/Stage1FeatureList';
import { Stage2EvalSheet } from './stages/Stage2EvalSheet';
import { Stage3WebAutomation } from './stages/Stage3WebAutomation';
import { Stage4Approval } from './stages/Stage4Approval';
import { canDeleteQuote, canViewQuote } from './quoteAccess';
import { canTransition } from '@/services/quotationMutations';
import {
  QUOTE_FLOW_STAGE_NAMES,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from './types';
import type { Quote, QuoteStage } from './types';
import { computeAmountBreakdown, deriveStage, getPendingOwner, getStageAccess, isTerminalStatus } from './quoteFlow';
import {
  PageShell,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '@/app/components/ui';
import { useEmployee } from '@/app/pages/employee/EmployeeContext';
import { FileFlowWorkbench } from './components/FileFlowWorkbench';
import { ScanUpload } from './components/ScanUpload';
import { useTodos } from '@/app/todos/TodoContext';
import './quotationWorkbench.css';

const { Text } = Typography;

const STAGES: QuoteStage[] = [1, 2, 3, 4];

function money(value: number): string {
  return value > 0
    ? `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
    : '—';
}

function ApprovalProcessPanel({ quote, readonly, leadFrozen }: { quote: Quote; readonly: boolean; leadFrozen: boolean }) {
  const { currentRole, decideAudit, stampQuote, updateQuote } = useQuotation();
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [documentSource, setDocumentSource] = useState<'generated' | 'scan'>('generated');
  const auditor = quote.auditNodes.find((node) => node.quoteRole === currentRole)?.auditorName ?? null;
  const isStamper = currentRole === (quote.stampNode.stamperRole ?? 'assistant');
  const state = quote.fileFlow ?? { onlineDocument: { status: 'empty' as const }, scans: [] };
  const auditLabel = (status: string) => status === 'APPROVED' ? '已通过' : status === 'REJECTED' ? '已驳回' : '待审批';
  const auditColor = (status: string) => status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'gray';
  const stampLabel = quote.stampNode.status === 'COMPLETED'
    ? '已盖章'
    : quote.stampNode.status === 'PENDING_STAMP' ? '待盖章' : '未到盖章环节';
  const stampColor = quote.stampNode.status === 'COMPLETED'
    ? 'green'
    : quote.stampNode.status === 'PENDING_STAMP' ? 'orange' : 'gray';

  const handleApprove = () => {
    if (!auditor) return;
    decideAudit(quote.id, auditor, 'approve', '同意');
    Message.success('已审批通过');
  };

  const handleReject = () => {
    if (!auditor) return;
    if (!rejectComment.trim()) { Message.warning('驳回意见为必填项'); return; }
    decideAudit(quote.id, auditor, 'reject', rejectComment.trim());
    setRejectVisible(false);
    setRejectComment('');
    Message.success('已驳回，退回销售修改，三人会签将重审');
  };

  const handleStamp = () => {
    stampQuote(quote.id);
    Message.success('已加盖公章，可下载正式 PDF 报价单');
  };

  const handleScansChange = (scans: NonNullable<NonNullable<Quote['fileFlow']>['scans']>) => {
    updateQuote(quote.id, (current) => ({
      ...current,
      fileFlow: {
        ...(current.fileFlow ?? { onlineDocument: { status: 'empty' as const }, scans: [] }),
        scans,
      },
    }));
  };

  return (
    <Card title="审批流程" size="small">
      <div className="quotation-approval-status">
        <Text type="secondary">当前状态</Text>
        <Tag color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
      </div>
      <div className="quotation-approval-flow">
        {quote.auditNodes.length > 0 ? quote.auditNodes.map((node, index) => (
          <div className="quotation-approval-node" key={`${node.auditorId}-${index}`}>
            <span className="quotation-approval-node__marker">{index + 1}</span>
            <div className="quotation-approval-node__body">
              <div className="quotation-approval-node__head">
                <Text bold>{node.auditorName}</Text>
                <Tag color={auditColor(node.status)} size="small">{auditLabel(node.status)}</Tag>
              </div>
              <span className="quotation-approval-node__meta">{node.role}</span>
              {node.comment && <span className="quotation-approval-node__comment">{node.comment}</span>}
            </div>
          </div>
        )) : (
          <Text type="secondary">提交审批后生成审批节点</Text>
        )}
      </div>
      {!readonly && auditor && quote.status === 'auditing' && (
        <div className="quotation-approval-actions">
          <Space>
            <Button type="primary" icon={<IconCheck />} disabled={leadFrozen} onClick={handleApprove}>同意并通过</Button>
            <Button status="danger" icon={<IconClose />} onClick={() => setRejectVisible((visible) => !visible)}>驳回报价</Button>
          </Space>
          {rejectVisible && (
            <div className="quotation-approval-reject">
              <Input.TextArea rows={2} placeholder="驳回意见（必填，将退回销售修改并全员重审）" value={rejectComment} onChange={setRejectComment} />
              <Button type="primary" status="danger" onClick={handleReject}>确认驳回</Button>
            </div>
          )}
        </div>
      )}
      <div className="quotation-stamp-panel">
        <div className="quotation-stamp-panel__head">
          <Text bold>盖章节点 · {quote.stampNode.stamperName || '盖章人'}</Text>
          <Tag color={stampColor}>{stampLabel}</Tag>
        </div>
        {quote.stampNode.stampTime && <Text type="secondary" className="quotation-approval-node__meta">盖章时间：{quote.stampNode.stampTime}</Text>}
        <Radio.Group value={documentSource} onChange={setDocumentSource} disabled={readonly || !isStamper || quote.status !== 'pending_stamp'}>
          <Radio value="generated">系统生成 PDF</Radio>
          <Radio value="scan">盖章扫描件</Radio>
        </Radio.Group>
        <ScanUpload quoteStatus={quote.status} scans={state.scans ?? []} onScansChange={handleScansChange} />
        {!readonly && isStamper && quote.status === 'pending_stamp' && (
          <Button type="primary" disabled={leadFrozen} onClick={handleStamp}>确认使用所选文件</Button>
        )}
      </div>
    </Card>
  );
}

function QuoteDynamicPanel({
  quote,
  currentStage,
  flowStageNames,
  amountBreakdown,
}: {
  quote: Quote;
  currentStage: QuoteStage;
  flowStageNames: Record<QuoteStage, string>;
  amountBreakdown: ReturnType<typeof computeAmountBreakdown>;
}) {
  const items = [
    { label: '客户', value: quote.basicInfo.customerName || '—' },
    { label: '当前阶段', value: flowStageNames[currentStage] },
    { label: '总报价', value: money(amountBreakdown.grandTotal) },
    { label: '评估人天', value: amountBreakdown.totalLaborDays > 0 ? `${amountBreakdown.totalLaborDays} 人天` : '—' },
    { label: '当前待办人', value: getPendingOwner(quote) },
    { label: '报价有效期', value: `${quote.basicInfo.quoteValidityDays} 天` },
  ];

  return (
    <Card title="报价动态" size="small">
      <div className="quotation-workbench__dynamic-list">
        {items.map((item) => (
          <div className="quotation-workbench__dynamic-item" key={item.label}>
            <Text type="secondary">{item.label}</Text>
            <Text bold>{item.value}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 工作台底部流转操作栏：按当前状态与角色动态出按钮。实际动作调用在各 Stage 内部。 */
function ActionBar({ quote }: { quote: Quote }) {
  // 各阶段组件内部已包含自己的流转按钮，这里仅作占位说明
  return null;
}

export function QuotationWorkbench({ embedded, quoteId: propQuoteId, onClose }: { embedded?: boolean; quoteId?: string; onClose?: () => void } = {}) {
  const { quoteId: urlQuoteId } = useParams();
  const quoteId = propQuoteId ?? urlQuoteId;
  const navigate = useNavigate();
  const {
    getQuoteById, currentRole, currentViewer, isAdmin, markVoided, reassignOwner,
    deleteQuote, createNewVersion, isLeadFrozen, loading,
  } = useQuotation();
  const { employees } = useEmployee();
  const { activeTodos, updateTodo } = useTodos();
  const handleBack = onClose ?? (() => navigate('/quotation'));
  const quote = quoteId ? getQuoteById(quoteId) : undefined;
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [reassignVisible, setReassignVisible] = useState(false);
  const [reassignField, setReassignField] = useState<'salesOwnerName' | 'techEvaluatorName'>('salesOwnerName');
  const [reassignValue, setReassignValue] = useState('');

  const flowMode = quote?.flowMode === 'file' ? 'file' : 'online';
  const flowStageNames = QUOTE_FLOW_STAGE_NAMES[flowMode];
  const currentStage = useMemo(() => (quote ? deriveStage(quote.status) : 1), [quote]);
  const stage = currentStage;
  const leadFrozen = quote ? isLeadFrozen(quote.id) : false;
  const breadcrumbs = embedded
    ? undefined
    : [
        { label: '报价管理', to: '/quotation' },
        { label: '报价中心', to: '/quotation' },
        { label: quote?.quoteNo ?? '报价工作台' },
      ];

  const handleVoid = () => {
    if (!quote) return;
    if (!voidReason.trim()) { Message.warning('请填写作废原因'); return; }
    markVoided(quote.id, voidReason.trim());
    setVoidVisible(false);
    setVoidReason('');
    Message.success('报价已废止');
    handleBack();
  };

  const handleReassign = async () => {
    if (!quote) return;
    if (!reassignValue.trim()) { Message.warning('请填写目标人员姓名'); return; }
    await reassignOwner(quote.id, reassignField, reassignValue.trim());
    activeTodos
      .filter((todo) => todo.source === 'quotation' && todo.sourceId === quote.id)
      .forEach((todo) => updateTodo(todo.id, { assigneeId: reassignValue.trim(), assigneeName: reassignValue.trim() }));
    setReassignVisible(false);
    setReassignValue('');
    Message.success(`已改指${reassignField === 'salesOwnerName' ? '销售' : '评估人'}为 ${reassignValue.trim()}`);
  };

  const handleDelete = () => {
    if (!quote) return;
    Modal.confirm({
      title: '删除草稿报价',
      content: '该报价从未提交，可直接删除。删除后无法恢复，是否继续？',
      okText: '确认删除',
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        await deleteQuote(quote.id);
        Message.success('草稿报价已删除');
        handleBack();
      },
    });
  };

  const handleNewVersion = async () => {
    if (!quote) return;
    const nextId = await createNewVersion(quote.id);
    if (nextId !== quote.id) {
      Message.success('新版本已创建，请重新确认功能清单');
      navigate(`/quotation/${nextId}`);
    }
  };

  if (loading) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <div className="quotation-workbench__state">报价单加载中…</div>
      </PageShell>
    );
  }

  if (!quote) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <Result
          status="404"
          title="报价单不存在"
          subTitle="该报价单可能已被删除或链接有误"
          extra={<Button type="primary" onClick={handleBack}>返回报价中心</Button>}
        />
      </PageShell>
    );
  }

  if (!canViewQuote(quote, currentViewer, isAdmin)) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <Result
          status="403"
          title="无权访问"
          subTitle="您没有权限查看此报价单"
          extra={<Button type="primary" onClick={handleBack}>返回报价中心</Button>}
        />
      </PageShell>
    );
  }

  const access = getStageAccess(quote, currentRole, stage);
  const amountBreakdown = computeAmountBreakdown(quote);

  const renderStage = () => {
    const props = { quote, readonly: access !== 'editable' };
    switch (stage) {
      case 1:
        return <Stage1FeatureList {...props} />;
      case 2:
        return <Stage2EvalSheet {...props} />;
      case 3:
        return <Stage3WebAutomation {...props} />;
      case 4:
        return <Stage4Approval {...props} />;
      default:
        return null;
    }
  };

  return (
    <PageShell breadcrumbs={breadcrumbs} className={embedded ? 'quotation-workbench--embedded' : undefined}>
      {leadFrozen && (
        <Alert
          type="warning"
          content="关联线索已终止：当前内容仍可查看和修改，但提交、审批通过、盖章、发送、成交及作废等前进动作已冻结。恢复线索后自动解冻。"
        />
      )}

      <ProcessOverview
        identifier={quote.quoteNo}
        title={quote.basicInfo.projectName}
        tags={<><Tag color={quote.flowMode === 'file' ? 'purple' : 'arcoblue'}>{quote.flowMode === 'file' ? '文件流转' : '数据流转'}</Tag><Tag>{quote.version}</Tag><Tag color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag></>}
        actions={(
          <Space wrap>
            {embedded && <Button size="small" icon={<IconLeft />} onClick={handleBack}>关闭工作台</Button>}
            <Button size="small" icon={<IconHistory />} onClick={() => setTimelineVisible(true)}>流转轨迹</Button>
            {!isTerminalStatus(quote.status) && (
              <Button size="small" onClick={() => setReassignVisible(true)}>改指</Button>
            )}
            {canTransition(quote.status, 'new_version') && (
              <Button size="small" onClick={handleNewVersion} disabled={leadFrozen}>创建新版本</Button>
            )}
            {canDeleteQuote(quote) && <Button type="text" size="small" status="danger" onClick={handleDelete}>删除草稿</Button>}
            {canTransition(quote.status, 'mark_voided') && (
              <Button type="text" size="small" status="danger" disabled={leadFrozen} onClick={() => setVoidVisible(true)}>作废</Button>
            )}
          </Space>
        )}
        steps={STAGES.map((s) => ({ key: String(s), title: flowStageNames[s] }))}
        currentStep={currentStage - 1}
      />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          {access === 'readonly' && stage === currentStage && currentRole !== 'assistant' && (
            <Alert
              type="info"
              icon={<IconUser />}
              content="当前阶段由其他角色处理，你为只读视角。请在顶栏切换当前身份以处理对应环节。"
            />
          )}

          {quote.flowMode === 'file' ? (
            <FileFlowWorkbench quote={quote} stage={stage} readonly={access !== 'editable'} />
          ) : renderStage()}

          <ActionBar quote={quote} />
        </ProcessWorkspaceMain>

        <ProcessWorkspaceAside>
          <QuoteDynamicPanel
            quote={quote}
            currentStage={currentStage}
            flowStageNames={flowStageNames}
            amountBreakdown={amountBreakdown}
          />
          <ApprovalProcessPanel quote={quote} readonly={access !== 'editable'} leadFrozen={leadFrozen} />
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

      <Drawer
        title="流转轨迹"
        visible={timelineVisible}
        onCancel={() => setTimelineVisible(false)}
        footer={null}
        width={460}
      >
        <QuoteTimeline quote={quote} />
      </Drawer>

      <Modal
        title="作废报价单"
        visible={voidVisible}
        onOk={handleVoid}
        onCancel={() => setVoidVisible(false)}
        okText="确认作废"
        okButtonProps={{ status: 'danger' }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">作废后该报价单将不再参与后续流程，历史版本保留不可删除。</Text>
        </div>
        <Input.TextArea
          rows={3}
          placeholder="请填写作废原因（必填）"
          value={voidReason}
          onChange={setVoidReason}
        />
      </Modal>

      <Modal
        title="改指负责人"
        visible={reassignVisible}
        onOk={handleReassign}
        onCancel={() => { setReassignVisible(false); setReassignValue(''); }}
        okText="确认改指"
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">改指后原负责人将不再收到该报价单的待办提醒。</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text bold style={{ display: 'block', marginBottom: 4 }}>改指类型</Text>
            <Space>
              <Button
                size="small"
                type={reassignField === 'salesOwnerName' ? 'primary' : 'outline'}
                onClick={() => setReassignField('salesOwnerName')}
              >销售</Button>
              <Button
                size="small"
                type={reassignField === 'techEvaluatorName' ? 'primary' : 'outline'}
                onClick={() => setReassignField('techEvaluatorName')}
              >评估人</Button>
            </Space>
          </div>
          <div>
            <Text bold style={{ display: 'block', marginBottom: 4 }}>目标人员</Text>
            <Select
              showSearch
              allowClear
              placeholder="输入姓名、工号或部门搜索系统用户"
              value={reassignValue}
              onChange={setReassignValue}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employees.map((employee) => ({ value: employee.name, label: `${employee.name} · ${employee.jobNumber} · ${employee.department}` }))}
            />
          </div>
        </Space>
      </Modal>
    </PageShell>
  );
}
