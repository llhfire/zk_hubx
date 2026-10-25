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

  const attendanceRate = attendanceRecords.length > 0
    ? Math.round((effectiveDays / attendanceRecords.length) * 100)
    : 100;
  const abnormalCount = attendanceRecords.length - effectiveDays;

  return (
    <div className="trip-tab-pane">
      {/* 顶部专业微指标卡片组（4列对齐） */}
      <div className="trip-stat-grid">
        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8f3ff', color: '#165dff' }}>
                <IconStorage />
              </span>
              差旅补贴核定总额
            </span>
            <Tag size="small" color={subsidy?.isPaid ? 'green' : 'orange'}>
              {subsidy?.isPaid ? '已发放' : '待发放'}
            </Tag>
          </div>
          <div className="trip-stat-card__value">
            ¥{subsidy?.totalAmount.toLocaleString() || '0'}
          </div>
          <div className="trip-stat-card__meta">
            <span>发放渠道：随当月工资</span>
            <span>独立津贴税前核发</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#f5e8ff', color: '#722ed1' }}>
                <IconLocation />
              </span>
              补贴核定标准
            </span>
            <Tag size="small" color="purple">
              {subsidy?.cityLevel === 'first_tier' ? '一线定额' : '二线定额'}
            </Tag>
          </div>
          <div className="trip-stat-card__value">
            ¥{subsidy?.standard || 0} / 天
          </div>
          <div className="trip-stat-card__meta">
            <span>目的地：{trip.destinations?.[0] || '默认城市'}</span>
            <span>按自然日考勤折算</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8ffea', color: '#00b42a' }}>
                <IconCalendar />
              </span>
              有效考勤天数
            </span>
            <Tag size="small" color="green">已核定</Tag>
          </div>
          <div className="trip-stat-card__value">
            {effectiveDays} 天
          </div>
          <div className="trip-stat-card__meta">
            <span>计划申请：{trip.days} 天</span>
            <span>实际考勤 {attendanceRecords.length} 天</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span
                className="trip-stat-card__icon"
                style={{
                  background: abnormalCount > 0 ? '#ffece8' : '#e8ffea',
                  color: abnormalCount > 0 ? '#f53f3f' : '#00b42a',
                }}
              >
                <IconClockCircle />
              </span>
              异地打卡核验率
            </span>
            <Tag size="small" color={abnormalCount > 0 ? 'red' : 'green'}>
              {abnormalCount > 0 ? `${abnormalCount} 天异常` : '考勤完整'}
            </Tag>
          </div>
          <div className="trip-stat-card__value" style={{ color: abnormalCount > 0 ? '#f53f3f' : '#00b42a' }}>
            {attendanceRate}%
          </div>
          <div className="trip-stat-card__meta">
            <span>正常考勤：{effectiveDays} 天</span>
            <span>支持异常申述复核</span>
          </div>
        </div>
      </div>

      {/* 中部双列规整布局 */}
      <Row gutter={16}>
        {/* 左侧：打卡日历 */}
        <Col span={14}>
          <div
            style={{
              background: 'var(--color-bg-2, #ffffff)',
              border: '1px solid var(--color-border-2, #e5e6eb)',
              borderRadius: 6,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '1px solid var(--color-border-1, #f2f3f5)',
              }}
            >
              <Space size={6}>
                <IconCalendar style={{ color: 'var(--color-primary-6)' }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{calendarMonth} 异地出差打卡核验日历</span>
              </Space>
              <Tag size="small" color="blue">点击日期可查具体打卡轨迹</Tag>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} style={{ color: 'var(--color-text-3)', fontSize: 12, textAlign: 'center', fontWeight: 500 }}>
                  {day}
                </div>
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
                      minHeight: 38,
                      padding: 4,
                      border: attendance ? `1px solid ${attendance.valid ? 'rgb(var(--success-3))' : 'rgb(var(--danger-3))'}` : '1px solid transparent',
                      borderRadius: 6,
                      background: attendance ? (attendance.valid ? 'rgb(var(--success-1))' : 'rgb(var(--danger-1))') : 'transparent',
                      color: attendance ? 'var(--color-text-1)' : 'var(--color-text-4)',
                      cursor: attendance ? 'pointer' : 'default',
                      fontSize: 12,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: attendance ? 600 : 400 }}>{day}</span>
                    {attendance && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: attendance.valid ? 'rgb(var(--success-6))' : 'rgb(var(--danger-6))',
                          marginTop: 2,
                        }}
                      >
                        {attendance.status}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid var(--color-border-2)',
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>有效出差 {effectiveDays} 天</strong> / 申请 {attendanceRecords.length} 天
              </span>
              <span style={{ color: 'var(--color-text-3)' }}>
                打卡定位需与目的地一致方可计入补贴天数
              </span>
            </div>
          </div>
        </Col>

        {/* 右侧：计算参数与发放规则 */}
        <Col span={10}>
          <div
            style={{
              background: 'var(--color-bg-2, #ffffff)',
              border: '1px solid var(--color-border-2, #e5e6eb)',
              borderRadius: 6,
              padding: '14px 16px',
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--color-border-1, #f2f3f5)',
                }}
              >
                <IconStorage style={{ color: 'var(--color-primary-6)' }} />
                <span>津贴测算公式与发放依据</span>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--color-fill-1)', borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>公式推演</div>
                <div style={{ fontSize: 14 }}>
                  ¥{subsidy?.standard} (日标准) × {effectiveDays} (有效天数) ={' '}
                  <strong style={{ color: 'var(--color-primary-6)', fontSize: 16 }}>
                    ¥{subsidy?.totalAmount.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: '22px' }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--color-text-1)' }}>发放规则说明：</div>
                <div>• 差旅补贴随当月工资一并发放，出差单归档后自动同步薪酬系统；</div>
                <div>• 本津贴属于国家规定范围内的差旅交通餐饮补贴，不扣减日常考勤绩效；</div>
                <div>• 出发当日与返程路途当日均按完整自然日享受补贴；</div>
                <div>• 异常考勤经部门主管与 HR 核准补卡后可申请补发。</div>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px dashed var(--color-border-2)', textAlign: 'right' }}>
              <Button size="small" onClick={handleRecalculate} loading={loading}>
                重新核算补贴
              </Button>
            </div>
          </div>
        </Col>
      </Row>

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
