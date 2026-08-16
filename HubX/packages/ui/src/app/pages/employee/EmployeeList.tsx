import { useState, useMemo, useRef } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Input,
  InputNumber,
  Select,
  Modal,
  Form,
  DatePicker,
  Descriptions,
  Message,
  Dropdown,
  Menu,
  Tree,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconBranch,
  IconPlus,
  IconSearch,
  IconUser,
  IconUserGroup,
  IconCalendar,
  IconMore,
  IconUpload,
  IconDownload,
} from '@arco-design/web-react/icon';
import { useEmployee } from './EmployeeContext';
import {
  ALL_JOB_LEVELS,
  ALL_EMPLOYMENT_STATUSES,
  DEPARTMENTS,
  formatCurrency,
  getStatusColor,
  calcWorkDays,
} from './mockData';
import type { Employee, EmploymentStatus, JobLevel } from './mockData';
import { useIntegration } from '../../integrations/IntegrationContext';

const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;

const ORGANIZATION_TREE = [
  {
    key: 'company',
    title: '总公司',
    children: [
      {
        key: 'technology',
        title: '技术部',
        children: [
          { key: 'frontend', title: '前端组' },
          { key: 'backend', title: '后端组' },
        ],
      },
      {
        key: 'sales',
        title: '销售部',
        children: [
          { key: 'east', title: '华东区' },
          { key: 'north', title: '华北区' },
        ],
      },
      { key: 'product', title: '产品部' },
      { key: 'administration', title: '行政部' },
      { key: 'hr', title: '人事部' },
      { key: 'finance', title: '财务部' },
    ],
  },
];

const ORGANIZATION_DEPARTMENT_SCOPE: Record<string, string[]> = {
  company: DEPARTMENTS,
  technology: ['技术部', '前端组', '后端组'],
  frontend: ['前端组'],
  backend: ['后端组'],
  sales: ['销售部', '华东区', '华北区'],
  east: ['华东区'],
  north: ['华北区'],
  product: ['产品部'],
  administration: ['行政部'],
  hr: ['人事部'],
  finance: ['财务部'],
};

const ORGANIZATION_LABELS: Record<string, string> = {
  company: '总公司',
  technology: '技术部',
  frontend: '前端组',
  backend: '后端组',
  sales: '销售部',
  east: '华东区',
  north: '华北区',
  product: '产品部',
  administration: '行政部',
  hr: '人事部',
  finance: '财务部',
};

const EMPLOYEE_IMPORT_HEADERS = ['用户名', '姓名', '所属部门', '职位', '职级', '在职状态', '手机号', '邮箱', '入职日期', '转正时间', '合同到期日', '标准时薪', '试用期工资', '转正工资', '社保', '公积金', '每月工天'];

type ImportedEmployee = Omit<Employee, 'id' | 'capability' | 'personality'>;

