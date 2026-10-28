import { Button, Tooltip } from '@arco-design/web-react';
import { IconDownload, IconFile, IconDelete, IconEye } from '@arco-design/web-react/icon';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import '../components.css';

export interface FileListItem {
  key: string;
  name: string;
  /** 次级元数据：类型、来源、上传人、时间等 */
  meta?: ReactNode;
  onPreview?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  /** 不可删除时给原因，按钮置灰并说明（M-028） */
  deleteDisabledReason?: string;
}

export interface FileListProps {
  items: FileListItem[];
  emptyDescription?: ReactNode;
  className?: string;
}

/**
 * 文件/附件列表（M-029）。
 *
 * 结构固定：「文件身份在左、元数据在下、图标操作在右」。
 * 操作必须是单色图标 + Tooltip，不用文字按钮。
 */
export function FileList({ items, emptyDescription = '暂无文件', className }: FileListProps) {
  if (items.length === 0) {
    return <EmptyState description={emptyDescription} />;
  }

  return (
    <ul className={['hubx-file-list', className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <li key={item.key} className="hubx-file-list__item">
          <div className="hubx-file-list__identity">
            <IconFile />
            <div className="hubx-file-list__body">
              <div className="hubx-file-list__name" title={item.name}>
                {item.name}
              </div>
              {item.meta && <div className="hubx-file-list__meta">{item.meta}</div>}
            </div>
          </div>
          <div className="hubx-file-list__actions">
            {item.onPreview && (
              <Tooltip content="查看">
                <Button size="mini" type="text" icon={<IconEye />} aria-label={`查看 ${item.name}`} onClick={item.onPreview} />
              </Tooltip>
            )}
            {item.onDownload && (
              <Tooltip content="下载">
                <Button size="mini" type="text" icon={<IconDownload />} aria-label={`下载 ${item.name}`} onClick={item.onDownload} />
              </Tooltip>
            )}
            {item.onDelete && (
              <Tooltip content={item.deleteDisabledReason ?? '删除'}>
                <Button
                  size="mini"
                  type="text"
                  status="danger"
                  icon={<IconDelete />}
                  aria-label={`删除 ${item.name}`}
                  disabled={Boolean(item.deleteDisabledReason)}
                  onClick={item.onDelete}
                />
              </Tooltip>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
