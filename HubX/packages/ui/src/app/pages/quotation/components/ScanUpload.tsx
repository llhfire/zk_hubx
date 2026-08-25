import { useState } from 'react';
import { Button, Upload, Message, List, Typography } from '@arco-design/web-react';
import { IconUpload, IconFile, IconDelete } from '@arco-design/web-react/icon';
import { canUploadScan, type ScanFile } from '../fileFlow';

const { Text } = Typography;

interface Props {
  quoteStatus: string;
  scans: ScanFile[];
  onScansChange: (scans: ScanFile[]) => void;
}

/**
 * 扫描件上传组件（待盖章起可传）
 */
export function ScanUpload({ quoteStatus, scans, onScansChange }: Props) {
  const canUpload = canUploadScan(quoteStatus);

  const handleUpload = (file: File) => {
    const newScan: ScanFile = {
      id: `scan-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onScansChange([...scans, newScan]);
    Message.success('扫描件已上传');
    return false; // 阻止自动上传
  };

  const handleRemove = (id: string) => {
    onScansChange(scans.filter(s => s.id !== id));
  };

  if (!canUpload) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-3)' }}>
        待盖章后可上传扫描件
      </div>
    );
  }

  return (
    <div>
      <Upload
        accept=".pdf,.jpg,.jpeg,.png"
        showUploadList={false}
        beforeUpload={handleUpload}
      >
        <Button icon={<IconUpload />}>上传扫描件</Button>
      </Upload>
      {scans.length > 0 && (
        <List
          style={{ marginTop: 12 }}
          dataSource={scans}
          render={(scan) => (
            <List.Item
              key={scan.id}
              actions={[
                <Button
                  key="del"
                  type="text"
                  size="small"
                  icon={<IconDelete />}
                  onClick={() => handleRemove(scan.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={<IconFile />}
                title={scan.name}
                description={`上传于 ${scan.uploadedAt}`}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
