/**
 * 元信息面板
 *
 * 设计规约见 smart-meetings-ui-design.md §4.3：
 * - 会议主题：文本输入
 * - 会议时间：DatePicker
 * - 参会人：人员目录多选
 * - 整理人/确认人：人员目录单选
 * - 业务引用：BusinessRefPicker
 */

import { Card, Input, DatePicker, Select, Tag, Space, Typography } from '@arco-design/web-react';
import { IconUser, IconCalendar } from '@arco-design/web-react/icon';
import { BusinessRefPicker } from './BusinessRefPicker';
import { MOCK_USERS } from '../mockData';
import type { BusinessRef } from '../types';

const { Text } = Typography;
const Option = Select.Option;

interface MetaPanelProps {
  title: string;
  meetingTime: string;
  attendeeIds: string[];
  organizerId: string;
  reviewerId: string;
  refs: BusinessRef[];
  readonly: boolean;
  onTitleChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onAttendeesChange: (ids: string[]) => void;
  onOrganizerChange: (id: string) => void;
  onReviewerChange: (id: string) => void;
  onRefsChange: (refs: BusinessRef[]) => void;
}

export function MetaPanel({
  title, meetingTime, attendeeIds, organizerId, reviewerId, refs,
  readonly,
  onTitleChange, onTimeChange, onAttendeesChange, onOrganizerChange, onReviewerChange, onRefsChange,
}: MetaPanelProps) {
  return (
    <Card size="small" title="元信息" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 会议主题 */}
        <div>
          <Text style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4, display: 'block' }}>会议主题</Text>
          <Input
            value={title}
            onChange={onTitleChange}
            placeholder="输入会议主题"
            disabled={readonly}
          />
        </div>

        {/* 会议时间 */}
        <div>
          <Text style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4, display: 'block' }}>
            <IconCalendar style={{ marginRight: 4 }} />会议时间
          </Text>
          <DatePicker
            showTime
            value={meetingTime || undefined}
            onChange={(_, dateStr) => onTimeChange(Array.isArray(dateStr) ? dateStr[0] : dateStr)}
            placeholder="点击下拉选择"
            style={{ width: '100%' }}
            disabled={readonly}
          />
        </div>

        {/* 参会人 */}
        <div>
          <Text style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4, display: 'block' }}>
            <IconUser style={{ marginRight: 4 }} />参会人
          </Text>
          <Select
            mode="multiple"
            value={attendeeIds}
            onChange={onAttendeesChange}
            placeholder="联想添加人员..."
            style={{ width: '100%' }}
            disabled={readonly}
            renderTag={({ label, value, closable, onClose }) => (
              <Tag closable={closable && !readonly} onClose={onClose} color="blue" size="small">
                {MOCK_USERS.find((u) => u.id === value)?.name ?? label}
              </Tag>
            )}
          >
            {MOCK_USERS.map((u) => (
              <Option key={u.id} value={u.id}>{u.name}</Option>
            ))}
          </Select>
        </div>

        {/* 整理人 + 确认人 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4, display: 'block' }}>整理人</Text>
            <Select
              value={organizerId}
              onChange={onOrganizerChange}
              style={{ width: '100%' }}
              disabled={readonly}
            >
              {MOCK_USERS.map((u) => (
                <Option key={u.id} value={u.id}>{u.name}</Option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4, display: 'block' }}>
              确认人 <span style={{ color: 'var(--destructive-500)' }}>*</span>
            </Text>
            <Select
              value={reviewerId}
              onChange={onReviewerChange}
              placeholder="必选"
              style={{ width: '100%' }}
              disabled={readonly}
            >
              {MOCK_USERS.map((u) => (
                <Option key={u.id} value={u.id}>{u.name}</Option>
              ))}
            </Select>
          </div>
        </div>

        {/* 业务引用 */}
        <div>
          <Text style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4, display: 'block' }}>业务引用</Text>
          {readonly ? (
            <Space wrap>
              {refs.length === 0 ? (
                <Text style={{ fontSize: 13, color: 'var(--grey-400)' }}>无</Text>
              ) : (
                refs.map((r, i) => (
                  <Tag key={`${r.kind}-${r.id}-${i}`} color="arcoblue">{r.displaySnapshot}</Tag>
                ))
              )}
            </Space>
          ) : (
            <>
              {refs.length > 0 && (
                <Space wrap style={{ marginBottom: 8 }}>
                  {refs.map((r, i) => (
                    <Tag
                      key={`${r.kind}-${r.id}-${i}`}
                      closable
                      onClose={() => onRefsChange(refs.filter((_, idx) => idx !== i))}
                      color="arcoblue"
                    >
                      {r.displaySnapshot}
                    </Tag>
                  ))}
                </Space>
              )}
              <BusinessRefPicker
                selected={refs}
                onSelect={(ref) => onRefsChange([...refs, ref])}
              />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
