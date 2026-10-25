import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Button,
  Card,
  Descriptions,
  Message,
  Modal,
  Result,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconCheckCircle,
  IconFile,
  IconPlus,
  IconPrinter,
  IconSafe,
  IconQrcode,
  IconSend,
  IconPhone,
  IconScan,
} from '@arco-design/web-react/icon';
import {
  PageBreadcrumb,
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '../../../../components/ui';
import type { Trip, TripStatus } from '../types';
import { closeTrip, endTrip, getTripDetail, startTrip } from '../travel-api';
import { TripCoreProfileCard } from './TripDetail/TripCoreProfileCard';
import { BasicInfoTab } from './TripDetail/BasicInfoTab';
import { TripJourneyTimeline } from './TripDetail/TripJourneyTimeline';
import { CostSummaryTab } from './TripDetail/CostSummaryTab';
import { ApprovalTimelineTab } from './TripDetail/ApprovalTimelineTab';
import { ExpenseTab } from './TripDetail/ExpenseTab';
import { ReimbursementTab } from './TripDetail/ReimbursementTab';
import { LoanTab } from './TripDetail/LoanTab';
import { SubsidyTab } from './TripDetail/SubsidyTab';
import { TripStagePopover } from './TripDetail/TripStagePopover';
import { buildTripStageSummaries } from './tripStageSummary';
import {
  buildTripProcessMetrics,
  MAIN_TAB_LABELS,
  SIDE_TAB_LABELS,
  VALID_MAIN_TABS,
  VALID_SIDE_TABS,
  type TripMainTabKey,
  type TripSideTabKey,
} from './tripDetailMetrics';
import './tripDetail.css';

const { TabPane } = Tabs;

const statusConfig: Record<TripStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  in_progress: { color: 'blue', text: '进行中' },
  to_reimburse: { color: 'cyan', text: '待报销' },
  closed: { color: 'gray', text: '已结项' },
  rejected: { color: 'red', text: '已驳回' },
  cancelled: { color: 'gray', text: '已取消' },
};

const statusStepIndex: Record<TripStatus, number> = {
  draft: 0,
  pending: 1,
  approved: 2,
  in_progress: 3,
  to_reimburse: 4,
  closed: 5,
  rejected: 1,
  cancelled: 0,
};

const CITY_LIMITS: Record<string, { level: string; hotel: number; transport: number; meal: number }> = {
  '北京': { level: '一线城市', hotel: 500, transport: 80, meal: 50 },
  '上海': { level: '一线城市', hotel: 500, transport: 80, meal: 50 },
  '广州': { level: '一线城市', hotel: 500, transport: 80, meal: 50 },
  '深圳': { level: '一线城市', hotel: 500, transport: 80, meal: 50 },
  '杭州': { level: '新一线/二线', hotel: 350, transport: 50, meal: 40 },
  '成都': { level: '新一线/二线', hotel: 350, transport: 50, meal: 40 },
  '武汉': { level: '新一线/二线', hotel: 350, transport: 50, meal: 40 },
  '南京': { level: '新一线/二线', hotel: 350, transport: 50, meal: 40 },
};

