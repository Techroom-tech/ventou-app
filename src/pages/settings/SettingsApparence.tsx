import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Monitor, Smartphone, RefreshCw,
  RotateCcw, Image, Palette, MousePointer2, Globe, ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { invalidateStorefrontCache } from '@/lib/invalidateStorefrontCache';
import { AdvancedColorPicker } from '@/components/settings/AdvancedColorPicker';
import { ShopAssetUploader } from '@/components/settings/ShopAssetUploader';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AppearanceForm {
  logo_url: string;
  banner_url: string;
  identity_display_mode: string;
  primary_color: string;
  button_color: string;
  button_text_color: string;
  card_bg_color: string;
  heading_font: string;
  body_font: string;
  cta_label: string;
  button_radius: string;
  button_width: string;
  button_shadow: string;
  button_animation: string;
  dark_mode_enabled: boolean;
  product_card_style: string;
  global_radius: string;
  products_per_row: string;
  products_sort_order: string;
}

const DEFAULT_FORM: AppearanceForm = {
  logo_url: '',
  banner_url: '',
  identity_display_mode: 'logo-name',
  primary_color: '#1E3A5F',
  button_color: '#FF6B35',
  button_text_color: '#FFFFFF',
  card_bg_color: '#FFFFFF',
  heading_font: 'Inter',
  body_font: 'Inter',
  cta_label: 'Acheter maintenant',
  button_radius: 'Medium',
  button_width: 'Full width',
  button_shadow: 'None',
  button_animation: 'None',
  dark_mode_enabled: false,
  product_card_style: 'Soft shadow',
  global_radius: 'Medium',
  products_per_row: '3',
  products_sort_order: 'recent',
};

const COLOR_DEFAULTS: Record<string, string> = {
  primary_color: '#1E3A5F',
  button_color: '#FF6B35',
  button_text_color: '#FFFFFF',
  card_bg_color: '#FFFFFF',
};

