import { useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Modal,
  Space,
  Tag,
  Typography,
  Upload,
  Message,
} from '@arco-design/web-react';
import { IconDelete, IconEye, IconUpload } from '@arco-design/web-react/icon';
import type { ScanArchiveEntry, ScanFile } from '../types';

const Text = Typography.Text;

interface Props {
  entries: ScanArchiveEntry[];
  // 是否允许上传：合同必须处于 pending_return 或 archived 状态。
  uploadEnabled: boolean;
  // 上传目的：'first' 表示首次归档，'supplemental' 表示补充上传。
  uploadIntent: 'first' | 'supplemental' | null;
  onUpload: (files: ScanFile[], note?: string) => void;
  onSetPrimary: (entryId: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function ScanFileList({
  entries,
  uploadEnabled,
  uploadIntent,
  onUpload,
  onSetPrimary,
}: Props) {
  const [previewFile, setPreviewFile] = useState<ScanFile | null>(null);

  const handleBeforeUpload = (file: File): boolean => {
    // 单文件 ≤ 20MB；mimeType 仅允许 PDF/图片
    if (file.size > MAX_FILE_SIZE) {
      Message.error(`${file.name} 超过 20MB 上限`);
      return false;
    }
    const isAllowed =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/');
    if (!isAllowed) {
      Message.error(`${file.name} 不是 PDF/图片，已忽略`);
      return false;
    }
    return true;
  };

  // 把 Arco Upload 的多文件批量转成 ScanFile 数组并触发回调
  const handleUploadFiles = (files: File[]) => {
    const validFiles = files.filter((f) => handleBeforeUpload(f));
    if (validFiles.length === 0) return;
    const scanFiles: ScanFile[] = validFiles.map((f, idx) => ({
      id: `f-${Date.now()}-${idx}`,
      fileName: f.name,
      fileSize: f.size,
      mimeType: f.type,
      blobUrl: URL.createObjectURL(f),
      uploadedAt: new Date().toLocaleString('zh-CN'),
      uploadedBy: '李四',
    }));
    onUpload(scanFiles);
    Message.success(
      uploadIntent === 'first'
        ? `已收到客户回寄件，合同状态已切换至「已归档」`
        : `已补充扫描件`,
    );
  };

  return (
    <div>
      {uploadEnabled && (
        <Card style={{ marginBottom: 16 }} bordered={false}>
          <Upload
            multiple
            drag
            accept=".pdf,image/*"
            showUploadList={false}
            customRequest={({ file }) => {
              // Arco 的 customRequest 一次处理一个文件；这里收集成数组后立即上传
              handleUploadFiles([file as File]);
            }}
          >
            <div style={{ padding: 24 }}>
              <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
              <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                {uploadIntent === 'first'
                  ? '点击或拖拽上传客户回寄盖章件（PDF / 图片，单文件 ≤ 20MB）'
                  : '补充上传扫描件（PDF / 图片，单文件 ≤ 20MB）'}
              </div>
            </div>
          </Upload>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty description="尚无扫描件" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {entries.map((entry) => (
            <ScanEntryCard
              key={entry.id}
              entry={entry}
              onSetPrimary={() => onSetPrimary(entry.id)}
              onPreview={(f) => setPreviewFile(f)}
            />
          ))}
        </Space>
      )}

      <Modal
        title={previewFile?.fileName ?? '预览'}
        visible={!!previewFile}
        onCancel={() => setPreviewFile(null)}
        footer={null}
        style={{ width: 800 }}
      >
        {previewFile && <FilePreview file={previewFile} />}
      </Modal>
    </div>
  );
}

function ScanEntryCard({
  entry,
  onSetPrimary,
  onPreview,
}: {
  entry: ScanArchiveEntry;
  onSetPrimary: () => void;
  onPreview: (f: ScanFile) => void;
}) {
  return (
    <Card
      bodyStyle={{ padding: 12 }}
      style={{
        border: entry.isPrimary ? '1px solid rgb(var(--primary-6))' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space>
          <Text bold>归档 {entry.uploadedAt}</Text>
          {entry.isPrimary && <Tag color="arcoblue">当前主件</Tag>}
          <Tag>对应版本：{entry.linkedVersionNo}</Tag>
        </Space>
        {!entry.isPrimary && (
          <Button size="mini" onClick={onSetPrimary}>
            设为主件
          </Button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>
        上传人：{entry.uploadedBy}
        {entry.note ? ` · ${entry.note}` : ''}
      </div>
      {entry.files.map((f) => (
        <div
          key={f.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 8px',
            background: 'var(--color-fill-2)',
            borderRadius: 4,
            marginBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span>📄 {f.fileName}</span>
            <span style={{ color: 'var(--color-text-3)' }}>{formatSize(f.fileSize)}</span>
          </div>
          <Space size="mini">
            <Button
              type="text"
              size="mini"
              icon={<IconEye />}
              onClick={() => onPreview(f)}
            >
              预览
            </Button>
          </Space>
        </div>
      ))}
    </Card>
  );
}

function FilePreview({ file }: { file: ScanFile }) {
  if (!file.blobUrl) {
    return (
      <Empty
        description={
          <>
            演示数据，无可用预览。
            <br />
            真实环境中扫描件会从 OSS / 文件服务读取。
          </>
        }
      />
    );
  }
  if (file.mimeType.startsWith('image/')) {
    return (
      <img
        src={file.blobUrl}
        alt={file.fileName}
        style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
      />
    );
  }
  // PDF 走 iframe
  return (
    <iframe
      title={file.fileName}
      src={file.blobUrl}
      style={{ width: '100%', height: 600, border: 'none' }}
    />
  );
}
