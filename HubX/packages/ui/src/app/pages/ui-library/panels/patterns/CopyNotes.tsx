/**
 * 样板的复制边界：告诉读者哪些是可以带走的「结构」，哪些是这一页专属的「内容」。
 * 两块内容并排，避免只写「参考此页」导致下一处照抄业务字段。
 */
export function CopyNotes({ copy, skip }: { copy: string[]; skip: string[] }) {
  return (
    <div className="ui-library-copy-notes">
      <div className="ui-library-copy-notes__col">
        <div className="ui-library-copy-notes__title">可以复制的</div>
        <ul>
          {copy.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div className="ui-library-copy-notes__col">
        <div className="ui-library-copy-notes__title">不要复制的</div>
        <ul>
          {skip.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}
