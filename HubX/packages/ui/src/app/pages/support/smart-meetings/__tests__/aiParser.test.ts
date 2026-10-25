/** AI 解析器测试（α 确定性解析） */

import { describe, it, expect } from 'vitest';
import type { ActionItem, ActionPriority } from '../types';

/** α 确定性解析：从原始文本提取结构化数据（纯函数，无 AI 调用） */
function parseMinuteText(text: string): {
  title: string;
  coreDecisions: string[];
  actionItems: Partial<ActionItem>[];
} {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 提取标题（第一个 # 开头的行）
  const titleLine = lines.find(l => l.startsWith('#'));
  const title = titleLine ? titleLine.replace(/^#+\s*/, '') : '未命名会议';

  // 提取核心决议（"决议：" 或 "决定：" 开头的行）
  const coreDecisions = lines
    .filter(l => l.startsWith('决议：') || l.startsWith('决定：'))
    .map(l => l.replace(/^(决议|决定)：\s*/, ''));

  // 提取行动项（"TODO：" 或 "- [ ]" 开头的行）
  const actionItems: Partial<ActionItem>[] = [];
  for (const line of lines) {
    const todoMatch = line.match(/^(TODO：|- \[ \])\s*(.+)/);
    if (todoMatch) {
      const content = todoMatch[2];
      // 尝试提取 @人名 和 截止日期
      const assigneeMatch = content.match(/@(\S+)/);
      const dueMatch = content.match(/截止[：:]\s*(\S+)/);
      const priorityMatch = content.match(/P[012]/);

      actionItems.push({
        content: content.replace(/@\S+/, '').replace(/截止[：:]\s*\S+/, '').trim(),
        assigneeName: assigneeMatch?.[1] ?? '',
        dueDate: dueMatch?.[1] ?? null,
        priority: (priorityMatch?.[0] as ActionPriority) ?? 'P1',
      });
    }
  }

  return { title, coreDecisions, actionItems };
}

describe('parseMinuteText', () => {
  it('提取标题', () => {
    const result = parseMinuteText('# Q3 销售复盘会\n\n正文内容');
    expect(result.title).toBe('Q3 销售复盘会');
  });

  it('无标题时返回默认', () => {
    const result = parseMinuteText('没有标题的文本');
    expect(result.title).toBe('未命名会议');
  });

  it('提取核心决议', () => {
    const text = '# 会议\n决议：调整预算\n决定：优化流程\n其他内容';
    const result = parseMinuteText(text);
    expect(result.coreDecisions).toEqual(['调整预算', '优化流程']);
  });

  it('提取行动项（TODO：格式）', () => {
    const text = '# 会议\nTODO：整理报告 @张三 截止：2026-08-25\nTODO：优化模型';
    const result = parseMinuteText(text);
    expect(result.actionItems).toHaveLength(2);
    expect(result.actionItems[0].assigneeName).toBe('张三');
    expect(result.actionItems[0].dueDate).toBe('2026-08-25');
  });

  it('提取行动项（- [ ] 格式）', () => {
    const text = '# 会议\n- [ ] 任务A\n- [ ] 任务B';
    const result = parseMinuteText(text);
    expect(result.actionItems).toHaveLength(2);
  });

  it('无行动项时返回空数组', () => {
    const text = '# 会议\n普通内容';
    const result = parseMinuteText(text);
    expect(result.actionItems).toEqual([]);
  });

  it('优先级提取', () => {
    const text = '# 会议\nTODO：紧急任务 P0\nTODO：普通任务';
    const result = parseMinuteText(text);
    expect(result.actionItems[0].priority).toBe('P0');
    expect(result.actionItems[1].priority).toBe('P1');
  });
});
