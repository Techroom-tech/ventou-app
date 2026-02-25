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
      className="w-full text-left bg-card rounded-xl p-6 border border-border transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex gap-4">
        <div className="h-12 w-12 shrink-0 rounded-[10px] bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
          <span className="text-sm font-medium text-primary hover:underline">Change Setting →</span>
        </div>
      </div>
    </button>
  );
}
