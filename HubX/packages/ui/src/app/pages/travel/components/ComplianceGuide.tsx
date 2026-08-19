import { useState } from 'react';
import {
  Tag,
  Button,
  Space,
  Typography,
  Grid,
  Collapse,
} from '@arco-design/web-react';
import {
  IconExclamationCircle,
  IconCheckCircle,
  IconLocation,
  IconDown,
  IconUp,
  IconSafe,
  IconHome,
  IconCommon,
} from '@arco-design/web-react/icon';

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
        border: '1px solid #bedaff',
        borderRadius: 8,
        background: 'linear-gradient(to right, #f2f3ff, #e8f3ff)',
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
          <IconSafe style={{ color: '#165dff' }} />
          <Text style={{ fontWeight: 500, color: '#165dff' }}>报销合规指引</Text>
          <Tag size="small" color="blue">{destination} · {days}天 · {cityInfo.level}</Tag>
        </Space>
        <Space>
          <Space size={16}>
            <Text type="secondary" style={{ fontSize: 12 }}>住宿 <Text style={{ fontWeight: 600, color: '#165dff' }}>¥{hotelLimit}</Text>/天</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>交通 <Text style={{ fontWeight: 600, color: '#165dff' }}>¥{cityInfo.transportLimit}</Text>/天</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>餐补 <Text style={{ fontWeight: 600, color: '#165dff' }}>¥40</Text>/天</Text>
          </Space>
          {expanded ? <IconUp /> : <IconDown />}
        </Space>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div style={{ padding: '0 16px 12px', borderTop: '1px solid #bedaff' }}>
          <Row gutter={12} style={{ marginTop: 12 }}>
            {/* 住宿 */}
            <Col span={8}>
              <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #bedaff' }}>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <IconHome style={{ color: '#165dff', fontSize: 14 }} />
                  <Text style={{ fontWeight: 600, fontSize: 12 }}>住宿</Text>
                </Space>
                <div style={{ fontSize: 12, color: '#86909c' }}>上限 ¥{hotelLimit}/天，标间/大床房</div>
                <div style={{ fontSize: 12, color: '#86909c' }}>总额上限 ¥{hotelLimit * days}</div>
                {companions.length > 0 && (
                  <div style={{ fontSize: 10, color: '#ff7d00', marginTop: 4 }}>⚠️ 须与同行人员合住</div>
                )}
              </div>
            </Col>
            {/* 交通 */}
            <Col span={8}>
              <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #bedaff' }}>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <IconCommon style={{ color: '#00b42a', fontSize: 14 }} />
                  <Text style={{ fontWeight: 600, fontSize: 12 }}>市内交通</Text>
                </Space>
                <div style={{ fontSize: 12, color: '#86909c' }}>上限 ¥{cityInfo.transportLimit}/天</div>
                <div style={{ fontSize: 12, color: '#86909c' }}>总额上限 ¥{cityInfo.transportLimit * days}</div>
                {!isSales && <div style={{ fontSize: 10, color: '#86909c', marginTop: 4 }}>职能部门仅限二等座/经济舱</div>}
              </div>
            </Col>
            {/* 餐补 */}
            <Col span={8}>
              <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #bedaff' }}>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <IconSafe style={{ color: '#fa8c16', fontSize: 14 }} />
                  <Text style={{ fontWeight: 600, fontSize: 12 }}>餐补</Text>
                </Space>
                <div style={{ fontSize: 12, color: '#86909c' }}>¥40/天，总额 ¥{(days - 1) * 40}</div>
                <div style={{ fontSize: 12, color: '#86909c' }}>往返路途当日无补贴</div>
              </div>
            </Col>
          </Row>

          {/* 合规要点 */}
          <Space style={{ marginTop: 12, fontSize: 11, color: '#86909c' }}>
            <Space size={4}>
              <IconCheckCircle style={{ color: '#00b42a', fontSize: 12 }} />
              <span>保持企微打卡</span>
            </Space>
            <Space size={4}>
              <IconCheckCircle style={{ color: '#00b42a', fontSize: 12 }} />
              <span>留存网约车行程单</span>
            </Space>
            <Space size={4}>
              <IconExclamationCircle style={{ color: '#ff7d00', fontSize: 12 }} />
              <span>返回7天内报销</span>
            </Space>
            {isSoftware && (
              <Space size={4} style={{ color: '#f53f3f' }}>
                <IconExclamationCircle style={{ fontSize: 12 }} />
                <span>驻场未结束禁止返程</span>
              </Space>
            )}
          </Space>
        </div>
      )}
    </div>
  );
}
