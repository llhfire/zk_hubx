import React, { useRef, useState } from 'react';
import {
  Button,
  Dropdown,
  EvaluationWorkloadTable,
  Input,
  InputNumber,
  Menu,
  Message,
  Modal,
  Select,
  Space,
  Typography,
  WorkloadNumericInput,
} from '@/design-system';
import { EmptyState, SectionCard, StatusTag } from '@/design-system';
import {
  IconPlus, IconSend, IconLink, IconScissor, IconCopy, IconMenu, IconApps,
} from '@/design-system';
import type { WorkloadNumericInputFillRef } from '@/design-system';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import {
  computeUnitTotal, groupSubFeatures, packModule,
  removeRoleFromUnits, sortUnitsByFeatureList, sumEvalDays, sumEvalDaysByRole, ungroupPackedUnit, ungroupUnit,
} from '../quoteFlow';
import {
  GRANULARITY_LABELS, PLATFORM_OPTIONS, PRESET_EVAL_ROLES,
} from '../types';
import type { EvalRole, EvaluationUnit, FeatureModule } from '../types';

const { Text } = Typography;

export function Stage2EvalSheet({ quote, readonly }: StageProps) {
  const { saveEvalSheet, submitEval, isLeadFrozen } = useQuotation();
  const leadFrozen = isLeadFrozen(quote.id);
  // 编辑态用本地草稿，避免每次按键都写全局
  const [draft, setDraft] = useState(quote.evalSheet);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  // 快捷填充：记录当前聚焦的单元格及其值
  const fillRef = useRef<WorkloadNumericInputFillRef | null>(null);
  // 验证：记录未填写的格子 set<string> = "unitId-roleKey"
  const [emptyCells, setEmptyCells] = useState<Set<string>>(new Set());
  const [customRoleVisible, setCustomRoleVisible] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  const endpointConfigs = quote.endpointConfigs || [];
  const evalSheet = readonly ? quote.evalSheet : draft;
  if (!evalSheet) {
    return (
      <SectionCard title="数据流转 · 工作台二 · 在线人天评估">
        <EmptyState description="尚未收到功能清单，等待产品经理提交" />
      </SectionCard>
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
  const evaluationUnitMap = new Map(sortedUnits.map((unit) => [unit.id, unit]));
  const evaluationRows = sortedUnits.map((unit) => {
    const module = quote.featureList.find((featureModule) => featureModule.id === unit.moduleId);
    const endpoint = endpointConfigs.find((item) => item.id === module?.endpointId);
    const subFeatures = unit.boundSubFeatureIds
      .map((id) => quote.featureList.flatMap((featureModule) => featureModule.subFeatures).find((feature) => feature.id === id)?.name)
      .filter((name): name is string => Boolean(name));

    return {
      key: unit.id,
      endpointKey: module?.endpointId || '__unassigned__',
      endpointName: endpoint?.name || '-',
      platforms: endpoint?.platforms.map((platformId) => (
        <StatusTag key={platformId} size="small" tone="info">{PLATFORM_OPTIONS.find((platform) => platform.id === platformId)?.name || platformId}</StatusTag>
      )),
      moduleName: unit.moduleName,
      subFeatures,
      granularity: <StatusTag size="small">{GRANULARITY_LABELS[unit.granularity]}</StatusTag>,
      selectable: unit.granularity === 'SINGLE' && unit.boundSubFeatureIds.length === 1,
      selected: selectedSubIds.includes(unit.boundSubFeatureIds[0]),
      totalDays: unit.totalDays,
      canUngroup: unit.granularity !== 'SINGLE',
    };
  });

  const toggleSelect = (subId: string) => {
    setSelectedSubIds((prev) => (prev.includes(subId) ? prev.filter((x) => x !== subId) : [...prev, subId]));
  };

  return (
    <>
    <SectionCard
      className="hubx-numeral"
      title="数据流转 · 工作台二 · 在线人天评估"
    >
      {/* 控制栏：新增岗位 + 切片操作 */}
      {!readonly && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-sm)' }}>
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

      <EvaluationWorkloadTable
        rows={evaluationRows}
        roles={evalSheet.activeRoles}
        readonly={readonly}
        onToggleRow={(row) => {
          const unit = evaluationUnitMap.get(row.key);
          if (unit?.boundSubFeatureIds.length === 1) toggleSelect(unit.boundSubFeatureIds[0]);
        }}
        onRoleReorder={(fromIndex, toIndex) => {
          const newRoles = [...evalSheet.activeRoles];
          const [moved] = newRoles.splice(fromIndex, 1);
          if (!moved) return;
          newRoles.splice(toIndex, 0, moved);
          persist({ ...evalSheet, activeRoles: newRoles });
        }}
        onRoleRemove={(role) => removeRole(role.key)}
        renderWorkloadCell={(row, role) => {
          const unit = evaluationUnitMap.get(row.key);
          if (!unit) return '-';
          const value = unit.manualWorkload[role.key];
          if (readonly) return <Text>{value?.toFixed(1) ?? '-'}</Text>;
          const cellKey = `${unit.id}-${role.key}`;
          return (
            <WorkloadNumericInput
              value={value}
              unitId={unit.id}
              roleKey={role.key}
              rowIds={sortedUnits.map((item) => item.id)}
              roleKeys={activeRoleKeys}
              fillRef={fillRef}
              hasError={emptyCells.has(cellKey)}
              isRemainder={Boolean(unit.isRemainder && unit.granularity === 'SINGLE')}
              onChangeValue={(unitId, roleKey, nextValue) => {
                updateWorkload(unitId, roleKey, nextValue);
                const nextCellKey = `${unitId}-${roleKey}`;
                if (emptyCells.has(nextCellKey)) setEmptyCells((prev) => {
                  const next = new Set(prev);
                  next.delete(nextCellKey);
                  return next;
                });
              }}
            />
          );
        }}
        renderTechRemark={(row) => {
          const unit = evaluationUnitMap.get(row.key);
          if (!unit) return '-';
          return readonly ? (
            <Text type="secondary">{unit.techRemark || '-'}</Text>
          ) : (
            <Input
              size="small"
              value={unit.techRemark ?? ''}
              onChange={(value) => updateUnitMeta(unit.id, { techRemark: value })}
              placeholder="架构/依赖说明"
              onKeyDown={(event) => {
                if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.stopPropagation();
              }}
            />
          );
        }}
        renderActions={(row) => {
          const unit = evaluationUnitMap.get(row.key);
          return !readonly && unit && unit.granularity !== 'SINGLE' ? (
            <Button type="text" size="mini" icon={<IconScissor />} onClick={() => handleUngroup(unit.id)}>解除合并</Button>
          ) : null;
        }}
      />

      {/* 底部汇总 */}
      <div style={{ marginTop: 12, padding: 12, background: 'var(--color-fill-1)', borderRadius: 'var(--radius-sm)' }}>
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
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--ds-shadow-up)',
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
                                const row = document.querySelector<HTMLElement>(`tr[data-unit-id="${u.id}"]`);
                                if (row) {
                                  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  // 高亮闪烁效果
                                  const originalBg = row.style.background;
                                  row.style.background = 'rgb(var(--arcoblue-1))';
                                  row.style.transition = 'background 0.3s';
                                  setTimeout(() => { row.style.background = originalBg || ''; }, 800);
                                }
                                // 同时聚焦到第一个输入框
                                const el = document.querySelector<HTMLInputElement>(`input[data-fill="${u.id}-${activeRoleKeys[0]}"]`);
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
                <div style={{ padding: 12, minWidth: 280, maxHeight: 400, overflow: 'auto', background: 'var(--color-bg-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-2)', boxShadow: 'var(--ds-shadow-raised)' }}>
                  <Text bold style={{ display: 'block', marginBottom: 8 }}>{r.name} · <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>{roleTotal.toFixed(1)}</Text> 人天</Text>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
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
                            <td colSpan={3} style={{ padding: '4px 8px', fontWeight: 600, fontSize: 'var(--text-xs)' }}>{group.epName} · {group.epTotal.toFixed(1)}</td>
                          </tr>
                          {group.modules.map((m) => (
                            <tr key={m.name} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                              <td style={{ padding: '4px 8px', paddingLeft: 16 }}>{m.name}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'rgb(var(--arcoblue-6))' }}>{m.total.toFixed(1)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{roleTotal > 0 ? ((m.total / roleTotal) * 100).toFixed(0) : 0}%</td>
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
            <div style={{ padding: 12, minWidth: 160, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-2)', boxShadow: 'var(--ds-shadow-raised)' }}>
              {evalSheet.activeRoles.map((r: EvalRole) => {
                const roleTotal = roleTotals[r.key] ?? 0;
                return (
                  <div key={r.key} style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.name}</span>
                    <span style={{ color: 'rgb(var(--arcoblue-6))' }}>{roleTotal.toFixed(1)} ({totalDays > 0 ? ((roleTotal / totalDays) * 100).toFixed(0) : 0}%)</span>
                  </div>
                );
              })}
            </div>
          }>
            <Button size="small" type="text">
              总人天 <Text bold style={{ fontSize: 'var(--text-sm)', color: 'rgb(var(--arcoblue-6))' }}>{totalDays.toFixed(1)}</Text>
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
                  <div style={{ padding: 12, minWidth: 250, maxHeight: 350, overflow: 'auto', background: 'var(--color-bg-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-2)', boxShadow: 'var(--ds-shadow-raised)' }}>
                    <Text bold style={{ display: 'block', marginBottom: 6 }}>{ep?.name || epId} · <Text bold style={{ color: 'rgb(var(--arcoblue-6))' }}>{val.toFixed(1)}</Text> 人天</Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
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
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'rgb(var(--arcoblue-6))' }}>{roleVal.toFixed(1)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{val > 0 ? ((roleVal / val) * 100).toFixed(0) : 0}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)' }}>按模块：</Text>
                      {epModules.map((m) => {
                        const modTotal = sortedUnits.filter((u) => u.moduleId === m.id).reduce((s, u) => s + u.totalDays, 0);
                        if (modTotal === 0) return null;
                        return <StatusTag key={m.id} size="small" style={{ marginRight: 4 }}>{m.name || '未命名'} {modTotal.toFixed(1)}</StatusTag>;
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
    </SectionCard>
    <Modal title="新增自定义岗位" visible={customRoleVisible} onCancel={() => setCustomRoleVisible(false)} onOk={addCustomRole} okText="新增岗位">
      <Input value={customRoleName} onChange={setCustomRoleName} placeholder="请输入岗位名称" maxLength={20} showWordLimit autoFocus />
    </Modal>
    </>
  );
}
