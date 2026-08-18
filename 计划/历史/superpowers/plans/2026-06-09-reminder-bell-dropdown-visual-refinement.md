# Reminder Bell Dropdown Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reminder bell dropdown look like a real floating panel by restoring the outer border/shadow and turning each reminder row into a light card, without changing reminder behavior, data flow, or navigation.

**Architecture:** Keep the change local to `src/app/reminders/components/ReminderBell.tsx`. Add a small set of named style tokens/objects inside that file so the visual contract is explicit and testable, then update the existing reminder component tests to lock in the new panel/card styling without touching reminder logic.

**Tech Stack:** React 18, TypeScript, Arco Design, Vitest, react-dom/server static markup tests

---

## File Map

- **Modify:** `src/app/reminders/components/ReminderBell.tsx`
  - Keep all reminder behavior intact.
  - Add named inline style objects/constants for the dropdown shell, header, scroll area, footer, and reminder item cards.
  - Apply the refined visual styling to the existing dropdown layout.
- **Modify:** `src/app/reminders/__tests__/components.test.ts`
  - Add focused tests that render the dropdown content through a pure exported helper/component and assert the visual structure contract: outer panel has border + shadow, item cards have border + background, footer link still exists.
- **Do not modify unless absolutely necessary:** `src/app/reminders/ReminderContext.tsx`, `src/app/reminders/types.ts`, `src/app/reminders/components/ReminderSnoozeMenu.tsx`
  - These are outside the scope because the spec is visual-only.

## Implementation Notes

- Prefer theme variables already used in the codebase, e.g. `var(--color-border-2)`, `var(--color-bg-2)`, `var(--color-fill-1)`.
- Keep width at `360`.
- Do not change `buildReminderBellPreviewItems`, `hasDailyReportUnsubmittedReminder`, `openReminder`, `pendingCount`, or the footer route target.
- If Arco `Dropdown` makes the full droplist hard to test directly, extract the JSX currently held in `dropContent` into an exported presentational component or exported factory function in the same file. Keep it in the same file; do not create a new file.

---

### Task 1: Lock the visual contract with failing tests

**Files:**
- Modify: `src/app/reminders/__tests__/components.test.ts`
- Reference: `src/app/reminders/components/ReminderBell.tsx`

- [ ] **Step 1: Extend the ReminderBell exports so the dropdown shell can be tested directly**

Plan the test around one of these two shapes, then implement the matching import in the test file:

```ts
import {
  buildReminderBellPreviewItems,
  hasDailyReportUnsubmittedReminder,
  ReminderBellDropdownContent,
} from '../components/ReminderBell'
```

or, if a factory is easier to keep pure:

```ts
import {
  buildReminderBellPreviewItems,
  hasDailyReportUnsubmittedReminder,
  renderReminderBellDropdownContent,
} from '../components/ReminderBell'
```

The important constraint is that the dropdown body becomes renderable in a static test without needing to click a real Arco `Dropdown`.

- [ ] **Step 2: Write a failing test for the outer floating panel styling**

Append this test to `src/app/reminders/__tests__/components.test.ts`:

```ts
test('Reminder bell dropdown uses a bordered floating shell instead of a flat panel', () => {
  const reminders = [
    createReminder({
      id: 'approval-1',
      title: '审批处理中',
      content: '请假申请 - 5月25日 正在等待审批结果',
    }),
  ]

  const markup = renderToStaticMarkup(
    createElement(MemoryRouter, null,
      createElement(ReminderBellDropdownContent, {
        reminders,
        pendingCount: 6,
        onOpenReminder: () => undefined,
        onViewAll: () => undefined,
      }),
    ),
  )

  expect(markup).toContain('width:360px')
  expect(markup).toContain('border:1px solid var(--color-border-2)')
  expect(markup).toContain('box-shadow:0 8px 24px')
  expect(markup).not.toContain('border:none')
  expect(markup).not.toContain('box-shadow:none')
})
```

Expected first failure: `ReminderBellDropdownContent` (or the chosen exported factory) does not exist yet.

- [ ] **Step 3: Write a failing test for the light-card reminder items and footer structure**

Append this second test to `src/app/reminders/__tests__/components.test.ts`:

