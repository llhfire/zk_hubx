# 智能会议 AI 与 β 接线设计（smart-meetings-ai-and-beta-design.md）

> 状态：设计已定稿，未编码。β 接线**不在本设计文档落地时编码**，须待功能看板 `productionOn` 开关许可（PLAN.md §六）。
> 本文档分两部分：§2 AI 解析/润色（α 实现细节 + β 接口契约）；§3 β 持久化与 API 边界（D1 + Workers）。

## 1. 总原则

1. AI 结果**始终为草稿**，不直接写正式纪要、业务对象或派发待办（CONTEXT §智能会议 AI 边界）。
2. α 本地 mock/确定性解析，**不暴露浏览器密钥**；β 密钥仅 Workers 服务端持有（Secret，不进代码/不进前端）。
3. 两版共用 `ISmartMeetingAIService` 接口，前端调用方无感知切换。

```ts
export interface DraftExtraction {
  coreDecisions: string[];
  contentMarkdown: string;
  actionItems: Array<{
    content: string;
    assigneeName: string | null;    // 与人员目录模糊匹配的候选，匹不到为 null
    priority: ActionPriority;       // 无依据默认 P1
    priorityNeedsReview: boolean;
    dueDate: string | null;         // 模糊日期不推算 -> null（= 未提取）
  }>;
  parseStatus: SourceParseStatus;   // parsed / partial / failed
  parseMessage?: string;
}

export interface ISmartMeetingAIService {
  /** 输入原始转写文本，输出结构化待确认草稿；永不抛错给 UI 失败态，失败也返回 failed 的空草稿 */
  extractDraft(source: MinuteSourceText, peopleDirectory: Person[]): Promise<DraftExtraction>;
  /** 正文润色：只返回预览文本，不落库 */
  polishMarkdown(contentMarkdown: string): Promise<string>;
}
```

## 2. α 确定性解析（aiParser.ts，纯函数）

### 2.1 解析管线

```
原始文本
  -> 行归一化（去空白行、合并断行）
  -> 说话人标签识别（"张三：" / "张三：" / "10:23 张三：" / SRT/VTT 时间轴剥离）
  -> 规则抽取：
     核心决议：匹配「决定/同意/确认/结论/达成一致/定了」句式行
     行动项：匹配「需要/负责/跟进/在X日前/提交/输出/安排 + 人名（目录命中）」句式行
     正文：其余内容按说话人分段归并为会议记录体 Markdown
  -> 字段推断：
     责任人：人名与人员目录精确/别称匹配；匹不到 null（待指派）
     截止日期：仅识别明确日期/「X月X日前」；「尽快/下周」等模糊词忽略
     优先级：出现「紧急/立即/P0」-> P0；「优先」-> P1；其余默认 P1 + priorityNeedsReview
```

确定性要求：同输入必同输出（无随机、无时间依赖），Vitest 可断言完整快照。

### 2.2 失败语义

- 空文本 / 纯噪声 -> `parseStatus: 'failed'`，返回空 `DraftExtraction`，前端显示「解析失败，可继续手工编辑」。
- 部分识别（有正文但无行动项/决议）-> `'partial'`，草稿照常填充。
- 不支持格式在 SourcePanel 层拦截（白名单），`parseStatus: 'unsupported'`。

### 2.3 草稿应用规则（UI 侧）

- 「AI 智能提取并生成纪要」-> 调 `extractDraft` -> 填充 Decisions/Content/ActionItems（覆盖当前草稿区，**生成 `reason: 'ai_regenerate'`` 版本**，原文不动）。
- 已确认纪要禁用该按钮（须先撤回）。

### 2.4 aiParser.test.ts 覆盖

- 说话人标签四种格式归一化。
- 决议句式命中/不命中。
- 行动项人名目录命中（含别称）与待指派。
- 明确日期提取 vs 模糊日期忽略。
- 优先级默认 P1 + 待确认标记。
- 空文本 -> failed 空草稿。
- 同输入两次调用结果深度相等。

### 2.5 β AI 服务（apps/api 侧预留）

```
POST /api/smart-minutes/:id/extract   # body: 无（服务端读该纪要 source）
  -> Workers 读 D1 中该纪要原始文本
  -> 调用服务端 AI（密钥从 env Secret 读取）
  -> 只把 DraftExtraction 写回该纪要的「草稿暂存区」字段，不碰正式字段
  -> 返回 DraftExtraction
