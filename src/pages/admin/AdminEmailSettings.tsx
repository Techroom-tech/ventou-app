import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useEmailProviders, type EmailProvider } from '@/hooks/useEmailProviders';
import { useEmailTemplates, type EmailTemplate } from '@/hooks/useEmailTemplates';
import { sendPlatformEmail } from '@/lib/sendPlatformEmail';
import { Mail, Plus, Zap, CheckCircle2, Pencil, Trash2, Send, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Provider Config Fields ──────────────────────
const DRIVER_FIELDS: Record<string, { label: string; key: string; type?: string }[]> = {
  sendgrid: [
    { label: 'API Key', key: 'api_key' },
    { label: 'Email expéditeur', key: 'from_email' },
    { label: 'Nom expéditeur', key: 'from_name' },
  ],
  resend: [
    { label: 'API Key', key: 'api_key' },
    { label: 'Email expéditeur', key: 'from_email' },
  ],
  mailersend: [
    { label: 'API Key', key: 'api_key' },
    { label: 'Email expéditeur', key: 'from_email' },
    { label: 'Nom expéditeur', key: 'from_name' },
  ],
  smtp: [
    { label: 'URL du relais HTTP', key: 'http_relay_url' },
    { label: 'API Key (optionnel)', key: 'api_key' },
    { label: 'Email expéditeur', key: 'from_email' },
  ],
};

// ─── Add/Edit Provider Dialog ────────────────────
function ProviderFormDialog({ onSave, initial }: {
  onSave: (data: { driver: string; name: string; config: Record<string, any> }) => void;
  initial?: EmailProvider;
}) {
  const [open, setOpen] = useState(false);
  const [driver, setDriver] = useState<string>(initial?.driver || 'sendgrid');
  const [name, setName] = useState(initial?.name || '');
  const [config, setConfig] = useState<Record<string, string>>({});

  const fields = DRIVER_FIELDS[driver] || [];

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Nom requis'); return; }
    onSave({ driver, name: name.trim(), config });
    setOpen(false);
    setName('');
    setConfig({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={initial ? 'outline' : 'default'}>
          {initial ? <Pencil className="h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Ajouter</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier' : 'Ajouter'} un fournisseur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mon SendGrid" />
          </div>
          <div>
            <Label>Driver</Label>
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="mailersend">MailerSend</SelectItem>
                <SelectItem value="smtp">SMTP (HTTP relay)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          {fields.map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input
                type={f.key.includes('key') ? 'password' : 'text'}
                value={config[f.key] || ''}
                onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.label}
              />
            </div>
          ))}
          <Button onClick={handleSubmit} className="w-full">Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Preview ────────────────────────────
function TemplatePreview({ body }: { body: string }) {
  const [open, setOpen] = useState(false);
  const previewHtml = `
    <div style="background:#f4f6f9;padding:20px;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;">
        <div style="background:#111827;padding:25px;text-align:center;color:#fff;font-size:20px;font-weight:700;">Ventou</div>
        <div style="padding:35px;color:#111827;font-size:15px;line-height:1.6;">${body}</div>
        <div style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;">© ${new Date().getFullYear()} Ventou. Tous droits réservés.</div>
      </div>
    </div>`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Eye className="h-4 w-4 mr-1" /> Aperçu</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>Aperçu du template</DialogTitle></DialogHeader>
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────
export default function AdminEmailSettings() {
  const { data: providers = [], isLoading: pLoading, createProvider, activateProvider, deleteProvider } = useEmailProviders();
  const { data: templates = [], isLoading: tLoading, updateTemplate, toggleTemplate } = useEmailTemplates();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const handleTest = async (provider: EmailProvider) => {
    setTestingId(provider.id);
    try {
      await sendPlatformEmail('welcome_vendor', { vendor_name: 'Test' }, 'test@ventou.test');
      toast.success('Email de test envoyé !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors du test');
    } finally {
      setTestingId(null);
    }
  };

  const startEditing = (t: EmailTemplate) => {
    setEditingTemplate(t.id);
    setEditSubject(t.subject);
    setEditBody(t.body);
  };

  const saveTemplate = (t: EmailTemplate) => {
    updateTemplate.mutate({ id: t.id, subject: editSubject, body: editBody });
    setEditingTemplate(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Système Email</h1>
            <p className="text-sm text-muted-foreground">Fournisseurs & templates — Super Admin uniquement</p>
          </div>
        </div>

        <Tabs defaultValue="providers">
          <TabsList>
            <TabsTrigger value="providers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* ── Providers Tab ─────────────────────── */}
          <TabsContent value="providers" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Un seul fournisseur actif à la fois.</p>
              <ProviderFormDialog onSave={d => createProvider.mutate(d)} />
            </div>

            {pLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : providers.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun fournisseur configuré</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {providers.map(p => (
                  <Card key={p.id} className={p.is_active ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : ''}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <Zap className={`h-5 w-5 ${p.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.driver}</p>
                        </div>
                        {p.is_active && <Badge variant="default" className="bg-primary text-primary-foreground"><CheckCircle2 className="h-3 w-3 mr-1" /> Actif</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={p.is_active} onClick={() => activateProvider.mutate(p.id)}>Activer</Button>
                        <Button size="sm" variant="outline" onClick={() => handleTest(p)} disabled={testingId === p.id || !p.is_active}>
                          {testingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" /> Tester</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteProvider.mutate(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Templates Tab ─────────────────────── */}
          <TabsContent value="templates" className="space-y-4">
            <p className="text-sm text-muted-foreground">Variables disponibles : {`{{vendor_name}}, {{site_name}}, {{year}}, {{verification_code}}, {{days_left}}, {{plan_name}}, {{store_name}}, {{reason}}`}</p>

            {tLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : templates.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun template. Lancez la migration pour créer les templates par défaut.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {templates.map(t => (
                  <Card key={t.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">{t.name}</CardTitle>
                          <CardDescription className="text-xs font-mono">{t.slug}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={t.is_active} onCheckedChange={v => toggleTemplate.mutate({ id: t.id, is_active: v })} />
                          <TemplatePreview body={t.body} />
                          <Button size="sm" variant="ghost" onClick={() => editingTemplate === t.id ? saveTemplate(t) : startEditing(t)}>
                            {editingTemplate === t.id ? 'Sauver' : <Pencil className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {editingTemplate === t.id && (
                      <CardContent className="space-y-3 pt-0">
                        <div>
                          <Label className="text-xs">Sujet</Label>
                          <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Corps HTML</Label>
                          <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={8} className="font-mono text-xs" />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>Annuler</Button>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
