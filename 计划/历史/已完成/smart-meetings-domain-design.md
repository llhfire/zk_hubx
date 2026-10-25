# 智能会议领域设计（smart-meetings-domain-design.md）

> 状态：设计已定稿，未编码。业务规则见 `文档/PRD/PRD-智能会议.md`；边界总纲见根目录 `PLAN.md`。
> 本文档定义领域层：类型、状态机、版本机制、权限过滤、行动项差异同步与统计筛选纯函数，以及 services 接缝。α/β 共用本层（CONTEXT §智能会议数据边界）。

## 1. 模块目录结构

```
packages/ui/src/app/pages/smart-meetings/
  types.ts                 # 领域类型（唯一事实源，α/β 共用）
  minuteStateMachine.ts    # 纪要状态机 + 动作权限纯函数
  versioning.ts            # 版本生成与快照纯函数
  accessControl.ts         # 会议角色 + 业务权限双重过滤纯函数
  actionItemSync.ts        # 行动项差异计算 + TODO 投影映射纯函数
  boardQueries.ts          # 列表统计 / 搜索 / 筛选纯函数
  aiParser.ts              # α 确定性解析 + 润色预览纯函数（接口见 ai-and-beta-design）
  meetingSource.ts         # 行政会议来源快照映射纯函数
  minuteService.ts         # ISmartMeetingService 接口 + α mock/localStorage 实现
  mockData.ts              # α 种子数据
  __tests__/               # 上述全部纯函数的 Vitest
```

纯函数原则：`minuteStateMachine` / `versioning` / `accessControl` / `actionItemSync` / `boardQueries` 不持有状态、不发 IO，输入输出全部可序列化，Vitest 直接覆盖。

## 2. 领域类型（types.ts）

```ts
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
```

### 2.1 原始文本来源

```ts
export interface MinuteSourceText {
  /** 原始粘贴/文本内容，永不因重新解析被覆盖 */
  content: string;
  /** 上传文件名；直接粘贴时为空 */
  fileName?: string;
  uploadedAt: string;            // ISO
  parseStatus: SourceParseStatus;
  /** 不支持格式的明确提示文案；unsupported 时必填 */
  parseMessage?: string;
}
```

### 2.2 业务引用

```ts
export interface BusinessRef {
  kind: RefKind;
  id: string;                    // 系统目录中的真实 ID
  /** 展示快照：保存时的标题等，业务对象变化不删除引用 */
  displaySnapshot: string;
  /** 保存时的视角（如保存人是销售/交付），用于脱敏与展示 */
  savedAsView: string;
}
```

### 2.3 行动项（主数据）

```ts
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
```

### 2.4 纪要版本

```ts
export interface MinuteVersion {
  versionId: string;
  /** 版本生成原因：AI 重生成/撤回修改/确认/驳回后重新提交 */
  reason: 'ai_regenerate' | 'withdraw_edit' | 'confirm' | 'resubmit';
  createdAt: string;
  /** 该版本的内容快照（见 §4） */
  snapshot: MinuteSnapshot;
}
```

### 2.5 纪要主记录

```ts
export interface SmartMinute {
  id: string;
  title: string;
  meetingTime: string;
  organizerId: string;           // 整理人
  reviewerId: string;            // 确认人
  attendeeIds: string[];         // 参会人（人员目录）
  status: MinuteStatus;
  /** 会议级业务引用，行动项可继承 */
  refs: BusinessRef[];
  coreDecisions: string[];       // 核心决议
  contentMarkdown: string;       // 正文
  actionItems: ActionItem[];     // 行动项主数据（当前态）
  source: MinuteSourceText | null;
  versions: MinuteVersion[];
  /** 行政会议来源（PRD §3.3）；独立新建时为 null */
  adminSource: AdminMeetingSnapshot | null;
  /** AI 润色预览：未采用时保留，采用后清空 */
  polishPreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMeetingSnapshot {
  sourceMeetingId: string;       // 行政会议 Meeting.id
  title: string;
  meetingTime: string;
  organizer: string;             // 快照字段：创建时的值，之后不双向同步
  attendees: string[];
  projectRefs: BusinessRef[];    // 行政会议已有 projectId 转换的引用
  /** 来源会议当前状态（行政会议取消/删除时更新提示，不删除纪要） */
  sourceStatus: 'active' | 'cancelled' | 'deleted';
}
```

