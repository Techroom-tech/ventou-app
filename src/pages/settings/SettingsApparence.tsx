import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Palette, Type, MousePointer2, Globe, Loader2,
  AlertCircle, Image, RefreshCw, Zap, CheckCircle2,
  Monitor, Smartphone, RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdvancedColorPicker } from '@/components/settings/AdvancedColorPicker';
import { ShopAssetUploader } from '@/components/settings/ShopAssetUploader';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppearanceForm {
  logo_url: string;
  banner_url: string;
  favicon_url: string;
  banner_size: string;
  primary_color: string;
  secondary_color: string;
  button_color: string;
  button_text_color: string;
  badge_color: string;
  background_color: string;
  card_bg_color: string;
  header_color: string;
  footer_color: string;
  heading_font: string;
  body_font: string;
  title_size: number;
  body_size: number;
  letter_spacing: number;
  line_height: number;
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
  favicon_url: '',
  banner_size: 'Medium',
  primary_color: '#1E3A5F',
  secondary_color: '#FF6B35',
  button_color: '#FF6B35',
  button_text_color: '#FFFFFF',
  badge_color: '#10B981',
  background_color: '#F9FAFB',
  card_bg_color: '#FFFFFF',
  header_color: '#1E3A5F',
  footer_color: '#1E3A5F',
  heading_font: 'Inter',
  body_font: 'Inter',
  title_size: 22,
  body_size: 14,
  letter_spacing: 0,
  line_height: 160,
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

const COLOR_DEFAULTS: Partial<Record<keyof AppearanceForm, string>> = {
  primary_color: '#1E3A5F',
  secondary_color: '#FF6B35',
  button_color: '#FF6B35',
  button_text_color: '#FFFFFF',
  badge_color: '#10B981',
  background_color: '#F9FAFB',
  card_bg_color: '#FFFFFF',
  header_color: '#1E3A5F',
  footer_color: '#1E3A5F',
};

const FONTS = ['Inter', 'Poppins', 'Manrope', 'Montserrat', 'Open Sans'];
const CTA_PRESETS = ['Acheter maintenant', 'Commander', 'Ajouter au panier', 'Obtenir maintenant', 'Je le veux'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-all',
            value === opt
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function FontCard({ font, selected, onSelect }: { font: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border p-3 gap-1 transition-all text-center hover:border-primary/50',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-background',
      )}
    >
      <span style={{ fontFamily: `${font}, sans-serif` }} className="text-xl font-bold text-foreground leading-none">Aa</span>
      <span className="text-[10px] text-muted-foreground">{font}</span>
    </button>
  );
}

