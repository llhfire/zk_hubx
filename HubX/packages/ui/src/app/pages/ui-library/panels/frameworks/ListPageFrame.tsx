import { useState } from 'react';
import {
  Button,
  DataTable,
  DateText,
  FilterBar,
  GradeTag,
  IconDownload,
  IconPlus,
  IconSearch,
  Input,
  PageHeader,
  SectionCard,
  SectionTabs,
  Select,
  Space,
  StatusTag,
} from '@/design-system';
import { FrameShell, FrameSlot } from './FrameSlot';

interface DemoCustomer {
  key: string;
  name: string;
  grade: 'S' | 'A' | 'B' | 'C';
  owner: string;
  industry: string;
  lastContactAt: string;
  status: '合作中' | '待跟进' | '已流失';
}

const ROWS: DemoCustomer[] = [
  { key: 'c1', name: '海淀智检科技有限公司', grade: 'S', owner: '秦知遥', industry: '检验检测', lastContactAt: '2026-04-26', status: '合作中' },
  { key: 'c2', name: '松澜供应链有限公司', grade: 'A', owner: '冯予安', industry: '物流仓储', lastContactAt: '2026-04-21', status: '待跟进' },
  { key: 'c3', name: '云栖园区运营管理', grade: 'B', owner: '唐屿川', industry: '园区运营', lastContactAt: '2026-03-30', status: '已流失' },
];

const STATUS_TONE = {
  合作中: 'success',
  待跟进: 'warning',
  已流失: 'neutral',
} as const;

/**
 * 列表页框架：一级列表页的固定骨架。
 * 适用：线索、客户、合同、项目、系统配置等「同一种实体的多条记录」页面。
 */
export function ListPageFrame() {
  const [tab, setTab] = useState('all');

  return (
    <SectionCard
      title="列表页框架"
      description="一句场景 + 五段结构：页头、一级页签、筛选、表格、分页与批量动作。业务页面只传标题、筛选项、列配置和数据。"
    >
      <FrameShell>
        <FrameSlot index={1} label="页头 PageHeader：标题、一句话说明、唯一主操作" />
        <PageHeader
          title="客户管理"
          description="按等级、行业和跟进状态管理客户主档。"
          actions={<Button type="primary" icon={<IconPlus />}>新建客户</Button>}
        />

        <FrameSlot index={2} label="一级页签 SectionTabs：同一实体的不同视角，带数量" />
        <SectionTabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: '全部客户', count: 128 },
            { key: 'mine', label: '我的客户', count: 24 },
            { key: 'sea', label: '公海', count: 39 },
            { key: 'lost', label: '已流失', count: 7 },
          ]}
        />

        <FrameSlot index={3} label="筛选 FilterBar：搜索 + 2–3 个筛选 + 重置/查询" />
        <FilterBar>
          <Input className="ui-library-field--search" prefix={<IconSearch />} placeholder="搜索客户名称或编号" />
          <Select className="ui-library-field--filter" placeholder="客户等级（全部）" options={['S', 'A', 'B', 'C']} />
          <Select className="ui-library-field--filter" placeholder="所属行业（全部）" options={['检验检测', '物流仓储', '园区运营']} />
          <Button>重置</Button>
          <Button type="primary">查询</Button>
        </FilterBar>

        <FrameSlot index={4} label="表格 DataTable：工具栏左侧摘要、右侧导出，操作列固定在右" />
        <DataTable
          rowKey="key"
          data={ROWS}
          pagination={{ pageSize: 10, total: 128, showTotal: true }}
          caption="共 128 条"
          actions={<Button icon={<IconDownload />}>导出</Button>}
          columns={[
            { title: '客户名称', dataIndex: 'name' },
            { title: '等级', dataIndex: 'grade', width: 80, render: (value: DemoCustomer['grade']) => <GradeTag grade={value} /> },
            { title: '行业', dataIndex: 'industry', width: 120 },
            { title: '负责人', dataIndex: 'owner', width: 100 },
            { title: '最近联系', dataIndex: 'lastContactAt', width: 120, render: (value: string) => <DateText value={value} /> },
            {
              title: '状态',
              dataIndex: 'status',
              width: 110,
              render: (value: DemoCustomer['status']) => <StatusTag tone={STATUS_TONE[value]}>{value}</StatusTag>,
            },
            {
              title: '操作',
              width: 120,
              fixed: 'right' as const,
              render: () => <Space size={4}><Button type="text" size="small">查看</Button><Button type="text" size="small">编辑</Button></Space>,
            },
          ]}
        />

        <FrameSlot index={5} label="分页与批量动作：分页在表格底部，批量动作与勾选联动" />
      </FrameShell>
      <div className="ui-library-demo-caption">
        参照实现：`/customers`、`/leads/all`。分页、勾选和空态都由 DataTable 承载，页面不要另拼分页条。
      </div>
    </SectionCard>
  );
}
