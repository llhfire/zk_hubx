/**
 * 核心决议面板
 *
 * 设计规约见 smart-meetings-ui-design.md §4.4：
 * - 列表编辑：增删改行，顺序可调
 * - AI 解析结果先填充此处（草稿态），人工增删改
 */

import { Card, Button, Input, Space, Typography } from '@arco-design/web-react';
import { IconPlus, IconDelete, IconUp, IconDown } from '@arco-design/web-react/icon';

const { Text } = Typography;
const { TextArea } = Input;

interface DecisionsPanelProps {
  decisions: string[];
  readonly: boolean;
  onChange: (decisions: string[]) => void;
}

export function DecisionsPanel({ decisions, readonly, onChange }: DecisionsPanelProps) {
  const handleAdd = () => {
    onChange([...decisions, '']);
  };

  const handleRemove = (index: number) => {
    onChange(decisions.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, value: string) => {
    const next = [...decisions];
    next[index] = value;
    onChange(next);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= decisions.length) return;
    const next = [...decisions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Card
      size="small"
      title="💡 核心决议"
      style={{ marginBottom: 12 }}
      extra={
        !readonly && (
          <Button size="mini" type="text" icon={<IconPlus />} onClick={handleAdd}>
            添加
          </Button>
        )
      }
    >
      {decisions.length === 0 ? (
        <Text style={{ fontSize: 13, color: 'var(--grey-400)' }}>
          {readonly ? '无核心决议' : '点击「添加」录入核心决议'}
        </Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {decisions.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--grey-400)', marginTop: 6, minWidth: 20 }}>
                {i + 1}.
              </span>
              {readonly ? (
                <Text style={{ flex: 1, fontSize: 13 }}>{d}</Text>
              ) : (
                <>
                  <TextArea
                    value={d}
                    onChange={(v) => handleUpdate(i, v)}
                    rows={1}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    style={{ flex: 1 }}
                  />
                  <Space size={2} style={{ marginTop: 4 }}>
                    <Button
                      size="mini"
                      type="text"
                      icon={<IconUp />}
                      disabled={i === 0}
                      onClick={() => handleMove(i, -1)}
                    />
                    <Button
                      size="mini"
                      type="text"
                      icon={<IconDown />}
                      disabled={i === decisions.length - 1}
                      onClick={() => handleMove(i, 1)}
                    />
                    <Button
                      size="mini"
                      type="text"
                      status="danger"
                      icon={<IconDelete />}
                      onClick={() => handleRemove(i)}
                    />
                  </Space>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
