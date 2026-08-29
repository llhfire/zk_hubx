import { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Empty, Input, Select, Table, Tabs, Tag } from '@arco-design/web-react';
import { IconRefresh, IconSearch } from '@arco-design/web-react/icon';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import {
  calculateSystemLogMetrics,
  EMPTY_LOG_FILTERS,
  filterLoginLogs,
  filterOperationLogs,
  hasLogFilters,
  type LogFilters,
  type LogStatusFilter,
} from './systemLogModel';
import './systemAdministrationLists.css';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const mockOperationLogs = [
  { id: '1', username: 'admin', name: '管理员', module: '用户管理', operation: '新建用户', method: 'POST /api/users', params: '{"username":"zhangsan","name":"张三"}', ip: '192.168.1.100', location: '北京市', status: '成功', errorMsg: '', duration: '120ms', time: '2026-04-19 10:30:25' },
  { id: '2', username: 'zhangsan', name: '张三', module: '线索管理', operation: '新建线索', method: 'POST /api/leads', params: '{"name":"某公司APP开发需求"}', ip: '192.168.1.101', location: '上海市', status: '成功', errorMsg: '', duration: '95ms', time: '2026-04-19 10:25:18' },
  { id: '3', username: 'lisi', name: '李四', module: '客户管理', operation: '编辑客户', method: 'PUT /api/customers/123', params: '{"level":"VIP"}', ip: '192.168.1.102', location: '广州市', status: '成功', errorMsg: '', duration: '85ms', time: '2026-04-19 10:20:32' },
  { id: '4', username: 'wangwu', name: '王五', module: '系统配置', operation: '修改配置', method: 'PUT /api/config', params: '{"leadRecycleDays":7}', ip: '192.168.1.103', location: '深圳市', status: '失败', errorMsg: '权限不足', duration: '50ms', time: '2026-04-19 10:15:45' },
  { id: '5', username: 'admin', name: '管理员', module: '角色管理', operation: '权限配置', method: 'PUT /api/roles/2/permissions', params: '{"permissions":["customer-view","lead-my"]}', ip: '192.168.1.100', location: '北京市', status: '成功', errorMsg: '', duration: '110ms', time: '2026-04-19 10:10:20' },
];

const mockLoginLogs = [
  { id: '1', username: 'admin', name: '管理员', ip: '192.168.1.100', location: '北京市', browser: 'Chrome 122', os: 'Windows 10', status: '成功', message: '登录成功', time: '2026-04-19 09:00:00' },
  { id: '2', username: 'zhangsan', name: '张三', ip: '192.168.1.101', location: '上海市', browser: 'Chrome 122', os: 'macOS', status: '成功', message: '登录成功', time: '2026-04-19 08:50:15' },
  { id: '3', username: 'lisi', name: '李四', ip: '192.168.1.102', location: '广州市', browser: 'Safari 17', os: 'iOS', status: '成功', message: '登录成功', time: '2026-04-19 08:45:30' },
  { id: '4', username: 'wangwu', name: '王五', ip: '192.168.1.103', location: '深圳市', browser: 'Chrome 122', os: 'Android', status: '失败', message: '密码错误', time: '2026-04-19 08:40:20' },
  { id: '5', username: 'wangwu', name: '王五', ip: '192.168.1.103', location: '深圳市', browser: 'Chrome 122', os: 'Android', status: '成功', message: '登录成功', time: '2026-04-19 08:41:05' },
];

const operationColumns = [
  { title: '操作人', dataIndex: 'name', width: 100 },
  { title: '所属模块', dataIndex: 'module', width: 120 },
  { title: '操作类型', dataIndex: 'operation', width: 120 },
  { title: '请求方式', dataIndex: 'method', width: 200 },
  { title: 'IP 地址', dataIndex: 'ip', width: 130 },
  { title: '操作地点', dataIndex: 'location', width: 100 },
  { title: '状态', dataIndex: 'status', width: 80, render: (status: string) => <Tag color={status === '成功' ? 'green' : 'red'}>{status}</Tag> },
  { title: '耗时', dataIndex: 'duration', width: 80 },
  { title: '操作时间', dataIndex: 'time', width: 170 },
];

const loginColumns = [
  { title: '用户名', dataIndex: 'username', width: 120 },
  { title: '姓名', dataIndex: 'name', width: 100 },
  { title: 'IP 地址', dataIndex: 'ip', width: 130 },
  { title: '登录地点', dataIndex: 'location', width: 100 },
  { title: '浏览器', dataIndex: 'browser', width: 120 },
  { title: '操作系统', dataIndex: 'os', width: 120 },
  { title: '状态', dataIndex: 'status', width: 80, render: (status: string) => <Tag color={status === '成功' ? 'green' : 'red'}>{status}</Tag> },
  { title: '提示消息', dataIndex: 'message', width: 120 },
  { title: '登录时间', dataIndex: 'time', width: 170 },
];

const createEmptyFilters = (): LogFilters => ({ ...EMPTY_LOG_FILTERS, dateRange: [] });

