import {
  AlertBanner,
  Button,
  DataTable,
  EmptyState,
  IconPlus,
  MetricGrid,
  MoneyText,
  PageHeader,
  SectionCard,
  Space,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
} from '@/design-system';
import { FrameShell, FrameSlot } from './FrameSlot';

interface DemoTask {
  key: string;
  title: string;
  from: string;
  due: string;
  level: '紧急' | '常规';
}

const TASKS: DemoTask[] = [
  { key: 't1', title: '松澜供应链报价待复核', from: '报价审批', due: '今天 18:00', level: '紧急' },
  { key: 't2', title: '云栖园区合同盖章回寄', from: '合同管理', due: '明天 12:00', level: '常规' },
  { key: 't3', title: '海淀智检周报未提交', from: '日报', due: '04-28 20:00', level: '常规' },
];

/**
 * 工作台框架：一屏回答「今天该做什么」。
 * 适用：个人工作台、域驾驶舱。
 */
export function WorkbenchFrame() {
  return (
    <SectionCard
      title="工作台框架"
      description="四段结构：页头、指标、主区待办、辅区提醒与入口。判断标准是「这一页用来判断优先级，不是用来录入」。"
    >
      <FrameShell>
        <FrameSlot index={1} label="页头 PageHeader：标题 + 口径说明，一般不放主操作" />
        <PageHeader title="个人工作台" description="聚焦本人负责的待办、跟进和超时项；统计口径随筛选时间变化。" />

        <FrameSlot index={2} label="指标 MetricGrid：4–6 项，最多两行，点得进去" />
        <MetricGrid
          items={[
            { key: 'todo', label: '待办', value: 12, detail: '其中 3 条今日到期', tone: 'warning' },
            { key: 'follow', label: '待跟进线索', value: 8, detail: '超时 1 条', tone: 'danger' },
            { key: 'pay', label: '待回款', value: <MoneyText value={945000} variant="compact" /> },
            { key: 'done', label: '本周完成', value: 26, tone: 'success' },
          ]}
        />

        <FrameSlot index={3} label="主区待办清单：DataTable，操作列只放跳转与处理" />
        <SplitLayout>
          <SplitLayoutMain>
            <SectionCard title="我的待办" size="small" extra={<Button size="mini" type="text">全部待办</Button>}>
              <DataTable
                rowKey="key"
                data={TASKS}
                pagination={false}
                caption="共 12 条，按到期时间排序"
                columns={[
                  { title: '事项', dataIndex: 'title' },
                  { title: '来源', dataIndex: 'from', width: 110 },
                  { title: '到期', dataIndex: 'due', width: 130 },
                  {
                    title: '优先级',
                    dataIndex: 'level',
                    width: 90,
                    render: (value: DemoTask['level']) => <StatusTag tone={value === '紧急' ? 'danger' : 'neutral'}>{value}</StatusTag>,
                  },
                  { title: '操作', width: 90, fixed: 'right' as const, render: () => <Button type="text" size="small">处理</Button> },
                ]}
              />
            </SectionCard>
          </SplitLayoutMain>

          <SplitLayoutAside>
            <FrameSlot index={4} label="辅区：提醒 AlertBanner + 快捷入口，最多三块" />
            <Space direction="vertical" size={12}>
              <AlertBanner tone="warning" title="跟进时效预警">
                有 1 条线索已超时未跟进，建议今天内处理。
              </AlertBanner>
              <SectionCard title="快捷入口" size="small">
                <Space wrap>
                  <Button icon={<IconPlus />} size="small">新建线索</Button>
                  <Button size="small">登记跟进</Button>
                  <Button size="small">写日报</Button>
                </Space>
              </SectionCard>
              <SectionCard title="今日空档" size="small">
                <EmptyState description="今天没有安排拜访或会议。" />
              </SectionCard>
            </Space>
          </SplitLayoutAside>
        </SplitLayout>
      </FrameShell>
      <div className="ui-library-demo-caption">
        参照实现：`/workbench`、`/leads/my`。工作台不放假图表，指标只做计数与金额；需要趋势就跳到报表页。
        视口 1200px 以下主辅区自动上下排，这是 SplitLayout 的断点，不是骨架走样。
      </div>
    </SectionCard>
  );
}
