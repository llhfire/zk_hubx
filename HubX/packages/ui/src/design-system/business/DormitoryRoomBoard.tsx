import type { ReactNode } from 'react';
import { Button, Radio, Select, Space, Tooltip } from '../foundation/controls';
import { EmptyState } from '../data-display/EmptyState';
import { StatusTag, type StatusTone } from '../primitives/StatusTag';
import { IconTool } from '../foundation/controls';
import '../components.css';

export type DormitoryRoomStatusFilter = 'all' | 'available' | 'occupied' | 'maintenance';

export interface DormitoryRoomBoardBed {
  key: string;
  label: ReactNode;
  occupied: boolean;
  occupantName?: ReactNode;
  stayLabel?: ReactNode;
  stayTone?: StatusTone;
  onSelect?: () => void;
  onCheckout?: () => void;
}

export interface DormitoryRoomBoardRoom {
  key: string;
  roomNumber: ReactNode;
  roomTypeKey?: string;
  roomTypeLabel: ReactNode;
  roomTypeTone?: StatusTone;
  facilities: ReactNode[];
  maintenance?: boolean;
  onMaintenance?: () => void;
  beds: DormitoryRoomBoardBed[];
}

export interface DormitoryRoomBoardFloor {
  key: string;
  label: ReactNode;
  roomCount: number;
  bedCount: number;
  occupiedCount: number;
  rooms: DormitoryRoomBoardRoom[];
}

export interface DormitoryRoomBoardProps {
  floors: DormitoryRoomBoardFloor[];
  statusFilter: DormitoryRoomStatusFilter;
  onStatusFilterChange: (value: DormitoryRoomStatusFilter) => void;
  roomTypeFilter: string;
  roomTypeOptions?: Array<{ label: ReactNode; value: string }>;
  onRoomTypeFilterChange: (value: string) => void;
  emptyDescription?: ReactNode;
  className?: string;
}

const DEFAULT_ROOM_TYPE_OPTIONS = [
  { label: '全部房型', value: 'all' },
  { label: '单人间', value: 'single' },
  { label: '双人间', value: 'double' },
  { label: '四人间', value: 'quad' },
];

function isVisibleRoom(room: DormitoryRoomBoardRoom, statusFilter: DormitoryRoomStatusFilter, roomTypeFilter: string) {
  if (roomTypeFilter !== 'all' && roomTypeFilter !== room.roomTypeKey) return false;
  if (statusFilter === 'available') return room.beds.some((bed) => !bed.occupied);
  if (statusFilter === 'occupied') return room.beds.every((bed) => bed.occupied);
  if (statusFilter === 'maintenance') return Boolean(room.maintenance);
  return true;
}

