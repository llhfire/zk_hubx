// 线索派发工作台页面（阶段 B + C + D）
// 结构（PLAN.md）：页头（标题+视角切换+新建）/ KPI 卡片行 / 快捷分类 Tab /
// 业务线+时间范围+排序 / 筛选栏（含批量派发）/ 列表表格
// 阶段 C：DispatchModal 派发弹窗 + 催办 + 批量派发
// 阶段 D：LevelAdjustModal 等级调整（升级免审/降级走审批）+ 质检确认

import { useMemo, useState } from 'react';
import { Button, Card, Message, Radio, Select, Space, Typography } from '@arco-design/web-react';
import { LeadDispatchProvider, useLeadDispatch } from './LeadDispatchContext';
import { KpiCards } from './components/KpiCards';
import { CategoryTabs } from './components/CategoryTabs';
import { FilterBar, type DispatchFilterState } from './components/FilterBar';
import { LeadTable } from './components/LeadTable';
import { CreateLeadModal, type CreateLeadFormPayload } from './components/CreateLeadModal';
import { DispatchModal, type DispatchModalPayload } from './components/DispatchModal';
import { LevelAdjustModal, type LevelAdjustPayload } from './components/LevelAdjustModal';
import { useEmployee } from '@/app/pages/employee/EmployeeContext';
import { useLeads } from '@/app/leads/LeadContext';
import { CURRENT_LOGIN_USER } from '@/app/currentUser';
import { DISPATCH_ROLE_LABEL, type DispatchRole } from './roleViewFilter';
import { filterByCategory, type DispatchCategory } from './kpiCalc';
import { BUSINESS_LINE_LABEL, type LeadBusinessLine } from './types';
import { nowString } from '@/services/leadMutations';
import { generateEventId } from './eventLog';
import type { LeadListItem, CustomerLevel } from '@/app/pages/leads/types';
import { hasPendingLevelAudit, returnActorsOf } from './kpiCalc';

type TimeRange = 'today' | '7d' | '30d' | 'all';
type SortKey = 'create_desc' | 'create_asc' | 'sla_first';

const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  today: '今日', '7d': '近 7 天', '30d': '近 30 天', all: '全部',
};

