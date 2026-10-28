import { useState } from 'react';
import {
  Button,
  DateText,
  DescriptionsCard,
  IdentifierText,
  MetricGrid,
  MoneyText,
  PageBreadcrumb,
  ProcessOverview,
  SectionCard,
  SectionTabs,
  Space,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
  ProgressBar,
} from '@/design-system';
import { FrameShell, FrameSlot } from './FrameSlot';

const STEPS = [
  { key: 'sign', title: '合同签订' },
  { key: 'design', title: '方案设计', description: '进行中' },
  { key: 'dev', title: '开发实施' },
  { key: 'accept', title: '客户验收' },
  { key: 'close', title: '结项归档' },
];

/**
 * 长流程详情框架：周期长、多人协作、四个阶段以上对象的固定骨架。
 * 适用：线索详情、项目详情、合同详情。
 */
export function DetailFlowFrame() {
  const [tab, setTab] = useState('basic');

  return (
    <SectionCard
      title="长流程详情框架"
      description="六段结构：面包屑、页头与流程条、指标、主辅区、分区页签、业务过程。判断标准是「这个对象会不会被反复回访」。"
    >
      <FrameShell>
        <FrameSlot index={1} label="面包屑 PageBreadcrumb：二级及以上页面必须有" />
        <PageBreadcrumb items={[{ label: '首页', to: '/' }, { label: '项目管理', to: '/projects' }, { label: '项目详情' }]} />

        <FrameSlot index={2} label="页头与流程条 ProcessOverview：身份、标签、操作、阶段合成一块，全站详情页的主力形态" />
        <ProcessOverview
          identifier={<IdentifierText value="XM-2026-0412" />}
          title="海淀智检中台升级"
          tags={(
            <>
              <StatusTag tone="info">执行中</StatusTag>
              <StatusTag tone="success">健康：正常</StatusTag>
            </>
          )}
          actions={<><Button size="small">导出</Button><Button type="primary" size="small">登记进展</Button></>}
          steps={STEPS}
          currentStep={1}
        />

        <FrameSlot index={3} label="指标 MetricGrid：4 项摘要，最多两行" />
        <MetricGrid
          items={[
            { key: 'progress', label: '交付进度', value: '42%', detail: <ProgressBar percent={42} showValue={false} /> },
            { key: 'payment', label: '已回款', value: <MoneyText value={186000} />, detail: '占合同 58%' },
            { key: 'effort', label: '已用工时', value: '155.5h', detail: '预算 200h' },
            { key: 'risk', label: '风险', value: '无', tone: 'success' },
          ]}
        />

        <FrameSlot index={4} label="主辅区 SplitLayout：主区放档案与明细，辅区放业务过程" />
        <SplitLayout>
          <SplitLayoutMain>
            <FrameSlot index={5} label="分区页签 SectionTabs + 字段区 DescriptionsCard" />
            <SectionTabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: 'basic',
                  label: '基础档案',
                  content: (
                    <DescriptionsCard
                      columns={2}
                      items={[
                        { key: 'customer', label: '客户名称', value: '海淀智检科技有限公司' },
                        { key: 'entity', label: '签约主体', value: '中科软通' },
                        { key: 'period', label: '项目周期', value: <DateText value="2026-04-12" end="2026-08-30" /> },
                        { key: 'owner', label: '项目经理', value: '秦知遥' },
                        { key: 'amount', label: '合同金额', value: <MoneyText value={320000} /> },
                        { key: 'scope', label: '交付范围', value: '数据接入、规则引擎、移动巡检、报表看板', long: true },
                      ]}
                    />
                  ),
                },
                { key: 'tasks', label: '任务', count: 12, content: <div className="ui-library-demo-caption">任务区由 TaskList 承载。</div> },
                { key: 'files', label: '资料', count: 5, content: <div className="ui-library-demo-caption">资料区由 FileList 承载。</div> },
              ]}
            />
          </SplitLayoutMain>
          <SplitLayoutAside>
            <FrameSlot index={6} label="业务过程区：跟进、审批、回款、版本记录" />
            <SectionCard title="业务过程" size="small">
              <Space direction="vertical" size={8}>
                <StatusTag tone="info">跟进：2026-04-26 电话回访</StatusTag>
                <StatusTag tone="warning">审批：合同补充协议待总经理确认</StatusTag>
                <StatusTag tone="success">回款：第 1 期 ¥96,000 已收</StatusTag>
              </Space>
            </SectionCard>
          </SplitLayoutAside>
        </SplitLayout>
      </FrameShell>
      <div className="ui-library-demo-caption">
        参照实现：`/projects/13`、`/leads/1`、`/contracts/1`、`/customers/1`。辅区不做成卡片列表，一律放业务过程记录。
        没有阶段流程条的对象（例如合同成本明细 `/finance/contract-cost/:id`）把槽位 2 换成轻变体
        `DetailHeader`（返回 + 标题 + 状态），不要两块叠着放 —— 页头叠两次是重复外壳。
        视口 1200px 以下主辅区自动上下排，这是 SplitLayout 的断点，不是骨架走样。
      </div>
    </SectionCard>
  );
}
