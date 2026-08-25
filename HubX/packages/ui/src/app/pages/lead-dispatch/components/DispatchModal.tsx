// 派发弹窗（阶段 C）
// 选部门→选销售（EmployeeContext）或公海；支持单条/批量。
// PLAN.md 决策 19：先勾选行 → 再点按钮 → 弹窗选统一目标。

import { useEffect, useMemo, useState } from 'react';
import { Modal, Radio, Select, Space, Typography } from '@arco-design/web-react';
import type { DispatchTarget } from '../types';
import type { Employee } from '@/app/pages/employee/mockData';

const { Option } = Select;

export interface DispatchModalPayload {
  target: DispatchTarget;
  /** 指派销售时有值 */
  assignee?: string;
}

interface DispatchModalProps {
  visible: boolean;
  /** 勾选的线索数量（用于标题提示） */
  leadCount: number;
  /** 候选销售列表（EmployeeContext 动态读取） */
  employees: Employee[];
  onClose: () => void;
  onConfirm: (payload: DispatchModalPayload) => void;
}

export function DispatchModal({ visible, leadCount, employees, onClose, onConfirm }: DispatchModalProps) {
  const [target, setTarget] = useState<DispatchTarget>('sales');
  const [department, setDepartment] = useState('');
  const [assignee, setAssignee] = useState('');

  // 部门去重列表
  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department))].sort(),
    [employees],
  );

  // 选中部门下的销售（按岗位过滤：销售/商务等，不含管理岗）
  const salesInDept = useMemo(() => {
    if (!department) return [];
    return employees.filter(
      (e) => e.department === department && !/总|经理|主管/.test(e.position),
    );
  }, [employees, department]);

  // 切部门时清空已选销售
  useEffect(() => {
    setAssignee('');
  }, [department]);

  // 打开弹窗时重置
  useEffect(() => {
    if (visible) {
      setTarget('sales');
      setDepartment('');
      setAssignee('');
    }
  }, [visible]);

  const canConfirm = target === 'pool' || (target === 'sales' && !!assignee);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      target,
      assignee: target === 'sales' ? assignee : undefined,
    });
  };

  return (
    <Modal
      title={`派发线索（${leadCount} 条）`}
      visible={visible}
      onCancel={onClose}
      onOk={handleConfirm}
      okButtonProps={{ disabled: !canConfirm }}
      okText="确认派发"
      cancelText="取消"
      style={{ width: 420 }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 目标选择 */}
        <div>
          <Typography.Text style={{ marginBottom: 4, display: 'block' }}>派发目标</Typography.Text>
          <Radio.Group value={target} onChange={(v) => setTarget(v as DispatchTarget)}>
            <Radio value="sales">指派销售</Radio>
            <Radio value="pool">派发到公海</Radio>
          </Radio.Group>
        </div>

        {/* 指派销售：部门→销售 二级联动 */}
        {target === 'sales' && (
          <>
            <div>
              <Typography.Text style={{ marginBottom: 4, display: 'block' }}>选择部门</Typography.Text>
              <Select
                placeholder="请选择部门"
                value={department || undefined}
                onChange={(v) => setDepartment(v as string)}
                style={{ width: '100%' }}
                showSearch
              >
                {departments.map((d) => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </div>
            <div>
              <Typography.Text style={{ marginBottom: 4, display: 'block' }}>选择销售</Typography.Text>
              <Select
                placeholder={department ? '请选择销售' : '请先选择部门'}
                value={assignee || undefined}
                onChange={(v) => setAssignee(v as string)}
                style={{ width: '100%' }}
                disabled={!department}
                showSearch
              >
                {salesInDept.map((e) => (
                  <Option key={e.id} value={e.name}>{e.name}（{e.position}）</Option>
                ))}
              </Select>
            </div>
          </>
        )}

        {/* 公海说明 */}
        {target === 'pool' && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            线索将进入公海池，所有销售人员均可领取。
          </Typography.Text>
        )}
      </Space>
    </Modal>
  );
}
