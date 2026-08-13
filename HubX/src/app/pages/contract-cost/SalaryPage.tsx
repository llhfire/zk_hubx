import { useState } from 'react';
import { Button, Card, Modal, Select, Space, Table, Tag, Typography, Upload } from '@arco-design/web-react';
import { IconImport } from '@arco-design/web-react/icon';
import {
  contractCostPermissions,
  getHourlyRate,
  getSalaryForMonth,
  mockSalaryData,
  type MonthlySalaryRecord,
} from './contractCostData';

const Title = Typography.Title;
const Text = Typography.Text;

const MONTHS = ['2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];

export function SalaryPage() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [hoursModalVisible, setHoursModalVisible] = useState(false);

  const { salaryView, salaryEdit } = contractCostPermissions;

  if (!salaryView) {
    return (
      <Card>
        <Text>暂无权限查看工资表</Text>
      </Card>
    );
  }

  const data = getSalaryForMonth(selectedMonth, mockSalaryData);

  const mask = (value: string | number) => (salaryView ? value : '***');

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
      render: (value: number) => mask(value.toLocaleString()),
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
        mask(getHourlyRate(record, false).toFixed(2)),
    },
    {
      title: '实际月工资',
      width: 120,
      render: (_: unknown, record: MonthlySalaryRecord) =>
        record.actualSalary != null ? mask(record.actualSalary.toLocaleString()) : '-',
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
          ? mask(getHourlyRate(record, true).toFixed(2))
          : '-',
    },
    {
      title: '状态',
      width: 100,
      render: (_: unknown, record: MonthlySalaryRecord) =>
        record.inherited ? (
          <Tag color="orangered">沿用上月</Tag>
        ) : (
          <Tag color="green">已录入</Tag>
        ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4} style={{ margin: 0 }}>工资表</Title>
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
      </div>

      <Card>
        <Table
          columns={columns}
          data={data}
          rowKey="employeeId"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 导入工资弹窗 */}
      <Modal
        title="导入工资"
        visible={salaryModalVisible}
        onCancel={() => setSalaryModalVisible(false)}
        onOk={() => setSalaryModalVisible(false)}
        okText="确认导入"
        style={{ width: 520 }}
      >
        <Upload drag tip="点击或拖拽文件到此区域上传" accept=".xlsx,.xls,.csv" />
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
        <Upload drag tip="点击或拖拽文件到此区域上传" accept=".xlsx,.xls,.csv" />
      </Modal>
    </div>
  );
}
