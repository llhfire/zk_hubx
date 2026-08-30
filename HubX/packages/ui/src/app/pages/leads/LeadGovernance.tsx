import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Descriptions, Message, Modal, Space, Table, Tabs, Tag } from '@arco-design/web-react';
import { useNavigate } from 'react-router';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { useLeads } from '@/app/leads/LeadContext';
import { leadDispatchView, returnActorsOf } from '../lead-dispatch/kpiCalc';
import { readSalesBusinessConfig } from '../systemConfigStore';
import type { LeadListItem } from './types';

function normalized(value = '') {
  return value.replace(/[\s（）()\-]/g, '').toLowerCase();
}

function duplicatePairs(leads: LeadListItem[]) {
  const result: Array<{ key: string; master: LeadListItem; duplicate: LeadListItem; reason: string; strong: boolean }> = [];
  for (let i = 0; i < leads.length; i += 1) {
    for (let j = i + 1; j < leads.length; j += 1) {
      const a = leads[i];
      const b = leads[j];
      const samePhone = a.phone && normalized(a.phone) === normalized(b.phone);
      const sameCustomer = a.customer && normalized(a.customer) === normalized(b.customer);
      const sameName = normalized(a.name) === normalized(b.name);
      if (samePhone || sameCustomer || sameName) result.push({ key: `${a.id}-${b.id}`, master: a.createTime <= b.createTime ? a : b, duplicate: a.createTime <= b.createTime ? b : a, reason: samePhone ? '联系电话一致' : sameCustomer ? '客户名称一致' : '线索名称相似', strong: Boolean(samePhone) });
    }
  }
  return result;
}