### 2.6 TODO 投影类型

复用现有 `packages/ui/src/app/todos/types.ts` 的 `TodoItem`，扩展：

```ts
// todos/types.ts 的 TodoSource 联合类型新增：
export type TodoSource = ... | 'smart_meeting';
```

`TodoItem.sourceId = actionItemId`（行动项稳定 ID 即幂等锚点），`route` 指向纪要工作台。

## 3. 状态机（minuteStateMachine.ts）

### 3.1 迁移表

```ts
type MinuteAction =
  | 'submit'      // 提交确认   draft -> pending_review
  | 'confirm'     // 确认       pending_review -> confirmed（reviewer/admin）
  | 'reject'      // 驳回       pending_review -> pending_review（语义：修改后待确认）
  | 'withdraw'    // 撤回修改   confirmed -> draft（organizer/admin，生成新版本）
  | 'archive'     // 归档       confirmed -> archived
  | 'delete';     // 删除       仅 draft（organizer/admin）

export function canTransition(status: MinuteStatus, action: MinuteAction, role: MeetingRole): boolean;
export function applyTransition(m: SmartMinute, action: MinuteAction, actorId: string, now: string):
  { ok: true; minute: SmartMinute } | { ok: false; reason: string };
```

规则（PRD §5）：

| 动作 | 前置状态 | 允许角色 | 副作用 |
| --- | --- | --- | --- |
| submit | draft | organizer/admin | 无版本 |
| confirm | pending_review | reviewer/admin | 生成 confirm 版本；触发 TODO 同步 |
| reject | pending_review | reviewer/admin | 状态不变；记录驳回意见；重新提交时生成 resubmit 版本 |
| withdraw | confirmed | organizer/admin | 生成 withdraw_edit 版本；TODO 不回滚（历史版本不反向修改 TODO） |
| archive | confirmed | reviewer/admin | 归档不取消未完成 TODO |
| delete | draft | organizer/admin | 物理删除；不生成版本 |

### 3.2 字段编辑权限

```ts
export function canEditFields(m: SmartMinute, actorId: string, actorRole: MeetingRole): boolean;
// organizer/admin 且 status ∈ {draft, pending_review} 可编辑
// confirmed 须先 withdraw；archived 只读
```

## 4. 版本机制（versioning.ts）

```ts
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

export function snapshotOf(m: SmartMinute): MinuteSnapshot;
export function buildVersion(m: SmartMinute, reason: MinuteVersion['reason'], now: string): MinuteVersion;
```

- 版本**只追加**，无删除、无覆盖；`versions` 按创建时间升序。
- 版本查看/复制开放给可见用户；无「回滚」操作（PRD §5.3）。
- `withdraw` 后编辑直接改主记录，下一次 `confirm` 再生成新版本。

## 5. 权限过滤（accessControl.ts）

```ts
/** 输入当前用户信息（角色 + 业务权限谓词），输出对单篇纪要的可见字段视图 */
export interface ViewerContext {
  userId: string;
  isAdmin: boolean;
  /** 业务权限谓词：用户对某业务单是否有查看权（α mock / β 服务端均注入同一签名） */
  canViewBiz: (ref: BusinessRef) => boolean;
}

export interface MinuteView {
  visible: boolean;
  /** false 时列表也不显示该纪要（业务关联人员无对应权限） */
  canSeeSourceText: boolean;     // 原始文本默认仅 organizer/reviewer/admin
  canSeeContent: boolean;
  /** 脱敏后的引用列表：无权引用保留但替换展示 */
  maskedRefs: BusinessRef[];
  canEdit: boolean;
  canTransitionTo: MinuteAction[];
}

export function viewMinute(m: SmartMinute, viewer: ViewerContext): MinuteView;
```