export function EmployeeList() {
  const { employees, positions, addEmployee, updateEmployee } = useEmployee();
  const { bindings } = useIntegration();
  const currentDate = new Date().toISOString().slice(0, 10);

  // 搜索筛选
  const [keyword, setKeyword] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<JobLevel | ''>('');
  const [filterStatus, setFilterStatus] = useState<EmploymentStatus | ''>('');
  const [selectedOrganization, setSelectedOrganization] = useState('company');

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<ImportedEmployee[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // 筛选后数据
  const filteredEmployees = useMemo(() => {
    const departmentScope = ORGANIZATION_DEPARTMENT_SCOPE[selectedOrganization] || DEPARTMENTS;
    return employees.filter(e => {
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!e.name.toLowerCase().includes(kw) && !e.jobNumber.toLowerCase().includes(kw)) return false;
      }
      if (filterPosition && e.position !== filterPosition) return false;
      if (filterLevel && e.level !== filterLevel) return false;
      if (filterStatus && e.employmentStatus !== filterStatus) return false;
      if (!departmentScope.includes(e.department)) return false;
      return true;
    });
  }, [employees, keyword, filterPosition, filterLevel, filterStatus, selectedOrganization]);

  // 摘要统计
  const currentMonth = new Date().toISOString().slice(0, 7);
  const stats = useMemo(() => {
    const total = employees.filter(e => e.employmentStatus !== '已离职').length;
    const thisMonthHire = employees.filter(e => e.hireDate.startsWith(currentMonth)).length;
    const thisMonthLeave = employees.filter(
      e => e.employmentStatus === '已离职' && (e as any).leaveDate?.startsWith(currentMonth),
    ).length;
    const onTrial = employees.filter(e => e.employmentStatus === '试用期').length;
    return { total, thisMonthHire, thisMonthLeave, onTrial };
  }, [employees, currentMonth]);

  // 操作
  const handleAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    form.setFieldsValue({
      employmentStatus: '在职',
      hireDate: new Date().toISOString().slice(0, 10),
      salaryAdjustment: 0,
      monthlyWorkdays: 22,
    });
    setModalVisible(true);
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    form.setFieldsValue(emp);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validate().then(values => {
      const nextValues = {
        ...values,
        standardHourlyRate: editingEmployee?.standardHourlyRate ?? 0,
      };
      if (editingEmployee) {
        updateEmployee(editingEmployee.id, nextValues);
        Message.success('编辑成功');
      } else {
        addEmployee(nextValues);
        Message.success('新增成功');
      }
      setModalVisible(false);
    });
  };

  const handleRegularize = (emp: Employee) => {
    const today = new Date().toISOString().slice(0, 10);
    updateEmployee(emp.id, { employmentStatus: '已转正', 转正Date: today });
    Message.success(`${emp.name} 已转正`);
  };

  const handleResign = (emp: Employee) => {
    const today = new Date().toISOString().slice(0, 10);
    updateEmployee(emp.id, { employmentStatus: '已离职', /* leaveDate: today */ } as any);
    Message.success(`${emp.name} 已标记为离职`);
  };

  const handleExport = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('员工列表');
    worksheet.addRow(EMPLOYEE_IMPORT_HEADERS);
    employees.forEach(employee => {
      worksheet.addRow([
        employee.jobNumber,
        employee.name,
        employee.department,
        employee.position,
        employee.level,
        employee.employmentStatus,
        employee.phone,
        employee.email,
        employee.hireDate,
        employee.转正Date,
        employee.contractEndDate,
        employee.standardHourlyRate,
        employee.probationSalary ?? '',
        employee.regularSalary ?? '',
        employee.socialSecurity ?? '',
        employee.housingFund ?? '',
        employee.monthlyWorkdays ?? '',
      ]);
    });
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.columns.forEach(column => { column.width = 16; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `员工列表-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    Message.success(`已导出 ${employees.length} 条员工记录`);
  };

  const resetImport = () => {
    setImportFileName('');
    setImportRows([]);
    setImportErrors([]);
  };

  const readEmployeeFile = async (file: File) => {
    setImportLoading(true);
    resetImport();
    setImportFileName(file.name);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()));
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('Excel 中没有可读取的工作表');
      const headerIndexes = new Map<string, number>();
      worksheet.getRow(1).eachCell((cell, columnNumber) => headerIndexes.set(cell.text.trim(), columnNumber));
      const requiredHeaders = ['用户名', '姓名', '所属部门', '职位', '职级', '在职状态', '手机号', '入职日期'];
      const missingHeaders = requiredHeaders.filter(header => !headerIndexes.has(header));
      if (missingHeaders.length) throw new Error(`缺少必填列：${missingHeaders.join('、')}`);
      const getText = (rowNumber: number, header: string) => {
        const columnNumber = headerIndexes.get(header);
        return columnNumber ? worksheet.getRow(rowNumber).getCell(columnNumber).text.trim() : '';
      };
      const rows: ImportedEmployee[] = [];
      const errors: string[] = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const jobNumber = getText(rowNumber, '用户名');
        const name = getText(rowNumber, '姓名');
        if (!jobNumber && !name) continue;
        const department = getText(rowNumber, '所属部门');
        const position = getText(rowNumber, '职位');
        const level = getText(rowNumber, '职级') as JobLevel;
        const employmentStatus = (getText(rowNumber, '在职状态') || '在职') as EmploymentStatus;
        const phone = getText(rowNumber, '手机号');
        const hireDate = getText(rowNumber, '入职日期');
        if (!jobNumber || !name || !department || !position || !level || !phone || !hireDate) {
          errors.push(`第 ${rowNumber} 行：用户名、姓名、部门、职位、职级、手机号和入职日期不能为空`);
          continue;
        }
        if (!ALL_JOB_LEVELS.includes(level) || !ALL_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
          errors.push(`第 ${rowNumber} 行：职级或在职状态无效`);
          continue;
        }
        rows.push({
          name,
          jobNumber,
          department,
          position,
          level,
          employmentStatus,
          phone,
          email: getText(rowNumber, '邮箱'),
          hireDate,
          转正Date: getText(rowNumber, '转正时间'),
          contractEndDate: getText(rowNumber, '合同到期日'),
          standardHourlyRate: Number(getText(rowNumber, '标准时薪')) || 0,
          probationSalary: Number(getText(rowNumber, '试用期工资')) || 0,
          regularSalary: Number(getText(rowNumber, '转正工资')) || 0,
          socialSecurity: Number(getText(rowNumber, '社保')) || 0,
          housingFund: Number(getText(rowNumber, '公积金')) || 0,
          salaryAdjustment: 0,
          salaryEffectiveDate: '',
          sharedOverheadCost: 0,
          monthlyWorkdays: Number(getText(rowNumber, '每月工天')) || 0,
        });
      }
      setImportRows(rows);
      setImportErrors(errors);
      if (!rows.length && !errors.length) setImportErrors(['Excel 中没有可导入的数据']);
    } catch (error) {
      setImportErrors([error instanceof Error ? error.message : 'Excel 解析失败，请检查文件格式']);
    } finally {
      setImportLoading(false);
    }
  };

  const confirmImport = () => {
    if (!importRows.length || importErrors.length) return;
    importRows.forEach(employee => addEmployee(employee));
    setImportVisible(false);
    resetImport();
    Message.success(`成功导入 ${importRows.length} 名员工`);
  };

  // 表格列
  const columns = [
    {
      title: '用户名',
      dataIndex: 'jobNumber',
      width: 90,
      fixed: 'left' as const,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 80,
      fixed: 'left' as const,
      render: (_: unknown, record: Employee) => (
        <Space>
          <span style={{ color: 'var(--color-text-1)', fontWeight: 500 }}>{record.name}</span>
        </Space>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 100,
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 100,
      render: (pos: string) => <Tag>{pos}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'employmentStatus',
      width: 80,
      render: (status: EmploymentStatus) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '企业微信',
      width: 105,
      render: (_: unknown, record: Employee) => {
        const binding = bindings.find(item => item.employeeId === record.id);
        return binding?.bindingStatus === 'bound'
          ? <Tag color="green">已绑定</Tag>
          : binding?.bindingStatus === 'conflict'
            ? <Tag color="red">冲突</Tag>
            : <Tag color="gray">待绑定</Tag>;
      },
    },
    {
      title: '同步状态',
      width: 105,
      render: (_: unknown, record: Employee) => {
        const binding = bindings.find(item => item.employeeId === record.id);
        return binding?.syncStatus === 'synced'
          ? <Tag color="arcoblue">已同步</Tag>
          : <Tag color="gray">未同步</Tag>;
      },
    },
    { title: '试用期工资', dataIndex: 'probationSalary', width: 120, render: (value?: number) => value == null ? '-' : formatCurrency(value), sorter: (a: Employee, b: Employee) => (a.probationSalary ?? 0) - (b.probationSalary ?? 0) },
    {
      title: '转正工资',
      dataIndex: 'regularSalary',
      width: 130,
      render: (value: number | undefined, record: Employee) => {
        if (value == null) return '-';
        const hasAdjustment = record.salaryAdjustment != null && record.salaryAdjustment !== 0;
        const adjustedSalary = value + (record.salaryAdjustment ?? 0);
        const adjustmentEffective = hasAdjustment
          && Boolean(record.salaryEffectiveDate)
          && record.salaryEffectiveDate! <= currentDate;
        if (adjustmentEffective) return formatCurrency(adjustedSalary);
        return <div>
          <div>{formatCurrency(value)}</div>
          {hasAdjustment && (
            <Tooltip content={`生效日期：${record.salaryEffectiveDate || '未设置'}`}>
              <div style={{ marginTop: 2, color: 'var(--color-text-3)', fontSize: 12, cursor: 'help' }}>
                {formatCurrency(adjustedSalary)}
              </div>
            </Tooltip>
          )}
        </div>;
      },
      sorter: (a: Employee, b: Employee) => {
        const getCurrentSalary = (employee: Employee) => {
          const effective = Boolean(employee.salaryEffectiveDate)
            && employee.salaryEffectiveDate! <= currentDate;
          return (employee.regularSalary ?? 0) + (effective ? employee.salaryAdjustment ?? 0 : 0);
        };
        return getCurrentSalary(a) - getCurrentSalary(b);
      },
    },
    { title: '社保', dataIndex: 'socialSecurity', width: 100, render: (value?: number) => value == null ? '-' : formatCurrency(value) },
    { title: '公积金', dataIndex: 'housingFund', width: 100, render: (value?: number) => value == null ? '-' : formatCurrency(value) },
    { title: '转正时间', dataIndex: '转正Date', width: 110, render: (value: string) => value || '-' },
    { title: '每月工天', dataIndex: 'monthlyWorkdays', width: 100, render: (value?: number) => value == null ? '-' : `${value}天`, sorter: (a: Employee, b: Employee) => (a.monthlyWorkdays ?? 0) - (b.monthlyWorkdays ?? 0) },
    {
      title: '入职日期',
      dataIndex: 'hireDate',
      width: 110,
    },
    {
      title: '入职天数',
      width: 90,
      render: (_: unknown, record: Employee) => `${calcWorkDays(record.hireDate)}天`,
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, record: Employee) => (
        <Space>
          <Button type="text" size="small" onClick={() => setDetailEmployee(record)}>
            查看
          </Button>
          <Button type="text" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Dropdown
            droplist={
              <Menu>
                <Menu.Item key="regularize" onClick={() => handleRegularize(record)}>
                  办理转正
                </Menu.Item>
                <Menu.Item key="resign" onClick={() => handleResign(record)}>
                  办理离职
                </Menu.Item>
              </Menu>
            }
            position="br"
          >
            <Button type="text" size="small" icon={<IconMore />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 2fr) minmax(0, 8fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card
          title={
            <Space size={8}>
              <IconBranch />
              <span>组织架构</span>
            </Space>
          }
          style={{ position: 'sticky', top: 16 }}
          bodyStyle={{ padding: 12 }}
        >
          <Tree
            blockNode
            defaultExpandAll
            selectedKeys={[selectedOrganization]}
            treeData={ORGANIZATION_TREE}
            onSelect={(selectedKeys) => {
              if (selectedKeys[0]) setSelectedOrganization(selectedKeys[0]);
            }}
            renderTitle={(node) => {
              const nodeKey = String(node.key);
              const departmentScope = ORGANIZATION_DEPARTMENT_SCOPE[nodeKey] || [];
              const employeeCount = employees.filter(employee => (
                departmentScope.includes(employee.department)
              )).length;
              return (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    width: '100%',
                  }}
                >
                  <span>{node.title}</span>
                  {employeeCount > 0 && (
                    <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
                      {employeeCount}
                    </span>
                  )}
                </span>
              );
            }}
          />
        </Card>

        <Space direction="vertical" size={16} style={{ width: '100%', minWidth: 0 }}>
          {/* 摘要栏 */}
          <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>在职总数</span>}
              value={stats.total}
              prefix={<IconUser style={{ color: 'rgb(var(--primary-6))' }} />}
              groupSeparator
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>本月入职</span>}
              value={stats.thisMonthHire}
              prefix={<IconUserGroup style={{ color: 'var(--success-500)' }} />}
              groupSeparator
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>本月离职</span>}
              value={stats.thisMonthLeave}
              prefix={<IconUser style={{ color: 'var(--destructive-500)' }} />}
              groupSeparator
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>试用期人数</span>}
              value={stats.onTrial}
              prefix={<IconCalendar style={{ color: 'var(--warning-500)' }} />}
              groupSeparator
            />
          </Card>
        </Col>
          </Row>

          {/* 筛选 + 表格 */}
          <Card
            bordered={false}
            title="员工列表"
            extra={<Tag color="arcoblue">{ORGANIZATION_LABELS[selectedOrganization]}</Tag>}
          >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Input
            style={{ width: 200 }}
            placeholder="搜索姓名或用户名"
            prefix={<IconSearch />}
            allowClear
            value={keyword}
            onChange={setKeyword}
          />
          <Select
            style={{ width: 130 }}
            placeholder="全部职位"
            allowClear
            value={filterPosition}
            onChange={v => setFilterPosition(v || '')}
          >
            {positions.map(p => (
              <Select.Option key={p} value={p}>{p}</Select.Option>
            ))}
          </Select>
          <Select
            style={{ width: 110 }}
            placeholder="全部职级"
            allowClear
            value={filterLevel}
            onChange={v => setFilterLevel(v as JobLevel | '')}
          >
            {ALL_JOB_LEVELS.map(l => (
              <Select.Option key={l} value={l}>{l}</Select.Option>
            ))}
          </Select>
          <Select
            style={{ width: 120 }}
            placeholder="全部状态"
            allowClear
            value={filterStatus}
            onChange={v => setFilterStatus(v as EmploymentStatus | '')}
          >
            {ALL_EMPLOYMENT_STATUSES.map(s => (
              <Select.Option key={s} value={s}>{s}</Select.Option>
            ))}
          </Select>
          <div style={{ marginLeft: 'auto' }}>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setImportVisible(true);
                  void readEmployeeFile(file);
                }
                event.target.value = '';
              }}
            />
            <Space>
              <Button icon={<IconUpload />} onClick={() => importFileRef.current?.click()}>
                导入
              </Button>
              <Button icon={<IconDownload />} onClick={() => void handleExport()}>
                导出
              </Button>
            <Button type="primary" icon={<IconPlus />} onClick={handleAdd}>
              新增员工
            </Button>
            </Space>
          </div>
        </div>

        <Table
          columns={columns as any}
          data={filteredEmployees}
          rowKey="id"
          pagination={{ pageSize: 12, showTotal: true, showJumper: true }}
          scroll={{ x: 1860 }}
        />
          </Card>
        </Space>
      </div>

      <Modal
        title={detailEmployee ? `员工详情 · ${detailEmployee.name}` : '员工详情'}
        visible={Boolean(detailEmployee)}
        footer={null}
        onCancel={() => setDetailEmployee(null)}
        style={{ width: 860, maxWidth: 'calc(100vw - 32px)' }}
      >
        {detailEmployee && (() => {
          const binding = bindings.find(item => item.employeeId === detailEmployee.id);
          const salaryEffective = Boolean(detailEmployee.salaryEffectiveDate)
            && detailEmployee.salaryEffectiveDate! <= currentDate;
          const regularSalary = (detailEmployee.regularSalary ?? 0)
            + (salaryEffective ? detailEmployee.salaryAdjustment ?? 0 : 0);
          const descriptionData = [
            { label: '用户名', value: detailEmployee.jobNumber || '-' },
            { label: '姓名', value: detailEmployee.name || '-' },
            { label: '所属部门', value: detailEmployee.department || '-' },
            { label: '职位', value: detailEmployee.position || '-' },
            { label: '职级', value: detailEmployee.level || '-' },
            { label: '在职状态', value: detailEmployee.employmentStatus || '-' },
            { label: '企业微信', value: binding?.bindingStatus === 'bound' ? '已绑定' : binding?.bindingStatus === 'conflict' ? '冲突' : '待绑定' },
            { label: '同步状态', value: binding?.syncStatus === 'synced' ? '已同步' : '未同步' },
            { label: '手机号', value: detailEmployee.phone || '-' },
            { label: '邮箱', value: detailEmployee.email || '-' },
            { label: '入职日期', value: detailEmployee.hireDate || '-' },
            { label: '转正时间', value: detailEmployee.转正Date || '-' },
            { label: '合同到期日', value: detailEmployee.contractEndDate || '-' },
            { label: '入职天数', value: `${calcWorkDays(detailEmployee.hireDate)}天` },
            { label: '试用期工资', value: detailEmployee.probationSalary == null ? '-' : formatCurrency(detailEmployee.probationSalary) },
            { label: '转正工资', value: detailEmployee.regularSalary == null ? '-' : formatCurrency(regularSalary) },
            { label: '社保', value: detailEmployee.socialSecurity == null ? '-' : formatCurrency(detailEmployee.socialSecurity) },
            { label: '公积金', value: detailEmployee.housingFund == null ? '-' : formatCurrency(detailEmployee.housingFund) },
            { label: '每月工天', value: detailEmployee.monthlyWorkdays == null ? '-' : `${detailEmployee.monthlyWorkdays}天` },
            { label: '身份证号', value: detailEmployee.idCard || '-' },
            { label: '银行卡号', value: detailEmployee.bankAccount || '-' },
            { label: '紧急联系人', value: detailEmployee.emergencyContact || '-' },
            { label: '学历', value: detailEmployee.education || '-' },
            { label: '毕业院校', value: detailEmployee.school || '-' },
            { label: '工作经历', value: detailEmployee.previousExperience || '-' },
          ];

          return (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions
                column={2}
                border
                data={descriptionData}
                labelStyle={{ width: 110 }}
              />
              <Card title="简历附件" bordered bodyStyle={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span>{detailEmployee.resumeAttachment || '暂未上传简历附件'}</span>
                  <Button
                    size="small"
                    icon={<IconDownload />}
                    disabled={!detailEmployee.resumeAttachment}
                    onClick={() => Message.success(`已开始下载：${detailEmployee.resumeAttachment}`)}
                  >
                    下载
                  </Button>
                </div>
              </Card>
            </Space>
          );
        })()}
      </Modal>

      <Modal
        title="导入员工"
        visible={importVisible}
        onOk={confirmImport}
        onCancel={() => { setImportVisible(false); resetImport(); }}
        okButtonProps={{ disabled: importLoading || !importRows.length || importErrors.length > 0 }}
        style={{ width: 860 }}
        maskClosable={false}
      >
        <div style={{ color: 'var(--color-text-3)', marginBottom: 12 }}>
          支持 .xlsx 文件。必填列：用户名、姓名、所属部门、职位、职级、在职状态、手机号、入职日期；其余列可选。
        </div>
        {importFileName && <Tag color="arcoblue">{importFileName}</Tag>}
        {importLoading && <div style={{ padding: 32, textAlign: 'center' }}>正在解析 Excel...</div>}
        {importErrors.length > 0 && (
          <div style={{ marginTop: 12, color: 'rgb(var(--red-6))' }}>
            {importErrors.map(error => <div key={error}>{error}</div>)}
          </div>
        )}
        {!importLoading && importRows.length > 0 && (
          <Table
            rowKey="jobNumber"
            pagination={false}
            data={importRows}
            scroll={{ x: 980, y: 320 }}
            style={{ marginTop: 16 }}
            columns={[
              { title: '用户名', dataIndex: 'jobNumber', width: 110 },
              { title: '姓名', dataIndex: 'name', width: 90 },
              { title: '部门', dataIndex: 'department', width: 110 },
              { title: '职位', dataIndex: 'position', width: 110 },
              { title: '职级', dataIndex: 'level', width: 80 },
              { title: '状态', dataIndex: 'employmentStatus', width: 100 },
              { title: '入职日期', dataIndex: 'hireDate', width: 120 },
            ]}
          />
        )}
      </Modal>

      {/* 新增 / 编辑弹窗 */}
      <Modal
        title={
          <Space>
            <IconUser />
            <span>{editingEmployee ? '编辑员工' : '新增员工'}</span>
          </Space>
        }
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 760 }}
      >
        <Form form={form} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="用户名" field="jobNumber" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="请输入用户名" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="姓名" field="name" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="所属部门" field="department" rules={[{ required: true, message: '请选择部门' }]}>
                <Select placeholder="请选择部门" allowClear>
                  {DEPARTMENTS.map(d => (
                    <Select.Option key={d} value={d}>{d}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="职位" field="position" rules={[{ required: true, message: '请选择职位' }]}>
                <Select placeholder="请选择职位" allowClear>
                  {positions.map(p => (
                    <Select.Option key={p} value={p}>{p}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="职级" field="level" rules={[{ required: true, message: '请选择职级' }]}>
                <Select placeholder="请选择职级" allowClear>
                  {ALL_JOB_LEVELS.map(l => (
                    <Select.Option key={l} value={l}>{l}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="在职状态" field="employmentStatus" rules={[{ required: true, message: '请选择状态' }]}>
                <Select placeholder="请选择状态">
                  {ALL_EMPLOYMENT_STATUSES.map(s => (
                    <Select.Option key={s} value={s}>{s}</Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem
                label="手机号"
                field="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { match: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem
                label="邮箱"
                field="email"
                rules={[{ match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' }]}
              >
                <Input placeholder="请输入邮箱" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="入职日期" field="hireDate" rules={[{ required: true, message: '请选择入职日期' }]}>
                <DatePicker placeholder="请选择入职日期" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="合同到期日" field="contractEndDate">
                <DatePicker placeholder="请选择合同到期日" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="试用期工资" field="probationSalary" rules={[{ required: true, message: '请输入试用期工资' }]}>
                <InputNumber min={0} precision={0} prefix="¥" placeholder="请输入试用期工资" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="转正工资" field="regularSalary" rules={[{ required: true, message: '请输入转正工资' }]}>
                <InputNumber min={0} precision={0} prefix="¥" placeholder="请输入转正工资" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="社保" field="socialSecurity" rules={[{ required: true, message: '请输入社保金额' }]}>
                <InputNumber min={0} precision={0} prefix="¥" placeholder="请输入社保金额" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="公积金" field="housingFund" rules={[{ required: true, message: '请输入公积金金额' }]}>
                <InputNumber min={0} precision={0} prefix="¥" placeholder="请输入公积金金额" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="每月工天" field="monthlyWorkdays">
                <InputNumber min={0} precision={1} suffix="天" placeholder="请输入每月工天" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="转正时间" field="转正Date">
                <DatePicker placeholder="请选择转正时间" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="薪资调整" field="salaryAdjustment">
                <InputNumber precision={0} prefix="¥" placeholder="加薪输入正数，降薪输入负数" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="生效时间" field="salaryEffectiveDate">
                <DatePicker placeholder="请选择生效时间" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="学历" field="education">
                <Input placeholder="如 本科/硕士/大专" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="毕业院校" field="school">
                <Input placeholder="请输入毕业院校" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
        </Form>
      </Modal>
    </>
  );
}
