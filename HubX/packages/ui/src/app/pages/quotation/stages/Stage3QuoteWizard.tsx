import { useMemo, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Descriptions, Empty, Input, InputNumber, Message, Modal, Select,
  Space, Steps, Switch, Table, Tag, Typography,
} from '@arco-design/web-react';
import {
  IconLeft, IconRight, IconSend, IconPlus, IconDelete, IconCheck, IconRefresh, IconUndo,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { StageProps } from './Stage1FeatureList';
import {
  computeAddedRoleSubtotal, computeAmountBreakdown, computeOnsiteSubtotal, computeTravelSubtotal,
  validateBeforeAudit,
} from '../quoteFlow';
import {
  BACKEND_LANGUAGE_OPTIONS, BACKEND_SERVICE_OPTIONS, FRONTEND_FRAMEWORK_OPTIONS,
  FRONTEND_PLATFORM_OPTIONS, PAYMENT_TERM_TEMPLATES, PRESET_COST_ITEMS,
} from '../types';
import type {
  BackendConfig, CostItem, FrontendPlatform, PaymentTerm, Quote, SalesAddedRole,
} from '../types';

const { Text, Title } = Typography;

const STEP_NAMES = ['基本信息', '前端配置', '后端配置', '其他岗位与增项', '出差与驻场', '其他成本', '报价汇总'];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function money(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

export function Stage3QuoteWizard({ quote, readonly }: StageProps) {
  const { updateQuote, returnToTech, submitForAudit, withdrawAudit } = useQuotation();
  const [step, setStep] = useState(0);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [returnVisible, setReturnVisible] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // rejected 状态回到这里时，提示销售修改后重新提交
  const isRejected = quote.status === 'rejected';

  const patch = (p: Partial<Quote>) => {
    if (!readonly) updateQuote(quote.id, (q) => ({ ...q, ...p }));
  };

  // ─── Step1 基本信息补录 ───────────────────────────
  const Step1 = () => (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Descriptions
        column={2}
        data={[
          { label: '项目名称', value: quote.basicInfo.projectName },
          { label: '项目类型', value: quote.basicInfo.projectType },
          { label: '产品经理', value: quote.basicInfo.creatorName },
          { label: '技术评估人', value: quote.basicInfo.techEvaluatorName },
          { label: '需求描述', value: quote.basicInfo.requirementDesc || '-' },
          { label: '报价有效期', value: `${quote.basicInfo.quoteValidityDays} 天` },
        ]}
      />
      <Descriptions
        column={2}
        title="销售补录"
        data={[
          {
            label: '客户全称', value: readonly ? quote.basicInfo.customerName : (
              <Input value={quote.basicInfo.customerName} onChange={(v) => patch({ basicInfo: { ...quote.basicInfo, customerName: v } })} />
            ),
          },
          {
            label: '客户联系人', value: readonly ? quote.basicInfo.customerContact : (
              <Input value={quote.basicInfo.customerContact} onChange={(v) => patch({ basicInfo: { ...quote.basicInfo, customerContact: v } })} />
            ),
          },
          {
            label: '联系电话', value: readonly ? quote.basicInfo.customerPhone : (
              <Input value={quote.basicInfo.customerPhone} onChange={(v) => patch({ basicInfo: { ...quote.basicInfo, customerPhone: v } })} />
            ),
          },
          {
            label: '行业分类', value: readonly ? (quote.basicInfo.industry || '-') : (
              <Select
                value={quote.basicInfo.industry}
                onChange={(v) => patch({ basicInfo: { ...quote.basicInfo, industry: v } })}
                placeholder="选择行业"
                style={{ width: '100%' }}
                options={['企业办公', '电商购物', '物联网', '制造工业', '医疗健康', '教育培训', '餐饮零售', '其他']}
              />
            ),
          },
        ]}
      />
    </Space>
  );

  // ─── Step2 前端配置 ───────────────────────────
  const Step2 = () => {
    const platforms = quote.frontendConfig.platforms;
    const addPlatform = () => {
      const next = [...platforms, { id: uid('fp'), platform: FRONTEND_PLATFORM_OPTIONS[0], roleEnds: ['用户端'], framework: FRONTEND_FRAMEWORK_OPTIONS[0] }];
      patch({ frontendConfig: { platforms: next } });
    };
    const updatePlatform = (id: string, p: Partial<FrontendPlatform>) => {
      patch({ frontendConfig: { platforms: platforms.map((x) => (x.id === id ? { ...x, ...p } : x)) } });
    };
    const removePlatform = (id: string) => {
      patch({ frontendConfig: { platforms: platforms.filter((x) => x.id !== id) } });
    };
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space>
          <Text bold>平台与终端矩阵</Text>
          {!readonly && <Button size="small" icon={<IconPlus />} onClick={addPlatform}>添加平台</Button>}
        </Space>
        {platforms.length === 0 ? (
          <Empty description="尚未配置前端平台" />
        ) : (
          platforms.map((p) => (
            <div key={p.id} style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 6 }}>
              <Space wrap align="center">
                <Select
                  value={p.platform}
                  onChange={(v) => updatePlatform(p.id, { platform: v })}
                  disabled={readonly}
                  style={{ width: 160 }}
                  options={FRONTEND_PLATFORM_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
                <Select
                  value={p.framework}
                  onChange={(v) => updatePlatform(p.id, { framework: v })}
                  disabled={readonly}
                  style={{ width: 140 }}
                  options={FRONTEND_FRAMEWORK_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
                <Input
                  value={p.roleEnds.join('、')}
                  onChange={(v) => updatePlatform(p.id, { roleEnds: v.split(/[、,，]/).map((s) => s.trim()).filter(Boolean) })}
                  disabled={readonly}
                  placeholder="角色端，如 用户端、商户端"
                  style={{ width: 220 }}
                />
                {!readonly && <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => removePlatform(p.id)} />}
              </Space>
            </div>
          ))
        )}
      </Space>
    );
  };

  // ─── Step3 后端配置 ───────────────────────────
  const Step3 = () => {
    const cfg = quote.backendConfig;
    const setCfg = (p: Partial<BackendConfig>) => patch({ backendConfig: { ...cfg, ...p } });
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Text bold style={{ display: 'block', marginBottom: 8 }}>后端服务项</Text>
          <Checkbox.Group
            value={cfg.services}
            onChange={(v) => setCfg({ services: v as string[] })}
            disabled={readonly}
            options={BACKEND_SERVICE_OPTIONS.map((o) => ({ label: o, value: o }))}
          />
        </div>
        <div>
          <Text bold style={{ display: 'block', marginBottom: 8 }}>开发语言</Text>
          <Select
            value={cfg.language}
            onChange={(v) => setCfg({ language: v })}
            disabled={readonly}
            style={{ width: 200 }}
            placeholder="选择后端语言"
            options={BACKEND_LANGUAGE_OPTIONS.map((o) => ({ label: o, value: o }))}
          />
        </div>
        <div>
          <Text bold style={{ display: 'block', marginBottom: 8 }}>架构与组件说明</Text>
          <Input.TextArea
            value={cfg.note ?? ''}
            onChange={(v) => setCfg({ note: v })}
            disabled={readonly}
            placeholder="SpringBoot + MySQL，部署阿里云 ECS 2核4G"
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ maxWidth: 600 }}
          />
        </div>
      </Space>
    );
  };

  // ─── Step4 其他岗位与增项 ───────────────────────────
  const Step4 = () => {
    const evalSheet = quote.evalSheet;
    const techDays = evalSheet?.evaluationUnits.reduce((s, u) => s + u.totalDays, 0) ?? 0;
    const evalColumns = [
      { title: '模块/切片', dataIndex: 'groupName', width: 160, render: (v: string, r: { moduleName: string; granularity: string }) => v ?? r.moduleName },
      ...((evalSheet?.activeRoles ?? []).map((r) => ({ title: r.name, dataIndex: r.key, width: 80, render: (v: number) => v ?? '-' }))),
      { title: '小计(人天)', dataIndex: 'totalDays', width: 90, render: (v: number) => <Text bold>{v?.toFixed(1)}</Text> },
      { title: '技术备注', dataIndex: 'techRemark', render: (v: string) => v || '-' },
    ];

    const roles = quote.salesAddedRoles;
    const addRole = () => {
      const newRole: SalesAddedRole = { id: uid('ar'), roleName: '新增岗位', headcount: 1, days: 1, dailyRate: 600, subtotal: 600, reason: '' };
      patch({ salesAddedRoles: [...roles, newRole] });
    };
    const updateRole = (id: string, p: Partial<SalesAddedRole>) => {
      patch({
        salesAddedRoles: roles.map((r) => {
          if (r.id !== id) return r;
          const merged = { ...r, ...p };
          return { ...merged, subtotal: computeAddedRoleSubtotal(merged) };
        }),
      });
    };
    const removeRole = (id: string) => patch({ salesAddedRoles: roles.filter((r) => r.id !== id) });

    const addedColumns = [
      { title: '增项岗位', dataIndex: 'roleName', width: 140, render: (v: string, r: SalesAddedRole) => readonly ? v : <Input size="small" value={v} onChange={(val) => updateRole(r.id, { roleName: val })} /> },
      { title: '人数', dataIndex: 'headcount', width: 90, render: (v: number, r: SalesAddedRole) => readonly ? v : <InputNumber size="small" min={0} value={v} onChange={(val) => updateRole(r.id, { headcount: typeof val === 'number' ? val : 0 })} style={{ width: '100%' }} /> },
      { title: '天数', dataIndex: 'days', width: 90, render: (v: number, r: SalesAddedRole) => readonly ? v : <InputNumber size="small" min={0} value={v} onChange={(val) => updateRole(r.id, { days: typeof val === 'number' ? val : 0 })} style={{ width: '100%' }} /> },
      { title: '日均单价', dataIndex: 'dailyRate', width: 120, render: (v: number, r: SalesAddedRole) => readonly ? money(v) : <InputNumber size="small" min={0} value={v} onChange={(val) => updateRole(r.id, { dailyRate: typeof val === 'number' ? val : 0 })} style={{ width: '100%' }} /> },
      { title: '金额小计', dataIndex: 'subtotal', width: 120, render: (v: number) => <Text bold>{money(v)}</Text> },
      { title: '增项事由', dataIndex: 'reason', render: (v: string, r: SalesAddedRole) => readonly ? (v || '-') : <Input size="small" value={v} onChange={(val) => updateRole(r.id, { reason: val })} /> },
      ...(readonly ? [] : [{ title: '操作', dataIndex: 'op', width: 60, render: (_: unknown, r: SalesAddedRole) => <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => removeRole(r.id)} /> }]),
    ];

    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Text bold>罗总技术人天评估（🔒 只读）</Text>
            <Text type="secondary">技术人天 {techDays.toFixed(1)} · 建议工期 {evalSheet?.manualWorkDays} 工作日</Text>
          </Space>
          <Table columns={evalColumns} data={evalSheet?.evaluationUnits ?? []} rowKey="id" pagination={false} scroll={{ x: 600 }} />
          {!readonly && (
            <Button style={{ marginTop: 8 }} status="warning" icon={<IconRefresh />} onClick={() => setReturnVisible(true)}>
              认为技术人天有误，退回罗总重评
            </Button>
          )}
        </div>
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Text bold>销售增项（✏️ 可编辑）</Text>
            {!readonly && <Button size="small" icon={<IconPlus />} onClick={addRole}>添加增项岗位</Button>}
          </Space>
          <Table columns={addedColumns} data={roles} rowKey="id" pagination={false} scroll={{ x: 700 }} />
        </div>
      </Space>
    );
  };

  // ─── Step5 出差与驻场 ───────────────────────────
  const Step5 = () => {
    const t = quote.travelOnsite;
    const setTravel = (enable: boolean) => {
      patch({ travelOnsite: { ...t, enableTravel: enable, travelSubtotal: enable ? t.travelSubtotal : 0 } });
    };
    const setOnsite = (enable: boolean) => {
      patch({ travelOnsite: { ...t, enableOnsite: enable, onsiteSubtotal: enable ? t.onsiteSubtotal : 0 } });
    };
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 6 }}>
          <Space style={{ marginBottom: 8 }}>
            <Switch checked={t.enableTravel} onChange={setTravel} disabled={readonly} />
            <Text bold>出差配置</Text>
          </Space>
          {t.enableTravel && <TravelEditor quote={quote} readonly={readonly} />}
        </div>
        <div style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 6 }}>
          <Space style={{ marginBottom: 8 }}>
            <Switch checked={t.enableOnsite} onChange={setOnsite} disabled={readonly} />
            <Text bold>驻场服务配置</Text>
          </Space>
          {t.enableOnsite && <OnsiteEditor quote={quote} readonly={readonly} />}
        </div>
      </Space>
    );
  };

  // ─── Step6 其他成本 ───────────────────────────
  const Step6 = () => {
    const costs = quote.otherCosts;
    const addCost = (name: string) => {
      patch({ otherCosts: [...costs, { id: uid('c'), name, amount: 0 }] });
    };
    const updateCost = (id: string, p: Partial<CostItem>) => {
      patch({ otherCosts: costs.map((c) => (c.id === id ? { ...c, ...p } : c)) });
    };
    const removeCost = (id: string) => patch({ otherCosts: costs.filter((c) => c.id !== id) });

    const columns = [
      { title: '成本名称', dataIndex: 'name', width: 200, render: (v: string, c: CostItem) => readonly ? v : <Input size="small" value={v} onChange={(val) => updateCost(c.id, { name: val })} /> },
      { title: '金额', dataIndex: 'amount', width: 140, render: (v: number, c: CostItem) => readonly ? money(v) : <InputNumber size="small" min={0} value={v} onChange={(val) => updateCost(c.id, { amount: typeof val === 'number' ? val : 0 })} style={{ width: '100%' }} /> },
      { title: '费用说明', dataIndex: 'note', render: (v: string, c: CostItem) => readonly ? (v || '-') : <Input size="small" value={v ?? ''} onChange={(val) => updateCost(c.id, { note: val })} /> },
      ...(readonly ? [] : [{ title: '操作', dataIndex: 'op', width: 60, render: (_: unknown, c: CostItem) => <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => removeCost(c.id)} /> }]),
    ];

    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {!readonly && (
          <Space wrap>
            <Text type="secondary">快捷添加：</Text>
            {PRESET_COST_ITEMS.map((n) => (
              <Button key={n} size="mini" onClick={() => addCost(n)}>{n}</Button>
            ))}
            <Button size="mini" icon={<IconPlus />} onClick={() => addCost('自定义成本')}>自定义</Button>
          </Space>
        )}
        <Table columns={columns} data={costs} rowKey="id" pagination={false} scroll={{ x: 500 }} />
      </Space>
    );
  };

  // ─── Step7 汇总校验 ───────────────────────────
  const breakdown = useMemo(() => computeAmountBreakdown(quote), [quote]);
  const issues = useMemo(() => validateBeforeAudit(quote), [quote]);

  // 付款方式联动
  const applyPaymentTemplate = (idx: number) => {
    const tmpl = PAYMENT_TERM_TEMPLATES[idx];
    if (!tmpl) return;
    const terms: PaymentTerm[] = tmpl.terms.map((t) => ({ stage: t.stage, percent: t.percent, amount: 0 }));
    patch({ summary: { ...(quote.summary ?? defaultSummary()), paymentTerms: terms } });
  };

  const updatePaymentPercent = (stage: string, percent: number) => {
    const terms = (quote.summary?.paymentTerms ?? []).map((t) => (t.stage === stage ? { ...t, percent } : t));
    patch({ summary: { ...(quote.summary ?? defaultSummary()), paymentTerms: terms } });
  };

  const Step7 = () => {
    const percentSum = (quote.summary?.paymentTerms ?? []).reduce((s, t) => s + t.percent, 0);
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions
          column={2}
          title="工期与人天"
          data={[
            { label: '技术人天', value: `${breakdown.techDays.toFixed(1)} 人天` },
            { label: '增项人天', value: `${breakdown.addedDays} 人天` },
            { label: '总人天', value: `${breakdown.totalLaborDays.toFixed(1)} 人天` },
            { label: '约定工期', value: `${quote.evalSheet?.manualWorkDays ?? 0} 工作日` },
          ]}
        />
        <Descriptions
          column={2}
          title="报价结构"
          data={[
            { label: '人力成本小计', value: money(breakdown.laborSubtotal) },
            { label: '差旅驻场费用', value: money(breakdown.travelSubtotal + breakdown.onsiteSubtotal) },
            { label: '其他成本', value: money(breakdown.otherCostSubtotal) },
            { label: '项目总报价', value: <Text bold style={{ fontSize: 16, color: 'rgb(var(--red-6))' }}>{money(breakdown.grandTotal)}</Text> },
          ]}
        />
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Text bold>占比分布</Text>
            <Text type="secondary">人力 {(breakdown.ratios.labor * 100).toFixed(0)}% · 差旅驻场 {(breakdown.ratios.travelOnsite * 100).toFixed(0)}% · 其他 {(breakdown.ratios.other * 100).toFixed(0)}%</Text>
          </Space>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--color-fill-2)', maxWidth: 500 }}>
            <div style={{ width: `${breakdown.ratios.labor * 100}%`, background: 'rgb(var(--arcoblue-6))' }} />
            <div style={{ width: `${breakdown.ratios.travelOnsite * 100}%`, background: 'rgb(var(--orange-5))' }} />
            <div style={{ width: `${breakdown.ratios.other * 100}%`, background: 'rgb(var(--green-5))' }} />
          </div>
        </div>

        {/* 付款方式 */}
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Text bold>付款方式</Text>
            {!readonly && (
              <Select
                placeholder="选择标准模板"
                style={{ width: 280 }}
                onChange={(v) => v !== undefined && applyPaymentTemplate(v)}
                value={undefined}
                options={PAYMENT_TERM_TEMPLATES.map((t, i) => ({ label: t.label, value: i }))}
              />
            )}
          </Space>
          <Table
            rowKey="stage"
            pagination={false}
            data={quote.summary?.paymentTerms ?? []}
            columns={[
              { title: '阶段', dataIndex: 'stage', width: 200 },
              {
                title: '比例',
                dataIndex: 'percent',
                width: 160,
                render: (v: number, r: PaymentTerm) => readonly ? `${v}%` : (
                  <InputNumber size="small" min={0} max={100} value={v} suffix="%" onChange={(val) => updatePaymentPercent(r.stage, typeof val === 'number' ? val : 0)} style={{ width: '100%' }} />
                ),
              },
              { title: '金额', dataIndex: 'amount', render: (v: number) => money(v) },
            ]}
          />
          <Text type={Math.abs(percentSum - 100) < 0.01 ? 'success' : 'error'} style={{ marginTop: 8, display: 'block' }}>
            阶段比例合计 {percentSum}% {Math.abs(percentSum - 100) < 0.01 ? '✓' : '（必须等于 100%）'}
          </Text>
        </div>

        {/* 自动校验 */}
        {issues.length > 0 ? (
          <Alert
            type="error"
            title="提交前硬校验未通过"
            content={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {issues.map((i) => <li key={i.code}>{i.message}</li>)}
              </ul>
            }
          />
        ) : (
          <Alert type="success" content="全部校验通过：∑分项人天=总人天 ✓ · ∑成本小计=总报价 ✓ · 付款比例=100% ✓" />
        )}

        {!readonly && (
          <Space>
            <Button type="primary" icon={<IconSend />} disabled={issues.length > 0} onClick={() => { submitForAudit(quote.id); Message.success('报价已提交，进入三人并行会签'); }}>
              校验并提交审批
            </Button>
            {quote.status === 'auditing' && (
              <Button status="warning" icon={<IconUndo />} onClick={() => setWithdrawVisible(true)}>主动撤回</Button>
            )}
            <Button status="warning" icon={<IconRefresh />} onClick={() => setReturnVisible(true)}>退回罗总重评</Button>
          </Space>
        )}
      </Space>
    );
  };

  const steps = [Step1, Step2, Step3, Step4, Step5, Step6, Step7];
  const StepContent = steps[step];

  return (
    <Card
      title={<Title heading={6} style={{ margin: 0 }}>工作台三 · 销售报价（7 步向导）</Title>}
    >
      {isRejected && (
        <Alert
          type="error"
          style={{ marginBottom: 12 }}
          content="该报价已被审批驳回，请按驳回意见修改后重新提交（三人会签将全部重审）。"
        />
      )}
      <Steps current={step} style={{ marginBottom: 20 }} type="dot">
        {STEP_NAMES.map((n) => <Steps.Step key={n} title={n} />)}
      </Steps>
      <StepContent />
      <Space style={{ marginTop: 20 }}>
        <Button icon={<IconLeft />} disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</Button>
        <Button type="primary" icon={<IconRight />} disabled={step === 6} onClick={() => setStep(step + 1)}>下一步</Button>
      </Space>

      {/* 退回罗总 */}
      <Modal
        title="退回罗总重新评估"
        visible={returnVisible}
        onOk={() => {
          if (!returnReason.trim()) { Message.warning('请填写退回理由'); return; }
          returnToTech(quote.id, returnReason.trim());
          setReturnVisible(false);
          setReturnReason('');
          Message.success('已退回技术重评');
        }}
        onCancel={() => setReturnVisible(false)}
        okText="确认退回"
      >
        <Input.TextArea rows={3} placeholder="说明需退回的技术人天问题" value={returnReason} onChange={setReturnReason} />
      </Modal>

      {/* 主动撤回 */}
      <Modal
        title="撤回报价审批"
        visible={withdrawVisible}
        onOk={() => {
          if (!withdrawReason.trim()) { Message.warning('请填写撤回原因'); return; }
          withdrawAudit(quote.id, withdrawReason.trim());
          setWithdrawVisible(false);
          setWithdrawReason('');
          Message.success('已撤回，回到报价草稿');
        }}
        onCancel={() => setWithdrawVisible(false)}
        okText="确认撤回"
      >
        <Input.TextArea rows={3} placeholder="撤回原因（必填）" value={withdrawReason} onChange={setWithdrawReason} />
      </Modal>
    </Card>
  );
}

