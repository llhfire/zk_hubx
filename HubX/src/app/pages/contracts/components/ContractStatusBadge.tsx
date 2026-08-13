import { Tag } from '@arco-design/web-react';
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL } from '../utils';
import type { ContractStatus } from '../types';

interface Props {
  status: ContractStatus;
  size?: 'small' | 'default' | 'medium' | 'large';
}

export function ContractStatusBadge({ status, size = 'default' }: Props) {
  return (
    <Tag color={CONTRACT_STATUS_COLOR[status]} size={size === 'default' ? 'medium' : size}>
      {CONTRACT_STATUS_LABEL[status]}
    </Tag>
  );
}
