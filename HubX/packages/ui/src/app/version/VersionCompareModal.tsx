import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Modal,
  Radio,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconPlus } from '@arco-design/web-react/icon';
import { useAppVersion } from './AppVersionContext';
import {
  VERSION_DESCRIPTIONS,
  VERSION_LABELS,
  VERSION_TAG_COLORS,
  VERSION_URLS,
  type AppVersion,
} from './versionMatrix';
import {
  addModule,
  addPlannedItem,
  loadFeatureBoard,
  migrateAlphaChecklist,
  markAlphaUpdate,
  removePlannedItem,
  renamePlannedItem,
  saveFeatureBoard,
  setBetaDevStatus,
  setModuleNote,
  setPlannedStatus,
  toggleFeatureAlphaCheck,
  toggleProductionSwitch,
  ALPHA_CHECK_KEYS,
  BETA_DEV_STATUSES,
  DOMAIN_COLORS,
  PLANNED_STATUSES,
  type AlphaCheckKey,
  type BetaDevStatus,
  type Domain,
  type ExistingFeature,
  type FeatureBoard,
  type PlannedStatus,
  type BoardChangeType,
} from './featureBoardModel';
import { WorkLogPane } from './WorkLogPane';
import { loadWorkLog, saveWorkLog, type WorkLog } from './workLogModel';
import './versionCompareModal.css';

const { Text } = Typography;

/** 状态 -> Tag 颜色（计划项与β开发状态共用语义：越靠后越接近完成） */
/** 待设计功能状态→图标颜色（小圆点） */
const PLANNED_STATUS_DOT_COLORS: Record<PlannedStatus, string> = {
  '未开始': 'var(--color-text-4)',
  '已调研': 'var(--color-orange-6)',
  '设计中': 'var(--color-purple-6)',
  '已设计': 'var(--color-green-6)',
};

function StatusDot({ status }: { status: PlannedStatus }) {
  return (
    <Tooltip content={status}>
      <span
        className="feature-board-status-dot"
        style={{ background: PLANNED_STATUS_DOT_COLORS[status] }}
      />
    </Tooltip>
  );
}

const BETA_DEV_STATUS_COLORS: Record<BetaDevStatus, string> = {
  '未开始': 'gray',
  '编码中': 'orange',
  '测试中': 'purple',
  '测试通过': 'green',
};

/** 旧勾选存储 key（hubx-alpha-checklist-checked），首次打开时迁移到功能看板 */
const LEGACY_ALPHA_STORAGE_KEY = 'hubx-alpha-checklist-checked';

interface VersionCompareModalProps {
  visible: boolean;
  onCancel: () => void;
}

type BoardPane = 'board' | 'architecture' | 'tech' | 'log';

const FRAME_PANES: BoardPane[] = ['architecture', 'tech'];

/** α/β 版本功能看板场景：点击侧边栏版本标识打开，全屏展示。
 *  页签：功能看板 / 功能架构 / 技术架构 / 工作记录。
 *  看板事实源 featureBoard.config.json；工作记录事实源 workLog.config.json。 */
