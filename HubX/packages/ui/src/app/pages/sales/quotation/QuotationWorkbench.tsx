import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AsyncState,
  Button,
  Drawer,
  Input,
  Message,
  Modal,
  Result,
  Space,
  Typography,
  UserPicker,
} from '@/design-system';
import { IconCheck, IconClose, IconLeft, IconHistory, IconUser } from '@/design-system';
import { useQuotation } from './QuotationContext';
import { QuoteTimeline } from './components/QuoteTimeline';
import { Stage1FeatureList } from './stages/Stage1FeatureList';
import { Stage2EvalSheet } from './stages/Stage2EvalSheet';
import { Stage3WebAutomation } from './stages/Stage3WebAutomation';
import { Stage4Approval } from './stages/Stage4Approval';
import { canDeleteQuote, canViewQuote } from './quoteAccess';
import { canTransition } from '../../../../services/quotationMutations';
import {
  QUOTE_FLOW_STAGE_NAMES,
  QUOTE_STATUS,
} from './types';
import type { Quote, QuoteStage } from './types';
import { computeAmountBreakdown, deriveStage, getPendingOwner, getStageAccess, isTerminalStatus } from './quoteFlow';
import {
  AlertBanner,
  ConfirmModal,
  EntityLink,
  IdentifierText,
  MoneyText,
  PageShell,
  ProcessOverview,
  SectionCard,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
  confirmAction,
  resolveStatus,
  type StatusMap,
} from '@/design-system';
import { useEmployee } from '../../support/hr/employee/EmployeeContext';
import { FileFlowWorkbench } from './components/FileFlowWorkbench';
import { ScanUpload } from './components/ScanUpload';
import { useTodos } from '../../../todos/TodoContext';
import './quotationWorkbench.css';

const { Text } = Typography;

const STAGES: QuoteStage[] = [1, 2, 3, 4];

/** 会签节点、盖章节点、成交闭环节点的状态映射，统一走 StatusTag。 */
const AUDIT_STATUS: StatusMap<string> = {
  APPROVED: { label: '已通过', tone: 'success' },
  REJECTED: { label: '已驳回', tone: 'danger' },
  PENDING: { label: '待审批', tone: 'neutral' },
};

const STAMP_STATUS: StatusMap<string> = {
  COMPLETED: { label: '已盖章', tone: 'success' },
  PENDING_STAMP: { label: '待盖章', tone: 'warning' },
  NOT_REACHED: { label: '未到盖章环节', tone: 'neutral' },
};

const CLOSED_STATUS: StatusMap<string> = {
  confirmed: { label: '已成交', tone: 'success' },
  sent: { label: '已发送客户', tone: 'info' },
  voided: { label: '已废止', tone: 'danger' },
  pending: { label: '待达成', tone: 'neutral' },
};

