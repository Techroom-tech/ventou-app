import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailProvider {
  id: string;
  driver: 'smtp' | 'sendgrid' | 'mailersend' | 'resend' | 'mailchimp' | 'mailgun' | 'postmark' | 'sendinblue' | 'ses';
  name: string;
  sender_email: string;
  sender_name: string | null;
  is_active: boolean;
  email_notification_enabled: boolean;
  email_verification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailProviders() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['email-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_providers')
        .select('id, driver, name, sender_email, sender_name, is_active, email_notification_enabled, email_verification_enabled, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailProvider[];
    },
  });

  const createProvider = useMutation({
    mutationFn: async (provider: { driver: string; name: string; config: Record<string, any>; sender_email?: string; sender_name?: string }) => {
      const { config, ...rest } = provider;
      const { error } = await supabase.from('email_providers').insert({
        ...rest,
        encrypted_config: config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Fournisseur ajouté');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProvider = useMutation({
    mutationFn: async ({ id, config, ...updates }: { id: string; config?: Record<string, any>; [key: string]: any }) => {
      const payload: any = { ...updates, updated_at: new Date().toISOString() };
      if (config && Object.keys(config).length > 0) {
        payload.encrypted_config = config;
      }
      const { error } = await supabase.from('email_providers').update(payload).eq('id', id);
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
      const { error: e1 } = await supabase.from('email_providers').update({ is_active: false, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (e1) throw e1;
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
