import { useState } from 'react';
import { Button, Input, Select, Tag, Typography } from '@arco-design/web-react';
import { IconDelete, IconPlus } from '@arco-design/web-react/icon';
import {
  WORK_LOG_CATEGORIES,
  addWorkLogItem,
  itemsByCategory,
  removeWorkLogItem,
  todayISODate,
  type WorkLog,
  type WorkLogCategory,
} from './workLogModel';

const { Text } = Typography;

const CATEGORY_COLORS: Record<WorkLogCategory, string> = {
  '功能': 'arcoblue',
  '底座': 'cyan',
  '设计': 'purple',
  '文档': 'gold',
  '修洞': 'orange',
  '其它': 'gray',
};

interface WorkLogPaneProps {
  log: WorkLog;
  onChange: (next: WorkLog) => void;
}

export function WorkLogPane({ log, onChange }: WorkLogPaneProps) {
  const [date, setDate] = useState(todayISODate);
  const [category, setCategory] = useState<WorkLogCategory>('功能');
  const [text, setText] = useState('');

  const commit = () => {
    const next = addWorkLogItem(log, date, category, text);
    if (next === log) return;
    onChange(next);
    setText('');
  };

  return (
    <div className="work-log">
      <div className="work-log-composer">
        <input
          className="work-log-date-input"
          type="date"
          value={date}
          onChange={event => setDate(event.target.value)}
          aria-label="记录日期"
        />
        <Select
          size="small"
          value={category}
          onChange={value => setCategory(value as WorkLogCategory)}
          style={{ width: 100 }}
        >
          {WORK_LOG_CATEGORIES.map(item => (
            <Select.Option key={item} value={item}>{item}</Select.Option>
          ))}
        </Select>
        <Input
          size="small"
          value={text}
          placeholder="一句话说明当天做了什么"
          onChange={setText}
          onPressEnter={commit}
        />
        <Button type="primary" size="small" icon={<IconPlus />} onClick={commit}>
          记一条
        </Button>
      </div>
      <Text type="secondary" className="work-log-hint">
        按日期归档，按分类写短句。事实源 workLog.config.json（本地 dev 自动保存）。
      </Text>
      {log.days.length === 0 ? (
        <div className="work-log-empty">还没有记录。上面写一条当天的工作即可。</div>
      ) : (
        log.days.map(day => (
          <section key={day.date} className="work-log-day">
            <h3 className="work-log-day-title">{day.date}</h3>
            {itemsByCategory(day.items).map(group => (
              <div key={group.category} className="work-log-group">
                <Tag color={CATEGORY_COLORS[group.category]} size="small">{group.category}</Tag>
                <ul className="work-log-list">
                  {group.items.map(item => (
                    <li key={item.id} className="work-log-item">
                      <span>{item.text}</span>
                      <Button
                        type="text"
                        size="mini"
                        status="danger"
                        icon={<IconDelete />}
                        onClick={() => onChange(removeWorkLogItem(log, day.date, item.id))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
