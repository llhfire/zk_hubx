import {
  ApprovalFlow,
  Button,
  DescriptionsCard,
  IdentifierText,
  MetricGrid,
  MoneyText,
  PageBreadcrumb,
  ProcessOverview,
  PaymentPlanTable,
  SectionCard,
  Space,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
  type PaymentPlanTableRow,
} from '@/design-system';
import { CopyNotes } from './CopyNotes';

const PLAN: PaymentPlanTableRow[] = [
  { period: 1, periodName: '首付款', amount: 96000, percentage: 30, expectedDate: '2026-05-20', condition: '合同生效后 5 个工作日' },
  { period: 2, periodName: '第二期', amount: 128000, percentage: 40, expectedDate: '2026-07-20', condition: '方案设计确认后' },
  { period: 3, periodName: '验收款', amount: 96000, percentage: 30, expectedDate: '2026-09-10', condition: '客户验收通过后 10 个工作日' },
];

const PAID = { 1: '已收', 2: '待收', 3: '待收' } as const;

const NODES = [
  { key: 'submit', title: '商务发起', status: 'approved' as const, approver: '冯予安', time: '2026-03-10 09:20', comment: '合同条款已与客户确认' },
  { key: 'finance', title: '财务审核', status: 'approved' as const, approver: '罗总', time: '2026-03-11 14:05', comment: '回款计划与付款方式一致' },
  { key: 'gm', title: '总经理审批', status: 'approved' as const, approver: '陈总', time: '2026-03-12 10:40' },
  { key: 'archive', title: '用印归档', status: 'pending' as const, approver: '行政', note: '等待纸质合同回寄' },
];

/** 合同详情样板：版本、审批与回款计划的三段式排布。 */
export function ContractDetailPattern() {
  return (
    <>
      <SectionCard>
        <PageBreadcrumb items={[{ label: '首页', to: '/' }, { label: '合同管理', to: '/contracts' }, { label: '合同详情' }]} />
        <ProcessOverview
          identifier={<IdentifierText value="HT202604001" />}
          title="A公司CRM系统开发合同"
          tags={(
            <>
              <StatusTag tone="success">已归档</StatusTag>
              <StatusTag tone="info">履行中</StatusTag>
              <StatusTag tone="neutral">V2</StatusTag>
            </>
          )}
          actions={<><Button size="small">上传新版本</Button><Button type="primary" size="small">登记回款</Button></>}
        />
        <MetricGrid
          items={[
            { key: 'total', label: '合同总额', value: <MoneyText value={1200000} /> },
            { key: 'received', label: '已回款', value: <MoneyText value={480000} tone="success" />, detail: '到账率 40%' },
            { key: 'remaining', label: '待回款', value: <MoneyText value={720000} />, detail: '还有 2 期' },
            { key: 'version', label: '当前版本', value: 'V2', detail: '2026-03-20 生效' },
          ]}
        />
        <SplitLayout>
          <SplitLayoutMain>
            <Space direction="vertical" size={12}>
              <SectionCard title="回款计划" size="small">
                <PaymentPlanTable
                  data={PLAN}
                  showCondition
                  renderStatus={(row) => {
                    const label = PAID[row.period as 1 | 2 | 3];
                    return <StatusTag tone={label === '已收' ? 'success' : 'neutral'}>{label}</StatusTag>;
                  }}
                />
              </SectionCard>
              <SectionCard title="合同要点" size="small">
                <DescriptionsCard
                  bare
                  columns={2}
                  items={[
                    { key: 'entity', label: '我方主体', value: '中科软通' },
                    { key: 'customer', label: '客户名称', value: 'A科技公司' },
                    { key: 'pay', label: '付款方式', value: '对公转账' },
                    { key: 'sign', label: '签约日期', value: '2026-03-15' },
                    { key: 'scope', label: '交付范围', value: 'CRM 客户管理、销售流程、报表看板与移动端巡检', long: true },
                  ]}
                />
              </SectionCard>
            </Space>
          </SplitLayoutMain>
          <SplitLayoutAside>
            <SectionCard title="审批流" size="small">
              <ApprovalFlow nodes={NODES} />
            </SectionCard>
          </SplitLayoutAside>
        </SplitLayout>
      </SectionCard>
      <CopyNotes
        copy={[
          '页头同时表达「归档状态」和「履约状态」，两个 StatusTag 并排',
          '回款计划用 PaymentPlanTable，比例/触发条件按开关取舍',
          '审批流放辅区，节点与意见同列，不另开抽屉',
          '金额一律 MoneyText，版本号只显示 "V2" 不写描述',
        ]}
        skip={[
          '合同的审批节点顺序与审批人角色',
          '回款触发条件的文案',
          '合同的必填字段清单',
        ]}
      />
    </>
  );
}
