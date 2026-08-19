import { useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Divider,
  Space,
  Typography,
  Grid,
  Message,
  Spin,
} from '@arco-design/web-react';
import {
  IconCalculator,
  IconStorage,
  IconCalendar,
  IconClockCircle,
  IconCheckCircle,
  IconLocation,
  IconUser,
  IconRefresh,
} from '@arco-design/web-react/icon';
import type { Trip, TravelSubsidy } from '../../types';
import { calculateSubsidy } from '../../travel-api';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface SubsidyTabProps {
  trip: Trip;
  onUpdate: () => void;
}

// 模拟考勤数据
const mockPunchRecords = [
  { date: '2026-04-28', clockIn: '08:55', clockOut: '18:30', location: '杭州阿里园区', status: '正常' },
  { date: '2026-04-29', clockIn: '09:00', clockOut: '19:15', location: '杭州阿里园区', status: '正常' },
  { date: '2026-04-30', clockIn: '08:50', clockOut: '18:45', location: '杭州阿里园区', status: '正常' },
  { date: '2026-05-01', clockIn: null, clockOut: null, location: '-', status: '节假日' },
  { date: '2026-05-02', clockIn: '09:10', clockOut: '19:30', location: '杭州阿里园区', status: '迟到10分钟' },
  { date: '2026-05-03', clockIn: '08:55', clockOut: '18:20', location: '杭州阿里园区', status: '正常' },
  { date: '2026-05-04', clockIn: '08:30', clockOut: '10:00', location: '杭州高铁站', status: '返程日' },
];

const statusColors: Record<string, string> = {
  '正常': 'green',
  '节假日': 'blue',
  '迟到10分钟': 'orange',
  '返程日': 'gray',
};

export function SubsidyTab({ trip, onUpdate }: SubsidyTabProps) {
  const [loading, setLoading] = useState(false);
  const [subsidy, setSubsidy] = useState<TravelSubsidy | null>(trip.subsidy || null);

  const loadSubsidy = async () => {
    setLoading(true);
    try {
      const data = await calculateSubsidy(trip.id);
      setSubsidy(data);
    } catch {
      Message.error('计算补贴失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const data = await calculateSubsidy(trip.id);
      setSubsidy(data);
      Message.success('补贴已重新计算');
    } catch {
      Message.error('计算失败');
    } finally {
      setLoading(false);
    }
  };

  const workDays = mockPunchRecords.filter((r) => r.status === '正常' || r.status === '迟到10分钟').length;
  const lateCount = mockPunchRecords.filter((r) => r.status.includes('迟到')).length;

  const cardStyle = { marginBottom: 16 };

  return (
    <div style={{ padding: 16 }}>
      {/* 顶部：补贴总额 + 计算参数 并排 */}
      <Row gutter={16} style={cardStyle}>
        {/* 补贴总额 */}
        <Col span={8}>
          <Card style={{ background: 'linear-gradient(135deg, #f0f5ff, #f5f0ff)', borderColor: '#d6e4ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">差旅补贴总额</Text>
              <Tag color={subsidy?.isPaid ? 'green' : 'orange'} size="small">
                {subsidy?.isPaid ? '已发放' : '待发放'}
              </Tag>
            </div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#722ed1' }}>
              ¥{subsidy?.totalAmount.toLocaleString() || '-'}
            </div>
            <div style={{ fontSize: 12, color: '#86909c', marginTop: 4 }}>随当月工资发放</div>
          </Card>
        </Col>

        {/* 计算参数 */}
        <Col span={8}>
          <Card>
            <div style={{ fontWeight: 500, marginBottom: 12 }}>计算参数</div>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Space size={8}>
                  <IconCalendar style={{ color: '#86909c' }} />
                  <Text type="secondary">模式</Text>
                  <Text style={{ fontWeight: 500 }}>{subsidy?.calcMode === 'calendar_day' ? '自然日' : '工作日'}</Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space size={8}>
                  <IconStorage style={{ color: '#86909c' }} />
                  <Text type="secondary">标准</Text>
                  <Text style={{ fontWeight: 500 }}>¥{subsidy?.standard}/天</Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space size={8}>
                  <IconClockCircle style={{ color: '#86909c' }} />
                  <Text type="secondary">天数</Text>
                  <Text style={{ fontWeight: 500 }}>{subsidy?.days}天</Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space size={8}>
                  <IconLocation style={{ color: '#86909c' }} />
                  <Text type="secondary">城市</Text>
                  <Text style={{ fontWeight: 500 }}>{subsidy?.cityLevel === 'first_tier' ? '一线' : '二线'}</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 考勤概况 */}
        <Col span={8}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontWeight: 500 }}>考勤概况</Text>
              <Button type="text" size="small" icon={<IconRefresh />} onClick={() => Message.info('已同步企微打卡数据')} />
            </div>
            <Row gutter={8}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: 8, background: '#e8ffea', borderRadius: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#00b42a' }}>{workDays}</div>
                  <div style={{ fontSize: 10, color: '#86909c' }}>出勤天数</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: 8, background: '#fff7e6', borderRadius: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff7d00' }}>{lateCount}</div>
                  <div style={{ fontSize: 10, color: '#86909c' }}>迟到次数</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: 8, background: '#f2f3ff', borderRadius: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#165dff' }}>{subsidy?.days}</div>
                  <div style={{ fontSize: 10, color: '#86909c' }}>补贴天数</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 中部：计算公式 + 考勤记录 并排 */}
      <Row gutter={16}>
        {/* 计算公式 */}
        <Col span={10}>
          <Card title="计算公式" style={{ height: '100%' }}>
            <div style={{ padding: 12, background: '#f7f8fa', borderRadius: 8, fontFamily: 'monospace', fontSize: 14 }}>
              <div style={{ color: '#86909c', fontSize: 12, marginBottom: 4 }}>公式</div>
              <div>补贴金额 = 补贴标准 × 天数</div>
              <div style={{ color: '#86909c', marginTop: 4 }}>
                = ¥{subsidy?.standard} × {subsidy?.days}天
              </div>
              <div style={{ color: '#722ed1', fontWeight: 'bold', marginTop: 4 }}>
                = ¥{subsidy?.totalAmount.toLocaleString()}
              </div>
            </div>

            <Divider />

            <div>
              <Title heading={6} style={{ marginBottom: 8 }}>发放规则</Title>
              <div style={{ fontSize: 12, color: '#86909c' }}>
                <div>• 差旅补贴随当月工资一起发放</div>
                <div>• 不计入工资基数，作为独立津贴</div>
                <div>• 出差单关闭后自动汇总到当月工资</div>
                <div>• 往返路途当日享受补贴</div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 考勤记录 */}
        <Col span={14}>
          <Card
            title={
              <Space>
                <IconUser style={{ color: '#86909c' }} />
                <span>出差考勤记录</span>
              </Space>
            }
            extra={<Tag size="small">{mockPunchRecords.length} 天</Tag>}
            style={{ height: '100%' }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {mockPunchRecords.map((record, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '6px 8px',
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12, width: 50 }}>
                    {record.date.slice(5)}
                  </Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, width: 50 }}>
                    {record.clockIn || '-'}
                  </Text>
                  <Text type="secondary">→</Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, width: 50 }}>
                    {record.clockOut || '-'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>{record.location}</Text>
                  <Tag color={statusColors[record.status] || 'gray'} size="small">
                    {record.status}
                  </Tag>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
