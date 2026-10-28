import type { KeyboardEvent, MutableRefObject } from 'react';
import '../components.css';

export interface WorkloadNumericInputFillRef {
  unitId: string;
  roleKey: string;
  value: number;
}

export interface WorkloadNumericInputProps {
  value?: number;
  unitId: string;
  roleKey: string;
  rowIds: string[];
  roleKeys: string[];
  fillRef: MutableRefObject<WorkloadNumericInputFillRef | null>;
  hasError?: boolean;
  isRemainder?: boolean;
  onChangeValue: (unitId: string, roleKey: string, value: number) => void;
  className?: string;
}

function focusCell(unitId: string, roleKey: string) {
  requestAnimationFrame(() => {
    const input = document.querySelector<HTMLInputElement>(`input[data-fill="${unitId}-${roleKey}"]`);
    if (input) {
      input.focus();
      input.select();
    }
  });
}

/**
 * 评估表专用数字输入：保留人天录入的光标步进和 WASD/方向键漫游语义。
 * 该交互属于设计系统组件，页面只负责提供行列顺序和写入回调。
 */
export function WorkloadNumericInput({
  value,
  unitId,
  roleKey,
  rowIds,
  roleKeys,
  fillRef,
  hasError = false,
  isRemainder = false,
  onChangeValue,
  className,
}: WorkloadNumericInputProps) {
  const displayValue = value && value > 0 ? value.toFixed(1) : '';

  const getStepFromCursor = (input: HTMLInputElement): number => {
    const text = input.value || displayValue;
    const position = input.selectionStart ?? text.length;
    const dotIndex = text.indexOf('.');

    if (dotIndex >= 0) {
      if (position > dotIndex) return 0.1;
      const distanceFromDot = dotIndex - position;
      if (distanceFromDot === 0) return 1;
      if (distanceFromDot === 1) return 10;
      if (distanceFromDot === 2) return 100;
      return Math.pow(10, distanceFromDot);
    }

    const distanceFromEnd = text.length - position;
    if (distanceFromEnd === 0) return 0.1;
    if (distanceFromEnd === 1) return 1;
    if (distanceFromEnd === 2) return 10;
    if (distanceFromEnd === 3) return 100;
    return Math.pow(10, distanceFromEnd - 1);
  };

  const moveToCell = (direction: 'up' | 'down' | 'left' | 'right', carryValue: boolean) => {
    const current = fillRef.current || { unitId, roleKey, value: value ?? 0 };
    const rowIndex = rowIds.indexOf(current.unitId);
    const roleIndex = roleKeys.indexOf(current.roleKey);
    let nextRowIndex = rowIndex;
    let nextRoleIndex = roleIndex;
    if (direction === 'up') nextRowIndex -= 1;
    if (direction === 'down') nextRowIndex += 1;
    if (direction === 'left') nextRoleIndex -= 1;
    if (direction === 'right') nextRoleIndex += 1;

    if (
      nextRowIndex < 0 || nextRowIndex >= rowIds.length
      || nextRoleIndex < 0 || nextRoleIndex >= roleKeys.length
    ) return;

    const nextUnitId = rowIds[nextRowIndex];
    const nextRoleKey = roleKeys[nextRoleIndex];
    if (carryValue) onChangeValue(nextUnitId, nextRoleKey, current.value);
    fillRef.current = {
      unitId: nextUnitId,
      roleKey: nextRoleKey,
      value: carryValue ? current.value : value ?? 0,
    };
    focusCell(nextUnitId, nextRoleKey);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const directionMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
    };
    const direction = directionMap[event.key];

    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      moveToCell(direction, true);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      const step = getStepFromCursor(input);
      const currentValue = value ?? 0;
      const nextValue = event.key === 'ArrowUp'
        ? Math.round((currentValue + step) * 10) / 10
        : Math.max(0, Math.round((currentValue - step) * 10) / 10);
      onChangeValue(unitId, roleKey, nextValue);
      fillRef.current = { unitId, roleKey, value: nextValue };
      requestAnimationFrame(() => { input.selectionStart = input.selectionEnd; });
      return;
    }

    if (event.key === 'Tab' && fillRef.current) {
      const lastDirection = (input.dataset.lastDirection || '') as 'up' | 'down' | 'left' | 'right';
      if (lastDirection) {
        event.preventDefault();
        event.stopPropagation();
        moveToCell(lastDirection, true);
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') event.currentTarget.dataset.lastDirection = 'up';
    if (event.key === 'ArrowDown') event.currentTarget.dataset.lastDirection = 'down';
    if (event.key === 'ArrowLeft') event.currentTarget.dataset.lastDirection = 'left';
    if (event.key === 'ArrowRight') event.currentTarget.dataset.lastDirection = 'right';
  };

  return (
    <input
      className={['hubx-workload-numeric-input', hasError || isRemainder ? 'hubx-workload-numeric-input--error' : '', className].filter(Boolean).join(' ')}
      type="text"
      value={displayValue}
      onChange={(event) => {
        const text = event.target.value;
        if (text !== '' && !/^\d*\.?\d*$/.test(text)) return;
        const nextValue = text === '' ? 0 : parseFloat(text);
        if (!Number.isNaN(nextValue)) {
          onChangeValue(unitId, roleKey, nextValue);
          fillRef.current = { unitId, roleKey, value: nextValue };
        }
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onFocus={() => { fillRef.current = { unitId, roleKey, value: value ?? 0 }; }}
      data-fill={`${unitId}-${roleKey}`}
      inputMode="decimal"
      aria-label={`${unitId}-${roleKey} 人天`}
    />
  );
}
