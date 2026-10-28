import { useState } from 'react';
import { AsyncState, Button, Modal, Select, Space } from '@/design-system';
import { IconImport } from '@/design-system';
import {
  DataTable,
  MoneyText,
  PageHeader,
  PageShell,
  StatusTag,
  UploadPanel,
  type StatusMap,
  SectionCard,
} from '@/design-system';
import {
  contractCostPermissions,
  getHourlyRate,
  getSalaryForMonth,
  mockSalaryData,
  type MonthlySalaryRecord,
} from './contractCostData';

const MONTHS = ['2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];

const SALARY_STATUS: StatusMap<'inherited' | 'entered'> = {
  inherited: { label: '沿用上月', tone: 'warning' },
  entered: { label: '已录入', tone: 'success' },
};

export function SalaryPage() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [hoursModalVisible, setHoursModalVisible] = useState(false);

  const { salaryView, salaryEdit } = contractCostPermissions;

  const data = getSalaryForMonth(selectedMonth, mockSalaryData);

  const maskMoney = (value: number) => (salaryView ? <MoneyText value={value} /> : '***');

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 100,
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 140,
    },
    {
      title: '名义月工资',
      dataIndex: 'nominalSalary',
      width: 120,
      render: (value: number) => maskMoney(value),
    },
    {
      title: '名义月工时',
      dataIndex: 'nominalHours',
      width: 110,
    },
    {
      title: '名义时薪',
      width: 110,
      render: (_: unknown, record: MonthlySalaryRecord) =>
        maskMoney(getHourlyRate(record, false)),
    },
    {
      title: '实际月工资',
      width: 120,
      render: (_: unknown, record: MonthlySalaryRecord) =>
        record.actualSalary != null ? maskMoney(record.actualSalary) : '-',
    },
    {
      title: '实际月工时',
      width: 110,
      render: (_: unknown, record: MonthlySalaryRecord) =>
        record.actualHours != null ? record.actualHours : '-',
    },
    {
      title: '实际时薪',
      width: 110,
      render: (_: unknown, record: MonthlySalaryRecord) =>
        record.actualSalary != null && record.actualHours != null
          ? maskMoney(getHourlyRate(record, true))
          : '-',
    },
    {
      title: '状态',
      width: 100,
      render: (_: unknown, record: MonthlySalaryRecord) => (
        <StatusTag meta={SALARY_STATUS[record.inherited ? 'inherited' : 'entered']} />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="工资表"
        description="按月度导入工资与实际工时，作为人力成本核算的基数。"
        actions={salaryView && (
        <Space>
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            style={{ width: 160 }}
          >
            {MONTHS.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
          {salaryEdit && (
            <>
              <Button
                type="primary"
                icon={<IconImport />}
                onClick={() => setSalaryModalVisible(true)}
              >
                导入工资
              </Button>
              <Button
                icon={<IconImport />}
                onClick={() => setHoursModalVisible(true)}
              >
                导入实际工时
              </Button>
            </>
          )}
        </Space>
        )}
      />

      <AsyncState status={salaryView ? 'ready' : 'forbidden'} forbiddenText="暂无权限查看工资表">
      <SectionCard>
        <DataTable
          columns={columns}
          data={data}
          rowKey="employeeId"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </SectionCard>

      {/* 导入工资弹窗 */}
      <Modal
        title="导入工资"
        visible={salaryModalVisible}
        onCancel={() => setSalaryModalVisible(false)}
        onOk={() => setSalaryModalVisible(false)}
        okText="确认导入"
        style={{ width: 520 }}
      >
        <UploadPanel hint="点击或拖拽文件到此区域上传" accept=".xlsx,.xls,.csv" />
      </Modal>

      {/* 导入实际工时弹窗 */}
      <Modal
        title="导入实际工时"
        visible={hoursModalVisible}
        onCancel={() => setHoursModalVisible(false)}
        onOk={() => setHoursModalVisible(false)}
        okText="确认导入"
        style={{ width: 520 }}
      >
        <UploadPanel hint="点击或拖拽文件到此区域上传" accept=".xlsx,.xls,.csv" />
      </Modal>
      </AsyncState>
    </PageShell>
  );
}
