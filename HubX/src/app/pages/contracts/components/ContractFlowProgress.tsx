import { Card, Steps } from '@arco-design/web-react';
import { CONTRACT_STATUS_LABEL } from '../utils';
import type { ContractStatus } from '../types';

const FLOW_ORDER: ContractStatus[] = [
  'draft',
  'approving',
  'pending_mail',
  'pending_return',
  'archived',
];

const STEP_DESCRIPTIONS: Record<ContractStatus, string> = {
  draft: '销售拟稿，可反复修改',
  approving: '商务/财务/法务依次审核',
  pending_mail: '审批通过，行政打印盖章并寄出',
  pending_return: '客户签字盖章后回寄',
  archived: '收到回寄件并扫描存档',
  voided: '合同已作废',
};

interface Props {
  status: ContractStatus;
}

export function ContractFlowProgress({ status }: Props) {
  if (status === 'voided') {
    return (
      <Card title="流转进度">
        <div style={{ padding: 16, color: 'var(--color-danger)', textAlign: 'center' }}>
          本合同已作废
        </div>
      </Card>
    );
  }

  const currentIdx = FLOW_ORDER.indexOf(status);
  const steps = FLOW_ORDER.map((s) => ({
    title: CONTRACT_STATUS_LABEL[s],
    description: STEP_DESCRIPTIONS[s],
  }));

  return (
    <Card title="流转进度" bordered size="small">
      <Steps direction="vertical" current={currentIdx >= 0 ? currentIdx + 1 : 0} size="small">
        {steps.map((s) => (
          <Steps.Step key={s.title} title={s.title} description={s.description} />
        ))}
      </Steps>
    </Card>
  );
}
