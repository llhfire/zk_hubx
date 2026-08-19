import { useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Divider,
  Space,
  Typography,
  Grid,
  Collapse,
} from '@arco-design/web-react';
import {
  IconUser,
  IconLocation,
  IconCalendar,
  IconStorage,
  IconHome,
  IconBriefcase,
  IconDown,
  IconUp,
  IconCheckCircle,
  IconCloseCircle,
  IconClockCircle,
} from '@arco-design/web-react/icon';
import type { Trip } from '../../types';

const { Text } = Typography;
const { Row, Col } = Grid;
const { Item: CollapseItem } = Collapse;

interface BasicInfoTabProps {
  trip: Trip;
}

const approvalStatusConfig: Record<string, { icon: typeof IconCheckCircle; color: string; tag: string; tagColor: string }> = {
  approved: { icon: IconCheckCircle, color: '#00b42a', tag: '已通过', tagColor: 'green' },
  rejected: { icon: IconCloseCircle, color: '#f53f3f', tag: '已驳回', tagColor: 'red' },
  pending: { icon: IconClockCircle, color: '#ff7d00', tag: '待审批', tagColor: 'orange' },
};

const transportModeLabels: Record<string, string> = {
  high_speed_rail: '高铁', bullet_train: '动车', airplane: '飞机',
  self_drive: '自驾', bus: '大巴', ferry: '轮船', other: '其他',
};

export function BasicInfoTab({ trip }: BasicInfoTabProps) {
  const [approvalExpanded, setApprovalExpanded] = useState(false);
  const isApproved = trip.approvalRecords?.every((r) => r.status === 'approved');

  const infoItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 顶部：申请信息 + 行程信息 + 费用预估 三列并排 */}
      <Row gutter={16}>
        {/* 申请信息 */}
        <Col span={8}>
          <Card size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconUser style={{ color: '#86909c' }} />
              <Text style={{ fontWeight: 600, color: '#1d2129' }}>申请信息</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">单号</Text>
              <Text code style={{ fontSize: 12 }}>{trip.tripNo}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">申请人</Text>
              <Text style={{ fontWeight: 500 }}>{trip.applicantName}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">部门</Text>
              <Text>{trip.department}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">创建日期</Text>
              <Text>{trip.createDate}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={infoItemStyle}>
              <Text type="secondary">关联客户</Text>
              <Text style={{ fontSize: 12 }}>{trip.customerName || '-'}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">关联项目</Text>
              <Text style={{ fontSize: 12 }}>{trip.projectName || '-'}</Text>
            </div>
          </Card>
        </Col>

        {/* 行程信息 */}
        <Col span={8}>
          <Card size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconLocation style={{ color: '#86909c' }} />
              <Text style={{ fontWeight: 600, color: '#1d2129' }}>行程信息</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">目的地</Text>
              <Text style={{ fontWeight: 500 }}>{trip.destinations.join('、')}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">天数</Text>
              <Text style={{ fontWeight: 600, color: '#165dff' }}>{trip.days}天</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">日期</Text>
              <Text style={{ fontSize: 12 }}>{trip.startDate} ~ {trip.endDate}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">交通</Text>
              <Text>{trip.transportModes.map((m) => transportModeLabels[m] || m).join('、')}</Text>
            </div>
            <div style={infoItemStyle}>
              <Text type="secondary">住宿</Text>
              <Text>{trip.accommodationIntent === 'hotel' ? '酒店' : trip.accommodationIntent === 'dormitory' ? '宿舍' : '无'}</Text>
            </div>
          </Card>
        </Col>

        {/* 费用预估 */}
        <Col span={8}>
          <Card size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconStorage style={{ color: '#86909c' }} />
              <Text style={{ fontWeight: 600, color: '#1d2129' }}>费用预估</Text>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={infoItemStyle}>
                  <Text type="secondary">交通</Text>
                  <Text>¥{trip.estimatedTransportCost.toLocaleString()}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={infoItemStyle}>
                  <Text type="secondary">住宿</Text>
                  <Text>¥{trip.estimatedAccommodationCost.toLocaleString()}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={infoItemStyle}>
                  <Text type="secondary">餐饮</Text>
                  <Text>¥{trip.estimatedMealCost.toLocaleString()}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={infoItemStyle}>
                  <Text type="secondary">其他</Text>
                  <Text>¥{trip.estimatedOtherCost.toLocaleString()}</Text>
                </div>
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: 600 }} type="secondary">预计总费用</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#165dff' }}>
                ¥{trip.estimatedTotalCost.toLocaleString()}
              </Text>
            </div>
            {trip.needLoan && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>借款</Text>
                <Text style={{ fontSize: 12, color: '#ff7d00' }}>¥{trip.loanAmount?.toLocaleString()}</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 出差目的 */}
      <Card size="small" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, width: 64, flexShrink: 0 }}>出差目的</Text>
          <Text type="secondary" style={{ fontSize: 14 }}>{trip.purpose || '未填写'}</Text>
        </div>
      </Card>

      {/* 审批流程 */}
      {trip.approvalRecords && trip.approvalRecords.length > 0 && (
        <Card size="small" style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isApproved ? 'pointer' : 'default',
              padding: '4px 0',
            }}
            onClick={() => isApproved && setApprovalExpanded(!approvalExpanded)}
          >
            <Space>
              {isApproved ? (
                <IconCheckCircle style={{ color: '#00b42a' }} />
              ) : (
                <IconClockCircle style={{ color: '#ff7d00' }} />
              )}
              <Text style={{ fontWeight: 600, color: '#1d2129' }}>审批流程</Text>
              <Tag color="gray" size="small">
                {trip.approvalRecords.filter((r) => r.status === 'approved').length}/{trip.approvalRecords.length} 已通过
              </Tag>
            </Space>
            {isApproved && (
              approvalExpanded ? <IconUp /> : <IconDown />
            )}
          </div>

          {(approvalExpanded || !isApproved) && (
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {trip.approvalRecords.map((record) => {
                  const config = approvalStatusConfig[record.status] || approvalStatusConfig.pending;
                  const Icon = config.icon;
                  return (
                    <div
                      key={record.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 12px',
                        background: '#f7f8fa',
                        borderRadius: 4,
                      }}
                    >
                      <Icon style={{ color: config.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontWeight: 500 }}>{record.step}</Text>
                          <Text type="secondary">·</Text>
                          <Text type="secondary">{record.approver}</Text>
                        </div>
                        {record.comment && (
                          <div style={{ marginTop: 2 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.comment}</Text>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <Tag color={config.tagColor} size="small">{config.tag}</Tag>
                        {record.time && (
                          <div style={{ fontSize: 10, color: '#86909c', marginTop: 2 }}>{record.time}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Space>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
