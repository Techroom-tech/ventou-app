import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useEmailTemplates, type EmailTemplate } from '@/hooks/useEmailTemplates';
import { ArrowLeft, Pencil, Eye, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES: Record<string, { label: string; slugs: string[] }> = {
  auth: {
    label: '🔐 Authentification',
    slugs: ['email_verification', 'password_reset', 'two_factor_code', 'account_approved', 'account_suspended'],
  },
  store: {
    label: '🏪 Boutique',
    slugs: ['welcome_vendor', 'store_created', 'store_approved', 'store_rejected', 'store_suspended', 'store_reactivated'],
  },
  orders: {
    label: '📦 Commandes',
    slugs: ['new_order_vendor', 'order_confirmation_customer', 'order_cancelled', 'order_refunded', 'order_shipped', 'order_delivered'],
  },
  subscriptions: {
    label: '💳 Abonnements',
    slugs: ['subscription_activated', 'subscription_expiring_7_days', 'subscription_expiring_1_day', 'subscription_expired', 'plan_upgraded', 'plan_downgraded'],
  },
  admin: {
    label: '⚙️ Administration',
    slugs: ['vendor_report_warning', 'manual_admin_action', 'payment_failed', 'payment_success'],
  },
};

function TemplatePreview({ body }: { body: string }) {
  const previewHtml = `
    <div style="background:#f4f6f9;padding:20px;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;">
        <div style="background:#111827;padding:25px;text-align:center;color:#fff;font-size:20px;font-weight:700;">Ventou</div>
        <div style="padding:35px;color:#111827;font-size:15px;line-height:1.6;">${body}</div>
        <div style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;">© ${new Date().getFullYear()} Ventou</div>
      </div>
    </div>`;

  return (
    <Dialog>
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

function TemplateRow({ t, onUpdate, onToggle }: { t: EmailTemplate; onUpdate: any; onToggle: any }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(t.subject);
  const [body, setBody] = useState(t.body);

  const handleSave = () => {
    onUpdate.mutate({ id: t.id, subject, body });
    setEditing(false);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm">{t.name}</CardTitle>
            <CardDescription className="text-xs font-mono">{t.slug}</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={t.is_active} onCheckedChange={v => onToggle.mutate({ id: t.id, is_active: v })} />
            <TemplatePreview body={t.body} />
            <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {editing && (
        <CardContent className="space-y-3 pt-0">
          <div><Label className="text-xs">Sujet</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><Label className="text-xs">Corps HTML</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="font-mono text-xs" /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Sauver</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminEmailTemplates() {
  const { data: templates = [], isLoading, updateTemplate, toggleTemplate } = useEmailTemplates();
  const navigate = useNavigate();

  const getTemplatesByCategory = (slugs: string[]) =>
    slugs.map(s => templates.find(t => t.slug === s)).filter(Boolean) as EmailTemplate[];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings/email')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Templates Email</h1>
            <p className="text-sm text-muted-foreground">{templates.length} templates configurés</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Variables : <code className="bg-muted px-1 rounded">{'{{name}}'}</code> <code className="bg-muted px-1 rounded">{'{{platform_name}}'}</code> <code className="bg-muted px-1 rounded">{'{{store_name}}'}</code> <code className="bg-muted px-1 rounded">{'{{order_id}}'}</code> <code className="bg-muted px-1 rounded">{'{{reason}}'}</code> <code className="bg-muted px-1 rounded">{'{{amount}}'}</code>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(CATEGORIES)} className="space-y-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const catTemplates = getTemplatesByCategory(cat.slugs);
              return (
                <AccordionItem key={key} value={key} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">
                    {cat.label} <Badge variant="secondary" className="ml-2">{catTemplates.length}</Badge>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pb-4">
                    {catTemplates.map(t => (
                      <TemplateRow key={t.id} t={t} onUpdate={updateTemplate} onToggle={toggleTemplate} />
                    ))}
                    {catTemplates.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucun template. Exécutez le SQL de seed.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
}
