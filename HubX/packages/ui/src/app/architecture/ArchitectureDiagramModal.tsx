import { Modal } from '@arco-design/web-react';

interface ArchitectureDiagramModalProps {
  visible: boolean;
  onCancel: () => void;
}

export function ArchitectureDiagramModal({ visible, onCancel }: ArchitectureDiagramModalProps) {
  return (
    <Modal
      title="ZK HubX 功能架构"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      unmountOnExit
      style={{ width: 'min(1120px, 96vw)' }}
    >
      <iframe
        title="ZK HubX 功能架构"
        src="/architecture.html"
        style={{
          display: 'block',
          width: '100%',
          height: 'min(78vh, 820px)',
          border: '1px solid var(--grey-200)',
          borderRadius: 'var(--radius-md)',
          background: '#fff',
        }}
      />
    </Modal>
  );
}
