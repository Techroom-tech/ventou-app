import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { Loader2 } from 'lucide-react';

const ALLOWED_WITHOUT_SHOP = ['/dashboard/create-shop', '/dashboard/shop-created'];

interface DashboardGuardProps {
  children: React.ReactNode;
}

export function DashboardGuard({ children }: DashboardGuardProps) {
  const { isLoading: authLoading } = useAuth();
  const { isLoading: shopLoading, hasShop } = useShop();
  const { pathname } = useLocation();

  if (authLoading || shopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasShop && !ALLOWED_WITHOUT_SHOP.includes(pathname)) {
    return <Navigate to="/dashboard/create-shop" replace />;
  }

  return <>{children}</>;
}
