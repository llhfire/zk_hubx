import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  Message,
  Modal,
  Space,
  Tag,
  Tooltip,
  Upload,
} from '@arco-design/web-react';
import {
  IconDelete,
  IconDown,
  IconDownload,
  IconEdit,
  IconFile,
  IconPlus,
  IconQuestionCircle,
  IconRight,
  IconUpload,
} from '@arco-design/web-react/icon';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import type { LeadQuotationItem } from '../leadDetailProfiles';
import { LeadQuotationSummaryTable } from './LeadQuotationSummaryTable';
import './LeadQuotationHistoryPanel.css';

type QuotationFileField = 'quotationSystemFiles' | 'technicalEvaluationFiles' | 'quotationFiles';

interface LeadQuotationHistoryPanelProps {
  quotations: LeadQuotationItem[];
  projectLayout?: boolean;
  showProjectEditAction?: boolean;
  alwaysExpanded?: boolean;
  hideQuotationUpload?: boolean;
  approvalOverviewAtTop?: boolean;
  onCreate: () => void;
  onEdit: (quotation: LeadQuotationItem) => void;
  onDelete: (quotation: LeadQuotationItem) => void;
  onSubmitApproval?: (quotation: LeadQuotationItem) => void;
  onApprovalDecision?: (
    quotation: LeadQuotationItem,
    decision: 'approve' | 'reject',
    comment: string,
  ) => void;
  onUploadFiles?: (quotation: LeadQuotationItem, field: QuotationFileField, files: UploadItem[]) => void;
  onRemoveFile?: (quotation: LeadQuotationItem, field: QuotationFileField, fileName: string) => void;
}

function formatAmount(value: string) {
  return value.startsWith('¥') ? value : `¥${value}`;
}

function getApprovalStatus(quotation: LeadQuotationItem) {
  if (quotation.approvalFlow.some(node => node.status === 'rejected')) {
    return '已驳回';
  }
  const pendingNode = quotation.approvalFlow.find(node => node.status === 'pending');
  if (pendingNode) {
    return pendingNode.step === '总经理审批' ? '总经理审批中' : '审批中';
  }
  return quotation.flowStatus;
}

function getApprovalColor(status: string) {
  if (status === '已审核' || status === '已通过') return 'green';
  if (status === '已驳回') return 'red';
  return 'orange';
}

function canEditProjectQuotation(approvalStatus: string) {
  return !['已审核', '已通过', '已驳回'].includes(approvalStatus);
}

const QUOTATION_FLOW_STEPS = [
  {
    title: '需求分析阶段',
    actor: '销售负责人、产品经理与客户关键干系人',
    action: '整理客户原始需求、沟通记录和附件，明确业务目标、使用对象、系统边界、优先级及不包含范围，并对歧义项与客户再次确认。',
    output: '形成可供后续拆分的需求基线和待确认问题清单。',
  },
  {
    title: '生成功能清单',
    actor: '产品经理主导，销售负责人和业务人员协同',
    action: '将已确认需求按“业务端 → 功能模块 → 功能点”逐级拆分，补充功能说明，并通过新增、编辑、删除持续校准功能范围。',
    output: '形成结构化功能清单，作为工作量评估和报价的统一依据。',
  },
  {
    title: '评估工作量',
    actor: '技术评估人、产品经理及相关开发岗位负责人',
    action: '逐项评估功能点的实现复杂度和工时，同时考虑产品、UI、前端、后端、测试、部署及技术风险；对不确定项给出评估前提。',
    output: '得到各功能点工时、总人天和预计交付周期。',
  },
  {
    title: '成本核算',
    actor: '报价人主导，技术评估人、财务或管理人员配合',
    action: '根据工时、岗位人天单价计算人力成本，并补充差旅驻场、第三方服务、软硬件、税费及销售提成等成本，再按比例或固定金额设置报价上浮。',
    output: '形成原始报价金额、上浮值及上浮后金额，供报价单生成使用。',
  },
  {
    title: '生成报价单',
    actor: '报价人或销售负责人',
    action: '完善报价人、预计周期、技术评估人和报价说明，生成报价单预览；检查详细报价清单中的业务端、功能模块、功能点、工时、单价和小计。',
    output: '生成可预览、编辑和导出的报价单文档，并建立本次报价版本。',
  },
  {
    title: '技术评估上传文档',
    actor: '技术评估人',
    action: '将技术方案、工作量评估表、风险说明或其他技术评估材料上传至最新报价记录，并确认文档与当前功能清单和报价版本一致。',
    output: '形成可追溯的技术评估附件，补齐报价审批所需材料。',
  },
  {
    title: '提交审批',
    actor: '报价人或销售负责人发起，总经理审批',
    action: '发起人核对功能清单、成本数据、报价单和技术评估附件后提交审批；审批人查看完整线索与报价内容，做出通过或驳回决策并填写意见。',
    output: '通过后报价完成并保留历史版本；驳回后根据意见返回对应阶段修改并重新提交。',
  },
] as const;

