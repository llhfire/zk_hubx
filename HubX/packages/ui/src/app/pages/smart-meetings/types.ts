/** 智能会议领域类型（唯一事实源，α/β 共用） */

/** 纪要状态（PRD §5.1） */
export type MinuteStatus = 'draft' | 'pending_review' | 'confirmed' | 'archived';

/** 行动项状态（PRD §5.2） */
export type ActionItemStatus = 'pending' | 'completed' | 'canceled';

/** 优先级：无依据时 AI 默认 P1 并标记待确认 */
export type ActionPriority = 'P0' | 'P1' | 'P2';

/** 业务引用视角（PRD §8.1） */
export type RefKind = 'lead' | 'contract' | 'project' | 'case';

/** 会议角色（PRD §4） */
export type MeetingRole = 'organizer' | 'reviewer' | 'attendee' | 'biz_member' | 'admin';

/** 原始资料解析状态 */
export type SourceParseStatus = 'none' | 'parsed' | 'partial' | 'failed' | 'unsupported';

/** 原始文本来源 */
export interface MinuteSourceText {
  /** 原始粘贴/文本内容，永不因重新解析被覆盖 */
  content: string;
  /** 上传文件名；直接粘贴时为空 */
  fileName?: string;
  uploadedAt: string;
  parseStatus: SourceParseStatus;
  /** 不支持格式的明确提示文案；unsupported 时必填 */
  parseMessage?: string;
}

/** 业务引用 */
export interface BusinessRef {
  kind: RefKind;
  id: string;
  /** 展示快照：保存时的标题等，业务对象变化不删除引用 */
  displaySnapshot: string;
  /** 保存时的视角（如保存人是销售/交付），用于脱敏与展示 */
  savedAsView: string;
}

/** 行动项（主数据） */
export interface ActionItem {
  /** 稳定 ID：跨版本不变，TODO 幂等同步的锚点 */
  actionItemId: string;
  content: string;
  /** 人员目录 ID；AI 匹配不到时为 null（待指派，不可确认） */
  assigneeId: string | null;
  assigneeName: string;
  priority: ActionPriority;
  /** AI 无依据默认 P1 时置 true，人工复核后清除 */
  priorityNeedsReview: boolean;
  /** 截止日期：null = 明确选择无截止（与"未填"区分：见 canSyncTodo） */
  dueDate: string | null;
  /** 业务单引用；空数组 = 未选（未继承会议级） */
  refs: BusinessRef[];
  status: ActionItemStatus;
  completedAt?: string;
  canceledAt?: string;
}

/** 纪要版本 */
export interface MinuteVersion {
  versionId: string;
  /** 版本生成原因：AI 重生成/撤回修改/确认/驳回后重新提交 */
  reason: 'ai_regenerate' | 'withdraw_edit' | 'confirm' | 'resubmit';
  createdAt: string;
  /** 该版本的内容快照 */
  snapshot: MinuteSnapshot;
}

/** 纪要快照 */
export interface MinuteSnapshot {
  title: string;
  meetingTime: string;
  attendeeIds: string[];
  refs: BusinessRef[];
  coreDecisions: string[];
  contentMarkdown: string;
  /** 行动项快照：含 actionItemId，供版本查看与差异对比 */
  actionItems: ActionItem[];
}

/** 行政会议来源快照 */
export interface AdminMeetingSnapshot {
  sourceMeetingId: string;
  title: string;
  meetingTime: string;
  organizer: string;
  attendees: string[];
  projectRefs: BusinessRef[];
  /** 来源会议当前状态（行政会议取消/删除时更新提示，不删除纪要） */
  sourceStatus: 'active' | 'cancelled' | 'deleted';
}

/** 纪要主记录 */
export interface SmartMinute {
  id: string;
  title: string;
  meetingTime: string;
  organizerId: string;
  reviewerId: string;
  attendeeIds: string[];
  status: MinuteStatus;
  /** 会议级业务引用，行动项可继承 */
  refs: BusinessRef[];
  coreDecisions: string[];
  contentMarkdown: string;
  actionItems: ActionItem[];
  source: MinuteSourceText | null;
  versions: MinuteVersion[];
  /** 行政会议来源（PRD §3.3）；独立新建时为 null */
  adminSource: AdminMeetingSnapshot | null;
  /** AI 润色预览：未采用时保留，采用后清空 */
  polishPreview: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 纪要状态机动作 */
export type MinuteAction =
  | 'submit'
  | 'confirm'
  | 'reject'
  | 'withdraw'
  | 'archive'
  | 'delete';
