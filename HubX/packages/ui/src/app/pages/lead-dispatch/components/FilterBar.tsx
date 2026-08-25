// 筛选栏（PLAN.md 决策 14：8 个筛选器全部实现）
// 关键词/主体/渠道/部门/等级在此栏；业务线与时间范围、排序在页面第二行
// 批量派发按钮：勾选行后可点，弹窗在阶段 C 接入（DispatchModal）

import { Button, Input, Select, Space, Tooltip } from '@arco-design/web-react';
import { LEAD_SOURCE_LIST, LEAD_SOURCE_LABEL, COMPANY_ENTITY_LIST, CUSTOMER_LEVEL_LIST } from '@/app/pages/leads/types';

export interface DispatchFilterState {
  keyword: string;
  entity: string;
  channel: string;
  department: string;
  customerLevel: string;
}

interface FilterBarProps {
  filter: DispatchFilterState;
  onFilterChange: (patch: Partial<DispatchFilterState>) => void;
  departments: string[];
  selectedCount: number;
  onBatchDispatch: () => void;
}

export function FilterBar({ filter, onFilterChange, departments, selectedCount, onBatchDispatch }: FilterBarProps) {
  return (
    <Space size={12} wrap style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space size={12} wrap>
        <Input.Search
          placeholder="搜索客户/联系人/手机号"
          style={{ width: 220 }}
          value={filter.keyword}
          onChange={(v) => onFilterChange({ keyword: v })}
          onSearch={(v) => onFilterChange({ keyword: v })}
          allowClear
          onClear={() => onFilterChange({ keyword: '' })}
        />
        <Select
          placeholder="主体"
          style={{ width: 130 }}
          allowClear
          value={filter.entity || undefined}
          onChange={(v) => onFilterChange({ entity: v ?? '' })}
        >
          {COMPANY_ENTITY_LIST.map((e) => (
            <Select.Option key={e} value={e}>{e}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="渠道"
          style={{ width: 120 }}
          allowClear
          value={filter.channel || undefined}
          onChange={(v) => onFilterChange({ channel: v ?? '' })}
        >
          {LEAD_SOURCE_LIST.map((c) => (
            <Select.Option key={c} value={c}>{LEAD_SOURCE_LABEL[c]}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="部门"
          style={{ width: 130 }}
          allowClear
          value={filter.department || undefined}
          onChange={(v) => onFilterChange({ department: v ?? '' })}
        >
          {departments.map((d) => (
            <Select.Option key={d} value={d}>{d}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="等级"
          style={{ width: 100 }}
          allowClear
          value={filter.customerLevel || undefined}
          onChange={(v) => onFilterChange({ customerLevel: v ?? '' })}
        >
          {CUSTOMER_LEVEL_LIST.map((l) => (
            <Select.Option key={l} value={l}>{l} 级</Select.Option>
          ))}
        </Select>
      </Space>
      <Tooltip content={selectedCount > 0 ? `对已选 ${selectedCount} 条线索统一派发` : '先勾选列表行'}>
        <Button type="primary" disabled={selectedCount === 0} onClick={onBatchDispatch}>
          批量派发{selectedCount > 0 ? `（${selectedCount}）` : ''}
        </Button>
      </Tooltip>
    </Space>
  );
}
