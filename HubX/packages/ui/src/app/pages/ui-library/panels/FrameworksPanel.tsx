import { AlertBanner, SectionTabs } from '@/design-system';
import { DetailFlowFrame } from './frameworks/DetailFlowFrame';
import { ListPageFrame } from './frameworks/ListPageFrame';
import { SettingsFrame } from './frameworks/SettingsFrame';
import { WorkbenchFrame } from './frameworks/WorkbenchFrame';

export interface FrameworksPanelProps {
  group: string;
  onGroupChange: (group: string) => void;
}

/**
 * 页面框架：可运行的骨架，不是文字清单。
 * 骨架用假数据搭，只演示结构与槽位；真实页面参照写在各骨架下方。
 */
export function FrameworksPanel({ group, onGroupChange }: FrameworksPanelProps) {
  return (
    <div className="ui-library-section-stack">
      <AlertBanner tone="info">
        下面是可运行的页面骨架，都用假数据搭。骨架用来判断「结构对不对」，不是可复制的页面：
        真实页面的字段、权限和取数都在业务目录里，复制骨架里的假数据等于制造第二份实现。
      </AlertBanner>
      <SectionTabs
        size="small"
        activeKey={group}
        onChange={onGroupChange}
        items={[
          { key: 'list', label: '列表页', count: 5, content: <ListPageFrame /> },
          { key: 'detail', label: '长流程详情', count: 6, content: <DetailFlowFrame /> },
          { key: 'workbench', label: '工作台', count: 4, content: <WorkbenchFrame /> },
          { key: 'settings', label: '配置设置页', count: 4, content: <SettingsFrame /> },
        ]}
      />
    </div>
  );
}