const FONTS = ['Inter', 'Poppins', 'Manrope', 'Montserrat', 'Open Sans'];
const CTA_PRESETS = ['Acheter maintenant', 'Commander', 'Ajouter au panier', 'Obtenir maintenant', 'Je le veux'];

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Minimal segmented control */
function SegmentedControl<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<T, string>;
}) {
  return (
    <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-all',
            value === opt
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

/** Color row: label + helper text on left, swatch + hex on right */
function ColorRow({
  label, helper, colorKey, form, update,
}: {
  label: string;
  helper?: string;
  colorKey: keyof AppearanceForm;
  form: AppearanceForm;
  update: (k: keyof AppearanceForm, v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const value = form[colorKey] as string;
  const defaultVal = COLOR_DEFAULTS[colorKey as string] ?? '#000000';

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 py-3 hover:bg-muted/30 rounded-lg px-3 -mx-3 transition-colors group"
      >
        <div className="text-left min-w-0">
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          {helper && <p className="text-[12px] text-muted-foreground mt-0.5">{helper}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-md border border-border/60 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-[12px] text-muted-foreground hidden sm:block">{value.toUpperCase()}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="pt-2 pb-3">
          <AdvancedColorPicker
            value={value}
            defaultValue={defaultVal}
            onChange={hex => update(colorKey, hex)}
          />
        </div>
      )}
    </div>
  );
}

/** CTA live preview button */
function CtaPreview({ form }: { form: AppearanceForm }) {
  const radius = form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '8px';
  const shadow = form.button_shadow === 'Soft'
    ? '0 2px 8px rgba(0,0,0,0.15)'
    : form.button_shadow === 'Elevated'
      ? '0 4px 16px rgba(0,0,0,0.25)'
      : 'none';

  return (
    <div className="rounded-lg border border-border bg-muted/20 flex items-center justify-center p-5">
      <button
        type="button"
        style={{
          background: form.button_color,
          color: form.button_text_color,
          borderRadius: radius,
          padding: '9px 24px',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          cursor: 'default',
          width: form.button_width === 'Full width' ? '100%' : 'auto',
          boxShadow: shadow,
          fontFamily: form.body_font + ', sans-serif',
        }}
      >
        {form.cta_label || 'Acheter maintenant'}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsApparence() {
  const navigate = useNavigate();
  const { shop, isLoading } = useShop();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppearanceForm>(DEFAULT_FORM);
  const [iframeKey, setIframeKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [customCta, setCustomCta] = useState('');
  const [isCustomCta, setIsCustomCta] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const savedFormRef = useRef<AppearanceForm>(DEFAULT_FORM);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedFormRef.current);

  // ── Init form from shop data ──
  useEffect(() => {
    if (!shop) return;
    const f: AppearanceForm = {
      logo_url: shop.logo_url ?? '',
      banner_url: shop.banner_url ?? '',
      identity_display_mode: (shop as any).identity_display_mode ?? 'logo-name',
      primary_color: shop.primary_color ?? '#1E3A5F',
      button_color: shop.button_color ?? '#FF6B35',
      button_text_color: shop.button_text_color ?? '#FFFFFF',
      card_bg_color: shop.card_bg_color ?? '#FFFFFF',
      heading_font: shop.heading_font ?? 'Inter',
      body_font: shop.body_font ?? 'Inter',
      cta_label: shop.cta_label ?? 'Acheter maintenant',
      button_radius: shop.button_radius ?? 'Medium',
      button_width: shop.button_width ?? 'Full width',
      button_shadow: shop.button_shadow ?? 'None',
      button_animation: shop.button_animation ?? 'None',
      dark_mode_enabled: shop.dark_mode_enabled ?? false,
      product_card_style: shop.product_card_style ?? 'Soft shadow',
      global_radius: shop.global_radius ?? 'Medium',
      products_per_row: shop.products_per_row ?? '3',
      products_sort_order: shop.products_sort_order ?? 'recent',
    };
    setForm(f);
    savedFormRef.current = f;
    const existingCta = shop.cta_label ?? 'Acheter maintenant';
    if (!CTA_PRESETS.includes(existingCta)) {
      setIsCustomCta(true);
      setCustomCta(existingCta);
    }
  }, [shop]);

  // ── Google Fonts ──
  useEffect(() => {
    const fonts = [...new Set([form.heading_font, form.body_font])].filter(f => f !== 'Inter');
    fonts.forEach(font => {
      const id = `gf-${font.replace(/\s+/g, '-')}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    });
  }, [form.heading_font, form.body_font]);

  // ── postMessage to iframe (debounced 350ms) ──
  useEffect(() => {
    const t = setTimeout(() => {
      if (!iframeRef.current?.contentWindow) return;
      const btnRadius = form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '8px';
      const btnShadow = form.button_shadow === 'Soft' ? '0 2px 8px rgba(0,0,0,0.15)' : form.button_shadow === 'Elevated' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none';
      const globalRadius = form.global_radius === 'Sharp' ? '4px' : form.global_radius === 'Rounded' ? '16px' : '8px';
      const perRow = form.products_per_row;
      const gridCols = perRow === '1' ? '1fr' : perRow === '2' ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))';
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'VENTOU_THEME_UPDATE',
          vars: {
            '--color-primary': form.primary_color,
            '--color-btn-bg': form.button_color,
            '--color-btn-text': form.button_text_color,
            '--color-card-bg': form.card_bg_color,
            '--heading-font': form.heading_font,
            '--body-font': form.body_font,
            '--btn-radius': btnRadius,
            '--btn-shadow': btnShadow,
            '--global-radius': globalRadius,
            '--btn-animation': form.button_animation,
            '--dark-mode': form.dark_mode_enabled ? 'dark' : 'light',
            '--card-style': form.product_card_style,
            '--products-grid-cols': gridCols,
          },
        },
        '*',
      );
    }, 350);
    return () => clearTimeout(t);
  }, [form]);

  const update = useCallback(<K extends keyof AppearanceForm>(key: K, value: AppearanceForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    const f = { ...DEFAULT_FORM, logo_url: form.logo_url, banner_url: form.banner_url };
    setForm(f);
    toast.info('Thème réinitialisé aux valeurs par défaut');
  }, [form.logo_url, form.banner_url]);

  const handleSave = async () => {
    if (!shop || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shops').update({
        logo_url: form.logo_url || null,
        banner_url: form.banner_url || null,
        identity_display_mode: form.identity_display_mode,
        primary_color: form.primary_color,
        button_color: form.button_color,
        button_text_color: form.button_text_color,
        card_bg_color: form.card_bg_color,
        heading_font: form.heading_font,
        body_font: form.body_font,
        cta_label: form.cta_label,
        button_radius: form.button_radius,
        button_width: form.button_width,
        button_shadow: form.button_shadow,
        button_animation: form.button_animation,
        dark_mode_enabled: form.dark_mode_enabled,
        product_card_style: form.product_card_style,
        global_radius: form.global_radius,
        products_per_row: form.products_per_row,
        products_sort_order: form.products_sort_order,
        updated_at: new Date().toISOString(),
      } as any).eq('id', shop.id);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['shop'] });
      invalidateStorefrontCache(shop.id, shop.slug);
      savedFormRef.current = { ...form };
      setIframeKey(k => k + 1);
      toast.success('Apparence sauvegardée ✨');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const storeFrontUrl = shop?.slug ? `/boutique/${shop.slug}?preview=true` : null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Single iframe element (shared between desktop/mobile containers) ──
  const iframeEl = storeFrontUrl ? (
    <iframe
      ref={iframeRef}
      key={iframeKey}
      src={storeFrontUrl}
      title="Aperçu boutique"
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  ) : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 flex flex-col z-40 overflow-hidden bg-background">

      {/* ── HEADER (64px) ── */}
      <header className="h-16 shrink-0 border-b border-border bg-background flex items-center justify-between px-5 gap-4">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard/parametres')}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted transition-colors shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Apparence</h1>
        </div>

        {/* Center: dirty badge */}
        <div className="flex-1 flex justify-center">
          {isDirty && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[12px] text-amber-600 dark:text-amber-400 font-medium">Modifications non enregistrées</span>
            </div>
          )}
        </div>

        {/* Right: reset + save */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="hidden sm:flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 text-[13px] font-medium rounded-lg"
            style={{ backgroundColor: '#10B981', color: '#fff' }}
          >
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Sauvegarde...</>
              : 'Enregistrer'}
          </Button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════════
            LEFT CONFIG PANEL — 560px fixed, independent scroll
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 overflow-y-auto bg-[#F6F8FA] dark:bg-muted/10"
          style={{ width: isMobile ? '100%' : 560 }}
        >
          <div className="p-6 space-y-3">

            <Accordion type="single" collapsible defaultValue="design" className="space-y-3">

              {/* ── Section 1: Brand Identity ── */}
              <AccordionItem
                value="identity"
                className="rounded-xl border border-border bg-card overflow-hidden data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-4 hover:bg-muted/20 transition-colors [&[data-state=open]>svg]:rotate-180">
                  <span className="flex items-center gap-2.5 text-[14px] font-medium text-foreground">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Identité visuelle
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 pt-1">
                  <div className="space-y-6">
                    {shop && (
                      <>
                        {/* Logo upload */}
                        <div className="space-y-3">
                          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Logo</p>
                          <ShopAssetUploader
                            label="Logo"
                            asset="logo"
                            currentUrl={form.logo_url}
                            shopId={shop.id}
                            onChange={url => update('logo_url', url)}
                            aspectRatio="1:1"
                            maxSizeMB={2}
                          />
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Banner upload */}
                        <div className="space-y-3">
                          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Bannière</p>
                          <ShopAssetUploader
                            label="Bannière"
                            asset="banner"
                            currentUrl={form.banner_url}
                            shopId={shop.id}
                            onChange={url => update('banner_url', url)}
                            aspectRatio="16:9"
                            maxSizeMB={2}
                          />
                         </div>

                        <Separator className="bg-border/60" />

                        {/* Identity display mode */}
                        <div className="space-y-3">
                          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Affichage du header</p>
                          <RadioGroup
                            value={form.identity_display_mode}
                            onValueChange={v => update('identity_display_mode', v)}
                            className="space-y-2"
                          >
                            {[
                              { value: 'logo-only', label: 'Logo seul', desc: 'Affiche uniquement le logo' },
                              { value: 'name-only', label: 'Nom seul', desc: 'Affiche uniquement le nom de la boutique' },
                              { value: 'logo-name', label: 'Logo + Nom', desc: 'Affiche le logo et le nom côte à côte' },
                            ].map(opt => (
                              <div
                                key={opt.value}
                                className={cn(
                                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                                  form.identity_display_mode === opt.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/30',
                                )}
                                onClick={() => update('identity_display_mode', opt.value)}
                              >
                                <RadioGroupItem value={opt.value} id={`idm-${opt.value}`} />
                                <div>
                                  <Label htmlFor={`idm-${opt.value}`} className="text-[13px] font-medium cursor-pointer">{opt.label}</Label>
                                  <p className="text-[12px] text-muted-foreground">{opt.desc}</p>
                                </div>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 2: Design (Colors + Typography) — OPEN BY DEFAULT ── */}
              <AccordionItem
                value="design"
                className="rounded-xl border border-border bg-card overflow-hidden data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-4 hover:bg-muted/20 transition-colors [&[data-state=open]>svg]:rotate-180">
                  <span className="flex items-center gap-2.5 text-[14px] font-medium text-foreground">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Design
                    <div className="flex gap-1 ml-1">
                      {(['primary_color', 'button_color', 'button_text_color'] as const).map(k => (
                        <div
                          key={k}
                          className="w-3 h-3 rounded-full border border-border/60"
                          style={{ backgroundColor: form[k] }}
                        />
                      ))}
                    </div>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 pt-1">

                  {/* COLORS */}
                  <div className="space-y-0 divide-y divide-border/40">
                    <ColorRow
                      label="Couleur principale"
                      helper="Prix, liens, icônes, avatar"
                      colorKey="primary_color"
                      form={form}
                      update={update}
                    />
                    <ColorRow
                      label="Fond bouton CTA"
                      helper="Bouton d'achat principal"
                      colorKey="button_color"
                      form={form}
                      update={update}
                    />
                    <ColorRow
                      label="Texte bouton CTA"
                      helper="Couleur du texte sur le bouton"
                      colorKey="button_text_color"
                      form={form}
                      update={update}
                    />
                    <ColorRow
                      label="Fond cartes produit"
                      helper="Arrière-plan des fiches produit"
                      colorKey="card_bg_color"
                      form={form}
                      update={update}
                    />
                  </div>

                  <Separator className="my-5 bg-border/60" />

                  {/* TYPOGRAPHY */}
                  <div className="space-y-5">
                    <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Typographie</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-foreground">Police des titres</Label>
                        <Select value={form.heading_font} onValueChange={v => update('heading_font', v)}>
                          <SelectTrigger className="h-9 text-[13px] rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONTS.map(f => (
                              <SelectItem key={f} value={f} className="text-[13px]">
                                <span style={{ fontFamily: `${f}, sans-serif` }}>{f}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-foreground">Police du texte</Label>
                        <Select value={form.body_font} onValueChange={v => update('body_font', v)}>
                          <SelectTrigger className="h-9 text-[13px] rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONTS.map(f => (
                              <SelectItem key={f} value={f} className="text-[13px]">
                                <span style={{ fontFamily: `${f}, sans-serif` }}>{f}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Live typography preview */}
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1.5 mt-2">
                      <p style={{ fontFamily: `${form.heading_font}, sans-serif`, fontSize: 16, fontWeight: 600, margin: 0 }}>
                        Titre de votre boutique
                      </p>
                      <p style={{ fontFamily: `${form.body_font}, sans-serif`, fontSize: 13, color: '#6B7280', margin: 0 }}>
                        Texte de description du produit. Voici comment il apparaîtra.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 3: Layout & CTA ── */}
              <AccordionItem
                value="layout-cta"
                className="rounded-xl border border-border bg-card overflow-hidden data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-4 hover:bg-muted/20 transition-colors [&[data-state=open]>svg]:rotate-180">
                  <span className="flex items-center gap-2.5 text-[14px] font-medium text-foreground">
                    <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    Layout & CTA
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 pt-1">
                  <div className="space-y-6">

                    {/* Product grid */}
                    <div className="space-y-3">
                      <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Grille produits</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['1', '2', '3'] as const).map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => update('products_per_row', n)}
                            className={cn(
                              'rounded-xl border p-3 flex flex-col items-center gap-2 transition-all',
                              form.products_per_row === n
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                : 'border-border hover:border-muted-foreground/30 bg-background',
                            )}
                          >
                            <div className="flex gap-0.5 items-end h-6">
                              {Array.from({ length: Number(n) }).map((_, i) => (
                                <div
                                  key={i}
                                  className="h-5 bg-muted-foreground/20 rounded-sm"
                                  style={{ width: n === '1' ? 28 : n === '2' ? 12 : 8 }}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">{n} / ligne</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Display order */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-foreground">Ordre d'affichage</p>
                      <Select value={form.products_sort_order} onValueChange={v => update('products_sort_order', v)}>
                        <SelectTrigger className="h-9 text-[13px] rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent" className="text-[13px]">Plus récent</SelectItem>
                          <SelectItem value="alpha" className="text-[13px]">Alphabétique</SelectItem>
                          <SelectItem value="best_seller" className="text-[13px]">Plus vendu</SelectItem>
                          <SelectItem value="price_asc" className="text-[13px]">Moins cher</SelectItem>
                          <SelectItem value="price_desc" className="text-[13px]">Plus cher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator className="bg-border/60" />

                    {/* CTA text */}
                    <div className="space-y-3">
                      <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Texte du bouton</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CTA_PRESETS.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => { update('cta_label', preset); setIsCustomCta(false); }}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all',
                              form.cta_label === preset && !isCustomCta
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCustomCta(true)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all',
                            isCustomCta
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                          )}
                        >
                          Personnalisé
                        </button>
                      </div>
                      {isCustomCta && (
                        <div className="space-y-1">
                          <Input
                            value={customCta}
                            onChange={e => {
                              const v = e.target.value.slice(0, 25);
                              setCustomCta(v);
                              update('cta_label', v);
                            }}
                            placeholder="Texte personnalisé (max 25 car.)"
                            className="h-9 text-[13px] rounded-lg"
                            maxLength={25}
                          />
                          <p className="text-[11px] text-muted-foreground text-right">{customCta.length}/25</p>
                        </div>
                      )}
                    </div>

                    {/* CTA Style */}
                    <div className="space-y-4">
                      <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Style du bouton</p>

                      <div className="space-y-2">
                        <p className="text-[12px] font-medium text-foreground">Forme</p>
                        <SegmentedControl
                          options={['Sharp', 'Medium', 'Pill'] as const}
                          value={form.button_radius as 'Sharp' | 'Medium' | 'Pill'}
                          onChange={v => update('button_radius', v)}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[12px] font-medium text-foreground">Largeur</p>
                        <SegmentedControl
                          options={['Fit content', 'Full width'] as const}
                          value={form.button_width as 'Fit content' | 'Full width'}
                          onChange={v => update('button_width', v)}
                          labels={{ 'Fit content': 'Adapté', 'Full width': 'Pleine largeur' }}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[12px] font-medium text-foreground">Animation</p>
                        <SegmentedControl
                          options={['None', 'Pulse', 'Shine'] as const}
                          value={
                            ['None', 'Pulse', 'Shine'].includes(form.button_animation)
                              ? (form.button_animation as 'None' | 'Pulse' | 'Shine')
                              : 'None'
                          }
                          onChange={v => update('button_animation', v)}
                          labels={{ None: 'Aucune', Pulse: 'Pulse', Shine: 'Shine' }}
                        />
                      </div>

                      {/* CTA preview */}
                      <div className="space-y-2">
                        <p className="text-[12px] font-medium text-foreground">Aperçu</p>
                        <CtaPreview form={form} />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 4: Style global ── */}
              <AccordionItem
                value="global"
                className="rounded-xl border border-border bg-card overflow-hidden data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-4 hover:bg-muted/20 transition-colors [&[data-state=open]>svg]:rotate-180">
                  <span className="flex items-center gap-2.5 text-[14px] font-medium text-foreground">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Style global
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 pt-1">
                  <div className="space-y-5">

                    {/* Dark mode */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">Mode sombre</p>
                        <p className="text-[12px] text-muted-foreground">Boutique adaptée à l'obscurité</p>
                      </div>
                      <Switch
                        checked={form.dark_mode_enabled}
                        onCheckedChange={v => update('dark_mode_enabled', v)}
                      />
                    </div>

                    {/* Card style */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-foreground">Style des cartes produit</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: 'Soft shadow', label: 'Ombre douce' },
                          { value: 'Border minimal', label: 'Bordure' },
                          { value: 'Flat', label: 'Flat' },
                        ]).map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => update('product_card_style', s.value)}
                            className={cn(
                              'rounded-xl border p-3 text-center transition-all space-y-2',
                              form.product_card_style === s.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                : 'border-border hover:border-muted-foreground/30 bg-background',
                            )}
                          >
                            <div className={cn(
                              'w-full h-8 rounded-md mx-auto',
                              s.value === 'Soft shadow' ? 'shadow-md bg-card border border-border/20' : '',
                              s.value === 'Border minimal' ? 'border border-border bg-card' : '',
                              s.value === 'Flat' ? 'bg-muted' : '',
                            )} />
                            <p className="text-[11px] text-muted-foreground font-medium leading-tight">{s.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Global radius */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-foreground">Rayon global</p>
                      <SegmentedControl
                        options={['Sharp', 'Medium', 'Rounded'] as const}
                        value={form.global_radius as 'Sharp' | 'Medium' | 'Rounded'}
                        onChange={v => update('global_radius', v)}
                        labels={{ Sharp: 'Carré', Medium: 'Moyen', Rounded: 'Arrondi' }}
                      />
                    </div>

                    {/* CTA shadow */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-foreground">Ombre du bouton</p>
                      <SegmentedControl
                        options={['None', 'Soft', 'Elevated'] as const}
                        value={form.button_shadow as 'None' | 'Soft' | 'Elevated'}
                        onChange={v => update('button_shadow', v)}
                        labels={{ None: 'Aucune', Soft: 'Douce', Elevated: 'Forte' }}
                      />
                    </div>

                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* Mobile sticky save bar */}
            {isMobile && (
              <div className="sticky bottom-0 pt-4 pb-safe bg-[#F6F8FA] dark:bg-muted/10 border-t border-border mt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-11 text-[13px] font-medium gap-2 rounded-lg"
                  style={{ backgroundColor: '#10B981', color: '#fff' }}
                >
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde...</>
                    : 'Enregistrer les modifications'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT PREVIEW PANEL — sticky, never scrolls, desktop only
        ══════════════════════════════════════════════════════════════════ */}
        {!isMobile && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F6F8FA] dark:bg-muted/5">

            {/* Preview toolbar */}
            <div className="h-12 shrink-0 border-b border-border bg-background flex items-center justify-between px-4 gap-3">

              {/* Device toggle (left) */}
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
                    deviceMode === 'desktop'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
                    deviceMode === 'mobile'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>

              {/* Sync indicator (center) */}
              <div className="flex-1 flex justify-center">
                {isDirty ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[12px] text-amber-600 dark:text-amber-400">Synchronisation en cours</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[12px] text-muted-foreground">Synchronisé</span>
                  </div>
                )}
              </div>

              {/* Refresh (right) */}
              <button
                type="button"
                onClick={() => setIframeKey(k => k + 1)}
                className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Actualiser
              </button>
            </div>

            {/* Iframe area — single iframe, CSS-positioned for device modes */}
            <div className="flex-1 overflow-hidden relative">
              {storeFrontUrl ? (
                <>
                  {/* Desktop container */}
                  <div
                    className={cn(
                      'absolute inset-0 transition-opacity duration-200',
                      deviceMode === 'desktop' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                    )}
                  >
                    <div className="w-full h-full p-4">
                      <div className="w-full h-full rounded-2xl overflow-hidden border border-border">
                        {deviceMode === 'desktop' && iframeEl}
                      </div>
                    </div>
                  </div>

                  {/* Mobile container */}
                  <div
                    className={cn(
                      'absolute inset-0 flex items-center justify-center bg-[#F6F8FA] dark:bg-muted/5 p-6 transition-opacity duration-200',
                      deviceMode === 'mobile' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                    )}
                  >
                    <div
                      className="relative bg-background overflow-hidden"
                      style={{
                        width: 390,
                        height: 700,
                        borderRadius: 40,
                        boxShadow: '0 0 0 8px hsl(var(--border)), 0 20px 60px rgba(0,0,0,0.2)',
                        flexShrink: 0,
                      }}
                    >
                      {/* Notch */}
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 bg-border/60 z-10"
                        style={{ width: 110, height: 24, borderRadius: '0 0 14px 14px' }}
                      />
                      {deviceMode === 'mobile' && iframeEl}
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
                  <Globe className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-[13px] text-muted-foreground">Aucune boutique configurée</p>
                  <p className="text-[12px] text-muted-foreground/60">Créez votre boutique pour voir l'aperçu en direct</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
