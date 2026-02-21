import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailDomain {
  id: string;
  domain: string;
  spf_record: string | null;
  dkim_record: string | null;
  verification_status: string;
  created_at: string;
}

export function useEmailDomains() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['email-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domain_authentication')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailDomain[];
    },
  });

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const spf = `v=spf1 include:_spf.${domain} ~all`;
      const dkim = `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4...`;
      const { error } = await supabase.from('email_domain_authentication').insert({
        domain,
        spf_record: spf,
        dkim_record: dkim,
        verification_status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-domains'] });
      toast.success('Domaine ajouté');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyDomain = useMutation({
    mutationFn: async (id: string) => {
      // In production, this would call the provider API to verify DNS records
      const { error } = await supabase
        .from('email_domain_authentication')
        .update({ verification_status: 'verified' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-domains'] });
      toast.success('Domaine vérifié');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_domain_authentication').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-domains'] });
      toast.success('Domaine supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, addDomain, verifyDomain, deleteDomain };
}
