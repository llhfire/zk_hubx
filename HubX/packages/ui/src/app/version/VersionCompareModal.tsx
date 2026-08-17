import { Modal, Table, Tag, Typography } from '@arco-design/web-react';
import { useAppVersion } from './AppVersionContext';
import {
  DATA_SOURCE_LABELS,
  DATA_SOURCE_TAG_COLORS,
  VERSION_DESCRIPTIONS,
  VERSION_LABELS,
  VERSION_MODULES,
  type ModuleDataSource,
} from './versionMatrix';

const { Text } = Typography;

interface VersionCompareModalProps {
  visible: boolean;
  onCancel: () => void;
}

function dataSourceTag(source: ModuleDataSource) {
  return <Tag color={DATA_SOURCE_TAG_COLORS[source]} size="small">{DATA_SOURCE_LABELS[source]}</Tag>;
}

/** α/β 版本功能清单对比：点击侧边栏版本标识打开。 */
export function VersionCompareModal({ visible, onCancel }: VersionCompareModalProps) {
  const version = useAppVersion();

  const columns = [
    {
      title: '功能模块',
      dataIndex: 'module',
      width: 130,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    { title: '覆盖范围', dataIndex: 'scope' },
    {
      title: 'α版（纯前端）',
      dataIndex: 'alpha',
      width: 170,
      render: dataSourceTag,
    },
    {
      title: 'β版（前后端）',
      dataIndex: 'beta',
      width: 170,
      render: dataSourceTag,
    },
    { title: '说明', dataIndex: 'note', width: 220 },
  ];

  return (
    <Modal
      title="版本功能清单对比"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      style={{ width: 960, maxWidth: 'calc(100vw - 32px)' }}
    >
      <div style={{ marginBottom: 12 }}>
        <Tag color={version === 'beta' ? 'green' : 'arcoblue'}>当前版本：{VERSION_LABELS[version]}</Tag>
        <Text type="secondary" style={{ marginLeft: 8 }}>{VERSION_DESCRIPTIONS[version]}</Text>
      </div>
      <Table
        rowKey="module"
        size="small"
        pagination={false}
        columns={columns}
        data={VERSION_MODULES}
        scroll={{ y: 420 }}
      />
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        「Mock」为纯前端本地数据；「HTTP + D1」表示该域已接入 Cloudflare Workers 后端并持久化。详见 docs/ALPHA-BETA-ARCHITECTURE.md。
      </Text>
    </Modal>
  );
}
