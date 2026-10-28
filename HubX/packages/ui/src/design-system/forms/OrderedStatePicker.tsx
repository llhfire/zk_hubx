import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { StatusTone } from '../primitives/StatusTag';
import '../components.css';

/** 有序状态/等级选项。value 是业务稳定值，不使用数组下标。 */
export interface OrderedStateOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  tone?: StatusTone;
  disabled?: boolean;
}

export interface OrderedStatePickerProps {
  options: readonly OrderedStateOption[];
  /** 受控值；null 与空字符串都按未选择处理。 */
  value?: string | null;
  /** 非受控场景的初始值；业务表单应优先使用 value。 */
  defaultValue?: string | null;
  /** 清空和选择都会传出稳定值；空值统一为 undefined。 */
  onChange?: (value: string | undefined) => void;
  allowClear?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const normalizeValue = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

/**
 * 有序状态/等级选择器：按传入顺序渲染横向选项，始终只有一个选中值。
 * 不对业务值排序，也不把显示文案当作 key，避免状态/等级改名时破坏历史数据。
 */
export function OrderedStatePicker({
  options,
  value,
  defaultValue,
  onChange,
  allowClear = false,
  disabled = false,
  ariaLabel = '选择状态',
  className,
}: OrderedStatePickerProps) {
  const [internalValue, setInternalValue] = useState(() => normalizeValue(defaultValue));
  const previousValue = useRef(value);
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? normalizeValue(value) : internalValue;

  useEffect(() => {
    // 受控值从已有值回到 undefined 时，同步清掉非受控缓存，避免表单 reset 后旧值回显。
    if (value !== undefined) setInternalValue(normalizeValue(value));
    else if (previousValue.current !== undefined) setInternalValue(undefined);
    previousValue.current = value;
  }, [value]);

  const change = (nextValue?: string) => {
    const normalized = normalizeValue(nextValue);
    if (!isControlled) setInternalValue(normalized);
    onChange?.(normalized);
  };

  return (
    <div
      className={['hubx-ordered-state-picker', disabled && 'hubx-ordered-state-picker--disabled', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = selectedValue === option.value;
        const optionDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            className={[
              'hubx-ordered-state-picker__option',
              selected && 'hubx-ordered-state-picker__option--selected',
              option.tone && `hubx-ordered-state-picker__option--${option.tone}`,
            ].filter(Boolean).join(' ')}
            role="radio"
            aria-checked={selected}
            aria-label={typeof option.label === 'string' ? option.label : undefined}
            disabled={optionDisabled}
            onClick={() => change(selected && allowClear ? undefined : option.value)}
          >
            <span className="hubx-ordered-state-picker__label">{option.label}</span>
            {option.description && <span className="hubx-ordered-state-picker__description">{option.description}</span>}
          </button>
        );
      })}
      {allowClear && selectedValue && (
        <button
          type="button"
          className="hubx-ordered-state-picker__clear"
          aria-label="清除选择"
          disabled={disabled}
          onClick={() => change(undefined)}
        >
          清除
        </button>
      )}
    </div>
  );
}