export function LeadGovernance() {
  const navigate = useNavigate();
  const { leads, urgeLead, confirmQuality, updateLead } = useLeads();
  const [tab, setTab] = useState('exceptions');
  const now = new Date();
  const activeLeads = useMemo(() => leads.filter((item) => !item.deleted && !item.mergedIntoLeadId), [leads]);
  const views = useMemo(() => activeLeads.map((lead) => ({ lead, view: leadDispatchView(lead, now) })), [activeLeads]);
  const exceptions = views.filter(({ view }) => view.highlight || view.firstContactSla.status === 'warning');
  const duplicates = useMemo(() => duplicatePairs(activeLeads), [activeLeads]);
  const quality = views.filter(({ lead }) => returnActorsOf(lead).length > 0);
  const pendingQuality = quality.filter(({ view }) => view.returnQuality.bucket === 'pending_confirm');
  const config = readSalesBusinessConfig();

  const exceptionColumns = [
    { title: '线索', width: 230, render: (_: unknown, row: typeof exceptions[number]) => <a className="table-primary-link" onClick={() => navigate(`/leads/${row.lead.id}`)}>{row.lead.name}<div className="table-secondary-text">{row.lead.customer || '未绑定客户'} · {row.lead.customerLevel || '未分级'}级</div></a> },
    { title: '负责人', width: 100, render: (_: unknown, row: typeof exceptions[number]) => row.lead.owner || '待派发' },
    { title: '派发时效', width: 150, render: (_: unknown, row: typeof exceptions[number]) => <Badge status={row.view.dispatchSla.status === 'overdue' ? 'error' : row.view.dispatchSla.status === 'warning' ? 'warning' : 'success'} text={row.view.dispatchSla.label} /> },
    { title: '首联时效', width: 150, render: (_: unknown, row: typeof exceptions[number]) => <Badge status={row.view.firstContactSla.status === 'overdue' ? 'error' : row.view.firstContactSla.status === 'warning' ? 'warning' : 'success'} text={row.view.firstContactSla.label} /> },
    { title: '最近跟进', width: 150, render: (_: unknown, row: typeof exceptions[number]) => row.lead.lastFollowTime || '暂无跟进' },
    { title: '治理动作', width: 140, render: (_: unknown, row: typeof exceptions[number]) => <Button size="small" disabled={!row.lead.owner} onClick={async () => { await urgeLead(row.lead.id, '张三', '线索治理工作台催办'); Message.success('已发送站内催办并写入线索事件流水'); }}>催办负责人</Button> },
  ];

  return <PageShell breadcrumbs={[{ label: '线索管理', to: '/leads/all' }, { label: '线索治理' }]}>
    <PageHeader title="线索治理" description="集中识别异常、重复与退回质检；所有处置均由管理员确认并留痕。" />
    <ProcessMetricGrid items={[
      { key: 'all', label: '治理范围', value: `${activeLeads.length} 条` },
      { key: 'exception', label: '时效异常', value: `${exceptions.length} 条`, tone: exceptions.length ? 'warning' : 'success' },
      { key: 'duplicate', label: '疑似重复', value: `${duplicates.length} 组`, tone: duplicates.length ? 'warning' : 'success' },
      { key: 'quality', label: '退回待确认', value: `${pendingQuality.length} 条`, tone: pendingQuality.length ? 'warning' : 'success' },
    ]} />
    <Card>
      <Tabs activeTab={tab} onChange={setTab}>
        <Tabs.TabPane key="exceptions" title="线索异常">
          <Alert type="info" content="异常只触发标红、站内提醒和人工催办，不会自动回收、自动处罚或改写线索状态。" showIcon />
          <Table rowKey={(row) => row.lead.id} data={exceptions} columns={exceptionColumns} pagination={false} scroll={{ x: 1000 }} noDataElement="当前没有派发或首联异常" />
        </Tabs.TabPane>
        <Tabs.TabPane key="duplicates" title="重复线索">
          <Table rowKey="key" data={duplicates} pagination={false} columns={[
            { title: '保留主线索', width: 250, render: (_: unknown, row: typeof duplicates[number]) => <a className="table-primary-link" onClick={() => navigate(`/leads/${row.master.id}`)}>{row.master.name}<div className="table-secondary-text">{row.master.id} · {row.master.createTime}</div></a> },
            { title: '疑似重复', width: 250, render: (_: unknown, row: typeof duplicates[number]) => <a className="table-primary-link" onClick={() => navigate(`/leads/${row.duplicate.id}`)}>{row.duplicate.name}<div className="table-secondary-text">{row.duplicate.id} · {row.duplicate.createTime}</div></a> },
            { title: '命中原因', dataIndex: 'reason', width: 150, render: (value: string, row: typeof duplicates[number]) => <Space><Tag color={row.strong ? 'red' : 'orange'}>{row.strong ? '强匹配' : '相似提醒'}</Tag>{value}</Space> },
            { title: '操作', width: 150, render: (_: unknown, row: typeof duplicates[number]) => <Button size="small" onClick={() => Modal.confirm({ title: '合并重复线索', content: `保留“${row.master.name}”，将“${row.duplicate.name}”标记为已合并。历史线索 ID 和事件仍可回看。`, onOk: async () => { await updateLead(row.duplicate.id, (lead) => ({ ...lead, mergedIntoLeadId: row.master.id, deleted: true })); Message.success('重复线索已合并，来源历史已保留'); } })}>确认合并</Button> },
          ]} />
        </Tabs.TabPane>
        <Tabs.TabPane key="quality" title="退回质检">
          <Alert type="info" content="按不同销售去重计数；满三位销售退回后仍需管理员确认，系统不会自动转入垃圾池。" showIcon />
          <Table rowKey={(row) => row.lead.id} data={quality} pagination={false} columns={[
            { title: '线索', render: (_: unknown, row: typeof quality[number]) => <a className="table-primary-link" onClick={() => navigate(`/leads/${row.lead.id}`)}>{row.lead.name}</a> },
            { title: '退回销售', render: (_: unknown, row: typeof quality[number]) => Array.from(new Set(returnActorsOf(row.lead))).join('、') || '—' },
            { title: '质检分桶', render: (_: unknown, row: typeof quality[number]) => <Badge status={row.view.returnQuality.bucket === 'pending_confirm' ? 'warning' : 'default'} text={row.view.returnQuality.label} /> },
            { title: '操作', width: 180, render: (_: unknown, row: typeof quality[number]) => row.view.returnQuality.bucket === 'pending_confirm' ? <Button size="small" status="danger" onClick={() => Modal.confirm({ title: '确认转入垃圾池', content: '该线索已由三位不同销售退回。确认后才会进入垃圾池并写入事件流水。', okButtonProps: { status: 'danger' }, onOk: async () => { await confirmQuality(row.lead.id, '张三', '三人三轮退回质检确认'); Message.success('质检已确认，线索已转入垃圾池'); } })}>管理员确认</Button> : <span className="table-secondary-text">未达到三人</span> },
          ]} />
        </Tabs.TabPane>
        <Tabs.TabPane key="rules" title="规则概览">
          <Alert type="info" content="这里仅展示系统唯一规则来源。修改阈值请进入系统配置，治理页不保存私有规则。" showIcon />
          <Descriptions column={2} data={[
            { label: '待派发 SLA', value: `${config.dispatchSlaMinutes} 分钟；超时告警与催办` },
            { label: '首联 SLA', value: `${config.firstContactSlaMinutes} 分钟；提前 ${config.firstContactWarningMinutes} 分钟提醒` },
            { label: '等级调整', value: '升级即时生效；降级进入审批中心' },
            { label: '退回质检', value: '三位不同销售退回后由管理员确认' },
            { label: '自动处置', value: '关闭；不自动派发、回收、处罚或进垃圾池' },
            { label: '客户判重', value: config.enableDuplicateCheck ? '启用强标识判重' : '已关闭' },
          ]} />
          <Button type="primary" onClick={() => navigate('/system/config')}>前往系统配置</Button>
        </Tabs.TabPane>
      </Tabs>
    </Card>
  </PageShell>;
}
