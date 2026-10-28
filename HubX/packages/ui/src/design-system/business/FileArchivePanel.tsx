import { Button, Tooltip } from '@arco-design/web-react';
import { IconDelete } from '@arco-design/web-react/icon';
import type { ReactNode } from 'react';
import { EmptyState } from '../data-display/EmptyState';
import { FileList, type FileListItem } from '../data-display/FileList';
import '../components.css';

export interface FileArchiveEntry {
  key: string;
  title: ReactNode;
  badges?: ReactNode;
  timestamp?: ReactNode;
  meta?: ReactNode;
  files: FileListItem[];
  onDelete?: () => void;
  deleteDisabledReason?: string;
}

export interface FileArchivePanelProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headerMeta?: ReactNode;
  entries: FileArchiveEntry[];
  emptyDescription?: ReactNode;
  className?: string;
}

/**
 * 归档文件区（M-028）。
 *
 * 固定「归档批次 → 文件列表」层级：页面只负责提供批次元数据和文件动作，
 * 不再各自拼装归档卡片、文件图标、操作按钮和空态。
 */
export function FileArchivePanel({
  title,
  description,
  action,
  headerMeta,
  entries,
  emptyDescription = '暂无归档文件',
  className,
}: FileArchivePanelProps) {
  return (
    <section className={['hubx-file-archive', className].filter(Boolean).join(' ')}>
      <header className="hubx-file-archive__header">
        <div className="hubx-file-archive__heading">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        {action ? <div className="hubx-file-archive__action">{action}</div> : null}
      </header>

      {headerMeta ? <div className="hubx-file-archive__meta">{headerMeta}</div> : null}

      {entries.length > 0 ? (
        <div className="hubx-file-archive__entries">
          {entries.map((entry) => (
            <article key={entry.key} className="hubx-file-archive__entry">
              <div className="hubx-file-archive__entry-header">
                <div className="hubx-file-archive__entry-title">
                  <strong>{entry.title}</strong>
                  {entry.badges ? <div className="hubx-file-archive__entry-badges">{entry.badges}</div> : null}
                </div>
                <div className="hubx-file-archive__entry-actions">
                  {entry.timestamp ? <span>{entry.timestamp}</span> : null}
                  {entry.onDelete ? (
                    <Tooltip content={entry.deleteDisabledReason ?? '删除归档批次'}>
                      <Button
                        type="text"
                        size="small"
                        status="danger"
                        icon={<IconDelete />}
                        aria-label="删除归档批次"
                        disabled={Boolean(entry.deleteDisabledReason)}
                        onClick={entry.onDelete}
                      />
                    </Tooltip>
                  ) : null}
                </div>
              </div>
              {entry.meta ? <div className="hubx-file-archive__entry-meta">{entry.meta}</div> : null}
              <FileList items={entry.files} emptyDescription="该归档批次未包含文件" />
            </article>
          ))}
        </div>
      ) : (
        <div className="hubx-file-archive__empty">
          <EmptyState description={emptyDescription} />
        </div>
      )}
    </section>
  );
}
