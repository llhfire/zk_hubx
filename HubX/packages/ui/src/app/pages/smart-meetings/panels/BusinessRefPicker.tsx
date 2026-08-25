/**
 * 业务引用选择器
 *
 * 设计规约见 smart-meetings-ui-design.md §4.3/§4.6：
 * - 四类 Tab: lead / contract / project / case
 * - 目录搜索选择，只读不写业务对象，不允许手输编号
 * - 输出 BusinessRef{kind, id, displaySnapshot, savedAsView}
 */

import { useState, useMemo } from 'react';
import { Tabs, Input, List, Tag, Empty } from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';
import type { BusinessRef, RefKind } from '../types';

const { TabPane } = Tabs;

/** 业务目录条目（简化版，供选择用） */
interface CatalogItem {
  id: string;
  label: string;
  sublabel?: string;
}

/** 四类 Tab 配置 */
const REF_TABS: Array<{ kind: RefKind; label: string }> = [
  { kind: 'lead', label: '线索' },
  { kind: 'contract', label: '合同' },
  { kind: 'project', label: '项目' },
  { kind: 'case', label: '业务单' },
];

/** 模拟业务目录（α 阶段用静态数据） */
const MOCK_CATALOG: Record<RefKind, CatalogItem[]> = {
  lead: [
    { id: 'lead-001', label: '阿里巴巴-企业管理系统', sublabel: 'L-001' },
    { id: 'lead-002', label: '腾讯-云服务平台', sublabel: 'L-002' },
    { id: 'lead-003', label: '字节跳动-在线教育', sublabel: 'L-003' },
  ],
  contract: [
    { id: 'contract-001', label: '阿里巴巴-企业管理系统', sublabel: 'HT-2026-001' },
    { id: 'contract-003', label: '字节跳动-在线教育平台', sublabel: 'HT-2026-003' },
  ],
  project: [
    { id: 'project-001', label: '企业内部管理系统', sublabel: 'PRJ-001' },
    { id: 'project-003', label: '在线教育平台', sublabel: 'PRJ-003' },
  ],
  case: [
    { id: 'case-001', label: 'CASE-2026-07-01-001', sublabel: '阿里巴巴' },
    { id: 'case-003', label: 'CASE-2026-06-20-003', sublabel: '字节跳动' },
  ],
};

interface BusinessRefPickerProps {
  /** 已选引用（用于去重） */
  selected?: BusinessRef[];
  /** 选择回调 */
  onSelect: (ref: BusinessRef) => void;
  /** 占位文案 */
  placeholder?: string;
}

export function BusinessRefPicker({ selected = [], onSelect, placeholder = '+ 添加项目...' }: BusinessRefPickerProps) {
  const [activeKind, setActiveKind] = useState<RefKind>('lead');
  const [keyword, setKeyword] = useState('');

  const selectedIds = useMemo(() => new Set(selected.map((r) => `${r.kind}:${r.id}`)), [selected]);

  const filteredItems = useMemo(() => {
    const items = MOCK_CATALOG[activeKind] ?? [];
    if (!keyword.trim()) return items;
    const lower = keyword.toLowerCase();
    return items.filter(
      (item) => item.label.toLowerCase().includes(lower) || (item.sublabel ?? '').toLowerCase().includes(lower),
    );
  }, [activeKind, keyword]);

  const handleSelect = (item: CatalogItem) => {
    const ref: BusinessRef = {
      kind: activeKind,
      id: item.id,
      displaySnapshot: item.label,
      savedAsView: '默认',
    };
    onSelect(ref);
  };

  return (
    <div style={{ border: '1px solid var(--grey-200)', borderRadius: 8, overflow: 'hidden' }}>
      <Tabs
        activeTab={activeKind}
        onChange={(k) => {
          setActiveKind(k as RefKind);
          setKeyword('');
        }}
        size="small"
        style={{ padding: '0 8px' }}
      >
        {REF_TABS.map((tab) => (
          <TabPane key={tab.kind} title={tab.label} />
        ))}
      </Tabs>

      <div style={{ padding: '8px 12px' }}>
        <Input
          prefix={<IconSearch style={{ color: 'var(--grey-400)' }} />}
          placeholder={`搜索${REF_TABS.find((t) => t.kind === activeKind)?.label ?? ''}...`}
          value={keyword}
          onChange={setKeyword}
          size="small"
          allowClear
          style={{ marginBottom: 8 }}
        />

        {filteredItems.length === 0 ? (
          <Empty description="暂无数据" style={{ padding: '16px 0' }} />
        ) : (
          <List
            size="small"
            dataSource={filteredItems}
            render={(item) => {
              const key = `${activeKind}:${item.id}`;
              const isSelected = selectedIds.has(key);
              return (
                <List.Item
                  key={item.id}
                  style={{
                    cursor: isSelected ? 'default' : 'pointer',
                    opacity: isSelected ? 0.5 : 1,
                    padding: '6px 0',
                  }}
                  onClick={() => !isSelected && handleSelect(item)}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                    {item.sublabel && (
                      <Tag size="small" style={{ marginLeft: 8 }}>
                        {item.sublabel}
                      </Tag>
                    )}
                  </div>
                  {isSelected && <Tag color="green" size="small">已选</Tag>}
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
