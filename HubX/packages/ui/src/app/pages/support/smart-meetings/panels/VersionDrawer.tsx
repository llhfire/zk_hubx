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
import { Drawer, List, Button, Typography, Space, Message } from '@/design-system';
import { IconCopy, IconCalendar } from '@/design-system';
import { DateText, EmptyState, StatusTag, type StatusMap } from '@/design-system';
import type { MinuteVersion } from '../types';

const { Text, Title } = Typography;

const VERSION_REASON: StatusMap<MinuteVersion['reason']> = {
  ai_regenerate: { label: 'AI 生成', tone: 'info' },
  withdraw_edit: { label: '撤回修改', tone: 'warning' },
  confirm: { label: '确认', tone: 'success' },
  resubmit: { label: '重新提交', tone: 'info' },
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
        <EmptyState description="暂无版本记录" />
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
                  <StatusTag meta={VERSION_REASON[version.reason]} />
                  <Text style={{ fontSize: 'var(--ds-text-dense)' }}>
                    <IconCalendar style={{ marginRight: 4, fontSize: 'var(--text-xs)' }} />
                    <DateText value={version.createdAt} mode="datetime" />
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
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--ds-text-dense)',
                  }}
                >
                  <Title heading={6} style={{ margin: '0 0 8px' }}>
                    {version.snapshot.title}
                  </Title>
                  <Text style={{ fontSize: 'var(--text-xs)', color: 'var(--grey-500)', display: 'block', marginBottom: 8 }}>
                    <DateText value={version.snapshot.meetingTime} mode="datetime" /> · {version.snapshot.attendeeIds.length} 人参会
                  </Text>

                  {version.snapshot.coreDecisions.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>核心决议：</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                        {version.snapshot.coreDecisions.map((d, i) => (
                          <li key={i} style={{ fontSize: 'var(--text-xs)' }}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {version.snapshot.contentMarkdown && (
                    <div
                      style={{
                        padding: 8,
                        background: 'var(--color-white)',
                        borderRadius: 'var(--radius-xs)',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 200,
                        overflow: 'auto',
                        fontSize: 'var(--text-xs)',
                        lineHeight: 1.6,
                      }}
                    >
                      {version.snapshot.contentMarkdown}
                    </div>
                  )}

                  {version.snapshot.actionItems.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
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
