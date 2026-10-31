import {
  AlertBanner,
  DataTable,
  SectionCard,
  SectionTabs,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
} from '@/design-system';
import { BusinessDemos } from '../demos/BusinessDemos';
import { ChartDemos } from '../demos/ChartDemos';
import { DataDisplayDemos } from '../demos/DataDisplayDemos';
import { FeedbackDemos } from '../demos/FeedbackDemos';
import { LayoutDemos } from '../demos/LayoutDemos';
import { moduleRows } from '../data';

/** 主辅布局：长流程详情的 70:30 工作区，单独成一类，因为它决定整页结构。 */
function WorkspaceDemo() {
  return (
    <div className="ui-library-section-stack">
      <SectionCard title="主辅布局 SplitLayout" description="70:30 主工作区 + 业务过程区，15 处已用。">
        <div className="ui-library-preview">
          <SplitLayout>
            <SplitLayoutMain>
              <SectionCard title="主工作区">承载档案、明细表、任务或交付内容。</SectionCard>
            </SplitLayoutMain>
            <SplitLayoutAside>
              <SectionCard title="业务过程区">承载跟进、审批、回款和版本记录。</SectionCard>
            </SplitLayoutAside>
          </SplitLayout>
        </div>
        <div className="ui-library-demo-caption">主区 7、侧栏 3，间距 16。组件库内容区里大约 789 / 338，项目详情大约 813 / 348。视口 1200px 以下改成上下排，两栏都占满。</div>
      </SectionCard>
    </div>
  );
}

/** 组件目录：54 行导出清单，按分类可查代码位置。 */
function ModuleIndex() {
  return (
    <SectionCard title="设计系统组件目录" description="59 个值导出 / 54 行（SplitLayout 三名、三图标、confirmAction + ConfirmModal 各合一行、图表入口合为 Chart 一行）。">
      <DataTable
        rowKey="key"
        pagination={false}
        data={moduleRows}
        columns={[
          { title: '分类', dataIndex: 'category', width: 80 },
          { title: '组件', dataIndex: 'component', width: 220 },
          { title: '用途', dataIndex: 'purpose' },
          { title: '代码位置', dataIndex: 'source', render: (value: string) => <span className="ui-library-code-path">{value}</span> },
        ]}
      />
    </SectionCard>
  );
}

/**
 * 模块组件：由基础层组合出的可复用块。
 * 按「容器 / 展示（含图表）/ 反馈 / 业务 / 布局」分组，一组一个页签，避免几十个实样串成一屏。
 */
export interface ModulesPanelProps {
  group: string;
  onGroupChange: (group: string) => void;
}

export function ModulesPanel({ group, onGroupChange }: ModulesPanelProps) {
  return (
    <div className="ui-library-section-stack">
      <AlertBanner tone="info">
        每个从 <span className="ui-library-code-path">@/design-system</span> 导出的组合件都在下面有真实渲染。
        页面里出现同类结构的第二份实现即违规；目录页签可查代码位置。
      </AlertBanner>
      <SectionTabs
        size="small"
        activeKey={group}
        onChange={onGroupChange}
        items={[
          { key: 'layout', label: '容器与导航', count: 5, content: <LayoutDemos /> },
          { key: 'display', label: '表格与展示', count: 7, content: <><DataDisplayDemos /><ChartDemos /></> },
          { key: 'feedback', label: '反馈与确认', count: 3, content: <FeedbackDemos /> },
          { key: 'business', label: '业务区块', count: 15, content: <BusinessDemos /> },
          { key: 'workspace', label: '主辅布局', count: 1, content: <WorkspaceDemo /> },
          { key: 'index', label: '组件目录', count: 54, content: <ModuleIndex /> },
        ]}
      />
    </div>
  );
}
