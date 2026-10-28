import type { ReactNode } from 'react';

/** 骨架里的槽位标注：编号 + 该槽放什么组件。 */
export function FrameSlot({ index, label }: { index: number; label: ReactNode }) {
  return (
    <div className="ui-library-frame__slot">
      <span className="ui-library-frame__slot-no">{index}</span>
      <span>{label}</span>
    </div>
  );
}

/** 骨架外壳：虚线框 + 槽位说明，提醒读者「这是结构，不是页面」。 */
export function FrameShell({ children }: { children: ReactNode }) {
  return <div className="ui-library-frame">{children}</div>;
}
