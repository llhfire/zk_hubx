import { useState } from 'react';
import { Card, Table, Tooltip, Button, Input, Select, DatePicker, Space, Modal, Descriptions, Tag, Form, Divider, Message } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconDownload, IconEye, IconCheck, IconClose, IconCheckCircleFill, IconCloseCircleFill, IconClockCircle, IconDown, IconRight } from '@arco-design/web-react/icon';

const { RangePicker } = DatePicker;

export function QuotationList() {
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '',
    dateRange: [],
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [form] = Form.useForm();

  // 模拟数据
  const mockData = [
    {
      id: '1',
      quotationNo: 'QT20260425001',
      leadName: '阿里巴巴-企业管理系统',
      customerEntity: '阿里巴巴（中国）有限公司',
      ourEntity: '北京科技有限公司',
      amount: 500000,
      estimatedCost: 320000,
      estimatedProfit: 180000,
      validUntil: '2026-05-25',
      status: '待审批',
      createDate: '2026-04-25',
      creator: '张三',
      attachments: [
        { id: 'att-1-1', name: '报价单.pdf', size: '1.2MB' },
        { id: 'att-1-2', name: '技术方案.docx', size: '856KB' },
      ],
      approvalFlow: [
        { step: '发起申请', approver: '张三 - 销售', status: 'approved', time: '2026-04-25 14:30', comment: '提交报价审批' },
        { step: '商务审核', approver: '王经理 - 商务主管', status: 'approved', time: '2026-04-25 16:20', comment: '报价合理，同意' },
        { step: '财务审核', approver: '陈财务 - 财务总监', status: 'pending', time: '', comment: '' },
      ],
    },
    {
      id: '2',
      quotationNo: 'QT20260424001',
      leadName: '腾讯-云服务平台',
      customerEntity: '腾讯科技（深圳）有限公司',
      ourEntity: '北京科技有限公司',
      amount: 800000,
      estimatedCost: 520000,
      estimatedProfit: 280000,
      validUntil: '2026-05-24',
      status: '已通过',
      createDate: '2026-04-24',
      creator: '李四',
      attachments: [
        { id: 'att-2-1', name: '云平台报价方案.pdf', size: '2.1MB' },
      ],
      approvalFlow: [
        { step: '发起申请', approver: '李四 - 销售', status: 'approved', time: '2026-04-24 10:30', comment: '提交报价审批' },
        { step: '商务审核', approver: '王经理 - 商务主管', status: 'approved', time: '2026-04-24 14:15', comment: '通过审核' },
        { step: '财务审核', approver: '陈财务 - 财务总监', status: 'approved', time: '2026-04-24 16:45', comment: '批准' },
      ],
    },
    {
      id: '3',
      quotationNo: 'QT20260423001',
      leadName: '字节跳动-协作工具',
      customerEntity: '北京字节跳动科技有限公司',
      ourEntity: '上海分公司',
      amount: 350000,
      estimatedCost: 230000,
      estimatedProfit: 120000,
      validUntil: '2026-05-23',
      status: '已拒绝',
      createDate: '2026-04-23',
      creator: '王五',
      attachments: [
        { id: 'att-3-1', name: '协作工具报价.pdf', size: '652KB' },
      ],
      approvalFlow: [
        { step: '发起申请', approver: '王五 - 销售', status: 'approved', time: '2026-04-23 09:00', comment: '提交报价审批' },
        { step: '商务审核', approver: '王经理 - 商务主管', status: 'rejected', time: '2026-04-23 11:30', comment: '报价过高，与市场价格不符，请重新核算成本后调整报价' },
      ],
    },
  ];

  const columns = [
    {
      title: '报价单号',
      dataIndex: 'quotationNo',
      width: 140,
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
      title: '报价金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '有效期至',
      dataIndex: 'validUntil',
      width: 120,
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
      title: '创建日期',
      dataIndex: 'createDate',
      width: 120,
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      width: 100,
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
    setSelectedQuotation(record);
    setDetailVisible(true);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            key="search-input"
            style={{ width: 200 }}
            placeholder="搜索报价单号/线索名称"
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
        title="报价列表"
        extra={
          <Button type="primary" icon={<IconPlus />}>
            新增报价
          </Button>
        }
      >
        <Table
          columns={columns}
          data={mockData}
          scroll={{ x: 1400 }}
          pagination={{
            total: mockData.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      <Modal
        title="报价详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 900 }}
      >
        {selectedQuotation && (
          <div>
            <Descriptions
              column={2}
              data={[
                { label: '报价单号', value: selectedQuotation.quotationNo },
                { label: '线索名称', value: selectedQuotation.leadName },
                { label: '客户主体', value: selectedQuotation.customerEntity },
                { label: '对接主体', value: selectedQuotation.ourEntity },
                { label: '报价金额', value: `¥${selectedQuotation.amount.toLocaleString()}` },
                { label: '预计成本', value: `¥${selectedQuotation.estimatedCost.toLocaleString()}` },
                { label: '预计利润', value: `¥${selectedQuotation.estimatedProfit.toLocaleString()}` },
                { label: '创建日期', value: selectedQuotation.createDate },
                { label: '创建人', value: selectedQuotation.creator },
                {
                  label: '状态',
                  value: (
                    <Tag color={selectedQuotation.status === '待审批' ? 'orange' : selectedQuotation.status === '已通过' ? 'green' : 'red'}>
                      {selectedQuotation.status}
                    </Tag>
                  ),
                },
              ]}
              style={{ marginBottom: 24 }}
            />

            {/* 审批流程 */}
            {selectedQuotation.approvalFlow && selectedQuotation.approvalFlow.length > 0 && (
              <div style={{ marginBottom: 24 }}>
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
                  {selectedQuotation.approvalFlow.map((node: any, index: number) => {
                    const isCurrentNode = node.status === 'pending';
                    const isRejectedNode = node.status === 'rejected';
                    const isFirstNode = index === 0;

                    // 默认只显示：发起节点、当前节点、驳回节点
                    const shouldShowByDefault = isFirstNode || isCurrentNode || isRejectedNode;
                    const shouldShow = workflowExpanded || shouldShowByDefault;

                    if (!shouldShow) return null;

                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: index < selectedQuotation.approvalFlow.length - 1 ? 12 : 0,
                          padding: '10px 12px',
                          background: isCurrentNode ? '#fffbe6' : isRejectedNode ? '#ffece8' : 'var(--color-bg-2)',
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
                            <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
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

                        {/* 驳回理由高亮显示 */}
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
                            <div style={{ fontSize: 13, color: 'rgb(var(--red-7))' }}>
                              {node.comment}
                            </div>
                          </div>
                        )}

                        {/* 普通审批意见 */}
                        {!isRejectedNode && node.comment && (
                          <div style={{
                            marginTop: 8,
                            padding: '6px 10px',
                            background: 'var(--color-fill-2)',
                            borderRadius: 4,
                            fontSize: 13,
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

            <div>
              {/* 附件列表 */}
              {selectedQuotation.attachments && selectedQuotation.attachments.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>附件列表</div>
                  <div style={{
                    background: 'var(--color-fill-2)',
                    borderRadius: 6,
                    padding: '12px 16px',
                    border: '1px solid var(--color-border-2)'
                  }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {selectedQuotation.attachments.map((file: any) => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: 'var(--color-bg-2)',
                            borderRadius: 4,
                            border: '1px solid var(--color-border-1)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{file.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>({file.size})</span>
                          </div>
                          <Button
                            type="text"
                            size="small"
                            icon={<IconDownload />}
                            onClick={() => Message.info(`下载附件: ${file.name}`)}
                          >
                            下载
                          </Button>
                        </div>
                      ))}
                    </Space>
                  </div>
                </div>
              )}

              {/* 审批按钮栏 */}
              {selectedQuotation.status === '待审批' && (
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
            </div>
          </div>
        )}
      </Modal>

      {/* 审批意见Modal */}
      <Modal
        title={approvalAction === 'approve' ? '审批通过' : '审批不通过'}
        visible={approvalVisible}
        onOk={() => {
          form.validate().then((values) => {
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
                  ? '请填写审批意见（如：报价合理，同意报价）'
                  : '请填写不通过的理由（如：报价过高，请重新核算）'
              }
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