export function TripDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [qrcodeModalVisible, setQrcodeModalVisible] = useState(false);
  const [bizTravelModalVisible, setBizTravelModalVisible] = useState(false);

  const tabParam = searchParams.get('tab') || searchParams.get('main');
  const sideParam = searchParams.get('side');

  const resolveActiveMainTab = (param: string | null): TripMainTabKey => {
    if (!param) return 'expenses';
    if (VALID_MAIN_TABS.includes(param as TripMainTabKey)) {
      return param as TripMainTabKey;
    }
    if (param === 'expense') return 'expenses';
    return 'expenses';
  };

  const resolveActiveSideTab = (param: string | null): TripSideTabKey => {
    if (param === 'approval') return 'approval';
    if (param === 'itinerary') return 'itinerary';
    return 'itinerary';
  };

  const activeMainTab = resolveActiveMainTab(tabParam);
  const activeSideTab = resolveActiveSideTab(sideParam);

  const handleMainTabChange = useCallback((nextKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextKey === 'expenses') {
        next.delete('tab');
        next.delete('main');
      } else {
        next.set('tab', nextKey);
        next.delete('main');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSideTabChange = useCallback((nextKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextKey === 'itinerary') {
        next.delete('side');
      } else {
        next.set('side', nextKey);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleNavigateTab = useCallback((target: { main?: TripMainTabKey; side?: TripSideTabKey }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (target.main) {
        if (target.main === 'expenses') {
          next.delete('tab');
          next.delete('main');
        } else {
          next.set('tab', target.main);
          next.delete('main');
        }
      }
      if (target.side) {
        if (target.side === 'itinerary') {
          next.delete('side');
        } else {
          next.set('side', target.side);
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const handleStartTrip = () => {
    Modal.confirm({
      title: '确认开始出差',
      content: '确认开启出差执行阶段？出差期间请在左侧及时记录记账流水与异地考勤。',
      okButtonProps: { loading: actionLoading },
      onOk: () => runTransition(startTrip, '已标记开始出差，祝差发行程顺利！'),
    });
  };

  const handleEndTrip = () => {
    Modal.confirm({
      title: '确认结束出差',
      content: '确认行程已执行完毕？结束后将进入报销核销与借款冲账阶段。',
      okButtonProps: { loading: actionLoading },
      onOk: () => runTransition(endTrip, '出差已结束，进入报销核销阶段'),
    });
  };

  const handleCloseTrip = () => {
    Modal.confirm({
      title: '确认关闭出差',
      content: '确认所有报销单据已核销完毕并归档？关闭后出差单将转为只读归档状态。',
      okButtonProps: { loading: actionLoading },
      onOk: () => runTransition(closeTrip, '出差已成功归档结项'),
    });
  };

  const currentStep = useMemo(() => {
    if (!trip) return 0;
    return statusStepIndex[trip.status] ?? 0;
  }, [trip]);

  const stageSummaries = useMemo(() => {
    if (!trip) return [];
    return buildTripStageSummaries(trip);
  }, [trip]);

  const processMetrics = useMemo(() => {
    if (!trip) return [];
    return buildTripProcessMetrics(trip, handleNavigateTab);
  }, [trip, handleNavigateTab]);

  if (loading || !trip) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin dot />
      </div>
    );
  }

  const destination = trip.destinations?.[0] || '杭州';
  const cityRule = CITY_LIMITS[destination] || { level: '二三线城市', hotel: 300, transport: 40, meal: 30 };

  return (
    <PageShell className="trip-detail">
      <PageBreadcrumb
        items={[
          { label: '差旅管理', to: '/travel/dashboard' },
          { label: '出差申请', to: '/travel/trips' },
          { label: trip.tripNo },
        ]}
      />

      <ProcessOverview
        identifier={trip.tripNo}
        title={`${trip.applicantName} · ${trip.destinations.join('、')}`}
        tags={(
          <>
            <Tag color={statusConfig[trip.status].color}>{statusConfig[trip.status].text}</Tag>
            <Tag>{trip.department || '销售部'}</Tag>
            <Tag color="arcoblue">
              {trip.tripType === 'project' ? '项目履约差旅' : trip.tripType === 'pre_sales' ? '售前支持差旅' : '日常行政差旅'}
            </Tag>
          </>
        )}
        currentStep={currentStep}
        steps={stageSummaries.map((summary) => ({
          key: summary.key,
          title: (
            <span className="trip-stage-step-title">
              <TripStagePopover summary={summary} onNavigate={handleNavigateTab}>
                {summary.label}
              </TripStagePopover>
              {summary.statusText && (
                <span className="trip-stage-step-status">{summary.statusText}</span>
              )}
            </span>
          ),
        }))}
        actions={
          <Space>
            {trip.status === 'approved' && (
              <Button type="primary" size="small" loading={actionLoading} onClick={handleStartTrip}>
                开始出差
              </Button>
            )}
            {trip.status === 'in_progress' && (
              <Button type="primary" size="small" status="warning" loading={actionLoading} onClick={handleEndTrip}>
                结束出差
              </Button>
            )}
            {trip.status === 'to_reimburse' && (
              <Button type="primary" size="small" status="success" loading={actionLoading} onClick={handleCloseTrip}>
                结项归档
              </Button>
            )}
            <Button
              size="small"
              icon={<IconPrinter />}
              onClick={() => setPrintModalVisible(true)}
            >
              打印差旅单
            </Button>
          </Space>
        }
      />

      <ProcessMetricGrid items={processMetrics} />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <TripCoreProfileCard trip={trip} />

          <Card size="small" className="trip-detail__tabs-card">
            <Tabs activeTab={activeMainTab} onChange={handleMainTabChange}>
              <TabPane key="budget" title={MAIN_TAB_LABELS.budget}>
                <BasicInfoTab trip={trip} />
              </TabPane>
              <TabPane key="expenses" title={MAIN_TAB_LABELS.expenses}>
                <ExpenseTab
                  trip={trip}
                  onUpdate={loadTrip}
                  selectedSegmentId={selectedSegmentId}
                  onClearSegmentFilter={() => setSelectedSegmentId(null)}
                  onNavigateToReimburse={() => handleMainTabChange('reimbursement')}
                />
              </TabPane>
              <TabPane key="loan" title={MAIN_TAB_LABELS.loan}>
                <LoanTab trip={trip} onUpdate={loadTrip} />
              </TabPane>
              <TabPane key="subsidy" title={MAIN_TAB_LABELS.subsidy}>
                <SubsidyTab trip={trip} onUpdate={loadTrip} />
              </TabPane>
              <TabPane key="reimbursement" title={MAIN_TAB_LABELS.reimbursement}>
                <ReimbursementTab trip={trip} onUpdate={loadTrip} />
              </TabPane>
              <TabPane key="cost" title={MAIN_TAB_LABELS.cost}>
                <CostSummaryTab trip={trip} />
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceMain>

        <ProcessWorkspaceAside>
          <Card size="small" className="trip-detail__aside-tabs-card trip-detail__aside-timeline-card">
            <Tabs activeTab={activeSideTab} onChange={handleSideTabChange}>
              <TabPane key="itinerary" title={SIDE_TAB_LABELS.itinerary}>
                <TripJourneyTimeline
                  trip={trip}
                  onUpdate={loadTrip}
                  selectedSegmentId={selectedSegmentId}
                  onSelectSegment={setSelectedSegmentId}
                />
              </TabPane>
              <TabPane key="approval" title={SIDE_TAB_LABELS.approval}>
                <ApprovalTimelineTab trip={trip} />
              </TabPane>
            </Tabs>
          </Card>

          <Card
            size="small"
            title="企业差旅制度速查"
            className="trip-detail__aside-policy-card"
            style={{ marginTop: 16 }}
          >
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{destination}</span>
                <Tag color="blue" size="small">{cityRule.level}</Tag>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                根据目的地消费评级核定上限
              </div>
            </div>

            <Descriptions
              column={1}
              size="small"
              data={[
                { label: '住宿标准', value: `≤ ¥${cityRule.hotel}/天 (标间/大床房)` },
                { label: '市内交通', value: `≤ ¥${cityRule.transport}/天 (高铁二等座优先)` },
                { label: '工作餐补', value: `¥${cityRule.meal}/天 (按考勤核发，免发票)` },
                { label: '借款冲抵', value: '差旅返程后 5 个工作日内提报报销' },
              ]}
            />
          </Card>

          <Card
            size="small"
            title="差旅协同助手"
            className="trip-detail__aside-helper-card"
            style={{ marginTop: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <Button
                type="outline"
                size="small"
                long
                icon={<IconQrcode style={{ color: 'rgb(var(--primary-6))' }} />}
                onClick={() => setQrcodeModalVisible(true)}
              >
                企微/手机扫码拍票同步
              </Button>
              <Button
                type="outline"
                size="small"
                long
                icon={<IconSend style={{ color: '#00b42a' }} />}
                onClick={() => setBizTravelModalVisible(true)}
              >
                企业商旅免垫资直订通道
              </Button>
              <div style={{ padding: '8px 10px', background: 'var(--color-fill-1)', borderRadius: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-2)', fontWeight: 600 }}>
                  <IconPhone style={{ color: 'rgb(var(--primary-6))' }} />
                  <span>差旅行政应急与保障热线</span>
                </div>
                <div style={{ marginTop: 4, color: 'var(--color-text-3)', fontSize: 11 }}>
                  400-820-9988 (7×24h 专家客服支持)
                </div>
              </div>
            </Space>
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

      {/* 打印差旅单凭证套打模态框 */}
      <Modal
        title="差旅申请与综合结项凭证套打预览"
        visible={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        style={{ width: 720 }}
        footer={(
          <Space>
            <Button onClick={() => setPrintModalVisible(false)}>取消</Button>
            <Button
              type="primary"
              icon={<IconPrinter />}
              onClick={() => {
                Message.success('已发送打印任务至系统打印机');
                window.print?.();
              }}
            >
              立即调用打印 (Print)
            </Button>
          </Space>
        )}
      >
        <div style={{ padding: '10px 16px', background: '#fff', border: '1px solid #e5e6eb', borderRadius: 4 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>中科智汇（ZK HubX）差旅综合结项单</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
              单号：{trip.tripNo} · 发起人：{trip.applicantName} ({trip.department}) · 日期：{trip.createDate}
            </div>
          </div>

          <Descriptions
            column={2}
            size="small"
            data={[
              { label: '出差人员', value: `${trip.applicantName} (${trip.department})` },
              { label: '出差目的地', value: trip.destinations.join('、') },
              { label: '出差周期', value: `${trip.startDate} ~ ${trip.endDate} (${trip.days} 天)` },
              { label: '出差事由', value: trip.purpose || '项目驻场与业务拓展' },
              { label: '关联项目', value: trip.projectName || '—' },
              { label: '关联客户', value: trip.customerName || '—' },
            ]}
          />

          <div style={{ margin: '14px 0 8px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid #f2f3f5', paddingBottom: 4 }}>
            资金清算轧差结果
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center', background: '#f7f8fa', padding: '10px 8px', borderRadius: 4 }}>
            <div>
              <div style={{ fontSize: 11, color: '#86909c' }}>申报报销总额</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#165dff', marginTop: 2 }}>¥{trip.estimatedTotalCost || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#86909c' }}>异地免税津贴</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#722ed1', marginTop: 2 }}>¥{trip.subsidy?.totalAmount || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#86909c' }}>备用金借款扣减</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ff7d00', marginTop: 2 }}>-¥{trip.loanAmount || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#86909c' }}>公司实付/应退款</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#00b42a', marginTop: 2 }}>
                ¥{Math.max(0, (trip.estimatedTotalCost || 0) + (trip.subsidy?.totalAmount || 0) - (trip.loanAmount || 0))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', fontSize: 12, color: '#4e5969', borderTop: '1px dashed #e5e6eb', paddingTop: 12 }}>
            <div>出差申请人：__________</div>
            <div>部门负责人：__________</div>
            <div>财务审核：__________</div>
            <div>出纳打款：__________</div>
          </div>
        </div>
      </Modal>

      {/* 企微/手机扫码拍票协同模态框 */}
      <Modal
        title="企微 / 微信扫码拍票协同"
        visible={qrcodeModalVisible}
        onCancel={() => setQrcodeModalVisible(false)}
        footer={(
          <Button type="primary" onClick={() => setQrcodeModalVisible(false)}>
            完成
          </Button>
        )}
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: 160,
              height: 160,
              margin: '0 auto 16px',
              border: '2px dashed #165dff',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f7faff',
            }}
          >
            <IconQrcode style={{ fontSize: 88, color: '#165dff' }} />
            <span style={{ fontSize: 11, color: '#86909c', marginTop: 4 }}>出差单专属票夹识别码</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)' }}>
            微信或企业微信扫一扫拍照
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4, maxWidth: 320, marginInline: 'auto' }}>
            差旅在外无需保存纸质小票，手机拍照即自动 OCR 解析发票抬头、税号与金额，实时回传同步至本单记账流水！
          </div>
          <div style={{ marginTop: 16 }}>
            <Button
              size="small"
              type="outline"
              icon={<IconScan />}
              onClick={() => {
                Message.success('已模拟手机扫码回传：新增一张 ¥85 的市内打车电子发票！');
                setQrcodeModalVisible(false);
                loadTrip();
              }}
            >
              模拟手机端扫码上传发票测试
            </Button>
          </div>
        </div>
      </Modal>

      {/* 企业商旅直订免垫资通道模态框 */}
      <Modal
        title="企业商旅免垫资直订通道"
        visible={bizTravelModalVisible}
        onCancel={() => setBizTravelModalVisible(false)}
        footer={(
          <Button type="primary" onClick={() => setBizTravelModalVisible(false)}>
            我知道了
          </Button>
        )}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 12, fontSize: 13, lineHeight: '22px' }}>
            公司已打通<strong>携程商旅</strong>与<strong>滴滴企业版</strong>系统。员工在此出差申请批准后，可直接在商旅平台订购机票、高铁与协议酒店：
          </div>
          <div style={{ background: '#f7f8fa', padding: 12, borderRadius: 6, fontSize: 12 }}>
            <p style={{ margin: '4px 0' }}>✓ <strong>企业统一月结支付</strong>：无需员工个人刷卡垫资</p>
            <p style={{ margin: '4px 0' }}>✓ <strong>对公大客户合规价</strong>：自动匹配本次目的地最高限额（杭州 ≤ ¥350/天）</p>
            <p style={{ margin: '4px 0' }}>✓ <strong>免贴票免报销</strong>：电子行程单月度批量入账，自动沉淀项目成本</p>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <Button type="primary" long onClick={() => Message.info('已为您唤起携程商旅企业端...')}>
              进入携程商旅直订
            </Button>
            <Button type="outline" long onClick={() => Message.info('已为您唤起滴滴企业版...')}>
              进入滴滴企业出行
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
