import { PageHeader, PageShell, SectionTabs, StatusTag } from '@/design-system';
import { FoundationPanel } from './panels/FoundationPanel';
import { FrameworksPanel } from './panels/FrameworksPanel';
import { ModulesPanel } from './panels/ModulesPanel';
import { PatternsPanel } from './panels/PatternsPanel';
import { useLibraryTabs } from './useLibraryTabs';
import './UiComponentLibraryPage.css';

/**
 * UI 组件库：四层粒度，一层一个页签。
 *
 * 基础 UI   单一值与录入控件（原子字典）
 * 模块组件  由原子组合出的可复用块，组内再分组
 * 页面框架  可直接看的页面骨架
 * 业务样板  真实页面切片，附复制边界
 *
 * 新增组件时：先归到对应层的分组里，再补实样与目录行。
 * 页签位置写进 hash（`#modules/display`），刷新与分享都能落回同一处。
 */
export function UiComponentLibraryPage() {
  const { activeTab, setActiveTab, groupOf, setGroup } = useLibraryTabs('foundation', {
    foundation: 'values',
    modules: 'layout',
    frameworks: 'list',
    patterns: 'lead',
  });

  return (
    <PageShell className="ui-library-page">
      <PageHeader
        title="UI 组件库"
        description="按「值 → 组合块 → 页面骨架 → 业务样板」四层组织。开发与检查页面时，先在这里确认可复用能力，再决定是取用还是补组件。"
        actions={<StatusTag tone="info">HubX Design System</StatusTag>}
      />
      <SectionTabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="default"
        items={[
          {
            key: 'foundation',
            label: '基础 UI',
            content: (
              <FoundationPanel
                group={groupOf('foundation', 'values')}
                onGroupChange={(next) => setGroup('foundation', next)}
              />
            ),
          },
          {
            key: 'modules',
            label: '模块组件',
            content: (
              <ModulesPanel
                group={groupOf('modules', 'layout')}
                onGroupChange={(next) => setGroup('modules', next)}
              />
            ),
          },
          {
            key: 'frameworks',
            label: '页面框架',
            content: (
              <FrameworksPanel
                group={groupOf('frameworks', 'list')}
                onGroupChange={(next) => setGroup('frameworks', next)}
              />
            ),
          },
          {
            key: 'patterns',
            label: '业务样板',
            content: (
              <PatternsPanel
                group={groupOf('patterns', 'lead')}
                onGroupChange={(next) => setGroup('patterns', next)}
              />
            ),
          },
        ]}
      />
    </PageShell>
  );
}
