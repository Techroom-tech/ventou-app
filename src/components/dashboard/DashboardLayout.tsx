import { ReactNode } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { FeedbackWidget } from './FeedbackWidget';
import { DashboardHeader } from './DashboardHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { DataMaskProvider } from '@/contexts/DataMaskContext';
import { SidebarCollapseProvider, useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';
import { AlertTriangle } from 'lucide-react';

function SuspensionBanner() {
  const { shop } = useShop();
  if (!shop?.is_suspended) return null;
  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center gap-2 text-sm font-medium">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Votre boutique <strong>{shop.name}</strong> est suspendue{shop.suspended_reason ? ` : ${shop.suspended_reason}` : ''}. Contactez le support pour plus d'informations.
      </span>
    </div>
  );
}

function DashboardInner({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarCollapse();
  return (
    <div className="min-h-screen bg-secondary/50">
      <DashboardSidebar />
      <div className={cn('flex flex-col min-h-screen transition-all duration-200', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        <SuspensionBanner />
        <DashboardHeader />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-5 pb-20 lg:pb-5">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <FeedbackWidget />
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DataMaskProvider>
      <SidebarCollapseProvider>
        <DashboardInner>{children}</DashboardInner>
      </SidebarCollapseProvider>
    </DataMaskProvider>
  );
}
