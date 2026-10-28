/**
 * 行动项表格面板
 *
 * 设计规约见 smart-meetings-ui-design.md §4.6：
 * - 7 列：内容/责任人/优先级/截止日期/业务引用/状态/同步就绪
 * - isActionItemSyncable 同步就绪判断
 * - cyclePriorityBadge 优先级切换
 * - 已完成行只读不重开；取消为软取消
 */

import { Button, Input, Select, DatePicker, Space, Typography, Tooltip } from '@/design-system';
import { IconPlus, IconDelete, IconCheck, IconClose } from '@/design-system';
import { SectionCard, StatusTag, type StatusMap } from '@/design-system';
import { MOCK_USERS } from '../mockData';
import type { ActionItem, ActionPriority } from '../types';

const { Text } = Typography;
const { TextArea } = Input;
const Option = Select.Option;

const ACTION_PRIORITY: StatusMap<ActionPriority> = {
  P0: { label: 'P0', tone: 'danger' },
  P1: { label: 'P1', tone: 'warning' },
  P2: { label: 'P2', tone: 'info' },
};

const nextPriority: Record<ActionPriority, ActionPriority> = {
  P0: 'P1',
  P1: 'P2',
  P2: 'P0',
};

/** 判断行动项是否可同步到 TODO */
function isActionItemSyncable(a: ActionItem): { ok: boolean; reason?: string } {
  if (!a.content.trim()) return { ok: false, reason: '内容为空' };
  if (!a.assigneeId) return { ok: false, reason: '未指派责任人' };
  if (a.priorityNeedsReview) return { ok: false, reason: '优先级待确认' };
  if (a.dueDate === undefined) return { ok: false, reason: '未设置截止日期' };
  return { ok: true };
}

interface ActionItemsPanelProps {
  actionItems: ActionItem[];
  readonly: boolean;
  confirmedReadonly: boolean;
  onChange: (items: ActionItem[]) => void;
}

export function ActionItemsPanel({ actionItems, readonly, confirmedReadonly, onChange }: ActionItemsPanelProps) {
  const isReadonly = readonly || confirmedReadonly;

  const handleAdd = () => {
    const newItem: ActionItem = {
      actionItemId: `ai_${Date.now()}`,
      content: '',
      assigneeId: null,
      assigneeName: '',
      priority: 'P1',
      priorityNeedsReview: false,
      dueDate: null,
      refs: [],
      status: 'pending',
    };
    onChange([...actionItems, newItem]);
  };

  const handleUpdate = (index: number, patch: Partial<ActionItem>) => {
    const next = [...actionItems];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(actionItems.filter((_, i) => i !== index));
  };

  const handleComplete = (index: number) => {
    handleUpdate(index, { status: 'completed', completedAt: new Date().toISOString() });
  };

  const handleCancel = (index: number) => {
    handleUpdate(index, { status: 'canceled', canceledAt: new Date().toISOString() });
  };

  return (
    <div style={{ marginBottom: 12 }}>
    <SectionCard
      title="📋 行动项"
      extra={
        !isReadonly && (
          <Button size="mini" type="text" icon={<IconPlus />} onClick={handleAdd}>
            添加行动项
          </Button>
        )
      }
    >
      {actionItems.length === 0 ? (
        <Text style={{ fontSize: 'var(--ds-text-dense)', color: 'var(--grey-400)' }}>
          {isReadonly ? '无行动项' : '点击「添加行动项」开始'}
        </Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actionItems.map((item, i) => {
            const isDone = item.status === 'completed' || item.status === 'canceled';
            const syncable = isActionItemSyncable(item);
            return (
              <div
                key={item.actionItemId}
                style={{
                  padding: 10,
                  border: '1px solid var(--grey-200)',
                  borderRadius: 'var(--radius-md)',
                  opacity: isDone ? 0.6 : 1,
                  background: isDone ? 'var(--grey-50)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {/* 内容 */}
                  <div style={{ flex: 1 }}>
                    {isReadonly || isDone ? (
                      <Text style={{ fontSize: 'var(--ds-text-dense)', textDecoration: isDone && item.status === 'completed' ? 'line-through' : 'none' }}>
                        {item.content || '(空)'}
                      </Text>
                    ) : (
                      <TextArea
                        value={item.content}
                        onChange={(v) => handleUpdate(i, { content: v })}
                        placeholder="行动项内容"
                        rows={1}
                        autoSize={{ minRows: 1, maxRows: 3 }}
                      />
                    )}
                  </div>

                  {/* 优先级 */}
                  <span
                    style={{ cursor: isReadonly || isDone ? 'default' : 'pointer', flexShrink: 0 }}
                    onClick={() => !isReadonly && !isDone && handleUpdate(i, { priority: nextPriority[item.priority] })}
                  >
                    <StatusTag tone={ACTION_PRIORITY[item.priority].tone}>
                      {ACTION_PRIORITY[item.priority].label}
                      {item.priorityNeedsReview && <span style={{ marginLeft: 4 }}>⚠</span>}
                    </StatusTag>
                  </span>

                  {/* 同步就绪 */}
                  <Tooltip content={!syncable.ok ? syncable.reason : '可同步'}>
                    <span style={{ flexShrink: 0 }}>
                      {syncable.ok ? (
                        <IconCheck style={{ color: 'var(--success-500)', fontSize: 'var(--text-sm)' }} />
                      ) : (
                        <IconClose style={{ color: 'var(--grey-400)', fontSize: 'var(--text-sm)' }} />
                      )}
                    </span>
                  </Tooltip>

                  {/* 操作按钮 */}
                  {!isReadonly && !isDone && (
                    <Space size={2} style={{ flexShrink: 0 }}>
                      <Button size="mini" type="text" status="success" onClick={() => handleComplete(i)}>
                        完成
                      </Button>
                      <Button size="mini" type="text" status="danger" icon={<IconDelete />} onClick={() => handleCancel(i)} />
                    </Space>
                  )}
                </div>

                {/* 第二行：责任人 + 截止日期 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {/* 责任人 */}
                  <Select
                    value={item.assigneeId ?? undefined}
                    onChange={(v) => {
                      const user = MOCK_USERS.find((u) => u.id === v);
                      handleUpdate(i, { assigneeId: v, assigneeName: user?.name ?? '' });
                    }}
                    placeholder="指派责任人"
                    size="mini"
                    style={{ minWidth: 120 }}
                    disabled={isReadonly || isDone}
                    allowClear
                  >
                    {MOCK_USERS.map((u) => (
                      <Option key={u.id} value={u.id}>{u.name}</Option>
                    ))}
                  </Select>
                  {!item.assigneeId && <StatusTag tone="warning">待指派</StatusTag>}

                  {/* 截止日期 */}
                  <DatePicker
                    value={item.dueDate ?? undefined}
                    onChange={(_, ds) => handleUpdate(i, { dueDate: Array.isArray(ds) ? ds[0] ?? null : ds ?? null })}
                    placeholder="截止日期"
                    size="mini"
                    style={{ minWidth: 130 }}
                    disabled={isReadonly || isDone}
                  />

                  {/* 状态标签 */}
                  {item.status === 'completed' && <StatusTag tone="success">已完成</StatusTag>}
                  {item.status === 'canceled' && <StatusTag tone="neutral">已取消</StatusTag>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
    </div>
  );
}
