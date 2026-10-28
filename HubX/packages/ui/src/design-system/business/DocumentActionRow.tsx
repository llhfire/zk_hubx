import { IconFile } from '@arco-design/web-react/icon';
import type { ReactNode } from 'react';
import '../components.css';

export type DocumentActionRowVariant = 'default' | 'quiet';

export interface DocumentActionRowProps {
  /** 可选的业务文档类型，例如「报价文件」或「合同终稿」。 */
  context?: ReactNode;
  /** 文档名称或空值占位。 */
  name: ReactNode;
  /** 版本、来源、上传人等次级元数据。 */
  meta?: ReactNode;
  /** 文档主操作，由页面传入实际业务动作。 */
  actions?: ReactNode;
  variant?: DocumentActionRowVariant;
  className?: string;
}

/**
 * 单个主文档的身份与主要动作。
 *
 * 与 FileList 的区别：FileList 面向附件集合，操作固定为图标动作；
 * DocumentActionRow 面向当前业务对象的主文档，允许页面传入「在线查看」等主要操作。
 */
export function DocumentActionRow({
  context,
  name,
  meta,
  actions,
  variant = 'default',
  className,
}: DocumentActionRowProps) {
  return (
    <div className={[
      'hubx-document-action-row',
      `hubx-document-action-row--${variant}`,
      className,
    ].filter(Boolean).join(' ')}>
      <div className="hubx-document-action-row__identity">
        <span className="hubx-document-action-row__icon" aria-hidden="true">
          <IconFile />
        </span>
        <div className="hubx-document-action-row__content">
          {context ? <span className="hubx-document-action-row__context">{context}</span> : null}
          <strong className="hubx-document-action-row__name">{name}</strong>
          {meta ? <span className="hubx-document-action-row__meta">{meta}</span> : null}
        </div>
      </div>
      {actions ? <div className="hubx-document-action-row__actions">{actions}</div> : null}
    </div>
  );
}
