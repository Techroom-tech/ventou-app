import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminAuditEntry } from '@/types/admin';

export function useAdminAuditLog() {
  const { user } = useAuth();

  const log = async (entry: Omit<AdminAuditEntry, 'admin_id'>) => {
    if (!user) return;
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      ...entry,
    });
  };

  return { log };
}