function defaultSummary() {
  return { totalLaborDays: 0, projectWorkDays: 0, grandTotalPrice: 0, paymentTerms: [], taxIncluded: true, warrantyYears: 1 };
}

// ─── 出差/驻场明细编辑子组件 ──────────────────────
function TravelEditor({ quote, readonly }: { quote: Quote; readonly: boolean }) {
  const { updateQuote } = useQuotation();
  const t = quote.travelOnsite;
  const detail = t.travelDetail ?? { location: '', headcount: 1, days: 1, transportFee: 0, hotelFeePerDay: 0, allowancePerDay: 0 };
  const setDetail = (p: Partial<typeof detail>) => {
    if (readonly) return;
    const next = { ...detail, ...p };
    updateQuote(quote.id, (q) => ({
      ...q,
      travelOnsite: { ...q.travelOnsite, travelDetail: next, travelSubtotal: computeTravelSubtotal(next) },
    }));
  };
  return (
    <Space wrap>
      <LabeledInput label="地点" value={detail.location} onChange={(v) => setDetail({ location: v })} readonly={readonly} width={140} />
      <LabeledNumber label="人数" value={detail.headcount} onChange={(v) => setDetail({ headcount: v })} readonly={readonly} width={90} />
      <LabeledNumber label="天数" value={detail.days} onChange={(v) => setDetail({ days: v })} readonly={readonly} width={90} />
      <LabeledNumber label="交通费(往返合计)" value={detail.transportFee} onChange={(v) => setDetail({ transportFee: v })} readonly={readonly} width={140} />
      <LabeledNumber label="住宿(元/天/人)" value={detail.hotelFeePerDay} onChange={(v) => setDetail({ hotelFeePerDay: v })} readonly={readonly} width={140} />
      <LabeledNumber label="补贴(元/天/人)" value={detail.allowancePerDay} onChange={(v) => setDetail({ allowancePerDay: v })} readonly={readonly} width={140} />
      <Text>差旅小计 <Text bold>{money(t.travelSubtotal)}</Text></Text>
    </Space>
  );
}

