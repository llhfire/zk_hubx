import { useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Card, Input, Message, Modal, Space, Tag, Tree, Typography } from '@arco-design/web-react';
import { CATEGORY_SEED } from './categorySeed';
import {
  getSnapshot,
  renameSecondary,
  saveExtraSecondary,
  setCategorySeedLoader,
  subscribe,
} from './expenseCategoryStore';

const { Text } = Typography;

setCategorySeedLoader(() => CATEGORY_SEED);

export function CategoryTab() {
  const categories = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [modalMode, setModalMode] = useState<'add' | 'rename' | null>(null);
  const [draftName, setDraftName] = useState('');

  const selected = useMemo(() => {
    for (const primary of categories) {
      if (primary.id === selectedKey) return { primary, secondary: undefined };
      const secondary = primary.children?.find(child => child.id === selectedKey);
      if (secondary) return { primary, secondary };
    }
    return undefined;
  }, [categories, selectedKey]);

  const treeData = categories.map(primary => ({
    key: primary.id,
    title: primary.id === 'LABOR' ? (
      <Space size={8}>
        <span>{primary.name}</span>
        <Tag color="red" size="small">只读</Tag>
      </Space>
    ) : primary.name,
    children: (primary.children ?? []).map(secondary => ({ key: secondary.id, title: secondary.name })),
  }));

  const openAdd = () => {
    if (!selected || selected.secondary || selected.primary.id === 'LABOR') return;
    setDraftName('');
    setModalMode('add');
  };

  const openRename = () => {
    if (!selected?.secondary || selected.primary.id === 'LABOR') return;
    setDraftName(selected.secondary.name);
    setModalMode('rename');
  };

  const save = () => {
    const name = draftName.trim();
    if (!selected || !name) {
      Message.warning('请输入科目名称');
      return;
    }
    if (modalMode === 'add') {
      saveExtraSecondary(selected.primary.id, {
        id: `${selected.primary.id}-${Date.now()}`,
        name,
      });
      Message.success('二级科目已新增');
    } else if (modalMode === 'rename' && selected.secondary) {
      renameSecondary(selected.secondary.id, name);
      Message.success('科目名称已更新');
    }
    setModalMode(null);
  };

  return (
    <Card
      title="费用科目树"
      extra={(
        <Space>
          <Button size="small" disabled={!selected || Boolean(selected.secondary) || selected.primary.id === 'LABOR'} onClick={openAdd}>
            新增子科目
          </Button>
          <Button size="small" type="primary" disabled={!selected?.secondary || selected.primary.id === 'LABOR'} onClick={openRename}>
            重命名
          </Button>
        </Space>
      )}
    >
      <Tree
        blockNode
        defaultExpandAll
        treeData={treeData}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelect={(keys) => setSelectedKey(keys[0] ? String(keys[0]) : undefined)}
      />
      <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: 'block' }}>
        选择一级科目可新增子科目；选择二级科目可重命名。人力成本为系统内置科目，不允许修改。
      </Text>

      <Modal
        title={modalMode === 'add' ? `新增子科目 · ${selected?.primary.name ?? ''}` : '重命名科目'}
        visible={Boolean(modalMode)}
        onOk={save}
        onCancel={() => setModalMode(null)}
      >
        <Input value={draftName} onChange={setDraftName} placeholder="请输入科目名称" maxLength={30} showWordLimit />
      </Modal>
    </Card>
  );
}
