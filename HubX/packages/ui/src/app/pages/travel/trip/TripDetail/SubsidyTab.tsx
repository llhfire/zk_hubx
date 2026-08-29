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
  Modal,
} from '@arco-design/web-react';
import {
  IconStorage,
  IconCalendar,
  IconClockCircle,
  IconLocation,
} from '@arco-design/web-react/icon';
import type { Trip, TravelSubsidy } from '../../types';
import { calculateSubsidy } from '../../travel-api';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface SubsidyTabProps {
  trip: Trip;
  onUpdate: () => void;
}

export function SubsidyTab({ trip, onUpdate }: SubsidyTabProps) {
  const [loading, setLoading] = useState(false);
  const [subsidy, setSubsidy] = useState<TravelSubsidy | null>(trip.subsidy || null);
  const [selectedAttendance, setSelectedAttendance] = useState<{
    date: string;
    status: '正常' | '异常';
    time: string;
    location: string;
    note: string;
    valid: boolean;
  } | null>(null);

  const attendanceRecords = (() => {
    const records = [];
    const start = new Date(`${trip.startDate}T00:00:00`);
    const end = new Date(`${trip.endDate}T00:00:00`);
    let index = 0;
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10);
      const abnormal = index === 1 && trip.days >= 4;
      records.push({
        date,
        status: abnormal ? '异常' as const : '正常' as const,
        time: abnormal ? '-' : '09:08 / 18:12',
        location: abnormal ? '未获取到目的地打卡' : `${trip.destinations[0] ?? '出差地'} · 客户现场`,
        note: abnormal ? '缺少目的地打卡，需补充说明后再计入补贴天数。' : '上下班打卡完整，定位与出差目的地一致。',
        valid: !abnormal,
      });
      index += 1;
    }
    return records;
  })();

  const calendarMonth = trip.startDate.slice(0, 7);
  const monthStart = new Date(`${calendarMonth}-01T00:00:00`);
  const monthDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const leadingBlanks = monthStart.getDay();
  const attendanceMap = new Map(attendanceRecords.map(record => [record.date, record]));
  const effectiveDays = attendanceRecords.filter(record => record.valid).length;

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
                  <Text style={{ fontWeight: 500 }}>自然日</Text>
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
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border-2)', fontFamily: "'Inter Variable', Arial, sans-serif", fontSize: 13 }}>
              <Text type="secondary">计算公式：</Text> ¥{subsidy?.standard} × {subsidy?.days} 天 = <Text bold style={{ color: '#722ed1' }}>¥{subsidy?.totalAmount.toLocaleString()}</Text>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card title={`${calendarMonth} 打卡日历`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} style={{ color: 'var(--color-text-3)', fontSize: 11, textAlign: 'center' }}>{day}</div>
              ))}
              {Array.from({ length: leadingBlanks }).map((_, index) => <span key={`blank-${index}`} />)}
              {Array.from({ length: monthDays }).map((_, index) => {
                const day = index + 1;
                const date = `${calendarMonth}-${String(day).padStart(2, '0')}`;
                const attendance = attendanceMap.get(date);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!attendance}
                    onClick={() => attendance && setSelectedAttendance(attendance)}
                    aria-label={attendance ? `${date} ${attendance.status}` : date}
                    style={{
                      minHeight: 34,
                      padding: 2,
                      border: attendance ? `1px solid ${attendance.valid ? 'rgb(var(--success-3))' : 'rgb(var(--danger-3))'}` : '1px solid transparent',
                      borderRadius: 6,
                      background: attendance ? (attendance.valid ? 'rgb(var(--success-1))' : 'rgb(var(--danger-1))') : 'transparent',
                      color: attendance ? 'var(--color-text-1)' : 'var(--color-text-4)',
                      cursor: attendance ? 'pointer' : 'default',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ display: 'block' }}>{day}</span>
                    {attendance && <span style={{ display: 'block', fontSize: 9, color: attendance.valid ? 'rgb(var(--success-6))' : 'rgb(var(--danger-6))' }}>{attendance.status}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border-2)', fontSize: 12 }}>
              <div><strong>有效出差 {effectiveDays} 天</strong> / 申请 {attendanceRecords.length} 天</div>
              <div style={{ color: 'var(--color-text-3)', marginTop: 3 }}>正常打卡计入补贴；异常日期需补充说明后复核。</div>
            </div>
          </Card>
        </Col>

      </Row>

      <Card title="发放规则">
        <div>
          <div style={{ fontSize: 12, color: '#86909c' }}>
            <div>• 差旅补贴随当月工资一起发放</div>
            <div>• 不计入工资基数，作为独立津贴</div>
            <div>• 出差单关闭后自动汇总到当月工资</div>
            <div>• 往返路途当日享受补贴</div>
          </div>
        </div>
      </Card>

      <Modal
        title={selectedAttendance ? `打卡详情 · ${selectedAttendance.date}` : '打卡详情'}
        visible={Boolean(selectedAttendance)}
        footer={null}
        onCancel={() => setSelectedAttendance(null)}
      >
        {selectedAttendance && (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Tag color={selectedAttendance.valid ? 'green' : 'red'}>{selectedAttendance.status}</Tag>
            <div><Text type="secondary">打卡时间：</Text>{selectedAttendance.time}</div>
            <div><Text type="secondary">打卡位置：</Text>{selectedAttendance.location}</div>
            <div><Text type="secondary">核验说明：</Text>{selectedAttendance.note}</div>
            <div><Text type="secondary">补贴计入：</Text>{selectedAttendance.valid ? '计入 1 天' : '暂不计入'}</div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