/** 宿舍楼层、房间和床位的统一可视化工作区。 */
export function DormitoryRoomBoard({
  floors,
  statusFilter,
  onStatusFilterChange,
  roomTypeFilter,
  roomTypeOptions = DEFAULT_ROOM_TYPE_OPTIONS,
  onRoomTypeFilterChange,
  emptyDescription = '当前筛选条件下没有房间',
  className,
}: DormitoryRoomBoardProps) {
  const visibleFloors = floors
    .map((floor) => ({ ...floor, rooms: floor.rooms.filter((room) => isVisibleRoom(room, statusFilter, roomTypeFilter)) }))
    .filter((floor) => floor.rooms.length > 0 || (statusFilter === 'all' && roomTypeFilter === 'all'));

  return (
    <div className={['hubx-dormitory-room-board', className].filter(Boolean).join(' ')}>
      <div className="hubx-dormitory-room-board__filter-bar">
        <Space size={12} wrap>
          <Radio.Group
            type="button"
            size="small"
            value={statusFilter}
            onChange={onStatusFilterChange}
          >
            <Radio value="all">全部房态</Radio>
            <Radio value="available">仅看有空床</Radio>
            <Radio value="occupied">仅看已住满</Radio>
            <Radio value="maintenance">仅看报修中</Radio>
          </Radio.Group>
          <Select
            size="small"
            placeholder="房型过滤"
            value={roomTypeFilter}
            options={roomTypeOptions}
            onChange={onRoomTypeFilterChange}
            style={{ width: 110 }}
          />
        </Space>
        <div className="hubx-dormitory-room-board__legend" aria-label="房态图例">
          <span><i className="hubx-dormitory-room-board__dot hubx-dormitory-room-board__dot--occupied" />已占用</span>
          <span><i className="hubx-dormitory-room-board__dot hubx-dormitory-room-board__dot--available" />空闲可住</span>
          <span><i className="hubx-dormitory-room-board__dot hubx-dormitory-room-board__dot--maintenance" />设施报修</span>
        </div>
      </div>

      {visibleFloors.length === 0 ? <EmptyState description={emptyDescription} /> : visibleFloors.map((floor) => (
        <section key={floor.key} className="hubx-dormitory-room-board__floor" aria-label={String(floor.label)}>
          <div className="hubx-dormitory-room-board__floor-header">
            <strong>{floor.label}</strong>
            <StatusTag size="small">
              共 {floor.roomCount} 间 · {floor.bedCount} 床（在住 {floor.occupiedCount} / 空闲 {floor.bedCount - floor.occupiedCount}）
            </StatusTag>
          </div>
          <div className="hubx-dormitory-room-board__room-grid">
            {floor.rooms.map((room) => (
              <article
                key={room.key}
                className={[
                  'hubx-dormitory-room-board__room',
                  room.maintenance ? 'hubx-dormitory-room-board__room--maintenance' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="hubx-dormitory-room-board__room-header">
                  <div className="hubx-dormitory-room-board__room-title">
                    <strong>{room.roomNumber} 室</strong>
                    <StatusTag size="small" tone={room.roomTypeTone || 'info'}>{room.roomTypeLabel}</StatusTag>
                    {room.maintenance && <StatusTag size="small" tone="warning">维修中</StatusTag>}
                  </div>
                  {room.onMaintenance && (
                    <Tooltip content="登记房间报修">
                      <Button size="mini" type="text" icon={<IconTool />} onClick={room.onMaintenance} aria-label={`登记${String(room.roomNumber)}室报修`} />
                    </Tooltip>
                  )}
                </div>
                <div className="hubx-dormitory-room-board__facilities">
                  {room.facilities.map((facility, index) => <StatusTag key={`${room.key}:facility:${index}`} size="small">{facility}</StatusTag>)}
                </div>
                <div className="hubx-dormitory-room-board__beds">
                  {room.beds.map((bed) => {
                    const bedContent = (
                      <>
                        <span className="hubx-dormitory-room-board__bed-label">{bed.label}</span>
                        {bed.occupied ? (
                          <span className="hubx-dormitory-room-board__bed-occupant">
                            <span>{bed.occupantName || '在住员工'}</span>
                            {bed.stayLabel && <StatusTag size="small" tone={bed.stayTone || 'info'}>{bed.stayLabel}</StatusTag>}
                          </span>
                        ) : <span className="hubx-dormitory-room-board__bed-available">+ 点击办理入住</span>}
                      </>
                    );

                    return (
                      <div
                        key={bed.key}
                        className={[
                          'hubx-dormitory-room-board__bed',
                          bed.occupied ? 'hubx-dormitory-room-board__bed--occupied' : 'hubx-dormitory-room-board__bed--available',
                        ].join(' ')}
                        role={bed.occupied || !bed.onSelect ? undefined : 'button'}
                        tabIndex={bed.occupied || !bed.onSelect ? undefined : 0}
                        onClick={() => !bed.occupied && bed.onSelect?.()}
                        onKeyDown={(event) => {
                          if (!bed.occupied && bed.onSelect && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            bed.onSelect();
                          }
                        }}
                      >
                        <Space size={6}>{bedContent}</Space>
                        {bed.occupied && bed.onCheckout && (
                          <Tooltip content="办理退宿交接">
                            <Button
                              size="mini"
                              type="text"
                              className="hubx-dormitory-room-board__checkout"
                              onClick={(event) => { event.stopPropagation(); bed.onCheckout?.(); }}
                            >
                              退宿
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
