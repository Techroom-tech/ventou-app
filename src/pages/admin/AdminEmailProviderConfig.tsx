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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  const [mailHost, setMailHost] = useState('');
  const [mailPort, setMailPort] = useState('');
  const [mailUsername, setMailUsername] = useState('');
  const [mailPassword, setMailPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [emailNotification, setEmailNotification] = useState(true);
  const [emailVerification, setEmailVerification] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Test Mail Modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    if (existing) {
      setSenderEmail(existing.sender_email || '');
      setSenderName(existing.sender_name || '');
      setMailHost(existing.mail_host || '');
      setMailPort(existing.mail_port ? String(existing.mail_port) : '');
      setMailUsername(existing.mail_username || '');
      setEmailNotification(existing.email_notification_enabled ?? true);
      setEmailVerification(existing.email_verification_enabled ?? false);
      // Don't prefill password for security
    }
  }, [existing]);

  if (!meta || !driver) {
    return <AdminLayout><p className="text-muted-foreground">Driver inconnu</p></AdminLayout>;
  }

  const isDefault = existing?.is_active === true;

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateBeforeSave = (): boolean => {
    if (!senderEmail) {
      toast.error("Sender Email est requis");
      return false;
    }
    if (!isValidEmail(senderEmail)) {
      toast.error("Sender Email invalide");
      return false;
    }
    if (driver === 'smtp' && !existing) {
      if (!mailHost) { toast.error("Mail Host est requis"); return false; }
      if (!mailPort) { toast.error("Mail Port est requis"); return false; }
      if (!mailUsername) { toast.error("Mail Username est requis"); return false; }
      if (!mailPassword) { toast.error("Mail Password est requis"); return false; }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        sender_email: senderEmail,
        sender_name: senderName,
        email_notification_enabled: emailNotification,
        email_verification_enabled: emailVerification,
      };

      if (driver === 'smtp') {
        if (mailHost) payload.mail_host = mailHost;
        if (mailPort) payload.mail_port = parseInt(mailPort, 10);
        if (mailUsername) payload.mail_username = mailUsername;
      }

      let providerId = existing?.id;

      if (existing) {
        const updated = await updateProvider.mutateAsync({ id: existing.id, ...payload });
        providerId = updated?.id || providerId;
      } else {
        const created = await createProvider.mutateAsync({
          driver,
          name: meta.label,
          ...payload,
        });
        providerId = created?.id;
      }

      // Encrypt SMTP credentials after save
      if (driver === 'smtp' && mailPassword) {
        if (!providerId) throw new Error('Provider ID missing for encryption');
        const { error: encError } = await supabase.functions.invoke('encrypt-config', {
          body: {
            provider_id: providerId,
            config: { mail_password: mailPassword },
          },
        });
        if (encError) throw encError;
      }

      toast.success('Configuration sauvegardée');
      setMailPassword('');
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

  const openTestModal = () => {
    setTestEmail(senderEmail || '');
    setTestModalOpen(true);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Entrez une adresse email');
      return;
    }
    if (!isValidEmail(testEmail)) {
      toast.error('Adresse email de test invalide');
      return;
    }

    setTesting(true);
    try {
      if (driver === 'smtp') {
        const hasUnsavedSmtpChanges = !!existing && (
          senderEmail !== (existing.sender_email || '') ||
          senderName !== (existing.sender_name || '') ||
          mailHost !== (existing.mail_host || '') ||
          mailPort !== (existing.mail_port ? String(existing.mail_port) : '') ||
          mailUsername !== (existing.mail_username || '') ||
          !!mailPassword
        );

        const shouldUseInlineConfig = !existing || hasUnsavedSmtpChanges;

        if (shouldUseInlineConfig) {
          const host = mailHost.trim();
          const port = Number(mailPort);
          const username = mailUsername.trim();
          const password = mailPassword;

          if (!host || !port || !username || !password || !senderEmail) {
            throw new Error('Pour tester la configuration en cours, remplissez Host, Port, Username, Password et Sender Email.');
          }

          const { data, error } = await supabase.functions.invoke('smtp-relay', {
            body: {
              to: testEmail.trim(),
              subject: 'SMTP Test Email - Ventou',
              smtp_config: {
                host,
                port: String(port),
                username,
                password,
                sender_email: senderEmail.trim(),
                sender_name: senderName.trim() || undefined,
              },
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          const acceptedCount = Array.isArray(data?.delivery?.accepted) ? data.delivery.accepted.length : 0;
          const msgId = data?.delivery?.messageId ? ` | ID: ${data.delivery.messageId}` : '';
          toast.success(`✅ Email de test envoyé (${acceptedCount} destinataire accepté)${msgId}`);
          setTestModalOpen(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('smtp-relay', {
          body: {
            provider_id: existing.id,
            to: testEmail.trim(),
            subject: 'SMTP Test Email - Ventou',
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const acceptedCount = Array.isArray(data?.delivery?.accepted) ? data.delivery.accepted.length : 0;
        const msgId = data?.delivery?.messageId ? ` | ID: ${data.delivery.messageId}` : '';
        toast.success(`✅ Email de test envoyé (${acceptedCount} destinataire accepté)${msgId}`);
      } else {
        if (!existing) throw new Error('Sauvegardez d\'abord le provider avant le test');
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            slug: 'welcome_vendor',
            variables: { name: 'Test' },
            to: testEmail.trim(),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success('✅ Email de test envoyé avec succès !');
      }
      setTestModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Échec de l'envoi");
    } finally {
      setTesting(false);
    }
  };

  const canTest = driver === 'smtp' ? true : existing != null;

  return (
    <AdminLayout>
      <div className="space-y-6">
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
                {canTest && (
                  <Button variant="outline" size="sm" onClick={openTestModal} disabled={testing}>
                    <Send className="h-4 w-4 mr-1" />
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
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Common: Sender Email + Sender Name */}
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
                  <Label className="text-sm font-medium">Sender Name</Label>
                  <Input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="My App"
                  />
                </div>
              </div>

              {/* Email Method (readonly) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Method</Label>
                <Input value={meta.label} readOnly className="bg-muted cursor-not-allowed max-w-xs" />
              </div>

              {/* SMTP-specific fields */}
              {driver === 'smtp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Host</Label>
                    <Input
                      value={mailHost}
                      onChange={e => setMailHost(e.target.value)}
                      placeholder={existing ? '(saved)' : 'smtp.example.com'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Port</Label>
                    <Input
                      type="number"
                      value={mailPort}
                      onChange={e => setMailPort(e.target.value)}
                      placeholder="465"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Username</Label>
                    <Input
                      value={mailUsername}
                      onChange={e => setMailUsername(e.target.value)}
                      placeholder={existing ? '(saved)' : 'user@example.com'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mail Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={mailPassword}
                        onChange={e => setMailPassword(e.target.value)}
                        placeholder={existing ? '••••••••' : 'Password'}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {existing && (
                      <p className="text-xs text-muted-foreground">
                        🔒 Laissez vide pour garder le mot de passe existant.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notification</p>
                    <p className="text-xs text-muted-foreground">Enable or disable email notifications</p>
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

      {/* Test Mail Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Enter the email address to send a test email to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                onKeyDown={e => e.key === 'Enter' && handleSendTest()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTestModalOpen(false)} disabled={testing}>
              Close
            </Button>
            <Button onClick={handleSendTest} disabled={testing || !testEmail}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
