import { cn } from '@/lib/utils';

const PALETTE = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface StoreAvatarProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

export function StoreAvatar({ name, logoUrl, size = 32, className }: StoreAvatarProps) {
  const initial = name?.[0]?.toUpperCase() || 'V';
  const bg = PALETTE[hashCode(name) % PALETTE.length];

  return (
    <div
      className={cn('relative overflow-hidden rounded-[6px] shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={cn('w-full h-full flex items-center justify-center text-white font-bold', bg)}
          style={{ fontSize: size * 0.4 }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