POST /api/smart-minutes/:id/polish     # body: { contentMarkdown }
  -> 返回 { preview: string }（不落库）
```

- 契约与 `DraftExtraction` 一致；服务端对 AI 输出做 schema 校验（字段缺失视为 partial）。
- AI 调用失败返回 502 + 明确 message，前端回落「解析失败可手工编辑」路径。
- 密钥管理：`wrangler secret put AI_API_KEY`；前端永远不可见。

## 3. β 持久化与 API 边界

### 3.1 D1 表设计（schema.sql 新增）

沿用现有「data 列存整条 JSON + version 乐观锁」模式（quotes/contracts/projects 同款）：

```sql
CREATE TABLE IF NOT EXISTS smart_minutes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,            -- 整条 SmartMinute JSON（含 versions、actionItems）
  version INTEGER NOT NULL,      -- 乐观锁
  status TEXT NOT NULL,          -- draft/pending_review/confirmed/archived（冗余列，供列表过滤）
  organizer_id TEXT NOT NULL,    -- 冗余列，权限过滤索引用
  reviewer_id TEXT NOT NULL,
  meeting_time TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smart_minutes_status ON smart_minutes(status);
CREATE INDEX IF NOT EXISTS idx_smart_minutes_organizer ON smart_minutes(organizer_id);
```

不拆行动项/版本子表：整条 JSON 与前端领域类型一一对应，避免 ORM 层映射成本；行动项 TODO 同步在前端 domain 纯函数完成后整条 PUT（与报价/合同同模式）。若后续列表性能不足再拆 `smart_minute_action_items` 投影表（预留，不在本期）。

### 3.2 API 端点（apps/api/src/index.ts 新增）

| 方法 | 路径 | 语义 |
| --- | --- | --- |
| GET | `/api/smart-minutes` | 列表（返回全部，前端做权限过滤；β 后续可加 `?mine=1`） |
| GET | `/api/smart-minutes/:id` | 单条 |
| PUT | `/api/smart-minutes/:id` | 整条 upsert + version 乐观锁校验（冲突 409） |
| POST | `/api/smart-minutes` | 新建 |
| DELETE | `/api/smart-minutes/:id` | 仅服务端校验 `data.status === 'draft'`，否则 403 |
| POST | `/api/smart-minutes/:id/extract` | β AI 解析（§2.5） |
| POST | `/api/smart-minutes/:id/polish` | β AI 润色（§2.5） |

服务端信任边界（对齐 ADR-0094 精神：服务端校验不变量，不做全量业务重放）：

- DELETE 校验 draft 状态。
- PUT 校验 version 递增 + status 迁移合法（用与前端共享的迁移表的服务端副本）。
- 行动项 TODO 同步**保持前端职责**（与 α 相同纯函数），β 不在服务端生成 TODO（TODO 目前为前端态，无 D1 表；待办中心服务端化时再迁移，不在本期范围）。

### 3.3 前端接缝切换

`SmartMeetingContext` 内按现有 α/β 判定（对齐 QuotationService/ProjectService 模式）：

```
ISmartMeetingService
  ├── α: createMockSmartMeetingService   # localStorage: smart-meetings/v1
  └── β: createHttpSmartMeetingService   # fetch 上述端点
```

`ISmartMeetingAIService` 同理：α 用 `aiParser` 纯函数同步实现；β 用 fetch extract/polish 端点。

### 3.4 落地顺序（须看板开关）

1. 阶段 D 编码 D1 表 + CRUD 端点 + http service（不动 AI）。
2. 阶段 E 接 AI Secret 与 extract/polish 端点（需要真实密钥与账号）。
3. 每步更新 `HubX/docs/ZK-HubX技术架构.html`（β 接线/D1/洞）。

## 4. 明确不做

- 不做录音上传/存储/转写（原始资料边界）。
- 不做流式输出（AI 结果一次性返回草稿）。
- 不做服务端 TODO 生成（§3.2）。
- 不做 AI 写业务对象（报价/合同/项目/Case 只读引用）。
