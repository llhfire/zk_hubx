import { useMemo, useState } from 'react';
import {
  Button, Card, Empty, Input, InputNumber, Message, Space, Switch, Table, Tag, Typography,
} from '@arco-design/web-react';
import {
  IconPlus, IconDelete, IconSend,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import { computeAmountBreakdown, sumEvalDaysByRole } from '../quoteFlow';
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

  // 从工作台二获取的数据（只读展示）
  const evalSheet = quote.evalSheet;
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);
  const roleTotals = useMemo(() => sumEvalDaysByRole(evalSheet), [evalSheet]);

  // 本地状态：出差、驻场、其他成本
  const [travelOnsite, setTravelOnsite] = useState<TravelOnsiteConfig>(quote.travelOnsite);
  const [otherCosts, setOtherCosts] = useState<CostItem[]>(quote.otherCosts);
  const [salesAddedRoles, setSalesAddedRoles] = useState<SalesAddedRole[]>(quote.salesAddedRoles);

  // 保存函数
  const persist = (patch: Partial<typeof quote>) => {
    updateQuote(quote.id, (q) => ({ ...q, ...patch }));
  };

  // ─── 出差配置 ─────────────────────────────────────────

  const toggleTravel = (enabled: boolean) => {
    const next = { ...travelOnsite, enableTravel: enabled };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const updateTravelDetail = (field: string, value: number | string) => {
    const detail = {
      ...(travelOnsite.travelDetail || { location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 }),
      [field]: value,
    };
    // 计算差旅小计
    const transportFee = (detail.transportFee || 0) * (detail.headcount || 1);
    const hotelTotal = (detail.hotelFeePerDay || 0) * (detail.headcount || 1) * (detail.days || 1);
    const allowanceTotal = (detail.allowancePerDay || 0) * (detail.headcount || 1) * (detail.days || 1);
    const subtotal = transportFee + hotelTotal + allowanceTotal;

    const next = { ...travelOnsite, travelDetail: detail, travelSubtotal: subtotal };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  // ─── 驻场配置 ─────────────────────────────────────────

  const toggleOnsite = (enabled: boolean) => {
    const next = { ...travelOnsite, enableOnsite: enabled };
    setTravelOnsite(next);
    persist({ travelOnsite: next });
  };

  const updateOnsiteDetail = (field: string, value: number | string) => {
    const detail = {
      ...(travelOnsite.onsiteDetail || { location: '', headcount: 1, days: 1, serviceFeePerDay: 0 }),
      [field]: value,
    };
    // 计算驻场小计
    const subtotal = (detail.serviceFeePerDay || 0) * (detail.headcount || 1) * (detail.days || 1);

    const next = { ...travelOnsite, onsiteDetail: detail, onsiteSubtotal: subtotal };
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

        {/* 第一部分：技术人天评估摘要（从工作台二带入） */}
        <Card size="small" title="技术人天评估（来自工作台二）">
          {evalSheet ? (
            <>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                {evalSheet.activeRoles.map((r: EvalRole) => (
                  <Tag key={r.key} color="blue">
                    {r.name} {roleTotals[r.key]?.toFixed(1) ?? 0} 人天
                  </Tag>
                ))}
                <Tag color="red" style={{ fontSize: 14 }}>
                  总人天 {breakdown.techDays.toFixed(1)}
                </Tag>
              </div>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                data={evalSheet.evaluationUnits}
                columns={[
                  { title: '模块', dataIndex: 'moduleName', width: 120 },
                  { title: '评估切片', dataIndex: 'groupName', width: 150, render: (v: string, r: { moduleName: string }) => v ?? r.moduleName },
                  ...evalSheet.activeRoles.map((r: EvalRole) => ({
                    title: r.name,
                    dataIndex: r.key,
                    width: 80,
                    render: (v: number) => v?.toFixed(1) ?? '-',
                  })),
                  { title: '小计', dataIndex: 'totalDays', width: 70, render: (v: number) => v?.toFixed(1) },
                ]}
              />
              <div style={{ marginTop: 8, padding: 8, background: 'var(--color-fill-1)', borderRadius: 4 }}>
                <Text type="secondary">技术人力成本：</Text>
                <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(breakdown.techLaborCost)}</Text>
              </div>
            </>
          ) : (
            <Empty description="暂无评估数据" />
          )}
        </Card>

        {/* 第二部分：销售增项岗位 */}
        <Card size="small" title="销售增项岗位">
          {salesAddedRoles.map((role) => (
            <div key={role.id} style={{ padding: 8, border: '1px dashed var(--color-border-2)', borderRadius: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                  value={role.roleName}
                  onChange={(v) => {
                    const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, roleName: v } : r));
                    setSalesAddedRoles(next);
                    persist({ salesAddedRoles: next });
                  }}
                  placeholder="岗位名称"
                  style={{ width: 120 }}
                  disabled={readonly}
                />
                <InputNumber
                  min={1}
                  value={role.headcount}
                  onChange={(v) => {
                    const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, headcount: v || 1, subtotal: (v || 1) * r.days * r.dailyRate } : r));
                    setSalesAddedRoles(next);
                    persist({ salesAddedRoles: next });
                  }}
                  placeholder="人数"
                  style={{ width: 80 }}
                  disabled={readonly}
                />
                <InputNumber
                  min={1}
                  value={role.days}
                  onChange={(v) => {
                    const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, days: v || 1, subtotal: r.headcount * (v || 1) * r.dailyRate } : r));
                    setSalesAddedRoles(next);
                    persist({ salesAddedRoles: next });
                  }}
                  placeholder="天数"
                  style={{ width: 80 }}
                  disabled={readonly}
                />
                <InputNumber
                  min={0}
                  value={role.dailyRate}
                  onChange={(v) => {
                    const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, dailyRate: v || 0, subtotal: r.headcount * r.days * (v || 0) } : r));
                    setSalesAddedRoles(next);
                    persist({ salesAddedRoles: next });
                  }}
                  placeholder="日均单价"
                  style={{ width: 100 }}
                  disabled={readonly}
                />
                <Text bold>{money(role.subtotal)}</Text>
                {!readonly && (
                  <Button
                    size="small"
                    status="danger"
                    icon={<IconDelete />}
                    onClick={() => {
                      const next = salesAddedRoles.filter((r) => r.id !== role.id);
                      setSalesAddedRoles(next);
                      persist({ salesAddedRoles: next });
                    }}
                  />
                )}
              </div>
              <Input
                value={role.reason}
                onChange={(v) => {
                  const next = salesAddedRoles.map((r) => (r.id === role.id ? { ...r, reason: v } : r));
                  setSalesAddedRoles(next);
                  persist({ salesAddedRoles: next });
                }}
                placeholder="增项事由"
                style={{ marginTop: 8 }}
                disabled={readonly}
              />
            </div>
          ))}
          {!readonly && (
            <Button
              size="small"
              icon={<IconPlus />}
              onClick={() => {
                const next = [...salesAddedRoles, {
                  id: uid('ar'),
                  roleName: '',
                  headcount: 1,
                  days: 1,
                  dailyRate: 800,
                  subtotal: 800,
                  reason: '',
                }];
                setSalesAddedRoles(next);
                persist({ salesAddedRoles: next });
              }}
            >
              添加增项岗位
            </Button>
          )}
        </Card>

        {/* 第三部分：出差与驻场 */}
        <Card size="small" title="出差与驻场">
          {/* 出差配置 */}
          <div style={{ marginBottom: 16 }}>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Switch checked={travelOnsite.enableTravel} onChange={toggleTravel} disabled={readonly} />
              <Text>开启出差</Text>
            </Space>
            {travelOnsite.enableTravel && travelOnsite.travelDetail && (
              <div style={{ padding: 12, background: 'var(--color-fill-1)', borderRadius: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <div>
                    <Text type="secondary">出差地点</Text>
                    <Input
                      value={travelOnsite.travelDetail.location}
                      onChange={(v) => updateTravelDetail('location', v)}
                      placeholder="如：北京"
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">人数</Text>
                    <InputNumber
                      min={1}
                      value={travelOnsite.travelDetail.headcount}
                      onChange={(v) => updateTravelDetail('headcount', v || 1)}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">天数</Text>
                    <InputNumber
                      min={1}
                      value={travelOnsite.travelDetail.days}
                      onChange={(v) => updateTravelDetail('days', v || 1)}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">交通费（往返/人）</Text>
                    <InputNumber
                      min={0}
                      value={travelOnsite.travelDetail.transportFee}
                      onChange={(v) => updateTravelDetail('transportFee', v || 0)}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">住宿费（元/天/人）</Text>
                    <InputNumber
                      min={0}
                      value={travelOnsite.travelDetail.hotelFeePerDay}
                      onChange={(v) => updateTravelDetail('hotelFeePerDay', v || 0)}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">差旅补贴（元/天/人）</Text>
                    <InputNumber
                      min={0}
                      value={travelOnsite.travelDetail.allowancePerDay}
                      onChange={(v) => updateTravelDetail('allowancePerDay', v || 0)}
                      disabled={readonly}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Text>差旅小计：</Text>
                  <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(travelOnsite.travelSubtotal)}</Text>
                </div>
              </div>
            )}
          </div>

          {/* 驻场配置 */}
          <div>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Switch checked={travelOnsite.enableOnsite} onChange={toggleOnsite} disabled={readonly} />
              <Text>开启驻场</Text>
            </Space>
            {travelOnsite.enableOnsite && travelOnsite.onsiteDetail && (
              <div style={{ padding: 12, background: 'var(--color-fill-1)', borderRadius: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <div>
                    <Text type="secondary">驻场地点</Text>
                    <Input
                      value={travelOnsite.onsiteDetail.location}
                      onChange={(v) => updateOnsiteDetail('location', v)}
                      placeholder="如：客户现场"
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">人数</Text>
                    <InputNumber
                      min={1}
                      value={travelOnsite.onsiteDetail.headcount}
                      onChange={(v) => updateOnsiteDetail('headcount', v || 1)}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">天数</Text>
                    <InputNumber
                      min={1}
                      value={travelOnsite.onsiteDetail.days}
                      onChange={(v) => updateOnsiteDetail('days', v || 1)}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Text type="secondary">服务费（元/天/人）</Text>
                    <InputNumber
                      min={0}
                      value={travelOnsite.onsiteDetail.serviceFeePerDay}
                      onChange={(v) => updateOnsiteDetail('serviceFeePerDay', v || 0)}
                      disabled={readonly}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Text>驻场小计：</Text>
                  <Text bold style={{ color: 'var(--color-danger-6)' }}>{money(travelOnsite.onsiteSubtotal)}</Text>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 第四部分：其他成本 */}
        <Card size="small" title="其他成本">
          {otherCosts.map((cost) => (
            <div key={cost.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Input
                value={cost.name}
                onChange={(v) => updateCost(cost.id, 'name', v)}
                placeholder="费用名称"
                style={{ flex: 1 }}
                disabled={readonly}
              />
              <InputNumber
                min={0}
                value={cost.amount}
                onChange={(v) => updateCost(cost.id, 'amount', v || 0)}
                placeholder="金额"
                style={{ width: 120 }}
                disabled={readonly}
              />
              <Input
                value={cost.note}
                onChange={(v) => updateCost(cost.id, 'note', v)}
                placeholder="备注"
                style={{ flex: 1 }}
                disabled={readonly}
              />
              {!readonly && (
                <Button size="small" status="danger" icon={<IconDelete />} onClick={() => removeCost(cost.id)} />
              )}
            </div>
          ))}
          {!readonly && (
            <Button size="small" icon={<IconPlus />} onClick={addCost}>
              添加费用项
            </Button>
          )}
        </Card>

        {/* 第五部分：报价汇总 */}
        <Card size="small" title="报价汇总">
          <div style={{ textAlign: 'center', padding: 24, background: 'linear-gradient(135deg, var(--color-primary-6), #4F46E5)', borderRadius: 12, color: 'white' }}>
            <Title heading={4} style={{ color: 'white', marginBottom: 8 }}>项目总报价</Title>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'monospace' }}>
              {money(breakdown.grandTotal)}
            </div>
          </div>
          <Table
            style={{ marginTop: 16 }}
            size="small"
            pagination={false}
            columns={[
              { title: '费用项', dataIndex: 'name' },
              { title: '金额', dataIndex: 'amount', render: (v: number) => money(v) },
            ]}
            data={[
              { name: '技术人力成本', amount: breakdown.techLaborCost },
              { name: '销售增项成本', amount: breakdown.addedCost },
              { name: '差旅费用', amount: breakdown.travelSubtotal },
              { name: '驻场费用', amount: breakdown.onsiteSubtotal },
              { name: '其他成本', amount: breakdown.otherCostSubtotal },
            ]}
          />
        </Card>

        {/* 提交按钮 */}
        {!readonly && (
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<IconSend />} onClick={handleSubmit}>
              提交审批
            </Button>
          </div>
        )}
      </Space>
    </Card>
  );
}
