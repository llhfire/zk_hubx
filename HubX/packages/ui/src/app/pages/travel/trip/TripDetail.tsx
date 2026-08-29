import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Button,
  Card,
  Descriptions,
  Message,
  Result,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '@/app/components/ui';
import { ComplianceGuide } from '../components/ComplianceGuide';
import type { Trip, TripStatus, TransportMode } from '../types';
import { closeTrip, endTrip, getTripDetail, startTrip } from '../travel-api';
import { BasicInfoTab } from './TripDetail/BasicInfoTab';
import { ItineraryTab } from './TripDetail/ItineraryTab';
import { ExpenseTab } from './TripDetail/ExpenseTab';
import { ReimbursementTab } from './TripDetail/ReimbursementTab';
import { LoanTab } from './TripDetail/LoanTab';
import { SubsidyTab } from './TripDetail/SubsidyTab';
import './tripDetail.css';

const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const statusConfig: Record<TripStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  in_progress: { color: 'blue', text: '进行中' },
  to_reimburse: { color: 'purple', text: '待报销' },
  closed: { color: 'gray', text: '已关闭' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'gray', text: '已取消' },
};

const statusStep: Record<TripStatus, number> = {
  draft: 0,
  pending: 1,
  approved: 2,
  in_progress: 3,
  to_reimburse: 4,
  closed: 5,
  rejected: 1,
  cancelled: 0,
};

const statusTask: Record<TripStatus, string> = {
  draft: '完善申请信息并提交审批。',
  pending: '等待审批结果，必要时补充行程与费用说明。',
  approved: '出发前核对行程和合规标准，出发时标记“开始出差”。',
  in_progress: '持续记录行程与费用，返程后标记“结束出差”。',
  to_reimburse: '整理票据、报销单、借款冲抵与差旅补贴，完成后关闭差旅。',
  closed: '差旅已归档，可继续查看行程、费用和报销记录。',
  rejected: '申请已被拒绝，请根据审批意见调整后重新发起。',
  cancelled: '申请已取消，当前只保留历史查看。',
};

const transportModeLabels: Record<TransportMode, string> = {
  high_speed_rail: '高铁',
  bullet_train: '动车',
  airplane: '飞机',
  self_drive: '自驾',
  bus: '大巴',
  ferry: '轮船',
  other: '其他',
};

const tabLabels: Record<string, string> = {
  basic: '基本信息',
  itinerary: '旅程管理',
  expense: '费用管理',
  reimbursement: '报销管理',
  loan: '借款管理',
  subsidy: '差旅补贴',
};

function money(value: number): string {
  return `¥${value.toLocaleString('zh-CN')}`;
}

