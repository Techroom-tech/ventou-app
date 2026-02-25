import type { LucideIcon } from 'lucide-react';

interface EmailSettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function EmailSettingsCard({ icon: Icon, title, description, onClick }: EmailSettingsCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl p-6 border border-border transition-all duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex gap-4">
        <div className="h-12 w-12 shrink-0 rounded-[10px] bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}
