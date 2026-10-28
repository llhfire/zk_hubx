/**
 * 正文面板
 *
 * 设计规约见 smart-meetings-ui-design.md §4.5：
 * - Markdown textarea 编辑 + 预览切换
 * - AI 润色按钮 -> 生成 polishPreview（不落正文）
 * - 预览区「采用」-> 正文更新并生成新版本
 * - 预览区「放弃」-> 清空 polishPreview
 * - 润色不改变核心决议与行动项
 */

import { useState } from 'react';
import { Button, Input, Space, Typography } from '@/design-system';
import { IconEdit, IconEye, IconBrush } from '@/design-system';
import { SectionCard, StatusTag } from '@/design-system';

const { Text } = Typography;
const { TextArea } = Input;

interface ContentPanelProps {
  contentMarkdown: string;
  polishPreview: string | null;
  readonly: boolean;
  onContentChange: (v: string) => void;
  onPolishRequest: () => void;
  onPolishAccept: () => void;
  onPolishDiscard: () => void;
}

export function ContentPanel({
  contentMarkdown, polishPreview, readonly,
  onContentChange, onPolishRequest, onPolishAccept, onPolishDiscard,
}: ContentPanelProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div style={{ marginBottom: 12 }}>
    <SectionCard
      title="正文"
      extra={
        <Space size={4}>
          {!readonly && (
            <Button
              size="mini"
              type="text"
              icon={<IconBrush />}
              onClick={onPolishRequest}
            >
              AI 润色
            </Button>
          )}
          <Button
            size="mini"
            type={mode === 'edit' ? 'primary' : 'text'}
            icon={<IconEdit />}
            onClick={() => setMode('edit')}
            disabled={readonly}
          />
          <Button
            size="mini"
            type={mode === 'preview' ? 'primary' : 'text'}
            icon={<IconEye />}
            onClick={() => setMode('preview')}
          />
        </Space>
      }
    >
      {mode === 'edit' && !readonly ? (
        <TextArea
          value={contentMarkdown}
          onChange={onContentChange}
          placeholder="输入会议正文（支持 Markdown）..."
          rows={8}
          autoSize={{ minRows: 6, maxRows: 20 }}
        />
      ) : (
        <div
          style={{
            padding: 12,
            background: 'var(--grey-50)',
            borderRadius: 'var(--radius-sm)',
            minHeight: 120,
            fontSize: 'var(--text-sm)',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {contentMarkdown || <Text style={{ color: 'var(--grey-400)' }}>暂无正文</Text>}
        </div>
      )}

      {/* AI 润色预览 */}
      {polishPreview && (
        <div style={{ marginTop: 12, border: '1px solid var(--brand-200)', borderRadius: 'var(--radius-md)', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <StatusTag tone="info" size="small">AI 润色预览</StatusTag>
            <Space size={4}>
              <Button size="mini" type="primary" onClick={onPolishAccept}>采用</Button>
              <Button size="mini" onClick={onPolishDiscard}>放弃</Button>
            </Space>
          </div>
          <div
            style={{
              padding: 8,
              background: 'var(--brand-50)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--ds-text-dense)',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {polishPreview}
          </div>
        </div>
      )}
    </SectionCard>
    </div>
  );
}
