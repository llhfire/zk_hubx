import React, { useMemo, useRef, useState } from 'react';
import {
  Button, Card, Dropdown, Empty, Input, InputNumber, Menu, Message, Modal, Select, Space, Table, Tag, Typography,
} from '@arco-design/web-react';
import {
  IconPlus, IconClose, IconSend, IconLink, IconScissor, IconCopy, IconMenu, IconApps,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import {
  buildInitialUnits, computeUnitTotal, groupSubFeatures, packModule,
  removeRoleFromUnits, restoreToSingleUnits, sortUnitsByFeatureList, sumEvalDays, sumEvalDaysByRole, ungroupPackedUnit, ungroupUnit,
} from '../quoteFlow';
import {
  GRANULARITY_LABELS, PLATFORM_OPTIONS, PRESET_EVAL_ROLES, RISK_META,
} from '../types';
import type { EvalRole, EvaluationUnit, FeatureModule, RiskLevel } from '../types';

const { Text, Title } = Typography;

// ─── 数值输入框：支持光标位置感知的上下键调值 + WASD漫游 ───

interface NumericInputProps {
  value: number | undefined;
  unitId: string;
  roleKey: string;
  hasError: boolean;
  isRemainder: boolean;
  fillRef: React.MutableRefObject<{ unitId: string; roleKey: string; value: number } | null>;
  sortedUnits: EvaluationUnit[];
  activeRoleKeys: string[];
  updateWorkload: (unitId: string, roleKey: string, value: number) => void;
  emptyCells: Set<string>;
  cellKey: string;
  setEmptyCells: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function NumericInput({ value, unitId, roleKey, hasError, isRemainder, fillRef, sortedUnits, activeRoleKeys, updateWorkload, emptyCells, cellKey, setEmptyCells }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = (value && value > 0) ? value.toFixed(1) : '';

  // 根据光标位置计算增量步长
  // 例如: "3.0" 中光标位置 0="|3.0"(百位), 1="3|.0"(十位), 2="3.|0"(个位), 3="3.0|" (小数位)
  // 例如: "33.0" 中光标位置 0="|33.0"(百位), 1="3|3.0"(十位), 2="33|.0"(个位), 3="33.0|" (小数位)
  const getStepFromCursor = (input: HTMLInputElement): number => {
    const text = input.value || displayValue;
    const pos = input.selectionStart ?? text.length;
    const dotIdx = text.indexOf('.');

    if (dotIdx >= 0) {
      // 有小数点的情况
      // 光标在小数点右边 → 小数位
      if (pos > dotIdx) return 0.1;
      // 光标在小数点左边 → 整数位
      const intLen = dotIdx; // 整数部分的长度
      const distFromDot = dotIdx - pos; // 距离小数点的位数
      if (distFromDot === 0) return 1;   // 个位
      if (distFromDot === 1) return 10;  // 十位
      if (distFromDot === 2) return 100; // 百位
      return Math.pow(10, distFromDot);
    } else {
      // 无小数点的情况
      const len = text.length;
      const distFromEnd = len - pos; // 距离末尾的位数
      if (distFromEnd === 0) return 0.1; // 末尾默认小数位
      if (distFromEnd === 1) return 1;   // 个位
      if (distFromEnd === 2) return 10;  // 十位
      if (distFromEnd === 3) return 100; // 百位
      return Math.pow(10, distFromEnd - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    // 只允许数字和小数点
    if (text === '' || /^\d*\.?\d*$/.test(text)) {
      const num = text === '' ? 0 : parseFloat(text);
      if (!isNaN(num)) {
        updateWorkload(unitId, roleKey, num, true);
        fillRef.current = { unitId, roleKey, value: num };
        if (emptyCells.has(cellKey)) {
          setEmptyCells((prev) => { const s = new Set(prev); s.delete(cellKey); return s; });
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    // WASD 键直接漫游
    const wasdMap: Record<string, string> = { w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right' };
    if (wasdMap[e.key] && fillRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const dir = wasdMap[e.key];
      const curIdx = sortedUnits.findIndex((u) => u.id === fillRef.current!.unitId);
      const curRoleIdx = activeRoleKeys.indexOf(fillRef.current!.roleKey);
      let tIdx = curIdx, tRoleIdx = curRoleIdx;
      if (dir === 'up') tIdx--;
      else if (dir === 'down') tIdx++;
      else if (dir === 'left') tRoleIdx--;
      else if (dir === 'right') tRoleIdx++;
      if (tIdx >= 0 && tIdx < sortedUnits.length && tRoleIdx >= 0 && tRoleIdx < activeRoleKeys.length) {
        const tUnit = sortedUnits[tIdx];
        const tRole = activeRoleKeys[tRoleIdx];
        fillRef.current = { unitId: tUnit.id, roleKey: tRole, value: tUnit.manualWorkload[tRole] ?? 0 };
        requestAnimationFrame(() => {
          const el = document.querySelector(`input[data-fill="${tUnit.id}-${tRole}"]`) as HTMLInputElement | null;
          if (el) { el.focus(); el.select(); }
        });
      }
      return;
    }

    // 上下键：根据光标位置调整数值
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const step = getStepFromCursor(input);
      const currentVal = value ?? 0;
      const newVal = e.key === 'ArrowUp'
        ? Math.round((currentVal + step) * 10) / 10
        : Math.max(0, Math.round((currentVal - step) * 10) / 10);
      updateWorkload(unitId, roleKey, newVal, true);
      fillRef.current = { unitId, roleKey, value: newVal };
      // 保持光标位置
      requestAnimationFrame(() => {
        input.selectionStart = input.selectionEnd;
      });
      return;
    }

    // 左右键：移动光标位置
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // 不阻止默认行为，让光标自然移动
      return;
    }
  };

  const handleFocus = () => {
    fillRef.current = { unitId, roleKey, value: value ?? 0 };
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      data-fill={`${unitId}-${roleKey}`}
      style={{
        width: 76,
        padding: '4px 8px',
        border: `1px solid ${hasError || isRemainder ? 'rgb(var(--red-5))' : 'var(--color-border-2)'}`,
        borderRadius: 4,
        fontSize: 13,
        fontFamily: "'Inter Variable', Arial, sans-serif",
        outline: 'none',
        boxShadow: hasError || isRemainder ? '0 0 0 1px rgb(var(--red-3))' : undefined,
      }}
    />
  );
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function Stage2EvalSheet({ quote, readonly }: StageProps) {
  const { saveEvalSheet, submitEval, isLeadFrozen } = useQuotation();
  const leadFrozen = isLeadFrozen(quote.id);
  // 编辑态用本地草稿，避免每次按键都写全局
  const [draft, setDraft] = useState(quote.evalSheet);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  // 快捷填充：记录当前聚焦的单元格及其值
  const fillRef = useRef<{ unitId: string; roleKey: string; value: number } | null>(null);
  // 验证：记录未填写的格子 set<string> = "unitId-roleKey"
  const [emptyCells, setEmptyCells] = useState<Set<string>>(new Set());
  const [customRoleVisible, setCustomRoleVisible] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  const endpointConfigs = quote.endpointConfigs || [];
  const evalSheet = readonly ? quote.evalSheet : draft;
  if (!evalSheet) {
    return (
      <Card title={<Title heading={6} style={{ margin: 0 }}>数据流转 · 工作台二 · 在线人天评估</Title>}>
        <Empty description="尚未收到功能清单，等待产品经理提交" />
      </Card>
    );
  }

  const activeRoleKeys = evalSheet.activeRoles.map((r) => r.key);

  const persist = (next: typeof evalSheet) => {
    setDraft(next);
    if (!readonly) saveEvalSheet(quote.id, next);
  };

  // ─── 岗位列动态增删 ───────────────────────────────
  const addRole = (roleKey: string) => {
    if (activeRoleKeys.includes(roleKey)) return;
    const preset = PRESET_EVAL_ROLES.find((r) => r.key === roleKey);
    if (!preset) return;
    const nextRoles = [...evalSheet.activeRoles, preset];
    persist({ ...evalSheet, activeRoles: nextRoles });
  };

  const removeRole = (roleKey: string) => {
    if (activeRoleKeys.length <= 1) {
      Message.warning('至少保留一个评估岗位');
      return;
    }
    const remaining = activeRoleKeys.filter((k) => k !== roleKey);
    const units = removeRoleFromUnits(evalSheet.evaluationUnits, roleKey, remaining);
    persist({ ...evalSheet, activeRoles: evalSheet.activeRoles.filter((r) => r.key !== roleKey), evaluationUnits: units });
  };

  const addCustomRole = () => {
    const name = customRoleName.trim();
    if (!name) { Message.warning('请输入岗位名称'); return; }
    if (evalSheet.activeRoles.some((role) => role.name === name)) { Message.warning('岗位名称不能重复'); return; }
    if (name.length > 20) { Message.warning('岗位名称不能超过 20 个字'); return; }
    const key = `custom_${Math.random().toString(36).slice(2, 6)}`;
    persist({ ...evalSheet, activeRoles: [...evalSheet.activeRoles, { key, name }] });
    setCustomRoleName('');
    setCustomRoleVisible(false);
  };

  // ─── 工时录入 ───────────────────────────────
  const updateWorkload = (unitId: string, roleKey: string, value: number, isActualInput: boolean = true) => {
    let units = evalSheet.evaluationUnits.map((u) => {
      if (u.id !== unitId) return u;
      const workload = { ...u.manualWorkload, [roleKey]: value };
      return { ...u, manualWorkload: workload, totalDays: computeUnitTotal({ ...u, manualWorkload: workload }, activeRoleKeys) };
    });

    // 只有实际输入时才处理寄存行的扣减逻辑
    if (isActualInput) {
      // 处理寄存行的扣减逻辑
      const currentUnit = evalSheet.evaluationUnits.find((u) => u.id === unitId);
      if (currentUnit && !currentUnit.isRemainder) {
        // 查找同模块下的寄存行
        const remainderUnit = evalSheet.evaluationUnits.find(
          (u) => u.isRemainder && u.moduleId === currentUnit.moduleId && u.id !== unitId
        );
        if (remainderUnit) {
          // 获取解除合并的子功能 ID 列表
          const ungroupedSubIds = remainderUnit.ungroupedSubIds || [];
          // 获取解除合并产生的行（排除寄存行本身）
          const belowUnits = ungroupedSubIds.length > 0
            ? evalSheet.evaluationUnits.filter(
                (u) => u.id !== remainderUnit.id && ungroupedSubIds.some((subId) => u.boundSubFeatureIds.includes(subId))
              )
            : [];
          const totalBelow = belowUnits.reduce((sum, u) => sum + (u.manualWorkload[roleKey] ?? 0), 0);

          // 从寄存行扣减相应的值
          const updatedUnits = units.map((u) => {
            if (u.id !== remainderUnit.id) return u;
            const remainderWorkload = { ...u.manualWorkload };
            const oldValue = remainderWorkload[roleKey] ?? 0;
            let newValue = Math.max(0, oldValue - value);

            // 如果下面的值总和大于寄存值，寄存值清零
            if (totalBelow > oldValue) {
              newValue = 0;
            }

            // 更新寄存行的值
            remainderWorkload[roleKey] = newValue;
            return { ...u, manualWorkload: remainderWorkload, totalDays: computeUnitTotal({ ...u, manualWorkload: remainderWorkload }, activeRoleKeys) };
          });

          // 检查是否所有解除合并的输入框在当前列（同岗位）都有数值，如果有则清除寄存标记
          // 只有 belowUnits 非空且全部有值时才解除
          const allFilled = belowUnits.length > 0 && belowUnits.every((u) => {
            const val = u.manualWorkload[roleKey];
            return val !== undefined && val !== null && val > 0;
          });

          if (allFilled) {
            units = updatedUnits.map((u) => (u.id === remainderUnit.id ? { ...u, isRemainder: false, ungroupedSubIds: undefined } : u));
          } else {
            units = updatedUnits;
          }

          persist({ ...evalSheet, evaluationUnits: units });
          return;
        }
      }
    }

    persist({ ...evalSheet, evaluationUnits: units });
  };

  const updateUnitMeta = (unitId: string, patch: Partial<EvaluationUnit>) => {
    const units = evalSheet.evaluationUnits.map((u) => (u.id === unitId ? { ...u, ...patch } : u));
    persist({ ...evalSheet, evaluationUnits: units });
  };

  // ─── 切片重组 ───────────────────────────────
  const handlePackModule = (moduleId: string) => {
    const module = quote.featureList.find((m) => m.id === moduleId);
    if (!module) return;
    const units = packModule(evalSheet.evaluationUnits, module, activeRoleKeys);
    persist({ ...evalSheet, evaluationUnits: sortUnitsByFeatureList(units, quote.featureList) });
    Message.success(`已将「${module.name}」整模块打包`);
  };

  const handleGroupSelected = () => {
    if (selectedSubIds.length < 2) {
      Message.warning('请勾选同模块下至少 2 项子功能再合并');
      return;
    }
    // 找到这些子功能所属的模块，要求同模块
    const module = quote.featureList.find((m) =>
      selectedSubIds.every((id) => m.subFeatures.some((f) => f.id === id)),
    );
    if (!module) {
      Message.warning('只能合并同一模块下的子功能');
      return;
    }
    const units = groupSubFeatures(evalSheet.evaluationUnits, module, selectedSubIds, activeRoleKeys, '切片组');
    persist({ ...evalSheet, evaluationUnits: sortUnitsByFeatureList(units, quote.featureList) });
    setSelectedSubIds([]);
    Message.success('已合并为切片组');
  };

  const handleUngroup = (unitId: string) => {
    const unit = evalSheet.evaluationUnits.find((u) => u.id === unitId);
    if (!unit?.moduleId) return;
    const module = quote.featureList.find((m) => m.id === unit.moduleId);
    if (!module) return;
    const result = ungroupUnit(evalSheet.evaluationUnits, unitId, module, activeRoleKeys);
    persist({ ...evalSheet, evaluationUnits: sortUnitsByFeatureList(result.units, quote.featureList) });
    Message.success('已解除合并，恢复单项评估');
    // 激活第二行输入框
    if (result.activateUnitId) {
      setTimeout(() => {
        const el = document.querySelector(`input[data-fill="${result.activateUnitId}-pm_days"]`) as HTMLInputElement | null;
        if (el) { el.focus(); el.select(); }
      }, 100);
    }
  };

  const handleSubmit = () => {
    // 校验手动核定工期必填
    if (!evalSheet.manualWorkDays || evalSheet.manualWorkDays <= 0) {
      Message.warning('请填写手动核定工期');
      return;
    }
    // 校验所有评估单元的所有岗位是否都填了数字
    const empty = new Set<string>();
    for (const unit of sortedUnits) {
      for (const rk of activeRoleKeys) {
        const v = unit.manualWorkload[rk];
        if (v === undefined || v === null || v === 0) {
          empty.add(`${unit.id}-${rk}`);
        }
      }
    }
    if (empty.size > 0) {
      setEmptyCells(empty);
      Message.warning(`有 ${empty.size} 个岗位人天未填写，请补全后提交`);
      return;
    }
    setEmptyCells(new Set());
    submitEval(quote.id);
    Message.success('人天评估完成，已转派销售进行报价配置');
  };

  const totalDays = sumEvalDays(evalSheet);
  const roleTotals = sumEvalDaysByRole(evalSheet);
  const sortedUnits = readonly ? evalSheet.evaluationUnits : sortUnitsByFeatureList(evalSheet.evaluationUnits, quote.featureList);

  const toggleSelect = (subId: string) => {
    setSelectedSubIds((prev) => (prev.includes(subId) ? prev.filter((x) => x !== subId) : [...prev, subId]));
  };

  const headerCellStyle = { whiteSpace: 'nowrap' as const };

  const columns = [
    {
      title: '选', dataIndex: '__select', width: 46, _headerCellStyle: headerCellStyle,
      render: (_: unknown, record: EvaluationUnit) => {
        if (readonly || record.granularity !== 'SINGLE') return null;
        const firstId = record.boundSubFeatureIds[0];
        return (
          <input
            type="checkbox"
            checked={selectedSubIds.includes(firstId)}
            onChange={() => toggleSelect(firstId)}
            style={{ cursor: 'pointer' }}
          />
        );
      },
    },
    {
      title: '模块', dataIndex: 'moduleName', width: 110,
      _headerCellStyle: headerCellStyle,
      render: (name: string, record: EvaluationUnit) => (
        <div
          onClick={() => {
            if (!readonly && record.granularity === 'SINGLE' && record.boundSubFeatureIds.length === 1) {
              toggleSelect(record.boundSubFeatureIds[0]);
            }
          }}
          style={{ cursor: record.granularity === 'SINGLE' ? 'pointer' : 'default' }}
        >
          <Text bold style={{ whiteSpace: 'nowrap' }}>{name}</Text>
        </div>
      ),
    },
    {
      title: '端', dataIndex: 'endpointId', width: 120,
      _headerCellStyle: headerCellStyle,
      render: (_: unknown, record: EvaluationUnit) => {
        // 找到模块关联的端
        const module = quote.featureList.find((m) => m.id === record.moduleId);
        const ep = quote.endpointConfigs?.find((e) => e.id === module?.endpointId);
        if (!ep) return <Text type="secondary">-</Text>;
        const platformNames = ep.platforms.map((pid) => PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid);
        return (
          <div>
            <Text bold style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{ep.name}</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {platformNames.map((name) => (
                <Tag key={name} size="small" color="arcoblue" style={{ width: 'fit-content', fontSize: 10 }}>{name}</Tag>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      title: '评估切片 / 子功能', dataIndex: 'groupName', width: 180,
      _headerCellStyle: headerCellStyle,
      render: (name: string | undefined, record: EvaluationUnit) => {
        const subNames = record.boundSubFeatureIds
          .map((id) => quote.featureList.flatMap((m) => m.subFeatures).find((f) => f.id === id)?.name)
          .filter(Boolean);
        const icon = record.granularity === 'MODULE_PACK' ? '📦' : record.granularity === 'SUB_GROUP' ? '🔗' : '';
        return (
          <div
            onClick={() => {
              if (!readonly && record.granularity === 'SINGLE' && record.boundSubFeatureIds.length === 1) {
                toggleSelect(record.boundSubFeatureIds[0]);
              }
            }}
            style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6, cursor: record.granularity === 'SINGLE' ? 'pointer' : 'default' }}
          >
            {subNames.length > 0
              ? subNames.map((n, i) => <div key={i}>{n}</div>)
              : <span style={{ color: 'var(--color-text-3)' }}>-</span>
            }
          </div>
        );
      },
    },
    {
      title: '粒度', dataIndex: 'granularity', width: 90,
      _headerCellStyle: headerCellStyle,
      render: (g: EvaluationUnit['granularity'], record: EvaluationUnit) => (
        <div
          onClick={() => {
            if (!readonly && record.granularity === 'SINGLE' && record.boundSubFeatureIds.length === 1) {
              toggleSelect(record.boundSubFeatureIds[0]);
            }
          }}
          style={{ cursor: record.granularity === 'SINGLE' ? 'pointer' : 'default' }}
        >
          <Tag size="small">{GRANULARITY_LABELS[g]}</Tag>
        </div>
      ),
    },
    ...evalSheet.activeRoles.map((role) => ({
      title: (
        <Space size={4} align="center" style={{ whiteSpace: 'nowrap' }}>
          <span>{role.name}</span>
          {!readonly && (
            <IconClose
              style={{ fontSize: 12, color: 'rgb(var(--red-5))', cursor: 'pointer' }}
              onClick={() => removeRole(role.key)}
            />
          )}
        </Space>
      ),
      dataIndex: role.key, width: 80,
      _headerCellStyle: headerCellStyle,
      render: (_: unknown, record: EvaluationUnit) => {
        const val = record.manualWorkload[role.key];
        if (readonly) return <Text>{val ?? '-'}</Text>;
        const cellKey = `${record.id}-${role.key}`;
        const isEmpty = val === undefined || val === null || val === 0;
        const hasError = emptyCells.has(cellKey);
        const isRemainder = record.isRemainder && record.granularity === 'SINGLE';
        return (
          <NumericInput
            value={val}
            unitId={record.id}
            roleKey={role.key}
            hasError={hasError}
            isRemainder={isRemainder}
            fillRef={fillRef}
            sortedUnits={sortedUnits}
            activeRoleKeys={activeRoleKeys}
            updateWorkload={updateWorkload}
            emptyCells={emptyCells}
            cellKey={cellKey}
            setEmptyCells={setEmptyCells}
          />
        );
      },
    })),
    {
      title: '小计(人天)', dataIndex: 'totalDays', width: 80,
      _headerCellStyle: headerCellStyle,
      render: (v: number) => <Text bold>{v.toFixed(1)}</Text>,
    },
    {
      title: '技术备注', dataIndex: 'techRemark', width: 180,
      _headerCellStyle: headerCellStyle,
      render: (v: string | undefined, record: EvaluationUnit) =>
        readonly ? (
          <Text type="secondary">{v || '-'}</Text>
        ) : (
          <Input size="small" value={v ?? ''} onChange={(val) => updateUnitMeta(record.id, { techRemark: val })} placeholder="架构/依赖说明"
            onKeyDown={(e) => {
              // 阻止 WASD 和方向键传播到外层导航逻辑
              if (['w','W','a','A','s','S','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.stopPropagation();
              }
            }}
          />
        ),
    },
    {
      title: '操作', dataIndex: 'op', width: 120, fixed: 'right' as const,
      render: (_: unknown, record: EvaluationUnit) => {
        if (readonly) return null;
        if (record.granularity === 'SINGLE') {
          return null;
        }
        return (
          <Button type="text" size="mini" icon={<IconScissor />} onClick={() => handleUngroup(record.id)}>解除合并</Button>
        );
      },
    },
  ];

  return (
    <>
    <Card
      title={<Title heading={6} style={{ margin: 0 }}>数据流转 · 工作台二 · 在线人天评估</Title>}
    >
      {/* 控制栏：新增岗位 + 切片操作 */}
      {!readonly && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 6 }}>
          <Space wrap>
            <Text bold>新增岗位：</Text>
            <Select
              size="small"
              placeholder="选择预设岗位"
              style={{ width: 140 }}
              onChange={(v) => v && addRole(v)}
              value={undefined}
              options={PRESET_EVAL_ROLES
                .filter((r) => !activeRoleKeys.includes(r.key))
                .map((r) => ({ label: r.name, value: r.key }))}
              showSearch
            />
            <Button size="small" icon={<IconPlus />} onClick={() => setCustomRoleVisible(true)}>自定义岗位</Button>
            <Text bold style={{ marginLeft: 8 }}>切片操作：</Text>
            <Button size="small" icon={<IconMenu />} onClick={() => {
              // 按模块批量打包：一次性对所有模块执行整模块打包
              let units = evalSheet.evaluationUnits;
              for (const m of quote.featureList) {
                units = packModule(units, m, activeRoleKeys);
              }
              const next = { ...evalSheet, evaluationUnits: sortUnitsByFeatureList(units, quote.featureList) };
              setDraft(next);
              saveEvalSheet(quote.id, next);
              Message.success('已按模块全部打包');
            }}>按模块</Button>
            <Button size="small" icon={<IconCopy />} onClick={() => {
              // 按子功能：重置为逐项单项评估
              let allUnits = evalSheet.evaluationUnits;
              // 先处理所有 MODULE_PACK 和 SUB_GROUP 单元
              for (const unit of allUnits) {
                if (unit.granularity === 'MODULE_PACK' || unit.granularity === 'SUB_GROUP') {
                  const module = quote.featureList.find((m) => m.id === unit.moduleId);
                  if (module) {
                    const result = ungroupPackedUnit(allUnits, unit.id, module, activeRoleKeys);
                    allUnits = result.units;
                  }
                }
              }
              const next = { ...evalSheet, evaluationUnits: sortUnitsByFeatureList(allUnits, quote.featureList) };
              setDraft(next);
              saveEvalSheet(quote.id, next);
              Message.success('已按子功能重置为单项评估');
            }}>按子功能</Button>
            <Select
              size="small"
              placeholder="整模块打包"
              style={{ width: 160 }}
              onChange={(v) => v && handlePackModule(v)}
              value={undefined}
              options={quote.featureList
                .filter((m: FeatureModule) => {
                  // 排除已经是 MODULE_PACK 的模块
                  return !evalSheet.evaluationUnits.some(
                    (u) => u.moduleId === m.id && u.granularity === 'MODULE_PACK'
                  );
                })
                .map((m: FeatureModule) => ({ label: m.name, value: m.id }))}
            />
            <Button size="small" icon={<IconLink />} disabled={selectedSubIds.length < 2} onClick={handleGroupSelected}>
              合并选定 ({selectedSubIds.length})
            </Button>
            <Button size="small" onClick={() => setSelectedSubIds([])}>清除勾选</Button>
          </Space>
        </div>
      )}

      {/* 原生 HTML table 实现端列 rowspan 合并 */}
      <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'var(--color-fill-1)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 46, whiteSpace: 'nowrap' }}>序号</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 120, whiteSpace: 'nowrap' }}>端</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 40, whiteSpace: 'nowrap' }}>选</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 110, whiteSpace: 'nowrap' }}>模块</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 180, whiteSpace: 'nowrap' }}>评估切片 / 子功能</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 90, whiteSpace: 'nowrap' }}>粒度</th>
              {evalSheet.activeRoles.map((r: EvalRole, ri: number) => (
                <th key={r.key} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 80, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      draggable={!readonly}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(ri)); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIdx === ri) return;
                        const newRoles = [...evalSheet.activeRoles];
                        const [moved] = newRoles.splice(fromIdx, 1);
                        newRoles.splice(ri, 0, moved);
                        persist({ ...evalSheet, activeRoles: newRoles });
                      }}
                      style={{ cursor: 'grab', fontSize: 10, color: 'var(--color-text-3)' }}
                    >⠿</span>
                    <span>{r.name}</span>
                    {!readonly && (
                      <IconClose
                        style={{ fontSize: 12, color: 'rgb(var(--red-5))', cursor: 'pointer' }}
                        onClick={() => {
                          const newRoles = evalSheet.activeRoles.filter((rr) => rr.key !== r.key);
                          const units = removeRoleFromUnits(evalSheet.evaluationUnits, r.key, newRoles.map((rr) => rr.key));
                          persist({ ...evalSheet, activeRoles: newRoles, evaluationUnits: units });
                        }}
                      />
                    )}
                  </div>
                </th>
              ))}
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 80, whiteSpace: 'nowrap' }}>小计</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 180, whiteSpace: 'nowrap' }}>技术备注</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 100, whiteSpace: 'nowrap' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // 计算端的 rowspan
              const epRowSpans: Record<string, number> = {};
              const epFirstIdx: Record<string, number> = {};
              sortedUnits.forEach((u, idx) => {
                const module = quote.featureList.find((m) => m.id === u.moduleId);
                const epId = module?.endpointId || '';
                if (!(epId in epFirstIdx)) { epFirstIdx[epId] = idx; epRowSpans[epId] = 0; }
                epRowSpans[epId]++;
              });

              return sortedUnits.map((unit, idx) => {
                const module = quote.featureList.find((m) => m.id === unit.moduleId);
                const ep = quote.endpointConfigs?.find((e) => e.id === module?.endpointId);
                const epId = module?.endpointId || '';
                const isFirstOfEp = epFirstIdx[epId] === idx;
                const rowspan = isFirstOfEp ? epRowSpans[epId] : 0;
                const platformNames = ep ? ep.platforms.map((pid) => PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid) : [];
                const subNames = unit.boundSubFeatureIds
                  .map((id) => quote.featureList.flatMap((m) => m.subFeatures).find((f) => f.id === id)?.name)
                  .filter(Boolean);

                return (
                  <tr key={unit.id} data-unit-id={unit.id} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                    {/* 序号 */}
                    <td style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)' }}>
                      <Text type="secondary">{idx + 1}</Text>
                    </td>
                    {/* 端 */}
                    {isFirstOfEp ? (
                      <td rowSpan={rowspan} style={{ padding: '8px 10px', verticalAlign: 'top', borderRight: '1px solid var(--color-border-2)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 12 }}>{ep?.name || '-'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {platformNames.map((name: string) => (
                            <Tag key={name} size="small" color="arcoblue" style={{ width: 'fit-content', fontSize: 10 }}>{name}</Tag>
                          ))}
                        </div>
                      </td>
                    ) : null}
                    {/* 选 */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderRight: '1px solid var(--color-border-2)' }}>
                      {!readonly && unit.granularity === 'SINGLE' && unit.boundSubFeatureIds.length === 1 && (
                        <input type="checkbox" checked={selectedSubIds.includes(unit.boundSubFeatureIds[0])} onChange={() => toggleSelect(unit.boundSubFeatureIds[0])} style={{ cursor: 'pointer' }} />
                      )}
                    </td>
                    {/* 模块 */}
                    <td style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)', whiteSpace: 'nowrap' }}
                      onClick={() => { if (!readonly && unit.granularity === 'SINGLE' && unit.boundSubFeatureIds.length === 1) toggleSelect(unit.boundSubFeatureIds[0]); }}>
                      <Text bold>{unit.moduleName}</Text>
                    </td>
                    {/* 评估切片 / 子功能 */}
                    <td style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)', lineHeight: 1.6 }}
                      onClick={() => { if (!readonly && unit.granularity === 'SINGLE' && unit.boundSubFeatureIds.length === 1) toggleSelect(unit.boundSubFeatureIds[0]); }}>
                      {subNames.length > 0
                        ? subNames.map((n, i) => <div key={i}>{n}</div>)
                        : <span style={{ color: 'var(--color-text-3)' }}>-</span>
                      }
                    </td>
                    {/* 粒度 */}
                    <td style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)' }}
                      onClick={() => { if (!readonly && unit.granularity === 'SINGLE' && unit.boundSubFeatureIds.length === 1) toggleSelect(unit.boundSubFeatureIds[0]); }}>
                      <Tag size="small">{GRANULARITY_LABELS[unit.granularity]}</Tag>
                    </td>
                    {/* 各岗位工时 */}
                    {evalSheet.activeRoles.map((role) => {
                      const val = unit.manualWorkload[role.key];
                      const cellKey = `${unit.id}-${role.key}`;
                      const hasError = emptyCells.has(cellKey);
                      const isRemainder = unit.isRemainder && unit.granularity === 'SINGLE';
                      return (
                        <td key={role.key} style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)' }}>
                          {readonly ? (
                            <Text>{val?.toFixed(1) ?? '-'}</Text>
                          ) : (
                            <div onKeyDownCapture={(e) => {
                              const wasdMap: Record<string, string> = { w: 'ArrowUp', W: 'ArrowUp', s: 'ArrowDown', S: 'ArrowDown', a: 'ArrowLeft', A: 'ArrowLeft', d: 'ArrowRight', D: 'ArrowRight' };
                              if (wasdMap[e.key] && fillRef.current) {
                                e.preventDefault(); e.stopPropagation();
                                const dir = wasdMap[e.key];
                                const roleKeys = activeRoleKeys;
                                const curIdx = sortedUnits.findIndex((u) => u.id === fillRef.current!.unitId);
                                const curRoleIdx = roleKeys.indexOf(fillRef.current!.roleKey);
                                let tIdx = curIdx, tRoleIdx = curRoleIdx;
                                if (dir === 'ArrowUp') tIdx--; else if (dir === 'ArrowDown') tIdx++; else if (dir === 'ArrowLeft') tRoleIdx--; else if (dir === 'ArrowRight') tRoleIdx++;
                                if (tIdx >= 0 && tIdx < sortedUnits.length && tRoleIdx >= 0 && tRoleIdx < roleKeys.length) {
                                  const tUnit = sortedUnits[tIdx]; const tRole = roleKeys[tRoleIdx];
                                  updateWorkload(tUnit.id, tRole, fillRef.current.value);
                                  fillRef.current = { unitId: tUnit.id, roleKey: tRole, value: fillRef.current.value };
                                  requestAnimationFrame(() => { const el = document.querySelector(`input[data-fill="${tUnit.id}-${tRole}"]`) as HTMLInputElement | null; if (el) { el.focus(); el.select(); } });
                                }
                                return;
                              }
                              if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { arrowRef.current = e.key as any; }
                              if (e.key === 'Tab' && arrowRef.current && fillRef.current) {
                                e.preventDefault(); e.stopPropagation();
                                const dir = arrowRef.current;
                                const roleKeys = activeRoleKeys;
                                const curIdx = sortedUnits.findIndex((u) => u.id === fillRef.current!.unitId);
                                const curRoleIdx = roleKeys.indexOf(fillRef.current!.roleKey);
                                let tIdx = curIdx, tRoleIdx = curRoleIdx;
                                if (dir === 'ArrowUp') tIdx--; else if (dir === 'ArrowDown') tIdx++; else if (dir === 'ArrowLeft') tRoleIdx--; else if (dir === 'ArrowRight') tRoleIdx++;
                                if (tIdx >= 0 && tIdx < sortedUnits.length && tRoleIdx >= 0 && tRoleIdx < roleKeys.length) {
                                  const tUnit = sortedUnits[tIdx]; const tRole = roleKeys[tRoleIdx];
                                  updateWorkload(tUnit.id, tRole, fillRef.current.value);
                                  fillRef.current = { unitId: tUnit.id, roleKey: tRole, value: fillRef.current.value };
                                  requestAnimationFrame(() => { const el = document.querySelector(`input[data-fill="${tUnit.id}-${tRole}"]`) as HTMLInputElement | null; if (el) { el.focus(); el.select(); } });
                                }
                              }
                            }} onKeyUp={(e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) arrowRef.current = null; }}>
                              <InputNumber size="small" min={0} step={0.1} precision={1}
                                value={val && val > 0 ? val : null} placeholder=""
                                onFocus={() => { fillRef.current = { unitId: unit.id, roleKey: role.key, value: val ?? 0 }; }}
                                onChange={(v) => { const num = typeof v === 'number' ? v : 0; updateWorkload(unit.id, role.key, num); fillRef.current = { unitId: unit.id, roleKey: role.key, value: num }; if (emptyCells.has(cellKey)) setEmptyCells((prev) => { const s = new Set(prev); s.delete(cellKey); return s; }); }}
                                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); } }}
                                data-fill={`${unit.id}-${role.key}`}
                                style={{ width: 76, ...(hasError ? { borderColor: 'rgb(var(--red-5))', boxShadow: '0 0 0 1px rgb(var(--red-3))' } : {}), ...(isRemainder ? { borderColor: 'rgb(var(--red-5))', boxShadow: '0 0 0 1px rgb(var(--red-3))' } : {}) }}
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {/* 小计 */}
                    <td style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)', fontWeight: 600 }}>
                      {unit.totalDays.toFixed(1)}
                    </td>
                    {/* 技术备注 */}
                    <td style={{ padding: '8px 10px', borderRight: '1px solid var(--color-border-2)' }}>
                      {readonly ? (
                        <Text type="secondary">{unit.techRemark || '-'}</Text>
                      ) : (
                        <Input size="small" value={unit.techRemark ?? ''} onChange={(v) => updateUnitMeta(unit.id, { techRemark: v })} placeholder="架构/依赖说明" onKeyDown={(e) => { if (['w','W','a','A','s','S','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.stopPropagation(); }} />
                      )}
                    </td>
                    {/* 操作 */}
                    <td style={{ padding: '8px 10px' }}>
                      {!readonly && (
                        unit.granularity === 'SINGLE' ? null : (
                          <Button type="text" size="mini" icon={<IconScissor />} onClick={() => handleUngroup(unit.id)}>解除合并</Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* 底部汇总 */}
      <div style={{ marginTop: 12, padding: 12, background: 'var(--color-fill-1)', borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {!readonly ? (
            <>
              <Text>手动核定工期</Text>
              <InputNumber
                min={0}
                value={evalSheet.manualWorkDays || undefined}
                onChange={(v) => persist({ ...evalSheet, manualWorkDays: typeof v === 'number' ? v : 0 })}
                suffix="工作日"
                placeholder="必填"
                style={{ width: 140 }}
              />
              <Text>技术方案</Text>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 2 }}
                value={evalSheet.techSolutionNote}
                onChange={(v) => persist({ ...evalSheet, techSolutionNote: v })}
                placeholder="架构选型、服务器配置、第三方依赖"
                style={{ flex: 1, minWidth: 300 }}
              />
            </>
          ) : (
            <>
              <Text>核定工期 <Text bold>{evalSheet.manualWorkDays}</Text> 工作日</Text>
              <Text type="secondary">技术方案：{evalSheet.techSolutionNote || '-'}</Text>
            </>
          )}
        </div>
      </div>

      {/* 页面底部浮动栏：定位 + 岗位统计 + 端统计 + 提交 */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 16,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 16px',
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-border-2)',
          borderRadius: 8,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.06)',
          flexWrap: 'wrap',
        }}
      >
        <Space size={8} wrap>
          {/* 定位按钮 */}
          <Dropdown
            trigger="click"
            position="tl"
            droplist={
              <Menu style={{ maxHeight: 400, overflow: 'auto' }}>
                {endpointConfigs.map((ep) => {
                  const epModules = quote.featureList.filter((m) => m.endpointId === ep.id);
                  return (
                    <Menu.SubMenu key={ep.id} title={ep.name}>
                      {epModules.map((m) => (
                        <Menu.SubMenu key={m.id} title={m.name || '未命名'}>
                          {sortedUnits.filter((u) => u.moduleId === m.id).map((u) => {
                            const subName = u.boundSubFeatureIds.map((id) => quote.featureList.flatMap((fm) => fm.subFeatures).find((f) => f.id === id)?.name).filter(Boolean).join(', ');
                            return (
                              <Menu.Item key={u.id} onClick={() => {
                                // 滚动到目标行并高亮
                                const row = document.querySelector(`tr[data-unit-id="${u.id}"]`);
                                if (row) {
                                  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  // 高亮闪烁效果
                                  const originalBg = row.style.background;
                                  row.style.background = 'rgb(var(--arcoblue-1))';
                                  row.style.transition = 'background 0.3s';
                                  setTimeout(() => { row.style.background = originalBg || ''; }, 800);
                                }
                                // 同时聚焦到第一个输入框
                                const el = document.querySelector(`input[data-fill="${u.id}-${activeRoleKeys[0]}"]`);
                                if (el) setTimeout(() => { el.focus(); el.select(); }, 300);
                              }}>
                                {subName || u.groupName || '未命名'}
                              </Menu.Item>
                            );
                          })}
                        </Menu.SubMenu>
                      ))}
                    </Menu.SubMenu>
                  );
                })}
              </Menu>
            }
          >
            <Button size="small" icon={<IconApps />}>定位</Button>
          </Dropdown>

          {/* 各岗位统计 - 按端分组显示模块 */}
          {evalSheet.activeRoles.map((r: EvalRole) => {
            const roleTotal = roleTotals[r.key] ?? 0;
            // 按端分组，每个端下按模块汇总
            const epGroups: { epName: string; epTotal: number; modules: { name: string; total: number }[] }[] = [];
            endpointConfigs.forEach((ep) => {
              const epUnits = sortedUnits.filter((u) => {
                const mod = quote.featureList.find((m) => m.id === u.moduleId);
                return mod?.endpointId === ep.id;
              });
              const epTotal = epUnits.reduce((s, u) => s + (u.manualWorkload[r.key] ?? 0), 0);
              if (epTotal === 0) return;
              const modMap = new Map<string, number>();
              epUnits.forEach((u) => {
                const val = u.manualWorkload[r.key] ?? 0;
                if (val > 0) modMap.set(u.moduleName, (modMap.get(u.moduleName) || 0) + val);
              });
              epGroups.push({
                epName: ep.name,
                epTotal,
                modules: Array.from(modMap.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
              });
            });
            return (
              <Dropdown key={r.key} trigger="click" position="tl" disabled={roleTotal === 0} droplist={
                <div style={{ padding: 12, minWidth: 280, maxHeight: 400, overflow: 'auto', background: 'var(--color-bg-2)', borderRadius: 6, border: '1px solid var(--color-border-2)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                  <Text bold style={{ display: 'block', marginBottom: 8 }}>{r.name} · <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>{roleTotal.toFixed(1)}</Text> 人天</Text>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-2)', background: 'var(--color-fill-1)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>模块</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>人天</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epGroups.map((group) => (
                        <React.Fragment key={group.epName}>
                          <tr style={{ background: 'var(--color-fill-1)' }}>
                            <td colSpan={3} style={{ padding: '4px 8px', fontWeight: 600, fontSize: 12 }}>{group.epName} · {group.epTotal.toFixed(1)}</td>
                          </tr>
                          {group.modules.map((m) => (
                            <tr key={m.name} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                              <td style={{ padding: '4px 8px', paddingLeft: 16 }}>{m.name}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Inter Variable', Arial, sans-serif", color: 'rgb(var(--arcoblue-6))' }}>{m.total.toFixed(1)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Inter Variable', Arial, sans-serif" }}>{roleTotal > 0 ? ((m.total / roleTotal) * 100).toFixed(0) : 0}%</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              }>
                <Button size="small" type="text">
                  <span style={{ color: 'var(--color-text-1)' }}>{r.name}</span> <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>{roleTotal.toFixed(1)}</Text>
                </Button>
              </Dropdown>
            );
          })}

          {/* 总人天 */}
          <Dropdown trigger="click" position="tl" disabled={totalDays === 0} droplist={
            <div style={{ padding: 12, minWidth: 160, background: 'var(--color-bg-2)', borderRadius: 6, border: '1px solid var(--color-border-2)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
              {evalSheet.activeRoles.map((r: EvalRole) => {
                const roleTotal = roleTotals[r.key] ?? 0;
                return (
                  <div key={r.key} style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.name}</span>
                    <span style={{ fontFamily: "'Inter Variable', Arial, sans-serif", color: 'rgb(var(--arcoblue-6))' }}>{roleTotal.toFixed(1)} ({totalDays > 0 ? ((roleTotal / totalDays) * 100).toFixed(0) : 0}%)</span>
                  </div>
                );
              })}
            </div>
          }>
            <Button size="small" type="text">
              总人天 <Text bold style={{ fontSize: 14, color: 'rgb(var(--arcoblue-6))' }}>{totalDays.toFixed(1)}</Text>
            </Button>
          </Dropdown>

          {/* 端统计 - 每个端独立按钮 */}
          {(() => {
            const epTotals: Record<string, number> = {};
            sortedUnits.forEach((u) => {
              const module = quote.featureList.find((m) => m.id === u.moduleId);
              const epId = module?.endpointId || '未分配';
              epTotals[epId] = (epTotals[epId] || 0) + u.totalDays;
            });
            const epEntries = Object.entries(epTotals).filter(([, v]) => v > 0);
            return epEntries.map(([epId, val]) => {
              const ep = endpointConfigs.find((e) => e.id === epId);
              const epModules = quote.featureList.filter((m) => m.endpointId === epId);
              return (
                <Dropdown key={epId} trigger="click" position="tl" droplist={
                  <div style={{ padding: 12, minWidth: 250, maxHeight: 350, overflow: 'auto', background: 'var(--color-bg-2)', borderRadius: 6, border: '1px solid var(--color-border-2)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                    <Text bold style={{ display: 'block', marginBottom: 6 }}>{ep?.name || epId} · <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>{val.toFixed(1)}</Text> 人天</Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border-2)', background: 'var(--color-fill-1)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 8px' }}>岗位</th>
                          <th style={{ textAlign: 'right', padding: '4px 8px' }}>人天</th>
                          <th style={{ textAlign: 'right', padding: '4px 8px' }}>占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalSheet.activeRoles.map((r: EvalRole) => {
                          const roleVal = sortedUnits.filter((u) => {
                            const mod = quote.featureList.find((m) => m.id === u.moduleId);
                            return mod?.endpointId === epId;
                          }).reduce((sum, u) => sum + (u.manualWorkload[r.key] ?? 0), 0);
                          if (roleVal === 0) return null;
                          return (
                            <tr key={r.key} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                              <td style={{ padding: '4px 8px' }}>{r.name}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Inter Variable', Arial, sans-serif", color: 'rgb(var(--arcoblue-6))' }}>{roleVal.toFixed(1)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Inter Variable', Arial, sans-serif" }}>{val > 0 ? ((roleVal / val) * 100).toFixed(0) : 0}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>按模块：</Text>
                      {epModules.map((m) => {
                        const modTotal = sortedUnits.filter((u) => u.moduleId === m.id).reduce((s, u) => s + u.totalDays, 0);
                        if (modTotal === 0) return null;
                        return <Tag key={m.id} size="small" style={{ marginRight: 4 }}>{m.name || '未命名'} {modTotal.toFixed(1)}</Tag>;
                      })}
                    </div>
                  </div>
                }>
                  <Button size="small" type="text">
                    <span style={{ color: 'var(--color-text-1)' }}>{ep?.name || epId}</span> <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>{val.toFixed(1)}</Text>
                  </Button>
                </Dropdown>
              );
            });
          })()}
        </Space>

        {!readonly && (
          <Button type="primary" icon={<IconSend />} disabled={leadFrozen} onClick={handleSubmit}>评估完成</Button>
        )}
      </div>
    </Card>
    <Modal title="新增自定义岗位" visible={customRoleVisible} onCancel={() => setCustomRoleVisible(false)} onOk={addCustomRole} okText="新增岗位">
      <Input value={customRoleName} onChange={setCustomRoleName} placeholder="请输入岗位名称" maxLength={20} showWordLimit autoFocus />
    </Modal>
    </>
  );
}
