import { useMemo, useState } from 'react';
import {
  Button, Card, Empty, Input, InputNumber, Message, Space, Switch, Table, Tag, Typography,
} from '@arco-design/web-react';
import {
  IconPlus, IconDelete, IconSend, IconApps,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import { computeAmountBreakdown, sumEvalDaysByRole } from '../quoteFlow';
import { PLATFORM_OPTIONS } from '../types';
import type { CostItem, EvalRole, SalesAddedRole, TravelOnsiteConfig } from '../types';

const { Text, Title } = Typography;

function money(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── 主组件 ─────────────────────────────────────────────

export function Stage3WebAutomation({ quote, readonly }: StageProps) {
  const { updateQuote, submitForAudit } = useQuotation();

  // 从工作台一和工作台二获取的数据（只读展示）
  const endpointConfigs = quote.endpointConfigs || [];
  const featureList = quote.featureList;
  const evalSheet = quote.evalSheet;
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);
  const roleTotals = useMemo(() => sumEvalDaysByRole(evalSheet), [evalSheet]);

  // 本地状态 - 兼容旧数据格式
  const [travelOnsite, setTravelOnsite] = useState<TravelOnsiteConfig>(() => {
    const t = quote.travelOnsite;
    return {
      ...t,
      travelDetails: (t as any).travelDetails || (t as any).travelDetail ? [(t as any).travelDetail || { location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }] : [],
      onsiteDetails: (t as any).onsiteDetails || (t as any).onsiteDetail ? [(t as any).onsiteDetail || { location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }] : [],
    };
  });
  const [otherCosts, setOtherCosts] = useState<CostItem[]>(quote.otherCosts);
  const [salesAddedRoles, setSalesAddedRoles] = useState<SalesAddedRole[]>(quote.salesAddedRoles);
  // 岗位日均成本：key -> 成本
  const [roleDailyCosts, setRoleDailyCosts] = useState<Record<string, number>>(() => {
    const costs: Record<string, number> = {};
    const dailyCost = breakdown.techDays > 0 ? breakdown.techLaborCost / breakdown.techDays : 800;
    evalSheet?.activeRoles.forEach((r) => { costs[r.key] = dailyCost; });
    return costs;
  });
  const [editingCostKey, setEditingCostKey] = useState<string | null>(null);

  // 计算总人天和总金额（组件级别）
  const grandTotalDays = useMemo(() => {
    if (!evalSheet) return 0;
    return evalSheet.evaluationUnits.reduce((s, u) => s + u.totalDays, 0);
  }, [evalSheet]);
  const grandTotalCost = useMemo(() => {
    if (!evalSheet) return 0;
    return evalSheet.evaluationUnits.reduce((s, u) => {
      let cost = 0;
      evalSheet.activeRoles.forEach((r) => {
        cost += (u.manualWorkload[r.key] ?? 0) * (roleDailyCosts[r.key] ?? 0);
      });
      return s + cost;
    }, 0);
  }, [evalSheet, roleDailyCosts]);

  const persist = (patch: Partial<typeof quote>) => {
    updateQuote(quote.id, (q) => ({ ...q, ...patch }));
  };

  // ─── 出差配置 ─────────────────────────────────────────

  const calcTravelSubtotal = (details: TravelDetail[]) => {
    return details.reduce((sum, d) => {
      const transportFee = (d.transportFee || 0) * (d.headcount || 1);
      const hotelTotal = (d.hotelFeePerDay || 0) * (d.headcount || 1) * (d.days || 1);
      const allowanceTotal = (d.allowancePerDay || 0) * (d.headcount || 1) * (d.days || 1);
      return sum + transportFee + hotelTotal + allowanceTotal;
    }, 0);
  };

  const toggleTravel = (enabled: boolean) => {
    const details = enabled ? (travelOnsite.travelDetails.length > 0 ? travelOnsite.travelDetails : [{ location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }]) : [];
    const next = { ...travelOnsite, enableTravel: enabled, travelDetails: details, travelSubtotal: enabled ? calcTravelSubtotal(details) : 0 };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const addTravelDetail = () => {
    const details = [...travelOnsite.travelDetails, { location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }];
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const updateTravelDetail = (idx: number, field: string, value: number | string) => {
    const details = travelOnsite.travelDetails.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const removeTravelDetail = (idx: number) => {
    const details = travelOnsite.travelDetails.filter((_, i) => i !== idx);
    const next = { ...travelOnsite, travelDetails: details, travelSubtotal: calcTravelSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  // ─── 驻场配置 ─────────────────────────────────────────

  const calcOnsiteSubtotal = (details: OnsiteDetail[]) => {
    return details.reduce((sum, d) => sum + (d.serviceFeePerDay || 0) * (d.headcount || 1) * (d.days || 1), 0);
  };

  const toggleOnsite = (enabled: boolean) => {
    const details = enabled ? (travelOnsite.onsiteDetails.length > 0 ? travelOnsite.onsiteDetails : [{ location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }]) : [];
    const next = { ...travelOnsite, enableOnsite: enabled, onsiteDetails: details, onsiteSubtotal: enabled ? calcOnsiteSubtotal(details) : 0 };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const addOnsiteDetail = () => {
    const details = [...travelOnsite.onsiteDetails, { location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }];
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const updateOnsiteDetail = (idx: number, field: string, value: number | string) => {
    const details = travelOnsite.onsiteDetails.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const removeOnsiteDetail = (idx: number) => {
    const details = travelOnsite.onsiteDetails.filter((_, i) => i !== idx);
    const next = { ...travelOnsite, onsiteDetails: details, onsiteSubtotal: calcOnsiteSubtotal(details) };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  // ─── 其他成本 ─────────────────────────────────────────

  const addCost = () => {
    const next = [...otherCosts, { id: uid('cost'), name: '', amount: 0, note: '' }];
    setOtherCosts(next);
    persist({ otherCosts: next });
  };

  const updateCost = (id: string, field: keyof CostItem, value: string | number) => {
    const next = otherCosts.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setOtherCosts(next);
    persist({ otherCosts: next });
  };

  const removeCost = (id: string) => {
    const next = otherCosts.filter((c) => c.id !== id);
    setOtherCosts(next);
    persist({ otherCosts: next });
  };

  // ─── 提交审批 ─────────────────────────────────────────

  const handleSubmit = () => {
    submitForAudit(quote.id);
    Message.success('报价已提交审批');
  };

  // ─── 渲染 ─────────────────────────────────────────────

  return (
    <Card title="工作台三 · 报价配置">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>

        {/* 功能清单 + 工时评估（从工作台一和工作台二带入） */}
        <Card size="small" title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconApps />
              <span>功能清单与工时评估</span>
            </div>
            {evalSheet && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                总周期 <Text bold>{evalSheet.manualWorkDays || '-'}</Text> 工作日
              </Text>
            )}
          </div>
        }>
          {evalSheet && endpointConfigs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--color-fill-1)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 100, whiteSpace: 'nowrap' }}>端</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 100, whiteSpace: 'nowrap' }}>模块</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 120, whiteSpace: 'nowrap' }}>子功能</th>
                    {evalSheet.activeRoles.map((r: EvalRole) => (
                      <th key={r.key} style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 80, whiteSpace: 'nowrap' }}>
                        <div>{r.name}</div>
                        {editingCostKey === r.key ? (
                          <div style={{ marginTop: 2 }}>
                            <InputNumber
                              size="mini"
                              min={0}
                              value={roleDailyCosts[r.key]}
                              onChange={(v) => setRoleDailyCosts((prev) => ({ ...prev, [r.key]: v || 0 }))}
                              onBlur={() => setEditingCostKey(null)}
                              onPressEnter={() => setEditingCostKey(null)}
                              style={{ width: 70 }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 400, cursor: readonly ? 'default' : 'pointer', textDecoration: readonly ? 'none' : 'underline' }}
                            onClick={() => { if (!readonly) setEditingCostKey(r.key); }}
                          >
                            ¥{roleDailyCosts[r.key]?.toFixed(0)}/天
                          </div>
                        )}
                      </th>
                    ))}
                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 60, whiteSpace: 'nowrap' }}>人天</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 构建评估单元的映射：子功能ID -> 评估单元
                    const unitMap = new Map<string, typeof evalSheet.evaluationUnits[0]>();
                    evalSheet.evaluationUnits.forEach((u) => {
                      u.boundSubFeatureIds.forEach((subId) => { unitMap.set(subId, u); });
                    });
                    // 计算端的 rowspan
                    const epRowSpans: Record<string, number> = {};
                    const epFirstIdx: Record<string, number> = {};
                    let idx = 0;
                    featureList.forEach((m) => {
                      const epId = m.endpointId || '';
                      if (!(epId in epFirstIdx)) { epFirstIdx[epId] = idx; epRowSpans[epId] = 0; }
                      epRowSpans[epId] += Math.max(m.subFeatures.length, 1);
                      idx += Math.max(m.subFeatures.length, 1);
                    });
                    let rowIdx = 0;
                    let grandTotalDays = 0;
                    let grandTotalCost = 0;
                    const rows = featureList.flatMap((m) => {
                      const ep = endpointConfigs.find((e) => e.id === m.endpointId);
                      const isFirstOfEp = epFirstIdx[m.endpointId || ''] === rowIdx;
                      const subs = m.subFeatures.length > 0 ? m.subFeatures : [{ id: 'empty', name: '（暂无子功能）', description: '' }];
                      // 计算模块行的 rowspan
                      const moduleRowSpan = subs.length;
                      return subs.map((f, fIdx) => {
                        rowIdx++;
                        const unit = unitMap.get(f.id);
                        const roleDays = unit ? evalSheet.activeRoles.map((r) => unit.manualWorkload[r.key] ?? 0) : evalSheet.activeRoles.map(() => 0);
                        const totalDays = unit?.totalDays ?? 0;
                        // 按岗位分别计算成本
                        let itemCost = 0;
                        evalSheet.activeRoles.forEach((r: EvalRole, ri) => {
                          itemCost += roleDays[ri] * (roleDailyCosts[r.key] ?? 0);
                        });
                        grandTotalDays += totalDays;
                        grandTotalCost += itemCost;
                        return (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                            {isFirstOfEp && fIdx === 0 && (
                              <td rowSpan={epRowSpans[m.endpointId || ''] || 1} style={{ padding: '6px 10px', verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid var(--color-border-2)', fontSize: 12 }}>
                                {ep?.name || '-'}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                                  {(ep?.platforms || []).map((pid) => (
                                    <Tag key={pid} size="small" color="arcoblue" style={{ width: 'fit-content', fontSize: 10 }}>{PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid}</Tag>
                                  ))}
                                </div>
                              </td>
                            )}
                            {fIdx === 0 && (
                              <td rowSpan={moduleRowSpan} style={{ padding: '6px 10px', verticalAlign: 'top', fontWeight: 500, borderRight: '1px solid var(--color-border-2)' }}>{m.name}</td>
                            )}
                            <td style={{ padding: '6px 10px', borderRight: '1px solid var(--color-border-2)' }}>{f.name}</td>
                            {evalSheet.activeRoles.map((r: EvalRole, ri) => (
                              <td key={r.key} style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-2)', fontFamily: 'monospace' }}>
                                {roleDays[ri] > 0 ? roleDays[ri].toFixed(1) : '-'}
                              </td>
                            ))}
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>
                              {totalDays > 0 ? totalDays.toFixed(1) : '-'}
                            </td>
                          </tr>
                        );
                      });
                    });
                    // 添加合计行
                    // 计算每个岗位的总人天和总成本
                    const roleTotalsData = evalSheet.activeRoles.map((r: EvalRole) => {
                      const roleTotalDays = (evalSheet?.evaluationUnits || []).reduce((s, u) => s + (u.manualWorkload[r.key] ?? 0), 0);
                      const roleTotalCost = roleTotalDays * (roleDailyCosts[r.key] ?? 0);
                      return { days: roleTotalDays, cost: roleTotalCost };
                    });
                    rows.push(
                      <tr key="total" style={{ background: 'var(--color-fill-1)', fontWeight: 600 }}>
                        <td style={{ padding: '6px 10px', borderTop: '2px solid var(--color-border-2)', whiteSpace: 'nowrap' }}>合计</td>
                        <td style={{ padding: '6px 10px', borderTop: '2px solid var(--color-border-2)' }} colSpan={2} />
                        {roleTotalsData.map((rt, ri) => (
                          <td key={ri} style={{ padding: '6px 10px', textAlign: 'right', borderTop: '2px solid var(--color-border-2)', fontFamily: 'monospace', fontSize: 11 }}>
                            <div>{rt.days.toFixed(1)}</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{money(rt.cost)}</div>
                          </td>
                        ))}
                        <td style={{ padding: '6px 10px', textAlign: 'right', borderTop: '2px solid var(--color-border-2)', fontFamily: 'monospace' }}>{grandTotalDays.toFixed(1)}</td>
                      </tr>
                    );
                    // 添加总金额行
                    rows.push(
                      <tr key="totalCost" style={{ background: 'var(--color-fill-1)', fontWeight: 600 }}>
                        <td colSpan={4 + evalSheet.activeRoles.length} style={{ padding: '6px 10px', textAlign: 'right', borderTop: '1px solid var(--color-border-2)' }}>
                          <span>总人天 <span style={{ color: 'rgb(var(--arcoblue-6))', fontSize: 16, fontWeight: 700 }}>{grandTotalDays.toFixed(1)}</span></span>
                          <span style={{ marginLeft: 24 }}>总金额 <span style={{ color: 'rgb(var(--arcoblue-6))', fontSize: 16, fontWeight: 700 }}>{money(grandTotalCost)}</span></span>
                        </td>
                      </tr>
                    );
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty description="暂无评估数据" />
          )}
        </Card>

        {/* 第二部分：销售增项岗位 */}
        <Card size="small" title="销售增项岗位">
          {salesAddedRoles.map((role) => (
            <div key={role.id} style={{ padding: 12, border: '1px dashed var(--color-border-2)', borderRadius: 6, marginBottom: 12, background: 'var(--color-fill-1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 100px 40px', gap: 12, alignItems: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>岗位名称</Text>
                  <Input
                    value={role.roleName}
                    onChange={(v) => {
                      const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, roleName: v } : r));
                      setSalesAddedRoles(next);
                      persist({ salesAddedRoles: next });
                    }}
                    placeholder="如：PMO、驻场运维"
                    disabled={readonly}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>人数</Text>
                  <InputNumber
                    min={1}
                    value={role.headcount}
                    onChange={(v) => {
                      const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, headcount: v || 1, subtotal: (v || 1) * r.days * r.dailyRate } : r));
                      setSalesAddedRoles(next);
                      persist({ salesAddedRoles: next });
                    }}
                    placeholder="人数"
                    disabled={readonly}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>天数</Text>
                  <InputNumber
                    min={1}
                    value={role.days}
                    onChange={(v) => {
                      const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, days: v || 1, subtotal: r.headcount * (v || 1) * r.dailyRate } : r));
                      setSalesAddedRoles(next);
                      persist({ salesAddedRoles: next });
                    }}
                    placeholder="天数"
                    disabled={readonly}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>日均单价（元）</Text>
                  <InputNumber
                    min={0}
                    value={role.dailyRate}
                    onChange={(v) => {
                      const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, dailyRate: v || 0, subtotal: r.headcount * r.days * (v || 0) } : r));
                      setSalesAddedRoles(next);
                      persist({ salesAddedRoles: next });
                    }}
                    placeholder="如：800"
                    disabled={readonly}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>小计</Text>
                  <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(role.subtotal)}</Text>
                </div>
                <div>
                  {!readonly && (
                    <Button size="small" status="danger" icon={<IconDelete />} onClick={() => {
                      const next = salesAddedRoles.filter((r) => r.id !== role.id);
                      setSalesAddedRoles(next);
                      persist({ salesAddedRoles: next });
                    }} />
                  )}
                </div>
              </div>
              <Input
                value={role.reason}
                onChange={(v) => {
                  const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, reason: v } : r));
                  setSalesAddedRoles(next);
                  persist({ salesAddedRoles: next });
                }}
                placeholder="增项事由，如：客户要求每周现场汇报"
                style={{ marginTop: 8 }}
                disabled={readonly}
              />
            </div>
          ))}
          {/* 添加按钮 + 小计 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            {!readonly && (
              <Button size="small" icon={<IconPlus />} onClick={() => {
                const next = [...salesAddedRoles, { id: uid('ar'), roleName: '', headcount: 1, days: 1, dailyRate: 800, subtotal: 800, reason: '' }];
                setSalesAddedRoles(next);
                persist({ salesAddedRoles: next });
              }}>添加增项岗位</Button>
            )}
            {salesAddedRoles.length > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
                <Text>增项小计：</Text>
                <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(salesAddedRoles.reduce((s, r) => s + r.subtotal, 0))}</Text>
              </div>
            )}
          </div>
        </Card>

        {/* 第四部分：出差与驻场 */}
        <Card size="small" title="出差与驻场">
          {/* 出差配置 */}
          <div style={{ marginBottom: 16 }}>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Switch checked={travelOnsite.enableTravel} onChange={toggleTravel} disabled={readonly} />
              <Text>开启出差</Text>
            </Space>
            {travelOnsite.enableTravel && travelOnsite.travelDetails.map((detail, idx) => (
              <div key={idx} style={{ padding: 12, background: 'var(--color-fill-1)', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text bold style={{ fontSize: 12 }}>出差地点 {idx + 1}</Text>
                  {!readonly && travelOnsite.travelDetails.length > 1 && (
                    <Button size="small" status="danger" icon={<IconDelete />} onClick={() => removeTravelDetail(idx)} />
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>出差地点</Text>
                    <Input value={detail.location} onChange={(v) => updateTravelDetail(idx, 'location', v)} placeholder="如：北京、上海" disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>出差人数</Text>
                    <InputNumber min={1} value={detail.headcount} onChange={(v) => updateTravelDetail(idx, 'headcount', v || 1)} disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>出差天数</Text>
                    <InputNumber min={1} value={detail.days} onChange={(v) => updateTravelDetail(idx, 'days', v || 1)} disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>交通费（往返/人，元）</Text>
                    <InputNumber min={0} value={detail.transportFee} onChange={(v) => updateTravelDetail(idx, 'transportFee', v || 0)} placeholder="如：1000" disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>住宿费（元/天/人）</Text>
                    <InputNumber min={0} value={detail.hotelFeePerDay} onChange={(v) => updateTravelDetail(idx, 'hotelFeePerDay', v || 0)} placeholder="如：300" disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>差旅补贴（元/天/人）</Text>
                    <InputNumber min={0} value={detail.allowancePerDay} onChange={(v) => updateTravelDetail(idx, 'allowancePerDay', v || 0)} placeholder="如：100" disabled={readonly} />
                  </div>
                </div>
              </div>
            ))}
            {travelOnsite.enableTravel && (
              <>
                {!readonly && (
                  <Button size="small" icon={<IconPlus />} onClick={addTravelDetail} style={{ marginBottom: 8 }}>添加出差地点</Button>
                )}
                <div style={{ textAlign: 'right', padding: '8px 0', borderTop: '1px solid var(--color-border-2)' }}>
                  <Text>差旅合计：</Text>
                  <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(travelOnsite.travelSubtotal)}</Text>
                </div>
              </>
            )}
          </div>

          {/* 驻场配置 */}
          <div>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Switch checked={travelOnsite.enableOnsite} onChange={toggleOnsite} disabled={readonly} />
              <Text>开启驻场</Text>
            </Space>
            {travelOnsite.enableOnsite && travelOnsite.onsiteDetails.map((detail, idx) => (
              <div key={idx} style={{ padding: 12, background: 'var(--color-fill-1)', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text bold style={{ fontSize: 12 }}>驻场地点 {idx + 1}</Text>
                  {!readonly && travelOnsite.onsiteDetails.length > 1 && (
                    <Button size="small" status="danger" icon={<IconDelete />} onClick={() => removeOnsiteDetail(idx)} />
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>驻场地点</Text>
                    <Input value={detail.location} onChange={(v) => updateOnsiteDetail(idx, 'location', v)} placeholder="如：客户现场" disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>驻场人数</Text>
                    <InputNumber min={1} value={detail.headcount} onChange={(v) => updateOnsiteDetail(idx, 'headcount', v || 1)} disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>驻场天数</Text>
                    <InputNumber min={1} value={detail.days} onChange={(v) => updateOnsiteDetail(idx, 'days', v || 1)} disabled={readonly} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>服务费（元/天/人）</Text>
                    <InputNumber min={0} value={detail.serviceFeePerDay} onChange={(v) => updateOnsiteDetail(idx, 'serviceFeePerDay', v || 0)} placeholder="如：800" disabled={readonly} />
                  </div>
                </div>
              </div>
            ))}
            {travelOnsite.enableOnsite && (
              <>
                {!readonly && (
                  <Button size="small" icon={<IconPlus />} onClick={addOnsiteDetail} style={{ marginBottom: 8 }}>添加驻场地点</Button>
                )}
                <div style={{ textAlign: 'right', padding: '8px 0', borderTop: '1px solid var(--color-border-2)' }}>
                  <Text>驻场合计：</Text>
                  <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(travelOnsite.onsiteSubtotal)}</Text>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* 第五部分：其他成本 */}
        <Card size="small" title="其他成本">
          {otherCosts.map((cost) => (
            <div key={cost.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 40px', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>费用名称</Text>
                <Input value={cost.name} onChange={(v) => updateCost(cost.id, 'name', v)} placeholder="如：云服务器、域名SSL、短信包" disabled={readonly} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>金额（元）</Text>
                <InputNumber min={0} value={cost.amount} onChange={(v) => updateCost(cost.id, 'amount', v || 0)} placeholder="如：5000" disabled={readonly} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>备注说明</Text>
                <Input value={cost.note} onChange={(v) => updateCost(cost.id, 'note', v)} placeholder="如：客户自费或代采、年度费用" disabled={readonly} />
              </div>
              <div>
                {!readonly && (
                  <Button size="small" status="danger" icon={<IconDelete />} onClick={() => removeCost(cost.id)} />
                )}
              </div>
            </div>
          ))}
          {/* 添加按钮 + 其他合计 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            {!readonly && (
              <Button size="small" icon={<IconPlus />} onClick={addCost}>添加费用项</Button>
            )}
            {otherCosts.length > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--color-fill-1)', borderRadius: 4 }}>
                <Text>自费项目合计（不计入报价）：</Text>
                <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(otherCosts.reduce((s, c) => s + c.amount, 0))}</Text>
              </div>
            )}
          </div>
        </Card>

        {/* 第六部分：报价汇总 */}
        <Card size="small" title="报价汇总">
          {/* 项目综述 */}
          <div style={{ marginBottom: 16 }}>
            <Text bold style={{ display: 'block', marginBottom: 8 }}>项目综述</Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>项目名称</Text>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{quote.basicInfo.projectName || '-'}</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>项目工期</Text>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{evalSheet?.manualWorkDays || '-'} 工作日</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>开发人天</Text>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{grandTotalDays.toFixed(1)} 人天</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, var(--color-primary-6), #4F46E5)', borderRadius: 8, color: 'white' }}>
                <Text type="secondary" style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>项目总价</Text>
                <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4, fontFamily: 'monospace' }}>{money(grandTotalCost)}</div>
              </div>
            </div>
          </div>

          {/* 费用明细 */}
          <Text bold style={{ display: 'block', marginBottom: 8 }}>费用明细</Text>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--color-fill-1)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500 }}>费用项</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 120 }}>金额</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500 }}>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>技术人力成本</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.techLaborCost)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{evalSheet?.activeRoles.length || 0} 个岗位 × {breakdown.techDays.toFixed(1)} 人天</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>销售增项成本</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.addedCost)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{salesAddedRoles.length > 0 ? salesAddedRoles.map((r) => r.roleName || '未命名').join('、') : '无增项'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>差旅费用</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.travelSubtotal)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{travelOnsite.enableTravel ? `${travelOnsite.travelDetails.length} 个出差地点` : '未开启'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>驻场费用</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.onsiteSubtotal)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{travelOnsite.enableOnsite ? `${travelOnsite.onsiteDetails.length} 个驻场地点` : '未开启'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>自费项目（不计入报价）</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{money(breakdown.selfPaidSubtotal)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-3)', fontSize: 12 }}>{otherCosts.length > 0 ? otherCosts.map((c) => c.name || '未命名').join('、') : '无自费项目'}</td>
              </tr>
              {/* 合计行 */}
              <tr style={{ background: 'var(--color-fill-1)', fontWeight: 600 }}>
                <td style={{ padding: '10px 12px', borderTop: '2px solid var(--color-border-2)' }}>合计</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', borderTop: '2px solid var(--color-border-2)', fontFamily: 'monospace', fontSize: 16, color: 'var(--color-danger-6)' }}>{money(grandTotalCost)}</td>
                <td style={{ padding: '10px 12px', borderTop: '2px solid var(--color-border-2)' }} />
              </tr>
            </tbody>
          </table>
        </Card>

        {/* 提交按钮 */}
        {!readonly && (
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<IconSend />} onClick={handleSubmit}>提交审批</Button>
          </div>
        )}
      </Space>
    </Card>
  );
}
