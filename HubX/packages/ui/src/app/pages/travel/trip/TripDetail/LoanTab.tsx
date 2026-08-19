import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Button,
  Tag,
  Table,
  Space,
  Typography,
  Grid,
  Message,
  Spin,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconEye,
  IconStorage,
  IconRight,
} from '@arco-design/web-react/icon';
import type { Trip, Loan, LoanStatus } from '../../types';
import { getLoanList } from '../../travel-api';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface LoanTabProps {
  trip: Trip;
  onUpdate: () => void;
}

const statusConfig: Record<LoanStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  paid: { color: 'green', text: '已打款' },
  offset: { color: 'blue', text: '已冲抵' },
  settled: { color: 'green', text: '已结清' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'gray', text: '已取消' },
};

export function LoanTab({ trip, onUpdate }: LoanTabProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    loadLoans();
  }, [trip.id]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const result = await getLoanList({ tripId: trip.id });
      setLoans(result.list);
    } catch (error) {
      Message.error('加载借款数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 新建借款
  const handleCreate = () => {
    navigate(`/travel/loans/new?tripId=${trip.id}`);
  };

  // 查看详情
  const handleViewDetail = (loan: Loan) => {
    Message.info(`查看借款详情: ${loan.loanNo}`);
  };

  // 计算汇总
  const totalLoanAmount = loans.reduce((sum, l) => sum + l.amount, 0);
  const totalOffsetAmount = loans.reduce((sum, l) => sum + l.offsetAmount, 0);
  const totalRemaining = loans.reduce((sum, l) => sum + l.remainingAmount, 0);

  const columns = [
    {
      title: '借款单号',
      dataIndex: 'loanNo',
      width: 150,
      render: (value: string) => <Text style={{ fontWeight: 500 }}>{value}</Text>,
    },
    {
      title: '借款类型',
      dataIndex: 'type',
      width: 100,
      render: (value: string) => (
        <Tag>
          {value === 'travel' ? '差旅借款' : value === 'petty_cash' ? '备用金' : '其他'}
        </Tag>
      ),
    },
    {
      title: '借款金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number) => (
        <Space size={4}>
          <IconStorage style={{ color: '#86909c' }} />
          <span>¥{value.toLocaleString()}</span>
        </Space>
      ),
    },
    {
      title: '已冲抵',
      dataIndex: 'offsetAmount',
      width: 100,
      render: (value: number) => (
        value > 0 ? <span style={{ color: '#00b42a' }}>¥{value.toLocaleString()}</span> : '-'
      ),
    },
    {
      title: '剩余金额',
      dataIndex: 'remainingAmount',
      width: 120,
      render: (value: number) => <Text style={{ fontWeight: 500 }}>¥{value.toLocaleString()}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: LoanStatus) => (
        <Tag color={statusConfig[value].color}>
          {statusConfig[value].text}
        </Tag>
      ),
    },
    {
      title: '创建日期',
      dataIndex: 'createDate',
      width: 120,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Loan) => (
        <Button type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* 汇总信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">借款总额</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{totalLoanAmount.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">已冲抵金额</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00b42a' }}>¥{totalOffsetAmount.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">剩余未冲抵</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff7d00' }}>¥{totalRemaining.toLocaleString()}</div>
          </Card>
        </Col>
      </Row>

      {/* 借款列表 */}
      <Card
        title="借款记录"
        extra={
          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增借款
          </Button>
        }
      >
        <Table
          columns={columns}
          data={loans}
          loading={loading}
          rowKey="id"
          scroll={{ x: 900 }}
          pagination={false}
          noDataContent="暂无借款记录"
        />

        {/* 冲抵记录 */}
        {loans.some(l => l.offsets && l.offsets.length > 0) && (
          <div style={{ marginTop: 24 }}>
            <Title heading={6} style={{ marginBottom: 12 }}>冲抵记录</Title>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {loans.map(loan =>
                loan.offsets?.map(offset => (
                  <div
                    key={offset.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      background: '#f7f8fa',
                      borderRadius: 4,
                    }}
                  >
                    <Space>
                      <Tag>{offset.loanNo}</Tag>
                      <IconRight style={{ color: '#86909c' }} />
                      <Tag>{offset.reimbursementId}</Tag>
                    </Space>
                    <Space>
                      <Text type="secondary">{offset.offsetDate}</Text>
                      <Text style={{ fontWeight: 500, color: '#00b42a' }}>¥{offset.offsetAmount.toLocaleString()}</Text>
                    </Space>
                  </div>
                ))
              )}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}