双重过滤次序（CONTEXT §智能会议查看权限）：

1. 先判会议角色：organizer / reviewer / admin -> 整篇可见（含原始文本）。
2. attendee -> 会议权限内可见正文，`canSeeSourceText = false`。
3. biz_member（既非参会人又非会议角色）-> 仅当**至少一条**引用 `canViewBiz` 为 true 才 visible；可见范围内，`canViewBiz(ref)` 为 false 的引用替换为 `displaySnapshot: '无权查看的业务单'` 类脱敏文案。
4. TODO 可见性（待办中心侧）：责任人、会议角色及有对应业务权限者。

## 6. 行动项差异同步（actionItemSync.ts）

核心：**以 actionItemId 为锚，diff 行动项当前态与已投影 TODO 态，输出幂等操作集**。

```ts
/** 同步前置：纪要已确认 且 行动项字段完整（PRD §7.2） */
export function isActionItemSyncable(a: ActionItem): boolean;
// 要求：content 非空 && assigneeId !== null && priority 存在
//       && (dueDate !== undefined && priorityNeedsReview === false)
//       && refs.length > 0（会议级继承在保存时已展开到行动项 refs）

export interface TodoSyncOp =
  | { op: 'create'; item: TodoItem }
  | { op: 'update'; id: string; patch: Partial<TodoItem> }
  | { op: 'softCancel'; id: string };

/** 输入：纪要当前行动项 + 该纪要已存在的投影 TODO（按 sourceId=actionItemId 过滤） */
export function diffActionItemsToTodo(
  minute: SmartMinute,
  existingTodos: TodoItem[],
  buildId: () => string,
  now: string,
): TodoSyncOp[];
```

diff 规则（CONTEXT §智能会议行动项版本）：

| 行动项当前态 | 已有 TODO | 输出 |
| --- | --- | --- |
| 合格 pending，无 TODO | 无 | `create` |
| 合格 pending，有 TODO，字段变化 | 有 | `update`（内容/责任人/截止日期） |
| 合格 pending，TODO 已完成 | 有（completed） | 无操作（已完成不原地重开） |
| `canceled` | 有未完成 TODO | `softCancel` |
| `canceled` | 无/已取消 | 无操作 |
| `completed` | 有未完成 TODO | `update` -> status: completed |
| 不合格（待指派/无引用等） | 无 | 无操作（可保留不派发） |
| 不合格，曾有 TODO | 有 | 无操作（不因撤回删 TODO；撤回纪要也不反向修改） |

映射细节：`TodoItem.source = 'smart_meeting'`、`sourceId = actionItemId`、`priority: P0/P1/P2 -> high/medium/low`、`module: '智能会议'`、`route: /smart-meetings/${minute.id}`、`deadline: dueDate ?? undefined`。

**同步触发点**：仅 `confirm`（及 confirm 后再编辑行动项字段并保存时）。`withdraw` / `reject` / 版本查看不触发。

## 7. 列表统计与筛选（boardQueries.ts）

```ts
export interface MinuteListQuery {
  keyword?: string;            // 标题/决议/正文/行动项/可见引用/参会人
  status?: MinuteStatus[];
  refKinds?: RefKind[];        // 或具体 refId
  attendeeId?: string;
  organizerId?: string;
  reviewerId?: string;
  timeRange?: { from: string; to: string };
  hasOpenTodo?: boolean;
}

export interface MinuteListSummary {
  id: string; title: string; meetingTime: string; status: MinuteStatus;
  attendeeSummary: string;        // 派生
  openTodoCount: number;          // 读行动项主数据
  refChips: BusinessRef[];        // 按当前权限去重
  updatedAt: string;
}

export function summarizeMinutes(all: SmartMinute[], todos: TodoItem[], viewer: ViewerContext): MinuteListSummary[];
export function filterMinutes(summaries: MinuteListSummary[], q: MinuteListQuery): MinuteListSummary[];

export interface MonthStats { pending_review: number; confirmed: number; archived: number; }
export function monthDeposited(all: SmartMinute[], month: string): MonthStats;
// 口径：只统计智能会议；待确认/已确认/已归档；不含已删除草稿（删除即物理删除，天然不在集合）
```

