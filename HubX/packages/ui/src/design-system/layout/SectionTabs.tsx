import { Tabs } from '@arco-design/web-react';
import { useState, type ReactNode } from 'react';
import type { StatusTone } from '../primitives/StatusTag';
import '../components.css';

export interface SectionTabItem {
  key: string;
  label: ReactNode;
  count?: number;
  /**
   * 计数的语义色。留空＝中性灰（普通数量）；逾期、超时等需要强调的数量传 `danger` / `warning`。
   *
   * 页面不要自己拼彩色计数徽标：同一份「数字 + 状态色」曾在线索、项目、报价三处各写一遍，
   * 颜色值还硬编码在 JSX 里。
   */
  countTone?: StatusTone;
  disabled?: boolean;
  content?: ReactNode;
}

export interface SectionTabsProps {
  items: SectionTabItem[];
  /** 受控：当前页签。与 `defaultActiveKey` 二选一。 */
  activeKey?: string;
  /** 非受控：初始页签。页面内部不需要读取页签位置时用它，避免为了一个页签引入 useState。 */
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  size?: 'small' | 'default' | 'large';
  /**
   * 页签形态。
   * - `line`（默认）：页面级分区，下划线激活态，用于页头下方的一级/二级分区。
   * - `card`：密集面板内的分组（详情页侧栏、多页签工作区），卡片激活态，宽度更紧凑。
   *
   * 只开放这两种：Arco 还有 `card-gutter` / `text` / `capsule` 等形态，不在产品语汇里，
   * 需要时先在设计系统里评估，不要在页面里直写 `type`。
   */
  variant?: 'line' | 'card';
  className?: string;
}

/**
 * 页面级分区页签：统一激活态、数量表达和横向收缩行为。
 * 它不是 Arco Tabs 的透传薄壳；页面不再自行拼「页签 + 数量」的视觉组合。
 */
export function SectionTabs({ items, activeKey, defaultActiveKey, onChange, size = 'small', variant = 'line', className }: SectionTabsProps) {
  const fallback = defaultActiveKey ?? items[0]?.key ?? '';
  const [innerKey, setInnerKey] = useState(fallback);
  const currentKey = activeKey ?? innerKey;
  const handleChange = (key: string) => {
    if (activeKey === undefined) setInnerKey(key);
    onChange?.(key);
  };

  return (
    <Tabs
      activeTab={currentKey}
      onChange={handleChange}
      size={size}
      type={variant}
      className={['hubx-section-tabs', `hubx-section-tabs--${variant}`, className].filter(Boolean).join(' ')}
    >
      {items.map((item) => (
        <Tabs.TabPane
          key={item.key}
          disabled={item.disabled}
          title={(
            <span className="hubx-section-tabs__title">
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={[
                    'hubx-section-tabs__count',
                    item.countTone && `hubx-section-tabs__count--${item.countTone}`,
                  ].filter(Boolean).join(' ')}
                >
                  {item.count}
                </span>
              )}
            </span>
          )}
        >
          {item.content}
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
}