function withinTimeRange(createTime: string, range: TimeRange, now: Date): boolean {
  if (range === 'all') return true;
  const day = 24 * 60 * 60 * 1000;
  const created = new Date(createTime).getTime();
  const todayStart = new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`).getTime();
  if (range === 'today') return created >= todayStart;
  if (range === '7d') return created >= todayStart - 7 * day;
  return created >= todayStart - 30 * day;
}

function WorkbenchInner() {
  const { role, setRole, leads, loading, now, kpis } = useLeadDispatch();
  const { employees } = useEmployee();
  const { createLead, updateLead, assignLead, dispatchLead, urgeLead, adjustLevel, confirmQuality } = useLeads();

  const [category, setCategory] = useState<DispatchCategory>('all');
  const [businessLine, setBusinessLine] = useState<'all' | LeadBusinessLine>('all');
  // 默认展示全部 mock 数据，避免演示环境因系统日期变化而落入空态。
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortKey, setSortKey] = useState<SortKey>('create_desc');
  const [filter, setFilter] = useState<DispatchFilterState>({ keyword: '', entity: '', channel: '', department: '', customerLevel: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [dispatchVisible, setDispatchVisible] = useState(false);
  const [dispatchTargetIds, setDispatchTargetIds] = useState<string[]>([]);
  const [levelAdjustLead, setLevelAdjustLead] = useState<LeadListItem | null>(null);

  // 部门字典：销售姓名 -> 部门（EmployeeContext 动态读取，不写死）
  const departmentByOwner = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employees) map.set(e.name, e.department);
    return map;
  }, [employees]);
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))], [employees]);

  const visibleLeads = useMemo(() => {
    let list = filterByCategory(leads, category, now);
    if (businessLine !== 'all') list = list.filter((l) => l.businessLine === businessLine);
    const effectiveRange = role === 'recorder' ? 'today' : timeRange;
    list = list.filter((l) => withinTimeRange(l.createTime, effectiveRange, now));

    if (filter.keyword) {
      const kw = filter.keyword.trim().toLowerCase();
      list = list.filter((l) =>
        [l.name, l.contact, l.phone, l.customer].some((v) => (v ?? '').toLowerCase().includes(kw)));
    }
    if (filter.entity) list = list.filter((l) => l.entity === filter.entity);
    if (filter.channel) list = list.filter((l) => l.source === filter.channel);
    if (filter.department) list = list.filter((l) => departmentByOwner.get(l.owner) === filter.department);
    if (filter.customerLevel) list = list.filter((l) => l.customerLevel === filter.customerLevel);

    if (sortKey === 'create_desc') list = [...list].sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
    else if (sortKey === 'create_asc') list = [...list].sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''));
    else {
      // 时效紧急优先：派发剩余时间升序
      list = [...list].sort((a, b) => {
        const remaining = (l: LeadListItem) => (l.dispatchedAt ? Infinity : new Date(l.createTime || 0).getTime());
        return remaining(a) - remaining(b);
      });
    }
    return list;
  }, [leads, category, now, businessLine, timeRange, role, filter, sortKey, departmentByOwner]);

  const handleRoleChange = (r: DispatchRole) => {
    setRole(r);
    // 切视角后收敛不可见分类
    if (r !== 'admin' && (category === 'level_audit' || category === 'quality_bucket')) setCategory('all');
    setSelectedIds([]);
  };

  // ── 派发（阶段 C） ──
  const handleDispatch = (lead: LeadListItem) => {
    setDispatchTargetIds([lead.id]);
    setDispatchVisible(true);
  };
  const handleBatchDispatch = () => {
    if (selectedIds.length === 0) return;
    setDispatchTargetIds([...selectedIds]);
    setDispatchVisible(true);
  };
  const handleDispatchConfirm = async (payload: DispatchModalPayload) => {
    // β 阶段 2：派发走服务方法（mock 本地 / http 服务端专门端点，事件服务端生成）
    for (const id of dispatchTargetIds) {
      await dispatchLead(id, { target: payload.target, assignee: payload.assignee }, CURRENT_LOGIN_USER.name);
    }
    setDispatchVisible(false);
    setSelectedIds([]);
    Message.success(`已派发 ${dispatchTargetIds.length} 条线索`);
  };

  // ── 催办（阶段 C） ──
  const handleUrge = async (lead: LeadListItem) => {
    await urgeLead(lead.id, CURRENT_LOGIN_USER.name, `催办${lead.owner ? `→${lead.owner}` : ''}`);
    Message.success(`已催办${lead.owner ? ` ${lead.owner}` : ''}`);
  };

  // ── 等级调整（阶段 D） ──
  const handleLevelAdjust = (lead: LeadListItem) => {
    setLevelAdjustLead(lead);
  };
  const handleLevelAdjustConfirm = async (payload: LevelAdjustPayload) => {
    if (!levelAdjustLead) return;
    // β 阶段 2：等级调整走服务方法；升级免审直接生效、降级只写事件进审核队列（纯函数单源）
    await adjustLevel(levelAdjustLead.id, payload.from, payload.to, CURRENT_LOGIN_USER.name);
    if (payload.needsApproval) {
      Message.warning(`降级申请已提交（${payload.from} → ${payload.to}），等待管理员审核`);
    } else {
      Message.success(`等级已调整：${payload.from} → ${payload.to}`);
    }
    setLevelAdjustLead(null);
  };

  // ── 质检确认（阶段 D） ──
  const handleQualityConfirm = async (lead: LeadListItem) => {
    const actors = returnActorsOf(lead);
    // 管理员确认：追加 level_audit_result 事件，清除质检状态（β 阶段 2 走服务方法）
    await confirmQuality(lead.id, CURRENT_LOGIN_USER.name, `质检确认：${actors.length} 人退回，已标记为垃圾`);
    Message.info(`已确认质检（${actors.length} 人退回）`);
  };

  // ── 录入（阶段 B） ──
  const handleCreate = async (payload: CreateLeadFormPayload) => {
    try {
      const id = await createLead({
        name: payload.name,
        contact: payload.contact,
        phone: payload.phone,
        source: payload.source,
        entity: payload.entity,
        customerLevel: payload.customerLevel,
      });
      if (!id) {
        Message.error('线索创建失败，请重试');
        return;
      }
      if (payload.initialAssign === 'sales' && payload.assignee) {
        await assignLead(id, payload.assignee, CURRENT_LOGIN_USER.name, '派发工作台 · 录入即指派');
        await updateLead(id, (l) => ({
          ...l,
          businessLine: payload.businessLine,
          channelPlan: payload.channelPlan || undefined,
          dispatchedAt: nowString(),
          dispatchTarget: 'sales',
          leadEvents: [
            { id: generateEventId(), leadId: id, kind: 'inbound', actor: CURRENT_LOGIN_USER.name, at: l.createTime || nowString() },
            { id: generateEventId(), leadId: id, kind: 'dispatch_to_sales', actor: CURRENT_LOGIN_USER.name, at: nowString(), assignee: payload.assignee },
          ],
        }));
      } else {
        await updateLead(id, (l) => ({
          ...l,
          businessLine: payload.businessLine,
          channelPlan: payload.channelPlan || undefined,
          leadEvents: [
            { id: generateEventId(), leadId: id, kind: 'inbound', actor: CURRENT_LOGIN_USER.name, at: l.createTime || nowString() },
          ],
        }));
      }
      Message.success('线索录入成功');
      setCreateVisible(false);
    } catch {
      Message.error('线索录入失败，请重试');
    }
  };


  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 页头：标题 + 视角切换 + 新建 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title heading={5} style={{ margin: 0 }}>线索派发工作台</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            录入 → 30min 派发 → 首联 2h 时效监控；派发是待派发线索的唯一出口（ADR-0096）
          </Typography.Text>
        </div>
        <Space>
          <Radio.Group type="button" value={role} onChange={(v) => handleRoleChange(v as DispatchRole)}>
            {(Object.keys(DISPATCH_ROLE_LABEL) as DispatchRole[]).map((r) => (
              <Radio key={r} value={r}>{DISPATCH_ROLE_LABEL[r]}</Radio>
            ))}
          </Radio.Group>
          <Button type="primary" onClick={() => setCreateVisible(true)}>新建线索</Button>
        </Space>
      </div>

      {/* KPI 卡片行 */}
      <KpiCards kpis={kpis} activeCategory={category} onSelectCategory={setCategory} />

      {/* 快捷分类 Tab */}
      <Card size="small">
        <CategoryTabs leads={leads} now={now} role={role} active={category} onChange={setCategory} />

        {/* 业务线 + 时间范围 + 排序 */}
        <Space size={12} wrap style={{ marginTop: 8 }}>
          <Radio.Group type="button" size="small" value={businessLine} onChange={(v) => setBusinessLine(v)}>
            <Radio value="all">全部业务线</Radio>
            {(Object.keys(BUSINESS_LINE_LABEL) as LeadBusinessLine[]).map((b) => (
              <Radio key={b} value={b}>{BUSINESS_LINE_LABEL[b]}</Radio>
            ))}
          </Radio.Group>
          <Select size="small" style={{ width: 110 }} value={timeRange} onChange={(v) => setTimeRange(v)}
            disabled={role === 'recorder'}>
            {(Object.keys(TIME_RANGE_LABEL) as TimeRange[]).map((t) => (
              <Select.Option key={t} value={t}>{TIME_RANGE_LABEL[t]}</Select.Option>
            ))}
          </Select>
          <Select size="small" style={{ width: 140 }} value={sortKey} onChange={(v) => setSortKey(v)}>
            <Select.Option value="create_desc">录入时间 倒序</Select.Option>
            <Select.Option value="create_asc">录入时间 正序</Select.Option>
            <Select.Option value="sla_first">派发时效 紧急优先</Select.Option>
          </Select>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {visibleLeads.length} / {leads.length} 条
            {role === 'recorder' && '（录入员固定今日）'}
          </Typography.Text>
        </Space>
      </Card>

      {/* 筛选栏 + 批量派发 */}
      <Card size="small">
        <FilterBar
          filter={filter}
          onFilterChange={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
          departments={departments}
          selectedCount={selectedIds.length}
          onBatchDispatch={handleBatchDispatch}
        />
      </Card>

      {/* 列表表格 */}
      <Card size="small">
        <LeadTable
          leads={visibleLeads}
          now={now}
          loading={loading}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          departmentByOwner={departmentByOwner}
          onDispatch={handleDispatch}
          onUrge={handleUrge}
          onLevelAdjust={handleLevelAdjust}
          onQualityConfirm={handleQualityConfirm}
        />
      </Card>

      <CreateLeadModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        employees={employees}
      />

      <DispatchModal
        visible={dispatchVisible}
        leadCount={dispatchTargetIds.length}
        employees={employees}
        onClose={() => setDispatchVisible(false)}
        onConfirm={handleDispatchConfirm}
      />

      {levelAdjustLead && (
        <LevelAdjustModal
          visible={!!levelAdjustLead}
          currentLevel={(levelAdjustLead.customerLevel ?? 'C') as CustomerLevel}
          leadName={levelAdjustLead.name}
          onClose={() => setLevelAdjustLead(null)}
          onConfirm={handleLevelAdjustConfirm}
        />
      )}
    </div>
  );
}

export function LeadDispatchPage() {
  return (
    <LeadDispatchProvider>
      <WorkbenchInner />
    </LeadDispatchProvider>
  );
}
