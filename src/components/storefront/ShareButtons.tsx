import { Share2 } from 'lucide-react';
const Facebook = Share2;
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      icon: Facebook,
      color: '#1877F2',
      bg: 'bg-[#1877F2]/10',
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encoded}`,
      icon: ({ className }: { className?: string }) => <WhatsAppIcon className={className} size={18} />,
      color: '#25D366',
      bg: 'bg-[#25D366]/10',
    },
  ];

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">Partager ce produit</span>
      <div className="flex items-center gap-2">
        {links.map(({ label, href, icon: Icon, color, bg }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Partager sur ${label}`}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-105 ${bg}`}
            style={{ color }}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
