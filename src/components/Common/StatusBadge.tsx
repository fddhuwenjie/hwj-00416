import { cn } from '../../lib/utils.js';

interface StatusBadgeProps {
  label: string;
  color?: string;
  className?: string;
  small?: boolean;
}

export default function StatusBadge({ label, color = 'bg-gray-100 text-gray-800', className, small = false }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
      color,
      className
    )}>
      {label}
    </span>
  );
}
