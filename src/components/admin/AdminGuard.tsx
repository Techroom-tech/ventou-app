import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { AdminRole } from '@/types/admin';

const NotFound = lazy(() => import('@/pages/NotFound'));

interface AdminGuardProps {
  children: React.ReactNode;
  role?: AdminRole;
}

export function AdminGuard({ children, role }: AdminGuardProps) {
  const { isLoading: authLoading, user } = useAuth();
  const { role: userRole, isLoading: roleLoading, isAdmin } = useAdminRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Suspense fallback={null}><NotFound /></Suspense>;
  }

  // Check specific role requirement
  if (role && userRole !== role) {
    return <Suspense fallback={null}><NotFound /></Suspense>;
  }

  return <>{children}</>;
}
