import { useMemo, useState } from 'react';
import {
  Button,
  Message,
  Space,
  Tag,
} from '@arco-design/web-react';
import {
  IconDown,
  IconDownload,
  IconEye,
  IconFile,
  IconUp,
} from '@arco-design/web-react/icon';
import type { Contract, ContractVersion } from '../../contracts/types';
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL } from '../../contracts/utils';
import { renderContractDocument } from '../../contracts/templates';
import { DocumentViewerModal } from '@/app/components/ui';
import './LeadFinalContractPanel.css';

interface LeadFinalContractPanelProps {
  contract: Contract;
  hideInfoItems?: boolean;
  projectLayout?: boolean;
  projectFullInfo?: boolean;
  defaultCollapsed?: boolean;
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

function getFinalVersion(contract: Contract): ContractVersion {
  const savedVersion = contract.versionHistory.find(
    version => version.versionNo === contract.approvedVersionNo,
  ) ?? contract.versionHistory[contract.versionHistory.length - 1];
  if (savedVersion) return savedVersion;

  return {
    versionNo: '当前版',
    formData: contract.current,
    renderedHtml: contract.current.customContractHtml || renderContractDocument(contract.current),
    label: '当前合同内容',
    createdAt: contract.updatedAt,
    createdBy: contract.createdBy,
  };
}

function getExecutionStatusColor(contract: Contract) {
  if (contract.executionStatus === '履行中') return 'green';
  if (contract.executionStatus === '已完成') return 'arcoblue';
  if (contract.executionStatus === '已终止') return 'red';
  return CONTRACT_STATUS_COLOR[contract.status];
}

function getExecutionStatusLabel(contract: Contract) {
  return contract.executionStatus ?? CONTRACT_STATUS_LABEL[contract.status];
}

function buildWordDocument(version: ContractVersion) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${version.formData.contractName}</title>
  <style>
    body { font-family: "Microsoft YaHei", "SimSun", sans-serif; line-height: 1.8; color: var(--grey-900); }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid var(--grey-300); padding: 8px; }
    img { max-width: 100%; }
  </style>
