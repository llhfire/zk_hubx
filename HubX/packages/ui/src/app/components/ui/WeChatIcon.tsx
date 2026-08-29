import wechatIcon from '@/assets/wechat.svg';
import './uiFoundation.css';

export interface WeChatIconProps {
  className?: string;
  size?: number;
}

export function WeChatIcon({ className, size = 16 }: WeChatIconProps) {
  return (
    <img
      src={wechatIcon}
      alt=""
      aria-hidden="true"
      className={['hubx-wechat-icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
    />
  );
}
