import trashLeadIcon from '@/assets/trash-lead-apple-core-no-leaf-14x14.svg';
import './uiFoundation.css';

export interface TrashLeadIconProps {
  className?: string;
  size?: number;
}

export function TrashLeadIcon({ className, size = 14 }: TrashLeadIconProps) {
  return (
    <img
      src={trashLeadIcon}
      alt=""
      aria-hidden="true"
      className={['hubx-trash-lead-icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
    />
  );
}
