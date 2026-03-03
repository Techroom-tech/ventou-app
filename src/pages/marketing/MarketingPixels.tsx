import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, X } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { useTrackingSettings, useUpdateTrackingSettings } from '@/hooks/useTrackingSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Simple SVG icons for providers
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const GtmIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 0L1.75 6v12L12 24l10.25-6V6L12 0zm0 3.46l7.11 4.11v8.23L12 19.91l-7.11-4.11V7.57L12 3.46z"/>
  </svg>
);

export default function MarketingPixels() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const { data: settings, isLoading } = useTrackingSettings(shop?.id);
  const updateMut = useUpdateTrackingSettings();

  const [fbPixel, setFbPixel] = useState('');
  const [fbApiToken, setFbApiToken] = useState('');
  const [ttPixel, setTtPixel] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [customScripts, setCustomScripts] = useState('');
  const [scriptTarget, setScriptTarget] = useState('head');
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  useEffect(() => {
    if (settings) {
      setFbPixel(settings.facebook_pixel ?? '');
      setTtPixel(settings.tiktok_pixel ?? '');
      setGtmId(settings.gtm_id ?? '');
      setCustomScripts(settings.custom_scripts ?? '');
    }
  }, [settings]);

  const fbEnabled = fbPixel.trim().length > 0;
  const ttEnabled = ttPixel.trim().length > 0;
  const gtmEnabled = gtmId.trim().length > 0;

  const testFbPixel = () => {
    const valid = /^\d{10,20}$/.test(fbPixel.trim());
    setTestResults(prev => ({ ...prev, facebook: valid ? 'success' : 'error' }));
    toast[valid ? 'success' : 'error'](valid ? t('marketing.pixels.testSuccess') : t('marketing.pixels.testError'));
  };

  const testTtPixel = () => {
    const valid = /^[A-Z0-9]{6,30}$/i.test(ttPixel.trim());
    setTestResults(prev => ({ ...prev, tiktok: valid ? 'success' : 'error' }));
    toast[valid ? 'success' : 'error'](valid ? t('marketing.pixels.testSuccess') : t('marketing.pixels.testError'));
  };

  const handleSave = async () => {
    if (!shop) return;
    await updateMut.mutateAsync({
      shop_id: shop.id,
      facebook_pixel: fbPixel.trim() || null,
      tiktok_pixel: ttPixel.trim() || null,
      gtm_id: gtmId.trim() || null,
      custom_scripts: customScripts.trim() || null,
    });
    toast.success(t('common.success'));
  };

  const autoEvents = [
    { name: 'ViewContent', desc: t('marketing.pixels.eventViewContent') },
    { name: 'AddToCart', desc: t('marketing.pixels.eventAddToCart') },
    { name: 'InitiateCheckout', desc: t('marketing.pixels.eventCheckout') },
    { name: 'Purchase', desc: t('marketing.pixels.eventPurchase') },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-[960px] mx-auto px-4 md:px-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight">
              {t('marketing.hub.pixels')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('marketing.pixels.subtitle')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <div className="space-y-6">
            {/* Facebook Pixel */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FacebookIcon />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground">Facebook Pixel</span>
                    {fbEnabled && (
                      <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                        {t('marketing.pixels.enabled')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={fbEnabled}
                  onCheckedChange={(v) => { if (!v) setFbPixel(''); }}
                />
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Pixel ID</Label>
                  <Input
                    placeholder="123456789012345"
                    value={fbPixel}
                    onChange={(e) => setFbPixel(e.target.value)}
                    disabled={!fbEnabled && fbPixel.length === 0}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Conversion API Token</Label>
                  <Input
                    placeholder="EAAx..."
                    value={fbApiToken}
                    onChange={(e) => setFbApiToken(e.target.value)}
                    disabled={!fbEnabled}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">{t('marketing.pixels.capiHint')}</p>
                </div>
                {fbEnabled && (
                  <Button variant="outline" size="sm" onClick={testFbPixel} className="gap-2">
                    {testResults.facebook === 'success' && <Check className="h-3.5 w-3.5 text-green-600" />}
                    {testResults.facebook === 'error' && <X className="h-3.5 w-3.5 text-destructive" />}
                    {t('marketing.pixels.testConnection')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* TikTok Pixel */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-foreground">
                    <TikTokIcon />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground">TikTok Pixel</span>
                    {ttEnabled && (
                      <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                        {t('marketing.pixels.enabled')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={ttEnabled}
                  onCheckedChange={(v) => { if (!v) setTtPixel(''); }}
                />
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Pixel ID</Label>
                  <Input
                    placeholder="ABCDEF123456"
                    value={ttPixel}
                    onChange={(e) => setTtPixel(e.target.value)}
                    disabled={!ttEnabled && ttPixel.length === 0}
                    className="mt-1"
                  />
                </div>
                {ttEnabled && (
                  <Button variant="outline" size="sm" onClick={testTtPixel} className="gap-2">
                    {testResults.tiktok === 'success' && <Check className="h-3.5 w-3.5 text-green-600" />}
                    {testResults.tiktok === 'error' && <X className="h-3.5 w-3.5 text-destructive" />}
                    {t('marketing.pixels.testPixel')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Google Tag Manager */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/50 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <GtmIcon />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground">Google Tag Manager</span>
                    {gtmEnabled && (
                      <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                        {t('marketing.pixels.enabled')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={gtmEnabled}
                  onCheckedChange={(v) => { if (!v) setGtmId(''); }}
                />
              </div>
              <CardContent className="p-6">
                <div>
                  <Label className="text-xs text-muted-foreground">GTM Container ID</Label>
                  <Input
                    placeholder="GTM-XXXXXXX"
                    value={gtmId}
                    onChange={(e) => setGtmId(e.target.value)}
                    disabled={!gtmEnabled && gtmId.length === 0}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Scripts */}
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <span className="font-semibold text-sm text-foreground">{t('marketing.pixels.customScripts')}</span>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('marketing.pixels.injectIn')}</Label>
                  <Select value={scriptTarget} onValueChange={setScriptTarget}>
                    <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head">{'<head>'}</SelectItem>
                      <SelectItem value="body">{'<body>'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  rows={5}
                  placeholder="<script>...</script>"
                  value={customScripts}
                  onChange={(e) => setCustomScripts(e.target.value)}
                  className="font-mono text-xs"
                />
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">{t('marketing.pixels.sanitizeWarning')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Auto Events Info */}
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <span className="font-semibold text-sm text-foreground">{t('marketing.pixels.autoEvents')}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t('marketing.pixels.autoEventsDesc')}</p>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {autoEvents.map((evt) => (
                    <div key={evt.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <span className="text-sm font-mono font-medium text-foreground">{evt.name}</span>
                        <p className="text-xs text-muted-foreground">{evt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={updateMut.isPending}
                className="px-8 bg-[hsl(25,100%,50%)] hover:bg-[hsl(25,100%,45%)] text-white"
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
