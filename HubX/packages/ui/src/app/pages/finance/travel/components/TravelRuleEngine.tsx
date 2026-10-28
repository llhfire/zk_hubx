import { useMemo } from 'react';
import {
  Space,
  Typography,
} from '@/design-system';
import {
  IconCheckCircle,
  IconCloseCircle,
  IconExclamationCircle,
  IconSafe,
} from '@/design-system';
import { SectionCard, StatusTag, STATUS_TONE_VARS, type StatusMap } from '@/design-system';

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

const RULE_LEVEL: StatusMap<RuleLevel> = {
  error: { label: '阻断', tone: 'danger' },
  warning: { label: '警告', tone: 'warning' },
  info: { label: '通过', tone: 'success' },
};

interface RuleResult {
  id: string;
  level: RuleLevel;
  ruleName: string;
  message: string;
  suggestion?: string;
}

import type { CityLevel } from '../types';

const CITY_TIERS: Record<string, CityLevel> = {
  '北京': 'first_tier',
  '上海': 'first_tier',
  '广州': 'first_tier',
  '深圳': 'first_tier',
  // 省会及杭州、成都 → second_tier（废除新一线）
  '成都': 'second_tier',
  '杭州': 'second_tier',
  '重庆': 'second_tier',
  '武汉': 'second_tier',
  '苏州': 'second_tier',
  '西安': 'second_tier',
  '南京': 'second_tier',
  '天津': 'second_tier',
  '长沙': 'second_tier',
  '郑州': 'second_tier',
  '东莞': 'second_tier',
  '青岛': 'second_tier',
  '昆明': 'second_tier',
  '宁波': 'second_tier',
  '合肥': 'second_tier',
  '大连': 'second_tier',
  '福州': 'second_tier',
  '厦门': 'second_tier',
  '哈尔滨': 'second_tier',
  '济南': 'second_tier',
  '佛山': 'second_tier',
  '沈阳': 'second_tier',
  '无锡': 'second_tier',
  '贵阳': 'second_tier',
  '南宁': 'second_tier',
  '太原': 'second_tier',
  '石家庄': 'second_tier',
  '南昌': 'second_tier',
  '兰州': 'second_tier',
  '珠海': 'second_tier',
  '惠州': 'second_tier',
  '常州': 'second_tier',
  '温州': 'second_tier',
  '烟台': 'second_tier',
  '海口': 'second_tier',
};

function getCityTier(city: string): CityLevel {
  return CITY_TIERS[city] || 'other';
}

function getHotelLimit(city: string): number {
  const tier = getCityTier(city);
  switch (tier) {
    case 'first_tier':
      return 500;
    case 'second_tier':
      return 350;
    case 'third_tier':
      return 280;
    case 'other':
      return 200;
  }
}

function getLocalTransportLimit(city: string): number {
  const tier = getCityTier(city);
  switch (tier) {
    case 'first_tier':
      return 80;
    case 'second_tier':
      return 50;
    case 'third_tier':
      return 40;
    case 'other':
      return 30;
  }
}

function getCityTierLabel(tier: string): string {
  switch (tier) {
    case 'first_tier': return '一线';
    case 'second_tier': return '二线';
    case 'third_tier': return '三线';
    case 'other': return '其他';
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
        return <IconCloseCircle style={{ color: 'rgb(var(--danger-6))' }} />;
      case 'warning':
        return <IconExclamationCircle style={{ color: 'rgb(var(--warning-6))' }} />;
      case 'info':
        return <IconCheckCircle style={{ color: 'rgb(var(--success-6))' }} />;
    }
  };

  const levelBg = (level: RuleLevel) => ({
    background: STATUS_TONE_VARS[RULE_LEVEL[level].tone].bg,
    border: `1px solid ${STATUS_TONE_VARS[RULE_LEVEL[level].tone].border}`,
  });

  return (
    <SectionCard
      title={
        <Space>
          <IconSafe style={{ color: 'rgb(var(--primary-6))' }} />
          <span>AI 规则引擎校验</span>
        </Space>
      }
      extra={
        <Space>
          {errorCount > 0 && <StatusTag meta={{ label: `${errorCount} 项阻断`, tone: 'danger' }} />}
          {warningCount > 0 && <StatusTag meta={{ label: `${warningCount} 项警告`, tone: 'warning' }} />}
          <StatusTag meta={{ label: `${passCount} 项通过`, tone: 'success' }} />
        </Space>
      }
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {results.map((result) => (
          <div
            key={result.id}
            style={{
              display: 'flex',
              gap: 12,
              borderRadius: 'var(--radius-md)',
              padding: 12,
              ...levelBg(result.level),
            }}
          >
            <div style={{ marginTop: 2 }}>{levelIcon(result.level)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontWeight: 500 }}>{result.ruleName}</Text>
                <StatusTag meta={RULE_LEVEL[result.level]} />
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>{result.message}</div>
              {result.suggestion && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 4 }}>{result.suggestion}</div>
              )}
            </div>
          </div>
        ))}
      </Space>
    </SectionCard>
  );
}