export function SystemLog() {
  const [activeTab, setActiveTab] = useState<'operation' | 'login'>('operation');
  const [operationFilters, setOperationFilters] = useState<LogFilters>(createEmptyFilters);
  const [loginFilters, setLoginFilters] = useState<LogFilters>(createEmptyFilters);
  const filteredOperationLogs = useMemo(() => filterOperationLogs(mockOperationLogs, operationFilters), [operationFilters]);
  const filteredLoginLogs = useMemo(() => filterLoginLogs(mockLoginLogs, loginFilters), [loginFilters]);
  const metrics = useMemo(() => calculateSystemLogMetrics(mockOperationLogs, mockLoginLogs), []);
  const moduleOptions = useMemo(() => Array.from(new Set(mockOperationLogs.map(record => record.module))), []);
  const currentCount = activeTab === 'operation' ? filteredOperationLogs.length : filteredLoginLogs.length;

  const statusSelect = (filters: LogFilters, update: (next: LogFilters) => void) => (
    <Select className="system-admin-list__select" value={filters.status} onChange={(value) => update({ ...filters, status: value as LogStatusFilter })}>
      <Select.Option value="全部">全部状态</Select.Option>
      <Select.Option value="成功">成功</Select.Option>
      <Select.Option value="失败">失败</Select.Option>
    </Select>
  );

  const dateRange = (filters: LogFilters, update: (next: LogFilters) => void) => (
    <RangePicker className="system-admin-list__date" value={filters.dateRange} onChange={(value) => update({ ...filters, dateRange: value || [] })} />
  );

  return (
    <PageShell className="system-admin-list system-log-page">
      <PageHeader title="系统日志" description="集中查看操作与登录记录，快速定位异常行为和访问问题。" />

      <ProcessMetricGrid items={[
        { key: 'operation', label: '操作日志', value: metrics.operationCount, detail: '业务与配置操作' },
        { key: 'login', label: '登录日志', value: metrics.loginCount, detail: '账号访问记录' },
        { key: 'failure', label: '失败记录', value: metrics.failureCount, detail: '操作与登录合计', tone: 'danger' },
        { key: 'result', label: '当前结果', value: currentCount, detail: activeTab === 'operation' ? '操作日志筛选结果' : '登录日志筛选结果' },
      ]} />

      <Card bordered={false} className="system-admin-list__card">
        <Tabs activeTab={activeTab} onChange={(value) => setActiveTab(value as 'operation' | 'login')}>
          <TabPane key="operation" title="操作日志">
            <div className="system-admin-list__panel">
              <FilterBar actions={hasLogFilters(operationFilters) ? <Button type="text" icon={<IconRefresh />} onClick={() => setOperationFilters(createEmptyFilters())}>重置</Button> : undefined}>
                <Input className="system-admin-list__keyword" prefix={<IconSearch />} value={operationFilters.keyword} onChange={(keyword) => setOperationFilters(current => ({ ...current, keyword }))} placeholder="搜索操作人、操作类型、请求或 IP" allowClear />
                <Select className="system-admin-list__select" value={operationFilters.category || undefined} placeholder="全部模块" allowClear onChange={(category) => setOperationFilters(current => ({ ...current, category: category || '' }))}>
                  {moduleOptions.map(module => <Select.Option key={module} value={module}>{module}</Select.Option>)}
                </Select>
                {statusSelect(operationFilters, setOperationFilters)}
                {dateRange(operationFilters, setOperationFilters)}
              </FilterBar>
              <div className="system-admin-list__result-summary"><span>共 {filteredOperationLogs.length} 条操作日志</span>{hasLogFilters(operationFilters) && <span>已按当前条件筛选</span>}</div>
              {filteredOperationLogs.length ? (
                <Table columns={operationColumns} data={filteredOperationLogs} rowKey="id" pagination={{ pageSize: 10, showTotal: true }} scroll={{ x: 1200 }} />
              ) : (
                <div className="system-admin-list__empty"><Empty description="没有符合当前条件的操作日志" /><Button type="text" onClick={() => setOperationFilters(createEmptyFilters())}>清除筛选</Button></div>
              )}
            </div>
          </TabPane>

          <TabPane key="login" title="登录日志">
            <div className="system-admin-list__panel">
              <FilterBar actions={hasLogFilters(loginFilters) ? <Button type="text" icon={<IconRefresh />} onClick={() => setLoginFilters(createEmptyFilters())}>重置</Button> : undefined}>
                <Input className="system-admin-list__keyword" prefix={<IconSearch />} value={loginFilters.keyword} onChange={(keyword) => setLoginFilters(current => ({ ...current, keyword }))} placeholder="搜索用户、IP、地点或终端" allowClear />
                {statusSelect(loginFilters, setLoginFilters)}
                {dateRange(loginFilters, setLoginFilters)}
              </FilterBar>
              <div className="system-admin-list__result-summary"><span>共 {filteredLoginLogs.length} 条登录日志</span>{hasLogFilters(loginFilters) && <span>已按当前条件筛选</span>}</div>
              {filteredLoginLogs.length ? (
                <Table columns={loginColumns} data={filteredLoginLogs} rowKey="id" pagination={{ pageSize: 10, showTotal: true }} scroll={{ x: 1140 }} />
              ) : (
                <div className="system-admin-list__empty"><Empty description="没有符合当前条件的登录日志" /><Button type="text" onClick={() => setLoginFilters(createEmptyFilters())}>清除筛选</Button></div>
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </PageShell>
  );
}
