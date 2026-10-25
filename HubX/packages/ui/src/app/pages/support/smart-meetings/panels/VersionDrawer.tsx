/**
 * 版本抽屉
 *
 * 设计规约见 smart-meetings-ui-design.md §4.7：
 * - 版本列表（时间倒序）
 * - 点开版本：只读快照渲染 + diff 高亮
 * - 「复制此版本」：复制 Markdown 到剪贴板
 * - 无回滚按钮
 */

import { useState } from 'react';
import { Drawer, List, Tag, Button, Typography, Space, Message } from '@arco-design/web-react';
import { IconCopy, IconCalendar } from '@arco-design/web-react/icon';
import type { MinuteVersion } from '../types';

const { Text, Title } = Typography;

const VERSION_REASON_LABEL: Record<MinuteVersion['reason'], string> = {
  ai_regenerate: 'AI 生成',
  withdraw_edit: '撤回修改',
  confirm: '确认',
  resubmit: '重新提交',
};

const VERSION_REASON_COLOR: Record<MinuteVersion['reason'], string> = {
  ai_regenerate: 'blue',
  withdraw_edit: 'orange',
  confirm: 'green',
  resubmit: 'processing',
};

interface VersionDrawerProps {
  visible: boolean;
  versions: MinuteVersion[];
  onClose: () => void;
}

export function VersionDrawer({ visible, versions, onClose }: VersionDrawerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 时间倒序
  const sorted = [...versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleCopy = (version: MinuteVersion) => {
    const text = version.snapshot.contentMarkdown || '(无正文)';
    navigator.clipboard.writeText(text).then(() => {
      Message.success('已复制到剪贴板');
    }).catch(() => {
      Message.error('复制失败');
    });
  };

  return (
    <Drawer
      title="版本历史"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={460}
    >
      {sorted.length === 0 ? (
        <Text style={{ color: 'var(--grey-400)' }}>暂无版本记录</Text>
      ) : (
        <List
          dataSource={sorted}
          render={(version) => (
            <List.Item
              key={version.versionId}
              style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
              onClick={() => setExpandedId(expandedId === version.versionId ? null : version.versionId)}
            >
              {/* 版本摘要行 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space size={8}>
                  <Tag color={VERSION_REASON_COLOR[version.reason]} size="small">
                    {VERSION_REASON_LABEL[version.reason]}
                  </Tag>
                  <Text style={{ fontSize: 13 }}>
                    <IconCalendar style={{ marginRight: 4, fontSize: 12 }} />
                    {new Date(version.createdAt).toLocaleString()}
                  </Text>
                </Space>
                <Button
                  size="mini"
                  type="text"
                  icon={<IconCopy />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(version);
                  }}
                >
                  复制
                </Button>
              </div>

              {/* 展开的快照详情 */}
              {expandedId === version.versionId && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'var(--grey-50)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <Title heading={6} style={{ margin: '0 0 8px' }}>
                    {version.snapshot.title}
                  </Title>
                  <Text style={{ fontSize: 12, color: 'var(--grey-500)', display: 'block', marginBottom: 8 }}>
                    {new Date(version.snapshot.meetingTime).toLocaleString()} · {version.snapshot.attendeeIds.length} 人参会
                  </Text>

                  {version.snapshot.coreDecisions.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600 }}>核心决议：</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                        {version.snapshot.coreDecisions.map((d, i) => (
                          <li key={i} style={{ fontSize: 12 }}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {version.snapshot.contentMarkdown && (
                    <div
                      style={{
                        padding: 8,
                        background: '#fff',
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                        maxHeight: 200,
                        overflow: 'auto',
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {version.snapshot.contentMarkdown}
                    </div>
                  )}

                  {version.snapshot.actionItems.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600 }}>
                        行动项：{version.snapshot.actionItems.length} 项
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
