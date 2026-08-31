import followUpIcon from '@/assets/project-follow-up-14x14.svg';
import './uiFoundation.css';

export interface FollowUpIconProps {
  className?: string;
  size?: number;
}

export function FollowUpIcon({ className, size = 14 }: FollowUpIconProps) {
  return (
    <img
      src={followUpIcon}
      alt=""
      aria-hidden="true"
      className={['hubx-follow-up-icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
    />
  );
}
