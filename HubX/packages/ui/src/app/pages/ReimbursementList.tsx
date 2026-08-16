import { useState } from 'react';
import { Card, Table, Tooltip, Button, Input, Select, DatePicker, Space, Modal, Descriptions, Tag, Message, Form, Divider } from '@arco-design/web-react';
import { IconSearch, IconPlus, IconDownload, IconEye, IconCheck, IconClose, IconCheckCircleFill, IconCloseCircleFill, IconClockCircle, IconDown, IconRight } from '@arco-design/web-react/icon';

const { RangePicker } = DatePicker;

export function ReimbursementList() {
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '',
    type: '',
    dateRange: [],
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [form] = Form.useForm();

  // 模拟数据
  const mockData = [
    {
      id: '1',
      reimbursementNo: 'RB20260425001',
      leadName: '阿里巴巴-企业管理系统',
      customerEntity: '阿里巴巴（中国）有限公司',
      ourEntity: '北京科技有限公司',
      applicant: '张三',
      department: '销售部',
      type: '差旅费',
      amount: 4800,
      status: '待审批',
      createDate: '2026-04-25',
      items: [
        { category: '交通费', description: '北京-杭州高铁往返', amount: 1200 },
        { category: '住宿费', description: '杭州酒店3晚', amount: 2400 },
        { category: '餐费', description: '工作餐', amount: 600 },
        { category: '其他', description: '打车费用', amount: 600 },
      ],
      attachments: [
        { id: 'att-1-1', name: '高铁票.pdf', size: '256KB' },
        { id: 'att-1-2', name: '酒店发票.pdf', size: '512KB' },
        { id: 'att-1-3', name: '行程单.jpg', size: '1.2MB' },
      ],
      approvalFlow: [
        { step: '发起申请', approver: '张三 - 销售部', status: 'approved', time: '2026-04-25 09:30', comment: '提交报销申请' },
        { step: '部门主管审批', approver: '王经理 - 销售主管', status: 'approved', time: '2026-04-25 11:00', comment: '同意报销' },
        { step: '财务审核', approver: '陈财务 - 财务部', status: 'pending', time: '', comment: '' },
      ],
    },
    {
      id: '2',
      reimbursementNo: 'RB20260424001',
      leadName: '腾讯-云服务平台',
      customerEntity: '腾讯科技（深圳）有限公司',
      ourEntity: '北京科技有限公司',
      applicant: '李四',
      department: '销售部',
      type: '业务招待费',
      amount: 2500,
      status: '已通过',
      createDate: '2026-04-24',
      items: [
        { category: '餐费', description: '客户商务宴请', amount: 2000 },
        { category: '礼品费', description: '商务礼品', amount: 500 },
      ],
      attachments: [
        { id: 'att-2-1', name: '餐饮发票.pdf', size: '652KB' },
      ],
      approvalFlow: [
        { step: '发起申请', approver: '李四 - 销售部', status: 'approved', time: '2026-04-24 08:00', comment: '提交报销申请' },
        { step: '部门主管审批', approver: '王经理 - 销售主管', status: 'approved', time: '2026-04-24 10:30', comment: '批准' },
        { step: '财务审核', approver: '陈财务 - 财务部', status: 'approved', time: '2026-04-24 14:00', comment: '同意' },
      ],
    },
    {
      id: '3',
      reimbursementNo: 'RB20260423001',
      leadName: '字节跳动-协作工具',
      customerEntity: '北京字节跳动科技有限公司',
      ourEntity: '上海分公司',
      applicant: '王五',
      department: '技术部',
      type: '办公费用',
      amount: 1200,
      status: '已拒绝',
      createDate: '2026-04-23',
      items: [
        { category: '办公用品', description: '投影仪', amount: 1200 },
      ],
      attachments: [
        { id: 'att-3-1', name: '采购发票.pdf', size: '428KB' },
      ],
      approvalFlow: [
        { step: '发起申请', approver: '王五 - 技术部', status: 'approved', time: '2026-04-23 10:00', comment: '提交报销申请' },
        { step: '部门主管审批', approver: '李主管 - 技术主管', status: 'rejected', time: '2026-04-23 13:30', comment: '此类办公设备应由公司统一采购，个人报销不符合规定' },
      ],
    },
  ];

  const columns = [
    {
      title: '报销单号',
      dataIndex: 'reimbursementNo',
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
      title: '报销类型',
      dataIndex: 'type',
      width: 120,
    },
    {
      title: '报销金额',
      dataIndex: 'amount',
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
      title: '创建日期',
      dataIndex: 'createDate',
      width: 120,
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
      type: '',
      dateRange: [],
    });
  };

  const handleViewDetail = (record: any) => {
    setSelectedReimbursement(record);
    setDetailVisible(true);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="medium" wrap>
          <Input
            key="search-input"
            style={{ width: 200 }}
            placeholder="搜索报销单号/线索名称"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
            allowClear
          />
          <Select
            key="type-select"
            style={{ width: 150 }}
            placeholder="报销类型"
            value={searchForm.type}
            onChange={(value) => setSearchForm({ ...searchForm, type: value })}
            allowClear
            options={[
              { label: '差旅费', value: '差旅费' },
              { label: '业务招待费', value: '业务招待费' },
              { label: '办公费用', value: '办公费用' },
            ]}
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
        title="报销申请列表"
        extra={
          <Button type="primary" icon={<IconPlus />}>
            新增报销申请
          </Button>
        }
      >
        <Table
          columns={columns}
          data={mockData}
          scroll={{ x: 1500 }}
          pagination={{
            total: mockData.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      <Modal
        title="报销申请详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 900 }}
      >
        {selectedReimbursement && (
          <div>
            <Descriptions
              column={2}
              data={[
                { label: '报销单号', value: selectedReimbursement.reimbursementNo },
                { label: '线索名称', value: selectedReimbursement.leadName },
                { label: '客户主体', value: selectedReimbursement.customerEntity },
                { label: '对接主体', value: selectedReimbursement.ourEntity },
                { label: '申请人', value: selectedReimbursement.applicant },
                { label: '部门', value: selectedReimbursement.department },
                { label: '报销类型', value: selectedReimbursement.type },
                { label: '报销金额', value: `¥${selectedReimbursement.amount.toLocaleString()}` },
                { label: '创建日期', value: selectedReimbursement.createDate },
                {
                  label: '状态',
                  value: (
                    <Tag color={selectedReimbursement.status === '待审批' ? 'orange' : selectedReimbursement.status === '已通过' ? 'green' : 'red'}>
                      {selectedReimbursement.status}
                    </Tag>
                  ),
                },
              ]}
              style={{ marginBottom: 24 }}
            />

            {/* 审批流程 */}
            {selectedReimbursement.approvalFlow && selectedReimbursement.approvalFlow.length > 0 && (
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
                  {selectedReimbursement.approvalFlow.map((node: any, index: number) => {
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
                          marginBottom: index < selectedReimbursement.approvalFlow.length - 1 ? 12 : 0,
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

            <div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>报销明细</div>
              <Table
                columns={[
                  { title: '费用类别', dataIndex: 'category', width: 120 },
                  { title: '说明', dataIndex: 'description' },
                  { title: '金额', dataIndex: 'amount', width: 150, render: (v: number) => `¥${v.toLocaleString()}` },
                ]}
                data={selectedReimbursement.items}
                pagination={false}
                size="small"
                summary={(data) => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                        合计
                      </Table.Summary.Cell>
                      <Table.Summary.Cell style={{ fontWeight: 600 }}>
                        ¥{data.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />

              {/* 附件列表 */}
              {selectedReimbursement.attachments && selectedReimbursement.attachments.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>附件列表</div>
                  <div style={{
                    background: 'var(--color-fill-2)',
                    borderRadius: 6,
                    padding: '12px 16px',
                    border: '1px solid var(--color-border-2)'
                  }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {selectedReimbursement.attachments.map((file: any) => (
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
                            <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{file.name}</span>
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
              {selectedReimbursement.status === '待审批' && (
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
                  ? '请填写审批意见（如：费用合理，同意报销）'
                  : '请填写不通过的理由（如：费用超标，请重新核算）'
              }
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
