import { type LucideIcon, type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconSize = 'sidebar' | 'header' | 'button' | 'table' | 'decorative';

interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon;
  size?: IconSize | number;
  interactive?: boolean;
}

const sizeMap: Record<IconSize, number> = {
  sidebar: 20,
  header: 18,
  button: 16,
  table: 16,
  decorative: 20,
};

export function Icon({
  icon: LucideIcon,
  size = 'button',
  interactive = false,
  className,
  ...props
}: IconProps) {
  const px = typeof size === 'number' ? size : sizeMap[size];
  return (
    <LucideIcon
      size={px}
      strokeWidth={1.8}
      className={cn(
        interactive && 'icon-interactive',
        className
      )}
      {...props}
    />
  );
}
