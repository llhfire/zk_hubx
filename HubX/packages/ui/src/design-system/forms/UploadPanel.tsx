import { Upload } from '@arco-design/web-react';
import type { UploadProps } from '@arco-design/web-react';
import { IconUpload } from '@arco-design/web-react/icon';
import { useState, type ReactNode } from 'react';
import '../components.css';

export interface UploadPanelProps extends Omit<UploadProps, 'drag' | 'children'> {
  /** 拖拽区内的提示文案 */
  hint?: ReactNode;
  /** 拖拽区内的次级说明，例如「支持 PDF，单个不超过 20MB」 */
  description?: ReactNode;
  className?: string;
}

/**
 * 拖拽上传区（M-014）。
 *
 * 规则固化在这里：整个区域可点击、有完整边框、默认/拖入/禁用三态清晰。
 * 页面里不要再各自拼 `<Upload drag>` 或自建虚线框。
 */
export function UploadPanel({ hint = '点击或拖拽文件到此处上传', description, className, disabled, ...rest }: UploadPanelProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={[
        'hubx-upload-panel',
        dragging ? 'hubx-upload-panel--dragging' : '',
        disabled ? 'hubx-upload-panel--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDrop={() => setDragging(false)}
    >
      <Upload drag disabled={disabled} {...rest}>
        <div className="hubx-upload-panel__content">
          <IconUpload className="hubx-upload-panel__icon" />
          <span>{hint}</span>
          {description && <span className="hubx-upload-panel__description">{description}</span>}
        </div>
      </Upload>
    </div>
  );
}
