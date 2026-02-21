import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SHORTCODES = ['{{name}}', '{{platform_name}}', '{{platform_url}}', '{{support_email}}', '{{current_year}}'];

export default function AdminEmailDefaultTemplate() {
  const navigate = useNavigate();
  const { data: settings = [], updateSetting } = usePlatformSettings();

  const getSetting = (key: string) => {
    const s = settings.find(s => s.key === key);
    if (!s) return '';
    const val = typeof s.value === 'string' ? s.value : JSON.stringify(s.value);
    return val.replace(/^"|"$/g, '');
  };

  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  if (settings.length > 0 && !loaded) {
    setFromEmail(getSetting('email_from_address') || getSetting('support_email'));
    setFromName(getSetting('email_from_name') || getSetting('site_name'));
    setHeaderHtml(getSetting('email_header_html'));
    setFooterHtml(getSetting('email_footer_html'));
    setLoaded(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'email_from_address', value: JSON.stringify(fromEmail) });
      await updateSetting.mutateAsync({ key: 'email_from_name', value: JSON.stringify(fromName) });
      await updateSetting.mutateAsync({ key: 'email_header_html', value: JSON.stringify(headerHtml) });
      await updateSetting.mutateAsync({ key: 'email_footer_html', value: JSON.stringify(footerHtml) });
      toast.success('Template par défaut mis à jour');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings/email')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Template par défaut (Wrapper)</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Expéditeur par défaut</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>From Email</Label>
              <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@ventou.shop" />
            </div>
            <div>
              <Label>From Name</Label>
              <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Ventou" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Header HTML</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={headerHtml} onChange={e => setHeaderHtml(e.target.value)} rows={6} className="font-mono text-xs" placeholder="<div style='...'>Mon header</div>" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Footer HTML</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={footerHtml} onChange={e => setFooterHtml(e.target.value)} rows={6} className="font-mono text-xs" placeholder="<div style='...'>Mon footer</div>" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Shortcodes disponibles</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SHORTCODES.map(s => (
                <code key={s} className="px-2 py-1 bg-muted rounded text-xs font-mono">{s}</code>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Enregistrer
        </Button>
      </div>
    </AdminLayout>
  );
}
