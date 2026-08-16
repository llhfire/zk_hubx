// src/app/pages/daily-report/RoleSelectModal.tsx

import { Modal, Button, Space, Typography } from '@arco-design/web-react';
import { IconCustomerService, IconExperiment, IconEdit, IconApps } from '@arco-design/web-react/icon';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSelect: (role: 'sales' | 'general' | 'ad-delivery' | 'dev') => void;
}

const REPORT_TYPES = [
  { key: 'sales' as const,        label: '销售部',  desc: '演示销售日报', icon: <IconCustomerService />, color: 'var(--primary)' },
  { key: 'ad-delivery' as const,  label: '新媒体部门', desc: '演示新媒体日报', icon: <IconExperiment />,       color: 'var(--warning-500)' },
  { key: 'dev' as const,          label: '技术部',  desc: '演示开发日报', icon: <IconEdit />,             color: 'var(--success-500)' },
  { key: 'general' as const,      label: '行政财务', desc: '演示通用日报', icon: <IconApps />,             color: '#7c3aed' },
];

export function RoleSelectModal({ visible, onCancel, onSelect }: Props) {
  return (
    <Modal
      title="选择演示部门"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      style={{ width: 420 }}
    >
      <div style={{ padding: '16px 0' }}>
        <Text style={{ display: 'block', marginBottom: 16, textAlign: 'center' }}>
          请选择要演示的部门：
        </Text>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {REPORT_TYPES.map(rt => (
            <Button
              key={rt.key}
              size="large"
              style={{ width: '100%', height: 64, textAlign: 'left', padding: '0 20px' }}
              onClick={() => onSelect(rt.key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24, color: rt.color }}>{rt.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{rt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{rt.desc}</div>
                </div>
              </div>
            </Button>
          ))}
        </Space>
      </div>
    </Modal>
  );
}
