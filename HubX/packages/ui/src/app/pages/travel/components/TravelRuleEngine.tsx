import { useMemo } from 'react';
import {
  Card,
  Tag,
  Space,
  Typography,
} from '@arco-design/web-react';
import {
  IconCheckCircle,
  IconCloseCircle,
  IconExclamationCircle,
  IconSafe,
} from '@arco-design/web-react/icon';

const { Text } = Typography;

interface TravelRuleEngineProps {
  departureCity: string;
  destinationCity: string;
  department: string;
  travelDays: number;
  companions: { name: string; gender: 'male' | 'female' }[];
  transportType: 'high_speed_rail' | 'bullet_train' | 'airplane' | 'self_drive' | 'bus' | 'other';
  hasApprovalScreenshot: boolean;
}

type RuleLevel = 'error' | 'warning' | 'info';

interface RuleResult {
  id: string;
  level: RuleLevel;
  ruleName: string;
  message: string;
  suggestion?: string;
}

const CITY_TIERS: Record<string, 'first' | 'new_first' | 'second' | 'third'> = {
  '北京': 'first',
  '上海': 'first',
  '广州': 'first',
  '深圳': 'first',
  '成都': 'new_first',
  '杭州': 'new_first',
  '重庆': 'new_first',
  '武汉': 'new_first',
  '苏州': 'new_first',
  '西安': 'new_first',
  '南京': 'new_first',
  '天津': 'new_first',
  '长沙': 'new_first',
  '郑州': 'new_first',
  '东莞': 'new_first',
  '青岛': 'new_first',
  '昆明': 'new_first',
  '宁波': 'new_first',
  '合肥': 'new_first',
  '大连': 'new_first',
  '福州': 'new_first',
  '厦门': 'new_first',
  '哈尔滨': 'new_first',
  '济南': 'new_first',
  '佛山': 'new_first',
  '沈阳': 'new_first',
  '无锡': 'new_first',
  '贵阳': 'second',
  '南宁': 'second',
  '太原': 'second',
  '石家庄': 'second',
  '南昌': 'second',
  '兰州': 'second',
  '珠海': 'second',
  '惠州': 'second',
  '常州': 'second',
  '温州': 'second',
  '烟台': 'second',
  '海口': 'second',
};

function getCityTier(city: string): 'first' | 'new_first' | 'second' | 'third' {
  return CITY_TIERS[city] || 'third';
}

function getHotelLimit(city: string): number {
  const tier = getCityTier(city);
  switch (tier) {
    case 'first':
    case 'new_first':
      return 220;
    case 'second':
      return 180;
    case 'third':
      return 150;
  }
}

function getLocalTransportLimit(city: string): number {
  const tier = getCityTier(city);
  switch (tier) {
    case 'first':
    case 'new_first':
      return 50;
    case 'second':
      return 40;
    case 'third':
      return 30;
  }
}

function getCityTierLabel(tier: string): string {
  switch (tier) {
    case 'first': return '一线';
    case 'new_first': return '新一线';
    case 'second': return '二线';
    case 'third': return '三线及以下';
    default: return '未知';
  }
}

