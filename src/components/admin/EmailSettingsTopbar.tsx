import { Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export function EmailSettingsTopbar() {
  const { user } = useAuth();
  const initials = user?.user_metadata?.first_name?.[0]?.toUpperCase() ?? 'A';

  return (
    <header className="sticky top-0 z-50 h-16 w-full bg-background border-b border-border flex items-center justify-between px-5 md:px-8">
      <h1 className="text-xl font-semibold text-foreground">Email Settings</h1>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Settings className="h-5 w-5" />
        </button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
