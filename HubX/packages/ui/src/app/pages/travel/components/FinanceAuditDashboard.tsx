import { useState } from 'react';
import {
  Card,
  Tag,
  Table,
  Alert,
  Button,
  Space,
  Typography,
  Grid,
  Collapse,
} from '@arco-design/web-react';
import {
  IconCheckCircle,
  IconCloseCircle,
  IconExclamationCircle,
  IconSafe,
  IconDown,
  IconUp,
  IconUser,
  IconLocation,
  IconClockCircle,
} from '@arco-design/web-react/icon';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface AuditCase {
  id: string;
  tripNo: string;
  applicantName: string;
  department: string;
  destination: string;
  tripDays: number;
  tripData: {
    applyDate: string;
    declaredTransport: number;
    declaredAccommodation: number;
    declaredMeal: number;
    declaredTotal: number;
  };
  punchData: {
    expectedDays: number;
    actualPunchDays: number;
    matchRate: number;
    abnormalDays: number;
  };
  invoiceData: {
    submittedCount: number;
    totalAmount: number;
    matchedAmount: number;
    unmatchedAmount: number;
    overStandardAmount: number;
  };
  aiConclusion: 'pass' | 'partial_deduct' | 'reject';
  aiSummary: string;
  anomalies: { type: 'error' | 'warning'; message: string }[];
  deductAmount?: number;
}

const MOCK_AUDIT_CASES: AuditCase[] = [
  {
    id: 'audit-1',
    tripNo: 'BT20260425001',
    applicantName: '张三',
    department: '销售部',
    destination: '杭州',
    tripDays: 3,
    tripData: {
      applyDate: '2026-04-25',
      declaredTransport: 1000,
      declaredAccommodation: 1200,
      declaredMeal: 600,
      declaredTotal: 2800,
    },
    punchData: {
      expectedDays: 3,
      actualPunchDays: 3,
      matchRate: 100,
      abnormalDays: 0,
    },
    invoiceData: {
      submittedCount: 5,
      totalAmount: 2950,
      matchedAmount: 2750,
      unmatchedAmount: 200,
      overStandardAmount: 0,
    },
    aiConclusion: 'pass',
    aiSummary: '打卡记录与出差天数完全匹配，发票金额与申报基本一致，推荐全额通过。',
    anomalies: [],
  },
  {
    id: 'audit-2',
    tripNo: 'BT20260424001',
    applicantName: '李四',
    department: '销售部',
    destination: '深圳',
    tripDays: 2,
    tripData: {
      applyDate: '2026-04-24',
      declaredTransport: 2000,
      declaredAccommodation: 800,
      declaredMeal: 300,
      declaredTotal: 3100,
    },
    punchData: {
      expectedDays: 2,
      actualPunchDays: 1,
      matchRate: 50,
      abnormalDays: 1,
    },
    invoiceData: {
      submittedCount: 3,
      totalAmount: 2950,
      matchedAmount: 2600,
      unmatchedAmount: 350,
      overStandardAmount: 180,
    },
    aiConclusion: 'partial_deduct',
    aiSummary: '第2天无打卡记录，住宿发票金额超出标准，建议扣减 530 元后通过。',
    deductAmount: 530,
    anomalies: [
      { type: 'warning', message: '4月27日无打卡记录，需确认是否实际出差' },
      { type: 'error', message: '住宿发票 800 元超出一线城市标准（220 元/天），超标 580 元' },
      { type: 'warning', message: '餐饮发票 150 元超出单日餐补标准（40 元/天），建议按标准报销' },
    ],
  },
  {
    id: 'audit-3',
    tripNo: 'BT20260420003',
    applicantName: '赵六',
    department: '技术部',
    destination: '成都',
    tripDays: 5,
    tripData: {
      applyDate: '2026-04-20',
      declaredTransport: 600,
      declaredAccommodation: 1100,
      declaredMeal: 800,
      declaredTotal: 2500,
    },
    punchData: {
      expectedDays: 5,
      actualPunchDays: 2,
      matchRate: 40,
      abnormalDays: 3,
    },
    invoiceData: {
      submittedCount: 4,
      totalAmount: 2400,
      matchedAmount: 1200,
      unmatchedAmount: 1200,
      overStandardAmount: 660,
    },
    aiConclusion: 'reject',
    aiSummary: '打卡记录严重缺失（仅2/5天），住宿金额大幅超标，多项费用无法匹配发票，建议拒绝报销并要求补充材料。',
    anomalies: [
      { type: 'error', message: '5天出差仅2天有打卡记录，打卡匹配率 40%，严重不达标' },
      { type: 'error', message: '住宿发票 1100 元超出标准（220 元/天×5天=1100 元），但打卡仅2天，实际可报销 440 元' },
      { type: 'error', message: '1200 元费用无法找到对应发票凭证' },
      { type: 'warning', message: '出差期间有异地打卡记录，疑似未在目的地打卡' },
      { type: 'warning', message: '交通费用 600 元无对应车票/机票附件' },
    ],
  },
];

