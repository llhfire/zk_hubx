import { useState, type CSSProperties } from 'react';
import {
  Button,
  CountdownTag,
  DateText,
  EntityLink,
  Eye,
  FollowUpIcon,
  GRADE_TONE,
  GradeTag,
  IdentifierText,
  Message,
  MoneyText,
  NotePencil,
  STATUS_TONE_VARS,
  SectionCard,
  Space,
  StatusTag,
  Trash,
  TrashLeadIcon,
  WeChatIcon,
  resolveStatus,
} from '@/design-system';
import { ALL_TONES, GRADE_SAMPLES, DEMO_STATUS } from './fixtures';

export function PrimitiveDemos() {
  const [closableOpen, setClosableOpen] = useState(true);

  return (
    <SectionCard title="原子组件" description="金额、状态、等级、日期、编号、关联对象、图标 —— 每个值只有一个展示入口。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">MoneyText — 金额唯一入口</div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">default</span><MoneyText value={1234567.8} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">compact</span><MoneyText value={480000} variant="compact" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">plain</span><MoneyText value={68000} variant="plain" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">tone=success</span><MoneyText value={12500} tone="success" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">tone=danger</span><MoneyText value={-3200} tone="danger" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">tone=muted</span><MoneyText value={900} tone="muted" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">空值 ≠ 零</span><MoneyText value={null} /></div>
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">StatusTag — 9 个状态色</div>
        <div className="ui-library-demo-row">
          {ALL_TONES.map((tone) => (
            <StatusTag key={tone} tone={tone}>{tone}</StatusTag>
          ))}
        </div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">列表 small（默认 20px）· 120px 列</span>
            <div className="ui-library-size-stage ui-library-size-stage--tag-col">
              <StatusTag tone="info">需求调研</StatusTag>
            </div>
          </div>
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">default 22px · 页头强调</span>
            <div className="ui-library-size-stage ui-library-size-stage--tag-col">
              <StatusTag tone="info" size="default">需求调研</StatusTag>
            </div>
          </div>
        </div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">长文案保持单行，宽度随文字</span>
            <StatusTag tone="warning">方案报价待客户确认</StatusTag>
          </div>
          <StatusTag meta={DEMO_STATUS.running} />
          <StatusTag meta={resolveStatus(DEMO_STATUS, 'unknown-key')} />
          <StatusTag tone="info" onClick={() => undefined}>可点击筛选</StatusTag>
          {closableOpen
            ? <StatusTag tone="neutral" onClose={() => setClosableOpen(false)}>状态：不限</StatusTag>
            : <Button size="mini" type="text" onClick={() => setClosableOpen(true)}>恢复「已选条件」标签</Button>}
        </div>
        <div className="ui-library-demo-row">
          {ALL_TONES.map((tone) => (
            <span
              key={tone}
              className="ui-library-tone-swatch"
              style={
                {
                  '--ui-swatch-bg': STATUS_TONE_VARS[tone].bg,
                  '--ui-swatch-fg': STATUS_TONE_VARS[tone].fg,
                  '--ui-swatch-border': STATUS_TONE_VARS[tone].border,
                } as CSSProperties
              }
            >
              {`STATUS_TONE_VARS.${tone}`}
            </span>
          ))}
        </div>
        <div className="ui-library-demo-caption-line">
          进度条、强调条、金额着色等「状态色但不是标签」的场景，用 STATUS_TONE_VARS[tone].fg，不要写 var(--success-500)。
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">GradeTag — 只显示字母，未定显示 ?</div>
        <div className="ui-library-demo-row">
          {GRADE_SAMPLES.map((grade) => (
            <GradeTag key={grade ?? 'unknown'} grade={grade} />
          ))}
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">88px 等级列，方标不拉宽</span>
            <div className="ui-library-size-stage ui-library-size-stage--grade-col">
              <GradeTag grade="S" />
            </div>
          </div>
          <span className="ui-library-demo-caption-line">
            S→{GRADE_TONE.S} · A→{GRADE_TONE.A} · B→{GRADE_TONE.B} · C→{GRADE_TONE.C} · 未定 ?
          </span>
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">DateText / CountdownTag — 日期与倒计时</div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">mode=date</span><DateText value="2026-04-28" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">mode=datetime</span><DateText value="2026-04-28 14:30" mode="datetime" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">区间 + 后缀</span><DateText value="2026-04-01" end="2026-04-30" suffix="共 30 天" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">空值</span><DateText value={null} /></div>
        </div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">days=12</span><CountdownTag days={12} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">days=3（临期）</span><CountdownTag days={3} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">days=0</span><CountdownTag days={0} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">days=-5（逾期）</span><CountdownTag days={-5} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">空值</span><CountdownTag days={null} /></div>
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">168px 日期列</span>
            <div className="ui-library-size-stage ui-library-size-stage--date-col">
              <DateText value="2026-10-28" />
              <CountdownTag days={-5} />
            </div>
          </div>
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">IdentifierText / EntityLink — 标识与关联对象</div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">md（单行省略 + 悬停看全值）</span>
            <IdentifierText value="HT-2026-0412-ZK-HUBX-0001" maxWidth={200} />
          </div>
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">sm · muted</span>
            <IdentifierText value="zhang.wei@zkhubx.com" size="sm" tone="muted" maxWidth={180} />
          </div>
        </div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">按稳定 ID 跳转</span><EntityLink to="/customers">海淀智检科技有限公司</EntityLink></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">打开抽屉（onClick）</span><EntityLink onClick={() => Message.info('打开客户详情抽屉')}>松澜供应链</EntityLink></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">无权限置灰</span><EntityLink disabled>已下线客户</EntityLink></div>
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">业务图标</div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">FollowUpIcon（默认 14）</span><FollowUpIcon size={18} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">TrashLeadIcon（默认 14）</span><TrashLeadIcon size={18} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">WeChatIcon（默认 16）</span><WeChatIcon size={18} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">Eye / NotePencil / Trash</span><Space><Eye size={18} /><NotePencil size={18} /><Trash size={18} /></Space></div>
        </div>
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-caption">
            实样区统一按 18 展示，与同排 Phosphor 操作图标对齐；业务图标以 img 渲染，表格操作列跟随小按钮取默认尺寸，不要混排两种大小。
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
