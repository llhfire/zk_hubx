import { useState, useMemo } from 'react';
import {
  Card,
  Empty,
  Grid,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Modal,
  Form,
  Input,
  Slider,
  InputNumber,
  Message,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconRefresh,
} from '@arco-design/web-react/icon';
import { useEmployee } from './EmployeeContext';
import {
  PerformanceReview,
  PerformanceRank,
  ReviewPeriod,
  calcPerformance,
  getRankColor,
} from './mockData';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import './employeeAdminConsistency.css';

const FormItem = Form.Item;
const { TextArea } = Input;

const RANK_META: Record<PerformanceRank, { color: string; label: string }> = {
  'S': { color: 'var(--chart-5)', label: '卓越' },
  'A': { color: 'var(--success-500)', label: '优秀' },
  'B': { color: 'var(--primary)', label: '良好' },
  'C': { color: 'var(--warning-500)', label: '合格' },
  'D': { color: 'var(--destructive-500)', label: '待改进' },
};

export function PerformanceManagement() {
  const { performanceReviews, employees, addPerformance } = useEmployee();

  const [filterPeriod, setFilterPeriod] = useState<ReviewPeriod | ''>('');
  const [filterRank, setFilterRank] = useState<PerformanceRank | ''>('');

  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [kpiScore, setKpiScore] = useState(75);
  const [behaviorScore, setBehaviorScore] = useState(75);

  const previewPerf = calcPerformance(kpiScore, behaviorScore);

  // 筛选
  const filteredReviews = useMemo(() => {
    return performanceReviews.filter(r => {
      if (filterPeriod && r.period !== filterPeriod) return false;
      if (filterRank && r.rank !== filterRank) return false;
      return true;
    });
  }, [performanceReviews, filterPeriod, filterRank]);
  const filtersActive = Boolean(filterPeriod || filterRank);

  // 摘要
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthReviews = performanceReviews.filter(r => r.periodLabel === thisMonth);
    const quarter = `2026-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const quarterReviews = performanceReviews.filter(r => r.periodLabel === quarter);

    const avgKpi =
      performanceReviews.length > 0
        ? Math.round(performanceReviews.reduce((s, r) => s + r.kpiScore, 0) / performanceReviews.length)
        : 0;
    const topRanked = performanceReviews.filter(r => r.rank === 'S' || r.rank === 'A').length;
    const topRate = performanceReviews.length > 0 ? Math.round((topRanked / performanceReviews.length) * 100) : 0;

    return {
      monthCount: monthReviews.length,
      quarterCount: quarterReviews.length,
      avgKpi,
      topRate,
    };
  }, [performanceReviews]);

  const handleAdd = () => {
    form.resetFields();
    setKpiScore(75);
    setBehaviorScore(75);
    setModalVisible(true);
  };

  const resetFilters = () => {
    setFilterPeriod('');
    setFilterRank('');
  };

  const handleSubmit = () => {
    form.validate().then(values => {
      const { totalScore, rank } = calcPerformance(values.kpiScore, values.behaviorScore);
      addPerformance({
        employeeId: values.employeeId,
        employeeName: employees.find(e => e.id === values.employeeId)?.name || '',
        department: employees.find(e => e.id === values.employeeId)?.department || '',
        period: values.period,
        periodLabel: values.periodLabel,
        kpiScore: values.kpiScore,
        behaviorScore: values.behaviorScore,
        totalScore,
        rank,
        evaluator: values.evaluator,
        comment: values.comment,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      Message.success('考核已成功提交');
      setModalVisible(false);
    });
  };

  const columns = [
    { title: '被考核人', dataIndex: 'employeeName', width: 100 },
    { title: '部门', dataIndex: 'department', width: 80 },
    {
      title: '周期',
      dataIndex: 'period',
      width: 60,
      render: (p: string) => <Tag>{p}</Tag>,
    },
    { title: '考核月份/季', dataIndex: 'periodLabel', width: 130 },
    {
      title: 'KPI分',
      dataIndex: 'kpiScore',
      width: 70,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span>,
      sorter: (a: PerformanceReview, b: PerformanceReview) => a.kpiScore - b.kpiScore,
    },
    {
      title: '行为分',
      dataIndex: 'behaviorScore',
      width: 90,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '综合分',
      dataIndex: 'totalScore',
      width: 80,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: v >= 80 ? 'var(--success-500)' : v >= 70 ? 'var(--primary)' : 'var(--warning-500)' }}>
          {v}
        </span>
      ),
      sorter: (a: PerformanceReview, b: PerformanceReview) => a.totalScore - b.totalScore,
    },
    {
      title: '评级',
      dataIndex: 'rank',
      width: 70,
      render: (rank: PerformanceRank) => (
        <Tag color={RANK_META[rank].color} style={{ fontWeight: 700 }}>
          {rank} · {RANK_META[rank].label}
        </Tag>
      ),
    },
    { title: '考核人', dataIndex: 'evaluator', width: 80 },
    { title: '评语', dataIndex: 'comment', ellipsis: true },
  ];

  return (
    <PageShell
      className="employee-admin-page"
      breadcrumbs={[{ label: '员工管理', to: '/employees' }, { label: '绩效考核' }]}
    >
      <PageHeader
        title="绩效考核"
        description="汇总月度与季度考核结果，跟踪 KPI、行为评价和绩效等级。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={handleAdd}>新增考核</Button>}
      />

      <ProcessMetricGrid
        items={[
          { key: 'month', label: '本月考核', value: `${stats.monthCount} 人`, detail: '月度考核记录' },
          { key: 'quarter', label: '本季度考核', value: `${stats.quarterCount} 人`, detail: '季度考核记录' },
          { key: 'kpi', label: '平均 KPI', value: `${stats.avgKpi} 分`, detail: '全部考核平均值', tone: stats.avgKpi >= 80 ? 'success' : 'neutral' },
          { key: 'top', label: 'S/A 评级占比', value: `${stats.topRate}%`, detail: '优秀及以上', tone: stats.topRate >= 50 ? 'success' : 'neutral' },
        ]}
      />

      <Card bordered={false} title="绩效记录" className="employee-admin-list-card">
        <FilterBar
          actions={filtersActive ? (
            <Button type="text" icon={<IconRefresh />} onClick={resetFilters}>重置筛选</Button>
          ) : undefined}
        >
          <Select
            className="employee-admin-select"
            placeholder="周期（全部）"
            allowClear
            value={filterPeriod || undefined}
            onChange={v => setFilterPeriod(v as ReviewPeriod | '')}
          >
            <Select.Option value="月度">月度</Select.Option>
            <Select.Option value="季度">季度</Select.Option>
          </Select>
          <Select
            className="employee-admin-select"
            placeholder="评级（全部）"
            allowClear
            value={filterRank || undefined}
            onChange={v => setFilterRank(v as PerformanceRank | '')}
          >
            {(['S', 'A', 'B', 'C', 'D'] as PerformanceRank[]).map(r => (
              <Select.Option key={r} value={r}>
                {r} · {RANK_META[r].label}
              </Select.Option>
            ))}
          </Select>
        </FilterBar>
        <div className="employee-admin-result-summary">
          <span>共 {filteredReviews.length} 条考核记录</span>
          {filtersActive && <span>已按当前条件筛选</span>}
        </div>
        <Table
          columns={columns as any}
          data={filteredReviews}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: true }}
          scroll={{ x: 1050 }}
          noDataElement={<Empty description="没有符合当前条件的绩效记录" />}
        />
      </Card>

      {/* 新增考核弹窗 */}
      <Modal
        title={<Space><IconPlus /><span>新增绩效考核</span></Space>}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        className="employee-admin-performance-modal"
      >
        <Form form={form} layout="vertical">
          <FormItem label="被考核人" field="employeeId" rules={[{ required: true, message: '请选择被考核人' }]}>
            <Select placeholder="请选择被考核人">
              {employees
                .filter(e => e.employmentStatus !== '已离职')
                .map(e => (
                  <Select.Option key={e.id} value={e.id}>
                    {e.name}（{e.department}/{e.position}/{e.level}）
                  </Select.Option>
                ))}
            </Select>
          </FormItem>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="考核周期" field="period" initialValue="季度" rules={[{ required: true, message: '请选择周期' }]}>
                <Select>
                  <Select.Option value="月度">月度</Select.Option>
                  <Select.Option value="季度">季度</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="考核标签" field="periodLabel" rules={[{ required: true, message: '如 2026-Q3 或 2026-07' }]}>
                <Input placeholder="如 2026-Q3 或 2026-07" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          {/* KPI 滑块 */}
          <FormItem label={`KPI 完成度 — ${kpiScore} 分`}>
            <Slider
              min={0}
              max={100}
              value={kpiScore}
              onChange={(v: number) => {
                setKpiScore(v);
                form.setFieldValue('kpiScore', v);
              }}
              onAfterChange={(v: number) => form.setFieldValue('kpiScore', v)}
              formatTooltip={(value) => <span style={{ fontWeight: 600 }}>{value} 分</span>}
              marks={{ 0: '0', 60: '60', 80: '80', 100: '100' }}
            />
          </FormItem>
          <FormItem label="KPI (隐藏)" field="kpiScore" hidden>
            <InputNumber />
          </FormItem>

          {/* 行为滑块 */}
          <FormItem label={`行为评价 — ${behaviorScore} 分`}>
            <Slider
              min={0}
              max={100}
              value={behaviorScore}
              onChange={(v: number) => {
                setBehaviorScore(v);
                form.setFieldValue('behaviorScore', v);
              }}
              onAfterChange={(v: number) => form.setFieldValue('behaviorScore', v)}
              formatTooltip={(value) => <span style={{ fontWeight: 600 }}>{value} 分</span>}
              marks={{ 0: '0', 60: '60', 80: '80', 100: '100' }}
            />
          </FormItem>
          <FormItem label="行为 (隐藏)" field="behaviorScore" hidden>
            <InputNumber />
          </FormItem>

          {/* 预览 */}
          <Card
            className="employee-admin-performance-preview"
            bodyStyle={{ padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <span style={{ color: 'var(--color-text-2)' }}>综合得分预览：</span>
                <Tag
                  color={getRankColor(previewPerf.rank)}
                  style={{ fontWeight: 700, fontSize: 14 }}
                >
                  {previewPerf.totalScore} 分
                </Tag>
              </Space>
              <Space>
                <span style={{ color: 'var(--color-text-2)' }}>评级：</span>
                <Tag color={getRankColor(previewPerf.rank)} style={{ fontWeight: 700 }}>
                  {previewPerf.rank} · {RANK_META[previewPerf.rank]?.label || ''}
                </Tag>
              </Space>
            </div>
          </Card>

          <FormItem label="考核人" field="evaluator" rules={[{ required: true, message: '请输入考核人' }]}>
            <Input placeholder="请输入考核人姓名" />
          </FormItem>
          <FormItem label="评语" field="comment">
            <TextArea placeholder="请输入评语（可选）" autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>
    </PageShell>
  );
}
