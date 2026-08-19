import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Card,
  Button,
  Tag,
  Tabs,
  Space,
  Typography,
  Grid,
  Spin,
  Message,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconLocation,
  IconCalendar,
  IconStorage,
  IconHome,
  IconBriefcase,
} from '@arco-design/web-react/icon';
import { ComplianceGuide } from '../components/ComplianceGuide';
import type { Trip, TripStatus } from '../types';
import { getTripDetail, startTrip, endTrip, closeTrip } from '../travel-api';
import { BasicInfoTab } from './TripDetail/BasicInfoTab';
import { ItineraryTab } from './TripDetail/ItineraryTab';
import { ExpenseTab } from './TripDetail/ExpenseTab';
import { ReimbursementTab } from './TripDetail/ReimbursementTab';
import { LoanTab } from './TripDetail/LoanTab';
import { SubsidyTab } from './TripDetail/SubsidyTab';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
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

export function TripDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTripDetail(id);
      setTrip(data);
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始出差
  const handleStartTrip = async () => {
    if (!id) return;
    try {
      await startTrip(id);
      Message.success('已标记为进行中');
      loadTrip();
    } catch (error) {
      Message.error('操作失败');
    }
  };

  // 结束出差
  const handleEndTrip = async () => {
    if (!id) return;
    try {
      await endTrip(id);
      Message.success('已标记为待报销');
      loadTrip();
    } catch (error) {
      Message.error('操作失败');
    }
  };

  // 关闭出差
  const handleCloseTrip = async () => {
    if (!id) return;
    try {
      await closeTrip(id);
      Message.success('差旅已关闭');
      loadTrip();
    } catch (error) {
      Message.error('操作失败');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin />
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 300, gap: 16 }}>
        <Text type="secondary">出差单不存在</Text>
        <Button onClick={() => navigate('/travel/trips')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* 顶部导航 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<IconLeft />}
            onClick={() => navigate('/travel/trips')}
          >
            返回列表
          </Button>
          <div>
            <Title heading={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              出差详情
              <Tag color={statusConfig[trip.status].color}>
                {statusConfig[trip.status].text}
              </Tag>
            </Title>
            <Text type="secondary">{trip.tripNo}</Text>
          </div>
        </div>
        <Space>
          {trip.status === 'approved' && (
            <Button type="primary" onClick={handleStartTrip}>开始出差</Button>
          )}
          {trip.status === 'in_progress' && (
            <Button type="primary" onClick={handleEndTrip}>结束出差</Button>
          )}
          {trip.status === 'to_reimburse' && (
            <Button type="primary" onClick={handleCloseTrip}>关闭差旅</Button>
          )}
        </Space>
      </div>

      {/* 概览信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, background: '#e8f3ff', borderRadius: 8 }}>
                <IconLocation style={{ fontSize: 20, color: '#165dff' }} />
              </div>
              <div>
                <div><Text type="secondary">目的地</Text></div>
                <div style={{ fontWeight: 500 }}>{trip.destinations.join('、')}</div>
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, background: '#e8f3ff', borderRadius: 8 }}>
                <IconCalendar style={{ fontSize: 20, color: '#165dff' }} />
              </div>
              <div>
                <div><Text type="secondary">出差日期</Text></div>
                <div style={{ fontWeight: 500 }}>{trip.startDate} ~ {trip.endDate}</div>
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, background: '#e8f3ff', borderRadius: 8 }}>
                <IconStorage style={{ fontSize: 20, color: '#165dff' }} />
              </div>
              <div>
                <div><Text type="secondary">预计费用</Text></div>
                <div style={{ fontWeight: 500 }}>¥{trip.estimatedTotalCost.toLocaleString()}</div>
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, background: '#e8f3ff', borderRadius: 8 }}>
                <IconHome style={{ fontSize: 20, color: '#165dff' }} />
              </div>
              <div>
                <div><Text type="secondary">关联客户</Text></div>
                <div style={{ fontWeight: 500 }}>{trip.customerName || '-'}</div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 审批通过后显示合规指南 */}
      {trip.status === 'approved' && (
        <ComplianceGuide
          destination={trip.destinations[0]}
          days={Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))}
          department={trip.department || '技术部'}
          companions={trip.companions || []}
        />
      )}

      {/* Tab 内容 */}
      <Card>
        <Tabs defaultActiveTab="basic">
          <TabPane key="basic" title="基本信息">
            <BasicInfoTab trip={trip} />
          </TabPane>
          <TabPane key="itinerary" title="旅程管理">
            <ItineraryTab trip={trip} onUpdate={loadTrip} />
          </TabPane>
          <TabPane key="expense" title="费用管理">
            <ExpenseTab trip={trip} onUpdate={loadTrip} />
          </TabPane>
          <TabPane key="reimbursement" title="报销管理">
            <ReimbursementTab trip={trip} onUpdate={loadTrip} />
          </TabPane>
          <TabPane key="loan" title="借款管理">
            <LoanTab trip={trip} onUpdate={loadTrip} />
          </TabPane>
          <TabPane key="subsidy" title="差旅补贴">
            <SubsidyTab trip={trip} onUpdate={loadTrip} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
