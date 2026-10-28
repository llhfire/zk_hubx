import { Link, useNavigate } from 'react-router';
import { Button, Divider, Grid, Space, Tooltip, Typography } from '@/design-system';
import {
  IconCalendar,
  IconFire,
  IconFolder,
  IconLaunch,
  IconLocation,
  IconUser,
  IconUserGroup,
} from '@/design-system';
import type { Trip, TransportMode } from '../../types';
import { resolveTripLinks } from '../tripDetailMetrics';
import { DateText, DescriptionsCard, SectionCard, StatusTag } from '@/design-system';

const { Text, Paragraph } = Typography;
const { Row, Col } = Grid;

interface TripCoreProfileCardProps {
  trip: Trip;
}

const transportModeLabels: Record<TransportMode, string> = {
  high_speed_rail: '高铁',
  bullet_train: '动车',
  airplane: '飞机',
  self_drive: '自驾',
  bus: '大巴',
  ferry: '轮船',
  other: '其他',
};

export function TripCoreProfileCard({ trip }: TripCoreProfileCardProps) {
  const navigate = useNavigate();
  const links = resolveTripLinks(trip);

  return (
    <SectionCard size="small" className="trip-core-profile-card" style={{ marginBottom: 16 }}>
      {/* 顶部标题行与穿透对象标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-1)' }}>
              {trip.applicantName} · {trip.destinations.join('、')}出差申请档案
            </span>
            <StatusTag tone="info">{trip.projectId ? '项目履约差旅' : trip.leadId ? '售前拓客差旅' : '日常公差'}</StatusTag>
            <StatusTag>{trip.department}</StatusTag>
          </div>
          <div style={{ marginTop: 4, fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
            <span>单号：<code>{trip.tripNo}</code></span>
            <span style={{ margin: '0 8px' }}>·</span>
            <span>发起时间：<DateText value={trip.createDate} /></span>
            <span style={{ margin: '0 8px' }}>·</span>
            <span>更新时间：<DateText value={trip.updateDate} /></span>
          </div>
        </div>

        {/* 跨模块快捷动作直达 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {links.projectLink && (
            <Tooltip content="跳转至关联项目 360 看板">
              <Button
                size="mini"
                type="outline"
                icon={<IconFolder />}
                onClick={() => navigate(links.projectLink!)}
              >
                进入项目看板
              </Button>
            </Tooltip>
          )}
          {links.leadLink && (
            <Tooltip content="跳转至关联线索 360">
              <Button
                size="mini"
                type="outline"
                icon={<IconFire />}
                onClick={() => navigate(links.leadLink!)}
              >
                进入线索 360
              </Button>
            </Tooltip>
          )}
          {links.customerLink && (
            <Tooltip content="跳转至客户画像全景">
              <Button
                size="mini"
                type="outline"
                icon={<IconUserGroup />}
                onClick={() => navigate(links.customerLink!)}
              >
                进入客户主页
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 核心事实两列分布：左侧对象与基础，右侧出差目的 */}
      <Row gutter={24}>
        <Col span={14}>
          <DescriptionsCard
            columns={2}
            items={[
            { key: '申请人',
                          label: '申请人',
                          value: (
                            <Link to={links.applicantLink} className="trip-detail__link">
                              <IconUser style={{ fontSize: 'var(--ds-text-dense)' }} />
                              <span>{links.applicantText}</span>
                              <IconLaunch style={{ fontSize: 'var(--ds-text-caption)' }} />
                            </Link>
                          ),
                        },
            { key: '所属部门', label: '所属部门', value: trip.department || '—' },
            { key: '关联客户',
                          label: '关联客户',
                          value: links.customerLink ? (
                            <Link to={links.customerLink} className="trip-detail__link">
                              <IconUserGroup style={{ fontSize: 'var(--ds-text-dense)' }} />
                              <span>{links.customerText}</span>
                              <IconLaunch style={{ fontSize: 'var(--ds-text-caption)' }} />
                            </Link>
                          ) : (
                            <span>{trip.customerName || '—'}</span>
                          ),
                        },
            { key: '关联项目',
                          label: '关联项目',
                          value: links.projectLink ? (
                            <Link to={links.projectLink} className="trip-detail__link">
                              <IconFolder style={{ fontSize: 'var(--ds-text-dense)' }} />
                              <span>{links.projectText}</span>
                              <IconLaunch style={{ fontSize: 'var(--ds-text-caption)' }} />
                            </Link>
                          ) : (
                            <span>{trip.projectName || '—'}</span>
                          ),
                        },
            ...(links.leadLink ? [{ key: '关联线索', label: '关联线索',
                          value: (
                            <Link to={links.leadLink} className="trip-detail__link">
                              <IconFire style={{ fontSize: 'var(--ds-text-dense)' }} />
                              <span>{links.leadText}</span>
                              <IconLaunch style={{ fontSize: 'var(--ds-text-caption)' }} />
                            </Link>
                          ),
                        }] : []),
            { key: '出差周期',
                          label: '出差周期',
                          value: <DateText value={trip.startDate} end={trip.endDate} suffix={`${trip.days} 天`} />,
                        },
            { key: '交通偏好',
                          label: '交通偏好',
                          value: trip.transportModes.map((m) => transportModeLabels[m] || m).join('、') || '—',
                        },
            { key: '住宿方式',
                          label: '住宿方式',
                          value: trip.accommodationIntent === 'hotel' ? '酒店住宿' : trip.accommodationIntent === 'dormitory' ? '宿舍安排' : '无住宿需求',
                        },
          ]}
          />
        </Col>

        <Col span={10}>
          <div
            className="trip-core-profile-purpose-card"
            style={{
              padding: '12px 14px',
              background: 'var(--color-bg-2)',
              border: '1px solid var(--color-border-2)',
              borderRadius: 'var(--radius-sm)',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6 }}>
              出差目的与任务事由
            </div>
            <Paragraph
              style={{
                margin: 0,
                color: 'var(--color-text-1)',
                fontSize: 'var(--ds-text-dense)',
                lineHeight: '20px',
              }}
            >
              {trip.purpose || '未填写详细出差目的'}
            </Paragraph>
          </div>
        </Col>
      </Row>
    </SectionCard>
  );
}
