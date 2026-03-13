import { Facebook, Send } from 'lucide-react';
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
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
      icon: ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: '#000000',
      bg: 'bg-foreground/5',
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`,
      icon: Send,
      color: '#0088CC',
      bg: 'bg-[#0088CC]/10',
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