</head>
<body>${version.renderedHtml}</body>
</html>`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-');
}

export function LeadFinalContractPanel({
  contract,
  hideInfoItems = false,
  projectLayout = false,
  projectFullInfo = false,
  defaultCollapsed = false,
}: LeadFinalContractPanelProps) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(!defaultCollapsed);
  const finalVersion = useMemo(() => getFinalVersion(contract), [contract]);

  const data = finalVersion.formData;
  const versionLabel = contract.approvedVersionNo ? '已审批最终版' : '最新版本';
  const onlineFileName = `${sanitizeFileName(data.contractName || contract.contractNo)}-${finalVersion.versionNo}.doc`;
  const onlineDownloadHref = `data:application/msword;charset=utf-8,${encodeURIComponent(
    `\ufeff${buildWordDocument(finalVersion)}`,
  )}`;
  const uploadedWord = contract.uploadedWordContract;
  const fileName = uploadedWord?.fileName || onlineFileName;
  const downloadHref = uploadedWord?.blobUrl || onlineDownloadHref;
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = downloadHref;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    Message.success('合同文件已开始下载');
  };
  const infoItems = [
    { label: '合同编号', value: contract.contractNo },
    { label: '合同金额', value: formatCurrency(data.totalAmount) },
    { label: '合同主体', value: data.customerName || '-' },
    { label: '签约主体', value: data.signingEntity || '-' },
    { label: '签约日期', value: data.signDate || '-' },
    {
      label: '合同周期',
      value: data.effectiveDate && data.endDate
        ? `${data.effectiveDate} 至 ${data.endDate}`
        : data.effectiveDate || data.endDate || '-',
    },
    { label: '付款方式', value: data.paymentMethod || '-' },
    { label: '签约人', value: data.customerContact || '-' },
    { label: '联系电话', value: data.customerPhone || '-' },
    { label: '审批通过时间', value: contract.approvedAt || '-' },
  ];
  const projectInfoColumns = [
    [
      { label: '合同编号', value: contract.contractNo },
      { label: '签约主体', value: data.signingEntity || '-' },
      { label: '产品类别', value: data.productCategory || '-' },
      { label: '付款方式', value: data.paymentMethod || '-' },
      { label: '签约日期', value: data.signDate || '-' },
      { label: '审批通过时间', value: contract.approvedAt || '-' },
    ],
    [
      { label: '公司名称', value: data.customerName || '-' },
      { label: '联系人', value: data.customerContact || '-' },
      { label: '联系电话', value: data.customerPhone || '-' },
      { label: '通讯地址', value: data.customerAddress || '-' },
      { label: '税务登记号', value: data.customerTaxNo || '-' },
      { label: '开户银行*账号', value: [data.bankName, data.bankAccount].filter(Boolean).join(' · ') || '-' },
    ],
  ];
  const projectFullInfoColumns = [
    [
      { label: '合同编号', value: contract.contractNo },
      { label: '签约主体', value: data.signingEntity || '-' },
      { label: '我方税务登记号', value: data.signingEntityTaxNo || '-' },
      { label: '签约人', value: data.signingPerson || '-' },
      { label: '我方联系电话', value: data.signingEntityPhone || '-' },
      { label: '我方通讯地址', value: data.signingEntityAddress || '-' },
      { label: '我方电子邮箱', value: data.signingEntityEmail || '-' },
      { label: '我方邮政编码', value: data.signingEntityPostalCode || '-' },
      { label: '产品类别', value: data.productCategory || '-' },
      { label: '付款方式', value: data.paymentMethod || '-' },
      { label: '签约日期', value: data.signDate || '-' },
      { label: '审批通过时间', value: contract.approvedAt || '-' },
    ],
    [
      { label: '公司名称', value: data.customerName || '-' },
      { label: '客户税务登记号', value: data.customerTaxNo || '-' },
      { label: '联系人', value: data.customerContact || '-' },
      { label: '联系电话', value: data.customerPhone || '-' },
      { label: '电子邮箱', value: data.customerEmail || '-' },
      { label: '通讯地址', value: data.customerAddress || '-' },
      { label: '邮政编码', value: data.customerPostalCode || '-' },
      { label: '开户银行*账号', value: [data.bankName, data.bankAccount].filter(Boolean).join(' · ') || '-' },
    ],
  ];
  const projectSummaryItems = [
    { label: '合同编号', value: contract.contractNo },
    { label: '公司名称', value: data.customerName || '-' },
    { label: '签约主体', value: data.signingEntity || '-' },
    { label: '签约日期', value: data.signDate || '-' },
  ];
  const detailsId = `contract-details-${contract.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <div className="lead-final-contract">
      <div className={`lead-final-contract-header${projectLayout ? ' is-project-layout' : ''}`}>
        <div className="lead-final-contract-heading">
          <div className="lead-final-contract-heading-content">
            <div className="lead-final-contract-title-row">
              <h3>{data.contractName || '未命名合同'}</h3>
              <Tag color={getExecutionStatusColor(contract)}>
                {getExecutionStatusLabel(contract)}
              </Tag>
            </div>
            <div className="lead-final-contract-version">
              {projectLayout ? (
                <>
                  {finalVersion.versionNo}
                  <span>·</span>
                  {data.customerContact || '-'}
                </>
              ) : (
                <>
                  {versionLabel} {finalVersion.versionNo}
                  <span>·</span>
                  {finalVersion.createdAt}
                  <span>·</span>
                  {finalVersion.createdBy}
                </>
              )}
            </div>
          </div>
        </div>
        {projectLayout ? (
          <div className="lead-final-contract-header-actions">
            <strong className="lead-final-contract-project-amount">{formatCurrency(data.totalAmount)}</strong>
            {defaultCollapsed && (
              <>
                <Button size="small" icon={<IconEye />} onClick={() => setPreviewVisible(true)}>查看合同</Button>
                <Button size="small" icon={<IconDownload />} onClick={handleDownload}>下载合同</Button>
                <Button
                  type="text"
                  size="small"
                  className="lead-final-contract-toggle"
                  icon={detailsExpanded ? <IconUp /> : <IconDown />}
                  aria-expanded={detailsExpanded}
                  aria-controls={detailsId}
                  onClick={() => setDetailsExpanded((expanded) => !expanded)}
                >
                  {detailsExpanded ? '收起' : '展开'}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {defaultCollapsed && !detailsExpanded ? (
        <div className="lead-final-contract-summary-grid">
          {projectSummaryItems.map((item) => (
            <div className="lead-final-contract-summary-item" key={item.label}>
              <span>{item.label}</span>
              <strong title={item.value}>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {detailsExpanded && (
        <div id={detailsId} className="lead-final-contract-details">
          {!hideInfoItems ? (
            <div className={`lead-final-contract-info-grid${projectLayout ? ' is-project-layout' : ''}`}>
              {projectLayout ? (projectFullInfo ? projectFullInfoColumns : projectInfoColumns).map((column, columnIndex) => (
                <div className="lead-final-contract-info-column" key={columnIndex}>
                  {column.map(item => (
                    <div className="lead-final-contract-info-item" key={item.label}>
                      <span className="lead-final-contract-info-label">{item.label}：</span>
                      <span className="lead-final-contract-info-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )) : infoItems.map(item => (
                <div className="lead-final-contract-info-item" key={item.label}>
                  <span className="lead-final-contract-info-label">{item.label}：</span>
                  <span className="lead-final-contract-info-value">{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="lead-final-contract-file">
            <div className="lead-final-contract-file-main">
              <span className="lead-final-contract-file-icon"><IconFile /></span>
              <div className="lead-final-contract-file-content">
                <div className="lead-final-contract-file-name">{fileName}</div>
                <div className="lead-final-contract-file-meta">
                  {uploadedWord
                    ? `Word 上传版·${uploadedWord.uploadedAt}·${uploadedWord.uploadedBy}`
                    : `在线编辑版·${finalVersion.versionNo}·${versionLabel}`}
                </div>
              </div>
            </div>
            {!defaultCollapsed && (
              <Space size="small" className="lead-final-contract-file-actions">
                <Button type="primary" icon={<IconEye />} onClick={() => setPreviewVisible(true)}>在线查看合同</Button>
                <Button
                  icon={<IconDownload />}
                  onClick={handleDownload}
                >
                  下载合同
                </Button>
              </Space>
            )}
          </div>
        </div>
      )}

      <DocumentViewerModal
        visible={previewVisible}
        title={`${data.contractName || contract.contractNo} · ${finalVersion.versionNo}`}
        html={finalVersion.renderedHtml}
        onClose={() => setPreviewVisible(false)}
        onDownload={handleDownload}
      />
    </div>
  );
}