export function TravelRuleEngine({
  departureCity,
  destinationCity,
  department,
  travelDays,
  companions,
  transportType,
  hasApprovalScreenshot,
}: TravelRuleEngineProps) {
  const results = useMemo<RuleResult[]>(() => {
    const rules: RuleResult[] = [];
    const isSales = department.includes('销售');
    const isSoftware = department.includes('软件');
    const isFunctional = department.includes('职能') || department.includes('人事') || department.includes('财务') || department.includes('行政');
    const cityTier = getCityTier(destinationCity);
    const hotelLimit = getHotelLimit(destinationCity);
    const localLimit = getLocalTransportLimit(destinationCity);

    rules.push({
      id: 'accommodation-standard',
      level: 'info',
      ruleName: '住宿标准',
      message: `${getCityTierLabel(cityTier)}城市（${destinationCity}）住宿上限为 ${hotelLimit} 元/天`,
      suggestion: `请选择不超过 ${hotelLimit} 元/晚的酒店`,
    });

    if (companions.length > 0) {
      const genders = companions.map(c => c.gender);
      const hasMale = genders.includes('male');
      const hasFemale = genders.includes('female');
      if (hasMale && hasFemale) {
        rules.push({
          id: 'accommodation-mixed',
          level: 'info',
          ruleName: '合住校验',
          message: '同行人员包含异性，无需强制合住',
        });
      } else {
        rules.push({
          id: 'accommodation-same-gender',
          level: 'warning',
          ruleName: '合住校验',
          message: `同行 ${companions.length} 人为同性别，须安排合住`,
          suggestion: '同性别同事必须合住，未合住不予报销',
        });
      }
    }

    if (isSales && travelDays >= 7) {
      rules.push({
        id: 'long-trip-discount',
        level: 'warning',
        ruleName: '长差折扣',
        message: `销售出差 ${travelDays} 天（>=7天），住宿标准下调 10%`,
        suggestion: `实际住宿上限调整为 ${Math.floor(hotelLimit * 0.9)} 元/天`,
      });
    }

    if (travelDays > 7) {
      rules.push({
        id: 'long-stay-gm',
        level: 'error',
        ruleName: '长期驻场',
        message: `出差 ${travelDays} 天（>7天），须总经理安排住宿`,
        suggestion: '请提前联系总经理办公室安排驻场住宿事宜',
      });
    }

    if (isFunctional) {
      if (transportType === 'airplane') {
        rules.push({
          id: 'transport-functional-plane',
          level: 'warning',
          ruleName: '交通限制',
          message: '职能部门乘坐飞机，仅限经济舱',
          suggestion: '请选择经济舱，商务舱/头等舱不予报销',
        });
      }
      if (transportType === 'high_speed_rail') {
        rules.push({
          id: 'transport-functional-train',
          level: 'warning',
          ruleName: '交通限制',
          message: '职能部门乘坐高铁，仅限二等座',
          suggestion: '请选择二等座，一等座/商务座不予报销',
        });
      }
    }

    if (isSales && (transportType === 'high_speed_rail' || transportType === 'airplane')) {
      if (!hasApprovalScreenshot) {
        rules.push({
          id: 'approval-screenshot',
          level: 'error',
          ruleName: '报备要求',
          message: '销售出差乘坐高铁/飞机，须上传报备截图',
          suggestion: '请在报销前上传主管报备审批截图',
        });
      } else {
        rules.push({
          id: 'approval-screenshot-ok',
          level: 'info',
          ruleName: '报备要求',
          message: '已上传报备截图，符合要求',
        });
      }
    }

    rules.push({
      id: 'local-transport',
      level: 'info',
      ruleName: '市内交通',
      message: `${getCityTierLabel(cityTier)}城市（${destinationCity}）市内交通上限 ${localLimit} 元/天`,
      suggestion: `出差 ${travelDays} 天，市内交通总额上限 ${localLimit * travelDays} 元`,
    });

    rules.push({
      id: 'meal-allowance',
      level: 'info',
      ruleName: '餐补标准',
      message: '餐补标准为 40 元/天',
      suggestion: `出差 ${travelDays} 天，路途当日无补贴，预计餐补 ${(travelDays - 1) * 40} 元`,
    });

    if (isSoftware) {
      rules.push({
        id: 'software-return',
        level: 'error',
        ruleName: '软件事业部',
        message: '软件事业部驻场未结束，禁止私自返程',
        suggestion: '如需提前返程，须获得项目经理书面同意',
      });
    }

    return rules;
  }, [departureCity, destinationCity, department, travelDays, companions, transportType, hasApprovalScreenshot]);

  const errorCount = results.filter(r => r.level === 'error').length;
  const warningCount = results.filter(r => r.level === 'warning').length;
  const passCount = results.filter(r => r.level === 'info').length;

  const levelIcon = (level: RuleLevel) => {
    switch (level) {
      case 'error':
        return <IconCloseCircle style={{ color: '#f53f3f' }} />;
      case 'warning':
        return <IconExclamationCircle style={{ color: '#ff7d00' }} />;
      case 'info':
        return <IconCheckCircle style={{ color: '#00b42a' }} />;
    }
  };

  const levelTag = (level: RuleLevel) => {
    switch (level) {
      case 'error':
        return <Tag color="red" size="small">阻断</Tag>;
      case 'warning':
        return <Tag color="orange" size="small">警告</Tag>;
      case 'info':
        return <Tag color="green" size="small">通过</Tag>;
    }
  };

  const levelBg = (level: RuleLevel) => {
    switch (level) {
      case 'error':
        return { background: '#fff0f0', border: '1px solid #ffc9c9' };
      case 'warning':
        return { background: '#fff7e6', border: '1px solid #ffd591' };
      case 'info':
        return { background: '#e8ffea', border: '1px solid #aff0b5' };
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <IconSafe style={{ color: '#165dff' }} />
          <Text style={{ fontWeight: 600 }}>AI 规则引擎校验</Text>
        </Space>
        <Space>
          {errorCount > 0 && <Tag color="red">{errorCount} 项阻断</Tag>}
          {warningCount > 0 && <Tag color="orange">{warningCount} 项警告</Tag>}
          <Tag color="green">{passCount} 项通过</Tag>
        </Space>
      </div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {results.map((result) => (
          <div
            key={result.id}
            style={{
              display: 'flex',
              gap: 12,
              borderRadius: 8,
              padding: 12,
              ...levelBg(result.level),
            }}
          >
            <div style={{ marginTop: 2 }}>{levelIcon(result.level)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontWeight: 500 }}>{result.ruleName}</Text>
                {levelTag(result.level)}
              </div>
              <div style={{ fontSize: 14, color: '#1d2129' }}>{result.message}</div>
              {result.suggestion && (
                <div style={{ fontSize: 12, color: '#86909c', marginTop: 4 }}>{result.suggestion}</div>
              )}
            </div>
          </div>
        ))}
      </Space>
    </Card>
  );
}