const conclusionConfig = {
  pass: { label: '推荐通过', color: 'green', icon: IconCheckCircle },
  partial_deduct: { label: '部分扣减', color: 'orange', icon: IconExclamationCircle },
  reject: { label: '建议拒绝', color: 'red', icon: IconCloseCircle },
};

function AuditCaseCard({ auditCase }: { auditCase: AuditCase }) {
  const [expanded, setExpanded] = useState(false);
  const config = conclusionConfig[auditCase.aiConclusion];
  const ConclusionIcon = config.icon;

  const anomalyColumns = [
    {
      title: '级别',
      dataIndex: 'type',
      width: 80,
      render: (value: string) => (
        <Tag color={value === 'error' ? 'red' : 'orange'} size="small">
          {value === 'error' ? '严重' : '警告'}
        </Tag>
      ),
    },
    {
      title: '异常描述',
      dataIndex: 'message',
    },
  ];

  return (
    <Card
      style={{
        border: auditCase.aiConclusion === 'reject' ? '1px solid #ffc9c9' :
          auditCase.aiConclusion === 'partial_deduct' ? '1px solid #ffd591' : '1px solid #aff0b5',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconUser style={{ fontSize: 20, color: '#86909c' }} />
          </div>
          <div>
            <Space>
              <Text style={{ fontWeight: 500 }}>{auditCase.applicantName}</Text>
              <Tag size="small">{auditCase.department}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>{auditCase.tripNo}</Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Space size={12}>
                <Space size={4}>
                  <IconLocation style={{ fontSize: 12, color: '#86909c' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{auditCase.destination}</Text>
                </Space>
                <Space size={4}>
                  <IconClockCircle style={{ fontSize: 12, color: '#86909c' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{auditCase.tripDays}天</Text>
                </Space>
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>¥{auditCase.tripData.declaredTotal}</Text>
                </Space>
              </Space>
            </div>
          </div>
        </Space>
        <Space>
          <Tag
            color={config.color}
            style={{ padding: '4px 12px', fontSize: 14, fontWeight: 500 }}
          >
            <ConclusionIcon style={{ marginRight: 4 }} />
            {config.label}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={expanded ? <IconUp /> : <IconDown />}
            onClick={() => setExpanded(!expanded)}
          />
        </Space>
      </div>

      <Alert
        type={auditCase.aiConclusion === 'reject' ? 'error' : auditCase.aiConclusion === 'partial_deduct' ? 'warning' : 'success'}
        content={
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>AI 审核结论</div>
            <div>{auditCase.aiSummary}</div>
            {auditCase.deductAmount && (
              <div style={{ marginTop: 4, fontWeight: 500 }}>建议扣减金额：¥{auditCase.deductAmount}</div>
            )}
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {expanded && (
        <div>
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>出差申请数据</div>
                <Space direction="vertical" size={4} style={{ width: '100%', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">交通费</Text>
                    <Text>¥{auditCase.tripData.declaredTransport}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">住宿费</Text>
                    <Text>¥{auditCase.tripData.declaredAccommodation}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">餐饮费</Text>
                    <Text>¥{auditCase.tripData.declaredMeal}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, borderTop: '1px solid #e5e6eb', paddingTop: 4 }}>
                    <Text>合计</Text>
                    <Text>¥{auditCase.tripData.declaredTotal}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>打卡记录对比</div>
                <Space direction="vertical" size={4} style={{ width: '100%', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">应出勤</Text>
                    <Text>{auditCase.punchData.expectedDays} 天</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">实际打卡</Text>
                    <Text>{auditCase.punchData.actualPunchDays} 天</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">匹配率</Text>
                    <Text style={{ color: auditCase.punchData.matchRate < 80 ? '#f53f3f' : '#00b42a', fontWeight: 500 }}>
                      {auditCase.punchData.matchRate}%
                    </Text>
                  </div>
                  {auditCase.punchData.abnormalDays > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f53f3f' }}>
                      <Text type="secondary">异常天数</Text>
                      <Text style={{ fontWeight: 500 }}>{auditCase.punchData.abnormalDays} 天</Text>
                    </div>
                  )}
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>报销发票对比</div>
                <Space direction="vertical" size={4} style={{ width: '100%', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">提交发票</Text>
                    <Text>{auditCase.invoiceData.submittedCount} 张</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">发票总额</Text>
                    <Text>¥{auditCase.invoiceData.totalAmount}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">匹配金额</Text>
                    <Text style={{ color: '#00b42a' }}>¥{auditCase.invoiceData.matchedAmount}</Text>
                  </div>
                  {auditCase.invoiceData.unmatchedAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff7d00' }}>
                      <Text type="secondary">未匹配</Text>
                      <Text style={{ fontWeight: 500 }}>¥{auditCase.invoiceData.unmatchedAmount}</Text>
                    </div>
                  )}
                  {auditCase.invoiceData.overStandardAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f53f3f' }}>
                      <Text type="secondary">超标金额</Text>
                      <Text style={{ fontWeight: 500 }}>¥{auditCase.invoiceData.overStandardAmount}</Text>
                    </div>
                  )}
                </Space>
              </Card>
            </Col>
          </Row>

          {auditCase.anomalies.length > 0 && (
            <div>
              <Space style={{ marginBottom: 12 }}>
                <IconExclamationCircle style={{ color: '#ff7d00' }} />
                <Text style={{ fontWeight: 500 }}>异常项列表（{auditCase.anomalies.length} 项）</Text>
              </Space>
              <Table
                columns={anomalyColumns}
                data={auditCase.anomalies.map((a, i) => ({ ...a, key: i }))}
                pagination={false}
                size="small"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function FinanceAuditDashboard() {
  const passCount = MOCK_AUDIT_CASES.filter(c => c.aiConclusion === 'pass').length;
  const partialCount = MOCK_AUDIT_CASES.filter(c => c.aiConclusion === 'partial_deduct').length;
  const rejectCount = MOCK_AUDIT_CASES.filter(c => c.aiConclusion === 'reject').length;

  return (
    <div style={{ marginBottom: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <IconSafe style={{ color: '#165dff' }} />
            <Title heading={5} style={{ margin: 0 }}>AI 财务审核看板</Title>
          </Space>
          <Text type="secondary">三方比对：出差申请 vs 打卡记录 vs 报销发票</Text>
        </div>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 4 }}>待审核</div>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{MOCK_AUDIT_CASES.length}</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#e8ffea', border: '1px solid #aff0b5' }}>
              <div style={{ fontSize: 12, color: '#00b42a', marginBottom: 4 }}>推荐通过</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#00b42a' }}>{passCount}</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff7e6', border: '1px solid #ffd591' }}>
              <div style={{ fontSize: 12, color: '#fa8c16', marginBottom: 4 }}>部分扣减</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#fa8c16' }}>{partialCount}</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff0f0', border: '1px solid #ffc9c9' }}>
              <div style={{ fontSize: 12, color: '#f53f3f', marginBottom: 4 }}>建议拒绝</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f53f3f' }}>{rejectCount}</div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {MOCK_AUDIT_CASES.map((auditCase) => (
          <AuditCaseCard key={auditCase.id} auditCase={auditCase} />
        ))}
      </Space>
    </div>
  );
}
