import { Select } from '@arco-design/web-react';
import type { WorkAttributionCategory, WorkAttributionType } from './types';
import { useJobWorkConfig } from './JobWorkConfigContext';
import {
  getWorkAttributionOptions,
  getDefaultWorkAttributionCategory,
  getWorkAttributionTypeForCategory,
  WORK_ATTRIBUTION_CATEGORIES,
  WORK_ATTRIBUTION_CATEGORY_LABELS,
  type WorkAttributionOption,
} from './workAttribution';

const SelectOption = Select.Option;

interface WorkAttributionValue {
  category?: WorkAttributionCategory;
  type: WorkAttributionType;
  relationId?: string;
  relationName?: string;
}

interface Props {
  value?: WorkAttributionValue;
  department?: string;
  size?: 'mini' | 'small' | 'default' | 'large';
  onChange: (value: WorkAttributionValue) => void;
}

export function includeSelectedAttributionOption(
  options: WorkAttributionOption[],
  value?: Pick<WorkAttributionValue, 'relationId' | 'relationName'>,
) {
  if (
    !value?.relationId
    || !value.relationName
    || options.some(option => option.id === value.relationId)
  ) {
    return options;
  }

  return [
    { id: value.relationId, name: value.relationName, keyword: value.relationName },
    ...options,
  ];
}

export function WorkAttributionSelector({
  value,
  department = '',
  size = 'default',
  onChange,
}: Props) {
  const { departmentRoutineConfigs } = useJobWorkConfig();
  const category = value?.category || getDefaultWorkAttributionCategory(value?.type || 'external-project');
  const attributionType = value?.category
    ? getWorkAttributionTypeForCategory(category)
    : value?.type || getWorkAttributionTypeForCategory(category);
  const options = getWorkAttributionOptions(
    attributionType,
    department,
    departmentRoutineConfigs,
    category,
  );
  const displayOptions = includeSelectedAttributionOption(options, value);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 8, minWidth: 0 }}>
      <Select
        size={size}
        value={category}
        onChange={(nextCategory: WorkAttributionCategory) => {
          const type = getWorkAttributionTypeForCategory(nextCategory);
          onChange({
            category: nextCategory,
            type,
            relationId: undefined,
            relationName: undefined,
          });
        }}
        style={{ width: '100%' }}
      >
        {WORK_ATTRIBUTION_CATEGORIES.map(item => (
          <SelectOption key={item} value={item}>{WORK_ATTRIBUTION_CATEGORY_LABELS[item]}</SelectOption>
        ))}
      </Select>
      <Select
        size={size}
        showSearch
        allowClear
        value={value?.relationId}
        placeholder="请选择项目"
        style={{ width: '100%' }}
        filterOption={(inputValue, option) => {
          const current = displayOptions.find(item => item.id === option.props.value);
          return (current?.keyword || '').toLowerCase().includes(inputValue.toLowerCase());
        }}
        onChange={(relationId) => {
          const option = options.find(item => item.id === relationId);
          onChange({
            category,
            type: attributionType,
            relationId,
            relationName: option?.name,
          });
        }}
      >
        {displayOptions.map(option => (
          <SelectOption key={option.id} value={option.id}>{option.name}</SelectOption>
        ))}
      </Select>
    </div>
  );
}
