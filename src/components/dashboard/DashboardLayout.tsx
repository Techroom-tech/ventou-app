import { ReactNode } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { FloatingChatButton } from './FloatingChatButton';
import { DataMaskProvider } from '@/contexts/DataMaskContext';
import { SidebarCollapseProvider, useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { cn } from '@/lib/utils';

function DashboardInner({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarCollapse();
  return (
    <div className="min-h-screen bg-secondary/50">
      <DashboardSidebar />
      <div className={cn('flex flex-col min-h-screen transition-all duration-200', collapsed ? 'lg:ml-[68px]' : 'lg:ml-60')}>
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <FloatingChatButton />
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
