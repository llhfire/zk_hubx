import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Card, Descriptions, Drawer, Input, Message, Modal, Radio, Result, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { IconLeft, IconHistory, IconUser } from '@arco-design/web-react/icon';
import { useQuotation } from './QuotationContext';
import { QuoteTimeline } from './components/QuoteTimeline';
import { Stage1FeatureList } from './stages/Stage1FeatureList';
import { Stage2EvalSheet } from './stages/Stage2EvalSheet';
import { Stage3WebAutomation } from './stages/Stage3WebAutomation';
import { Stage4Approval } from './stages/Stage4Approval';
import { canDeleteQuote, canViewQuote } from './quoteAccess';
import { canTransition } from '@/services/quotationMutations';
import {
  QUOTE_STAGE_NAMES,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from './types';
import type { Quote, QuoteStage } from './types';
import { computeAmountBreakdown, deriveStage, getPendingOwner, getStageAccess, isTerminalStatus } from './quoteFlow';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '@/app/components/ui';
import { useEmployee } from '@/app/pages/employee/EmployeeContext';
import { FileFlowWorkbench } from './components/FileFlowWorkbench';
import './quotationWorkbench.css';

const { Text } = Typography;

const STAGES: QuoteStage[] = [1, 2, 3, 4];

function money(value: number): string {
  return value > 0
    ? `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
    : '—';
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
  const handleBack = onClose ?? (() => navigate('/quotation'));
  const quote = quoteId ? getQuoteById(quoteId) : undefined;
  const [viewedStage, setViewedStage] = useState<QuoteStage | null>(null);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [voidVisible, setVoidVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [reassignVisible, setReassignVisible] = useState(false);
  const [reassignField, setReassignField] = useState<'salesOwnerName' | 'techEvaluatorName'>('salesOwnerName');
  const [reassignValue, setReassignValue] = useState('');
  const [customerVisible, setCustomerVisible] = useState(false);

  const currentStage = useMemo(() => (quote ? deriveStage(quote.status) : 1), [quote]);
  const stage = viewedStage ?? currentStage;
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
        steps={STAGES.map((s) => ({ key: String(s), title: QUOTE_STAGE_NAMES[s] }))}
        currentStep={currentStage - 1}
      />

      <ProcessMetricGrid
        items={[
          { key: 'customer', label: '客户', value: quote.basicInfo.customerName || '—' },
          { key: 'stage', label: '当前阶段', value: QUOTE_STAGE_NAMES[currentStage] },
          { key: 'amount', label: '总报价', value: money(amountBreakdown.grandTotal), tone: amountBreakdown.grandTotal > 0 ? 'success' : 'neutral' },
          { key: 'days', label: '评估人天', value: amountBreakdown.totalLaborDays > 0 ? `${amountBreakdown.totalLaborDays} 人天` : '—' },
          { key: 'owner', label: '当前待办人', value: getPendingOwner(quote), tone: isTerminalStatus(quote.status) ? 'success' : 'warning' },
          { key: 'validity', label: '报价有效期', value: `${quote.basicInfo.quoteValidityDays} 天` },
        ]}
      />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <Card size="small" className="quotation-workbench__stage-switcher">
            <div className="quotation-workbench__stage-switcher-head">
              <div>
                <Text bold>工作阶段</Text>
                <Text type="secondary">已完成阶段可回看，未到达阶段不可进入</Text>
              </div>
              <Tag color={stage === currentStage ? 'arcoblue' : 'gray'}>
                {stage === currentStage ? '当前处理' : '历史回看'}
              </Tag>
            </div>
            <Radio.Group
              type="button"
              className="hubx-horizontal-rail"
              value={stage}
              onChange={(value) => setViewedStage(Number(value) as QuoteStage)}
            >
              {STAGES.map((item) => (
                <Radio key={item} value={item} disabled={item > currentStage}>
                  {item}. {QUOTE_STAGE_NAMES[item]}
                </Radio>
              ))}
            </Radio.Group>
          </Card>

          {access === 'readonly' && stage < currentStage && (
            <Alert
              type="info"
              content={`当前为历史阶段回看，内容只读。如需继续处理，请切换到阶段 ${currentStage}。`}
            />
          )}
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
          <Card title="当前协作" size="small">
            <Descriptions
              column={1}
              data={[
                { label: '处理状态', value: <Tag color={access === 'editable' ? 'green' : 'gray'}>{access === 'editable' ? '可编辑' : '只读'}</Tag> },
                { label: '产品经理', value: quote.basicInfo.creatorName || '—' },
                { label: '技术评估', value: quote.basicInfo.techEvaluatorName || '—' },
                { label: '销售负责人', value: quote.salesOwnerName || '—' },
                { label: '当前待办', value: getPendingOwner(quote) },
              ]}
            />
          </Card>

          <Card title="关联信息" size="small">
            <Descriptions
              column={1}
              data={[
                { label: '线索 ID', value: quote.leadId || '—' },
                { label: '合同 ID', value: quote.generatedContractId || quote.contractId || '尚未生成' },
                { label: '客户联系人', value: quote.basicInfo.customerContact || '—' },
                { label: '联系电话', value: quote.basicInfo.customerPhone || '—' },
                { label: '创建时间', value: quote.createdAt || '—' },
                { label: '最近更新', value: quote.updatedAt || '—' },
              ]}
            />
            <Space wrap className="quotation-workbench__related-actions">
              <Button size="small" onClick={() => navigate(`/leads/${quote.leadId}`)}>查看线索</Button>
              {(quote.generatedContractId || quote.contractId) && (
                <Button size="small" onClick={() => navigate(`/contracts/${quote.generatedContractId || quote.contractId}`)}>查看合同</Button>
              )}
              <Button size="small" type="text" onClick={() => setCustomerVisible(true)}>客户详情</Button>
            </Space>
          </Card>
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
      <Drawer title="客户详情" width={520} visible={customerVisible} onCancel={() => setCustomerVisible(false)} footer={null}>
        <Card title={quote.basicInfo.customerName || '未关联客户'}>
          <Space direction="vertical"><Text>联系人：{quote.basicInfo.customerContact || '—'}</Text><Text>联系电话：{quote.basicInfo.customerPhone || '—'}</Text><Text type="secondary">在报价工作台中保持当前上下文，可关闭抽屉继续处理。</Text></Space>
        </Card>
      </Drawer>
    </PageShell>
  );
}
