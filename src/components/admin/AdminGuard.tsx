import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Loader2 } from 'lucide-react';
import type { AdminRole } from '@/types/admin';

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
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific role requirement
  if (role && userRole !== role) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