export function TripDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const loadTrip = useCallback(async () => {
    if (!id) {
      setTrip(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTrip(await getTripDetail(id));
    } catch {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  const runTransition = useCallback(async (
    action: (tripId: string) => Promise<Trip>,
    successMessage: string,
  ) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const next = await action(id);
      setTrip(next);
      Message.success(successMessage);
    } catch {
      Message.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const recordedExpense = useMemo(() => (
    trip?.itinerarySegments?.reduce(
      (total, segment) => total + (segment.expenses?.reduce((sum, expense) => sum + expense.amount, 0) ?? 0),
      0,
    ) ?? 0
  ), [trip]);

  const approvalProgress = useMemo(() => {
    const records = trip?.approvalRecords ?? [];
    return {
      completed: records.filter((record) => record.status === 'approved').length,
      total: records.length,
    };
  }, [trip]);

  const breadcrumbs = [
    { label: '差旅管理' },
    { label: '出差申请', to: '/travel/trips' },
    { label: trip?.tripNo ?? '出差详情' },
  ];

  if (loading) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <div className="trip-detail__state"><Spin /></div>
      </PageShell>
    );
  }

  if (!trip) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <Result
          status="404"
          title="出差单不存在"
          subTitle="该出差单可能已被删除或链接有误"
          extra={<Button type="primary" onClick={() => navigate('/travel/trips')}>返回出差列表</Button>}
        />
      </PageShell>
    );
  }

  const associationTag = trip.projectId ? '项目差旅' : trip.leadId ? '售前差旅' : '一般差旅';
  const action = trip.status === 'approved'
    ? <Button type="primary" size="small" loading={actionLoading} onClick={() => runTransition(startTrip, '已标记为进行中')}>开始出差</Button>
    : trip.status === 'in_progress'
      ? <Button type="primary" size="small" loading={actionLoading} onClick={() => runTransition(endTrip, '已标记为待报销')}>结束出差</Button>
      : trip.status === 'to_reimburse'
        ? <Button type="primary" size="small" loading={actionLoading} onClick={() => runTransition(closeTrip, '差旅已关闭')}>关闭差旅</Button>
        : undefined;

  return (
    <PageShell breadcrumbs={breadcrumbs} className="trip-detail">
      <ProcessOverview
        identifier={trip.tripNo}
        title={`${trip.applicantName} · ${trip.destinations.join('、')}`}
        tags={(
          <>
            <Tag color={statusConfig[trip.status].color}>{statusConfig[trip.status].text}</Tag>
            <Tag>{trip.department}</Tag>
            <Tag color="arcoblue">{associationTag}</Tag>
          </>
        )}
        currentStep={statusStep[trip.status]}
        steps={[
          { key: 'draft', title: '申请填写' },
          { key: 'approval', title: '审批' },
          { key: 'ready', title: '待出发' },
          { key: 'travel', title: '出差中' },
          { key: 'reimburse', title: '报销' },
          { key: 'closed', title: '归档' },
        ]}
        actions={action}
      />

      <ProcessMetricGrid items={[
        { key: 'destination', label: '目的地', value: trip.destinations.join('、') || '—' },
        { key: 'days', label: '出差天数', value: `${trip.days} 天` },
        { key: 'schedule', label: '出差日期', value: `${trip.startDate} 至 ${trip.endDate}` },
        { key: 'estimate', label: '预计费用', value: money(trip.estimatedTotalCost) },
        {
          key: 'recorded',
          label: '已录费用',
          value: money(recordedExpense),
          tone: recordedExpense > trip.estimatedTotalCost ? 'danger' : 'neutral',
        },
        {
          key: 'approval',
          label: '审批进度',
          value: approvalProgress.total ? `${approvalProgress.completed}/${approvalProgress.total}` : '无审批记录',
          tone: approvalProgress.total > 0 && approvalProgress.completed === approvalProgress.total ? 'success' : 'neutral',
        },
      ]} />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          {trip.status === 'approved' && (
            <ComplianceGuide
              destination={trip.destinations[0]}
              days={trip.days}
              department={trip.department || '技术部'}
              companions={trip.companions ?? []}
            />
          )}
          <Card size="small" className="trip-detail__tabs-card">
            <Tabs activeTab={activeTab} onChange={setActiveTab}>
              <TabPane key="basic" title="基本信息"><BasicInfoTab trip={trip} /></TabPane>
              <TabPane key="itinerary" title="旅程管理"><ItineraryTab trip={trip} onUpdate={loadTrip} /></TabPane>
              <TabPane key="expense" title="费用管理"><ExpenseTab trip={trip} onUpdate={loadTrip} /></TabPane>
              <TabPane key="reimbursement" title="报销管理"><ReimbursementTab trip={trip} onUpdate={loadTrip} /></TabPane>
              <TabPane key="loan" title="借款管理"><LoanTab trip={trip} onUpdate={loadTrip} /></TabPane>
              <TabPane key="subsidy" title="差旅补贴"><SubsidyTab trip={trip} onUpdate={loadTrip} /></TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceMain>

        <ProcessWorkspaceAside>
          <Card title="当前任务" size="small">
            <Space direction="vertical" size={12} className="trip-detail__aside-stack">
              <Tag color={statusConfig[trip.status].color}>{statusConfig[trip.status].text}</Tag>
              <Text>{statusTask[trip.status]}</Text>
              <Text type="secondary">当前工作区：{tabLabels[activeTab]}</Text>
            </Space>
          </Card>

          <Card title="申请与关联" size="small">
            <Descriptions column={1} data={[
              { label: '申请人', value: trip.applicantName },
              { label: '所属部门', value: trip.department || '—' },
              { label: '关联客户', value: trip.customerName || '—' },
              { label: '关联项目', value: trip.projectName || '—' },
              { label: '关联线索', value: trip.leadName || '—' },
              { label: '最近更新', value: trip.updateDate || '—' },
            ]} />
          </Card>

          <Card title="行程安排" size="small">
            <Descriptions column={1} data={[
              { label: '旅程段', value: `${trip.itinerarySegments?.length ?? 0} 段` },
              { label: '交通方式', value: trip.transportModes.map((mode) => transportModeLabels[mode]).join('、') || '—' },
              { label: '住宿意向', value: trip.accommodationIntent === 'hotel' ? '酒店' : trip.accommodationIntent === 'dormitory' ? '宿舍' : '无住宿' },
              { label: '借款安排', value: trip.needLoan ? money(trip.loanAmount ?? 0) : '无需借款' },
              { label: '差旅补贴', value: trip.subsidy ? `${money(trip.subsidy.totalAmount)} · ${trip.subsidy.isPaid ? '已发放' : '待发放'}` : '待核算' },
            ]} />
          </Card>

          <Card title="出差目的" size="small">
            <Paragraph className="trip-detail__purpose">{trip.purpose || '未填写'}</Paragraph>
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>
    </PageShell>
  );
}
