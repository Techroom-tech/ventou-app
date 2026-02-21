import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const NotFound = lazy(() => import('@/pages/NotFound'));

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: 'login' | 'notfound';
}

export function ProtectedRoute({ children, fallback = 'login' }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (fallback === 'notfound') {
      return <Suspense fallback={null}><NotFound /></Suspense>;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
