import { useState } from 'react';
import {
  Button,
  DataTable,
  DateText,
  IconDownload,
  MetricGrid,
  MoneyText,
  PageHeader,
  ProgressBar,
  SectionCard,
  SectionTabs,
  StatusTag,
} from '@/design-system';
import { CopyNotes } from './CopyNotes';

interface DemoCost {
  key: string;
  contract: string;
  owner: string;
  amount: number;
  received: number;
  cost: number;
  month: string;
}

const COSTS: DemoCost[] = [
  { key: 'f1', contract: '企业管理系统开发合同', owner: '秦知遥', amount: 1200000, received: 480000, cost: 460000, month: '2026-04' },
  { key: 'f2', contract: '云服务平台建设合同', owner: '冯予安', amount: 860000, received: 602000, cost: 318000, month: '2026-04' },
  { key: 'f3', contract: '协作工具定制开发合同', owner: '唐屿川', amount: 520000, received: 260000, cost: 201000, month: '2026-04' },
  { key: 'f4', contract: 'A公司CRM系统开发合同', owner: '秦知遥', amount: 1200000, received: 480000, cost: 512000, month: '2026-03' },
];

/** 财务报表样板：指标 + 页签 + 明细表，不用图表承载主信息。 */
export function FinanceReportPattern() {
  const [tab, setTab] = useState('contract');

  return (
    <>
      <SectionCard>
        <PageHeader
          title="财务统计"
          description="统一查看合同回款、成本利润与运营费用，支持从汇总指标穿透到单据明细。"
          actions={<Button icon={<IconDownload />}>导出报表</Button>}
        />
        <MetricGrid
          items={[
            { key: 'total', label: '合同总额', value: <MoneyText value={2850000} variant="compact" />, detail: '4 份合同' },
            { key: 'received', label: '到账金额', value: <MoneyText value={1905000} variant="compact" tone="success" />, detail: '回款率 66.8%' },
            { key: 'remaining', label: '待收款', value: <MoneyText value={945000} variant="compact" />, detail: '需持续跟进回款计划', tone: 'warning' },
            { key: 'cost', label: '成本总额', value: <MoneyText value={1640000} variant="compact" />, detail: '利润率 42.5%' },
          ]}
        />
        <SectionTabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'contract',
              label: '合同统计',
              content: (
                <DataTable
                  rowKey="key"
                  data={COSTS}
                  pagination={false}
                  caption="共 4 条，按月份倒序"
                  columns={[
                    { title: '合同名称', dataIndex: 'contract' },
                    { title: '负责人', dataIndex: 'owner', width: 100 },
                    { title: '合同金额', dataIndex: 'amount', width: 130, render: (value: number) => <MoneyText value={value} variant="compact" /> },
                    { title: '已回款', dataIndex: 'received', width: 120, render: (value: number) => <MoneyText value={value} variant="compact" tone="success" /> },
                    {
                      title: '回款进度',
                      width: 160,
                      render: (_: unknown, row: DemoCost) => <ProgressBar percent={Math.round((row.received / row.amount) * 100)} size="small" showValue={false} />,
                    },
                    { title: '成本', dataIndex: 'cost', width: 120, render: (value: number) => <MoneyText value={value} variant="compact" /> },
                    { title: '月份', dataIndex: 'month', width: 100, render: (value: string) => <DateText value={value} /> },
                  ]}
                />
              ),
            },
            {
              key: 'ops',
              label: '运营成本',
              content: (
                <DataTable
                  rowKey="key"
                  data={[
                    { key: 'o1', name: '办公场地', amount: 128000, note: '4 月租金与物业' },
                    { key: 'o2', name: '差旅', amount: 46600, note: '含 3 次客户拜访' },
                    { key: 'o3', name: '推广费用', amount: 82000, note: '线索投放' },
                  ]}
                  pagination={false}
                  columns={[
                    { title: '费用类别', dataIndex: 'name' },
                    { title: '金额', dataIndex: 'amount', width: 140, render: (value: number) => <MoneyText value={value} variant="compact" /> },
                    { title: '说明', dataIndex: 'note' },
                    { title: '状态', width: 100, render: () => <StatusTag tone="success">已入账</StatusTag> },
                  ]}
                />
              ),
            },
          ]}
        />
      </SectionCard>
      <CopyNotes
        copy={[
          '指标四联：总额、到账、待收、成本，利润写在成本卡的说明里',
          '金额列统一右对齐语义的 MoneyText，比例另开进度列',
          '页签按「合同统计 / 运营成本」切，不按月份切（月份是筛选）',
          '导出放页头次操作，不放表格工具栏',
        ]}
        skip={[
          '财务口径（回款率、利润率的算式）',
          '成本科目与费用分类的对应关系',
          '月度切割规则',
        ]}
      />
    </>
  );
}
