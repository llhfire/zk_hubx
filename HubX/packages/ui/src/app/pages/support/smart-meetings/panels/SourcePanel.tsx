/**
 * 会议文本源面板
 *
 * 设计规约见 smart-meetings-ui-design.md §4.2：
 * - 上传区：白名单格式 .txt/.md/.srt/.vtt
 * - 粘贴区：多行 textarea
 * - 示例载入按钮
 * - 解析状态徽标
 * - canSeeSourceText === false 时面板整体隐藏
 */

import { useState } from 'react';
import { Card, Button, Upload, Input, Tag, Message, Space, Typography } from '@arco-design/web-react';
import { IconUpload, IconPaste, IconFile } from '@arco-design/web-react/icon';
import type { MinuteSourceText, SourceParseStatus } from '../types';

const { Text } = Typography;
const { TextArea } = Input;

const PARSE_STATUS_LABEL: Record<SourceParseStatus, string> = {
  none: '未解析',
  parsed: '已解析',
  partial: '部分解析',
  failed: '解析失败',
  unsupported: '不支持的格式',
};

const PARSE_STATUS_COLOR: Record<SourceParseStatus, string> = {
  none: 'gray',
  parsed: 'green',
  partial: 'orange',
  red: 'red',
  failed: 'red',
  unsupported: 'red',
};

/** 允许的文件扩展名 */
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.srt', '.vtt', '.json', '.csv'];

/** 示例会议转写文本 */
const SAMPLE_TRANSCRIPT = `会议主题：Q3 销售策略复盘会
会议时间：2026-08-20 14:00-16:00
参会人：张三、李四、王五、陈六

张三：大家好，今天我们复盘一下 Q3 的销售策略。首先看一下投放数据。

李四：好的。Q3 百度投放 ROI 是 1:3.2，抖音是 1:4.1，小红书是 1:2.8。

张三：抖音效果最好，我们 Q4 可以加大抖音投放。王五，线索转化率怎么样？

王五：整体转化率从 Q2 的 12% 提升到了 15%，主要得益于线索评分模型的优化。

张三：很好。陈六，你那边有什么建议？

陈六：建议优化线索跟进流程，目前首联时间平均 4 小时，目标是 2 小时。

【核心决议】
1. Q4 加大抖音投放预算，占比从 30% 提升到 45%
2. 继续优化线索评分模型，目标转化率 18%
3. 将首联 SLA 从 4 小时缩短到 2 小时

【行动项】
- [P0] 王五：整理 Q3 投放数据报告（截止 2026-08-25）
- [P1] 陈六：优化线索评分模型（截止 2026-08-30）
- [P1] 李四：制定 Q4 投放预算方案（截止 2026-09-05）`;

interface SourcePanelProps {
  source: MinuteSourceText | null;
  canSee: boolean;
  readonly: boolean;
  onImport: (source: MinuteSourceText) => void;
}

export function SourcePanel({ source, canSee, readonly, onImport }: SourcePanelProps) {
  const [pasteText, setPasteText] = useState('');

  if (!canSee) return null;

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      Message.warning('请先粘贴会议文本');
      return;
    }
    const newSource: MinuteSourceText = {
      content: pasteText,
      uploadedAt: new Date().toISOString(),
      parseStatus: 'none',
    };
    onImport(newSource);
    setPasteText('');
    Message.success('文本已导入');
  };

  const handleSampleLoad = () => {
    const newSource: MinuteSourceText = {
      content: SAMPLE_TRANSCRIPT,
      fileName: '示例会议转写.txt',
      uploadedAt: new Date().toISOString(),
      parseStatus: 'parsed',
    };
    onImport(newSource);
    Message.success('示例文本已载入');
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <IconFile />
          <span>会议文本源</span>
          {source && (
            <Tag color={PARSE_STATUS_COLOR[source.parseStatus]} size="small">
              {PARSE_STATUS_LABEL[source.parseStatus]}
            </Tag>
          )}
        </Space>
      }
      style={{ marginBottom: 12 }}
    >
      {source ? (
        /* 已有文本：展示摘要 */
        <div>
          {source.fileName && (
            <Text style={{ fontSize: 13, color: 'var(--grey-500)' }}>
              文件：{source.fileName} · 上传于 {new Date(source.uploadedAt).toLocaleString()}
            </Text>
          )}
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: 'var(--grey-50)',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--grey-600)',
              maxHeight: 120,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {source.content.slice(0, 500)}
            {source.content.length > 500 && '...'}
          </div>
          {!readonly && (
            <Button
              size="small"
              style={{ marginTop: 8 }}
              onClick={() => {
                onImport({ content: '', uploadedAt: '', parseStatus: 'none' });
              }}
            >
              重新上传
            </Button>
          )}
        </div>
      ) : (
        /* 无文本：上传/粘贴/示例 */
        <div>
          {!readonly && (
            <>
              <TextArea
                placeholder="可粘贴纯文本、包含说话人标签的转写记录..."
                value={pasteText}
                onChange={setPasteText}
                rows={4}
                style={{ marginBottom: 8 }}
              />
              <Space>
                <Button type="primary" size="small" icon={<IconPaste />} onClick={handlePasteImport}>
                  导入文本
                </Button>
                <Button size="small" onClick={handleSampleLoad}>
                  快速载入会议转写示例
                </Button>
              </Space>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