```ts
test('Reminder bell dropdown renders each reminder as a light card with footer entry intact', () => {
  const reminders = [
    createReminder({
      id: 'lead-1',
      type: 'lead_followup_overdue',
      title: '线索跟进逾期',
      content: 'ABC贸易公司 已逾期19天未跟进',
      sourceType: 'lead',
      actionLabel: '查看线索',
      actionTarget: { kind: 'route', path: '/leads/3' },
    }),
  ]

  const markup = renderToStaticMarkup(
    createElement(MemoryRouter, null,
      createElement(ReminderBellDropdownContent, {
        reminders,
        pendingCount: 6,
        onOpenReminder: () => undefined,
        onViewAll: () => undefined,
      }),
    ),
  )

  expect(markup).toContain('background:var(--color-fill-1)')
  expect(markup).toContain('border:1px solid var(--color-border-2)')
  expect(markup).toContain('border-top:1px solid var(--color-border-2)')
  expect(markup).toContain('查看全部待我处理')
})
```

This should also fail initially because the visual contract is not implemented yet.

- [ ] **Step 4: Run only the reminder component test file and confirm failure**

Run:

```bash
cd "/Users/pc/Documents/AI work/01-PROJECTS/HubX/Code/hubX-master/HubX" && npx vitest run src/app/reminders/__tests__/components.test.ts
```

Expected: FAIL with an export error or missing style assertions for the dropdown shell and reminder cards.

- [ ] **Step 5: Commit the failing test state**

```bash
git add src/app/reminders/__tests__/components.test.ts
git commit -m "test: capture reminder bell dropdown visual contract"
```

If your workflow avoids committing red builds, skip the commit and keep the staged diff local — but do not proceed until the failing tests clearly describe the target UI.

---

### Task 2: Implement the dropdown shell and light-card styling

**Files:**
- Modify: `src/app/reminders/components/ReminderBell.tsx`
- Test: `src/app/reminders/__tests__/components.test.ts`

- [ ] **Step 1: Extract the current `dropContent` JSX into a directly renderable presentational export in the same file**

Add a prop type and exported component near the top of `ReminderBell.tsx`:

```ts
interface ReminderBellDropdownContentProps {
  reminders: ReminderItem[]
  pendingCount: number
  onOpenReminder: (reminder: ReminderItem) => void
  onViewAll: () => void
}

export function ReminderBellDropdownContent({
  reminders,
  pendingCount,
  onOpenReminder,
  onViewAll,
}: ReminderBellDropdownContentProps) {
  // existing dropdown JSX moves here
}
```

This is a testability refactor only. Keep rendering behavior identical except for the visual changes below.

- [ ] **Step 2: Define named style objects for the shell, header, list region, footer, and reminder cards**

Inside `ReminderBell.tsx`, add constants like these above the component definitions:

```ts
const dropdownShellStyle = {
  width: 360,
  border: '1px solid var(--color-border-2)',
  borderRadius: 12,
  background: 'var(--color-bg-2)',
  boxShadow: '0 8px 24px rgba(15, 35, 95, 0.12)',
  overflow: 'hidden' as const,
}

const dropdownHeaderStyle = {
  padding: '16px 16px 12px',
  borderBottom: '1px solid var(--color-border-2)',
  background: 'var(--color-bg-2)',
}

const dropdownListStyle = {
  maxHeight: 420,
  overflowY: 'auto' as const,
  padding: 16,
  background: 'var(--color-bg-2)',
}

const dropdownFooterStyle = {
  padding: 16,
  borderTop: '1px solid var(--color-border-2)',
  background: 'var(--color-bg-2)',
}

const reminderItemCardStyle = {
  background: 'var(--color-fill-1)',
  border: '1px solid var(--color-border-2)',
  borderRadius: 10,
}
```

These values intentionally reflect the approved design: visible shell border, medium shadow, and light-card reminder items.

- [ ] **Step 3: Rebuild the dropdown content using the named style objects**

Update the JSX so the outer card no longer strips all shell styling, and each inner item uses the new light-card styles:

```tsx
export function ReminderBellDropdownContent({
  reminders,
  pendingCount,
  onOpenReminder,
  onViewAll,
}: ReminderBellDropdownContentProps) {
  return (
    <Card style={dropdownShellStyle} bodyStyle={{ padding: 0 }}>
      <div style={dropdownHeaderStyle}>
        <Text bold>待我处理</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          {pendingCount} 项未处理
        </Text>
      </div>

      <div style={dropdownListStyle}>
        {reminders.length === 0 ? (
          <Empty description="暂无待处理提醒" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {reminders.map((reminder) => (
              <Card key={reminder.id} size="small" style={reminderItemCardStyle}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text bold>{reminder.title}</Text>
                  {reminder.content ? (
                    <Paragraph type="secondary" style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                      {reminder.content}
                    </Paragraph>
                  ) : null}
                  <Space>
                    <Button size="mini" type="primary" onClick={() => onOpenReminder(reminder)}>
                      {reminder.actionLabel}
                    </Button>
                    <ReminderSnoozeMenu reminderId={reminder.id} />
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </div>

      <div style={dropdownFooterStyle}>
        <Button type="text" onClick={onViewAll}>
          查看全部待我处理
        </Button>
      </div>
    </Card>
  )
}
```

