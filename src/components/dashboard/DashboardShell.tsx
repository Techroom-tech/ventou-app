import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardGuard } from '@/components/DashboardGuard';
import { DashboardSkeleton } from './DashboardSkeleton';

/**
 * Shared shell for all /dashboard/* routes.
 * Mounts auth guard + shop guard ONCE — navigating between
 * sub-pages only swaps the <Outlet /> content, no re-auth.
 */
export default function DashboardShell() {
  return (
    <ProtectedRoute>
      <DashboardGuard>
        <Suspense fallback={<DashboardSkeleton />}>
          <Outlet />
        </Suspense>
      </DashboardGuard>
    </ProtectedRoute>
  );
}
