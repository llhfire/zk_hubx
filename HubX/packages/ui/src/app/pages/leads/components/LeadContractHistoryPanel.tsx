import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Upload,
} from '@arco-design/web-react';
import {
  IconDownload,
  IconDown,
  IconEdit,
  IconEye,
  IconFile,
  IconPlus,
  IconRight,
  IconUpload,
} from '@arco-design/web-react/icon';
import { useContracts } from '../../contracts/ContractsContext';
import { getContractApprovalRounds } from '../../contracts/contractHistory';
import {
  CONTRACT_CHANGE_TYPE_OPTIONS,
  downloadAttachment,
  mapUploadFilesToAttachments,
} from '../../contracts/contractModification';
import type {
  ApprovalNode,
  Contract,
  ContractApprovalRound,
  ContractVersion,
  ScanFile,
} from '../../contracts/types';
import { getNextVersionNo } from '../../contracts/utils';
import './LeadContractHistoryPanel.css';

const FormItem = Form.Item;

interface LeadContractHistoryPanelProps {
  contract?: Contract;
  onCreateContract: () => void;
  onContractClick: (contractId: string) => void;
  hideHistorySummary?: boolean;
  hideAddVersion?: boolean;
  hideVersionChangeTypes?: boolean;
  hideEmptyApprovalRecords?: boolean;
  hideContractDetailAction?: boolean;
  projectCompactVersionLayout?: boolean;
  hideFinalArchiveUntilApproved?: boolean;
  approvalOverviewAtTop?: boolean;
  approvalMode?: 'standard' | 'general-manager';
  onEditVersion?: (version: ContractVersion) => void;
}

interface LocalUploadItem {
  uid?: string;
  name?: string;
  originFile?: File;
}

function getApprovingStepLabel(round?: ContractApprovalRound) {
  const pendingStep = round?.nodes.find(node => node.status === 'pending')?.step;
  if (!pendingStep) return '审批中';
  if (pendingStep.endsWith('审批')) return `${pendingStep}中`;
  return `${pendingStep.replace('审核', '')}审批中`;
}

function getRoundStatusLabel(round: ContractApprovalRound, includeApprovingStep = false) {
  if (round.status === 'approved') return '已通过';
  if (round.status === 'rejected') return '已驳回';
  if (round.status === 'withdrawn') return '已撤回';
  return includeApprovingStep ? getApprovingStepLabel(round) : '审批中';
}

function getRoundStatusColor(status: ContractApprovalRound['status']) {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'withdrawn') return 'gray';
  return 'orange';
}

function getNodeStatusLabel(node: ApprovalNode) {
  if (node.step === '发起申请' && node.status === 'approved') return '已提交';
  if (node.status === 'approved') return '已通过';
  if (node.status === 'rejected') return '已驳回';
  return '待处理';
}

function getNodeStatusColor(status: ApprovalNode['status']) {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  return 'orange';
}

function getSortedApprovalNodes(round: ContractApprovalRound) {
  return round.nodes
    .map((node, index) => ({ node, index }))
    .sort((left, right) => {
      if (left.node.time && right.node.time) {
        return right.node.time.localeCompare(left.node.time);
      }
      if (left.node.time) return -1;
      if (right.node.time) return 1;
      return left.index - right.index;
    })
    .map(item => item.node);
}

function getVersionStatus(
  contract: Contract,
  version: ContractVersion,
  rounds: ContractApprovalRound[],
  includeApprovingStep = false,
) {
  if (version.versionNo === contract.approvedVersionNo) {
    return { label: '终稿', color: 'green' };
  }
  const latestRound = rounds[0];
  if (latestRound?.status === 'approved') return { label: '已审批通过', color: 'green' };
  if (latestRound?.status === 'approving') {
    return { label: includeApprovingStep ? getApprovingStepLabel(latestRound) : '审批中', color: 'orange' };
  }
  if (latestRound?.status === 'rejected') return { label: '审批驳回', color: 'red' };
  if (latestRound?.status === 'withdrawn') return { label: '审批已撤回', color: 'gray' };
  return { label: '未提交审批', color: 'arcoblue' };
}

function getContractStatus(
  contract: Contract,
  latestVersion: ContractVersion | undefined,
  activeRound: ContractApprovalRound | undefined,
) {
  if (contract.status === 'voided') return { label: '已作废', color: 'red' };
  if (activeRound) return { label: `${activeRound.versionNo} 审批中`, color: 'orange' };
  if (contract.approvedVersionNo === latestVersion?.versionNo) {
    return { label: '已形成终稿', color: 'green' };
  }
  if (contract.approvedVersionNo) return { label: '有新版本待审批', color: 'arcoblue' };
  return { label: '待提交审批', color: 'arcoblue' };
}

function mapUploadFilesToScans(uploadList: LocalUploadItem[]): ScanFile[] {
  return uploadList.map((item, index) => {
    const file = item.originFile;
    return {
      id: item.uid || `final-file-${Date.now()}-${index}`,
      fileName: item.name || file?.name || `归档文件${index + 1}`,
      fileSize: file?.size ?? 0,
      mimeType: file?.type || 'application/octet-stream',
      blobUrl: file ? URL.createObjectURL(file) : undefined,
      uploadedAt: new Date().toLocaleString('zh-CN'),
      uploadedBy: '张三',
    };
  });
}

function formatFileSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LeadContractHistoryPanel({
  contract,
  onCreateContract,
  onContractClick,
  hideHistorySummary = false,
  hideAddVersion = false,
  hideVersionChangeTypes = false,
  hideEmptyApprovalRecords = false,
  hideContractDetailAction = false,
  projectCompactVersionLayout = false,
  hideFinalArchiveUntilApproved = false,
  approvalOverviewAtTop = false,
  approvalMode = 'standard',
  onEditVersion,
}: LeadContractHistoryPanelProps) {
  const {
    archiveFinalContract,
    approveStep,
    rejectStep,
    saveVersionWithDetails,
    submitVersionForApproval,
    uploadWordContract,
  } = useContracts();
  const [expandedVersionNos, setExpandedVersionNos] = useState<Set<string>>(new Set());
  const [expandedRoundIds, setExpandedRoundIds] = useState<Set<string>>(new Set());
  const [versionVisible, setVersionVisible] = useState(false);
  const [approvalVersion, setApprovalVersion] = useState<ContractVersion | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<{
    version: ContractVersion;
    type: 'approve' | 'reject';
  } | null>(null);
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [wordFileList, setWordFileList] = useState<LocalUploadItem[]>([]);
  const [wordVersionVisible, setWordVersionVisible] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<ContractVersion | null>(null);
  const [previewArchiveFile, setPreviewArchiveFile] = useState<ScanFile | null>(null);
  const [versionForm] = Form.useForm();
  const [approvalForm] = Form.useForm();
  const [approvalDecisionForm] = Form.useForm();
  const [archiveForm] = Form.useForm();
  const [wordVersionForm] = Form.useForm();

  const approvalRounds = useMemo(
    () => (contract ? getContractApprovalRounds(contract) : []),
    [contract],
  );
  const versions = useMemo(
    () => [...(contract?.versionHistory || [])].sort((left, right) => (
      right.createdAt.localeCompare(left.createdAt)
      || right.versionNo.localeCompare(left.versionNo, undefined, { numeric: true })
    )),
    [contract],
  );
  const latestVersion = versions[0];
  const activeRound = approvalRounds.find(round => round.status === 'approving');
  const currentStatus = contract
    ? getContractStatus(contract, latestVersion, activeRound)
    : undefined;
  const nextVersionNo = contract
    ? getNextVersionNo(contract.versionHistory.map(version => version.versionNo))
    : 'V1';
  const archiveEntries = useMemo(
    () => [...(contract?.archivedScans || [])].sort((left, right) => (
      right.uploadedAt.localeCompare(left.uploadedAt)
    )),
    [contract],
  );
  const showFinalArchive = !hideFinalArchiveUntilApproved || Boolean(contract?.approvedVersionNo);
  const canUploadWord = Boolean(contract)
    && contract?.status !== 'voided'
    && !activeRound
    && latestVersion?.versionNo !== contract?.approvedVersionNo;

  useEffect(() => {
    if (!latestVersion) {
      setExpandedVersionNos(new Set());
      setExpandedRoundIds(new Set());
      return;
    }
    const latestVersionRound = [...approvalRounds]
      .reverse()
      .find(round => round.versionNo === latestVersion.versionNo);
    setExpandedVersionNos(new Set());
    setExpandedRoundIds(latestVersionRound ? new Set([latestVersionRound.id]) : new Set());
  }, [contract?.id, latestVersion?.versionNo]);

  const toggleVersion = (versionNo: string) => {
    const isOpening = !expandedVersionNos.has(versionNo);
    setExpandedVersionNos(current => {
      const next = new Set(current);
      if (next.has(versionNo)) next.delete(versionNo);
      else next.add(versionNo);
      return next;
    });
    if (isOpening) {
      const versionRoundIds = approvalRounds
        .filter(round => round.versionNo === versionNo)
        .map(round => round.id);
      setExpandedRoundIds(current => new Set([...current, ...versionRoundIds]));
    }
  };

  const toggleRound = (roundId: string) => {
    setExpandedRoundIds(current => {
      const next = new Set(current);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  };

  const handleOpenVersionModal = () => {
    versionForm.resetFields();
    setVersionVisible(true);
  };

  const handleSaveVersion = () => {
    if (!contract) return;
    versionForm.validate().then(values => {
      const uploadList = Array.isArray(values.attachments) ? values.attachments : [];
      saveVersionWithDetails(contract.id, {
        formData: contract.current,
        label: values.label.trim(),
        changeTypes: values.changeTypes,
        changeSummary: values.changeSummary.trim(),
        attachments: mapUploadFilesToAttachments(uploadList),
      });
      Message.success(`合同版本 ${nextVersionNo} 已创建`);
      setVersionVisible(false);
      versionForm.resetFields();
    });
  };

  const handleWordUpload = (files: LocalUploadItem[]) => {
    if (!contract || !canUploadWord) return;
    const uploadItem = files[files.length - 1];
    const file = uploadItem?.originFile;
    const fileName = uploadItem?.name || file?.name || '';
    if (!fileName || !/\.docx?$/i.test(fileName)) {
      Message.error('仅支持上传 .doc 或 .docx 格式的 Word 文件');
      setWordFileList([]);
      return;
    }

    setWordFileList([uploadItem]);
    wordVersionForm.resetFields();
    setWordVersionVisible(true);
  };

  const handleSaveWordVersion = () => {
    if (!contract || !canUploadWord) return;
    const uploadItem = wordFileList[0];
    const file = uploadItem?.originFile;
    const fileName = uploadItem?.name || file?.name || '';
    if (!fileName) return;

    wordVersionForm.validate().then(values => {
      saveVersionWithDetails(contract.id, {
        formData: contract.current,
        label: values.versionDescription.trim(),
        changeTypes: ['合同内容修改'],
        changeSummary: values.versionDescription.trim(),
        attachments: [{
          id: uploadItem.uid || `word-version-${Date.now()}`,
          name: fileName,
          size: formatFileSize(file?.size || 0),
          url: file ? URL.createObjectURL(file) : undefined,
        }],
      });
      uploadWordContract(contract.id, {
        fileName,
        fileSize: file?.size || 0,
        blobUrl: file ? URL.createObjectURL(file) : undefined,
      });
      setWordVersionVisible(false);
      setWordFileList([]);
      wordVersionForm.resetFields();
      Message.success(`Word 合同已生成新版本 ${nextVersionNo}，历史版本已保留`);
    });
  };

  const handleSubmitApproval = () => {
    if (!contract || !approvalVersion) return;
    approvalForm.validate().then(values => {
      submitVersionForApproval(contract.id, approvalVersion.versionNo, values.note || '', approvalMode);
      Message.success(`${approvalVersion.versionNo} 已提交合同审批`);
      setApprovalVersion(null);
      approvalForm.resetFields();
    });
  };

  const handleApprovalDecision = () => {
    if (!contract || !approvalDecision) return;
    approvalDecisionForm.validate().then(values => {
      const pendingStepIndex = contract.approvalFlow.findIndex(node => node.status === 'pending');
      if (pendingStepIndex < 0) {
        Message.error('当前审批流程没有待处理节点');
        return;
      }

      const comment = values.comment.trim();
      if (approvalDecision.type === 'approve') {
        approveStep(contract.id, pendingStepIndex, comment);
        Message.success('审批意见已提交');
      } else {
        rejectStep(contract.id, pendingStepIndex, comment);
        Message.success('已拒绝合同审批');
      }
      setApprovalDecision(null);
      approvalDecisionForm.resetFields();
    });
  };

  const handleArchive = () => {
    if (!contract?.approvedVersionNo) return;
    archiveForm.validate().then(async values => {
      const uploadList = Array.isArray(values.files) ? values.files as LocalUploadItem[] : [];
      const entry = await archiveFinalContract(
        contract.id,
        mapUploadFilesToScans(uploadList),
        values.note?.trim(),
      );
      if (!entry) {
        Message.error('终稿归档失败，请检查合同状态');
        return;
      }
      Message.success(`${contract.approvedVersionNo} 终稿已归档`);
      setArchiveVisible(false);
      archiveForm.resetFields();
    });
  };

  return (
    <>
      <Card
        bordered={false}
        className={`lead-contract-history-card${projectCompactVersionLayout && !showFinalArchive ? ' is-final-archive-hidden' : ''}`}
      >
        {!contract ? (
          <div className="lead-contract-history-empty-state">
            <Empty description="暂无合同记录" />
            <Button type="primary" size="small" icon={<IconPlus />} onClick={onCreateContract}>
              创建合同
            </Button>
          </div>
        ) : (
          <>
            {approvalOverviewAtTop && approvalRounds.length > 0 ? (
              <ContractApprovalOverview
                rounds={approvalRounds}
                includeApprovingStep={projectCompactVersionLayout}
                generalManagerOnly={approvalMode === 'general-manager'}
              />
            ) : null}

            {showFinalArchive && (
              <FinalContractArchive
                contract={contract}
                entries={archiveEntries}
                isLeading
                hideFinalVersionInfo={projectCompactVersionLayout}
                onUpload={() => {
                  archiveForm.resetFields();
                  setArchiveVisible(true);
                }}
                onPreviewFile={setPreviewArchiveFile}
              />
            )}

            <div className="lead-contract-version-list-heading">
              <div>
                <strong>合同历史记录</strong>
                <span>共 {versions.length} 个版本</span>
              </div>
              <Space size="small">
                {canUploadWord ? (
                  <Upload
                    autoUpload={false}
                    accept=".doc,.docx"
                    showUploadList={false}
                    fileList={wordFileList}
                    onChange={handleWordUpload}
                  >
                    <Button size="small" icon={<IconUpload />}>
                      {contract.uploadedWordContract ? '上传新 Word 版本' : '上传 Word 版'}
                    </Button>
                  </Upload>
                ) : null}
                {!contract.uploadedWordContract && !hideAddVersion && contract.status !== 'voided' ? (
                  <Button size="small" icon={<IconPlus />} onClick={handleOpenVersionModal}>
                    新增版本
                  </Button>
                ) : null}
              </Space>
            </div>

            {!hideHistorySummary && (
              <div className="lead-contract-history-summary">
                <table>
                  <thead>
                    <tr>
                      <th>最新版本</th>
                      <th>审批状态</th>
                      <th>最后更新</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>{latestVersion?.versionNo || '-'}</strong>
                      </td>
                      <td>
                        <Tag color={currentStatus?.color}>{currentStatus?.label}</Tag>
                      </td>
                      <td>
                        <strong>{contract.updatedAt}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="lead-contract-version-list">
              {versions.map(version => {
                const versionRounds = approvalRounds
                  .filter(round => round.versionNo === version.versionNo)
                  .sort((left, right) => right.roundNo - left.roundNo);
                return (
                  <ContractVersionItem
                    key={version.versionNo}
                    contract={contract}
                    version={version}
                    rounds={versionRounds}
                    activeRound={activeRound}
                    isLatest={version.versionNo === latestVersion?.versionNo}
                    expanded={expandedVersionNos.has(version.versionNo)}
                    expandedRoundIds={expandedRoundIds}
                    onToggle={() => toggleVersion(version.versionNo)}
                    onToggleRound={toggleRound}
                    onPreview={setPreviewVersion}
                    onEdit={contract.uploadedWordContract ? undefined : onEditVersion}
                    onSubmitApproval={setApprovalVersion}
                    onApprovalDecision={(version, type) => {
                      approvalDecisionForm.resetFields();
                      setApprovalDecision({ version, type });
                    }}
                    onContractClick={onContractClick}
                    hideChangeTypes={hideVersionChangeTypes}
                    hideEmptyApprovalRecords={hideEmptyApprovalRecords}
                    hideContractDetailAction={hideContractDetailAction}
                    projectCompactVersionLayout={projectCompactVersionLayout}
                    hideApprovalRecordsInDetail={approvalOverviewAtTop}
                  />
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Modal
        title={`上传 Word 合同版本 ${nextVersionNo}`}
        visible={wordVersionVisible}
        onOk={handleSaveWordVersion}
        onCancel={() => {
          setWordVersionVisible(false);
          setWordFileList([]);
          wordVersionForm.resetFields();
        }}
        style={{ width: 560, maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="lead-contract-version-number">
          <span>版本号</span>
          <strong>{nextVersionNo}</strong>
          <span>由系统自动生成</span>
        </div>
        <Form form={wordVersionForm} layout="vertical">
          <FormItem label="合同文件">
            <Input value={wordFileList[0]?.name || ''} disabled prefix={<IconFile />} />
          </FormItem>
          <FormItem
            label="版本说明"
            field="versionDescription"
            rules={[
              { required: true, message: '请输入版本说明' },
              { maxLength: 500, message: '版本说明不能超过 500 个字' },
            ]}
          >
            <Input.TextArea
              placeholder="请说明本次 Word 版本的主要修改内容，例如：根据客户意见调整付款条款"
              rows={4}
              maxLength={500}
              showWordLimit
            />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={`新增合同版本 ${nextVersionNo}`}
        visible={versionVisible}
        onOk={handleSaveVersion}
        onCancel={() => {
          setVersionVisible(false);
          versionForm.resetFields();
        }}
        style={{ width: 680, maxWidth: 'calc(100vw - 32px)' }}
      >
        {activeRound ? (
          <Alert
            type="warning"
            content={`当前 ${activeRound.versionNo} 正在审批中，创建新版本后本轮审批将自动撤回。`}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <div className="lead-contract-version-number">
          <span>版本号</span>
          <strong>{nextVersionNo}</strong>
          <span>由系统自动生成</span>
        </div>
        <Form form={versionForm} layout="vertical">
          <FormItem
            label="版本说明"
            field="label"
            rules={[{ required: true, message: '请输入版本说明' }]}
          >
            <Input placeholder="例如：根据财务审核意见调整付款比例" maxLength={100} />
          </FormItem>
          <FormItem
            label="修改类型"
            field="changeTypes"
            rules={[{ required: true, message: '请选择修改类型' }]}
          >
            <Select mode="multiple" placeholder="可选择多项修改类型">
              {CONTRACT_CHANGE_TYPE_OPTIONS.map(type => (
                <Select.Option key={type} value={type}>{type}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem
            label="修改内容"
            field="changeSummary"
            rules={[{ required: true, message: '请输入修改内容' }]}
          >
            <Input.TextArea
              placeholder="请说明本次合同版本相较上一版本的主要变化"
              rows={4}
              maxLength={2000}
              showWordLimit
            />
          </FormItem>
          <FormItem
            label="合同文件"
            field="attachments"
            triggerPropName="fileList"
            rules={[{ required: true, message: '请上传合同文件' }]}
          >
            <Upload
              accept=".pdf,.doc,.docx"
              autoUpload={false}
              limit={1}
              drag
              tip="支持 PDF、DOC、DOCX，单个版本保留一份合同文件"
            >
              <div className="lead-contract-version-upload">
                <IconUpload />
                <span>点击或拖拽合同文件到此处上传</span>
              </div>
            </Upload>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="提交合同审批"
        visible={Boolean(approvalVersion)}
        onOk={handleSubmitApproval}
        onCancel={() => {
          setApprovalVersion(null);
          approvalForm.resetFields();
        }}
        style={{ width: 560, maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="lead-contract-approval-submit-summary">
          <span>本次审批版本</span>
          <strong>{approvalVersion?.versionNo}</strong>
          <span>{approvalVersion?.label}</span>
        </div>
        <Form form={approvalForm} layout="vertical">
          <FormItem label="审批说明" field="note">
            <Input.TextArea
              placeholder="可补充本次提交审批的说明"
              rows={4}
              maxLength={500}
              showWordLimit
            />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={approvalDecision?.type === 'approve' ? '审批合同' : '拒绝合同审批'}
        visible={Boolean(approvalDecision)}
        onOk={handleApprovalDecision}
        onCancel={() => {
          setApprovalDecision(null);
          approvalDecisionForm.resetFields();
        }}
        style={{ width: 560, maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="lead-contract-approval-submit-summary">
          <span>当前审批版本</span>
          <strong>{approvalDecision?.version.versionNo}</strong>
          <span>{approvalDecision?.version.changeSummary || approvalDecision?.version.label}</span>
        </div>
        <Form form={approvalDecisionForm} layout="vertical">
          <FormItem
            label="审批意见"
            field="comment"
            rules={[{ required: true, message: '请输入审批意见' }]}
          >
            <Input.TextArea
              placeholder="请输入审批意见"
              rows={4}
              maxLength={500}
              showWordLimit
            />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="上传终稿归档"
        visible={archiveVisible}
        onOk={handleArchive}
        onCancel={() => {
          setArchiveVisible(false);
          archiveForm.resetFields();
        }}
        style={{ width: 620, maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="lead-contract-archive-version">
          <span>关联终稿</span>
          <strong>{contract?.approvedVersionNo}</strong>
          <span>归档文件与普通版本附件分开保存</span>
        </div>
        <Form form={archiveForm} layout="vertical">
          <FormItem
            label="归档文件"
            field="files"
            triggerPropName="fileList"
            rules={[{ required: true, message: '请上传归档文件' }]}
          >
            <Upload
              accept=".pdf,.doc,.docx"
              autoUpload={false}
              multiple
              limit={5}
              drag
              tip="支持 PDF、DOC、DOCX，最多 5 个文件"
            >
              <div className="lead-contract-version-upload">
                <IconUpload />
                <span>点击或拖拽终稿文件到此处上传</span>
              </div>
            </Upload>
          </FormItem>
          <FormItem label="归档备注" field="note">
            <Input.TextArea
              placeholder="可记录盖章情况、文件来源等信息"
              rows={3}
              maxLength={500}
              showWordLimit
            />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={`合同版本预览 ${previewVersion?.versionNo || ''}`}
        visible={Boolean(previewVersion)}
        footer={null}
        onCancel={() => setPreviewVersion(null)}
        style={{ width: 920, maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="lead-contract-version-preview">
          <div
            className="lead-contract-version-preview-document"
            dangerouslySetInnerHTML={{ __html: previewVersion?.renderedHtml || '' }}
          />
        </div>
      </Modal>

      <Modal
        title={`归档附件预览 ${previewArchiveFile?.fileName || ''}`}
        visible={Boolean(previewArchiveFile)}
        footer={null}
        onCancel={() => setPreviewArchiveFile(null)}
        style={{ width: 920, maxWidth: 'calc(100vw - 32px)' }}
      >
        {previewArchiveFile ? <ArchiveFilePreview file={previewArchiveFile} /> : null}
      </Modal>
    </>
  );
}

interface ContractVersionItemProps {
  contract: Contract;
  version: ContractVersion;
  rounds: ContractApprovalRound[];
  activeRound?: ContractApprovalRound;
  isLatest: boolean;
  expanded: boolean;
  expandedRoundIds: Set<string>;
  onToggle: () => void;
  onToggleRound: (roundId: string) => void;
  onPreview: (version: ContractVersion) => void;
  onEdit?: (version: ContractVersion) => void;
  onSubmitApproval: (version: ContractVersion) => void;
  onApprovalDecision?: (version: ContractVersion, type: 'approve' | 'reject') => void;
  onContractClick: (contractId: string) => void;
  hideChangeTypes: boolean;
  hideEmptyApprovalRecords: boolean;
  hideContractDetailAction: boolean;
  projectCompactVersionLayout: boolean;
  hideApprovalRecordsInDetail: boolean;
}

function ContractVersionItem({
  contract,
  version,
  rounds,
  activeRound,
  isLatest,
  expanded,
  expandedRoundIds,
  onToggle,
  onToggleRound,
  onPreview,
  onEdit,
  onSubmitApproval,
  onApprovalDecision,
  onContractClick,
  hideChangeTypes,
  hideEmptyApprovalRecords,
  hideContractDetailAction,
  projectCompactVersionLayout,
  hideApprovalRecordsInDetail,
}: ContractVersionItemProps) {
  const versionStatus = getVersionStatus(contract, version, rounds, projectCompactVersionLayout);
  const latestRound = rounds[0];
  const hasApprovalRecords = rounds.length > 0;
  const showDetailToggle = !projectCompactVersionLayout
    || (hasApprovalRecords && !hideApprovalRecordsInDetail);
  const canShowApprovalAction = !projectCompactVersionLayout || isLatest;
  const hasApprovedRound = rounds.some(round => round.status === 'approved');
  const canSubmit = contract.status !== 'voided'
    && version.versionNo !== contract.approvedVersionNo
    && !hasApprovedRound
    && !activeRound;
  const approvalLabel = latestRound?.status === 'rejected' ? '重新提交审批' : '提交审批';
  const isApprovingVersion = projectCompactVersionLayout
    && activeRound?.status === 'approving'
    && activeRound.versionNo === version.versionNo;
  const disabledApprovalTip = activeRound && activeRound.versionNo !== version.versionNo
    ? `${activeRound.versionNo} 正在审批中，审批结束后可提交其他版本`
    : '';

  return (
    <section className={`lead-contract-version-item${isLatest ? ' is-latest' : ''}`}>
      <div className="lead-contract-version-item-summary">
        <div className="lead-contract-version-item-head">
          <div>
            <div className="lead-contract-version-item-title">
              <strong>{version.versionNo}</strong>
              {isLatest ? <Tag color="arcoblue" size="small">最新版本</Tag> : null}
              {(!projectCompactVersionLayout || isLatest || versionStatus.label !== '未提交审批') && (
                <Tag color={versionStatus.color} size="small">{versionStatus.label}</Tag>
              )}
            </div>
            <p>{projectCompactVersionLayout ? (version.changeSummary || version.label) : version.label}</p>
          </div>
          <span>{projectCompactVersionLayout ? `修改时间：${version.createdAt}` : version.createdAt}</span>
        </div>

        <div className="lead-contract-version-item-meta">
          <span>修改人：{version.createdBy}</span>
          {!projectCompactVersionLayout && <span>合同附件：{version.attachments?.length || 0} 个</span>}
          {!projectCompactVersionLayout && (!hideEmptyApprovalRecords || hasApprovalRecords) && <span>审批记录：{rounds.length} 轮</span>}
        </div>

        {projectCompactVersionLayout && (
          <div className="lead-contract-version-summary-attachments">
            <ContractVersionAttachmentList attachments={version.attachments} />
          </div>
        )}

        <div className="lead-contract-version-item-actions">
          {onEdit && (!projectCompactVersionLayout || isLatest) ? (
            <Button size="small" icon={<IconEdit />} onClick={() => onEdit(version)}>
              编辑
            </Button>
          ) : (
            <Button size="small" icon={<IconEye />} onClick={() => onPreview(version)}>
              预览
            </Button>
          )}
          {isApprovingVersion ? (
            <>
              <Button type="primary" size="small" onClick={() => onApprovalDecision?.(version, 'approve')}>
                审批同意
              </Button>
              <Button status="danger" size="small" onClick={() => onApprovalDecision?.(version, 'reject')}>
                审批拒绝
              </Button>
            </>
          ) : canShowApprovalAction && canSubmit ? (
            <Button type="primary" size="small" onClick={() => onSubmitApproval(version)}>
              {approvalLabel}
            </Button>
          ) : canShowApprovalAction && disabledApprovalTip && !hasApprovedRound ? (
            <Tooltip content={disabledApprovalTip}>
              <span>
                <Button type="primary" size="small" disabled>提交审批</Button>
              </span>
            </Tooltip>
          ) : null}
          {showDetailToggle && (
            <button type="button" className="lead-contract-history-toggle" onClick={onToggle}>
              {expanded ? <IconDown /> : <IconRight />}
              {expanded ? '收起详情' : '展开详情'}
            </button>
          )}
        </div>
      </div>

      {expanded && showDetailToggle ? (
        <div className="lead-contract-version-item-detail">
          {!projectCompactVersionLayout && (
            <>
              <div className="lead-contract-version-detail-block">
                <h4>版本修改内容</h4>
                {!hideChangeTypes && (
                  <div className="lead-contract-version-change-types">
                    <span>修改类型</span>
                    <div>
                      {version.changeTypes?.length
                        ? version.changeTypes.map(type => <Tag key={type} size="small">{type}</Tag>)
                        : <span className="lead-contract-history-empty-text">-</span>}
                    </div>
                  </div>
                )}
                <div className="lead-contract-history-description">
                  <span>修改内容</span>
                  <p>{version.changeSummary || version.label}</p>
                </div>
              </div>

              <div className="lead-contract-version-detail-block">
                <div className="lead-contract-version-detail-title">
                  <h4>合同附件</h4>
                  <span>{version.attachments?.length || 0} 个文件</span>
                </div>
                <ContractVersionAttachmentList attachments={version.attachments} />
              </div>
            </>
          )}

          {!hideApprovalRecordsInDetail && (!hideEmptyApprovalRecords || rounds.length > 0) && (
            <div className="lead-contract-version-detail-block">
              <div className="lead-contract-version-detail-title">
                <h4>审批记录</h4>
                <span>{rounds.length} 轮</span>
              </div>
              {rounds.length ? (
                <div className="lead-contract-approval-round-list">
                  {rounds.map(round => (
                    <ApprovalRoundItem
                      key={round.id}
                      round={round}
                      expanded={expandedRoundIds.has(round.id)}
                      onToggle={() => onToggleRound(round.id)}
                      includeApprovingStep={projectCompactVersionLayout}
                    />
                  ))}
                </div>
              ) : (
                <div className="lead-contract-history-empty-line">该版本尚未提交审批</div>
              )}
            </div>
          )}

          {!hideContractDetailAction && (
            <div className="lead-contract-history-detail-actions">
              <Button type="text" size="small" onClick={() => onContractClick(contract.id)}>
                查看合同详情
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ContractVersionAttachmentList({ attachments }: { attachments?: ContractVersion['attachments'] }) {
  if (!attachments?.length) {
    return <div className="lead-contract-history-empty-line">该版本未上传合同附件</div>;
  }

  return (
    <div className="lead-contract-history-files">
      {attachments.map(file => (
        <div key={file.id}>
          <span className="lead-contract-history-file-icon"><IconFile /></span>
          <div>
            <strong>{file.name}</strong>
            <span>{file.size}</span>
          </div>
          <Tooltip content="下载合同文件">
            <Button
              type="text"
              size="small"
              icon={<IconDownload />}
              aria-label="下载合同文件"
              onClick={() => downloadAttachment(file)}
            />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

function ContractApprovalOverview({
  rounds,
  includeApprovingStep = false,
  generalManagerOnly = false,
}: {
  rounds: ContractApprovalRound[];
  includeApprovingStep?: boolean;
  generalManagerOnly?: boolean;
}) {
  const sortedRounds = [...rounds].sort((left, right) => right.roundNo - left.roundNo);

  return (
    <section className="lead-contract-approval-overview">
      <div className="lead-contract-approval-overview-heading">
        <div>
          <strong>审批记录</strong>
          <span>共 {sortedRounds.length} 轮</span>
        </div>
        <Tag color={getRoundStatusColor(sortedRounds[0].status)} size="small">
          {getRoundStatusLabel(sortedRounds[0], includeApprovingStep)}
        </Tag>
      </div>

      <div className="lead-contract-approval-overview-rounds">
        {sortedRounds.map(round => {
          const lastProcessedNode = [...round.nodes]
            .reverse()
            .find(node => node.status !== 'pending') || round.nodes[round.nodes.length - 1];
          const nodes = generalManagerOnly
            ? [{
                step: '发起申请' as const,
                approver: round.submittedBy,
                status: 'approved' as const,
                time: round.submittedAt,
                comment: '',
              }, {
                step: '总经理审批' as const,
                approver: '赵总 - 总经理',
                status: round.status === 'approved'
                  ? 'approved' as const
                  : round.status === 'rejected'
                    ? 'rejected' as const
                    : 'pending' as const,
                time: round.updatedAt || lastProcessedNode?.time || '',
                comment: lastProcessedNode?.comment || '',
              }]
            : round.nodes;

          return (
          <div key={round.id} className="lead-contract-approval-overview-round">
            <div className="lead-contract-approval-overview-round-head">
              <div>
                <strong>第 {round.roundNo} 轮 · {round.versionNo}</strong>
                <Tag color={getRoundStatusColor(round.status)} size="small">
                  {getRoundStatusLabel(round, includeApprovingStep)}
                </Tag>
              </div>
              <span>{round.updatedAt || round.submittedAt}</span>
            </div>
            <div className="lead-contract-approval-overview-track">
              {nodes.map((node, index) => (
                <div
                  key={`${round.id}-${node.step}-${index}`}
                  className={`lead-contract-approval-overview-node is-${node.status}`}
                >
                  <span className="lead-contract-approval-overview-node-dot" />
                  <strong>{generalManagerOnly
                    ? node.step === '发起申请'
                      ? '提交审批'
                      : node.status === 'approved'
                        ? '审批通过'
                        : node.status === 'rejected'
                          ? '审批驳回'
                          : '等待审批'
                    : node.step}</strong>
                  <Tag color={getNodeStatusColor(node.status)} size="small">
                    {getNodeStatusLabel(node)}
                  </Tag>
                  <small>{node.approver || '-'}</small>
                  <time>{node.time || '-'}</time>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function ApprovalRoundItem({
  round,
  expanded,
  onToggle,
  includeApprovingStep = false,
}: {
  round: ContractApprovalRound;
  expanded: boolean;
  onToggle: () => void;
  includeApprovingStep?: boolean;
}) {
  const sortedNodes = getSortedApprovalNodes(round);
  const rejectedNode = sortedNodes.find(node => node.status === 'rejected');

  return (
    <section className={`lead-contract-approval-round is-${round.status}`}>
      <button type="button" className="lead-contract-approval-round-summary" onClick={onToggle}>
        <span className="lead-contract-approval-round-arrow">
          {expanded ? <IconDown /> : <IconRight />}
        </span>
        <span className="lead-contract-approval-round-main">
          <span>
            <strong>第 {round.roundNo} 轮审批</strong>
            <Tag color={getRoundStatusColor(round.status)} size="small">
              {getRoundStatusLabel(round, includeApprovingStep)}
            </Tag>
          </span>
          <small>
            {round.status === 'rejected'
              ? rejectedNode?.comment || '合同审批已驳回'
              : round.status === 'withdrawn'
                ? '因创建新版本，本轮审批已撤回'
                : `${round.submittedBy} 于 ${round.submittedAt} 提交`}
          </small>
        </span>
        <span className="lead-contract-approval-round-time">{round.updatedAt}</span>
      </button>

      {expanded ? (
        <div className="lead-contract-approval-node-list">
          {sortedNodes.map((node, index) => (
            <div
              key={`${round.id}-${node.step}-${index}`}
              className={`lead-contract-approval-node is-${node.status}`}
            >
              <span className="lead-contract-approval-node-dot" />
              <div>
                <div className="lead-contract-approval-node-title">
                  <strong>{node.step}</strong>
                  <Tag color={getNodeStatusColor(node.status)} size="small">
                    {getNodeStatusLabel(node)}
                  </Tag>
                </div>
                <div className="lead-contract-approval-node-meta">
                  <span>{node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}</span>
                  <span>操作时间：{node.time || '-'}</span>
                </div>
                {node.comment ? (
                  <div className={`lead-contract-approval-node-comment${node.status === 'rejected' ? ' is-rejected' : ''}`}>
                    <span>{node.status === 'rejected' ? '驳回原因' : '审批意见'}</span>
                    <p>{node.comment}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FinalContractArchive({
  contract,
  entries,
  isLeading = false,
  hideFinalVersionInfo = false,
  onUpload,
  onPreviewFile,
}: {
  contract: Contract;
  entries: Contract['archivedScans'];
  isLeading?: boolean;
  hideFinalVersionInfo?: boolean;
  onUpload: () => void;
  onPreviewFile: (file: ScanFile) => void;
}) {
  return (
    <section className={`lead-contract-final-archive${isLeading ? ' is-leading' : ''}`}>
      <div className="lead-contract-final-archive-head">
        <div>
          <strong>合同归档</strong>
          <span>终稿文件与归档记录</span>
        </div>
        {contract.approvedVersionNo && contract.status !== 'voided' ? (
          <Button size="small" icon={<IconUpload />} onClick={onUpload}>
            {entries.length ? '补充归档' : '上传归档'}
          </Button>
        ) : null}
      </div>

      {!contract.approvedVersionNo ? (
        <div className="lead-contract-final-archive-empty">
          <Empty description="合同审批通过并形成终稿后可上传归档" />
        </div>
      ) : (
        <>
          {!hideFinalVersionInfo ? (
            <div className="lead-contract-final-version-info">
              <span>当前终稿</span>
              <strong>{contract.approvedVersionNo}</strong>
              <span>{contract.approvedAt ? `审批通过于 ${contract.approvedAt}` : '已审批通过'}</span>
            </div>
          ) : null}
          {entries.length ? (
            <div className="lead-contract-archive-entry-list">
              {entries.map(entry => (
                <article key={entry.id} className="lead-contract-archive-entry">
                  <div className="lead-contract-archive-entry-head">
                    <div>
                      <strong>{entry.linkedVersionNo} 归档</strong>
                      {entry.linkedVersionNo === contract.approvedVersionNo ? (
                        <Tag color="green" size="small">当前终稿</Tag>
                      ) : null}
                      {entry.isPrimary ? <Tag color="arcoblue" size="small">主归档</Tag> : null}
                    </div>
                    <span>{entry.uploadedAt}</span>
                  </div>
                  <div className="lead-contract-archive-entry-meta">
                    <span>上传人：{entry.uploadedBy}</span>
                    {entry.note ? <span>备注：{entry.note}</span> : null}
                  </div>
                  <div className="lead-contract-history-files">
                    {entry.files.map(file => (
                      <div key={file.id}>
                        <span className="lead-contract-history-file-icon"><IconFile /></span>
                        <div>
                          <strong>{file.fileName}</strong>
                          <span>{formatFileSize(file.fileSize)}</span>
                        </div>
                        <Tooltip content="预览归档文件">
                          <Button
                            type="text"
                            size="small"
                            icon={<IconEye />}
                            aria-label="预览归档文件"
                            onClick={() => onPreviewFile(file)}
                          />
                        </Tooltip>
                        <Tooltip content="下载归档文件">
                          <Button
                            type="text"
                            size="small"
                            icon={<IconDownload />}
                            aria-label="下载归档文件"
                            onClick={() => downloadAttachment({
                              name: file.fileName,
                              url: file.blobUrl,
                            })}
                          />
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="lead-contract-history-empty-line">当前终稿尚未上传归档文件</div>
          )}
        </>
      )}
    </section>
  );
}

function ArchiveFilePreview({ file }: { file: ScanFile }) {
  const fileName = file.fileName.toLowerCase();
  const canPreviewPdf = Boolean(file.blobUrl)
    && (file.mimeType === 'application/pdf' || fileName.endsWith('.pdf'));

  if (canPreviewPdf) {
    return (
      <div className="lead-contract-archive-preview">
        <iframe
          title={file.fileName}
          src={file.blobUrl}
          className="lead-contract-archive-preview-frame"
        />
      </div>
    );
  }

  return (
    <div className="lead-contract-archive-preview-empty">
      <Empty
        description={
          file.blobUrl
            ? '该文件类型当前不支持直接在线预览，可下载后查看。'
            : '演示数据暂无可用预览文件，真实环境中将从文件服务读取。'
        }
      />
      <div className="lead-contract-archive-preview-meta">
        <span>文件名称：{file.fileName}</span>
        <span>文件大小：{formatFileSize(file.fileSize)}</span>
        <span>上传人：{file.uploadedBy}</span>
        <span>上传时间：{file.uploadedAt}</span>
      </div>
    </div>
  );
}