export function VersionCompareModal({ visible, onCancel }: VersionCompareModalProps) {
  const version = useAppVersion();
  const [pane, setPane] = useState<BoardPane>('board');
  const [board, setBoard] = useState<FeatureBoard>({ modules: [], alphaMeta: { updateCount: 0, lastUpdatedAt: '' } });
  const [workLog, setWorkLog] = useState<WorkLog>({ days: [] });
  // 备注列编辑态：模块名 -> 输入值
  const [noteEditing, setNoteEditing] = useState<{ module: string; value: string } | null>(null);
  // 计划项改名编辑态：模块名+原名 -> 输入值
  const [renameEditing, setRenameEditing] = useState<{ module: string; name: string; value: string } | null>(null);
  // 新增计划项：模块名 -> 输入值
  const [addingItem, setAddingItem] = useState<{ module: string; value: string } | null>(null);
  // 已有功能详情弹窗
  const [featureDetail, setFeatureDetail] = useState<{ module: string; feature: ExistingFeature } | null>(null);

  useEffect(() => {
    if (!visible) {
      setPane('board');
      return;
    }
    void loadFeatureBoard().then(loaded => {
      // 一次性迁移：旧 alphaChecklist 勾选（localStorage 字符串数组）合并进看板
      try {
        const legacy = localStorage.getItem(LEGACY_ALPHA_STORAGE_KEY);
        if (legacy) {
          const checked = JSON.parse(legacy);
          if (Array.isArray(checked) && checked.length) {
            const migrated = migrateAlphaChecklist(loaded, checked);
            setBoard(migrated);
            void saveFeatureBoard(migrated);
            localStorage.removeItem(LEGACY_ALPHA_STORAGE_KEY);
            return;
          }
        }
      } catch {
        // 迁移失败按原样加载
      }
      setBoard(loaded);
    });
    void loadWorkLog().then(setWorkLog);
  }, [visible]);

  const update = (next: FeatureBoard, changeType: BoardChangeType = 'planned') => {
    const persisted = changeType === 'alpha'
      ? markAlphaUpdate(next, new Date().toISOString().slice(0, 10))
      : next;
    setBoard(persisted);
    void saveFeatureBoard(persisted);
  };

  const updateWorkLog = (next: WorkLog) => {
    setWorkLog(next);
    void saveWorkLog(next);
  };

  const statusMenu = (current: string, statuses: readonly string[], onSelect: (status: never) => void) => (
    <>
      {statuses.map(status => (
        <Dropdown.Item key={status} disabled={status === current} onClick={() => onSelect(status as never)}>
          {status}{status === current ? '（当前）' : ''}
        </Dropdown.Item>
      ))}
    </>
  );

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 56,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => <Text>{index + 1}</Text>,
    },
    {
      title: '功能模块',
      key: 'module',
      dataIndex: 'module',
      width: 130,
      render: (value: string, record: FeatureBoard['modules'][number]) => (
        <span>
          <Text strong>{value}</Text>
          {record.isPlanned && <span className="feature-board-planned-badge">规划</span>}
        </span>
      ),
    },
    {
      title: '领域',
      key: 'domain',
      dataIndex: 'domain',
      width: 90,
      render: (domain: Domain) => (
        <Tag color={DOMAIN_COLORS[domain] ?? 'gray'} size="small">{domain}</Tag>
      ),
    },
    {
      title: '已有功能',
      key: 'features',
      width: 280,
      render: (_: unknown, record: FeatureBoard['modules'][number]) => (
        <div className="feature-board-features">
          {record.features.length ? record.features.map(f => (
            <Tooltip key={f.name} content="点击查看功能说明">
              <Tag
                size="small"
                className="feature-board-feature-chip"
                onClick={() => setFeatureDetail({ module: record.module, feature: f })}
              >
                {f.name}
              </Tag>
            </Tooltip>
          )) : <Text type="secondary">-</Text>}
        </div>
      ),
    },
    {
      title: '待设计功能',
      key: 'planned',
      width: 320,
      render: (_: unknown, record: FeatureBoard['modules'][number]) => (
        <div className="feature-board-planned">
          {record.planned.map(item => (
            <div key={item.name} className="feature-board-planned-item">
              {renameEditing?.module === record.module && renameEditing.name === item.name ? (
                <Input
                  size="mini"
                  autoFocus
                  value={renameEditing.value}
                  onChange={value => setRenameEditing({ ...renameEditing, value })}
                  onBlur={() => {
                    update(renamePlannedItem(board, record.module, item.name, renameEditing.value), 'planned');
                    setRenameEditing(null);
                  }}
                  onPressEnter={() => {
                    update(renamePlannedItem(board, record.module, item.name, renameEditing.value), 'planned');
                    setRenameEditing(null);
                  }}
                  style={{ width: 150 }}
                />
              ) : (
                <Tooltip content="点击可重命名">
                  <span
                    className="feature-board-planned-name"
                    onClick={() => setRenameEditing({ module: record.module, name: item.name, value: item.name })}
                  >
                    {item.name}
                  </span>
                </Tooltip>
              )}
              <Dropdown
                trigger="click"
                droplist={statusMenu(item.status, PLANNED_STATUSES, status => {
                  update(setPlannedStatus(board, record.module, item.name, status as PlannedStatus), 'planned');
                })}
              >
                {item.status === '未开始' ? (
                  <span className="feature-board-status-entry">状态</span>
                ) : (
                  <StatusDot status={item.status} />
                )}
              </Dropdown>
              <Tooltip content="删除该功能条目">
                <Button
                  type="text"
                  size="mini"
                  status="danger"
                  icon={<IconDelete />}
                  onClick={() => update(removePlannedItem(board, record.module, item.name), 'planned')}
                />
              </Tooltip>
            </div>
          ))}
          {addingItem?.module === record.module ? (
            <Input
              size="mini"
              autoFocus
              placeholder="功能名称，回车保存"
              value={addingItem.value}
              onChange={value => setAddingItem({ ...addingItem, value })}
              onBlur={() => {
                if (addingItem.value.trim()) update(addPlannedItem(board, record.module, addingItem.value), 'planned');
                setAddingItem(null);
              }}
              onPressEnter={() => {
                update(addPlannedItem(board, record.module, addingItem.value), 'planned');
                setAddingItem(null);
              }}
              style={{ width: 180 }}
            />
          ) : (
            <Button
              type="text"
              size="mini"
              icon={<IconPlus />}
              onClick={() => setAddingItem({ module: record.module, value: '' })}
            >
              新增功能
            </Button>
          )}
        </div>
      ),
    },
    {
      title: 'α版',
      key: 'alpha',
      width: 150,
      render: (_: unknown, record: FeatureBoard['modules'][number]) => (
        <div className="feature-board-alpha-summary">
          <Text>更新 {board.alphaMeta.updateCount} 次</Text>
          <Text type="secondary">{board.alphaMeta.lastUpdatedAt ? `最近更新：${board.alphaMeta.lastUpdatedAt}` : '暂无更新记录'}</Text>
        </div>
      ),
    },
    {
      title: 'β版',
      key: 'beta',
      width: 170,
      render: (_: unknown, record: FeatureBoard['modules'][number]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip content="生产开关：打开后才进入β版开发；仅限手动操作">
            <Switch
              size="small"
              checked={record.beta.productionOn}
              onChange={() => update(toggleProductionSwitch(board, record.module), 'beta')}
            />
          </Tooltip>
          {record.beta.productionOn ? (
            <Dropdown
              trigger="click"
              droplist={statusMenu(record.beta.devStatus, BETA_DEV_STATUSES, status => {
                update(setBetaDevStatus(board, record.module, status as BetaDevStatus), 'beta');
              })}
            >
              <Tooltip content="点击修改开发状态（未开始/编码中/测试中/测试通过）">
                <Tag color={BETA_DEV_STATUS_COLORS[record.beta.devStatus]} size="small" style={{ cursor: 'pointer' }}>
                  {record.beta.devStatus}
                </Tag>
              </Tooltip>
            </Dropdown>
          ) : (
            <Tooltip content="打开生产开关后进入β版开发">
              <Tag color="gray" size="small">未启用</Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '备注',
      key: 'note',
      dataIndex: 'note',
      width: 240,
      render: (note: string, record: FeatureBoard['modules'][number]) => noteEditing?.module === record.module ? (
        <Input
          size="mini"
          autoFocus
          value={noteEditing.value}
          onChange={value => setNoteEditing({ ...noteEditing, value })}
          onBlur={() => {
            update(setModuleNote(board, record.module, noteEditing.value), 'note');
            setNoteEditing(null);
          }}
          onPressEnter={() => {
            update(setModuleNote(board, record.module, noteEditing.value), 'note');
            setNoteEditing(null);
          }}
        />
      ) : (
        <Tooltip content="点击编辑备注">
          <span
            className="feature-board-note"
            onClick={() => setNoteEditing({ module: record.module, value: note })}
          >
            {note || <Text type="secondary">点击填写</Text>}
          </span>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
    <Modal
      title={
        <div className="feature-board-modal-title">
          <span>功能看板（α/β 版本）</span>
          <Radio.Group
            type="button"
            size="small"
            value={pane}
            onChange={(value) => setPane(value as BoardPane)}
          >
            <Radio value="board">功能看板</Radio>
            <Radio value="architecture">功能架构</Radio>
            <Radio value="tech">技术架构</Radio>
            <Radio value="log">工作记录</Radio>
          </Radio.Group>
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      alignCenter={false}
      focusLock={false}
      className={`version-compare-modal${FRAME_PANES.includes(pane) ? ' is-frame-pane' : ''}`}
      style={{ width: '100vw', maxWidth: '100vw', top: 0, height: '100vh', margin: 0, borderRadius: 0 }}
    >
      {pane === 'architecture' ? (
        <iframe
          key={`arch-${String(visible)}`}
          title="ZK HubX 功能架构"
          src="/architecture.html"
          className="feature-board-tech-frame"
        />
      ) : pane === 'tech' ? (
        <iframe
          key={`tech-${String(visible)}`}
          title="ZK HubX β 技术架构"
          src="/tech-architecture.html"
          className="feature-board-tech-frame"
        />
      ) : pane === 'log' ? (
        <WorkLogPane log={workLog} onChange={updateWorkLog} />
      ) : (
        <>
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
        data={board.modules}
        scroll={{ x: 1400 }}
        rowClassName={(record: FeatureBoard['modules'][number]) => record.isPlanned ? 'is-planned-module' : ''}
      />
      <div className="feature-board-footer">
        <Button
          type="text"
          size="small"
          icon={<IconPlus />}
          onClick={() => {
            const name = `新模块 ${board.modules.length + 1}`;
            update(addModule(board, name), 'planned');
          }}
        >
          新增模块
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          事实源：featureBoard.config.json（本地 dev 自动保存）；生产开关仅手动开启；β开发状态在开关开启后可点选。页签可切功能架构、技术架构、工作记录。
        </Text>
      </div>
        </>
      )}
    </Modal>

    {/* 已有功能详情弹窗 */}
    <Modal
      title={featureDetail ? `${featureDetail.module} - ${featureDetail.feature.name}` : '功能说明'}
      visible={Boolean(featureDetail)}
      onCancel={() => setFeatureDetail(null)}
      footer={null}
      style={{ width: 600, maxWidth: 'calc(100vw - 32px)' }}
    >
      {featureDetail && (
        <div className="feature-board-detail">
          <div className="feature-board-detail-content">
            {featureDetail.feature.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {ALPHA_CHECK_KEYS.map(key => <Checkbox key={key} checked={featureDetail.feature.alpha[key]} onChange={() => {
              const next = toggleFeatureAlphaCheck(board, featureDetail.module, featureDetail.feature.name, key);
              setFeatureDetail({ ...featureDetail, feature: next.modules.find(m => m.module === featureDetail.module)!.features.find(f => f.name === featureDetail.feature.name)! });
              update(next, 'checklist');
            }}>{key}</Checkbox>)}
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}
