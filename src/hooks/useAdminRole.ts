import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminRole } from '@/types/admin';

export function useAdminRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: async (): Promise<AdminRole | null> => {
      if (!user) return null;

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('[useAdminRole] error:', error);
        return null;
      }

      // Priority: super_admin > manager > support
      const roleSet = new Set(roles?.map((r: { role: string }) => r.role) ?? []);
      if (roleSet.has('super_admin')) return 'super_admin';
      if (roleSet.has('manager')) return 'manager';
      if (roleSet.has('support')) return 'support';
      return null;
    },
    enabled: !!user,
  });

  return {
    role: data ?? null,
    isAdmin: !!data,
    isLoading,
    isSuperAdmin: data === 'super_admin',
  };
}
