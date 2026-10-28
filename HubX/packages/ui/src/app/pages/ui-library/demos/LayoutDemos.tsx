import { useState } from 'react';
import {
  Button,
  DateText,
  DetailHeader,
  IconPlus,
  IdentifierText,
  PageBreadcrumb,
  PageHeader,
  ProcessOverview,
  SectionCard,
  SectionTabs,
  StatusTag,
} from '@/design-system';
import { librarySteps } from './fixtures';

export function LayoutDemos() {
  const [activeSectionTab, setActiveSectionTab] = useState('overview');

  return (
    <SectionCard title="骨架组件" description="页面外壳、页头、面包屑、区块卡片、详情页头与主辅布局。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">PageBreadcrumb</div>
        <PageBreadcrumb
          items={[
            { label: '首页', to: '/' },
            { label: '交付管理', to: '/projects' },
            { label: '项目详情' },
          ]}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">PageHeader — 普通页面页头</div>
        <PageHeader
          title="客户管理"
          description="标题、说明和主操作保持固定层级；一级页面不显示面包屑。"
          actions={<Button type="primary" icon={<IconPlus />}>新建客户</Button>}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">SectionTabs — 分区页签 + 数量 / 内容</div>
        <SectionTabs
          activeKey={activeSectionTab}
          onChange={setActiveSectionTab}
          items={[
            { key: 'overview', label: '概览', count: 12, content: <p>概览内容由页签承载，不在页面里重复拼页签样式。</p> },
            { key: 'pending', label: '待处理', count: 3, content: <p>待处理内容。</p> },
            { key: 'archived', label: '已归档', count: 0, content: <p>已归档内容。</p> },
          ]}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">DetailHeader — 详情页头（返回 / 标题 / 状态 / 单号 / 步骤 / 操作）</div>
        <DetailHeader
          title="海淀智检中台升级项目"
          onBack={() => undefined}
          status={<StatusTag tone="info">执行中</StatusTag>}
          identifier={<IdentifierText value="XM-2026-0412" />}
          meta={<><span>负责人：张三</span><DateText value="2026-04-12" end="2026-08-30" /></>}
          steps={<ProcessOverview title="业务步骤" steps={librarySteps} currentStep={2} />}
          actions={<><Button size="small">导出</Button><Button type="primary" size="small">登记进展</Button></>}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">SectionCard — 默认 / 紧凑 / 无描边 / 无内边距</div>
        <div className="ui-library-demo-grid">
          <SectionCard title="默认形态" extra={<Button size="mini" type="text">操作</Button>}>
            标题行右侧固定承载主操作（M-025）。
          </SectionCard>
          <SectionCard title="small 紧凑" size="small">侧栏、嵌套卡片等纵向紧张的位置。</SectionCard>
          <SectionCard title="bordered=false" bordered={false}>嵌进已有卡片时不再叠一层描边。</SectionCard>
        </div>
      </div>
    </SectionCard>
  );
}
