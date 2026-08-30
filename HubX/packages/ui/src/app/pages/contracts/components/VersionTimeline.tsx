import { Card, Empty, Tag, Timeline, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router';
import { Button } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import type { Contract, ContractVersion } from '../types';

const Text = Typography.Text;

interface Props {
  contract: Contract;
  selectedVersionNo: string | null;
  onSelectVersion: (versionNo: string) => void;
  onCreateVersion?: () => void;
}

export function VersionTimeline({ contract, selectedVersionNo, onSelectVersion, onCreateVersion }: Props) {
  const navigate = useNavigate();
  const versions = contract.versionHistory;
  const createButton = onCreateVersion ? (
    <Button type="primary" size="small" icon={<IconPlus />} onClick={onCreateVersion}>
      创建新版本
    </Button>
  ) : null;

  if (versions.length === 0) {
    return (
      <Card title="版本历史" extra={createButton}>
        <Empty description="暂无版本记录" />
      </Card>
    );
  }

  // 倒序展示，最近版本在最前
  const ordered = [...versions].reverse();

  return (
    <Card title={`版本历史（共 ${versions.length} 版）`} extra={createButton}>
      <Timeline>
        {ordered.map((v) => (
          <Timeline.Item key={v.versionNo}>
            <VersionEntry
              version={v}
              isApproved={v.versionNo === contract.approvedVersionNo}
              isSelected={v.versionNo === selectedVersionNo}
              onSelect={() => onSelectVersion(v.versionNo)}
              onCopy={() => {
                navigate(`/contracts/${contract.id}/edit`, {
                  state: { baseVersionNo: v.versionNo, createNewVersion: true },
                });
              }}
            />
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
}

function VersionEntry({
  version,
  isApproved,
  isSelected,
  onSelect,
  onCopy,
}: {
  version: ContractVersion;
  isApproved: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 4,
        background: isSelected ? 'var(--color-fill-2)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text bold>{version.versionNo}</Text>
        {isApproved && <Tag color="green">已审批</Tag>}
        {isSelected && <Tag color="arcoblue">当前查看</Tag>}
      </div>
      <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginTop: 4 }}>
        {version.label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
        {version.createdAt} · {version.createdBy}
      </div>
      <div style={{ marginTop: 6 }}>
        <Button type="text" size="mini" onClick={onSelect} disabled={isSelected}>
          查看此版本
        </Button>
        <Button type="text" size="mini" onClick={onCopy}>
          基于此版本编辑
        </Button>
      </div>
    </div>
  );
}
