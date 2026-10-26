import { useState, type ReactNode } from 'react';
import { Button, Modal, Space, Typography } from '@arco-design/web-react';
import { IconApps, IconDownload, IconFullscreen, IconList } from '@arco-design/web-react/icon';

const { Text } = Typography;

export interface DocumentViewerModalProps {
  visible: boolean;
  title: string;
  content?: ReactNode;
  html?: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function DocumentViewerModal({ visible, title, content, html, onClose, onDownload }: DocumentViewerModalProps) {
  const [layout, setLayout] = useState<'single' | 'double'>('single');

  const page = (
    <article
      style={{
        width: '100%', minHeight: 760, background: '#fff', padding: '44px 52px',
        boxSizing: 'border-box', boxShadow: '0 8px 24px rgba(29, 33, 41, 0.12)',
      }}
    >
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : content || <Text type="secondary">暂无可预览内容</Text>}
    </article>
  );

  return (
    <Modal
      visible={visible}
      title={<Space><IconFullscreen /><span>{title}</span></Space>}
      footer={null}
      onCancel={onClose}
      unmountOnExit
      style={{ width: 'calc(100vw - 32px)', maxWidth: 'none', top: 16 }}
    >
      <div style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Space>
            <Button type={layout === 'single' ? 'primary' : 'secondary'} icon={<IconList />} onClick={() => setLayout('single')}>一屏一页</Button>
            <Button type={layout === 'double' ? 'primary' : 'secondary'} icon={<IconApps />} onClick={() => setLayout('double')}>横排两页</Button>
          </Space>
          <Button icon={<IconDownload />} onClick={onDownload}>下载</Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--color-fill-2)', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: layout === 'double' ? 'repeat(2, minmax(420px, 1fr))' : 'minmax(620px, 920px)', justifyContent: 'center', gap: 24 }}>
            {page}
            {layout === 'double' && <div aria-hidden="true">{page}</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