function OnsiteEditor({ quote, readonly }: { quote: Quote; readonly: boolean }) {
  const { updateQuote } = useQuotation();
  const t = quote.travelOnsite;
  const detail = t.onsiteDetail ?? { location: '', headcount: 1, days: 1, serviceFeePerDay: 0 };
  const setDetail = (p: Partial<typeof detail>) => {
    if (readonly) return;
    const next = { ...detail, ...p };
    updateQuote(quote.id, (q) => ({
      ...q,
      travelOnsite: { ...q.travelOnsite, onsiteDetail: next, onsiteSubtotal: computeOnsiteSubtotal(next) },
    }));
  };
  return (
    <Space wrap>
      <LabeledInput label="驻场地点" value={detail.location} onChange={(v) => setDetail({ location: v })} readonly={readonly} width={140} />
      <LabeledNumber label="人数" value={detail.headcount} onChange={(v) => setDetail({ headcount: v })} readonly={readonly} width={90} />
      <LabeledNumber label="天数" value={detail.days} onChange={(v) => setDetail({ days: v })} readonly={readonly} width={90} />
      <LabeledNumber label="服务费(元/天/人)" value={detail.serviceFeePerDay} onChange={(v) => setDetail({ serviceFeePerDay: v })} readonly={readonly} width={160} />
      <Text>驻场小计 <Text bold>{money(t.onsiteSubtotal)}</Text></Text>
    </Space>
  );
}

function LabeledInput({ label, value, onChange, readonly, width }: { label: string; value: string; onChange: (v: string) => void; readonly: boolean; width: number }) {
  return (
    <Space size={4} direction="vertical">
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <Input size="small" value={value} onChange={onChange} disabled={readonly} style={{ width }} />
    </Space>
  );
}

function LabeledNumber({ label, value, onChange, readonly, width }: { label: string; value: number; onChange: (v: number) => void; readonly: boolean; width: number }) {
  return (
    <Space size={4} direction="vertical">
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <InputNumber size="small" min={0} value={value} onChange={(v) => onChange(typeof v === 'number' ? v : 0)} disabled={readonly} style={{ width }} />
    </Space>
  );
}