## 8. 行政来源映射（meetingSource.ts）

```ts
/** 从行政会议 Meeting 结构构造一次性快照（MeetingManagement.tsx 的 Meeting 接口为输入） */
export function buildAdminSnapshot(meeting: Meeting, projectRef?: BusinessRef): AdminMeetingSnapshot;
/** 行政会议是否已有当前智能纪要（一会议至多一篇） */
export function hasActiveMinute(sourceMeetingId: string, all: SmartMinute[]): boolean;
// 判定口径：存在 adminSource.sourceMeetingId 相等且 status !== 'archived' 的纪要。
// 归档后同一行政会议允许再建新纪要（"最多一篇当前纪要"）。
```

行政会议取消/删除 -> 仅更新 `adminSource.sourceStatus`，纪要本体不动。

## 9. services 接缝（minuteService.ts）

沿用 `operating-expense/expenseService.ts` 的接口模式（见 `HubX/packages/ui/src/app/pages/operating-expense/expenseService.ts`）：

```ts
export interface ISmartMeetingService {
  listMinutes(): Promise<SmartMinute[]>;
  getMinute(id: string): Promise<SmartMinute | null>;
  createMinute(input: CreateMinuteInput): Promise<SmartMinute>;
  updateMinute(id: string, fn: (m: SmartMinute) => SmartMinute): Promise<SmartMinute>;
  deleteDraft(id: string, actorId: string): Promise<void>;   // 状态机校验在调用方
  importSourceText(id: string, source: MinuteSourceText): Promise<SmartMinute>;
}
```

- α：`createMockSmartMeetingService(...)`，种子 mock + localStorage 持久化（key: `smart-meetings/v1`），Context 持有数组、service 内 setState 更新。
- β：同一接口的 fetch 实现（`/api/smart-minutes/...`），D1 边界见 `smart-meetings-ai-and-beta-design.md` §3。
- 状态机 / 版本 / 同步纯函数在 service 之上由 Context 调用，α/β 完全共用。

## 10. 测试清单（Vitest，随领域层一并交付）

| 文件 | 覆盖点 |
| --- | --- |
| minuteStateMachine.test.ts | 全部迁移合法/非法组合；角色越权拒绝；confirmed 编辑须 withdraw；delete 仅 draft |
| versioning.test.ts | 四种 reason 各生成版本；快照字段完整；版本只追加 |
| accessControl.test.ts | 整理人/确认人/管理员整篇可见；参会人无原始文本；biz_member 双重过滤；无权引用脱敏且保留 |
| actionItemSync.test.ts | diff 表全行覆盖；幂等（同一输入两次 diff 第二次为空）；已完成不重开；不合格不派发 |
| boardQueries.test.ts | 关键词命中各字段；状态/时间/人员筛选；本月沉淀口径；去重引用；未完成 TODO 筛选 |
| meetingSource.test.ts | 快照一次性；一会议至多一当前纪要；归档后可再建；来源取消不删纪要 |
| aiParser.test.ts | 见 ai-and-beta-design §2.4 |

## 11. 依赖与影响面

- 修改：`todos/types.ts`（TodoSource 增加 `'smart_meeting'`）、`TodoContext`（投影待办的渲染与权限，不改编辑语义）、`MeetingManagement.tsx`（加「创建智能纪要」入口）、`App.tsx` 路由、`MainLayout.tsx` 菜单。
- 不修改：行政会议数据结构、报价/合同/项目/Case 业务对象（引用只读）。
- 复用：人员目录、`TodoItem`、`useAppVersion`。