function getNodeStatusLabel(step: string, status: string) {
  if (step === '发起申请' && status === 'approved') return '已申请';
  if (status === 'approved') return '已通过';
  if (status === 'pending') return '待处理';
  if (status === 'rejected') return '已驳回';
  return '未到达';
}

function getNodeStatusColor(status: string) {
  if (status === 'approved') return 'green';
  if (status === 'pending') return 'orange';
  if (status === 'rejected') return 'red';
  return 'gray';
}

function downloadQuotationFile(fileName: string, fileUrl?: string) {
  if (fileUrl) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  const blob = new Blob([`报价附件：${fileName}`], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  Message.success(`已开始下载：${fileName}`);
}

function downloadQuotationReportImage(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  Message.success(`已开始下载：${fileName}`);
}

function QuotationReportImageLink({ url, fileName }: { url: string; fileName: string }) {
  return (
    <section className="lead-quotation-history-project-file-block">
      <div className="lead-quotation-history-project-file-label">
        <strong>报价系统记录</strong>
      </div>
      <div className="lead-quotation-history-report-link-row">
        <IconFile />
        <a href={url} target="_blank" rel="noreferrer">{fileName}</a>
        <Tooltip content="下载报价系统记录">
          <Button type="text" size="mini" icon={<IconDownload />} aria-label="下载报价系统记录" onClick={() => downloadQuotationReportImage(url, fileName)} />
        </Tooltip>
      </div>
    </section>
  );
}

function ProjectQuotationFileBlock({
  label,
  files,
  onPreview,
  onUpload,
  onRemove,
  accept,
  fileUrls,
}: {
  label: string;
  files: string[];
  onPreview: (fileName: string) => void;
  onUpload?: (files: UploadItem[]) => void;
  onRemove?: (fileName: string) => void;
  accept?: string;
  fileUrls?: Record<string, string>;
}) {
  return (
    <section className="lead-quotation-history-project-file-block">
      <div className="lead-quotation-history-project-file-label">
        <strong>{label}</strong>
        {onUpload ? (
          <Upload
            autoUpload={false}
            multiple
            showUploadList={false}
            accept={accept}
            onChange={(_fileList, file) => onUpload([file])}
          >
            <Button type="text" size="mini" icon={<IconUpload />}>上传</Button>
          </Upload>
        ) : null}
      </div>
      <div className="lead-quotation-history-project-file-list">
        {files.length ? files.map(file => (
          <div className="lead-quotation-history-project-file-row" key={file}>
            <button type="button" className="lead-quotation-history-project-file-name" title={`预览 ${file}`} onClick={() => onPreview(file)}>
              <IconFile />
              <span>{file}</span>
            </button>
            <Space size={2}>
              {onRemove ? (
                <Tooltip content="删除文件">
                  <Button
                    type="text"
                    size="mini"
                    status="danger"
                    icon={<IconDelete />}
                    aria-label={`删除${file}`}
                    onClick={() => onRemove(file)}
                  />
                </Tooltip>
              ) : null}
              <Tooltip content="下载文件">
                <Button
                  type="text"
                  size="mini"
                  icon={<IconDownload />}
                  aria-label={`下载${file}`}
                  onClick={() => downloadQuotationFile(file, fileUrls?.[file])}
                />
              </Tooltip>
            </Space>
          </div>
        )) : <span className="lead-quotation-history-project-file-empty">暂无文件</span>}
      </div>
    </section>
  );
}

export function LeadQuotationHistoryPanel({
  quotations,
  projectLayout = false,
  showProjectEditAction = false,
  alwaysExpanded = false,
  hideQuotationUpload = false,
  approvalOverviewAtTop = false,
  onCreate,
  onEdit,
  onDelete,
  onSubmitApproval,
  onApprovalDecision,
  onUploadFiles,
  onRemoveFile,
}: LeadQuotationHistoryPanelProps) {
  const sortedQuotations = useMemo(
    () => [...quotations].sort((left, right) => right.createTime.localeCompare(left.createTime)),
    [quotations],
  );
  const latestQuotationId = sortedQuotations[0]?.id;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [flowDescriptionVisible, setFlowDescriptionVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<{
    quotation: LeadQuotationItem;
    decision: 'approve' | 'reject';
  } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const quotationsWithApproval = sortedQuotations.filter(quotation => quotation.approvalFlow.length > 0);

  useEffect(() => {
    setExpandedIds(new Set());
  }, [latestQuotationId]);

  const toggleExpanded = (quotationId: string) => {
    setExpandedIds(current => {
      const next = new Set(current);
      if (next.has(quotationId)) {
        next.delete(quotationId);
      } else {
        next.add(quotationId);
      }
      return next;
    });
  };

  const openApprovalAction = (quotation: LeadQuotationItem, decision: 'approve' | 'reject') => {
    setApprovalComment('');
    setApprovalAction({ quotation, decision });
  };

  const confirmApprovalAction = () => {
    if (!approvalAction) return;
    const comment = approvalComment.trim();
    if (!comment) {
      Message.error('请填写审批意见');
      return;
    }

    onApprovalDecision?.(approvalAction.quotation, approvalAction.decision, comment);
    setApprovalAction(null);
    setApprovalComment('');
  };

  return (
    <>
      <Card
      bordered={false}
      className="lead-quotation-history-card"
      title={(
        <div className="lead-quotation-history-heading">
          <span>报价历史</span>
          <span className="lead-quotation-history-count">共 {sortedQuotations.length} 条</span>
        </div>
      )}
      extra={(
        <Space size={8}>
          <Tooltip content="操作流程说明">
            <Button
              type="text"
              size="small"
              icon={<IconQuestionCircle />}
              aria-label="操作流程说明"
              onClick={() => setFlowDescriptionVisible(true)}
            />
          </Tooltip>
          {sortedQuotations.length === 0 ? (
            <Button type="primary" size="small" icon={<IconPlus />} onClick={onCreate}>
              新增报价
            </Button>
          ) : null}
        </Space>
      )}
    >
      {approvalOverviewAtTop && quotationsWithApproval.length > 0 ? (
        <section className="lead-quotation-approval-overview">
          <div className="lead-quotation-approval-overview-heading">
            <div>
              <strong>审批记录</strong>
              <span>共 {quotationsWithApproval.length} 条</span>
            </div>
            <Tag color={getApprovalColor(getApprovalStatus(quotationsWithApproval[0]))} size="small">
              {getApprovalStatus(quotationsWithApproval[0])}
            </Tag>
          </div>
          <div className="lead-quotation-approval-overview-list">
            {quotationsWithApproval.map(quotation => {
              const approvalStatus = getApprovalStatus(quotation);
              const rejectedNode = quotation.approvalFlow.find(node => node.status === 'rejected');
              const latestProcessedNode = [...quotation.approvalFlow]
                .reverse()
                .find(node => node.status !== 'pending');
              const submittedNode = quotation.approvalFlow.find(node => node.step === '发起申请')
                || quotation.approvalFlow[0];
              const nodeStatus = approvalStatus === '已驳回'
                ? 'rejected'
                : approvalStatus === '已审核' || approvalStatus === '已通过'
                  ? 'approved'
                  : 'pending';
              const operationNode = rejectedNode || latestProcessedNode;

              return (
                <div key={quotation.id} className="lead-quotation-approval-overview-round">
                  <div className="lead-quotation-approval-overview-round-head">
                    <div>
                      <strong>{quotation.name}</strong>
                      <Tag color={getApprovalColor(approvalStatus)} size="small">{approvalStatus}</Tag>
                    </div>
                    <span>{operationNode?.time || submittedNode?.time || quotation.createTime}</span>
                  </div>
                  <div className="lead-quotation-approval-overview-track">
                    <div className="lead-quotation-approval-overview-node is-approved">
                      <span className="lead-quotation-approval-overview-node-dot" />
                      <strong>提交审批</strong>
                      <Tag color="green" size="small">已提交</Tag>
                      <small>{quotation.operator}</small>
                      <time>{submittedNode?.time || quotation.createTime || '-'}</time>
                    </div>
                    <div className={`lead-quotation-approval-overview-node is-${nodeStatus}`}>
                      <span className="lead-quotation-approval-overview-node-dot" />
                      <strong>{nodeStatus === 'approved'
                        ? '审批通过'
                        : nodeStatus === 'rejected'
                          ? '审批驳回'
                          : '等待审批'}</strong>
                      <Tag color={getNodeStatusColor(nodeStatus)} size="small">
                        {getNodeStatusLabel('总经理审批', nodeStatus)}
                      </Tag>
                      <small>赵总 - 总经理</small>
                      <time>{operationNode?.time || '-'}</time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {sortedQuotations.length === 0 ? (
        <Empty description="暂无报价记录" />
      ) : (
        <div className="lead-quotation-history-list">
          {sortedQuotations.map((quotation, index) => {
            const isLatest = index === 0;
            const isExpanded = alwaysExpanded || expandedIds.has(quotation.id);
            const approvalStatus = getApprovalStatus(quotation);
            const isApproving = quotation.approvalFlow.some(node => node.status === 'pending');
            const detailId = `lead-quotation-detail-${quotation.id}`;
            const quotationDocumentFiles = quotation.quotationFiles?.length
              ? quotation.quotationFiles
              : quotation.file && quotation.file !== '-'
                ? [quotation.file]
                : [];
            const needsTechnicalEvaluationFile = !quotation.technicalEvaluationFiles?.length;
            const needsQuotationFile = !quotationDocumentFiles.length;
            const needsRequiredProjectFile = needsTechnicalEvaluationFile
              || (!hideQuotationUpload && needsQuotationFile);
            const canManageFiles = isLatest && canEditProjectQuotation(approvalStatus);

            return (
              <section
                key={quotation.id}
                className={`lead-quotation-history-item${isLatest ? ' is-latest' : ''}${isExpanded ? ' is-expanded' : ''}${alwaysExpanded ? ' is-always-expanded' : ''}`}
              >
                <div className="lead-quotation-history-summary">
                  <div className="lead-quotation-history-title-row">
                    <div className="lead-quotation-history-title-content">
                      <div className="lead-quotation-history-name-row">
                        <h4>{quotation.name}</h4>
                        {isLatest ? <Tag color="arcoblue" size="small">最新报价</Tag> : null}
                      </div>
                      <div className="lead-quotation-history-tags">
                        {quotation.status !== '已报价' ? <Tag color="orange" size="small">{quotation.status}</Tag> : null}
                        <Tag color={getApprovalColor(approvalStatus)} size="small">
                          {approvalStatus}
                        </Tag>
                      </div>
                    </div>

                    {!projectLayout ? (
                      <div className="lead-quotation-history-actions">
                        <Tooltip content="编辑报价">
                          <Button
                            type="text"
                            size="mini"
                            icon={<IconEdit />}
                            aria-label="编辑报价"
                            onClick={() => onEdit(quotation)}
                          />
                        </Tooltip>
                        <Tooltip content="删除报价">
                          <Button
                            type="text"
                            size="mini"
                            status="danger"
                            icon={<IconDelete />}
                            aria-label="删除报价"
                            onClick={() => onDelete(quotation)}
                          />
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>

                  {projectLayout && alwaysExpanded ? (
                    <>
                      <div className="lead-quotation-history-overview">
                        <div className="lead-quotation-history-overview-item is-amount">
                          <span>报价金额</span>
                          <strong>{formatAmount(quotation.amount)}</strong>
                        </div>
                        <div className="lead-quotation-history-overview-item">
                          <span>报价上浮比例</span>
                          <strong>{quotation.upliftRate == null ? '-' : `${quotation.upliftRate}%`}</strong>
                        </div>
                        <div className="lead-quotation-history-overview-item">
                          <span>预计周期</span>
                          <strong>{quotation.period || '-'}</strong>
                        </div>
                        <div className="lead-quotation-history-overview-item">
                          <span>技术评估人</span>
                          <strong>{quotation.technicalEvaluator || '-'}</strong>
                        </div>
                        <div className="lead-quotation-history-overview-item">
                          <span>报价人</span>
                          <strong>{quotation.operator || '-'}</strong>
                        </div>
                        <div className="lead-quotation-history-overview-item">
                          <span>生成时间</span>
                          <strong>{quotation.createTime || '-'}</strong>
                        </div>
                      </div>
                      <div className="lead-quotation-history-description">
                        <span>报价说明</span>
                        <strong>{quotation.description || '-'}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="lead-quotation-history-key-info">
                      <div className="lead-quotation-history-amount">
                        <span>报价金额</span>
                        <strong>{formatAmount(quotation.amount)}</strong>
                      </div>
                      <div className="lead-quotation-history-meta">
                        <span>报价上浮比例：{quotation.upliftRate == null ? '-' : `${quotation.upliftRate}%`}</span>
                        <span>{quotation.createTime}</span>
                        <span>报价人：{quotation.operator}</span>
                      </div>
                    </div>
                  )}

                  {projectLayout ? (
                    <div className="lead-quotation-history-project-record-actions">
                      {showProjectEditAction && isLatest && canEditProjectQuotation(approvalStatus) ? (
                        <Button size="mini" icon={<IconEdit />} onClick={() => onEdit(quotation)}>
                          编辑
                        </Button>
                      ) : null}
                      {canManageFiles ? (
                        needsRequiredProjectFile ? (
                          <Space size={8}>
                            {needsTechnicalEvaluationFile && onUploadFiles ? (
                              <Upload
                                key={`technical-evaluation-upload-${quotation.id}`}
                                autoUpload={false}
                                showUploadList={false}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                                onChange={(_fileList, file) => onUploadFiles(quotation, 'technicalEvaluationFiles', [file])}
                              >
                                <Button size="mini" icon={<IconUpload />}>上传技术评估文件</Button>
                              </Upload>
                            ) : null}
                            {!hideQuotationUpload && needsQuotationFile && onUploadFiles ? (
                              <Upload
                                key={`quotation-upload-${quotation.id}`}
                                autoUpload={false}
                                showUploadList={false}
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(_fileList, file) => onUploadFiles(quotation, 'quotationFiles', [file])}
                              >
                                <Button size="mini" icon={<IconUpload />}>上传报价单</Button>
                              </Upload>
                            ) : null}
                          </Space>
                        ) : isApproving ? (
                          <Space size={8}>
                            <Button type="primary" size="mini" onClick={() => openApprovalAction(quotation, 'approve')}>
                              同意
                            </Button>
                            <Button size="mini" status="danger" onClick={() => openApprovalAction(quotation, 'reject')}>
                              拒绝
                            </Button>
                          </Space>
                        ) : canEditProjectQuotation(approvalStatus) ? (
                            <Button type="primary" size="mini" onClick={() => onSubmitApproval?.(quotation)}>
                              提交审批
                            </Button>
                        ) : null
                      ) : null}
                      {!alwaysExpanded ? (
                        <button
                          type="button"
                          className="lead-quotation-history-toggle"
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          onClick={() => toggleExpanded(quotation.id)}
                        >
                          {isExpanded ? <IconDown /> : <IconRight />}
                          {isExpanded ? '收起详情' : '展开详情'}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="lead-quotation-history-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                      onClick={() => toggleExpanded(quotation.id)}
                    >
                      {isExpanded ? <IconDown /> : <IconRight />}
                      {isExpanded ? '收起详情' : '展开详情与审批记录'}
                    </button>
                  )}
                </div>

                {isExpanded ? (
                  <div id={detailId} className="lead-quotation-history-detail">
                    {projectLayout ? (
                      <>
                        {!alwaysExpanded ? (
                          <div className="lead-quotation-history-info-grid is-project-layout">
                            <div>
                              <span>预计周期</span>
                              <strong>{quotation.period || '-'}</strong>
                            </div>
                            <div>
                              <span>技术评估人</span>
                              <strong>{quotation.technicalEvaluator || '-'}</strong>
                            </div>
                            <div className="is-full">
                              <span>报价说明</span>
                              <strong>{quotation.description || '-'}</strong>
                            </div>
                          </div>
                        ) : null}
                        {!quotation.quotationReportImageUrl && quotation.quotationSummary ? (
                          <LeadQuotationSummaryTable summary={quotation.quotationSummary} />
                        ) : null}
                        <div className="lead-quotation-history-project-files">
                          {quotation.quotationReportImageUrl ? (
                            <QuotationReportImageLink
                              url={quotation.quotationReportImageUrl}
                              fileName={quotation.quotationReportImageName ?? '报价系统记录.png'}
                            />
                          ) : null}
                          {quotation.technicalEvaluationFiles?.length ? (
                            <ProjectQuotationFileBlock
                              label="技术评估文件"
                              files={quotation.technicalEvaluationFiles}
                              onPreview={setPreviewFile}
                              onUpload={canManageFiles && onUploadFiles ? files => onUploadFiles(quotation, 'technicalEvaluationFiles', files) : undefined}
                              onRemove={canManageFiles && onRemoveFile ? fileName => onRemoveFile(quotation, 'technicalEvaluationFiles', fileName) : undefined}
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                            />
                          ) : null}
                          {quotationDocumentFiles.length ? (
                            <ProjectQuotationFileBlock
                              label="报价单"
                              files={quotationDocumentFiles}
                              onPreview={setPreviewFile}
                              onUpload={!hideQuotationUpload && canManageFiles && onUploadFiles ? files => onUploadFiles(quotation, 'quotationFiles', files) : undefined}
                              onRemove={canManageFiles && onRemoveFile ? fileName => onRemoveFile(quotation, 'quotationFiles', fileName) : undefined}
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              fileUrls={quotation.quotationFileUrls}
                            />
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="lead-quotation-history-metrics">
                          <div>
                            <span>报价金额</span>
                            <strong>{formatAmount(quotation.amount)}</strong>
                          </div>
                          <div>
                            <span>报价上浮比例</span>
                            <strong>{quotation.upliftRate == null ? '-' : `${quotation.upliftRate}%`}</strong>
                          </div>
                          <div>
                            <span>预计成本</span>
                            <strong>{formatAmount(quotation.cost)}</strong>
                          </div>
                          <div>
                            <span>预计利润</span>
                            <strong>{formatAmount(quotation.profit)}</strong>
                          </div>
                        </div>

                        <div className="lead-quotation-history-info-grid">
                          <div>
                            <span>报价主体</span>
                            <strong>{quotation.entity || '-'}</strong>
                          </div>
                          <div>
                            <span>报价人</span>
                            <strong>{quotation.operator || '-'}</strong>
                          </div>
                          <div>
                            <span>预计周期</span>
                            <strong>{quotation.period || '-'}</strong>
                          </div>
                          <div>
                            <span>生成时间</span>
                            <strong>{quotation.createTime || '-'}</strong>
                          </div>
                        </div>

                        <div className="lead-quotation-history-file">
                          <div className="lead-quotation-history-file-main">
                            <span className="lead-quotation-history-file-icon"><IconFile /></span>
                            <div>
                              <span className="lead-quotation-history-file-label">报价文件</span>
                              <strong>{quotation.file || '-'}</strong>
                            </div>
                          </div>
                          <Tooltip content="下载报价文件">
                            <Button
                              type="text"
                              size="small"
                              icon={<IconDownload />}
                              aria-label="下载报价文件"
                              disabled={!quotation.file}
                              onClick={() => Message.info(`下载文件: ${quotation.file}`)}
                            />
                          </Tooltip>
                        </div>
                      </>
                    )}

                    {!approvalOverviewAtTop && quotation.approvalFlow.length ? (
                      <div className="lead-quotation-approval">
                        <div className="lead-quotation-approval-heading">
                          <span>审批记录</span>
                          <span>{quotation.approvalFlow.length} 个节点</span>
                        </div>
                        <ol className="lead-quotation-approval-list">
                          {quotation.approvalFlow.map((node, nodeIndex) => (
                            <li
                              key={`${quotation.id}-${node.step}-${nodeIndex}`}
                              className={`lead-quotation-approval-node is-${node.status}`}
                            >
                              <span className="lead-quotation-approval-dot" />
                              <div className="lead-quotation-approval-content">
                                <div className="lead-quotation-approval-title">
                                  <strong>{node.step}</strong>
                                  <Tag color={getNodeStatusColor(node.status)} size="small">
                                    {getNodeStatusLabel(node.step, node.status)}
                                  </Tag>
                                </div>
                                <div className="lead-quotation-approval-meta">
                                  <span>{node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}</span>
                                  <span>操作时间：{node.time || '-'}</span>
                                </div>
                                {node.comment ? (
                                  <div className={`lead-quotation-approval-comment${node.status === 'rejected' ? ' is-rejected' : ''}`}>
                                    <span>{node.status === 'rejected' ? '驳回原因' : '审批意见'}</span>
                                    <p>{node.comment}</p>
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
      </Card>
      <Modal
        title="报价操作流程说明"
        visible={flowDescriptionVisible}
        footer={null}
        onCancel={() => setFlowDescriptionVisible(false)}
        style={{ width: 1040, maxWidth: 'calc(100vw - 32px)' }}
        bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}
      >
        <div className="quotation-flow-guide">
          <div className="quotation-flow-guide-hero">
            <span className="quotation-flow-guide-eyebrow">QUOTATION WORKFLOW</span>
            <h3>从需求到审批，七步完成一次可追溯报价</h3>
            <p>每个阶段都明确参与角色、关键操作和交付成果，确保功能范围、成本和报价口径一致。</p>
          </div>
          <div className="quotation-flow-guide-map" aria-label="报价操作流程图">
            {QUOTATION_FLOW_STEPS.map((step, index) => (
              <div className="quotation-flow-guide-node" key={step.title}>
                <span>{index + 1}</span>
                <strong>{step.title}</strong>
              </div>
            ))}
          </div>
          <div className="quotation-flow-guide-result">
            <span>审批通过</span><strong>报价完成并保留历史版本</strong>
            <span className="is-rejected">审批驳回</span><strong>根据审批意见返回对应阶段修改</strong>
          </div>
          <div className="quotation-flow-guide-details">
            {QUOTATION_FLOW_STEPS.map((step, index) => (
              <section key={step.title}>
                <div className="quotation-flow-guide-step-number">{index + 1}</div>
                <div>
                  <div className="quotation-flow-guide-card-heading"><span>STEP {String(index + 1).padStart(2, '0')}</span><h4>{step.title}</h4></div>
                  <dl>
                    <div className="is-actor"><dt>参与角色</dt><dd>{step.actor}</dd></div>
                    <div className="is-action"><dt>阶段操作</dt><dd>{step.action}</dd></div>
                    <div className="is-output"><dt>阶段产出</dt><dd>{step.output}</dd></div>
                  </dl>
                </div>
              </section>
            ))}
          </div>
        </div>
      </Modal>
      <Modal
        title={previewFile ? `文件预览 · ${previewFile}` : '文件预览'}
        visible={Boolean(previewFile)}
        footer={null}
        onCancel={() => setPreviewFile(null)}
        style={{ width: 680, maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="lead-quotation-history-file-preview">
          <IconFile />
          <strong>{previewFile}</strong>
          <span>当前原型文件暂无在线内容，可下载后查看。</span>
        </div>
      </Modal>
      <Modal
        title={approvalAction?.decision === 'approve' ? '同意报价审批' : '拒绝报价审批'}
        visible={Boolean(approvalAction)}
        okText="确定"
        onOk={confirmApprovalAction}
        onCancel={() => {
          setApprovalAction(null);
          setApprovalComment('');
        }}
      >
        <div style={{ marginBottom: 8 }}>审批意见</div>
        <Input.TextArea
          value={approvalComment}
          onChange={setApprovalComment}
          placeholder="请输入审批意见"
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
      </Modal>
    </>
  );
}