function ColorRow({
  label, colorKey, form, update, defaultVal,
}: {
  label: string;
  colorKey: keyof AppearanceForm;
  form: AppearanceForm;
  update: (k: keyof AppearanceForm, v: string) => void;
  defaultVal: string;
}) {
  const [open, setOpen] = useState(false);
  const value = form[colorKey] as string;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-md border border-border/50 shrink-0 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="font-mono text-xs text-muted-foreground">{value.toUpperCase()}</p>
          </div>
        </div>
        <div className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="pl-1">
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

// ─── Live button preview ──────────────────────────────────────────────────────

function CtaButtonPreview({ form }: { form: AppearanceForm }) {
  const btnRadius = form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '10px';
  const btnShadow = form.button_shadow === 'Soft'
    ? '0 2px 8px rgba(0,0,0,0.15)'
    : form.button_shadow === 'Elevated'
      ? '0 4px 16px rgba(0,0,0,0.25)'
      : 'none';

  return (
    <div className="flex justify-center py-4 rounded-xl bg-muted/30 border border-border">
      <button
        type="button"
        style={{
          background: form.button_color,
          color: form.button_text_color,
          borderRadius: btnRadius,
          padding: '9px 24px',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          cursor: 'default',
          width: form.button_width === 'Full width' ? 'calc(100% - 32px)' : 'auto',
          boxShadow: btnShadow,
          letterSpacing: form.letter_spacing + 'px',
          fontFamily: form.body_font + ', sans-serif',
          transition: 'all 0.2s',
        }}
      >
        {form.cta_label}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
      favicon_url: shop.favicon_url ?? '',
      banner_size: shop.banner_size ?? 'Medium',
      primary_color: shop.primary_color ?? '#1E3A5F',
      secondary_color: shop.secondary_color ?? '#FF6B35',
      button_color: shop.button_color ?? '#FF6B35',
      button_text_color: shop.button_text_color ?? '#FFFFFF',
      badge_color: shop.badge_color ?? '#10B981',
      background_color: shop.background_color ?? '#F9FAFB',
      card_bg_color: shop.card_bg_color ?? '#FFFFFF',
      header_color: shop.header_color ?? shop.primary_color ?? '#1E3A5F',
      footer_color: shop.footer_color ?? '#1E3A5F',
      heading_font: shop.heading_font ?? 'Inter',
      body_font: shop.body_font ?? 'Inter',
      title_size: 22,
      body_size: 14,
      letter_spacing: 0,
      line_height: 160,
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

  // ── postMessage to iframe (debounced) ──
  useEffect(() => {
    const t = setTimeout(() => {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'VENTOU_THEME_UPDATE',
          vars: {
            '--color-primary': form.primary_color,
            '--color-secondary': form.secondary_color,
            '--color-btn-bg': form.button_color,
            '--color-btn-text': form.button_text_color,
            '--color-badge': form.badge_color,
            '--color-bg': form.background_color,
            '--color-card-bg': form.card_bg_color,
            '--color-header': form.header_color,
            '--color-footer': form.footer_color,
            '--heading-font': form.heading_font,
            '--body-font': form.body_font,
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
    const f = { ...DEFAULT_FORM, logo_url: form.logo_url, banner_url: form.banner_url, favicon_url: form.favicon_url };
    setForm(f);
    toast.info('Thème réinitialisé aux valeurs par défaut');
  }, [form.logo_url, form.banner_url, form.favicon_url]);

  const handleSave = async () => {
    if (!shop || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shops').update({
        logo_url: form.logo_url || null,
        banner_url: form.banner_url || null,
        favicon_url: form.favicon_url || null,
        banner_size: form.banner_size,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        button_color: form.button_color,
        button_text_color: form.button_text_color,
        badge_color: form.badge_color,
        background_color: form.background_color,
        card_bg_color: form.card_bg_color,
        header_color: form.header_color,
        footer_color: form.footer_color,
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
      }).eq('id', shop.id);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['shop'] });
      savedFormRef.current = { ...form };
      setIframeKey(k => k + 1);
      toast.success('Apparence sauvegardée ! ✨');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const storeFrontUrl = shop?.slug ? `/boutique/${shop.slug}?preview=true` : null;

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-40 overflow-hidden">

      {/* ────────────────────────────────────────────────────────────────────
          HEADER
      ──────────────────────────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 z-10">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard/parametres')}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-foreground">Apparence</h1>
            {isDirty && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                <AlertCircle className="h-3 w-3" />
                Non enregistré
              </span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 h-8 hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </button>
          <Button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="h-8 px-4 text-sm font-medium gap-1.5"
          >
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sauvegarde...</>
              : <><CheckCircle2 className="h-3.5 w-3.5" />Enregistrer</>}
          </Button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────────
          BODY — splits into LEFT config + RIGHT preview
      ──────────────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-1 overflow-hidden',
        isMobile ? 'flex-col' : 'flex-row',
      )}>

        {/* ══════════════════════════════════════════════════════════════════
            LEFT — Config panel (scrollable)
        ══════════════════════════════════════════════════════════════════ */}
        <div className={cn(
          'overflow-y-auto border-r border-border bg-background',
          isMobile ? 'flex-1' : 'w-[400px] xl:w-[440px] shrink-0',
        )}>
          <div className="p-4">
            <Accordion type="single" collapsible defaultValue="colors" className="space-y-2">

              {/* ── 1. Identité visuelle ── */}
              <AccordionItem value="identity" className="rounded-xl border border-border bg-card px-4 shadow-sm data-[state=open]:shadow-md transition-shadow">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2.5 font-semibold text-sm">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Identité visuelle
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pb-3 pt-1">
                    {shop && (
                      <>
                        {/* Logo */}
                        <ShopAssetUploader
                          label="Logo"
                          asset="logo"
                          currentUrl={form.logo_url}
                          shopId={shop.id}
                          onChange={url => update('logo_url', url)}
                          aspectRatio="1:1"
                          maxSizeMB={2}
                        />

                        {/* Bannière */}
                        <div className="space-y-3">
                          <ShopAssetUploader
                            label="Bannière"
                            asset="banner"
                            currentUrl={form.banner_url}
                            shopId={shop.id}
                            onChange={url => update('banner_url', url)}
                            aspectRatio="16:9"
                            maxSizeMB={2}
                          />
                          <div className="space-y-1.5">
                            <SectionLabel>Taille d'affichage</SectionLabel>
                            <PillGroup
                              options={['Small', 'Medium', 'Large'] as const}
                              value={form.banner_size as 'Small' | 'Medium' | 'Large'}
                              onChange={v => update('banner_size', v)}
                            />
                          </div>
                        </div>

                        {/* Favicon */}
                        <ShopAssetUploader
                          label="Favicon"
                          asset="favicon"
                          currentUrl={form.favicon_url}
                          shopId={shop.id}
                          onChange={url => update('favicon_url', url)}
                          aspectRatio="favicon"
                          maxSizeMB={1}
                        />
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 2. Couleurs ── */}
              <AccordionItem value="colors" className="rounded-xl border border-border bg-card px-4 shadow-sm data-[state=open]:shadow-md transition-shadow">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2.5 font-semibold text-sm">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Couleurs
                    <div className="flex gap-1 ml-1">
                      {['primary_color', 'button_color', 'badge_color'].map(k => (
                        <div
                          key={k}
                          className="w-3 h-3 rounded-full border border-border/60 shadow-sm"
                          style={{ backgroundColor: form[k as keyof AppearanceForm] as string }}
                        />
                      ))}
                    </div>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2.5 pb-3 pt-1">
                    <ColorRow label="Couleur principale" colorKey="primary_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.primary_color!} />
                    <ColorRow label="Couleur secondaire" colorKey="secondary_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.secondary_color!} />
                    <ColorRow label="Couleur header" colorKey="header_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.header_color!} />
                    <ColorRow label="Couleur footer" colorKey="footer_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.footer_color!} />
                    <ColorRow label="Fond bouton CTA" colorKey="button_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.button_color!} />
                    <ColorRow label="Texte bouton CTA" colorKey="button_text_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.button_text_color!} />
                    <ColorRow label="Fond global" colorKey="background_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.background_color!} />
                    <ColorRow label="Fond cartes produit" colorKey="card_bg_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.card_bg_color!} />
                    <ColorRow label="Badge promo" colorKey="badge_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.badge_color!} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 3. Typographie ── */}
              <AccordionItem value="typography" className="rounded-xl border border-border bg-card px-4 shadow-sm data-[state=open]:shadow-md transition-shadow">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2.5 font-semibold text-sm">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    Typographie
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pb-3 pt-1">
                    <div className="space-y-2">
                      <SectionLabel>Police des titres</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {FONTS.map(f => (
                          <FontCard key={f} font={f} selected={form.heading_font === f} onSelect={() => update('heading_font', f)} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <SectionLabel>Police du texte</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {FONTS.map(f => (
                          <FontCard key={f} font={f} selected={form.body_font === f} onSelect={() => update('body_font', f)} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <SectionLabel>Taille titres — {form.title_size}px</SectionLabel>
                        <Slider min={14} max={40} step={1} value={[form.title_size]} onValueChange={([v]) => update('title_size', v)} />
                      </div>
                      <div className="space-y-2">
                        <SectionLabel>Taille texte — {form.body_size}px</SectionLabel>
                        <Slider min={10} max={20} step={1} value={[form.body_size]} onValueChange={([v]) => update('body_size', v)} />
                      </div>
                      <div className="space-y-2">
                        <SectionLabel>Espacement — {form.letter_spacing}px</SectionLabel>
                        <Slider min={-1} max={4} step={0.1} value={[form.letter_spacing]} onValueChange={([v]) => update('letter_spacing', v)} />
                      </div>
                      <div className="space-y-2">
                        <SectionLabel>Hauteur ligne — {form.line_height}%</SectionLabel>
                        <Slider min={120} max={200} step={5} value={[form.line_height]} onValueChange={([v]) => update('line_height', v)} />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 4. CTA Personnalisation ── */}
              <AccordionItem value="cta-text" className="rounded-xl border border-border bg-card px-4 shadow-sm data-[state=open]:shadow-md transition-shadow">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2.5 font-semibold text-sm">
                    <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    CTA — Personnalisation
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-3 pt-1">
                    <div className="space-y-2">
                      <SectionLabel>Texte du bouton</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {CTA_PRESETS.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => { update('cta_label', preset); setIsCustomCta(false); }}
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                              form.cta_label === preset && !isCustomCta
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCustomCta(true)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                            isCustomCta
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50',
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
                            className="h-9 text-sm"
                            maxLength={25}
                          />
                          <p className="text-[11px] text-muted-foreground text-right">{customCta.length}/25</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <SectionLabel>Aperçu</SectionLabel>
                      <CtaButtonPreview form={form} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 5. CTA Styling ── */}
              <AccordionItem value="cta-style" className="rounded-xl border border-border bg-card px-4 shadow-sm data-[state=open]:shadow-md transition-shadow">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2.5 font-semibold text-sm">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    CTA — Style
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-3 pt-1">
                    <div className="space-y-1.5">
                      <SectionLabel>Arrondi</SectionLabel>
                      <PillGroup
                        options={['Sharp', 'Medium', 'Pill'] as const}
                        value={form.button_radius as 'Sharp' | 'Medium' | 'Pill'}
                        onChange={v => update('button_radius', v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <SectionLabel>Largeur</SectionLabel>
                      <PillGroup
                        options={['Full width', 'Fit content'] as const}
                        value={form.button_width as 'Full width' | 'Fit content'}
                        onChange={v => update('button_width', v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <SectionLabel>Ombre</SectionLabel>
                      <PillGroup
                        options={['None', 'Soft', 'Elevated'] as const}
                        value={form.button_shadow as 'None' | 'Soft' | 'Elevated'}
                        onChange={v => update('button_shadow', v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <SectionLabel>Animation</SectionLabel>
                      <PillGroup
                        options={['None', 'Bounce', 'Pulse', 'Shake', 'Shine'] as const}
                        value={form.button_animation as 'None' | 'Bounce' | 'Pulse' | 'Shake' | 'Shine'}
                        onChange={v => update('button_animation', v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <SectionLabel>Aperçu</SectionLabel>
                      <CtaButtonPreview form={form} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 6. Style global ── */}
              <AccordionItem value="global" className="rounded-xl border border-border bg-card px-4 shadow-sm data-[state=open]:shadow-md transition-shadow">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2.5 font-semibold text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Style global
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pb-3 pt-1">
                    {/* Dark mode */}
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Mode sombre</p>
                        <p className="text-xs text-muted-foreground">Boutique adaptée à l'obscurité</p>
                      </div>
                      <Switch
                        checked={form.dark_mode_enabled}
                        onCheckedChange={v => update('dark_mode_enabled', v)}
                      />
                    </div>

                    {/* Card style */}
                    <div className="space-y-2">
                      <SectionLabel>Style des cartes produit</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Soft shadow', 'Border minimal', 'Flat'] as const).map(style => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => update('product_card_style', style)}
                            className={cn(
                              'rounded-xl border p-3 text-center transition-all space-y-1.5',
                              form.product_card_style === style
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border hover:border-primary/50 bg-background',
                            )}
                          >
                            <div className={cn(
                              'w-full h-7 rounded-md',
                              style === 'Soft shadow' ? 'shadow-md bg-card' : '',
                              style === 'Border minimal' ? 'border border-border bg-card' : '',
                              style === 'Flat' ? 'bg-muted' : '',
                            )} />
                            <p className="text-[10px] text-muted-foreground leading-tight">{style}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Global radius */}
                    <div className="space-y-1.5">
                      <SectionLabel>Rayon global</SectionLabel>
                      <PillGroup
                        options={['Sharp', 'Medium', 'Rounded'] as const}
                        value={form.global_radius as 'Sharp' | 'Medium' | 'Rounded'}
                        onChange={v => update('global_radius', v)}
                      />
                    </div>

                    {/* Products per row */}
                    <div className="space-y-2">
                      <SectionLabel>Produits par ligne</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {(['1', '2', '3'] as const).map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => update('products_per_row', n)}
                            className={cn(
                              'rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all',
                              form.products_per_row === n
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border hover:border-primary/50 bg-background',
                            )}
                          >
                            <div className="flex gap-0.5 items-end">
                              {Array.from({ length: Number(n) }).map((_, i) => (
                                <div
                                  key={i}
                                  className="h-5 bg-muted rounded-sm"
                                  style={{ width: n === '1' ? 32 : n === '2' ? 14 : 9 }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{n} / ligne</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort order */}
                    <div className="space-y-1.5">
                      <SectionLabel>Ordre d'affichage</SectionLabel>
                      <Select value={form.products_sort_order} onValueChange={v => update('products_sort_order', v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Plus récent</SelectItem>
                          <SelectItem value="alpha">Alphabétique</SelectItem>
                          <SelectItem value="best_seller">Plus vendu</SelectItem>
                          <SelectItem value="price_asc">Moins cher</SelectItem>
                          <SelectItem value="price_desc">Plus cher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* Mobile sticky save bar */}
            {isMobile && (
              <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t border-border mt-4 -mx-4 px-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-11 text-sm font-medium gap-2"
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
            RIGHT — Preview panel (sticky, never scrolls)
        ══════════════════════════════════════════════════════════════════ */}
        {!isMobile && (
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">

            {/* Preview toolbar */}
            <div className="h-12 shrink-0 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4">
              {/* Sync indicator */}
              <div className="flex items-center gap-2">
                {isDirty ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">Modifications en attente</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Synchronisé</span>
                  </>
                )}
              </div>

              {/* Device toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    deviceMode === 'desktop'
                      ? 'bg-foreground text-background shadow-sm'
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
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    deviceMode === 'mobile'
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>

              {/* Refresh */}
              {storeFrontUrl && (
                <button
                  type="button"
                  onClick={() => setIframeKey(k => k + 1)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 h-7 hover:bg-muted"
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualiser
                </button>
              )}
            </div>

            {/* Iframe container */}
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/20">
              {storeFrontUrl ? (
                deviceMode === 'desktop' ? (
                  /* Desktop mode — full area */
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={storeFrontUrl}
                    title="Aperçu boutique"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  /* Mobile mode — phone frame */
                  <div
                    className="relative overflow-hidden bg-background"
                    style={{
                      width: 390,
                      height: 844,
                      borderRadius: 40,
                      boxShadow: '0 0 0 10px hsl(var(--border)), 0 24px 60px rgba(0,0,0,0.35)',
                      flexShrink: 0,
                    }}
                  >
                    {/* Notch */}
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 bg-border z-10"
                      style={{ width: 120, height: 28, borderRadius: '0 0 16px 16px' }}
                    />
                    <iframe
                      ref={iframeRef}
                      key={iframeKey}
                      src={storeFrontUrl}
                      title="Aperçu mobile"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-8">
                  <Globe className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Aucune boutique trouvée</p>
                  <p className="text-xs text-muted-foreground/60">Créez d'abord votre boutique pour voir l'aperçu</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
