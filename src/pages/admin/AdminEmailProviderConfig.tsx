import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmailProviders } from '@/hooks/useEmailProviders';
import { sendPlatformEmail } from '@/lib/sendPlatformEmail';
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DRIVER_CONFIG: Record<string, { label: string; fields: { key: string; label: string; type?: string; placeholder?: string }[] }> = {
  sendgrid: { label: 'SendGrid', fields: [{ key: 'api_key', label: 'API Key', type: 'password' }] },
  resend: { label: 'Resend', fields: [{ key: 'api_key', label: 'API Key', type: 'password' }] },
  mailersend: { label: 'MailerSend', fields: [{ key: 'api_key', label: 'API Key', type: 'password' }] },
  mailgun: { label: 'Mailgun', fields: [{ key: 'api_key', label: 'API Key', type: 'password' }, { key: 'domain', label: 'Domaine', placeholder: 'mg.example.com' }] },
  postmark: { label: 'Postmark', fields: [{ key: 'server_token', label: 'Server Token', type: 'password' }] },
  sendinblue: { label: 'Sendinblue (Brevo)', fields: [{ key: 'api_key', label: 'API Key', type: 'password' }] },
  ses: { label: 'Amazon SES', fields: [{ key: 'api_key', label: 'Access Key', type: 'password' }, { key: 'secret_key', label: 'Secret Key', type: 'password' }, { key: 'region', label: 'Région', placeholder: 'us-east-1' }, { key: 'smtp_relay_url', label: 'URL relais SMTP', placeholder: 'https://...' }] },
  mailchimp: { label: 'Mailchimp (Mandrill)', fields: [{ key: 'api_key', label: 'API Key Mandrill', type: 'password' }] },
  smtp: { label: 'SMTP', fields: [{ key: 'http_relay_url', label: 'URL du relais HTTP', placeholder: 'https://...' }, { key: 'api_key', label: 'API Key (optionnel)', type: 'password' }] },
};

export default function AdminEmailProviderConfig() {
  const { driver } = useParams<{ driver: string }>();
  const navigate = useNavigate();
  const { data: providers = [], createProvider, updateProvider } = useEmailProviders();
  const existing = providers.find(p => p.driver === driver);
  const driverInfo = DRIVER_CONFIG[driver || ''];

  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (existing) {
      setSenderEmail((existing as any).sender_email || '');
      setSenderName((existing as any).sender_name || '');
    }
  }, [existing]);

  if (!driverInfo || !driver) {
    return <AdminLayout><p className="text-muted-foreground">Driver inconnu</p></AdminLayout>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existing) {
        await updateProvider.mutateAsync({
          id: existing.id,
          ...(Object.keys(config).length > 0 ? { config } : {}),
          name: driverInfo.label,
          sender_email: senderEmail,
          sender_name: senderName,
        } as any);
      } else {
        await createProvider.mutateAsync({
          driver,
          name: driverInfo.label,
          config,
          sender_email: senderEmail,
          sender_name: senderName,
        } as any);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!senderEmail) { toast.error("Entrez un Sender Email d'abord"); return; }
    setTesting(true);
    try {
      await sendPlatformEmail('welcome_vendor', { name: 'Test' }, senderEmail);
      toast.success('Email de test envoyé !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings/email/providers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Configuration {driverInfo.label}</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Identité de l'expéditeur</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sender Email</Label>
              <Input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="noreply@example.com" />
            </div>
            <div>
              <Label>Sender Name</Label>
              <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Ventou" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Credentials {driverInfo.label}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {driverInfo.fields.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type || 'text'}
                  value={config[f.key] || ''}
                  onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder || f.label}
                />
              </div>
            ))}
            {existing && Object.keys(config).length === 0 && (
              <p className="text-xs text-muted-foreground">Les credentials actuels sont masqués. Remplissez pour mettre à jour.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Enregistrer
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !existing?.is_active}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Envoyer un test
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
