import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailLog {
  id: string;
  recipient: string;
  template_slug: string | null;
  provider: string | null;
  status: 'success' | 'failed' | 'blocked' | 'user_disabled';
  error_message: string | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export function useEmailLogs(page = 0, pageSize = 20, statusFilter?: string) {
  return useQuery({
    queryKey: ['email-logs', page, pageSize, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as EmailLog[], total: count ?? 0 };
    },
  });
}
