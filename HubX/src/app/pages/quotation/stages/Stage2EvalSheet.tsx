import { useMemo, useRef, useState } from 'react';
import {
  Button, Card, Empty, Input, InputNumber, Message, Select, Space, Table, Tag, Typography,
} from '@arco-design/web-react';
import {
  IconPlus, IconClose, IconSend, IconLink, IconScissor, IconCopy, IconMenu,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import {
  buildInitialUnits, computeUnitTotal, groupSubFeatures, packModule,
  removeRoleFromUnits, restoreToSingleUnits, sortUnitsByFeatureList, sumEvalDays, sumEvalDaysByRole, ungroupPackedUnit, ungroupUnit,
} from '../quoteFlow';
import {
  GRANULARITY_LABELS, PRESET_EVAL_ROLES, RISK_META,
} from '../types';
import type { EvalRole, EvaluationUnit, FeatureModule, RiskLevel } from '../types';

const { Text, Title } = Typography;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function Stage2EvalSheet({ quote, readonly }: StageProps) {
  const { saveEvalSheet, submitEval } = useQuotation();
  // 编辑态用本地草稿，避免每次按键都写全局
  const [draft, setDraft] = useState(quote.evalSheet);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  // 快捷填充：记录当前聚焦的单元格及其值
  const fillRef = useRef<{ unitId: string; roleKey: string; value: number } | null>(null);
  const arrowRef = useRef<'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | null>(null);
  // 验证：记录未填写的格子 set<string> = "unitId-roleKey"
  const [emptyCells, setEmptyCells] = useState<Set<string>>(new Set());

  const evalSheet = readonly ? quote.evalSheet : draft;
  if (!evalSheet) {
    return (
      <Card title={<Title heading={6} style={{ margin: 0 }}>工作台二 · 技术人天评估</Title>}>
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
    const name = `自定义岗位${evalSheet.activeRoles.length + 1}`;
    const key = `custom_${Math.random().toString(36).slice(2, 6)}`;
    persist({ ...evalSheet, activeRoles: [...evalSheet.activeRoles, { key, name }] });
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
      render: (name: string) => <Text bold style={{ whiteSpace: 'nowrap' }}>{name}</Text>,
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
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
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
      render: (g: EvaluationUnit['granularity']) => <Tag size="small">{GRANULARITY_LABELS[g]}</Tag>,
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
          <div
            onKeyDownCapture={(e) => {
              // WASD 键直接导航
              const wasdMap: Record<string, 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'> = {
                w: 'ArrowUp', W: 'ArrowUp',
                s: 'ArrowDown', S: 'ArrowDown',
                a: 'ArrowLeft', A: 'ArrowLeft',
                d: 'ArrowRight', D: 'ArrowRight',
              };
              if (wasdMap[e.key] && fillRef.current) {
                e.preventDefault();
                e.stopPropagation();
                const dir = wasdMap[e.key];
                const sorted = sortUnitsByFeatureList(evalSheet.evaluationUnits, quote.featureList);
                const roleKeys = activeRoleKeys;
                const curIdx = sorted.findIndex((u) => u.id === fillRef.current!.unitId);
                const curRoleIdx = roleKeys.indexOf(fillRef.current!.roleKey);
                let targetIdx = curIdx;
                let targetRoleIdx = curRoleIdx;
                if (dir === 'ArrowUp') targetIdx = curIdx - 1;
                else if (dir === 'ArrowDown') targetIdx = curIdx + 1;
                else if (dir === 'ArrowLeft') targetRoleIdx = curRoleIdx - 1;
                else if (dir === 'ArrowRight') targetRoleIdx = curRoleIdx + 1;
                if (targetIdx >= 0 && targetIdx < sorted.length && targetRoleIdx >= 0 && targetRoleIdx < roleKeys.length) {
                  const targetUnit = sorted[targetIdx];
                  const targetRole = roleKeys[targetRoleIdx];
                  // WASD 导航只移动焦点，不填入数字
                  fillRef.current = { unitId: targetUnit.id, roleKey: targetRole, value: targetUnit.manualWorkload[targetRole] ?? 0 };
                  requestAnimationFrame(() => {
                    const el = document.querySelector(`input[data-fill="${targetUnit.id}-${targetRole}"]`) as HTMLInputElement | null;
                    if (el) { el.focus(); el.select(); }
                  });
                }
                return;
              }
              // 方向键记录方向，同时阻止上下键改变数值
              if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                arrowRef.current = e.key as typeof arrowRef.current;
                // 阻止上下键改变数值
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
              // 方向键 + Tab 组合：将当前值填入下一个输入框
              if (e.key === 'Tab' && arrowRef.current && fillRef.current) {
                e.preventDefault();
                e.stopPropagation();
                const dir = arrowRef.current;
                const sorted = sortUnitsByFeatureList(evalSheet.evaluationUnits, quote.featureList);
                const roleKeys = activeRoleKeys;
                const curIdx = sorted.findIndex((u) => u.id === fillRef.current!.unitId);
                const curRoleIdx = roleKeys.indexOf(fillRef.current!.roleKey);
                let targetIdx = curIdx;
                let targetRoleIdx = curRoleIdx;
                if (dir === 'ArrowUp') targetIdx = curIdx - 1;
                else if (dir === 'ArrowDown') targetIdx = curIdx + 1;
                else if (dir === 'ArrowLeft') targetRoleIdx = curRoleIdx - 1;
                else if (dir === 'ArrowRight') targetRoleIdx = curRoleIdx + 1;
                if (targetIdx >= 0 && targetIdx < sorted.length && targetRoleIdx >= 0 && targetRoleIdx < roleKeys.length) {
                  const targetUnit = sorted[targetIdx];
                  const targetRole = roleKeys[targetRoleIdx];
                  updateWorkload(targetUnit.id, targetRole, fillRef.current.value);
                  fillRef.current = { unitId: targetUnit.id, roleKey: targetRole, value: fillRef.current.value };
                  requestAnimationFrame(() => {
                    const el = document.querySelector(`input[data-fill="${targetUnit.id}-${targetRole}"]`) as HTMLInputElement | null;
                    if (el) { el.focus(); el.select(); }
                  });
                }
              }
            }}
            onKeyUp={(e) => {
              if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                arrowRef.current = null;
              }
            }}
            style={{ display: 'inline-block' }}
          >
            <InputNumber
              size="small"
              min={0}
              step={0.1}
              precision={1}
              value={val && val > 0 ? val : null}
              placeholder=""
              onFocus={() => {
                // 聚焦时更新 fillRef，确保从当前激活的输入框开始漫游
                fillRef.current = { unitId: record.id, roleKey: role.key, value: val ?? 0 };
              }}
              onChange={(v) => {
                const num = typeof v === 'number' ? v : 0;
                updateWorkload(record.id, role.key, num, true);
                fillRef.current = { unitId: record.id, roleKey: role.key, value: num };
                if (emptyCells.has(cellKey)) {
                  setEmptyCells((prev) => { const s = new Set(prev); s.delete(cellKey); return s; });
                }
              }}
              onKeyDown={(e) => {
                // 阻止上下键改变数值，只用于方向键+Tab导航
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              }}
              data-fill={`${record.id}-${role.key}`}
              style={{
                width: 76,
                ...(hasError ? { borderColor: 'rgb(var(--red-5))', boxShadow: '0 0 0 1px rgb(var(--red-3))' } : {}),
                ...(isRemainder ? { borderColor: 'rgb(var(--red-5))', boxShadow: '0 0 0 1px rgb(var(--red-3))' } : {}),
              }}
            />
          </div>
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
          <Input size="small" value={v ?? ''} onChange={(val) => updateUnitMeta(record.id, { techRemark: val })} placeholder="架构/依赖说明" />
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
    <Card
      title={<Title heading={6} style={{ margin: 0 }}>工作台二 · 罗总成本与技术人天评估</Title>}
    >
      {/* 控制栏 A：动态岗位 */}
      {!readonly && (
        <div style={{ marginBottom: 12, padding: 12, background: 'var(--color-fill-1)', borderRadius: 6 }}>
          <Space wrap>
            <Text bold>评估岗位：</Text>
            {evalSheet.activeRoles.map((r: EvalRole) => (
              <Tag key={r.key} color="arcoblue">{r.name}</Tag>
            ))}
            <Select
              size="small"
              placeholder="➕ 新增评估岗位"
              style={{ width: 160 }}
              onChange={(v) => v && addRole(v)}
              value={undefined}
              options={PRESET_EVAL_ROLES
                .filter((r) => !activeRoleKeys.includes(r.key))
                .map((r) => ({ label: r.name, value: r.key }))}
              showSearch
            />
            <Button size="small" icon={<IconPlus />} onClick={addCustomRole}>自定义岗位</Button>
          </Space>
        </div>
      )}

      {/* 控制栏 B：切片操作 */}
      {!readonly && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 6 }}>
          <Space wrap>
            <Text bold>切片操作：</Text>
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
              placeholder="📦 整模块打包"
              style={{ width: 160 }}
              onChange={(v) => v && handlePackModule(v)}
              value={undefined}
              options={quote.featureList.map((m: FeatureModule) => ({ label: m.name, value: m.id }))}
            />
            <Button size="small" icon={<IconLink />} disabled={selectedSubIds.length < 2} onClick={handleGroupSelected}>
              合并选定 ({selectedSubIds.length})
            </Button>
            <Button size="small" onClick={() => setSelectedSubIds([])}>清除勾选</Button>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        data={sortedUnits}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1400 }}
      />

      {/* 底部汇总 */}
      <div style={{ marginTop: 12, padding: 12, background: 'var(--color-fill-1)', borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {!readonly ? (
            <>
              <Text>手动核定工期</Text>
              <InputNumber
                min={0}
                value={evalSheet.manualWorkDays}
                onChange={(v) => persist({ ...evalSheet, manualWorkDays: typeof v === 'number' ? v : 0 })}
                suffix="工作日"
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

      {/* 页面底部浮动栏：工时统计 + 提交按钮 */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 16,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-border-2)',
          borderRadius: 8,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Space size={16} wrap>
          {evalSheet.activeRoles.map((r: EvalRole) => (
            <Text key={r.key} style={{ fontSize: 13 }}>
              {r.name} <Text bold>{roleTotals[r.key]?.toFixed(1) ?? 0}</Text>
            </Text>
          ))}
          <Text style={{ fontSize: 13 }}>总人天 <Text bold style={{ fontSize: 15 }}>{totalDays.toFixed(1)}</Text> 人天</Text>
        </Space>
        {!readonly && (
          <Button type="primary" icon={<IconSend />} onClick={handleSubmit}>评估完成，提交 PM 核对</Button>
        )}
      </div>
    </Card>
  );
}
