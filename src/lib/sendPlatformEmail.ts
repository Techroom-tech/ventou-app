import { supabase } from '@/integrations/supabase/client';

export async function sendPlatformEmail(
  slug: string,
  variables: Record<string, string | number>,
  to: string,
  options?: { user_id?: string; locale?: string }
) {
  const stringVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    stringVars[k] = String(v);
  }

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      slug,
      variables: stringVars,
      to,
      ...(options?.user_id ? { user_id: options.user_id } : {}),
      ...(options?.locale ? { locale: options.locale } : {}),
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
