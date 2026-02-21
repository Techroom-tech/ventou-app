import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailProvider {
  id: string;
  driver: 'smtp' | 'sendgrid' | 'mailersend' | 'resend';
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // config is NOT returned for security
}

export function useEmailProviders() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['email-providers'],
    queryFn: async () => {
      // Select without config to avoid exposing credentials
      const { data, error } = await supabase
        .from('email_providers')
        .select('id, driver, name, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailProvider[];
    },
  });

  const createProvider = useMutation({
    mutationFn: async (provider: { driver: string; name: string; config: Record<string, any> }) => {
      const { error } = await supabase.from('email_providers').insert(provider);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Fournisseur ajouté');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProvider = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; driver?: string; name?: string; config?: Record<string, any> }) => {
      const { error } = await supabase.from('email_providers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Fournisseur mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activateProvider = useMutation({
    mutationFn: async (id: string) => {
      // Deactivate all first
      const { error: e1 } = await supabase.from('email_providers').update({ is_active: false, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (e1) throw e1;
      // Activate selected
      const { error: e2 } = await supabase.from('email_providers').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Fournisseur activé');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_providers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Fournisseur supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, createProvider, updateProvider, activateProvider, deleteProvider };
}
