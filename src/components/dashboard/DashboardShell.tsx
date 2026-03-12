import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardGuard } from '@/components/DashboardGuard';
import { DashboardLayout } from './DashboardLayout';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useOrdersRealtime } from '@/hooks/useOrders';
import { useShop } from '@/hooks/useShop';

/**
 * Shared shell for all /dashboard/* routes.
 * Mounts auth guard + shop guard + layout (sidebar/header) ONCE.
 * Navigating between sub-pages only swaps the <Outlet /> content.
 * Also activates global realtime subscription for orders.
 */
export default function DashboardShell() {
  const { shop } = useShop();
  useOrdersRealtime(shop?.id);

  return (
    <ProtectedRoute>
      <DashboardGuard>
        <DashboardLayout>
          <Suspense fallback={<DashboardSkeleton />}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </DashboardGuard>
    </ProtectedRoute>
  );
}
