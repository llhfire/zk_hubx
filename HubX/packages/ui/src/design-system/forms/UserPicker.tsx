import { useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Select } from '../foundation/controls';
import '../components.css';

export interface UserPickerOption {
  /** 系统用户稳定 ID；不得使用姓名作为 value。 */
  id: string;
  name: string;
  label?: ReactNode;
  jobNumber?: string;
  department?: string;
  disabled?: boolean;
}

export interface UserPickerProps {
  options: readonly UserPickerOption[];
  /** 受控值；null 与空字符串都按未选择处理。 */
  value?: string | null;
  defaultValue?: string | null;
  /** 传出稳定用户 ID；空值统一为 undefined。 */
  onChange?: (value: string | undefined, option?: UserPickerOption) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const normalizeValue = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const searchText = (option: UserPickerOption) => [
  option.id,
  option.name,
  option.jobNumber,
  option.department,
].filter(Boolean).join(' ').toLowerCase();

/** 系统用户搜索选择器：展示可读人员信息，值始终是稳定用户 ID。 */
export function UserPicker({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = '搜索姓名、工号或部门',
  allowClear = false,
  disabled = false,
  className,
  style,
  ariaLabel = '选择系统用户',
}: UserPickerProps) {
  const [internalValue, setInternalValue] = useState(() => normalizeValue(defaultValue));
  const previousValue = useRef(value);
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? normalizeValue(value) : internalValue;

  useEffect(() => {
    if (value !== undefined) setInternalValue(normalizeValue(value));
    else if (previousValue.current !== undefined) setInternalValue(undefined);
    previousValue.current = value;
  }, [value]);

  const knownIds = new Set(options.map((option) => option.id));
  const unknownOption: UserPickerOption[] = selectedValue && !knownIds.has(selectedValue)
    ? [{ id: selectedValue, name: selectedValue, label: `${selectedValue}（历史快照）`, disabled: true }]
    : [];
  const displayOptions = [...options, ...unknownOption];

  return (
    <Select
      className={['hubx-user-picker', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={ariaLabel}
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      value={selectedValue}
      options={displayOptions.map((option) => ({
        value: option.id,
        label: option.label ?? `${option.name}${option.jobNumber ? ` · ${option.jobNumber}` : ''}${option.department ? ` · ${option.department}` : ''}`,
        disabled: option.disabled,
      }))}
      filterOption={(inputValue, option) => {
        const id = String((option as ReactElement<{ value?: string | number }> | null)?.props?.value ?? '');
        const match = displayOptions.find((candidate) => candidate.id === id);
        return Boolean(match && searchText(match).includes(inputValue.trim().toLowerCase()));
      }}
      onChange={(nextValue) => {
        const normalized = normalizeValue(typeof nextValue === 'string' ? nextValue : undefined);
        const selectedOption = displayOptions.find((option) => option.id === normalized);
        if (!isControlled) setInternalValue(normalized);
        onChange?.(normalized, selectedOption);
      }}
    />
  );
}
