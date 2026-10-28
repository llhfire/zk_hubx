import {
  Button,
  DataTable,
  Divider,
  Eye,
  FilterBar,
  GradeTag,
  IconPlus,
  IconSearch,
  Input,
  NotePencil,
  PageHeader,
  SectionCard,
  Select,
  Space,
  StatusTag,
  Trash,
} from '@/design-system';
import { DEMO_STAGE, matureListRows } from '../../demos/fixtures';
import { CopyNotes } from './CopyNotes';

/**
 * 线索列表样板：固定操作列、双层时间表达、状态组合。
 * 客户、合同、报价、项目列表都以它为基准。
 */
export function LeadListPattern() {
  return (
    <>
      <SectionCard>
        <PageHeader
          title="线索列表样板"
          description="固定操作列、明确筛选提示、状态组合、双层时间表达和图标操作，是客户、合同、报价、项目等列表的基准。"
          actions={<Button type="primary" icon={<IconPlus />}>新建线索</Button>}
        />
        <Divider />
        <FilterBar>
          <Input className="ui-library-field--search" prefix={<IconSearch />} placeholder="搜索名称、联系人或编号" />
          <Select className="ui-library-field--filter" placeholder="当前步骤（全部）" options={['未联系', '初步沟通', '需求调研', '方案报价']} />
          <Select className="ui-library-field--filter" placeholder="客户等级（全部）" options={['S', 'A', 'B', 'C']} />
        </FilterBar>
        <div className="ui-library-list-pattern">
          <DataTable
            rowKey="key"
            data={matureListRows}
            scroll={{ x: 980 }}
            pagination={false}
            columns={[
              { title: '线索名称', dataIndex: 'name', width: 240 },
              { title: '联系人', dataIndex: 'contact', width: 120 },
              { title: '当前步骤', dataIndex: 'stage', width: 130, render: (value: string) => <StatusTag meta={DEMO_STAGE[value] ?? { label: value, tone: 'neutral' }} /> },
              {
                title: '等级 / 优先级',
                width: 150,
                render: (_: unknown, record: typeof matureListRows[number]) => (
                  <Space size={4}><GradeTag grade={record.level as 'S' | 'A' | 'B' | 'C'} /><StatusTag tone={record.priority === '高' ? 'warning' : 'neutral'}>{record.priority}</StatusTag></Space>
                ),
              },
              {
                title: '下次跟进',
                dataIndex: 'nextAt',
                width: 140,
                render: (value: string) => <div className="ui-library-time-capsule"><span>待跟进</span><strong>{value}</strong></div>,
              },
              {
                title: '操作',
                width: 116,
                fixed: 'right' as const,
                render: (_: unknown, record: typeof matureListRows[number]) => (
                  <Space size={2}>
                    <Button className="hubx-icon-action" type="text" size="small" aria-label={`查看 ${record.name}`} icon={<Eye size={18} weight="regular" />} />
                    <Button className="hubx-icon-action" type="text" size="small" aria-label={`编辑 ${record.name}`} icon={<NotePencil size={18} weight="regular" />} />
                    <Button className="hubx-icon-action" type="text" size="small" status="danger" aria-label={`删除 ${record.name}`} icon={<Trash size={18} weight="regular" />} />
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </SectionCard>
      <CopyNotes
        copy={[
          '固定宽度的操作列，三个图标动作不随列宽收缩',
          '状态列只放 StatusTag，页面只提供状态映射',
          '下次跟进用「标签 + 时间」双行，不塞进一列文字',
          '筛选项不超过三个，其余进高级筛选',
        ]}
        skip={[
          '线索的 6 个阶段名和它们的语义色',
          'S/A/B/C 等级与优先级的组合规则',
          '线索特有的跟进倒计时口径',
        ]}
      />
    </>
  );
}
