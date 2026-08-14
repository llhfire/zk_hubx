import { useState } from 'react';
import { Card, Table, Tooltip, Button, Input, Select, DatePicker, Space, Modal, Descriptions, Tag, Divider, Message, Form } from '@arco-design/web-react';
import { IconCheck, IconClose, IconCheckCircleFill, IconCloseCircleFill, IconClockCircle, IconDown, IconRight } from '@arco-design/web-react/icon';
import { IconSearch, IconPlus, IconEye } from '@arco-design/web-react/icon';

const { RangePicker } = DatePicker;

export function BusinessTripList() {
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '',
    dateRange: [],
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [form] = Form.useForm();

  // 模拟数据
  const mockData = [
    {
      id: '1',
      tripNo: 'BT20260425001',
      leadName: '阿里巴巴-企业管理系统',
      customerEntity: '阿里巴巴（中国）有限公司',
      ourEntity: '北京科技有限公司',
      applicant: '张三',
      department: '销售部',
      destination: '杭州',
      startDate: '2026-04-28',
      endDate: '2026-04-30',
      days: 3,
      purpose: '项目需求调研和方案演示',
      estimatedCost: 5000,
      status: '待审批',
      createDate: '2026-04-25',
      transportation: '高铁',
      accommodation: '四星级酒店',
      approvalFlow: [
        { step: '发起申请', approver: '张三 - 销售部', status: 'approved', time: '2026-04-25 10:00', comment: '提交出差申请' },
        { step: '部门主管审批', approver: '王经理 - 销售主管', status: 'approved', time: '2026-04-25 14:30', comment: '同意出差' },
        { step: '财务审核', approver: '陈财务 - 财务部', status: 'pending', time: '', comment: '' },
      ],
    },
    {
      id: '2',
      tripNo: 'BT20260424001',
      leadName: '腾讯-云服务平台',
      customerEntity: '腾讯科技（深圳）有限公司',
      ourEntity: '北京科技有限公司',
      applicant: '李四',
      department: '销售部',
      destination: '深圳',
      startDate: '2026-04-26',
      endDate: '2026-04-27',
      days: 2,
      purpose: '客户拜访和合同签订',
      estimatedCost: 3500,
      status: '已通过',
      createDate: '2026-04-24',
      transportation: '飞机',
      accommodation: '五星级酒店',
      approvalFlow: [
        { step: '发起申请', approver: '李四 - 销售部', status: 'approved', time: '2026-04-24 09:00', comment: '提交出差申请' },
        { step: '部门主管审批', approver: '王经理 - 销售主管', status: 'approved', time: '2026-04-24 10:30', comment: '批准' },
        { step: '财务审核', approver: '陈财务 - 财务部', status: 'approved', time: '2026-04-24 15:00', comment: '同意出差' },
      ],
    },
  ];

  const columns = [
    {
      title: '出差单号',
      dataIndex: 'tripNo',
      width: 160,
    },
    {
      title: '线索名称',
      dataIndex: 'leadName',
      width: 200,
    },
    {
      title: '客户主体',
      dataIndex: 'customerEntity',
      width: 200,
    },
    {
      title: '对接主体',
      dataIndex: 'ourEntity',
      width: 150,
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 120,
    },
    {
      title: '目的地',
      dataIndex: 'destination',
      width: 100,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      width: 120,
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      width: 120,
    },
    {
      title: '天数',
      dataIndex: 'days',
      width: 80,
    },
    {
      title: '预计费用',
      dataIndex: 'estimatedCost',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          '待审批': { color: 'orange', text: '待审批' },
          '已通过': { color: 'green', text: '已通过' },
          '已拒绝': { color: 'red', text: '已拒绝' },
        };
        const config = statusMap[status] || { color: 'gray', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      dataIndex: 'op',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Tooltip content="查看详情">
          <Button type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  const handleSearch = () => {
    console.log('搜索条件：', searchForm);
  };

  const handleReset = () => {
    setSearchForm({
      keyword: '',
      status: '',
      dateRange: [],
    });
  };

  const handleViewDetail = (record: any) => {
    setSelectedTrip(record);
    setShowRejectInput(false);
    setRejectReason('');
    setDetailVisible(true);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            key="search-input"
            style={{ width: 200 }}
            placeholder="搜索出差单号/线索名称"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
            allowClear
          />
          <Select
            key="status-select"
            style={{ width: 150 }}
            placeholder="选择状态"
            value={searchForm.status}
            onChange={(value) => setSearchForm({ ...searchForm, status: value })}
            allowClear
            options={[
              { label: '待审批', value: '待审批' },
              { label: '已通过', value: '已通过' },
              { label: '已拒绝', value: '已拒绝' },
            ]}
          />
          <RangePicker
            key="date-range"
            style={{ width: 280 }}
            placeholder={['开始日期', '结束日期']}
            value={searchForm.dateRange}
            onChange={(value) => setSearchForm({ ...searchForm, dateRange: value })}
          />
          <Button key="search-btn" type="primary" icon={<IconSearch />} onClick={handleSearch}>
            搜索
          </Button>
          <Button key="reset-btn" onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card
        title="出差申请列表"
        extra={
          <Button type="primary" icon={<IconPlus />}>
            新增出差申请
          </Button>
        }
      >
        <Table
          columns={columns}
          data={mockData}
          scroll={{ x: 1600 }}
          pagination={{
            total: mockData.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      <Modal
        title="出差申请详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 800 }}
      >
        {selectedTrip && (
          <div>
            <Descriptions
              column={2}
              data={[
                { label: '出差单号', value: selectedTrip.tripNo },
                { label: '线索名称', value: selectedTrip.leadName },
                { label: '客户主体', value: selectedTrip.customerEntity },
                { label: '对接主体', value: selectedTrip.ourEntity },
                { label: '申请人', value: selectedTrip.applicant },
                { label: '部门', value: selectedTrip.department },
                { label: '目的地', value: selectedTrip.destination },
                { label: '开始日期', value: selectedTrip.startDate },
                { label: '结束日期', value: selectedTrip.endDate },
                { label: '出差天数', value: `${selectedTrip.days}天` },
                { label: '预计费用', value: `¥${selectedTrip.estimatedCost.toLocaleString()}` },
                { label: '创建日期', value: selectedTrip.createDate },
                {
                  label: '状态',
                  value: (
                    <Tag color={selectedTrip.status === '待审批' ? 'orange' : selectedTrip.status === '已通过' ? 'green' : 'red'}>
                      {selectedTrip.status}
                    </Tag>
                  ),
                },
              ]}
              style={{ marginBottom: 24 }}
            />

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>出差目的</div>
              <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 4 }}>
                {selectedTrip.purpose}
              </div>
            </div>

            {/* 审批流程 */}
            {selectedTrip.approvalFlow && selectedTrip.approvalFlow.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600 }}>审批流程</div>
                  <Button
                    type="text"
                    size="small"
                    icon={workflowExpanded ? <IconDown /> : <IconRight />}
                    onClick={() => setWorkflowExpanded(!workflowExpanded)}
                  >
                    {workflowExpanded ? '收起完整流程' : '查看完整流程'}
                  </Button>
                </div>

                <div style={{
                  background: 'var(--color-fill-1)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  border: '1px solid var(--color-border-2)'
                }}>
                  {selectedTrip.approvalFlow.map((node: any, index: number) => {
                    const isCurrentNode = node.status === 'pending';
                    const isRejectedNode = node.status === 'rejected';
                    const isFirstNode = index === 0;

                    const shouldShowByDefault = isFirstNode || isCurrentNode || isRejectedNode;
                    const shouldShow = workflowExpanded || shouldShowByDefault;

                    if (!shouldShow) return null;

                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: index < selectedTrip.approvalFlow.length - 1 ? 12 : 0,
                          padding: '10px 12px',
                          background: isCurrentNode ? 'var(--warning-50)' : isRejectedNode ? 'var(--destructive-50)' : 'var(--color-bg-2)',
                          borderRadius: 4,
                          border: isCurrentNode ? '2px solid rgb(var(--orange-6))' : isRejectedNode ? '1px solid rgb(var(--red-3))' : '1px solid var(--color-border-1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {node.status === 'approved' && (
                            <IconCheckCircleFill style={{ fontSize: 18, color: 'rgb(var(--green-6))' }} />
                          )}
                          {node.status === 'rejected' && (
                            <IconCloseCircleFill style={{ fontSize: 18, color: 'rgb(var(--red-6))' }} />
                          )}
                          {node.status === 'pending' && (
                            <IconClockCircle style={{ fontSize: 18, color: 'rgb(var(--orange-6))' }} />
                          )}

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{node.step}</span>
                              {isCurrentNode && (
                                <Tag color="orange" size="small">当前环节</Tag>
                              )}
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
                              审批人：{node.approver}
                            </div>
                            {node.time && (
                              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                                {node.time}
                              </div>
                            )}
                          </div>

                          <div>
                            {node.status === 'approved' && (
                              <Tag color="green" size="small">已通过</Tag>
                            )}
                            {node.status === 'rejected' && (
                              <Tag color="red" size="small">已驳回</Tag>
                            )}
                            {node.status === 'pending' && (
                              <Tag color="orange" size="small">待审批</Tag>
                            )}
                          </div>
                        </div>

                        {isRejectedNode && node.comment && (
                          <div style={{
                            marginTop: 8,
                            padding: '8px 10px',
                            background: 'rgb(var(--red-1))',
                            border: '1px solid rgb(var(--red-3))',
                            borderRadius: 4,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--red-6))', marginBottom: 4 }}>
                              ⚠️ 驳回理由
                            </div>
                            <div style={{ fontSize: 14, color: 'rgb(var(--red-7))' }}>
                              {node.comment}
                            </div>
                          </div>
                        )}

                        {!isRejectedNode && node.comment && (
                          <div style={{
                            marginTop: 8,
                            padding: '6px 10px',
                            background: 'var(--color-fill-2)',
                            borderRadius: 4,
                            fontSize: 14,
                            color: 'var(--color-text-2)',
                          }}>
                            {node.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedTrip.status === '待审批' && (
              <>
                <Divider style={{ margin: '20px 0' }} />
                {selectedTrip.status === '待审批' && (
                  <div style={{ marginTop: 24 }}>
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                      <Button
                        type="primary"
                        status="success"
                        size="large"
                        icon={<IconCheck />}
                        onClick={() => {
                          setApprovalAction('approve');
                          setApprovalVisible(true);
                        }}
                      >
                        通过
                      </Button>
                      <Button
                        type="primary"
                        status="danger"
                        size="large"
                        icon={<IconClose />}
                        onClick={() => {
                          setApprovalAction('reject');
                          setApprovalVisible(true);
                        }}
                      >
                        不通过
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedTrip.status !== '待审批' && (
              <>
                <Divider style={{ margin: '20px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>审批结果：</span>
                  <Tag color={selectedTrip.status === '已通过' ? 'green' : 'red'}>
                    {selectedTrip.status}
                  </Tag>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 审批意见Modal */}
      <Modal
        title={approvalAction === 'approve' ? '审批通过' : '审批不通过'}
        visible={approvalVisible}
        onOk={() => {
          form.validate().then((values) => {
            setSelectedTrip({ ...selectedTrip, status: approvalAction === 'approve' ? '已通过' : '已拒绝' });
            Message.success(
              `审批${approvalAction === 'approve' ? '通过' : '不通过'}成功，审批意见：${values.comment}`
            );
            setApprovalVisible(false);
            setDetailVisible(false);
            form.resetFields();
          }).catch(() => {
            // 验证失败，不做处理，表单会自动显示错误信息
          });
        }}
        onCancel={() => {
          setApprovalVisible(false);
          form.resetFields();
        }}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="审批意见"
            field="comment"
            rules={[{ required: true, message: '请填写审批意见' }]}
          >
            <Input.TextArea
              placeholder={
                approvalAction === 'approve'
                  ? '请填写审批意见（如：同意出差申请）'
                  : '请填写不通过的理由（如：出差计划不合理，请重新调整）'
              }
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
