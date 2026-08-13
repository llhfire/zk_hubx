import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  InputTag,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Upload,
} from '@arco-design/web-react';
import { IconCopy, IconDelete, IconEdit, IconFile, IconPlus, IconUpload } from '@arco-design/web-react/icon';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import type { Contract, ContractVersion } from '../contracts/types';
import {
  downloadAttachment,
  mapUploadFilesToAttachments,
  type ContractModAttachment,
} from '../contracts/contractModification';
import { DocumentUploadPanel } from '../contracts/components/DocumentUploadPanel';
import { useEmployee } from '../employee';
import { CURRENT_LOGIN_USER } from '../../currentUser';
import { findLeadContext } from '../contracts/leadContextMock';
import { LeadContractHistoryPanel } from '../leads/components/LeadContractHistoryPanel';
import { LeadFinalContractPanel } from '../leads/components/LeadFinalContractPanel';
import { LeadPaymentInvoicePanel } from '../leads/components/LeadPaymentInvoicePanel';
import { LeadQuotationHistoryPanel } from '../leads/components/LeadQuotationHistoryPanel';
import { getLeadDetailProfile, type LeadQuotationItem } from '../leads/leadDetailProfiles';
import { calculateQuotationAmount, calculateQuotationAmountByFixed, calculateUpliftRate } from '../leads/quotationPricing';
import {
  QuotationDocumentPreviewModal,
  type GeneratedQuotationDocument,
  type QuotationDocumentData,
} from '../leads/components/QuotationDocumentPreviewModal';
import {
  ProjectQuotationConfigurator,
} from './ProjectQuotationConfigurator';
import {
  QuotationSummaryReport,
  createQuotationSummaryImageUrl,
  createQuotationSystemRecordFileName,
} from './QuotationSummaryReport';
import type { ProjectQuotationConfig, ProjectQuotationSummary } from './projectQuotationConfigModel';
import { getQuotationLaborDetails } from './projectQuotationConfigModel';
import type {
  Project,
  ProjectDailyReport,
  ProjectFollowUp,
  ProjectMemberHours,
} from './mockData';
import { ProjectTaskPanel } from './ProjectTaskPanel';
import { ProjectCostPanel } from './ProjectCostPanel';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const { Text, Title } = Typography;

function MeetingMinutesText({ children }: { children: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (expanded) return;
    const content = contentRef.current;
    if (!content) return;
    const updateOverflow = () => setOverflowing(content.scrollHeight > content.clientHeight + 1);
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(content);
    return () => observer.disconnect();
  }, [children, expanded]);

  return <div className="project-meeting-minutes-wrap">
    <div ref={contentRef} className={`project-meeting-minutes${expanded ? ' is-expanded' : ''}`}>{children}</div>
    {(overflowing || expanded) && <Button type="text" size="mini" className="project-meeting-minutes-toggle" onClick={() => setExpanded(current => !current)}>{expanded ? '收起' : '展开'}</Button>}
  </div>;
}

function displayProjectLeadValue(value: string | number | null | undefined) {
  if (value == null || String(value).trim() === '') return '-';
  return value;
}

function currentHalfHourText() {
  const date = new Date();
  date.setMinutes(date.getMinutes() < 30 ? 0 : 30, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface ApprovalNode {
  step: string;
  approver: string;
  status: string;
  time: string;
  comment: string;
}

interface TravelApplication {
  id: string;
  applicant: string;
  department: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: string;
  estimatedCost: string;
  purpose: string;
  status: string;
  createTime: string;
  approvalFlow: ApprovalNode[];
}

interface ReimbursementApplication {
  id: string;
  applicant: string;
  department: string;
  expenseType: string;
  invoiceAmount: string;
  reimbursementAmount: string;
  invoiceTitle: string;
  taxNumber: string;
  invoiceType: string;
  attachments: Array<{ id: string; name: string; size: string }>;
  status: string;
  createTime: string;
  approvalFlow: ApprovalNode[];
}

interface ProjectMeetingRecord {
  id: string;
  subject: string;
  meetingTime: string;
  employeeAttendees: string[];
  externalAttendees: string[];
  minutes: string;
  recordings: ContractModAttachment[];
  materials: ContractModAttachment[];
  recorder: string;
}

const INITIAL_PROJECT_MEETINGS: ProjectMeetingRecord[] = [
  {
    id: 'meeting-2026-07-18',
    subject: '项目验收范围确认会',
    meetingTime: '2026-07-18 15:00',
    employeeAttendees: ['王五', '张三', '赵六'],
    externalAttendees: ['客户产品负责人刘总', '客户技术负责人陈工'],
    minutes: '确认本期验收范围与上线时间。客户侧于 7 月 22 日前完成验收账号准备，项目组同步补充验收清单与操作说明。',
    recordings: [],
    materials: [],
    recorder: '王五',
  },
  {
    id: 'meeting-2026-06-12',
    subject: '小程序需求评审会',
    meetingTime: '2026-06-12 10:30',
    employeeAttendees: ['王五', '李四'],
    externalAttendees: ['客户项目经理周经理'],
    minutes: '完成核心业务流程评审，确认首页、商品详情和订单流程的交互方案；新增会员积分展示需求，纳入本期开发计划。',
    recordings: [],
    materials: [],
    recorder: '王五',
  },
];

type ConfirmationType =
  | '原型确认书'
  | 'UI 确认书'
  | '需求变更确认书'
  | '增项确认书'
  | '验收单';

interface ConfirmationRecord {
  id: string;
  name: string;
  type: ConfirmationType;
  uploader: string;
  uploadTime: string;
  description: string;
  attachments: ContractModAttachment[];
}

interface DemoItem {
  id: string;
  name: string;
  url: string;
  type: string;
  htmlFile?: string;
  cssFile?: string;
  jsFile?: string;
}

interface DemoRecord {
  id: string;
  uploader: string;
  uploadTime: string;
  description: string;
  demos: DemoItem[];
}

interface DemoDraft {
  id: string;
  type: string;
  htmlFiles: UploadItem[];
  cssFiles: UploadItem[];
  jsFiles: UploadItem[];
}

type TeamParticipationStatus = '参与中' | '待加入' | '已退出';

export interface ProjectTeamRow {
  id: string;
  role: string;
  members: string[];
  plannedPeople: number;
  responsibility: string;
  allocation: number;
  status: TeamParticipationStatus;
}

interface Props {
  project: Project;
  contract?: Contract;
  hasPlan: boolean;
  followUps: ProjectFollowUp[];
  memberHours: ProjectMemberHours[];
  totalHours: number;
  dailyReports: ProjectDailyReport[];
  travelApplications: TravelApplication[];
  reimbursementApplications: ReimbursementApplication[];
  onAddFollowUp: () => void;
  onSelectContract: () => void;
  onUnlinkContract: () => void;
  onOpenContract: (contractId: string) => void;
  onEditContractVersion: (version: ContractVersion) => void;
}

const CONFIRMATION_TYPE_OPTIONS: ConfirmationType[] = [
  '原型确认书',
  'UI 确认书',
  '需求变更确认书',
  '增项确认书',
  '验收单',
];

const CONFIRMATION_TYPE_MOCK: Record<ConfirmationType, { name: string; description: string }> = {
  原型确认书: {
    name: 'CRM 系统原型确认书',
    description: '客户已确认核心业务流程原型，包含线索、报价、合同主流程页面。',
  },
  'UI 确认书': {
    name: 'CRM 首页 UI 确认书',
    description: '客户已确认首页及列表页视觉稿，无修改意见，可进入开发。',
  },
  需求变更确认书: {
    name: '月度报表需求变更确认书',
    description: '客户确认新增月度统计报表需求，预计增加工作量 3 人天。',
  },
  增项确认书: {
    name: '微信扫码登录增项确认书',
    description: '客户确认增加微信扫码登录能力，费用与工期已双方确认。',
  },
  验收单: {
    name: '一期功能验收单',
    description: '一期交付功能已完成验收，验收结论为通过。',
  },
};

const INITIAL_CONFIRMATIONS: ConfirmationRecord[] = [
  {
    id: 'confirm-1',
    type: '原型确认书',
    name: CONFIRMATION_TYPE_MOCK['原型确认书'].name,
    uploader: '张三',
    uploadTime: '2026-04-10 14:20',
    description: CONFIRMATION_TYPE_MOCK['原型确认书'].description,
    attachments: [
      { id: 'confirm-a1', name: '原型确认书.pdf', size: '1.2MB' },
      { id: 'confirm-a2', name: '原型截图.zip', size: '3.6MB' },
    ],
  },
  {
    id: 'confirm-2',
    type: 'UI 确认书',
    name: CONFIRMATION_TYPE_MOCK['UI 确认书'].name,
    uploader: '李四',
    uploadTime: '2026-04-12 11:05',
    description: CONFIRMATION_TYPE_MOCK['UI 确认书'].description,
    attachments: [
      { id: 'confirm-a3', name: 'UI确认书.pdf', size: '980KB' },
      { id: 'confirm-a4', name: '首页设计稿.png', size: '1.5MB' },
    ],
  },
  {
    id: 'confirm-3',
    type: '需求变更确认书',
    name: CONFIRMATION_TYPE_MOCK['需求变更确认书'].name,
    uploader: '张三',
    uploadTime: '2026-04-15 16:40',
    description: CONFIRMATION_TYPE_MOCK['需求变更确认书'].description,
    attachments: [
      { id: 'confirm-a5', name: '需求变更确认书.pdf', size: '760KB' },
    ],
  },
  {
    id: 'confirm-4',
    type: '增项确认书',
    name: CONFIRMATION_TYPE_MOCK['增项确认书'].name,
    uploader: '王五',
    uploadTime: '2026-04-18 09:30',
    description: CONFIRMATION_TYPE_MOCK['增项确认书'].description,
    attachments: [
      { id: 'confirm-a6', name: '增项确认书.pdf', size: '640KB' },
      { id: 'confirm-a7', name: '增项费用明细.xlsx', size: '128KB' },
    ],
  },
  {
    id: 'confirm-5',
    type: '验收单',
    name: CONFIRMATION_TYPE_MOCK['验收单'].name,
    uploader: '张三',
    uploadTime: '2026-04-22 17:15',
    description: CONFIRMATION_TYPE_MOCK['验收单'].description,
    attachments: [
      { id: 'confirm-a8', name: '一期功能验收单.pdf', size: '1.1MB' },
    ],
  },
];

function nowText() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function createDemoDraft(): DemoDraft {
  return {
    id: `demo-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: '',
    htmlFiles: [],
    cssFiles: [],
    jsFiles: [],
  };
}

function getDemoPreviewUrl(draftId: string) {
  return `https://demo.hubx.local/preview/${draftId.replace('demo-draft-', '')}`;
}

function getUploadFileName(files: UploadItem[]) {
  return files[0]?.name || files[0]?.originFile?.name || '';
}

function copyDemoPreviewUrl(url: string) {
  const copyFallback = () => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    Message.success('演示网址已复制');
  };

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => Message.success('演示网址已复制'),
      copyFallback,
    );
  } else {
    copyFallback();
  }
}

