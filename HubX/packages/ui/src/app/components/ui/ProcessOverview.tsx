import type { ReactNode } from 'react';
import { Card, Steps } from '@arco-design/web-react';
import './uiFoundation.css';

const Step = Steps.Step;

export interface ProcessOverviewStep {
  key: string;
  title: ReactNode;
  description?: ReactNode;
}

interface ProcessOverviewProps {
  identifier?: ReactNode;
  title: ReactNode;
  tags?: ReactNode;
  actions?: ReactNode;
  steps: ProcessOverviewStep[];
  /** 从 0 开始的业务步骤索引。组件内部转换为 Arco Steps 的第 N 步。 */
  currentStep: number;
}

export function ProcessOverview({ identifier, title, tags, actions, steps, currentStep }: ProcessOverviewProps) {
  return (
    <Card className="hubx-process-overview">
      <div className="hubx-process-overview__head">
        <div className="hubx-process-overview__identity">
          {identifier && <span className="hubx-process-overview__identifier">{identifier}</span>}
          <span className="hubx-process-overview__title">{title}</span>
          {tags && <div className="hubx-process-overview__tags">{tags}</div>}
        </div>
        {actions && <div className="hubx-process-overview__actions">{actions}</div>}
      </div>
      <div className="hubx-process-overview__steps" aria-label="流程进度">
        <Steps current={Math.max(0, currentStep) + 1} size="small">
          {steps.map((step) => (
            <Step key={step.key} title={step.title} description={step.description} />
          ))}
        </Steps>
      </div>
    </Card>
  );
}
