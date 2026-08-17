import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Grid,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import {
  ProjectFollowUp,
  ProjectStatus,
  buildProjectMemberHours,
  calculateProjectHours,
  initialDailyReports,
  initialFollowUps,
  initialProjects,
  projectStatuses,
  summarizeProgress,
} from './project-management/mockData';
import {
  buildProjectSummaryCards,
  type ProjectSummaryCard,
  type SummaryRiskLevel,
} from './projectDetailSummary';
import { initialDeliveryPlans } from './delivery-plan/mockData';
import { useContracts } from './contracts/ContractsContext';
import { ProjectDetailWorkspace } from './project-management/ProjectDetailWorkspace';

const { Title, Text } = Typography;
const FormItem = Form.Item;

const SUMMARY_TAG_COLOR_MAP: Record<
  SummaryRiskLevel,
  'green' | 'arcoblue' | 'orange' | 'red'
> = {
  正常: 'green',
  注意: 'arcoblue',
  预警: 'orange',
  严重: 'red',
};

function getTodayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function SummaryHighlightCard({
  card,
  href,
}: {
  card: ProjectSummaryCard;
  href?: string;
}) {
  const content = (
    <Card bodyStyle={{ padding: '10px 12px' }} style={{ height: '100%' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div className="flex items-center justify-between gap-3">
          <Text type="secondary" style={{ fontSize: 12, lineHeight: '18px' }}>{card.title}</Text>
          <Tag color={SUMMARY_TAG_COLOR_MAP[card.level]} size="small">{card.level}</Tag>
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            lineHeight: '24px',
            color: 'var(--color-text-1)',
          }}
        >
          {card.value}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: '18px',
            color: 'var(--color-text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.alert}
        </div>
        <Text
          type="secondary"
          style={{
            display: 'block',
            fontSize: 12,
            lineHeight: '18px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.detail}
        </Text>
      </Space>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      to={href}
      style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
    >
      {content}
    </Link>
  );
}

function statusBadge(status: ProjectStatus) {
  const map: Record<ProjectStatus, 'default' | 'processing' | 'success' | 'warning' | 'error'> = {
    未确认: 'warning',
    未开始: 'default',
    进行中: 'processing',
    已完成: 'success',
    验收中: 'processing',
    搁置: 'warning',
    延迟: 'error',
    催款中: 'warning',
  };
  return <Badge status={map[status]} text={status} />;
}


export function ProjectDetail() {
  const { id = '1' } = useParams();
  const navigate = useNavigate();
  const { contracts, getById } = useContracts();
  const [project, setProject] = useState(initialProjects.find((item) => item.id === id) ?? initialProjects[0]);
  const [followUps, setFollowUps] = useState<ProjectFollowUp[]>(initialFollowUps);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followForm] = Form.useForm();
  const hasPlan = !!initialDeliveryPlans[project.id];
  const linkedContract = getById(project.contractId)
    ?? contracts.find((contract) => contract.projectId === project.id);
  const travelApplications = [
    {
      id: '1',
      applicant: '张三',
      department: '销售部',
      destination: '北京',
      startDate: '2026-04-15',
      endDate: '2026-04-17',
      duration: '3天',
      estimatedCost: '3,500',
      purpose: '客户需求调研及方案沟通',
      status: '已审批',
      createTime: '2026-04-08 09:30',
      approvalFlow: [
        { step: '发起申请', approver: '张三', status: 'approved', time: '2026-04-08 09:30', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'approved', time: '2026-04-08 15:20', comment: '同意出差' },
        { step: '终审', approver: '王五 - 财务审核', status: 'approved', time: '2026-04-09 10:15', comment: '费用合理，准予出差' },
      ],
    },
    {
      id: '2',
      applicant: '李四',
      department: '技术部',
      destination: '上海',
      startDate: '2026-04-20',
      endDate: '2026-04-22',
      duration: '3天',
      estimatedCost: '4,200',
      purpose: '技术交流与项目实施',
      status: '待审批',
      createTime: '2026-04-10 14:20',
      approvalFlow: [
        { step: '发起申请', approver: '李四', status: 'approved', time: '2026-04-10 14:20', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'rejected', time: '2026-04-10 16:45', comment: '本次出差费用预算填报有误，招待费占比过高，请按照公司最新差旅标准核减后再报。' },
        { step: '终审', approver: '王五 - 财务审核', status: 'pending', time: '', comment: '' },
      ],
    },
  ];
  const reimbursementApplications = [
    {
      id: '1',
      applicant: '张三',
      department: '销售部',
      expenseType: '差旅费',
      invoiceAmount: '1,200',
      reimbursementAmount: '1,200',
      invoiceTitle: '北京科技有限公司',
      taxNumber: '91110000XXXXXXXXXX',
      invoiceType: '增值税专用发票',
      attachments: [
        { id: 'att-1-1', name: '发票.pdf', size: '856KB' },
        { id: 'att-1-2', name: '行程单.jpg', size: '1.2MB' },
      ],
      status: '已报销',
      createTime: '2026-04-12 16:20',
      approvalFlow: [
        { step: '发起申请', approver: '张三', status: 'approved', time: '2026-04-12 16:20', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'approved', time: '2026-04-13 09:30', comment: '费用合理，同意报销' },
        { step: '终审', approver: '王五 - 财务审核', status: 'approved', time: '2026-04-13 14:20', comment: '发票真实有效，准予报销' },
      ],
    },
    {
      id: '2',
      applicant: '李四',
      department: '技术部',
      expenseType: '招待费',
      invoiceAmount: '3,500',
      reimbursementAmount: '3,200',
      invoiceTitle: '上海商贸公司',
      taxNumber: '91310000YYYYYYYYYY',
      invoiceType: '增值税普通发票',
      attachments: [
        { id: 'att-2-1', name: '餐饮发票.pdf', size: '652KB' },
      ],
      status: '审批中',
      createTime: '2026-04-10 11:15',
      approvalFlow: [
        { step: '发起申请', approver: '李四', status: 'approved', time: '2026-04-10 11:15', comment: '' },
        { step: '初审', approver: '张三 - 部门经理', status: 'pending', time: '', comment: '' },
        { step: '终审', approver: '王五 - 财务审核', status: 'pending', time: '', comment: '' },
      ],
    },
  ];

  const projectDailyReports = initialDailyReports.filter((report) => report.projectId === project.id);
  const memberHours = buildProjectMemberHours(project.id, initialDailyReports);
  const totalHours = calculateProjectHours(project.id, initialDailyReports);
  const projectFollowUps = followUps.filter((follow) => follow.projectId === project.id);
  const deliveryPlan = initialDeliveryPlans[project.id];
  const today = getTodayString();
  const summaryCards = useMemo(
    () =>
      buildProjectSummaryCards({
        project,
        allProjects: initialProjects,
        deliveryPlan,
        memberHours,
        totalHours,
        today,
      }),
    [deliveryPlan, memberHours, project, today, totalHours],
  );


  const openFollowModal = () => {
    followForm.setFieldsValue({ status: project.status, progress: project.progress });
    setFollowModalVisible(true);
  };

  const saveFollow = () => {
    followForm.validate().then((values) => {
      const attachmentName = values.attachmentName?.trim();
      const nextFollow: ProjectFollowUp = {
        id: `follow-${Date.now()}`,
        projectId: project.id,
        status: values.status,
        progress: values.progress,
        content: values.content,
        attachments: attachmentName ? [{ id: `follow-att-${Date.now()}`, name: attachmentName, size: '模拟文件' }] : [],
        operator: project.owner,
        createdAt: '2026-05-09 11:00',
      };
      setFollowUps([nextFollow, ...followUps]);
      setProject({ ...project, status: values.status, progress: values.progress, latestProgress: summarizeProgress(values.content) });
      setFollowModalVisible(false);
      followForm.resetFields();
      Message.success('跟进记录已新增');
    });
  };



  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<IconLeft />} onClick={() => navigate('/projects')}>返回</Button>
          <Title heading={4} style={{ margin: 0 }}>{project.name}</Title>
          {statusBadge(project.status)}
        </Space>
      </div>

      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        {summaryCards.map((card) => (
          <Grid.Col span={6} key={card.key}>
            <SummaryHighlightCard
              card={card}
              href={
                card.key === 'delivery'
                  ? `/projects/${project.id}/delivery`
                  : undefined
              }
            />
          </Grid.Col>
        ))}
      </Grid.Row>

      <Alert type="info" style={{ marginBottom: 16 }} content="成本核算将在后续阶段接入人工成本设置、项目报销、投放日消耗、回款和利润分析；当前阶段先沉淀项目工时入口。" />

      <ProjectDetailWorkspace
        key={linkedContract?.id || project.contractId || 'unlinked'}
        project={project}
        contract={linkedContract}
        hasPlan={hasPlan}
        followUps={projectFollowUps}
        memberHours={memberHours}
        totalHours={totalHours}
        dailyReports={projectDailyReports}
        travelApplications={travelApplications}
        reimbursementApplications={reimbursementApplications}
        onAddFollowUp={openFollowModal}
        onSelectContract={() => navigate('/contracts/new', {
          state: {
            projectId: project.id,
            contractEditorReturn: {
              pathname: `/projects/${project.id}`,
            },
          },
        })}
        onEditContractVersion={(version) => {
          if (!linkedContract) return;
          navigate('/contracts/new', {
            state: {
              projectId: project.id,
              contractEditorReturn: {
                pathname: `/projects/${project.id}`,
              },
              contractEditPrefill: {
                contractId: linkedContract.id,
                contractNo: linkedContract.contractNo,
                leadId: linkedContract.leadId,
                quoteId: linkedContract.quoteId,
                projectId: project.id,
                createNewVersion: true,
                formData: version.formData,
              },
            },
          });
        }}
        onUnlinkContract={() => setProject({ ...project, contractId: undefined })}
        onOpenContract={(contractId) => navigate(`/contracts/${contractId}`, {
          state: {
            contractDetailReturn: {
              pathname: `/projects/${project.id}`,
            },
          },
        })}
      />

      <Modal title="添加跟进" visible={followModalVisible} onOk={saveFollow} onCancel={() => setFollowModalVisible(false)} style={{ width: 620 }} maskClosable={false}>
        <Form form={followForm} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}><FormItem label="状态" field="status" rules={[{ required: true, message: '请选择状态' }]}><Select>{projectStatuses.map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}</Select></FormItem></Grid.Col>
            <Grid.Col span={12}><FormItem label="总进度" field="progress" rules={[{ required: true, message: '请输入总进度' }]}><InputNumber min={0} max={100} precision={0} suffix="%" style={{ width: '100%' }} /></FormItem></Grid.Col>
          </Grid.Row>
          <FormItem label="跟进详情" field="content" rules={[{ required: true, message: '请输入跟进详情' }]}><Input.TextArea rows={4} /></FormItem>
          <FormItem label="附件上传" field="attachmentName"><Input placeholder="第一版模拟上传，填写附件名称" /></FormItem>
        </Form>
      </Modal>

    </div>
  );
}
