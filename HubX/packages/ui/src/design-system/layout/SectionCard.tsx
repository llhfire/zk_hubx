import { Card } from '@arco-design/web-react';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import '../components.css';

export interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** 标题行右侧的操作区（主操作放这里，M-025） */
  extra?: ReactNode;
  /** 内容区是否有内边距，默认 true。false 用于通栏表格/灰底列表 */
  padded?: boolean;
  /** 紧凑形态：用于侧栏、嵌套卡片等纵向空间紧张的位置 */
  size?: 'default' | 'small';
  /** 默认带描边；嵌进已有卡片时传 false */
  bordered?: boolean;
  /** 可点击卡片（例如进入详情），会自动带 hover 态 */
  hoverable?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  /** 只用于外部布局（例如撑高、吸顶）；视觉样式仍写在 components.css */
  style?: CSSProperties;
  /** 内容区内边距是布局而非视觉，允许按板块密度微调；整块不要内边距时用 `padded={false}` */
  bodyStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * 区块卡片。页面里的 `<Card title=... extra=...>` 一律换成它，
 * 保证标题层级、间距和「主操作在标题行右侧」的规则一致（M-025）。
 */
export function SectionCard({
  title,
  description,
  extra,
  padded = true,
  size = 'default',
  bordered = true,
  hoverable = false,
  onClick,
  className,
  style,
  bodyStyle,
  children,
}: SectionCardProps) {
  const hasHead = Boolean(title || description || extra);

  return (
    <Card
      className={[
        'hubx-section-card',
        padded ? '' : 'hubx-section-card--flush',
        size === 'small' ? 'hubx-section-card--small' : '',
        bordered ? '' : 'hubx-section-card--borderless',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      bodyStyle={bodyStyle}
      bordered={bordered}
      hoverable={hoverable}
      onClick={onClick}
    >
      {hasHead && (
        <div className="hubx-section-card__head">
          <div>
            {title && <h2 className="hubx-section-card__title">{title}</h2>}
            {description && <p className="hubx-section-card__description">{description}</p>}
          </div>
          {extra && <div className="hubx-section-card__extra">{extra}</div>}
        </div>
      )}
      <div className="hubx-section-card__body">{children}</div>
    </Card>
  );
}