function ApprovalProcessPanel({
  quote,
  currentStage,
}: {
  quote: Quote;
  currentStage: QuoteStage;
}) {
  const { currentRole } = useQuotation();
  const myAuditNode = quote.auditNodes.find((node) => node.quoteRole === currentRole);
  const isStamper = currentRole === (quote.stampNode.stamperRole ?? 'assistant') || quote.stampNode.stamperName === currentRole;

  // 关键：只有当前用户节点处于待审 (PENDING) 时才提示；确认通过或驳回后，提示立即消失！
  const isPendingMyAudit = Boolean(
    myAuditNode &&
    myAuditNode.status === 'PENDING' &&
    quote.status === 'auditing'
  );
  // 关键：只有当前用户是印管且确实待盖章时才提示；盖章完成后，提示立即消失！
  const isPendingMyStamp = Boolean(
    isStamper &&
    quote.status === 'pending_stamp' &&
    quote.stampNode.status === 'PENDING_STAMP'
  );

  return (
    <SectionCard title="审批流程">
      <div className="quotation-approval-status">
        <Text type="secondary">当前状态</Text>
        <StatusTag meta={resolveStatus(QUOTE_STATUS, quote.status)} />
      </div>

      {/* 阶段指示与引导提示 */}
      {currentStage < 4 ? (
        <AlertBanner tone="info">
          前置商务配置阶段 · 提交后正式激活下方会签流转
        </AlertBanner>
      ) : (isPendingMyAudit || isPendingMyStamp) ? (
        <AlertBanner tone="info">
          👉 当前等待您处理，请在主工作区公函上方执行审批/盖章决策
        </AlertBanner>
      ) : null}

      {/* 会签审批节点列表（只读全景时间线） */}
      <div className="quotation-approval-flow">
        {quote.auditNodes.length > 0 ? quote.auditNodes.map((node, index) => {
          const isApproved = node.status === 'APPROVED';
          const isRejected = node.status === 'REJECTED';
          return (
            <div className="quotation-approval-node" key={`${node.auditorId || node.auditorName}-${index}`}>
              <span className={`quotation-approval-node__marker ${isApproved ? 'approved' : isRejected ? 'rejected' : ''}`}>
                {index + 1}
              </span>
              <div className="quotation-approval-node__body">
                <div className="quotation-approval-node__head">
                  <Text bold>{node.auditorName}</Text>
                  <StatusTag meta={resolveStatus(AUDIT_STATUS, node.status)} />
                </div>
                <span className="quotation-approval-node__meta">{node.role}</span>
                {node.comment && <span className="quotation-approval-node__comment">{node.comment}</span>}
                {node.auditTime && (
                  <span style={{ fontSize: 'var(--ds-text-micro)', color: 'var(--color-text-4)' }}>批复于 {node.auditTime}</span>
                )}
              </div>
            </div>
          );
        }) : (
          <Text type="secondary">提交审批后生成审批节点</Text>
        )}

        {/* 盖章节点（只读全景展示，区分电子公章与线下实体章扫描件） */}
        <div className="quotation-approval-node">
          <span className={`quotation-approval-node__marker ${quote.stampNode.status === 'COMPLETED' ? 'approved' : ''}`}>
            印
          </span>
          <div className="quotation-approval-node__body">
            <div className="quotation-approval-node__head">
              <Text bold>{quote.stampNode.stamperName || '公章管理员'}</Text>
              <StatusTag meta={resolveStatus(STAMP_STATUS, quote.stampNode.status, '未到盖章环节')} />
            </div>
            <span className="quotation-approval-node__meta">
              {quote.stampNode.status === 'COMPLETED'
                ? (quote.fileFlow?.scans && quote.fileFlow.scans.length > 0
                    ? `线下实体章扫描件归档 (${quote.fileFlow.scans.length}份)`
                    : '系统防伪电子公章')
                : '企业公章加盖'}
            </span>
            {quote.stampNode.stampTime && (
              <span style={{ fontSize: 'var(--ds-text-micro)', color: 'var(--color-text-4)' }}>加盖于 {quote.stampNode.stampTime}</span>
            )}
          </div>
        </div>

        {/* 商务成交闭环节点（只读全景展示） */}
        <div className="quotation-approval-node">
          <span className={`quotation-approval-node__marker ${quote.status === 'confirmed' ? 'approved' : quote.status === 'voided' ? 'rejected' : ''}`}>
            终
          </span>
          <div className="quotation-approval-node__body">
            <div className="quotation-approval-node__head">
              <Text bold>客户成交闭环</Text>
              <StatusTag
                meta={resolveStatus(
                  CLOSED_STATUS,
                  quote.status === 'confirmed' || quote.status === 'sent' || quote.status === 'voided' ? quote.status : 'pending',
                )}
              />
            </div>
            <span className="quotation-approval-node__meta">
              {quote.status === 'confirmed' ? '已确认成交并关联合同' : quote.sentAt ? `发送于 ${quote.sentAt}` : '商务流转终点'}
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
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
    {
      label: '客户',
      value: (
        <EntityLink
          to={quote.customerId ? `/customers/${quote.customerId}` : undefined}
          disabled={!quote.customerId}
        >
          {quote.basicInfo.customerName || '—'}
        </EntityLink>
      ),
    },
    { label: '当前阶段', value: flowStageNames[currentStage] },
    { label: '总报价', value: <MoneyText value={amountBreakdown.grandTotal > 0 ? amountBreakdown.grandTotal : null} /> },
    { label: '评估人天', value: amountBreakdown.totalLaborDays > 0 ? `${amountBreakdown.totalLaborDays} 人天` : '—' },
    { label: '当前待办人', value: getPendingOwner(quote) },
    { label: '报价有效期', value: `${quote.basicInfo.quoteValidityDays} 天` },
  ];

  return (
    <SectionCard title="报价动态">
      <div className="quotation-workbench__dynamic-list">
        {items.map((item) => (
          <div className="quotation-workbench__dynamic-item" key={item.label}>
            <Text type="secondary">{item.label}</Text>
            <Text bold>{item.value}</Text>
          </div>
        ))}
      </div>
      <AlertBanner tone="info">
        {currentStage === 1 && '💡 第 1 步：拆解功能需求，完成后交架构师评估'}
        {currentStage === 2 && '💡 第 2 步：评估角色人天与工期，完成后交销售配置'}
        {currentStage === 3 && '💡 第 3 步：配置增项与价格方案，完成后提交审批'}
        {currentStage === 4 && '💡 第 4 步：会签审批与加盖公章，完成客户签约'}
      </AlertBanner>
    </SectionCard>
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
  const contextQuote = quoteId ? getQuoteById(quoteId) : undefined;
  const storageQuote = useMemo(() => {
    if (contextQuote) return contextQuote;
    if (!quoteId) return undefined;
    try {
      const raw = window.localStorage.getItem('hubx-quotation-quotes-v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.find((item) => item.id === quoteId);
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }, [contextQuote, quoteId]);
  const quote = contextQuote || storageQuote;
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [reassignVisible, setReassignVisible] = useState(false);
  const [reassignField, setReassignField] = useState<'salesOwnerName' | 'techEvaluatorName'>('salesOwnerName');
  const [reassignValue, setReassignValue] = useState<string | undefined>();
  const userPickerOptions = useMemo(
    () => employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      jobNumber: employee.jobNumber,
      department: employee.department,
    })),
    [employees],
  );

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
    const selectedEmployee = employees.find((employee) => employee.id === reassignValue);
    if (!selectedEmployee) { Message.warning('请选择目标人员'); return; }
    // 报价旧服务仍以姓名字段落库；选择器和待办先统一保存稳定 employee.id，
    // 仅在这个兼容边界转换为姓名，待报价模型完成 ID 迁移后可直接透传。
    await reassignOwner(quote.id, reassignField, selectedEmployee.name);
    activeTodos
      .filter((todo) => todo.source === 'quotation' && todo.sourceId === quote.id)
      .forEach((todo) => updateTodo(todo.id, { assigneeId: selectedEmployee.id, assigneeName: selectedEmployee.name }));
    setReassignVisible(false);
    setReassignValue(undefined);
    Message.success(`已改指${reassignField === 'salesOwnerName' ? '销售' : '评估人'}为 ${selectedEmployee.name}`);
  };

  const handleDelete = () => {
    if (!quote) return;
    confirmAction({
      title: '删除草稿报价',
      content: '该报价从未提交，可直接删除。删除后无法恢复，是否继续？',
      okText: '确认删除',
      tone: 'danger',
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
        <div className="quotation-workbench__state">
          <AsyncState status="loading" loadingText="报价单加载中…" />
        </div>
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

  if (!embedded && !canViewQuote(quote, currentViewer, isAdmin)) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <div className="quotation-workbench__state">
          <AsyncState status="forbidden" forbiddenText="您没有权限查看此报价单" />
          <Button type="primary" onClick={handleBack}>返回报价中心</Button>
        </div>
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

  const stepsConfig = useMemo(() => {
    return STAGES.map((s) => {
      let desc: string | undefined;
      if (s === 1) {
        desc = '功能拆解与范围定义';
      } else if (s === 2) {
        desc = '研发角色人天评估';
      } else if (s === 3) {
        desc = '商务增项与阶梯定价';
      } else if (s === 4) {
        if (quote.status === 'auditing') desc = '会签审批中';
        else if (quote.status === 'pending_stamp') desc = '待加盖企业公章';
        else if (quote.status === 'stamped') desc = '已盖章 · 待发客';
        else if (quote.status === 'sent') desc = '已发出 · 跟进成交';
        else if (quote.status === 'confirmed') desc = '客户成交 · 闭环';
        else if (quote.status === 'rejected') desc = '已驳回 · 待修改';
        else if (quote.status === 'voided') desc = '已作废';
        else desc = '正式公函与流转闭环';
      }
      return {
        key: String(s),
        title: flowStageNames[s],
        description: desc,
      };
    });
  }, [quote.status, flowStageNames]);

  return (
    <PageShell breadcrumbs={breadcrumbs} className={embedded ? 'quotation-workbench--embedded' : undefined}>
      {leadFrozen && (
        <AlertBanner tone="warning">
          关联线索已终止：当前内容仍可查看和修改，但提交、审批通过、盖章、发送、成交及作废等前进动作已冻结。恢复线索后自动解冻。
        </AlertBanner>
      )}

      <ProcessOverview
        identifier={<IdentifierText value={quote.quoteNo} />}
        title={quote.basicInfo.projectName}
        tags={<><StatusTag tone={quote.flowMode === 'file' ? 'purple' : 'info'}>{quote.flowMode === 'file' ? '文件流转' : '数据流转'}</StatusTag><StatusTag>{quote.version}</StatusTag><StatusTag meta={resolveStatus(QUOTE_STATUS, quote.status)} /></>}
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
        steps={stepsConfig}
        currentStep={currentStage - 1}
      />

      <SplitLayout>
        <SplitLayoutMain>
          {access === 'readonly' && stage === currentStage && currentRole !== 'assistant' && (
            <AlertBanner tone="info">
              <IconUser /> 当前阶段由其他角色处理，你为只读视角。请在顶栏切换当前身份以处理对应环节。
            </AlertBanner>
          )}

          {quote.flowMode === 'file' ? (
            <FileFlowWorkbench quote={quote} stage={stage} readonly={access !== 'editable'} />
          ) : renderStage()}

          <ActionBar quote={quote} />
        </SplitLayoutMain>

        <SplitLayoutAside className="quotation-workbench__aside">
          <QuoteDynamicPanel
            quote={quote}
            currentStage={currentStage}
            flowStageNames={flowStageNames}
            amountBreakdown={amountBreakdown}
          />
          <ApprovalProcessPanel quote={quote} currentStage={currentStage} />
        </SplitLayoutAside>
      </SplitLayout>

      <Drawer
        title="流转轨迹"
        visible={timelineVisible}
        onCancel={() => setTimelineVisible(false)}
        footer={null}
        width={460}
      >
        <QuoteTimeline quote={quote} />
      </Drawer>

      <ConfirmModal
        title="作废报价单"
        visible={voidVisible}
        onOk={handleVoid}
        onCancel={() => setVoidVisible(false)}
        okText="确认作废"
        tone="danger"
        content={(
          <>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">作废后该报价单将不再参与后续流程，历史版本保留不可删除。</Text>
            </div>
            <Input.TextArea
              rows={3}
              placeholder="请填写作废原因（必填）"
              value={voidReason}
              onChange={setVoidReason}
            />
          </>
        )}
      />

      <Modal
        title="改指负责人"
        visible={reassignVisible}
        onOk={handleReassign}
        onCancel={() => { setReassignVisible(false); setReassignValue(undefined); }}
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
            <UserPicker
              placeholder="输入姓名、工号或部门搜索系统用户"
              value={reassignValue}
              onChange={setReassignValue}
              allowClear
              options={userPickerOptions}
            />
          </div>
        </Space>
      </Modal>
    </PageShell>
  );
}
