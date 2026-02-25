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

/**
 * Send a test email directly via SMTP relay (bypasses templates).
 * Used by AdminEmailProviderConfig for the "Test Mail" button.
 */
export async function sendSmtpTestEmail(
  to: string,
  smtpConfig?: { host: string; port: string; username: string; password: string; sender_email: string },
  providerId?: string
) {
  const body: Record<string, any> = {
    to,
    subject: 'SMTP Test Email - Ventou',
  };

  if (smtpConfig) {
    body.smtp_config = smtpConfig;
  } else if (providerId) {
    body.provider_id = providerId;
  } else {
    throw new Error('Either smtpConfig or providerId is required');
  }

  const { data, error } = await supabase.functions.invoke('smtp-relay', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
