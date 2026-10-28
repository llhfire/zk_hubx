import { useState } from 'react';
import { Button, Space, Typography, Grid, Collapse } from '@/design-system';
import {
  IconExclamationCircle,
  IconCheckCircle,
  IconLocation,
  IconDown,
  IconUp,
  IconSafe,
  IconHome,
  IconCommon,
} from '@/design-system';
import { MoneyText, StatusTag } from '@/design-system';

const { Text } = Typography;
const { Row, Col } = Grid;

interface ComplianceGuideProps {
  destination: string;
  days: number;
  department: string;
  companions: string[];
}

const CITY_LEVEL: Record<string, { level: string; hotelLimit: number; transportLimit: number }> = {
  '北京': { level: '一线', hotelLimit: 500, transportLimit: 80 },
  '上海': { level: '一线', hotelLimit: 500, transportLimit: 80 },
  '广州': { level: '一线', hotelLimit: 500, transportLimit: 80 },
  '深圳': { level: '一线', hotelLimit: 500, transportLimit: 80 },
  '成都': { level: '二线', hotelLimit: 350, transportLimit: 50 },
  '重庆': { level: '二线', hotelLimit: 350, transportLimit: 50 },
  '武汉': { level: '二线', hotelLimit: 350, transportLimit: 50 },
  '杭州': { level: '二线', hotelLimit: 350, transportLimit: 50 },
  '南京': { level: '二线', hotelLimit: 350, transportLimit: 50 },
  '长沙': { level: '二线', hotelLimit: 350, transportLimit: 50 },
  '西安': { level: '二线', hotelLimit: 350, transportLimit: 50 },
};

export function ComplianceGuide({ destination, days, department, companions }: ComplianceGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const cityInfo = CITY_LEVEL[destination] || { level: '其他', hotelLimit: 200, transportLimit: 30 };
  const isSoftware = department.includes('软件');
  const isSales = department.includes('销售');
  const hotelLimit = isSales && days >= 7 ? Math.round(cityInfo.hotelLimit * 0.9) : cityInfo.hotelLimit;

  return (
    <div
      style={{
        border: '1px solid rgb(var(--primary-3))',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(to right, rgb(var(--primary-1)), rgb(var(--primary-2)))',
        marginBottom: 16,
      }}
    >
      {/* 紧凑横幅 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Space>
          <IconSafe style={{ color: 'rgb(var(--primary-6))' }} />
          <Text style={{ fontWeight: 500, color: 'rgb(var(--primary-6))' }}>报销合规指引</Text>
          <StatusTag size="small" tone="info">{destination} · {days}天 · {cityInfo.level}</StatusTag>
        </Space>
        <Space>
          <Space size={16}>
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>住宿 <Text style={{ fontWeight: 600, color: 'rgb(var(--primary-6))' }}><MoneyText value={hotelLimit} /></Text>/天</Text>
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>交通 <Text style={{ fontWeight: 600, color: 'rgb(var(--primary-6))' }}><MoneyText value={cityInfo.transportLimit} /></Text>/天</Text>
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>餐补 <Text style={{ fontWeight: 600, color: 'rgb(var(--primary-6))' }}><MoneyText value={40} /></Text>/天</Text>
          </Space>
          {expanded ? <IconUp /> : <IconDown />}
        </Space>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgb(var(--primary-3))' }}>
          <Row gutter={12} style={{ marginTop: 12 }}>
            {/* 住宿 */}
            <Col span={8}>
              <div style={{ padding: 12, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid rgb(var(--primary-3))' }}>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <IconHome style={{ color: 'rgb(var(--primary-6))', fontSize: 'var(--text-sm)' }} />
                  <Text style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>住宿</Text>
                </Space>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>上限 <MoneyText value={hotelLimit} />/天，标间/大床房</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>总额上限 <MoneyText value={hotelLimit * days} /></div>
                {companions.length > 0 && (
                  <div style={{ fontSize: 'var(--ds-text-micro)', color: 'rgb(var(--warning-6))', marginTop: 4 }}>⚠️ 须与同行人员合住</div>
                )}
              </div>
            </Col>
            {/* 交通 */}
            <Col span={8}>
              <div style={{ padding: 12, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid rgb(var(--primary-3))' }}>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <IconCommon style={{ color: 'rgb(var(--success-6))', fontSize: 'var(--text-sm)' }} />
                  <Text style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>市内交通</Text>
                </Space>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>上限 <MoneyText value={cityInfo.transportLimit} />/天</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>总额上限 <MoneyText value={cityInfo.transportLimit * days} /></div>
                {!isSales && <div style={{ fontSize: 'var(--ds-text-micro)', color: 'var(--color-text-3)', marginTop: 4 }}>职能部门仅限二等座/经济舱</div>}
              </div>
            </Col>
            {/* 餐补 */}
            <Col span={8}>
              <div style={{ padding: 12, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid rgb(var(--primary-3))' }}>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <IconSafe style={{ color: 'rgb(var(--warning-6))', fontSize: 'var(--text-sm)' }} />
                  <Text style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>餐补</Text>
                </Space>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}><MoneyText value={40} />/天，总额 <MoneyText value={(days - 1) * 40} /></div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>往返路途当日无补贴</div>
              </div>
            </Col>
          </Row>

          {/* 合规要点 */}
          <Space style={{ marginTop: 12, fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-3)' }}>
            <Space size={4}>
              <IconCheckCircle style={{ color: 'rgb(var(--success-6))', fontSize: 'var(--text-xs)' }} />
              <span>保持企微打卡</span>
            </Space>
            <Space size={4}>
              <IconCheckCircle style={{ color: 'rgb(var(--success-6))', fontSize: 'var(--text-xs)' }} />
              <span>留存网约车行程单</span>
            </Space>
            <Space size={4}>
              <IconExclamationCircle style={{ color: 'rgb(var(--warning-6))', fontSize: 'var(--text-xs)' }} />
              <span>返回7天内报销</span>
            </Space>
            {isSoftware && (
              <Space size={4} style={{ color: 'rgb(var(--danger-6))' }}>
                <IconExclamationCircle style={{ fontSize: 'var(--text-xs)' }} />
                <span>驻场未结束禁止返程</span>
              </Space>
            )}
          </Space>
        </div>
      )}
    </div>
  );
}