function ConfirmationPanel() {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [records, setRecords] = useState<ConfirmationRecord[]>(INITIAL_CONFIRMATIONS);

  const closeModal = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleTypeChange = (type: ConfirmationType) => {
    const mock = CONFIRMATION_TYPE_MOCK[type];
    form.setFieldsValue({
      type,
      name: mock.name,
      description: mock.description,
    });
  };

  const submit = () => {
    form.validate().then(values => {
      const attachments = mapUploadFilesToAttachments(
        Array.isArray(values.attachments) ? values.attachments : [],
      );
      if (attachments.length === 0) {
        Message.warning('请至少上传一份附件');
        return;
      }

      setRecords(previous => [{
        id: `confirm-${Date.now()}`,
        name: values.name.trim(),
        type: values.type,
        uploader: '当前用户',
        uploadTime: nowText(),
        description: (values.description || '').trim(),
        attachments,
      }, ...previous]);
      Message.success('确认书已新增');
      closeModal();
    }).catch(() => {
      // 表单组件会展示字段校验信息。
    });
  };

  return (
    <>
      <Card
        bordered={false}
        extra={(
          <Button type="primary" size="small" icon={<IconPlus />} onClick={() => setModalVisible(true)}>
            新增确认书
          </Button>
        )}
      >
        {records.length === 0 ? (
          <Empty description="暂无确认书" />
        ) : (
          <Timeline>
            {records.map((record, index) => (
              <Timeline.Item
                key={record.id}
                dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}
              >
                <div style={{ marginBottom: 12, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>{record.name}</span>
                    <Tag color="arcoblue" size="small" style={{ flexShrink: 0 }}>{record.type}</Tag>
                  </div>
                  {record.description && (
                    <div style={{ color: 'var(--color-text-1)', lineHeight: '20px', marginBottom: 8 }}>
                      {record.description}
                    </div>
                  )}
                  {record.attachments.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {record.attachments.map(file => (
                          <div
                            key={file.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'var(--color-fill-2)',
                              borderRadius: 4,
                              fontSize: 13,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 500 }}>{file.name}</span>
                              <span style={{ marginLeft: 8, color: 'var(--color-text-3)', fontSize: 12 }}>
                                {file.size}
                              </span>
                            </div>
                            <Button type="text" size="mini" onClick={() => downloadAttachment(file)}>
                              下载
                            </Button>
                          </div>
                        ))}
                      </Space>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: '20px' }}>
                    <div>上传人：{record.uploader}</div>
                    <div>上传时间：{record.uploadTime}</div>
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      <Modal
        title="新增确认书"
        visible={modalVisible}
        onOk={submit}
        onCancel={closeModal}
        style={{ width: 680 }}
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          <FormItem label="确认书类型" field="type" rules={[{ required: true, message: '请选择确认书类型' }]}>
            <Select placeholder="请选择确认书类型" onChange={handleTypeChange}>
              {CONFIRMATION_TYPE_OPTIONS.map(type => (
                <Select.Option key={type} value={type}>{type}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="确认书名称" field="name" rules={[{ required: true, message: '请输入确认书名称' }]}>
            <Input placeholder="请输入确认书名称" />
          </FormItem>
          <FormItem label="说明" field="description">
            <Input.TextArea
              placeholder="请输入确认书说明（可选）"
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={1000}
              showWordLimit
            />
          </FormItem>
          <FormItem
            label="附件"
            field="attachments"
            triggerPropName="fileList"
            rules={[{ required: true, message: '请上传附件' }]}
          >
            <Upload
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
              multiple
              drag
              tip="支持上传文档、表格、图片、压缩包等附件，可多选"
            >
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                  点击或拖拽附件到此处上传
                </div>
              </div>
            </Upload>
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}

export function ProjectDemoPanel() {
  const [modalVisible, setModalVisible] = useState(false);
  const [demoDrafts, setDemoDrafts] = useState<DemoDraft[]>(() => [createDemoDraft()]);
  const [description, setDescription] = useState('');
  const [records, setRecords] = useState<DemoRecord[]>([
    {
      id: 'demo-1',
      uploader: '张三',
      uploadTime: '2026-04-12 10:20',
      description: '客户演示版前端页面和后台管理主流程。',
      demos: [
        {
          id: 'demo-1-app',
          name: '前端演示',
          url: 'https://demo.hubx.local/app-frontend',
          type: '前端',
          htmlFile: 'app-demo.html',
          cssFile: 'app-demo.css',
          jsFile: 'app-demo.js',
        },
        {
          id: 'demo-1-admin',
          name: '后台管理演示',
          url: 'https://demo.hubx.local/admin',
          type: '后台管理',
          htmlFile: 'admin-demo.html',
          cssFile: 'admin-demo.css',
          jsFile: 'admin-demo.js',
        },
      ],
    },
    {
      id: 'demo-2',
      uploader: '李四',
      uploadTime: '2026-04-13 15:40',
      description: '后台权限、合同和回款模块原型。',
      demos: [
        {
          id: 'demo-2-prototype',
          name: '原型演示',
          url: 'https://demo.hubx.local/admin-prototype',
          type: '原型',
          htmlFile: 'admin-prototype.html',
        },
      ],
    },
  ]);

  const closeModal = () => {
    setModalVisible(false);
    setDemoDrafts([createDemoDraft()]);
    setDescription('');
  };

  const updateDemoDraft = (draftId: string, updates: Partial<DemoDraft>) => {
    setDemoDrafts(current => current.map(draft => (
      draft.id === draftId ? { ...draft, ...updates } : draft
    )));
  };

  const removeDemoDraft = (draftId: string) => {
    setDemoDrafts(current => current.filter(draft => draft.id !== draftId));
  };

  const submit = () => {
    const incompleteDraft = demoDrafts.find(draft => !draft.type.trim() || !draft.htmlFiles.length);
    if (incompleteDraft) {
      Message.error(!incompleteDraft.type.trim() ? '请填写名称' : '请上传 HTML 文件');
      return;
    }

    const uploadTime = nowText();
    const recordId = `demo-${Date.now()}`;
    setRecords(previous => [
      {
        id: recordId,
        uploader: '当前用户',
        uploadTime,
        description: description.trim(),
        demos: demoDrafts.map((draft, index) => ({
          id: `${recordId}-${index}`,
          name: `${draft.type.trim()}演示`,
          url: getDemoPreviewUrl(draft.id),
          type: draft.type.trim(),
          htmlFile: getUploadFileName(draft.htmlFiles),
          cssFile: getUploadFileName(draft.cssFiles) || undefined,
          jsFile: getUploadFileName(draft.jsFiles) || undefined,
        })),
      },
      ...previous,
    ]);
    Message.success(`已新增 1 条上传记录，共 ${demoDrafts.length} 条演示`);
    closeModal();
  };

  return (
    <>
      <Card
        bordered={false}
        extra={<Button type="primary" size="small" icon={<IconPlus />} onClick={() => setModalVisible(true)}>新增记录</Button>}
      >
        {records.length === 0 ? (
          <Empty description="暂无演示记录" />
        ) : (
          <Timeline>
            {records.map((record, index) => (
              <Timeline.Item
                key={record.id}
                dotColor={index === 0 ? 'rgb(var(--primary-6))' : 'var(--color-border-2)'}
              >
                <div style={{ marginBottom: 12, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>
                      {record.uploader} 上传了演示
                    </span>
                    <Tag color="arcoblue" size="small" style={{ flexShrink: 0 }}>
                      共 {record.demos.length} 条
                    </Tag>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {record.demos.map((demo, demoIndex) => (
                      <div
                        key={demo.id}
                        style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 4, background: 'var(--color-fill-1)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>
                            {demoIndex + 1}. {demo.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, marginBottom: 6, fontSize: 13 }}>
                          <span style={{ flexShrink: 0, color: 'var(--color-text-3)' }}>演示网址：</span>
                          <a href={demo.url} target="_blank" rel="noreferrer" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {demo.url}
                          </a>
                          <Tooltip content="复制演示网址">
                            <Button
                              type="text"
                              size="mini"
                              icon={<IconCopy />}
                              aria-label={`复制${demo.name}网址`}
                              onClick={() => copyDemoPreviewUrl(demo.url)}
                            />
                          </Tooltip>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: '20px', wordBreak: 'break-all' }}>
                          HTML：{demo.htmlFile || '-'}
                          {demo.cssFile ? ` · CSS：${demo.cssFile}` : ''}
                          {demo.jsFile ? ` · JS：${demo.jsFile}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  {record.description && (
                    <div style={{ marginTop: 10, color: 'var(--color-text-2)', lineHeight: '20px' }}>
                      说明：{record.description}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-3)' }}>
                    上传时间：{record.uploadTime}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      <Modal
        title="新增演示记录"
        visible={modalVisible}
        onOk={submit}
        onCancel={closeModal}
        okText="确定"
        cancelText="取消"
        style={{ width: 820, maxWidth: 'calc(100vw - 32px)' }}
        maskClosable={false}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          {demoDrafts.map((draft, index) => {
            const previewUrl = getDemoPreviewUrl(draft.id);
            return (
              <section
                key={draft.id}
                style={{ padding: 16, border: '1px solid var(--color-border-2)', borderRadius: 4, background: 'var(--color-fill-1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <strong>演示记录 {index + 1}</strong>
                  {demoDrafts.length > 1 ? (
                    <Button type="text" size="mini" status="danger" icon={<IconDelete />} onClick={() => removeDemoDraft(draft.id)}>
                      删除记录
                    </Button>
                  ) : null}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, color: 'var(--color-text-2)', fontSize: 13 }}>
                    名称 <span style={{ color: 'rgb(var(--red-6))' }}>*</span>
                  </div>
                  <Input
                    value={draft.type}
                    placeholder="请输入名称，例如：后台管理、原型、测试环境"
                    maxLength={50}
                    onChange={type => updateDemoDraft(draft.id, { type })}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 10, color: 'var(--color-text-2)', fontSize: 13 }}>演示文件</div>
                  <Grid.Row gutter={12}>
                    <Grid.Col span={8}>
                      <div style={{ padding: 12, minHeight: 112, border: '1px dashed var(--color-border-2)', borderRadius: 4, background: 'var(--color-bg-1)' }}>
                        <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text-1)' }}>
                          HTML 文件 <span style={{ color: 'rgb(var(--red-6))' }}>*</span>
                        </div>
                        <Upload
                          autoUpload={false}
                          limit={1}
                          accept=".html,.htm,text/html"
                          fileList={draft.htmlFiles}
                          onChange={htmlFiles => updateDemoDraft(draft.id, { htmlFiles })}
                        >
                          <Button size="small" icon={<IconUpload />}>上传 HTML</Button>
                        </Upload>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <div style={{ padding: 12, minHeight: 112, border: '1px dashed var(--color-border-2)', borderRadius: 4, background: 'var(--color-bg-1)' }}>
                        <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text-1)' }}>CSS 文件</div>
                        <Upload
                          autoUpload={false}
                          limit={1}
                          accept=".css,text/css"
                          fileList={draft.cssFiles}
                          onChange={cssFiles => updateDemoDraft(draft.id, { cssFiles })}
                        >
                          <Button size="small" icon={<IconUpload />}>上传 CSS</Button>
                        </Upload>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <div style={{ padding: 12, minHeight: 112, border: '1px dashed var(--color-border-2)', borderRadius: 4, background: 'var(--color-bg-1)' }}>
                        <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text-1)' }}>JS 文件</div>
                        <Upload
                          autoUpload={false}
                          limit={1}
                          accept=".js,.mjs,application/javascript,text/javascript"
                          fileList={draft.jsFiles}
                          onChange={jsFiles => updateDemoDraft(draft.id, { jsFiles })}
                        >
                          <Button size="small" icon={<IconUpload />}>上传 JS</Button>
                        </Upload>
                      </div>
                    </Grid.Col>
                  </Grid.Row>
                  {draft.htmlFiles.length ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, minWidth: 0, color: 'rgb(var(--arcoblue-6))' }}>
                      <span style={{ flexShrink: 0, color: 'var(--color-text-2)', fontSize: 13 }}>演示网址：</span>
                      <Button
                        type="text"
                        size="mini"
                        icon={<IconCopy />}
                        style={{ minWidth: 0, padding: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title="点击复制演示网址"
                        onClick={() => copyDemoPreviewUrl(previewUrl)}
                      >
                        {previewUrl}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
          <div>
            <Button type="text" icon={<IconPlus />} onClick={() => setDemoDrafts(current => [...current, createDemoDraft()])}>
              添加记录
            </Button>
          </div>
          <div>
            <div style={{ marginBottom: 6, color: 'var(--color-text-2)', fontSize: 13 }}>说明</div>
            <Input.TextArea
              value={description}
              placeholder="请输入演示说明（可选）"
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={1000}
              showWordLimit
              onChange={setDescription}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

function ApprovalTimeline({ nodes }: { nodes: ApprovalNode[] }) {
  return (
    <div style={{ padding: 12, border: '1px solid var(--color-border-1)', borderRadius: 4, background: 'var(--color-bg-2)' }}>
      {nodes.map((node, index) => (
        <div key={`${node.step}-${index}`} style={{ position: 'relative', paddingLeft: 24 }}>
          {index < nodes.length - 1 && <div style={{ position: 'absolute', left: 7, top: 20, bottom: -8, width: 2, background: node.status === 'approved' ? 'rgb(var(--green-6))' : 'var(--color-border-2)' }} />}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: index < nodes.length - 1 ? 12 : 0 }}>
            <div style={{ position: 'absolute', left: 0, width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: node.status === 'approved' ? 'rgb(var(--green-6))' : node.status === 'pending' ? 'rgb(var(--orange-6))' : 'rgb(var(--red-6))', background: node.status === 'approved' ? 'rgb(var(--green-6))' : node.status === 'pending' ? 'rgb(var(--orange-6))' : 'rgb(var(--red-6))' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space size={8} wrap>
                <strong style={{ fontSize: 13 }}>{node.step}</strong>
                <Tag color={node.status === 'approved' ? 'green' : node.status === 'pending' ? 'orange' : 'red'} size="small">
                  {node.step === '发起申请' && node.status === 'approved' ? '已申请' : node.status === 'approved' ? '已通过' : node.status === 'pending' ? '待处理' : '已驳回'}
                </Tag>
              </Space>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-3)' }}>{node.step === '发起申请' ? '申请人' : '审批人'}：{node.approver}</div>
              {node.time && <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>操作时间：{node.time}</div>}
              {node.comment && <div style={{ marginTop: 4, fontSize: 12, color: node.status === 'rejected' ? 'rgb(var(--red-6))' : 'var(--color-text-3)' }}>意见：{node.comment}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TravelPanel({ items, onAdd }: { items: TravelApplication[]; onAdd: () => void }) {
  return (
    <Card bordered={false} extra={<Button type="primary" size="small" icon={<IconPlus />} onClick={onAdd}>新增出差</Button>}>
      <Space direction="vertical" style={{ width: '100%' }} size="medium">
        {items.map(item => (
          <div key={item.id} className="project-approval-card">
            <div className="project-approval-card-title"><strong>目的地：{item.destination}</strong><Tag color={item.status === '已审批' ? 'green' : 'orange'}>{item.status}</Tag></div>
            <div className="project-approval-metrics">
              <div><Text type="secondary">出差周期</Text><strong>{item.duration}</strong></div>
              <div><Text type="secondary">预估费用</Text><strong>¥{item.estimatedCost}</strong></div>
            </div>
            <div className="project-approval-details">
              <div>申请人：{item.applicant}</div><div>申请部门：{item.department}</div>
              <div>开始时间：{item.startDate}</div><div>结束时间：{item.endDate}</div>
              <div className="project-approval-detail-full">出差事由：{item.purpose}</div>
            </div>
            <div style={{ marginTop: 12, marginBottom: 12 }}><Text type="secondary">审批流程</Text><ApprovalTimeline nodes={item.approvalFlow} /></div>
            <Text type="secondary" style={{ fontSize: 12 }}>申请时间：{item.createTime}</Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}

function ReimbursementPanel({ items, onAdd }: { items: ReimbursementApplication[]; onAdd: () => void }) {
  return (
    <Card bordered={false} extra={<Button type="primary" size="small" icon={<IconPlus />} onClick={onAdd}>新增报销</Button>}>
      <Space direction="vertical" style={{ width: '100%' }} size="medium">
        {items.map(item => (
          <div key={item.id} className="project-approval-card">
            <div className="project-approval-card-title">
              <strong>费用类型：{item.expenseType}</strong>
              <Space size="mini"><Tag color={item.status === '已报销' ? 'green' : 'orange'}>{item.status}</Tag><Button type="text" size="mini" icon={<IconEdit />} /></Space>
            </div>
            <div className="project-approval-metrics">
              <div><Text type="secondary">开票金额</Text><strong>¥{item.invoiceAmount}</strong></div>
              <div><Text type="secondary">报销金额</Text><strong>¥{item.reimbursementAmount}</strong></div>
            </div>
            <div className="project-approval-details">
              <div>申请人：{item.applicant}</div><div>申请部门：{item.department}</div>
              <div>发票抬头：{item.invoiceTitle}</div><div>税号：{item.taxNumber}</div>
              <div className="project-approval-detail-full">发票类型：{item.invoiceType}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Text type="secondary">附件列表：</Text>
              <Space size="mini" wrap>{item.attachments.map(file => <Button key={file.id} type="text" size="mini" onClick={() => Message.info(`下载附件: ${file.name}`)}>{file.name} ({file.size})</Button>)}</Space>
            </div>
            <div style={{ marginTop: 12, marginBottom: 12 }}><Text type="secondary">审批流程</Text><ApprovalTimeline nodes={item.approvalFlow} /></div>
            <Text type="secondary" style={{ fontSize: 12 }}>申请时间：{item.createTime}</Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}

export function ProjectDetailWorkspace({
  project,
  contract,
  followUps,
  memberHours,
  totalHours,
  dailyReports,
  travelApplications,
  reimbursementApplications,
  onAddFollowUp,
  onSelectContract,
  onEditContractVersion,
  onOpenContract,
}: Props) {
  const { employees } = useEmployee();
  const [approvalType, setApprovalType] = useState<'travel' | 'reimbursement' | null>(null);
  const [approvalNo, setApprovalNo] = useState('');
  const [quotationConfigVisible, setQuotationConfigVisible] = useState(false);
  const [quotationModalVisible, setQuotationModalVisible] = useState(false);
  const [quotationDocumentVisible, setQuotationDocumentVisible] = useState(false);
  const [quotationDocumentData, setQuotationDocumentData] = useState<QuotationDocumentData | null>(null);
  const [quotationConfigSummary, setQuotationConfigSummary] = useState<ProjectQuotationSummary | null>(null);
  const [quotationConfigDraft, setQuotationConfigDraft] = useState<ProjectQuotationConfig | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<LeadQuotationItem | null>(null);
  const [quotationForm] = Form.useForm();
  const [teamForm] = Form.useForm();
  const [meetingForm] = Form.useForm();
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teamRows, setTeamRows] = useState<ProjectTeamRow[]>([]);
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [meetingRecords, setMeetingRecords] = useState<ProjectMeetingRecord[]>(INITIAL_PROJECT_MEETINGS);
  const activeEmployees = employees.filter(employee => employee.employmentStatus !== '已离职');

  const openMeetingModal = () => {
    meetingForm.resetFields();
    meetingForm.setFieldsValue({ meetingTime: currentHalfHourText(), employeeAttendees: [], externalAttendees: [] });
    setMeetingModalVisible(true);
  };

  const saveMeetingRecord = () => meetingForm.validate().then(values => {
    const recordings = ((values.recordings ?? []) as UploadItem[]).map(file => mapUploadFilesToAttachments([file])[0]);
    const materials = ((values.materials ?? []) as UploadItem[]).map(file => mapUploadFilesToAttachments([file])[0]);
    const next: ProjectMeetingRecord = {
      id: `meeting-${Date.now()}`,
      subject: values.subject.trim(),
      meetingTime: values.meetingTime.trim(),
      employeeAttendees: values.employeeAttendees ?? [],
      externalAttendees: values.externalAttendees ?? [],
      minutes: values.minutes.trim(),
      recordings,
      materials,
      recorder: CURRENT_LOGIN_USER.name,
    };
    setMeetingRecords(current => [next, ...current].sort((left, right) => right.meetingTime.localeCompare(left.meetingTime)));
    setMeetingModalVisible(false);
    meetingForm.resetFields();
    Message.success('会议纪要已新增');
  });

  const openTeamConfig = (row: ProjectTeamRow) => {
    setEditingTeamId(row.id);
    setTeamModalVisible(true);
    teamForm.setFieldsValue({
      ...row,
      members: row.members,
    });
  };

  const openNewTeamConfig = () => {
    setEditingTeamId(null);
    setTeamModalVisible(true);
    teamForm.resetFields();
    teamForm.setFieldsValue({ plannedPeople: 1 });
  };

  const autoConfigureTeam = () => {
    const latestQuotation = [...projectQuotationHistory]
      .filter(item => item.quotationConfig)
      .sort((left, right) => right.createTime.localeCompare(left.createTime))[0];
    if (!latestQuotation?.quotationConfig) {
      Message.warning('当前项目暂无可用的报价岗位配置');
      return;
    }

    const roleMap = new Map<string, ProjectTeamRow>();
    getQuotationLaborDetails(latestQuotation.quotationConfig).forEach((item, index) => {
      const role = item.role.trim();
      if (!role || item.people <= 0) return;
      const existing = roleMap.get(role);
      if (existing) {
        existing.plannedPeople += item.people;
        return;
      }
      roleMap.set(role, {
        id: `team-auto-${Date.now()}-${index}`,
        role,
        members: [],
        plannedPeople: item.people,
        responsibility: item.technology
          ? `${item.sourceName}，技术栈：${item.technology}`
          : item.sourceName,
        allocation: 100,
        status: '待加入',
      });
    });
    const rows = Array.from(roleMap.values());
    if (!rows.length) {
      Message.warning('最新报价中未配置有效岗位');
      return;
    }
    setTeamRows(rows);
    Message.success(`已根据最新报价生成 ${rows.length} 条团队配置`);
  };

  const saveTeamConfig = () => {
    teamForm.validate().then(values => {
      const editingRow = teamRows.find(row => row.id === editingTeamId);
      const nextRow: ProjectTeamRow = {
        id: editingTeamId ?? `team-manual-${Date.now()}`,
        role: values.role.trim(),
        members: values.members ?? [],
        plannedPeople: values.plannedPeople,
        responsibility: values.responsibility,
        allocation: editingRow?.allocation ?? 100,
        status: editingRow?.status ?? '待加入',
      };
      setTeamRows(current => editingTeamId
        ? current.map(row => row.id === editingTeamId ? nextRow : row)
        : [...current, nextRow]);
      setEditingTeamId(null);
      setTeamModalVisible(false);
      teamForm.resetFields();
      Message.success(editingTeamId ? '团队配置已更新' : '团队配置已新增');
    });
  };
  const projectLeadId = project.leadId ?? contract?.leadId;
  const leadContext = useMemo(
    () => findLeadContext(projectLeadId),
    [projectLeadId],
  );
  const leadProfile = useMemo(
    () => getLeadDetailProfile(projectLeadId, ''),
    [projectLeadId],
  );
  const [projectQuotationHistory, setProjectQuotationHistory] = useState<LeadQuotationItem[]>(
    () => projectLeadId ? leadProfile.quotationHistory : [],
  );
  const archivedContracts = useMemo(
    () => contract?.archivedScans.length ? [contract] : [],
    [contract],
  );
  const leadInfo = leadProfile.leadInfo;
  const leadPhoneOrWechat = Array.from(new Set(
    [leadInfo.phone, leadInfo.wechat].filter(value => value?.trim()),
  )).join(' / ') || '-';
  const projectLeadSummaryItems = [
    { label: '线索来源', value: displayProjectLeadValue(leadInfo.source) },
    { label: '客资成本', value: displayProjectLeadValue(leadInfo.customerCost) },
    {
      label: '客户称呼',
      value: displayProjectLeadValue(leadInfo.customerTitle),
    },
    {
      label: '联系电话/微信',
      value: leadPhoneOrWechat,
    },
    { label: '创建人', value: displayProjectLeadValue(leadInfo.creator) },
    { label: '优化师', value: displayProjectLeadValue(leadInfo.optimizer) },
    { label: '归属人', value: displayProjectLeadValue(leadInfo.owner) },
    { label: '协助人', value: displayProjectLeadValue(leadInfo.assistant) },
    {
      label: '初始信息及需求',
      value: displayProjectLeadValue(leadInfo.requirement || leadInfo.initialRequirement),
      fullWidth: true,
    },
    { label: '创建时间', value: displayProjectLeadValue(leadInfo.createTime) },
    { label: '下次跟进时间', value: displayProjectLeadValue(leadInfo.nextFollowTime) },
  ];

  const submitApprovalLink = () => {
    if (!approvalNo.trim()) {
      Message.error('请填写审批编号');
      return;
    }
    Message.success(`已关联${approvalType === 'travel' ? '出差' : '报销'}审批记录：${approvalNo.trim()}`);
    setApprovalType(null);
    setApprovalNo('');
  };

  const closeQuotationModal = () => {
    setQuotationModalVisible(false);
    setQuotationConfigSummary(null);
    setQuotationConfigDraft(null);
    setEditingQuotation(null);
    quotationForm.resetFields();
  };

  const closeQuotationDocument = () => {
    setQuotationDocumentVisible(false);
    setQuotationModalVisible(true);
  };

  const closeQuotationConfig = () => {
    setQuotationConfigVisible(false);
    setQuotationConfigSummary(null);
    setQuotationConfigDraft(null);
    setEditingQuotation(null);
    quotationForm.resetFields();
  };

  const openQuotationConfig = () => {
    setEditingQuotation(null);
    setQuotationConfigSummary(null);
    setQuotationConfigDraft(null);
    quotationForm.resetFields();
    setQuotationConfigVisible(true);
  };

  const openQuotationEditor = (quotation: LeadQuotationItem) => {
    setEditingQuotation(quotation);
    setQuotationConfigSummary(null);
    setQuotationConfigDraft(quotation.quotationConfig ?? null);
    quotationForm.resetFields();
    setQuotationConfigVisible(true);
  };

  const continueQuotationConfig = (config: ProjectQuotationConfig, summary: ProjectQuotationSummary) => {
    const upliftRate = editingQuotation?.upliftRate ?? 0;
    const upliftType = editingQuotation?.upliftType ?? 'rate';
    const upliftValue = upliftType === 'fixed' ? editingQuotation?.upliftAmount ?? 0 : upliftRate;
    setQuotationConfigDraft(config);
    setQuotationConfigSummary(summary);
    quotationForm.resetFields();
    quotationForm.setFieldsValue({
      upliftType,
      upliftValue,
      upliftRate,
      amount: calculateQuotationAmount(summary.totalAmount, upliftRate),
      period: String(summary.estimatedDays || ''),
      operator: editingQuotation?.operator || CURRENT_LOGIN_USER.name,
      technicalEvaluator: editingQuotation?.technicalEvaluator?.split('、') ?? [],
      description: editingQuotation?.description,
    });
    setQuotationConfigVisible(false);
    setQuotationModalVisible(true);
  };

  const submitQuotation = () => {
    quotationForm.validate().then(values => {
      if (!quotationConfigDraft || !quotationConfigSummary) return;
      setQuotationDocumentData({
        projectName: project.name,
        customerName: leadInfo.customer,
        amount: Number(values.amount),
        upliftRate: calculateUpliftRate(quotationConfigSummary.totalAmount, Number(values.amount)),
        upliftType: values.upliftType,
        upliftAmount: values.upliftType === 'fixed' ? Number(values.upliftValue) || 0 : undefined,
        period: values.period?.trim() ? `${values.period.trim()}天` : '-',
        operator: values.operator?.trim() || '-',
        technicalEvaluator: values.technicalEvaluator.join('、'),
        description: values.description?.trim() || '',
        config: quotationConfigDraft,
        summary: quotationConfigSummary,
      });
      setQuotationModalVisible(false);
      setQuotationDocumentVisible(true);
    }).catch(() => {});
  };

  const submitQuotationDocument = async (document: GeneratedQuotationDocument) => {
      const values = quotationDocumentData;
      if (!values) return;
      const configuredCost = quotationConfigSummary?.totalAmount;
      const amount = values.amount;
      const upliftRate = Number(values.upliftRate) || 0;
      const quotationTimestamp = Date.now();
      const quotationReportImageUrl = quotationConfigDraft && quotationConfigSummary
        ? await createQuotationSummaryImageUrl(quotationConfigDraft, quotationConfigSummary)
        : undefined;
      const quotationReportImageName = quotationReportImageUrl
        ? createQuotationSystemRecordFileName(project.name, quotationTimestamp)
        : undefined;

      setProjectQuotationHistory(current => [{
        id: `project-quotation-${quotationTimestamp}`,
        name: `${project.name}报价单`,
        status: '已报价',
        period: values.period,
        operator: values.operator,
        entity: project.entity,
        amount: amount.toLocaleString('zh-CN'),
        upliftRate,
        upliftType: values.upliftType,
        upliftAmount: values.upliftType === 'fixed' ? Number(values.upliftValue) || 0 : undefined,
        cost: configuredCost == null ? '-' : configuredCost.toLocaleString('zh-CN'),
        profit: configuredCost == null ? '-' : (amount - configuredCost).toLocaleString('zh-CN'),
        file: '-',
        flowStatus: '未提交审批',
        createTime: new Date().toLocaleString('zh-CN', { hour12: false }),
        approvalFlow: [],
        technicalEvaluator: values.technicalEvaluator,
        quotationSystemFiles: [],
        technicalEvaluationFiles: [],
        quotationFiles: [document.name],
        quotationFileUrls: { [document.name]: document.url },
        quotationSummary: quotationConfigSummary ?? undefined,
        quotationConfig: quotationConfigDraft ?? undefined,
        quotationReportImageUrl,
        quotationReportImageName,
        description: values.description,
      }, ...current]);
      Message.success(editingQuotation ? '报价已更新为新版本' : '报价已新增');
      setQuotationDocumentVisible(false);
      setQuotationDocumentData(null);
      closeQuotationModal();
  };

  const appendQuotationFiles = (
    quotation: LeadQuotationItem,
    field: 'quotationSystemFiles' | 'technicalEvaluationFiles' | 'quotationFiles',
    files: UploadItem[],
  ) => {
    const names = files
      .map(file => file.name || file.originFile?.name)
      .filter((name): name is string => Boolean(name));
    if (!names.length) return;

    setProjectQuotationHistory(current => current.map(item => {
      if (item.id !== quotation.id) return item;
      return {
        ...item,
        [field]: Array.from(new Set([...(item[field] || []), ...names])),
      };
    }));
    Message.success('附件已添加到报价记录');
  };

  const removeQuotationFile = (
    quotation: LeadQuotationItem,
    field: 'quotationSystemFiles' | 'technicalEvaluationFiles' | 'quotationFiles',
    fileName: string,
  ) => {
    setProjectQuotationHistory(current => current.map(item => {
      if (item.id !== quotation.id) return item;
      return { ...item, [field]: (item[field] || []).filter(name => name !== fileName) };
    }));
    Message.success(`已删除：${fileName}`);
  };

  const submitQuotationApproval = (quotation: LeadQuotationItem) => {
    const submitTime = new Date().toLocaleString('zh-CN', { hour12: false });
    setProjectQuotationHistory(current => current.map(item => {
      if (item.id !== quotation.id) return item;

      const hasPendingApproval = item.approvalFlow.some(node => node.status === 'pending');
      return {
        ...item,
        flowStatus: '审批中',
        approvalFlow: hasPendingApproval ? item.approvalFlow : [
          {
            step: '发起申请',
            approver: item.operator,
            status: 'approved',
            time: submitTime,
            comment: '',
          },
          {
            step: '总经理审批',
            approver: '赵总 - 总经理',
            status: 'pending',
            time: '',
            comment: '',
          },
        ],
      };
    }));
    Message.success('报价已提交审批');
  };

  const handleQuotationApprovalDecision = (
    quotation: LeadQuotationItem,
    decision: 'approve' | 'reject',
    comment: string,
  ) => {
    const approvalTime = new Date().toLocaleString('zh-CN', { hour12: false });
    setProjectQuotationHistory(current => current.map(item => {
      if (item.id !== quotation.id) return item;

      const pendingIndex = item.approvalFlow.findIndex(node => node.status === 'pending');
      if (pendingIndex < 0) return item;

      const approvalFlow = item.approvalFlow.map((node, index) => (
        index === pendingIndex
          ? {
            ...node,
            status: decision === 'approve' ? 'approved' : 'rejected',
            time: approvalTime,
            comment,
          }
          : node
      ));
      return {
        ...item,
        flowStatus: decision === 'reject' ? '已驳回' : '已审核',
        approvalFlow,
      };
    }));

    if (decision === 'reject') {
      Message.success('报价审批已拒绝');
    } else {
      Message.success('总经理已审批通过，报价审批已完成');
    }
  };

  const technicalEvaluators = Array.from(new Set([
    project.owner,
    ...project.productUsers,
    ...project.frontendUsers,
    ...project.backendUsers,
    ...project.testUsers,
  ].filter(Boolean)));

  return (
    <>
      <div className="project-detail-workspace">
        <div className="project-detail-workspace-main">
          <div className="project-detail-lead-panel">
            <div className="project-detail-basic-section-title">
              线索相关信息
              <span className="project-detail-basic-section-subtitle">
                【{displayProjectLeadValue(leadInfo.name || leadContext?.leadName || project.name)}】
              </span>
            </div>
            <div className="project-detail-lead-summary-grid">
              {projectLeadSummaryItems.map((item) => (
                <div
                  key={item.label}
                  className={`project-detail-lead-summary-item${item.fullWidth ? ' project-detail-lead-summary-item-full' : ''}`}
                >
                  <span className="project-detail-lead-summary-label">{item.label}：</span>
                  <span className="project-detail-lead-summary-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="project-detail-workspace-panel">
            <Tabs defaultActiveTab="basic">
              <TabPane key="basic" title="基础信息">
                <div className="project-detail-basic-section">
                  <Descriptions
                    column={2}
                    data={[
                      { label: '编号', value: project.projectNo },
                      { label: '项目名称', value: project.name },
                      { label: '总进度', value: `${project.progress}%` },
                      { label: '对接主体', value: project.entity || '-' },
                      { label: '优先级', value: project.priority },
                      { label: '状态', value: project.status },
                      { label: '业务线', value: project.businessLine },
                      { label: '最新进展', value: project.latestProgress },
                      { label: '开始日期', value: project.startDate || '-' },
                      { label: '预计结束日期', value: project.expectedEndDate || '-' },
                      { label: '添加时间', value: project.createdAt },
                      { label: '备注', value: project.remark || '-' },
                    ]}
                  />
                </div>

              </TabPane>

              <TabPane key="contract" title="合同信息">
                <Card bordered={false}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {archivedContracts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
                        {contract ? '暂无已归档合同' : '暂未创建合同'}
                      </div>
                    ) : (
                      archivedContracts.map(item => (
                        <LeadFinalContractPanel key={item.id} contract={item} projectLayout projectFullInfo />
                      ))
                    )}
                  </Space>
                </Card>
              </TabPane>

              <TabPane key="payments" title="回款与发票">
                <Card bordered={false}>
                  {contract ? (
                    <LeadPaymentInvoicePanel
                      contractAmount={contract.current.totalAmount}
                      projectMode
                      projectId={project.id}
                      projectName={project.name}
                      projectNo={project.projectNo}
                      contractId={contract.id}
                      customerInvoiceInfo={{
                        customerName: contract.current.customerName,
                        taxpayerId: contract.current.customerTaxNo,
                        address: contract.current.customerAddress,
                        phone: contract.current.customerPhone,
                        bankName: contract.current.bankName,
                        bankAccount: contract.current.bankAccount,
                        recipientName: contract.current.customerContact,
                        recipientPhone: contract.current.customerPhone,
                        recipientEmail: contract.current.customerEmail,
                      }}
                    />
                  ) : (
                    <Empty description="当前项目暂未关联合同" />
                  )}
                </Card>
              </TabPane>

              <TabPane key="cost" title="成本核算">
                <ProjectCostPanel
                  projectName={project.name}
                  projectNo={project.projectNo}
                  contractAmount={contract?.current.totalAmount}
                  projectStartDate={project.startDate}
                  projectEndDate={project.expectedEndDate}
                  teamRows={teamRows}
                  dailyReports={dailyReports}
                  reimbursementItems={reimbursementApplications}
                />
              </TabPane>

              <TabPane key="team" title="项目团队">
                <div className="project-team-toolbar">
                  <Button type="primary" size="small" icon={<IconPlus />} onClick={openNewTeamConfig}>新增</Button>
                </div>
                <Table
                  rowKey="id"
                  pagination={false}
                  data={teamRows}
                  scroll={{ x: 744 }}
                  noDataElement={(
                    <div className="project-team-empty">
                      <Empty description="暂无项目团队配置" />
                      <Button type="primary" onClick={autoConfigureTeam}>自动配置</Button>
                    </div>
                  )}
                  columns={[
                    { title: '项目岗位', dataIndex: 'role', width: 128 },
                    {
                      title: '成员', dataIndex: 'members', width: 192,
                      render: (members: string[]) => members.length
                        ? <Space size="mini" wrap>{members.map(name => <Tag key={name}>{name}</Tag>)}</Space>
                        : <Text type="secondary">待配置</Text>,
                    },
                    { title: '计划人数', dataIndex: 'plannedPeople', width: 96, align: 'center' as const, render: (plannedPeople: number) => `${plannedPeople} 人` },
                    { title: '岗位职责', dataIndex: 'responsibility', width: 240 },
                    {
                      title: '操作', width: 88, align: 'center' as const, fixed: 'right' as const,
                      render: (_: unknown, row: ProjectTeamRow) => (
                        <Space size="mini">
                          <Tooltip content="编辑">
                            <Button type="text" size="small" icon={<IconEdit />} aria-label="编辑" onClick={() => openTeamConfig(row)} />
                          </Tooltip>
                          <Popconfirm
                            title="确认删除该团队配置吗？"
                            onOk={() => {
                              setTeamRows(current => current.filter(item => item.id !== row.id));
                              Message.success('团队配置已删除');
                            }}
                          >
                            <Tooltip content="删除">
                              <Button type="text" size="small" status="danger" icon={<IconDelete />} aria-label="删除" />
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </TabPane>

              <TabPane key="daily" title="项目日报">
                <Tabs defaultActiveTab="hours">
                  <TabPane key="hours" title="工时列表">
                    <Table
                      rowKey="key"
                      pagination={false}
                      data={memberHours}
                      columns={[
                        { title: '人员名称', dataIndex: 'personName' },
                        { title: '职位', dataIndex: 'position' },
                        { title: '已用工时', dataIndex: 'hours', render: (hours: number) => `${hours}H` },
                      ]}
                      summary={() => <Table.Summary.Row><Table.Summary.Cell colSpan={2}>总计</Table.Summary.Cell><Table.Summary.Cell>{totalHours}H</Table.Summary.Cell></Table.Summary.Row>}
                    />
                  </TabPane>
                  <TabPane key="reports" title="日报列表">
                    <Table
                      rowKey="id"
                      pagination={false}
                      data={dailyReports}
                      scroll={{ x: 900 }}
                      columns={[
                        { title: '日期', dataIndex: 'date', width: 120 },
                        { title: '人员', dataIndex: 'personName', width: 100 },
                        { title: '耗时', dataIndex: 'hours', width: 80, render: (hours: number) => `${hours}H` },
                        { title: '工作内容', dataIndex: 'workContent', width: 260 },
                        { title: '风险/异常反馈', dataIndex: 'riskFeedback', width: 220 },
                      ]}
                    />
                  </TabPane>
                </Tabs>
              </TabPane>
              <TabPane key="tasks" title="任务管理">
                <ProjectTaskPanel project={project} />
              </TabPane>
            </Tabs>
          </div>
        </div>

        <div className="project-detail-workspace-panel project-detail-workspace-panel-side">
          <Tabs defaultActiveTab="follow">
            <TabPane key="follow" title="跟进">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button type="primary" size="small" icon={<IconPlus />} onClick={onAddFollowUp}>新增</Button>
              </div>
              <Timeline>
                {followUps.map(follow => (
                  <Timeline.Item key={follow.id} label={follow.createdAt}>
                    <Space size="mini" wrap><Tag color="arcoblue">{follow.status}</Tag><Tag>{follow.progress}%</Tag><Text type="secondary">{follow.operator}</Text></Space>
                    <div style={{ marginTop: 6 }}>{follow.content}</div>
                    {follow.attachments.map(file => <Tag key={file.id} icon={<IconFile />} style={{ marginTop: 6 }}>{file.name}</Tag>)}
                  </Timeline.Item>
                ))}
              </Timeline>
            </TabPane>

            <TabPane key="quotation" title="报价">
              <LeadQuotationHistoryPanel
                quotations={projectQuotationHistory}
                projectLayout
                showProjectEditAction
                alwaysExpanded
                hideQuotationUpload
                approvalOverviewAtTop
                onCreate={openQuotationConfig}
                onEdit={openQuotationEditor}
                onDelete={() => Message.info('删除报价单')}
                onSubmitApproval={submitQuotationApproval}
                onApprovalDecision={handleQuotationApprovalDecision}
                onUploadFiles={appendQuotationFiles}
                onRemoveFile={removeQuotationFile}
              />
            </TabPane>
            <TabPane key="contract-records" title="合同记录">
              <LeadContractHistoryPanel
                contract={contract}
                onCreateContract={onSelectContract}
                onContractClick={onOpenContract}
                hideHistorySummary
                hideAddVersion
                hideVersionChangeTypes
                hideEmptyApprovalRecords
                hideContractDetailAction
                projectCompactVersionLayout
                hideFinalArchiveUntilApproved
                approvalOverviewAtTop
                approvalMode="general-manager"
                onEditVersion={onEditContractVersion}
              />
            </TabPane>
            <TabPane key="meeting-minutes" title="会议纪要">
              <div className="project-meeting-toolbar"><Button type="primary" size="small" icon={<IconPlus />} onClick={openMeetingModal}>新增记录</Button></div>
              {meetingRecords.length ? <Timeline className="project-meeting-timeline">
                {meetingRecords.map(record => <Timeline.Item key={record.id}>
                  <div className="project-meeting-card">
                    <div className="project-meeting-title">{record.subject}</div>
                    <div className="project-meeting-meta"><Text type="secondary">{record.meetingTime}</Text><Text type="secondary">记录人：{record.recorder}</Text></div>
                    <div className="project-meeting-attendees"><Text type="secondary">参会人</Text><Space size="mini" wrap>{record.employeeAttendees.map(name => <Tag key={`employee-${name}`} color="arcoblue">{name}</Tag>)}{record.externalAttendees.map(name => <Tag key={`external-${name}`}>{name}（外部）</Tag>)}</Space></div>
                    <MeetingMinutesText>{record.minutes}</MeetingMinutesText>
                    {(record.recordings.length > 0 || record.materials.length > 0) && <div className="project-meeting-files">
                      {record.recordings.length > 0 && <div><Text type="secondary">会议录音</Text><Space size="mini" wrap>{record.recordings.map(file => <Button key={file.id} type="text" size="mini" icon={<IconFile />} onClick={() => downloadAttachment(file)}>{file.name}</Button>)}</Space></div>}
                      {record.materials.length > 0 && <div><Text type="secondary">会议资料</Text><Space size="mini" wrap>{record.materials.map(file => <Button key={file.id} type="text" size="mini" icon={<IconFile />} onClick={() => downloadAttachment(file)}>{file.name}</Button>)}</Space></div>}
                    </div>}
                  </div>
                </Timeline.Item>)}
              </Timeline> : <Empty description="暂无会议纪要" />}
            </TabPane>
            <TabPane key="demo" title="演示"><ProjectDemoPanel /></TabPane>
            <TabPane key="documents" title="资料"><DocumentUploadPanel /></TabPane>
            <TabPane key="travel" title="出差"><TravelPanel items={travelApplications} onAdd={() => setApprovalType('travel')} /></TabPane>
            <TabPane key="reimbursement" title="报销"><ReimbursementPanel items={reimbursementApplications} onAdd={() => setApprovalType('reimbursement')} /></TabPane>
          </Tabs>
        </div>
      </div>

      <Modal
        title="新增会议纪要"
        visible={meetingModalVisible}
        onOk={saveMeetingRecord}
        onCancel={() => { setMeetingModalVisible(false); meetingForm.resetFields(); }}
        style={{ width: 680 }}
        maskClosable={false}
      >
        <Form form={meetingForm} layout="vertical" className="project-meeting-form">
          <Grid.Row gutter={16}>
            <Grid.Col span={15}><FormItem label="会议主题" field="subject" rules={[{ required: true, message: '请填写会议主题' }]}><Input placeholder="请输入会议主题" /></FormItem></Grid.Col>
            <Grid.Col span={9}><FormItem label="会议时间" field="meetingTime" rules={[{ required: true, message: '请选择会议时间' }]}><DatePicker showTime={{ format: 'HH:mm', step: { minute: 30 } }} format="YYYY-MM-DD HH:mm" placeholder="请选择会议时间" style={{ width: '100%' }} /></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="内部参会人" field="employeeAttendees"><Select mode="multiple" showSearch allowClear placeholder="请选择员工">{activeEmployees.map(employee => <Select.Option key={employee.id} value={employee.name}>{employee.name} · {employee.department} / {employee.position}</Select.Option>)}</Select></FormItem>
          <FormItem label="外部参会人" field="externalAttendees"><InputTag allowClear saveOnBlur placeholder="输入姓名后按 Enter，可继续输入下一位" /></FormItem>
          <FormItem label="会议纪要" field="minutes" className="project-meeting-minutes-field" rules={[{ required: true, message: '请填写会议纪要' }]}><Input.TextArea rows={7} maxLength={5000} showWordLimit placeholder="记录会议结论、待办事项、责任人和时间节点" /></FormItem>
          <FormItem label="会议录音" field="recordings" className="project-meeting-attachment-field" triggerPropName="fileList"><Upload accept=".mp3,.wav,.m4a,.aac,.ogg,.flac" multiple autoUpload={false} showUploadList={{ startIcon: null }} tip="支持 MP3、WAV、M4A、AAC、OGG、FLAC，可多选"><Button icon={<IconUpload />}>选择音频</Button></Upload></FormItem>
          <FormItem label="会议资料" field="materials" className="project-meeting-attachment-field" triggerPropName="fileList"><Upload accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar" multiple autoUpload={false} showUploadList={{ startIcon: null }} tip="支持文档、表格、演示文稿、图片及压缩包，可多选"><Button icon={<IconUpload />}>选择附件</Button></Upload></FormItem>
        </Form>
      </Modal>

      <Modal
        title={editingTeamId ? '编辑团队配置' : '新增团队配置'}
        visible={teamModalVisible}
        onOk={saveTeamConfig}
        onCancel={() => { setTeamModalVisible(false); setEditingTeamId(null); teamForm.resetFields(); }}
        style={{ width: 560 }}
        maskClosable={false}
      >
        <Form form={teamForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="项目岗位" field="role" rules={[{ required: true, message: '请填写项目岗位' }]}>
                <Input placeholder="如：前端开发" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="计划人数" field="plannedPeople" rules={[{ required: true, message: '请填写计划人数' }]}>
                <InputNumber min={1} precision={0} suffix="人" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="项目成员" field="members">
            <Select
              mode="multiple"
              placeholder="请选择员工"
              showSearch
              allowClear
            >
              {activeEmployees.map(employee => (
                <Select.Option key={employee.id} value={employee.name}>
                  {employee.name} · {employee.department} / {employee.position}
                </Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="岗位职责" field="responsibility" rules={[{ required: true, message: '请填写岗位职责' }]}>
            <Input.TextArea rows={3} maxLength={100} showWordLimit placeholder="说明该岗位在项目中的主要职责" />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title={`新增${approvalType === 'travel' ? '出差' : '报销'}审批关联`}
        visible={approvalType !== null}
        onOk={submitApprovalLink}
        onCancel={() => { setApprovalType(null); setApprovalNo(''); }}
      >
        <FormItem label="审批编号" required>
          <Input placeholder="请输入企业微信审批编号" value={approvalNo} onChange={setApprovalNo} />
        </FormItem>
        <div style={{ color: 'var(--color-text-3)', fontSize: 13, lineHeight: '22px' }}>
          审批编号请在企业微信审批记录中获取。提交后系统会根据审批编号自动关联对应审批记录。
        </div>
      </Modal>

      <ProjectQuotationConfigurator
        visible={quotationConfigVisible}
        initialConfig={quotationConfigDraft}
        onCancel={closeQuotationConfig}
        onNext={continueQuotationConfig}
      />

      <Modal
        title="完善报价资料"
        visible={quotationModalVisible}
        onOk={submitQuotation}
        onCancel={closeQuotationModal}
        okText="下一步，生成报价单"
        maskClosable={false}
        style={{ width: 980, maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={quotationForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><FormItem label="报价上浮" field="upliftType"><Radio.Group type="button" onChange={upliftType => { const originalAmount = quotationConfigSummary?.totalAmount ?? 0; const amount = Number(quotationForm.getFieldValue('amount')) || originalAmount; quotationForm.setFieldValue('upliftValue', upliftType === 'fixed' ? Math.round((amount - originalAmount) * 100) / 100 : calculateUpliftRate(originalAmount, amount)); }}><Radio value="rate">按比例上浮</Radio><Radio value="fixed">按固定金额上浮</Radio></Radio.Group></FormItem></Grid.Col>
            <Grid.Col span={12}>
              <FormItem noStyle shouldUpdate={(previous, current) => previous.upliftType !== current.upliftType}>
                {values => <FormItem label={values.upliftType === 'fixed' ? '上浮金额' : '上浮比例'} field="upliftValue" rules={[{ required: true, message: '请输入上浮值' }]}><InputNumber min={0} precision={2} prefix={values.upliftType === 'fixed' ? '¥' : undefined} suffix={values.upliftType === 'fixed' ? undefined : '%'} style={{ width: '100%' }} onChange={value => { const originalAmount = quotationConfigSummary?.totalAmount ?? 0; const upliftValue = Number(value) || 0; const amount = values.upliftType === 'fixed' ? calculateQuotationAmountByFixed(originalAmount, upliftValue) : calculateQuotationAmount(originalAmount, upliftValue); quotationForm.setFieldValue('amount', amount); quotationForm.setFieldValue('upliftRate', calculateUpliftRate(originalAmount, amount)); }} /></FormItem>}
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="原始报价金额"><InputNumber value={quotationConfigSummary?.totalAmount ?? 0} precision={2} prefix="¥" disabled style={{ width: '100%' }} /></FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="上浮后金额" field="amount" rules={[{ required: true, message: '请输入上浮后金额' }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} onChange={value => { const originalAmount = quotationConfigSummary?.totalAmount ?? 0; const amount = Number(value) || 0; const upliftRate = calculateUpliftRate(originalAmount, amount); quotationForm.setFieldValue('upliftRate', upliftRate); quotationForm.setFieldValue('upliftValue', quotationForm.getFieldValue('upliftType') === 'fixed' ? Math.round((amount - originalAmount) * 100) / 100 : upliftRate); }} /></FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="报价人" field="operator" rules={[{ required: true, message: '请选择报价人' }]}>
                <Select placeholder="请选择报价人" showSearch allowClear>
                  {employees.map(employee => (
                    <Select.Option key={employee.id} value={employee.name}>{employee.name}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="技术评估人" field="technicalEvaluator" rules={[{ required: true, message: '请选择技术评估人' }]}>
                <Select placeholder="请选择技术评估人" mode="multiple" allowClear>
                  {technicalEvaluators.map(person => (
                    <Select.Option key={person} value={person}>{person}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem
                label="预计周期"
                field="period"
                rules={[
                  { required: true, message: '请输入预计周期' },
                  { match: /^[1-9]\d*$/, message: '预计周期只能输入正整数' },
                ]}
              >
                <Input
                  inputMode="numeric"
                  placeholder="请输入预计周期"
                  maxLength={5}
                  suffix={<span style={{ marginRight: 10 }}>天</span>}
                  onChange={value => quotationForm.setFieldValue('period', value.replace(/\D/g, '').replace(/^0+/, ''))}
                />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          {quotationConfigSummary && quotationConfigDraft ? (
            <FormItem noStyle shouldUpdate={(previous, current) => previous.amount !== current.amount || previous.upliftRate !== current.upliftRate}>
              {values => (
                <QuotationSummaryReport
                  config={quotationConfigDraft}
                  summary={quotationConfigSummary}
                  quotedAmount={Number(values.amount)}
                  upliftRate={Number(values.upliftRate) || 0}
                />
              )}
            </FormItem>
          ) : null}
          <FormItem label="报价说明" field="description">
            <Input.TextArea placeholder="请输入报价说明" maxLength={500} showWordLimit autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>

      <QuotationDocumentPreviewModal
        visible={quotationDocumentVisible}
        data={quotationDocumentData}
        onCancel={closeQuotationDocument}
        onSubmit={submitQuotationDocument}
      />
    </>
  );
}
