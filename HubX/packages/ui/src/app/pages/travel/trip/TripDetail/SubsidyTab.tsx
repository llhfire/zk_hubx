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
          </Card>
        </Col>

      </Row>

      {/* 计算公式 */}
      <Card title="计算公式">
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
    </div>
  );
}
