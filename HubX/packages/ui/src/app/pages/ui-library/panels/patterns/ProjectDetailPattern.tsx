import {
  Button,
  DataTable,
  DateText,
  DescriptionsCard,
  IdentifierText,
  MetricGrid,
  MoneyText,
  PageBreadcrumb,
  PaymentProgress,
  ProcessOverview,
  SectionCard,
  Space,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
} from '@/design-system';
import { CopyNotes } from './CopyNotes';

const STEPS = [
  { key: 'sign', title: '合同签订' },
  { key: 'design', title: '方案设计', description: '进行中' },
  { key: 'dev', title: '开发实施' },
  { key: 'test', title: '测试验收' },
  { key: 'close', title: '结项归档' },
];

const MILESTONES = [
  { key: 'm1', name: '需求确认', owner: '秦知遥', plan: '2026-04-20', actual: '2026-04-19', status: '已完成' },
  { key: 'm2', name: '方案设计', owner: '冯予安', plan: '2026-05-08', actual: '', status: '进行中' },
  { key: 'm3', name: '开发实施', owner: '唐屿川', plan: '2026-07-15', actual: '', status: '未开始' },
  { key: 'm4', name: '客户验收', owner: '秦知遥', plan: '2026-08-20', actual: '', status: '未开始' },
];

const STATUS_TONE = { 已完成: 'success', 进行中: 'info', 未开始: 'neutral' } as const;

/** 项目详情样板：长流程对象的主辅结构，回款与合同并进辅区。 */
export function ProjectDetailPattern() {
  return (
    <>
      <SectionCard>
        <PageBreadcrumb items={[{ label: '首页', to: '/' }, { label: '项目管理', to: '/projects' }, { label: '项目详情' }]} />
        <ProcessOverview
          identifier={<IdentifierText value="XM-2026-0412" />}
          title="海淀智检中台升级"
          tags={(
            <>
              <StatusTag tone="info">执行中</StatusTag>
              <StatusTag tone="success">健康：正常</StatusTag>
              <StatusTag tone="warning">优先级：高</StatusTag>
            </>
          )}
          actions={<><Button size="small">导出档案</Button><Button type="primary" size="small">登记进展</Button></>}
          steps={STEPS}
          currentStep={1}
        />
        <MetricGrid
          items={[
            { key: 'progress', label: '交付进度', value: '42%', detail: '4 个里程碑完成 1 个' },
            { key: 'received', label: '已回款', value: <MoneyText value={186000} />, detail: '占合同 58%' },
            { key: 'effort', label: '已用工时', value: '155.5h', detail: '预算 200h' },
            { key: 'risk', label: '风险', value: '无', tone: 'success', detail: '最近 7 天无新增' },
          ]}
        />
        <SplitLayout>
          <SplitLayoutMain>
            <SectionCard title="里程碑" size="small" extra={<Button size="mini" type="text">全部节点</Button>}>
              <DataTable
                rowKey="key"
                data={MILESTONES}
                pagination={false}
                columns={[
                  { title: '节点', dataIndex: 'name' },
                  { title: '负责人', dataIndex: 'owner', width: 100 },
                  { title: '计划日期', dataIndex: 'plan', width: 120, render: (value: string) => <DateText value={value} /> },
                  { title: '实际完成', dataIndex: 'actual', width: 120, render: (value: string) => <DateText value={value} /> },
                  { title: '状态', dataIndex: 'status', width: 100, render: (value: keyof typeof STATUS_TONE) => <StatusTag tone={STATUS_TONE[value]}>{value}</StatusTag> },
                ]}
              />
            </SectionCard>
          </SplitLayoutMain>
          <SplitLayoutAside>
            <Space direction="vertical" size={12}>
              <SectionCard title="回款与合同" size="small">
                <PaymentProgress received={186000} total={320000} size="small" />
                <DescriptionsCard
                  bare
                  columns={1}
                  items={[
                    { key: 'contract', label: '合同编号', value: <IdentifierText value="HT202604001" maxWidth={180} /> },
                    { key: 'amount', label: '合同总额', value: <MoneyText value={320000} /> },
                    { key: 'period', label: '合同周期', value: <DateText value="2026-04-12" end="2026-08-30" /> },
                  ]}
                />
              </SectionCard>
              <SectionCard title="最近进展" size="small">
                <Space direction="vertical" size={6}>
                  <div className="ui-library-demo-caption">04-26 方案设计初稿已提交客户</div>
                  <div className="ui-library-demo-caption">04-22 第 1 期回款 ¥96,000 到账</div>
                  <div className="ui-library-demo-caption">04-19 需求确认会通过</div>
                </Space>
              </SectionCard>
            </Space>
          </SplitLayoutAside>
        </SplitLayout>
      </SectionCard>
      <CopyNotes
        copy={[
          '面包屑 + 详情页头 + 流程条 + 指标 + 主辅区的先后顺序',
          '辅区承载「回款与合同」「最近进展」，不重复主区字段',
          '里程碑表只放计划/实际/状态，不放工时明细',
          '主操作只有一个（登记进展），导出退到次操作',
        ]}
        skip={[
          '项目的 5 个阶段命名与里程碑口径',
          '回款比例与工时的业务算法',
          '线索、合同详情里的同名字段（各自页面负责）',
        ]}
      />
    </>
  );
}