Important: do not change any displayed strings, button labels, or list truncation logic.

- [ ] **Step 4: Wire the main `ReminderBell` component to use the extracted dropdown content without changing behavior**

Replace the old `dropContent` constant with a call to the exported component:

```tsx
const dropContent = (
  <ReminderBellDropdownContent
    reminders={previewItems}
    pendingCount={pendingCount}
    onOpenReminder={openReminder}
    onViewAll={() => navigate('/')}
  />
)
```

Leave the surrounding `Dropdown`, `Badge`, and `IconNotification` behavior unchanged.

- [ ] **Step 5: Run the focused reminder component tests and confirm they pass**

Run:

```bash
cd "/Users/pc/Documents/AI work/01-PROJECTS/HubX/Code/hubX-master/HubX" && npx vitest run src/app/reminders/__tests__/components.test.ts
```

Expected: PASS for the existing reminder view-model tests plus the two new visual-contract tests.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/reminders/components/ReminderBell.tsx src/app/reminders/__tests__/components.test.ts
git commit -m "feat: add layered styling to reminder bell dropdown"
```

---

### Task 3: Verify the full app behavior and guard against regressions

**Files:**
- Verify: `src/app/reminders/components/ReminderBell.tsx`
- Verify: `src/app/reminders/__tests__/components.test.ts`
- Verify runtime: local Vite app at `http://127.0.0.1:5173/`

- [ ] **Step 1: Run the reminder-specific test script to verify repo-level compatibility**

Run:

```bash
cd "/Users/pc/Documents/AI work/01-PROJECTS/HubX/Code/hubX-master/HubX" && npm run test:reminders
```

Expected: PASS with the reminder test suite green.

- [ ] **Step 2: Run the full test suite to confirm no unrelated reminder integration tests regressed**

Run:

```bash
cd "/Users/pc/Documents/AI work/01-PROJECTS/HubX/Code/hubX-master/HubX" && npm test
```

Expected: PASS with all current Vitest files green. Existing console warnings from Arco/React Router may still appear; treat test failures, not warnings, as blockers.

- [ ] **Step 3: Start the app locally if it is not already running**

Run:

```bash
cd "/Users/pc/Documents/AI work/01-PROJECTS/HubX/Code/hubX-master/HubX" && npm run dev -- --host 127.0.0.1
```

Expected: Vite serves `http://127.0.0.1:5173/`.

- [ ] **Step 4: Manually verify the dropdown styling in the browser**

Check the following against the approved spec:

```text
1. 点击右上角通知铃铛
2. 确认整个弹层有清晰外框、圆角、阴影
3. 确认每条消息项有浅背景 + 细边框 + 轻卡片感
4. 确认顶部标题区、中部列表区、底部“查看全部待我处理”分区清楚
5. 点击“查看审批”或“查看线索”时行为与改动前一致
6. 打开“稍后处理”菜单时功能仍正常
```

Treat any behavior change as a regression even if the visuals look better.

- [ ] **Step 5: Run the production build as the final regression check**

Run:

```bash
cd "/Users/pc/Documents/AI work/01-PROJECTS/HubX/Code/hubX-master/HubX" && npm run build
```

Expected: PASS. Chunk-size warnings are acceptable; type/build errors are not.

- [ ] **Step 6: Commit the verification pass**

```bash
git add src/app/reminders/components/ReminderBell.tsx src/app/reminders/__tests__/components.test.ts
git commit -m "chore: verify reminder dropdown visual refinement"
```

If there are no code changes after verification, skip this final commit and document the verification results in your handoff instead.

---

## Self-Review

- **Spec coverage:** The plan covers the approved scope: outer shell border/shadow, internal section layering, light-card reminder items, and verification that reminder behavior remains unchanged.
- **No placeholders:** All tasks include concrete file paths, commands, and code snippets.
- **Type consistency:** The extracted component name, props, and test references are consistent across Tasks 1–3.
