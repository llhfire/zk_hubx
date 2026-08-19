import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Tabs,
  Table,
  Space,
  Typography,
  Grid,
  Message,
} from '@arco-design/web-react';
import {
  IconLocation,
  IconClockCircle,
  IconCheckCircle,
  IconExclamationCircle,
  IconPublic,
} from '@arco-design/web-react/icon';
import type { PunchRecord } from '../types';
import { mockPunchRecords } from '../mock-data';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { TabPane } = Tabs;

export function PunchClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchRecords, setPunchRecords] = useState<PunchRecord[]>(mockPunchRecords);
  const [isOnTrip] = useState(true); // 模拟出差中状态
  const [tripDestination] = useState('杭州'); // 模拟出差目的地

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 打卡
  const handlePunch = (type: 'clock_in' | 'clock_out' | 'overtime') => {
    const newRecord: PunchRecord = {
      id: `punch-${Date.now()}`,
      employeeId: 'emp-001',
      employeeName: '张三',
      punchTime: currentTime.toLocaleString('zh-CN'),
      punchType: type,
      punchMethod: 'gps',
      longitude: 120.1234,
      latitude: 30.2345,
      address: '浙江省杭州市西湖区文三路',
      accuracy: 10,
      isOnTrip: isOnTrip,
      tripId: isOnTrip ? '1' : undefined,
      tripNo: isOnTrip ? 'BT20260425001' : undefined,
      status: 'normal',
    };
    setPunchRecords([newRecord, ...punchRecords]);
    Message.success(`${type === 'clock_in' ? '上班' : type === 'clock_out' ? '下班' : '加班'}打卡成功`);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' });
  };

  // 打卡类型标签
  const punchTypeLabels: Record<string, string> = {
    clock_in: '上班',
    clock_out: '下班',
    overtime: '加班',
  };

  // 状态标签
  const statusLabels: Record<string, { text: string; color: string }> = {
    normal: { text: '正常', color: 'green' },
    abnormal: { text: '异常', color: 'red' },
    makeup: { text: '补卡', color: 'orange' },
  };

  const columns = [
    {
      title: '打卡时间',
      dataIndex: 'punchTime',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'punchType',
      width: 80,
      render: (value: string) => <Tag>{punchTypeLabels[value]}</Tag>,
    },
    {
      title: '打卡方式',
      dataIndex: 'punchMethod',
      width: 100,
      render: (value: string) => value === 'gps' ? 'GPS定位' : value === 'wifi' ? 'WiFi' : '手动补卡',
    },
    {
      title: '位置',
      dataIndex: 'address',
      width: 200,
      ellipsis: true,
    },
    {
      title: '出差',
      dataIndex: 'isOnTrip',
      width: 100,
      render: (value: boolean) => value ? (
        <Tag color="blue" icon={<IconPublic />}>出差中</Tag>
      ) : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: string) => (
        <Tag color={statusLabels[value]?.color || 'gray'}>
          {statusLabels[value]?.text || value}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Tabs defaultActiveTab="clock">
        {/* 打卡页面 */}
        <TabPane key="clock" title="打卡">
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {/* 出差状态提示 */}
            {isOnTrip && (
              <Card style={{ marginBottom: 16, border: '1px solid #165dff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: '#e8f3ff', borderRadius: '50%' }}>
                    <IconPublic style={{ fontSize: 20, color: '#165dff' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>出差中</div>
                    <div>
                      <Text type="secondary">目的地：{tripDestination} | 关联出差单：BT20260425001</Text>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 时间显示 */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace' }}>{formatTime(currentTime)}</div>
                <div style={{ marginTop: 8 }}><Text type="secondary">{formatDate(currentTime)}</Text></div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <IconLocation style={{ color: '#86909c' }} />
                  <Text type="secondary">
                    {isOnTrip ? `浙江省杭州市西湖区文三路` : '北京市朝阳区建国门外大街'}
                  </Text>
                </div>
              </div>
            </Card>

            {/* 打卡按钮 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Button
                  type="primary"
                  long
                  style={{ height: 80, fontSize: 16 }}
                  onClick={() => handlePunch('clock_in')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <IconClockCircle style={{ fontSize: 24 }} />
                    <span>上班打卡</span>
                  </div>
                </Button>
              </Col>
              <Col span={8}>
                <Button
                  long
                  style={{ height: 80, fontSize: 16 }}
                  onClick={() => handlePunch('clock_out')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <IconClockCircle style={{ fontSize: 24 }} />
                    <span>下班打卡</span>
                  </div>
                </Button>
              </Col>
              <Col span={8}>
                <Button
                  type="secondary"
                  long
                  style={{ height: 80, fontSize: 16 }}
                  onClick={() => handlePunch('overtime')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <IconClockCircle style={{ fontSize: 24 }} />
                    <span>加班打卡</span>
                  </div>
                </Button>
              </Col>
            </Row>

            {/* 今日打卡记录 */}
            <Card title="今日打卡">
              {punchRecords.filter(p => p.punchTime.startsWith('2026-04-28')).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#86909c' }}>
                  今日暂无打卡记录
                </div>
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {punchRecords.filter(p => p.punchTime.startsWith('2026-04-28')).map((record) => (
                    <div
                      key={record.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        background: '#f7f8fa',
                        borderRadius: 8,
                      }}
                    >
                      <Space>
                        <IconCheckCircle style={{ color: '#00b42a', fontSize: 20 }} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{punchTypeLabels[record.punchType]}</div>
                          <div><Text type="secondary">{record.punchTime}</Text></div>
                        </div>
                      </Space>
                      <Tag color={statusLabels[record.status]?.color || 'gray'}>
                        {statusLabels[record.status]?.text || record.status}
                      </Tag>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </div>
        </TabPane>

        {/* 打卡记录 */}
        <TabPane key="records" title="打卡记录">
          <Card title="打卡记录">
            <Table
              columns={columns}
              data={punchRecords}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
