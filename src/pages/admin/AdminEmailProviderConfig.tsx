import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmailJumpToMenu } from '@/components/admin/EmailJumpToMenu';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmailProviders } from '@/hooks/useEmailProviders';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Send, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';

const DRIVER_META: Record<string, { label: string }> = {
  smtp: { label: 'SMTP' },
  sendgrid: { label: 'SendGrid' },
  resend: { label: 'Resend' },
  mailersend: { label: 'MailerSend' },
  mailgun: { label: 'Mailgun' },
  postmark: { label: 'Postmark' },
  sendinblue: { label: 'Sendinblue (Brevo)' },
  ses: { label: 'Amazon SES' },
  mailchimp: { label: 'Mailchimp' },
};

export default function AdminEmailProviderConfig() {
  const { driver } = useParams<{ driver: string }>();
  const navigate = useNavigate();
  const { data: providers = [], createProvider, updateProvider, activateProvider } = useEmailProviders();
  const existing = providers.find(p => p.driver === driver);
  const meta = DRIVER_META[driver || ''];

  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [emailNotification, setEmailNotification] = useState(true);
  const [emailVerification, setEmailVerification] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (existing) {
      setSenderEmail(existing.sender_email || '');
      setSenderName(existing.sender_name || '');
      setEmailNotification(existing.email_notification_enabled ?? true);
      setEmailVerification(existing.email_verification_enabled ?? false);
    }
  }, [existing]);

  if (!meta || !driver) {
    return <AdminLayout><p className="text-muted-foreground">Driver inconnu</p></AdminLayout>;
  }

  const isDefault = existing?.is_active === true;
  const toggleShow = (key: string) => setShowFields(prev => ({ ...prev, [key]: !prev[key] }));

  // ─── Save: non-sensitive fields via Supabase, then encrypt credentials via edge function ───
  const handleSave = async () => {
    if (!senderEmail) { toast.error("Sender Email est requis"); return; }
    setSaving(true);
    try {
      let providerId = existing?.id;

      if (existing) {
        // Update non-sensitive fields
        await updateProvider.mutateAsync({
          id: existing.id,
          name: meta.label,
          sender_email: senderEmail,
          sender_name: senderName,
          email_notification_enabled: emailNotification,
          email_verification_enabled: emailVerification,
        } as any);
      } else {
        // Create provider first (without sensitive config)
        await createProvider.mutateAsync({
          driver,
          name: meta.label,
          config: {}, // empty - will encrypt separately
          sender_email: senderEmail,
          sender_name: senderName,
          email_notification_enabled: emailNotification,
          email_verification_enabled: emailVerification,
        } as any);

        // Refetch to get the new provider ID
        const { data: newProviders } = await supabase
          .from('email_providers')
          .select('id')
          .eq('driver', driver)
          .order('created_at', { ascending: false })
          .limit(1);
        providerId = newProviders?.[0]?.id;
      }

      // Encrypt sensitive config via edge function
      if (providerId && Object.keys(config).length > 0) {
        const { error } = await supabase.functions.invoke('encrypt-config', {
          body: { provider_id: providerId, config },
        });
        if (error) throw error;
      }

      toast.success('Configuration sauvegardée');
      setConfig({}); // Clear sensitive fields after save
    } catch (e: any) {
      toast.error(e.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (!existing) return;
    setSettingDefault(true);
    try {
      await activateProvider.mutateAsync(existing.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSettingDefault(false);
    }
  };

  // ─── Test Mail: sends a real email via smtp-relay edge function ───
  const handleTest = async () => {
    if (!senderEmail) { toast.error("Entrez un Sender Email d'abord"); return; }

    // For SMTP: if config fields are filled, test with direct credentials
    // Otherwise, test using the saved provider
    if (driver === 'smtp' && (!config.host && !config.username)) {
      if (!existing) {
        toast.error("Sauvegardez d'abord la configuration SMTP");
        return;
      }
    }

    setTesting(true);
    try {
      if (driver === 'smtp') {
        // Use smtp-relay for real SMTP test
        const body: any = {
          to: senderEmail,
          subject: 'SMTP Test Email - Ventou',
        };

        if (config.host && config.username && config.password) {
          // Direct test with unsaved credentials
          body.smtp_config = {
            host: config.host,
            port: config.port || '465',
            username: config.username,
            password: config.password,
            sender_email: senderEmail,
          };
        } else if (existing) {
          // Test with saved (encrypted) credentials
          body.provider_id = existing.id;
        }

        const { error } = await supabase.functions.invoke('smtp-relay', { body });
        if (error) throw error;
      } else {
        // For API providers, use send-email with a test template
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            slug: 'welcome_vendor',
            variables: { name: 'Test' },
            to: senderEmail,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
      toast.success('✅ Email de test envoyé avec succès !');
    } catch (e: any) {
      toast.error(e.message || 'Échec de l\'envoi');
    } finally {
      setTesting(false);
    }
  };

  const PasswordInput = ({ fieldKey, label, placeholder }: { fieldKey: string; label: string; placeholder?: string }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type={showFields[fieldKey] ? 'text' : 'password'}
          value={config[fieldKey] || ''}
          onChange={e => setConfig(prev => ({ ...prev, [fieldKey]: e.target.value }))}
          placeholder={placeholder || (existing ? '••••••••' : label)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => toggleShow(fieldKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showFields[fieldKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate('/admin')} className="hover:text-foreground">Dashboard</button>
          <span>/</span>
          <button onClick={() => navigate('/admin/settings')} className="hover:text-foreground">Settings</button>
          <span>/</span>
          <span className="text-foreground font-medium">Email Configuration</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings/email/providers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{meta.label} Configuration</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <EmailJumpToMenu />

          <Card className="border rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{meta.label} Configuration</h2>
                {isDefault && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                    Default
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {isDefault && (
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Test Mail
                  </Button>
                )}
                {!isDefault && existing && (
                  <Button
                    size="sm"
                    onClick={handleSetDefault}
                    disabled={settingDefault}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {settingDefault ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
                    Set As Default
                  </Button>
                )}
                {/* Always show Test Mail for SMTP if credentials are filled */}
                {driver === 'smtp' && !isDefault && (config.host || existing) && (
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Test Mail
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Common: Sender Email + Email Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sender Email</Label>
                  <Input
                    type="email"
                    value={senderEmail}
                    onChange={e => setSenderEmail(e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email Method</Label>
                  <Input value={meta.label} readOnly className="bg-muted cursor-not-allowed" />
                </div>
              </div>

              {/* SMTP-specific fields */}
              {driver === 'smtp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Host</Label>
                    <Input
                      value={config.host || ''}
                      onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder={existing ? '••••••••' : 'smtp.example.com'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Port</Label>
                    <Input
                      type="number"
                      value={config.port || ''}
                      onChange={e => setConfig(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="465"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Username</Label>
                    <Input
                      value={config.username || ''}
                      onChange={e => setConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder={existing ? '••••••••' : 'user@example.com'}
                    />
                  </div>
                  <PasswordInput fieldKey="password" label="Mail Password" />
                </div>
              )}

              {/* API providers */}
              {driver !== 'smtp' && (
                <div className="space-y-4">
                  {driver === 'postmark' ? (
                    <PasswordInput fieldKey="server_token" label={`${meta.label} Server Token`} />
                  ) : (
                    <PasswordInput fieldKey="api_key" label={`${meta.label} Api Key`} />
                  )}

                  {driver === 'mailgun' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Domain</Label>
                      <Input
                        value={config.domain || ''}
                        onChange={e => setConfig(prev => ({ ...prev, domain: e.target.value }))}
                        placeholder="mg.example.com"
                      />
                    </div>
                  )}

                  {driver === 'ses' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PasswordInput fieldKey="secret_key" label="Secret Key" />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Region</Label>
                        <Input
                          value={config.region || ''}
                          onChange={e => setConfig(prev => ({ ...prev, region: e.target.value }))}
                          placeholder="us-east-1"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">SMTP Relay URL</Label>
                        <Input
                          value={config.smtp_relay_url || ''}
                          onChange={e => setConfig(prev => ({ ...prev, smtp_relay_url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {existing && Object.keys(config).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  🔒 Les credentials actuels sont chiffrés et masqués. Remplissez les champs pour mettre à jour.
                </p>
              )}

              <Separator />

              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notification</p>
                    <p className="text-xs text-muted-foreground">Enable or disable email notifications for this provider</p>
                  </div>
                  <Switch checked={emailNotification} onCheckedChange={setEmailNotification} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Verification</p>
                    <p className="text-xs text-muted-foreground">Require email verification before sending</p>
                  </div>
                  <Switch checked={emailVerification} onCheckedChange={setEmailVerification} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
