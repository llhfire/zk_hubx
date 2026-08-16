import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Form,
  Modal,
  Select,
  Space,
  Typography,
} from '@arco-design/web-react';
import type { DeliveryType, DeliveryConfig } from './types';
import { DELIVERY_TYPES } from './types';
import { SOP_PHASES, DELIVERY_TYPE_PHASE4_STEPS } from './constants';
import { SOP_STEP_TEMPLATES } from './sopTemplate';

const FormItem = Form.Item;
const { Text } = Typography;

/** 中文数字映射，用于板块显示 */
const PHASE_NO_CN: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
};

interface DeliveryConfigModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (config: DeliveryConfig) => void;
  contractId?: string;
  deliveryType?: DeliveryType;
  projectStartDate?: string;
}

export function DeliveryConfigModal({
  visible,
  onCancel,
  onConfirm,
  contractId,
  deliveryType,
  projectStartDate,
}: DeliveryConfigModalProps) {
  const hasContract = !!contractId;

  // 交付类型：有合同时从 props 取，无合同时由用户选择
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<DeliveryType | undefined>(
    deliveryType,
  );

  // 板块勾选：默认全选
  const [selectedPhases, setSelectedPhases] = useState<number[]>(
    SOP_PHASES.map((p) => p.phaseNo),
  );

  // 打开时重置状态
  useEffect(() => {
    if (!visible) return;
    setSelectedDeliveryType(deliveryType);
    if (hasContract) {
      // 有合同：默认全选
      setSelectedPhases(SOP_PHASES.map((p) => p.phaseNo));
    } else {
      // 无合同：板块一禁用且不选中
      setSelectedPhases(SOP_PHASES.filter((p) => p.phaseNo !== 1).map((p) => p.phaseNo));
    }
  }, [visible, hasContract, deliveryType]);

  // 当前生效的交付类型
  const effectiveDeliveryType = hasContract ? deliveryType : selectedDeliveryType;

  // 板块四预览步骤
  const phase4PreviewSteps = useMemo(() => {
    if (!effectiveDeliveryType) return [];
    const stepNos = DELIVERY_TYPE_PHASE4_STEPS[effectiveDeliveryType] ?? [];
    return stepNos
      .map((stepNo) => {
        const tpl = SOP_STEP_TEMPLATES.find((t) => t.stepNo === stepNo);
        return tpl ? { stepNo, stepName: tpl.stepName } : null;
      })
      .filter(Boolean) as Array<{ stepNo: string; stepName: string }>;
  }, [effectiveDeliveryType]);

  const startDateMissing = !projectStartDate;

  const handleConfirm = () => {
    if (!effectiveDeliveryType) return;
    onConfirm({
      selectedPhases,
      deliveryType: effectiveDeliveryType,
      contractId,
    });
  };

  const handlePhaseChange = (values: number[]) => {
    setSelectedPhases(values);
  };

  return (
    <Modal
      title="生成交付计划"
      visible={visible}
      onCancel={onCancel}
      autoFocus={false}
      focusLock
      style={{ width: 600 }}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={startDateMissing || !effectiveDeliveryType || selectedPhases.length === 0}
          >
            确认生成
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        {/* 项目开始日期缺失警告 */}
        {startDateMissing && (
          <Alert
            type="warning"
            content="请先在项目基础信息中填写开始日期"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 合同信息（有合同时展示） */}
        {hasContract && (
          <>
            <FormItem label="合同编号">
              <Text>{contractId}</Text>
            </FormItem>
            <FormItem label="交付类型">
              <Text>{deliveryType}</Text>
            </FormItem>
          </>
        )}

        {/* 交付类型选择（无合同时） */}
        {!hasContract && (
          <FormItem label="交付类型" required>
            <Select
              placeholder="请选择交付类型"
              value={selectedDeliveryType}
              onChange={(val: DeliveryType) => setSelectedDeliveryType(val)}
            >
              {DELIVERY_TYPES.map((dt) => (
                <Select.Option key={dt} value={dt}>
                  {dt}
                </Select.Option>
              ))}
            </Select>
          </FormItem>
        )}

        <Divider style={{ margin: '8px 0 16px' }} />

        {/* 板块选择 */}
        <FormItem label="选择交付板块">
          <Checkbox.Group
            value={selectedPhases}
            onChange={handlePhaseChange as (values: (string | number)[]) => void}
          >
            <Space direction="vertical">
              {SOP_PHASES.map((phase) => {
                const disabled = !hasContract && phase.phaseNo === 1;
                return (
                  <Checkbox
                    key={phase.phaseNo}
                    value={phase.phaseNo}
                    disabled={disabled}
                  >
                    {PHASE_NO_CN[phase.phaseNo]}、{phase.phaseName}
                  </Checkbox>
                );
              })}
            </Space>
          </Checkbox.Group>
        </FormItem>

        {/* 板块四步骤预览 */}
        {effectiveDeliveryType && (
          <>
            <Divider style={{ margin: '8px 0 16px' }} />
            <FormItem label={`板块四预览（${effectiveDeliveryType}）`}>
              <div
                style={{
                  background: 'var(--color-fill-1)',
                  borderRadius: 4,
                  padding: '8px 12px',
                }}
              >
                {phase4PreviewSteps.length === 0 ? (
                  <Text type="secondary">无匹配步骤</Text>
                ) : (
                  <Space direction="vertical" size={4}>
                    {phase4PreviewSteps.map((step) => (
                      <Text key={step.stepNo}>
                        {step.stepNo} {step.stepName}
                      </Text>
                    ))}
                  </Space>
                )}
              </div>
            </FormItem>
          </>
        )}
      </Form>
    </Modal>
  );
}
