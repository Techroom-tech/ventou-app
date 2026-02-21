import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuditLog } from './useAdminAuditLog';

export function useAdminReports() {
  const { log } = useAdminAuditLog();

  const query = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const resolveReport = async (reportId: string, status: 'reviewed' | 'ignored' | 'actioned', adminNote?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('reports')
      .update({
        status,
        admin_note: adminNote || null,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);
    await log({ action: `report_${status}`, target_type: 'report', target_id: reportId, details: { admin_note: adminNote } });
    query.refetch();
  };

  return {
    reports: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    resolveReport,
  };
}
