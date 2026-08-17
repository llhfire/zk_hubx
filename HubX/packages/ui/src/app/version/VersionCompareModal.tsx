import { useEffect, useState } from 'react';
import { Button, Checkbox, Modal, Table, Tag, Tooltip, Typography } from '@arco-design/web-react';
import { useAppVersion } from './AppVersionContext';
import {
  DATA_SOURCE_LABELS,
  DATA_SOURCE_TAG_COLORS,
  VERSION_DESCRIPTIONS,
  VERSION_LABELS,
  VERSION_MODULES,
  VERSION_TAG_COLORS,
  VERSION_URLS,
  ALPHA_CHECKLIST_ITEMS,
  loadAlphaChecklist,
  saveAlphaChecklist,
  toggleAlphaChecklist,
  type AlphaChecklistItem,
  type AppVersion,
  type ModuleDataSource,
} from './versionMatrix';
import './versionCompareModal.css';

const { Text } = Typography;

interface VersionCompareModalProps {
  visible: boolean;
  onCancel: () => void;
}

function dataSourceTag(source: ModuleDataSource) {
  return <Tag color={DATA_SOURCE_TAG_COLORS[source]} size="small">{DATA_SOURCE_LABELS[source]}</Tag>;
}

/** α/β 版本功能清单对比：点击侧边栏版本标识打开，全屏展示。 */
export function VersionCompareModal({ visible, onCancel }: VersionCompareModalProps) {
  const version = useAppVersion();
  // α版检查项：优先读写 dev server 的配置文档（alphaChecklist.config.json），无端点时回退 localStorage
  const [alphaChecked, setAlphaChecked] = useState<string[]>([]);

  useEffect(() => {
    if (visible) void loadAlphaChecklist().then(setAlphaChecked);
  }, [visible]);

  const handleToggleAlpha = (module: string, item: AlphaChecklistItem) => {
    setAlphaChecked(current => {
      const next = toggleAlphaChecklist(current, module, item);
      void saveAlphaChecklist(next);
      return next;
    });
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      dataIndex: 'module',
      width: 64,
      align: 'center' as const,
      render: (_: string, __: unknown, index: number) => <Text>{index + 1}</Text>,
    },
    {
      title: '功能模块',
      key: 'module',
      dataIndex: 'module',
      width: 150,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    { title: '覆盖范围', dataIndex: 'scope' },
    {
      title: '计划（未实施）',
      dataIndex: 'planned',
      width: 260,
      render: (planned: string[]) => planned.length
        ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {planned.map(item => <Tag key={item} color="purple" size="small">{item}</Tag>)}
          </div>
        )
        : <Text type="secondary">-</Text>,
    },
    {
      title: 'α版',
      key: 'alpha',
      dataIndex: 'module',
      width: 170,
      render: (module: string) => (
        <Tooltip content="逐项勾选 α 版完成情况（页面场景/功能流程/UX 优化），α版本地会保存到配置文档">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            {ALPHA_CHECKLIST_ITEMS.map(item => (
              <Checkbox
                key={item}
                checked={alphaChecked.includes(`${module}::${item}`)}
                onChange={() => handleToggleAlpha(module, item as AlphaChecklistItem)}
              >
                <span style={{ fontSize: 12 }}>{item}</span>
              </Checkbox>
            ))}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'β版（前后端）',
      dataIndex: 'beta',
      width: 180,
      render: dataSourceTag,
    },
    { title: '说明', dataIndex: 'note', width: 240 },
  ];

  return (
    <Modal
      title="版本功能清单对比"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      alignCenter={false}
      focusLock={false}
      className="version-compare-modal"
      style={{ width: '100vw', maxWidth: '100vw', top: 0, height: '100vh', margin: 0, borderRadius: 0 }}
    >
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Tag color={VERSION_TAG_COLORS[version]}>当前版本：{VERSION_LABELS[version]}</Tag>
        <Text type="secondary">{VERSION_DESCRIPTIONS[version]}</Text>
      </div>
      {/* 线上地址与跳转入口 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Text style={{ fontSize: 12, color: 'var(--grey-500)' }}>线上地址</Text>
        {(['alpha', 'beta'] as AppVersion[]).map(item => (
          <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Tag color={VERSION_TAG_COLORS[item]} size="small">
              {VERSION_LABELS[item]}
              {item === version ? ' · 当前' : ''}
            </Tag>
            <Text copyable style={{ fontSize: 12 }}>{VERSION_URLS[item]}</Text>
            <Tooltip content="新窗口打开">
              <Button
                size="mini"
                type="outline"
                href={VERSION_URLS[item]}
                target="_blank"
                style={item === version ? { color: `var(${item === 'beta' ? '--green-6' : '--arcoblue-6'})`, borderColor: `var(${item === 'beta' ? '--green-6' : '--arcoblue-6'})` } : undefined}
              >
                跳转
              </Button>
            </Tooltip>
          </span>
        ))}
      </div>
      <Table
        rowKey="module"
        size="default"
        pagination={false}
        columns={columns}
        data={VERSION_MODULES}
        scroll={{ x: 1340 }}
      />
      <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
        「Mock」为纯前端本地数据；「HTTP + D1」表示该域已接入 Cloudflare Workers 后端并持久化。详见 docs/ALPHA-BETA-ARCHITECTURE.md。
      </Text>
    </Modal>
  );
}
