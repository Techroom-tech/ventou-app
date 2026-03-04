import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardGuard } from '@/components/DashboardGuard';
import { DashboardLayout } from './DashboardLayout';
import { DashboardSkeleton } from './DashboardSkeleton';

/**
 * Shared shell for all /dashboard/* routes.
 * Mounts auth guard + shop guard + layout (sidebar/header) ONCE.
 * Navigating between sub-pages only swaps the <Outlet /> content.
 */
export default function DashboardShell() {
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
