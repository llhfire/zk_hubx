import { Card, Descriptions, Divider, Grid, Space, Table, Tag, Typography } from '@arco-design/web-react';
import {
  IconCheckCircle,
  IconClockCircle,
  IconCompass,
  IconHome,
  IconInfoCircle,
  IconSafe,
  IconStorage,
} from '@arco-design/web-react/icon';
import type { Trip, TransportMode } from '../../types';
import { formatMoney } from '../tripDetailMetrics';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface BasicInfoTabProps {
  trip: Trip;
}

const transportModeLabels: Record<TransportMode, string> = {
  high_speed_rail: '高铁二等座',
  bullet_train: '动车二等座',
  airplane: '经济舱',
  self_drive: '自驾标准',
  bus: '大巴',
  ferry: '轮船',
  other: '其他',
};

export function BasicInfoTab({ trip }: BasicInfoTabProps) {
  const budgetItems = [
    { key: 'transport', label: '交通预估', amount: trip.estimatedTransportCost, note: trip.transportModes.map((m) => transportModeLabels[m] || m).join('、') || '公共交通' },
    { key: 'accommodation', label: '住宿预估', amount: trip.estimatedAccommodationCost, note: `${trip.estimatedAccommodationDays || trip.days - 1} 晚 · 标准间` },
    { key: 'meal', label: '餐饮预估', amount: trip.estimatedMealCost, note: '出差期间工作餐补贴' },
    { key: 'other', label: '其他/杂费预估', amount: trip.estimatedOtherCost, note: '市内交通及紧急备用' },
  ];

  const primaryTransport = trip.transportModes.map((m) => transportModeLabels[m] || m)[0] || '公共交通';

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
              事前预估总预算
            </span>
            <Tag size="small" color="blue">申请立项</Tag>
          </div>
          <div className="trip-stat-card__value">
            {formatMoney(trip.estimatedTotalCost)}
          </div>
          <div className="trip-stat-card__meta">
            <span>出差总天数：{trip.days} 天</span>
            <span>日均预估 ¥{trip.days > 0 ? Math.round(trip.estimatedTotalCost / trip.days).toLocaleString() : 0}</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#fff7e6', color: '#fa8c16' }}>
                <IconCompass />
              </span>
              借款申请额度
            </span>
            <Tag size="small" color={trip.needLoan ? 'orange' : 'gray'}>
              {trip.needLoan ? '需要借款' : '自付报销'}
            </Tag>
          </div>
          <div className="trip-stat-card__value" style={{ color: trip.needLoan ? '#ff7d00' : 'inherit' }}>
            {formatMoney(trip.loanAmount || 0)}
          </div>
          <div className="trip-stat-card__meta">
            <span>{trip.needLoan ? '备用金垫付' : '无需公司暂支'}</span>
            <span>归国/返程核销</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#f5e8ff', color: '#722ed1' }}>
                <IconHome />
              </span>
              预估住宿晚数
            </span>
            <Tag size="small" color="purple">
              {trip.accommodationIntent === 'hotel' ? '酒店住宿' : '宿舍安排'}
            </Tag>
          </div>
          <div className="trip-stat-card__value">
            {trip.estimatedAccommodationDays || Math.max(1, trip.days - 1)} 晚
          </div>
          <div className="trip-stat-card__meta">
            <span>住宿预算：{formatMoney(trip.estimatedAccommodationCost)}</span>
            <span>标准间定额</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8ffea', color: '#00b42a' }}>
                <IconSafe />
              </span>
              主要交通方案
            </span>
            <Tag size="small" color="green">标准核定</Tag>
          </div>
          <div className="trip-stat-card__value" style={{ fontSize: 16 }}>
            {primaryTransport}
          </div>
          <div className="trip-stat-card__meta">
            <span>交通预算：{formatMoney(trip.estimatedTransportCost)}</span>
            <span>二等座/经济舱</span>
          </div>
        </div>
      </div>

      {/* 费用预算总览与借款方案 两列 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <div
            style={{
              background: 'var(--color-bg-2, #ffffff)',
              border: '1px solid var(--color-border-2, #e5e6eb)',
              borderRadius: 6,
              padding: '14px 16px',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Space>
                <IconStorage style={{ color: 'rgb(var(--primary-6))' }} />
                <Text style={{ fontWeight: 600 }}>费用预估分项清单</Text>
              </Space>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>预计总费用：</Text>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--primary-6))', marginLeft: 4 }}>
                  {formatMoney(trip.estimatedTotalCost)}
                </span>
              </div>
            </div>

            <Table
              data={budgetItems}
              pagination={false}
              size="small"
              columns={[
                { title: '费用科目', dataIndex: 'label', render: (val) => <Text style={{ fontWeight: 500 }}>{val}</Text> },
                { title: '预估金额', dataIndex: 'amount', render: (val) => <span style={{ fontWeight: 600 }}>{formatMoney(val)}</span> },
                { title: '测算依据 / 标准说明', dataIndex: 'note', render: (val) => <Text type="secondary" style={{ fontSize: 12 }}>{val}</Text> },
              ]}
            />
          </div>
        </Col>

        <Col span={10}>
          <div
            style={{
              background: 'var(--color-bg-2, #ffffff)',
              border: '1px solid var(--color-border-2, #e5e6eb)',
              borderRadius: 6,
              padding: '14px 16px',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconCompass style={{ color: '#ff7d00' }} />
              <Text style={{ fontWeight: 600 }}>借款与备用金申请</Text>
              <Tag color={trip.needLoan ? 'orange' : 'gray'} size="small">
                {trip.needLoan ? '已申请借款' : '无需借款'}
              </Tag>
            </div>

            {trip.needLoan ? (
              <div>
                <div style={{ padding: '12px 14px', background: 'var(--color-fill-1)', borderRadius: 6, marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>借款申请金额</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ff7d00', marginTop: 2 }}>
                    {formatMoney(trip.loanAmount || 0)}
                  </div>
                </div>
                <Descriptions
                  column={1}
                  size="small"
                  data={[
                    { label: '借款用途', value: trip.loanReason || '出差备用金与驻场垫付' },
                    { label: '支付方式', value: '银行对公转账 / 个人工资卡代发' },
                    { label: '冲账规则', value: '出差结束后 5 个工作日内核销冲账' },
                  ]}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-3)' }}>
                <IconCheckCircle style={{ fontSize: 28, color: 'var(--color-text-4)', marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>本次出差无需公司先行借款</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>行程结束后凭合规票据统一申报实报实销</div>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* 差旅标准与合规限额对照 */}
      <Card size="small" title="差旅标准与合规限额参照">
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ padding: '10px 12px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                <IconHome style={{ marginRight: 6, color: 'rgb(var(--primary-6))' }} />
                住宿标准（{trip.destinations[0] || '目的地'}）
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                一线/新一线城市：≤ ¥400/间/天；普通二三线城市：≤ ¥260/间/天。当前意向：{trip.accommodationIntent === 'hotel' ? '酒店住宿' : '宿舍安排'}。
              </Text>
            </div>
          </Col>

          <Col span={8}>
            <div style={{ padding: '10px 12px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                <IconCompass style={{ marginRight: 6, color: 'rgb(var(--primary-6))' }} />
                交通工具限额
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                直线距离 ≥ 800 公里或耗时 ≥ 6 小时可申请飞机经济舱；其余优先高铁二等座；同城打车须注明出发地与现场。
              </Text>
            </div>
          </Col>

          <Col span={8}>
            <div style={{ padding: '10px 12px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                <IconSafe style={{ marginRight: 6, color: 'rgb(var(--success-6))' }} />
                异地餐补与杂费
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                一线城市餐费伙食补贴标准 ¥150/天，按异地有效打卡核定，随月度工资发放；无需提供餐饮零星发票。
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
